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

#### RESOLVED 2026-09-12 — the three questions above, answered by the user

**1. What an "extra off-hand second" means: a discount on the off-hand attack's cost.**
The user's framing is sharper than the question was: *ambidexterity functionally overrides two-weapon
fighting, because an ambidextrous character does not lose time fighting with the off hand.* So the
direction is settled — **fighting off-handed COSTS seconds**, and that cost is what the subsystem is
about. Second Weapon Lore's up-to-five levels each buy one of those seconds back; an Ambidextrous
character never pays the cost, which is why his code grants them zero levels. That is a non-need, not
a penalty. It is **not** extra general action time in the round: the seconds attach to the off-hand
attack specifically, so they cannot be spent on anything else.

**2. Off-hand is DERIVED, not stored — and this is simpler than his model.**
The user's answer replaces the question rather than picking from it: *a weapon is tagged on the combat
page as **left, right or both***. That is a three-state hand assignment, not the boolean
`weaponN_offhand` his sheet carries. Combined with `handedness`, which **both actor types already
have** (added in the shield pass, where a right-hander is covered down the left side), off-handedness
falls out of the data:

> a weapon is off-hand when its hand is not the wielder's dominant hand; an Ambidextrous wielder has
> no off hand, so the penalty tier never applies.

This removes a stored flag rather than adding one, keeps a longsword from needing re-editing when it
changes hands, and **reuses a field already built and tested** rather than introducing a parallel one.
"Both" is the two-handed case, which already means something to the damage rule (a Strength bonus is
doubled two-handed), so the tag has to feed that path too rather than being read only by the off-hand
code.

Second Weapon **Knowledge** and **Lore** stay per-weapon properties, as his sheet has them and as the
five already-ported lore types are — only the hand assignment moved.

**3. Model: Opus**, per the project's model-choice protocol.

