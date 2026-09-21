# Left for a cheaper window — 2026-09-20, first-install bug pass

Daryl installed the system for the first time and reported four things. All four are fixed; what
follows is the mechanical extension of patterns this pass established, plus one item that is
blocked on him rather than on effort.

Everything here is decided. None of it needs re-litigating — where a call was made, the reason is
in `DECISIONS.md` (2026-09-20) or `UPSTREAM-ISSUES.md` items 38 and 39.

---

## 1. Give the class and armour item sheets the same "what it gives" treatment the race sheet got

**What to do.** `templates/item/item-race.hbs` gained a *What This Race Gives* block this pass:
racial skills, abilities, disabilities, immunities and fertility as `.race-chip` spans, then a
*Colouring and Age* panel row. It fixed a real complaint — Nixie's "water animals only" note was
stored, was read by the character sheet, and appeared nowhere on the race itself.

The class sheet has the same shape of omission. `item-class.hbs` renders `classMods` and titles but
check it against `module/data/item-class.mjs` for stored fields it never shows — `armorUsage`,
`weaponUsage`, `alignRequirements`, `focusAttributes` and `goalAttr1`/`goalAttr2` are the likely
ones. Armour: check `item-armor.hbs` against `item-armor.mjs` the same way.

**Files.** `templates/item/item-class.hbs`, `templates/item/item-armor.hbs`. No JS needed — the
sheets already put the whole `system` object in context; the race block reads `system.racialSkills`
directly with no `_prepareContext` change.

**Done looks like.** Every field declared in the data model is either shown on its sheet or has a
comment on the template saying why not. Chips for list data, inputs for scalars — copy the race
block verbatim, including the `.race-panel` wrapper, so all three sheets read alike.

**Already decided.** Chips, not editable rows: these lists come from his tables and a Game Master
who wants to change one uses the raw-data editor. That is the call the race sheet made and the
reason is written into the template comment. Do not add add/remove buttons — that is the separate
list-editing story in `2026-09-18-races-classes.md` item 1, still open and still deliberate.

## 2. Sweep the remaining templates for fields too small to hold their content

**What to do.** The CSS added this pass (`@MARKER FORM FIELDS ON PAPER` in
`styles/imagine-rpg.css`) gives every `textarea` a floor of about six lines, a scrollbar and a drag
handle, because his descriptions run long — "Arch Physical" is five lines and the old fixed box
showed three and a half. That covers textareas globally.

It does not cover single-line `input[type="text"]` holding long values. Walk the templates for
inputs whose content can be long — a race's `maxAge`, a class's `alignRequirements`, a trait's
`canonicalName` (Daryl's screenshot shows "Energy(Complete)" clipped to "Energy(Compl") — and
either widen them or give them a `title` attribute so the full value is available on hover.

**Files.** All of `templates/item/*.hbs`, `templates/actor/*.hbs`; the widths are in
`styles/imagine-rpg.css`.

**Done looks like.** No field in any sheet clips a value that exists in the shipped documents. The
cheap way to find them: for each input, take the longest value that field holds across
`src/packs/documents/*.json` and check the declared width against it.

**Already decided.** Do not shrink the font to fit. The sheet is 13px and that is deliberate.

## 3. Mirror the choices/blank sweep into a standing check

**What to do.** The two fatal import errors were `StringField`s whose `choices` include `""` without
`blank: true` — Foundry sets `blank: false` implicitly when `choices` is given, so `""` fails
validation and the whole pack refuses to import. Nine fields across five data models now say
`blank: true`, and a one-off sweep confirmed all 4,389 documents satisfy every declared `choices`
list.

Make that sweep permanent. `tools/build_system.py` already proves every referenced path exists;
add a check in the same spirit that parses `module/data/*.mjs` for `StringField` declarations and
fails the build on either problem:
- a field whose `choices` contains `""` (or whose `initial` is `""`) without `blank: true`
- any value in `src/packs/documents/*.json` that is not in its field's `choices`

**Files.** `tools/build_system.py`.

**Done looks like.** `python tools/build_system.py` reports the field count checked and refuses to
build on a violation, the way it already refuses on a missing path. Re-introducing either bug is
then impossible without the build saying so.

**Already decided.** Parse the `.mjs` with a regex rather than importing it — there is no Node on
this machine (confirmed 2026-09-20), which is also why the test harnesses are browser pages. A
`choices` list built by spreading a table (`["", ...CREATURE_TYPES]`) cannot be resolved this way;
skip those and say how many were skipped rather than pretending to have checked them.

## 4. BLOCKED on Daryl — Famorian and Formless, the last two missing races

**Do not start this one.** It is written down so it does not turn into a silent omission, not
because it is ready.

Five of the seven missing races ship now. The two that do not are the two whose rows are not
literals, and both need runtime logic rather than extraction:

- **Famorian** adds 1d3 apiece to STR, AGL and VIT from "evoke" checkboxes — 593 lines at
  sheet-worker.js:33032–33624. His `evokedict` is already extracted to `src/packs/raw/`.
- **Formless** takes its entire physical half from a *host* race via `setFormlessStartingRace` and
  supplies only its own mental block. His `formlessStartingRaceDetails` is already extracted too.

Both need a schema decision (where does a chosen host race or a set of evoke flags live on a
character?) and both touch character generation. That is judgement work, not mechanical work, and
it wants the expensive window.

**Why blocked rather than merely hard:** `UPSTREAM-ISSUES.md` item 38 asks whether the four faerie
races' wingless ordinary branch is intended, and the answer decides whether the port needs a
slight-physique option at all. If it does, that option lands in the same place Famorian's evokes and
Formless's host would — so building those two first risks building them twice.

**Already decided.** Do not ship them with a row of zeros to make the count 112. A zeroed row gives
a character an attribute *limit* of 0 in all twelve, which looks like data and is worse than the
race being absent. This is stated in `build_documents.build_races` at the `@MARKER INLINE RACE ROWS`
comment so it is not quietly undone.
