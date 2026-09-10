#!/usr/bin/env python3
"""
parse_dictionaries.py -- extract the data dictionaries out of the Imagine Roll20
sheet-worker JavaScript into JSON.

Build-time tooling. Not shipped with the Foundry system.

The sheet-worker declares its game data as JS object literals of the form:

    const skilldict = {                    // purpose comment
    //                       0      1      2
    //  Name                 Attr1  Attr2  Rating
        "Abasement":       [ "AUR", "WIL", "18" ],
    };

Most entries are flat arrays of quoted strings, but not all of them: some
dictionaries mix in bare numbers and booleans, some nest arrays, and at least
one embeds a live function call (`[0-getDieRoll(4)]`) which is code, not data.

A regex would quietly mangle those. This uses a small tokenizer instead, so
anything that is not a literal is preserved as a flagged raw expression and
reported, rather than silently corrupted.

Usage:
    python parse_dictionaries.py --report
    python parse_dictionaries.py --dump <outdir> [--only name1,name2]
"""

import argparse
import json
import os
import re
import sys
from collections import Counter

SHEET_WORKER = os.path.join(
    os.path.dirname(os.path.abspath(__file__)),
    "..", "..", "docs", "reference", "sheet-worker.js"
)

# Declarations come in several forms. He mostly uses `const` for data
# dictionaries, but some are plain implicit-global assignments in his usual
# style (`classRequirementsAndDetails={`), so the keyword is optional.
DECL = re.compile(r'^(\s*)(?:const |var |let )?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*\{\s*(?://.*)?$')


class RawExpression(str):
    """A value that is not a JS literal -- source text preserved verbatim."""
    pass


def strip_line_comment(text):
    """Remove a trailing // comment, respecting quoted strings."""
    out = []
    quote = None
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            if ch == "\\":
                out.append(ch)
                if i + 1 < len(text):
                    i += 1
                    out.append(text[i])
            elif ch == quote:
                quote = None
                out.append(ch)
            else:
                out.append(ch)
        else:
            if ch in "\"'":
                quote = ch
                out.append(ch)
            elif ch == "/" and i + 1 < len(text) and text[i + 1] == "/":
                break
            else:
                out.append(ch)
        i += 1
    return "".join(out)


def tokenize_value(src, pos):
    """
    Read one value starting at src[pos]. Returns (value, newpos).

    Handles quoted strings, numbers, true/false/null, and nested arrays.
    Anything else is captured as a RawExpression up to the next top-level
    comma or closing bracket.
    """
    while pos < len(src) and src[pos] in " \t\r\n":
        pos += 1
    if pos >= len(src):
        return None, pos

    ch = src[pos]

    # quoted string
    if ch in "\"'":
        quote = ch
        pos += 1
        buf = []
        while pos < len(src):
            c = src[pos]
            if c == "\\" and pos + 1 < len(src):
                buf.append(src[pos + 1])
                pos += 2
                continue
            if c == quote:
                pos += 1
                break
            buf.append(c)
            pos += 1
        return "".join(buf), pos

    # nested array
    if ch == "[":
        pos += 1
        items = []
        while pos < len(src):
            while pos < len(src) and src[pos] in " \t\r\n":
                pos += 1
            if pos < len(src) and src[pos] == "]":
                pos += 1
                break
            val, pos = tokenize_value(src, pos)
            items.append(val)
            while pos < len(src) and src[pos] in " \t\r\n":
                pos += 1
            if pos < len(src) and src[pos] == ",":
                pos += 1
        return items, pos

    # bare token: number, boolean, null, or an expression
    start = pos
    depth = 0
    while pos < len(src):
        c = src[pos]
        if c in "([{":
            depth += 1
        elif c in ")]}":
            if depth == 0:
                break
            depth -= 1
        elif c == "," and depth == 0:
            break
        pos += 1
    token = src[start:pos].strip()

    if token in ("true", "false"):
        return token == "true", pos
    if token == "null":
        return None, pos
    try:
        if re.fullmatch(r'-?\d+', token):
            return int(token), pos
        if re.fullmatch(r'-?\d*\.\d+', token):
            return float(token), pos
    except ValueError:
        pass
    return RawExpression(token), pos


def find_dictionaries(lines):
    """Locate each `const X = {` block and its extent by brace matching."""
    found = []
    for i, line in enumerate(lines):
        m = DECL.match(line)
        if not m:
            continue
        name = m.group(2)
        depth = 0
        started = False
        end = i
        for j in range(i, len(lines)):
            code = strip_line_comment(lines[j])
            for ch in code:
                if ch == "{":
                    depth += 1
                    started = True
                elif ch == "}":
                    depth -= 1
            if started and depth <= 0:
                end = j
                break
        found.append({"name": name, "start": i + 1, "end": end + 1})
    return found


