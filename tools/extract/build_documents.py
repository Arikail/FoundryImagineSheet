#!/usr/bin/env python3
"""
build_documents.py -- turn the named extraction into Foundry document JSON.

Build-time tooling. Not shipped with the Foundry system.

Reads src/packs/named/ and writes src/packs/documents/, shaping each entry to match the
schemas in module/data/. This is the step where the source's string-typed data meets the
typed schema, so it is also where any mismatch between the two shows up.

The source stores everything as strings, including numbers, and uses several sentinels:
    "Non"   a weapon attack mode that does not exist for this weapon
    "-"     a range band that does not apply
    ""      absent
    "+5%"   a percentage modifier
    "`"     stands in for an apostrophe, as in "Player`s Guide"

Anything that will not convert is reported rather than silently coerced -- a skill rating
that quietly becomes 0 is worse than one that fails loudly.

Usage:
    python build_documents.py --check
    python build_documents.py --write
"""

import argparse
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from column_maps import CLASSREQUIREMENTSANDDETAILS  # noqa: E402 -- names the inline class rows too

HERE = os.path.dirname(os.path.abspath(__file__))
NAMED = os.path.join(HERE, "..", "..", "src", "packs", "named")
OUT = os.path.join(HERE, "..", "..", "src", "packs", "documents")

issues = []


def note(kind, where, detail):
    issues.append({"kind": kind, "where": where, "detail": detail})


# @MARKER VALUE CONVERSION

def clean_text(tmpvalue):
    """His data uses a backtick where an apostrophe belongs."""
    if not isinstance(tmpvalue, str):
        return tmpvalue
    return tmpvalue.replace("`", "'").strip()


def to_number(tmpvalue, where, field, default=0):
    """Convert a source string to a number. Reports anything unconvertible."""
    if tmpvalue is None or tmpvalue == "" or tmpvalue == "-":
        return default
    if isinstance(tmpvalue, (int, float)):
        return tmpvalue
    tmptext = str(tmpvalue).strip().replace("%", "").replace("+", "")
    if tmptext in ("", "-", "Non", "None", "N/A", "?"):
        return default
    try:
        if "." in tmptext:
            return float(tmptext)
        return int(tmptext)
    except ValueError:
        note("unconvertible-number", where, "%s = %r" % (field, tmpvalue))
        return default


def to_bool(tmpvalue):
    return str(tmpvalue).strip().lower() in ("yes", "true", "1")


PAREN = re.compile(r'^\s*([^(]+?)\s*\(\s*([^)]+?)\s*\)\s*$')


def split_alternate(tmpvalue):
    """
    A dual-headed weapon records its second head in parentheses -- "8(6)" or "5d6(2d6)".
    Returns (primary, alternate or None).
    """
    tmptext = str(tmpvalue).strip()
    tmpmatch = PAREN.match(tmptext)
    if tmpmatch:
        return tmpmatch.group(1), tmpmatch.group(2)
    return tmptext, None


def attack_mode(tmpvalue, where, field):
    """
    A weapon attack mode. "Non" means the weapon cannot be used that way at all, which is
    not the same as a modifier of zero.
    """
    tmptext = str(tmpvalue).strip()
    if tmptext in ("Non", "", "-", "None"):
        return {"available": False, "mod": 0}
    return {"available": True, "mod": to_number(tmptext, where, field)}


