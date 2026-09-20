// @START (CODE)
// @MARKER LEVEL UP VIEW
//==================================================================================================================
// What the Level Up window shows, worked out with no Foundry dependency -- the same split the
// character generator uses (chargen-view.mjs), and for the same reason: the window is then only
// the Foundry face, and everything it displays can be tested and previewed outside Foundry.
//
// It is handed the actor (anything with .system and .items -- a real Actor, or a plain object in a
// test) and the window's working state: the rolls made, the attribute picked where his rules let
// the player pick, the skill points placed, and the Endurance rolled. None of that is written to
// the character until a commit, so this describes a step in progress, not a character.
//==================================================================================================================

import {
	planGoalAdvance, getSkillPointsForGoal, getArchMortalGains, getTitleByGoal, ARCH_MORTAL_GOAL
} from "./advancement-rules.mjs";
import { getClassSkillsAtTitle } from "./class-rules.mjs";

	// The twelve attributes in his order, for the "any attribute" pick.
	export const ATTRIBUTE_LABELS = {
		str: "Strength", agl: "Agility", vit: "Vitality", int: "Intelligence",
		wis: "Wisdom", knw: "Knowledge", app: "Appearance", chm: "Charm",
		soc: "Social Class", aur: "Aura", pty: "Piety", wil: "Will Force"
	};

	// What each shape of his attribute offer means, in a sentence, so the template carries no
	// logic. His four are in planGoalAdvance.
	const MODE_EXPLANATIONS = {
		two:    "This class raises two attributes, each rolled separately.",
		one:    "One of the class's attributes is already at its maximum, so the other rolls alone.",
		any:    "Neither class attribute can rise, so any attribute may be tried.",
		choose: ""
	};

	// An empty working state, which is also what a committed step resets to.
	export function newLevelUpWorking() {
		return { rolls: null, picked: [], spends: [], endurance: null };
	}

	// This is the function which builds everything the window shows.
	export function buildLevelUpView(tmpactor, tmpworking, tmpisgm) {
		var tmpsystem = tmpactor.system;
		var tmpidentity = tmpsystem.identity;
		var tmpitems = itemsOf(tmpactor);
		var tmpwork = tmpworking ?? newLevelUpWorking();

		// Which of the three steps is live. A title waiting on this goal comes FIRST -- his own
		// refusal in handleGoalCommit, not a choice made here.
		var tmptitlefirst = (parseInt(tmpidentity.titlesToRaise) || 0) > 0
			&& (parseInt(tmpidentity.titleToLevel) || 0) <= getTitleByGoal(tmpidentity.goalToLevel);
		var tmpstep = !tmpidentity.levelUpPending ? "experience" : (tmptitlefirst ? "title" : "goal");

		var tmpview = {
			step: tmpstep,
			// As flags rather than a string compared in the template: this port's templates use no
			// Handlebars helpers, whose presence in Foundry's environment cannot be checked here,
			// and the previews render the same files outside it.
			isExperience: tmpstep == "experience",
			isTitle: tmpstep == "title",
			isGoal: tmpstep == "goal",
			archMortalGoal: ARCH_MORTAL_GOAL,
			standing: {
				title: tmpidentity.title,
				titleName: tmpidentity.titleName,
				goal: tmpidentity.goal,
				exp: tmpidentity.exp,
				nextGoalExp: tmpidentity.nextGoalExp,
				expCap: tmpidentity.expCap,
				toNextGoal: Math.max(0, (parseInt(tmpidentity.nextGoalExp) || 0) - (parseInt(tmpidentity.exp) || 0)),
				className: tmpidentity.className
			},
			queue: {
				titles: tmpidentity.titlesToRaise,
				goals: tmpidentity.goalsToRaise,
				goalToLevel: tmpidentity.goalToLevel,
				titleToLevel: tmpidentity.titleToLevel
			}
		};

		if (tmpview.isGoal)  { Object.assign(tmpview, buildGoalStep(tmpactor, tmpwork)); }
		if (tmpview.isTitle) { Object.assign(tmpview, buildTitleStep(tmpactor, tmpwork)); }

		// The Arch Mortal screen, shown from 10th title on -- the point at which it starts to
		// matter, since a goal past 29 is refused without it.
		var tmpclass = tmpitems.find(tmpitem => tmpitem.type == "class");
		tmpview.archMortal = (parseInt(tmpidentity.title) || 0) >= 10 ? {
			...(tmpidentity.archMortal ?? { qualified: false, rows: [] }),
			specialMet: !!tmpidentity.archSpecialMet,
			special: tmpclass?.system?.archMortal?.special ?? "",
			isGM: !!tmpisgm
		} : null;

		return tmpview;
	}

	// This is the function which builds the goal step: the attribute offer and the skill points.
	export function buildGoalStep(tmpactor, tmpworking) {
		var tmpsystem = tmpactor.system;
		var tmpidentity = tmpsystem.identity;
		var tmpitems = itemsOf(tmpactor);
		var tmpwork = tmpworking ?? newLevelUpWorking();

		// Which attributes are already at their maximum, which is what decides his four shapes.
		var tmpatmax = {};
		for (const tmpkey of Object.keys(tmpsystem.attributes)) {
			tmpatmax[tmpkey] = (parseInt(tmpsystem.attributes[tmpkey].value) || 0)
			                >= (parseInt(tmpsystem.attributes[tmpkey].max) || 0);
		}

		var tmpplan = planGoalAdvance({
			goalToLevel: tmpidentity.goalToLevel,
			goalAttributes: tmpidentity.goalAttributes,
			atMax: tmpatmax,
			totalIncreases: tmpidentity.attributeIncreases
		});

		var tmpclass = tmpitems.find(tmpitem => tmpitem.type == "class");
		var tmppoints = getSkillPointsForGoal(tmpclass?.system, tmpclass?.name);
		var tmpspent = (tmpwork.spends ?? []).reduce((tmptotal, tmpspend) => tmptotal + tmpspend.points, 0);

		// What the points may go on: class skills the character has actually acquired. His
		// skill-point screens only ever walk titles already reached.
		var tmpskills = tmpitems
			.filter(tmpitem => tmpitem.type == "skill" && tmpitem.system.category == "class"
				&& (parseInt(tmpitem.system.acquiredAtTitle) || 0) <= (parseInt(tmpidentity.title) || 0))
			.map(tmpitem => ({
				id: tmpitem.id, name: tmpitem.name, chance: tmpitem.system.totalChance,
				added: (tmpwork.spends ?? []).filter(tmpspend => tmpspend.itemId == tmpitem.id)
					.reduce((tmptotal, tmpspend) => tmptotal + tmpspend.points, 0)
			}))
			.sort((a, b) => a.name.localeCompare(b.name));

		return {
			goalPlan: {
				...tmpplan,
				rolls: tmpplan.rolls.map((tmproll, tmpindex) => ({
					...tmproll,
					index: tmpindex,
					label: tmproll.anyAttribute ? "Any attribute" : (ATTRIBUTE_LABELS[tmproll.key] ?? tmproll.key),
					picked: (tmpwork.picked ?? [])[tmpindex] ?? "",
					result: tmpwork.rolls ? tmpwork.rolls[tmpindex] : null
				})),
				rolled: !!tmpwork.rolls,
				// His guaranteed pick is not a roll at all: chance 100, and the player names it.
				isChoice: tmpplan.mode == "choose",
				explanation: MODE_EXPLANATIONS[tmpplan.mode] ?? ""
			},
			attributeChoices: Object.entries(ATTRIBUTE_LABELS).map(([tmpkey, tmplabel]) =>
				({ key: tmpkey, label: tmplabel, atMax: tmpatmax[tmpkey] })),
			skillPoints: {
				total: tmppoints, spent: tmpspent, remaining: tmppoints - tmpspent,
				skills: tmpskills, spends: tmpwork.spends ?? []
			},
			// Everything must be settled before a goal commits, exactly as his handleGoalCommit
			// refuses one that is not: the attribute rolled or chosen, and every point placed.
			canCommit: !!tmpwork.rolls && (tmppoints - tmpspent) == 0
		};
	}

	// This is the function which builds the title step: what the title brings, and its Endurance.
	export function buildTitleStep(tmpactor, tmpworking) {
		var tmpsystem = tmpactor.system;
		var tmpitems = itemsOf(tmpactor);
		var tmpwork = tmpworking ?? newLevelUpWorking();
		var tmptitle = parseInt(tmpsystem.identity.titleToLevel) || 0;
		var tmpclass = tmpitems.find(tmpitem => tmpitem.type == "class");
		var tmprace = tmpitems.find(tmpitem => tmpitem.type == "race");

		return {
			titleStep: {
				title: tmptitle,
				titleName: getTitleNameOf(tmpclass, tmptitle),
				className: tmpclass?.name ?? "",
				// The class skills this title brings, from the class progression built last pass.
				skills: tmpclass
					? getClassSkillsAtTitle(tmpclass.system, tmptitle, tmpsystem.identity.cannotCast) : [],
				enduranceFormula: tmprace?.system?.endurance?.titleFormula ?? "",
				endurance: tmpwork.endurance,
				// From 11th his Arch Mortal package: the maximums, ageing, the invulnerability and
				// Sense Supernatural. Shown before it is applied, never sprung afterwards.
				archMortal: getArchMortalGains(tmptitle),
				isArchMortal: tmptitle >= 11,
				canCommit: tmpwork.endurance !== null && tmpwork.endurance !== undefined
			}
		};
	}

	// @MARKER GENERAL PURPOSE FUNCTIONS

	// An actor's items as a plain array, so a Foundry Collection and a test's array behave alike.
	function itemsOf(tmpactor) {
		var tmpitems = tmpactor?.items;
		if (!tmpitems) { return []; }
		return Array.isArray(tmpitems) ? tmpitems : Array.from(tmpitems);
	}

	// The title's name off the class. The lookup lives on the class's data model, and older code
	// reached it through the item, so both are tried -- the same reason the character model has
	// getClassTitleName.
	function getTitleNameOf(tmpclass, tmptitle) {
		if (!tmpclass) { return ""; }
		if (tmpclass.system?.getTitleName) { return tmpclass.system.getTitleName(tmptitle) || ""; }
		if (tmpclass.getTitleName) { return tmpclass.getTitleName(tmptitle) || ""; }
		return "";
	}

// @MARKER ADD NEW level up view functions HERE
// @END (CODE)
