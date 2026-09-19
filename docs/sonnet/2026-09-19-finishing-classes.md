# 2026-09-19 — Finishing classes: mechanical follow-through

The class half of the Races & Classes row is closed. New this pass: `module/class-rules.mjs` (pure
rules), `module/class-advancement.mjs` (the grant and its hooks), the corrected class-progression
panel on the Skills tab, the title gate on a skill roll, and path-aware availability keys. See
`DECISIONS.md` 2026-09-19 "Finishing classes".

**Already decided, do not re-litigate:**
- Class skills are GRANTED AUTOMATICALLY on reaching the title (the user's call). His own rule: the
  goal boundary and the title boundary are the same line (`getTitleToAcquireSkillsByGoal`).
- A grant never removes a skill, never touches one already held, and skips one the campaign's
  switches disallow rather than forcing it on.
- Slots are NOT policed by the grant. His sheet marks the excess "REMOVED"; the slot panel reports it.
- Armour and weapon usage are DISPLAY ONLY. His sheet never compares them against what is worn.
- A base-class availability key covers its path documents; a path's own key is read first.
- A class skill above the character's title is refused on the roll, and the row stays on the sheet.

1. **Tests for the generated class documents.** Carried over from
   `2026-09-18-races-classes.md` item 2, still not done, and now worth more because the grant reads
   these documents at runtime. In `tools/derive-test.html`, fetching `classes.json` the way
   `tools/combat-test.html` fetches its tables: 103 documents; every path document has a `baseClass`
   and a `path`; Elementalist(Call of Death) requires "True Neutral or Neutral Evil";
   Inquisitor(Bless) has Bless at title 3 and Inquisitor(Blasphemy) has Blasphemy there;
   Knight(Templar) has Shield Knowledge where Knight has Stun (title 4); Mage has a `nonCaster`
   entry; GME is `nonClassed` with an empty skill list; Warrior's `blockedRaces` is empty.
   **Add two more, for this pass:** every document's `classSkillList` titles are within 1-15, and
   every `baseClass` names a document that itself exists. Done when they pass and the other suites
   are unchanged.

2. **Make the new class fields editable on the class item sheet.** Also carried over
   (`2026-09-18-races-classes.md` item 1), and unchanged by this pass: `blockedRaces` (comma list),
   `classSkillList` (rows of title, name, core checkbox, and a requires dropdown of Any / Casting
   races / No-casting races), `nonClassed` (checkbox), `baseClass` and `path` shown read-only. Files:
   `module/sheets/item-sheet.mjs`, `templates/item/item-class.hbs`. Done when every field round-trips
   in `tools/item-preview.html` using Mage (it has no-casting alternatives) and Inquisitor(Bless).

3. **Show the gated and granted state in the preview.** `tools/sheet-preview.html` renders the
   Elemental Dancer(Water) progression, but no character there holds a skill above their title, so
   the faded row, the hourglass mark and the tooltip are only covered by the derivation tests. Add a
   skill to the preview character with `acquiredAtTitle` above their title and check it renders
   faded with its reason. Done when the row appears and `not-yet-acquired` styling is visible.

4. **Bring `docs/DATA-MODEL.md` up to date.** The character gained `identity.classProgression`,
   `identity.classSkillsOwed`, `identity.classUsage` and `identity.cannotCast`; a skill gained the
   derived `usableByTitle` and `titleGateReason`. The doc says the code wins where they disagree, so
   add rows and do not reword anything.

5. **Localise the new strings**, if the other tabs do — the Class Progression panel's heading, the
   owed-skills line and the usage line in `templates/actor/tab-skills.hbs`, and the three
   notification messages in `module/class-advancement.mjs`. Same check and same rule as before: if
   the other tabs go through `lang/en.json`, do these the same way; if not, leave them and say so.

6. **Stop tracking `.claude/launch.json`.** Still outstanding from `2026-09-18-races-classes.md`
   item 6: it is a local test-server config whose port changes every run, committed by accident in
   `6cb3349`. `git rm --cached .claude/launch.json` and add it to `.gitignore`.

**Not for a cheaper window, listed so they are not lost:**
- **Advancement itself is not built.** Experience, goals and the title rising are entirely unported —
  his `getNewTitle`, `handleLevelTitle`, `handleTitleCommit`, `getLowGoalByTitle`, the attribute
  increases and skill points on a goal. The grant built this pass is the *consequence* of a title
  rising; nothing yet makes one rise except typing a number. That is its own module and its own row
  on the board, and it is the natural next class-side pass.
- **The social-class and cross-skill modifiers on class skills** (`getExtraClassRacialMods`,
  `getSocialSkillMods`) are still unported, so a granted skill's bonus is his core +30 and class
  modifiers only — the same gap character generation has.
- **Whether a dual-classed character's gate should read each class's own title.** Today a skill is
  measured against whichever class has climbed highest, because the port does not record which class
  granted which skill. Recording it on the skill would fix that, and is a schema call.