**What this changes about the estimate.** Item 3 of the Sonnet note ("three booleans on the weapon
item") is now wrong and must not be built as written — it is **one three-state hand field plus two
lore booleans**, and the off-hand boolean is deleted from the plan entirely. The note is corrected
where it sits.

### 2026-09-12 — Three of the six remaining item sheets, not six

The board carried "Item sheets — three of nine done", which reads as six outstanding and a job
two-thirds finished. Reviewed properly, **three of the six should be built and three should stay on
Foundry's default sheet** until something actually authors against them.

**Field count is the wrong ranking.** Race has the most fields of the six (36) and the least demand
for a sheet; equipment has the fewest (9) and needs one least of all. What decides it is whether the
type carries **nested or variable-length structure**, because that is what the default sheet renders
as an unusable dump — the same reason the creature attack got a sheet and the power and trait got
simpler ones.

**Build these three:**

1. **Class — the strongest case, and it is not about fields.** There is a live authoring workflow:
   the Elemental Dancer was hand-authored from his Word class template into
   `src/packs/manual/classes.json` (80 lines for one class), and **four more classes are known to
   need the same treatment** — Elementalist, GME, Inquisitor and Summoner, which appear in his
   `classtitledict` and `goalupdict` but have no `classRequirementsAndDetails` row at all
   (`UPSTREAM-ISSUES.md` item 22). That work is currently done by hand-editing raw JSON. It is the
   only one of the six with a known, recurring, already-happening authoring need. It also carries
   three `ArrayField`s — `advancement.titles`, `advancement.classSkills`, `classMods` — and
   variable-length arrays are exactly what the default sheet handles worst.
2. **Armour — the structural case.** `coverage` is a `SchemaField` of **19 body locations**, each a
   plain number, which the default sheet renders as nineteen stacked inputs named
   `system.coverage.shoulderLeft` and so on. It wants a body-shaped grid, laid out in the charts'
   own order rather than alphabetically. Homebrew magic armour is common in play, and `magicBonus`
   became a real field in the shield pass.
3. **Race — two 12-wide grids.** `attributeMods` and `attributeLimits` are twelve numbers each and
   must be laid out in his canonical attribute order (str agl vit int wis knw app chm soc aur pty
   wil), not alphabetically, or the sheet stops matching every other attribute display in the
   system.

**Leave these three on the default sheet:** weapon, skill and equipment. They are broad but flat —
equipment is nine plain fields — and Foundry's default sheet renders flat fields acceptably. Building
sheets for them now would be three sheets of busywork against content that is read far more often
than it is written. **The trigger to revisit is authoring, not field count:** if hand-authored
weapons start landing in `src/packs/manual/` the way classes have, the weapon sheet earns its place
that day.

**Why this is recorded rather than just done:** "nine item types, three done" invites a future pass to
finish the set for symmetry. The set should not be finished for symmetry. Six sheets was never the
goal; sheets for the things people author was.

### 2026-09-12 — The character sheet cannot show 19 fields the model carries, and languages are unwired end to end

The board's remaining-tabs row read "combat, magic, journal — combat needs the event-time round
implemented". Checked against the code, **two of those three are wrong**: the combat tab is built
(`templates/actor/tab-combat.hbs`, a PART on the sheet since phase 1) and the event-time round is
implemented (the ascending-initiative tracker in `module/combat/combat-document.mjs`). Magic is
correctly deferred to Layer 4. "Journal" was never the right name for what is actually missing.

**What is actually missing is coverage.** The character sheet has four tabs — attributes, skills,
combat, equipment — and the model carries whole groups none of them render:

| Group | Fields | Reachable on the sheet? |
|---|---|---|
| `physical` | 12 | **1 of 12** — only `handedness`, and only because the shield pass needed it |
| `wealth` | 7 | none |
| `languages` | array of `{name, speak, write}` | none |
| `identity.tendencies` | 1 | none |

So **19 scalar fields and one variable-length array** are in the schema, validated, saved to the
database, and impossible for a player to see or edit. A character cannot record their height, eye
colour, age, money or languages. This is a defect rather than a backlog item, and it is the last gap
in character-sheet coverage.

**Languages are worse than unreachable — they are unwired end to end.** `module/config-tables.mjs`
already carries `spokenLanguages` and `writtenLanguages` as the first two columns of the Intelligence
table, extracted from his data. **Nothing reads either column.** The table is sitting there unused.

**What the fractional values mean, settled from his code rather than guessed.** The progression is
0 through rating 3, then 0.25, 0.33, 0.33, 0.66, then 1 from rating 9, rising to a plateau of 10.
A quarter of a language invites a guess; his code makes it unnecessary. `lang_sheet` is switched
between hardcoded named blocks (49257-49560): `lang_quarter_spoken`, `lang_third_spoken`,
`lang_two_third_spoken`, `lang_one_spoken`, then `lang_one_spoken_third_written`,
`lang_one_spoken_two_third_written`, `lang_one_spoken_one_written`, `lang_two_spoken_one_written`,
and on up.

Read off that ladder the rule is unambiguous:

> Below 1, the figure is **partial fluency in the character's native tongue**, not a fraction of a
> second language — a very low-Intelligence character does not speak even their own language fully.
> At 1 and above it becomes a **count** of languages. Writing always lags speaking: a character has
> one spoken and a third written before they have one of each.

**This is the skills inflation pattern again**, exactly as `DATA-MODEL.md` §1 describes it — Roll20
cannot render a variable count, so he hardcoded one block per combination and reveals the matching
one. It does not port. In Foundry it is the `languages` array plus a derived
`(spokenAllowance, writtenAllowance)` pair off the Intelligence table, with a sub-1 allowance
displayed as partial fluency.

**Scope call:** the tab is mechanical and goes to Sonnet. **Wiring the cap is not part of it** — it
belongs to the Attributes module (Epic 2, Backlog), which is where every other Intelligence-derived
value will land, and putting it on the tab instead would scatter the derivation. The tab renders the
allowance if it exists and simply omits it until then.

### 2026-09-12 — Off-hand fighting, first half: the hand field, the three tables, the full penalty

The base penalty is built — the first of the two halves the audit pass proposed. The second, the two
skills that buy the penalty down, is not started.

**One three-state field replaced two contradictory booleans.** The weapon item carried `twoHanded`
and `offhand`, both under "carried state", and **neither was ever populated from his data** — they
appear nowhere in `build_documents.py` and nowhere in the 594 built weapon documents. They were
wielding state all along, and two booleans can say something a hand cannot do: held in both hands
*and* in the off hand. `hand: "right" | "left" | "both"` cannot express the contradiction. The
Strength damage rule now reads `hand == "both"` where it read `twoHanded`, which is the same fact
from one source instead of two. `offhand` turned out to be dead — declared, never read anywhere.

**Off-handedness is derived, never stored:** a weapon is off-hand when its hand disagrees with the
actor's `handedness`, which the shield pass had already added and tested. An **Ambidextrous** wielder
has no off hand at all, because all three of his penalty functions short-circuit on handedness before
they look at Agility (83307, 83331, 83351). That matches the user's framing exactly — ambidexterity
is the absence of the cost, not a bonus on top of it.

Note a deliberate asymmetry that is *his*, not ours: `getShieldAreas` lets "Ambidextrous" fall
through its else branch and read as right-handed, while the penalty tables short-circuit it to zero.
Both behaviours are preserved and the asymmetry is commented at both sites so neither looks like a
slip.

**The three tables are generated, and they do not agree.** `banded_chain()` in
`extract_combat_tables.py` reads a banded `if/else if` chain into ordered `[min, max, value]` rows,
and all three off-hand tables are emitted as `OFFHAND_PENALTIES`. The generator checks band
contiguity over 1..30 and reports gaps rather than leaving holes; all three came back clean. **Melee
reaches zero at Agility 19, damage and skills at 20, and only the damage table breaks out 16 and 17
as single values** — exactly the divergence a hand transcription smooths away, which is why the audit
insisted on generating them. Agility 19 is the test that proves it: melee 0, damage -1, skill -5.
Rows outside every band return zero, which covers both his `<=0` branch and the open top of each
chain without special-casing either.

**The finding worth carrying forward: his function name lies.** `getOffhandMeleeAdj` reads as
melee-only and is not. His `offHandPenalty` appears in **both** `totalmods` branches — the missile one
at sheet-worker.js:64804 and the melee one at 64806 — so a bow drawn in the wrong hand is penalised
exactly as a sword swung in it is. Gating this on melee, which the name invites, would have quietly
made every off-handed archer better than he intended. This is a porting trap rather than a defect in
his code, so it is recorded here and at the call site rather than in `UPSTREAM-ISSUES.md`.

**Deliberately left stubbed.** The "knowledge" tier resolves and is reported, but does not yet buy
anything down: Second Weapon Knowledge gives `skillChance / 20` levels (83188), which needs skills
resolving to a number on the actor. Until that lands, a weapon with Knowledge and no Lore pays the
full penalty — which is his own behaviour for a character whose skill has not yet reached one level,
so the stub is correct rather than merely incomplete. The tier is still reported so the seam is
visible in the returned object.

**The tag is on the combat page, as three buttons rather than a dropdown.** The user asked for the
selection to live there, so it does — a Hand column on the weapon table with L / R / 2H, and a
derived "off" marker beside a weapon that is in the wrong hand for this character. Buttons because an
ApplicationV2 `data-action` is dispatched from a **click**: a `<select>` would need its own change
binding, which cannot be verified without a running V14, while buttons take the identical path
`rollWeaponAttack` already uses.

**A gap in the preview harness was found and closed on the way.** `tools/sheet-preview.html`
duplicates the sheet's weapon-row builder rather than calling it, because
`ImagineCharacterSheet.#buildWeaponRows` is private. So the new fields rendered blank there while
being perfectly correct in the sheet — the harness had silently stopped exercising what it appears
to. Both new fields were added to the duplicate and a comment now says it must be kept in step. The
preview's dagger is tagged to the left hand so the off-hand path is actually exercised rather than
merely available.

**Tested:** 330 combat tests pass, **39 of them new** across the hand field, the derivation, the three
tables' differing edges, the tier precedence and the missile path. Derivation 123, creature 129 and
availability 39 are unchanged; 26 modules parse with no syntax errors. The combat tab was checked in
the preview against a real derived character: the sword reads right-handed and clean, the dagger
left-handed and marked off-hand, and the active-hand styling resolves.

**Not verified:** everything needing a running Foundry V14 — that clicking a hand button actually
writes back to the embedded item and re-renders, and that the modifier reaches the chat card. No V14
install exists on this machine.

### 2026-09-12 — A race's movement figures are modifiers on an Agility base (CORRECTS the entry below)

**The entry that follows this one is wrong on its central claim, and is kept only so the mistake is
legible.** It says fourteen races "genuinely have no usable movement in his data" and blames the
preview sheet's zeros on him. Both halves of that are false. This entry replaces it.

**What is actually true.** His race movement columns are **modifiers on a base drawn from Agility**,
not finished rates. `calcMovement` (`sheet-worker.js:30856`) switches on Agility and adds:

```js
setAttrs({move_walk_hourly: 2+racetmpwalkhourly+tmpwalktemphourlymod});
//                          ^ base for this Agility
//                            ^ the race's modifier
```

A race carrying `0/0/0` — Human(Civilized) among them — therefore has **no modifier** and moves at
the full base for its Agility. The port was copying the modifier straight through as the finished
rate, so every such race rendered as unable to move. **The bug was ours from the start.**

**How it was caught.** The user asked whether the rulebooks could supply the missing figures. Reading
the Player's Guide p.36 turned up not a list of per-race rates but *two* tables — "Base Walking /
Jogging / Running Distance" by Agility, and a separate "Racial Movement Modifiers" — and his
Human(Barbaric) row is that second table's `+1/+10/+1`, `+2/+20/+2`, `+2/+30/+3` exactly. Nine out
of nine. That reframed the zeros before a line of code was written.

**The standing conflict rule did not have to be invoked**, which is worth noting: the book and the
sheet agree completely here. All 42 base values the Player's Guide prints match his switch to the
digit, including the irregular jog at Agility 5 — 2 miles but only 10 feet and 1 foot.

**Decision: generate the base table, do not transcribe it.** 23 bands × 11 values is exactly the
volume where hand-copying smooths away the irregularities that matter, which is the same reasoning
that produced the off-hand penalty tables. `movement_bases()` in `extract_combat_tables.py` parses
it out of `calcMovement`. His code contains **two** copies of the table — one for races with a speed
multiplier and one without — and the extractor parses both and compares them; they agree exactly,
which is a stronger check on the parse than any assertion written by hand.

**Decision: a speed multiplier of 0 means ×1.** His own comment in `calcSpecialMovement` says so:
*"most races are 0 (this makes the multiplier 1"*. 103 of 105 races carry 0. Treating it as a literal
zero would have stopped every one of them dead — the same class of error as the one being corrected.

**Decision: apply the book's floor for negative rates, which his sheet does not implement.** The
Player's Guide (p.36) reduces a negative rate to 1 mile / 10 feet / 1 foot. Elf(Sea) and Elf(Ice)
carry a `-10` speed multiplier that his code multiplies through unguarded, giving them roughly -50
miles an hour. The floor is applied here and the `-10` is logged for him as `UPSTREAM-ISSUES.md`
item 24. Only a *negative* rate is lifted; a rate that lands on zero honestly stays zero, which is
what his sheet shows at Agility 0-1.

**What this cost.** An upstream issue was filed against his data, with a table of fourteen races and
a note that the Civilized Humans were "likely the most-played races in the game". It was wrong, and
it asked him to fix something that was never broken. It has been withdrawn in place rather than
deleted. The failure was reading a zero as an absence without first checking what his code does with
it — the data was examined closely and the code that consumes it was not.

---

### 2026-09-13 — The five kinds of special movement do not share a formula

Finishing the other half of the movement work. `movement.special` now resolves, so a Centaur's
Gallop is a distance rather than a blank row. All 26 races that have a special rate produce one, and
none of them lands on zero.

**The formula is per-kind, not universal.** The handoff note had said `base × multiplier + mod` for
all of them, which would have been wrong for four of the five:

| Kind | Shape | |
|---|---|---|
| Fly, Gallop, Swim | `(base × M) × S` | |
| Scurry | `((base × M) + mod) × S` | **the only kind that uses the additive** |
| Slither | `base × M` | no additive, and **no speed multiplier** |

Slither also **replaces** ordinary movement rather than adding to it — his code zeroes walk, jog, run
and both jumps after resolving it: *"Slither is the only movement sssssnake people have"*, *"Snakes
can`t jump"*. That is why it is a table of shapes in `combat-rules.mjs` rather than one expression.

**A third base-rate name exists: `INT`.** Magical flight reads the Intelligence attribute rather than
any movement rate. The earlier handoff note had explicitly said to stop and report if a third name
appeared rather than mapping it by guess; it appeared, in two races.

**Decision: depart from his live code for magical flight, and say so loudly.** His INT line applies a
literal 30 / 30 / 3 on top of the race's own multiplier. Three independent things say that is a slip:
the two Mephyt races carry per-scale multipliers of 0.75 / 30 / 3 where every other race's are
uniform, and those are already a coherent set on their own; his extra literals would make the
ten-second rate a hundred times the one-second rate, which nothing else in the system does; and the
version commented out directly above that line is the multiplier alone. Logged as
`UPSTREAM-ISSUES.md` item 25 for him to settle — it is one line either way.

**This is a case the standing conflict rule does not cover.** "The sheet wins" settles
sheet-versus-rulebook. Here his code disagrees with his own data and his own commented-out line, and
there is no rulebook in it at all. Recorded because the next intra-sheet contradiction will want the
same treatment: follow the reading that the data supports, implement it in one place, and hand him
the evidence rather than the conclusion.

**The negative floor had to be extended.** Applying it to walk, jog and run was not enough — Elf(Sea)
is a Swim race, so its -10 speed multiplier dragged the swim rate to -150 miles an hour. Caught by
running the resolver over all 105 real races rather than by the unit tests, which used synthetic
fixtures and all passed. Worth remembering: the fixtures agreed with each other and with me.

**Then the floor turned out to be the wrong instrument for it.** The user pushed back on the result,
and they were right to: flooring left a **sea** elf swimming at 1 mile an hour, slower than it walks.
A number that is no longer absurd is not the same as a number that is right, and the floor had made
the first look like the second.

Looking again at the column rather than the symptom settled it. `speedMultiplier` is `-10` for
exactly two races and `0` for the other 103, and those same two are the only Elves of eleven with **no
disease-resistance modifier** — a value sitting in a column nobody uses, beside an empty cell every
sibling race fills. **Decision: ignore a negative speed multiplier rather than floor it.** The ground
is narrow and does not depend on the mis-keying being true: a multiplier scales a rate, it does not
reverse its direction, so a negative one is not a quantity this system has a meaning for. Sea and Ice
Elves now move like any other Elf, and a Sea Elf swims walk × 3 exactly as Merfolk does.

The floor stays, because it is a real published rule and is honestly reachable — a Civilized Dwarf at
Agility 5 goes under it on walking modifiers alone. It is simply no longer load-bearing for these two.
The mis-keying itself is *not* acted on: correcting a disease resistance on an inference is his call,
and the evidence rather than the conclusion is what went to him in `UPSTREAM-ISSUES.md` item 24.

**The lesson worth keeping:** a clamp that turns a wrong number into a plausible one hides the
question instead of answering it. The floor was a legitimate rule applied to an illegitimate input,
which is the most comfortable kind of mistake to leave in place.

---

### 2026-09-12 — Special movement is a formula, not a number, and the port copies it through as text

> **Superseded in part.** The claim below that the preview zeros were his gap is wrong — see the
> entry above. The relative-rate mechanic it describes is real, but the formula it gives
> (`base × multiplier + mod`) is **not uniform across movement kinds**; the corrections are recorded
> at the end of this entry.

The user noticed the preview sheet showing Walk and Jog at 0/0/0 and asked that it be fixed in the
long run. The test sheet was the symptom; there are two causes underneath it, and only one of them
is ours.

**It is not the harness.** `setMovementFromRace` (actor-character.mjs:691) does run, and the preview
does call `prepareDerivedData()`. The zeros are real, and they are correct — the preview character is
a **Human(Civilized:Village)**, one of fourteen races that genuinely have no usable movement in his
data. That half is `UPSTREAM-ISSUES.md` item 23, verified against his raw 62-column rows so it is not
a column-map slip on our side.

**The half that is ours: every special rate in his sheet is written relative to another rate.**
`special.hourly` does not hold a number. It holds the NAME of a base rate — `"Walk"` or `"Run"` —
with `hourlyMultiplier` and `hourlyMod` sitting beside it, and the same three fields again for
`tenSec` and `oneSec`. The rule is:

```
special rate = <the named base rate> x multiplier + mod
```

| Race | Special | Reads as |
|---|---|---|
| Apocritara, Avian, Gryphara | Fly | Walk × 4 |
| Djinn, Gremlin | Fly | **Run** × 3 |
| Centaur | Gallop | Walk × 4 |
| Brachara, Elf(Sea) | Swim | Walk × 3 |
| Arachen | Scurry | Walk × 4 **+ 4** hourly, **+ 40** per ten seconds |

**26 of the 105 races use it**, and the base rate is not always Walk — Djinn and Gremlin fly from
Run, and Arachen carries a non-zero additive on top of the multiplier, so neither the base nor the
`+ mod` can be assumed away.

**The race side already models this correctly and the data is intact.** `item-race.mjs` declares
`special.hourly` as a **StringField** holding the base-rate name, with `hourlyMultiplier` and
`hourlyMod` as numbers beside it, and the same trio again for each scale. Its own comment says the
multiplier and modifier fields exist "because some races derive their special rate from another rate
rather than stating it outright" — so the mechanic was understood when the schema was written.

**Where it stops is the character.** `_prepareMovement` (actor-character.mjs:697) loops over
`["walk", "jog", "run"]` only, then copies `specialName`, `jumpStand` and `jumpUp`. **It never
assigns `movement.special` at all**, so the character's special rate sits at its schema default of
zero forever. The character's own `special` is a plain `movementRateField()` of three NumberFields,
which is the right shape for a *resolved* rate — the resolver is simply absent.

The visible symptom is therefore a **Gallop row of 0 / 0 / 0** on a Centaur, not the word "Walk":
`specialName` is copied, so the row appears and is labelled, and then reads as motionless. The data
was extracted correctly and modelled correctly; only the derivation step is missing. This is a port
gap, and it is why the two findings looked like one problem from the outside.

**Decision:** resolve the formula in `setMovementFromRace` rather than at display time, so the
derived model holds real numbers and every consumer — sheet, chat card, future travel rules — sees a
distance rather than a word. Walk, jog and run stay straight copies; only `special` is resolved.
Handed to Sonnet with the mechanic written out, since the judgement was the diagnosis and what
remains is arithmetic: `docs/sonnet/2026-09-12-special-movement.md`.

**CORRECTIONS to the above, from reading `calcSpecialMovement` (sheet-worker.js:32110) in full:**

1. **"Walk, jog and run stay straight copies" is wrong** — they are the Agility base plus the race's
   modifier. See the entry above. This is now implemented and is what fixed the preview sheet.
2. **The `+ mod` term is not universal.** It applies to **Scurry only**. Gallop and Swim multiply
   with no additive; Slither multiplies with neither an additive nor the race speed multiplier, and
   additionally **zeroes walk, jog, run and both jumps** — *"Slither is the only movement sssssnake
   people have."* Writing one formula for all five kinds would have been wrong for four of them.
3. **There is a third base-rate name: `INT`.** Magical flight reads Intelligence directly and, per
   his comment, *"never has a multiplier, even for speed"*; the hourly and ten-second rates are
   `× 30` and the one-second `× 3`. Two races use it. The handoff note had said to stop and report
   if a third name appeared rather than mapping it by guess — it appeared.
4. **A special multiplier of 0 also means ×1**, by the same sentinel rule as the speed multiplier.

**A near-miss worth recording.** Seven race names came back from the console looking corrupted —
`Se'eth` as `Se?eth`. Checked before reporting: the character is `0x2019`, a typographic apostrophe,
correctly stored. It was the console's rendering, not the data. That is the second misread caught by
checking this session, after the syntax-check harness's module count, and both would have gone into
the record as defects that do not exist.

### 2026-09-12 — Where a design document and the shipped code disagree, the code wins

**The standing conflict rule had a gap.** `CLAUDE.md` settles Roll20-sheet-versus-rulebook: the sheet
wins. It says nothing about *our own* design documents versus *our own* shipped code, and that
case has now occurred.

`docs/DATA-MODEL.md` was written on 2026-09-10 as a design pass, before the sheet-worker had been
read end to end. It still described itself as "Proposal for review — not yet implemented" while
both schemas it proposed had in fact been built, and two of its statements had gone stale in a way
that would mislead rather than merely lag:

- **§9 step 2** documented the Master's Manual attribute-max tiers, 23 / 25 / 27 / 30 by title.
  Those were removed from the code on 2026-09-11 (see "CORRECTION: a character's attribute maximum
  follows his sheet") because nothing in his sheet implements them. The doc was still teaching the
  rule the code had deliberately rejected.
- **§1's source table** listed *Mysteries of the Planes* as a book not in hand, and drew a "~36% of
  skills come from books we don't have" conclusion from it. The book has since been extracted; the
  real figure is ~20%, across three books.

**Decision:** `DATA-MODEL.md` now carries an explicit precedence note in its header — read it for the
*reasoning*, read the code for the *rule* — and both drifts are corrected **in the doc, not the
code**. Nothing shipped changed in this pass. The document's job from here is to explain why the
model looks the way it does; it is no longer a specification anything is built from.

**Why this matters more than tidiness.** This project is handed back to the dev, who will read the
docs before the source. A design document that confidently states a rule the code rejected is worse
than no document, because it reads as current. The four `CORRECTION:` entries above exist because
the same failure mode keeps recurring in the code; this is the first time it has been caught in the
prose.

**Also reconciled:** of the doc's six open questions, four were answered by work done between
2026-09-11 and 2026-09-12 without anyone going back to close them out — sourcebook gating is content
only, the creature schema is separate and leaner, his flattened attribute tables are followed, and
saves-versus-skills turned out to use two different rules exactly as question 4 had guessed. A fifth
is partly answered. **The one that is still genuinely open — "is `sheet-worker.js` current?" — has
grown teeth:** when it was written it guarded ~7,000 unextracted rows, and it now sits underneath
4,367 built documents and every combat rule in the system. It stays on the board as blocking Epic 6,
and it is the one question here worth putting to the dev directly.

### 2026-09-14 — Off-hand fighting, second half: the Knowledge buy-down, and a genuine blocker on Lore's seconds

The two remaining lore-title tables generated cleanly (`get2ndWeaponKnowWhen`, `get2ndWeaponLoreWhen`
into `classLoreTitles.json` beside the existing five, following the pattern exactly), giving
`secondWeaponKnowTitle` / `secondWeaponLoreTitle` on the class item. 22 of 92 classes ever reach
Second Weapon Knowledge, 19 of 92 reach Second Weapon Lore.

**Eligibility and the skill's own chance are two different things, and both are now real.** A
character derives `hasSecondWeaponKnowledge` / `hasSecondWeaponLore` from class + title exactly as
the other four lores do (`hasLore`). But unlike those, holding the discipline is not binary — the
skill's own resolved percentage decides how much it buys back, so a new step,
`_prepareOffhandSkills()`, runs immediately after `_prepareSkills()` and reads a named skill's
`totalChance` straight off the actor's embedded items. It could not live inside `_prepareCombat`,
which runs *before* `_prepareSkills` in `prepareDerivedData()` — items are prepared in title/class
order and a skill's `totalChance` is not finished yet when combat derives. Rather than reorder
existing derivation (risking something else depending on the current order), this is a small
step of its own, immediately after skills. Not eligible reads identically to no skill at all: zero,
whether the reason is a missing title or a missing item.

**The buy-down itself matches his sheet exactly** (`setSecondWeaponKnowValues`,
sheet-worker.js:83152-83198): `floor(chance / 20)` levels, each buying back one point of melee and
damage penalty and 5% of skill penalty, off the *same* banded tables the full-penalty tier reads —
his code seeds `tempOffHandToHit` etc. from `combat_mod_tohit_offhand` and its siblings before
subtracting the levels, which are exactly `getOffhandMeleeAdj` and its siblings. The reduction can
cancel the penalty but never turns it positive (`if (tempOffHandToHit>0) { tempOffHandToHit=0; }`,
three times over) — floored at zero on all three figures independently, not just when all three
would cross at once.

**Second Weapon Lore's seconds discount is genuinely blocked, and this is a finding rather than
something to invent.** The half-two note asked to work out where an off-hand attack's seconds cost
comes from before writing the discount, and to stop and raise it if his sheet never charges the
extra second anywhere. It does not. Every reference to `offhand_2nd_lore_seconds` was checked:
it is computed once (`secondWeaponKnowLevels` for Lore, capped at 5,
sheet-worker.js:83242-83250), stored, and read back exactly once — into the *display* string
`"2nd Weapon Lore[...](Offhand Seconds): +N"` at line 82666. **It is never subtracted from a
weapon's speed, an attack's cost, or anything the round tracker touches.** This is the same shape
as `MLDamMod` (`UPSTREAM-ISSUES.md` item 21) — a value computed, shown, and mechanically inert —
except here there is no base cost anywhere in his sheet for the discount to reduce. The RESOLVED
design answer ("fighting off-handed COSTS seconds, and ambidexterity is the absence of that cost")
gives the *direction*, but not the number: what does an un-bought-down off-hand attack cost, in
seconds, that five levels of Lore reduce to nothing? His sheet never picked one, so this port
cannot invent one without it being exactly that — invented, not ported. **Left open, put to the
user rather than guessed at.** Nothing was built for it; `resolveOffhandPenalties`'s "lore" tier
still removes only the to-hit/damage/skill penalty, matching what his code actually executes for a
Lore-flagged weapon.

**Creatures do not use any of this** (`2026-09-12-offhand-planning.md` item 4, now answered).
`handleCreatureAttack` (sheet-worker.js:179717-180022) was read in full: no reference to off-hand,
second weapon, or hand at all. Structurally this could not be otherwise — a creature's ten attack
slots are an encoded string of named attacks, not weapons assigned to a hand, so "which hand" has
no meaning for a creature attack in his model. The creature-branch code inside
`setGeneralCombatModifierDisplay` that reads `getCreatureSkillChance(..., "Second Weapon Knowledge")`
is display-only and feeds the same dead-end `offhand_2nd_weapon_tohit` path characters use, which a
creature's attack resolver never reads. The creature model needs no `hand` field and no port of any
of this.

**Verified:** 335 combat tests pass (5 new: the buy-down at 0%/20%/39%/60%/100% chance, pinning the
floor and the "never past zero" rule independently per figure). 173 derivation tests (11 new:
title eligibility below/at/above threshold, chance zero with no skill, chance zero when eligible
but untrained, the real chance coming through once both eligible and trained, and that Knowledge
and Lore read two separate named skills). Creature 129 and availability 39 unchanged; 26 modules
parse. The sheet preview was reloaded and shows no console errors; it needed no changes, since the
buy-down only affects roll-time numbers in `attack.mjs`, not anything the weapon-row builder shows.

**Not verified:** anything needing a running Foundry V14 — that the computed chance actually reaches
a live roll and that the off-hand-flagged weapon's to-hit/damage change on the chat card. No V14
install exists on this machine.

### 2026-09-14 — The description tab: 19 fields and a language list, made reachable

Built the fifth PART the earlier finding called for. `templates/actor/tab-description.hbs`, a
`description` entry in `PARTS` and `TABS` on `ImagineCharacterSheet`, and the label in `lang/en.json`.
Nothing about the mechanism is new — it follows the four existing PARTs exactly, and the languages
array reuses the creature attack's rider-effect pattern (an indexed row, Add/Delete actions that
replace the whole array, plain `name="system.languages.{{index}}.field"` bindings for everything
else, which `submitOnChange` writes back on its own).

**Layout groups the four things by kind, not by field count.** Physical Features (eleven fields:
height, weight, frame, hair, eyes, skin, body covering, age, apparent age, maximum age — every one
of `physical`'s fields except `handedness`), Wealth (four currency numbers plus gems/jewelry/special
as free text), and Languages sit as three `.panel`s in the same `.panel-row` the race sheet already
established for this kind of dense plain-field editing; Tendencies sits above them as a single row,
next to Alignment's role in the header. `handedness` was deliberately left on the Combat tab and not
duplicated — it drives shield coverage and off-hand resolution, so it belongs beside what reads it.

**The Intelligence language allowance is rendered, not computed.** `this.attributes.int.mods` already
carries `spokenLanguages` / `writtenLanguages` for every rating, because `_prepareAttributes` copies
the whole matching row out of `ATTRIBUTE_TABLES` generically for every attribute — nothing new was
wired for this tab. The line is guarded by `{{#if}}` and simply does not print if the value is ever
absent, exactly as the finding specified: this tab renders what exists, and wiring the cap itself
stays the Attributes module's job (Epic 2, Backlog).

**No new Handlebars helpers.** The lore panel had already established the pattern of precomputing
booleans and joined strings in the sheet class rather than templating `{{#if (or a b)}}`, because
whether Foundry's environment ships those combinators cannot be checked from here. Nothing in this
tab needed even that — every conditional is a single value or an `{{#each}}`, so the template stays
inside what the preview harness's own helper stub (`eq`/`gt`/`lt`/`gte`/`localize`) already proves out.

**Verified:** all four suites unchanged (combat 335, derivation 173, creature 129, availability 39) —
expected, since nothing here is new derivation, only new surface on values that already existed. 26
modules parse. The tab was checked in `tools/sheet-preview.html` against a real derived character
with every new field given a genuine value rather than left at a schema default — including the
Intelligence line reading "4 spoken, 2 written" off her actual rating, which is the check the note
asked for specifically: "not a hand-typed stub, which is how a field that never populates goes
unnoticed."

**Not verified:** anything needing a running Foundry V14 — that the Add/Delete language buttons
write back to the actor, and that the fields in general persist. No V14 install exists on this
machine, and the preview harness does not wire `data-action` clicks at all (nor does any of the
sheet's other action-driven UI, which carries the identical caveat already).

### 2026-09-14 — A character's Skills tab shows the class skills around its current title

`docs/sonnet/2026-09-12-elemental-dancer.md` item 3, built. `getClassSkills(title)` on
`item-class.mjs`, parallel to the existing `getTitleName(title)` — same 1-based indexing, same
"outside the range" empty-string return. The Skills tab shows three rows around the character's
current title (one below, current, one above) when the class has anything recorded, and nothing
at all otherwise, which is what 85 of the 87 classes do — his `classtitledict` never carried the
skills gained at each title, only the title names, so `classSkills` is empty for everything built
from the sheet-worker and populated only for classes hand-authored from a Word template.
Angle-bracketed placeholders ("`<1st Kinesis>`", "`<Call of Element>`") are shown exactly as
written rather than resolved or hidden, since resolving them needs the element the player chose,
which lives nowhere in the schema yet.

**Verifying this needed the real Elemental Dancer document, not a hand-typed stub**, and the sheet
preview's existing character is a Warrior with nothing to show. Rather than swap her class and
risk destabilising every other fixture built around her (weapons, lore flags, the attack card), a
second, minimal render was added lower on the same preview page: the real `classes.json` entry for
Elemental Dancer, at title 7, through the same `tab-skills.hbs` template. This reuses the pattern
the shield pass already accepted for weapon rows — `#buildClassProgress` is a private static
method on the sheet class, so its dozen lines are duplicated in the harness with a comment to keep
it in step, rather than making it non-private to suit a test, which would have been inconsistent
with every other `#build*` helper on the class.

**One rendering trap, caught by an unexpectedly collapsed `<div>`:** the preview's own CSS is
`.tab { display: none; } .tab.active { display: block; }`, and only the elements inside `#tabs`
ever get `.active` toggled by the tab-switching script. The second render landed in its own
`#ed-check` container outside that script's reach, so the section rendered — 1,613 characters of
real HTML — at a height of exactly 0. Fixed by adding `.active` to the rendered `.tab` by hand
right after inserting it.

**Verified:** the real Elemental Dancer document at title 7 shows titles 6, 7 and 8 with their
real class skills, title 7 marked current; the Warrior fixture shows no panel at all
(`buildClassProgress(...).show === false`, asserted and silent). All four suites unchanged
(combat 335, derivation 173, creature 129, availability 39 — expected, since this is presentation
of an already-existing field) and 26 modules parse. `tools/item-preview.html` was also reloaded,
since `item-class.mjs` changed, and shows no console errors.

**Also closed in the same pass, `docs/sonnet/2026-09-12-elemental-dancer.md` item 4:**
`Beguiler`'s row is a full 22 columns, unlike Monk's, so item 22's parsing-defect explanation does
not apply. Its `description` and `classType` cells are simply transposed against every other
class's pattern (index 9 is always the long paragraph, index 10 the short type, and Beguiler has
the two swapped) — a one-row data-entry slip, filed as `UPSTREAM-ISSUES.md` item 27 rather than
silently reordered.

**Not done, and blocked on source material, not on effort:** items 1 and 2 of the same note —
authoring Elementalist, Inquisitor and Summoner from their Word templates (GME is confirmed a
Game-Master stand-in, not a playable class, per the comment already on `skillSlotsNeeded`), and
filling `classSkills` for the 85 other generated classes. Both need documents this session does
not have.

### 2026-09-14 — Lore corrections, item 1 done; item 2 turned out to be a real gap, not a UI question

**Item 1, the chat card's lore note, is built.** `damage.lore` and `damage.projectileLore` were
already computed and flagged; the card's damage breakdown now shows both, with `damage.loreSpecific`
distinguishing the general tier from a weapon named in the list. The to-hit contribution needed no
new code at all — `getToHitModifiers` already pushes a `{label:"Lore", value:N}` entry (and an
`{label:"Off Hand", value:N}` one) onto the list the attack-line already iterates generically, so
both were showing on the card before this pass touched anything.

**Item 2 was framed as "mirror the panel, or decide it does not belong."** Checking properly found
a third answer: **his sheet applies a real numeric Weapon/Missile Lore bonus to creature attacks,
and the port does not.** This is not the display-only question the note anticipated.

`setCombatModifierValues` (sheet-worker.js:82167) branches for a creature exactly as it does for a
character, at lines 82266 and 82294: `getCreatureSkillChance(tmpCreatureSkillList, "Weapon Lore")`
(and "Missile Lore"), and if the creature's chance is non-zero at all, `whenWeaponLoreAcquired=1`
against `currentTitle=tmpCreatureLevel` — which is true for a creature of any level once it has the
skill, with no title threshold the way a class has one. That sets the same
`tempmeleemodweaponlore=2` / `tempdamagemodweaponlore=4` / `tempmodskillweaponlore=10` a character
gets, into `combat_mod_melee_other` and `combat_mod_missile_other`. **`handleCreatureAttack`
(179717) reads both of those fields directly** — they are in its own `getAttrs` list — so a
creature that lists "Weapon Lore" or "Missile Lore" among its skills really does fight with the
general bonus in his sheet.

`module/combat/creature-attack.mjs` has no reference to `getLoreModifiers` or the `LORE_*`
constants at all. `combat.hasWeaponLore` / `hasMissileLore` are derived on the creature model
(`_prepareCombat`, `actor-creature.mjs:509-510`) and used for exactly one thing — choosing
`loreAttackSkill`, the Lore attack chart — never for a numeric bonus.

**Why this is not fixed here.** A creature has no per-weapon lore list the way a character does
(there is nothing in his creature data resembling `weapon_lore_list`), so only the general tier
could ever apply — but a creature's ten attack slots mix melee, missile and shaped attacks (touch,
gaze, cloud, bolt...) with different to-hit paths already, and deciding how a flat "this creature
has Weapon Lore" fact should reach each of those without a specific `getLoreModifiers`-shaped
mechanism is a design question, not a mechanical extension of the existing pattern. Left for a
proper pass with the same care the character-side lore work got, rather than wired in quickly to
close out a checklist item.

