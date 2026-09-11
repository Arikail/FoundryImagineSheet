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
- ~~Parenthesised values are a dual-headed weapon's second head.~~ **Corrected 2026-09-11:** parenthesised *damage* is a different damage in one attack mode (a Spear thrown, an Axe Hammer thrusting), and parenthesised *speed* is reload time for launched weapons (a Crossbow is `1(15)`). See `DECISIONS.md`.
- Composite flexibility (`Rigid/Flexible`, `Rigid/Semi-Flexible`, `Rigid/Rigid`, `Mixed`) is the data encoding of the built-in-padding rule, which lets a rigid piece with a flexible inner face sit against the body. `Rigid/Rigid` is legitimate too: "a few suits allow two sections of rigid armor because they do not touch."

## 6. Bugs found in his combat code

**Status:** open · **Severity:** real bugs; each defeats its own evident intent

Found while porting combat. In each case the Foundry port implements what the code was clearly *meant* to do, and the difference is listed here so he can confirm or correct it.

| # | Where | What happens | Effect in play | Port does |
|---|---|---|---|---|
| a | `getArmorDamage` (sheet-worker.js:118851) | Walks the *area's* armour list but reads names from the character's *full* equipped list by the same index (`tempEquippedArmorAndClothingArray[i]` instead of `tempAreaEquippedArmorArray[i]`). | The wrong armour piece's material can set how fast armour degrades. | Uses the armour actually covering the struck area. |
| b | same | The magic check is `!tempAreaEquippedArmorArray.includes("+")`. On an array, `includes` compares whole elements, so it is only true if an element is exactly `"+"` -- never. | Magical armour is degraded like mundane armour, which the comment says must not happen. | Magical armour is not degraded. |
| c | `getArmorValue` is declared twice (lines 104551 and 118903) | A later function declaration silently replaces an earlier one with the same name. | The first version -- which reads an armour *item's* value, including the rule that "S" means "take the number after the colon" for giant materials -- is dead code. Anything calling it gets the material-rank version instead. | Uses the second, as JavaScript does. The first's intent is noted for when giant materials are ported. |
| d | `handleIntiativeUpdate` (line 69035) | `tmpCombatModInitINT=parseInt(values.combat_mod_init_agl)` reads Agility into the Intelligence variable. | When a martial stance changes, Intelligence is never considered for initiative. His main initiative path (line 82366) is correct. | The better of Agility and Intelligence, as the book and his main path say. |
| e | `createBodyAreas` (line 180218) | Tests `"x1/2"` before `"x1/20"`, and `"x1/20"` contains `"x1/2"`. | An area marked x1/20 gets half Endurance instead of a twentieth. No stock body chart uses x1/20, so only custom areas are affected. | Tests the longer fractions first. |
| f | `armorblockingdict`, rows `Poison` and `Disease` | Both are `[0, 0, 0, 0]`, and a zero means "no damage" -- even with no armour at all. | Poison or disease applied as body damage does nothing unless "bypass armour" is ticked. | Same as his, deliberately, and flagged. It is probably meant to be applied with bypass. |

## 7. Where the rulebook and his code disagree

**Status:** open · **Severity:** clarification. His code is followed in each case.

| Rule | Player's Guide says | His code does |
|---|---|---|
| Natural 20 | "an unmodified roll of 20 is always a hit" | No such check: a natural 20 with a big enough penalty can miss. |
| Grandmaster | The attack skill table stops at Master | Adds Grandmaster, but only on the Weapon Lore chart, for mastered weapons ("cannot set Grandmaster for standard Attack Chart so just use Master"). |
| Axe Hammer speed | -- | Its speed is written `8(6)`, and his code reads any bracketed minimum speed as a *reload* time, so an Axe Hammer gets a 6-second reload. Probably meant as its thrusting speed. |

## 8. Creature attribute cap uses different tiers than Character's, with no shared rationale found

**Status:** open · **Severity:** question, may be intentional

`handleCreatureFinish` (sheet-worker.js:174723-174729) caps a creature's attributes at 25/28/30 by `creature_level` (<10 / <15 / else). The already-ported Character cap (`getAttributeCap`, from Master's Manual) caps at 23/25/27/30 by `title` tier (0 / 1 / 11 / 16). A creature's "level" and a character's "title" may simply be different scales that were never meant to line up — but nothing in the code states that, and the numbers don't obviously correspond. Worth asking whether creature level 10/15 are meant to track any particular title threshold.

## 9. `immunitylist["Cold"]` names itself "Frost"

**Status:** open · **Severity:** minor, cosmetic

`immunitylist["Cold"] = ["Frost", "", "", "Frost(Cold does not harm...)"]` (sheet-worker.js:177972) — the dictionary key is "Cold" but its own canonical name and description both say "Frost," and the disability list's related entries ("Frost Weakness", "Frost Sensitivity") consistently use "Frost." This looks like a leftover synonym rather than the deliberate case-only aliasing seen elsewhere (e.g. the three "360-degree vision" capitalization variants at lines 176214-176216, which are the same word). Not urgent; a one-line confirmation would settle whether "Cold" should just be renamed to "Frost" for consistency.

## 10. Ability/Disability/Immunity dictionaries carry two numeric columns that are almost never consumed

**Status:** open · **Severity:** design question for the Foundry port, not a bug in his sheet

`abilitylist`, `disabilitylist` and `immunitylist` (sheet-worker.js:176213, 177698, 177965 — the creature-scale versions; smaller Character-only twins exist at 45725, 45903, 45984) each carry two numeric/dice-string value columns (`[1]`, `[2]`) alongside the description text (`[3]`). Their meaning is entry-specific rather than columnar (for `"Frost Sensitivity"`, `[1]` is a magic-resist penalty and `[2]` is "+1 damage per die"; for `"Acid Resistant"`, `[1]` is a damage multiplier and `[2]` is a magic-resist bonus). In practice, almost nothing in the sheet-worker actually reads `[1]`/`[2]` at calculation time — the handful of abilities that do have a mechanical effect (`"Enhanced Perception"`, `"Sense"/"Sensing"`, etc.) are instead detected by substring-matching the creature's flattened ability-name string in `calcAllCreatureCaracs` and similar functions, not by looking up these columns. So today the columns are effectively unused flavor text for all but a few hand-coded exceptions. Worth asking whether `[1]`/`[2]` were meant to eventually drive automatic effects generically (in which case the Foundry port should honor that intent) or whether they've always been just descriptive bookkeeping alongside the prose in `[3]`.
