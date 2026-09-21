// @START (CODE)
// @MARKER CHARACTER GENERATOR WINDOW
//==================================================================================================================
// The window that walks a player through making a character, step by step, and creates it.
//
// It holds the choices and nothing else. What each step shows is worked out by
// buildGeneratorView (module/chargen-view.mjs), the rules by module/chargen-rules.mjs, and the
// character itself is assembled by assembleCharacter -- all three without Foundry, so all three
// are tested and previewed outside it. This file is only the Foundry face: reading the form,
// rolling the dice, loading the compendiums and creating the actor.
//
// Open it from the Create Character button in the Actors directory, or from a macro:
//     game.imagine.generateCharacter()
//==================================================================================================================

import { explainAvailability } from "../availability.mjs";
import { rollAttributeSets, rollHandedness, rollStartingAge, assembleCharacter, ATTRIBUTE_ORDER } from "../chargen-rules.mjs";
import { rollPhysique } from "../physique-rules.mjs";
import { STEPS, newGeneratorState, deriveGenerator, checkStep, buildGeneratorView, choicesFromState,
	colourChoices } from "../chargen-view.mjs";
import { applySheetTheme } from "../sheet-theme.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

// The compendiums the generator draws from, as the content importer names them.
// The kit rules name items by the same names the equipment, armour and weapon packs carry, so
// those three are loaded as well -- without them the optional starting-kit rules would create
// every item by name only.
const CHARGEN_PACKS = { races: "world.imagine-races", classes: "world.imagine-classes", skills: "world.imagine-skills",
	equipment: "world.imagine-equipment", armor: "world.imagine-armor", weapons: "world.imagine-weapons" };

export default class ImagineCharacterGenerator extends HandlebarsApplicationMixin(ApplicationV2) {

	static DEFAULT_OPTIONS = {
		id: "imagine-character-generator",
		tag: "form",
		classes: ["imagine", "character-generator"],
		window: { title: "Imagine RPG — New Character", resizable: true },
		position: { width: 760, height: 760 },
		// Enter in a text field submits the form; that only records the choices and redraws.
		form: { handler: ImagineCharacterGenerator.#onSubmit, submitOnChange: false, closeOnSubmit: false },
		actions: {
			nextStep:        ImagineCharacterGenerator.#onNextStep,
			previousStep:    ImagineCharacterGenerator.#onPreviousStep,
			goToStep:        ImagineCharacterGenerator.#onGoToStep,
			rollAttributes:  ImagineCharacterGenerator.#onRollAttributes,
			addSwap:         ImagineCharacterGenerator.#onAddSwap,
			removeSwap:      ImagineCharacterGenerator.#onRemoveSwap,
			rollHandedness:  ImagineCharacterGenerator.#onRollHandedness,
			rollAge:         ImagineCharacterGenerator.#onRollAge,
			rollPhysique:    ImagineCharacterGenerator.#onRollPhysique,
			rollColours:     ImagineCharacterGenerator.#onRollColours,
			createCharacter: ImagineCharacterGenerator.#onCreateCharacter
		}
	};

	static PARTS = {
		body: { template: "systems/imagine-rpg/templates/apps/character-generator.hbs", scrollable: [".chargen-body"] }
	};

	#state = newGeneratorState();
	#content = null;

	// @MARKER DICE
	// This is the function which rolls one die, through Foundry's own random source so any dice
	// settings the world uses apply here as well.
	static #die(tmpsides) {
		return Math.ceil(CONFIG.Dice.randomUniform() * tmpsides) || 1;
	}

	// @MARKER CONTENT
	// This is the function which loads the races, classes and skills once, as plain data. A pack
	// that is missing -- content never imported -- loads as empty, and the window says so.
	async #loadContent() {
		if (this.#content) { return this.#content; }
		var tmpcontent = { races: [], classes: [], skills: [], equipment: [], armor: [], weapons: [] };
		for (const [tmpkey, tmpid] of Object.entries(CHARGEN_PACKS)) {
			var tmppack = game.packs.get(tmpid);
			if (!tmppack) { continue; }
			tmpcontent[tmpkey] = (await tmppack.getDocuments()).map(tmpdoc => tmpdoc.toObject());
		}
		this.#content = tmpcontent;
		return tmpcontent;
	}

