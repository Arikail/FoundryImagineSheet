#!/usr/bin/env python3
"""
map_columns.py -- turn the raw positional-array extraction into named fields.

Build-time tooling. Not shipped with the Foundry system.

Reads src/packs/raw/<dict>.json (produced by parse_dictionaries.py), applies
the column names in column_maps.py, and writes src/packs/named/<dict>.json.

Width mismatches are treated as errors, not warnings. A map that is one column
short does not fail loudly on its own -- it silently shifts every field after
the gap, and that kind of error surfaces much later as wrong game numbers.
Rows whose length differs from the map are reported and left unmapped.

Usage:
    python map_columns.py --check
    python map_columns.py --write
"""

import argparse
import json
import os
import sys
from collections import Counter

import column_maps

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "..", "..", "src", "packs", "raw")
OUT = os.path.join(HERE, "..", "..", "src", "packs", "named")


def load_raw(name):
    path = os.path.join(RAW, name + ".json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def map_dictionary(name, fields, payload):
    """Returns (mapped, issues, widths, repaired). Rows of unexpected width are not mapped.

    A map given as "LIST:<key>" means the row is a variable-length list rather
    than fixed columns, and is stored whole under that key.

    A row listed in column_maps.ROW_REPAIRS is repaired first, on his confirmation rather than
    on our reading, and reported. Without that, a short row is simply dropped.
    """
    mapped = {}
    issues = []
    widths = Counter()
    repaired = []

    as_list = isinstance(fields, str) and fields.startswith("LIST:")
    list_key = fields.split(":", 1)[1] if as_list else None

    for key, row in payload["entries"].items():
        if not isinstance(row, list):
            row = [row]

        # A row he has confirmed a repair for. Without this the row is simply the wrong width
        # and gets dropped, which is what happened to Monk until he confirmed the fix.
        tmprepair = column_maps.ROW_REPAIRS.get((name, key))
        if tmprepair and len(row) == tmprepair[0]:
            row = row[:tmprepair[1]] + [""] + row[tmprepair[1]:]
            repaired.append((key, tmprepair[2]))

        widths[len(row)] += 1
        if as_list:
            mapped[key] = {list_key: row}
            continue
        if len(row) != len(fields):
            issues.append({"key": key, "got": len(row), "expected": len(fields)})
            continue
        mapped[key] = dict(zip(fields, row))

    return mapped, issues, widths, repaired


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true", help="validate maps against the data")
    ap.add_argument("--write", action="store_true", help="write named JSON output")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    if args.write:
        os.makedirs(OUT, exist_ok=True)

    ok = 0
    bad = 0
    print(f"{'dictionary':32} {'rows':>6} {'cols':>5}  status")
    print("-" * 72)

    for name, fields in column_maps.MAPS.items():
        payload = load_raw(name)
        if payload is None:
            print(f"{name:32} {'-':>6} {'-':>5}  RAW FILE MISSING")
            bad += 1
            continue

        mapped, issues, widths, repaired = map_dictionary(name, fields, payload)
        total = len(payload["entries"])

        for key, why in repaired:
            print(f"{name:32} {'':6} {'':5}  REPAIRED \"{key}\" on his confirmation")
            print(f"{'':32} {'':6} {'':5}    {why}")

        if not issues:
            print(f"{name:32} {total:6} {len(fields) if not isinstance(fields,str) else 'list':>5}  ok")
            ok += 1
        else:
            actual = ", ".join(f"{w}x{c}" for w, c in sorted(widths.items()))
            print(f"{name:32} {total:6} {len(fields):5}  {len(issues)} ROW(S) MISMATCHED "
                  f"(map expects {len(fields)}; data has {actual})")
            for i in issues[:2]:
                print(f"{'':32} {'':6} {'':5}    e.g. \"{i['key']}\" has {i['got']}")
            bad += 1

        if args.write and mapped:
            out_path = os.path.join(OUT, name + ".json")
            with open(out_path, "w", encoding="utf-8") as fh:
                json.dump({
                    "_source": payload["_source"],
                    "_fields": fields,
                    "entries": mapped,
                }, fh, indent=2, ensure_ascii=False)

    print("-" * 72)
    print(f"{ok} clean, {bad} with problems")


if __name__ == "__main__":
    main()
