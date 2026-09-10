# Progress Board

Agile-style tracking: epics map to the architecture layers in `CLAUDE.md`. Every story carries a Definition of Done (DoD) — a story isn't "Done" until its DoD is checked off during the self-check step (see `CLAUDE.md` → Working Protocol).

Status values: `Backlog` / `In Progress` / `Blocked` / `Done`.

---

## Epic 0 — Research & Continuity Foundation

| Story | Status | Definition of Done |
|---|---|---|
| Extract & map Roll20 source sheet | Done | Structure understood: 2 actor types (Character/Creature), 10 tabs, 20+ repeating item types, no JS/sheet-workers present, field names cataloged by area. |
| Extract & map Player's Guide | Done | OCR'd to `docs/reference/players-guide-fulltext.txt`. Bookmark structure mapped (Attributes/Races/Characters/Classes/Skills/Combat/Equipment/Magic/Divine Magic/Appendix). Core skill-check and attribute-save formulas pulled and cross-validated against the Roll20 sheet's sample character. |
| Extract & map Master's Manual | Done | OCR'd to `docs/reference/masters-manual-fulltext.txt`. Confirmed as GM-facing expansion (extended attribute ranges, class extensions, expanded combat, magic item design), not a base-rules source. |
| Set up continuity scaffolding | In Progress | git initialized, `CLAUDE.md`, `docs/DECISIONS.md`, `docs/PROGRESS.md`, `docs/reference/` in place; initial commit made. |
| Obtain Bestiary / Creature source material | Backlog | Needed before Creature/NPC epic can start in earnest. |
| Obtain magic subsystem source material | Done (superseded) | No longer blocking — magic content data (`rituallist`, `evokedict`, `spellPrimers`) is already present in `sheet-worker.js`. Prose-only gaps may remain. |
| Discover + extract embedded sheet-worker JS | Done | 180,370 lines recovered from the HTML's `<script type="text/worker">` block to `docs/reference/sheet-worker.js`. Corrects the earlier false "no JavaScript" finding. ~37 data dictionaries cataloged; shape confirmed uniform and machine-consistent (470/470 skills at 10 cols, 204/204 social at 8). |
| Confirm `sheet-worker.js` is the dev's current ruleset | Backlog | **Blocking Epic 6.** Dev described the code from memory rather than sending it; confirm this file is not a superseded version before extracting ~7,000 rows from it. |

## Epic 6 — Content Extraction Pipeline

| Story | Status | Definition of Done |
|---|---|---|
| Generic dictionary parser (`tools/extract/parse_dictionaries.py`) | Done | Tokenizer-based (not regex) so mixed types, nested arrays and embedded expressions surface instead of corrupting. Extracts **87 dictionaries / 12,595 entries**, with exactly one non-literal value correctly flagged rather than mangled (`raceStatsAndMoveDetails` → `"Gaunt"` contains a live `getDieRoll(4)` call). Raw output in `src/packs/raw/`, checked in for reviewable diffs. Handles his implicit-global declaration style (`classRequirementsAndDetails={`), not just `const`. Duplicate dictionary names (character vs creature `abilitylist` etc.) disambiguated by start line so neither is lost. |
| Per-dictionary column maps | Done (core scope) | 21 core dictionaries mapped to named fields in `tools/extract/column_maps.py`, output to `src/packs/named/`. Maps are sourced three ways and each records which: his own column-header comments, derivation from how the code consumes the row (`tools/extract/derive_column_maps.py` reads `setAttrs({field: row[N]})` patterns — this is how the unlabelled 62-column race table and 22-column class table were recovered), or self-evident structure. `map_columns.py --check` treats width mismatches as errors, which caught four maps I had inferred from the rulebooks rather than the code. **20 of 21 clean.** Remaining dictionaries (magic subsystems, martial arts, armour sub-tables) still need maps. |
| Report the Monk data defect to the dev | Backlog | `classRequirementsAndDetails` → `"Monk"` has 21 columns where all 87 other classes have 22 — it carries 4 `classMod` slots instead of 5, shifting every later field left by one. Live consequence in his Roll20 sheet: `classDetails[16]` is read as armour usage, but for Monk that index holds the weapon list. Left unmapped rather than silently patched. |
| Resolve the one non-literal value | Backlog | `raceStatsAndMoveDetails` → `"Gaunt"` uses `0-getDieRoll(4)` where every other race has a literal. Decide whether this is a random stat by design or a bug in his sheet; ask the dev. |
| Generate `src/packs/*.json` for core content | Backlog | Skills, social skills, weapons, armor, equipment emitted as checked-in JSON producing reviewable diffs. |
| Compile JSON -> Foundry compendium packs | Backlog | `packs/` builds from `src/packs/` and loads in Foundry V14. |
| Extend extraction to magic-phase dictionaries | Backlog | `rituallist`, `evokedict`, `spellPrimers` and remaining subsystems extracted. Data ready ahead of the mechanics phase; parser cost is near-identical for 37 dictionaries vs 10. |

