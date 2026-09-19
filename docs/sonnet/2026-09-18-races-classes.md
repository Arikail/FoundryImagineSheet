# 2026-09-18 — Races & Classes: mechanical follow-through

Covers three Opus passes the same day: half races, the rest of a race (skills, abilities, ages,
fertility, barred classes), and every class's skills by title with class paths and GME. See
`DECISIONS.md`, the three 2026-09-18 entries on those, and `UPSTREAM-ISSUES.md` items 32 and 33.

**Already decided, do not re-litigate:**
- A class with a choice is ONE DOCUMENT PER PATH (the user's call), named in his style:
  "Elementalist(Call of Death)", "Knight(Templar)", "Knight(Dark Templar)".
- A race that cannot cast keeps BOTH skill alternatives, marked `requires: "caster"` / `"nonCaster"`.
  Choosing one belongs to character generation, not here.
- A barred class or an infertile race pair is REPORTED on the header, never refused.
- The port follows his code where the book differs, and where his code has a plain slip it does what
  he evidently meant and logs it (items 32, 33).
- Nothing about racial ABILITY MECHANICS (infravision, hide values) is built. The lists are display only.

1. **Make the new fields editable on the item sheets.** Race gets: `racialSkills` (rows of name and
   bonus, with Add/Remove, the same pattern as the class sheet's title and class-skill rows),
   `racialSkillNote`, `abilities` / `disabilities` / `immunities` (one comma-separated text field
   each is fine, split on save), `fertileWith` (the same), and `ages` (three inputs). Class gets:
   `blockedRaces` (comma list), `classSkillList` (rows of title, name, core checkbox, and a
   requires dropdown of Any / Casting races / No-casting races), `nonClassed` (checkbox), and
   `baseClass` / `path` shown read-only. Files: `module/sheets/item-sheet.mjs`,
   `templates/item/item-race.hbs`, `templates/item/item-class.hbs`. Done when every field
   round-trips in `tools/item-preview.html`, as the existing race and class fields do, using real
   content: Elf(High) for the race, and Mage (it has no-casting alternatives) and Inquisitor(Bless)
   for the class.

2. **Test the generated class documents.** The derivation suite exercises the model but never reads
   `src/packs/documents/classes.json`. Add checks to `tools/derive-test.html`, fetching it the way
   `tools/combat-test.html` does: 103 documents; every path document has a `baseClass` and a `path`;
   Elementalist(Call of Death) requires "True Neutral or Neutral Evil"; Inquisitor(Bless) has Bless
   at title 3 and Inquisitor(Blasphemy) has Blasphemy there; Knight(Templar) has Shield Knowledge
   where Knight has Stun (title 4); Mage has a `nonCaster` entry; GME is `nonClassed` with an empty
   skill list; Warrior's `blockedRaces` is empty. Done when they pass and the other suites are
   unchanged.

3. **Racial skills for Gremlin and Changeling.** `build_documents.py --check` reports both as missing
   from `raceSkillDetailValues`. Gremlin's row is written inline in `setRaceSkillSheet`
   (sheet-worker.js:51727 onward, in both the single-race and half-race branches, identical in
   each), and Changeling has its own raw dictionary, `changelingRaceSkillDetailValues`. Read both
   into `build_races()` the way the other races' skills are read. Done when the report no longer
   lists either and both documents carry a `racialSkills` list.

4. **Localise the new strings**, if the other tabs do. The Race panel and the "Half Race" label
   (`templates/actor/header.hbs`, `tab-description.hbs`) and the strings in `_getRaceIssues`
   hard-code English. Same check and same rule as item 1 of
   `2026-09-18-language-allowance.md`: if the other tabs go through `lang/en.json`, do these the
   same way; if not, leave them and say so.

5. **Bring `docs/DATA-MODEL.md` up to date.** The race and class schemas gained fields (race:
   `racialSkills`, `racialSkillNote`, `abilities`, `disabilities`, `immunities`, `fertileWith`,
   `ages`; class: `blockedRaces`, `baseClass`, `path`, `nonClassed`, `advancement.classSkillList`)
   and the character gained `combat.chosenAttackSkill`, `identity.race`, `identity.raceType`,
   `identity.raceIssues`, `identity.isHalfRace` and `identity.isNonClassed`. The doc says the code
   wins where they disagree, so add rows and do not reword anything.

6. **Stop tracking `.claude/launch.json`.** Another session committed it by accident (`6cb3349`); it
   is a local test-server config with a port that changes every run. `git rm --cached
   .claude/launch.json` and add `.claude/launch.json` to `.gitignore`. Done when `git status` no
   longer shows it as modified after the next port change.

**Not for a cheaper window, listed so they are not lost:**
- **The content-authoring method for every pack** is the Opus work still to do. Only classes have a
  hand-authored file (`src/packs/manual/classes.json`, merged by `load_manual_classes`); races,
  skills, weapons, armour, equipment and the three trait packs have none. Its design comes first:
  one shared loader, whether a manual entry may override a generated one, and how it is documented.
- **Availability overrides are keyed `class:Elementalist`** and do not reach the new path documents,
  each of which is its own key. Whether a base-class key should cover its paths is a design call.
- **His "(Slight Physique)" race variants** are not carried, because the port has no slight-physique
  option. Whether to add one is a rules call. Ask the user.
- **Multi, Part and Trace Race**, and the book's -5 Social Class for a mixed race, wait on the
  developer's answer to `UPSTREAM-ISSUES.md` item 32.
