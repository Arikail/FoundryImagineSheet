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

import { applySheetTheme } from "../sheet-theme.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;

// The twelve attributes in the Player's Guide's order -- physical, mental, personal, mystical.
// Mirrors the grouping in actor-character-sheet.mjs's #buildAttributeRows and the declaration
// order in IMAGINE.attributes (imagine-rpg.mjs), kept as its own copy here because that method is
// a private static on the character sheet and the config object is not yet built when this module
// loads. A race or class sheet's attribute grid must read in this order, not alphabetically, or it
// stops lining up with the attribute tab and with every other attribute display in the system.
const ATTRIBUTE_KEYS = ["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"];
const { ItemSheetV2 } = foundry.applications.sheets;

// The nineteen coverage locations in item-armor.mjs's own declared order -- not alphabetical --
// paired left/right where the body pairs them. Two singles lead (head, neck), three torso thirds
// sit in the middle, then six left/right pairs: shoulder, arm, forearm, hand, thigh, shin, foot.
const ARMOR_COVERAGE_ROWS = [
	{ label: "Head", key: "head" },
	{ label: "Neck", key: "neck" },
	{ leftLabel: "Shoulder L", leftKey: "shoulderLeft", rightLabel: "Shoulder R", rightKey: "shoulderRight" },
	{ label: "Torso, upper", key: "torsoUpper" },
	{ label: "Torso, mid", key: "torsoMid" },
	{ label: "Torso, lower", key: "torsoLower" },
	{ leftLabel: "Arm L", leftKey: "armLeft", rightLabel: "Arm R", rightKey: "armRight" },
	{ leftLabel: "Forearm L", leftKey: "forearmLeft", rightLabel: "Forearm R", rightKey: "forearmRight" },
	{ leftLabel: "Hand L", leftKey: "handLeft", rightLabel: "Hand R", rightKey: "handRight" },
	{ leftLabel: "Thigh L", leftKey: "thighLeft", rightLabel: "Thigh R", rightKey: "thighRight" },
	{ leftLabel: "Shin L", leftKey: "shinLeft", rightLabel: "Shin R", rightKey: "shinRight" },
	{ leftLabel: "Foot L", leftKey: "footLeft", rightLabel: "Foot R", rightKey: "footRight" }
];

// A flat key -> label lookup, derived from the rows above rather than typed a second time, so
// coverageFromMaterial -- which names locations instead of carrying values -- can show a label a
// player recognises rather than a raw schema key.
const ARMOR_LOCATION_LABELS = Object.fromEntries(ARMOR_COVERAGE_ROWS.flatMap((tmprow) =>
	tmprow.key
		? [[tmprow.key, tmprow.label]]
		: [[tmprow.leftKey, tmprow.leftLabel], [tmprow.rightKey, tmprow.rightLabel]]
));


// @MARKER BASE ITEM SHEET

// Where a carried thing can be. Equipped and carried weigh against the character; on a mount or
// in a stash do not. One list, so the three sheets that offer it cannot drift apart.
const CARRIED_LOCATIONS = ["equipped", "carried", "mount", "stash"];


export class ImagineItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {

	// @MARKER SHEET THEME
	// Painted at render rather than declared in DEFAULT_OPTIONS.classes, so a window already open
	// when the Game Master changes the theme repaints on its next render instead of having to be
	// closed and reopened. See module/sheet-theme.mjs.
	_onRender(context, options) {
		super._onRender?.(context, options);
		applySheetTheme(this.element);
	}


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

		// @MARKER UNATTRIBUTED CONTENT
		// "XXX" is the mark the content build leaves on anything his Master Index does not list,
		// so an entry nobody has traced to a book is a thing you can search for rather than a
		// blank box indistinguishable from one that simply has not been filled in yet. The
		// header shows it in red. Worked out here because the Handlebars environment Foundry
		// provides has no equality helper to rely on -- the same reason the creature sheet
		// counts its effect rows in code rather than in the template.
		tmpcontext.sourceUnknown = (tmpcontext.system?.sourcebook == "XXX");
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
		body:   { template: "systems/imagine-rpg/templates/item/item-creature-attack.hbs", scrollable: [""] }
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
		body:   { template: "systems/imagine-rpg/templates/item/item-power.hbs", scrollable: [""] }
	};

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.config = {
			powerKinds: ["unknown", "spell", "invocation", "magicItem", "divineItem"]
		};
		return tmpcontext;
	}
}


// @MARKER EQUIPMENT, WEAPON AND SKILL SHEETS
// These three went without a sheet of their own on purpose: broad but flat, read far more often
// than written, and everything anyone needed was already on the character's own tabs. The trigger
// named at the time for revisiting was hand-authored content landing in src/packs/manual/.
//
// It has now fired twice -- a crowbar authored there, and the Equipment tab's Add buttons, which
// create gear on a character and open its sheet at once. A new item that opens on a sheet with no
// weight field is no use, so all three have one now.

export class ImagineEquipmentSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "equipment"],
		position: { width: 560, height: 520 }
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-equipment.hbs", scrollable: [""] }
	};

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.config = { locations: CARRIED_LOCATIONS };
		return tmpcontext;
	}
}


