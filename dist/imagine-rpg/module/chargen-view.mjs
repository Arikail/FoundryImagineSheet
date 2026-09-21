// @START (CODE)
// @MARKER CHARACTER GENERATOR VIEW
//==================================================================================================================
// What each step of the character generator shows, worked out from the generator's state and the
// content. No Foundry dependency: the generator window (module/apps/character-generator.mjs) and
// the preview harness (tools/chargen-preview.html) both call buildGeneratorView, so the preview
// renders exactly what the window would rather than a hand-kept copy of it.
//
// The state is plain data, one field per choice. The steps, in his order where his sheet has one:
//     0 Basics      name, character type, physique           (his step 9 name, PG step 2-3)
//     1 Race        one race, or a Half Race of two          (his step 1)
//     2 Attributes  roll or enter, adjust, Civilized Human   (his step 2)
//     3 Class       class or path, qualification             (his step 5)
//     4 Skills      class, racial and social                 (his step 6)
//     5 Details     handedness, age, looks, languages,       (his steps 3, 4, 7, 8)
//                   alignment, money
//     6 Review      everything, and Create
//==================================================================================================================

import { ATTRIBUTE_TABLES } from "./config-tables.mjs";
import { combineHalfRace, isClassBlockedForRaces, applySlightPhysique } from "./race-rules.mjs";
import {
	ATTRIBUTE_ORDER, CHARACTER_TYPES, buildRatings, checkFinalAttributes, getCivilizedHumanAllowance,
	checkClassQualification, getStartingClassSkills, assembleCharacter
} from "./chargen-rules.mjs";

	export const STEPS = ["Basics", "Race", "Attributes", "Class", "Skills", "Details", "Review"];

	// This is the function which lists the colours a race is found in, for one of the three
	// features. A Half Race is offered both parents' lists, with anything on both shown once.
	// "Other" is always last, so a player who wants a colour his tables do not list can still
	// type one -- which is what his own sheet allows, the lists being a prompt rather than a rule.
	export function colourChoices(tmpRaceDocs, tmpWhich, tmpChosen) {
		var tmpAll = [];
		for (const tmpRace of tmpRaceDocs ?? []) {
			for (const tmpColour of tmpRace?.system?.features?.[tmpWhich] ?? []) {
				if (!tmpAll.includes(tmpColour)) { tmpAll.push(tmpColour); }
			}
		}
		var tmpOptions = tmpAll.map(tmpColour =>
			({ value: tmpColour, label: tmpColour, selected: tmpColour == tmpChosen }));
		// Something typed that is not on the list keeps its place at the top rather than vanishing.
		if (tmpChosen && !tmpAll.includes(tmpChosen)) {
			tmpOptions.unshift({ value: tmpChosen, label: tmpChosen + " (typed)", selected: true });
		}
		return tmpOptions;
	}

	const ATTRIBUTE_LABELS = {
		str: "Strength", agl: "Agility", vit: "Vitality", int: "Intelligence", wis: "Wisdom", knw: "Knowledge",
		app: "Appearance", chm: "Charm", soc: "Social Class", aur: "Aura", pty: "Piety", wil: "Will Force"
	};

	// This is the function which gives a fresh generator its starting state.
	export function newGeneratorState() {
		return {
			step: 0,
			name: "", gender: "", slightPhysique: false, charType: "adventurer",
			race1: "", race2: "",
			rolled: null, manual: false, manualBase: {},
			swaps: [], humanBonuses: ["", "", ""], humanMoves: [],
			className: "", override: false, chosenAttackSkill: "Beginner",
			racialSkillNames: [], socialSkillNames: [],
			handedness: "", age: 0, heightFeet: 0, heightInches: 0, weight: 0,
			// What the last height/frame/weight roll said, kept so the Details step can show it.
			physiqueSummary: "", physiqueIssues: [],
			frame: "", hair: "", eyes: "", skin: "",
			alignment: "", languages: [], wealth: { copper: 0, silver: 0, gold: 0, platinum: 0 }
		};
	}

	// This is the function which works out everything that follows from the choices so far --
	// the race, the ratings, the final attributes, the class and its qualification, the slots --
	// so each step's view and the Next checks read one consistent picture.
	export function deriveGenerator(tmpState, tmpContent, tmpIsAvailable) {
		var tmpAvail = tmpIsAvailable ?? (() => true);
		var tmpFind = (tmpDocs, tmpName) => (tmpDocs ?? []).find(tmpDoc => tmpDoc.name == tmpName) ?? null;

		var tmpRace1 = tmpFind(tmpContent.races, tmpState.race1);
		var tmpRace2 = tmpState.race2 ? tmpFind(tmpContent.races, tmpState.race2) : null;
		var tmpRaceNames = [tmpRace1?.name, tmpRace2?.name].filter(tmpName => tmpName);
		// The slight-physique form is chosen BEFORE the two halves are combined, so a half race
		// gets the right form of each parent rather than the ordinary form of both.
		var tmpSystem1 = tmpRace1 ? applySlightPhysique(tmpRace1.system, tmpState.slightPhysique) : null;
		var tmpSystem2 = tmpRace2 ? applySlightPhysique(tmpRace2.system, tmpState.slightPhysique) : null;
		var tmpRace = tmpSystem1 ? (tmpSystem2 ? combineHalfRace(tmpSystem1, tmpSystem2) : tmpSystem1) : null;

		var tmpType = CHARACTER_TYPES[tmpState.charType] ?? CHARACTER_TYPES.adventurer;
		var tmpBase = tmpState.manual ? tmpState.manualBase : (tmpState.rolled?.best ?? null);
		var tmpHasBase = !!tmpBase && ATTRIBUTE_ORDER.every(tmpKey => (parseInt(tmpBase[tmpKey]) || 0) > 0);
		var tmpNumericBase = {};
		for (const tmpKey of ATTRIBUTE_ORDER) { tmpNumericBase[tmpKey] = parseInt(tmpBase?.[tmpKey]) || 0; }

		var tmpHuman = getCivilizedHumanAllowance(tmpRaceNames);
		var tmpBuilt = buildRatings({
			base: tmpNumericBase, slightPhysique: tmpState.slightPhysique, ratio: tmpType.ratio,
			swaps: tmpState.swaps,
			humanBonuses: tmpState.humanBonuses.slice(0, tmpHuman.bonus),
			humanMoves: tmpState.humanMoves.slice(0, tmpHuman.moves)
		});
		var tmpFinals = checkFinalAttributes(tmpBuilt.ratings, tmpRace);

		var tmpClass = tmpFind(tmpContent.classes, tmpState.className);
		var tmpBlocked = tmpClass ? isClassBlockedForRaces(tmpClass.system.blockedRaces, tmpRaceNames) : false;
		var tmpClassIssues = tmpClass ? checkClassQualification(tmpClass.system, tmpFinals, tmpRaceNames, tmpBlocked) : [];
		var tmpCannotCast = (tmpRace?.disabilities ?? []).includes("Cannot Cast Spells");
		var tmpNonClassed = !!tmpClass?.system?.nonClassed;
		var tmpClassSkills = (tmpClass && !tmpNonClassed) ? getStartingClassSkills(tmpClass.system, tmpCannotCast) : [];

		// Skill slots are Knowledge's, as the character itself reads them (ATTRIBUTE_TABLES.knw).
		var tmpKnwRow = ATTRIBUTE_TABLES.knw[Math.max(0, Math.min(30, tmpFinals.knw.final))] ?? {};

		return {
			race1: tmpRace1, race2: tmpRace2, raceNames: tmpRaceNames, race: tmpRace,
			type: tmpType, hasBase: tmpHasBase, ratings: tmpBuilt.ratings, ratingIssues: tmpBuilt.issues,
			finals: tmpFinals, human: tmpHuman,
			klass: tmpClass, blocked: tmpBlocked, classIssues: tmpClassIssues, cannotCast: tmpCannotCast,
			nonClassed: tmpNonClassed, classSkills: tmpClassSkills,
			slots: {
				class: parseInt(tmpKnwRow.classSkills) || 0,
				racial: parseInt(tmpKnwRow.raceSkills) || 0,
				social: parseInt(tmpKnwRow.socialSkills) || 0
			},
			intRow: ATTRIBUTE_TABLES.int[Math.max(0, Math.min(30, tmpFinals.int.final))] ?? {},
			available: tmpAvail
		};
	}

	// This is the function which says whether the current step is finished well enough to go on,
	// and if not, why. Rules the player may knowingly break (an unqualified class with the
	// override ticked) do not block; missing essentials do.
	export function checkStep(tmpState, tmpDerived) {
		switch (STEPS[tmpState.step]) {
			case "Race":
				if (!tmpDerived.race1) { return "Choose a race."; }
				return "";
			case "Attributes":
				if (!tmpDerived.hasBase) { return "Roll the attributes, or enter all twelve."; }
				return "";
			case "Class":
				if (!tmpDerived.klass) { return "Choose a class."; }
				if (tmpDerived.classIssues.length && !tmpState.override) {
					return "This character does not qualify. Tick the override to take the class anyway.";
				}
				return "";
			case "Skills":
				if (tmpState.racialSkillNames.length > tmpDerived.slots.racial) {
					return `Only ${tmpDerived.slots.racial} racial skills are allowed; ${tmpState.racialSkillNames.length} are chosen.`;
				}
				if (tmpState.socialSkillNames.length > tmpDerived.slots.social) {
					return `Only ${tmpDerived.slots.social} social skills are allowed; ${tmpState.socialSkillNames.length} are chosen.`;
				}
				return "";
		}
		return "";
	}

	// This is the function which builds everything the template renders.
	export function buildGeneratorView(tmpState, tmpContent, tmpIsAvailable) {
		var tmpD = deriveGenerator(tmpState, tmpContent, tmpIsAvailable);
		var tmpStepName = STEPS[tmpState.step];
		var tmpOption = (tmpValue, tmpLabel, tmpSelected, tmpExtra) => ({ value: tmpValue, label: tmpLabel,
			selected: tmpValue == tmpSelected, ...(tmpExtra ?? {}) });
		var tmpAttrOptions = (tmpSelected, tmpWithSoc) => [tmpOption("", "--", tmpSelected)]
			.concat(ATTRIBUTE_ORDER.filter(tmpKey => tmpWithSoc || tmpKey != "soc")
			.map(tmpKey => tmpOption(tmpKey, tmpKey.toUpperCase(), tmpSelected)));

		var tmpView = {
			state: tmpState,
			steps: STEPS.map((tmpName, tmpIndex) => ({ name: tmpName, index: tmpIndex,
				current: tmpIndex == tmpState.step, done: tmpIndex < tmpState.step })),
			stepName: tmpStepName,
			isFirst: tmpState.step == 0,
			isLast: tmpState.step == STEPS.length - 1,
			blocker: checkStep(tmpState, tmpD),
			["is" + tmpStepName]: true
		};

		// @MARKER BASICS
		tmpView.charTypes = Object.entries(CHARACTER_TYPES).map(([tmpKey, tmpDef]) => tmpOption(tmpKey,
			`${tmpDef.label} -- ${tmpDef.sets == 1 ? "one roll" : tmpDef.sets + " rolls, best kept"}, ${tmpDef.ratio}:1`
			+ (tmpDef.fromBook ? " (Player's Guide; not on his sheet)" : ""), tmpState.charType));

		// @MARKER RACE
		var tmpRaces = (tmpContent.races ?? []).filter(tmpDoc => tmpD.available(tmpDoc))
			.sort((a, b) => a.name.localeCompare(b.name));
		tmpView.race1Options = [tmpOption("", "-- choose --", tmpState.race1)]
			.concat(tmpRaces.map(tmpDoc => tmpOption(tmpDoc.name, tmpDoc.name, tmpState.race1)));
		// His Half Race picker offers only the first race's fertile partners (racefertiledict).
		var tmpFertile = tmpD.race1?.system?.fertileWith ?? [];
		tmpView.race2Options = [tmpOption("", "-- one race only --", tmpState.race2)]
			.concat(tmpRaces.filter(tmpDoc => tmpFertile.includes(tmpDoc.name))
			.map(tmpDoc => tmpOption(tmpDoc.name, tmpDoc.name, tmpState.race2)));
		tmpView.canBeHalf = tmpFertile.length > 0;
		tmpView.raceName = tmpD.raceNames.join("|");
		tmpView.race = tmpD.race;

		// @MARKER ATTRIBUTES
		tmpView.typeLabel = tmpD.type.label;
		tmpView.ratio = tmpD.type.ratio;
		tmpView.rolledSets = tmpState.rolled?.sets?.length ?? 0;
		tmpView.attributes = ATTRIBUTE_ORDER.map(tmpKey => {
			var tmpFinal = tmpD.finals[tmpKey];
			return {
				key: tmpKey, label: ATTRIBUTE_LABELS[tmpKey],
				rolls: (tmpState.rolled?.sets ?? []).map(tmpSet => tmpSet[tmpKey]),
				manual: tmpState.manualBase?.[tmpKey] ?? "",
				base: tmpState.manual ? (parseInt(tmpState.manualBase?.[tmpKey]) || 0) : (tmpState.rolled?.best?.[tmpKey] ?? ""),
				rating: tmpD.ratings[tmpKey],
				raceMod: parseInt(tmpD.race?.attributeMods?.[tmpKey]) || 0,
				final: tmpFinal.final, limit: tmpFinal.limit,
				overLimit: tmpFinal.overLimit, underMinimum: tmpFinal.underMinimum
			};
		});
		tmpView.swaps = tmpState.swaps.map((tmpSwap, tmpIndex) => ({
			index: tmpIndex,
			toOptions: tmpAttrOptions(tmpSwap.to, false),
			from: Array.from({ length: tmpD.type.ratio }, (_, tmpN) => ({ n: tmpN,
				options: tmpAttrOptions((tmpSwap.from ?? [])[tmpN], false) }))
		}));
		tmpView.ratingIssues = tmpD.ratingIssues;
		tmpView.human = tmpD.human;
		tmpView.humanBonuses = Array.from({ length: tmpD.human.bonus }, (_, tmpN) => ({ n: tmpN,
			options: tmpAttrOptions(tmpState.humanBonuses[tmpN], false) }));
		tmpView.humanMoves = Array.from({ length: tmpD.human.moves }, (_, tmpN) => ({ n: tmpN,
			fromOptions: tmpAttrOptions(tmpState.humanMoves[tmpN]?.from, false),
			toOptions: tmpAttrOptions(tmpState.humanMoves[tmpN]?.to, false) }));

		// @MARKER CLASS
		// Every class the campaign allows is offered, and each one that this character cannot take
		// SAYS SO IN ITS OWN LABEL rather than only after it has been picked.
		//
		// This list used to be bare names. Picking one and being told "This character does not
		// qualify" was the only way to find out, so a player had to walk the dropdown one entry at
		// a time -- and for a character with a low attribute that is most of the list. Daryl
		// reported it on 2026-09-20 as "cannot select any class but GME", which is exactly what it
		// looks like from the outside: GME is the one class with no attribute requirement at all,
		// so on a Nixie -- Strength capped at 11 by its race, against the 13, 14 or 15 that 28
		// classes ask for -- it can be the only name that does not refuse.
		//
		// Nothing is hidden and nothing is disabled. The requirement is a rule the player may
		// knowingly break with the override tick, so the entry stays selectable and the label
		// carries the reason; hiding them would silently shrink a list the Game Master expects to
		// be complete, and would make the override unreachable for the very classes it is for.
		var tmpClasses = (tmpContent.classes ?? []).filter(tmpDoc => tmpD.available(tmpDoc))
			.sort((a, b) => a.name.localeCompare(b.name));
		var tmpQualifiedCount = 0;
		tmpView.classOptions = [tmpOption("", "-- choose --", tmpState.className)]
			.concat(tmpClasses.map(tmpDoc => {
				var tmpDocBlocked = isClassBlockedForRaces(tmpDoc.system.blockedRaces, tmpD.raceNames);
				var tmpDocIssues = tmpD.hasBase
					? checkClassQualification(tmpDoc.system, tmpD.finals, tmpD.raceNames, false) : [];
				if (!tmpDocIssues.length && !tmpDocBlocked) { tmpQualifiedCount += 1; }

				// "Needs STR 13; has 6." is the right sentence once a class has been chosen and
				// there is room to explain. In a dropdown it has to fit beside ninety-nine others,
				// so the shortfalls collapse to "needs STR 13, INT 15".
				var tmpWhy = [];
				if (tmpDocIssues.length) {
					tmpWhy.push("needs " + tmpDocIssues
						.map(tmpIssue => (tmpIssue.match(/Needs (\w+ \d+)/) ?? [])[1])
						.filter(tmpShort => tmpShort).join(", "));
				}
				if (tmpDocBlocked) { tmpWhy.push("not usual for this race"); }
				return tmpOption(tmpDoc.name,
					tmpDoc.name + (tmpWhy.length ? " — " + tmpWhy.join("; ") : ""),
					tmpState.className, { qualified: !tmpDocIssues.length && !tmpDocBlocked });
			}));
		tmpView.classQualifiedCount = tmpQualifiedCount;
		tmpView.classOfferedCount = tmpClasses.length;
		tmpView.klass = tmpD.klass ? {
			name: tmpD.klass.name, classType: tmpD.klass.system.classType,
			alignment: tmpD.klass.system.requirements?.alignment ?? "",
			focus: tmpD.klass.system.requirements?.focusAttributes ?? "",
			attackSkillList: tmpD.klass.system.attackSkillList,
			description: tmpD.klass.system.description,
			classMods: (tmpD.klass.system.classMods ?? []).join("; ")
		} : null;
		tmpView.classIssues = tmpD.classIssues;
		tmpView.nonClassed = tmpD.nonClassed;
		tmpView.attackSkillOptions = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master"]
			.map(tmpSkill => tmpOption(tmpSkill, tmpSkill, tmpState.chosenAttackSkill));

		// @MARKER SKILLS
		tmpView.slots = tmpD.slots;
		tmpView.classSkills = tmpD.classSkills;
		tmpView.cannotCast = tmpD.cannotCast;
		// A GME may take any racial skill (UPSTREAM-ISSUES.md item 22, his words), so its list is
		// every race's; anyone else chooses from their own race's -- a Half Race's is both.
		var tmpRacialList = tmpD.nonClassed
			? [...new Map((tmpContent.races ?? []).flatMap(tmpDoc => tmpDoc.system.racialSkills ?? [])
				.map(tmpSkill => [tmpSkill.name, tmpSkill])).values()]
			: (tmpD.race?.racialSkills ?? []);
		tmpView.racialSkills = tmpRacialList.map(tmpSkill => ({ name: tmpSkill.name, bonus: tmpSkill.bonus,
			checked: tmpState.racialSkillNames.includes(tmpSkill.name) }))
			.sort((a, b) => a.name.localeCompare(b.name));
		tmpView.socialSkills = (tmpContent.skills ?? [])
			.filter(tmpDoc => tmpDoc.system?.category == "social" && tmpD.available(tmpDoc))
			.map(tmpDoc => ({ name: tmpDoc.name, checked: tmpState.socialSkillNames.includes(tmpDoc.name) }))
			.sort((a, b) => a.name.localeCompare(b.name));
		tmpView.racialChosen = tmpState.racialSkillNames.length;
		tmpView.socialChosen = tmpState.socialSkillNames.length;

		// @MARKER DETAILS
		tmpView.handednessOptions = ["", "Right", "Left", "Ambidextrous"]
			.map(tmpValue => tmpOption(tmpValue, tmpValue || "-- roll or choose --", tmpState.handedness));
		tmpView.ages = tmpD.race?.ages ?? null;
		// @MARKER COLOURING
		// The colours a member of this race is found in. Offered as choices with anything already
		// typed kept alongside: his sheet lists them and still lets a player write their own, and
		// a Half Race is offered both parents' lists.
		tmpView.hairChoices = colourChoices([tmpD.race1, tmpD.race2], "hair", tmpState.hair);
		tmpView.eyesChoices = colourChoices([tmpD.race1, tmpD.race2], "eyes", tmpState.eyes);
		tmpView.skinChoices = colourChoices([tmpD.race1, tmpD.race2], "skin", tmpState.skin);
		// What the last physique roll said, for the line under the fields.
		tmpView.physique = tmpState.physiqueSummary ? { summary: tmpState.physiqueSummary } : null;
		tmpView.languageAllowance = { spoken: tmpD.intRow.spokenLanguages ?? 0, written: tmpD.intRow.writtenLanguages ?? 0 };
		tmpView.languages = [0, 1, 2, 3, 4, 5].map(tmpN => ({ n: tmpN, name: tmpState.languages[tmpN]?.name ?? "",
			write: !!tmpState.languages[tmpN]?.write }));

		// @MARKER REVIEW
		if (tmpStepName == "Review") {
			var tmpAssembled = assembleCharacter(choicesFromState(tmpState, tmpD), tmpContent, () => 0);
			tmpView.review = {
				items: tmpAssembled.items.map(tmpItem => ({ name: tmpItem.name, type: tmpItem.type,
					category: tmpItem.system.category ?? "" })),
				issues: [...tmpD.ratingIssues, ...tmpD.classIssues.map(tmpIssue => "Class: " + tmpIssue), ...tmpAssembled.issues],
				title: tmpAssembled.actor.system.identity.title
			};
		}
		return tmpView;
	}

	// This is the function which turns the generator's state into the choices assembleCharacter
	// takes. Kept here, beside the view, so the window and the preview make identical characters.
	export function choicesFromState(tmpState, tmpDerived) {
		return {
			name: tmpState.name, gender: tmpState.gender, slightPhysique: tmpState.slightPhysique,
			raceNames: tmpDerived.raceNames, className: tmpState.className,
			ratings: tmpDerived.ratings,
			classSkills: tmpDerived.classSkills,
			racialSkillNames: tmpState.racialSkillNames, socialSkillNames: tmpState.socialSkillNames,
			chosenAttackSkill: tmpState.chosenAttackSkill,
			handedness: tmpState.handedness, age: tmpState.age,
			heightFeet: tmpState.heightFeet, heightInches: tmpState.heightInches, weight: tmpState.weight,
			frame: tmpState.frame, hair: tmpState.hair, eyes: tmpState.eyes, skin: tmpState.skin,
			alignment: tmpState.alignment, languages: tmpState.languages, wealth: tmpState.wealth,
			maxAge: tmpDerived.race?.ages?.maxAge ?? ""
		};
	}

// @MARKER ADD NEW character generator view functions HERE
// @END (CODE)
