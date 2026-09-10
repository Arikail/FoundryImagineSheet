# Foundry Imagine Sheet

A conversion of the **Imagine Role Playing System™** (role-playing.com) from its Roll20 custom character sheet into a full Foundry Virtual Tabletop game system, built with permission from the rights holder.

## Status

Early scaffolding — no system code yet. Current work is source-material analysis and architecture planning. See [`docs/PROGRESS.md`](docs/PROGRESS.md) for the live task board and [`docs/DECISIONS.md`](docs/DECISIONS.md) for the architectural decision log.

## Target platform

Foundry VTT **V14+**. No legacy/back-compat support — built exclusively on current APIs (ApplicationV2, current DataModel/ActiveEffect APIs).

## Repo layout

- `ImagineRoll20CharacterSheet-main/` — the original Roll20 sheet export (source material for the conversion; HTML/CSS/JSON, no system code of its own)
- `docs/DECISIONS.md` — append-only log of architectural and scope decisions, with rationale
- `docs/PROGRESS.md` — agile-style board (epics/stories/status) tracking the build
- `docs/reference/` — extracted rulebook text (Player's Guide, Master's Manual) and Foundry V14 platform research, used as the source of truth for game mechanics
- `CLAUDE.md` — project context and working protocol for AI-assisted development sessions

## Source of truth

When the original Roll20 sheet and the rulebooks disagree on a mechanic, the Roll20 sheet wins — it reflects what the table actually plays with.

## Scope

Building "core first": Attributes, Races & Classes, Skills, Character Generation, Combat, Equipment, and the Character/Creature actor types. The game's 20+ magic and crafting subsystems (runes, potions, bardic magic, and others) are a later phase, designed from the start to be individually toggleable per campaign, with a master off-switch.
