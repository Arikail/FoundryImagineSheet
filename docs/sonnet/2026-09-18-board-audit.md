# 2026-09-18 — Board audit: mechanical follow-through

This pass read the board against the code and corrected it (see `DECISIONS.md` 2026-09-18). It
wrote no rules code. What it left for a cheaper window is below.

**Already decided, do not re-litigate:** the ordinary attribute maximum is 25 from title 11 and
the magical one is 23 / 25 / 27 by title (his answer, item 16). Packs are built at runtime by
`content-importer.mjs`, not compiled. The language allowance is Opus work (the user's choice)
and is NOT in this list.

1. **Sweep for other "flat 27" mentions.** Done for code, `DATA-MODEL.md` and `packs/README.md`.
   `docs/sonnet/2026-09-12-item-sheets.md:107` still says it. Sonnet notes are historical
   records, so add a one-line "superseded 2026-09-17, see DECISIONS" beneath it rather than
   rewriting it. Done when `grep -rn "flat 27"` outside DECISIONS/PROGRESS turns up only
   annotated lines.

2. **Check `UPSTREAM-ISSUES.md` statuses against the 2026-09-17 answers.** Several items he
   answered may still read `open` at the top (item 4 especially: `DATA-MODEL.md` treats the
   saves/skills split as resolved, while the issue still says open). Set each item's status line to
   match what its body records. Change no content. Done when every item whose body quotes his
   answer carries `ANSWERED` on its status line.

3. **Add a derivation test for the ordinary/magical pair at the boundaries**, if one does not
   already exist: title 0, 1, 10, 11, 15 and 16 for `getMagicalAttributeMax`, and 10 and 11 for
   `getAttributeMax` with a race limit above and below 25. Mirror the existing cap tests in
   `tools/derive-test.html`. Done when the new tests pass and the other three suites are
   unchanged (374/139/39).
