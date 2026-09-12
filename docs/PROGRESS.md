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
| Obtain Bestiary / Creature source material | Done | *Aspects of the Wild* (176pp, first Bestiary Expansion) and *Mysteries of the Planes* (657pp, fourth) extracted to `docs/reference/`. Aspects is mostly playable races (~18 with full racial ability tables) plus creature-creation guidance rather than stat blocks; Mysteries covers the inner planes. The creature *mechanical* data was already in hand from his JS (creature `abilitylist` 1,114 entries, `disabilitylist` 249, `immunitylist` 149). |
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
| Generate `src/packs/*.json` for core content | Done | `tools/extract/build_documents.py` shapes the named extraction into Foundry documents in `src/packs/documents/`: **2,814 documents** across skills (674), weapons (594), armour (719), equipment (636), races (105) and classes (86). Classes merge three dictionaries keyed by name. Conversion is 99.75% clean; the 7 remaining edge cases are reported every run and listed in `docs/UPSTREAM-ISSUES.md` item 5. |
| Compile JSON -> Foundry compendium packs | Backlog | `packs/` builds from `src/packs/` and loads in Foundry V14. |
| Extend extraction to magic-phase dictionaries | Backlog | `rituallist`, `evokedict`, `spellPrimers` and remaining subsystems extracted. Data ready ahead of the mechanics phase; parser cost is near-identical for 37 dictionaries vs 10. |

## Epic 1 — Roll Engine & Data Model (Layer 0)

| Story | Status | Definition of Done |
|---|---|---|
| Define Foundry system manifest (`system.json`) targeting V14 | Done | JSON-validated; `compatibility.minimum: "14"`; folder skeleton (`module/`, `styles/`, `lang/`, `packs/`, `templates/`) in place with minimal stub files so the package structurally loads. **Not yet runtime-verified in an actual Foundry V14 install** — that's still outstanding. `documentTypes` declares `character`/`creature` Actor types backed by intentionally empty `TypeDataModel` stubs in `module/imagine-rpg.mjs`, placeholder only. |
| Design Actor data model (Character, Creature) | In Progress | Schema covers all fields cataloged from the Roll20 sheet's core tabs; documented against source page refs in `docs/reference/`. **Character schema drafted in `docs/DATA-MODEL.md` pending review; `creature` schema parked on the Bestiary book.** Source audit complete: field catalog extracted per tab, skills/equipment confirmed as Roll20 workaround inflation, Endurance confirmed derived + per-body-area. |
| Implement attribute-save resolver | Done | `rating × 5%` capped at 90%, extended-range table (0-4/21-30) from Master's Manual; unit-verified against both books' tables and the sample character screenshot. |
| Implement skill-check resolver | Done | `Base Chance + Ability Bonus` per Player's Guide p.94 formula; d100 roll-under; crit margin >20%; unit-verified with the book's own worked examples. |
| Design content/compendium layer (sourcebook tagging, enable/disable) | Done | `module/availability.mjs` resolver + four world settings + Game Master window (`module/apps/availability-config.mjs`, registered as a settings menu). Magic master switch and 16 subsystem switches as a hard ceiling, then `type:name` overrides (this is how a single class is disallowed), then sourcebooks. Enforced on `preCreateItem`: players blocked, the GM warned and allowed through. Items already on characters are flagged with a reason, never removed. **39 resolver and integration tests passing** (`tools/availability-test.html`); the 61 derivation tests still pass; all 13 modules parse; the window and the flagged sheet were checked visually. **Not verified:** the settings menu, the `preCreateItem` hook, the refresh on change and compendium index discovery all need a running Foundry V14. |

## Epic 2 — Character Foundation (Layer 1)

