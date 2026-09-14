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

**Found again in a second function.** `equipShield` (line 103777) writes a shield into
`bodyAreaShieldLayer5[N]` by the same positions, and its Snake branch is written for the same
chart that does not exist: its own comments put the right forearm at 8 and the right hand at 10,
which is where they sit on the chart above, not on `Snake(Arms)`. So the shift is reproduced
there too. The port keys the shield table by area name for the same reason.

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

**Found again in a second function.** `equipShield` (line 103777) has the same Centaur gap: its
Buckler branch puts the right hand at position 11, which is a Humanoid's Right Hand but a
Centaur's Underbelly, and its Body branch reaches positions 15 and 17 for the foreleg and fore
shin, which on the real chart are the fore shin and the hindquarters. The port keys the shield
table by area name for the same reason.

## 19. Seventeen lore title gates are written `=>` instead of `>=`, so they never gate anything

**Status:** open · **Severity:** real bug, currently visible in play; every affected lore counts as acquired from title 1

Item 13 records one place where an assignment was typed as an arrow function. It is not the only one. Searching the whole sheet for `=>` used where a comparison was meant finds **eighteen** occurrences: line 25604 (already filed as item 13) and seventeen title gates of this shape:

```js
if (currentTitle=>whenWeaponLoreAcquired) { // acquired.
```

`currentTitle=>whenWeaponLoreAcquired` is not a comparison. It builds an arrow function and discards it, and a function object is always truthy, so the branch is taken **whatever the character's title**. Every one of these gates is therefore inert, and the lore in question reads as acquired at title 1.

| Lines | Gate |
|---|---|
| 49870, 83017, 90504 | Weapon Lore acquired |
| 49915, 49925, 83025, 90524 | Missile Lore acquired |
| 49970, 49980, 83188 | Second Weapon Knowledge acquired |
| 50025, 50035, 83242 | Second Weapon Lore acquired |
| 50117, 50127 | Projectile Lore acquired |
| 50199, 50209 | Multiple Missile Lore acquired |

**What it changes in play.** These are not display-only. The gate at 82275 that *is* written correctly (`(currentTitle+1)>whenWeaponLoreAcquired`) grants +2 melee, +4 damage and +10% to skills once Weapon Lore is acquired; the broken gates control the same acquisition elsewhere, including the weapon speed adjustment in `getWeaponSpeedListingAdjustmentForModifier` (line 90484). So a title 1 character reads as having lore they should not have, in whichever of the two code paths runs.

**Worth checking together with this:** the two spellings of the correct test are not equivalent either. Line 82275 uses `(currentTitle+1)>whenAcquired` while line 83017 means `currentTitle>=whenAcquired`; those agree, but only by accident of the `+1`. Whichever he intends should probably be written the same way in both.

The port does not reproduce any of this: the Lore *attack chart* is keyed off `getLoreAttackChart`, whose own `tempTitle>=N` comparisons are written correctly. The six lore-acquisition tables (`getWeaponLoreWhen`, `getMissileLoreWhen`, `getProjectileLoreWhen`, `getMultiMissileLoreWhen`, `getSpellLoreWhen`, `getArmorLoreWhen`, lines 94997-95884) are a separate piece of work and are not ported yet.

**Also worth a look while you are in there:** `Humanoid(Fish Tail)` has 14 areas ending in a Finned Tail at position 13, which is where the Humanoid branch maps a Left Thigh — so a merfolk tail is armoured as though it were a thigh. And the Insectoid charts name positions "Left Mid Claw/Hand" and "Left Lower Leg" where the branch's comments say "Left Mid Claw" and "Left Shin"; those two are only wording, and the mapping is right.

**All six do have a correctly written gate — they are not blocked.** Every one of the six is
gated correctly inside `setGeneralCombatModifierDisplay` (line 82451), in the form
`if ((currentTitle+1)>whenAcquired)`, which for whole titles is exactly `title >= when`:

| Lore | Correct gate | Broken gates elsewhere |
|---|---|---|
| Weapon Lore | 82558 | 49870, 83017, 90504 |
| Missile Lore | 82589 | 49915, 49925, 83025, 90524 |
| Second Weapon Knowledge | 82620 | 49970, 49980, 83188 |
| Second Weapon Lore | 82657 | 50025, 50035, 83242 |
| Projectile Lore | 82715 | 50117, 50127 |
| Multiple Missile Lore | 82763 | 50199, 50209 |