## Epic 1 — Roll Engine & Data Model (Layer 0)

| Story | Status | Definition of Done |
|---|---|---|
| Define Foundry system manifest (`system.json`) targeting V14 | Done | JSON-validated; `compatibility.minimum: "14"`; folder skeleton (`module/`, `styles/`, `lang/`, `packs/`, `templates/`) in place with minimal stub files so the package structurally loads. **Not yet runtime-verified in an actual Foundry V14 install** — that's still outstanding. `documentTypes` declares `character`/`creature` Actor types backed by intentionally empty `TypeDataModel` stubs in `module/imagine-rpg.mjs`, placeholder only. |
| Design Actor data model (Character, Creature) | In Progress | Schema covers all fields cataloged from the Roll20 sheet's core tabs; documented against source page refs in `docs/reference/`. **Character schema drafted in `docs/DATA-MODEL.md` pending review; `creature` schema parked on the Bestiary book.** Source audit complete: field catalog extracted per tab, skills/equipment confirmed as Roll20 workaround inflation, Endurance confirmed derived + per-body-area. |
| Implement attribute-save resolver | Done | `rating × 5%` capped at 90%, extended-range table (0-4/21-30) from Master's Manual; unit-verified against both books' tables and the sample character screenshot. |
| Implement skill-check resolver | Done | `Base Chance + Ability Bonus` per Player's Guide p.94 formula; d100 roll-under; crit margin >20%; unit-verified with the book's own worked examples. |
| Design content/compendium layer (sourcebook tagging, enable/disable) | Backlog | A compendium entry can declare a sourcebook; a world-level setting can enable/disable a sourcebook or override an individual entry; documented data shape. **Opus task, not started.** |

## Epic 2 — Character Foundation (Layer 1)

| Story | Status | Definition of Done |
|---|---|---|
| Attributes module | Backlog | All 12 attributes + derived stats (Endurance, Perception, Affinity, Fortune) + resistances, matching Roll20 sheet fields and Player's Guide tables. |
| Races & Classes module (compendium-driven) | Backlog | Race/class data shape defined; at least the sample race/class from source material round-trips through the compendium layer. |
| Skills module | Backlog | Class/racial/social skill types resolve correctly per the validated formula; common-skill fallback implemented. |

## Epic 3 — Assembly & Play (Layer 2)

| Story | Status | Definition of Done |
|---|---|---|
| Character Generation module | Backlog | Normal/Adventurer/Heroic/Legendary rolling methods implemented per Player's Guide p.20; attribute point-buy (2:1 or 3:1 per method) implemented. |
| Combat module | Backlog | Initiative (d10, best of AGL/INT), 10-second event-time round, d20 to-hit, damage, matches Player's Guide Combat chapter. |
| Equipment module (compendium-driven) | Backlog | Weapons/armor/gear schema; encumbrance/Load Limit tied to Strength per Attributes module. |

## Epic 4 — Creature/NPC (Layer 3)

| Story | Status | Definition of Done |
|---|---|---|
| Creature actor type & sheet | Blocked | Blocked on Bestiary source material. |

## Epic 5 — Magic (Layer 4, deferred)

| Story | Status | Definition of Done |
|---|---|---|
| Base Magic (Aura) module | Backlog | Deferred until core phase complete. |
| Base Divine Magic (Piety) module | Backlog | Deferred until core phase complete. |
| Per-subsystem magic modules (runes, potions, bardic, etc.), individually toggleable + master off-switch | Backlog | Deferred. Blocked on subsystem source material for most entries. |

---

## Self-Check Checklist (run at the end of every work loop, before marking a story Done)

1. Does the implementation match the formula/table actually found in `docs/reference/`? Cite the page.
2. Does it conflict with the Roll20 sheet? If so, the sheet wins — note the deviation from the books here.
3. Is the story's Definition of Done fully met, not partially?
4. Update this file's status column.
5. Log any new architectural call in `docs/DECISIONS.md`.
6. Commit with a message describing what changed and why.
