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
import { getWeaponSpeed, getLoreModifiers, isOffhandWeapon } from "../combat/combat-rules.mjs";

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
			rollWeaponAttack: ImagineCharacterSheet.#onRollWeaponAttack,
			setWeaponHand: ImagineCharacterSheet.#onSetWeaponHand,
			addLanguage: ImagineCharacterSheet.#onAddLanguage,
			deleteLanguage: ImagineCharacterSheet.#onDeleteLanguage
		}
	};

	// @MARKER SHEET PARTS
	// Header first, then the tab strip, then one part per tab.
	static PARTS = {
		header:      { template: "systems/imagine-rpg/templates/actor/header.hbs" },
		tabs:        { template: "templates/generic/tab-navigation.hbs" },
		attributes:  { template: "systems/imagine-rpg/templates/actor/tab-attributes.hbs" },
		skills:      { template: "systems/imagine-rpg/templates/actor/tab-skills.hbs" },
		combat:      { template: "systems/imagine-rpg/templates/actor/tab-combat.hbs" },
		equipment:   { template: "systems/imagine-rpg/templates/actor/tab-equipment.hbs" },
		description: { template: "systems/imagine-rpg/templates/actor/tab-description.hbs" }
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "attributes",  icon: "fa-solid fa-dice-d20" },
				{ id: "skills",      icon: "fa-solid fa-list-check" },
				{ id: "combat",      icon: "fa-solid fa-khanda" },
				{ id: "equipment",   icon: "fa-solid fa-sack" },
				{ id: "description", icon: "fa-solid fa-scroll" }
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
		tmpcontext.languages = ImagineCharacterSheet.#buildLanguageRows(this.document.system);
		tmpcontext.classProgress = ImagineCharacterSheet.#buildClassProgress(this.document.system);

		return tmpcontext;
	}

	// This is the function which shows the class skills gained around the character's current
	// title -- the title just reached, and the one just below and just above it, so advancing a
	// title is visible against what came before it and what is next.
	//
	// Most classes have nothing to show: his classtitledict never carried the skills gained at
	// each title, only the title names, so classSkills is empty for every class built from the
	// sheet-worker and populated only for classes hand-authored from his Word templates (see
	// item-class.mjs, getClassSkills). A class with nothing recorded renders nothing here rather
	// than three blank rows.
	static #buildClassProgress(tmpsystem) {
		var tmpclass = tmpsystem.classItem;
		if (!tmpclass) { return { show: false, rows: [] }; }

		var tmpskills = tmpclass.system.advancement.classSkills ?? [];
		if (!tmpskills.some(s => s)) { return { show: false, rows: [] }; }

		var tmptitle = parseInt(tmpsystem.identity.title) || 1;
		var tmprows = [];
		for (const tmpoffset of [-1, 0, 1]) {
			var tmpat = tmptitle + tmpoffset;
			if (tmpat < 1) { continue; }
			var tmpskilltext = tmpclass.system.getClassSkills(tmpat);
			var tmptitlename = tmpclass.system.getTitleName(tmpat);
			if (!tmptitlename) { continue; }
			tmprows.push({
				title: tmpat,
				titleName: tmptitlename,
				skills: tmpskilltext,
				current: tmpoffset == 0
			});
		}
		return { show: tmprows.length > 0, rows: tmprows };
	}

	// This is the function which numbers the character's languages so a row can be written back
	// to the right entry -- the same reason the creature attack's rider effects are numbered.
	static #buildLanguageRows(tmpsystem) {
		return (tmpsystem.languages ?? []).map((tmplang, tmpindex) => ({ ...tmplang, index: tmpindex }));
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
				equipped: tmpw.location == "equipped",

				// Which hand it is in, and whether that makes it the off hand for THIS character.
				// The flag is derived rather than stored, so it follows a change of handedness
				// without anything having to be re-tagged.
				hand: tmpw.hand || "right",
				offhand: isOffhandWeapon(tmpw.hand, tmpactor.system.physical?.handedness)
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

	// This is the function which tags a weapon as being in the left hand, the right, or both.
	//
	// The tag lives on the weapon because that is what the user asked for -- a simple selection on
	// the combat page -- and off-handedness is worked out from it against this character's
	// handedness rather than being tagged separately. Changing the tag re-renders, so the off-hand
	// marker beside the weapon follows immediately.
	//
	// Three buttons rather than a dropdown, because an ApplicationV2 data-action is dispatched
	// from a CLICK: a <select> would need its own change binding, and that cannot be verified
	// without a running Foundry V14. Buttons use the same path rollWeaponAttack already does.
	static async #onSetWeaponHand(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }
		await tmpitem.update({ "system.hand": target.dataset.hand });
	}

	// This is the function which adds a blank language row. No ceiling here, unlike the creature
	// attack's rider effects -- the Intelligence table caps how many are worth having, not how
	// many the array can hold, and that cap is the Attributes module's to enforce, not this tab's.
	static async #onAddLanguage(event, target) {
		var tmplanguages = [...(this.document.system.languages ?? [])];
		tmplanguages.push({ name: "", speak: true, write: false });
		await this.document.update({ "system.languages": tmplanguages });
	}

	// This is the function which removes one language.
	static async #onDeleteLanguage(event, target) {
		var tmpindex = parseInt(target.dataset.index);
		var tmplanguages = [...(this.document.system.languages ?? [])];
		if (isNaN(tmpindex) || tmpindex < 0 || tmpindex >= tmplanguages.length) { return; }
		tmplanguages.splice(tmpindex, 1);
		await this.document.update({ "system.languages": tmplanguages });
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