Not one of the seventeen broken gates is inside that function; they are all in other paths. So the
intended rule is stated unambiguously in your own code for all six, and none of them needs a
decision from you before it can be ported — only the broken gates need fixing. `setCombatModifierValues`
(82167) gates Weapon and Missile Lore correctly too, so the numeric path for those two is sound.

## 20. "Enduring All" endures nine damage types out of ten

**Status:** open · **Severity:** question, may well be intentional

`getIsEndured` (sheet-worker.js:120871) switches on the damage type, and each case looks for its
own tag on anything worn and then for a blanket `Enduring All`:

```js
case "Frost":
    if (tempEquippedArmorAndClothing.includes("Enduring Frost")) { wasEndured=true; }
    if (tempEquippedArmorAndClothing.includes("Enduring All")) { wasEndured=true; }
    break;
```

Nine of the ten cases are written exactly that way — Light, Sonic, Frost, Kinetic, Flame,
Electricity, Acid, Aura/Divine and Life/Death. The tenth is not:

```js
case "Obliteration":
    if (tempEquippedArmorAndClothing.includes("Enduring Obliteration")) { wasEndured=true; }
    break;
```

So a character wearing `Enduring All` still takes Obliteration damage in full, and needs
`Enduring Obliteration` specifically.

That may be exactly right — Obliteration reads like the damage type nothing is meant to shrug
off, and making the blanket tag stop short of it is a reasonable design. But it is also precisely
what a dropped line looks like, and the name "Enduring All" says otherwise. Worth one word either
way.

**What matters about it in play:** an endured blow does not simply take less damage. His handler
branches past the entire apply block for it (`else if (!reboundOn && !enduredOn)`, line 71249),
so an endured blow does **nothing** — no damage, no armour wear, no effect triggered. So this is
the difference between total immunity and none at all, not a matter of degree.

**What the port does:** follows the switch exactly. `ENDURED_BY` in `module/combat-tables.mjs` is
generated from it, so if the line is added upstream the table picks it up on the next run.

**Also worth a glance while you are there:** the `else` that catches a rebounded or endured blow
(line 71439) carries the comment `// Area is already lost (nothing more can be done to it)`. The
lost-area case is handled separately and earlier, at line 71322, so that comment is stale rather
than wrong-in-effect — the branch is reached by rebound and endure. Only the comment misleads.

## 21. The per-weapon lore bonus reaches the attack, but Missile Lore's damage is dropped

**Status:** open · **Severity:** real bug; a specifically lored missile weapon does no extra damage

*(Rewritten 2026-09-12. An earlier version of this item said the per-weapon tier was never applied
at all. That was read from the stored-modifier path alone and was wrong — the attack path does
apply it. The real defect is narrower and is below.)*

Weapon Lore and Missile Lore each grant two tiers: a general one for every weapon of the kind and
a larger one for a weapon named in the lore list. `handlePhysicalAttacks` applies the specific
tier properly, by taking the general modifier back off and putting the specific one on
(sheet-worker.js:64764-64781):

```js
modMeleeOther=modMeleeOther-2;   // remove the general +2
modWL=3;                          // apply the specific +3
modDamOther=modDamOther-4;        // remove the general +4
WLDamMod=6;                       // apply the specific +6
```

`modWL` reaches the melee to-hit total (64806) and `modML` the missile one (64804). `WLDamMod`
reaches the rolled damage (65092). **`MLDamMod` does not.** It is set to 6 at 64777, it is tested
at 65017, it is added to `totalDamMod` for the printed listing at 65063 — and it is missing from
the sum that actually rolls:

```js
damageRolled=damageRolled+modDamStrength+modDamWeight+modDamOther+DamMod2Hand+offHandDamMod
            +modSoldieringDamage+WLDamMod+sitModDamage+modProjLoreDamMod
            +multiMissileKnowMissileDamMod+MAModDamage+tempMartialStanceModDamage;
```

`WLDamMod` is there; `MLDamMod` is not. So a character with Missile Lore in a specific bow is
told in the damage listing that they get +6, and does not get it. Melee is unaffected.