**`docs/sonnet/2026-09-12-lore-corrections.md` item 2 is rewritten** to record this rather than
its original framing, and is no longer a Sonnet-tier item.

**Item 3** (the `speedSpecial` sweep) is unaffected by any of this and is built separately — see
below.

**Verified for item 1:** 335 combat tests unchanged (no new rule logic, only a new field on an
already-computed object and a template change); the chat card was checked by hand against the
existing `damage.lore` / `damage.projectileLore` shapes already produced by
`getLoreModifiers`/`getProjectileLoreDamage`, both covered by existing tests.

### 2026-09-14 — Item 3 done, and a real drift found in the preview's duplicated weapon-row builder

`docs/sonnet/2026-09-12-lore-corrections.md` item 3: confirmed a `speedSpecial` weapon's displayed
speed is unaffected by lore. `#buildWeaponRows` on the sheet class is private, so this could not be
tested from `tools/combat-test.html` at all — the note's own "Done when" named the wrong file. The
sheet preview is the only place that logic runs, so a real Garrote (`speedSpecial: true`) was added
to the preview's weapon list, specifically lored (added to `weaponLoreList` alongside the Bastard
Sword, which already carries a real -2 speed modifier from that lore), and its rendered speed
column checked: it reads **"Special"**, not a number, exactly as a plain unlored Garrote would.

