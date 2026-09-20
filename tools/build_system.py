#!/usr/bin/env python3
"""
build_system.py -- assemble the installable Foundry system into dist/imagine-rpg/.

Build-time tooling. Not shipped with the system (it builds the thing that is).

WHAT SHIPS AND WHAT DOES NOT. A Foundry system is a folder under Data/systems/ named after the
system's id. It needs the manifest, the code, the templates, the stylesheet, the language files and
-- for this system -- the generated content documents, which the importer fetches at runtime rather
than being compiled into packs ahead of time.

Everything else in this repository is how the system was BUILT, not part of it: the extraction
tooling, the raw and named intermediate data, the browser test suites and previews, the original
Roll20 export, and the project's own documentation. None of that belongs in a game's Data folder.

    shipped                             not shipped
    system.json                         tools/
    module/**.mjs                       src/packs/raw/, named/, manual/
    templates/**.hbs                    ImagineRoll20CharacterSheet-main/
    styles/*.css                        docs/ (except FIRST-RUN.md, which is for whoever installs it)
    lang/*.json                         CLAUDE.md, .claude/, .git/
    src/packs/documents/*.json

THE CHECK IS THE POINT. Copying files is easy to get right by accident and wrong by accident. So
after assembling, this reads every `systems/imagine-rpg/...` path the shipped code and templates
mention, plus every file the manifest names, and proves each one is present in the output. A
template referenced but not copied would otherwise show up as an empty sheet in someone's game.

Usage:
    python tools/build_system.py
    python tools/build_system.py --zip
"""

import argparse
import datetime
import json
import os
import re
import shutil
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, ".."))
DIST = os.path.join(ROOT, "dist")
SYSTEM_ID = "imagine-rpg"
OUT = os.path.join(DIST, SYSTEM_ID)

# What goes in, as (source, destination) directory pairs and single files.
SHIPPED_DIRS = [
    ("module", "module"),
    ("templates", "templates"),
    ("styles", "styles"),
    ("lang", "lang"),
    (os.path.join("src", "packs", "documents"), os.path.join("src", "packs", "documents")),
]
SHIPPED_FILES = [
    ("system.json", "system.json"),
    (os.path.join("docs", "FIRST-RUN.md"), "FIRST-RUN.md"),
]

problems = []

INSTALL_NOTE = """# Imagine Role Playing System — Foundry VTT system

Version {version}. A conversion of the Imagine Role Playing System from its Roll20 character sheet,
built with permission from the rights holder. Foundry VTT **V14** or later.

## Installing

This folder IS the system. Put it in your Foundry data folder, under `Data/systems/`, so that the
path reads:

    Data/systems/imagine-rpg/system.json

Then restart Foundry. The system appears in the Game Systems list and can be chosen when creating a
world. (If you have the zip, unpack it so its contents land directly in a folder of that name —
the archive has no top-level folder of its own.)

## First launch

The system ships its content as JSON and builds the compendium packs when you first use it, rather
than shipping pre-built packs. On the first launch of a new world it offers to do that; accept, and
it creates nine compendia holding 4,384 entries — skills, weapons, armour, equipment, races,
classes, and the ability, disability and immunity lists.

If you decline, or want to rebuild them later after updating the system, run this in the console as
the Game Master:

    game.imagine.importContent()

It matches documents by name and updates them in place, so anything already dragged onto a character
keeps pointing at the same document.

## Before you trust it

**This system has never been run in Foundry.** `FIRST-RUN.md`, beside this file, lists what was
checked against the V14 API ahead of time, what could not be, and a ten-step smoke test in the order
things are likely to break. Step 5 is the one that matters most.

## What is not here

Everything that built this: the extraction tooling, the intermediate data, the test suites, the
original Roll20 export and the project documentation. Those live in the project repository; this
folder is only what a game needs.
"""


