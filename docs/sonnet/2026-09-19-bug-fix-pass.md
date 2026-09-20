# 2026-09-19 — Bug-fix pass: mechanical follow-through

Seven real defects in the class and levelling work were fixed (`DECISIONS.md` 2026-09-19, "Bug-fix
pass"), and `tools/levelup-walk.html` was added: 34 checks driving the real writing code
(`addExperience`, `commitTitle`, `commitGoal`) against a stub actor that records what it was asked
to do.

**Already decided, do not re-litigate:**
- The title commit grants the class skills itself and marks its update `GRANT_HANDLED`; the
  `updateActor` hook keeps out of that one. Do not "simplify" by deleting either side.
- Attribute room is measured against the PERMANENT figure (rating + race + permanent), never the
  displayed value, which carries temporary modifiers.
- A successful attribute roll counts towards his minimum-increase floor whether or not there was
  room for the point.
- The Arch Mortal gate applies to a character crossing the line, not one standing past it, because
  qualification is derived here rather than stored as his flag is.
- The experience cap trims only what is being added and never reduces an existing total.
- Sense Supernatural is floored at his figure, never assigned.
- 25 ordinary / 27 magical is the settled pair; his flat 27 is not what the model enforces.

1. **Fold the walk suite into the standing test routine.** There are seven browser suites now. The
   board's state paragraph, `CLAUDE.md` and any note saying "all four"/"all five"/"all six" need the
   figures: combat 406, derivation 347, creature 140, availability 46, character generation 46,
   advancement 86, level-up walk 34; 38 modules parse. This absorbs item 5 of
   `2026-09-19-experience-levelling.md`, which is now out of date.

2. **A test for the grant refusing to run twice.** The fix has two halves and only one is covered:
   the walk proves `commitTitle` grants once, but nothing exercises the in-flight guard in
   `module/class-advancement.mjs` (the `granting` Set). In `tools/levelup-walk.html`, call
   `grantClassSkills(actor)` twice without awaiting the first, await both, and check the character
   holds each skill once. Done when it passes and the other suites are unchanged.

3. **A test for the classless title gate.** `module/data/actor-character.mjs` now falls back to the
   character's own title when there is no class item. In `tools/derive-test.html`, build a character
   holding a class skill with `acquiredAtTitle` 3, at title 5, with NO class item, and check
   `usableByTitle` is true; then at title 2, false. Done when they pass.

4. **Carried over, still not done** — items 1-6 of `2026-09-19-experience-levelling.md` (view tests,
   the DATA-MODEL rows, localisation) and item 6 of `2026-09-19-finishing-classes.md`. The
   `.claude/launch.json` one is now on its fourth listing: `git rm --cached .claude/launch.json` and
   add it to `.gitignore`.

**Not for a cheaper window, listed so they are not lost:**
- **The hook interplay is unverified.** The duplicate-grant fix depends on Foundry passing an
  update's options through to `updateActor` hooks, and on the hook firing after the actor's data is
  re-prepared. Both are documented behaviour, and neither has been run in a Foundry V14. This is the
  single most important thing to check the first time the system is loaded for real.
- **Two separate awaits remain in `commitGoal`** (the item updates, then the actor update). The
  order was chosen so a failure leaves the step repeatable, but there is no transaction. If Foundry
  offers a batched path for embedded-item updates plus an actor update, it would be worth using.
