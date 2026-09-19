#!/usr/bin/env python3
"""
extract_combat_tables.py -- pull the combat tables out of the sheet-worker and emit
module/combat-tables.mjs, plus the race -> body type map the document builder uses.

Build-time tooling. Not shipped with the Foundry system.

Several of these tables are not data dictionaries at all -- they live as switch statements
inside functions (getBodyList, getRacialBodyType, getArmorValue). They are read here by
walking those functions, so the generated tables stay tied to his code rather than to a
hand transcription.

Tables produced:
    ATTACK_CHARTS           attackSkillValuesDetails  -- the seven attack skill bullseyes
    BODY_CHARTS             getBodyList               -- 45 body types, each a list of areas
    ARMOR_BLOCKING          armorblockingdict         -- damage blocked by armour, per type
    ARMOR_DAMAGE_DIVIDERS   armordamagedict           -- how fast each material degrades
    ARMOR_MATERIAL_RANK     getArmorValue             -- which material is the strongest

Race body types go to src/packs/named/raceBodyTypes.json.

Usage:
    python extract_combat_tables.py
"""

import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
WORKER = os.path.join(ROOT, "docs", "reference", "sheet-worker.js")
NAMED = os.path.join(ROOT, "src", "packs", "named")
RAW = os.path.join(ROOT, "src", "packs", "raw")
OUT = os.path.join(ROOT, "module", "combat-tables.mjs")

lines = open(WORKER, encoding="utf-8", errors="replace").readlines()


def function_body(name):
    """
    Return (first line number, list of lines) for a function by name.

    Takes the LAST declaration, because that is the one JavaScript actually runs: a later
    function declaration with the same name silently replaces an earlier one. His code has at
    least one such pair -- getArmorValue is declared at two places, and only the second is
    ever called.
    """
    starts = [i for i, l in enumerate(lines)
              if re.match(r'\s*function %s\s*\(' % re.escape(name), l)]
    if not starts:
        raise SystemExit("function not found: " + name)
    if len(starts) > 1:
        print("  note: %s is declared %d times (lines %s); using the last, as JavaScript does"
              % (name, len(starts), ", ".join(str(s + 1) for s in starts)))
    i = starts[-1]
    depth, out = 0, []
    for j in range(i, len(lines)):
        out.append(lines[j])
        depth += lines[j].count("{") - lines[j].count("}")
        if depth <= 0 and j > i:
            return i + 1, out
    raise SystemExit("unterminated function: " + name)


def switch_cases(body, assign):
    """
    Walk a switch statement and map each case label to the LAST value assigned to `assign`
    before the next break. Several labels can share one body (case "A": case "B": ...).
    Returns (mapping, conditional) where conditional lists labels whose body assigns more
    than once -- their value depends on something besides the case label.
    """
    mapping, conditional = {}, []
    labels, values = [], []
    pat = re.compile(r'%s\s*=\s*"([^"]*)"' % re.escape(assign))
    for l in body:
        found = re.findall(r'case\s+"([^"]*)"\s*:', l)
        if found and values:          # a new group begins after a group that assigned
            labels, values = [], []
        labels.extend(found)
        values.extend(pat.findall(l))
        if re.search(r'\bbreak\s*;', l):
            if labels and values:
                for lab in labels:
                    mapping.setdefault(lab, values[-1])
                    if len(set(values)) > 1 and lab not in conditional:
                        conditional.append(lab)
            labels, values = [], []
    return mapping, conditional


def attack_charts():
    """attackSkillValuesDetails is assigned inline; take the first occurrence."""
    for i, l in enumerate(lines):
        if "attackSkillValuesDetails={" in l.replace(" ", ""):
            charts = {}
            for j in range(i + 1, i + 20):
                m = re.match(r'\s*"([^"]*)"\s*:\s*\[(.*)\]', lines[j])
                if m:
                    charts[m.group(1)] = re.findall(r'"([^"]*)"', m.group(2))
                if lines[j].strip().startswith("}"):
                    break
            return charts, i + 1
    raise SystemExit("attack charts not found")


def body_charts():
    """
    Every body chart, with one confirmed typo corrected on the way through.

    Five charts write a thorax multiplier as `Vital:2` where every other area in every other
    chart writes `Vital:x2`. His createBodyAreas looks for the "x", so `Vital:2` matches nothing
    and the area silently keeps the previous area's multiplier -- x1 in all nine cases.

    He confirmed it 2026-09-16: "Item 9 is a typo/bug fix, it should be x2." So it is corrected
    here rather than reproduced, and every correction is reported. This is the only place the
    extraction edits his data, and it is on his word (docs/UPSTREAM-ISSUES.md item 9).
    """
    start, body = function_body("getBodyList")
    charts, _ = switch_cases(body, "newBodyList")

    tmpfixed = []
    for tmpname, tmpchart in charts.items():
        # A multiplier with no "x" -- "(Vital:2)" -- and never a legitimate "(Vital:x2)".
        tmpnew = re.sub(r"\(([A-Za-z]+):(\d)\)", r"(\1:x\2)", tmpchart)
        if tmpnew != tmpchart:
            charts[tmpname] = tmpnew
            for tmparea in re.findall(r"([A-Za-z ]+)\([A-Za-z]+:\d\)", tmpchart):
                tmpfixed.append("%s / %s" % (tmpname, tmparea.strip(",").strip()))

    if tmpfixed:
        print("  %d body-chart multiplier(s) corrected from his confirmed typo (item 9, x2 not x1):"
              % len(tmpfixed))
        for tmpentry in tmpfixed:
            print("      %s" % tmpentry)

    return charts, start


def race_body_types():
    start, body = function_body("getRacialBodyType")
    races, conditional = switch_cases(body, "tmpBodyType")
    return races, conditional, start


def class_lore_titles():
    """
    The title at which each class begins reading the Weapon/Missile Lore attack chart.

    From getLoreAttackChart, an eighty-eight case switch of the shape

        case "Archer":  if(tempTitle>=3) { tempLoreChart=getLoreChart(tempNewAttackChart); } break;
        case "Bard":    tempLoreChart=""; break;

    A class with no title test never reads the Lore chart at all, and is recorded as 0 rather
    than omitted, so "this class has no Lore chart" is stated rather than inferred from absence.

    Note this is NOT the parenthesised title in a class's own attackSkillList -- "Grandmaster
    (mastered weapons at 9)". Those two disagree for all thirty-eight classes that carry both,
    never once agreeing, so they are plainly different things: this switch decides the Lore
    attack chart, and the parenthetical is about which weapons are mastered.

    getLoreChart itself is simply one step up the same table (Beginner to Novice, and so on to
    Grandmaster), which is what getNextAttackSkill already does.
    """
    start, body = function_body("getLoreAttackChart")
    titles = {}
    for line in body:
        m = re.search(r'case\s+"([^"]+)"\s*:(.*)$', line)
        if not m:
            continue
        threshold = re.search(r'tempTitle\s*>=\s*(\d+)', m.group(2))
        titles[m.group(1)] = int(threshold.group(1)) if threshold else 0
    return titles, start


