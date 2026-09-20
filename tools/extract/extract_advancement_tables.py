#!/usr/bin/env python3
"""
extract_advancement_tables.py -- pull the experience and levelling tables out of the
sheet-worker and emit module/advancement-tables.mjs.

Build-time tooling. Not shipped with the Foundry system.

None of these are data dictionaries. Every one of them lives as a switch statement or an
if-chain inside a function, so they are read here by walking those functions -- the project's
standing rule, so the tables stay tied to his code rather than to a hand transcription.

Tables produced:
    GOAL_EXP            getNewGoal    -- the experience each of the 48 goals begins at
    TITLE_EXP           getNewTitle   -- the experience each of the 16 titles begins at
    EXP_CAP_BY_TITLE    getExpCapByExistingTitle -- how far ahead a character may bank exp
    SKILL_POINTS_BY_CLASS  getSkillPointsByClass -- points a goal advance gives, by class

FOUR OF HIS FUNCTIONS DESCRIBE THE SAME LADDER, and each is read and cross-checked against
the others rather than one being trusted:
    getNewGoal        exp -> goal          the if-chain, taken as authoritative
    getExpByGoal      goal -> exp          a switch, and it has a defect (see below)
    getNextGoalExp    exp -> next threshold
    getNewTitle       exp -> title

getExpByGoal writes `case 30:` TWICE (the second where `case 40:` belongs), so goal 40 falls
through his switch and answers 0. Reported as an upstream issue; the ladder here comes from
getNewGoal, which is correct, and every disagreement between the four is printed.

Usage:
    python extract_advancement_tables.py
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(HERE, "..", "..")
WORKER = os.path.join(ROOT, "docs", "reference", "sheet-worker.js")
OUT = os.path.join(ROOT, "module", "advancement-tables.mjs")

lines = open(WORKER, encoding="utf-8", errors="replace").readlines()


def function_body(name):
    """Return (first line number, list of lines) for a function, taking the LAST declaration --
    the one JavaScript actually runs when a name is declared twice."""
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


def if_chain(name, assign):
    """
    Read an if-chain of the shape `if (x<1500) { y=1; } else if (x<4500) { y=2; }` and return
    [(threshold, value)] in the order written, plus the function's line number.

    Every one of his experience functions is written this way: each branch names the exp at
    which the NEXT step begins, so the value's own starting exp is the previous threshold.
    """
    start, body = function_body(name)
    out = []
    pat = re.compile(r'<\s*(-?\d+)\s*\)\s*\{\s*%s\s*=\s*"?(-?\d+)"?' % re.escape(assign))
    for l in body:
        for tmpthreshold, tmpvalue in pat.findall(l):
            out.append((int(tmpthreshold), int(tmpvalue)))
    if not out:
        raise SystemExit("no if-chain found in " + name)
    return start, out


def numeric_switch(name, assign):
    """Read `case 7: y=19; break;` and return {case: value}, plus the line number and any
    case label written more than once -- which is a defect, since the second is unreachable."""
    start, body = function_body(name)
    out, duplicates = {}, []
    pat = re.compile(r'case\s+"?(-?\w+)"?\s*:\s*%s\s*=\s*(-?\d+)' % re.escape(assign))
    for l in body:
        for tmplabel, tmpvalue in pat.findall(l):
            tmpkey = int(tmplabel) if re.match(r'^-?\d+$', tmplabel) else tmplabel
            if tmpkey in out:
                duplicates.append(tmpkey)
                continue                      # the first one wins, as JavaScript does
            out[tmpkey] = int(tmpvalue)
    return start, out, duplicates


def string_case_switch(name, assign):
    """Read `case "Warrior": y=17; break;` and return {name: value} plus the line number."""
    start, body = function_body(name)
    out = {}
    pat = re.compile(r'case\s+"([^"]*)"\s*:\s*%s\s*=\s*(-?\d+)' % re.escape(assign))
    for l in body:
        for tmpname, tmpvalue in pat.findall(l):
            out[tmpname] = int(tmpvalue)
    return start, out


# --------------------------------------------------------------------------------------
# The goal ladder, from getNewGoal. Each branch says "below this exp you are goal N", so the
# exp goal N BEGINS at is the previous branch's threshold, and the first branch's goal begins
# wherever his lowest branch does.
goal_line, goal_chain = if_chain("getNewGoal", "newGoal")
goal_exp = {}
tmpprevious = None
for tmpthreshold, tmpgoal in goal_chain:
    goal_exp[tmpgoal] = -1500 if tmpprevious is None else tmpprevious
    tmpprevious = tmpthreshold

title_line, title_chain = if_chain("getNewTitle", "newTitle")
title_exp = {}
tmpprevious = None
for tmpthreshold, tmptitle in title_chain:
    title_exp[tmptitle] = 0 if tmpprevious is None else tmpprevious
    tmpprevious = tmpthreshold
# His first title branch is `newTotalExp<0 -> "0"`, so title 0 begins below zero, not at it.
title_exp[0] = -1500

cap_line, exp_cap, cap_dupes = numeric_switch("getExpCapByExistingTitle", "tempExpCap")
by_goal_line, exp_by_goal, by_goal_dupes = numeric_switch("getExpByGoal", "tempExp")
next_line, next_chain = if_chain("getNextGoalExp", "newGoalExp")
points_line, skill_points = string_case_switch("getSkillPointsByClass", "numSkillPoints")

# --------------------------------------------------------------------------------------
# Cross-check. Four functions describe one ladder; anything they disagree about is printed
# rather than silently resolved, because a disagreement is a defect in one of them.
print("advancement tables")
print("  getNewGoal   %4d goals  (line %d)" % (len(goal_exp), goal_line))
print("  getNewTitle  %4d titles (line %d)" % (len(title_exp), title_line))
print("  exp caps     %4d titles (line %d)" % (len(exp_cap), cap_line))
print("  skill points %4d classes (line %d)" % (len(skill_points), points_line))

if by_goal_dupes:
    print("  DEFECT getExpByGoal (line %d) writes these case labels twice: %s"
          % (by_goal_line, ", ".join(str(d) for d in by_goal_dupes)))
    print("         The second is unreachable, so those goals answer 0 on his sheet.")
    print("         UPSTREAM-ISSUES.md; the ladder below comes from getNewGoal instead.")

tmpmismatch = [g for g in sorted(goal_exp)
               if g in exp_by_goal and exp_by_goal[g] != goal_exp[g]]
tmpmissing = [g for g in sorted(goal_exp) if g not in exp_by_goal]
if tmpmismatch or tmpmissing:
    for g in tmpmismatch:
        print("  getExpByGoal disagrees at goal %d: it says %d, getNewGoal says %d"
              % (g, exp_by_goal[g], goal_exp[g]))
    for g in tmpmissing:
        print("  getExpByGoal has no case for goal %d (getNewGoal says %d)" % (g, goal_exp[g]))
else:
    print("  getExpByGoal agrees with getNewGoal at every goal")

# getNextGoalExp's branches are the same thresholds again: below X, the next goal is at X.
tmpnextthresholds = sorted(set(t for t, _ in next_chain))
tmpgoalstarts = sorted(set(e for e in goal_exp.values() if e > -1500))
# His topmost branch names the ceiling above the last goal (the deity line, commented out
# throughout), which is not a goal start and is not a disagreement.
tmpceiling = max(tmpnextthresholds)
tmpnextdisagree = [t for t in tmpnextthresholds
                   if t not in tmpgoalstarts and t > -1500 and t != tmpceiling]
if tmpnextdisagree:
    print("  getNextGoalExp (line %d) names thresholds no goal begins at: %s"
          % (next_line, ", ".join(str(t) for t in tmpnextdisagree)))
else:
    print("  getNextGoalExp agrees with the goal ladder")

# A title begins where its lowest goal begins -- the title/goal relation his getTitleByGoal
# states as title = (goal / 3) + 1. Checked rather than assumed, since everything reads it.
for tmptitle, tmpexp in sorted(title_exp.items()):
    if tmptitle < 1:
        continue
    tmplowgoal = (tmptitle * 3) - 3
    if goal_exp.get(tmplowgoal) != tmpexp:
        print("  title %d begins at %d but its low goal %d begins at %s"
              % (tmptitle, tmpexp, tmplowgoal, goal_exp.get(tmplowgoal)))

# --------------------------------------------------------------------------------------
out = []
out.append("// @START (CODE)")
out.append("// @MARKER ADVANCEMENT TABLES")
out.append("//" + "=" * 114)
out.append("// GENERATED FILE -- do not edit by hand.")
out.append("// Produced by tools/extract/extract_advancement_tables.py from the original Roll20 sheet-worker.")
out.append("// Regenerate rather than editing, or this will drift from his sheet.")
out.append("//" + "=" * 114)
out.append("")
out.append("// @MARKER THE GOAL LADDER")
out.append("// From getNewGoal (sheet-worker.js:%d). The experience each goal BEGINS at, so a" % goal_line)
out.append("// character's goal is the highest entry their experience reaches. Three goals make a title.")
out.append("// The three negative goals are his Zero Title -- Petitioner, Student and Apprentice.")
out.append("// Goal -3 has no floor in his code (anything below), so it is written at getExpByGoal's")
out.append("// own figure for it. Goal -2 begins at -999 because that is where getNewGoal puts it;")
out.append("// getExpByGoal says -1000, and the two are one point apart. UPSTREAM-ISSUES.md.")
out.append("//")
out.append("// Taken from getNewGoal rather than getExpByGoal because that switch writes `case 30:`")
out.append("// twice, where the second belongs to goal 40, leaving goal 40 answering 0 on his sheet.")
out.append("export const GOAL_EXP = {")
for tmpgoal in sorted(goal_exp):
    # Quoted, because a negative key is a syntax error written bare.
    out.append("\t\"%d\": %d," % (tmpgoal, goal_exp[tmpgoal]))
out.append("};")
out.append("")
out.append("// @MARKER THE TITLE LADDER")
out.append("// From getNewTitle (sheet-worker.js:%d). Title 1 is Mortal; 11 begins Arch Mortal." % title_line)
out.append("// His table stops at 15 -- \"if deities are allowed\" is commented out throughout.")
out.append("export const TITLE_EXP = {")
for tmptitle in sorted(title_exp):
    out.append("\t\"%d\": %d," % (tmptitle, title_exp[tmptitle]))
out.append("};")
out.append("")
out.append("// @MARKER THE EXPERIENCE CAP")
out.append("// From getExpCapByExistingTitle (sheet-worker.js:%d). Experience is refused above this" % cap_line)
out.append("// until the character levels up, so nobody banks more than about a title and a half")
out.append("// ahead. Titles 13, 14 and 15 share a cap: his sheet will not pass 15 (deities are off).")
out.append("export const EXP_CAP_BY_TITLE = {")
for tmptitle in sorted(exp_cap):
    out.append("\t\"%d\": %d," % (tmptitle, exp_cap[tmptitle]))
out.append("};")
out.append("")
out.append("// @MARKER SKILL POINTS PER GOAL")
out.append("// From getSkillPointsByClass (sheet-worker.js:%d). Every goal advance gives this many" % points_line)
out.append("// points, each worth +1%% on a class skill the character has already acquired. GME gets")
out.append("// none, having no class skills at all.")
out.append("export const SKILL_POINTS_BY_CLASS = {")
for tmpname in sorted(skill_points):
    out.append("\t\"%s\": %d," % (tmpname, skill_points[tmpname]))
out.append("};")
out.append("")
out.append("// @MARKER ADD NEW advancement tables HERE")
out.append("// @END (CODE)")
out.append("")

open(OUT, "w", encoding="utf-8", newline="\n").write("\n".join(out))
print("  wrote %s" % os.path.relpath(OUT, ROOT))