| Story | Status | Definition of Done |
|---|---|---|
| Attributes module | Backlog | All 12 attributes + derived stats (Endurance, Perception, Affinity, Fortune) + resistances, matching Roll20 sheet fields and Player's Guide tables. |
| Reconcile Character attribute maximums with his code | Done | Fixed. `getAttributeCap(title)` is replaced by `getAttributeMax(title, raceLimit)`: the race's limit for that attribute, 20 before a race is chosen, and a flat 27 from title 11 — which is what his sheet does (race limits at sheet-worker.js:8099, `setArchMortalAttributesMax` at 27549, called at 66140). The Master's Manual's 23/25/27/30 tiers are gone, and `IMAGINE.attributeCaps` with them, because nothing in his code implements them: every `*_max` assignment was checked and there is no deity handler at title 16. This changes play in both directions — an arch-mortal of a limited race gains real headroom, and a low-title character of a permissive race is no longer held to 25 by a tier that does not exist. 91 derivation tests pass (`tools/derive-test.html`), covering the 20 default, race limits above and below 20, the title 10→11 boundary, and an arch-mortal whose race would previously have barred the rating; creature 121, combat 101 and availability 39 are unchanged, and all 25 modules parse. His own comment at the call site says 25 where the code sets 27 — logged as `UPSTREAM-ISSUES.md` item 16. See `DECISIONS.md`, "CORRECTION: a character's attribute maximum follows his sheet". |
| Races & Classes module (compendium-driven) | Backlog | Race/class data shape defined; at least the sample race/class from source material round-trips through the compendium layer. |
| Skills module | Backlog | Class/racial/social skill types resolve correctly per the validated formula; common-skill fallback implemented. |

## Epic 3 — Assembly & Play (Layer 2)

| Story | Status | Definition of Done |
|---|---|---|
| Character Generation module | Backlog | Normal/Adventurer/Heroic/Legendary rolling methods implemented per Player's Guide p.20; attribute point-buy (2:1 or 3:1 per method) implemented. |
| Combat module — phase 1 | Done | Attack charts (7 levels, from his code), with attack skill worked out from class progression and title. d20 attack down his exact zone ladder, with fumbles (Agility save, then the 80/20 split), called shots judged on the natural roll, and the target's defensive adjustment. Damage uses his Strength rule (a bonus doubled two-handed, a penalty halved), plus magic bonus, called-shot half damage and the ×3 cap. 45 body charts give per-area Endurance, and armour is summed per area from worn layers. His banded blocking, degradation and hide are in, with wound thresholds for the Vitality save, area effect and shock. The 10-second round is an ascending-initiative tracker in which actions spend seconds. Combat tab on the sheet, attack chat card, Apply Damage and Spend Seconds. **101 combat-rule tests** (`tools/combat-test.html`), including the Player's Guide's Brom called-shot example and a check that all 86 classes' attack progressions parse; **26 new character-integration tests** (87 in the derivation suite); all 17 modules parse. The sheet and chat card were checked against a rebuild of his own sample character from real content. Six bugs in his combat code and three rule/code disagreements are recorded in `UPSTREAM-ISSUES.md` items 6-7. **Not verified:** everything that needs a running Foundry V14 — the dialogs, the chat card buttons, the tracker's sort and round handling, and actor updates. |
| Combat module — phase 2 | Backlog | Weapon/Missile Lore charts, martial arts and stances, multi-missile, soldiering, runes, magic armours, shield coverage by handedness, pain threshold, damage absorption, special damage effects, critical fumble table, per-body-type armour mapping, carry-over, evoke mutations. |
| Equipment module (compendium-driven) | Backlog | Weapons/armor/gear schema; encumbrance/Load Limit tied to Strength per Attributes module. |

## Epic 4 — Creature/NPC (Layer 3)

