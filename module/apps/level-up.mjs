// @START (CODE)
// @MARKER LEVEL UP WINDOW
//==================================================================================================================
// The window that walks a character through a level-up, step by step, and applies it.
//
// It holds this session's rolls and nothing else. The rules are in module/advancement-rules.mjs
// and the writing in module/advancement.mjs, neither of which needs this window -- so both are
// tested outside Foundry, and this file is only the Foundry face: reading the form, rolling the
// dice and calling the two commits.
//
// Open it from the Level Up button on the character sheet, or from a macro:
//     game.imagine.levelUp(actor)
//
// HIS ORDER, which the window enforces rather than explains:
//     Experience   add what was awarded. Refused while a level-up is already waiting.
//     Title        where the next goal crosses a title, the TITLE is taken first -- his own
//                  refusal in handleGoalCommit, "Commit title before committing goal".
//     Goal         roll for the attribute, place the skill points, commit.
// The window shows whichever of the three is next, so there is no wrong order to get into.
//==================================================================================================================

import { resolveGoalAdvance, checkSkillPointSpend, getTitleEndurance } from "../advancement-rules.mjs";
import { buildLevelUpView, buildGoalStep, buildTitleStep, newLevelUpWorking,
         ATTRIBUTE_LABELS } from "../levelup-view.mjs";
import { addExperience, commitGoal, commitTitle } from "../advancement.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

export default class ImagineLevelUp extends HandlebarsApplicationMixin(ApplicationV2) {

	static DEFAULT_OPTIONS = {
		id: "imagine-level-up",
		tag: "form",
		classes: ["imagine", "themed", "theme-light", "level-up"],
		window: { title: "Imagine RPG — Level Up", resizable: true },
		// Set per character in _prepareContext's sibling below, so two open windows are told apart.
		position: { width: 640, height: 720 },
		form: { handler: ImagineLevelUp.#onSubmit, submitOnChange: false, closeOnSubmit: false },
		actions: {
			addExp:        ImagineLevelUp.#onAddExp,
			rollAttribute: ImagineLevelUp.#onRollAttribute,
			spendPoints:   ImagineLevelUp.#onSpendPoints,
			undoSpend:     ImagineLevelUp.#onUndoSpend,
			commitGoal:    ImagineLevelUp.#onCommitGoal,
			rollEndurance: ImagineLevelUp.#onRollEndurance,
			commitTitle:   ImagineLevelUp.#onCommitTitle,
			setSpecial:    ImagineLevelUp.#onSetSpecial
		}
	};

	static PARTS = {
		body: { template: "systems/imagine-rpg/templates/apps/level-up.hbs", scrollable: [".level-up-body"] }
	};

	#actor = null;
	// This step's work in progress: the rolls made, the attribute picked where his rules let the
	// player pick, the skill points placed, and the Endurance rolled. Nothing here is written to
	// the character until Commit, so a window closed early loses the rolls and the character is
	// exactly as they were -- see the note on atomic steps in module/advancement.mjs.
	#working = newLevelUpWorking();

	// The window belongs to one character, so its id carries that character's. A fixed id would
	// mean opening a second character's level-up re-used -- or stole -- the first one's window,
	// which is how ApplicationV2 keeps track of what is open.
	constructor(tmpactor, tmpoptions = {}) {
		super({ ...tmpoptions, id: `imagine-level-up-${tmpactor?.id ?? "unknown"}` });
		this.#actor = tmpactor;
	}

	// @MARKER DICE
	// Through Foundry's own random source, so the world's dice settings apply here too.
	static #die(tmpsides) {
		return Math.ceil(CONFIG.Dice.randomUniform() * tmpsides) || 1;
	}

	// The title bar names the character, since more than one may be levelling at once.
	get title() {
		return `Imagine RPG — Level Up: ${this.#actor?.name ?? ""}`;
	}

	// @MARKER WHAT THE WINDOW SHOWS
	// Everything shown is worked out by buildLevelUpView (module/levelup-view.mjs), which needs
	// no Foundry -- so the preview renders this same template against the same view, and the two
	// cannot drift apart.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.actor = this.#actor;
		tmpcontext.system = this.#actor.system;
		Object.assign(tmpcontext, buildLevelUpView(this.#actor, this.#working, game.user.isGM));
		return tmpcontext;
	}

	// @MARKER FORM
	static async #onSubmit(event, form, formData) {
		return; // the form's fields are read by the actions that need them
	}

