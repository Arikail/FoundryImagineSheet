#!/usr/bin/env python3
"""
derive_column_maps.py -- work out what each positional column of a data
dictionary means, by reading how the sheet-worker code consumes it.

Build-time tooling. Not shipped with the Foundry system.

The dictionaries store rows as positional arrays. Some carry a column-header
comment, but several of the important ones do not -- raceStatsAndMoveDetails
has 62 unlabelled columns. Rather than transcribe those by hand (and get one
wrong somewhere in the middle), this reads his own code, which effectively
documents the layout every time it does:

    setAttrs({str_race_mod: tempRaceDetails[0]});
    setAttrs({agl_race_mod: tempRaceDetails[1]});

Usage:
    python derive_column_maps.py --var tempRaceDetails
    python derive_column_maps.py --list
"""

import argparse
import os
import re
import sys
from collections import defaultdict

SHEET_WORKER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "docs", "reference", "sheet-worker.js"
)

# setAttrs({some_field: someVar[12]});  -- the common self-documenting form
SETATTR = re.compile(
    r'setAttrs\(\s*\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*:\s*([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]'
)
# tmpFoo = someVar[3];  -- assignment form, a weaker but still useful signal
ASSIGN = re.compile(
    r'^\s*(?:var\s+|let\s+|const\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(?:parseInt|parseFloat)?\(?\(?\s*'
    r'([A-Za-z_][A-Za-z0-9_]*)\s*\[\s*(\d+)\s*\]'
)


def scan(lines):
    """Return {varname: {index: [(field, line, kind), ...]}}"""
    found = defaultdict(lambda: defaultdict(list))
    for i, line in enumerate(lines):
        for m in SETATTR.finditer(line):
            field, var, idx = m.group(1), m.group(2), int(m.group(3))
            found[var][idx].append((field, i + 1, "setAttrs"))
        m = ASSIGN.match(line)
        if m:
            field, var, idx = m.group(1), m.group(2), int(m.group(3))
            found[var][idx].append((field, i + 1, "assign"))
    return found


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--var", help="variable name holding a dictionary row")
    ap.add_argument("--list", action="store_true", help="list candidate row variables")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")
    with open(SHEET_WORKER, encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()

    found = scan(lines)

    if args.list:
        ranked = sorted(found.items(), key=lambda kv: -len(kv[1]))
        print(f"{'row variable':36} {'distinct indices':>16}")
        print("-" * 56)
        for var, idxmap in ranked[:40]:
            if len(idxmap) < 3:
                continue
            print(f"{var:36} {len(idxmap):16}")
        return

    if not args.var:
        ap.error("give --var NAME or --list")

    idxmap = found.get(args.var)
    if not idxmap:
        print(f"no indexed reads found for {args.var}")
        return

    print(f"column map derived for {args.var} ({len(idxmap)} distinct indices)")
    print(f"{'idx':>4}  {'field name(s) it is written to':50} source")
    print("-" * 90)
    for idx in sorted(idxmap):
        uses = idxmap[idx]
        names = []
        for field, ln, kind in uses:
            if field not in names:
                names.append(field)
        primary = names[0]
        extra = ("  (also: %s)" % ", ".join(names[1:])) if len(names) > 1 else ""
        print(f"{idx:>4}  {primary:50} line {uses[0][1]}{extra}")


if __name__ == "__main__":
    main()
