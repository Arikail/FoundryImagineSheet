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

## 8. Creature attribute maximums follow a different scale from Character's

**Status:** open · **Severity:** question, may be intentional

`handleCreatureFinish` (sheet-worker.js:174723-174753) sets every attribute maximum, and every magical maximum, to 25, 28 or 30 by `creature_level` (under 10 / under 15 / otherwise). His Character path works differently: maximums start at the race's limits (`str_tmp_limit` etc., line 8099) and `setArchMortalAttributesMax` lifts them all to 27 at title 11 (line 27549). The two may simply be separate scales, since a creature's level is not a character's title, but nothing in the code says so and the numbers do not line up (28 has no Character equivalent). Worth asking whether creature levels 10 and 15 are meant to correspond to any title.

## 9. Five insect body charts write a torso multiplier without its "x"

**Status:** open · **Severity:** data typo, probably understates Endurance

Every body area in every other chart writes its multiplier as `x1`, `x2`, `x1/2` and so on. Five charts in `getBodyList` (sheet-worker.js:175002 onward) instead write `Vital:2` for their thorax sections: `Prothorax`, `Mesathorax` and `Metathorax` in **Giant Insect** and **Giant Insect(Wings)**, and `Thorax` in **Insectoid**, **Insectoid(Wings)** and **Insectoid(Wings/Stinger)**.

`createBodyAreas` (line 180208) looks for `"x2"`, `"x3"` and so on, so `Vital:2` matches nothing and `tempMulti` is never assigned for that area. Because `tempMulti` is an implicit global, it keeps the multiplier of the *previous* area. In all nine cases that area is `x1`, so each thorax section currently gets x1 Endurance.

The evident intent is x2: the thorax is the insect's torso, and torso sections are x2 in every other chart (`Upper Torso(Vital:x2)`, `Abdomen(Vital:x2)`). The Foundry port reads the same data and also produces x1, so the two agree today. Not patched, because correcting it changes his game data (same reasoning as item 1). If he confirms x2, it is a five-line fix in his data and the port's tables regenerate from it.

## 10. Creature abilities never get the mechanical treatment racial abilities do, and the two lists disagree

**Status:** open · **Severity:** question; affects how creatures play, and which list the port builds from

There are two copies of each dictionary: a Character-side one used for racial abilities (`getRacialAbilityDetails`, `getRacialDisabilityDetails`, `getRacialImmunityDetails`, sheet-worker.js:45721, 45899, 45984) and a larger creature-side one (`getCreatureAbilityDetails`, `getCreatureDisabilityDetails`, `getCreatureImmunityDetails`, lines 176209, 177693, 177961). Columns are canonical name `[0]`, two values `[1]`/`[2]` whose meaning varies by entry, and description `[3]`.

**The Character path uses them mechanically.** `setTempRacialAbilities` (line 46293) walks a race's abilities, switches on each canonical name `[0]`, sets a `tmp_abilities_*` flag per ability, and reads `[1]`/`[2]` where they carry a number: hide armour value, hide Endurance-per and limit, infravision distance and others. Disabilities and immunities work the same way (lines 46823, 47038). The `immunities_*` flags that the resistance code checks are set from these.

**The creature path does not.** `createFullCreatureAbilities`, `...Disabilities` and `...Immunities` (lines 175436-175495) only concatenate `[3]` into a display string. None of the `tmp_abilities_*` or `immunities_*` flags are ever set for a creature. So a creature with "Infravision 60`" gets no infravision distance, and a creature listing "Poison" immunity is not treated as immune unless "Immune" is also typed into its poison resistance. Its only automatic ability effects are a few substring checks in `calcAllCreatureCaracs` (line 178346): +10 Perception, Affinity or Fortune for the matching "Enhanced ..." ability, and +5 Perception per sense ability and for the skills Smell, Listen and Life Sense.

**The two lists have drifted apart.** The immunity lists are identical. 40 racial abilities (such as Animal Shape, Gift of Magic and the "Natural Weapons(...)" entries) are missing from the creature list. Of the names both lists share, 39 abilities and 2 disabilities have different rows, mostly different descriptions. The differences that matter mechanically:

| Ability | Racial list | Creature list |
|---|---|---|
| Infravision30 ... Infravision180 | canonical name `Infravision` | canonical name `Infravision 30\`` etc. |
| Enhanced Taste | 30, 50 | blank, blank |
| Swimming | blank | 50 |
| Webbed Feet/Hands | blank | 30 |
| Terrain Blending | blank | 20 |
| Not Easily Surprised | blank | -15 |
| Quiet Flier / Raking Claws / Raking Talons/Claws / Metal Mechanical Form | as written | renamed `Quiet Flyer`, `Claws(Raking)`, `Talons/Claws(Raking)`, `Metal-Mechanical Form` |

The canonical-name differences matter because the racial switch keys on `[0]`. A name taken from the creature list would not match its `case`.

**Questions:** Is it intended that creatures skip the racial switch? And where the lists disagree, which one is correct? The port wants one ability compendium, so it needs to know which row to keep.

