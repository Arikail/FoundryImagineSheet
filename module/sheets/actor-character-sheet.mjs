// @START (CODE)
// @MARKER CHARACTER SHEET
//==================================================================================================================
// The character sheet, built on ApplicationV2 with the Handlebars mixin.
//
// Every tab is its own PART with a single root element. That is not a style preference -- the
// framework's two-pass rendering relies on it to preserve focus and scroll position, and a
// shared container with swapped-in placeholders breaks both. On a sheet this field-dense,
// losing focus mid-edit every time a value recalculates would make it unusable.
//
// Interactions are declared with data-action attributes rather than bound by hand, and the
// handlers are static methods on the class.
//==================================================================================================================

import { rollWeaponAttack } from "../combat/attack.mjs";
import { getWeaponSpeed, getLoreModifiers } from "../combat/combat-rules.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class ImagineCharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "sheet", "actor", "character"],
		position: { width: 820, height: 720 },
		window: { resizable: true },
		form: { submitOnChange: true },
		actions: {
			rollAttributeSave: ImagineCharacterSheet.#onRollAttributeSave,
			rollSkill: ImagineCharacterSheet.#onRollSkill,
			rollWeaponAttack: ImagineCharacterSheet.#onRollWeaponAttack
		}
	};

	// @MARKER SHEET PARTS
	// Header first, then the tab strip, then one part per tab.
	static PARTS = {
		header:     { template: "systems/imagine-rpg/templates/actor/header.hbs" },
		tabs:       { template: "templates/generic/tab-navigation.hbs" },
		attributes: { template: "systems/imagine-rpg/templates/actor/tab-attributes.hbs" },
		skills:     { template: "systems/imagine-rpg/templates/actor/tab-skills.hbs" },
		combat:     { template: "systems/imagine-rpg/templates/actor/tab-combat.hbs" },
		equipment:  { template: "systems/imagine-rpg/templates/actor/tab-equipment.hbs" }
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "attributes", icon: "fa-solid fa-dice-d20" },
				{ id: "skills",     icon: "fa-solid fa-list-check" },
				{ id: "combat",     icon: "fa-solid fa-khanda" },
				{ id: "equipment",  icon: "fa-solid fa-sack" }
			],
			initial: "attributes",
			labelPrefix: "IMAGINE.Tab"
		}
	};

	// This is the function which assembles the data every template renders against.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);

		tmpcontext.actor = this.document;
		tmpcontext.system = this.document.system;
		tmpcontext.attributes = ImagineCharacterSheet.#buildAttributeRows(this.document.system);
		tmpcontext.skills = ImagineCharacterSheet.#buildSkillRows(this.document);
		tmpcontext.gear = this.document.items.filter(i =>
			["weapon", "armor", "equipment"].includes(i.type));
		tmpcontext.weapons = ImagineCharacterSheet.#buildWeaponRows(this.document);
		tmpcontext.handednessChoices =
			ImagineCharacterSheet.#buildHandednessChoices(this.document.system.physical.handedness);
		tmpcontext.lore = ImagineCharacterSheet.#buildLorePanel(this.document.system);

		return tmpcontext;
	}

	// This is the function which assembles the Lore panel. Holding Weapon or Missile Lore at all
	// comes from the class and the title, so it is derived; the two lists only name the weapons
	// singled out for the larger bonus. Built here rather than in the template because joining a
	// list and testing two flags at once both need Handlebars helpers whose presence in Foundry's
	// environment this port cannot check.
	static #buildLorePanel(tmpsystem) {
		var tmpweapon = !!tmpsystem.combat.hasWeaponLore;
		var tmpmissile = !!tmpsystem.combat.hasMissileLore;
		var tmpprojectile = !!tmpsystem.combat.hasProjectileLore;
		var tmpkinds = [];
		if (tmpweapon) { tmpkinds.push("Weapon"); }
		if (tmpmissile) { tmpkinds.push("Missile"); }
		if (tmpprojectile) { tmpkinds.push("Projectile"); }
		return {
			show: tmpweapon || tmpmissile || tmpprojectile,
			hasWeapon: tmpweapon,
			hasMissile: tmpmissile,
			hasProjectile: tmpprojectile,
			label: tmpkinds.join(", "),
			weaponText: tmpsystem.combat.weaponLoreList ?? "",
			missileText: tmpsystem.combat.missileLoreList ?? "",
			projectileText: tmpsystem.combat.projectileLoreList ?? ""
		};
	}

	// This is the function which builds the handedness dropdown. A shield is held in the off hand,
	// so which one a character favours decides which side of the body it covers. His sheet takes
	// the same three values, set from a race's abilities (sheet-worker.js:49203); anything that is
	// not exactly "Left" is treated as right-handed by his equipShield, blank included.
	static #buildHandednessChoices(tmpcurrent) {
		const tmpchoices = [
			{ value: "",             label: "Right (default)" },
			{ value: "Right",        label: "Right" },
			{ value: "Left",         label: "Left" },
			{ value: "Ambidextrous", label: "Ambidextrous (shields right)" }
		];
		for (const tmpchoice of tmpchoices) {
			tmpchoice.selected = (tmpchoice.value == ("" + (tmpcurrent ?? "")));
		}
		return tmpchoices;
	}

	// This is the function which flattens the twelve attributes into rows a template can walk,
	// keeping the Player's Guide's order and category grouping.
	static #buildAttributeRows(tmpsystem) {
		const tmpgroups = [
			{ label: "Physical", keys: ["str", "agl", "vit"] },
			{ label: "Mental",   keys: ["int", "wis", "knw"] },
			{ label: "Personal", keys: ["app", "chm", "soc"] },
			{ label: "Mystical", keys: ["aur", "pty", "wil"] }
		];

		var tmprows = [];
		for (const tmpgroup of tmpgroups) {
			for (const tmpkey of tmpgroup.keys) {
				var tmpattrib = tmpsystem.attributes[tmpkey];
				tmprows.push({
					key: tmpkey,
					group: tmpgroup.label,
					label: `IMAGINE.Attribute.${tmpkey}`,
					rating: tmpattrib.rating,
					value: tmpattrib.value,
					max: tmpattrib.max,
					save: tmpattrib.save,
					// The modifiers each attribute contributes differ from one to the next, so
					// they are rendered as name/value pairs rather than fixed columns.
					mods: Object.entries(tmpattrib.mods ?? {}).map(([k, v]) => ({ key: k, value: v }))
				});
			}
		}
		return tmprows;
	}

	// This is the function which gathers the character's skills, grouped by category and
	// sorted by name, with the totals the actor already derived.
	static #buildSkillRows(tmpactor) {
		var tmpout = { class: [], racial: [], social: [] };

		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type != "skill") { continue; }
			var tmpsys = tmpitem.system;
			var tmprow = {
				id: tmpitem.id,
				name: tmpitem.name,
				attr1: tmpsys.attr1,
				attr2: tmpsys.attr2,
				skillRating: tmpsys.skillRating,
				baseChance: tmpsys.baseChance,
				totalChance: tmpsys.totalChance,
				sourcebook: tmpsys.sourcebook,
				// Flagged rather than hidden: a skill the campaign's switches disallow stays
				// visible, with the reason, so nothing vanishes from a player's sheet.
				available: tmpsys.available !== false,
				unavailableReason: tmpsys.unavailableReason ?? ""
			};
			if (tmpout[tmpsys.category]) { tmpout[tmpsys.category].push(tmprow); }
		}

		for (const tmpkey of Object.keys(tmpout)) {
			tmpout[tmpkey].sort((a, b) => a.name.localeCompare(b.name));
		}
		return tmpout;
	}

	// This is the function which lists the character's ready weapons for the Combat tab, with
	// the attack modes each allows and how long a swing takes once every speed modifier is in.
	// Only weapons equipped or carried are offered; a sword left in a stash cannot be swung.
	static #buildWeaponRows(tmpactor) {
		var tmprows = [];
		var tmpspeedmod = tmpactor.system.combat.weaponSpeedMod;
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type != "weapon") { continue; }
			var tmpw = tmpitem.system;
			if (tmpw.location != "equipped" && tmpw.location != "carried") { continue; }
			var tmpmodes = [];
			for (const tmpmode of ["thrust", "cut", "smash", "missile"]) {
				if (tmpw[tmpmode]?.available) {
					tmpmodes.push({ mode: tmpmode, mod: tmpw[tmpmode].mod });
				}
			}
			// Lore, for whichever kind this weapon is used as. A weapon with both melee and
			// missile modes is shown by its first mode, which is how it will most often swing;
			// the attack itself works the mode out properly when it is rolled.
			var tmplore = getLoreModifiers({
				mode: tmpmodes.length ? tmpmodes[0].mode : "thrust",
				weaponName: tmpitem.name,
				hasWeaponLore: tmpactor.system.combat.hasWeaponLore,
				hasMissileLore: tmpactor.system.combat.hasMissileLore,
				weaponLoreList: tmpactor.system.combat.weaponLoreNames,
				missileLoreList: tmpactor.system.combat.missileLoreNames
			});

			tmprows.push({
				id: tmpitem.id,
				name: tmpitem.name,
				damage: tmpw.damage,
				speed: tmpw.speedSpecial ? "Special"
					: getWeaponSpeed(tmpw.speed, tmpw.minSpeed, tmpspeedmod + tmplore.speed),
				reload: tmpw.reloadSpeed || "",
				modes: tmpmodes,
				lore: tmplore.attack ? tmplore : null,
				equipped: tmpw.location == "equipped"
			});
		}
		return tmprows;
	}

	// @MARKER ACTION HANDLERS

	// This is the function which makes a weapon attack from the Combat tab.
	static async #onRollWeaponAttack(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }
		await rollWeaponAttack(this.document, tmpitem);
	}

	// This is the function which rolls an attribute save. A save succeeds on a percentile roll
	// equal to or under the save chance, and succeeding by half the chance or better is a
	// distinct and better result -- which is how his sheet reports it.
	static async #onRollAttributeSave(event, target) {
		var tmpkey = target.dataset.attribute;
		var tmpattrib = this.document.system.attributes[tmpkey];
		if (!tmpattrib) { return; }

		var tmproll = await new Roll("1d100").evaluate();
		var tmpchance = tmpattrib.save;
		var tmphalf = Math.floor(tmpchance / 2);

		var tmpoutcome = "Failed";
		if (tmproll.total <= tmphalf)        { tmpoutcome = "Succeeded by half"; }
		else if (tmproll.total <= tmpchance) { tmpoutcome = "Succeeded"; }

		await tmproll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.document }),
			flavor: `${game.i18n.localize(`IMAGINE.Attribute.${tmpkey}`)} Save &mdash; ${tmpchance}% &mdash; <strong>${tmpoutcome}</strong>`
		});
	}

	// This is the function which rolls a skill. Player's Guide p.93: the roll succeeds on
	// equal to or under the total chance, and a margin of more than 20% either way is a
	// critical success or failure.
	static async #onRollSkill(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }

		var tmpchance = tmpitem.system.totalChance;
		var tmproll = await new Roll("1d100").evaluate();
		var tmpmargin = tmpchance - tmproll.total;

		var tmpoutcome = "Failed";
		if (tmproll.total <= tmpchance) {
			tmpoutcome = (tmpmargin > 20) ? "Critical success" : "Succeeded";
		} else {
			tmpoutcome = (tmpmargin < -20) ? "Critical failure" : "Failed";
		}

		await tmproll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.document }),
			flavor: `${tmpitem.name} &mdash; ${tmpchance}% &mdash; <strong>${tmpoutcome}</strong>`
		});
	}
}
// @END (CODE)
