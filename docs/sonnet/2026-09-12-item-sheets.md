# Left for Sonnet — 2026-09-12, item sheets

**DONE 2026-09-13.** All three sheets built exactly as specced below: `ImagineClassSheet`,
`ImagineArmorSheet`, `ImagineRaceSheet` in `module/sheets/item-sheet.mjs`, their templates in
`templates/item/`, registered in `module/imagine-rpg.mjs`, and previewed in `tools/item-preview.html`
against Elemental Dancer, Skin Suit(Watertight) + a real Buckler, and Elf(Sea) respectively — chosen,
as this note asked, to be real documents that exercise the interesting cases (populated
`classSkills`, a full 19-location coverage grid plus the shield flags, and the special-movement /
-10-speed-multiplier case) rather than hand-typed stubs. Board updated in `PROGRESS.md`. No deviation
from the spec below worth recording as a new decision — the one thing this note flagged as
speculative ("whichever of the second-weapon pair exists by the time you build this") turned out not
to exist on `item-class.mjs` yet, so nothing was added for it.

This pass decided **which** of the six remaining item sheets to build and what goes on each. The
building itself is mechanical: the pattern exists three times over in `module/sheets/item-sheet.mjs`
and is followed, not invented.

**Build three: class, armour, race. Do NOT build weapon, skill or equipment.** That is a decision,
not an omission — see `DECISIONS.md` → "Three of the six remaining item sheets, not six". If you
find yourself finishing the set for symmetry, stop and re-read it.

Four earlier notes are still open: `2026-09-12-lore-corrections.md`,
`2026-09-12-projectile-lore.md`, `2026-09-12-elemental-dancer.md`,
`2026-09-12-offhand-planning.md` (whose item 3 was corrected today — read its notice).

---

## The pattern, which is not to be redesigned

Every sheet is: a small subclass of `ImagineItemSheet` in `module/sheets/item-sheet.mjs`, naming its
own body template, with a `config` block in `_prepareContext` holding the dropdown option lists.
Follow `ImagineTraitSheet` (the simplest) and `ImagineCreatureAttackSheet` (the one with a repeating
block) and copy their shape exactly.

Each one needs four things:

1. A subclass in `module/sheets/item-sheet.mjs`, above the `// @MARKER ADD NEW item sheet classes
   HERE` line.
2. A template in `templates/item/`, named `item-<type>.hbs`, sharing `item-header.hbs` as the header
   PART exactly as the existing three do.
3. An import added at `module/imagine-rpg.mjs:31` and a `Items.registerSheet` call beside the three
   at lines 128-138.
4. A case in `tools/item-preview.html` so it can actually be looked at.

Option lists come from the existing tables modules, **never retyped into the template** — that rule
is what kept the creature attack sheet honest.

---

## 1. Class sheet

**Why this one first:** it is the only one of the six with a real authoring workflow behind it. The
Elemental Dancer was hand-authored from the dev's Word class template straight into
`src/packs/manual/classes.json`, and **four more classes need the same treatment** — Elementalist,
GME, Inquisitor, Summoner (`UPSTREAM-ISSUES.md` item 22). Today that means editing raw JSON.

`module/data/item-class.mjs` carries three `ArrayField`s that the default sheet renders worst:

- `advancement.titles` — the title names in order
- `advancement.classSkills` — the per-title skill progression (the field added by the Elemental
  Dancer pass; his dictionaries do not carry it)
- `classMods` — his modifier slots

Give all three Add/Remove rows in the manner of the creature attack's rider effects, with the index
written back on `data-index`. **`classMods` has a fixed width of five** for every class except Monk,
which has four — that is his data defect (`UPSTREAM-ISSUES.md` item 1), not something the sheet
should paper over. Do not cap the array at five; render what is there and let a short row look short.

Also surface `casting`, `requirements` (including `requirements.attribQualify`, itself an array) and
the five lore-title fields already on the model — `loreAttackTitle`, `weaponLoreTitle`,
`missileLoreTitle`, `projectileLoreTitle`, and whichever of the second-weapon pair exists by the time
you build this.

**Done when:** a class opens with its three arrays editable, the Elemental Dancer round-trips through
the sheet without losing a field, and Monk's four-wide `classMods` renders without error.

---

## 2. Armour sheet

**Why:** `coverage` is a `SchemaField` of **19 body locations**, each a plain `NumberField`. The
default sheet stacks nineteen inputs labelled `system.coverage.shoulderLeft`. It is the one
structural case among the six.

Lay the nineteen out as a **grid in the schema's own declaration order**, which is already the
charts' order — head, neck, shoulder L/R, torso upper/mid/lower, arm L/R, forearm L/R, hand L/R,
thigh L/R, shin L/R, foot L/R. **Do not alphabetise**, and do not invent a body diagram; paired
locations side by side in two columns is enough and is what the source charts look like.

Surface `material`, the composite second material, `flexibility` (which drives the whole layering
engine), `magicBonus` and the wrist option added in the shield pass.

**Done when:** all nineteen locations edit and write back, the order matches
`module/data/item-armor.mjs` line for line, and a real extracted armour from `src/packs/documents/`
renders correctly in the preview.

---

## 3. Race sheet

**Why:** `attributeMods` and `attributeLimits` are twelve numbers each.

Render both as 12-wide rows in **his canonical attribute order — str agl vit int wis knw app chm soc
aur pty wil** — not alphabetically. Every other attribute display in the system uses that order and
this one must match it. `attributeLimits` is the field `getAttributeMax` reads, so it is load-bearing
rather than decorative; label it clearly as the race's cap, and note on the sheet that title 11 and
above discards it for a flat 27 **[SUPERSEDED 2026-09-19: it is 25 ordinarily and 27 magically -- UPSTREAM-ISSUES item 16]**.

Also surface `endurance`, `characteristicMods`, `resistanceMods` and `movement` (including
`movement.special`).

**Done when:** both 12-wide rows render in canonical order, a real extracted race round-trips, and
the limits row is visibly distinguishable from the mods row — they are twelve numbers each and
confusing them silently changes a character's ceiling.

---

## Verification for all three

`tools/item-preview.html` with a real document from `src/packs/documents/` for each type — not a
hand-typed stub, which is how a field that never populates goes unnoticed. All modules must still
parse (`tools/syntax-check.html`; the count rises from 26 only if you add files, which this does
not — the subclasses live in the existing `item-sheet.mjs`).

**Not verifiable here, and say so on the board:** `Items.registerSheet` has still never been
exercised in a running Foundry V14, because no V14 install exists on this machine. The three existing
item sheets carry the same caveat; do not quietly drop it.
