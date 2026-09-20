# 2026-09-19 — The hand-off backlog, cleared down

All nineteen notes in `docs/sonnet/` were triaged against the code as it stands, not against their
own wording. Several items were already done, two were obsolete, and the rest are either closed
below or listed here as still open. **This note supersedes the numbered items in every earlier
note**: read this one, not those, for what is outstanding.

**Closed in this pass:**
- `.claude/launch.json` untracked and ignored (carried in four notes).
- The test routine, with its current figures, written into `docs/PROGRESS.md` beside the
  Self-Check Checklist -- there was no such list anywhere before.
- `docs/DATA-MODEL.md`: the class additions, the character's level-up queue and derived fields, a
  Race Item section that never existed, and the corrected note that race and class are embedded
  Items rather than UUID fields.
- Class document tests (13 checks), the classless title gate, the level-up view (17 checks), the
  grant's in-flight guard, `assembleCharacter` (8 checks), `getCreatureAttackSeconds` (5), his
  `[Float]` marker (5).
- Gremlin's racial skills, walked out of his inline switch by `extract_combat_tables.py`.
- Changeling's skills recorded as form-dependent rather than reported as missing data.
- `README.md`, which had said "early scaffolding -- no system code yet" since before any of it
  existed.
- The stale "flat 27" on the race item sheet, the creature sheet's missing encumbrance penalty,
  and the loaded movement table's missing column headings.
- Three standing answers written into `DECISIONS.md` so they stop being re-asked: strings are not
  localised and new ones should not be; Multiple Missile Lore's six classes are confirmed and
  acquiring a combination is typing it; Changeling has no skill list and that is the answer.

**Still open, largest last:**

1. **A pack for creature attacks and powers.** `CONTENT_PACKS` in `module/content-importer.mjs`
   has nine packs, none for the two creature item types, so a Game Master cannot keep a library of
   either. Needs a yes/no before building: it is a content-shape decision, not a mechanical one.
2. **`tools/extract/test_manual_content.py`.** The manual-content merge has no test at all, and it
   has now had one real defect (a note beside the entries crashed the build). Worth a small suite:
   a new entry lands, an override without `_override` is ignored and reported, one with it is laid
   over field by field, a misspelt field is reported, a `_` key is skipped.
3. **The untrained-skill list on the Skills tab.** Worth little until item 6 below gives it data.
4. **Quality weight multipliers** (`2026-09-18-encumbrance.md` item 1): a `quality` field on the
   three carried types, applied in `resolveEncumbrance` only when `magicBonus` is 0.
5. **Height, frame and weight, and the hair/eye/skin tables** for character generation
   (`2026-09-19-character-generator.md` items 3 and 4). His `setTempRaceHeight` and siblings, and
   the `raceFeature*` dictionaries already parsed into `src/packs/raw/`. The largest of the
   mechanical items, and the one a table will miss first: those fields are free text today.
6. **`isRestricted` for 674 skills** (`2026-09-16-skills-module.md` item 1). Needs the book text,
   which is deliberately not committed, so it has to be run where the PDFs are.
7. **Creature attacks get no lore modifier at all** (`2026-09-12-lore-corrections.md` item 2). A
   design pass, not a mechanical one: his lore rules are written for weapons, and what they mean
   for a claw or a breath weapon is a rules question.

**Blocked on the developer, not on effort:** `UPSTREAM-ISSUES.md` items 21 (lore), 28 and 29
(multi-missile), 30 (the two language rules), and item 2/3 — whether `sheet-worker.js` is his
current ruleset, which is the one that would invalidate work rather than merely add some.

**Blocked on a Foundry V14 install:** everything the board marks "not verified", and in particular
the update-options/hook interplay the duplicate-grant fix depends on.
