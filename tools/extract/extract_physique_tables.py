#!/usr/bin/env python3
"""
extract_physique_tables.py -- pull the height, frame and weight tables out of the sheet-worker
and emit module/physique-tables.mjs.

Build-time tooling. Not shipped with the Foundry system.

None of these are data dictionaries either. They live as switches and if-chains across twenty-odd
functions, so they are walked here rather than transcribed -- the project's standing rule.

HOW HIS THREE FIGURES RELATE. They are not independent: weight depends on both of the others.

    race  -> height TYPE          getRaceHeightType         "Average", "Tall", "Miniscule1"...
    type  -> height in inches     get<Type>Height           a d100 ladder around a base
    race  -> frame TYPE           setTempRaceFrameType      "Slender", "Stout", "Feathery"...
    type + (STR - AGL) -> FRAME   getTempFrame              "Wispy".."Tremendous"
    frame + inches -> weight      get<Frame>Weight          an inch-band ladder, with a roll

Tables produced:
    HEIGHT_TYPE_BY_RACE   getRaceHeightType
    HEIGHT_BANDS          the twelve get<Type>Height functions
    FRAME_TYPE_BY_RACE    setTempRaceFrameType
    FRAME_LADDER          getTempFrame
    WEIGHT_BANDS          the six get<Frame>Weight functions

THE SLIGHT-PHYSIQUE BRANCHES ARE READ AND SET ASIDE. Every one of these functions takes a
"slight physique" flag and answers differently for it. The port has no slight-physique option --
a rules call still open with the developer -- so the ORDINARY branch is what the tables carry,
and the slight figures are written beside them, unused, so that adding the option later is
reading a table rather than re-extracting.

Anything that does not parse is reported rather than dropped quietly.

Usage:
    python extract_physique_tables.py
"""

import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
WORKER = os.path.join(ROOT, "docs", "reference", "sheet-worker.js")
OUT = os.path.join(ROOT, "module", "physique-tables.mjs")

lines = open(WORKER, encoding="utf-8", errors="replace").readlines()
problems = []


def function_body(name):
    """(first line number, lines) for a function, taking the LAST declaration as JavaScript does."""
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
            return i + 1, out
    raise SystemExit("unterminated function: " + name)


def dice_of(tmptext):
    """
    One of his roll expressions as a dice string this port can read.

        getDiceRollNoMod(4,6)  -> "4d6"      four six-sided dice
        getDieRoll(6)          -> "1d6"
        (nothing)              -> ""         a flat figure, no roll

    Returns (dice string, sign) where sign is +1 or -1 for which way the roll moves the base.
    """
    tmpmatch = re.search(r'([+-])\s*getDiceRollNoMod\(\s*(\d+)\s*,\s*(\d+)\s*\)', tmptext)
    if tmpmatch:
        return "%sd%s" % (tmpmatch.group(2), tmpmatch.group(3)), (-1 if tmpmatch.group(1) == "-" else 1)
    tmpmatch = re.search(r'([+-])\s*getDieRoll\(\s*(\d+)\s*\)', tmptext)
    if tmpmatch:
        return "1d%s" % tmpmatch.group(2), (-1 if tmpmatch.group(1) == "-" else 1)
    if "getDiceRollNoMod" in tmptext or "getDieRoll" in tmptext:
        problems.append("unreadable roll: " + tmptext.strip())
    return "", 1


# --------------------------------------------------------------------------------------
# @MARKER HEIGHT
# getRaceHeightType is a plain switch of race -> band name.
def height_type_by_race():
    start, body = function_body("getRaceHeightType")
    out = {}
    for line in body:
        for tmprace, tmptype in re.findall(r'case\s+"([^"]*)"\s*:\s*racetmpheighttype\s*=\s*"([^"]*)"', line):
            if tmprace:
                out[tmprace] = tmptype
    return out, start


HEIGHT_FUNCTIONS = [
    ("Miniscule1", "getMiniscule1Height"), ("Miniscule2", "getMiniscule2Height"),
    ("Tiny", "getTinyHeight"), ("Very Short", "getVeryShortHeight"),
    ("Small", "getSmallHeight"), ("Short", "getShortHeight"),
    ("Medium", "getMediumHeight"), ("Average", "getAverageHeight"),
    ("Tall", "getTallHeight"), ("Large", "getLargeHeight"),
    ("Giant", "getGiantHeight"), ("True Giant", "getTrueGiantHeight"),
]