def class_lore_when(tmpfunction):
    """
    The title at which each class acquires one of his lore skills.

    From getWeaponLoreWhen / getMissileLoreWhen (sheet-worker.js:94997 onward), plain switches of
    the shape

        case "Archer":   whenWeaponLore=12; break;
        case "Bard":     whenWeaponLore=0;  break;

    Zero means the class never gets that lore at all, and is recorded rather than omitted so the
    fact is stated instead of inferred from a missing key.

    These two functions are clean: unlike the gates that CALL them, neither contains one of the
    "=>" comparisons of UPSTREAM-ISSUES item 19. The rule for reading them is taken from the one
    call site he wrote correctly, `if ((currentTitle+1)>whenWeaponLoreAcquired)` at line 82558,
    which for whole titles is exactly `title >= when`.
    """
    start, body = function_body(tmpfunction)
    titles = {}
    for line in body:
        m = re.search(r'case\s+"([^"]+)"\s*:(.*)$', line)
        if not m:
            continue
        value = re.search(r'=\s*(\d+)\s*;', m.group(2))
        titles[m.group(1)] = int(value.group(1)) if value else 0
    return titles, start


def class_skill_slots_needed():
    """
    How many class skill slots a class needs to run its whole progression.

    From getSlotsNeededForClass (sheet-worker.js:62881 onward), a plain ninety-two case switch:

        case "Acrobat":   tmpslotsneeded=42; break;
        case "Assassin":  tmpslotsneeded=56; break;

    This is the number the Player's Guide's "slot tricks" exist to reach. Knowledge hands out a
    fixed allowance of class slots, a class needs this many to finish, and where the allowance
    falls short the shortfall is made up by transferring racial or social slots in -- which is
    exactly why the book names the dual classed character as the motivating example: such a
    character needs the slots of BOTH classes out of one Knowledge allowance.

    The empty-string case is his "no class chosen" default and is dropped rather than recorded,
    the same way build_documents.py drops the blank class row.

    A class whose case assigns nothing would read as 0, which would silently mean "needs no
    slots". None currently does, and the caller asserts that, because a zero arriving here by
    accident would quietly make a class look free to take.

    Note this switch does NOT have the shape getWeaponLoreWhen does. There the label and its
    assignment share a line; here the assignment is on the line after the label, so the labels
    are accumulated and resolved at the break -- several labels may share one body.
    """
    start, body = function_body("getSlotsNeededForClass")
    slots = {}
    labels, values = [], []
    for line in body:
        found = re.findall(r'case\s+"([^"]*)"\s*:', line)
        if found and values:          # a new group begins after a group that already assigned
            labels, values = [], []
        labels.extend(found)
        values.extend(re.findall(r'tmpslotsneeded\s*=\s*(\d+)\s*;', line))
        if re.search(r'\bbreak\s*;', line):
            for lab in labels:
                if lab != "":         # his "no class chosen" default row
                    slots[lab] = int(values[-1]) if values else 0
            labels, values = [], []
    return slots, start


def race_ages():
    """
    Each race's starting-age range and maximum age, from getAge (sheet-worker.js:38995).

    A switch of this shape, several races sharing one body:

        case "Arachen":
        case "Beastman":
            tmplowage=9;
            tmphighage=14;
            ...
            tmpAgesArray[4]=70;
            break;

    tmplowage/tmphighage are the starting-age range the creation step rolls within, and
    tmpAgesArray[4] is the maximum age. The maximum is NOT always a number -- Formless and a few
    others are "Immortal" -- so it is kept as written. The random roll inside each case is creation
    machinery, not data, and is not extracted.

    The empty-string case is his "no race" default and is dropped.
    """
    start, body = function_body("getAge")
    ages = {}
    labels, values = [], {}
    for line in body:
        found = re.findall(r'case\s+"([^"]*)"\s*:', line)
        if found and values:
            labels, values = [], {}
        labels.extend(found)
        for key, pat in (("startLow", r'tmplowage\s*=\s*(\d+)\s*;'),
                         ("startHigh", r'tmphighage\s*=\s*(\d+)\s*;')):
            m = re.search(pat, line)
            if m:
                values[key] = int(m.group(1))
        m = re.search(r'tmpAgesArray\[4\]\s*=\s*(?:"([^"]*)"|(\d+))\s*;', line)
        if m:
            values["maxAge"] = m.group(1) if m.group(1) is not None else int(m.group(2))
        if re.search(r'\bbreak\s*;', line):
            for lab in labels:
                if lab != "":
                    ages[lab] = dict(values)
            labels, values = [], {}
    return ages, start


def banded_chain(tmpfunction, tmpassign, tmpvar, tmpceiling=30):
    """
    Read an Agility-banded if/else-if chain into ordered [min, max, value] rows.

    From getOffhandMeleeAdj / getOffhandDamageAdj / getOffhandSkillAdj
    (sheet-worker.js:83305-83367), all three of the shape

        if (tempHandednessvalue=="Ambidextrous") { X=0;
        } else if (tempaglvalue<=0)              { X=0;    // his "they should be dead" branch
        } else if (tempaglvalue>0  && tempaglvalue<10) { X=-6;
        } else if (tempaglvalue==16)             { X=-3;   // damage singles out 16 and 17
        } else if (tempaglvalue>19)              { X=0;

    THE THREE DO NOT SHARE BAND EDGES, which is the whole reason these are generated rather than
    transcribed: the melee penalty reaches zero at Agility 19, damage and skills at 20, and only
    the damage table breaks out 16 and 17 as single values. A hand transcription smooths exactly
    that kind of difference away.

    Returns (rows, ambidextrous_is_zero, first line number). Rows are ordered and cover 1..ceiling.
    His "<=0" and open-topped branches are NOT emitted as rows -- both return zero, and so does
    reading off the end of the table, so the behaviour is identical with two fewer special cases.
    """
    start, body = function_body(tmpfunction)

    # Each condition, paired with the value assigned inside its block.
    tmpbands = []
    tmpambi  = False
    for line in body:
        tmpcond = re.search(r'(?:^|\})\s*(?:else\s+)?if\s*\((.+?)\)\s*\{', line)
        if not tmpcond:
            continue
        tmpvalue = None
        for probe in body[body.index(line):]:
            tmphit = re.search(r'%s\s*=\s*(-?\d+)\s*;' % re.escape(tmpassign), probe)
            if tmphit:
                tmpvalue = int(tmphit.group(1))
                break
        if tmpvalue is None:
            continue
        tmptext = tmpcond.group(1)
        if "Ambidextrous" in tmptext:
            tmpambi = (tmpvalue == 0)
            continue
        tmplo, tmphi = _range_of(tmptext, tmpvar)
        if tmplo is None and tmphi is not None and tmphi <= 0:
            continue                                    # his "<=0" branch; zero either way
        if tmplo is not None and tmphi is None:
            continue                                    # open top; zero either way
        if tmplo is None or tmphi is None:
            continue
        tmpbands.append([tmplo, tmphi, tmpvalue])

    # Contiguity. A hole here would silently return the wrong penalty for one Agility value, so
    # it is reported rather than left to be found in play.
    tmpbands.sort(key=lambda r: r[0])
    tmpexpect = 1
    for tmprow in tmpbands:
        if tmprow[0] != tmpexpect:
            print("  WARNING: %s has a gap or overlap at Agility %d (next band starts %d)"
                  % (tmpfunction, tmpexpect, tmprow[0]))
        tmpexpect = tmprow[1] + 1
    if tmpexpect > tmpceiling + 1:
        print("  WARNING: %s overruns Agility %d" % (tmpfunction, tmpceiling))

    return tmpbands, tmpambi, start