| Story | Status | Definition of Done |
|---|---|---|
| Creature actor type & sheet | Done | Source-material blocker is resolved (Bestiary material obtained, Epic 0). Full audit of the Roll20 creature sheet (HTML lines 57576-92926) and the sheet-worker's creature-handling code (lines 174658-180370, plus shared functions that branch on creature-vs-character) is done and logged in `docs/DECISIONS.md`: "Creature/NPC audit findings", plus "CORRECTION: creature audit findings, checked against the source", which supersedes it wherever they differ. Its mechanical claims have been checked against the source. Reusable as-is: the 12 attributes and their saves, per-area wounds and armour (`createBodyAreas`; all 45 stock charts are already in `BODY_CHARTS`), and the attack zone ladder and fumble handling (`getAttackChart`/`resolveAttack`/`resolveFumble`). Creature-specific, needing new schema or logic: identity (type, subtype, level, life cycle, habitat, body type); a level-tiered attribute cap; characteristics with mixed derivation (Endurance and Hide entered, Shock defaulting to Endurance × 3, and Perception/Affinity/Fortune on a creature-only formula worked from the *as-built* attributes); entered resistances plus modifiers; a stored, editable body chart, not just a body type; the 10-slot natural-attack block (his own encoded format, not a weapon Item, with non-physical attack shapes and up to three effect riders), with to-hit modifiers summed the way `handlePhysicalAttacks` does rather than copied from his buggy creature path; abilities, disabilities and immunities as display-only on creatures (his racial copies do drive mechanics for characters); and Powers as innate spells/invocations with use counts, which can be stored now but not *used* until the Layer 4 spell/invocation engine exists. All three open design decisions and the model check-in are resolved (`DECISIONS.md`, "Creature schema: the three open design calls, resolved"): Abilities/Disabilities/Immunities are plain descriptive items; Powers and Attacks stay two separate item types; the tamed-creature/owner-relationship concept is deferred; the user picked **Fable** for the real implementation, then directed that it run on Opus, which is what happened. **Built:** `module/data/actor-creature.mjs` (entered Endurance, Hide, Shock and resistances; the creature-only Perception/Affinity/Fortune formula, with level counting double for Affinity and all three worked from the as-built ratings; the level-tiered attribute cap; a stored editable body chart; flat-chance skills, with `parseSkillList` for pasting a stat block); three new item types, `creatureAttack` (his `|`/`@`/`^` encoding decoded into fields, with up to three rider effects), `power` and `trait` (ability, disability and immunity in one type); `module/combat/creature-rules.mjs` (attack-type behaviour, the touch rule, the four area shapes sized from Endurance, modifier gathering and rider triggers, all pure); `module/combat/creature-attack.mjs` with `templates/chat/creature-attack-card.hbs` (the roll, reusing the weapon card's Apply Damage and Spend Seconds wiring); and `module/sheets/actor-creature-sheet.mjs` with four tabs and five templates. Registered in `system.json`, `lang/en.json` and `module/imagine-rpg.mjs`, replacing the empty placeholder model. **Tested:** 121 creature tests pass (`tools/creature-test.html`) across the cap, the characteristics including every sense bonus, entered-versus-derived behaviour, resistances, body charts and wounds, the combat wiring, encumbrance and all of `creature-rules.mjs` — including the ceiling the port applies where his own helper drops it; the existing suites still pass unchanged (derivation 87, combat 101, availability 39); all 25 modules parse (`tools/syntax-check.html`); and the sheet's four tabs and the attack chat card were checked visually against a creature the real model derived (`tools/creature-preview.html`), with the numbers on screen verified by hand. **Not verified:** everything needing a running Foundry V14 — sheet registration, the attack dialog, the chat-card buttons, actor updates and initiative — since no V14 install exists on this machine. **Deferred:** a Power is stored and listed but cannot be resolved until the Layer 4 spell and invocation engine exists, and the EXP/CR budgeting functions, the evoke and Famorian body builders and the Agility jump table are not ported. See `DECISIONS.md`, "Creature/NPC implementation". |

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

## Epic 7 — Character Sheet UI

| Story | Status | Definition of Done |
|---|---|---|
| ApplicationV2 character sheet | In Progress | `module/sheets/actor-character-sheet.mjs` with header + attributes/skills/equipment tabs, each its own PART with a single root element as the framework requires. Renders correctly against real derived data (`tools/sheet-preview.html`). **Sheet registration API path not yet verified against a running Foundry V14** — no V14 install available on this machine. |
| Attribute save and skill roll handlers | In Progress | Implemented as `data-action` handlers producing chat messages with outcome tiers. Roll resolution follows his code for saves ("succeeded by half") and the Player's Guide for skills (±20% margin = critical). **Not yet exercised in Foundry.** |
| Remaining tabs (combat, magic, journal) | Backlog | Combat needs the event-time round implemented; magic is the deferred phase. |
| Item sheets | Backlog | Skill, race, class, weapon, armour, equipment, and now creature attack, power and trait, all still use the default sheet. A creature attack is the one that most wants its own: it carries up to three rider effects, each with seven fields, which the default sheet renders as a raw list. |