def height_band(name, fname):
    """
    One height band: a d100 ladder of offsets around a base, and the low/high bounds his sheet
    shows beside it.

        if (tmppercent<6)  { tmpinches=72-getDiceRollNoMod(4,6); }
        else if (...)      ...
        else               { tmpinches=72+getDiceRollNoMod(4,6); }   // 95-100

    Each rung is written as the highest roll it covers, so a d100 is read down the list and takes
    the first rung it is under. His final `else` is written as 101, meaning "anything left".
    """
    start, body = function_body(fname)
    rows = []
    slight = {"adjust": 0, "low": [0, 0], "high": [0, 0]}
    bounds = {"low": [0, 0], "high": [0, 0]}
    in_slight = False
    in_ladder = False
    # His condition and its assignment sit on SEPARATE lines, so the rung's threshold has to be
    # carried forward to the assignment that follows it.
    pending_under = None

    for line in body:
        tmpunder = re.search(r'tmppercent\s*<\s*(\d+)', line)
        tmpelse = re.match(r'\s*\}\s*else\s*\{', line)
        if tmpunder:
            in_ladder = True
            pending_under = int(tmpunder.group(1))
        elif tmpelse and in_ladder and not in_slight:
            pending_under = None          # the final rung: everything left

        # THE BASE IS PER RUNG, not per band. Most bands use one figure throughout -- Average is
        # 72 on every rung -- but Tiny walks 11 and 12, which is why this is read rung by rung.
        tmpset = re.search(r'tmpinches\s*=\s*(\d+)\s*([^;]*);', line)
        if tmpset and in_ladder:
            tmpdice, tmpsign = dice_of(tmpset.group(2))
            rows.append({"under": pending_under if pending_under is not None else 101,
                         "base": int(tmpset.group(1)), "dice": tmpdice, "sign": tmpsign})
            continue

        # His two smallest bands have no d100 ladder at all: a Miniscule creature's height is one
        # roll ("tmpinches=getDiceRollNoMod(3,4)"), with a tidy-up when it comes out at exactly a
        # foot. Read as a single rung covering the whole roll.
        tmproll = re.match(r'\s*tmpinches\s*=\s*(getDic|getDie)[^;]*;', line)
        if tmproll and not in_ladder:
            tmpdice, tmpsign = dice_of("+" + line.split("=", 1)[1])
            rows.append({"under": 101, "base": 0, "dice": tmpdice, "sign": tmpsign})
            continue

        if re.search(r'tempslightphysique\s*==\s*"yes"', line):
            in_slight = True
        elif tmpelse and in_slight:
            in_slight = False

        tmpadjust = re.search(r'tmpinches\s*=\s*tmpinches\s*([+-])\s*(\d+)', line)
        if tmpadjust:
            slight["adjust"] = int(tmpadjust.group(2)) * (-1 if tmpadjust.group(1) == "-" else 1)

        tmpbound = re.search(r'tempHeightArray\[(\d)\]\s*=\s*(\d+)', line)
        if tmpbound:
            tmpindex, tmpvalue = int(tmpbound.group(1)), int(tmpbound.group(2))
            tmptarget = slight if in_slight else bounds
            if tmpindex == 2:   tmptarget["low"][0] = tmpvalue
            elif tmpindex == 3: tmptarget["low"][1] = tmpvalue
            elif tmpindex == 4: tmptarget["high"][0] = tmpvalue
            elif tmpindex == 5: tmptarget["high"][1] = tmpvalue

    if not rows:
        problems.append("%s: no ladder found" % fname)
    return {"rows": rows, "bounds": bounds, "slight": slight}, start


# --------------------------------------------------------------------------------------
# @MARKER FRAME
def frame_type_by_race():
    """setTempRaceFrameType holds a plain race -> frame-type dictionary."""
    start, body = function_body("setTempRaceFrameType")
    out = {}
    for line in body:
        for tmprace, tmptype in re.findall(r'"([^"]*)"\s*:\s*"([^"]*)"\s*,', line):
            if tmprace:
                out[tmprace] = tmptype
    return out, start


