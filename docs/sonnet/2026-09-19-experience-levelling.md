# 2026-09-19 — Experience and levelling: mechanical follow-through

The levelling system is built: `tools/extract/extract_advancement_tables.py` →
`module/advancement-tables.mjs` (generated), `module/advancement-rules.mjs` (rules),
`module/advancement.mjs` (writes to the actor), `module/levelup-view.mjs` (what the window shows),
`module/apps/level-up.mjs` + `templates/apps/level-up.hbs` (the window),
`tools/advancement-test.html` and `tools/levelup-preview.html`. See `DECISIONS.md` 2026-09-19
"Experience and levelling".

**Already decided, do not re-litigate:**
- The goal ladder comes from `getNewGoal`, not `getExpByGoal` (which has a duplicate `case 30:`).
- Experience is QUEUED (`titlesToRaise` / `goalsToRaise`), not applied in a lump.
- His three refusals stand: none while a level-up waits, none from zero, and none at all across
  goal 30 unqualified. The title's exp cap trims the rest, and the trim is reported.
- A step is atomic: roll, place, commit in one action. The queue persists; half-made decisions do not.
- A title is committed before the goal that crossed it.
- The Arch Mortal qualification is derived every render; only the special requirement is stored,
  and only a Game Master may set it.
- A character's powers are `power` Items. The invulnerability replaces the one before, never stacks.
- Experience AWARDS are not built and are not an omission — the user's call.

1. **Tests for `module/levelup-view.mjs`.** The preview exercises it but no test does. In
   `tools/advancement-test.html`, with a small hand-made actor (`{ system, items }` — the view takes
   a plain object, which is why it was split out), check `buildLevelUpView`:
   - picks the experience step when nothing is queued, the title step when a title is queued at or
     below the goal's title, and the goal step otherwise;
   - hides the Arch Mortal panel below title 10 and shows it from 10;
   - `canCommit` is false until the rolls are in AND every skill point is placed;
   - offers only class skills whose `acquiredAtTitle` is at or below the character's title.
   Done when they pass and the other suites are unchanged.

2. **A level-up walked end to end in the preview.** `tools/levelup-preview.html` renders the three
   steps but never calls `planExperienceGain` → `commitTitle` → `commitGoal` in sequence against one
   character. Add a scripted walk with fixed dice: award 2,000 to a qualified title-10 Warrior, take
   title 11, then goal 30, and assert the finished character's title, goal, Endurance, attribute
   increases and skill-point spend. The two commits need an actor-like object with `update`,
   `items.get`, `createEmbeddedDocuments` and `deleteEmbeddedDocuments` — a small stub that records
   calls is enough, and is worth having for later passes.

3. **Bring `docs/DATA-MODEL.md` up to date.** The character gained
   `identity.titlesToRaise`, `goalsToRaise`, `titleToLevel`, `goalToLevel`, `attributeIncreases` and
   `archSpecialMet`, plus the derived `nextGoalExp`, `expCap`, `levelUpPending`, `goalAttributes`,
   `archMortal` and `archQualified`. The class item gained `archMortal` (attributes, skills,
   special). Add rows; do not reword anything.

4. **Localise the new strings**, if the other windows do: `templates/apps/level-up.hbs` and the
   notifications in `module/advancement.mjs` and `module/apps/level-up.mjs`. Same check and rule as
   the earlier passes — if the rest goes through `lang/en.json`, do these the same way; if not,
   leave them and say so.

5. **Add the new suite to the standing test routine.** `CLAUDE.md` and the board now name six
   browser suites. Check every place that lists them (the board's state paragraph, any note that
   says "all four" or "all five") and make the figures read: combat 406, derivation 347, creature
   140, availability 46, character generation 46, advancement 77; 38 modules parse.

6. **Stop tracking `.claude/launch.json`.** Third pass this has been listed
   (`2026-09-18-races-classes.md` item 6, `2026-09-19-finishing-classes.md` item 6). `git rm
   --cached .claude/launch.json` and add it to `.gitignore`.

**Not for a cheaper window, listed so they are not lost:**
- **The magic side of a title advance.** His `getOtherTitleImprovements` gives Aura Control, Piety
  Control, the Aura regeneration rate and a Spell Lore bonus on reaching certain titles. All of it
  belongs to Layer 4 and has nothing to write to yet; the title commit names it as deliberately
  absent rather than forgetting it.
- **Whether a dual-classed character's goal advance should use the second class's attribute pair.**
  Today the FIRST class's pair is offered, because his sheet has one class and one pair and his code
  says nothing about two. A rules question for the developer.
- **His social-class and cross-skill modifiers** (`getExtraClassRacialMods`, `getSocialSkillMods`)
  still absent, so a skill's ability is core +30 and class modifiers only — the same gap character
  generation and the class-skill grant have.
- **Experience awards**, if the user ever changes their mind: `calcCreatureExp` values a creature by
  title, attributes, Endurance, resistances, skills and powers, and `handleSplitExp` divides by party
  size with a difficulty multiplier.
