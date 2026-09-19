// @START (CODE)
// @MARKER CHARACTER GENERATION RULES
//==================================================================================================================
// The rules for making a new character, with no Foundry dependency, so they can be tested outside it.
// The generator window (module/apps/character-generator.mjs) is only a face on these.
//
// Ported from his own character creation, which runs as nine numbered steps on his sheet:
//     1 race (one, or a Half Race of two)          roll_race_attr          sheet-worker.js:4480
//     2 attributes: roll, adjust, final calc       roll_one_set .. final   4611-6282
//     3 racial features (height, frame, colours)   roll_finish_features    6315
//     4 handedness and languages                   roll_finish_languages   6454
//     5 class, with its qualification check        roll_check_class_qualify 6907
//     6 skills: class, racial, social              roll_confirm_skills_complete 7789
//     7 alignment                                  roll_confirm_align_select 7883
//     8 money and equipment                        roll_confirm_money_equip 7936
//     9 name, then finish                          roll_finish_char        7963
//
// Dice are passed in as a function (tmpRoll(sides) -> 1..sides), never taken from Math.random here,
// so every rule can be tested with known dice -- the same practice as the combat rules.
//==================================================================================================================

	// The twelve attributes, in the order his sheet and the Player's Guide list them.
	export const ATTRIBUTE_ORDER = ["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"];

	// @MARKER ATTRIBUTE DICE
	// The dice each attribute is rolled with, from his three rolling buttons (roll_one_set,
	// roll_two_sets, roll_three_sets, sheet-worker.js:4613, 4711, 4881). "7d4d2" is 7d4 with the
	// lowest 2 dropped -- the Player's Guide's "you will only be adding a total of 5 dice, so remove
	// the lowest numbers if you roll 6 or 7 dice". All three methods use the same dice; they differ
	// only in how many sets are rolled.
	export const ATTRIBUTE_DICE = {
		//   attribute  dice
		str: "7d4d2",   agl: "7d4d2",   vit: "7d4d2",
		int: "6d4d1",   wis: "6d4d1",   knw: "6d4d1",
		app: "6d4d1",   chm: "6d4d1",   soc: "5d4",
		aur: "7d4d2",   pty: "6d4d1",   wil: "5d4"
	};

	// @MARKER CHARACTER TYPES
	// The four character types of the Player's Guide (Attributes, "Character Types", p.2).
	//
	//     type        sets rolled   best kept   adjustment ratio
	//     Normal      1, all 5d4    --          2:1
	//     Adventurer  1             --          3:1
	//     Heroic      2             higher      3:1
	//     Legendary   3             highest     3:1
	//
	// His sheet offers the last three only, and his adjustment button is "3-1 Attribute Adjustment".
	// Normal is the book's, carried because the Player's Guide lists it and his sheet does not
	// disagree -- it simply has no button for it. (The same footing dual classing was built on.)
	export const CHARACTER_TYPES = {
		//          label          sets  every attribute  ratio  fromBook
		normal:     { label: "Normal",     sets: 1, flatDice: "5d4", ratio: 2, fromBook: true  },
		adventurer: { label: "Adventurer", sets: 1, flatDice: "",    ratio: 3, fromBook: false },
		heroic:     { label: "Heroic",     sets: 2, flatDice: "",    ratio: 3, fromBook: false },
		legendary:  { label: "Legendary",  sets: 3, flatDice: "",    ratio: 3, fromBook: false }
	};

	// The lowest an attribute may be left at by the adjustments. Player's Guide, character creation
	// step 5: "make sure none of them have dropped below 5 (the minimum)". His sheet does not check
	// this -- its final calculation only floors at 0 -- but does not contradict it either.
	export const ATTRIBUTE_MINIMUM = 5;

	// @MARKER DICE
	// This is the function which rolls one of his dice expressions: "7d4d2" (7d4, drop the lowest
	// 2), "2d6%" (a skill's starting dice, the % being only a label), "5d4". Anything it cannot read
	// rolls as 0 -- a skill whose starting dice are "Special" or blank starts with no bonus.
	//
	// "5dl0%" -- a lower-case L where the 1 of "d10" belongs -- appears on eight of his skills, and
	// is read as d10, which is what it evidently is. UPSTREAM-ISSUES.md item 34.
	export function rollDicePool(tmpExpression, tmpRoll) {
		var tmpText = ("" + (tmpExpression ?? "")).replace("%", "").trim().toLowerCase().replace("dl", "d1");
		var tmpMatch = tmpText.match(/^(\d+)d(\d+)(?:d(\d+))?$/);
		if (!tmpMatch) { return 0; }
		var tmpCount = parseInt(tmpMatch[1]);
		var tmpSides = parseInt(tmpMatch[2]);
		var tmpDrop  = parseInt(tmpMatch[3] ?? "0");
		var tmpDice = [];
		for (var i = 0; i < tmpCount; i++) { tmpDice.push(tmpRoll(tmpSides)); }
		tmpDice.sort((a, b) => a - b);
		return tmpDice.slice(tmpDrop).reduce((tmpSum, tmpDie) => tmpSum + tmpDie, 0);
	}

	// This is the function which rolls a new character's attributes for one character type.
	// Returns every set, so the player sees them all, and the best of each attribute, which is
	// what his str_best_roll and its siblings hold.
	export function rollAttributeSets(tmpType, tmpRoll) {
		var tmpDef = CHARACTER_TYPES[tmpType] ?? CHARACTER_TYPES.adventurer;
		var tmpSets = [];
		for (var s = 0; s < tmpDef.sets; s++) {
			var tmpSet = {};
			for (const tmpKey of ATTRIBUTE_ORDER) {
				tmpSet[tmpKey] = rollDicePool(tmpDef.flatDice || ATTRIBUTE_DICE[tmpKey], tmpRoll);
			}
			tmpSets.push(tmpSet);
		}
		var tmpBest = {};
		for (const tmpKey of ATTRIBUTE_ORDER) {
			tmpBest[tmpKey] = Math.max(...tmpSets.map(tmpSet => tmpSet[tmpKey]));
		}
		return { sets: tmpSets, best: tmpBest };
	}

	// @MARKER ADJUSTMENTS
	// A swap takes `ratio` points from other attributes (three for most types, two for Normal) and
	// adds one: his adjust_attrb_from1..3 and adjust_attrb_to1. The points may come from different
	// attributes or the same one. Social Class may be neither given nor taken -- his selects do not
	// offer it, and the book says the same.
	//
	// A swap is { to: "str", from: ["agl", "agl", "wis"] }.
	export function checkSwap(tmpRatings, tmpSwap, tmpRatio) {
		var tmpFrom = tmpSwap.from ?? [];
		if (!ATTRIBUTE_ORDER.includes(tmpSwap.to)) { return { allowed: false, reason: "Choose an attribute to raise." }; }
		if (tmpFrom.length != tmpRatio) {
			return { allowed: false, reason: `Take exactly ${tmpRatio} points to add 1.` };
		}
		if (tmpSwap.to == "soc" || tmpFrom.includes("soc")) {
			return { allowed: false, reason: "Social Class cannot be adjusted." };
		}
		if (tmpFrom.includes(tmpSwap.to)) {
			return { allowed: false, reason: "An attribute cannot give points to itself." };
		}
		var tmpAfter = applySwap(tmpRatings, tmpSwap);
		for (const tmpKey of new Set(tmpFrom)) {
			if (tmpAfter[tmpKey] < ATTRIBUTE_MINIMUM) {
				return { allowed: false, reason: `That would leave ${tmpKey.toUpperCase()} below ${ATTRIBUTE_MINIMUM}.` };
			}
		}
		return { allowed: true, reason: "" };
	}

	// This is the function which applies one swap to a set of ratings, returning a new set.
	export function applySwap(tmpRatings, tmpSwap) {
		var tmpOut = { ...tmpRatings };
		for (const tmpKey of tmpSwap.from ?? []) { tmpOut[tmpKey] = tmpOut[tmpKey] - 1; }
		tmpOut[tmpSwap.to] = tmpOut[tmpSwap.to] + 1;
		return tmpOut;
	}

	// @MARKER CIVILIZED HUMAN
	// Civilized Humans "move around 6 points and add 3 points as you see fit (only Social Class
	// cannot be adjusted)" -- Player's Guide, creation step 5, and his two buttons for it:
	// roll_civhuman_attrbonus (three +1s, which may land on the same attribute) and
	// roll_human_mod_attrbs (six one-point moves). A Half Race with a Civilized Human parent gets
	// the three points but not the moves (setExtraRaceSheets, sheet-worker.js:35066, and the book:
	// "Civilized Human mixed races lose the ability to move 6 points").
	export const CIVILIZED_HUMANS = ["Human(Civilized:City)", "Human(Civilized:Port)",
	                                 "Human(Civilized:Town)", "Human(Civilized:Village)"];

	// This is the function which says what a character of these races may add and move.
	export function getCivilizedHumanAllowance(tmpRaceNames) {
		var tmpNames = tmpRaceNames ?? [];
		var tmpIsCiv = tmpNames.some(tmpName => CIVILIZED_HUMANS.includes(tmpName));
		if (!tmpIsCiv) { return { bonus: 0, moves: 0 }; }
		return { bonus: 3, moves: (tmpNames.length > 1) ? 0 : 6 };
	}

	// This is the function which applies a Civilized Human's added points and moves.
	// bonuses is a list of attribute keys, one per point; moves is a list of { from, to }.
	export function applyHumanPoints(tmpRatings, tmpBonuses, tmpMoves) {
		var tmpOut = { ...tmpRatings };
		for (const tmpKey of tmpBonuses ?? []) { if (tmpKey && tmpKey != "soc") { tmpOut[tmpKey] = tmpOut[tmpKey] + 1; } }
		for (const tmpMove of tmpMoves ?? []) {
			if (!tmpMove.from || !tmpMove.to || tmpMove.from == "soc" || tmpMove.to == "soc") { continue; }
			tmpOut[tmpMove.from] = tmpOut[tmpMove.from] - 1;
			tmpOut[tmpMove.to] = tmpOut[tmpMove.to] + 1;
		}
		return tmpOut;
	}

	// @MARKER PHYSIQUE
	// Player's Guide creation step 3: "If you choose female, subtract 1 from Strength but add 1 to
	// Agility." His sheet calls this "slight physique" and folds it into the racial modifier
	// (phystrmod / phyaglmod, sheet-worker.js:33781). The port has no physique field, so it lands in
	// the stored rating instead -- the same numbers either way.
	export function applyPhysique(tmpRatings, tmpSlight) {
		if (!tmpSlight) { return { ...tmpRatings }; }
		return { ...tmpRatings, str: tmpRatings.str - 1, agl: tmpRatings.agl + 1 };
	}

	// @MARKER RATINGS
	// This is the function which assembles the ratings a new character is stored with: the best
	// roll (or the entered figure), the physique, the swaps and a Civilized Human's points. Racial
	// modifiers are NOT added here -- the character model adds them itself, as his calcFinals adds
	// race_mod on top of the best roll -- and neither is the race's limit applied, for the same
	// reason. Returns the ratings and anything that went wrong along the way.
	export function buildRatings(tmpChoices) {
		var tmpRatings = { ...(tmpChoices.base ?? {}) };
		tmpRatings = applyPhysique(tmpRatings, tmpChoices.slightPhysique);
		var tmpIssues = [];
		for (const tmpSwap of tmpChoices.swaps ?? []) {
			var tmpCheck = checkSwap(tmpRatings, tmpSwap, tmpChoices.ratio ?? 3);
			if (!tmpCheck.allowed) { tmpIssues.push(tmpCheck.reason); continue; }
			tmpRatings = applySwap(tmpRatings, tmpSwap);
		}
		tmpRatings = applyHumanPoints(tmpRatings, tmpChoices.humanBonuses, tmpChoices.humanMoves);
		return { ratings: tmpRatings, issues: tmpIssues };
	}

	// This is the function which says where each attribute ends up once the race is applied, and
	// flags any below the minimum or above the race's limit -- the two checks the book asks for
	// after race and adjustments, and the second his calcFinals enforces by clamping.
	export function checkFinalAttributes(tmpRatings, tmpRaceSystem) {
		var tmpMods = tmpRaceSystem?.attributeMods ?? {};
		var tmpLimits = tmpRaceSystem?.attributeLimits ?? {};
		var tmpOut = {};
		for (const tmpKey of ATTRIBUTE_ORDER) {
			var tmpFinal = (tmpRatings[tmpKey] ?? 0) + (parseInt(tmpMods[tmpKey]) || 0);
			var tmpLimit = parseInt(tmpLimits[tmpKey]) || 20;
			tmpOut[tmpKey] = {
				final: Math.min(tmpFinal, tmpLimit),
				overLimit: tmpFinal > tmpLimit,
				underMinimum: tmpFinal < ATTRIBUTE_MINIMUM,
				limit: tmpLimit
			};
		}
		return tmpOut;
	}

	// @MARKER CLASS QUALIFICATION
	// This is the function which lists what stops a character taking a class, as his
	// checkClassQualification does (sheet-worker.js:50811):
	//   - each attribute the class requires (attribQualify, in ATTRIBUTE_ORDER) against the
	//     character's FINAL attribute, race included
	//   - the class barring the race -- for a Half Race, only if it bars both (the Race & Classes
	//     rules in race-rules.mjs)
	// His sheet refuses an unqualified class unless the player ticks "override", and so does the
	// generator: it reports, and lets a Game Master's override through.
	export function checkClassQualification(tmpClassSystem, tmpFinals, tmpRaceNames, tmpIsBlocked) {
		var tmpIssues = [];
		var tmpQualify = tmpClassSystem?.requirements?.attribQualify ?? [];
		ATTRIBUTE_ORDER.forEach((tmpKey, tmpIndex) => {
			var tmpNeeded = parseInt(tmpQualify[tmpIndex]) || 0;
			var tmpHas = tmpFinals[tmpKey]?.final ?? 0;
			if (tmpNeeded && tmpHas < tmpNeeded) {
				tmpIssues.push(`Needs ${tmpKey.toUpperCase()} ${tmpNeeded}; has ${tmpHas}.`);
			}
		});
		if (tmpIsBlocked) {
			tmpIssues.push(`${(tmpRaceNames ?? []).join("|")} is usually not this class.`);
		}
		return tmpIssues;
	}

	// @MARKER CLASS SKILLS
	// This is the function which gives the class skills a new character starts with: the class's
	// first-title skills, as his setFinalClassSkills counts them (levels of "1"). A slot that differs
	// for a race that cannot cast takes the no-casting skill for such a race and the other skill for
	// anyone else -- his nocast, which is set by the racial disability "Cannot Cast Spells".
	export function getStartingClassSkills(tmpClassSystem, tmpCannotCast) {
		var tmpList = tmpClassSystem?.advancement?.classSkillList ?? [];
		return tmpList.filter(tmpSkill => (parseInt(tmpSkill.title) || 0) == 1)
			.filter(tmpSkill => {
				if (tmpSkill.requires == "nonCaster") { return !!tmpCannotCast; }
				if (tmpSkill.requires == "caster")    { return !tmpCannotCast; }
				return true;
			})
			.map(tmpSkill => ({ name: tmpSkill.name, core: !!tmpSkill.core }));
	}

	// This is the function which reads the percentage out of one of his class modifiers:
	// "+10% to magical skills" -> 10 (getModFromClassModString).
	export function parseClassModPercent(tmpText) {
		var tmpMatch = ("" + (tmpText ?? "")).match(/([+-]?\d+)\s*%/);
		return tmpMatch ? parseInt(tmpMatch[1]) : 0;
	}

	// The skill types his class modifiers name, and the word that finds each in a modifier string.
	const CLASS_MOD_SKILL_TYPES = [
		// word in the modifier   skill type it matches
		["magical",       "Magical"],
		["divine",        "Divine"],
		["combat",        "Combat"],
		["stealth",       "Stealth"],
		["disciplined",   "Disciplined"],
		["informational", "Informational"]
	];

	// This is the function which works out a class skill's bonus at creation, as his
	// setClassSkillAbility does (sheet-worker.js, called from setFinalClassSkills):
	//     the skill's starting dice, rolled
	//   + 30 if it is a CORE skill
	//   + every class modifier naming a type the skill has ("+10% to magical skills" on a Magical skill)
	// His further term, getExtraClassRacialMods (a few social skills lifting class skills), is not
	// ported; it needs the social-skill modifier tables, which the generator does not use yet.
	// Returned in two parts, because the character keeps the roll (startingBonus) apart from the
	// fixed bonuses (abilityBonus).
	export function getClassSkillBonuses(tmpSkillSystem, tmpCore, tmpClassMods, tmpRoll) {
		var tmpStarting = rollDicePool(tmpSkillSystem?.startingDice, tmpRoll);
		var tmpAbility = tmpCore ? 30 : 0;
		var tmpTypes = (tmpSkillSystem?.types ?? []).join(",");
		for (const tmpMod of tmpClassMods ?? []) {
			if (!("" + tmpMod).includes("skills")) { continue; }
			for (const [tmpWord, tmpType] of CLASS_MOD_SKILL_TYPES) {
				if (("" + tmpMod).includes(tmpWord) && tmpTypes.includes(tmpType)) {
					tmpAbility = tmpAbility + parseClassModPercent(tmpMod);
				}
			}
		}
		return { startingBonus: tmpStarting, abilityBonus: tmpAbility };
	}

	// This is the function which works out a racial skill's bonus at creation. His
	// setRacialSkillAbility (sheet-worker.js:53452): the starting dice count DOUBLE for a racial
	// skill -- "(tmprandom*2)" -- plus the race's own bonus on it ("+10%").
	export function getRacialSkillBonuses(tmpSkillSystem, tmpRaceBonus, tmpRoll) {
		var tmpStarting = rollDicePool(tmpSkillSystem?.startingDice, tmpRoll) * 2;
		var tmpBonus = parseInt(("" + (tmpRaceBonus ?? "")).replace("%", "").replace("+", "")) || 0;
		return { startingBonus: tmpStarting, abilityBonus: tmpBonus };
	}

	// This is the function which works out a social skill's bonus at creation: its starting dice
	// (setSocialSkillAbility). His social-class and racial modifiers on social skills
	// (getSocialSkillMods, getExtraSocialMods) are not ported yet.
	export function getSocialSkillBonuses(tmpSkillSystem, tmpRoll) {
		return { startingBonus: rollDicePool(tmpSkillSystem?.startingDice, tmpRoll), abilityBonus: 0 };
	}

	// @MARKER HANDEDNESS
	// This is the function which rolls handedness as his determineHandedness does
	// (sheet-worker.js:49200): a race with "Ambidextrous" among its abilities always is; otherwise
	// d100 of 1-75 Right, 76-95 Left, 96-100 Ambidextrous.
	export function rollHandedness(tmpRaceAbilities, tmpRoll) {
		if ((tmpRaceAbilities ?? []).some(tmpName => ("" + tmpName).includes("Ambidextrous"))) { return "Ambidextrous"; }
		var tmpPercent = tmpRoll(100);
		if (tmpPercent < 76) { return "Right"; }
		if (tmpPercent < 96) { return "Left"; }
		return "Ambidextrous";
	}

	// @MARKER AGE
	// This is the function which rolls a starting age within the race's range. His getAge rolls a
	// different dice shape for each group of races (a die added to one below the low end, 2d10
	// hundreds for the Formless, and so on); the range is what the extraction carries, so this
	// rolls evenly across it. The figure is only a suggestion the player can change.
	export function rollStartingAge(tmpAges, tmpRoll) {
		var tmpLow = parseInt(tmpAges?.startLow) || 0;
		var tmpHigh = parseInt(tmpAges?.startHigh) || 0;
		if (tmpHigh <= tmpLow) { return tmpLow; }
		return tmpLow - 1 + tmpRoll(tmpHigh - tmpLow + 1);
	}

	// @MARKER ASSEMBLY
	// This is the function which turns a finished set of choices into the character to create:
	// the actor's data and the items to embed on it. Pure, so the whole of creation can be tested
	// and previewed without Foundry; the generator window only calls Actor.create with the result.
	//
	//   tmpChoices  what the player settled on, step by step (see the generator window)
	//   tmpContent  { races, classes, skills }: plain documents, as the compendiums or the
	//               src/packs/documents files hold them
	//   tmpRoll     the dice, for every skill's starting bonus
	//
	// Returns { actor, items, issues }. Nothing is refused: anything that could not be found or
	// did not add up is listed in issues, for the review step to show.
	export function assembleCharacter(tmpChoices, tmpContent, tmpRoll) {
		var tmpIssues = [];
		var tmpByName = (tmpDocs, tmpName) => (tmpDocs ?? []).find(tmpDoc => tmpDoc.name == tmpName) ?? null;
		var tmpItem = (tmpDoc, tmpSystem) => ({
			name: tmpDoc.name, type: tmpDoc.type, img: tmpDoc.img,
			system: { ...structuredClone(tmpDoc.system ?? {}), ...(tmpSystem ?? {}) }
		});

		var tmpItems = [];
		var tmpRaceDocs = (tmpChoices.raceNames ?? []).map(tmpName => {
			var tmpDoc = tmpByName(tmpContent.races, tmpName);
			if (!tmpDoc) { tmpIssues.push(`Race "${tmpName}" was not found.`); }
			return tmpDoc;
		}).filter(tmpDoc => tmpDoc);
		for (const tmpDoc of tmpRaceDocs) { tmpItems.push(tmpItem(tmpDoc)); }

		var tmpClassDoc = tmpByName(tmpContent.classes, tmpChoices.className);
		if (tmpChoices.className && !tmpClassDoc) { tmpIssues.push(`Class "${tmpChoices.className}" was not found.`); }
		if (tmpClassDoc) { tmpItems.push(tmpItem(tmpClassDoc)); }
		var tmpNonClassed = !!tmpClassDoc?.system?.nonClassed;

		// Skills. A skill the pack does not hold is still created, bare, so nothing the player chose
		// is lost -- and reported, since it will have no attributes to work its chance from.
		var tmpAddSkill = (tmpName, tmpCategory, tmpBonuses, tmpTitle) => {
			var tmpDoc = tmpByName(tmpContent.skills, tmpName);
			if (!tmpDoc) {
				tmpIssues.push(`Skill "${tmpName}" is not in the skill compendium; added with no definition.`);
				tmpDoc = { name: tmpName, type: "skill", system: {} };
			}
			// Every per-character field is set outright, rather than left to the schema's defaults:
			// the compendium copy carries none of them, and a skill missing misc works out as NaN.
			tmpItems.push(tmpItem(tmpDoc, { category: tmpCategory, acquiredAtTitle: tmpTitle,
				startingBonus: tmpBonuses.startingBonus, abilityBonus: tmpBonuses.abilityBonus,
				misc: 0, isCommon: false }));
		};

		var tmpClassMods = tmpClassDoc?.system?.classMods ?? [];
		for (const tmpSkill of (tmpNonClassed ? [] : (tmpChoices.classSkills ?? []))) {
			var tmpDef = tmpByName(tmpContent.skills, tmpSkill.name)?.system;
			tmpAddSkill(tmpSkill.name, "class", getClassSkillBonuses(tmpDef, tmpSkill.core, tmpClassMods, tmpRoll), 1);
		}
		// A racial skill's bonus is the race's -- for a Half Race, the combined list's.
		var tmpRacialBonuses = {};
		for (const tmpRace of tmpRaceDocs) {
			for (const tmpSkill of tmpRace.system?.racialSkills ?? []) {
				var tmpBest = Math.max(parseInt(("" + tmpSkill.bonus).replace("%", "")) || 0,
				                       parseInt(("" + (tmpRacialBonuses[tmpSkill.name] ?? "")).replace("%", "")) || 0);
				tmpRacialBonuses[tmpSkill.name] = tmpBest ? `+${tmpBest}%` : "";
			}
		}
		for (const tmpName of tmpChoices.racialSkillNames ?? []) {
			var tmpRacialDef = tmpByName(tmpContent.skills, tmpName)?.system;
			tmpAddSkill(tmpName, "racial", getRacialSkillBonuses(tmpRacialDef, tmpRacialBonuses[tmpName], tmpRoll), 0);
		}
		for (const tmpName of tmpChoices.socialSkillNames ?? []) {
			var tmpSocialDef = tmpByName(tmpContent.skills, tmpName)?.system;
			tmpAddSkill(tmpName, "social", getSocialSkillBonuses(tmpSocialDef, tmpRoll), 0);
		}

		// The actor. A GME is his "0-title non-classed" character (setFinalClass sets title 0 for
		// GME and 1 for everyone else, sheet-worker.js:51314-51321).
		var tmpAttributes = {};
		for (const tmpKey of ATTRIBUTE_ORDER) {
			tmpAttributes[tmpKey] = { rating: parseInt(tmpChoices.ratings?.[tmpKey]) || 0, permMod: 0, tempMod: 0 };
		}
		var tmpFirstRace = tmpRaceDocs[0]?.system ?? {};
		var tmpActor = {
			name: tmpChoices.name || "New Character",
			type: "character",
			system: {
				identity: { title: tmpNonClassed ? 0 : 1, goal: 0, exp: 0,
				            alignment: tmpChoices.alignment ?? "", gender: tmpChoices.gender ?? "" },
				attributes: tmpAttributes,
				physical: {
					heightFeet: parseInt(tmpChoices.heightFeet) || 0, heightInches: parseInt(tmpChoices.heightInches) || 0,
					weight: parseFloat(tmpChoices.weight) || 0, frame: tmpChoices.frame ?? "",
					hair: tmpChoices.hair ?? "", eyes: tmpChoices.eyes ?? "", skin: tmpChoices.skin ?? "",
					handedness: tmpChoices.handedness ?? "", age: parseInt(tmpChoices.age) || 0,
					apparentAge: parseInt(tmpChoices.age) || 0,
					maxAge: "" + (tmpChoices.maxAge ?? tmpFirstRace.ages?.maxAge ?? "")
				},
				// languages come as [{ name, write }]; every one is spoken
				languages: (tmpChoices.languages ?? []).filter(tmpLang => tmpLang?.name)
					.map(tmpLang => ({ name: tmpLang.name, speak: true, write: !!tmpLang.write })),
				wealth: { copper: parseInt(tmpChoices.wealth?.copper) || 0, silver: parseInt(tmpChoices.wealth?.silver) || 0,
				          gold: parseInt(tmpChoices.wealth?.gold) || 0, platinum: parseInt(tmpChoices.wealth?.platinum) || 0 },
				combat: { chosenAttackSkill: tmpChoices.chosenAttackSkill || "Beginner" }
			}
		};
		return { actor: tmpActor, items: tmpItems, issues: tmpIssues };
	}

// @MARKER ADD NEW character generation rule functions HERE
// @END (CODE)
