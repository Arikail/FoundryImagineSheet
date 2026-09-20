// @START (CODE)
// @MARKER CLASS ADVANCEMENT
//==================================================================================================================
// Granting a character the class skills their title has earned. The rules live in class-rules.mjs,
// which knows nothing of Foundry; this is the half that talks to the world -- the skill compendium,
// the actor's items, and the hooks that notice a title changing.
//
// WHEN IT RUNS. His sheet acquires a title's class skills the moment the character reaches that
// title (handleLevelTitle, sheet-worker.js:66058 -- see the note in class-rules.mjs on why the goal
// boundary and the title boundary are the same line). So this runs on the three occasions a
// character's entitlement can change:
//     the character's title changes           updateActor
//     one class's own title changes           updateItem, a dual-classed character's per-class title
//     a class is added or its list changes    createItem / updateItem
//
// WHAT IT GRANTS. Every entitled skill the character does not already hold, with the bonuses his
// setClassSkillAbility gives: the skill's starting dice rolled, +30 if it is a CORE skill of the
// class, and every class modifier naming a type the skill has. That is getClassSkillBonuses in
// chargen-rules.mjs, the same function character generation uses for the first title's skills, so a
// skill granted at title 7 is built exactly like one the character started with.
//
// WHAT IT NEVER DOES. It never removes a skill, never touches one the character already holds, and
// never grants past a class's skill list. Slots it does not police either: the slot panel already
// reports an overrun, and his own sheet marks the excess "REMOVED" rather than refusing the title.
//==================================================================================================================

import { getClassSkillsToGrant } from "./class-rules.mjs";
import { getClassSkillBonuses } from "./chargen-rules.mjs";
import { explainAvailability } from "./availability.mjs";

const SKILL_PACK = "world.imagine-skills";

// The option a caller sets on its own update to say "I will do the grant myself". The title commit
// sets it, because it wants to report the whole advance in one message rather than two.
export const GRANT_HANDLED = "imagineGrantHandled";

