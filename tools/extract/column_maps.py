#!/usr/bin/env python3
"""
column_maps.py -- names for the positional columns of each data dictionary.

Build-time tooling. Not shipped with the Foundry system.

Every map below is sourced, and the source matters when auditing these against
his sheet later:

  "header"  -- taken from the column-header comment he wrote above the
               dictionary itself.
  "code"    -- derived from how the sheet-worker consumes the row, i.e. the
               field each index is written to via setAttrs. Produced by
               derive_column_maps.py; the comment records the variable and
               line to check against.
  "obvious" -- the dictionary is self-describing (a list of title names by
               index, a pair of attribute abbreviations, and so on).

Names here are lightly normalised from his field names: the `race_tmp_`
prefix in the race map is an artefact of the body-transform code path that
happens to read the table, not part of the race definition, so it is dropped.
Where a name is not obvious from the index, his original field name is kept so
the mapping stays checkable against his code.
"""

# ---------------------------------------------------------------------------
# @MARKER CORE SCOPE MAPS
# ---------------------------------------------------------------------------

    # skilldict -- source: header comment at sheet-worker.js:52755
SKILLDICT = [
    "attr1", "attr2", "skillRating", "startingDice", "time",
    "types", "learn", "sourcebook", "page", "description",
]

    # socialskilldict -- source: code. No header comment exists. Column 4 is
    # confirmed as learn time by getSocialSkillLearnTime (sheet-worker.js:56769),
    # which reads skillDetails[4] and falls back to skillDetails[2]*4.
SOCIALSKILLDICT = [
    "attr1", "attr2", "skillRating", "startingDice", "learnTime",
    "sourcebook", "page", "description",
]

    # weaponvalueslist -- source: header comment at sheet-worker.js:79269
WEAPONVALUESLIST = [
    "damage", "strength", "speed", "minSpeed", "length",
    "missile", "thrust", "cut", "smash", "skills",
    "weight", "type", "material",
    "rangePointBlank", "rangeShort", "rangeMedium", "rangeLong", "rangeExtreme",
]

    # armorvalueslist -- source: header comment at sheet-worker.js:79901.
    # Columns 2-20 are per-body-location armour values; column 1 is the
    # flexibility class (Clothing / Flexible / Semi-Flexible / Rigid), which
    # drives the layering rules.
ARMORVALUESLIST = [
    "material", "flexibility",
    "head", "neck", "shoulderLeft", "shoulderRight",
    "torsoUpper", "torsoMid", "torsoLower",
    "armLeft", "armRight", "forearmLeft", "forearmRight",
    "handLeft", "handRight",
    "thighLeft", "thighRight", "shinLeft", "shinRight",
    "footLeft", "footRight",
    "weight",
]

    # equipvalueslist -- source: header comment at sheet-worker.js:80697
EQUIPVALUESLIST = ["weight"]

    # raceStatsAndMoveDetails -- source: code. 62 unlabelled columns, derived
    # from tempRaceStatMoves reads at sheet-worker.js:33697-33758.
RACESTATSANDMOVEDETAILS = [
    # 0-11: attribute modifiers granted by the race
    "strMod", "aglMod", "vitMod", "intMod", "wisMod", "knwMod",
    "appMod", "chmMod", "socMod", "aurMod", "ptyMod", "wilMod",
    # 12-23: per-race attribute caps
    "strLimit", "aglLimit", "vitLimit", "intLimit", "wisLimit", "knwLimit",
    "appLimit", "chmLimit", "socLimit", "aurLimit", "ptyLimit", "wilLimit",
    # 24-29: endurance at creation, and per-title endurance advancement
    "startEnduranceFormula", "startEnduranceMod",
    "titleEnduranceFormula", "titleEnduranceDice",
    "titleEnduranceMax", "titleEnduranceMod",
    # 30-32: derived characteristics
    "perceptionMod", "affinityMod", "fortuneMod",
    # 33-37: resistances
    "magicResistMod", "illusionResistMod", "controlResistMod",
    "poisonResistMod", "diseaseResistMod",
    # 38-47: movement
    "speedMultiplier",
    "walkHourly", "walk10Sec", "walk1Sec",
    "jogHourly", "jog10Sec", "jog1Sec",
    "runHourly", "run10Sec", "run1Sec",
    # 48-57: special movement mode (fly, swim, scurry, ...)
    "specialMoveName",
    "specialHourly", "specialHourlyMultiplier", "specialHourlyMod",
    "special10Sec", "special10SecMultiplier", "special10SecMod",
    "special1Sec", "special1SecMultiplier", "special1SecMod",
    # 58-61
    "jumpStand", "jumpUp", "formless", "canSwim",
]

    # classRequirementsAndDetails -- source: code, derived from classDetails
    # reads at sheet-worker.js:51002-51023.
CLASSREQUIREMENTSANDDETAILS = [
    "isCaster", "isInvoker", "casterStartTitle", "invokerStartTitle",
    "communeTitleMod", "attackSkill", "attackSkillList",
    "alignRequirements", "focusAttributes", "description", "classType",
    "classMod1", "classMod2", "classMod3", "classMod4", "classMod5",
    "armorUsage", "weaponUsage", "classModifier", "titleName",
    "attribQualify", "casting",
]

    # classtitledict -- source: obvious. Positional list of the title names a
    # class earns as it advances; index 0 is Title 1. Row length is not fixed
    # (91 classes list 15 titles, 1 lists 16), so this is kept as a list rather
    # than fixed columns.
