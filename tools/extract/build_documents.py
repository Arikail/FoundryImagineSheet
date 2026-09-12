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

    docs = []
    for tmpname, tmprow in payload["entries"].items():
        where = "raceStatsAndMoveDetails/%s" % tmpname
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

    # When a class starts reading the Lore attack chart, from getLoreAttackChart via
    # extract_combat_tables.py. Zero means it never does, which is true of about half of them.
    loretitles = load_named("classLoreTitles")
    loremap = loretitles["entries"] if loretitles else {}
    # And the titles at which a class acquires Weapon and Missile Lore themselves, from
    # getWeaponLoreWhen / getMissileLoreWhen. Zero means the class never gets that lore.
    weaponloremap = loretitles.get("weaponLoreWhen", {}) if loretitles else {}
    missileloremap = loretitles.get("missileLoreWhen", {}) if loretitles else {}

    docs = []

    for tmpname, tmprow in details["entries"].items():
        if tmpname == "":
            continue  # the blank key is the "no class" default row
        where = "classRequirementsAndDetails/%s" % tmpname

        tmptitles = []
        if tmpname in titlemap:
            tmptitles = [clean_text(t) for t in titlemap[tmpname].get("titles", []) if clean_text(t)]
        else:
            note("missing-titles", where, "no entry in classtitledict")

        tmpgoal1 = tmpgoal2 = ""
        if tmpname in goalmap:
            tmpgoal1 = clean_text(goalmap[tmpname].get("goalAttr1", ""))
            tmpgoal2 = clean_text(goalmap[tmpname].get("goalAttr2", ""))
        else:
            note("missing-goalup", where, "no entry in goalupdict")

        tmpmods = []
        for tmpkey in ("classMod1", "classMod2", "classMod3", "classMod4", "classMod5"):
            tmpmod = clean_text(str(tmprow.get(tmpkey, "")))
            if tmpmod:
                tmpmods.append(tmpmod)

        tmpqualify = tmprow.get("attribQualify", [])
        if not isinstance(tmpqualify, list):
            tmpqualify = []

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
                "alignment": clean_text(str(tmprow.get("alignRequirements", "Any"))),
                "focusAttributes": clean_text(str(tmprow.get("focusAttributes", ""))),
                "attribQualify": tmpqualify,
            },
            "advancement": {
                "titles": tmptitles,
                "goalAttr1": tmpgoal1,
                "goalAttr2": tmpgoal2,
            },
            "classMods": tmpmods,
            "armorUsage": clean_text(str(tmprow.get("armorUsage", "Any"))),
            "weaponUsage": clean_text(str(tmprow.get("weaponUsage", "Any"))),
            "attackSkill": clean_text(str(tmprow.get("attackSkill", ""))),
            "attackSkillList": clean_text(str(tmprow.get("attackSkillList", ""))),
            "loreAttackTitle": to_number(loremap.get(tmpname, 0), where, "loreAttackTitle"),
            "weaponLoreTitle": to_number(weaponloremap.get(tmpname, 0), where, "weaponLoreTitle"),
            "missileLoreTitle": to_number(missileloremap.get(tmpname, 0), where, "missileLoreTitle"),
            "classType": clean_text(str(tmprow.get("classType", ""))),
            "description": clean_text(str(tmprow.get("description", ""))),
        }))
    return docs


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
        docs = tmpbuilder()
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