def _range_of(tmptext, tmpvar):
    """Turn one condition over tmpvar into an inclusive (lo, hi); None is open on that side."""
    tmplo, tmphi = None, None
    for tmpop, tmpnum in re.findall(r'%s\s*(<=|>=|==|<|>)\s*(-?\d+)' % re.escape(tmpvar), tmptext):
        tmpn = int(tmpnum)
        if   tmpop == "<":  tmphi = tmpn - 1 if tmphi is None else min(tmphi, tmpn - 1)
        elif tmpop == "<=": tmphi = tmpn     if tmphi is None else min(tmphi, tmpn)
        elif tmpop == ">":  tmplo = tmpn + 1 if tmplo is None else max(tmplo, tmpn + 1)
        elif tmpop == ">=": tmplo = tmpn     if tmplo is None else max(tmplo, tmpn)
        elif tmpop == "==": tmplo, tmphi = tmpn, tmpn
    return tmplo, tmphi


def name_match_chain(tmpfunction, tmpassign):
    """
    Read an ordered if/else-if chain that tests a weapon's name with includes().

    His projectile helpers are all written this way:

        if (tmpCombatWeaponName.includes("Bolted"))     { isProjectile=false; }
        else if (tmpCombatWeaponName.includes("Arrow")) { isProjectile=true;  }

    ORDER IS THE WHOLE POINT and is preserved. "Bolted" has to be tested before "Bolt" or a
    bolted-leather shield reads as a crossbow bolt, and several pairs work that way. A port that
    turned these into a set or an object would lose that and the bug would be invisible.

    Returns (list of (substring, value), first line). Values come back as written: the string
    "true"/"false" for the boolean helpers, or the projectile's name for the launcher map.
    """
    start, body = function_body(tmpfunction)
    pairs = []
    pending = None
    for line in body:
        m = re.search(r'\.includes\("([^"]+)"\)', line)
        if m:
            pending = m.group(1)
        v = re.search(r'%s\s*=\s*("([^"]*)"|true|false)\s*;' % re.escape(tmpassign), line)
        if v and pending is not None:
            raw = v.group(2) if v.group(2) is not None else v.group(1)
            if raw == "true":
                raw = True
            elif raw == "false":
                raw = False
            pairs.append((pending, raw))
            pending = None
    return pairs, start


def material_rank():
    start, body = function_body("getArmorValue")
    rank = {}
    labels = []
    for l in body:
        labels.extend(re.findall(r'case\s+"([^"]*)"\s*:', l))
        m = re.search(r'tempValue\s*=\s*(-?\d+)', l)
        if m and labels:
            for lab in labels:
                rank.setdefault(lab, int(m.group(1)))
            labels = []
    return rank, start


# The armour row's columns, in the order his header comment at armorvalueslist gives them:
# [0] material, [1] type, [2..20] the nineteen locations, [21] weight. Index 2 onward lines up
# with ARMOR_LOCATIONS in build_documents.py, which is what the port keys coverage by.
ARMOR_SLOT_KEYS = [
    "head", "neck", "shoulderLeft", "shoulderRight",
    "torsoUpper", "torsoMid", "torsoLower",
    "armLeft", "armRight", "forearmLeft", "forearmRight",
    "handLeft", "handRight", "thighLeft", "thighRight",
    "shinLeft", "shinRight", "footLeft", "footRight",
]


def norm_area(tmpname):
    """An area name reduced to letters and digits, for matching two spellings of one area."""
    return re.sub(r"[^a-z0-9]", "", tmpname.lower())


def chart_area_lookup(chart_areas, family_labels):
    """
    Work out what each of his case comments is called on one particular body chart.

    His branches in getArmorValuesByBodyTypeAndArmor and equipShield both switch on an area's
    POSITION in the body chart, and each branch serves every chart whose name contains the family
    word. The port keys by area NAME instead, because two of his branches are out of step with
    the charts they serve (docs/UPSTREAM-ISSUES.md items 17 and 18) and a position-keyed port
    would put armour on the wrong limb. The names come from the comment he wrote on each case,
    which is his own statement of what he meant that position to be.

    Keying by name creates a gap of its own, though: a chart does not always spell an area the way
    the comment does. So each label is matched against the chart in three passes, most trustworthy
    first:

        1. exact      -- the name appears in the chart, wherever it sits.
        2. normalised -- it appears under different spacing. A Centaur chart says "Left Fore Shin"
                         where his comment says "Left Foreshin". Same area, two spellings.
        3. positional -- the same position, different words. An Insectoid chart says "Left Lower
                         Leg" where his comment says "Left Shin"; a hooved Humanoid says "Left
                         Hoof" where his says "Left Foot". Without this the area silently loses
                         all of its armour.

    The third pass is the one that could hide a displacement, so it only runs while the chart and
    the branch are still walking in step, and stops for good at the first sign they are not:
        - his name is already matched somewhere else in this chart -- it belongs to that other
          position, so this is drift (this is what stops Snake(Arms));
        - the chart's own name at this position is one of his other case labels -- he has a case
          for it elsewhere, so again drift (this is what stops a plain Snake's Tail being
          armoured as a shoulder, and Centaur at its missing Mid Torso).

    Returns (lookup, aliases): lookup maps his name to this chart's name, and aliases lists the
    third-pass matches, which are a judgement call and are reported rather than made silently.
    """
    lookup, aliases = {}, []
    bynorm = {}
    for tmparea in chart_areas:
        bynorm.setdefault(norm_area(tmparea), tmparea)
    branchnames = set(family_labels.values())

    # Passes 1 and 2: by name, wherever in the chart the area sits.
    for position in sorted(family_labels):
        name = family_labels[position]
        if name in chart_areas:
            lookup[name] = name
        elif norm_area(name) in bynorm:
            lookup[name] = bynorm[norm_area(name)]

    # Pass 3: by position, only while the two are still in step.
    instep = True
    for position, area in enumerate(chart_areas):
        name = family_labels.get(position)
        if name is None:
            break                              # his branch labels nothing at this position
        if name == area:
            continue
        if name in lookup or area in branchnames:
            instep = False                     # drift, not spelling -- and nothing after it counts
            continue
        if not instep:
            continue
        lookup[name] = area
        aliases.append((position, name, area))

    return lookup, aliases


