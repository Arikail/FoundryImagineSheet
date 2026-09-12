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

### 2026-09-11 — Creature/NPC audit findings (research pass, before schema design)

> **Several statements in this entry are wrong.** They came from research summaries that were logged before being checked against the source. Read "CORRECTION: creature audit findings, checked against the source" below before relying on anything here.

**What was done:** Two research passes, one over the Roll20 HTML's creature sheet (lines 57576-92926, ~35,352 lines across 10 sub-tabs), one over `sheet-worker.js`'s `// @MARKER CREATURE SPECIFIC FUNCTIONS BELOW` section (lines 174658-180370) plus the shared functions elsewhere that branch on creature vs. character. No schema written yet — this logs what was confirmed, so the eventual schema design starts from fact rather than re-deriving it.

**Character vs. Creature is a hand-rolled toggle, not a Roll20-native distinction.** `sheet.json` declares nothing about it. The developer built his own: a `attr_which_sheet` dropdown ("Character Sheet" / "Creature Sheet") sets `attr_overall_sheet` to `main_character` or `main_creature`, which gates two entirely separate `<div>` bodies via CSS classes, each with its own independent tab system (`attr_sheetTab` vs `attr_sheetTab2`). This maps cleanly onto Foundry's real actor-type system — nothing about the split needs to be preserved as ambiguous.

**Confirmed shared with Character (same shape, reusable as-is):**
- The same 12 attributes and the same `getAttribSave()` branch order — already ported, applies unchanged.
- The body-area/wound/armor-layer system. `rebuildRepeatingBodyRows` and `checkTotalWounds` (both *outside* the creature marker section — shared code) branch on `creature_type` only to pick which Endurance field feeds `createBodyAreas`, then call the identical function Character uses. `BODY_CHARTS` in `module/combat-tables.mjs` already contains every stock creature body-chart string, verified byte-for-byte against `getBodyList`'s switch cases. **No new body-chart work is needed for stock body types.**
- Attack resolution. `setCreatureAttackSkillValues` uses an inline table character-for-character identical to `ATTACK_CHARTS`; `handleCreatureAttack` walks the same zone-ladder fields in the same order as the already-ported `resolveAttack`, with the same three-tier fumble structure as `resolveFumble`. The only difference is that a creature's attack-chart level is a directly-authored stat (`creature_atk_chart`), not derived from class progression. **`getAttackChart`, `resolveAttack` and `resolveFumble` are very likely reusable as-is for Creature.**

**Confirmed creature-specific (needs new schema/logic):**
- Identity: type/subtype/level/lifecycle/habitat/bodytype, with real enums recovered from the Configurator tab (creature types: Animal/Deity/Humanoid/Magical/Magical Animal/Magical Humanoid/Magical Plant/Plant/Slime/Supernatural/Undead; body types include Arachen/Bird/Brachara/Centaur/Crustacean/Giant Spider/etc.).
- The attribute cap is level-tiered (25/28/30), not title-tiered like Character's — see `UPSTREAM-ISSUES.md` item 8.
- Characteristics are a mixed bag, not uniformly derived like Character's: **Endurance and Hide are flat authored numbers** with no attribute-averaging formula at all; **Shock** derives as `END × 3` only as a fallback when no value is entered; **Perception/Affinity/Fortune are derived**, reusing the same attribute-average-plus-`.99` idiom as Character, but with an added `+creature_level` term, ability-name-triggered `+10` bonuses, and (Affinity only) a conditional formula and a `tame_bonus` term Character has no equivalent of. **Resistances are flat authored percentages plus additive modifiers, not attribute-table lookups at all** — a genuine structural break from `_prepareResistances`.
- The 10-slot hardcoded natural-attack block (`creature_attk_one`..`ten`) is not shaped like a weapon Item — it's a custom `|`/`^`/`@`-delimited encoded string (name/type/speed/minspeed/damage/damtype, plus optional rider blocks for effects like poison). It also supports non-physical attack shapes with no Character equivalent at all: `Touch` (auto-resolve, no roll), `Direct`/`Gaze`/`Voice` (auto-hit), `Cloud`/`Bolt`/`Cone`/`Glob` (an area/shape whose size is computed from the creature's own Endurance). This needs its own schema, not a reuse of the weapon Item type.
- `abilitylist` (1,119 creature-scale entries), `disabilitylist` (249), `immunitylist` (149, byte-identical to its Character-scale twin) are **flavor-text lookup tables, not mechanical-effect data**. A creature stores one comma-separated name string per category; the dictionaries are consulted only to fetch display description text. Where an ability does have a real mechanical effect today, it's a hand-coded substring check on the flattened name list (`calcAllCreatureCaracs`, e.g. `.includes("Enhanced Perception")`), not something driven generically by the dictionaries' own value columns (see `UPSTREAM-ISSUES.md` item 10). **This means "port Abilities the way Skills were ported" (a described Item, looked up for display) is a faithful port; making Abilities automatically grant Active Effects would be new functionality beyond what his sheet does, not a like-for-like port** — flagging this distinction because it's exactly the kind of framing that's easy to blur without the audit.
- Powers (`usePower`) are not driven by a shared dictionary the way Abilities are — each is authored per-creature with its own name/uses/self-target/type. Some Powers resolve through the *same* attack-chart threshold fields `handleCreatureAttack` uses, meaning Powers and Attacks aren't cleanly separate concepts in his code.

**Deferred, confirmed out of scope for now:** the EXP/CR budgeting functions (`calcCreatureExp` and its sub-tables) are a creature-design aid, not a play-time mechanic — lower priority than Layers 0-3. The Magiclore2 tab (~10,000 lines) mirrors the same 20+ deferred Layer-4 magic subsystems already deferred for Character; not catalogued field-by-field since Layer 4 as a whole is deferred. The five dynamically-built "Famorian/Evoked" body types are the same "evoke mutations" gap already noted as not-yet-implemented for Character — shared gap, not new scope.

**Open questions logged for a decision before the schema is locked** (tracked as the next step, not resolved by this entry):
1. Ability/Disability/Immunity: plain descriptive Items (faithful port) vs. Active-Effect-granting Items (a capability upgrade beyond his sheet).
2. Powers vs. Attacks: one item type or two, given Powers sometimes resolve through the attack-chart machinery.
3. Whether a creature needs an owner/relationship field for the "tamed creature" case implied by `tame_bonus` in the Affinity formula.
4. The attribute-cap tier reconciliation (`UPSTREAM-ISSUES.md` item 8) is the developer's call, not ours to guess at.

### 2026-09-11 — Creature schema: the three open design calls, resolved

**Decisions**, each the user's explicit call, closing the open questions from the audit entry above:

1. **Abilities/Disabilities/Immunities are plain descriptive items.** They get a name and description field, looked up for display exactly like his sheet does today — a faithful port, not an upgrade. Any future mechanical effect is added later as an explicit, individually-authored Active Effect on that specific item, never generated automatically from the dictionary's `[1]`/`[2]` columns. This matches how Skills already work and keeps the port honest to what his sheet actually does (see the "Ability/Disability/Immunity dictionaries" finding above and `UPSTREAM-ISSUES.md` item 10).
2. **Powers and Attacks are two separate item types.** Even though `usePower` sometimes resolves a Power through the same attack-chart threshold fields `handleCreatureAttack` uses, the two stay conceptually distinct items — an Attack is a weapon or natural-weapon strike; a Power is a limited-use special ability that may, internally, roll against the attack chart. Mirrors his sheet's own separately-authored data for each.
3. **The tamed-creature/owner-relationship concept (the `tame_bonus` term in the Affinity formula) is deferred.** This pass builds the stat-block fields only; owner-relationship modeling (taming, loyalty, etc.) is left for a later pass, consistent with the project's core-first phasing.

