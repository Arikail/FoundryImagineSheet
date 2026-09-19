# 2026-09-19 — Adding content: mechanical follow-through

The method is in place: `docs/ADDING-CONTENT.md`, one `src/packs/manual/<pack>.json` per pack, and
`apply_manual_content` in `tools/extract/build_documents.py`. See `DECISIONS.md` 2026-09-19.

**Already decided, do not re-litigate:**
- Hand content is additive by default. Overriding his data needs `"_override": true` and is
  reported every build.
- Hand content defaults to sourcebook "Custom".
- Game Masters author in their own compendium, never in the system's, because re-import overwrites
  by name.

1. **Link the guide from `README.md`.** Add one line under whatever section describes using the
   system, pointing at `docs/ADDING-CONTENT.md`. Done when the link is there and nothing else
   changes.

2. **A regression check for the loader.** `tools/extract/` has no tests. Add
   `tools/extract/test_manual_content.py`, runnable as plain `python`, which:
   - copies `src/packs/manual/` to a temp directory;
   - points `build_documents.MANUAL_DIR` at it, and fills `entries` from each file's `_example`;
   - adds one misspelt field and one same-name entry without `_override`;
   - asserts the same four outcomes the 2026-09-19 manual test saw (added and tagged Custom,
     override applied to its field only, collision ignored, typo reported);
   - never writes into `src/packs/`.

   Done when it passes and `git status` shows nothing under `src/packs/` changed.

3. **Creature attacks and powers have no pack**, so neither route 2 nor the importer covers them.
   They are authored on a creature or in a Game Master's own compendium (route 1 covers them). If
   the user wants them shippable, adding a pack is mechanical: a `CONTENT_PACKS` entry in
   `module/content-importer.mjs`, a builder that returns `[]`, a `PACK_TYPES` entry, and an empty
   manual file with an `_example`. Ask before doing it. It adds two compendiums to every world.

The race and class item-sheet fields that route 1 cannot yet edit are item 1 of
`2026-09-18-races-classes.md`, and not repeated here.
