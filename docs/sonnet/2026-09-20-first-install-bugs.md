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

## 4. A harness for the window chrome itself

**What to do.** The scrolling fix (`@MARKER SCROLLING` in `styles/imagine-rpg.css`) was verified by
building a throwaway page that reproduced Foundry's window chrome — a fixed-height `.application`
holding a `.window-content` with real parts inside — and asserting that each sheet's form part
overflows and scrolls while the header stays put. That page was deleted after use.

It is worth having permanently, because nothing else in the harness set can catch this class of
bug: `item-preview.html` renders every sheet in an unbounded frame, which is exactly the condition
under which a missing scrollbar is invisible. Build `tools/window-test.html` on the pattern of the
other harnesses: for each item sheet, at the width and height its own `DEFAULT_OPTIONS` declares,
assert `scrollHeight > clientHeight` where the content is taller than the window, and assert
`scrollWidth <= clientWidth` always — a form should never scroll sideways.

**Files.** New `tools/window-test.html`. Widths and heights come from `module/sheets/item-sheet.mjs`;
read them from there rather than retyping them, so a sheet that is resized cannot drift from its test.

**Done looks like.** The suite fails if `.panel-row` goes back to a fixed `repeat(3, 1fr)`, if
`min-height: 0` is dropped from the scrolling part, or if a new sheet is added without a scroll
region. Report `PASS`/`FAIL` lines like the other harnesses so the counts can join the total.

**Already decided.** Reproduce the chrome rather than trying to load Foundry: there is no V14 on
this machine and no Node. The reproduction asserts the CSS given that DOM shape and does not claim
to prove Foundry builds that shape — `FIRST-RUN.md` is where that gets checked.

## 5. BLOCKED on Daryl — Famorian and Formless, the last two missing races

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

---

## 6. Bump the version on every handover, and consider automating it

**What to do.** `system.json` sat at `0.1.0` from the commit that created it until 2026-09-20, which
is how the same fixed bug got reported twice from a stale install — nothing distinguished the build
Foundry was running from the one being edited. It is now `0.2.0`, and the init line prints it.

Make this mechanical rather than remembered. `tools/build_system.py` already stamps the date and
commit into `BUILD.txt`; have it also refuse to build, or warn loudly, when `system.json`'s version
matches the version of the last build whose commit differs from HEAD.

**Files.** `tools/build_system.py`, `system.json`.

**Done looks like.** Building after a code change without bumping the version prints a warning
naming the previous version and commit. Do not auto-increment silently — the number should be a
decision, and a silent bump is as hard to reason about as no bump at all.

**Already decided.** The version is for telling builds apart when one is handed over, not a release
number, and `BUILD.txt` stays the detailed record (date, commit, file and document counts).

## 7. Give the creature sheet the handedness treatment only if asked

**Do not do this speculatively.** Characters now roll handedness by default, with a world setting to
make it selectable; the creature sheet still shows a plain dropdown and that is deliberate — a
creature is Game Master content, authored rather than generated, and his rule is about characters.
It is written here only so the asymmetry reads as a decision rather than an oversight if someone
diffs the two sheets. `DECISIONS.md` 2026-09-20 carries the reasoning.

## 8. Carry the qualification labels into the character sheet's class display

**What to do.** The generator's class dropdown now names what each class is short of
("Acrobat — needs STR 13") and counts how many are open, which is what turned "class selection is
broken" back into "this character has a low Strength". The character sheet's own class display has
no equivalent: a Game Master looking at a finished character cannot see which classes it could
change to, or why the one it has was allowed.

Add the same to the character sheet's class area — read `checkClassQualification` against the
actor's final attributes, the way `chargen-view.mjs` does for the dropdown.

**Files.** `module/sheets/actor-character-sheet.mjs` (context), `templates/actor/tab-description.hbs`
or wherever the class is shown. `checkClassQualification` is exported from `module/chargen-rules.mjs`
and takes `(classSystem, finals, raceNames, isBlocked)`.

**Done looks like.** A character taken with the override says so on its sheet rather than looking
like any other, and the reason it did not qualify is still readable after creation.

**Already decided.** Shortfall only in tight spaces, the full "Needs STR 13; has 6." sentence where
there is room — that is the split the generator already makes, and the reason is in the @MARKER
CLASS comment in `chargen-view.mjs`. Do not hide or disable anything.

## 9. Check the rest of the stylesheet for colours the theme switch cannot reach

