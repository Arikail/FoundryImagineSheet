#!/usr/bin/env python3
"""
extract_starting_kit.py -- the three optional starting-equipment rules, out of his switches.

Build-time tooling. Not shipped with the Foundry system.

His sheet offers three optional ways to give a new character its kit, each its own tick, and any
combination of them may be on at once. None of them was ported until 2026-09-20:

    by SKILLS    do_social_skill_equip -- every social skill the character took brings its tools
                 with it. Accounting brings an abacus, Acting a costume and mask. Already extracted
                 as socialskillequiplist (207 entries); this file only re-shapes it.

    by STATUS    do_clothing -- free clothing decided by race, social class, gender and a style
                 (western/eastern). setClothing, sheet-worker.js:75027.

    by CULTURE   override_coins -- wilderness gear appropriate to the race, INSTEAD of starting
                 coins. setWildernessEquipmentByRace (73810) maps each race to one of six kits,
                 and each kit is a switch on social class. His own name for it is "wilderness
                 equipment"; Daryl calls it gear by culture, which is what it amounts to.

WHY A PARSER AND NOT A TRANSCRIPTION. This is about 1,230 lines of switch across seven functions.
Copying it out by hand would be a day of work, and one slip would be a wrong sword on somebody's
character with nothing to catch it. The structure is regular enough to walk, and walking it means
the tables can be regenerated when he sends a corrected sheet.

Usage:
    python tools/extract/extract_starting_kit.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
NAMED = os.path.join(ROOT, "src", "packs", "named")
RAW = os.path.join(ROOT, "src", "packs", "raw")
WORKER = os.path.join(ROOT, "docs", "reference", "sheet-worker.js")

lines = open(WORKER, encoding="utf-8", errors="replace").readlines()


# @MARKER ITEM LISTS
# His kit strings are comma-separated item names, and two things make a naive split wrong.
#
# A comma can fall INSIDE the parentheses that qualify a name -- "Hood(Bird, Leather)" is one item,
# not a hood and a leather. Splitting on every comma produced "Hood(Bird" and "Leather)", which
# match nothing and would have reached a character as two missing items.
#
# And his data writes an apostrophe as a backtick throughout, which build_documents.py already
# cleans when it builds the packs. A name cleaned on one side and not the other never matches, so
# the same cleaning is done here.

def clean_text(tmpvalue):
    return str(tmpvalue or "").replace("`", "'").strip()


def item_list(tmpvalue):
    """A comma-separated item string as a list, splitting only on commas outside parentheses."""
    tmpout, tmpcurrent, tmpdepth = [], "", 0
    for tmpchar in str(tmpvalue or ""):
        if tmpchar == "(":
            tmpdepth += 1
        elif tmpchar == ")":
            tmpdepth = max(0, tmpdepth - 1)
        if tmpchar == "," and tmpdepth == 0:
            if clean_text(tmpcurrent):
                tmpout.append(clean_text(tmpcurrent))
            tmpcurrent = ""
            continue
        tmpcurrent += tmpchar
    if clean_text(tmpcurrent):
        tmpout.append(clean_text(tmpcurrent))
    return tmpout


def function_body(name):
    """Return (first line number, list of lines) for a function by name, by brace depth."""
    starts = [i for i, l in enumerate(lines)
              if re.match(r'\s*function %s\s*\(' % re.escape(name), l)]
    if not starts:
        raise SystemExit("function not found: " + name)
    i = starts[-1]
    depth, out = 0, []
    for j in range(i, len(lines)):
        out.append(lines[j])
        depth += lines[j].count("{") - lines[j].count("}")
        if depth <= 0 and j > i:
            break
    return i + 1, out


# @MARKER GEAR BY CULTURE

def race_to_kit():
    """
    Which wilderness kit each race takes, from setWildernessEquipmentByRace.

    A plain switch: a run of `case "Race":` labels followed by one setXWildernessEquipment() call,
    so the labels accumulate until a call is seen and are then all assigned to it.
    """
    start, body = function_body("setWildernessEquipmentByRace")
    out, pending = {}, []
    for line in body:
        m = re.search(r'case\s+"([^"]*)"\s*:', line)
        if m:
            pending.append(m.group(1))
            continue
        m = re.search(r'(set[A-Za-z]*WildernessEquipment)\s*\(\s*\)', line)
        if m and pending:
            for tmprace in pending:
                if tmprace:
                    out[tmprace] = m.group(1)
            pending = []
    return out, start


# The three fields a kit sets, and the name each gets in the output.
KIT_FIELDS = {
    "start_armor_clothing": "armorClothing",
    "start_weapons": "weapons",
    "start_general_equipment": "generalEquipment",
}


def kit_table(tmpname):
    """
    One kit function as {social class: [alternative, ...]}.

    Each social band sets some of the three fields outright, and MAY then roll a die and set more
    of them differently in each branch. So a band is a list of alternatives, each a complete
    {armorClothing, weapons, generalEquipment}: the values set outright are the common ground, and
    each die branch is that common ground with its own values laid over it. A band with no die roll
    has exactly one alternative, which is the ordinary case.
    """
    start, body = function_body(tmpname)

    # Brace depth is what tells a social band from an alternative. `switch(tempsocial)` opens at one
    # depth and its `case 12:` labels sit just inside it; a `switch(randomnum1)` inside a band opens
    # deeper, and ITS `case 1:` labels are the four weapon sets to choose between, not social
    # classes. Reading the inner ones as bands is what first produced kits with a social class 1
    # and no weapons at all above 11.
    tmpgroups = []
    tmpdepth, tmpouter, tmpinner = 0, None, None
    tmpcurrent = None

    for line in body:
        tmpbefore = tmpdepth
        if re.search(r'switch\s*\(\s*tempsocial\s*\)', line):
            tmpouter = tmpbefore
        elif re.search(r'switch\s*\(\s*randomnum\d*\s*\)', line):
            tmpinner = tmpbefore

        m = re.search(r'case\s+(\d+)\s*:', line)
        if m and tmpouter is not None:
            if tmpinner is not None and tmpbefore > tmpouter + 1:
                # An alternative inside the die-roll switch.
                tmpcurrent["alts"].append({})
            else:
                # A social band. A run of labels with no body yet joins the group being built.
                if tmpcurrent is None or tmpcurrent["common"] or tmpcurrent["alts"]:
                    tmpcurrent = {"cases": [], "common": {}, "alts": [], "ended": False}
                    tmpgroups.append(tmpcurrent)
                tmpcurrent["cases"].append(int(m.group(1)))
        elif tmpcurrent is not None and (re.search(r'\bif\s*\(\s*randomnum\d*\s*==', line)
                                         or re.search(r'\}\s*else\b', line)):
            tmpcurrent["alts"].append({})
        else:
            m = re.search(r'setAttrs\(\{\s*(start_\w+)\s*:\s*"([^"]*)"', line)
            if m and m.group(1) in KIT_FIELDS and tmpcurrent is not None:
                tmpkey = KIT_FIELDS[m.group(1)]
                if tmpcurrent["alts"]:
                    tmpcurrent["alts"][-1][tmpkey] = item_list(m.group(2))
                else:
                    tmpcurrent["common"][tmpkey] = item_list(m.group(2))

        # A break at the social-switch's own level ends the band; one deeper ends an alternative.
        if re.search(r'\bbreak\s*;', line) and tmpcurrent is not None and tmpouter is not None:
            if tmpbefore <= tmpouter + 1:
                tmpcurrent["ended"] = True

        tmpdepth += line.count("{") - line.count("}")
        if tmpinner is not None and tmpdepth <= tmpinner:
            tmpinner = None

    # @MARKER FALL-THROUGH
    # A band that does not end in `break` keeps running into the next one, and everything the next
    # band sets overwrites what this one set. That is not hypothetical: in every one of the six
    # kits, social 12-13 has no break after its weapon switch and falls into 14. A character of
    # social class 12 therefore ends up in the 14-and-above gear. It is his code, so it is what the
    # table says; it is also almost certainly a slip, and is reported as UPSTREAM-ISSUES item 42.
    # Resolved from the END BACKWARDS, because a band that falls through runs its own statements
    # AND then the next band's, and the later assignment is the one that survives. So a band's real
    # outcome is its own values with everything the next band resolves to laid over the top -- and
    # since a band normally sets all three fields, falling through usually means the earlier band's
    # kit is wiped out entirely and the character simply gets the later one. Laying only the next
    # band's outright values over, and keeping this band's own die-roll branches, gave a social-5
    # character the 6/7 tunic with the social-5 club, which is a kit his sheet never produces.
    tmpfell = []
    tmpresolved = [None] * len(tmpgroups)
    for tmpindex in range(len(tmpgroups) - 1, -1, -1):
        tmpgroup = tmpgroups[tmpindex]
        tmpown = [dict(tmpgroup["common"], **a) for a in tmpgroup["alts"]] or [dict(tmpgroup["common"])]
        if tmpgroup["ended"] or tmpindex + 1 >= len(tmpgroups):
            tmpresolved[tmpindex] = tmpown
            continue
        tmpfell.append((tmpgroup["cases"], tmpgroups[tmpindex + 1]["cases"]))
        tmpafter = tmpresolved[tmpindex + 1] or [{}]
        tmpmerged, tmpseen = [], set()
        for tmpbase in tmpown:
            for tmpover in tmpafter:
                tmpone = dict(tmpbase, **tmpover)
                tmpkey = json.dumps(tmpone, sort_keys=True, ensure_ascii=False)
                if tmpkey in tmpseen:
                    continue
                tmpseen.add(tmpkey)
                tmpmerged.append(tmpone)
        tmpresolved[tmpindex] = tmpmerged
    tmpfell.reverse()

    out = {}
    for tmpindex, tmpgroup in enumerate(tmpgroups):
        for tmpcase in tmpgroup["cases"]:
            out[tmpcase] = [dict(a) for a in tmpresolved[tmpindex]]
    return out, start, tmpfell


# @MARKER CLOTHING BY STATUS

# The social bands his ladders test, richest first. Each is "this social class or above", and the
# last rung is the else: everything below the lowest threshold.
SOCIAL_BANDS = [14, 11, 9, 6, 0]


def clothing_table():
    """
    Free clothing by race, style, gender and social class, from setClothing.

    Regular once seen: a run of `case "Race":` labels, then optionally a style ladder
    (western / renaissance / eastern / african / kilted), then optionally a gender split, then
    always a social ladder reading `if (tempsocial>14) ... else if (tempsocial>11) ... else`.

    Races that do not vary by style or gender simply have fewer of those levels, so both are
    recorded as "any" rather than being forced into a shape they do not have.

    THE TWO KINDS OF `else` HAVE TO BE TOLD APART. A gender else and the bottom rung of a social
    ladder are both written `} else {`. They are distinguished by what follows: the gender else is
    followed by another social ladder, the social else by a clothing assignment.
    """
    start, body = function_body("setClothing")
    out = {}
    pending, style, gender, band = [], "any", "any", None

    def assign(tmptext):
        for tmprace in pending:
            tmpstyles = out.setdefault(tmprace, {})
            tmpgenders = tmpstyles.setdefault(style, {})
            tmpbands = tmpgenders.setdefault(gender, {})
            tmpbands[str(band if band is not None else 0)] = tmptext

    for i, line in enumerate(body):
        m = re.search(r'case\s+"([^"]*)"\s*:', line)
        if m:
            # A new run of races begins once the previous run has produced clothing.
            if out.get(pending[0] if pending else None):
                pending, style, gender, band = [], "any", "any", None
            if m.group(1):
                pending.append(m.group(1))
            continue
        m = re.search(r'tempstyle\s*==\s*"([a-z]+)"', line)
        if m:
            style, gender, band = m.group(1), "any", None
            continue
        if re.search(r'tempgender\s*==\s*"Female"', line):
            gender, band = "Female", None
            continue
        m = re.search(r'tempsocial\s*>\s*(\d+)', line)
        if m:
            band = int(m.group(1))
            continue
        if re.search(r'\belse\b', line) and "tempsocial" not in line and "tempstyle" not in line:
            # Look ahead: a social ladder after it means this else flipped gender instead.
            tmpnext = "".join(body[i + 1:i + 3])
            if "tempsocial" in tmpnext:
                gender, band = "Other", None
            else:
                band = 0
            continue
        m = re.search(r'tempclothing\s*=\s*"([^"]*)"', line)
        if m and m.group(1) and pending:
            assign(item_list(m.group(1)))
    return out, start


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    os.makedirs(NAMED, exist_ok=True)

    tmpraces, tmpraceline = race_to_kit()
    tmpkitnames = sorted(set(tmpraces.values()))
    print("gear by culture: %d races across %d kits" % (len(tmpraces), len(tmpkitnames)))

    tmpkits = {}
    for tmpkit in tmpkitnames:
        tmptable, tmpline, tmpfell = kit_table(tmpkit)
        tmpkits[tmpkit] = tmptable
        tmpbands = sorted(tmptable)
        tmpalts = sum(len(v) for v in tmptable.values())
        print("  %-48s social %s-%s, %d bands, %d alternative(s)"
              % (tmpkit, tmpbands[0] if tmpbands else "?", tmpbands[-1] if tmpbands else "?",
                 len(tmptable), tmpalts))
        for tmpfrom, tmpinto in tmpfell:
            print("      falls through: social %s takes the %s gear (no break in his switch)"
                  % ("/".join(str(c) for c in tmpfrom), "/".join(str(c) for c in tmpinto)))

    with open(os.path.join(NAMED, "wildernessEquipment.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js",
                        "function": "setWildernessEquipmentByRace", "line": tmpraceline},
            "_note": "His optional wilderness-equipment rule, taken INSTEAD of starting coins. "
                     "raceKit maps a race to one of six kits; kits maps a kit and a social class "
                     "to the alternatives for that band. More than one alternative means his code "
                     "rolls a die to choose between them.",
            "raceKit": tmpraces,
            "kits": tmpkits
        }, fh, indent=2, ensure_ascii=False)

    # By skills: already parsed, only re-shaped. His rows are a one-element list holding a
    # comma-separated string with leading spaces.
    tmppath = os.path.join(RAW, "socialskillequiplist.json")
    tmpskillkit = {}
    if os.path.exists(tmppath):
        tmpentries = json.load(open(tmppath, encoding="utf-8")).get("entries", {})
        for tmpskill, tmprow in tmpentries.items():
            tmpitems = item_list(",".join(str(x) for x in tmprow))
            if tmpitems:
                tmpskillkit[tmpskill] = tmpitems
    tmpclothing, tmpclothingline = clothing_table()
    tmpstyles = sorted({s for r in tmpclothing.values() for s in r})

    # Collapsed back into wardrobes. Written out one race at a time this is 202 KB for 124 distinct
    # strings, because his switch gives forty-one races the same case body. Grouping identical
    # bodies is both a tenth of the size and closer to his source, where they genuinely are one
    # case; the map from race to wardrobe is what his `case` run already says.
    tmpwardrobes, tmpracewardrobe = {}, {}
    for tmprace in sorted(tmpclothing):
        tmpkey = json.dumps(tmpclothing[tmprace], sort_keys=True, ensure_ascii=False)
        tmpfound = None
        for tmpid, (tmpsig, _) in tmpwardrobes.items():
            if tmpsig == tmpkey:
                tmpfound = tmpid
                break
        if tmpfound is None:
            tmpfound = "wardrobe%02d" % (len(tmpwardrobes) + 1)
            tmpwardrobes[tmpfound] = (tmpkey, tmpclothing[tmprace])
        tmpracewardrobe[tmprace] = tmpfound
    print("by status: %d races collapse to %d wardrobes, styles %s"
          % (len(tmpclothing), len(tmpwardrobes), ", ".join(tmpstyles)))

    with open(os.path.join(NAMED, "clothingByStatus.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js", "function": "setClothing",
                        "line": tmpclothingline},
            "_note": "His optional free-clothing rule. raceWardrobe maps a race to a wardrobe; a "
                     "wardrobe is style -> gender -> social band, where a band key is the social "
                     "class AT OR ABOVE which that clothing is worn (14, 11, 9, 6) and 0 is "
                     "everything below the lowest rung. A style or gender of 'any' means that "
                     "wardrobe does not vary by it. The grouping is his own: forty-one races share "
                     "one case body in setClothing.",
            "bands": SOCIAL_BANDS,
            "raceWardrobe": tmpracewardrobe,
            "wardrobes": {k: v[1] for k, v in tmpwardrobes.items()}
        }, fh, indent=2, ensure_ascii=False)

    print("by skills: %d social skills bring equipment" % len(tmpskillkit))
    with open(os.path.join(NAMED, "socialSkillEquipment.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js", "dictionary": "socialskillequiplist"},
            "_note": "His optional equipment-by-social-skill rule: each social skill the character "
                     "took brings these items.",
            "entries": tmpskillkit
        }, fh, indent=2, ensure_ascii=False)

    # @MARKER THE SHIPPED TABLE
    # The three tables as one generated module, beside the other extracted tables. The named JSON
    # above stays as the reviewable intermediate; this is what the system actually loads.
    tmpout = os.path.join(ROOT, "module", "starting-kit-tables.mjs")
    with open(tmpout, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(MODULE_HEADER)
        fh.write("// @MARKER GEAR BY CULTURE -- which kit each race takes.\n")
        fh.write("export const RACE_WILDERNESS_KIT = %s;\n\n" % js(tmpraces))
        fh.write("// Each kit by social class. A band holding more than one entry is a die roll\n"
                 "// between them, which is how his own code writes it.\n")
        fh.write("export const WILDERNESS_KITS = %s;\n\n" % js(tmpkits))
        fh.write("// @MARKER BY STATUS -- free clothing. Race to wardrobe, then wardrobe by\n"
                 "// style, gender and the social class at or above which it is worn.\n")
        fh.write("export const RACE_WARDROBE = %s;\n\n" % js(tmpracewardrobe))
        fh.write("export const WARDROBES = %s;\n\n" % js({k: v[1] for k, v in tmpwardrobes.items()}))
        fh.write("export const CLOTHING_BANDS = %s;\n\n" % js(SOCIAL_BANDS))
        fh.write("// @MARKER BY SKILLS -- what each social skill brings with it.\n")
        fh.write("export const SOCIAL_SKILL_EQUIPMENT = %s;\n" % js(tmpskillkit))
        fh.write("\n// @END (CODE)\n")
    print("wrote %s (%.1f KB)" % (os.path.relpath(tmpout, ROOT), os.path.getsize(tmpout) / 1024))


def js(tmpvalue):
    """A JSON value as JavaScript source, indented with tabs to match the hand-written modules."""
    return json.dumps(tmpvalue, indent="\t", ensure_ascii=False, sort_keys=False)


MODULE_HEADER = """// @START (CODE)
// @MARKER STARTING KIT TABLES
//==================================================================================================================
// GENERATED FILE -- do not edit by hand.
// Produced by tools/extract/extract_starting_kit.py from the original Roll20 sheet-worker.
// Regenerate rather than editing, or this will drift from his sheet.
//
// The three OPTIONAL ways his sheet gives a new character its kit. Any combination may be on, and
// all three are off by default, because his own sheet leaves them off and a Game Master who has
// not asked for them should not find gear appearing on their players.
//
//     by CULTURE   wilderness gear suited to the race, taken INSTEAD of starting coins
//     by STATUS    free clothing by race, social class, gender and style
//     by SKILLS    each social skill the character took brings its own tools
//
// Social class drives two of the three, and his rule for a being outside the mortal range is the
// same in both: a social class below 5 or above 20 has no meaning in the mortal realms, so an
// APPARENT one is rolled (5d4) and used instead. That is done once, by the caller, so the same
// apparent class serves the clothing and the gear rather than each rolling its own.
//==================================================================================================================

"""


if __name__ == "__main__":
    main()
