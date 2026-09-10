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