**What the port does meanwhile:** it builds the union of both copies and keeps the creature row wherever they differ, reporting all 41 conflicts and 40 racial-only entries on every content build. If the racial copy is the correct one for any of those names, say which and the build flips them — see `DECISIONS.md`, "Trait content: three packs, and the creature row wins".

**Checked and not raised:** `immunitylist["Cold"]` has canonical name "Frost". That is a deliberate alias: `"Frost"` has its own identical row (lines 177972 and 178022, and again in the racial list), which is what the canonical-name column is for. The creature ability list also repeats five keys (Breath Attack(Fire), Electric(Plant), Enhanced Hide(Bone), Fins/Flippers/Fluke, Hide Scales) and the racial list repeats one (Hide(Feathers/Fur)). The repeated rows are identical, apart from one "Plant"/"plant", so the later copy winning changes nothing.

## 11. Four attack paths lose or double-count to-hit modifiers

**Status:** open · **Severity:** real bug; removes STR/AGL to-hit modifiers in normal play

The brawling, natural-weapon, evoke and creature attack paths (sheet-worker.js:69707, 70030, 70343, 179758) add up their to-hit modifiers like this:
```js
toHitMod=toHitMod+parseInt(values.combat_mod_melee_str)||0;
toHitMod=toHitMod+parseInt(values.combat_mod_melee_other)||0;
```
Because `||` binds more loosely than `+`, each line means `toHitMod = (toHitMod + parseInt(x)) || 0`. If any field fails to parse, the whole running total resets to 0, not just that one term. `setCombatModifierValues` (lines 82347 and 82358) sets `combat_mod_melee_other` and `combat_mod_missile_other` to `"-"` whenever there are no other modifiers, which is the normal case. So:
- **Melee:** the Strength to-hit modifier added on the line before is wiped.
- **Missile** (creature attacks of type Missile, Glob or Bolt, and Projectile natural attacks): these add `combat_mod_missile`, which is already Agility plus the other modifiers (line 82356), and then `combat_mod_missile_other` as well. With no other modifiers, the `"-"` wipes the Agility modifier. With other modifiers, they are counted twice.

The main weapon attack, `handlePhysicalAttacks`, reads each value into its own variable (lines 64367-64370) and sums them. That is the evident intent, and what the Foundry port does. It is unaffected, and so is the combat already ported. The four affected paths are not ported yet; when they are, they will follow `handlePhysicalAttacks`.

## 12. `rebuildRepeatingBodyRows` never fetches `creature_type`

**Status:** open · **Severity:** minor

`rebuildRepeatingBodyRows` (sheet-worker.js:178211) checks `values.creature_type` to choose between `creature_end` and `endurance`, but `creature_type` is not in its `getAttrs` list, so its creature branch can never run and it always uses `endurance`. This is mostly harmless: `handleCreatureFinish` also writes the creature's Endurance into `endurance` (line 174948). It only matters when a temporary Endurance modifier is on a creature. `calcAllCreatureCaracs` adds that to `creature_end` but not to `endurance`, so body rows rebuilt this way ignore it. (The function also wraps its real `getAttrs` in three nested `getAttrs(['title'])` calls that use nothing. That is harmless and not ported.)

## 13. `divideWithMinAndMax` never applies its maximum

**Status:** open · **Severity:** real bug; area attacks have no upper limit

```js
function divideWithMinAndMax(tmpDividend, tmpDivisor, tmpMaxValue) {
    tempValue=parseInt(tmpDividend/tmpDivisor);
    if (tempValue<1) { tempValue=1; }
    if (tempValue>tmpMaxValue) { tempValue=>tmpMaxValue; }   // <- "=>" not "="
    return tempValue;
}
```
(sheet-worker.js:25601.) `tempValue=>tmpMaxValue` is an arrow function, not an assignment: it builds a function, throws it away, and leaves `tempValue` untouched. So the ceiling is silently ignored and only the floor of 1 works.

Seven call sites depend on it. Six are the creature area attacks (sheet-worker.js:179808-179827), where it sets how far a Bolt travels and how far a Cone reaches: a Weak Bolt is meant to stop at 100 feet, a Bolt at 150 and a Strong Bolt at 200, and a creature with high Endurance currently exceeds all of them without limit. The seventh is an invocation value (line 156907) capped at 10.

The port applies the ceiling, which is plainly what the argument is for, and the difference is recorded here. The Cloud and Glob shapes are unaffected: they cap through `setIntHighBounds`, which is written correctly.

## 14. A martial-arts damage multiplier is assigned to the wrong variable

**Status:** open · **Severity:** real bug; the multiplier is dropped

In the creature attack's multiplier handling (sheet-worker.js:180004-180010):
```js
if (MAModMulti>1.0) {
    if (damMulti>1.0) {
        damMulti=damMulti+MAModMulti;
    } else {
        damMult=MAModMulti;          // <- damMult, not damMulti
    }
}
```
`damMult` is a different name, so in the common case -- a martial-arts multiplier with no other multiplier already in play -- the multiplier is written to a variable nothing reads and the damage is never multiplied. The situational branch just above it is spelled correctly. Martial arts is phase 2 and not ported yet; noted so it is not reproduced.