export class ImagineWeaponSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "weapon"],
		position: { width: 620, height: 680 }
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-weapon.hbs", scrollable: [""] }
	};

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		// The four attack modes as rows, each carrying its own two values, so the template holds
		// no list of field names. A mode switched off cannot be used AT ALL, which is not the same
		// as a modifier of zero -- his source writes "Non" for one and 0 for the other.
		var tmpsystem = this.document.system;
		tmpcontext.config = {
			locations: CARRIED_LOCATIONS,
			hands: ["right", "left", "both"],
			modes: [
				{ key: "missile", label: "Missile" },
				{ key: "thrust",  label: "Thrust" },
				{ key: "cut",     label: "Cut" },
				{ key: "smash",   label: "Smash" }
			].map(tmpmode => ({
				...tmpmode,
				available: !!tmpsystem[tmpmode.key]?.available,
				mod: parseInt(tmpsystem[tmpmode.key]?.mod) || 0
			}))
		};
		return tmpcontext;
	}
}


export class ImagineSkillSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "skill"],
		position: { width: 600, height: 620 }
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-skill.hbs", scrollable: [""] }
	};

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		tmpcontext.config = { categories: ["class", "racial", "social"] };
		// The types as one comma list, since that is how a person reads and writes them. The
		// schema keeps an array, so it is split again on save -- see _processFormData below.
		tmpcontext.typesText = (this.document.system.types ?? []).join(", ");
		return tmpcontext;
	}

	// A skill's types are an ARRAY in the schema and a comma list on the sheet, so what the form
	// hands back has to be split before it reaches the document, or the field fails validation.
	//
	// _processFormData returns an EXPANDED object -- system.types, not "system.types" -- which is
	// documented on ApplicationV2 and is easy to get wrong: a flat key would simply never match,
	// and the split would silently never happen.
	_processFormData(event, form, formData) {
		var tmpdata = super._processFormData(event, form, formData);
		if (typeof tmpdata?.system?.types == "string") {
			tmpdata.system.types = tmpdata.system.types
				.split(",").map(tmptype => tmptype.trim()).filter(tmptype => tmptype);
		}
		return tmpdata;
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
		body:   { template: "systems/imagine-rpg/templates/item/item-trait.hbs", scrollable: [""] }
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
		body:   { template: "systems/imagine-rpg/templates/item/item-class.hbs", scrollable: [""] }
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

// @MARKER ARMOUR SHEET

export class ImagineArmorSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "armor"],
		position: { width: 640, height: 760 }
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-armor.hbs", scrollable: [""] }
	};

	// This is the function which lays the nineteen coverage locations out as rows -- one input for
	// a single location, two side by side for a left/right pair -- and turns coverageFromMaterial's
	// raw location keys into labels a player recognises.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		var tmpsystem = this.document.system;

		// Mirrors the choices already declared on the fields in item-armor.mjs, the same way
		// ImaginePowerSheet and ImagineTraitSheet mirror theirs -- the sheet needs its own copy to
		// build the dropdown, but the field is what actually enforces it.
		tmpcontext.config = {
			flexibility: ["Clothing", "Flexible", "Semi-Flexible", "Rigid",
			              "Rigid/Flexible", "Rigid/Semi-Flexible", "Rigid/Rigid", "Mixed"],
			location: ["equipped", "carried", "mount", "stash"]
		};

		tmpcontext.coverageRows = ARMOR_COVERAGE_ROWS.map((tmprow) => tmprow.key
			? { single: true, label: tmprow.label, key: tmprow.key, value: tmpsystem.coverage[tmprow.key] }
			: { single: false,
			    leftLabel: tmprow.leftLabel, leftKey: tmprow.leftKey, leftValue: tmpsystem.coverage[tmprow.leftKey],
			    rightLabel: tmprow.rightLabel, rightKey: tmprow.rightKey, rightValue: tmpsystem.coverage[tmprow.rightKey] });

		// The giant-material rule that resolves these into real values (getArmorGiantArmorValue in
		// his sheet) is not implemented yet, so this is read-only display rather than an editable
		// list -- the location names are the only thing there is to show.
		tmpcontext.coverageFromMaterialLabels =
			(tmpsystem.coverageFromMaterial ?? []).map((tmpkey) => ARMOR_LOCATION_LABELS[tmpkey] ?? tmpkey);

		return tmpcontext;
	}
}

// @MARKER RACE SHEET

export class ImagineRaceSheet extends ImagineItemSheet {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "item", "race"],
		position: { width: 640, height: 760 }
	};

	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/item/item-header.hbs" },
		body:   { template: "systems/imagine-rpg/templates/item/item-race.hbs", scrollable: [""] }
	};

	// This is the function which stacks the two 12-wide attribute rows under one shared header, in
	// the Player's Guide's order rather than alphabetically. attributeLimits is the field
	// getAttributeMax reads -- load-bearing, not decorative -- so mods and limits are kept as
	// separate rows with their own group name rather than one merged table a template could
	// confuse, since they are both twelve plain numbers and mixing them up silently changes a
	// character's ceiling.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		var tmpsystem = this.document.system;

		tmpcontext.attributeKeys = ATTRIBUTE_KEYS;
		tmpcontext.attributeRows = [
			{
				group: "attributeMods", label: "Mods",
				cells: ATTRIBUTE_KEYS.map((tmpkey) => ({ key: tmpkey, value: tmpsystem.attributeMods[tmpkey] }))
			},
			{
				group: "attributeLimits", label: "Limits",
				cells: ATTRIBUTE_KEYS.map((tmpkey) => ({ key: tmpkey, value: tmpsystem.attributeLimits[tmpkey] }))
			}
		];

		return tmpcontext;
	}
}

// @MARKER ADD NEW item sheet classes HERE
// @END (CODE)
