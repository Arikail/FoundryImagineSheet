# Compendium Packs

Deliberately empty. This system does not ship compiled packs, and `system.json` declares
`"packs": []` on purpose.

Content lives as JSON in `src/packs/documents/`, generated from his sheet-worker by
`tools/extract/`. The nine compendia (skills, races, classes, weapons, armour, equipment,
abilities, disabilities, immunities) are built inside Foundry at runtime by
`module/content-importer.mjs`. Run it from the console as `game.imagine.importContent()`. The
import is idempotent: it matches by name and updates documents in place, so it can be re-run
whenever corrected content arrives.

See `docs/DECISIONS.md` ("Content architecture: compendium-driven, sourcebook-tagged") and
`docs/PROGRESS.md`, Epic 6.

To add content of your own -- homebrew, or anything not yet in the system -- see
`docs/ADDING-CONTENT.md`.
