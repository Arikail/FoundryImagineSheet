# Left for Sonnet — 2026-09-12, resolve the special movement rate

> **This note was rewritten on 2026-09-12 after its first version was found to be wrong.** The
> original said walk/jog/run were correct as straight copies, that fourteen races had no movement
> data, and that every special rate was `base × multiplier + mod`. All three were false. If you have
> a copy of the earlier version, discard it.

**What is already done:** walk, jog and run now resolve correctly, and the preview sheet moves. A
race's movement figures are **modifiers on an Agility base**, and `_prepareMovement` applies
`MOVEMENT_BASE` (generated from his `calcMovement`) before adding them. Read the two 2026-09-12
movement entries in `DECISIONS.md` before starting.

**What is left:** `movement.special` is still never assigned, so a Centaur's Gallop row renders
0 / 0 / 0. That is this task.

**Do not "fix" a race whose walk/jog/run figures are all zero.** That is a race with *no modifier*,
not a race that cannot move, and it now resolves correctly on its own. `UPSTREAM-ISSUES.md` item 23
is withdrawn and explains why.

---

## The mechanic

Each of the three scales carries three fields on the race — `special.hourly` holds the **name** of a
base rate, with `hourlyMultiplier` and `hourlyMod` beside it, and the same again for `tenSec` and
`oneSec`. Resolve against the **already-resolved** `this.movement`, so "Walk" means this character's
finished walk rate, not the race's modifier.

**26 of 105 races have a special rate.** Source: `calcSpecialMovement`, `sheet-worker.js:32110`.

### Three base-rate names, not two

| Name | Races | Means |
|---|---|---|
| `Walk` | 20 | this character's resolved walk at that scale |
| `Run` | 4 — Djinn, Gremlin, Nixie, Sylph | this character's resolved **run** |
| `INT` | 2 — Mephyt(Fire), Mephyt(Ice) | the Intelligence **attribute value**, not a movement rate |

A hardcoded "Walk" would be wrong for six races. Match case-insensitively; on a name you do not
recognise leave the rate at 0 rather than throwing, and **report it** — a fourth name would be a new
fact about his system.

### The formula differs per movement kind — this is the part the old note got wrong

Take the normal path only: no temporary speed modifier, no hooves branch. `M` is that scale's
multiplier, `mod` that scale's additive, `S` the race's speed multiplier.

| `specialName` | Formula | Note |
|---|---|---|
| `Fly:` (Walk/Run) | `(base × M) × S` | line 32371 |
| `Scurry:` | `((base × M) + mod) × S` | **the only kind that uses `mod`** — line 32403 |
| `Gallop:` | `(base × M) × S` | no additive — line 32417 |
| `Swim:` | `(base × M) × S` | no additive — line 32444 |
| `Slither:` | `base × M` | no additive, **no `S`** — line 32452 |

**`Slither:` also zeroes walk, jog, run, `jumpStand` and `jumpUp`** — his comment: *"Slither is the
only movement sssssnake people have"*, and *"Snakes can`t jump"*. Apply that after the ordinary
rates are resolved, or it will be overwritten.

**`INT` has its own shape entirely** (line 32395): hourly and tenSec are `(INT × M) × 30`, oneSec is
`(INT × M) × 3`. Note the 30 / 30 / 3, not 30 / 10 / 1.

### A multiplier of 0 means ×1

Same sentinel as the speed multiplier; his code does it explicitly for all three scales at
lines 32177-32185. 103 of 105 races carry `speedMultiplier: 0`. **Treating a 0 multiplier as a
literal zero is exactly the bug just fixed in walk/jog/run — do not reintroduce it.**
`resolveMovementRate` in `combat-rules.mjs` already handles this for the speed multiplier; follow it.

### Two contradictions in his code — report, do not resolve by guess

1. **INT: comment against data.** His comment says INT *"never has a multiplier, even for speed"*,
   but the normal path applies `hourracemulti` anyway, and both Mephyt races carry `0.75`. Follow the
   **code** (apply the multiplier) per the standing rule, and flag it for him.
2. **INT: the hooves branch disagrees with the normal branch.** At line 32363 the hooves path uses
   `INT × 3` hourly where the normal path uses `× 30`, with a superseded version commented out just
   below it. The hooves path is not reachable for either Mephyt; implement the normal path and note
   the discrepancy rather than trying to reconcile them.

---

## What to change

`_prepareMovement()` in `module/data/actor-character.mjs`. Resolve **after** the walk/jog/run loop,
in the derived model rather than at display time, so every consumer sees a distance rather than a
word. Put the rule itself in `combat-rules.mjs` beside `resolveMovementRate` so the tests can reach
it without building a character.

Intelligence is available as `this.attributes.int.value`.

## Tests

Add to `tools/derive-test.html` beside the movement tests already there.

- **Centaur**: Gallop = resolved Walk × 4 at all three scales.
- **Djinn or Sylph**: Fly is worked from **Run** — catches a hardcoded base.
- **Mephyt(Fire)**: Fly comes from Intelligence with the ×30 / ×30 / ×3 shape, and does **not** read
  any movement rate.
- **Arachen**: Scurry carries a non-zero additive, and the additive differs between hourly and tenSec
  (+4 and +40), so assert both.
- **A Slither race**: the special rate resolves *and* walk, jog, run and both jumps come out 0.
- **A race with a special multiplier of 0**: resolves to ×1, not to 0.
- **A race with no special rate**: resolves to 0 and does not crash.
- **Merfolk**: Swim resolves to a real distance. It used to be cited as proof of a data gap; it is
  not, and a test saying so stops that being "rediscovered".

## Done when

Those pass, the derivation suite is green (138 before this), the other three suites are unchanged
(combat 330, creature 129, availability 39), and 26 modules parse.

Then check `tools/sheet-preview.html`. Its character is a Human(Civilized:Village) with no special
rate, so her `None:` row stays blank and that is correct. A second preview character of a race that
does have one — Centaur exercises Gallop — would be worth adding rather than changing hers, since
the rest of that harness leans on her other derived values.
