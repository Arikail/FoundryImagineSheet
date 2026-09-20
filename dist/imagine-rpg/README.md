# Imagine Role Playing System — Foundry VTT system

Version 0.1.0. A conversion of the Imagine Role Playing System from its Roll20 character sheet,
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