def body_armor_maps(charts):
    """
    Which armour slot covers each body area, per body-type family.

    From getArmorValuesByBodyTypeAndArmor, read as position -> comment name and position -> armour
    slot, then keyed by the names each chart actually uses (see chart_area_lookup above for why,
    and for how a chart's own spelling is matched to his).

    A few areas only take armour from a named item -- a Centaur's quarters and legs need
    "Centaur Barding" -- and those are returned separately rather than flattened away.

    Returns (maps, required_items, mismatches, aliases, position labels, first line). The position
    labels -- family -> position -> the area name his comment gives it -- are his own statement of
    each family's assumed chart, and the shield table is keyed off that same statement rather than
    re-deriving it.
    """
    start, body = function_body("getArmorValuesByBodyTypeAndArmor")

    # First pass: read his branches into position -> comment name, position -> slot, and the
    # areas gated on a particular item.
    labels, slots, gates = {}, {}, {}
    family, pending = None, None
    for line in body:
        m = re.search(r'tmpBodyType\.includes\("([^"]+)"\)', line)
        if m:
            family = m.group(1)
            labels.setdefault(family, {})
            slots.setdefault(family, {})
            pending = None
            continue
        if family is None:
            continue

        found = re.findall(r'case\s+(\d+)\s*:', line)
        if found:
            comment = re.search(r'//\s*(.+?)\s*$', line)
            # callers pass the area's index plus two, so a case label is its position plus two
            pending = (int(found[0]) - 2, comment.group(1).strip() if comment else "")
            if pending[1]:
                labels[family][pending[0]] = pending[1]
            continue

        # An area gated on a particular item: "if (armorItemName.includes("Centaur Barding"))".
        gate = re.search(r'armorItemName\.includes\("([^"]+)"\)', line)
        if gate and pending:
            gates.setdefault(family, {})[pending[0]] = gate.group(1)
            continue

        slot = re.search(r'tempReturnArmorValue\s*=\s*tempArmorValues\[(\d+)\]', line)
        if slot and pending:
            index = int(slot.group(1))
            position, name = pending
            pending = None
            if not name:
                continue                       # no comment: nothing to key by, so skip it
            if index < 2 or index - 2 >= len(ARMOR_SLOT_KEYS):
                continue                       # material, type or weight: not a location
            slots[family][position] = ARMOR_SLOT_KEYS[index - 2]

    # Second pass: name the slots the way each chart the branch serves names them.
    maps, required, mismatches, aliases = {}, {}, [], []
    for family in labels:
        maps[family] = {}
        for chart_name in sorted(charts):
            if family not in chart_name:
                continue
            areas = [a.split("(")[0] for a in charts[chart_name].split(",")]
            lookup, chart_aliases = chart_area_lookup(areas, labels[family])

            for position in sorted(labels[family]):
                name = lookup.get(labels[family][position])
                if not name:
                    continue                   # this chart has no such area at all
                if position in slots[family]:
                    maps[family][name] = slots[family][position]
                if position in gates.get(family, {}):
                    required.setdefault(family, {})[name] = gates[family][position]

            for position, meant, actual in chart_aliases:
                if position in slots[family] or position in gates.get(family, {}):
                    aliases.append((family, chart_name, position, meant, actual,
                                    slots[family].get(position, "requires "
                                                      + gates.get(family, {}).get(position, ""))))

            for position, area in enumerate(areas):
                meant = labels[family].get(position)
                if meant is not None and meant != area:
                    mismatches.append((family, chart_name, position, meant, area))

    return maps, required, mismatches, aliases, labels, start


# The five shield sizes, in the order his equipShield tests them. A shield's name carries its
# size -- "Shield(Large/Steel)" -- and he matches with includes(), so the order is the tie-break.
SHIELD_SIZES = ["Buckler", "Small", "Medium", "Large", "Body"]


def shield_coverage_maps(charts, labels):
    """
    Which body areas a shield covers, per body-type family, shield size and handedness.

    From equipShield. A shield lands in a fifth armour layer on top of the four worn ones, and
    every area it covers gains the shield's own armour value. Its mirror, unequipShield, needs no
    table of its own -- it simply clears the whole layer.

    His version writes into bodyAreaShieldLayer5[N], N being the area's POSITION in the body
    chart. Those positions were checked by hand against every chart before this was written. They
    line up exactly for Humanoid, Saurian, Insectoid, Arachen, Scethen and Brachara -- and NOT for
    Snake or Centaur, where they are displaced by one in precisely the same way, and the same
    direction, as his armour branches are. That is UPSTREAM-ISSUES items 17 and 18 appearing a
    second time, in a second function.

    So this is keyed by area name, resolved through the same chart_area_lookup the armour coverage
    uses, off the same position labels -- one statement of his assumed chart, used twice. His own
    Buckler comments are the cross-check: they name the areas in words ("equip on the right
    forearm") and agree with those labels for every family.

    Handedness in his code is binary -- tempHandedness=="Left" against everything else -- so
    "Ambidextrous", which his racial code does set, falls into the else branch and wears the
    shield as a right-hander would. Recorded here as "Right" rather than invented away.

    Returns (maps, unresolved, first line), where maps is
        family -> size -> handedness -> [area name, ...]
    and a Buckler appears under two sizes, "Buckler" (held in the hand) and "Buckler(Wrist)"
    (strapped to the forearm), which is the choice his equip_buckler_on_wrist flag makes.
    """
    start, body = function_body("equipShield")

    # First pass: read his branches into family -> size -> handedness -> [position, ...].
    writes, unresolved = {}, []
    depth = 0
    context = {0: {}}
    lastcond = {}

    for line in body:
        # Where would a block opened on this line sit? Any closing braces before the first open
        # brace have already taken us back out, so those come off the depth first.
        upto = line.index("{") if "{" in line else len(line)
        base = depth - line[:upto].count("}")

        if "{" in line:
            newctx = dict(context.get(base, {}))
            cond = None

            size = re.search(r'tmpItemName\.includes\("([^"]+)"\)', line)
            fams = re.findall(r'tempBodyType\.includes\("([^"]+)"\)', line)
            hand = re.search(r'tempHandedness\s*==\s*"([^"]+)"', line)
            buck = re.search(r'tempEquipBuckler\s*==\s*"([^"]+)"', line)

            if size and size.group(1) in SHIELD_SIZES:
                cond = ("size", size.group(1))
            elif fams:
                cond = ("families", tuple(fams))
            elif hand:
                cond = ("hand", hand.group(1))
            elif buck:
                cond = ("wrist", True)
            elif re.search(r'\}\s*else\s*\{', line):
                # The else of whatever opened last at this depth. Only handedness and the buckler
                # flag have a meaningful else; the size and family chains are else-if.
                prev = lastcond.get(base)
                if prev and prev[0] == "hand":
                    cond = ("hand", "Right" if prev[1] == "Left" else "Left")
                elif prev and prev[0] == "wrist":
                    cond = ("wrist", False)

            if cond:
                newctx[cond[0]] = cond[1]
                lastcond[base] = cond
            context[base + 1] = newctx

        write = re.search(r'bodyAreaShieldLayer5\[(\d+)\]\s*=', line)
        if write:
            here = context.get(depth, {})
            size, hand = here.get("size"), here.get("hand")
            if size and hand:
                key = size
                if size == "Buckler":
                    key = "Buckler(Wrist)" if here.get("wrist") else "Buckler"
                for family in here.get("families", ()):
                    slot = (writes.setdefault(family, {}).setdefault(key, {})
                                  .setdefault(hand, []))
                    position = int(write.group(1))
                    if position not in slot:
                        slot.append(position)

        depth = depth + line.count("{") - line.count("}")

    # Second pass: name those positions the way each chart the branch serves names them. An area
    # a chart simply does not have drops out -- a plain Snake has no arms to strap a shield to.
    maps = {}
    for family in writes:
        maps[family] = {}
        for key in writes[family]:
            maps[family][key] = {}
            for hand, positions in writes[family][key].items():
                # Position-major, so the list reads down the body the way his branch writes it,
                # with any chart's own spelling of an area sitting beside the common one.
                names = []
                for position in positions:
                    meant = labels.get(family, {}).get(position)
                    if meant is None:
                        unresolved.append((family, key, hand, position))
                        continue
                    for chart_name in sorted(charts):
                        if family not in chart_name:
                            continue
                        areas = [a.split("(")[0] for a in charts[chart_name].split(",")]
                        lookup, _ = chart_area_lookup(areas, labels.get(family, {}))
                        name = lookup.get(meant)
                        if name and name not in names:
                            names.append(name)
                maps[family][key][hand] = names

    return maps, unresolved, start


# The damage types a "Rebound" item turns back (sheet-worker.js:71222). Read off his condition
# rather than assumed: only the five physical kinds are listed there.
REBOUNDED_TYPES = ["Cutting", "Thrusting", "Smashing", "Crushing", "Constricting"]