**Found on the way: the preview's own duplicate of `#buildWeaponRows` had already drifted from the
real one.** The comment beside it says "kept in sync" is required; it had not been. The real sheet
class adds the weapon's own lore speed modifier into `getWeaponSpeed` (`tmpspeedmod +
tmplore.speed`); the preview's copy passed `character.combat.weaponSpeedMod` alone, silently
dropping the lore term for every weapon rendered there — which is exactly how a field that never
populates goes unnoticed, the same principle the description-tab pass was built around. Fixed to
match. This means the Bastard Sword's displayed speed in the preview was wrong (too slow by the 2
seconds her Weapon Lore should have bought back) until this pass, though `tools/combat-test.html`'s
own coverage of `getWeaponSpeed` and `getLoreModifiers` was never affected, since neither of those
pure functions had the bug — only this one duplicate call site did.

**The sample chat card was also a hand-typed stub for lore**, built before Weapon Lore or off-hand
fighting existed: it called `getToHitModifiers`/`getWeaponSpeed` without their `lore`/`offhand`
parameters at all and hand-assembled a `damage` object with no `lore` field, so item 1's new
chat-card line would have rendered against this stub with nothing to show — passing by omission,
not by proof. Rewired to compute the sword's real lore contribution with `getLoreModifiers` and
feed it through to-hit, speed and damage exactly as `attack.mjs` does, so the card now shows a real
`+6 lore (specific)` on the damage line and `Lore +3` on the to-hit line, both reflecting the
character's actual Weapon Lore rather than a value that was never wired.

**Verified:** all four suites unchanged (335/173/129/39 — this was presentation and a preview-only
fix, no rule-layer change), 26 modules parse. The preview was reloaded and its Garrote row confirmed
"Special", the Bastard Sword and Dagger rows confirmed real lore-adjusted numbers, and the chat
card confirmed both its to-hit and damage lines now carry the sword's real lore contribution.

### 2026-09-14 — Projectile Lore's remaining items: exercised, tested, and one cross-check that
turned out to have no data to check against

`docs/sonnet/2026-09-12-projectile-lore.md`, items 1 through 4.

**Item 1, the Lore panel with all three rows, and item 2, the chat card's projectile damage
line, both confirmed with a real Archer** rather than the Warrior fixture, who never acquires
Projectile Lore. Archer's own titles (weapon 12, missile 3, projectile 7) all land at or before
title 12, so a single character genuinely holds all three at once — the exact case item 1 asked
for — built as a second, isolated render on the sheet preview, the same pattern the Elemental
Dancer class-progression check established: `#buildLorePanel` is a private static method, so its
half-dozen lines are duplicated with the same "keep in sync" comment, fed by the real `hasLore()`
rule function against the real Archer document's title fields rather than hand-typed booleans.
The rendered panel reads "Weapon, Missile, Projectile" and the projectile input carries
`Arrow(Long Bow/Normal)`, both from real data. Item 2's line was actually already built as a side
effect of the lore-corrections pass two entries above — `{{#if damage.projectileLore}}` sits in
the same span as the weapon-lore line — so this pass exercised it rather than writing it: a real
`Bow(Long)` attack, resolved through the real `getProjectileLoreDamage`, shows
**"+10 projectile lore (2/die)"** on the chat card, and the bow's displayed speed (2) correctly
shows the general Missile Lore -1 absorbed by the weapon's own minimum speed of 2 — a real,
if unglamorous, confirmation that Projectile Lore carries no speed term of its own (its return
shape has no `.speed` at all, unlike Weapon/Missile Lore) and that the two subsystems compose
correctly on one weapon.