**What to do.** The Foundry-standard theme works by re-pointing the palette names in `@MARKER
PALETTE`, so any colour written as a literal hex somewhere else in `styles/imagine-rpg.css` will
stay put when the theme changes and may end up unreadable. The obvious ones were hoisted this pass
(`#fdfbf6`, `#fff`, `#f3efe6`, `#ece7dc`); the alarm red (`#a2462e`), the confirm green (`#3f6b2e`),
the chip border and the chargen panel colours were not.

Walk the file for remaining literals, decide for each whether it is a palette colour (hoist it) or
genuinely fixed regardless of theme (leave it, with a comment saying so), and check the result in
both themes.

**Files.** `styles/imagine-rpg.css`.

**Done looks like.** Switching to Foundry standard leaves nothing illegible. The quick check is the
one used this pass: render a sheet, read `getComputedStyle` for text and background on each region
in both themes, and confirm the pair never collapses to the same colour or to black-on-transparent.

**Already decided.** Every `var()` in the `@MARKER FOUNDRY STANDARD THEME` block carries a literal
fallback on purpose, so a Foundry variable that is renamed or missing degrades to something
readable rather than to nothing. Keep that when adding more. And do not remove the
`:not(.imagine-foundry)` scoping on the paper theme's input-variable block — that is what stops the
definition cycle described in `DECISIONS.md`.

## 10. Starting money: the table is ready to transcribe, the rule is not

**What to do.** Roll starting coins in the character generator, which is currently entry-only.
The whole rule is in `doing_coins` (sheet-worker.js:74150 onward) and has three parts:

1. **Apparent social class.** Social class below 5 or above 20 does not exist in the mortal realms,
   so those beings roll `5d4` for an apparent one and use it from there. Between 5 and 20, the real
   one is used and `tmp_apparent_social_class` is blanked.
2. **The Fortune roll**, for non-Nobles only (social class under 15). Fortune is
   `ceil((AUR + PTY + WIL) / 3)`, plus 5 if the class carries "+5% Fortune". **Do not implement the
   comparison yet** — see below.
3. **The multiplier**, on a success, from one d100: under 51 → x2, under 71 → x3, under 91 → x4,
   under 96 → x5, under 100 → x8, exactly 100 → x10.
4. **The coins**, a switch on social class 5 through 20, each case rolling dice and assigning
   copper/silver/gold/platinum. Sixteen cases, plainly written, e.g. class 5 is
   `getDiceRollNoMod(5, 4)` copper and class 6 is `getDiceRollNoMod(5, 8)` copper.

**Files.** A `rollStartingMoney` in `module/chargen-rules.mjs` (keep it Foundry-free, taking a roll
function, as `rollHandedness` and `rollStartingAge` do), the table in `module/chargen-tables.mjs` or
beside the other extracted tables, an action in `module/apps/character-generator.mjs`, and a button
in the Details step of `templates/apps/character-generator.hbs` beside the age and physique rolls.

**Done looks like.** Pressing it fills the four coin fields, and a line beneath says what happened —
the social class used, whether the Fortune roll landed, and the multiplier — the way the physique
roll already narrates itself. Test it in `tools/chargen-test.html` against each social class from 5
to 20 with a stubbed roll function.

**BLOCKED on one line, and only one.** The Fortune comparison reads
`if (tempfort <= getDieRoll(100))`, which succeeds when the d100 rolls at or ABOVE the character's
Fortune — the opposite of every other percentile check in the sheet, and it makes "+5% Fortune"
a penalty. That is `UPSTREAM-ISSUES.md` item 40 and it is with him. Build parts 1, 3 and 4, which
are unambiguous, and leave the comparison behind a single named function with both readings written
out so answering it is a one-line change. Do not pick one silently.

## 11. Re-test the Nixie racial skills on a current build

**What to do.** Daryl suspected on 2026-09-20 that a Nixie was being granted "+20% Speak to Stone",
which is not a Nixie racial skill. Checked this pass: our Nixie row matches his
`raceSkillDetailValues` entry exactly — ten skills, Animal Shape at +20%, the water-animals note —
and Speak to Stone is not among them. The data is right.

He was on a build where the class and weapon packs had failed to import entirely, so what he saw
almost certainly came from that. Re-check once he is on a current build before spending anything on
it. If it recurs, the place to look is the racial skill PICKER in the generator's Skills step —
whether it is offering the race's own list or every skill in the compendium.

**Done looks like.** Either confirmed gone, or reproduced on a current build with a note of which
skills were offered against which the race actually grants.