def frame_ladder():
    """
    getTempFrame: frame type plus (STR - AGL) gives the frame the weight tables are keyed by.

        case "Slender":
            if (framemeasure<-4)     { tempFrame="Wispy"; }
            else if (framemeasure<5) { tempFrame="Light"; }
            else                     { tempFrame="Medium"; }

    Each rung is the measure it is under; the final `else` is written as 999.
    """
    start, body = function_body("getTempFrame")
    out, label = {}, None
    pending = None
    for line in body:
        tmpcase = re.search(r'case\s+"([^"]*)"\s*:', line)
        if tmpcase:
            label = tmpcase.group(1)
            out.setdefault(label, [])
        tmpunder = re.search(r'framemeasure\s*<\s*(-?\d+)', line)
        if tmpunder:
            pending = int(tmpunder.group(1))
        tmpset = re.search(r'tempFrame\s*=\s*"([^"]*)"', line)
        if tmpset and label is not None:
            out[label].append({"under": pending if pending is not None else 999,
                               "frame": tmpset.group(1)})
            pending = None
    return out, start


# --------------------------------------------------------------------------------------
# @MARKER WEIGHT
WEIGHT_FUNCTIONS = [
    ("Wispy", "getWispyWeight"), ("Light", "getLightWeight"), ("Medium", "getMediumWeight"),
    ("Heavy", "getHeavyWeight"), ("Extra-Heavy", "getExtraHeavyWeight"),
    ("Tremendous", "getTremendousWeight"),
]


def weight_band(name, fname):
    """
    One frame's weight ladder, in bands of total height in inches:

        if (tmptotalinches<5) {
            tmpbaseweight=8;
            tmprollmod=0+getDieRoll(6);
            tmplowweight=9;
            tmphighweight=14;
            if(tmpslightphysique=="yes") { ... }      // read and set aside
        }

    A few bands double the roll afterwards (tmprollmod=tmprollmod*2), which is kept as a flag.
    """
    start, body = function_body(fname)
    rows = []
    current, in_slight = None, False

    for line in body:
        tmpunder = re.search(r'tmptotalinches\s*<\s*(\d+)', line)
        if tmpunder:
            if current:
                rows.append(current)
            current = {"under": int(tmpunder.group(1)), "base": 0, "dice": "", "sign": 1,
                       "low": 0, "high": 0, "double": False}
            in_slight = False
            continue
        # his final rung is a bare else, covering everything taller
        if current is not None and re.match(r'\s*\}\s*else\s*\{', line) and not in_slight:
            rows.append(current)
            current = {"under": 9999, "base": 0, "dice": "", "sign": 1,
                       "low": 0, "high": 0, "double": False}
            continue
        if current is None:
            continue

        if re.search(r'tmpslightphysique\s*==\s*"yes"', line):
            in_slight = True
            continue
        if in_slight:
            # the slight branch ends at its closing brace; everything in it is set aside
            if re.match(r'\s*\}\s*$', line):
                in_slight = False
            continue

        tmpbase = re.search(r'tmpbaseweight\s*=\s*(\d+)', line)
        if tmpbase:
            current["base"] = int(tmpbase.group(1))
        tmproll = re.search(r'tmprollmod\s*=\s*(\d+)\s*(.*?);', line)
        if tmproll:
            current["dice"], current["sign"] = dice_of(tmproll.group(2))
        if re.search(r'tmprollmod\s*=\s*tmprollmod\s*\*\s*2', line):
            current["double"] = True
        tmplow = re.search(r'tmplowweight\s*=\s*(\d+)', line)
        if tmplow:
            current["low"] = int(tmplow.group(1))
        tmphigh = re.search(r'tmphighweight\s*=\s*(\d+)', line)
        if tmphigh:
            current["high"] = int(tmphigh.group(1))

    if current and current not in rows:
        rows.append(current)
    rows = [r for r in rows if r["base"] or r["low"] or r["high"]]
    if not rows:
        problems.append("%s: no bands found" % fname)
    return rows, start


# --------------------------------------------------------------------------------------
height_types, height_type_line = height_type_by_race()
height_bands = {}
for tmpname, tmpfn in HEIGHT_FUNCTIONS:
    height_bands[tmpname], _ = height_band(tmpname, tmpfn)

frame_types, frame_type_line = frame_type_by_race()
frames, frame_line = frame_ladder()

weights = {}
weight_line = None
for tmpname, tmpfn in WEIGHT_FUNCTIONS:
    weights[tmpname], tmpline = weight_band(tmpname, tmpfn)
    weight_line = weight_line or tmpline