**Model choice:** the user picked **Fable** for the real schema/rules implementation (per the working protocol's model check-in). This research-and-decisions pass was done on Sonnet, which the protocol allows for research/planning; the actual `module/data/actor-creature.mjs` and its sheet are Fable's to write. **A conversation window running as Sonnet should not write that code** — hand off to a window running as Fable instead.

### 2026-09-11 — CORRECTION: creature audit findings, checked against the source

The audit entry above was written from two research summaries without being checked line by line. A review pass (run on Opus) checked each of its mechanical claims against `sheet-worker.js` and the HTML. Incidental details, such as how many lines the magic tab runs to, were not rechecked. Most held up: the hand-rolled sheet toggle, the 12 shared attributes and `getAttribSave`, flat resistances with modifiers and the "Immune" check, the 25/28/30 level cap, the attack chart table matching `ATTACK_CHARTS` row for row, the zone ladder and fumble handling, the `|`/`@`/`^` attack encoding, the non-physical attack shapes sized from Endurance, the 45 static body charts matching `BODY_CHARTS` byte for byte, identical immunity lists, and the creature-type enum. The following did not hold up.

**Where the creature code lives.** `rebuildRepeatingBodyRows` (line 178211) and `createBodyAreas` (180208) are *inside* the creature marker section, not outside it, although Character code calls them too. The marker marks where he put code, not what it is used for. `checkTotalWounds` (121709) branches on `creature_type` to pick the **body type** field, not the Endurance field. `rebuildRepeatingBodyRows` means to pick the Endurance field, but it never fetches `creature_type`, so its creature branch never runs (`UPSTREAM-ISSUES.md` item 12).

**Endurance, Hide and Shock are copied into the shared fields.** `handleCreatureFinish` writes the creature's figures to `creature_end`/`creature_hide`/`creature_shock` *and* to Character's `endurance`/`hide`/`shock` (lines 174945-174950). That is how the shared combat header and body code serve both sheets.

**Characteristics, precisely** (`calcAllCreatureCaracs`, 178346; the same arithmetic runs in `handleCreatureFinish`):
- Endurance = the entered figure + the temporary Endurance modifier. Hide = the entered figure. Shock = the entered figure, or "Immune" if it contains "imm", or, if zero, the entered Endurance × 3 (before the temporary modifier).
- Perception = average(INT, WIS, KNW) rounded up with `+.99`, + level, +10 for "Enhanced Perception", +5 each for the skills Smell, Listen and Life Sense, and +5 per ability whose name contains "Sense" or "Sensing" (Life Sense counted once).
- Affinity = average(APP, CHM, SOC), or average(APP, CHM) when Social Class is 0, + **level × 2** (not level), +10 for "Enhanced Affinity", + the tame bonus.
- Fortune = average(AUR, PTY, WIL) + level, +10 for "Enhanced Fortune".
- Then each gets its temporary modifier.
- All three averages use the creature's **as-built** attributes (`new_intelligence` and so on), not its current ones. A temporary change to a creature's Intelligence does not move its Perception. Character works the other way: an effect on an attribute cascades into everything derived from it.

**Attacks.**
- A Touch attack is *not* resolved without a roll. It rolls d20 plus the Agility missile modifier, and touches on 10 or more unless the die shows 1 (`handleTouchAttack`, 67731).
- Only Direct, Gaze and Voice skip the attack chart. Cloud and Cone still roll on it.
- Missile, Glob and Bolt use missile modifiers; everything else uses melee.
- Each attack can carry up to three effect blocks after its main block.
- His creature to-hit arithmetic has a precedence bug that normally wipes the Strength or Agility modifier (`UPSTREAM-ISSUES.md` item 11). The port should follow `handlePhysicalAttacks`, which sums each modifier separately.

**Body charts.** The body type is not the whole story. A creature's body chart is a stored, editable list (`new_bodyarea_list`). The configurator seeds it from `getBodyList` and lets the Game Master add or remove areas, and "Custom" is a body type (lines 22291-22361). The creature schema therefore has to store its own chart, not only a body type to look up. Separately, five insect charts write `Vital:2` without the `x`, which currently gives those areas x1 (`UPSTREAM-ISSUES.md` item 9).

**The ability dictionaries are not just flavour text.** That was true of the creature path only. The racial copies drive a hand-written switch (`setTempRacialAbilities`, 46293, and its disability and immunity twins) that sets a flag per ability and reads `[1]`/`[2]` for hide values, infravision distance and others. The creature path never runs it (`UPSTREAM-ISSUES.md` item 10). The two lists have also drifted apart in names and values. The creature ability list has **1,114** entries (1,119 lines, because 5 keys repeat with identical rows), not 1,119.

**Powers are innate spells and invocations.** A Power is *not* authored independently of any dictionary. `usePower` (177399) looks its name up in the spell dictionary, then the invocation dictionary, and does nothing if it is neither. It casts with the creature's power level, which equals its level, passed in where a caster's Aura (for a spell) or total Piety Control (for an invocation) would go. The side chances his casting code checks are fixed at 100: aura absorption for spells, and bless, blasphemy and divine knowledge for invocations. It uses up a use unless the Power is "Infinite". The attack-chart fields are passed in because attack spells roll on the chart through `doMagicalAttack`, exactly as they do when a Character casts them. It is *not* because Powers overlap with Attacks. The same `usePower` also runs magic-item and divine-item powers.

**Effect on the three design decisions above.** All three still stand:
1. *Abilities as plain descriptive items* fits even better than the original reasoning said. His racial switch *is* per-ability, hand-written mechanics, which is exactly what "an individually authored Active Effect on that specific item" ports to. For creatures, the faithful port is display only, plus the few substring bonuses computed as derived data. One compendium will need a decision on which list's row wins where they disagree.
2. *Powers and Attacks as separate item types* is now clear-cut, since a Power is a spell or invocation rather than a kind of attack. It has a scope consequence: a Power can be stored and shown now (name, uses, whether it targets self), but *using* one needs the spell and invocation engine, which is Layer 4 and deferred.
3. *Tamed creatures deferred* is unchanged.

### 2026-09-11 — Creature/NPC implementation

**Decision:** the creature actor is built as `module/data/actor-creature.mjs` plus three new item types, a sheet of its own, and a creature-only rules module. Implementation ran on Opus, at the user's direction, after the model check-in the working protocol requires.

**What a creature stores rather than derives.** This is the shape of the whole thing: a character *derives* Endurance, resistances and its attack skill from attributes, race and class, while a creature carries them as stat-block figures. So Endurance, Hide, Shock and all five resistances are entered fields with modifier slots, the attack chart is chosen outright, and each skill is a name and a flat percentage. What is still derived: attribute saves and table modifiers (the same functions a character uses), Perception, Affinity and Fortune, the body's areas, encumbrance and the standing combat numbers.

**Sub-decisions, each with its reason:**
- *Skills are a list on the actor, not Items.* A creature's skill is a name and a percentage — "Ambush 55%" — with no content behind it, and recomputing it from attributes would contradict the printed stat block. `parseSkillList` reads his own "Name 45%, Name 30%" format so a block can be pasted in. The cost is that the content switches cannot flag a creature's magical skill, since there is no item to flag; his sheet never filtered creature skills either, so nothing is lost against the original. Revisit if creature skills ever need compendium identity.
- *Abilities, disabilities and immunities are one item type, `trait`, with a category.* They are one shape in his data — three dictionaries with identical columns — so three item types would be three copies of one schema. `value1`/`value2` stay strings because their meaning is per entry, not per column (a damage multiplier of ".5" in one row, a resistance penalty of -10 in another).
- *Attacks and Powers are Items*, per the earlier decision. An attack being an Item is what lets a Bite live in a compendium and carry its own roll button. A creature's attacks in his data are an encoded string (`|` between attacks, `^` between fields, `@` before each of up to three rider effects); that decodes into the schema rather than being stored as text.
- *Perception, Affinity and Fortune are worked out from the creature's ratings, not its modified values*, because his formulas read the as-built attributes. A temporary attribute change therefore does not move them, where for a character it cascades. Faithful, documented at the code, and a one-line change if he wants it to cascade.
- *Where his helper is broken, the port implements the evident intent.* `divideWithMinAndMax` never applies its maximum (`UPSTREAM-ISSUES.md` item 13), so a Bolt's reach is unbounded in his sheet; the port caps it. Same policy as combat phase 1.
- *A called shot halves a creature's damage*, matching the character port and the book, though his creature path does not (`UPSTREAM-ISSUES.md` item 15). This is the one place the creature port deliberately departs from his creature code, on the grounds that one rule should not change meaning depending on who is attacking.
- *Powers are stored and listed but not resolved.* A Power is an innate spell or invocation, so using one needs the spell and invocation engine — the deferred magic phase. The Use button spends a use and says plainly that the Game Master resolves the effect, rather than pretending to cast it.
- *The attack card reuses the weapon card's flag shape*, so Apply Damage and Spend Seconds work on a creature attack with no new wiring.

**Not ported, deliberately:** the EXP/CR budgeting functions (a creature-design aid, not a play-time mechanic), the evoke and Famorian body builders (a gap shared with the character model), the Agility-driven jump table, and the +20 resistance flags that only the character side ever sets.

### 2026-09-11 — CORRECTION: a character's attribute maximum follows his sheet, not the Master's Manual

**What was wrong:** the character model capped each attribute at the *lower* of a Master's Manual tier by title — 23 mundane, 25 mortal, 27 arch-mortal, 30 deity — and the race's own limit. Those tiers came from the book. His sheet does not implement them, and the standing rule is that the sheet wins.

**What his sheet actually does**, in two places:
- The race's limits become the twelve maximums when a race is chosen (`str_tmp_limit` and its siblings, sheet-worker.js:8099). Before a race is picked they stand at 20 (`clearAttributeModifiersFinals`, line 32502).
- `setArchMortalAttributesMax` (line 27549), called once on titling to 11 (line 66140), replaces all twelve with a flat **27**, discarding the racial limits — upwards as well as downwards.

Nothing else caps an attribute by title. There is no deity handler at title 16, and no 23 or 25 tier anywhere. Every assignment to a `*_max` attribute was checked.

**Decision:** `getAttributeCap(title)` is replaced by `getAttributeMax(title, raceLimit)`: the race's limit, or 20 with no race, and a flat 27 from title 11. His code fires the replacement once at exactly title 11 and the value persists; a derived model recomputes continuously, so the port tests "title 11 or more", which reproduces the same resulting state. The book's tiers are gone from the code, and `IMAGINE.attributeCaps` with them.

**This changes play, in both directions.** An arch-mortal of a limited race gains real headroom — a race capped at 18 in Strength could never pass 18 before and now reaches 27. A low-title character of a permissive race is no longer held to 25 by a tier that does not exist in his sheet.

**Found by:** the review pass over the creature audit, not by the character work itself, which is why it survived Layer 0 and combat phase 1 unnoticed. His own comment at the call site says the new maximum is 25 while the function sets 27; that contradiction is his to resolve and is logged as `UPSTREAM-ISSUES.md` item 16.

### 2026-09-11 — Trait content: three packs, and the creature row wins

**Decision:** his ability, disability and immunity dictionaries are extracted into compendium content for the `trait` item type — 1,154 abilities, 249 disabilities and 149 immunities, 1,552 in all, taking the document total from 2,814 to 4,366. Without this the creature actor is unusable in practice: every ability would have to be typed by hand.

**Sub-decisions:**
- *One pack per category, not one pack of traits.* Nineteen names are in two categories at once — Poison, Acid, Aura, Heat, Regeneration, Insanity, Compulsion, Compound Eyes and others are each both an ability and either an immunity or a disability. The importer matches documents by name, so a single pack would silently overwrite one with the other. Three packs (`abilities`, `disabilities`, `immunities`) keep his names intact, which mangling them with a suffix would not.
- *Both of his copies are read, and the creature row wins where they differ.* Each dictionary exists twice, a racial copy for characters and a larger creature copy. 41 shared names carry different rows and 40 entries exist only in the racial copy; the union is built, the creature row is preferred, and every conflict is reported on each run. The creature copy is the larger and more recently extended, and a trait is descriptive here, so what differs is text rather than mechanics. Which copy he considers correct is still his question (`UPSTREAM-ISSUES.md` item 10).
- *The document name is his lookup key, not the canonical name.* "Acid Regeneration" stays the name and carries `canonicalName: "Regeneration(Acid)"`, because the key is what his data references and the canonical name is what his display code shows.
- *Values stay strings.* `value1` and `value2` mean different things per entry — a damage multiplier in one row, a magic-resistance penalty in another — so typing them as numbers would assert a consistency the data lacks.
- *No sourcebook tag.* These dictionaries carry no book or page, and untagged content is always available at the sourcebook level, which is the right default. Guessing a book would make content vanish when a Game Master switched that book off.

**Known limitation:** an availability override is keyed `type:name`, so `trait:Poison` cannot distinguish the Poison ability from the Poison immunity, and forbidding one forbids both. Nineteen names are affected. Splitting the key by category would need a change to the override format, which is not worth it until someone actually wants to forbid one of those nineteen.

### 2026-09-11 — Item sheets for the creature's own item types

**Decision:** creature attack, power and trait get sheets of their own (`module/sheets/item-sheet.mjs`); the other six item types keep Foundry's default. The attack is the one that forced it — three rider effects of seven fields each is not something anyone can author against a default sheet.

**Sub-decisions:**
- *One base class and three small subclasses, each naming its own body template.* ApplicationV2's `PARTS` is static, so varying the body by document type means either overriding the render-parts machinery or having three subclasses. Three subclasses are duller and obvious to read, which is the right trade for a handoff.
- *The core item sheet is NOT unregistered.* Registration is scoped with `types`, so the six types without a sheet of their own keep working normally. Unregistering the core sheet outright — as the actor side does, where every type is covered — would leave them with nothing.
- *Rider effects are edited as collapsible blocks with Add and Remove*, capped at three because three is what his encoded attack string carries. Adding and removing go through explicit actions that rewrite the array, since a form field cannot grow an array on its own.
- *The effect's display number is computed in `_prepareContext`, not in the template.* Numbering a list in Handlebars needs an arithmetic helper, and whether Foundry's environment provides one is not verifiable here. Computing it where the data is assembled removes the question.
- *Descriptions are a plain textarea.* V14 ships ProseMirror as the only built-in editor, but wiring it needs an API this port cannot exercise, and a textarea round-trips the text correctly in the meantime.

**Not verified:** `foundry.applications.sheets.ItemSheetV2` and `foundry.documents.collections.Items.registerSheet` follow the documented symmetry with the actor equivalents, which the repo's V14 notes cover only for actors. Both are unexercised until someone opens this in a real V14 install. Everything else was checked in `tools/item-preview.html`, which renders all three sheets against the same context the classes build, including a real extracted trait.

### 2026-09-11 — Armour by body type: keyed by area name, not by position

**Decision:** which armour slot covers which body area is now generated from his own `getArmorValuesByBodyTypeAndArmor` into `ARMOR_COVERAGE_BY_BODY_TYPE` and `ARMOR_REQUIRES_ITEM` (`module/combat-tables.mjs`), and read through `getAreaArmorSlot` / `getAreaArmor` in `combat/combat-rules.mjs`. Both actor models use it, replacing the flat humanoid-only table they shared. This closes the gap that left every non-humanoid unprotected by worn armour — which mattered little for characters and a great deal for creatures.

**The one deliberate difference from his code.** His function switches on the area's **position** in the body chart and returns an index into the armour row. He matches the family with `includes()`, so one branch serves every chart containing that word, and the charts do not all order their areas the same way. Two branches have drifted out of step with the charts they serve:
- **Snake** is written for [Head, Upper Length, Lower Length, shoulders, arms…], but `Snake(Arms)` runs [Head, Upper Length, Left Shoulder, …, Lower Length, Tail]. From position 2 everything is displaced: a shoulder takes the Lower Torso value.
- **Centaur** has a Mid Torso case, but the Centaur chart has no Mid Torso, so from position 9 a hand takes the Mid Torso value and the barding-gated quarters land a position early.

Porting that positionally would have faithfully reproduced armour landing on the wrong limb. So the port keys by **area name**, taken from the comment he wrote on each case — his statement of what that position was meant to be. The generator cross-checks every case against every chart the branch serves and reports each disagreement on each run; both are logged as `UPSTREAM-ISSUES.md` items 17 and 18.

**Sub-decisions:**
- *Generated, not transcribed.* Eight families of nineteen-odd areas each is exactly the kind of table where a hand-copied off-by-one hides for months. Same rule that caught four bad column maps earlier.
- *Unlisted families get nothing.* Twenty-three of the forty-five body types — Bird, Quadruped, Fish, Giant Spider and the rest — have no branch in his code and take no protection from worn armour. That is his behaviour, not a gap in the port, and the earlier comment claiming otherwise has been corrected.
- *The barding gate is data.* A centaur's quarters and legs, and an arachen's abdomen and legs, take armour only from an item whose name contains "Centaur Barding" or "Insectaur Barding". Extracted as `ARMOR_REQUIRES_ITEM` rather than special-cased in code.
- *`ARMOR_COVERAGE_BY_AREA` stays* as the plain humanoid view, since it reads clearly and is the shape most content is authored against; nothing depends on it now.

**Verified:** regenerating the tables changed nothing that already existed — 217 insertions, no deletions — and all four suites still pass unchanged (derivation 91, creature 121, combat 101, availability 39), confirming the humanoid mapping is equivalent to the flat table it replaced.

### 2026-09-11 — The critical fumble table, ported as data rather than prose

**Decision:** `getCriticalFumble` (sheet-worker.js:26460) is ported as `resolveCriticalFumble`, and `resolveFumble`'s critical branch now reads it instead of returning "the Game Master determines the result".

**What his table is:** a melee critical rolls d100 down nine ten-point bands — hitting a solid object, hitting another target in range, or hitting yourself, each at half, full and double damage — then 91-94 trips, 95-98 trips and takes full damage, and 99 and 100 additionally lose the weapon, thrown 1d20 feet in one of eight compass directions. Those last two bands roll a second d100: under 20 the damage lands normally, otherwise it bypasses armour, and the 100 band stuns for 1d3 seconds before the 1d6+1 needed to stand. A missile critical is always the weapon breaking.

**Sub-decisions:**
- *The consequence is returned as data, not only as text.* `target` ("object", "other", "self" or none), `damageMultiplier` (his half, full and double), `bypassesArmor`, `weaponLost` and `weaponBroken` come back alongside the prose. His sheet could only ever print a sentence, because Roll20 had nowhere to put the rest; here the damage a fumble causes can actually be applied. The text is kept and reads as his does, so a Game Master sees the same thing.
- *Dice are passed in*, as everywhere else in the rules module, so the table is testable without randomness. The two attack paths roll them up front.
- *A caller that omits the new dice still gets a sound result* — the table reads as its first band rather than throwing, which matters because the same function serves both attack paths.

**No upstream defects found:** unlike most of what has been ported lately, this function does exactly what it appears to. The only oddity is that his 99 band tests `critRoll<100` after `critRoll<99` has already been taken, so the 99 band is a single value; that is correct, just written oddly.

**Verified:** 147 combat tests pass, 23 of them new, covering every band, both edges at 10/11, the variant split, the direction lookup and the missile case; the other three suites are unchanged.

### 2026-09-11 — The Lore attack chart is class data, generated from his switch

**Decision:** a class now carries `loreAttackTitle`, the title at which it begins reading the Weapon and Missile Lore attack chart, generated from `getLoreAttackChart` (sheet-worker.js:94897) into `src/packs/named/classLoreTitles.json` and thence into the class documents. The character model derives `combat.loreAttackSkill` from it — the standard chart one level up, once the title is reached — and the combat tab shows it under the attack skill.

**Two tables in his data say when a class gets Lore, and they never agree.** A class row's `attackSkillList` ends "Grandmaster(mastered weapons at 9)", and the switch says Warrior reaches the Lore chart at 6. Comparing all 86 classes: 38 carry both numbers, and they disagree in **every single case** — Archer 3 against 12, Cacophonist 9 against 19. So they are not duplicates of one fact. The call site settles which is which: `setAttackChartsChanges` parses `attackSkillList`, maps Grandmaster down to Master for the standard chart because "cannot set Grandmaster for standard Attack Chart", and then calls `getLoreAttackChart` separately for the Lore chart. The switch governs the Lore chart; the parenthetical is about which weapons are mastered. Only the switch is ported here.

**Sub-decisions:**
- *Generated, not transcribed.* Ninety-two cases with per-class thresholds is precisely where a hand-copied off-by-one hides. Same rule as the armour maps and the column maps before them.
- *A class that never reaches the chart records 0*, rather than being left out, so "this class has no Lore chart" is stated rather than inferred from a missing key. That is true of 51 of the 92 cases.
- *39 of the 86 class documents get a non-zero threshold*, not 41. The switch has two more — Monk and Elemental Dancer — that have no class document at all; Monk is the row with the column defect recorded as item 1, which is why it never built.
- *Derived on the character, not stored.* His sheet keeps a second stored chart (`special_attack_skill`) updated at titling; everything it depends on is already derived here, so storing it would only create something to fall out of step.

**Not ported, and now understood well enough to say why:** the six lore *acquisition* tables (`getWeaponLoreWhen` and its missile, projectile, multi-missile, spell and armour siblings, lines 94997-95884) are a different seam — they decide when the skill itself is acquired and grant combat modifiers, not which chart is read. They are also where seventeen of his title gates are written `=>` instead of `>=` and so never gate anything (`UPSTREAM-ISSUES.md` item 19). Porting them means deciding what the correct gate is, which is his call.

### 2026-09-12 — One name resolver for both armour and shield coverage, and a gap it closed

**What went wrong first.** Keying armour coverage by area name rather than by his positions (the
entry above, "Armour by body type") fixed two families whose positions had drifted. It also
introduced a quieter fault of its own: a body chart does not always spell an area the way the
comment on the case serving it does. His Insectoid charts say `Left Lower Leg` where his case
comment says `Left Shin`, and `Left Mid Claw/Hand` where it says `Left Mid Claw`; his hooved
Humanoid charts say `Left Hoof` where the case says `Left Foot`; `Humanoid(Fish Tail)` says
`Finned Tail` where the case says `Left Thigh`. An exact name lookup finds none of those, so the
area silently took **no worn armour at all** — 22 area instances across eight body charts,
including both an insectoid's mid hands and shins and every hooved character's feet. Here his
position-keyed original was right and the port was wrong, which is the opposite way round from
items 17 and 18.

**Decision:** both tables are now built through one resolver, `chart_area_lookup`, which answers
"what does this chart call the area his case comment names?" in three passes, most trustworthy
first:
1. **exact** — the name appears in the chart, wherever it sits.
2. **normalised** — it appears under different spacing (`Left Foreshin` against `Left Fore Shin`
   on the Centaur chart). Letters and digits only, case folded. Checked across every family and
   chart for collisions before adopting: there are none.
3. **positional** — same position, different words. This is the pass that could hide a
   displacement, so it runs only while chart and branch are still in step and stops for good at
   the first sign they are not. Two conditions end it: his name is already matched elsewhere in
   this chart (so it belongs to that other position — this is what stops `Snake(Arms)`), or the
   chart's own name here is one of his other case labels (so he has a case for it elsewhere —
   this is what stops a plain `Snake`'s Tail being armoured as a shoulder, and Centaur at the Mid
   Torso it does not have).