def copy_tree(tmpsource, tmpdest, tmpsuffixes):
    """Copy a directory, keeping only the file types that belong in a system."""
    tmpcount = 0
    for tmpdir, _, tmpfiles in os.walk(tmpsource):
        for tmpfile in tmpfiles:
            if tmpsuffixes and not tmpfile.endswith(tuple(tmpsuffixes)):
                continue
            tmpfrom = os.path.join(tmpdir, tmpfile)
            tmpto = os.path.join(tmpdest, os.path.relpath(tmpfrom, tmpsource))
            os.makedirs(os.path.dirname(tmpto), exist_ok=True)
            shutil.copy2(tmpfrom, tmpto)
            tmpcount += 1
    return tmpcount


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", action="store_true", help="also write dist/imagine-rpg.zip")
    args = ap.parse_args()
    sys.stdout.reconfigure(encoding="utf-8")

    # A clean build every time: a file deleted from the repository must not survive in the output.
    if os.path.exists(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)

    print("building %s" % os.path.relpath(OUT, ROOT))
    tmptotal = 0
    for tmpsource, tmpdest in SHIPPED_DIRS:
        tmpsuffixes = {"module": [".mjs"], "templates": [".hbs"], "styles": [".css"],
                       "lang": [".json"]}.get(tmpsource, [".json"])
        tmpcount = copy_tree(os.path.join(ROOT, tmpsource), os.path.join(OUT, tmpdest), tmpsuffixes)
        print("  %-28s %4d files" % (tmpsource + "/", tmpcount))
        tmptotal += tmpcount
    for tmpsource, tmpdest in SHIPPED_FILES:
        tmpfrom = os.path.join(ROOT, tmpsource)
        if not os.path.exists(tmpfrom):
            problems.append("%s is named to ship and does not exist" % tmpsource)
            continue
        shutil.copy2(tmpfrom, os.path.join(OUT, tmpdest))
        print("  %-28s    1 file" % tmpsource)
        tmptotal += 1

    # A short note for whoever installs it, written here rather than kept as a file so it cannot
    # fall out of step with what the build actually contains.
    with open(os.path.join(OUT, "README.md"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write(INSTALL_NOTE.format(version=json.load(open(os.path.join(ROOT, "system.json"),
                                                            encoding="utf-8"))["version"]))

    # A stamp, so "is this build current?" is answerable by looking rather than by guessing. The
    # commit it was built from is the useful part: a deliverable is easy to hand over and forget,
    # and a stale one is worse than none.
    tmpcommit = ""
    try:
        import subprocess
        tmpcommit = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT,
                                   capture_output=True, text=True).stdout.strip()
    except Exception:
        pass

    # ---------------------------------------------------------------------------------
    # @MARKER THE CHECK
    # Everything the shipped code asks Foundry to load, proved present in the output.
    with open(os.path.join(OUT, "system.json"), encoding="utf-8") as fh:
        tmpmanifest = json.load(fh)

    tmpwanted = set()
    for tmpkey in ("esmodules", "styles"):
        tmpwanted.update(tmpmanifest.get(tmpkey, []))
    for tmplanguage in tmpmanifest.get("languages", []):
        tmpwanted.add(tmplanguage["path"])

    # Every "systems/imagine-rpg/..." path written in the shipped code or templates.
    tmpreferenced = set()
    for tmpdir, _, tmpfiles in os.walk(OUT):
        for tmpfile in tmpfiles:
            if not tmpfile.endswith((".mjs", ".hbs")):
                continue
            with open(os.path.join(tmpdir, tmpfile), encoding="utf-8", errors="replace") as fh:
                for tmppath in re.findall(r'systems/%s/([A-Za-z0-9/._-]+)' % SYSTEM_ID, fh.read()):
                    tmpreferenced.add(tmppath)

    for tmppath in sorted(tmpwanted | tmpreferenced):
        tmpfull = os.path.join(OUT, tmppath.replace("/", os.sep))
        # A reference to a directory (the importer fetches documents by name from one) counts as
        # met when the directory is there and has something in it.
        if os.path.isdir(tmpfull):
            if not os.listdir(tmpfull):
                problems.append("%s is referenced and is empty" % tmppath)
            continue
        if not os.path.exists(tmpfull):
            problems.append("%s is referenced by the code and is NOT in the build" % tmppath)

    # The content the importer will build its packs from.
    tmpdocs = os.path.join(OUT, "src", "packs", "documents")
    tmpcounts = {}
    for tmpfile in sorted(os.listdir(tmpdocs)) if os.path.isdir(tmpdocs) else []:
        with open(os.path.join(tmpdocs, tmpfile), encoding="utf-8") as fh:
            tmpcounts[tmpfile[:-5]] = len(json.load(fh))

    # Nothing that belongs to the workshop rather than the game.
    for tmpdir, _, tmpfiles in os.walk(OUT):
        for tmpfile in tmpfiles:
            if tmpfile.endswith((".py", ".pyc")) or tmpfile in ("CLAUDE.md",):
                problems.append("%s should not ship" % os.path.relpath(os.path.join(tmpdir, tmpfile), OUT))

    tmpbytes = sum(os.path.getsize(os.path.join(tmpdir, tmpfile))
                   for tmpdir, _, tmpfiles in os.walk(OUT) for tmpfile in tmpfiles)

    print()
    print("  %d files, %.1f MB" % (tmptotal, tmpbytes / 1024 / 1024))
    print("  content: %s" % ", ".join("%s %d" % (k, v) for k, v in tmpcounts.items()))
    print("  total documents: %d" % sum(tmpcounts.values()))
    print("  every referenced path checked: %d" % len(tmpwanted | tmpreferenced))

    if problems:
        print("\n  %d PROBLEM(S):" % len(problems))
        for tmpproblem in problems:
            print("    " + tmpproblem)
        raise SystemExit(1)
    print("  no problems")

    tmpstamp = [
        "Imagine RPG system build",
        "version   %s" % tmpmanifest["version"],
        "built     %s" % datetime.date.today().isoformat(),
        "commit    %s" % (tmpcommit or "unknown"),
        "files     %d" % tmptotal,
        "documents %d (%s)" % (sum(tmpcounts.values()),
                               ", ".join("%s %d" % (k, v) for k, v in tmpcounts.items())),
        "",
        "Rebuild with:  python tools/build_system.py --zip",
        "If the commit above is not the current HEAD, this build is stale.",
        "",
    ]
    with open(os.path.join(OUT, "BUILD.txt"), "w", encoding="utf-8", newline="\n") as fh:
        fh.write("\n".join(tmpstamp))

    if args.zip:
        tmpzip = os.path.join(DIST, SYSTEM_ID + ".zip")
        with zipfile.ZipFile(tmpzip, "w", zipfile.ZIP_DEFLATED) as fh:
            for tmpdir, _, tmpfiles in os.walk(OUT):
                for tmpfile in tmpfiles:
                    tmpfull = os.path.join(tmpdir, tmpfile)
                    # Zipped WITHOUT the top folder, which is how Foundry's manual install expects
                    # it: the archive's contents go straight into Data/systems/imagine-rpg/.
                    fh.write(tmpfull, os.path.relpath(tmpfull, OUT))
        print("  wrote %s (%.1f MB)" % (os.path.relpath(tmpzip, ROOT),
                                        os.path.getsize(tmpzip) / 1024 / 1024))


if __name__ == "__main__":
    main()
