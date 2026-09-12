// @START (CODE)
// @MARKER ITEM SHEETS
//==================================================================================================================
// Sheets for the creature's own item types: an attack, a power, and a trait.
//
// A creature attack is the one that really needs a sheet of its own. It carries up to three
// rider effects of seven fields each, and the default sheet renders that as a raw list nobody
// can author against. Powers and traits are simpler but get sheets too, so a Game Master
// editing one sees labelled fields rather than a schema dump.
//
// Built the same way as the actor sheets: ApplicationV2 with the Handlebars mixin, one PART per
// region with a single root element, and interactions declared with data-action rather than
// bound by hand. Three small subclasses share one base, each naming its own body template --
// explicit rather than clever, so it is obvious which template belongs to which type.
//
// The other item types (skill, race, class, weapon, armour, equipment) still use Foundry's
// default sheet. They are read-mostly compendium content, so they can wait.
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

// @MARKER ADD NEW item sheet classes HERE
// @END (CODE)