## 15. A creature's called shot does not halve its damage

**Status:** open · **Severity:** rules inconsistency between the two sheets

His character path halves a called shot's damage, and the Player's Guide says a called shot does half damage whether or not it lands. His creature path (sheet-worker.js:179907-179993) never applies that: `damMulti` is only ever set from critical-fumble text or a situational multiplier, so a creature's called shot does full damage.

The port halves it for both actor types, so the same rule does not change meaning depending on who is swinging. Flagged because it is a deliberate departure from his creature code, unlike the rest of the creature port.

**Also noticed, not worth its own entry:** the hand-to-hand test at sheet-worker.js:180022 reads `if (creatureAttackType.includes("Melee") || creatureAttackType.includes("Touch") && tmpLargeAttackDetails=="")`. Because `&&` binds tighter than `||`, the "no area shape" condition only applies to Touch, not to Melee. It gates the extra magical damage and special magic text, neither of which is ported yet.

## 16. The arch-mortal attribute maximum: the comment says 25, the code sets 27

**Status:** open · **Severity:** question, one of the two numbers is wrong

At the title-up commit, `setArchMortalAttributesMax(newTitle)` is called with this comment:

> `// at 11th and higher racial maximums are discarded and 25 is the new max.` (sheet-worker.js:66140)

but the function itself (line 27549) sets all twelve maximums to **27**, not 25. One of the two is wrong and only he can say which. The port follows the code and uses 27.

**Worth confirming at the same time:** his sheet has no other title-driven maximum at all. Nothing caps an attribute by title below 11, and nothing raises the maximum at title 16 — there is no deity equivalent of `setArchMortalAttributesMax`. Every assignment to a `*_max` attribute was checked. The Master's Manual describes mundane, mortal, arch-mortal and deity ranges of 23 / 25 / 27 / 30, and the Foundry port originally implemented those tiers from the book; it has since been corrected to follow the sheet instead (see `DECISIONS.md`). If the book's tiers are meant to apply in play, his sheet is not applying them.

## 17. The Snake armour map is one position out of step with the Snake(Arms) chart

**Status:** open · **Severity:** real bug; armour lands on the wrong part of the snake

`getArmorValuesByBodyTypeAndArmor` (sheet-worker.js:105929) picks an armour slot from the area's **position** in the body chart, and its Snake branch is written for a chart running Head, Upper Length, Lower Length, then shoulders, arms and hands. Neither Snake chart is shaped that way:

| Position | His Snake branch expects | `Snake` chart | `Snake(Arms)` chart |
|---|---|---|---|
| 0 | Head | Head | Head |
| 1 | Upper Length | Upper Length | Upper Length |
| 2 | Lower Length | Lower Length | **Left Shoulder** |
| 3 | Left Shoulder | Tail | **Right Shoulder** |
| 4 | Right Shoulder | — | **Left Arm** |

For the plain `Snake` the branch is harmless: only the first three positions exist, and they line up. For `Snake(Arms)` everything from position 2 on is displaced by one, so a Left Shoulder takes the Lower Torso armour value, a Right Shoulder takes the Left Shoulder's, and so on down the arms. `Snake(Arms)` also puts Lower Length at position 10, where his branch has a hand.

The port keys this mapping by area name instead of by position, so it does what the comments in his branch say rather than reproducing the shift, and every disagreement is reported when the tables are regenerated.

## 18. The Centaur armour map has a Mid Torso the Centaur chart does not

**Status:** open · **Severity:** real bug; armour lands on the wrong part of the centaur

Same function, same cause. His Centaur branch maps position 9 to "Mid Torso", but the Centaur chart has no Mid Torso — it runs Upper Torso, then the arms and hands, then Underbelly. So from position 9 the mapping is displaced:

| Position | His Centaur branch expects | `Centaur` chart | Effect |
|---|---|---|---|
| 9 | Mid Torso | Left Hand | a hand takes the Mid Torso value |
| 10 | Left Hand | Right Hand | the other hand takes the Left Hand value |
| 11 | Right Hand | Underbelly | the underbelly takes a hand's value |
| 12 | Underbelly | Forequarters | the forequarters get nothing |
| 13 | Forequarters | Left Foreleg | the barding lands one position early |

The barding rule itself is fine and worth keeping: the quarters, forelegs and hindlegs take armour only from an item whose name contains "Centaur Barding", and nothing otherwise. It is only the positions that have slipped.

**Also worth a look while you are in there:** `Humanoid(Fish Tail)` has 14 areas ending in a Finned Tail at position 13, which is where the Humanoid branch maps a Left Thigh — so a merfolk tail is armoured as though it were a thigh. And the Insectoid charts name positions "Left Mid Claw/Hand" and "Left Lower Leg" where the branch's comments say "Left Mid Claw" and "Left Shin"; those two are only wording, and the mapping is right.