**Item 3, the derivation tests, mirror the existing Weapon/Missile Lore block exactly**: title
eligibility below, at and above the threshold; independence from the other two lores; a class
holding all three; the stored list parsed into names; an unset list reading empty. `makeCharacter`
gained `projectileLoreList` in its `extra` fixture, matching the pattern already there for the
other two.

**Item 4 turned out to have no data to cross-check at all, which is itself the finding.** The
proposed check was whether the six Projectile-Lore classes are the same six whose `skilldict`
entries include a "Projectile Lore" skill. `skilldict` carries exactly **one** "Projectile Lore"
skill document, generic and undifferentiated (attr, rating, category "class"), with no
class-specific association anywhere in it — his skills are drawn from category-wide slot
allowances, not a per-class list of named skills. The only place a class-to-skill mapping exists
at all is `advancement.classSkills`, which is empty for all 86 classes his own data builds and
populated only where a Word template has been hand-authored (Elemental Dancer, so far) — and none
of the six Projectile-Lore classes has one. So the comparison the note proposed cannot be run with
data that exists today; this is neither an agreement nor a disagreement to record, but an absent
premise, and is recorded as such rather than forced into one of the two boxes the note offered.

**Verified:** derivation 180 (7 new), combat 335 unchanged, creature 129 and availability 39
unchanged, 26 modules parse. Sheet preview reloaded clean, both new isolated renders (the Lore
panel and the Long Bow's chat card) checked against their real computed values.

**Item 5** stays blocked on the developer's answer to `UPSTREAM-ISSUES.md` item 21, as before.

### 2026-09-14 — Off-hand fighting's last two blockers, both answered by the developer

The two questions raised at the end of the second-half pass -- what an off-hand attack costs in
seconds before Second Weapon Lore's levels reduce it, and whether creatures take an off-hand
penalty at all -- were put to W. Michael Tenery III directly, since neither could be answered from
his sheet. Both came back:

> "If you are not ambidextrous you only get 5 seconds to use in your off hand. An extra second in
> your off hand means you get an additional second, so 5 becomes 6 seconds in your off hand. If
> you are ambidextrous this does not apply as you are already getting 10 seconds in each hand.
>
> Creatures do take off hand penalties (if they use off hands like an off hand claw attack), unless
> they have the Ability: Ambidextrous, or Omnidextrous."

**The 5-second figure is real and independently confirmed in the Player's Guide** ("Timing in the
Combat Round", p.178): "A character is only allowed 5 seconds (half of the 10 second round) to
perform actions in his off hand. The exception to this is ambidextrous characters, who are allowed
the full 10 seconds for both hands." The Second Weapon Lore skill entry (p.14463) matches too: "the
non-ambidextrous practitioner can use the weapon faster in the off-hand... For each 20% of the
skill, the practitioner gains 1 additional second. The off-hand bonus cannot cause the total time
to exceed 10 seconds." This resolves the earlier finding cleanly: his sheet was never missing a
base cost to discount from (`docs/DECISIONS.md`, "second half" entry above) -- the base cost is a
fixed rulebook constant a player tracks by hand, and `offhand_2nd_lore_seconds` was only ever the
sheet's way of telling them how many extra seconds that constant grows to. Nothing in his sheet
subtracts it from anything because there is nothing computed to subtract it FROM.

**Built as `getOffhandSecondsCap(handedness, secondWeaponLoreChance)`** in `combat-rules.mjs`: 5 by
default, `+ min(5, floor(chance/20))` for Second Weapon Lore, 10 outright for Ambidextrous (matching
`setSecondWeaponLoreValues`, sheet-worker.js:83242-83250, which writes 0 extra seconds for an
Ambidextrous character rather than the level count -- so returning 10 directly, instead of 5 +
levels, is the same answer by the more direct route). Wired into `_prepareOffhandSkills()` on the
character model, right beside the `secondWeaponLoreChance` it consumes, and shown on the Combat tab
next to Weapon Speed. **This is exposed as a cap, not enforced as a pool.** The book's own worked
example (p.27824-27851, Orgo's rapier and longsword) and its rule about losing off-hand seconds
proportionally to a bad initiative roll both describe a resource a player tracks through a round,
which would mean new per-combatant, per-round state on `ImagineCombat` (`combat-document.mjs`
currently tracks nothing but `initiative`) -- an architecture-locking addition the model-choice
protocol says to raise before building, not decide alone mid-pass. Exposing the computed number
follows the same precedent as `damageAbsorb`: give the player the figure, let them spend it by
hand, same as his own sheet does (it computes and displays the discount; it never subtracts
anything from a round tracker of its own either). **Round-tracker enforcement is left open, to
raise with the user rather than build unasked.**

**Creatures DO take the penalty -- overriding, not contradicting, the earlier finding.** The prior
entry ("Creatures do not use any of this", the second-half write-up above) was correct about what
`handleCreatureAttack` actually contains: zero references to off-hand, second weapon, or hand, and
no `hand` field anywhere on his creature attack encoding. That finding stands as a fact about his
code. It does not, it turns out, describe the whole ruleset -- this is the developer adding a rule
his sheet never automated for creatures, not a correction to a misreading. His own creature ability
dictionary already supports it: `"Ambidextrous"`, `"Fully Ambidextrous"` and `"Omnidextrous"` are
real entries there (all three inside the `@MARKER CREATURE SPECIFIC FUNCTIONS BELOW` section), and
all three carry the identical mechanical description -- "10 seconds... and no penalties" -- just
over a different span of limbs (`Ambidextrous`: the primary pair; `Fully Ambidextrous`: all limbs;
`Omnidextrous`: every limb independently). That a creature could be built with one of these
abilities while its attacks structurally had no way to read it was the gap; the abilities were
never the gap.

**Built by extending the already-tested character pattern rather than porting anything,** since
there is nothing on the creature side to port:
- `item-creature-attack.mjs` gains a `hand` field, `"" | "left" | "right" | "both"`. Blank is not a
  fourth hand -- it means "not hand-based at all" (a bite, a tail slap, a breath), and is load-bearing:
  a weapon's `hand` defaults an unset value to `"right"` (`isOffhandWeapon`'s `tmphand ?? "right"`),
  which would misread every blank creature attack as a left-of-right-handed off-hand strike if fed
  through unguarded. The call site in `creature-attack.mjs` only asks `resolveOffhandPenalties` at
  all when `tmpa.hand` is truthy, sidestepping the default rather than changing it -- `isOffhandWeapon`
  keeps its existing, tested behaviour for weapons untouched.
- `actor-creature.mjs` derives `combat.offhandHandedness` in `_prepareCombat`: `"Ambidextrous"` when
  the trait list contains "Ambidextrous" or "Omnidextrous" (a substring check catches "Fully
  Ambidextrous" too, since it contains "Ambidextrous"), else the creature's own stored
  `identity.handedness` (blank reading as right-handed, as it already does for shield placement).
  The ability wins outright rather than deferring to a stored handedness, since that field is only
  ever about which side a shield covers -- a creature could plausibly have both set at once (Left
  for its shield, Ambidextrous for its attacks) and both should be honoured on their own terms.
- `getCreatureToHitModifiers` / `getCreatureDamageMods` in `creature-rules.mjs` gain an `offhand`
  parameter, mirroring the character-side `getToHitModifiers`/damage functions exactly (a plain
  labelled entry in the generic modifier list, so the chat card's `{{#each mods.list}}` shows it for
  free, the same way Lore's line needed no template change).
- `creature-attack.mjs` computes `resolveOffhandPenalties(tmpa, agility, offhandHandedness, 0)` once
  per attack (guarded by `tmpa.hand`, as above) and feeds `.melee` into to-hit and `.damage` into the
  damage roll. The `0` for Second Weapon Knowledge chance is deliberate: creatures have no
  per-attack Knowledge/Lore item flags to buy the penalty down (unlike a character's weapon), so it
  always resolves to the plain Agility-banded `"full"` tier once it applies -- `resolveOffhandPenalties`
  needed no change to behave this way, since a creature attack's `system` object simply has no
  `secondWeaponLore`/`secondWeaponKnowledge` fields for it to find.
- The Combat tab's attack table gained the same L/R/2H hand picker and "off" tag the weapon table
  has, plus a fourth "not hand-based" option the weapon picker does not need (a weapon is never
  handless). The item sheet gained a matching Hand field.

**Verified:** combat 345 (10 new, on `getOffhandSecondsCap`), derivation 184 (4 new, the cap at
various Lore chances and handedness), creature 139 (10 new: 6 on `offhandHandedness` under
blank/stored/Ambidextrous/Fully Ambidextrous/Omnidextrous/override-vs-stored, 4 on the `offhand`
parameter reaching both creature modifier functions), availability 39 unchanged, 26 modules parse.
`tools/creature-preview.html`'s duplicated `#buildAttackRows` (the same "keep in sync" duplication
already caught drifting once this session, in the weapon-row builder) was updated alongside the
real one and reloaded: the Cave Wyrm's Claw was given a left hand for the fixture, and with the
wyrm's blank handedness reading right-handed, the Combat tab shows it tagged "off" with the hand
picker showing "L" selected, and Bite/Tail Slap/Frost Breath/Withering Gaze all show no tag with
"—" selected, exactly as attacks with no hand at all should. The character sheet preview's Combat
tab shows a new "Off-Hand Seconds: 5, of the round" box next to Weapon Speed. The item sheet preview
shows the new Hand field on Frost Breath, correctly defaulted to "Not hand-based".

**Not verified:** anything needing a running Foundry V14. Also not built, and deliberately left
open rather than decided alone: whether the off-hand seconds cap should become an enforced,
spendable pool on the round tracker -- see the note under the seconds-cap section above.

### 2026-09-16 — The Skills module's four open items, and one that was already done

`docs/PROGRESS.md`'s Skills row listed five things outstanding. **Item 5 was stale and is now
corrected: `getSlotsNeededForClass` is already extracted** -- `class_skill_slots_needed()` has been
in `tools/extract/extract_combat_tables.py` since the class pass, and every one of the 87 class
documents carries `skillSlotsNeeded` (Acrobat 42, Assassin 56, and so on) with the field on
`item-class.mjs`. Nothing was rebuilt; the row was wrong, not the code.

**Duplicate skills are rolled once per copy, best taken.** Player's Guide, "Duplicate Class and
Racial Skills": a character may hold the same skill both racially and as a class skill, and then
"a skill roll can be made for each multiple of the same skill, and the best roll can be chosen",
with his own worked example of a Civilized Human Rogue's Move Unseen -- a failure beside a success
is a success, and a critical beside an ordinary success may be taken as the critical. **The copies
do not share a chance**, since each carries its own bonuses, so each is resolved against its own
and only then compared; `pickBestSkillRoll` therefore takes resolved results rather than one chance
and a handful of dice. Ranking is by outcome in `SKILL_OUTCOMES` order, and where two rolls share
an outcome the wider margin is named the chosen one -- that tie-break is presentation only (two
ordinary successes do the same thing) and is commented as such. Every roll is shown on the card,
not just the winner, because the book leaves the choice with the player.

**His sheet does not contradict this.** Its only duplicate handling is a guard at selection time
that refuses the same skill twice *within* the racial list (sheet-worker.js:7017, "A duplicate
skill was selected. Nothing done."), which is compatible with the book: no duplicates inside a
category, duplicates across categories rolled twice.

**The slot tricks are ported at his rates, from his four conversion functions**, not from the
book's prose: racial buys a class slot one for one (52649) or two social slots (52336), and two
social slots buy back one racial (56119) or one class slot (56433). **There is no fifth function**
-- nothing converts out of class, which is why `SLOT_TRANSFERS` has no class row and the sheet
shows no such button. A slot may also be given up outright for 2d4% on a skill already held
(52310, and the social twin at 55824 rolls the same 2d4), added to that skill's own modifier and
deliberately not floored at zero, as his code adds it.

**The moves are stored as counts, the allowance is derived.** Six counters on the character
(`skillSlotMoves`) mirror what his sheet stores in `tmp_race_skill_slots_removed` and its siblings;
`getSlotAllowance` applies them to Knowledge's figures. The base figures are kept beside the
adjusted ones so the tab can show what a trade cost ("13, was 14"). A trade needs the slot it
spends to still be unused, which is his guard ("There are no open slots to convert", 7353), tested
against what is left rather than against the allowance. **One of his guards is deliberately not
ported**: social-to-racial also requires racial to have an unavailable slot to open into (7607),
which is his twenty-row sheet running out of rows rather than a rule.

**Over-allocation is flagged, not prevented.** His sheet refuses outright ("More selected than
total slots. Nothing done.", 7049) -- but it refuses at a character-generation step this port has
not built, and a skill here is an Item that can be dropped on an actor from anywhere. Flagging
matches how availability already marks an item that should not be there without deleting it, and
leaves the Game Master the last word. The comparison needed its own derivation step,
`_prepareSkillSlotStatus`, because the allowance is made before skills are prepared and the used
counts during -- the same ordering problem `_prepareOffhandSkills` has.

**Untrained rolls take the base chance and nothing else.** Player's Guide, "Who Can Use a Skill":
"a character may attempt almost any skill in the game, whether or not he has actually learned or
acquired the skill... The common skill chance is simply the base chance without the starting
bonus." Two limits in the same passage are the caller's rather than the formula's: a skill already
held is rolled as itself ("any skill for which the character has rolled a starting bonus can no
longer be attempted as a common skill"), and a restricted skill cannot be tried at all.

**The restricted flag has nowhere to read from, and that is a finding.** `isRestricted` is already
on the skill schema, and the picker honours it -- but **his `skilldict` has no restricted column at
all**. Comparing rows shows the seventh column is learn time, not restriction: Climb carries "32"
there and Second Weapon Lore, which the book marks `Restricted: Yes`, carries "". Restriction is
stated per skill in the book and was never brought across, so all 674 extracted skills read as
unrestricted today. Filtering on the flag now rather than later means nothing has to be rewired
when it is populated; extracting it from the book is left written down rather than guessed at from
the blank learn time, which is a correlation and not the datum.

**Verified:** derivation 227 (44 new: the four trade rates, both sacrifices, the open-slot guards,
over-allocation flagged on a real character holding one class skill too many, the untrained chance
against a held skill's own, and the book's two worked duplicate-skill examples), combat 345,
creature 139 and availability 39 unchanged, 27 modules parse (the new `skills-rules.mjs` added to
the syntax harness). The sheet preview was given a real trade -- one racial for two social -- and
shows "RACIAL 1 / 13 was 14, SOCIAL 1 / 14 was 12" against a real derived character, with all six
trade buttons at their real rates; the isolated Elemental Dancer render doubles as the check of the
refused state, where all six come back marked spent with their reasons ("Needs 2 unused social
slots; 0 left.").

**Not verified:** anything needing a running Foundry V14 -- the trade and sacrifice dialogs, the
2d4 landing on the chosen skill, and the untrained picker, which reads the skill compendium and so
cannot be exercised in a preview harness at all.

### 2026-09-16 — Dual Class Characters, built from the book alone

His Roll20 sheet has no provision for a second class at all: one `classname` field, one stored
title, nothing that could hold a second class's own progress. This is not a gap in the port to
close against his code -- there is no code -- so the whole feature is read from the Player's
Guide's "Dual Class Characters" (p.45-46) rather than ported.

**A character may hold more than one class item.** `classItems` (`_findItems("class")`) is the
full list; `classItem` stays the first, exactly as before, so every existing reader of a single
class needed no change at all. `identity.isDualClass` is simply `classItems.length > 1`.

**Each class advances on its own title, not the character's.** The book's own worked example
under Experience and Advancement rule 7 settles this on its own: "if a Mage/Warrior advances from
1st to 2nd Title in the Mage class only, he gains his Endurance Title bonus" -- a title that could
move independently per class cannot be one shared number. `title` is now a field on the class item
(`item-class.mjs`), zero meaning "follow the character's own `identity.title`", which is exactly
what a single-classed character does and why nothing about a single class had to be touched.
`_getClassTitle(classItem)` resolves it once and everything downstream uses that.

**Attack skill is the greater of the two charts, each read at its own title.** Experience and
Advancement rule 5: "Attack skill is determined by the greater of the two values." `getBetterAttackSkill`
in `combat-rules.mjs` compares by position in `ATTACK_SKILL_ORDER` (further along wins, not a
bigger number, since these are chart names), with "not on the chart at all" losing to anything
that is and two unknowns returning the first argument rather than erroring. `_prepareCombat` walks
every class in `classItems`, gets each one's chart at that class's own title, and folds them
together with `getBetterAttackSkill`.

**A lore is held if EITHER class has reached it, each at its own title — this is a reading, not a
citation.** The book does not state a rule for lores or the Lore chart directly the way it does for
attack skill. Two things point at the same answer, though: Class Determination rule 5 says the
character "learns the skills of both classes", and Advancement rule 4's stated principle -- "where
two versions of a skill are competitive... the better of the two values are applied" -- is exactly
what rule 5 already does for the attack chart it is built from. `_getBestClassTitle(field)` applies
that principle uniformly to `loreAttackTitle`, `weaponLoreTitle`, `missileLoreTitle`,
`projectileLoreTitle`, `secondWeaponKnowTitle`, `secondWeaponLoreTitle` and `multiMissileLoreTitle`:
each class is tested against its own title, the character holds the thing if any class has reached
its own threshold, and the reported "when" is the threshold that actually granted it (or the
lowest one not yet reached, so the sheet can say what is still to come rather than a bare zero
that would read as "never"). This is flagged as a reading rather than a rule because a future
session should feel free to revisit it if the developer says otherwise.

**Class skill slot requirements are summed across both classes, not maxed.** This is the book's own
stated motivation for the slot tricks existing at all -- "a dual classed character will need to
have many class skill slots" -- which only makes sense if both progressions draw on the same one
Knowledge allowance rather than each getting its own. `identity.classSlotsNeeded` sums
`skillSlotsNeeded` across `classItems`.

**Requirements are reported, never enforced.** The book's own Requirements section: Knowledge 15
minimum, both classes' attribute minimums, and "the decision must be supported by the Game
Master." Refusing the combination outright would be inventing an authority the book explicitly
gives to a person, not a rule -- so `_getDualClassIssues()` lists what falls short (on a
single-classed character it is always empty and costs nothing) and the header shows it in the
alarm colour, exactly the same posture `dualClassIssues`'s sibling `skillSlots.classOver` already
takes toward over-allocation.

**The racial half of the requirement cannot be checked at all, and that is recorded rather than
faked.** Requirements rule 2 is "must meet racial requirements for both classes," but nothing in
his extracted data maps a race to which classes it may take -- the book's "Classes Available by
Race" tables (p.64 onward) were never brought across in any prior pass. Rather than invent a
mapping or silently skip the rule, `_getDualClassIssues` checks only attributes and Knowledge, and
the comment on it says exactly why the racial check is absent, so a future pass extracting those
tables has a clear seam to land in rather than a silent gap to rediscover.

**The header shows both classes once there is more than one**, each with a stepper pair (plus one
title, minus one title) rather than a typed number, because a class's title needs to move in whole
steps and a stepper cannot be typed into the wrong shape. A single-classed character's header is
byte-for-byte what it always rendered.

**Verified:** derivation 251 (24 new: single-class parity, naming, per-class titles, the attack
chart picking the better chart at the right title, a lore granted by either class, a lore a class
has not yet reached still reporting its threshold, slot requirements summing, and the requirement
report on both a qualifying and a falling-short dual-classed character), combat 352 (7 new, on
`getBetterAttackSkill` alone), creature 139 and availability 39 unchanged, 27 modules parse. Sheet
preview given a real second class (Mage at title 4, beside the Warrior at title 12) shows
"Warrior/Mage" and both per-class title rows against real derived data.

**Not verified:** anything needing a running Foundry V14 -- the title stepper buttons writing
`system.title` back to the class item and the header re-rendering from it.

### 2026-09-16 — Multiple missile fire, and two places the books argue with themselves

The last of the lore family. Firing more than one missile at a time, and the two skills that pay
the penalty for it down or remove it outright.

**The penalties are the same in both sources, so nothing had to be chosen.** Player's Guide,
"Unconventional Attacks" (p.182), gives two projectiles -4 to hit and -6 damage, three -8 and -12,
and firing two weapons at once -4 to hit; his three situational checkboxes carry exactly those
figures (sheet-worker.js:73015-73017). `MULTI_MISSILE_MODES` holds all three with their shot
counts.

**Both skills are learned one combination at a time, which is what makes them unlike the other
three lores.** Weapon, Missile and Projectile Lore all name weapons singled out for a LARGER bonus,
and holding the lore at all comes from the class. These do not work that way: "A skill roll is
required to learn each particular combination of missile weapon type and projectile type... if the
skill user goes and gets her arrows barbed she will have to reroll" (Master's Manual). So an entry
in the list is what makes the skill apply at all, and the character model carries two new string
lists (`multiMissileKnowList` / `multiMissileLoreList`) in his own "Launcher/Missile" shape, with
"Thrown" as the launcher for a weapon thrown from the hand.

**Matching a combination to the weapon in hand takes either half of the pair.** A character firing
a Long Bow and a character holding the Arrow it fires are both covered by "Long Bow/Arrow". A pair
whose halves do not actually belong together covers neither half, which is what stops a mistyped
combination from applying to every bow in the game. Two of his five match branches
(sheet-worker.js:64699-64703) are for a launcher loaded with something other than its normal
ammunition -- his `switchedProjectiles` path -- and nothing in this port switches a launcher's
ammunition yet, so those two are deliberately not ported rather than half-built.

**The tiers do not stack and Lore is tested first**, exactly as the off-hand skills resolve: Lore
removes the penalty entirely for a learned combination, Knowledge buys it down, neither pays full.
Knowledge's step is `chance / 25` -- the only buy-down in the system that is not 20 -- worth 1 to
hit and 2 damage per level, capped at the penalty so it can cancel but never turn into a bonus.
Both the Master's Manual's text and his code say 25, so it is implemented rather than normalised;
noted for him in `UPSTREAM-ISSUES.md` item 29.

**Two projectiles are ONE roll in this port, because his sheet says so and the book says
otherwise.** The Player's Guide says "Roll each attack separately" (p.182). His
`handlePhysicalAttacks` makes one attack roll and reports that the others land for the same damage
again (sheet-worker.js:65168-65187, "2nd projectile hits the same target for the same damage").
These genuinely differ at the table -- separate rolls let one arrow hit and the other miss, in
different body areas -- and the standing rule is that where the sheet and a book disagree the sheet
wins, so the port multiplies: a hit does its damage times the number of projectiles, shown on the
card as "23 each x 2 projectiles". `resolveMultiMissile` reports `shots` and `repeats`, so if he
says the book's version is what he plays, the attack path loops rather than multiplies and nothing
else moves. Written up as `UPSTREAM-ISSUES.md` item 28.

**Firing two WEAPONS does not repeat.** Those are two separate attacks, each rolled through the
normal path on its own, so only the projectile modes carry `repeats`. The -4 is also independent of
the off-hand penalty -- "both hands suffer a -4 penalty to hit (ambidextrous or not) in addition to
the normal off-hand weapon penalties" -- and the parenthesis is the point: an Ambidextrous
character escapes the off-hand penalty and does not escape this one, which is why the multi-missile
rules know nothing about handedness and the two are simply added.

**The book's own worked example for Knowledge is wrong**, and the port implements the rule rather
than the example. "At 50% skill chance the practitioner could have no penalties to hit or damage
when firing two arrows at once" -- but two levels off -4/-6 leaves -2/-2, and only 100% clears it.
His sheet implements the rule; so does this. `UPSTREAM-ISSUES.md` item 29 carries the arithmetic.

**Not built, and deliberately:** the third thing both skills cover is "penalties for special
projectile types" (barbed arrows and the like). That is its own subsystem -- his
`switchedProjectiles` / `altProjectileName` path -- and nothing in the port models a launcher
loaded with anything but its normal ammunition yet, so the two skills reduce the two penalties
that exist here and the third is left for when special projectiles land. The "point blank or short
range only" restriction on double and triple fire is likewise a hint on the dialog rather than a
gate, because the attack flow does not model range at all.

**Verified:** combat 374 (22 new: the three modes' figures, combination parsing and matching from
either half, a mismatched pair covering nothing, all three tiers, the 25% step flooring at 24%, the
cap at zero, three projectiles taking longer to buy down than two, and a high skill on a
combination never learned still paying full), derivation 251, creature 139 and availability 39
unchanged, 27 modules parse. The sheet preview's Archer -- the real class document, at title 12,
which reaches Multiple Missile Lore at 10 -- now shows the two new rows on the Lore panel, and his
Long Bow firing two arrows resolves through the real rules end to end: "Multiple Missiles -2" on
the to-hit line (the -4 bought down two levels by a 50% Knowledge on exactly that combination),
"-2 multiple missiles" in the damage breakdown, and "23 each x 2 projectiles -- knowledge" for 46
total.

**Not verified:** anything needing a running Foundry V14 -- the new Firing dropdown on the attack
dialog and the two new list fields writing back.

### 2026-09-17 — The developer answered nine open questions, and three of them changed the port

He worked through the open `UPSTREAM-ISSUES.md` list. Every answer is recorded against its item;
this is what actually moved.

**Item 16 was not a contradiction — there are two attribute ceilings.** *"25 for normal statistic
upgrades, 27 for magical upgrades. So you can raise it to 25 with stat up rolls, and 27 is the cap
when using magical boosts."* The comment saying 25 and the function setting 27 were each describing
one of a pair, and looking again with that in hand found the other half of it in his code:
`setMagicalAttributeMaximums` (sheet-worker.js:123007) carries a whole title-tiered table the port
had never read — 23 at title 0, 25 at titles 1-10, 27 at 11-15 — which is the Master's Manual's
mundane / mortal / arch-mortal ranges exactly. So the port now has `getMagicalAttributeMax`
beside `getAttributeMax`, **and the ordinary ceiling at title 11 drops from 27 to 25**, which is
the number his own comment always gave. His `setArchMortalAttributesMax` writing 27 into the
*ordinary* maximum is the actual slip; that stays recorded rather than silently agreed with.

Nothing is clamped by the magical ceiling yet. Doing that properly needs modifiers split into
mundane and magical channels the way his sheet splits them (`tmp_mod_str_mundane` against
`tmp_mod_str_magic`, with `setPassedSTRAttribMods` capping each against its own maximum), and the
port has one undifferentiated `permMod`/`tempMod` pair. The figure is derived and carried on every
attribute so the split has something to land on; the split itself is its own pass.

**Item 1, Monk, is fixed — the first time this project has edited his data.** He confirmed the
reading ("sounds like the right fix"), so `column_maps.py` gained a `ROW_REPAIRS` table: a row he
has authorised a repair for, the repair, and the answer that authorised it. Monk's missing fifth
`classMod` slot is inserted at index 15 on load, every repair is printed on every run, and
`classRequirementsAndDetails` now maps 88 rows clean where it mapped 87 and dropped one. Monk's
armour usage reads armour again instead of its weapon list.

**Item 9, the insect thoraxes, likewise.** *"It should be x2."* `body_charts()` now rewrites a
multiplier written without its `x` and reports each one; nine areas across five charts corrected,
exactly the nine the finding predicted. This and Monk are the only two places the extraction
changes what he wrote, both on his explicit confirmation, both reported every run.

**Item 19 was wrong about its own consequence, and the correction is worth more than the finding.**
The seventeen `=>` gates are still a typo, but they are not what stops an early character using a
lore: *"Yes they gain the skill at first but they cannot use the skill because it says 'Cannot be
used non-acquired'. All of the ones that say cannot be used non-acquired cannot be used until they
actually reach the title they are acquired at."* So acquisition and usage are two different gates,
and the port's `hasLore(title, when)` was already testing the one that matters. What this surfaces
instead is a rule the port has not got: **a skill marked "cannot be used non-acquired" is unusable
until its acquisition title**, which is a second per-skill flag to extract from the books beside
`isRestricted` — neither is in his `skilldict`.

**Item 20 is intentional, for a reason no amount of code reading would have found.** *"Endure All
existed as a spell before Obliteration existed as an energy type. It is a level 22 spell, so it
doesn't include Obliteration."* The generated `ENDURED_BY` already matches. Closed.

**Item 10 settles half a question and opens a sharper one.** *"Enhanced X is listed as an ability
but it is flavor. It is why a creature 'might' have a higher stat than its counterpart... The
creature listings are right. The abilities is used to say how they were arrived at."* So creatures
skipping the racial mechanical switch is by design — an ability explains the stat block rather than
modifying it — and the creature row is the right one where the two copies disagree, which is what
the port already keeps. **But his own `calcAllCreatureCaracs` adds +10 Perception for "Enhanced
Perception" anyway**, which would be counting the same thing twice if the listing is already
inclusive. The port copies his addition today and the question is back with him.

**He asked to see the conflicts before ruling on them**, so `tools/extract/report_trait_conflicts.py`
writes `docs/reference/trait-conflicts.md`: the 39 ability and 2 disability rows that differ and
the 40 racial-only rows, canonical-name differences first because those are the ones that can miss
a `case`. Generated rather than pasted, so it stays true as the data moves.

**Items 22 and 26 were our mistake, not his gap.** *"The data is there. I can see it on the sheet
when I try to make a Roll20 character of those types."* The five classes are not missing — the port
looked in one dictionary and concluded absence. He also explained what they are: **GME is not a
class at all** (*"It allows you to select ANY social skills, and any racial skills, 1 at a time to
fill the slots, and they are 0-title non-classed characters"*, and separately, GMEs do not get the
racial title-1 starting bonuses), and **Elementalist, Summoner and Inquisitor split on a choice**
(good against evil) that changes which skills they get — he is happy with either a choice field or
one document per path ("Inquisitor Fanatical Good vs Inquisitor Fanatical Evil"). Both are now real
work items rather than a reported gap.

**Verified:** derivation 258 (7 new on the two ceilings), combat 374, creature 139 and availability
39 unchanged, 27 modules parse. The class documents rebuild at 88 with Monk's fields in their right
columns, and the generated body charts carry nine corrected thorax multipliers.

### 2026-09-18 — The 14 trait conflicts he was asked to rule on are dormant, not blocking

Checked before deciding whether to wait on his answer: neither field the conflicts report asks
about is read by any mechanical code today.

`grep` for `canonicalName` outside `item-trait.mjs` finds only the sheet class copying it onto a
display row (`actor-creature-sheet.mjs:185`) — nothing switches on it. The three substring checks
that DO key off an ability's text (`actor-creature.mjs:409,435,441`, Enhanced Perception/Affinity/
Fortune) match plain `.name`, not `canonicalName`, and they are the creature-side exceptions his
own answer on item 10 called flavor everywhere else. `value1`/`value2` are likewise only ever
copied onto that same display row, never parsed as a number or branched on.

So the 9 canonical-name and 5 value disagreements in `docs/reference/trait-conflicts.md` have
nowhere to matter yet: there is no racial mechanical ability-effects system in the port at all
(no infravision distance, no hide bonus, nothing keyed by an ability's name), which is the
character-side counterpart to what item 10 already found missing on the creature side. The
conflicts are real facts about his data, and the pipeline already has a deterministic answer for
all of them (the creature row wins, per his confirmation) — but a wrong pick among the 14 is
inert today, not a live bug.

**Held rather than chased down now.** Worth his answer before, and only before, a future pass
builds that mechanical system — at which point a wrong canonical name would silently fail to
match its `case` rather than merely being an unread string. No functional impact in the meantime.

### 2026-09-18 — Board audit: three Backlog modules were already built, and one call was never logged

**What was found.** A full read of the board against the code, before starting the Attributes
module, found the same staleness that caught the Skills row and the five-class "gap". Attributes,
Equipment and Races & Classes were all marked Backlog and all substantially built. The attribute
maximum row still described the flat 27 that the 2026-09-17 answers replaced. Three comments, in
`actor-character.mjs`, `imagine-rpg.mjs` and `DATA-MODEL.md`, still said "flat 27", and one said
equipment item types "do not exist yet". All of these are corrected; the board carries the detail.

**The call that was never logged: packs are built at runtime, not compiled.** Commit `cd57036` added
`module/content-importer.mjs`, which builds the nine world compendia from `src/packs/documents/*.json`
inside Foundry, idempotently and matched by name. `system.json` declares `"packs": []` on purpose. The
reason, from the importer's own header: compiling needs Node and Foundry's CLI, while a runtime
import lets whoever runs the game refresh content from inside Foundry when he sends a corrected
sheet, which matters while his game is still changing. It is recorded here because it decides
where content lives, and the board still described the compile step it replaced.

**Process note, since this is the third time.** Before starting any row marked Backlog, grep the
code for it first. The board has tended to lag behind work done under a neighbouring row: movement
under Races & Classes, the load limit under combat, the importer under content extraction.

### 2026-09-18 — The Intelligence language allowance, and slots handed out by use

**Decision:** `_prepareLanguages` derives `languageAllowance` from the Intelligence table, and the
description tab shows it as his own slot labels with flags for anything past the allowance. Done
on Opus at the user's direction. This closes the Attributes module.

**What his code says.** `setLangSheet(int_final)` (sheet-worker.js:49228) runs at character
creation, and `setUpdateLanguageSheet` (50561) runs from the Update Languages step on the
character's *current* `intelligence`. Each is a 31-case switch writing up to ten labelled slots.
The two switches were compared case by case for every rating from 0 to 30, and they agree. Every
case follows one rule, and it reads straight off the `spokenLanguages`/`writtenLanguages` columns
already in `ATTRIBUTE_TABLES.int`:
- 0: no language at all. His label is "None".
- Below 1: one language, partly spoken ("Speaks(quarter):", "(third)", "(two-thirds)").
- 1 or more: the spoken figure rounded up gives the slot count. The first `floor(written)` slots
  also write, and a fraction of writing lands on the next slot ("Speaks/third writes:").

**Sub-decisions:**
- *The rule is stated in code and his 31 cases are held in the test.* `getLanguageSlotLabels`
  implements the rule. `derive-test.html` carries his labels for every rating, transcribed from his
  switch, and checks the function against all 31. So a table that is already data is not copied a
  second time, but every one of his cases is still verified.
- *A fraction is partial command of one language*, never a share of a second. His one-slot labels
  say so, and so does the Player's Guide ("1/3 ... the most basic vocabulary"). The tab used to
  print "Intelligence allows 0.25 spoken", which read the other way; it no longer does.
- *It follows current Intelligence*, because his update step reads the current attribute, and the
  book defines the figures from Intelligence "after all modifications".
- *An empty row is a slot.* The Player's Guide lets a character "leave any number of language
  slots open for future learning". A blank row is exactly that, so it counts.
- *Flag, never refuse or remove.* This is the same call made for skill slots and for switched-off
  content. A character whose Intelligence drops keeps their languages, and the rows past the
  allowance are marked.
- *Slots are handed out by use, not by position.* His slots were fixed rows, with the name typed
  beside a printed label. Here a language is a row with its own speak and write boxes, in any
  order. Assigning labels by position put a written language beside "Speaks:" and an unwritten one
  on "Speaks/writes:". That happened in the first preview render and is why this changed.
  `assignLanguageSlots` fills the writing slots with written languages first, then gives the rest
  the speaking slots, then any writing slot left over. That order is the book's own: "a character
  can use a written slot for a spoken slot, but not vice versa." It is worked out on the model and
  only merged in by the sheet. So the sheet preview's copy of the private row builder is one line
  and has nothing to drift out of step with.

**Not built, and asked instead (`UPSTREAM-ISSUES.md` item 30):** Language Lore doubling spoken
languages, and sacrificing racial skill slots for languages. Both are in the Player's Guide and
neither is anywhere in his code. Unlike dual classing, where his sheet had nothing at all, here his
sheet does compute the number and simply leaves them out. So the port follows it until he says
otherwise.

**Verified:** derivation 275 (17 new), combat 374, creature 139 and availability 39 unchanged, 27
modules parse. The description tab was checked in `tools/sheet-preview.html` against the real
derived character at Intelligence 18. That character was given five languages, three written, so
the open slot, the over-allowance row and the writing-over flag all actually render.
**Not verified:** anything needing a running Foundry V14.

### 2026-09-18 — Encumbrance: his calcEncumbrance ported whole, and the book's movement penalty beside it

**What was expected:** the Equipment row said the one gap was "the movement penalty for each band,
not yet read out of his code". **What his code says:** there is none. `calcEncumbrance`
(sheet-worker.js:81745) sets `encumbrance_status`, and nothing reads it but its label. But the
same function does three things the port was missing, and all of them move a character between
bands:
- **Armour and general gear are scaled by the being's size** before the bands are read. A ladder
  of height brackets, then weight within each, runs from x.005 under a foot to x10 past 40,000 lb.
  Six to seven feet is the standard. Weapons are exempt: "there are different weapon versions for
  different sized beings already". The preview's 5'9", 215 lb Warrior now carries gear at x.9.
- **A magical plus lightens the item**, from x.9 at +1 to x.05 at +10. It applies to armour and
  weapons, the two item types that carry `magicBonus`.
- **His band labels**: "Not encumbered / Slightly encumbered / Encumbered / Heavily encumbered /
  Over weight(cannot move)". The port had invented "Unencumbered / Slight / Moderate / Heavy /
  Overloaded". Renamed, because the sheet wins.

**Decision:** one pure `resolveEncumbrance` in `combat-rules.mjs`, called by both actor models.
His one function serves both of his sheets, so the port's two copies became one. The movement
penalty comes from the Player's Guide (Encumbrance Table, p.38: 3/4, 1/2, and 1/4 with no
running). It is shown as `movement.loaded`, **beside** his unencumbered rates, never over them.

**Sub-decisions:**
- *Beside, not over.* His sheet shows unencumbered rates and nothing else. Replacing them would
  quietly change a number his table relies on. Showing the loaded rates next to them, only when
  the load costs something, gives the book's answer without hiding his. Whether the loaded rates
  should simply *be* the rates is `UPSTREAM-ISSUES.md` item 31.
- *Special movement is not slowed.* The book gives flying its own encumbrance rules, as gliding
  ratios, which are not a speed factor. Scaling a flight rate by 1/2 would invent a rule.
- *Height 0 means not entered.* His ladder would read it as "under a foot" and shrink the load
  to a hundredth. His character creation always sets a height, and a Foundry actor starts at 0.
- *His unreachable branch is not invented.* Under a foot, `<21` is tested before `<20`, so his
  x.0075 case never runs. The port reproduces what runs.

**Not ported, each needing something the port lacks:** quality tags ([Shoddy] x1.75 through
[Master] x.75) and [Float] items weighing nothing. Both need a field on the item, and both are in
the Sonnet note. Also not ported: Lighten Load, Spirit of the Donkey and the temporary
weight/capacity modifiers, which are magic items in the deferred magic phase. The book's fatigue
multipliers are not ported, as there is no fatigue system.

**Verified:** combat 406 (32 new, covering every size bracket boundary tested, the plus table,
the labels and factors, the book's own worked warrior, and the loaded rates), derivation 280 (5
new), creature 140 (1 new: a creature's gear scales by its size too), availability 39, 27 modules
parse. In `tools/sheet-preview.html`, the main Warrior reads "Not encumbered, 64.8 / 387 lb" with no
loaded table. A new isolated render gives the same derived Warrior two real 100 lb iron bars from
the equipment pack. That reads "Encumbered, 244.8 / 387 lb", and "At current load: 1/2 speed"
shows walk 60 → 30 per ten seconds. This was checked through the page text; the Browser pane was
hidden and screenshots came back blank, so the red styling has not been looked at by eye.
**Not verified:** anything needing a running Foundry V14.
