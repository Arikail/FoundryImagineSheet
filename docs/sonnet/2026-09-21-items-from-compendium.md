# Left for a cheaper window — 2026-09-21, Items sidebar from the compendia

The sidebar now fills from `world.imagine-*` (fallback: shipped JSON). Decided and in
`DECISIONS.md` 2026-09-21; do not re-litigate reading order or the no-overwrite rule.

## 1. Add a "refresh" that updates items already in the sidebar — only if asked

**What to do.** `populateItems()` adds new items and deliberately leaves existing ones alone.
If Daryl wants edits made in a compendium to flow through, add `game.imagine.syncItems()` that
matches by folder + name and updates `system` only, never `name`/`img`/`folder`.
**Files.** `module/item-directory.mjs`, `module/imagine-rpg.mjs` (the `game.imagine` block).
**Done looks like.** A changed weight in the equipment compendium shows in the sidebar item after
one call; an item the GM renamed is untouched.

## 2. Group equipment by `equipmentType` where one is set

**What to do.** His tables give equipment no category, so it is bucketed by letter. Hand-added gear
can carry `equipmentType` (e.g. "Containers"). Optionally group those under that name and leave the
rest by letter.
**Files.** `module/item-directory.mjs`, the `equipment` entry in `DIRECTORY`.
**Done looks like.** Custom typed gear appears under its type folder; shipped gear is unchanged.

## 3. Verify in a real V14 world

The batched `Item.createDocuments` and `Folder.create` are still unproven against Foundry itself.
After install, run `game.imagine.populateItems()` and read the per-folder console lines.