	// This is the function which says whether the campaign's content switches allow an item.
	static #isAvailable(tmpdoc) {
		return explainAvailability(tmpdoc, game.imagine.getAvailabilityRules()).available;
	}

	// @MARKER FORM
	// This is the function which copies what is on screen into the choices. Only the current
	// step's inputs exist, so only its choices change.
	#captureForm() {
		if (!this.element) { return; }
		var tmpdata = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(this.element).object);
		var tmpstate = this.#state;
		var tmplist = (tmpvalue) => Object.values(tmpvalue ?? {});

		for (const tmpkey of ["name", "gender", "charType", "race1", "race2", "className", "chosenAttackSkill",
		                      "handedness", "frame", "hair", "eyes", "skin", "alignment"]) {
			if (tmpkey in tmpdata) { tmpstate[tmpkey] = tmpdata[tmpkey] ?? ""; }
		}
		for (const tmpkey of ["age", "heightFeet", "heightInches", "weight"]) {
			if (tmpkey in tmpdata) { tmpstate[tmpkey] = Number(tmpdata[tmpkey]) || 0; }
		}
		for (const tmpkey of ["slightPhysique", "manual", "override"]) {
			if (tmpkey in tmpdata) { tmpstate[tmpkey] = tmpdata[tmpkey] === true; }
		}
		if ("clothingStyle" in tmpdata) { tmpstate.clothingStyle = tmpdata.clothingStyle ?? "western"; }
		if ("startingKit" in tmpdata) {
			for (const tmpkey of ["byCulture", "byStatus", "bySkills"]) {
				if (tmpkey in tmpdata.startingKit) {
					tmpstate.startingKit[tmpkey] = tmpdata.startingKit[tmpkey] === true;
				}
			}
		}
		if ("manualBase" in tmpdata) { tmpstate.manualBase = tmpdata.manualBase; }
		if ("swaps" in tmpdata) {
			tmpstate.swaps = tmplist(tmpdata.swaps).map(tmpswap => ({ to: tmpswap.to ?? "", from: tmplist(tmpswap.from) }));
		}
		if ("humanBonuses" in tmpdata) { tmpstate.humanBonuses = tmplist(tmpdata.humanBonuses); }
		if ("humanMoves" in tmpdata) { tmpstate.humanMoves = tmplist(tmpdata.humanMoves); }
		if ("languages" in tmpdata) {
			tmpstate.languages = tmplist(tmpdata.languages).map(tmplang => ({ name: tmplang.name ?? "", write: tmplang.write === true }));
		}
		if ("wealth" in tmpdata) { tmpstate.wealth = { ...tmpstate.wealth, ...tmpdata.wealth }; }

		// The two skill pick lists are many checkboxes sharing one name, which the form data object
		// would fold into one value, so they are read straight off the page.
		if (tmpstate.step == STEPS.indexOf("Skills")) {
			tmpstate.racialSkillNames = [...this.element.querySelectorAll("input[name='racialPick']:checked")].map(tmpbox => tmpbox.value);
			tmpstate.socialSkillNames = [...this.element.querySelectorAll("input[name='socialPick']:checked")].map(tmpbox => tmpbox.value);
		}
		// A new first race can leave the second one no longer a fertile partner.
		if (tmpstate.race2) {
			var tmpfirst = (this.#content?.races ?? []).find(tmpdoc => tmpdoc.name == tmpstate.race1);
			if (!(tmpfirst?.system?.fertileWith ?? []).includes(tmpstate.race2)) { tmpstate.race2 = ""; }
		}
	}

	// @MARKER RENDERING
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		var tmpcontent = await this.#loadContent();

		// @MARKER HANDEDNESS
		// Rolled as soon as a race is known, unless the Game Master has ticked the setting -- his
		// determineHandedness fires the moment a race is applied, so waiting for the player to
		// reach the Details step and press a button would be a choice about WHEN, which is still
		// a choice. Guarded on being blank so it rolls once and then stands: this runs on every
		// render, and a re-roll on each keystroke would be a slot machine.
		// The setting is read here rather than inside chargen-view.mjs on purpose. That module and
		// chargen-rules.mjs are pure and Foundry-free, which is what lets tools/chargen-test.html
		// import and drive them with no Foundry present; reaching for game.settings there would
		// end that.
		tmpcontext.handednessSelectable = game.settings.get("imagine-rpg", "handednessSelectable");
		if (!tmpcontext.handednessSelectable && !this.#state.handedness) {
			var tmpderived = deriveGenerator(this.#state, tmpcontent, ImagineCharacterGenerator.#isAvailable);
			if (tmpderived.race) {
				this.#state.handedness = rollHandedness(tmpderived.race.abilities ?? [],
					ImagineCharacterGenerator.#die);
			}
		}

		Object.assign(tmpcontext, buildGeneratorView(this.#state, tmpcontent, ImagineCharacterGenerator.#isAvailable));
		tmpcontext.noContent = !tmpcontent.races.length;
		return tmpcontext;
	}

	// Selects, checkboxes and numbers redraw the step as soon as they change, so everything that
	// follows from them -- the combined race, the final attributes, the class check, the slot
	// counts -- is always current. Text fields are read when a button is pressed instead, so typing
	// is never interrupted by a redraw.
	_onRender(context, options) {
		super._onRender?.(context, options);
		applySheetTheme(this.element);
		if (context.noContent) {
			ui.notifications.warn("No Imagine content found. The Game Master needs to import it first: game.imagine.importContent()");
		}
		for (const tmpinput of this.element.querySelectorAll("select, input[type='checkbox'], input[type='number']")) {
			tmpinput.addEventListener("change", () => { this.#captureForm(); this.render(); });
		}
	}

	// @MARKER ACTION HANDLERS

	static #onSubmit(event, form, formData) {
		this.#captureForm();
		this.render();
	}

	// This is the function which moves on a step, if the current one is finished.
	static #onNextStep(event, target) {
		this.#captureForm();
		var tmpblocker = checkStep(this.#state, deriveGenerator(this.#state, this.#content, ImagineCharacterGenerator.#isAvailable));
		if (tmpblocker) { ui.notifications.warn(tmpblocker); this.render(); return; }
		this.#state.step = Math.min(this.#state.step + 1, STEPS.length - 1);
		this.render();
	}

	static #onPreviousStep(event, target) {
		this.#captureForm();
		this.#state.step = Math.max(this.#state.step - 1, 0);
		this.render();
	}

	// This is the function which jumps back to a finished step from the step list.
	static #onGoToStep(event, target) {
		this.#captureForm();
		var tmpstep = parseInt(target.dataset.step);
		if (!isNaN(tmpstep) && tmpstep <= this.#state.step) { this.#state.step = tmpstep; }
		this.render();
	}

	// This is the function which rolls the attributes for the chosen character type, and puts
	// the rolls in the chat, as his sheet's rolling buttons do.
	static async #onRollAttributes(event, target) {
		this.#captureForm();
		this.#state.rolled = rollAttributeSets(this.#state.charType, ImagineCharacterGenerator.#die);
		this.#state.manual = false;
		var tmplines = this.#state.rolled.sets.map((tmpset, tmpindex) =>
			`<p>Set ${tmpindex + 1}: ` + ATTRIBUTE_ORDER.map(tmpkey => `${tmpkey.toUpperCase()} ${tmpset[tmpkey]}`).join(", ") + "</p>");
		await ChatMessage.create({ content: `<h3>${this.#state.name || "A new character"} rolls attributes</h3>${tmplines.join("")}`,
			speaker: ChatMessage.getSpeaker() });
		this.render();
	}

	static #onAddSwap(event, target) {
		this.#captureForm();
		this.#state.swaps.push({ to: "", from: [] });
		this.render();
	}

	static #onRemoveSwap(event, target) {
		this.#captureForm();
		this.#state.swaps.splice(parseInt(target.dataset.index), 1);
		this.render();
	}

	static #onRollHandedness(event, target) {
		this.#captureForm();
		var tmpderived = deriveGenerator(this.#state, this.#content, ImagineCharacterGenerator.#isAvailable);
		this.#state.handedness = rollHandedness(tmpderived.race?.abilities ?? [], ImagineCharacterGenerator.#die);
		this.render();
	}

	static #onRollAge(event, target) {
		this.#captureForm();
		var tmpderived = deriveGenerator(this.#state, this.#content, ImagineCharacterGenerator.#isAvailable);
		this.#state.age = rollStartingAge(tmpderived.race?.ages, ImagineCharacterGenerator.#die);
		this.render();
	}

	// This is the function which creates the character. Its skills' starting bonuses are rolled
	// here, once, as his sheet rolls them when the skills are confirmed.
	// This is the function which rolls height, frame and weight together, his Apply Height/Frame
	// button (roll_apply_height_frame). They go together because his tables make them depend on
	// one another -- see the note at the top of module/physique-rules.mjs -- and because rolling
	// them one at a time would let a player re-roll a height until the weight suited them.
	//
	// It uses the character's FINAL attributes, race included, since the frame is read off
	// Strength less Agility and a racial modifier moves both.
	// @MARKER COLOURING
	// This is the function which picks hair, eyes and skin from the colours his tables say a member
	// of this race is found in -- the same lists the dropdowns offer, so rolling can never produce
	// a colour that could not have been chosen. Asked for on 2026-09-20: the fields were pick-only.
	//
	// Only fills what is still empty, so a player who has chosen a hair colour and wants the rest
	// decided for them does not lose it. Nothing is re-rolled; pressing it again fills any gaps and
	// leaves the rest alone, which is the same restraint the handedness roll shows for the same
	// reason.
	static async #onRollColours(event, target) {
		event.preventDefault();
		this.#captureForm();
		var tmpderived = deriveGenerator(this.#state, this.#content, ImagineCharacterGenerator.#isAvailable);
		var tmpraces = [tmpderived.race1, tmpderived.race2].filter(tmpdoc => tmpdoc);

		var tmpfilled = [];
		for (const tmpwhich of ["hair", "eyes", "skin"]) {
			if (this.#state[tmpwhich]) { continue; }
			var tmpoptions = colourChoices(tmpraces, tmpwhich, "").map(tmpoption => tmpoption.value);
			if (!tmpoptions.length) { continue; }
			this.#state[tmpwhich] = tmpoptions[ImagineCharacterGenerator.#die(tmpoptions.length) - 1];
			tmpfilled.push(`${tmpwhich} ${this.#state[tmpwhich]}`);
		}
		if (!tmpfilled.length) {
			ui.notifications.info("Nothing left to roll -- clear a colour to have it decided for you.");
		}
		this.render();
	}

	static async #onRollPhysique(event, target) {
		event.preventDefault();
		this.#captureForm();
		var tmpderived = deriveGenerator(this.#state, this.#content, ImagineCharacterGenerator.#isAvailable);
		var tmpfinals = tmpderived.finals ?? {};
		// The race names come from the DERIVED object, not from the choices. The choices hold
		// `race1` and `race2`; `raceNames` is what deriveGenerator builds out of them, dropping a
		// blank second race. Reading it off #state gave undefined, so rollPhysique was asked for
		// the physique of a character with no race at all -- it found no height table, returned no
		// height, and with no height there is no weight either. That is Daryl's "Rolling Age works.
		// Rolling Height does not" on 2026-09-20: age is rolled from the race's own ages object and
		// was never affected.
		var tmprolled = rollPhysique(tmpderived.raceNames ?? [],
			tmpfinals.str?.final ?? 0, tmpfinals.agl?.final ?? 0, ImagineCharacterGenerator.#die);

		if (tmprolled.height) {
			this.#state.heightFeet = tmprolled.height.feet;
			this.#state.heightInches = tmprolled.height.inchesPart;
		}
		if (tmprolled.frame) { this.#state.frame = tmprolled.frame; }
		if (tmprolled.weight) { this.#state.weight = tmprolled.weight.weight; }
		this.#state.physiqueIssues = tmprolled.issues;
		// The one-line account shown under the fields, so the roll is not only in chat.
		this.#state.physiqueSummary = [
			tmprolled.height ? `${tmprolled.height.type} build: ${tmprolled.height.low.feet}'${tmprolled.height.low.inches}" to ${tmprolled.height.high.feet}'${tmprolled.height.high.inches}"` : "",
			tmprolled.frame ? `${tmprolled.frame} frame (${tmprolled.frameType}, STR less AGL ${tmprolled.frameMeasure})` : "",
			tmprolled.weight ? `that frame at that height runs ${tmprolled.weight.low} to ${tmprolled.weight.high} lb` : ""
		].filter(tmppart => tmppart).join(" &mdash; ");

		var tmplines = [];
		if (tmprolled.height) {
			tmplines.push(`<div>Height: <strong>${tmprolled.height.feet}' ${tmprolled.height.inchesPart}"</strong>`
				+ ` &mdash; a ${tmprolled.height.type} race runs ${tmprolled.height.low.feet}'`
				+ ` ${tmprolled.height.low.inches}" to ${tmprolled.height.high.feet}' ${tmprolled.height.high.inches}"</div>`);
		}
		if (tmprolled.frame) {
			tmplines.push(`<div>Frame: <strong>${tmprolled.frame}</strong>`
				+ ` &mdash; a ${tmprolled.frameType} build, Strength less Agility ${tmprolled.frameMeasure}</div>`);
		}
		if (tmprolled.weight) {
			tmplines.push(`<div>Weight: <strong>${tmprolled.weight.weight} lb</strong>`
				+ ` &mdash; that frame at that height runs ${tmprolled.weight.low} to ${tmprolled.weight.high} lb</div>`);
		}
		for (const tmpissue of tmprolled.issues) { tmplines.push(`<div class="alarm">${tmpissue}</div>`); }

		await ChatMessage.create({
			content: `<h3>${this.#state.name || "A new character"} takes shape</h3>${tmplines.join("")}`,
			speaker: ChatMessage.getSpeaker()
		});
		this.render();
	}

	static async #onCreateCharacter(event, target) {
		this.#captureForm();
		var tmpderived = deriveGenerator(this.#state, this.#content, ImagineCharacterGenerator.#isAvailable);
		var tmpassembled = assembleCharacter(choicesFromState(this.#state, tmpderived), this.#content, ImagineCharacterGenerator.#die);
		try {
			var tmpactor = await Actor.create({ ...tmpassembled.actor, items: tmpassembled.items });
			ui.notifications.info(`${tmpactor.name} is created.`);
			this.close();
			tmpactor.sheet.render(true);
		} catch (err) {
			console.error("Imagine RPG | character creation failed", err);
			ui.notifications.error("The character could not be created. You may not have permission to create actors; ask the Game Master.");
		}
	}
}

// @MARKER DIRECTORY BUTTON
// This is the function which puts a Create Character button at the top of the Actors directory,
// for anyone allowed to create actors.
export function registerCharacterGeneratorButton() {
	Hooks.on("renderActorDirectory", (tmpapp, tmphtml) => {
		if (!game.user.can("ACTOR_CREATE")) { return; }
		var tmproot = (tmphtml instanceof HTMLElement) ? tmphtml : tmphtml[0];
		var tmpheader = tmproot?.querySelector(".header-actions");
		if (!tmpheader || tmpheader.querySelector(".imagine-chargen-button")) { return; }
		var tmpbutton = document.createElement("button");
		tmpbutton.type = "button";
		tmpbutton.className = "imagine-chargen-button";
		tmpbutton.innerHTML = `<i class="fa-solid fa-dice-d20"></i> Create Character`;
		tmpbutton.addEventListener("click", () => new ImagineCharacterGenerator().render(true));
		tmpheader.append(tmpbutton);
	});
}

// @END (CODE)
