// @START (CODE)
// @MARKER ITEM SHEETS
//==================================================================================================================
// Sheets for the creature's own item types (attack, power, trait) plus class, armour and race --
// the three of the six remaining item types that carry nested or variable-length structure the
// default sheet renders as an unusable dump. See docs/DECISIONS.md, "Three of the six remaining
// item sheets, not six": weapon, skill and equipment stay on Foundry's default sheet on purpose,
// because they are broad but flat and read far more often than written.
//
// A creature attack is the one that really needs a sheet of its own among the first three. It
// carries up to three rider effects of seven fields each, and the default sheet renders that as a
// raw list nobody can author against. Powers and traits are simpler but get sheets too, so a Game
// Master editing one sees labelled fields rather than a schema dump.
//
// Built the same way as the actor sheets: ApplicationV2 with the Handlebars mixin, one PART per
// region with a single root element, and interactions declared with data-action rather than
// bound by hand. Each subclass shares one base and names its own body template -- explicit rather
// than clever, so it is obvious which template belongs to which type.
//
// NOT VERIFIED against a running Foundry V14: no V14 install exists on this machine. The base
// class and registration follow the actor sheets exactly (ActorSheetV2 -> ItemSheetV2,
// Actors.registerSheet -> Items.registerSheet), which is the documented symmetry, but it has
// not been exercised. See docs/PROGRESS.md.
//==================================================================================================================

import {
	CREATURE_ATTACK_TYPES, CREATURE_DAMAGE_TYPES,
	EFFECT_TRIGGERS, EFFECT_DAMAGE_TYPES, EFFECT_DURATION_TYPES, MAX_ATTACK_EFFECTS
} from "../creature-tables.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

// The twelve attributes in the Player's Guide's order -- physical, mental, personal, mystical.
// Mirrors the grouping in actor-character-sheet.mjs's #buildAttributeRows and the declaration
// order in IMAGINE.attributes (imagine-rpg.mjs), kept as its own copy here because that method is
// a private static on the character sheet and the config object is not yet built when this module
// loads. A race or class sheet's attribute grid must read in this order, not alphabetically, or it
// stops lining up with the attribute tab and with every other attribute display in the system.
const ATTRIBUTE_KEYS = ["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"];
const { ItemSheetV2 } = foundry.applications.sheets;


// @MARKER BASE ITEM SHEET

export class ImagineItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item"],
		position: { width: 560, height: 520 },
		window: { resizable: true },
		form: { submitOnChange: true }
	};

	// This is the function which assembles what every item template renders against.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.item = this.document;
		tmpcontext.system = this.document.system;
		return tmpcontext;
	}
}


// @MARKER CREATURE ATTACK SHEET

export class ImagineCreatureAttackSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "creature-attack"],
		position: { width: 620, height: 640 },
		actions: {
			addEffect: ImagineCreatureAttackSheet.#onAddEffect,
			deleteEffect: ImagineCreatureAttackSheet.#onDeleteEffect
		}
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-creature-attack.hbs" }
	};

	// This is the function which adds the option lists the attack's dropdowns need, and numbers
	// the rider effects so a row can be written back to the right one.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);

		tmpcontext.config = {
			attackTypes: Object.keys(CREATURE_ATTACK_TYPES),
			damageTypes: CREATURE_DAMAGE_TYPES,
			effectTriggers: EFFECT_TRIGGERS,
			effectDamageTypes: EFFECT_DAMAGE_TYPES,
			effectDurationTypes: EFFECT_DURATION_TYPES
		};

		// index writes the row back to the right entry; number is only what the heading shows.
		// Counted here rather than in the template, which would need an arithmetic helper that
		// may or may not exist in the Handlebars environment Foundry provides.
		var tmpeffects = this.document.system.effects ?? [];
		tmpcontext.effects = tmpeffects.map((e, i) => ({ ...e, index: i, number: i + 1 }));
		tmpcontext.canAddEffect = tmpeffects.length < MAX_ATTACK_EFFECTS;
		tmpcontext.maxEffects = MAX_ATTACK_EFFECTS;

		return tmpcontext;
	}

	// This is the function which adds a blank rider effect.
	// Three is the ceiling, because three is what his encoded attack string carries.
	static async #onAddEffect(event, target) {
		var tmpeffects = [...(this.document.system.effects ?? [])];
		if (tmpeffects.length >= MAX_ATTACK_EFFECTS) {
			ui.notifications.warn(`An attack carries at most ${MAX_ATTACK_EFFECTS} effects.`);
			return;
		}
		tmpeffects.push({
			name: "", trigger: "If hit", description: "",
			damage: "", damageType: "", duration: "", durationType: ""
		});
		await this.document.update({ "system.effects": tmpeffects });
	}

	// This is the function which removes one rider effect.
	static async #onDeleteEffect(event, target) {
		var tmpindex = parseInt(target.dataset.index);
		var tmpeffects = [...(this.document.system.effects ?? [])];
		if (isNaN(tmpindex) || tmpindex < 0 || tmpindex >= tmpeffects.length) { return; }
		tmpeffects.splice(tmpindex, 1);
		await this.document.update({ "system.effects": tmpeffects });
	}
}