// Actors a grant is running for right now. Two grants racing on one actor would each read the held
// skills before either had created anything, and the character would end up holding every skill of
// that title TWICE -- each with its own rolled starting bonus, each eating a class skill slot.
const granting = new Set();

	// This is the function which rolls one die, through Foundry's own random source, so the dice
	// settings the world uses apply to a granted skill's starting bonus as they do everywhere else.
	function rollDie(tmpsides) {
		return Math.ceil(CONFIG.Dice.randomUniform() * tmpsides) || 1;
	}

	// This is the function which reads the skill compendium once per grant. A world with no content
	// imported yet has no pack, which grants nothing rather than failing -- the same way the
	// character generator answers a missing pack.
	async function loadSkillDocuments() {
		var tmppack = game.packs.get(SKILL_PACK);
		if (!tmppack) { return []; }
		return (await tmppack.getDocuments()).map(tmpdoc => tmpdoc.toObject());
	}

	// @MARKER THE GRANT
	// This is the function which gives an actor every class skill their title has earned and they
	// do not hold yet.
	//
	// Returns { granted, blocked, missing } -- all three, not just what worked, so a caller that
	// silences the notifications (the title commit does, to say it all in one message) can still
	// say what could not be given. A skill named by a class and absent from the compendium is a
	// content gap; one the switches refused is a rule the Game Master set. Neither should vanish.
	//
	// A skill the campaign has switched off is skipped and named in the report, not forced onto the
	// character: the Game Master turned it off deliberately, and a grant is no more entitled to
	// ignore that than a player dragging the skill across would be.
	export async function grantClassSkills(tmpactor, { notify = true } = {}) {
		if (!tmpactor || tmpactor.type != "character") { return { granted: [], blocked: [], missing: [] }; }

		var tmpnothing = { granted: [], blocked: [], missing: [] };
		var tmpprogression = tmpactor.system.identity?.classProgression ?? [];
		var tmpowed = tmpprogression.filter(tmpclass => tmpclass.owed.length);
		if (!tmpowed.length) { return tmpnothing; }
		// Already running for this actor: the second caller would read the same "held" list as the
		// first and grant everything twice. Reading the compendium below is an await, which is all
		// the opening a second call needs.
		if (granting.has(tmpactor.id)) { return tmpnothing; }
		granting.add(tmpactor.id);

		try {
		var tmpskilldocs = await loadSkillDocuments();
		var tmprules = game.imagine.getAvailabilityRules();
		var tmpheld = tmpactor.items.filter(tmpitem => tmpitem.type == "skill").map(tmpitem => tmpitem.name);

		var tmpnew = [];
		var tmpblocked = [];
		var tmpmissing = [];
		for (const tmpclassrow of tmpowed) {
			var tmpclassitem = tmpactor.items.get(tmpclassrow.id);
			if (!tmpclassitem) { continue; }
			var tmpclassmods = tmpclassitem.system.classMods ?? [];

			// Re-asked per class rather than trusting the derived list alone: two classes can owe
			// the same skill, and the first grant of it makes the second a duplicate.
			for (const tmpskill of getClassSkillsToGrant(tmpclassitem.system, tmpclassrow.title,
			                                            tmpactor.system.identity.cannotCast, tmpheld)) {
				var tmpdoc = tmpskilldocs.find(tmpcandidate => tmpcandidate.name == tmpskill.name);
				if (!tmpdoc) { tmpmissing.push(tmpskill.name); continue; }
				if (!explainAvailability(tmpdoc, tmprules).available) { tmpblocked.push(tmpskill.name); continue; }

				var tmpbonuses = getClassSkillBonuses(tmpdoc.system, tmpskill.core, tmpclassmods, rollDie);
				tmpnew.push({
					name: tmpdoc.name, type: "skill", img: tmpdoc.img,
					system: {
						...foundry.utils.deepClone(tmpdoc.system ?? {}),
						category: "class", acquiredAtTitle: tmpskill.title,
						startingBonus: tmpbonuses.startingBonus, abilityBonus: tmpbonuses.abilityBonus,
						misc: 0, isCommon: false
					}
				});
				tmpheld.push(tmpdoc.name);
			}
		}

		if (tmpnew.length) { await tmpactor.createEmbeddedDocuments("Item", tmpnew); }

		if (notify) { reportGrant(tmpactor, tmpnew, tmpblocked, tmpmissing); }
		return { granted: tmpnew.map(tmpitem => tmpitem.name), blocked: tmpblocked, missing: tmpmissing };
		} finally {
			granting.delete(tmpactor.id);
		}
	}

	// This is the function which says what a grant did. Every part of it is worth saying out loud:
	// a skill the compendium does not hold is a content gap the Game Master should know about, and
	// one the switches refused is a rule they set themselves and may want to reconsider for a
	// character who has just earned it.
	function reportGrant(tmpactor, tmpnew, tmpblocked, tmpmissing) {
		if (tmpnew.length) {
			ui.notifications.info(`${tmpactor.name} gains ${tmpnew.length} class `
				+ `${tmpnew.length == 1 ? "skill" : "skills"}: ${tmpnew.map(tmpitem => tmpitem.name).join(", ")}.`);
		}
		if (tmpblocked.length) {
			ui.notifications.warn(`${tmpactor.name}: ${tmpblocked.join(", ")} `
				+ `${tmpblocked.length == 1 ? "is" : "are"} switched off in this campaign, and not granted.`);
		}
		if (tmpmissing.length) {
			ui.notifications.warn(`${tmpactor.name}: ${tmpmissing.join(", ")} `
				+ `${tmpmissing.length == 1 ? "is" : "are"} not in the skill compendium, and not granted.`);
		}
	}

	// @MARKER HOOKS
	// This is the function which watches for a title changing and grants what it earned.
	//
	// Only the user who made the change runs the grant, so two clients watching the same actor do
	// not each create the same skills; Foundry hands every hook to everyone, and the id of the user
	// whose change it was is the standard way to settle that.
	export function registerClassAdvancement() {

		Hooks.on("updateActor", function (tmpactor, tmpchanges, tmpoptions, tmpuserid) {
			if (tmpuserid != game.user.id) { return; }
			if (tmpoptions?.[GRANT_HANDLED]) { return; }   // the title commit grants and reports itself
			if (tmpchanges.system?.identity?.title === undefined) { return; }
			grantClassSkills(tmpactor);
		});

		// A dual-classed character's per-class title, and a class item arriving on the actor at all.
		Hooks.on("updateItem", function (tmpitem, tmpchanges, tmpoptions, tmpuserid) {
			if (tmpuserid != game.user.id) { return; }
			if (tmpitem.type != "class" || !tmpitem.parent) { return; }
			if (tmpchanges.system?.title === undefined) { return; }
			grantClassSkills(tmpitem.parent);
		});

		Hooks.on("createItem", function (tmpitem, tmpoptions, tmpuserid) {
			if (tmpuserid != game.user.id) { return; }
			if (tmpitem.type != "class" || !tmpitem.parent) { return; }
			grantClassSkills(tmpitem.parent);
		});
	}

// @MARKER ADD NEW class advancement functions HERE
// @END (CODE)
