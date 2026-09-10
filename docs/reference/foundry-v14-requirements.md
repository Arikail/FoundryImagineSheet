# Foundry VTT V14 — Requirements & Architecture Notes

Research pass, 2026-09-10. Sources linked inline. This is what governs how we build Layer 0 (Roll Engine & Data Model) and every sheet after it.

## Environment / hosting requirements

- **Node.js `>=24.13.1 <25.0.0` required** (up from V13's `>=20.18.0 <23.0.0`). Anyone self-hosting must upgrade before running V14.
- Minimum hardware: 2GB RAM, 2 vCPUs, 20GB storage — scales up with world size. ([Minimum Requirements](https://foundryvtt.com/article/requirements/))
- Network: ~5-10 Mbps for players; host wants ≥1.5MB/s (12Mbps) upload to serve assets. Self-hosters need port-forwarding-capable ISP, no CGNAT.
- **No in-place upgrade** — V13 must be uninstalled and V14 installed clean.
- **One-way world migration** — once a world is opened in V14 it cannot go back to V13. Relevant for however we stage testing.
- Each user (including anyone testing) needs their own Foundry VTT software license.

## `system.json` manifest requirements

Required fields: `id` (lowercase, must match the folder name), `title`, `description`, `version`.

**Compatibility declaration** — V14 uses the modern object form; the old `minimumCoreVersion`/`compatibleCoreVersion` fields are deprecated and scheduled for removal at V16, so don't use them at all:

```json
"compatibility": {
  "minimum": "14",
  "verified": "14.367"
}
```

`maximum` is optional but hard-enforced if set — a world won't load above it. Given how fast Foundry ships patch releases, probably leave `maximum` unset so we don't accidentally lock users out of a point release.

**Dependencies** use `relationships`, not the old `dependencies` field:
```json
"relationships": {
  "requires": [{ "id": "module-name", "type": "module", "compatibility": { "minimum": "2.0" } }]
}
```

**Folder structure**: system lives at `{userData}/Data/systems/<id>/`. `system.json` at root is the only strictly required file. Recommended subdirs: `module/` (or `scripts/`) for code, `styles/`, `packs/` for compendiums, `lang/` for localization. Matches our planned compendium-driven content layer directly — `packs/` is where sourcebook-tagged Classes/Races/Skills/Equipment compendiums will live.

**For public release** (already in scope per `DECISIONS.md`): manifest must declare a `license` path/URL and a `readme` path/URL, and both an actual `LICENSE` file and `README` file must exist in the repo. Submission is a manual review via Foundry's Package Submission Form — package name must match the manifest, repo URL required, and the reviewer checks content-rights ownership. Worth keeping the rights-holder permission documented for that review. ([Package Management](https://foundryvtt.com/article/package-management/), [Licensing Guide](https://foundryvtt.com/article/licensing-guide/))

## Breaking changes that matter for a from-scratch build

We're not migrating an old system, so most of the V13→V14 migration guide is irrelevant — but a few changes directly shape how we should design Layer 0 from day one, since building it the "old" way would mean redoing it almost immediately:

- **ApplicationV2 is the only forward path.** Legacy AppV1 classes (`Application`, `Dialog`, `FormApplication`, `DocumentSheet`) still run but are marked for removal at V16. Combined with our "redesign for Foundry conventions" decision, every sheet gets built on `HandlebarsApplicationMixin(ActorSheetV2)` — no legacy classes, ever.
- **Active Effects v2** — directly affects our planned Active-Effect-backed modifier system (racial/class bonuses, temporary attribute changes from the Roll20 sheet's MOD fields):
  - `ActiveEffect#changes` moved to `ActiveEffect#system#changes`
  - Change `mode` renamed to `type`, and changed from numeric constants to lowercase strings: `"add"` not `ADD=2`, `"override"` not `OVERRIDE=5`, `"multiply"` not `MULTIPLY=1`. We should design our modifier/effect data model against the string-based types from the start — no reason to build against the old numeric constants only to redo it.
  - **Landmine**: custom Actor subclasses must always call `super.prepareBaseData()`, or the two-phase effect application's internal tracking (`_completedActiveEffectPhases`) breaks silently — it won't error on world load, only later on an update. Worth a code-review checklist item once we're implementing the Actor document class.
- **DataModel additions relevant to us**: `DocumentUUIDField` (with `relative: true`) is the correct native field type for cross-referencing another document — e.g. a Class item pointing at compendium-stored racial skills. This is exactly the mechanism our sourcebook-tagged compendium content layer needs; we shouldn't hand-roll UUID string references when this field type exists.
- **Measured Templates removed entirely**, replaced by the new Region system (`createEmbeddedDocuments('Region', ...)`, shape type `"ray"` → `"line"`). Not relevant to core scope, but flagging now for whenever we hit Magic/spell-AoE templates later — target Regions, not the old MeasuredTemplate API, which no longer exists in V14.
- **TinyMCE removed** — ProseMirror is the only built-in rich text editor. Relevant for any long-text fields (skill/spell descriptions, journal entries).
- `CONST.CHAT_MESSAGE_TYPES` → `CONST.CHAT_MESSAGE_STYLES` — relevant whenever we build roll chat cards.

## ApplicationV2 sheet architecture (how sheets actually get built)

- Sheets extend `HandlebarsApplicationMixin(foundry.applications.sheets.ActorSheetV2)`.
- Layout is declared via a static `PARTS` object mapping named parts (header, tabs, attributes-tab, skills-tab, combat-tab, etc.) to individual Handlebars templates.
- **Each tab must be its own PART with a single root element** (a `<section>`), not a shared container template with swapped-in placeholders — the framework's two-pass rendering explicitly relies on this to preserve DOM state (focus, scroll position). Given how field-dense our sheet is, this matters: violate it and the sheet will visually jump/reset on every recalculation.
- Interactions use `data-action="methodName"` attributes wired to static async handler methods on the sheet class — not the old jQuery event-binding pattern from FormApplication.
- `data-sync` attribute on `<details>` elements preserves open/closed state across re-renders — worth using given we'll likely have collapsible sections (the sheet has a LOT of fields).
- Tabs are managed through the mixin's own tab-group data (`tabs.<id>.id/cssClass/group`) rather than the Roll20 sheet's manual radio-button show/hide approach.

## Sources
- [Introduction to System Development](https://foundryvtt.com/article/system-development/)
- [Minimum Requirements](https://foundryvtt.com/article/requirements/)
- [Package Management](https://foundryvtt.com/article/package-management/)
- [Licensing Guide](https://foundryvtt.com/article/licensing-guide/)
- [Foundry V14 Migration reference (community-compiled)](https://github.com/mordachai/vagabond/blob/main/FOUNDRY_V14_MIGRATION.md)
- [ApplicationV2 API docs (V14)](https://foundryvtt.com/api/classes/foundry.applications.sheets.ActorSheetV2.html)
- [HandlebarsApplicationMixin API docs](https://foundryvtt.com/api/functions/foundry.applications.api.HandlebarsApplicationMixin.html)
