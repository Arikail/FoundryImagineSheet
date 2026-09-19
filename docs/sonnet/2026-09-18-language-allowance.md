# 2026-09-18 — Language allowance: mechanical follow-through

The allowance is built (see `DECISIONS.md`, "The Intelligence language allowance"). Below is
what was left for a cheaper window.

**Already decided, do not re-litigate:**
- The allowance follows current Intelligence.
- An empty row counts as a slot left open.
- Rows past the allowance are flagged, never removed.
- Slots are handed out by use, written languages first (`assignLanguageSlots`).
- Language Lore doubling and racial-slot sacrifice are NOT built until he answers
  `UPSTREAM-ISSUES.md` item 30.

1. **Localise the new strings.** The description tab hard-codes "Language slots from
   Intelligence", "More languages than Intelligence allows.", "More written languages than
   Intelligence allows.", "Over allowance" and "(writing over)". Check how `lang/en.json` is
   used by the other tabs. If they localise their strings, move these five into it the same way;
   if they do not, leave these alone and say so here. His slot labels ("Speaks/writes:") are his
   data and stay as they are either way. Done when the tab renders identically in
   `tools/sheet-preview.html`.

2. **If he answers item 30 yes to Language Lore:** in `_prepareLanguages`, double `tmpspoken`
   before the labels are worked out when the actor holds a skill item named "Language Lore".
   Look it up the way `_prepareOffhandSkills` finds "Second Weapon Knowledge". Written stays as
   it is, because the book says spoken only. Add a test mirroring the Intelligence 14 ones: two
   slots become four, and there is still one writing slot. Done when the new test passes and the
   rest of the derivation suite is unchanged.

3. **If he answers item 30 yes to racial-slot sacrifice:** this is a seventh slot move beside the
   six in `skillSlotMoves`. It is at his rates (1/3 of a language per racial slot), follows the
   same guard and dialog pattern as the existing sacrifices in `skills-rules.mjs`, and adds its
   thirds to `tmpspoken`. This is not purely mechanical: how thirds from a sacrifice combine with a
   fractional Intelligence figure is a judgement call. Stop and ask before building it.