print("physique tables")
print("  height types   %4d races  (line %d)" % (len(height_types), height_type_line))
print("  height bands   %4d        (%s)" % (len(height_bands),
      ", ".join("%s:%d" % (k, len(v["rows"])) for k, v in list(height_bands.items())[:4]) + ", ..."))
print("  frame types    %4d races  (line %d)" % (len(frame_types), frame_type_line))
print("  frame ladder   %4d types  (line %d)" % (len(frames), frame_line))
print("  weight bands   %4d frames (%s)" % (len(weights),
      ", ".join("%s:%d" % (k, len(v)) for k, v in weights.items())))

# Every race a character can actually BE should have both a height type and a frame type. Checked
# against the built race documents rather than against his other dictionaries, which carry
# "(Slight Physique)" variants and two Fairies that are not races anyone can choose.
RACES = os.path.join(ROOT, "src", "packs", "documents", "races.json")
real_races = []
if os.path.exists(RACES):
    with open(RACES, encoding="utf-8") as fh:
        real_races = [d["name"] for d in json.load(fh)]


def sibling_type(tmprace, tmptable):
    """
    The height or frame type of a variant's siblings.

    Four races are missing from his height switch -- Giant(Civilized), and the City, Port and Town
    Humans -- while their siblings are listed: Giant(Civilized:Seafaring) is a Giant, and
    Human(Civilized:Village) is Average. On his own sheet those four therefore get NO height at
    all. The port falls back to the siblings where they agree, and says so; the gap itself is
    reported to him as an upstream issue rather than passed over.
    """
    # The closest siblings first: entries that are this race with something added --
    # "Giant(Civilized)" is answered by "Giant(Civilized:Seafaring)", which the looser rule below
    # could not choose, a plain Giant and a True Giant both sharing the stem "Giant".
    tmpinner = tmprace.rstrip(")")
    tmpclose = set(tmptable[k] for k in tmptable
                   if k.startswith(tmpinner) and k != tmprace and tmptable[k] not in ("", "N/A"))
    if len(tmpclose) == 1:
        return tmpclose.pop()

    tmpstem = tmprace.split(":")[0].split("(")[0]
    tmpfound = set(tmptable[k] for k in tmptable
                   if k.split(":")[0].split("(")[0] == tmpstem and tmptable[k] not in ("", "N/A"))
    return tmpfound.pop() if len(tmpfound) == 1 else ""


substituted = []
for tmprace in sorted(real_races):
    if tmprace not in height_types:
        tmpguess = sibling_type(tmprace, height_types)
        if tmpguess:
            height_types[tmprace] = tmpguess
            substituted.append("%s -> %s (height, from its siblings)" % (tmprace, tmpguess))
        else:
            problems.append("%s has no height type, and no sibling to take one from" % tmprace)
    if tmprace not in frame_types:
        tmpguess = sibling_type(tmprace, frame_types)
        if tmpguess:
            frame_types[tmprace] = tmpguess
            substituted.append("%s -> %s (frame, from its siblings)" % (tmprace, tmpguess))
        else:
            problems.append("%s has no frame type, and no sibling to take one from" % tmprace)

if substituted:
    print("  %d race(s) missing from his switches, filled from their siblings:" % len(substituted))
    for tmpline in substituted:
        print("    " + tmpline)

# Every frame the ladder can answer must have a weight table.
for tmptype, tmprungs in frames.items():
    for tmprung in tmprungs:
        if tmprung["frame"] not in weights and tmprung["frame"] != "None":
            problems.append("frame %r has no weight table (from %s)" % (tmprung["frame"], tmptype))

if problems:
    print("  %d problem(s):" % len(problems))
    for tmpproblem in sorted(set(problems))[:20]:
        print("    " + tmpproblem)
else:
    print("  no problems")

out = []
out.append("// @START (CODE)")
out.append("// @MARKER PHYSIQUE TABLES")
out.append("//" + "=" * 114)
out.append("// GENERATED FILE -- do not edit by hand.")
out.append("// Produced by tools/extract/extract_physique_tables.py from the original Roll20 sheet-worker.")
out.append("// Regenerate rather than editing, or this will drift from his sheet.")
out.append("//")
out.append("// Height, frame and weight. They are not independent: a race gives a height TYPE and a")
out.append("// frame TYPE; the height type gives inches; the frame type and (STR - AGL) give a FRAME;")
out.append("// and the frame with the inches gives a weight.")
out.append("//")
out.append("// Every one of his functions also answers differently for a slight physique. The port has")
out.append("// no slight-physique option yet, so the ORDINARY figures are the tables and the slight ones")
out.append("// sit beside them, unused, against the day the option is added.")
out.append("//" + "=" * 114)
out.append("")
out.append("// @MARKER HEIGHT TYPE BY RACE")
out.append("// From getRaceHeightType (sheet-worker.js:%d)." % height_type_line)
out.append("export const HEIGHT_TYPE_BY_RACE = {")
for tmprace in sorted(height_types):
    out.append("\t%s: \"%s\"," % (json.dumps(tmprace), height_types[tmprace]))