Every pass-three match is printed on each run, because it is a judgement call rather than a
mechanical one. There are 23, across seven distinct name pairs.

**Sub-decisions:**
- *A merfolk's finned tail does take the thigh slot.* Pass three matches it, which reproduces his
  sheet exactly. It is not the same kind of error as items 17 and 18: a tail is genuinely where
  the legs would be, and nothing lands on an unrelated limb. Already noted for him under item 19.
- *Matching a spelling never invents coverage.* The name is resolved first and the slot looked up
  second, so an area his branch gives no slot still gets none — a Centaur's fore shins resolve by
  spacing and remain unarmoured, as his branch leaves them.
- *The dead keys are gone.* `Mid Torso` under Centaur, and the four Insectoid spellings no chart
  uses, are no longer emitted; the map now contains only names a real chart carries.
- *One resolver, two tables.* The shield table is keyed off the very same position labels —
  his own case comments in `getArmorValuesByBodyTypeAndArmor` — rather than re-deriving his
  assumed chart a second time. One statement of it, used twice.

**Effect:** 106 chart-area instances had no armour slot before; 83 do now, and those 83 are
areas his branches genuinely leave unprotected (tails, wings, pincers, underbellies, and the
shins and feet of the many-legged bodies). 155 combat tests pass, 8 of them new; derivation 99,
creature 121 and availability 39 are unchanged, and all 26 modules parse.