// @MARKER POWER SHEET

export class ImaginePowerSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "power"]
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-power.hbs" }
	};

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.config = {
			powerKinds: ["unknown", "spell", "invocation", "magicItem", "divineItem"]
		};
		return tmpcontext;
	}
}


// @MARKER TRAIT SHEET

export class ImagineTraitSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "trait"],
		position: { width: 560, height: 460 }
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-trait.hbs" }
	};

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.config = { categories: ["ability", "disability", "immunity"] };
		return tmpcontext;
	}
}

// @MARKER CLASS SHEET

export class ImagineClassSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "class"],
		position: { width: 640, height: 700 },
		actions: {
			addTitle: ImagineClassSheet.#onAddTitle,
			deleteTitle: ImagineClassSheet.#onDeleteTitle,
			addClassMod: ImagineClassSheet.#onAddClassMod,
			deleteClassMod: ImagineClassSheet.#onDeleteClassMod
		}
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-class.hbs" }
	};

	// This is the function which assembles the attribute-qualification grid and pairs each title
	// with its class skills, since those two arrays are meant to be read side by side but are
	// stored as two separate lists.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		var tmpsystem = this.document.system;

		tmpcontext.attribQualifyCells = ATTRIBUTE_KEYS.map((tmpkey, tmpindex) => ({
			key: tmpkey,
			index: tmpindex,
			value: tmpsystem.requirements.attribQualify[tmpindex] ?? 0
		}));

		// titles and classSkills are parallel arrays, not one structure, because his own
		// classtitledict carries no skill column at all -- see item-class.mjs. classSkills is
		// shorter than titles for every class except the hand-authored ones, so a missing entry
		// reads as "not yet filled in" rather than as an error.
		var tmptitles = tmpsystem.advancement.titles ?? [];
		var tmpskills = tmpsystem.advancement.classSkills ?? [];
		tmpcontext.titleRows = tmptitles.map((tmpname, tmpindex) => ({
			index: tmpindex,
			number: tmpindex + 1,
			name: tmpname,
			skills: tmpskills[tmpindex] ?? ""
		}));

		// classMods has no fixed width -- it runs from two entries to five across the 87 classes
		// extracted so far, and Monk's row is a column short of everyone else's
		// (UPSTREAM-ISSUES.md item 1). Rendered exactly as long as it is; nothing pads or caps it.
		var tmpmods = tmpsystem.classMods ?? [];
		tmpcontext.classModRows = tmpmods.map((tmpvalue, tmpindex) => ({ index: tmpindex, value: tmpvalue }));

		return tmpcontext;
	}

	// This is the function which adds a title. It pushes onto both parallel arrays together so
	// they cannot drift out of alignment.
	static async #onAddTitle() {
		var tmptitles = [...(this.document.system.advancement.titles ?? [])];
		var tmpskills = [...(this.document.system.advancement.classSkills ?? [])];
		tmptitles.push("");
		tmpskills.push("");
		await this.document.update({
			"system.advancement.titles": tmptitles,
			"system.advancement.classSkills": tmpskills
		});
	}

	// This is the function which removes one title, and its paired skill entry at the same index.
	static async #onDeleteTitle(event, target) {
		var tmpindex = parseInt(target.dataset.index);
		var tmptitles = [...(this.document.system.advancement.titles ?? [])];
		var tmpskills = [...(this.document.system.advancement.classSkills ?? [])];
		if (isNaN(tmpindex) || tmpindex < 0 || tmpindex >= tmptitles.length) { return; }
		tmptitles.splice(tmpindex, 1);
		tmpskills.splice(tmpindex, 1);
		await this.document.update({
			"system.advancement.titles": tmptitles,
			"system.advancement.classSkills": tmpskills
		});
	}

	// This is the function which adds a blank class modifier. No ceiling -- see classModRows above.
	static async #onAddClassMod() {
		var tmpmods = [...(this.document.system.classMods ?? [])];
		tmpmods.push("");
		await this.document.update({ "system.classMods": tmpmods });
	}

	// This is the function which removes one class modifier.
	static async #onDeleteClassMod(event, target) {
		var tmpindex = parseInt(target.dataset.index);
		var tmpmods = [...(this.document.system.classMods ?? [])];
		if (isNaN(tmpindex) || tmpindex < 0 || tmpindex >= tmpmods.length) { return; }
		tmpmods.splice(tmpindex, 1);
		await this.document.update({ "system.classMods": tmpmods });
	}
}

// @MARKER ADD NEW item sheet classes HERE
// @END (CODE)
