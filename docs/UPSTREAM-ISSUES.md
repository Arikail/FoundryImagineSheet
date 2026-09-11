# Upstream Issues — findings for the original developer

Defects and open questions found in the Roll20 sheet while porting it. These are **his** sheet, not ours, so nothing here has been silently patched — the conversion works around them and records them for him to confirm or fix.

Status: `open` (not yet raised) / `raised` (passed to him) / `answered` / `fixed upstream`.

---

## 1. `Monk` class row is one column short — affects the live sheet

**Status:** open · **Severity:** real bug, currently visible in play

`classRequirementsAndDetails["Monk"]` has **21 columns**; all 87 other classes have 22. Monk carries only 4 `classMod` slots (indices 11–14) where every other class has 5 (11–15). Every field after that point is shifted left by one.

Because `classDetails[16]` is read as armour usage (sheet-worker.js:51018), and Monk's index 16 holds the *weapon* list, **Monk's armour usage currently displays weapon data**. Later fields (`classModifier`, `titleName`, `attribQualify`, `casting`) are all shifted too.

Monk, index 11 onward:
```
11 "+30% to core skills"
12 "+10% to divine skills"
13 "+5% to combat skills"
14 ""                          <- only 4 mod slots; others have 5
15 "Any leather/hide. Any half shirt..."   <- armour usage, should be index 16
16 "Bola, bow, cat's claws, club..."       <- weapon usage, should be index 17
```

Likely fix is inserting one empty `classMod` slot after index 14, but that's his call to confirm — guessing means altering game data.

## 2. `"Gaunt"` race carries a live expression where every other race has a literal

**Status:** open · **Severity:** question, may be intentional

`raceStatsAndMoveDetails["Gaunt"]` contains `0-getDieRoll(4)` — a function call embedded in the data. It is the **only** non-literal value across all 12,595 extracted dictionary entries.

If it's intentional (a race whose stat is randomised per character), the Foundry port needs to model it as a roll rather than a fixed value. If it's a leftover from debugging, it should be a literal. Needs his answer either way.

## 3. Is this sheet the current ruleset?

**Status:** open · **Severity:** blocking for bulk extraction confidence

He described `getArmorCombatValues` from memory rather than sending the file, so it's not confirmed whether `sheet-worker.js` as extracted reflects his present intended rules or a version he has since moved past. ~12,595 data rows are being taken from it.

## 4. "Made by half" vs the ±20% critical rule

**Status:** open · **Severity:** rules clarification

His attribute-save handlers compute `halfChance = chance / 2` and report a distinct "succeeded by half" tier (sheet-worker.js:47). The Player's Guide (p.93) instead defines critical success/failure as beating or missing by more than 20%.

These are different mechanics. Possibly saves and skills genuinely use different rules — needs confirming which applies where. His code wins regardless; the question is only scope.

## 5. Data edge cases found while converting 2,814 entries

**Status:** open · **Severity:** minor, mostly rules clarifications

The conversion runs 99.75% clean. These seven entries do not convert to a plain value and currently degrade to a default. None is urgent, but each wants a one-line answer:

| Entry | Field | Value | Question |
|---|---|---|---|
| `Sense Supernatural` | skill rating | `"Special"` | How is a skill with no numeric rating resolved? |
| `Garrote` | cut mode | `"S"` | Situational cut, as with its speed? |
| `Centaur` | jumpStand / jumpUp | `"Half"` | Half of the normal jump distance, presumably? |
| `Gaunt` | startEnduranceMod | `0-getDieRoll(4)` | Same as item 2 above — random by design? |

**Resolved without needing input** (recording them so the reasoning is visible):
- `"S"` in an armour coverage slot means the value comes from the material rather than the piece (giant chitin/scales/leather gauntlets). Preserved as a `coverageFromMaterial` list rather than flattened to 0, since a 0 would falsely claim the piece offers no protection there. Resolving them properly needs the giant-material rules.
- `"S"` as a weapon speed means no ordinary swing timing — lances, caltrops, garrotes. Now a `speedSpecial` flag.
- Parenthesised values like `"8(6)"` and `"5d6(2d6)"` are a dual-headed weapon's second head — the Axe Hammer's axe at 5d6/speed 8 and hammer at 2d6/speed 6. Now an `alternateHead`.
- Composite flexibility (`Rigid/Flexible`, `Rigid/Semi-Flexible`, `Rigid/Rigid`, `Mixed`) is the data encoding of the built-in-padding rule, which lets a rigid piece with a flexible inner face sit against the body. `Rigid/Rigid` is legitimate too: "a few suits allow two sections of rigid armor because they do not touch."
