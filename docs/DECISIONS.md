# Decisions Log

Append-only. One entry per real architectural or scope call. Newest at the bottom. If a decision is later reversed, add a new entry noting the reversal rather than editing the old one.

---

### 2026-09-10 — Source of truth on conflicts
**Decision:** When the Roll20 sheet (`ImagineRoll20CharacterSheet-main/`) disagrees with a rulebook, the Roll20 sheet wins.
**Rationale:** The sheet reflects what the table actually plays with, which may include years of house rules or errata the books never caught up to.

### 2026-09-10 — Target platform
**Decision:** Foundry VTT V14 (current stable line as of 2026-09).
**Rationale:** User wants latest; V14 confirmed as current stable via web search (build 14.367).

### 2026-09-10 — Visual direction
**Decision:** Redesign the sheet UI for Foundry's native conventions (tabs, theming, resizable windows) rather than cloning the Roll20 sheet's boxy table layout.
**Rationale:** User's explicit call — "Redesign for Foundry."

### 2026-09-10 — Build scope / phasing
**Decision:** "Core first" — Attributes, Races & Classes, Skills, Character Generation, Combat, Equipment, Creature/NPC actor type. The 20+ magic/crafting subsystems (runes, potions, elixirs, charms, poisons, bardic magic, empathy magic, glyphs, rituals, sympathy magic, etc.) and base Magic/Divine Magic are deferred to a later phase.
**Rationale:** User's explicit call, given the scale (40+ tabs/subsystems in the source sheet).

### 2026-09-10 — CORRECTION: the Roll20 sheet does contain JavaScript
**What happened:** Earlier analysis this same day concluded `ImagineTabbedCharacterSheet.html` had zero `<script>` tags and was a "logic-less" sheet with inert ROLL/MOD buttons. That was wrong. The search used to check for scripts matched the literal text `&lt;script` (an HTML-escaped entity) instead of the actual tag `<script`, producing a false negative. The file has a single `<script type="text/worker">` block running from line 98843 to the end of the file (279214) — **180,370 lines, ~13MB**, the actual Roll20 sheet-worker JavaScript, confirmed by the developer directly ("It has a huge data dictionary in it. It is most certainly JS code.").
**Impact:** Extracted to `docs/reference/sheet-worker.js`. This is dev-authored, battle-tested computation code — a stronger source of truth than the OCR'd rulebooks for anything it covers, per the existing "Roll20 wins on conflict" rule (this IS the Roll20 sheet, just a part of it I'd missed). Initial spot-checks (attribute save formula, Endurance formula) match my book-derived reconstructions almost exactly, which is a good validation signal for the reconstructions done before this was found, but this file should be treated as primary from here forward, not the books, wherever it has coverage.
**What's in it (initial survey, not exhaustive):** ~37 major data dictionaries including full weapon stats (`weaponvalueslist`), a per-body-location armor value table across ~19 distinct locations (`armorvalueslist`), armor costs/penalties/condition/blocking/damage-type/materials (5 more dictionaries), the complete class/racial skill table (`skilldict`), five social-skill dictionaries, martial arts (8 dictionaries: attack/block/hold/move/throw/lore/stances), hand-to-hand and brawling tables, class title/advancement data (`classtitledict`), fatigue, and — notably — magic-phase content already present: `rituallist`, `evokedict`, `spellPrimers`. Full catalog not yet done.
**Not yet resolved:** whether `getArmorCombatValues` and the rest of this file represent the dev's *current* intended ruleset, or an older/divergent version he's since moved past — worth asking him directly given he referenced it from memory rather than sending it.

### 2026-09-10 — Rules source material
**Decision:** Building from two books so far: `IRP_playersguide.pdf` (368 pages — base rules: Attributes, Races, Characters, Classes, Skills, Combat, Equipment, Magic, Divine Magic, Appendix) and `IRP_mastersmanual_scan.pdf` (319 pages — GM-facing expansion: extended attribute ranges 0-4/21-30, class "extensions," expanded combat, equipment costs, magic item design, new spells/invocations, world-building). Full OCR text of both extracted to `docs/reference/`. More books (Bestiary, per-subsystem magic books) expected later, needed only when their corresponding phase starts.
**Rationale:** The Master's Manual alone was insufficient — it explicitly defers to "the Player's Guide" 82+ times for base mechanics, including for the normal 5-20 attribute range every character actually uses.

