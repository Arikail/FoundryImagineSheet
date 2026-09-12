# Left for Sonnet — 2026-09-12, resolve the special movement rate

**The bug in one line:** a Centaur's sheet shows its Gallop as 0 / 0 / 0, because the character model
never resolves the special movement rate from the race.

The diagnosis is done and written up in `DECISIONS.md` → "Special movement is a formula, not a
number, and the port copies it through as text". Read that first. What is left is arithmetic.

**Do not touch the fourteen races with no movement figures** — that is his data, not ours, and it is
`UPSTREAM-ISSUES.md` item 23. A race with no walk rate correctly derives no movement. Inventing
numbers for them would be the worst possible fix.

---

## The mechanic

Every special rate in his sheet is written **relative to another rate**:

```
special rate = <the named base rate> x multiplier + mod
```

`item-race.mjs` already models this faithfully and the extracted data is intact. For each of the
three scales the race carries three fields:

| Field | Type | Holds |
|---|---|---|
| `special.hourly` | String | the NAME of the base rate — `"Walk"` or `"Run"` |
| `special.hourlyMultiplier` | Number | what to multiply it by |
| `special.hourlyMod` | Number | what to add afterwards |

…and the same again as `tenSec*` and `oneSec*`.

**Both parts vary, so neither can be assumed:**

- **The base is not always Walk.** Djinn and Gremlin fly from **Run**.
- **The mod is not always zero.** Arachen's Scurry is Walk × 4 **+ 4** hourly and **+ 40** per ten
  seconds — and note the additive differs between scales, so they must be read independently rather
  than one being derived from another.

26 of the 105 races use a special rate.

## What to change

`_prepareMovement()` in `module/data/actor-character.mjs:697`. It currently loops
`["walk", "jog", "run"]`, copies those three straight across, then copies `specialName`, `jumpStand`
and `jumpUp` — and never assigns `movement.special`.

Add the resolution after the existing loop. Walk, jog and run stay **straight copies**; only
`special` is resolved. Resolve it **there, in the derived model, not at display time**, so that every
consumer — the sheet, a chat card, future travel rules — sees a distance rather than a word.

For each of the three scales:

1. Read the base rate's name from `special.<scale>`.
2. If it is empty, leave the resolved value at 0 and stop — most races have no special rate.
3. Look up that named rate on the **already-resolved** `this.movement` (so `"Walk"` means this
   character's walk at the same scale).
4. Multiply by `<scale>Multiplier`, add `<scale>Mod`.

**Match the base-rate name case-insensitively and fall back to 0 on a name you do not recognise**,
rather than throwing — his data uses `"Walk"` and `"Run"` today, but a typo in one row should cost
that race its special rate, not break the whole sheet. **If you find a third base name in the data,
stop and report it** rather than mapping it by guess; that would be a new fact about his system.

## Tests

Add to `tools/derive-test.html` beside the other derivation tests:

- **Centaur**: Gallop = Walk × 4, at all three scales.
- **Djinn or Gremlin**: Fly is worked from **Run**, not Walk — this is the test that catches a
  hardcoded base.
- **Arachen**: Scurry carries a non-zero `+ mod`, and **the mod differs between hourly and tenSec**
  (+4 and +40), so assert both.
- **A race with no special rate at all** resolves to 0 and does not crash.
- **Merfolk**: Swim is Walk × N where Walk is 0, so the resolved rate is 0. This is correct
  behaviour, not a failure — it is upstream item 23, and the test exists to stop someone "fixing" it
  later by special-casing.

## Done when

The five tests above pass, the derivation suite is green (123 before this), the other three suites
are unchanged (combat 330, creature 129, availability 39), and 26 modules parse.

Then check `tools/sheet-preview.html`: the preview character is a **Human(Civilized:Village)**, one
of the fourteen with no movement data, so **it will still show zeros and that is correct**. Consider
adding a second preview character of a race that does move — Centaur exercises the formula — rather
than changing the existing one, whose other derived values are relied on by the rest of that harness.
