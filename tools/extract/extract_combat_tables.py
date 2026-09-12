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
    start, body = function_body("getBodyList")
    charts, _ = switch_cases(body, "newBodyList")
    return charts, start


def race_body_types():
    start, body = function_body("getRacialBodyType")
    races, conditional = switch_cases(body, "tmpBodyType")
    return races, conditional, start


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


def body_armor_maps(charts):
    """
    Which armour slot covers each body area, per body-type family.

    From getArmorValuesByBodyTypeAndArmor. His version switches on the area's POSITION in the
    body chart and returns an index into the armour row. That is fragile: he matches the family
    with includes(), so one branch serves every chart whose name contains the family word, and
    those charts do not all list their areas in the same order. Two of them have drifted out of
    step with the branch that serves them -- Snake(Arms) and Centaur -- so a position-keyed port
    would faithfully reproduce armour landing on the wrong limb.

    The port therefore keys by area NAME, taken from the comment he wrote on each case, which is
    the statement of what he meant that position to be. Any case whose comment disagrees with the
    chart at that position is returned as a mismatch for reporting; his comment wins.

    A few areas only take armour from a named item -- a Centaur's quarters and legs need
    "Centaur Barding" -- and those are returned separately rather than flattened away.

    Returns (maps, required_items, mismatches, first line).
    """
    start, body = function_body("getArmorValuesByBodyTypeAndArmor")

    maps, required, mismatches = {}, {}, []
    family, pending = None, None
    for line in body:
        m = re.search(r'tmpBodyType\.includes\("([^"]+)"\)', line)
        if m:
            family = m.group(1)
            maps.setdefault(family, {})
            pending = None
            continue
        if family is None:
            continue

        found = re.findall(r'case\s+(\d+)\s*:', line)
        if found:
            comment = re.search(r'//\s*(.+?)\s*$', line)
            pending = (int(found[0]), comment.group(1).strip() if comment else "")
            continue

        # An area gated on a particular item: "if (armorItemName.includes("Centaur Barding"))".
        gate = re.search(r'armorItemName\.includes\("([^"]+)"\)', line)
        if gate and pending:
            required.setdefault(family, {})[pending[1]] = gate.group(1)
            continue

        slot = re.search(r'tempReturnArmorValue\s*=\s*tempArmorValues\[(\d+)\]', line)
        if slot and pending:
            index = int(slot.group(1))
            case, name = pending
            pending = None
            if not name:
                continue                       # no comment: nothing to key by, so skip it
            if index < 2 or index - 2 >= len(ARMOR_SLOT_KEYS):
                continue                       # material, type or weight: not a location
            maps[family][name] = ARMOR_SLOT_KEYS[index - 2]

            # Cross-check his comment against every chart this family's branch serves.
            for chart_name, chart in charts.items():
                if family not in chart_name:
                    continue
                areas = [a.split("(")[0] for a in chart.split(",")]
                position = case - 2            # callers pass the area's index plus two
                if 0 <= position < len(areas) and areas[position] != name:
                    mismatches.append((family, chart_name, position, name, areas[position]))

    return maps, required, mismatches, start


def load_raw(name):
    """The blocking and degradation tables are used positionally, so the raw extraction is
    exactly what is wanted -- they never needed a column map."""
    with open(os.path.join(RAW, name + ".json"), encoding="utf-8") as fh:
        return json.load(fh)["entries"]


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
    armor_maps, armor_required, armor_mismatches, armor_line = body_armor_maps(bodies)
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

    out.append("// @END (CODE)\n")

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("".join(out))

    with open(os.path.join(NAMED, "raceBodyTypes.json"), "w", encoding="utf-8") as fh:
        json.dump({
            "_source": {"file": "docs/reference/sheet-worker.js",
                        "function": "getRacialBodyType", "line": race_line},
            "_conditional": conditional,
            "entries": races
        }, fh, indent=2, ensure_ascii=False)

    print("attack charts      %d skill levels" % len([k for k in attack if k]))
    print("body charts        %d body types" % len(bodies))
    print("armour blocking    %d damage types" % len(blocking))
    print("armour dividers    %d materials" % len(dividers))
    print("material rank      %d materials" % len(ranks))
    print("race body types    %d races (%d conditional: %s)" % (len(races), len(conditional), ", ".join(conditional)))
    print("armour coverage    %d families (%s)" % (len(armor_maps), ", ".join(armor_maps)))
    print("armour by item     %s" % ("; ".join("%s: %d area(s) need %s"
          % (fam, len(m), sorted(set(m.values()))[0]) for fam, m in armor_required.items()) or "none"))

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

    print("\nwrote %s" % os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
