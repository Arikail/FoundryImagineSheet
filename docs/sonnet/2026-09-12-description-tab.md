# Left for Sonnet — 2026-09-12, the character description tab

**The problem, in one line:** the character model carries 19 scalar fields and one array that no tab
renders, so a player cannot record their height, eye colour, age, money or languages.

Full finding and the reasoning behind the scope call: `DECISIONS.md` → "The character sheet cannot
show 19 fields the model carries, and languages are unwired end to end". Read it first — it corrects
the board's old "combat, magic, journal" framing, two thirds of which was already wrong.

Five earlier notes are still open, including `2026-09-12-item-sheets.md`, which is the other half of
this Epic 7 work.

---

## Build one new tab on the character sheet

A fifth PART on `module/sheets/actor-character-sheet.mjs`, following the four that exist exactly:
a `templates/actor/tab-description.hbs` entry in `static PARTS`, a matching entry in `static TABS`
with an icon, and a label in `lang/en.json`. Nothing about the mechanism is new.

**What goes on it**, all of it already in `module/data/actor-character.mjs`:

1. **`physical`** — eleven fields currently unreachable: `heightFeet`, `heightInches`, `frame`,
   `weight`, `hair`, `bodyCovering`, `eyes`, `skin`, `age`, `apparentAge`, `maxAge`.
   **Leave `handedness` where it is on the combat tab** — it drives shield coverage and off-hand
   resolution, so it belongs beside the things that read it. Do not move it and do not render it
   twice.
2. **`wealth`** — `copper`, `silver`, `gold`, `platinum` as numbers, then `special`, `gems` and
   `jewelry` as free text.
3. **`languages`** — the array of `{name, speak, write}`, with Add/Remove rows and the two booleans
   as checkboxes. Copy the rider-effect pattern from `ImagineCreatureAttackSheet` for the
   add/delete handlers and the `data-index` write-back; it is the same shape with fewer fields.
4. **`identity.tendencies`** — free text, next to `alignment`, which is already in the header.

## What NOT to do here

**Do not wire the Intelligence language cap.** `module/config-tables.mjs` carries `spokenLanguages`
and `writtenLanguages` on the Intelligence table and nothing reads them, but that derivation belongs
to the **Attributes module (Epic 2)** with every other Intelligence-derived value. Putting it on this
tab would scatter it. Render the allowance if it happens to exist by the time you build this, and
simply omit the line if it does not — do not compute it here.

For the record, so nobody re-derives it: values below 1 are **partial fluency in the native tongue**,
not fractions of a second language, and writing lags speaking. That is read off his `lang_sheet`
block names at sheet-worker.js:49257-49560, not inferred.

## Done when

The tab renders all four groups, every field writes back, languages add and remove correctly, and a
real derived character shows its values in `tools/sheet-preview.html` — not a hand-typed stub, which
is how a field that never populates goes unnoticed. All modules still parse.

**Not verifiable here, and say so on the board:** anything needing a running Foundry V14. No V14
install exists on this machine, and the whole of Epic 7 carries that caveat already.
