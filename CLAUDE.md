# Imagine RPG → Foundry VTT Conversion

Converting the **Imagine Role Playing System™** from its Roll20 custom character sheet into a full Foundry VTT V14 game system, with the rights holder's permission for public release.

## Source material

- `ImagineRoll20CharacterSheet-main/` — the original Roll20 sheet export (HTML/CSS/sheet.json). Logic-less: no JavaScript/sheet-workers, all computation was manual or never implemented. Two actor types (Character, Creature), 10 tabs, 20+ repeating item types for magic/crafting subsystems.
- `docs/reference/players-guide-fulltext.txt` — OCR text of the base rulebook (368 pages: Attributes, Races, Characters, Classes, Skills, Combat, Equipment, Magic, Divine Magic, Appendix).
- `docs/reference/masters-manual-fulltext.txt` — OCR text of the GM-facing expansion book (319 pages: extended attribute ranges, class extensions, expanded combat, equipment costs, magic item design, new spells/invocations, world-building). Not a base-rules source — defers to the Player's Guide 82+ times.
- More source books (Bestiary, per-subsystem magic books) will arrive later, only as needed for their corresponding phase. See `docs/PROGRESS.md` Epic 0 for what's still outstanding.

**Source of truth rule:** when the Roll20 sheet and a rulebook disagree, the Roll20 sheet wins — it reflects what the table actually plays with.

## Target platform

Foundry VTT **V14** (current stable line). Sheet UI is redesigned for Foundry's native conventions, not a clone of the Roll20 sheet's layout.

## Architecture

**Layer 0 — Foundation** (must be solid before anything else is built on it):
- Roll Engine: attribute-save resolver, skill-check resolver, combat resolver
- Actor data model (Character, Creature)
- Content/compendium layer: sourcebook-tagged, enable/disable at sourcebook or individual-entry level, supports custom/homebrew entries with no code changes

**Layer 1 — Character foundation:** Attributes, Races & Classes (compendium-driven), Skills

**Layer 2 — Assembly & play:** Character Generation, Combat, Equipment (compendium-driven)

**Layer 3 — Actor variant:** Creature/NPC (blocked on Bestiary source material)

**Layer 4 — Deferred:** base Magic (Aura) and Divine Magic (Piety), plus 20+ individually-toggleable magic/crafting subsystems (runes, potions, elixirs, charms, poisons, bardic magic, empathy magic, glyphs, rituals, sympathy magic, etc.) with a master "all magic off" switch. Not started until the core phase (Layers 0-3) is complete.

Full rationale for every one of these calls is in `docs/DECISIONS.md`. Full task-level status is in `docs/PROGRESS.md`.

## Working protocol

**Agile board + self-check loop.** Work is tracked in `docs/PROGRESS.md` as epics/stories with a Definition of Done per story. At the end of every work loop, before marking a story Done, run the Self-Check Checklist at the bottom of `docs/PROGRESS.md`: verify against `docs/reference/` (cite the page), verify no conflict with the Roll20 sheet (sheet wins), confirm the DoD is actually met, update the board, log any new architectural call in `docs/DECISIONS.md`, commit.

**Model choice for heavy work.** Before starting real implementation (non-trivial rules encoding, architecture-locking decisions, substantive system code — as opposed to planning, research, or light scaffolding), stop and ask the user whether to proceed on Opus or Fable rather than defaulting to whatever model is currently active.

**Match the original developer's code style.** This project will be handed back to W. Michael Tenery III, who needs to pick it up without decoding an unfamiliar style. Study `docs/reference/sheet-worker.js` (~180k lines of his actual code) before writing anything, and follow his conventions: naming patterns (`tmp*`/`temp*` prefixes), `// @MARKER` comment markers, heavily-commented code, data dictionaries laid out with aligned column-header comments. This overrides default modern-JS idiom and the usual minimal-comments habit.

**The Roll20 sheet is the rules source of truth, always.** `sheet-worker.js` and the sheet markup outrank the PDFs. The rulebooks are supplementary — consulted for prose, rationale, and gaps, never to override the sheet.

**Continuity across sessions.** This file, plus `docs/DECISIONS.md` and `docs/PROGRESS.md`, are the durable record. A new conversation window should read all three before doing anything else — don't re-derive architecture from scratch or re-extract PDFs that are already in `docs/reference/`.