**Separately, the weapon speed is still a tangle.** `getWeaponSpeedListingAdjustmentForModifier`
(90484) gives a lored weapon a further -1 with the comment "only give a -1 more, -1 is already
accounted for in the general mod". That comment is stale: the general -1 is not in the general
modifier. It was deliberately removed, and the reason is at line 82273 — "Removed because you
can`t add a general mod for speed for weapon lore if the weapon might only be a missile weapon" —
which `combat_mod_weaponspeed` (82394) confirms, summing only Strength, Agility, armour, divine
mobility and the temporary modifier. So the panel promises -1 general and -2 specific, and the
sheet delivers 0 and -1.

**What the port does:** applies both tiers to to-hit, damage and speed, for melee and missile
alike, with the specific figure replacing the general one exactly as your attack code does. That
means it gives the missile damage your listing promises, and gives -1/-2 on speed. The
melee-versus-missile problem that forced the speed removal does not arise here, because the port
works lore out per weapon and per attack mode rather than as one figure for the whole character.

**Worth deciding at the same time:** whether the -1 general weapon speed should apply to melee
weapons only, which is what your removal comment implies you wanted and could not express with a
single character-wide modifier.


## 22. Five classes have no `classRequirementsAndDetails` row at all

**Status:** open · **Severity:** real gap; those classes cannot be built from the sheet alone

`classtitledict` and `goalupdict` each hold **92** classes. `classRequirementsAndDetails` holds
**88**. Five names appear in the first two and in no row of the third:

| Class | In `classtitledict` | In `goalupdict` | In `classRequirementsAndDetails` |
|---|---|---|---|
| Elemental Dancer | yes | yes | **no** |
| Elementalist | yes | yes | **no** |
| GME | yes | yes | **no** |
| Inquisitor | yes | yes | **no** |
| Summoner | yes | yes | **no** |

So your sheet knows those classes' title names and goal attributes, and knows nothing about their
requirements, class modifiers, armour or weapon usage, attack progression or description. Four of
the five are also in `getLoreAttackChart`, so the sheet will happily work out a Lore attack chart
for a class it cannot otherwise describe.

("GME" may not be a playable class at all — worth confirming rather than assuming.)

**Separately, Monk is a sixth case with a different cause.** It *is* in
`classRequirementsAndDetails`, but with 21 columns instead of 22, so this port rejects the row
rather than guessing where the missing column belongs — that is item 1, still open.

**What the port does:** `Elemental Dancer` is authored by hand in `src/packs/manual/classes.json`
from your own Word template ("2c, Elemental Dancer.doc"), and merged in by `build_documents.py`
after the generated classes. A manual entry never overwrites a class your data can build, so if
you add the missing rows the generated one wins automatically and the manual entry is reported as
redundant. The other four have no template to hand and remain unbuilt.

## 23. ~~Fourteen races cannot move~~ — WITHDRAWN, this was our misreading

**Status:** withdrawn · **Severity:** none · **Nothing here needs your attention**

This item claimed that fourteen races — all four Civilized Humans among them — had no movement
figures in `raceStatsAndMoveDetails`, and asked you to fill them in. **That was wrong, and the
request is withdrawn.** Your data was right the whole way through.

The columns at indices 39-47 are **modifiers on an Agility base, not finished rates**. Your own
`calcMovement` (`sheet-worker.js:30856`) switches on Agility for a base and adds the race's figure
to it:

```js
setAttrs({move_walk_hourly: 2+racetmpwalkhourly+tmpwalktemphourlymod});
//                          ^ base for this Agility
//                            ^ the race's modifier
```

So a race carrying `0, 0, 0` is a race with **no modifier**, which walks at the full base for its
Agility. Civilized Humans being the baseline race with no adjustment anywhere — attributes included
— is exactly as deliberate as it looked. The Player's Guide prints the same split on page 36: "Base
Walking/Jogging/Running Distance" tables by Agility, then a separate "Racial Movement Modifiers"
table beside them. Your Human(Barbaric) row is that book table's `+1/+10/+1`, `+2/+20/+2`,
`+2/+30/+3` to the digit, and all 42 printed base values match your switch exactly.

Marid, Merfolk and Se'eth are not stationary either. Their Walk is a zero *modifier*, so it resolves
normally, and their Swim and Slither rates build on the resolved figure.

**What went wrong on our side:** the port copied the race's modifier straight through as the
finished rate and never applied the Agility base, so every race with a `0` modifier rendered as
unable to move. Fixed — the base table is now generated out of your `calcMovement` rather than
transcribed, and is cross-checked against the two copies of it in your own code, which agree.

The lesson is recorded in `DECISIONS.md`; the apology for asking you to fix data that was never
broken is recorded here.

---

## 25. Magical flight multiplies twice, making the ten-second rate a hundred times the one-second rate

**Status:** open · **Severity:** two races (Mephyt(Fire), Mephyt(Ice)); the port departs from your
code here, so this one needs your ruling

`calcSpecialMovement`'s INT branch — magical flight — applies a literal 30 / 30 / 3 **on top of** the
race's own per-scale multiplier (`sheet-worker.js:32397`):

```js
setAttrs({move_special_hourly: [[((0+tmpint)*hourracemulti)+tmpspecialtemphourlymod]*30] });
setAttrs({move_special_10_sec: [[((0+tmpint)*tensecracemulti)+tmpspecialtemp10secmod]*30] });
setAttrs({move_special_1_sec: [[((0+tmpint)*onesecracemulti)+tmpspecialtemp1secmod]*3] });
```

Both Mephyt rows carry per-scale multipliers of **0.75, 30, 3** where every other race in the file
uses one value for all three scales:

```
Mephyt(Fire) ... 'INT', 0.75, 0,  'INT', 30, 0,  'INT', 3, 0 ...
Centaur      ... 'Walk', 4,   0,  'Walk', 4,  0,  'Walk', 4, 0 ...
```

Those three numbers are already a complete set of rates on their own — 30 feet per 10 seconds is
exactly ten times 3 feet per second, the same relationship every other rate in the system has.
Multiplying them again gives a ten-second rate **one hundred times** the one-second rate:

| | your live code | the multipliers alone |
|---|---|---|
| hourly | INT × 22.5 | INT × 0.75 |
| 10 seconds | INT × 900 | INT × 30 |
| 1 second | INT × 9 | INT × 3 |

At Intelligence 16 the live code gives 14,400 feet per ten seconds — about 980 miles an hour — beside
an hourly rate of 360 miles. The two scales do not describe the same creature.

**The version commented out immediately above it (lines 32366-32368) is the multiplier alone**, with
no literal factor, which matches the data exactly. That looks like the intended form and the live
line like a revision that went one step too far.

**What the port does:** applies the multiplier on its own, giving 12 mi/h, 480 ft per 10 seconds and
48 ft per second at Intelligence 16. This is a **deliberate departure from your code**, which the
standing "the sheet wins" rule does not cover — that rule settles sheet-versus-rulebook, and this is
your code disagreeing with your own data and your own commented-out line. Three signals to one, but
it is still your call, and it is one line to put back either way.

---

## 24. Sea and Ice Elves have a speed multiplier of -10, which makes their movement negative

**Status:** open · **Severity:** two races; needs a decision from you, not a guess from us

`raceStatsAndMoveDetails` index 38 is the speed multiplier. Two races carry **-10** there:

| Race | index 38 | Wood Elf, for comparison |
|---|---|---|
| Elf(Sea) | **-10** | 0 |
| Elf(Ice) | **-10** | 0 |

Everywhere else in the file that column is `0`, which your own comment in `calcSpecialMovement`
confirms is the sentinel for "no multiplier": *"most races are 0 (this makes the multiplier 1"*.

`calcMovement` remaps only `0`, so `-10` reaches the multiplier branch intact and is multiplied
through with no guard:

```js
} else {  // this race has speeded up movement (apply multiplier)
    setAttrs({move_walk_hourly: (((2+racetmpwalkhourly+...)*racetmpspeedmulti).toFixed(1)) });
```

A Sea Elf of Agility 15 therefore ends up at roughly **-50 miles an hour** on your sheet rather than
the 5 a Wood Elf gets. The neighbouring columns look deliberate (index 36 is -10 for several Elves
as a poison-resistance modifier), so the most likely reading is that a value slid one column, but
that is a guess and we are not acting on it.

**There is a hole in the column immediately before it.** Of the eleven Elf races, every one carries a
disease-resistance modifier at index 37 — except these same two, which carry nothing:

| Race | 36 poison | 37 disease | 38 speed |
|---|---|---|---|
| Elf(Dark) | -5 | -10 | 0 |
| Elf(High) | -10 | -10 | 0 |
| Elf(Wood) | -10 | -5 | 0 |
| Elf(Shadow) | -10 | -20 | 0 |
| **Elf(Sea)** | -10 | **0** | **-10** |
| **Elf(Ice)** | -10 | **0** | **-10** |

A `-10` sitting in a column no other race uses, directly beside an empty cell that every sibling race
fills, looks like one value entered one column to the right. Nothing after index 38 is shifted — the
walk, jog and run figures match the other Elves exactly — so it would be a single cell rather than a
displaced row. **We have not acted on that reading**; correcting a disease resistance on a guess is
not ours to do.

**What the port does:** it ignores a negative speed multiplier rather than applying it, on the
narrower ground that a negative multiplier is not a coherent quantity — multiplying scales a rate, it
does not reverse its direction — and that 103 of your 105 races use `0` here to mean "none". Sea and
Ice Elves therefore move exactly like every other Elf: at Agility 15 a Sea Elf walks 6 miles an hour
and swims three times that, the same shape Merfolk has.

The first version of this fix instead applied the floor your Player's Guide publishes for negative
rates (p.36 — *"reduced to 1 mile (hourly), 10 feet (10 seconds) or 1 foot (1 second)"*). That
stopped the negative numbers but left a **sea** elf swimming at 1 mile an hour, slower than it walks,
which is its own kind of wrong. The floor is still implemented, because it is a real published rule
and is genuinely reachable — a Civilized Dwarf at Agility 5 goes under it on walking modifiers alone
— but it is no longer what these two races land on.

Three things worth your confirmation: whether `-10` at index 38 is intended at all; whether it was
meant for index 37, where these two Elves are the only ones with no disease modifier; and whether you
want the book's negative floor implemented in the Roll20 sheet, which currently has no guard at all.

**Two disagreements between that template and your sheet-worker**, both resolved in the
sheet-worker's favour per the standing rule, both worth your confirmation:

| | `sheet-worker.js` | the Word template |
|---|---|---|
| Goal attributes | `goalupdict`: **STR, AGL** | "+1 Strength 5%, +1 **Will Force** 5%" |
| Title 15 name | `classtitledict`: "One with the Element" | "One with `<Element>`" (a placeholder) |

The goal-attribute one is the one that matters: Agility and Will Force are not interchangeable,
and a Dancer's own requirements list Strength, Agility **and** Will Force at 15, so either reading
is plausible.

**A cross-check that held:** the template lists Weapon Lore as a title 8 class skill, and
`getWeaponLoreWhen` independently returns 8 for this class. The two sources agree there.

**Also noticed:** `Beguiler`'s `classType` contains a paragraph of description rather than a class
type ("This class has the focus of illusions and uses these skills to dazzle and confuse their
foes..."). That has the look of the same kind of column slip as item 1, in a different row.

---

## 26. Five classes have no entry in `getSlotsNeededForClass`, so they read as costing no class skill slots

**Status:** open · **Severity:** question, not a bug — a gap that follows from item 22

`getSlotsNeededForClass` (sheet-worker.js:62881) gives each class the number of class skill slots it
needs to run its whole progression — 92 cases, from 36 (Border Scout, Explorer) to 56 (Assassin,
Monk). This is the number the Player's Guide's "slot tricks" exist to reach: Knowledge hands out a
fixed allowance of class slots, and where it falls short the shortfall is made up by transferring
racial or social slots in.

The five classes of item 22 — Elemental Dancer, Elementalist, GME, Inquisitor, Summoner — have no
`classRequirementsAndDetails` row, and four of them have no case in this switch either. GME does, at
0, which is right: it is your stand-in for a being with no class at all, so it genuinely costs no
class slots.

**The consequence is quiet.** A class with no entry reads as 0, and 0 here does not mean "unknown",
it means "this class is free to take" — it would let a character take the class without spending any
of their Knowledge allowance. That is why the conversion reports it every run rather than letting it
default silently.

**What would settle it for Elemental Dancer**, the one of the five now authored from your Word
template: a naive count of the skills across its fifteen titles comes to **60**, which is higher
than any of your 86 classes. But its last five titles each list `Sense Supernatural` at 20%, 40%,
60%, 80% and 99% — which reads as **one skill improving across five titles rather than five separate
acquisitions**. Counting it once gives **56**, exactly your own ceiling and the same figure as
Assassin and Monk.

That is suggestive enough to be worth asking about and far too inferential to bake in, so nothing is
written. **Is 56 right for Elemental Dancer, and do the other four want entries too?** A one-line
answer per class closes this.
