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
| Obtain magic subsystem source material | Backlog | Needed before Epic 4 (Magic). Not blocking core phase. |

## Epic 1 — Roll Engine & Data Model (Layer 0)

| Story | Status | Definition of Done |
|---|---|---|
| Define Foundry system manifest (`system.json`) targeting V14 | Done | JSON-validated; `compatibility.minimum: "14"`; folder skeleton (`module/`, `styles/`, `lang/`, `packs/`, `templates/`) in place with minimal stub files so the package structurally loads. **Not yet runtime-verified in an actual Foundry V14 install** — that's still outstanding. `documentTypes` declares `character`/`creature` Actor types backed by intentionally empty `TypeDataModel` stubs in `module/imagine-rpg.mjs`, placeholder only. |
| Design Actor data model (Character, Creature) | In Progress | Schema covers all fields cataloged from the Roll20 sheet's core tabs; documented against source page refs in `docs/reference/`. **Character schema drafted in `docs/DATA-MODEL.md` pending review; `creature` schema parked on the Bestiary book.** Source audit complete: field catalog extracted per tab, skills/equipment confirmed as Roll20 workaround inflation, Endurance confirmed derived + per-body-area. |
| Implement attribute-save resolver | Backlog | `rating × 5%` capped at 90%, extended-range table (0-4/21-30) from Master's Manual; unit-verified against both books' tables and the sample character screenshot. |
| Implement skill-check resolver | Backlog | `Base Chance + Ability Bonus` per Player's Guide p.94 formula; d100 roll-under; crit margin >20%; unit-verified with the book's own worked examples. |
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