ENTRY_START = re.compile(r'^\s*"((?:[^"\\]|\\.)*)"\s*:\s*')


def parse_dictionary(lines, start, end):
    """Parse entries from a dictionary body. Returns (entries, problems)."""
    entries = {}
    problems = []
    for idx in range(start, end - 1):
        raw = lines[idx]
        code = strip_line_comment(raw).rstrip()
        m = ENTRY_START.match(code)
        if not m:
            continue
        key = m.group(1)
        rest = code[m.end():].strip()
        if not rest:
            continue
        value, _ = tokenize_value(rest, 0)
        entries[key] = value
        if contains_raw(value):
            problems.append({"line": idx + 1, "key": key,
                             "raw": [str(r) for r in collect_raw(value)]})
    return entries, problems


def contains_raw(value):
    if isinstance(value, RawExpression):
        return True
    if isinstance(value, list):
        return any(contains_raw(v) for v in value)
    return False


def collect_raw(value, out=None):
    if out is None:
        out = []
    if isinstance(value, RawExpression):
        out.append(value)
    elif isinstance(value, list):
        for v in value:
            collect_raw(v, out)
    return out


def json_safe(value):
    """RawExpression -> tagged object so it survives JSON without pretending to be data."""
    if isinstance(value, RawExpression):
        return {"__expr__": str(value)}
    if isinstance(value, list):
        return [json_safe(v) for v in value]
    return value


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true", help="print a survey of every dictionary")
    ap.add_argument("--dump", metavar="OUTDIR", help="write each dictionary to OUTDIR as JSON")
    ap.add_argument("--only", help="comma-separated dictionary names to include")
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding="utf-8")

    with open(SHEET_WORKER, encoding="utf-8", errors="replace") as fh:
        lines = fh.readlines()

    wanted = set(args.only.split(",")) if args.only else None
    dicts = find_dictionaries(lines)

    total_entries = 0
    total_problems = 0
    rows = []

    for d in dicts:
        if wanted and d["name"] not in wanted:
            continue
        entries, problems = parse_dictionary(lines, d["start"], d["end"])
        if not entries:
            continue
        widths = Counter(len(v) if isinstance(v, list) else 1 for v in entries.values())
        rows.append({
            "name": d["name"],
            "start": d["start"],
            "end": d["end"],
            "count": len(entries),
            "widths": widths,
            "problems": problems,
            "entries": entries,
        })
        total_entries += len(entries)
        total_problems += len(problems)

    if args.report:
        print(f"{'dictionary':30} {'lines':>16} {'entries':>8}  columns")
        print("-" * 78)
        for r in rows:
            w = ", ".join(f"{k}x{v}" for k, v in sorted(r["widths"].items()))
            flag = "  <-- %d non-literal" % len(r["problems"]) if r["problems"] else ""
            print(f'{r["name"]:30} {r["start"]:7}-{r["end"]:<8} {r["count"]:8}  {w}{flag}')
        print("-" * 78)
        print(f"{len(rows)} dictionaries, {total_entries} entries, {total_problems} entries with non-literal values")
        if total_problems:
            print("\nNon-literal values (these are code, not data -- handle manually):")
            for r in rows:
                for p in r["problems"][:3]:
                    print(f'  {r["name"]}:{p["line"]} "{p["key"]}" -> {p["raw"][:3]}')

    if args.dump:
        os.makedirs(args.dump, exist_ok=True)
        # Several dictionary names occur twice -- the character sheet and the
        # creature sheet each declare their own abilitylist/disabilitylist/
        # immunitylist. Suffix the repeats with their start line so the second
        # declaration does not overwrite the first.
        seen = Counter(r["name"] for r in rows)
        used = Counter()
        for r in rows:
            filename = r["name"]
            if seen[filename] > 1:
                used[filename] += 1
                filename = "%s@%d" % (r["name"], r["start"])
            path = os.path.join(args.dump, filename + ".json")
            payload = {
                "_source": {
                    "file": "docs/reference/sheet-worker.js",
                    "dictionary": r["name"],
                    "lines": [r["start"], r["end"]],
                },
                "entries": {k: json_safe(v) for k, v in r["entries"].items()},
            }
            with open(path, "w", encoding="utf-8") as fh:
                json.dump(payload, fh, indent=2, ensure_ascii=False)
        print(f"wrote {len(rows)} files to {args.dump}")


if __name__ == "__main__":
    main()
