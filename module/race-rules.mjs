// @START (CODE)
// @MARKER RACE RULES
//==================================================================================================================
// Rules for combining races, with no Foundry dependency, so they can be tested outside it.
//
// His sheet lets a character be of more than one race. race_type offers One Race, Half Race,
// Multi Race(3), Multi Race(4), Part Race and Trace Race (sheet-worker.js:32591-32726), but only
// Half Race is actually implemented: applyRaceToAttribs (32966) answers the other four with
// "not yet implemented. Nothing done." So Half Race is ported here from his code, and the others
// are not guessed at -- see UPSTREAM-ISSUES.md item 32.
//
// A Half Race is at least 40 percent each of two races (Player's Guide, Mixed Races, p.33). His
// applyHalfRaceToAttribs (33770) takes the two races' raceStatsAndMoveDetails rows and combines
// them field by field:
//
//     field                                  how                            where in his code
//     attribute modifiers                    averageTwoFloatsRounded        33889-33900
//     attribute maximums                     averageTwoFloatsRounded        33901-33912
//     starting Endurance modifier            averageTwoFloatsRounded        8147-8152
//     Endurance formulas (start, title)      kept as a "first|second" pair  33913-33926
//     Perception/Affinity/Fortune mods       averageTwoFloatsRounded        33927-33929
//     the five resistance mods               averageTwoFloatsRounded        33930-33934
//     speed multiplier, walk/jog/run mods    averageTwoFloatsRounded        33935-33947
//     special movement                       the FIRST race's, whole        33945-34000
//     standing and upward jump               averageTwoFloatsRounded        34001-34002
//     formless                               never -- "formless can't be half races"   34003
//     can swim                               if either race can             34004-34008
//
// "Averaged" is his averageTwoFloatsRounded, and it is not a plain average. It is the Player's
// Guide's own rule (Half Race, item 1): a modifier only one race has is taken in FULL, two
// bonuses are averaged rounding up, two penalties are averaged rounding towards the bigger
// penalty, and a bonus against a penalty is simply added.
//==================================================================================================================

	// This is the function which combines two races' figures the way his half race does. Ported
	// from averageTwoFloatsRounded (sheet-worker.js), branch for branch:
	//
	//     both 0                      0
	//     both above 0                average, +.099, rounded      +3 and +1 give +2
	//     both below 0                average, -.099, rounded      -2 and -3 give -3
	//     anything else               the two ADDED, +.099, rounded   +2 and 0 give +2
	//
	// The .099 nudges a .5 the way he wants it before toFixed(0) rounds -- up for bonuses, away
	// from zero for penalties -- and his toFixedWithoutZeros turns the result back into a number.
	export function averageTwoFloatsRounded(tmpFloat1, tmpFloat2) {
		var tmpValue1 = parseFloat(tmpFloat1) || 0;
		var tmpValue2 = parseFloat(tmpFloat2) || 0;
		var tmpResult = 0.0;
		if (tmpValue1 == 0 && tmpValue2 == 0) {
			tmpResult = 0;
		} else if (tmpValue1 > 0 && tmpValue2 > 0) {
			tmpResult = ((tmpValue1 + tmpValue2) / 2) + 0.099;
		} else if (tmpValue1 < 0 && tmpValue2 < 0) {
			tmpResult = ((tmpValue1 + tmpValue2) / 2) - 0.099;
		} else { // 0 or 1 is negative, 1 positive (average by addition)
			tmpResult = (tmpValue1 + tmpValue2) + 0.099;
		}
		return Number.parseFloat(tmpResult.toFixed(0));
	}

	// This is the function which gives the name his sheet writes for a character of two races --
	// full_race_name, "first|second" (sheet-worker.js:33771).
	export function getHalfRaceName(tmpName1, tmpName2) {
		return "" + tmpName1 + "|" + tmpName2;
	}

	// This is the function which averages every key of two flat objects of numbers with
	// averageTwoFloatsRounded -- used for the attribute, characteristic and resistance blocks.
	function averageEachKey(tmpBlock1, tmpBlock2) {
		var tmpOut = {};
		var tmpKeys = new Set([...Object.keys(tmpBlock1 ?? {}), ...Object.keys(tmpBlock2 ?? {})]);
		for (const tmpKey of tmpKeys) {
			tmpOut[tmpKey] = averageTwoFloatsRounded((tmpBlock1 ?? {})[tmpKey], (tmpBlock2 ?? {})[tmpKey]);
		}
		return tmpOut;
	}

	// This is the function which joins two formula strings into his "first|second" pair. He only
	// writes a pair when at least one side has something, and fills an empty side with "0"
	// (sheet-worker.js:33913-33919).
	function pairFormulas(tmpFormula1, tmpFormula2) {
		var tmpText1 = ("" + (tmpFormula1 ?? "")).trim();
		var tmpText2 = ("" + (tmpFormula2 ?? "")).trim();
		if (tmpText1 == "" && tmpText2 == "") { return ""; }
		return (tmpText1 == "" ? "0" : tmpText1) + "|" + (tmpText2 == "" ? "0" : tmpText2);
	}

	// This is the function which reads one of his racial-skill bonuses ("+20%", "-10%", or blank)
	// as a number.
	function percentToNumber(tmpPercent) {
		return parseInt(("" + (tmpPercent ?? "")).replace("%", "").replace("+", "")) || 0;
	}

	// This is the function which merges two races' racial-skill lists as his
	// combineTwoRaceSkillDetails does: every skill from both, once, in the first race's order and
	// then the second's, a skill both offer keeping the BETTER bonus.
	//
	// "Better" is the evident intent rather than what his code does. His getBestModifierPercent
	// declares both its parameters as numberString1, so the second shadows the first and a shared
	// skill always takes the SECOND race's bonus. UPSTREAM-ISSUES.md item 32.
	export function mergeRacialSkills(tmpSkills1, tmpSkills2) {
		var tmpOut = [];
		var tmpSeen = {};
		for (const tmpSkill of [...(tmpSkills1 ?? []), ...(tmpSkills2 ?? [])]) {
			if (tmpSeen[tmpSkill.name] !== undefined) {
				var tmpKept = tmpOut[tmpSeen[tmpSkill.name]];
				if (percentToNumber(tmpSkill.bonus) > percentToNumber(tmpKept.bonus)) { tmpKept.bonus = tmpSkill.bonus; }
				continue;
			}
			tmpSeen[tmpSkill.name] = tmpOut.length;
			tmpOut.push({ name: tmpSkill.name, bonus: tmpSkill.bonus ?? "" });
		}
		return tmpOut;
	}

	// This is the function which merges two name lists with duplicates removed, as his half race
	// merges abilities, disabilities and immunities (mergeTwoStringLists, removeDuplicatesInArray).
	// His further steps are NOT ported: removeLesserAbilities (keep only the stronger of two
	// versions of one ability, as the Player's Guide asks) and remove2ndRaceBodyAbilities (drop the
	// second race's abilities that need a body the character has not got). Both are name-matching
	// rules over his ability vocabulary; until the racial ability mechanics are ported the lists
	// are display only, so a lesser version showing beside a greater one misleads nobody.
	export function mergeNameLists(tmpList1, tmpList2) {
		return [...new Set([...(tmpList1 ?? []), ...(tmpList2 ?? [])])].sort();
	}

	// This is the function which takes the lesser of two ages, as his setAge does for a half race.
	// A maximum age can be a word ("Immortal"), which is longer than any number of years, so a
	// number always wins against one; two words keep the first. His lesserOfTwoNumbers compares
	// a word as NaN and falls through to the first, which gets "Immortal" and 100 wrong one way
	// round -- the port reads what he evidently means.
	export function lesserAge(tmpAge1, tmpAge2) {
		var tmpNumber1 = parseFloat(tmpAge1);
		var tmpNumber2 = parseFloat(tmpAge2);
		if (isNaN(tmpNumber1) && isNaN(tmpNumber2)) { return tmpAge1; }
		if (isNaN(tmpNumber1)) { return tmpAge2; }
		if (isNaN(tmpNumber2)) { return tmpAge1; }
		return (tmpNumber2 < tmpNumber1) ? tmpAge2 : tmpAge1;
	}

	// This is the function which says whether a class is closed to a character's race or races,
	// from the class's blockedRaces. His setClassDetails: one race is barred if it is on the list;
	// a half race only if BOTH are ("isRace1Blocked && isRace2Blocked"). His sheet also lets the
	// player override the bar, so this reports rather than refuses.
	export function isClassBlockedForRaces(tmpBlockedRaces, tmpRaceNames) {
		var tmpNames = (tmpRaceNames ?? []).slice(0, 2);
		if (tmpNames.length == 0) { return false; }
		var tmpBlocked = tmpBlockedRaces ?? [];
		return tmpNames.every(tmpName => tmpBlocked.includes(tmpName));
	}

	// This is the function which says whether two races can have children together. His sheet
	// only offers the first race's fertileWith list as the second race, so an incompatible pair
	// cannot be picked there; the port has no picker to restrict, so it reports the pair instead.
	export function canRacesBreed(tmpRace1Name, tmpRace1FertileWith, tmpRace2Name) {
		if (tmpRace1Name == tmpRace2Name) { return true; }
		return (tmpRace1FertileWith ?? []).includes(tmpRace2Name);
	}

	// This is the function which builds the race a Half Race character actually has, out of the
	// two races' data. It returns the same shape as a race item's system data, so everything that
	// reads a race reads this unchanged.
	//
	// Two numbers are taken from the first race only, as the schema holds one number where he
	// holds a pair: titleMax and titleMod. Nothing in the port reads either yet -- the title
	// Endurance roll (his setNewCharacteristics) is not ported -- and his pair is kept whole in
	// titleFormula/titleDice beside them, so the second race's figures are not lost.
	export function combineHalfRace(tmpRace1, tmpRace2) {
		var tmpMove1 = tmpRace1.movement ?? {};
		var tmpMove2 = tmpRace2.movement ?? {};

		var tmpMovement = {
			speedMultiplier: averageTwoFloatsRounded(tmpMove1.speedMultiplier, tmpMove2.speedMultiplier),
			// his special movement always comes from the first race -- every branch of his
			// Fly/Gallop/Scurry/Swim switch reads tempRaceStatMoves1, and so does the fallback
			specialName: tmpMove1.specialName ?? "",
			special:     structuredClone(tmpMove1.special ?? {}),
			jumpStand:   averageTwoFloatsRounded(tmpMove1.jumpStand, tmpMove2.jumpStand),
			jumpUp:      averageTwoFloatsRounded(tmpMove1.jumpUp, tmpMove2.jumpUp)
		};
		for (const tmpMode of ["walk", "jog", "run"]) {
			tmpMovement[tmpMode] = averageEachKey(tmpMove1[tmpMode], tmpMove2[tmpMode]);
		}

		var tmpEnd1 = tmpRace1.endurance ?? {};
		var tmpEnd2 = tmpRace2.endurance ?? {};

		return {
			attributeMods:      averageEachKey(tmpRace1.attributeMods, tmpRace2.attributeMods),
			attributeLimits:    averageEachKey(tmpRace1.attributeLimits, tmpRace2.attributeLimits),
			endurance: {
				startFormula: pairFormulas(tmpEnd1.startFormula, tmpEnd2.startFormula),
				startMod:     averageTwoFloatsRounded(tmpEnd1.startMod, tmpEnd2.startMod),
				titleFormula: pairFormulas(tmpEnd1.titleFormula, tmpEnd2.titleFormula),
				titleDice:    pairFormulas(tmpEnd1.titleDice, tmpEnd2.titleDice),
				titleMax:     tmpEnd1.titleMax ?? 0,
				titleMod:     tmpEnd1.titleMod ?? 0
			},
			characteristicMods: averageEachKey(tmpRace1.characteristicMods, tmpRace2.characteristicMods),
			resistanceMods:     averageEachKey(tmpRace1.resistanceMods, tmpRace2.resistanceMods),
			movement:           tmpMovement,
			formless:           false,
			canSwim:            !!(tmpRace1.canSwim || tmpRace2.canSwim),
			// The body is the first race's. His half race keeps the first race's body type and
			// strips the second race's body-specific abilities to fit it (remove2ndRaceBodyAbilities,
			// sheet-worker.js:46254).
			bodyType:           tmpRace1.bodyType ?? "Humanoid",
			racialSkills:       mergeRacialSkills(tmpRace1.racialSkills, tmpRace2.racialSkills),
			racialSkillNote:    [tmpRace1.racialSkillNote, tmpRace2.racialSkillNote].filter(n => n).join("; "),
			abilities:          mergeNameLists(tmpRace1.abilities, tmpRace2.abilities),
			disabilities:       mergeNameLists(tmpRace1.disabilities, tmpRace2.disabilities),
			immunities:         mergeNameLists(tmpRace1.immunities, tmpRace2.immunities),
			// A half race's own children are not modelled; the first race's list is carried so
			// the field is never missing.
			fertileWith:        [...(tmpRace1.fertileWith ?? [])],
			// setAge: the lesser of each (sheet-worker.js:38986-38991). Apparent age, which he
			// averages, is entered on the sheet rather than derived, so there is nothing to combine.
			ages: {
				startLow:  lesserAge(tmpRace1.ages?.startLow ?? 0, tmpRace2.ages?.startLow ?? 0),
				startHigh: lesserAge(tmpRace1.ages?.startHigh ?? 0, tmpRace2.ages?.startHigh ?? 0),
				maxAge:    "" + lesserAge(tmpRace1.ages?.maxAge ?? "", tmpRace2.ages?.maxAge ?? "")
			},
			sourcebook:         "",
			page:               "",
			description:        ""
		};
	}

// @MARKER ADD NEW race rule functions HERE
// @END (CODE)