CLASSTITLEDICT = "LIST:titles"

    # goalupdict -- source: obvious. The two attributes a class may raise on a
    # goal advance.
GOALUPDICT = ["goalAttr1", "goalAttr2"]

# ---------------------------------------------------------------------------
# @MARKER ATTRIBUTE RATING TABLES
# ---------------------------------------------------------------------------
    # The twelve *RatingValues tables are keyed by attribute rating 0-30 and
    # hold that rating's derived modifiers. Columns differ per attribute and
    # match the attribute tables in the Player's Guide and Master's Manual.
    # Source: code, from changeAttribs (sheet-worker.js:29647 onward).

    # All twelve verified against the setAttrs reads in changeAttribs
    # (sheet-worker.js:29647-30260) rather than inferred from the rulebook
    # tables -- four of them (app, aur, pty, wil) carry extra "special"
    # columns that the printed tables do not show.
RATING_VALUE_MAPS = {
    "strRatingValues": ["meleeAttack", "meleeDamage", "loadLimit", "weaponSpeed"],
    "aglRatingValues": ["missileAttack", "defensiveAdjust", "initiativeAdjust", "weaponSpeed"],
    "vitRatingValues": ["healingRate", "poisonResist", "diseaseResist"],
    "intRatingValues": ["spokenLanguages", "writtenLanguages", "auraControlAdjust",
                        "initiativeAdjust", "controlResistAdjust"],
    "wisRatingValues": ["pietyControl", "illusionResist", "controlResistAdjust"],
    "knwRatingValues": ["classSkills", "raceSkills", "socialSkills", "memorizationPoints"],
    "appRatingValues": ["morale", "controlAdjust", "special", "specialChance"],
    "chmRatingValues": ["morale", "controlAdjust"],
    "socRatingValues": ["morale", "rank"],
    "aurRatingValues": ["magicResist", "regenBonusLabel", "regenBonus"],
    "ptyRatingValues": ["commune", "specialLabel", "specialNum"],
    "wilRatingValues": ["controlResist", "endure", "specialLabel", "specialNum"],
}

    # armorpenaltydict -- source: header comment at sheet-worker.js:107061 ("skills def
    # init speed"). Keyed by the same armour names as armorvalueslist, covering only the
    # pieces that actually encumber the wearer.
ARMORPENALTYDICT = ["skills", "defense", "initiative", "speed"]

    # abilitylist / disabilitylist / immunitylist -- source: header comment above each
    # dictionary, e.g. sheet-worker.js:176212 ("Name  Value1  Value2  Description").
    #
    # There are two copies of each: a smaller one used for racial abilities on the character
    # side (getRacialAbilityDetails and its twins, lines 45721, 45899, 45984) and a larger
    # creature-side one (getCreatureAbilityDetails and twins, lines 176209, 177693, 177961).
    # Both are mapped, because they disagree -- see docs/UPSTREAM-ISSUES.md item 10.
    #
    # Column 0 is a canonical name that is NOT always the key it is looked up by: the key
    # "Acid Regeneration" carries the canonical name "Regeneration(Acid)", and three spellings
    # of "360-degree vision" all resolve to one entry. Columns 1 and 2 are values whose meaning
    # is per entry rather than per column, which is why they stay strings downstream.
TRAITDICT = ["canonicalName", "value1", "value2", "description"]

MAPS = {
    "skilldict": SKILLDICT,
    "abilitylist@176213": TRAITDICT,
    "abilitylist@45725": TRAITDICT,
    "disabilitylist@177698": TRAITDICT,
    "disabilitylist@45903": TRAITDICT,
    "immunitylist@177965": TRAITDICT,
    "immunitylist@45988": TRAITDICT,
    "armorpenaltydict": ARMORPENALTYDICT,
    "socialskilldict": SOCIALSKILLDICT,
    "weaponvalueslist": WEAPONVALUESLIST,
    "armorvalueslist": ARMORVALUESLIST,
    "equipvalueslist": EQUIPVALUESLIST,
    "raceStatsAndMoveDetails": RACESTATSANDMOVEDETAILS,
    "classRequirementsAndDetails": CLASSREQUIREMENTSANDDETAILS,
    "classtitledict": CLASSTITLEDICT,
    "goalupdict": GOALUPDICT,
}
MAPS.update(RATING_VALUE_MAPS)


# A row in his data that is the wrong width, and the repair HE has confirmed for it.
#
# Nothing goes in here on our own reading. Each entry cites the answer that authorised it, and
# each is reported every run, because this is the one place the extraction changes his data
# rather than recording a problem with it.
#
#   (dictionary, key) -> (expected width the row is short of, index to insert a blank at, why)
ROW_REPAIRS = {
    ("classRequirementsAndDetails", "Monk"): (
        21, 15,
        "Monk carries 4 classMod slots where every other class has 5, shifting armourUsage, "
        "weaponUsage, classModifier, titleName, attribQualify and casting one left. Confirmed "
        "2026-09-16: 'sounds like the right fix'. See docs/UPSTREAM-ISSUES.md item 1."
    ),
}
