# 2026-09-19 — Character generator: mechanical follow-through

The generator is built: `module/chargen-rules.mjs` (rules), `module/chargen-view.mjs` (what each
step shows), `module/apps/character-generator.mjs` (the window),
`templates/apps/character-generator.hbs`, `tools/chargen-test.html` and
`tools/chargen-preview.html`. See `DECISIONS.md` 2026-09-19.

**Already decided, do not re-litigate:**
- Ratings are stored WITHOUT racial modifiers; the character model adds them.
- Attribute dice are his, per attribute. Normal is the book's.
- Qualification is reported, with an override.
- The second race offers only fertile partners.
- Racial skill dice count double; class core +30; class type modifiers apply.
- The preview must call `buildGeneratorView`, never a copy of it.

1. **Add `tools/chargen-test.html` to the test routine.** `CLAUDE.md`'s standing protocol says to run
   "all four browser test suites". It is five now. Update the sentence and the baseline figures
   (combat 406, derivation 325, creature 140, availability 39, character generation 46; 31 modules),
   and nothing else.

2. **Tests for `assembleCharacter`.** It is exercised by the preview but not by a test. In
   `tools/chargen-test.html`, with small hand-made content (one race, one class with a title-1 core
   skill, three skills), check that it:
   - sets title 1, or 0 for a `nonClassed` class;
   - gives a class skill category "class" with abilityBonus 30 if core;
   - doubles a racial skill's starting dice;
   - reports a skill name the content does not hold, and still creates it bare;
   - drops a language with no name;
   - sets every skill's `misc` to 0.

   Done when they pass.

3. **Height, frame and weight from his tables.** Step 3 of his creation has an "Apply Height/Frame"
   button (`roll_apply_height_frame`, sheet-worker.js:6283) and his race height and frame functions
   (`setTempRaceHeight` and its siblings, called at 4568-4579). Frame comes from STR - AGL, per
   Player's Guide p.34. Port the height roll and frame lookup as pure functions in
   `chargen-rules.mjs`, with a Roll button on the Details step beside Height, the same pattern as
   Roll for Age. Generate the tables from his functions if they are switches, which is the
   project's rule. Do not transcribe them. Done when the Roll fills height, frame and weight for a
   real race in the preview, with tests. Weight matters: encumbrance scales by it.

4. **Hair, eyes and skin from his tables.** `setRacialHairSheet`, `setRacialEyesSheet` and
   `setRacialSkinSheet` (called at 4580-4583), with the raw dictionaries `raceFeatureHair`,
   `raceFeatureEyes` and `raceFeatureSkin` already parsed in `src/packs/raw/`. Offer each race's
   options as a select on the Details step in place of the free-text box. Keep free text as an
   "other" choice. Done when a real race's options appear in the preview.

**Not for a cheaper window, listed so they are not lost:**
- Starting money by social class, and buying equipment (his step 8). How his sheet sets starting
  money needs reading first.
- The social-class and cross-skill modifiers on skills (`getExtraClassRacialMods`,
  `getSocialSkillMods`, `getExtraSocialMods`).
- The special races: Changeling (a form swap, `roll_changeling_swap_attrbs`), Formless (a host
  body) and Famorian (evokes).
- Racial skills rolled rather than chosen, which the Player's Guide leaves to the Game Master.
