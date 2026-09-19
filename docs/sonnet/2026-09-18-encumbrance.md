# 2026-09-18 — Encumbrance: mechanical follow-through

The port of his `calcEncumbrance` is in `resolveEncumbrance` (`module/combat/combat-rules.mjs`,
@MARKER ENCUMBRANCE); see `DECISIONS.md`, "Encumbrance: his calcEncumbrance ported whole".

**Already decided, do not re-litigate:**
- His band labels win over the ones the port had.
- Weapons are never scaled by size.
- Height 0 means "not entered" and takes no size adjustment.
- The book's movement penalty is shown BESIDE his unencumbered rates, not over them, until he
  answers `UPSTREAM-ISSUES.md` item 31.
- Special movement is not slowed.

1. **Quality weight multipliers.** His `getItemWeight` (sheet-worker.js:81979-81990) scales a
   NON-magical item by its quality tag: [Shoddy] x1.75, [Poor] x1.1, [Good] x.9, [High] x.8,
   [Master] x.75, and average x1. A magical plus replaces the quality multiplier; the two never
   stack. Check first whether any item type already carries a quality field: `item-weapon.mjs`
   has a comment near line 80 about construction quality for structural strength. Reuse that if
   it is the same notion; otherwise add a `quality` StringField to weapon, armour and equipment,
   blank meaning average. Then apply it in `resolveEncumbrance` only when `magicBonus` is 0.
   Mirror the `getMagicWeightMultiplier` tests in `tools/combat-test.html`. Done when the new
   tests pass and the other suites are unchanged.

2. **[Float] items weigh nothing** (81815 and its siblings: "if the name includes [Float] the
   weight is 0"). Add a `floats` BooleanField to the three item types, and skip the item in
   `resolveEncumbrance` when it is set. One test. Same "done" as above.

3. **The creature sheet shows only the status.** Consider showing the book's penalty text beside
   it (`system.encumbrance.penalty`), the way `tab-attributes.hbs` does. A creature carries no
   derived walk/jog/run of its own, so show the text only, with no loaded table. Check it in
   `tools/creature-preview.html`.

4. **Look at the "At current load" styling by eye** in `tools/sheet-preview.html` (the "Encumbrance
   check" render at the bottom). This pass could only verify it through the page text, because the
   Browser pane was hidden. The loaded table is a separate `<table>` from the one above it, so
   check that its columns line up. If they do not, add the four `<th>` headers to it, or give both
   tables fixed column widths.