	#field(tmpname) {
		return this.element?.querySelector(`[name="${tmpname}"]`)?.value ?? "";
	}

	// @MARKER EXPERIENCE
	static async #onAddExp(event, target) {
		event.preventDefault();
		var tmpamount = parseInt(this.#field("addExp")) || 0;
		await addExperience(this.#actor, tmpamount);
		this.#reset();
		this.render();
	}

	// @MARKER GOAL
	static async #onRollAttribute(event, target) {
		event.preventDefault();
		var tmpplan = buildGoalStep(this.#actor, this.#working).goalPlan;

		// An "any attribute" offer needs a pick before it is worth rolling: his sheet will not
		// commit an increase with no attribute named, and rolling first would waste the roll.
		this.#working.picked = tmpplan.rolls.map((tmproll, tmpindex) =>
			tmproll.anyAttribute ? (this.#field(`pick${tmpindex}`) || "") : tmproll.key);
		if (tmpplan.rolls.some((tmproll, tmpindex) => tmproll.anyAttribute && !this.#working.picked[tmpindex])) {
			ui.notifications.warn("Choose which attribute to raise first.");
			return;
		}

		// A guaranteed pick is chance 100 and needs no die; everything else is a d100.
		var tmpnaturals = [];
		for (const tmproll of tmpplan.rolls) {
			tmpnaturals.push(tmproll.chance >= 100 ? 1 : ImagineLevelUp.#die(100));
		}
		this.#working.rolls = resolveGoalAdvance(tmpplan, tmpnaturals, this.#working.picked);

		var tmplines = this.#working.rolls.map(tmpresult =>
			`<div>${ATTRIBUTE_LABELS[tmpresult.key] ?? tmpresult.key}: rolled ${tmpresult.roll} `
			+ `against ${tmpresult.chance}% &mdash; <strong>${tmpresult.increased ? "+1" : "no increase"}</strong></div>`);
		await ChatMessage.create({
			content: `<h3>${this.#actor.name} reaches goal ${this.#actor.system.identity.goalToLevel}</h3>${tmplines.join("")}`,
			speaker: ChatMessage.getSpeaker({ actor: this.#actor })
		});
		this.render();
	}

	static async #onSpendPoints(event, target) {
		event.preventDefault();
		var tmpstep = buildGoalStep(this.#actor, this.#working);
		var tmpid = this.#field("spendSkill");
		var tmppoints = parseInt(this.#field("spendPoints")) || 0;
		var tmpitem = this.#actor.items.get(tmpid);

		var tmpcheck = checkSkillPointSpend(tmppoints, tmpstep.skillPoints.remaining,
			tmpitem ? { name: tmpitem.name, acquiredAtTitle: tmpitem.system.acquiredAtTitle } : null,
			this.#actor.system.identity.title);
		if (!tmpcheck.allowed) { ui.notifications.warn(tmpcheck.reason); return; }

		this.#working.spends.push({ itemId: tmpid, name: tmpitem.name, points: tmppoints });
		this.render();
	}

	static async #onUndoSpend(event, target) {
		event.preventDefault();
		this.#working.spends.splice(parseInt(target.dataset.index), 1);
		this.render();
	}

	static async #onCommitGoal(event, target) {
		event.preventDefault();
		if (!buildGoalStep(this.#actor, this.#working).canCommit) {
			ui.notifications.warn("Roll for the attribute and place every skill point first.");
			return;
		}
		await commitGoal(this.#actor, this.#working.rolls, this.#working.spends);
		this.#reset();
		this.render();
	}

	// @MARKER TITLE
	static async #onRollEndurance(event, target) {
		event.preventDefault();
		var tmpstep = buildTitleStep(this.#actor, this.#working).titleStep;
		this.#working.endurance = getTitleEndurance(tmpstep.enduranceFormula, tmpstep.title, ImagineLevelUp.#die);
		await ChatMessage.create({
			content: `<h3>${this.#actor.name} reaches title ${tmpstep.title}</h3>`
				+ `<div>Endurance (${tmpstep.enduranceFormula || "no formula"}): `
				+ `<strong>+${this.#working.endurance}</strong></div>`,
			speaker: ChatMessage.getSpeaker({ actor: this.#actor })
		});
		this.render();
	}

	static async #onCommitTitle(event, target) {
		event.preventDefault();
		if (this.#working.endurance === null) {
			ui.notifications.warn("Roll the title's Endurance first.");
			return;
		}
		await commitTitle(this.#actor, this.#working.endurance);
		this.#reset();
		this.render();
	}

	// @MARKER ARCH MORTAL
	// The one qualification nothing can derive: the class's special requirement, a sentence only
	// a Game Master can judge. Theirs to set, so only they may press it.
	static async #onSetSpecial(event, target) {
		event.preventDefault();
		if (!game.user.isGM) { ui.notifications.warn("Only a Game Master may judge that requirement."); return; }
		await this.#actor.update({
			"system.identity.archSpecialMet": !this.#actor.system.identity.archSpecialMet
		});
		this.render();
	}

	// Clears this step's working state once it has been committed, or once the step changes.
	#reset() {
		this.#working = newLevelUpWorking();
	}
}

// @MARKER ADD NEW level up functions HERE
// @END (CODE)
