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