def load_named(name):
    path = os.path.join(NAMED, name + ".json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def load_raw_entries(name):
    """The entries of a dictionary as parse_dictionaries.py wrote it, for the few that are used
    straight from the raw parse rather than through a column map -- ones whose rows are nested
    lists (race skills) or plain comma lists (race features), where a column map adds nothing."""
    path = os.path.join(HERE, "..", "..", "src", "packs", "raw", name + ".json")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as fh:
        return json.load(fh).get("entries", {})


def split_list(tmpvalue):
    """His comma-separated name lists ("Infravision60,Antennae,Hide(Chitinous)") as a list, with
    his "None" and empty entries dropped."""
    return [s.strip() for s in str(tmpvalue or "").split(",") if s.strip() and s.strip() != "None"]


def make_doc(name, doctype, system):
    return {"name": clean_text(name), "type": doctype, "system": system}


# @MARKER DOCUMENT BUILDERS

def build_skills():
    docs = []
    for source, category in (("skilldict", "class"), ("socialskilldict", "social")):
        payload = load_named(source)
        if not payload:
            continue
        for tmpname, tmprow in payload["entries"].items():
            where = "%s/%s" % (source, tmpname)
            tmptypes = []
            if tmprow.get("types"):
                tmptypes = [t.strip() for t in str(tmprow["types"]).split(",") if t.strip()]
            docs.append(make_doc(tmpname, "skill", {
                "attr1": clean_text(tmprow.get("attr1", "")),
                "attr2": clean_text(tmprow.get("attr2", "")),
                "skillRating": to_number(tmprow.get("skillRating"), where, "skillRating"),
                "startingDice": clean_text(tmprow.get("startingDice", "")),
                "time": clean_text(tmprow.get("time", "")),
                "learn": clean_text(str(tmprow.get("learn", tmprow.get("learnTime", "")))),
                "types": tmptypes,
                "sourcebook": clean_text(tmprow.get("sourcebook", "")),
                "page": clean_text(str(tmprow.get("page", ""))),
                "category": category,
                "description": clean_text(tmprow.get("description", "")),
            }))
    return docs


# The two weapons whose bracketed damage applies in one attack mode, and which mode. His code
# hard-codes these by name in handlePhysicalAttacks (sheet-worker.js:64937-64949).
DAMAGE_ALT_MODES = {
    "Spear": "missile",       # thrown spears do one more die of damage
    "Axe Hammer": "thrust",   # an axe hammer does less damage when thrusting
}


def build_weapons():
    payload = load_named("weaponvalueslist")
    if not payload:
        return []
    docs = []
    for tmpname, tmprow in payload["entries"].items():
        where = "weaponvalueslist/%s" % tmpname

        # A weapon with no ordinary swing speed is marked "S" -- lances, caltrops, garrotes.
        tmpspeedraw = str(tmprow.get("speed", "")).strip()
        tmpspecialspeed = (tmpspeedraw == "S")

        # Parentheses mean two different things depending on the column.
        #   speed / minSpeed  -- reload time, for launched missile weapons: a Crossbow is
        #                        "1(15)", firing in 1 second and reloading in 15. His code reads
        #                        it this way whenever minSpeed carries parentheses.
        #   damage            -- a different damage in one attack mode. Only two weapons do
        #                        this, and his code names them: the Spear does its bracketed
        #                        damage when thrown, the Axe Hammer when thrusting.
        tmpspeed, tmpreload = split_alternate(tmprow.get("speed", ""))
        tmpmin, tmpreloadmin = split_alternate(tmprow.get("minSpeed", ""))
        tmpdamage, tmpdamagealt = split_alternate(tmprow.get("damage", ""))
        if tmpreloadmin is None:
            tmpreload = None  # reload only counts when minSpeed also carries one, as in his code

        tmpaltmode = ""
        if tmpdamagealt is not None:
            tmpaltmode = DAMAGE_ALT_MODES.get(tmpname, "")
            if not tmpaltmode:
                note("damage-alt-unassigned", where,
                     "bracketed damage %r but his code names no attack mode for it" % tmpdamagealt)

        docs.append(make_doc(tmpname, "weapon", {
            "damage": clean_text(tmpdamage),
            "speed": 0 if tmpspecialspeed else to_number(tmpspeed, where, "speed"),
            "minSpeed": 0 if tmpspecialspeed else to_number(tmpmin, where, "minSpeed"),
            "speedSpecial": tmpspecialspeed,
            "damageAlt": clean_text(tmpdamagealt or ""),
            "damageAltMode": tmpaltmode,
            "reloadSpeed": to_number(tmpreload, where, "reloadSpeed") if tmpreload else 0,
            "reloadMinSpeed": to_number(tmpreloadmin, where, "reloadMinSpeed") if tmpreloadmin else 0,
            "length": clean_text(tmprow.get("length", "")),
            "missile": attack_mode(tmprow.get("missile"), where, "missile"),
            "thrust": attack_mode(tmprow.get("thrust"), where, "thrust"),
            "cut": attack_mode(tmprow.get("cut"), where, "cut"),
            "smash": attack_mode(tmprow.get("smash"), where, "smash"),
            "skillsMod": to_number(tmprow.get("skills"), where, "skills"),
            "structuralStrength": to_number(tmprow.get("strength"), where, "strength"),
            "weight": to_number(tmprow.get("weight"), where, "weight"),
            "type": clean_text(tmprow.get("type", "")),
            "material": clean_text(tmprow.get("material", "")),
            "ranges": {
                "pointBlank": clean_text(tmprow.get("rangePointBlank", "")),
                "short": clean_text(tmprow.get("rangeShort", "")),
                "medium": clean_text(tmprow.get("rangeMedium", "")),
                "long": clean_text(tmprow.get("rangeLong", "")),
                "extreme": clean_text(tmprow.get("rangeExtreme", "")),
            },
        }))
    return docs


ARMOR_LOCATIONS = [
    "head", "neck", "shoulderLeft", "shoulderRight",
    "torsoUpper", "torsoMid", "torsoLower",
    "armLeft", "armRight", "forearmLeft", "forearmRight",
    "handLeft", "handRight", "thighLeft", "thighRight",
    "shinLeft", "shinRight", "footLeft", "footRight",
]


def build_armor():
    payload = load_named("armorvalueslist")
    if not payload:
        return []
    VALID_FLEX = ("Clothing", "Flexible", "Semi-Flexible", "Rigid",
                  "Rigid/Flexible", "Rigid/Semi-Flexible", "Rigid/Rigid", "Mixed")

    # Penalties live in their own dictionary, keyed by the same armour name, and cover only
    # the pieces that actually encumber the wearer. Anything absent has no penalty.
    penalties = load_named("armorpenaltydict")
    penaltymap = penalties["entries"] if penalties else {}

    docs = []
    for tmpname, tmprow in payload["entries"].items():
        where = "armorvalueslist/%s" % tmpname
        tmpflex = clean_text(tmprow.get("flexibility", ""))
        if tmpflex not in VALID_FLEX:
            note("unknown-flexibility", where, tmpflex)

        # "S" in a location means the armour value comes from the material rather than from
        # the piece. Recorded by name rather than flattened to zero, which would falsely
        # assert the piece gives no protection there.
        tmpcoverage = {}
        tmpfrommaterial = []
        for tmploc in ARMOR_LOCATIONS:
            tmpraw = str(tmprow.get(tmploc, "")).strip()
            if tmpraw == "S":
                tmpcoverage[tmploc] = 0
                tmpfrommaterial.append(tmploc)
            else:
                tmpcoverage[tmploc] = to_number(tmpraw, where, tmploc)

        tmppenalty = penaltymap.get(tmpname, {})
        docs.append(make_doc(tmpname, "armor", {
            "material": clean_text(tmprow.get("material", "")),
            "flexibility": tmpflex if tmpflex in VALID_FLEX else "Flexible",
            "isShield": "shield" in str(tmpname).lower(),
            "coverage": tmpcoverage,
            "coverageFromMaterial": tmpfrommaterial,
            "penalties": {
                "skills": to_number(tmppenalty.get("skills"), where, "penalty.skills"),
                "defense": to_number(tmppenalty.get("defense"), where, "penalty.defense"),
                "initiative": to_number(tmppenalty.get("initiative"), where, "penalty.initiative"),
                "speed": to_number(tmppenalty.get("speed"), where, "penalty.speed"),
            },
            "weight": to_number(tmprow.get("weight"), where, "weight"),
        }))
    return docs


def build_equipment():
    payload = load_named("equipvalueslist")
    if not payload:
        return []
    docs = []
    for tmpname, tmprow in payload["entries"].items():
        where = "equipvalueslist/%s" % tmpname
        tmpweight = to_number(tmprow.get("weight"), where, "weight")
        docs.append(make_doc(tmpname, "equipment", {
            "weight": tmpweight,
            # His data gives tagalong items a weight of zero because they are already
            # counted inside another item.
            "isTagalong": tmpweight == 0,
        }))
    return docs


ATTRS = ["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"]


def build_races():
    payload = load_named("raceStatsAndMoveDetails")
    if not payload:
        return []

    # Body types come from getRacialBodyType, extracted by extract_combat_tables.py. A race
    # it does not name -- Changeling, whose body depends on the form it has taken -- falls
    # back to Humanoid.
    bodytypes = load_named("raceBodyTypes")
    bodymap = bodytypes["entries"] if bodytypes else {}
    conditional = bodytypes.get("_conditional", []) if bodytypes else []

    # The rest of a race, from four more of his tables. Each is keyed by the same race name.
    #   raceSkillDetailValues   the racial skills a member may choose, with his bonus on each
    #                           (getRaceSkillDetails, sheet-worker.js:51856)
    #   raceFeatureAbilities    abilities, disabilities, immunities -- three comma lists
    #                           (getRacialFeatureAbilities, 45588)
    #   racefertiledict         which races it can have children with (32833) -- the list his
    #                           Half Race picker offers as the second race
    #   raceAges                starting-age range and maximum age (getAge, 38995), walked out
    #                           of his switch by extract_combat_tables.py
    # His "(Slight Physique)" variants of a few races are separate keys in the first two and are
    # not carried: the port has no slight-physique option yet.
    raceskills = load_raw_entries("raceSkillDetailValues")
    racefeatures = load_raw_entries("raceFeatureAbilities")
    racefertile = load_raw_entries("racefertiledict")
    raceages = (load_named("raceAges") or {}).get("entries", {})

    docs = []
    for tmpname, tmprow in payload["entries"].items():
        where = "raceStatsAndMoveDetails/%s" % tmpname
        for tmptable, tmpsource in (("raceSkillDetailValues", raceskills), ("raceFeatureAbilities", racefeatures),
                                    ("racefertiledict", racefertile), ("getAge", raceages)):
            if tmpname not in tmpsource:
                note("race-missing-from-table", where, "no entry in %s" % tmptable)

        tmpskillrow = raceskills.get(tmpname, ["", [], ""])
        tmpracialskills = [{"name": clean_text(s[0]), "bonus": clean_text(str(s[1] or ""))}
                           for s in (tmpskillrow[1] or []) if s and s[0]]
        tmpskillnote = clean_text(str(tmpskillrow[2] if len(tmpskillrow) > 2 else ""))
        if tmpskillnote == "None":
            tmpskillnote = ""
        tmpfeatures = racefeatures.get(tmpname, ["", "", ""])
        tmpages = raceages.get(tmpname, {})

        if tmpname not in bodymap:
            note("race-body-type-defaulted", where, "no case in getRacialBodyType; using Humanoid")
        if tmpname in conditional:
            note("race-body-type-conditional", where,
                 "body type depends on more than the race in his code; using %s" % bodymap.get(tmpname))

        tmpmods = {}
        tmplimits = {}
        for tmpattr in ATTRS:
            tmpmods[tmpattr] = to_number(tmprow.get(tmpattr + "Mod"), where, tmpattr + "Mod")
            tmplimits[tmpattr] = to_number(tmprow.get(tmpattr + "Limit"), where, tmpattr + "Limit", default=20)

        def rate(prefix):
            return {
                "hourly": to_number(tmprow.get(prefix + "Hourly"), where, prefix + "Hourly"),
                "tenSec": to_number(tmprow.get(prefix + "10Sec"), where, prefix + "10Sec"),
                "oneSec": to_number(tmprow.get(prefix + "1Sec"), where, prefix + "1Sec"),
            }

        docs.append(make_doc(tmpname, "race", {
            "attributeMods": tmpmods,
            "attributeLimits": tmplimits,
            "endurance": {
                "startFormula": clean_text(str(tmprow.get("startEnduranceFormula", ""))),
                "startMod": to_number(tmprow.get("startEnduranceMod"), where, "startEnduranceMod"),
                "titleFormula": clean_text(str(tmprow.get("titleEnduranceFormula", ""))),
                "titleDice": clean_text(str(tmprow.get("titleEnduranceDice", ""))),
                "titleMax": to_number(tmprow.get("titleEnduranceMax"), where, "titleEnduranceMax"),
                "titleMod": to_number(tmprow.get("titleEnduranceMod"), where, "titleEnduranceMod"),
            },
            "characteristicMods": {
                "perception": to_number(tmprow.get("perceptionMod"), where, "perceptionMod"),
                "affinity": to_number(tmprow.get("affinityMod"), where, "affinityMod"),
                "fortune": to_number(tmprow.get("fortuneMod"), where, "fortuneMod"),
            },
            "resistanceMods": {
                "magic": to_number(tmprow.get("magicResistMod"), where, "magicResistMod"),
                "illusion": to_number(tmprow.get("illusionResistMod"), where, "illusionResistMod"),
                "control": to_number(tmprow.get("controlResistMod"), where, "controlResistMod"),
                "poison": to_number(tmprow.get("poisonResistMod"), where, "poisonResistMod"),
                "disease": to_number(tmprow.get("diseaseResistMod"), where, "diseaseResistMod"),
            },
            "movement": {
                "speedMultiplier": to_number(tmprow.get("speedMultiplier"), where, "speedMultiplier", default=1),
                "walk": rate("walk"),
                "jog": rate("jog"),
                "run": rate("run"),
                "specialName": clean_text(str(tmprow.get("specialMoveName", ""))),
                "special": {
                    "hourly": clean_text(str(tmprow.get("specialHourly", ""))),
                    "hourlyMultiplier": to_number(tmprow.get("specialHourlyMultiplier"), where, "specialHourlyMultiplier"),
                    "hourlyMod": to_number(tmprow.get("specialHourlyMod"), where, "specialHourlyMod"),
                    "tenSec": clean_text(str(tmprow.get("special10Sec", ""))),
                    "tenSecMultiplier": to_number(tmprow.get("special10SecMultiplier"), where, "special10SecMultiplier"),
                    "tenSecMod": to_number(tmprow.get("special10SecMod"), where, "special10SecMod"),
                    "oneSec": clean_text(str(tmprow.get("special1Sec", ""))),
                    "oneSecMultiplier": to_number(tmprow.get("special1SecMultiplier"), where, "special1SecMultiplier"),
                    "oneSecMod": to_number(tmprow.get("special1SecMod"), where, "special1SecMod"),
                },
                "jumpStand": to_number(tmprow.get("jumpStand"), where, "jumpStand"),
                "jumpUp": to_number(tmprow.get("jumpUp"), where, "jumpUp"),
            },
            "formless": to_bool(tmprow.get("formless")),
            "canSwim": to_bool(tmprow.get("canSwim")),
            "bodyType": bodymap.get(tmpname, "Humanoid"),
            "racialSkills": tmpracialskills,
            "racialSkillNote": tmpskillnote,
            "abilities": [clean_text(a) for a in split_list(tmpfeatures[0])],
            "disabilities": [clean_text(a) for a in split_list(tmpfeatures[1] if len(tmpfeatures) > 1 else "")],
            "immunities": [clean_text(a) for a in split_list(tmpfeatures[2] if len(tmpfeatures) > 2 else "")],
            "fertileWith": [clean_text(a) for a in split_list(",".join(racefertile.get(tmpname, [])))],
            "ages": {
                "startLow": tmpages.get("startLow", 0),
                "startHigh": tmpages.get("startHigh", 0),
                # a number of years, or a word -- "Immortal"
                "maxAge": str(tmpages.get("maxAge", "")),
            },
        }))
    return docs


def build_classes():
    """Classes merge three dictionaries keyed by the same class name."""
    details = load_named("classRequirementsAndDetails")
    titles = load_named("classtitledict")
    goals = load_named("goalupdict")
    if not details:
        return []

    titlemap = titles["entries"] if titles else {}
    goalmap = goals["entries"] if goals else {}

    # What a character of this class must have before they may pass 10th title into Arch Mortal,
    # from archmortalqualifylist via his own column-header comment. His sheet checks these on a
    # qualification screen and writes one Yes/No flag, which is what the goal-30 gate reads.
    archqualify = load_named("archmortalqualifylist")
    archmap = archqualify["entries"] if archqualify else {}

    # Which races may NOT take each class, from his classRaceAndDetails (sheet-worker.js:51088),
    # read by setClassDetails as blockedRacesDetails. It is a list of barred races, not allowed
    # ones: Warrior's is empty, which means every race may be a Warrior.
    blockedraces = load_raw_entries("classRaceAndDetails")

    # When a class starts reading the Lore attack chart, from getLoreAttackChart via
    # extract_combat_tables.py. Zero means it never does, which is true of about half of them.
    loretitles = load_named("classLoreTitles")
    loremap = loretitles["entries"] if loretitles else {}
    # And the titles at which a class acquires Weapon and Missile Lore themselves, from
    # getWeaponLoreWhen / getMissileLoreWhen. Zero means the class never gets that lore.
    weaponloremap = loretitles.get("weaponLoreWhen", {}) if loretitles else {}
    missileloremap = loretitles.get("missileLoreWhen", {}) if loretitles else {}
    projectileloremap = loretitles.get("projectileLoreWhen", {}) if loretitles else {}
    # And the titles at which a class becomes eligible for the off-hand fighting skills, from
    # get2ndWeaponKnowWhen / get2ndWeaponLoreWhen. Zero means the class never gets it.
    know2ndmap = loretitles.get("secondWeaponKnowWhen", {}) if loretitles else {}
    lore2ndmap = loretitles.get("secondWeaponLoreWhen", {}) if loretitles else {}
    # And the title at which a class may start acquiring Multiple Missile Lore combos, from
    # getMultiMissileLoreWhen. Its Knowledge half has no title gate in his sheet at all.
    multimissileloremap = loretitles.get("multiMissileLoreWhen", {}) if loretitles else {}
    # How many class skill slots the class needs for its whole progression, from
    # getSlotsNeededForClass. A class missing from this map falls back to 0, which is reported by
    # to_number rather than passing silently, because 0 reads as "costs no slots to take".
    slotsneeded = load_named("classSkillSlots")
    slotsmap = slotsneeded["entries"] if slotsneeded else {}

    # Every class's class skills, title by title, from setClassSkillLists via
    # extract_combat_tables.py -- see build_class_skills below.
    skilllists = (load_named("classSkillLists") or {}).get("entries", {})

    # The rows to build from: his dictionary, plus the five classes his checkClassQualification
    # answers inline before it ever reaches the dictionary (Elemental Dancer, Elementalist,
    # Summoner, Inquisitor, GME). Those rows have the dictionary's 22 columns, so the dictionary's
    # own column map names them.
    rows = dict(details["entries"])
    for tmpbasename, tmpcells in ((load_named("specialClassRows") or {}).get("entries", {})).items():
        if tmpbasename in rows:
            note("special-class-duplicate", "specialClassRows/%s" % tmpbasename,
                 "also in classRequirementsAndDetails; the inline row is the one his code uses")
        rows[tmpbasename] = dict(zip(CLASSREQUIREMENTSANDDETAILS, tmpcells))

    docs = []

    for tmpbasename, tmprow in rows.items():
        if tmpbasename == "":
            continue  # the blank key is the "no class" default row
        where = "classRequirementsAndDetails/%s" % tmpbasename

        tmptitles = []
        if tmpbasename in titlemap:
            tmptitles = [clean_text(t) for t in titlemap[tmpbasename].get("titles", []) if clean_text(t)]
        else:
            note("missing-titles", where, "no entry in classtitledict")

        tmpgoal1 = tmpgoal2 = ""
        if tmpbasename in goalmap:
            tmpgoal1 = clean_text(goalmap[tmpbasename].get("goalAttr1", ""))
            tmpgoal2 = clean_text(goalmap[tmpbasename].get("goalAttr2", ""))
        else:
            note("missing-goalup", where, "no entry in goalupdict")

        # Arch Mortal qualifications. The twelve attribute entries are kept as his own strings
        # ("RM", "-1", "14") rather than resolved to numbers here, because two of the three forms
        # are relative to the character's racial maximum and cannot be resolved without one.
        tmparch = {"attributes": {}, "skills": [], "special": ""}
        if tmpbasename in archmap:
            tmparchrow = archmap[tmpbasename]
            for tmpattr in ("str", "agl", "vit", "int", "wis", "knw",
                            "app", "chm", "soc", "aur", "pty", "wil"):
                tmparch["attributes"][tmpattr] = clean_text(str(tmparchrow.get(tmpattr, "")))
            for tmpwhich in (1, 2, 3, 4, 5):
                tmpskill = clean_text(str(tmparchrow.get("skill%d" % tmpwhich, "")))
                if not tmpskill:
                    continue
                tmparch["skills"].append({
                    "name": tmpskill,
                    "chance": to_number(tmparchrow.get("chance%d" % tmpwhich, 0), where,
                                        "archMortal.chance%d" % tmpwhich),
                })
            tmpspecial = clean_text(str(tmparchrow.get("special", "")))
            tmparch["special"] = "" if tmpspecial == "None" else tmpspecial
        else:
            note("missing-archmortal", where, "no entry in archmortalqualifylist")

        tmpmods = []
        for tmpkey in ("classMod1", "classMod2", "classMod3", "classMod4", "classMod5"):
            tmpmod = clean_text(str(tmprow.get(tmpkey, "")))
            if tmpmod:
                tmpmods.append(tmpmod)

        tmpqualify = tmprow.get("attribQualify", [])
        if not isinstance(tmpqualify, list):
            tmpqualify = []

        if tmpbasename not in skilllists:
            note("class-missing-skill-list", where, "no case in setClassSkillLists")

        # One document per path for a class with a choice; one document otherwise.
        for tmpname, tmppathvar, tmppath in class_paths(tmpbasename):
          tmpalignment = clean_text(str(tmprow.get("alignRequirements", "Any")))
          if (tmpbasename, tmppath) in PATH_ALIGNMENTS:
              tmpalignment = PATH_ALIGNMENTS[(tmpbasename, tmppath)]
          if tmpalignment == "@align":
              note("class-alignment-unresolved", where, "his row defers to getAlignRequirements and no path resolves it")
              tmpalignment = "Any"
          tmpskilllist, tmpskillstrings = build_class_skills(skilllists.get(tmpbasename, []), tmppathvar, tmppath)
          docs.append(make_doc(tmpname, "class", {
            "casting": {
                "isCaster": to_bool(tmprow.get("isCaster")),
                "isInvoker": to_bool(tmprow.get("isInvoker")),
                "casterStartTitle": to_number(tmprow.get("casterStartTitle"), where, "casterStartTitle"),
                "invokerStartTitle": to_number(tmprow.get("invokerStartTitle"), where, "invokerStartTitle"),
                "communeTitleMod": to_number(tmprow.get("communeTitleMod"), where, "communeTitleMod"),
                "castingNotes": clean_text(str(tmprow.get("casting", ""))),
            },
            "requirements": {
                "alignment": tmpalignment,
                "focusAttributes": clean_text(str(tmprow.get("focusAttributes", ""))),
                "attribQualify": tmpqualify,
            },
            "advancement": {
                "titles": tmptitles,
                "classSkills": tmpskillstrings,
                "classSkillList": tmpskilllist,
                "goalAttr1": tmpgoal1,
                "goalAttr2": tmpgoal2,
            },
            "classMods": tmpmods,
            "armorUsage": clean_text(str(tmprow.get("armorUsage", "Any"))),
            "weaponUsage": clean_text(str(tmprow.get("weaponUsage", "Any"))),
            "attackSkill": clean_text(str(tmprow.get("attackSkill", ""))),
            "attackSkillList": clean_text(str(tmprow.get("attackSkillList", ""))),
            "loreAttackTitle": to_number(loremap.get(tmpbasename, 0), where, "loreAttackTitle"),
            "weaponLoreTitle": to_number(weaponloremap.get(tmpbasename, 0), where, "weaponLoreTitle"),
            "missileLoreTitle": to_number(missileloremap.get(tmpbasename, 0), where, "missileLoreTitle"),
            "projectileLoreTitle": to_number(projectileloremap.get(tmpbasename, 0), where, "projectileLoreTitle"),
            "secondWeaponKnowTitle": to_number(know2ndmap.get(tmpbasename, 0), where, "secondWeaponKnowTitle"),
            "secondWeaponLoreTitle": to_number(lore2ndmap.get(tmpbasename, 0), where, "secondWeaponLoreTitle"),
            "multiMissileLoreTitle": to_number(multimissileloremap.get(tmpbasename, 0), where, "multiMissileLoreTitle"),
            "skillSlotsNeeded": to_number(slotsmap.get(tmpbasename, 0), where, "skillSlotsNeeded"),
            "classType": clean_text(str(tmprow.get("classType", ""))),
            "description": clean_text(str(tmprow.get("description", ""))),
            "blockedRaces": [clean_text(r) for r in blockedraces.get(tmpbasename, [])],
            "baseClass": tmpbasename,
            "path": tmppath or "",
            "nonClassed": tmpbasename in NON_CLASSED,
            "archMortal": tmparch,
        }))
        if tmpbasename not in blockedraces:
            note("class-missing-from-table", where, "no entry in classRaceAndDetails; no race is barred")
    # Hand-authored classes are merged by apply_manual_content in main(), as for every other pack.
    return docs


# @MARKER CLASS PATHS
# The classes whose skills or alignment depend on a choice made when the class is taken. Each
# becomes one document per path, named in his own parenthesised style ("Archer(Arcane)",
# "Witch(Black)"), so a Game Master can allow or forbid a single path and a compendium lists each.
# The variable is the one setClassSkillLists and getAlignRequirements test; the options are the
# ones his sheet's selects offer (ImagineTabbedCharacterSheet.html, around line 32470).
CLASS_PATHS = {
    # class               variable          options
    "Elemental Dancer":   ("dancerelement",  ["Water", "Air", "Earth", "Fire", "Light", "Dark"]),
    "Elementalist":       ("lifedeath",      ["Call of Life", "Call of Death"]),
    "Summoner":           ("lifedeath",      ["Call of Life", "Call of Death"]),
    "Innominate":         ("goodevil",       ["Detect Evil", "Detect Good"]),
    "Inquisitor":         ("blessblasphemy", ["Bless", "Blasphemy"]),
    "Knight":             ("knightvariant",  ["Standard", "Templar"]),
    "Knight(Dark)":       ("knightvariant",  ["Standard", "Templar"]),
}

# A path whose document is not simply "Class(Option)". The Knights' Standard variant is the
# ordinary Knight -- nothing in his data names it -- so it keeps the plain name, and his own
# modifier text calls the dark one's other variant "Dark Templar". NOTE his sheet never shows the
# variant select at all (knight_choice_sheet is only ever set to "knight_choice_none"), so on his
# sheet a Templar cannot actually be chosen; UPSTREAM-ISSUES.md item 33.
PATH_NAMES = {
    ("Knight", "Standard"):       "Knight",
    ("Knight", "Templar"):        "Knight(Templar)",
    ("Knight(Dark)", "Standard"): "Knight(Dark)",
    ("Knight(Dark)", "Templar"):  "Knight(Dark Templar)",
}

# The alignment each path requires, from getAlignRequirements (sheet-worker.js:51237). Eight short
# strings, so transcribed with the line cited rather than walked. A path not listed keeps the
# alignment on its class row.
#
# Innominate's second branch is written `goodorevilselect=="Detect Evil"` a second time, so his
# "Detect Good" path can never reach its own requirement and falls through to the default, Good.
# The port takes the evident intent: Detect Good is the evil path. UPSTREAM-ISSUES.md item 33.
PATH_ALIGNMENTS = {
    ("Elementalist", "Call of Life"):  "True Neutral or Neutral Good",
    ("Elementalist", "Call of Death"): "True Neutral or Neutral Evil",
    ("Summoner", "Call of Life"):      "Any Non-Evil, Passive",
    ("Summoner", "Call of Death"):     "Any Evil, Passive",
    ("Innominate", "Detect Evil"):     "Good (Active), Fanatical Good (Active)",
    ("Innominate", "Detect Good"):     "Evil (Active), Fanatical Evil (Active)",
    ("Inquisitor", "Bless"):           "Fanatical Good",
    ("Inquisitor", "Blasphemy"):       "Fanatical Evil",
}

# Classes that are not a class at all. GME, the Game Master Extra, is "0-title non-classed" in his
# words (UPSTREAM-ISSUES.md item 22): any social and racial skills, no class skills, no racial
# title-1 bonuses, and an attack chart picked outright rather than earned.
NON_CLASSED = {"GME"}


def class_paths(tmpbasename):
    """[(document name, path variable, path option)] -- a single entry for a class with no choice."""
    if tmpbasename not in CLASS_PATHS:
        return [(tmpbasename, None, None)]
    tmpvar, tmpoptions = CLASS_PATHS[tmpbasename]
    return [(PATH_NAMES.get((tmpbasename, tmpoption), "%s(%s)" % (tmpbasename, tmpoption)), tmpvar, tmpoption)
            for tmpoption in tmpoptions]


def build_class_skills(tmpentries, tmppathvar, tmppath):
    """
    One path's class skills, out of his setClassSkillLists entries.

    An entry conditioned on the path variable is kept only if it matches this path. An entry whose
    name IS the path choice (lifedeath, goodevil, blessblasphemy) takes the path's option as its
    name. An entry conditioned on `nocast` -- a race that cannot cast -- is kept either way, marked
    requires "caster" or "nonCaster", because which one applies depends on the character's race.

    Returns (structured list, per-title strings). The strings are what the sheet's class-progression
    rows show: a title's skills comma-joined, and where a slot differs for races that cannot cast,
    "Scroll Knowledge (no-casting races: Hermetic Lore)".
    """
    tmplist = []
    for tmpentry in tmpentries:
        tmpkeep = True
        tmprequires = ""
        for tmpvar, tmpval in tmpentry.get("when", {}).items():
            if tmpvar == "nocast":
                tmprequires = "nonCaster" if tmpval == "yes" else "caster"
            elif tmpvar == tmppathvar:
                if tmpval.startswith("!"):
                    tmpkeep = tmppath not in tmpval[1:].split("|")
                else:
                    tmpkeep = (tmpval == tmppath)
            else:
                note("class-skill-unknown-condition", "setClassSkillLists",
                     "condition %s=%s not resolved" % (tmpvar, tmpval))
        if not tmpkeep:
            continue
        tmpskill = tmpentry.get("name")
        if tmpskill is None:
            if tmpentry.get("choice") != tmppathvar or not tmppath:
                note("class-skill-unresolved-choice", "setClassSkillLists",
                     "a skill named by %s with no path to resolve it" % tmpentry.get("choice"))
                continue
            tmpskill = tmppath
        tmplist.append({"slot": tmpentry["slot"], "title": tmpentry["title"], "name": clean_text(tmpskill),
                        "core": bool(tmpentry.get("core")), "requires": tmprequires})

    tmpstrings = []
    for tmptitle in range(1, max([e["title"] for e in tmplist], default=0) + 1):
        tmpparts = []
        for tmpslot in sorted(set(e["slot"] for e in tmplist if e["title"] == tmptitle)):
            tmpinslot = [e for e in tmplist if e["slot"] == tmpslot]
            tmptext = ", ".join(e["name"] for e in tmpinslot if e["requires"] != "nonCaster")
            tmpnoncast = [e["name"] for e in tmpinslot if e["requires"] == "nonCaster"]
            if tmpnoncast:
                tmptext = "%s (no-casting races: %s)" % (tmptext, ", ".join(tmpnoncast))
            tmpparts.append(tmptext)
        tmpstrings.append(", ".join(tmpparts))
    for tmpentry in tmplist:
        del tmpentry["slot"]
    return tmplist, tmpstrings


# @MARKER HAND-AUTHORED CONTENT
# Every pack can take hand-authored entries, from src/packs/manual/<pack>.json, merged over what his
# sheet-worker builds. This is the way content is added to the system without touching code: a new
# class, a homebrew weapon, a race from a book he has not yet put in his sheet, or a correction to
# one of his entries. See docs/ADDING-CONTENT.md.
#
# The file shape, the same for every pack:
#
#     {
#       "_about": "anything -- keys starting with _ are notes and are never read as content",
#       "entries": {
#         "Name Of Thing": { ...the item's system fields, exactly as a document of that pack has them... },
#         "Another":       { "_override": true, ...only the fields to change on his entry of that name... }
#       }
#     }
#
# The rules:
#   - A NEW name is added as a new document. Fields left out take the schema's defaults when it is
#     imported into Foundry, so an entry only has to say what matters.
#   - A name his data ALREADY builds is ignored and reported, unless the entry says "_override": true.
#     Then its fields are laid over his, field by field (a list replaces a list whole), and that too is
#     reported, every run. His data is the source of truth, so changing it has to be said out loud.
#   - A class name that is the BASE of his paths (Elemental Dancer, of Elemental Dancer(Water) and the
#     rest) counts as built.
#   - With no sourcebook given, a hand-authored entry is tagged "Custom". That puts every piece of
#     homebrew under one switch in the Game Master's content settings, so it can all be turned off
#     together, or kept out of a campaign that wants the published game only.
#   - A field name the pack's documents do not have is reported, since it is almost always a typo
#     that would otherwise be silently dropped on import.

MANUAL_DIR = os.path.join(HERE, "..", "..", "src", "packs", "manual")

# The document type each pack holds, and, for the three trait packs, the category a hand-authored
# entry gets if it does not say.
PACK_TYPES = {
    "skills": ("skill", None), "weapons": ("weapon", None), "armor": ("armor", None),
    "equipment": ("equipment", None), "races": ("race", None), "classes": ("class", None),
    "abilities": ("trait", "ability"), "disabilities": ("trait", "disability"),
    "immunities": ("trait", "immunity"),
}


def merge_fields(tmpbase, tmpover):
    """Lay tmpover over tmpbase: objects merge key by key, anything else -- lists included -- is
    replaced whole."""
    tmpout = dict(tmpbase)
    for tmpkey, tmpvalue in tmpover.items():
        if isinstance(tmpvalue, dict) and isinstance(tmpout.get(tmpkey), dict):
            tmpout[tmpkey] = merge_fields(tmpout[tmpkey], tmpvalue)
        else:
            tmpout[tmpkey] = tmpvalue
    return tmpout


def schema_field_names(tmptype):
    """Every field name the item type's data model declares, read from module/data/item-<type>.mjs.

    A flat set of names rather than a tree: the schema files build some fields through helpers
    (modField(), movementRateField()), which a tree reading would have to execute. A misspelt field
    is almost never another field's real name, so checking each name against the whole set catches
    what the check exists to catch."""
    tmpfile = {"creatureAttack": "item-creature-attack"}.get(tmptype, "item-" + tmptype)
    path = os.path.join(HERE, "..", "..", "module", "data", tmpfile + ".mjs")
    if not os.path.exists(path):
        return set()
    tmptext = open(path, encoding="utf-8").read()
    return set(re.findall(r'(\w+)\s*:\s*(?:new\s+fields\.|\w+Field\()', tmptext))


def unknown_fields(tmpsystem, tmpnames, tmpprefix=""):
    """The field paths in tmpsystem whose name the pack's schema does not declare."""
    tmpout = []
    for tmpkey, tmpvalue in tmpsystem.items():
        if tmpkey.startswith("_"):
            continue
        if tmpkey not in tmpnames:
            tmpout.append(tmpprefix + tmpkey)
        elif isinstance(tmpvalue, dict):
            tmpout.extend(unknown_fields(tmpvalue, tmpnames, tmpprefix + tmpkey + "."))
    return tmpout


def generated_field_names(tmpvalue, tmpnames):
    """Every key anywhere in a generated document's system, added to tmpnames."""
    if isinstance(tmpvalue, dict):
        for tmpkey, tmpinner in tmpvalue.items():
            tmpnames.add(tmpkey)
            generated_field_names(tmpinner, tmpnames)
    elif isinstance(tmpvalue, list):
        for tmpinner in tmpvalue:
            generated_field_names(tmpinner, tmpnames)
    return tmpnames


def apply_manual_content(tmppack, tmpdocs):
    """Merge src/packs/manual/<pack>.json into one pack's generated documents."""
    path = os.path.join(MANUAL_DIR, tmppack + ".json")
    if not os.path.exists(path):
        return tmpdocs
    with open(path, encoding="utf-8") as fh:
        payload = json.load(fh)

    tmptype, tmpcategory = PACK_TYPES[tmppack]
    tmpbyname = {d["name"]: d for d in tmpdocs}
    # a class his paths are built from counts as built, under its base name
    tmpbases = {d["system"].get("baseClass") for d in tmpdocs if tmppack == "classes"} - {None, ""}
    # what "a field of this pack" means: every name its schema declares, and every key its generated
    # documents carry (a few, like the coverage areas, are keys inside an object field)
    tmpknown = schema_field_names(tmptype)
    for tmpdoc in tmpdocs:
        generated_field_names(tmpdoc["system"], tmpknown)

    for tmpname, tmprow in payload.get("entries", {}).items():
        where = "manual/%s/%s" % (tmppack, tmpname)
        tmpsystem = {k: v for k, v in tmprow.items() if not k.startswith("_")}
        for tmpfield in unknown_fields(tmpsystem, tmpknown):
            note("manual-unknown-field", where, "%s is not a field of this pack's documents" % tmpfield)

        if tmpname in tmpbyname or tmpname in tmpbases:
            if not tmprow.get("_override"):
                note("manual-ignored", where, "his data already builds this; say \"_override\": true to change it")
                continue
            if tmpname not in tmpbyname:
                note("manual-ignored", where, "is the base of several path documents; override each path by its own name")
                continue
            tmpdoc = tmpbyname[tmpname]
            tmpdoc["system"] = merge_fields(tmpdoc["system"], tmpsystem)
            note("manual-override", where, "fields laid over his: %s" % ", ".join(sorted(tmpsystem)))
            continue

        if not tmpsystem.get("sourcebook"):
            tmpsystem["sourcebook"] = "Custom"
        if tmpcategory and not tmpsystem.get("category"):
            tmpsystem["category"] = tmpcategory
        tmpdocs.append(make_doc(tmpname, tmptype, tmpsystem))
        tmpbyname[tmpname] = tmpdocs[-1]
        note("manual-added", where, "added (sourcebook %s)" % tmpsystem["sourcebook"])
    return tmpdocs


# Abilities, disabilities and immunities: which pair of dictionaries feeds each category, and
# which of the two is the creature-side copy. Both are read because they disagree with one
# another -- see docs/UPSTREAM-ISSUES.md item 10.
TRAIT_SOURCES = {
    "ability":    ("abilitylist@176213",    "abilitylist@45725"),
    "disability": ("disabilitylist@177698", "disabilitylist@45903"),
    "immunity":   ("immunitylist@177965",   "immunitylist@45988"),
}


def build_traits(tmpcategory):
    """
    One category of trait, drawn from both of his copies of that dictionary.

    Each category is built into its own pack rather than all three into one, because 19 names
    appear in two categories at once -- Poison, Acid, Aura, Regeneration and Insanity among
    them -- and the importer matches documents by name, so a combined pack would silently
    overwrite one with the other.

    Where a name is in both copies and the rows differ, the creature row wins: it is the larger
    and more recently extended list, and a trait is descriptive here, so the difference is text
    rather than mechanics. Every such conflict is reported so the choice stays visible.

    value1 and value2 stay strings deliberately. Their meaning is per entry, not per column --
    a damage multiplier of .5 in one row, a magic-resistance penalty of -10 in another -- so
    reading them as numbers would imply a consistency the data does not have.
    """
    tmpcreaturename, tmpracialname = TRAIT_SOURCES[tmpcategory]
    tmpcreature = load_named(tmpcreaturename)
    tmpracial = load_named(tmpracialname)
    if not tmpcreature and not tmpracial:
        return []

    tmpcreaturerows = tmpcreature["entries"] if tmpcreature else {}
    tmpracialrows = tmpracial["entries"] if tmpracial else {}

    docs = []
    for tmpkey in sorted(set(tmpcreaturerows) | set(tmpracialrows)):
        where = "%s/%s" % (tmpcategory, tmpkey)
        tmpinboth = tmpkey in tmpcreaturerows and tmpkey in tmpracialrows
        if tmpinboth and tmpcreaturerows[tmpkey] != tmpracialrows[tmpkey]:
            note("trait-copies-differ", where,
                 "creature and racial rows differ; keeping the creature row")
        tmprow = tmpcreaturerows.get(tmpkey) or tmpracialrows[tmpkey]

        # An entry only his racial list carries: it will never be reached by the creature
        # lookup in his sheet, but a character's race can still grant it.
        if tmpkey not in tmpcreaturerows:
            note("trait-racial-only", where, "in the racial list only")

        docs.append(make_doc(tmpkey, "trait", {
            "category": tmpcategory,
            "canonicalName": clean_text(str(tmprow.get("canonicalName", ""))),
            "value1": clean_text(str(tmprow.get("value1", ""))),
            "value2": clean_text(str(tmprow.get("value2", ""))),
            # These dictionaries carry no book or page of their own. Left blank rather than
            # guessed at: untagged content is always available at the sourcebook level.
            "sourcebook": "",
            "page": "",
            "description": clean_text(str(tmprow.get("description", ""))),
        }))
    return docs


BUILDERS = {
    "skills": build_skills,
    "weapons": build_weapons,
    "armor": build_armor,
    "equipment": build_equipment,
    "races": build_races,
    "classes": build_classes,
    "abilities": lambda: build_traits("ability"),
    "disabilities": lambda: build_traits("disability"),
    "immunities": lambda: build_traits("immunity"),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--write", action="store_true")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    if args.write:
        os.makedirs(OUT, exist_ok=True)

    total = 0
    print(f"{'pack':14} {'documents':>10}")
    print("-" * 28)
    for tmpname, tmpbuilder in BUILDERS.items():
        docs = apply_manual_content(tmpname, tmpbuilder())
        total += len(docs)
        print(f"{tmpname:14} {len(docs):10}")
        if args.write:
            with open(os.path.join(OUT, tmpname + ".json"), "w", encoding="utf-8") as fh:
                json.dump(docs, fh, indent=2, ensure_ascii=False)
    print("-" * 28)
    print(f"{'total':14} {total:10}")

    if issues:
        print(f"\n{len(issues)} issue(s) found:")
        bykind = Counter(i["kind"] for i in issues)
        for tmpkind, tmpcount in bykind.most_common():
            print(f"  {tmpkind}: {tmpcount}")
            for tmpissue in [i for i in issues if i["kind"] == tmpkind][:5]:
                print(f"      {tmpissue['where']}  {tmpissue['detail']}")
    else:
        print("\nno conversion issues")


if __name__ == "__main__":
    main()