def endured_damage_types():
    """
    Which worn-item tags let a damage type be endured -- shrugged off entirely.

    From getIsEndured (sheet-worker.js:120871), a switch on the damage type where each case looks
    for "Enduring <Type>" on anything worn, and all but one also accept a blanket "Enduring All".
    The exception is Obliteration, which accepts only its own tag. That asymmetry is the reason
    this is read out of his switch rather than written out by hand: it is one missing line in ten
    cases, and a hand copy would almost certainly smooth it over.

    Returns (mapping, first line), where mapping is damage type -> the list of tags that endure it.
    """
    start, body = function_body("getIsEndured")

    mapping = {}
    current = None
    for line in body:
        found = re.findall(r'case\s+"([^"]*)"\s*:', line)
        if found:
            current = found[0]
            mapping.setdefault(current, [])
            continue
        if current is None:
            continue
        tag = re.search(r'tempEquippedArmorAndClothing\.includes\("([^"]+)"\)', line)
        if tag:
            mapping[current].append(tag.group(1))
        if re.search(r'\bbreak\s*;', line):
            current = None
    return mapping, start


def load_raw(name):
    """The blocking and degradation tables are used positionally, so the raw extraction is
    exactly what is wanted -- they never needed a column map."""
    with open(os.path.join(RAW, name + ".json"), encoding="utf-8") as fh:
        return json.load(fh)["entries"]


""" Movement base, by Agility.                                                              """
MOVE_ATTRS = [
    ("walk", ["move_walk_hourly", "move_walk_10_sec", "move_walk_1_sec"]),
    ("jog",  ["move_jog_hourly",  "move_jog_10_sec",  "move_jog_1_sec"]),
    ("run",  ["move_run_hourly",  "move_run_10_sec",  "move_run_1_sec"])
]
JUMP_ATTRS = [("jumpStand", "move_jump_stand"), ("jumpUp", "move_jump_up")]


def _agl_switch(region):
    """
    Walk one switch(tmpmoveagl) and return {agility: {field: base}}.

    Each case writes its nine rates (and two jumps) as a leading numeric literal followed
    by the race's modifier: `move_walk_hourly: 2+racetmpwalkhourly+...`. In the multiplier
    copy the same line is wrapped -- `(((2+racetmpwalkhourly+...)*racetmpspeedmulti)...` --
    so the literal is taken as the first number after an optional run of open parens.

    Jump is written twice per case, once for the multiply form and once for the add form
    (`2*(racetmpjumpstand...)` against `2+racetmpjumpstand...`). Both carry the same base,
    and that is asserted rather than assumed.
    """
    bases, labels, found = {}, [], {}
    for line in region:
        for lab in re.findall(r'case\s+(\d+)\s*:', line):
            if found:                       # a new group opens after one that wrote
                labels, found = [], {}
            labels.append(int(lab))
        for field, attrs in MOVE_ATTRS:
            for scale, attr in enumerate(attrs):
                m = re.search(r'%s:\s*\(*\s*(-?[\d.]+)\s*[+*]' % re.escape(attr), line)
                if m:
                    found["%s.%d" % (field, scale)] = float(m.group(1))
        for field, attr in JUMP_ATTRS:
            m = re.search(r'%s:\s*\(*\s*(-?[\d.]+)\s*[+*]' % re.escape(attr), line)
            if m:
                seen = found.get(field)
                if seen is not None and seen != float(m.group(1)):
                    raise SystemExit("jump base disagrees within one case: %s %s vs %s"
                                     % (field, seen, m.group(1)))
                found[field] = float(m.group(1))
        if re.search(r'\bbreak\s*;', line) and labels and found:
            for lab in labels:
                bases[lab] = dict(found)
            labels, found = [], {}
    return bases


def movement_bases():
    """
    Read the Agility base movement table out of calcMovement (sheet-worker.js:30856).

    HIS RACE MOVEMENT FIELDS ARE MODIFIERS, NOT FINISHED RATES. Every case of the switch
    is of the shape

        setAttrs({move_walk_hourly: 2+racetmpwalkhourly+tmpwalktemphourlymod});
                                    ^ base for this Agility
                                      ^ the race's modifier

    so a race carrying 0/0/0 -- Human, Civilized among them -- walks at the full base for
    its Agility rather than not walking at all. This matches the Player's Guide, which
    prints base tables on page 36 and a separate "Racial Movement Modifiers" table beside
    them; the nine figures his Human(Barbaric) row carries are that book table's +1/+10/+1,
    +2/+20/+2, +2/+30/+3 exactly.

    The switch appears TWICE -- once for races with no speed multiplier and once, wrapped in
    (( ... )*racetmpspeedmulti), for races with one. Both copies are read and compared, so a
    drift between them is reported rather than silently taking whichever was parsed first.
    """
    start, body = function_body("calcMovement")
    edges = [i for i, l in enumerate(body) if "racetmpspeedmulti==0" in l.replace(" ", "")]
    if not edges:
        raise SystemExit("calcMovement: the no-multiplier branch was not found")
    plain_at = edges[-1]
    multi_at = next((i for i in range(plain_at, len(body))
                     if "this race has speeded up movement" in body[i]), None)
    if multi_at is None:
        raise SystemExit("calcMovement: the multiplier branch was not found")

    plain = _agl_switch(body[plain_at:multi_at])
    multi = _agl_switch(body[multi_at:])
    drift = sorted(k for k in set(plain) & set(multi) if plain[k] != multi[k])
    if set(plain) != set(multi):
        drift.append("case coverage differs: %s vs %s" % (sorted(plain), sorted(multi)))

    rows, ceiling = [], max(plain)
    for agl in sorted(plain):
        v = plain[agl]
        shaped = {f: [v["%s.%d" % (f, s)] for s in range(3)] for f, _ in MOVE_ATTRS}
        shaped["jumpStand"] = v.get("jumpStand", 0)
        shaped["jumpUp"] = v.get("jumpUp", 0)
        if rows and rows[-1][2] == shaped and rows[-1][1] == agl - 1:
            rows[-1][1] = agl
        else:
            rows.append([agl, agl, shaped])
    missing = [a for a in range(0, ceiling + 1) if a not in plain]
    return rows, drift, missing, ceiling, start


def js(value):
    return json.dumps(value, ensure_ascii=False)