### 2026-09-12 — Shield coverage: his positions are sound except for the same two families

**Decision:** `SHIELD_COVERAGE` is generated from `equipShield` (sheet-worker.js:103777) into
`module/combat-tables.mjs` — family, then shield size, then handedness, giving the list of areas
that shield covers. `unequipShield` needs no table of its own: it simply clears the whole layer.

**The index convention was verified before any of it was written**, because assuming it is what
produced items 17 and 18. His `bodyAreaShieldLayer5[N]` really is the area's 0-based position in
the body chart, the same convention the armour coverage assumes — and it lines up exactly for
Humanoid, Saurian, Insectoid, Arachen, Scethen and Brachara. It does **not** for Snake or
Centaur, where it is displaced by one in precisely the same way, and the same direction, as his
armour branches are. So items 17 and 18 are not confined to `getArmorValuesByBodyTypeAndArmor`:
the same two wrong mental charts were used a second time, in a second function, independently.
His Snake branch is written for a chart running Head, Upper Length, **Lower Length**, then
shoulders; his Centaur branch for one with a **Mid Torso at position 9**. Both are recorded
against the existing items rather than as new ones, since it is the same defect.

**What the table says.** A shield is held in the off hand, so a right-hander is covered down the
left side, and the sizes grow outward from the hand: Buckler the forearm *or* the hand, Small
both, Medium adding the arm, Large the shoulder too, and Body the whole flank down to the foot.
His own Buckler comments name those areas in words ("equip on the right forearm") and agree with
the position labels for every family, which is the cross-check that the decode is right.

