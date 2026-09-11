# Imagine RPG → Foundry VTT Conversion

Converting the **Imagine Role Playing System™** from its Roll20 custom character sheet into a full Foundry VTT V14 game system, with the rights holder's permission for public release.

## Source material

- `ImagineRoll20CharacterSheet-main/` — the original Roll20 sheet export (HTML/CSS/sheet.json). Two actor types (Character, Creature), 10 tabs, 20+ repeating item types for magic/crafting subsystems. The HTML embeds a 180k-line `<script type="text/worker">` block — his actual computation code — extracted to `docs/reference/sheet-worker.js`. (An early audit wrongly called the sheet "logic-less"; see `DECISIONS.md`.)
**The rulebook text is local-only and deliberately not committed** (see `.gitignore`). This repository is public, and permission to build a Foundry conversion is not permission to republish four commercial books. Regenerate from your own PDFs when needed:

```
python tools/extract/extract_book_text.py "path/to/IRP_playersguide.pdf" players-guide
```

Books in use, once regenerated into `docs/reference/`:
- `players-guide-fulltext.txt` — the base rulebook (368 pages: Attributes, Races, Characters, Classes, Skills, Combat, Equipment, Magic, Divine Magic, Appendix).
- `masters-manual-fulltext.txt` — GM-facing expansion (319 pages: extended attribute ranges, class extensions, expanded combat, equipment costs, magic item design). Not a base-rules source — defers to the Player's Guide 82+ times.
- `aspects-of-the-wild-fulltext.txt` — first Bestiary Expansion (176 pages), mostly playable races plus creature-creation guidance.
- `mysteries-of-the-planes-fulltext.txt` — fourth Bestiary Expansion (657 pages), the inner planes; source of 115 of the extracted skills.

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