def main():
    sys.stdout.reconfigure(encoding="utf-8")

    attack, attack_line = attack_charts()
    bodies, body_line = body_charts()
    races, conditional, race_line = race_body_types()
    ranks, rank_line = material_rank()
    blocking = load_raw("armorblockingdict")
    dividers = load_raw("armordamagedict")

    out = []
    out.append("// @START (CODE)\n")
    out.append("// @MARKER COMBAT TABLES\n")
    out.append("//" + "=" * 114 + "\n")
    out.append("// GENERATED FILE -- do not edit by hand.\n")
    out.append("// Produced by tools/extract/extract_combat_tables.py from the original Roll20 sheet-worker.\n")
    out.append("// Regenerate rather than editing, or this will drift from his sheet.\n")
    out.append("//" + "=" * 114 + "\n\n")

    # ATTACK CHARTS
    out.append("// @MARKER ATTACK CHARTS\n")
    out.append("// From attackSkillValuesDetails (sheet-worker.js:%d). The d20 attack roll, after modifiers, is\n" % attack_line)
    out.append("// read against these to find both whether the blow lands and where. Each value is the LOWEST\n")
    out.append("// roll that reaches that result -- \"19+\" and \"9-11\" are read by their first number, exactly as\n")
    out.append("// his code does with parseInt. \"-\" means the result cannot occur at that skill.\n")
    out.append("//              0          1         2          3         4           5          6           7         8          9           10\n")
    out.append("//              MissHigh   HitHigh   MissLeft   HitLeft   HitCenter   HitRight   MissRight   HitLow    MissLow    MissShort   CalledShot\n")
    out.append("export const ATTACK_CHARTS = {\n")
    for name, row in attack.items():
        if name == "":
            continue
        out.append("\t%-14s %s,\n" % (js(name) + ":", js(row)))
    out.append("};\n\n")
    out.append("// The skill levels in order, weakest first. Weapon Lore reads the chart one step up.\n")
    out.append("export const ATTACK_SKILL_ORDER = %s;\n\n" % js([k for k in attack if k not in ("", "None")]))

    # BODY CHARTS
    out.append("// @MARKER BODY CHARTS\n")
    out.append("// From getBodyList (sheet-worker.js:%d). Each body type is a list of areas written as\n" % body_line)
    out.append("// \"Name(Type:xMultiplier)\". An area's Endurance is the character's Endurance times its\n")
    out.append("// multiplier, rounded up. His evoke mutations (extra limbs, wings, tails) add further\n")
    out.append("// areas on top of these and are not reflected here.\n")
    out.append("export const BODY_CHARTS = {\n")
    for name, chart in bodies.items():
        if name == "" or chart == "":
            continue  # his default case -- no body at all
        out.append("\t%s: %s,\n" % (js(name), js(chart)))
    out.append("};\n\n")

    # ARMOR BLOCKING
    out.append("// @MARKER ARMOUR BLOCKING\n")
    out.append("// From armorblockingdict. Incoming damage is compared with the total armour at the struck area\n")
    out.append("// and falls into one of four bands. For that band's value:\n")
    out.append("//     negative  ->  damage + (total armour x value)     armour subtracts a fraction of itself\n")
    out.append("//     positive  ->  damage x value                      only that share gets through\n")
    out.append("//     zero      ->  no damage at all\n")
    out.append("//                        0            1             2            3\n")
    out.append("//                        UnderQuarter QuarterToHalf HalfToFull   OverArmour\n")
    out.append("export const ARMOR_BLOCKING = {\n")
    for name, row in blocking.items():
        out.append("\t%-18s %s,\n" % (js(name) + ":", js(row)))
    out.append("};\n\n")

    # ARMOR DAMAGE DIVIDERS
    out.append("// @MARKER ARMOUR DEGRADATION\n")
    out.append("// From armordamagedict. Armour takes (damage / divider) points of damage itself, using the\n")
    out.append("// divider for the damage's family and the strongest material covering the struck area.\n")
    out.append("//                           0      1        2       3\n")
    out.append("//                           Cut    Thrust   Crush   Constrict\n")
    out.append("export const ARMOR_DAMAGE_DIVIDERS = {\n")
    for name, row in dividers.items():
        out.append("\t%-26s %s,\n" % (js(name) + ":", js(row)))
    out.append("};\n\n")

    # MATERIAL RANK
    out.append("// @MARKER ARMOUR MATERIAL RANK\n")
    out.append("// From getArmorValue (sheet-worker.js:%d). Higher is stronger. Used to pick which material's\n" % rank_line)
    out.append("// degradation divider applies when several layers cover one area.\n")
    out.append("export const ARMOR_MATERIAL_RANK = {\n")
    for name, value in ranks.items():
        out.append("\t%-26s %d,\n" % (js(name) + ":", value))
    out.append("};\n\n")
    # ARMOUR COVERAGE BY BODY TYPE
    (armor_maps, armor_required, armor_mismatches, armor_aliases,
     armor_labels, armor_line) = body_armor_maps(bodies)
    out.append("// @MARKER ARMOUR COVERAGE BY BODY TYPE\n")
    out.append("// From getArmorValuesByBodyTypeAndArmor (sheet-worker.js:%d). Which armour slot covers each\n" % armor_line)
    out.append("// area, for the eight body-type families his code handles. A family matches by substring, so\n")
    out.append("// \"Humanoid\" serves every Humanoid variant. Any family absent here -- Bird, Quadruped, Fish\n")
    out.append("// and the rest -- takes no protection from worn armour, which is what his sheet does too.\n")
    out.append("//\n")
    out.append("// Keyed by area NAME rather than by position. His version switches on the area's position in\n")
    out.append("// the body chart, and two of his branches have drifted out of step with the charts they serve,\n")
    out.append("// so a position-keyed port would put armour on the wrong limb. See docs/UPSTREAM-ISSUES.md.\n")
    out.append("export const ARMOR_COVERAGE_BY_BODY_TYPE = {\n")
    for family, mapping in armor_maps.items():
        out.append("\t%s: {\n" % js(family))
        for area, slot in mapping.items():
            out.append("\t\t%-26s %s,\n" % (js(area) + ":", js(slot)))
        out.append("\t},\n")
    out.append("};\n\n")

    out.append("// Areas that take armour only from a particular item -- a Centaur's quarters and legs are\n")
    out.append("// covered by barding and by nothing else.\n")
    out.append("export const ARMOR_REQUIRES_ITEM = {\n")
    for family, mapping in armor_required.items():
        out.append("\t%s: {\n" % js(family))
        for area, item in mapping.items():
            out.append("\t\t%-26s %s,\n" % (js(area) + ":", js(item)))
        out.append("\t},\n")
    out.append("};\n\n")

    # SHIELD COVERAGE BY BODY TYPE
    shield_maps, shield_unresolved, shield_line = shield_coverage_maps(bodies, armor_labels)
    out.append("// @MARKER SHIELD COVERAGE BY HANDEDNESS\n")
    out.append("// From equipShield (sheet-worker.js:%d). Which areas a shield covers, by body-type\n" % shield_line)
    out.append("// family, shield size and the wielder's handedness. A shield is a FIFTH layer, added on\n")
    out.append("// top of the four worn ones, and every area it covers gains the shield's own armour value.\n")
    out.append("//\n")
    out.append("// A shield is held in the off hand, so a right-hander is covered down the LEFT side. His\n")
    out.append("// code tests only for \"Left\" and takes everything else as right-handed, which is how an\n")
    out.append("// Ambidextrous character -- a real value his racial code sets -- ends up on the right.\n")
    out.append("//\n")
    out.append("// A Buckler appears twice: on the hand, or strapped to the forearm, which is the choice\n")
    out.append("// his equip_buckler_on_wrist flag makes. The larger sizes add an area each as they grow --\n")
    out.append("// forearm and hand, then the arm, then the shoulder, and a Body shield the whole flank.\n")
    out.append("//\n")
    out.append("// Keyed by area NAME, not by his positions. His Snake and Centaur branches are displaced\n")
    out.append("// by one in exactly the way his armour branches are -- docs/UPSTREAM-ISSUES.md items 17\n")
    out.append("// and 18, showing up a second time here. Families absent below take no shield cover.\n")
    out.append("export const SHIELD_COVERAGE = {\n")
    for family in shield_maps:
        out.append("\t%s: {\n" % js(family))
        for size in shield_maps[family]:
            out.append("\t\t%-18s { " % (js(size) + ":"))
            out.append(", ".join("%s: %s" % (js(hand), js(areas))
                                 for hand, areas in shield_maps[family][size].items()))
            out.append(" },\n")
        out.append("\t},\n")
    out.append("};\n\n")

    out.append("// The five sizes, smallest first, as his equipShield tests them. A shield's name carries\n")
    out.append("// its size, so \"Shield(Large/Steel)\" is a Large.\n")
    out.append("export const SHIELD_SIZES = %s;\n\n" % js(SHIELD_SIZES))

    # ENDURED DAMAGE TYPES
    endured, endured_line = endured_damage_types()
    out.append("// @MARKER ENDURING DAMAGE\n")
    out.append("// From getIsEndured (sheet-worker.js:%d). A blow of a damage type that is endured\n" % endured_line)
    out.append("// does NOTHING -- his handler branches past the whole apply block, so there is no damage,\n")
    out.append("// no armour wear and no effect. Each type is endured by a tag on anything worn.\n")
    out.append("//\n")
    out.append("// Note that \"Enduring All\" covers nine of the ten and NOT Obliteration, which accepts only\n")
    out.append("// its own tag. That is his switch as written; see docs/UPSTREAM-ISSUES.md item 20.\n")
    out.append("export const ENDURED_BY = {\n")
    for name, tags in endured.items():
        out.append("\t%-22s %s,\n" % (js(name) + ":", js(tags)))
    out.append("};\n\n")

    out.append("// The damage types a \"Rebound\" item turns back, from the same handler\n")
    out.append("// (sheet-worker.js:71222). Only the five physical kinds rebound.\n")
    out.append("export const REBOUNDED_TYPES = %s;\n\n" % js(REBOUNDED_TYPES))

    # PROJECTILES AND LAUNCHERS
    projectiles, proj_line = name_match_chain("isWeaponProjectile", "isProjectile")
    launchers, launch_line = name_match_chain("isWeaponLauncher", "isLauncher")
    launcher_ammo, ammo_line = name_match_chain("getNormalProjectileFromLauncher", "tempProjName")
    out.append("// @MARKER PROJECTILES AND LAUNCHERS\n")
    out.append("// From isWeaponProjectile (sheet-worker.js:%d), isWeaponLauncher (%d) and\n"
               % (proj_line, launch_line))
    out.append("// getNormalProjectileFromLauncher (%d). Each is an ordered chain of name tests.\n" % ammo_line)
    out.append("//\n")
    out.append("// THE ORDER MATTERS and is preserved exactly. \"Bolted\" is tested before \"Bolt\" so a\n")
    out.append("// bolted-leather piece does not read as a crossbow bolt, and several pairs work that way.\n")
    out.append("// Read them by walking the list and taking the FIRST substring the name contains.\n")
    out.append("export const PROJECTILE_MATCHES = %s;\n\n" % js(projectiles))
    out.append("export const LAUNCHER_MATCHES = %s;\n\n" % js(launchers))
    out.append("// Which projectile a launcher normally fires, so a Long Bow's lore is read off its Arrow.\n")
    out.append("export const LAUNCHER_PROJECTILE = %s;\n\n" % js(launcher_ammo))

    # OFF-HAND PENALTIES
    melee_bands,  melee_ambi,  melee_off_line  = banded_chain("getOffhandMeleeAdj",
                                                              "calcOffhandMeleeAdjust", "tempaglvalue")
    damage_bands, damage_ambi, damage_off_line = banded_chain("getOffhandDamageAdj",
                                                              "calcOffhandDamageAdjust", "tempaglvalue")
    skill_bands,  skill_ambi,  skill_off_line  = banded_chain("getOffhandSkillAdj",
                                                              "calcOffhandSkillsAdjust", "tempaglvalue")
    out.append("// @MARKER OFF-HAND PENALTIES\n")
    out.append("// From getOffhandMeleeAdj (sheet-worker.js:%d), getOffhandDamageAdj (%d) and\n"
               % (melee_off_line, damage_off_line))
    out.append("// getOffhandSkillAdj (%d). What it costs to fight with the wrong hand, banded by Agility.\n"
               % skill_off_line)
    out.append("//\n")
    out.append("// Each row is [lowest Agility, highest Agility, penalty]. Read by walking the list and\n")
    out.append("// taking the first band the rating falls in; ANY rating outside every band is zero, which\n")
    out.append("// covers both his \"<=0\" branch and the open top of each chain without special-casing either.\n")
    out.append("//\n")
    out.append("// THE THREE DO NOT SHARE BAND EDGES. Melee reaches zero at Agility 19, damage and skills\n")
    out.append("// at 20, and only the damage table breaks out 16 and 17 as single values. Do not assume\n")
    out.append("// one shape from another -- that is why these are generated.\n")
    out.append("//\n")
    out.append("// An Ambidextrous character takes NO off-hand penalty at all: all three of his functions\n")
    out.append("// short-circuit on handedness before they ever look at Agility. Ambidexterity is therefore\n")
    out.append("// the absence of the cost rather than a bonus on top of it.\n")
    out.append("export const OFFHAND_PENALTIES = {\n")
    out.append("\tmelee:  %s,\n" % js(melee_bands))
    out.append("\tdamage: %s,\n" % js(damage_bands))
    out.append("\tskill:  %s\n"  % js(skill_bands))
    out.append("};\n\n")

    # MOVEMENT BASE BY AGILITY
    move_rows, move_drift, move_missing, move_ceiling, move_line = movement_bases()
    out.append("// @MARKER MOVEMENT BASE BY AGILITY\n")
    out.append("// From calcMovement (sheet-worker.js:%d), the base distances every character\n" % move_line)
    out.append("// walks, jogs and runs before its race is taken into account.\n")
    out.append("//\n")
    out.append("// A RACE'S MOVEMENT FIGURES ARE MODIFIERS, NOT FINISHED RATES. His switch reads\n")
    out.append("//     move_walk_hourly: 2+racetmpwalkhourly+tmpwalktemphourlymod\n")
    out.append("// so the race's number is ADDED to the base below. A race carrying 0/0/0 --\n")
    out.append("// Human(Civilized) among them -- is a race with no modifier, and walks at the full\n")
    out.append("// base for its Agility. It is NOT a race with no movement, and must never be\n")
    out.append("// \"fixed\" by inventing figures for it.\n")
    out.append("//\n")
    out.append("// Each row is [lowest Agility, highest Agility, bases], and each of walk/jog/run is\n")
    out.append("// [hourly (miles), 10 seconds (feet), 1 second (feet)]. His bands are irregular --\n")
    out.append("// 0-1, 2-4, then singles, then 11-12 and 13-14 -- which is why this is generated.\n")
    out.append("//\n")
    out.append("// His switch stops at Agility %d and has no default, so a higher rating would leave\n" % move_ceiling)
    out.append("// the previous values in place. The port clamps to the top band instead.\n")
    out.append("export const MOVEMENT_BASE = [\n")
    for lo, hi, v in move_rows:
        out.append("\t[%2d, %2d, { walk: %s, jog: %s, run: %s, jumpStand: %s, jumpUp: %s }],\n"
                   % (lo, hi, js(v["walk"]), js(v["jog"]), js(v["run"]),
                      js(v["jumpStand"]), js(v["jumpUp"])))
    out.append("];\n\n")

    out.append("// @END (CODE)\n")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("".join(out))

    lore_titles, lore_line = class_lore_titles()
    weapon_when, weapon_line = class_lore_when("getWeaponLoreWhen")
    missile_when, missile_line = class_lore_when("getMissileLoreWhen")
    proj_when, proj_when_line = class_lore_when("getProjectileLoreWhen")
    know2nd_when, know2nd_line = class_lore_when("get2ndWeaponKnowWhen")
    lore2nd_when, lore2nd_line = class_lore_when("get2ndWeaponLoreWhen")
    # Multiple Missile Lore is gated by class title the way the five above are. Its Knowledge
    # half has no such function -- holding the skill is the whole of it -- so there is nothing
    # to generate for that side and no sixth entry here.
    multimissile_when, multimissile_line = class_lore_when("getMultiMissileLoreWhen")
    with open(os.path.join(NAMED, "classLoreTitles.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js",
                        "function": "getLoreAttackChart", "line": lore_line},
            "_weaponLoreSource": {"function": "getWeaponLoreWhen", "line": weapon_line},
            "_missileLoreSource": {"function": "getMissileLoreWhen", "line": missile_line},
            "entries": lore_titles,
            "weaponLoreWhen": weapon_when,
            "missileLoreWhen": missile_when,
            "_projectileLoreSource": {"function": "getProjectileLoreWhen", "line": proj_when_line},
            "projectileLoreWhen": proj_when,
            "_secondWeaponKnowSource": {"function": "get2ndWeaponKnowWhen", "line": know2nd_line},
            "secondWeaponKnowWhen": know2nd_when,
            "_secondWeaponLoreSource": {"function": "get2ndWeaponLoreWhen", "line": lore2nd_line},
            "secondWeaponLoreWhen": lore2nd_when,
            "_multiMissileLoreSource": {"function": "getMultiMissileLoreWhen", "line": multimissile_line},
            "multiMissileLoreWhen": multimissile_when
        }, fh, indent=2, ensure_ascii=False)

    # How many class skill slots each class needs for its whole progression. A zero here would
    # read as "this class is free to take", so a class that parsed to zero is reported loudly
    # rather than written out quietly.
    slots_needed, slots_line = class_skill_slots_needed()
    zero_slots = sorted([k for k, v in slots_needed.items() if not v])
    if zero_slots:
        print("  WARNING: %d classes parsed as needing 0 slots: %s"
              % (len(zero_slots), ", ".join(zero_slots)))
    with open(os.path.join(NAMED, "classSkillSlots.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js",
                        "function": "getSlotsNeededForClass", "line": slots_line},
            "entries": slots_needed
        }, fh, indent=2, ensure_ascii=False)

    with open(os.path.join(NAMED, "raceBodyTypes.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js",
                        "function": "getRacialBodyType", "line": race_line},
            "_conditional": conditional,
            "entries": races
        }, fh, indent=2, ensure_ascii=False)

    # Starting-age ranges and maximum ages. A race missing any of the three is reported rather
    # than written out with a hole in it.
    ages, ages_line = race_ages()
    for tmpname, tmpages in ages.items():
        missing = [k for k in ("startLow", "startHigh", "maxAge") if k not in tmpages]
        if missing:
            print("  WARNING: getAge case %s has no %s" % (tmpname, ", ".join(missing)))
    with open(os.path.join(NAMED, "raceAges.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js", "function": "getAge", "line": ages_line},
            "entries": ages
        }, fh, indent=2, ensure_ascii=False)
    print("race ages          %d races" % len(ages))

    print("attack charts      %d skill levels" % len([k for k in attack if k]))
    print("body charts        %d body types" % len(bodies))
    print("armour blocking    %d damage types" % len(blocking))
    print("armour dividers    %d materials" % len(dividers))
    print("material rank      %d materials" % len(ranks))
    print("race body types    %d races (%d conditional: %s)" % (len(races), len(conditional), ", ".join(conditional)))
    print("class lore titles  %d classes (%d reach a Lore chart)"
          % (len(lore_titles), len([t for t in lore_titles.values() if t])))
    print("class skill slots  %d classes (%d to %d slots needed)"
          % (len(slots_needed), min(slots_needed.values()), max(slots_needed.values())))
    print("projectiles        %d name tests, %d launcher tests, %d launcher->ammo"
          % (len(projectiles), len(launchers), len(launcher_ammo)))
    print("projectile lore    %d classes (%d ever acquire it)"
          % (len(proj_when), len([t for t in proj_when.values() if t])))
    print("weapon lore when   %d classes (%d ever acquire it)"
          % (len(weapon_when), len([t for t in weapon_when.values() if t])))
    print("missile lore when  %d classes (%d ever acquire it)"
          % (len(missile_when), len([t for t in missile_when.values() if t])))
    print("2nd wpn know when  %d classes (%d ever acquire it)"
          % (len(know2nd_when), len([t for t in know2nd_when.values() if t])))
    print("2nd wpn lore when  %d classes (%d ever acquire it)"
          % (len(lore2nd_when), len([t for t in lore2nd_when.values() if t])))
    print("armour coverage    %d families (%s)" % (len(armor_maps), ", ".join(armor_maps)))
    print("armour by item     %s" % ("; ".join("%s: %d area(s) need %s"
          % (fam, len(m), sorted(set(m.values()))[0]) for fam, m in armor_required.items()) or "none"))

    print("endured types      %d damage types (%d accept \"Enduring All\")"
          % (len(endured), len([t for t in endured.values() if "Enduring All" in t])))
    print("shield coverage    %d families, %d size/handedness combinations"
          % (len(shield_maps), sum(len(h) for f in shield_maps.values() for h in f.values())))
    print("off-hand penalty   melee %d bands (zero from %d), damage %d (from %d), skill %d (from %d)"
          % (len(melee_bands),  melee_bands[-1][1] + 1,
             len(damage_bands), damage_bands[-1][1] + 1,
             len(skill_bands),  skill_bands[-1][1] + 1))
    print("movement base      %d bands, Agility 0-%d (race figures are MODIFIERS on these)"
          % (len(move_rows), move_ceiling))
    if move_missing:
        print("  WARNING: his switch has no case for Agility %s"
              % ", ".join(str(a) for a in move_missing))
    if move_drift:
        print("  WARNING: his two copies of the base table disagree at %s"
              % ", ".join(str(d) for d in move_drift))
    if not (melee_ambi and damage_ambi and skill_ambi):
        print("  WARNING: a penalty table does not zero for Ambidextrous -- check his short-circuit")
    if shield_unresolved:
        print("  WARNING: %d shield write(s) landed on a position his armour branch does not label"
              % len(shield_unresolved))
        for row in shield_unresolved[:10]:
            print("      %s %s (%s-handed) position %d" % row)

    # His branches key on the area's POSITION, and two have drifted out of step with the charts
    # they serve. The port keys by name instead, so these are reported rather than reproduced.
    if armor_mismatches:
        bycharts = {}
        for family, chart, position, meant, actual in armor_mismatches:
            bycharts.setdefault((family, chart), []).append((position, meant, actual))
        print("\n%d position mismatch(es) between his armour branches and his body charts:"
              % len(armor_mismatches))
        for (family, chart), rows in sorted(bycharts.items()):
            print("  %s branch vs %s chart -- %d area(s)" % (family, chart, len(rows)))
            for position, meant, actual in rows[:3]:
                print("      position %d: his comment says %r, the chart says %r" % (position, meant, actual))
            if len(rows) > 3:
                print("      ... and %d more" % (len(rows) - 3))
        print("  (reported, not reproduced -- see docs/UPSTREAM-ISSUES.md items 17 and 18)")


    # Where a chart spells an area differently from the comment on the case that serves it, the
    # chart's own spelling is aliased onto the same slot -- otherwise keying by name would lose
    # that area's armour entirely. Printed because it is a judgement call, not a mechanical one.
    if armor_aliases:
        print("\n%d alias(es) added so a chart's own spelling still finds its armour slot:"
              % len(armor_aliases))
        seen = set()
        for family, chart, position, meant, actual, slot in armor_aliases:
            key = (family, meant, actual, slot)
            if key in seen:
                continue
            seen.add(key)
            print("  %-10s %-22s -> %-22s %s"
                  % (family, repr(meant), repr(actual), slot))

    print("\nwrote %s" % os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