**Sub-decisions:**
- *Ambidextrous is right-handed.* His code tests `tempHandedness=="Left"` and takes everything
  else as the other hand, so "Ambidextrous" — a value his racial code really does set
  (sheet-worker.js:49206) — falls into the else branch and wears the shield as a right-hander
  does. Recorded as such rather than invented away.
- *A Buckler is two entries, not a flag.* `Buckler` is held in the hand and `Buckler(Wrist)` is
  strapped to the forearm, which is the choice his `equip_buckler_on_wrist` makes. Two keys read
  better than a flag threaded through the lookup.
- *An Insectoid's Large shield covers no more than its Medium*, because his own comment says so:
  "Insects have no shoulder joints. No changes between medium/large shields."
- *A Snake's Body shield covers its Lower Length and Tail* instead of legs it does not have, and
  a Centaur's reaches the foreleg and fore shin but not the hind. Both are his.
- *An area a chart does not have simply drops out.* A plain `Snake` has four areas and no arms,
  so a shield lands nowhere on it; `Humanoid(Fish Tail)` has no legs, so a Body shield stops at
  the hand and the tail. His code writes past the end of those charts and the writes are
  discarded by his own bounds loop, so this matches.
- *Generated, not transcribed.* Five sizes across five family branches, each mirrored by
  handedness, is 96 lists. Same rule that caught the column maps, the armour maps and the Lore
  chart before it.

### 2026-09-12 — The shield layer on the body, and a double count it removed

**Decision:** `getAreaShield` in `combat/combat-rules.mjs` reads `SHIELD_COVERAGE`, and both actor
models add its result on top of the worn armour at each area. A shield is its own layer, kept
apart from the four armour ones exactly as his sheet keeps `bodyarea*_shield_layer5` apart.

**What it corrected.** A shield's own armour value sits in the **left hand** column of
`armorvalueslist` whichever hand really holds it — his comment at `equipShield` says so outright,
"All shields have at least armor value in area 13 (use this as the basis)". Until now the port
treated an equipped shield as ordinary armour, so that column was read as coverage: every shield
protected the wearer's left hand and nothing else, whatever its size and whichever hand held it.
A left-hander was shielded on the wrong hand, and a Large shield gave nothing to the arm or
shoulder it covers. The models therefore filter shields out of the worn-armour total before
adding the shield layer, or the off hand would be protected twice.

**Sub-decisions:**
- *The shield layer takes no armour damage.* Accumulated damage comes off the worn armour only,
  which is his behaviour: he degrades the four worn layers area by area and clears the shield
  layer wholesale when the shield comes off.
- *Handedness is a field on both actors.* The character already had one, unused and unshown; the
  creature gains one, because his `handedness` attribute is shared by both of his sheets. Blank
  reads as right-handed, which is what his else branch does, and the dropdown says so.
- *The buckler's wrist option sits on the item, not the actor.* His sheet asks once, as
  `equip_buckler_on_wrist`, because only one shield can ever be worn there. A Foundry actor can
  own several bucklers, so the choice belongs to the buckler. Same behaviour, better home.
- *`magicBonus` is a field on armour, not parsed out of a name.* His `getItemPlusInt` reads "+2"
  back out of the item's name; storing it means nothing downstream has to parse a name. On a
  shield his rule is to add the plus and then double the whole value, so a +2 shield of 20 is
  worth 44 — that is his arithmetic as written, and it is reproduced rather than "corrected".
- *Rune modifiers are left unimplemented but not designed out.* His `equipShield` adds
  `Rune Strenghthen` and `Rune Armor` before the doubling. Runes are a deferred subsystem, so
  nothing supplies them; the place they go is where his is.
- *The covered-area list is the family's, not the chart's.* It can name an area a particular
  chart has not got, and can name one area under two spellings, because everything downstream
  asks about areas the chart really has, one at a time. Checked across all 45 charts: no chart
  carries both a spelling and its alias, so nothing is ever counted twice.

**Verified:** 183 combat tests pass, 28 of them new, covering every size, both handednesses,
Ambidextrous and blank, the two drifted families, an area no chart has, the insectoid's equal
medium and large, the magic doubling and the value column. 116 derivation tests (17 new) and 129
creature tests (8 new) cover the assembled body on both actor types, including that the off hand
is shielded once and not twice, that armour damage does not eat the shield, and that a stashed
shield protects nothing. Availability 39 unchanged, 26 modules parse. Both sheets were checked in
`tools/sheet-preview.html` and `tools/creature-preview.html` against a real `Shield(Large/Plate)`
from the armour pack: a right-hander's left shoulder, arm, forearm and hand read 38, being 18
worn plus 20 of shield, and the right side stays at 18.

**Not verified:** anything needing a running Foundry V14 — no such install exists on this machine.
That covers the new fields reaching the database, the handedness dropdown actually writing back,
and the sheet re-rendering when a shield is equipped or unequipped.

### 2026-09-12 — Pain threshold is a signed damage modifier, not a threshold

**Decision:** `applyPainThreshold` ports the first thing his `handleBodyDamage` does to a blow
(sheet-worker.js:71186-71193), and `applyAttackDamage` runs every blow through it before armour
sees it. Both actor types carry `combat.painThreshold` and `combat.highPainThreshold`.

**The name is misleading and his own sheet settles it.** "Pain threshold" sounds like a level a
blow has to clear before it hurts. It is not: the value is simply *added* to incoming damage, and
the note he wrote beside the field reads "reduces or adds to all incoming damage (-/+)". So a
**negative** pain threshold is the tougher character and a positive one the more tender. Porting
it as a floor would have inverted it, which is why the sheet markup was checked and not just the
code.