### 2026-09-10 — Publishing / IP rights
**Decision:** Public release is in scope. User confirmed full permission from the rights holder (the game's developer) to build and publish this conversion.
**Rationale:** User's explicit statement. Worth keeping that permission documented somewhere (e.g. an email) before actual package-browser submission, but this is not a current blocker.

### 2026-09-10 — Data migration
**Decision:** No automated Roll20 → Foundry character import tooling. Existing characters will be migrated manually by hand.
**Rationale:** User's explicit call — lower priority than getting the system itself right.

### 2026-09-10 — Content architecture: compendium-driven, sourcebook-tagged
**Decision:** Classes, Races, Skills, Equipment, and (later) Magic subsystems are NOT hardcoded. They live as Foundry compendium entries tagged by sourcebook of origin (e.g. "Player's Guide," "Master's Manual," "Custom"). A campaign/world can enable or disable entire sourcebooks or override individual entries. New content (stock or homebrew) is added by authoring/importing compendium entries — no code changes required.
**Rationale:** User needs to add new classes/races/content as the system (their own game) is still in active development, and wants per-class and per-sourcebook enable/disable, not just a binary on/off. Generalized from an initial "turn classes on/off" request into a shared content layer used everywhere, per user's explicit confirmation ("Apply broadly").

### 2026-09-10 — Magic subsystem toggles
**Decision:** Each of the 20+ magic/crafting subsystems is individually toggleable, plus a single master "all magic off" switch that short-circuits all of them regardless of individual settings.
**Rationale:** User's explicit call. Mirrors the Roll20 sheet's own Config tab pattern (`act_configtabA`), which likely served a similar purpose originally.

### 2026-09-10 — Working protocol: model choice for heavy work
**Decision:** Before starting real implementation work (non-trivial rules encoding, architecture-locking decisions, substantive system code — as opposed to planning, research, or light scaffolding), stop and ask the user whether to proceed on Opus or Fable rather than defaulting to whatever model is currently active.
**Rationale:** User's explicit call. Also saved as a persistent feedback memory outside this repo, since it's a working-style preference rather than project data.

### 2026-09-10 — Foundry V14 technical baseline
**Decision:** Build exclusively on ApplicationV2 + HandlebarsApplicationMixin (no legacy AppV1 classes, which are slated for removal at V16). Design the Active-Effect-backed modifier system against V14's string-based change types (`"add"`/`"multiply"`/`"override"`, under `effect.system.changes`) from day one, not the old numeric constants. Use `DocumentUUIDField` (with `relative: true` where appropriate) as the native mechanism for cross-referencing compendium content (e.g. a Class item pointing at its racial skills), rather than hand-rolled UUID strings. Full research notes in `docs/reference/foundry-v14-requirements.md`.
**Rationale:** These are V14-specific APIs; building against the old patterns would mean redoing Layer 0 almost immediately. Confirmed via official Foundry docs and V14 migration references — see the reference doc for sources.
**Update 2026-09-10:** User confirmed no legacy/back-compat concern at all — target V14+ only, `compatibility.minimum` set strictly to `"14"`, no shims or fallback paths for AppV1 or pre-V14 APIs anywhere in the codebase.

### 2026-09-10 — Manifest scaffolding (Sonnet pass)
**Decision:** `system.json` id is `imagine-rpg`. Manifest declares `compatibility.minimum: "14"` (no `maximum`, to avoid locking out point releases), `documentTypes.Actor` with `character`/`creature` subtypes backed by deliberately empty `TypeDataModel` stub classes in `module/imagine-rpg.mjs`. Folder skeleton created: `module/`, `styles/`, `lang/`, `packs/`, `templates/`, each with a placeholder file. `license` manifest field intentionally omitted — no LICENSE file exists yet, and the license text is the rights holder's call, not mine to invent. `readme` field points at the existing `README.md`.
**Rationale:** This is the "Sonnet bit" of Layer 0 — mechanical, well-specified, low-risk to redo. The real Actor schema (what actually goes in `defineSchema()`) is explicitly deferred as an Opus task per the model protocol; these stubs exist only so the package is structurally loadable, not as a design commitment.
**Caveat:** Not yet runtime-verified against an actual Foundry V14 install — only JSON-validated and checked against the manifest spec in `docs/reference/foundry-v14-requirements.md`.

### 2026-09-10 — Working protocol: agile board + self-check loop
**Decision:** Track work in `docs/PROGRESS.md` as an agile-style board (epics = module layers, stories = concrete tasks, each with a Definition of Done). Every work loop ends with a self-check pass before a story is marked done: verify the implementation against `docs/reference/` (the actual rulebook text) and against the Roll20 sheet (which wins on conflict), confirm the story's Definition of Done is met, update `PROGRESS.md` status, log any new architectural call here, and commit.
**Rationale:** User's explicit call — continuity across conversation windows, and a repeatable quality gate rather than ad hoc self-review.

### 2026-09-10 — Column maps derived from code, not transcribed
**Decision:** Column names for the extracted dictionaries are derived from how the sheet-worker *consumes* each row (`setAttrs({field: row[N]})`), via `tools/extract/derive_column_maps.py`, rather than hand-transcribed. `map_columns.py --check` treats any row-width mismatch as an error.
**Why it matters:** Several important dictionaries carry no column-header comment at all — `raceStatsAndMoveDetails` has 62 unlabelled columns and `classRequirementsAndDetails` has 22. Hand-transcribing those invites an off-by-one somewhere in the middle, which does not fail loudly; it silently shifts every subsequent field and surfaces much later as wrong game numbers. Deriving from his code is both faster and authoritative.
**Validation caught real errors:** four of the twelve attribute-table maps were wrong when inferred from the printed rulebook tables — `appRatingValues`, `aurRatingValues`, `ptyRatingValues` and `wilRatingValues` each carry extra "special" columns that the printed tables do not show. The width check caught all four.

### 2026-09-10 — Found a live defect in the dev's class data
**Finding:** `classRequirementsAndDetails["Monk"]` has 21 columns; all 87 other classes have 22. Monk carries only 4 `classMod` slots (indices 11-14) where every other class has 5 (11-15), so every field after that point is shifted left by one.
**Live consequence:** his sheet reads `classDetails[16]` as armour usage. For Monk, index 16 holds the weapon list — so Monk's armour usage is displaying weapon data in the current Roll20 sheet.
**Decision:** left unmapped and reported rather than patched. Guessing where the missing column belongs means silently altering his game data; the fix is almost certainly inserting one empty `classMod` slot, but that is his call to confirm.

### 2026-09-10 — Rulebook text kept out of the public repository
**Decision:** The four extracted rulebook full-text files are untracked and `.gitignore`d. They stay on local disk and are regenerated with `tools/extract/extract_book_text.py`. His `sheet-worker.js` and the Roll20 sheet **remain** committed.
**Rationale:** `MichaelTenery/FoundryImagineSheet` is a public repository. Committing the complete text of four commercial titles would let anyone read the Player's Guide without buying it — materially different from publishing a Foundry system, and not something the permission to build this conversion reasonably covers.
**Where the line falls:** code stays, books go. His sheet code is the system's primary source of truth and the conversion depends on it; it is also already embedded inside the committed Roll20 HTML, so removing one copy would achieve nothing. The books are prose he sells.
**Known limitation:** the text was already pushed in commit `24f14a7` and remains in git history. Removing it properly needs a history rewrite and force-push — destructive, and on someone else's public repository, so it is the rights holder's call rather than one to take unilaterally. Worth doing soon if at all, while the history is short.
**Also his call, not ours:** whether the repository should be private at this stage.

### 2026-09-11 — CORRECTION: the Roll20 Config tab has no content toggles
The "Magic subsystem toggles" entry above says the design "mirrors the Roll20 sheet's own Config tab pattern (`act_configtabA`), which likely served a similar purpose originally." That was a guess, and it was wrong. His Config tab (HTML lines 57259-57377) covers sheet style, colour scheme, equipment handling (Realistic / Loose / Free, which only switches the equipment layout shown), attack verbosity and experience display. It has no magic or sourcebook switches. The availability layer is new functionality, not a port.

### 2026-09-11 — Content availability layer
**Decision:** `module/availability.mjs` implements one pure resolver, `explainAvailability(item, rules)`, returning `{ available, reason }`. The rules are four world settings edited through a Game Master window (`module/apps/availability-config.mjs`). The checks run in a fixed order:
1. **Magic switches** — the master switch, then one switch per subsystem. These are a hard ceiling, and nothing below them can lift it.
2. **Individual overrides** — allow or forbid one item, keyed `type:name` (e.g. `class:Monk`).
3. **Sourcebooks** — whole books on or off.

**Rationale and sub-decisions:**
- *Magic is absolute.* `DECISIONS` already specified that the master switch "short-circuits all of them regardless of individual settings." An allow-override therefore cannot re-enable a magical skill with magic off, which is what makes the switch worth having.
- *A skill with several magic types needs all of them enabled.* "Arch Ritual" is `Magical,Divine`, so it disappears if either arcane or divine magic is off. The reading is strict: something that needs magic cannot be used without it.
- *Overrides are keyed by `type:name`, not UUID.* A UUID changes when a compendium item is copied onto an actor or a pack is rebuilt. A name survives both, and a Game Master can read it in the settings window.
- *Untagged content is always available at the sourcebook level.* His races, classes, weapons, armour and equipment carry no sourcebook in the source data. Tags are not invented, so untagged content can only be forbidden individually.
- *Unlisted means on.* A sourcebook or subsystem missing from the settings defaults to enabled, so content from a book added later appears rather than silently vanishing.
- *Sourcebook identity is a slug.* His data writes `Player`s Guide` with a backtick, so it and `Player's Guide` must land on the same key.
- *Nothing is deleted.* When a switch flips, items already on a character are flagged unavailable, and the sheet shows the reason. Removing a player's things as a side effect of a settings change is not acceptable.
- *Enforcement sits on item creation* (`preCreateItem`), not on a drop handler, so it holds however an item arrives. Players are blocked. A Game Master is let through with a warning, because they decide what is in the campaign and may be making a deliberate exception. For the same reason, the sheet does not disable Roll on flagged items; it only marks them.

**Subsystem grouping:** 16 switches, each recording which of his Roll20 repeating sections it covers (e.g. `herbalism` = herb, potion, elixir, potionrecipe), so the grouping can be checked against his sheet or split further. This grouping is a judgement call and is cheap to change, since it is one list.

### 2026-09-11 — Combat, phase 1
**Decision:** Combat is built as pure rule functions (`module/combat/combat-rules.mjs`, with no Foundry dependency, each ported from a named place in his code) plus a thin Foundry layer (`combat/attack.mjs`, `combat/combat-document.mjs`). The tables are generated from his code rather than transcribed, by `tools/extract/extract_combat_tables.py` into `module/combat-tables.mjs`: the seven attack charts, 45 body charts, armour blocking, degradation dividers and material rank. Several lived inside `switch` statements rather than dictionaries and are read by walking those functions.

**How an attack resolves** (his `handlePhysicalAttacks`): d20 plus modifiers, floored at 1, read down a fixed ladder of zones (centre, right, high, left, low, then the misses), so one roll decides both hit and location. A called shot is judged on the *natural* roll; a natural 1 is a fumble. The attacker declares an aimed area. A centre hit lands there. An off-centre hit is placed by the Game Master when damage is applied, because the book describes superimposing the bullseye on the target and his code only ever reports the zone.

**How damage lands** (his `handleBodyDamage`): banded blocking against the total armour at the struck area, armour degradation worked from the damage *before* blocking, then hide. Wounds are capped at area Endurance plus Vitality. Past Endurance a Vitality save is needed; past Endurance plus Vitality the area's effect triggers; total wounds over Shock means shock.

**The 10-second round:** initiative is the second a combatant starts acting (d10, plus the better of the Agility and Intelligence adjustments, plus armour). The tracker sorts lowest first, and spending an action's seconds moves a combatant later and re-sorts. It is built on Foundry's own tracker rather than a separate clock.

**Sub-decisions:**
- *Body areas are derived; wounds are stored by name.* Areas come from the race's body chart, or from an explicit body-type override for transformations. Wounds and armour damage are `TypedObjectField`s keyed by area name, so a change of body cannot slide wounds onto the wrong limbs. This replaces the earlier stored `areas[]` array, which nothing used yet.
- *The standard attack chart stops at Master.* A class listing "Grandmaster(mastered weapons at 9)" means Grandmaster only on the Weapon Lore chart, as his code states explicitly.
- *The target's defensive adjustment is applied* when exactly one target is selected. It is not in his code, whose sheet only ever knew one character, but it is in the book and Foundry knows the target. It can be switched off per attack.
- *Humanoid armour maps to areas by name.* Humanoid, its variants and Saurian share the 19 location names. Other body types take no protection from humanoid armour until his per-body-type mapping is ported.
- *Where his code has a plain bug, the port implements the evident intent* and the bug is listed in `UPSTREAM-ISSUES.md` item 6. Where the book and his code simply disagree, his code is followed and the difference is listed in item 7.

**Deferred to phase 2:** Weapon/Missile Lore charts, martial arts and stances, multi-missile, soldiering, runes, the magic armours (spirit, force, invulnerability, magic shield, weaves), shield coverage by handedness, pain threshold, damage absorption, special damage effects such as losing an eye, the critical fumble table, the per-body-type armour mapping, carry-over, and evoke mutations on the body.

### 2026-09-11 — CORRECTION: parenthesised weapon values are not a "second head"
An earlier entry, and `UPSTREAM-ISSUES.md` item 5, said values like `8(6)` and `5d6(2d6)` were a dual-headed weapon's second head. His code says otherwise, and the data agrees:
- **Parenthesised damage** appears on exactly two weapons, and his code names both: a Spear does its bracketed damage when *thrown*, an Axe Hammer when *thrusting*. It is now stored as `damageAlt` together with the `damageAltMode` it applies to.
- **Parenthesised speed** appears on 85 weapons, almost all bows and crossbows, and it is **reload time**: a Crossbow is `1(15)`, firing in 1 second and reloading in 15. It is now `reloadSpeed` / `reloadMinSpeed`.

The `alternateHead` field is removed.