out.append("};")
out.append("")
out.append("// @MARKER HEIGHT BANDS")
out.append("// Each band is a d100 ladder: read the roll down the rows and take the first whose `under`")
out.append("// it has not reached, then the rung's base in inches, plus or minus its roll. The base is")
out.append("// per rung because his Tiny band walks 11 and 12 rather than holding one figure.")
out.append("//")
out.append("// His two smallest bands have no ladder at all -- a Miniscule creature's height is a single")
out.append("// roll -- so they carry one rung covering the whole d100.")
out.append("//")
out.append("// `bounds` are the shortest and tallest his sheet shows for the band, as [feet, inches].")
out.append("export const HEIGHT_BANDS = {")
for tmpname, tmpband in height_bands.items():
    out.append("\t%s: {" % json.dumps(tmpname))
    out.append("\t\trows: [")
    for r in tmpband["rows"]:
        out.append("\t\t\t{ under: %d, base: %d, dice: %s, sign: %d },"
                   % (r["under"], r["base"], json.dumps(r["dice"]), r["sign"]))
    out.append("\t\t],")
    out.append("\t\tbounds: { low: %s, high: %s }," % (tmpband["bounds"]["low"], tmpband["bounds"]["high"]))
    out.append("\t\tslight: { adjust: %d, low: %s, high: %s }," % (
        tmpband["slight"]["adjust"], tmpband["slight"]["low"], tmpband["slight"]["high"]))
    out.append("\t},")
out.append("};")
out.append("")
out.append("// @MARKER FRAME TYPE BY RACE")
out.append("// From setTempRaceFrameType (sheet-worker.js:%d). A race's build, before the character's" % frame_type_line)
out.append("// own Strength and Agility are taken into account.")
out.append("export const FRAME_TYPE_BY_RACE = {")
for tmprace in sorted(frame_types):
    if tmprace:
        out.append("\t%s: \"%s\"," % (json.dumps(tmprace), frame_types[tmprace]))
out.append("};")
out.append("")
out.append("// @MARKER THE FRAME LADDER")
out.append("// From getTempFrame (sheet-worker.js:%d). The measure is STRENGTH MINUS AGILITY, which is" % frame_line)
out.append("// the Player's Guide's own rule (p.34): a strong, slow character is heavier-framed than a")
out.append("// quick one of the same race. Read down the rungs and take the first the measure is under.")
out.append("export const FRAME_LADDER = {")
for tmptype in sorted(frames):
    if not tmptype:
        continue
    out.append("\t%s: [%s]," % (json.dumps(tmptype), ", ".join(
        "{ under: %d, frame: %s }" % (r["under"], json.dumps(r["frame"])) for r in frames[tmptype])))
out.append("};")
out.append("")
out.append("// @MARKER WEIGHT BANDS")
out.append("// Each frame carries a ladder of height bands, in total inches. A band gives a base weight,")
out.append("// a roll added to it, and the lightest and heaviest his sheet shows for that band. `double`")
out.append("// marks the few bands where his code doubles the roll afterwards.")
out.append("export const WEIGHT_BANDS = {")
for tmpname, tmprows in weights.items():
    out.append("\t%s: [" % json.dumps(tmpname))
    for r in tmprows:
        out.append("\t\t{ under: %d, base: %d, dice: %s, sign: %d, low: %d, high: %d, double: %s },"
                   % (r["under"], r["base"], json.dumps(r["dice"]), r["sign"], r["low"], r["high"],
                      "true" if r["double"] else "false"))
    out.append("\t],")
out.append("};")
out.append("")
out.append("// @MARKER ADD NEW physique tables HERE")
out.append("// @END (CODE)")
out.append("")

open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(out))
print("  wrote %s" % os.path.relpath(OUT, ROOT))