**Where it lands in the pipeline.** First, above everything: before invulnerability, before
spirit, force and outer kinetic armour, before the magic shield and weaves, and before armour
blocking. Those magical pre-reductions are their own backlog items and are not ported here; the
order they go in is now recorded at the call site so they slot in without re-deriving it.

**Sub-decisions:**
- *The result is not floored.* His is not either — the floor sits further down, after the magical
  pre-reductions — so `applyPainThreshold` can return a negative and `resolveAreaDamage` floors
  it, exactly as his does.
- *The Famorian evoke's extra point is a parameter, not a guess.* `highPainThreshold` takes one
  more point off. Nothing sets it yet, because the evoke system is its own backlog item, but the
  field and the argument exist so the arithmetic is complete and wiring it later is one line.
- *One oddity is reproduced rather than filed.* He decides whether any damage was entered from
  the RAW figure, before the threshold, and then skips armour blocking altogether when there was
  none (`noDamageInput`, line 71188, used at 71284). So a blow of nothing against a positive
  threshold gets through unblocked and the armour takes nothing. It is only reachable when a hit
  lands for zero, so it is carried across as `noDamageEntered` and documented at both ends rather
  than raised as a defect.
- *It is an editable stat on the combat tab*, next to the derived ones, because it is the Game
  Master's dial rather than something derived from attributes.

**Verified:** 195 combat tests pass, 12 of them new, covering both signs, the evoke's extra
point, a missing value, the un-floored negative and the floor that catches it, and both sides of
the no-damage-entered branch. Derivation 116, creature 129, availability 39 unchanged; 26 modules
parse. Both sheets were checked in the preview harnesses with a real value set.

**Not verified:** the field writing back from the sheet, and the note reaching the chat card —
both need a running Foundry V14, which this machine does not have.

### 2026-09-12 — Damage absorption is a pool, and a correction to how a blow of nothing behaves

**Decision:** `absorbDamage` ports the last thing his `handleBodyDamage` does to a blow
(sheet-worker.js:71359-71366), and `blowLands` ports the test that decides whether the blow does
anything at all (line 71322). Both actor types carry `combat.damageAbsorb`.

**Absorption is a pool, not a per-blow reduction.** It takes what it can off the damage *after*
armour has blocked its share and after natural hide, and it is spent by the same amount, so it
wears out across a fight. Both figures are worked from the values before either changed and then
floored at zero, which is his arithmetic exactly. A pool of 10 against four blows of 3 stops the
first three and lets 2 through on the fourth.

**Where the pool comes from is deliberately not ported yet.** His `checkSpiritForceArmorModifiers`
(line 106966) refills it, every time equipment changes, to the better of a `Rune Absorption: +N`
on worn armour and the Game Master's own modifier — and it does the same for force armour, outer
kinetic armour and spiritual armour, each taking the *maximum* rather than stacking. Runes are a
deferred subsystem and the magic armours are their own backlog item, so for now the pool is
entered and spent by hand. Worth noting a real tension in his design for when that lands: the
same attribute is both a derived maximum and a depleting pool, so equipping anything refills it.

**CORRECTION to the pain threshold entry above.** That entry said his `noDamageInput` flag
"skips the armour blocking" so that "a blow of nothing against a positive pain threshold gets
through unblocked". That was wrong, and the port built on it was wrong with it. The guard at line
71322 is `if (!isLost && !noDamageInput)`, and it wraps not just the blocking but the armour
damage, the hide reduction, the absorption **and the store of the final damage**. So a hit that
rolled under 1 does nothing whatever — no wounds, no armour damage, no absorption spent —
however large a positive pain threshold the target carries. The mistake was reading the guard's
extent from the line that opens it rather than from the indentation of what it contains.

`resolveAreaDamage` therefore loses the `noDamageEntered` input it was given an hour ago, and the
rule moves to `blowLands`, called before anything else in `applyAttackDamage`. Two tests that
asserted the wrong behaviour are replaced by four that assert the right one.

**Sub-decisions:**
- *`blowLands` also takes an `isLost` argument*, because the same guard covers it: an area marked
  LOST cannot be hurt. Lost limbs are not modelled yet, so nothing passes `true` — the argument
  is there so the rule is stated where it belongs rather than rediscovered later.
- *The pool is written back on the actor*, and only when it actually changed, so applying damage
  spends it. This is the first thing in the port where applying damage changes something other
  than wounds and armour damage.
- *The chat card reports what absorption took and what is left*, because a pool the players
  cannot see is a pool they will forget.

**Verified:** 208 combat tests pass, 13 of them new, covering an empty pool, a pool larger and
smaller than the blow, an exact match, a missing value, four blows wearing one pool down, and the
ordering against hide. Derivation 116, creature 129, availability 39 unchanged; 26 modules parse.
Both sheets were checked in the preview harnesses with a pool set.

**Not verified:** the pool writing back to the database and the chat note — a running Foundry V14,
which this machine does not have.

### 2026-09-12 — Magical protection, and what an endured blow really does

**Decision:** the pre-reduction block of his `handleBodyDamage` (sheet-worker.js:71249-71272) is
ported as `applyMagicalReductions`, with `isEndured`, `isRebounded` and `getWeaveValue` beside
it. Both actor types carry `spiritArmor`, `forceArmor`, `outerKinetic`, `magicShield` and
`invulnerable`. This completes the damage pipeline: pain threshold, magical protection, armour
blocking, armour wear, hide, absorption, wounds.

**Endured and rebounded blows do nothing whatever.** This is the finding that matters most here,
and it is easy to misread as a reduction. His whole normal pipeline sits in
`else if (!reboundOn && !enduredOn)`, and the branch that catches the other case simply clears
every outcome flag. So an endured blow deals no damage, wears no armour and triggers no effect —
total immunity, not a matter of degree. A "Rebound" item does the same for the five physical
damage types and nothing else.

**Invulnerability is the only one that scales.** A weapon with no magical plus does nothing at
all to an invulnerable target, +1 or +2 does a quarter, +3 or +4 a half, and +5 or better lands
in full. Everything else in the block subtracts, and the floor at zero lands once, at the end,
which is why the order is kept rather than tidied into a sum.

**Sub-decisions:**
- *The endured table is generated, not transcribed*, though it is only ten rows. Nine of his ten
  cases accept a blanket `Enduring All` and the tenth, Obliteration, does not — one missing line
  in ten near-identical cases, which is exactly what a hand copy smooths over. Logged for him as
  `UPSTREAM-ISSUES.md` item 20, and the table picks the line up if he adds it.
- *A weave is counted as hide and then taken back out of the armour total.* His code does both:
  it subtracts the weave up here, then blocks against `tempAreaTotalArmor - weaveValue`. Getting
  only half of that right would have counted magical clothing twice, so the port returns the
  weave it used and the caller removes it from the armour it passes on.
- *A weave is magical CLOTHING so tagged* — all three conditions, matching his test. Armour
  tagged `[Magical Weave]` is worth nothing, and so is unenchanted clothing.
- *The values are entered by hand for now.* His `checkSpiritForceArmorModifiers` sets each to the
  BEST of what worn magic items grant and the Game Master's modifier — the maximum, not a sum —
  reading `[Base Aura:xx]` off a Force Armor item, base Piety off a Spiritual Armor one, base
  aura divided by five off a Kinetic Barrier(Outer), and `Rune Force Armor: +N`. Every one of
  those names belongs to a deferred magic subsystem, so the automatic sources land with those
  subsystems and the fields are the manual path until then. The rule that they take a maximum
  rather than stacking is recorded at the schema so it is not re-derived.
- *Invulnerability reads the weapon's plus from the attack card*, which both the weapon and the
  creature card already record as `damage.magic`.

**Verified:** 240 combat tests pass, 32 of them new, covering each protection alone and stacked,
the floor landing once, the magic shield's bypass exception, all five invulnerability bands, the
nine types `Enduring All` covers and the one it does not, rebound on the physical types only, and
the weave's doubling and its removal from the armour total. Derivation 116, creature 129,
availability 39 unchanged; 26 modules parse. Both sheets checked in the preview harnesses.

