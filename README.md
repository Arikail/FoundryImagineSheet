# Foundry Imagine Sheet

A conversion of the **Imagine Role Playing System™** (role-playing.com) from its Roll20 custom character sheet into a full Foundry Virtual Tabletop game system, built with permission from the rights holder.

## Status

**In build.** Corrected 2026-09-19; this section had said "early scaffolding — no system code yet"
since before any of it was written.

Working today: the character and creature actors with their derived values and sheets, a runtime
content importer building nine compendia from **4,384 generated documents** (skills, weapons,
armour, equipment, races, classes and the three trait packs), the content availability switches,
combat phase 1 (attack charts, damage, armour, body areas, wounds, the ten-second round), a
step-by-step character generator, and experience and levelling with its Level Up window.

Not built: the magic and crafting subsystems (Layer 4), and the parts of combat phase 2 the board
still lists. **Nothing has yet run in a Foundry V14 install** — every "not verified" note on the
board reduces to that one sentence.

See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the live board and
[`docs/DECISIONS.md`](docs/DECISIONS.md) for the decision log.

## Target platform

Foundry VTT **V14+**. No legacy/back-compat support — built exclusively on current APIs (ApplicationV2, current DataModel/ActiveEffect APIs).

## Repo layout

- `module/` — the system's JavaScript: data models (`data/`), sheets (`sheets/`), windows (`apps/`), combat (`combat/`), and the rules modules each of those reads
- `templates/`, `styles/`, `lang/` — Handlebars templates, the stylesheet, and the strings Foundry itself asks for
- `src/packs/` — content, in three stages: `raw/` (his dictionaries as parsed), `named/` (columns given names), `documents/` (Foundry documents, built from those), plus `manual/` for hand-authored entries
- `tools/extract/` — the build-time extraction: parsers, column maps and document builders. Not shipped with the system
- `tools/*.html` — browser test suites and previews. They stub Foundry, so they run over any static server; see the test routine at the foot of `docs/PROGRESS.md`
- `ImagineRoll20CharacterSheet-main/` — the original Roll20 sheet export, the source material
- `docs/DECISIONS.md` — append-only log of architectural and scope decisions, with rationale
- `docs/PROGRESS.md` — agile-style board (epics/stories/status) tracking the build
- `docs/ADDING-CONTENT.md` — **how to add races, classes, skills, gear and the rest**, either in Foundry or in the content files, with no code change
- `docs/DATA-MODEL.md` — the schemas, and what is stored against what is derived
- `docs/UPSTREAM-ISSUES.md` — defects and questions raised with the original developer, with his answers where they have come
- `docs/reference/` — extracted rulebook text and platform research (the book text is deliberately not committed; regenerate it locally)
- `docs/sonnet/` — hand-off notes: what each work pass deliberately left for a cheaper session
- `CLAUDE.md` — project context and working protocol for AI-assisted development sessions

## Source of truth

When the original Roll20 sheet and the rulebooks disagree on a mechanic, the Roll20 sheet wins — it reflects what the table actually plays with.

## Scope

Building "core first": Attributes, Races & Classes, Skills, Character Generation, Combat, Equipment, and the Character/Creature actor types. The game's 20+ magic and crafting subsystems (runes, potions, bardic magic, and others) are a later phase, designed from the start to be individually toggleable per campaign, with a master off-switch.
