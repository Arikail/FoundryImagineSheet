#!/usr/bin/env python3
"""
generate_config_tables.py -- emit module/config-tables.mjs from the extracted
attribute tables.

Build-time tooling. Not shipped with the Foundry system.

The twelve attribute tables are irregular lookup data, not formulas -- Strength
damage runs -6,-5,-4,-3,-2,-1,0,0,0,0,+1..+6 and load limit runs
.05,.1,.2,.4,.6,.8,1.0,1.1..2.0. Nothing computes those, so they have to be
carried as data.

They are generated rather than hand-written for two reasons: 372 rows is too
many to transcribe without error, and generating keeps them tied to
src/packs/named/ so they cannot silently drift from his sheet.

Regenerate with:
    python generate_config_tables.py
"""

import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
NAMED = os.path.join(HERE, "..", "..", "src", "packs", "named")
OUT = os.path.join(HERE, "..", "..", "module", "config-tables.mjs")

ATTRS = ["str", "agl", "vit", "int", "wis", "knw",
         "app", "chm", "soc", "aur", "pty", "wil"]

HEADER = '''// @START (CODE)
// @MARKER ATTRIBUTE LOOKUP TABLES
//==================================================================================================================
// GENERATED FILE -- do not edit by hand.
// Produced by tools/extract/generate_config_tables.py from src/packs/named/, which is in turn
// extracted from the attribute tables in the original Roll20 sheet-worker (changeAttribs).
// Regenerate rather than editing, or this will drift from his sheet.
//
// Each table is keyed by attribute rating 0-30 and holds that rating's derived modifiers.
// These are irregular lookup values, not formulas -- there is no expression that reproduces
// them, which is why they are carried as data.
//==================================================================================================================

'''

FOOTER = '''
// @END (CODE)
'''


def main():
    tables = {}
    for attr in ATTRS:
        path = os.path.join(NAMED, "%sRatingValues.json" % attr)
        with open(path, encoding="utf-8") as fh:
            payload = json.load(fh)
        tables[attr] = {
            "fields": payload["_fields"],
            "entries": payload["entries"],
        }

    lines = [HEADER]
    lines.append("export const ATTRIBUTE_TABLES = {\n")

    for attr in ATTRS:
        t = tables[attr]
        fieldlist = ", ".join(t["fields"])
        lines.append("\n\t// %s -- columns: %s\n" % (attr.upper(), fieldlist))
        lines.append("\t%s: {\n" % attr)
        for rating in sorted(t["entries"], key=lambda k: int(k)):
            row = t["entries"][rating]
            pairs = ", ".join(
                "%s: %s" % (k, json.dumps(v, ensure_ascii=False))
                for k, v in row.items()
            )
            lines.append("\t\t%s: { %s },\n" % (rating, pairs))
        lines.append("\t},\n")

    lines.append("};\n")
    lines.append(FOOTER)

    with open(OUT, "w", encoding="utf-8") as fh:
        fh.write("".join(lines))

    total = sum(len(t["entries"]) for t in tables.values())
    print("wrote %s (%d tables, %d rows)" % (os.path.relpath(OUT, HERE), len(tables), total))


if __name__ == "__main__":
    main()