**Not verified:** the fields writing back and the chat notes — a running Foundry V14, which this
machine does not have.

### 2026-09-12 — Per-weapon lore, and why it was not blocked after all

**Decision:** Weapon Lore and Missile Lore are ported — the class titles at which they are
acquired, the two per-weapon lists, and what they are worth to an attack. A class carries
`weaponLoreTitle` and `missileLoreTitle`, generated from `getWeaponLoreWhen` and
`getMissileLoreWhen`; the character derives `combat.hasWeaponLore` / `hasMissileLore`, and stores
one comma-separated list of specifically lored weapons for each.

**These were on the blocked list and should not have been.** `PROGRESS.md` had the six lore
acquisition tables blocked behind `UPSTREAM-ISSUES.md` item 19, on the grounds that porting them
means deciding what the broken `=>` gates should have been. Reading the usage properly shows that
is true of only some of them. For Weapon Lore and Missile Lore his code states the rule correctly
in one place — `if ((currentTitle+1)>whenWeaponLoreAcquired)` at line 82558, which for whole
titles is exactly `title >= when` — even though three or four other gates on the same two lores
are written `currentTitle=>whenAcquired` and never gate anything. Where his own code contradicts
itself, the half written correctly states the intent, so no guess was needed. The two lookup
functions themselves are clean; the defect is entirely in the callers. Item 19 now carries a
table of which of the six have a correct gate and which do not — Second Weapon Knowledge and
Multiple Missile Lore have none, and remain genuinely his call.

**What lore is worth**, from the modifier list his sheet builds (lines 82559-82605):

| | attack | damage | speed | skills |
|---|---|---|---|---|
| the general kind | +2 | +4 | -1 | +10% |
| a specifically lored weapon | +3 | +6 | -2 | +20% |

**The specific figures replace the general ones; they do not add to them.** A lored weapon is +3
to hit, not +2 and +3 again. His own comment in `getWeaponSpeedListingAdjustmentForModifier`
settles it — "only give a -1 more, -1 is already accounted for in the general mod" — which makes
a lored weapon -2 in total, and the same reading applies to the rest of the row.

**Sub-decisions:**
- *The lists are stored as he stores them*, one comma-separated string each, and parsed once into
  `weaponLoreNames` / `missileLoreNames`. An array field was tried first and reverted: a text
  field on the sheet cannot write one back, and a string is his shape anyway.
- *Names are matched simplified.* His lists hold the base name, and `getSimplifiedName` strips a
  customised item's `{Base Name}` wrapper, so "Fine {Bastard Sword} of Ice" is lored if "Bastard
  Sword" is listed. Ported as its own function rather than inlined, since other lore types will
  want it.
- *Melee reads Weapon Lore and missile reads Missile Lore, and neither touches the other.* A
  weapon with both kinds of mode gets whichever applies to the mode actually swung.
- *The weapons table marks a lored weapon*, capitalised for a specific lore and lower case for
  the general kind, with the four figures on the tooltip. The panel that edits the lists appears
  only when the character actually has the lore, since the lists mean nothing otherwise.
- *The Lore panel's context is built in the sheet class, not the template*, because joining a list
  and testing two flags at once both need Handlebars helpers whose presence in Foundry's
  environment this port cannot check. Same reasoning as the item sheets' effect numbering.

**Verified:** 270 combat tests pass, 30 of them new, covering the two figure sets, the acquisition
rule at and either side of the title, a class that never acquires it, simplified-name matching,
list parsing, all three melee modes, the missile/melee separation, that specific replaces general,
and that lore reaches the to-hit sum as its own line. 123 derivation tests, 7 new, cover the class
and title deriving the flags and the stored list being parsed. Creature 129 and availability 39
unchanged; 26 modules parse. The sheet was checked in the preview: a Warrior at title 12 holds
both lores, the Bastard Sword is marked specifically and the Dagger generally, and their speeds
differ by the one point that distinguishes them.

**Not verified:** the lists writing back from the sheet and the lore line reaching the chat card —
a running Foundry V14, which this machine does not have.

### 2026-09-12 — CORRECTION: what per-weapon lore actually does in his sheet, and two claims that were wrong

A planning pass over the remaining lore types checked the previous entry's claims against the
source. Two were wrong and one was right for the wrong reason.

**Wrong: "Second Weapon Knowledge and Multiple Missile Lore have no correctly written gate."**
All six lore types have one, and all six sit in `setGeneralCombatModifierDisplay` (line 82451) in
the form `(currentTitle+1)>whenAcquired`. Not one of item 19's seventeen broken gates is inside
that function. So **none of the six is blocked** on deciding what the gate should have been — his
own code states the rule for every one of them. The table in item 19 has been replaced.

**Wrong: the per-weapon lore bonus is applied.** It is not. The numeric path,
`setCombatModifierValues` (82167), only ever assigns the **general** figures — 2 melee, 4 damage,
10% skills — and never reads the lore list at all. The larger per-weapon tier (3 / 6 / 20%) exists
only in the display string. In his live sheet, naming a weapon in a lore list changes nothing but
what the modifier panel prints. Logged as `UPSTREAM-ISSUES.md` item 21.

**Right, but for the wrong reason: the -1 / -2 weapon speed.** The previous entry justified those
from his comment "only give a -1 more, -1 is already accounted for in the general mod". That
comment is stale. The general -1 was deliberately removed, and his reason is at line 82273 — a
character-wide speed modifier cannot tell a melee weapon from a missile one — so his sheet gives 0
general and -1 specific where the panel promises -1 and -2.

**Decision: the port keeps both tiers, and keeps -1 / -2.** It implements what his panel promises
rather than what his numeric path delivers, on the standing policy that where his code defeats its
own evident intent the intent is implemented and the defect recorded. Three things make that the
right call here rather than an invention: the panel is what a player reads and plays by; a
per-weapon lore list is inert under his numeric behaviour, which cannot be the design; and the
melee-versus-missile problem that forced him to drop the general speed modifier does not arise in
this port, which works lore out per weapon and per attack mode. It is a real departure from his
running behaviour and is flagged as such in item 21, with the question put back to him.

**Process note:** this was found by a planning pass for the *next* task, not by the work itself.
The previous entry was written from the display function and the speed function without checking
whether the numbers reached a numeric field — the same class of mistake as reading a guard's
extent from the line that opens it. Worth remembering that "his code says X" needs to name which
of his code paths, given how often the display and the arithmetic disagree in this sheet.

### 2026-09-12 — Projectile Lore, per die, and a second correction to item 21

**Decision:** Projectile Lore is ported. A class carries `projectileLoreTitle` (six of the 92 ever
acquire it, all archer classes); the character derives `hasProjectileLore` and keeps a list of
specifically lored projectiles; `getProjectileLoreDamage` gives the damage.

**It is the odd one of the lore family, in two ways.** It is worth damage **per die** rather than
a flat figure — `getNumberOfDice(damage) × 1`, or `× 2` for a listed projectile
(sheet-worker.js:64990) — so a weapon with flat damage gets nothing from it at all. And it attaches
to the **ammunition**, not the weapon in hand: a bow is lored through the arrow it normally fires,
so `getProjectileForLauncher` resolves the launcher first and the lore list is checked against the
arrow's name. Loring the bow's own name does nothing, which the tests pin down.

**The three name chains are generated, and order is load-bearing.** `isWeaponProjectile`,
`isWeaponLauncher` and `getNormalProjectileFromLauncher` are ordered `includes()` chains — 16, 49
and 49 tests. "Bolted" is tested before "Bolt" so a bolted-leather shield does not read as a
crossbow bolt, and several pairs work that way. They are emitted as ordered arrays and read by
taking the first substring the name contains; turning them into objects or sets would have lost
the ordering and hidden the bug.

**CORRECTION to item 21, the second in two passes.** The previous entry said the per-weapon lore
tier "is never applied numerically" and that it "exists only in the display string". That was read
from `setCombatModifierValues` alone and is wrong. `handlePhysicalAttacks` does apply the specific
tier, and does it by exactly the arithmetic this port uses: it subtracts the general modifier and
applies the specific one (`modMeleeOther-2` then `modWL=3`; `modDamOther-4` then `WLDamMod=6`).
So the design decision that the specific figure *replaces* the general one, previously justified
only from a comment, is now confirmed by his code.

The real defect is narrower: **`MLDamMod` is missing from the damage sum.** Missile Lore's
specific damage is computed, tested and printed in the listing, and left out of the line that
rolls the damage, where `WLDamMod` sits beside it. So a lored bow is told it does +6 and does not.
Item 21 is rewritten around that.

**The lesson, twice now:** "his code does X" needs to name which of his paths. This sheet keeps a
stored-modifier path, an attack path and a display path, and all three disagree about lore. The
previous entry's process note said as much and the entry still got it wrong by checking two paths
out of three. Checking the attack path first is the rule going forward, since that is where play
actually happens.

**Verified:** 291 combat tests pass, 21 of them new, covering the dice count, the ordered name
chains including the Bolted/Bolt pair, general and specific per-die damage, a melee weapon getting
nothing, flat-damage ammunition getting nothing, and a launcher being lored through its arrow
rather than its own name. Derivation 123, creature 129, availability 39 unchanged; 26 modules
parse.

**Not verified:** anything needing a running Foundry V14. The sheet panel gained a Projectile row
but was not checked in the preview this pass — the preview character is a Warrior, which never
acquires Projectile Lore, so exercising it needs a fixture change. Left for Sonnet.

### 2026-09-12 — Hand-authored classes from his Word templates, and the Elemental Dancer

**Decision:** classes his sheet-worker cannot describe are authored in `src/packs/manual/classes.json`
from his own Word class templates, and merged by `build_documents.py` after the generated ones.
The Elemental Dancer is the first, built from "2c, Elemental Dancer.doc" supplied by the user.

**Why a manual layer is needed at all.** `classtitledict` and `goalupdict` hold 92 classes;
`classRequirementsAndDetails` holds 88. Five classes — Elemental Dancer, Elementalist, GME,
Inquisitor, Summoner — exist in the first two and in no row of the third, so the document builder,
which keys off the requirements dictionary, silently produced nothing for them. That is why the
class count has been 86 all along while his switches carry 92 cases. Logged as
`UPSTREAM-ISSUES.md` item 22.

**Sub-decisions:**
- *His sheet-worker still wins where it has a value.* The titles come from `classtitledict`, the
  goal attributes from `goalupdict`, and the four lore titles from his switches. The Word template
  fills only what his code does not carry. Every disagreement is recorded in the entry's own
  `_notes` as well as in item 22.
- *A manual entry never overwrites a generated one.* If he adds the missing rows, the generated
  class wins and the manual entry is reported as `manual-class-redundant` on the next build. That
  keeps this from becoming a fork of his data.
- *Provenance travels with the entry.* Each carries `_document` naming the file it came from and
  `_fromSheetWorker` listing which fields came from his code instead. Keys beginning with `_` are
  stripped when the document is built, so none of it reaches Foundry.
- *`advancement.classSkills` is a new field*, parallel to `titles`, holding the skills gained at
  each title. His `classtitledict` carries only the title NAMES, so this is empty for all 86
  generated classes and filled only from the Word templates. Without it the most substantial part
  of the template — a fifteen-row skill progression — would have been dropped on the floor.
- *Angle-bracketed skills are kept verbatim.* "<1st Kinesis>", "<Lore Type>", "<Call of Element>"
  and "<2nd Kinesis>" are placeholders his template resolves from a per-element table, and that
  table is preserved in the description. Resolving them into six element-specific variants would
  have invented six classes he did not write.
- *The Dancer Extension table is preserved as prose only.* Core-skill thresholds and
  racial-maximum attribute requirements have no home in the class schema, and inventing an
  extension model for one class would be the wrong order to do that work in.

**The two disagreements**, both resolved his code's way: `goalupdict` says the goal attributes are
Strength and Agility while the template's Goal Advancement line says Strength and **Will Force**;
and `classtitledict`'s fifteenth title is "One with the Element" where the template writes "One
with `<Element>`". The first is a real rules difference and is the one put back to him.

**A cross-check worth recording because it held:** the template lists Weapon Lore as a title 8
class skill, and `getWeaponLoreWhen` independently returns 8. Two sources written years apart
agreeing is good evidence the generated lore tables are being read correctly.

**Verified:** 87 class documents now build, up from 86, and the total is 4,367. 300 combat tests
pass, 9 of them new, covering the new class's attack progression at every step and the
title-8 Weapon Lore boundary. Derivation 123, creature 129, availability 39 unchanged; 26 modules
parse. Monk remains unbuilt for a different reason — item 1's column defect — and is not addressed
here.

### 2026-09-12 — Off-hand fighting: audit before schema design (no code written)

A research pass over the two-weapon subsystem, so the eventual build starts from fact. Nothing is
implemented. Following the rule adopted after item 21, the **attack path was read first**.

**The consumption model is small and clear.** `handlePhysicalAttacks` picks one of three tiers per
weapon, from three per-weapon flags (`weaponN_offhand`, `weaponN_2weapknow`, `weaponN_2weaplore`):

```js
if (weaponN_offhand=="on") {
    if (weaponN_2weaplore=="on")       { offHandPenalty=0; offHandDamMod=0; }          // Lore: no penalty at all
    else if (weaponN_2weapknow=="on")  { offHandPenalty=offhand_2nd_weapon_tohit; ... } // Knowledge: reduced
    else                               { offHandPenalty=combat_mod_tohit_offhand; ... } // neither: full
}
```

So Second Weapon **Lore** in a weapon removes the off-hand penalty entirely, **Knowledge** buys it
down, and without either the wielder takes the full base penalty. The tiers are per weapon, not
per character.

**The base penalty is three Agility-banded tables** — `getOffhandMeleeAdj`, `getOffhandDamageAdj`
and `getOffhandSkillAdj` (sheet-worker.js:83305-83370). All three return 0 for an **Ambidextrous**
character, which is the whole mechanical payoff of that racial ability. **The three do not share
band edges** — the melee penalty reaches 0 at Agility 19, the damage and skill penalties at 20, and
the damage table singles out 16 and 17 individually where the others do not. That is precisely the
shape that a hand transcription smooths over, so they are to be generated.

**Buying the penalty down.** Second Weapon Knowledge gives `skillChance / 20` levels, each worth
one point of to-hit and damage back and 5% of skills, never past zero (line 83188). Second Weapon
Lore gives `skillChance / 20` levels capped at 5, each worth one **extra off-hand second** — and
zero if Ambidextrous, who need no extra time (line 83242). So both read the character's own skill
percentage, which means this subsystem depends on skills resolving to a number on the actor.

**Neither is blocked.** Both gates in those two functions are the broken `=>` form, but both have a
correctly written twin in `setGeneralCombatModifierDisplay` (82620 and 82657), so the intended rule
is `title >= when` as with the other lores. See the corrected table in `UPSTREAM-ISSUES.md` item 19.

**What the port already has:** handedness on both actor types (added for shields), Agility and its
modifiers, the ten-second round tracker, and skills as items with computed chances.

**What it does not have, and what needs deciding before code:**
1. **What an "extra off-hand second" means in Foundry.** His sheet stores a number and leaves the
   rest to the table. It could be a discount on the off-hand attack's cost, or extra seconds of
   action in the round. The tracker spends seconds per action, so either is expressible; they play
   very differently and this is the one real design question.
2. **Three new booleans on the weapon item** — off-hand, second-weapon-knowledge,
   second-weapon-lore — mirroring his per-weapon flags.
3. **Whether declaring an off-hand attack is a weapon property or an attack option.** His model is
   a stored per-weapon flag; an attack-time choice would suit Foundry better but departs from him.

**Estimate:** comparable to the shield and per-weapon-lore passes combined. Two natural halves:
the base penalty (tables, handedness, the weapon flags, the full-penalty tier) and then the two
skills that buy it down. Splitting them keeps each commit testable.
