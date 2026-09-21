// @START (CODE)
// @MARKER CREATURE SHEET
//==================================================================================================================
// The creature sheet, built on ApplicationV2 with the Handlebars mixin.
//
// Same construction as the character sheet: one PART per tab, each with a single root element,
// because the framework's two-pass rendering relies on it to keep focus and scroll position.
//
// Four tabs rather than the character's four-plus: Stats (what the stat block states), Skills
// (a name and a flat percentage each), Combat (the attack chart, the creature's natural attacks
// and the state of its body) and Traits (abilities, disabilities, immunities and Powers).
//
// The attack roll is reached through game.imagine rather than imported, which is how the system
// already exposes rollWeaponAttack. It keeps the sheet loadable on its own.
//==================================================================================================================

import { CREATURE_TYPES, CREATURE_BODY_TYPES, CREATURE_ATTACK_CHARTS } from "../creature-tables.mjs";
import { isOffhandWeapon } from "../combat/combat-rules.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2 } = foundry.applications.sheets;

export default class ImagineCreatureSheet extends HandlebarsApplicationMixin(ActorSheetV2) {

	static DEFAULT_OPTIONS = {
		classes: ["imagine", "themed", "theme-light", "sheet", "actor", "creature"],
		position: { width: 820, height: 720 },
		window: { resizable: true },
		form: { submitOnChange: true },
		actions: {
			rollAttributeSave: ImagineCreatureSheet.#onRollAttributeSave,
			rollCreatureSkill: ImagineCreatureSheet.#onRollCreatureSkill,
			rollCreatureAttack: ImagineCreatureSheet.#onRollCreatureAttack,
			setAttackHand: ImagineCreatureSheet.#onSetAttackHand,
			usePower: ImagineCreatureSheet.#onUsePower
		}
	};

	// @MARKER SHEET PARTS
	static PARTS = {
		header: { template: "systems/imagine-rpg/templates/actor/creature-header.hbs" },
		tabs:   { template: "templates/generic/tab-navigation.hbs" },
		stats:  { template: "systems/imagine-rpg/templates/actor/tab-creature-stats.hbs" },
		skills: { template: "systems/imagine-rpg/templates/actor/tab-creature-skills.hbs" },
		combat: { template: "systems/imagine-rpg/templates/actor/tab-creature-combat.hbs" },
		traits: { template: "systems/imagine-rpg/templates/actor/tab-creature-traits.hbs" }
	};

	static TABS = {
		primary: {
			tabs: [
				{ id: "stats",  icon: "fa-solid fa-dice-d20" },
				{ id: "skills", icon: "fa-solid fa-list-check" },
				{ id: "combat", icon: "fa-solid fa-khanda" },
				{ id: "traits", icon: "fa-solid fa-paw" }
			],
			initial: "stats",
			labelPrefix: "IMAGINE.Tab"
		}
	};

	// This is the function which assembles the data every template renders against.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);

		tmpcontext.actor = this.document;
		tmpcontext.system = this.document.system;
		tmpcontext.attributes = ImagineCreatureSheet.#buildAttributeRows(this.document.system);
		tmpcontext.skills = ImagineCreatureSheet.#buildSkillRows(this.document.system);
		tmpcontext.attacks = ImagineCreatureSheet.#buildAttackRows(this.document);
		tmpcontext.traits = ImagineCreatureSheet.#buildTraitRows(this.document);
		tmpcontext.powers = ImagineCreatureSheet.#buildPowerRows(this.document);
		tmpcontext.gear = this.document.items.filter(i =>
			["weapon", "armor", "equipment"].includes(i.type));

		// The option lists the header and combat tab render as dropdowns. Passed in rather than
		// reached through a global so the templates can be rendered outside Foundry for preview.
		tmpcontext.config = {
			creatureTypes: CREATURE_TYPES,
			bodyTypes: CREATURE_BODY_TYPES,
			attackCharts: CREATURE_ATTACK_CHARTS
		};

		tmpcontext.handednessChoices =
			ImagineCreatureSheet.#buildHandednessChoices(this.document.system.identity.handedness);

		return tmpcontext;
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

	// This is the function which flattens the twelve attributes into rows, in the Player's Guide's
	// order and grouping. Same shape the character sheet builds, so the markup matches.
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
					mods: Object.entries(tmpattrib.mods ?? {}).map(([k, v]) => ({ key: k, value: v }))
				});
			}
		}
		return tmprows;
	}

	// This is the function which lists the creature's skills, with their index, so a row can be
	// written back to the right entry in the stored list.
	static #buildSkillRows(tmpsystem) {
		var tmprows = [];
		var tmplist = tmpsystem.skills ?? [];
		for (var i = 0; i < tmplist.length; i++) {
			tmprows.push({ index: i, name: tmplist[i].name, chance: tmplist[i].chance });
		}
		return tmprows;
	}

	// This is the function which lists the creature's natural attacks, with how long each takes
	// and the rider effects it carries.
	static #buildAttackRows(tmpactor) {
		var tmprows = [];
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type != "creatureAttack") { continue; }
			var tmpa = tmpitem.system;
			tmprows.push({
				id: tmpitem.id,
				name: tmpitem.name,
				attackType: tmpa.attackType,
				damage: tmpa.damage,
				damageType: tmpa.damageType,
				speed: tmpa.speedSpecial ? "Special" : tmpa.speed,
				minSpeed: tmpa.speedSpecial ? "" : tmpa.effectiveMinSpeed,
				effects: tmpa.effects ?? [],
				available: tmpa.available !== false,
				unavailableReason: tmpa.unavailableReason ?? "",
				// Blank means not hand-based at all -- a bite, a tail slap -- and is never off-hand.
				hand: tmpa.hand,
				offhand: tmpa.hand
					? isOffhandWeapon(tmpa.hand, tmpactor.system.combat?.offhandHandedness) : false
			});
		}
		return tmprows.sort((a, b) => a.name.localeCompare(b.name));
	}

	// This is the function which groups the creature's traits by category. Abilities,
	// disabilities and immunities are one item type separated by a category field, because they
	// are one shape in his data.
	static #buildTraitRows(tmpactor) {
		var tmpout = { ability: [], disability: [], immunity: [] };
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type != "trait") { continue; }
			var tmpt = tmpitem.system;
			var tmprow = {
				id: tmpitem.id,
				name: tmpitem.name,
				canonicalName: tmpt.canonicalName,
				value1: tmpt.value1,
				value2: tmpt.value2,
				description: tmpt.description,
				available: tmpt.available !== false,
				unavailableReason: tmpt.unavailableReason ?? ""
			};
			if (tmpout[tmpt.category]) { tmpout[tmpt.category].push(tmprow); }
		}
		for (const tmpkey of Object.keys(tmpout)) {
			tmpout[tmpkey].sort((a, b) => a.name.localeCompare(b.name));
		}
		return tmpout;
	}

	// This is the function which lists the creature's Powers and how many uses are left.
	static #buildPowerRows(tmpactor) {
		var tmprows = [];
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type != "power") { continue; }
			var tmpp = tmpitem.system;
			tmprows.push({
				id: tmpitem.id,
				name: tmpitem.name,
				unlimited: tmpp.unlimited,
				uses: tmpp.uses,
				usesMax: tmpp.usesMax,
				selfOnly: tmpp.selfOnly,
				powerKind: tmpp.powerKind,
				hasUseLeft: tmpp.hasUseLeft,
				available: tmpp.available !== false,
				unavailableReason: tmpp.unavailableReason ?? ""
			});
		}
		return tmprows.sort((a, b) => a.name.localeCompare(b.name));
	}

	// @MARKER ACTION HANDLERS

	// This is the function which rolls an attribute save. Same rule as a character's: a save
	// succeeds on a percentile roll at or under the chance, and succeeding by half or better is
	// a distinct and better result, which is how his sheet reports it.
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

	// This is the function which rolls one of the creature's skills.
	//
	// A creature's skill chance is the flat percentage its stat block states, not something
	// worked out from attributes, so there is nothing to compute here. The outcome follows the
	// Player's Guide p.93 rule the character sheet uses: at or under the chance succeeds, and a
	// margin of more than 20% either way is critical.
	static async #onRollCreatureSkill(event, target) {
		var tmpindex = parseInt(target.dataset.skillIndex);
		var tmpskill = this.document.system.skills?.[tmpindex];
		if (!tmpskill) { return; }

		var tmpchance = parseInt(tmpskill.chance) || 0;
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
			flavor: `${tmpskill.name} &mdash; ${tmpchance}% &mdash; <strong>${tmpoutcome}</strong>`
		});
	}

	// This is the function which makes one of the creature's natural attacks.
	static async #onRollCreatureAttack(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }
		if (!game.imagine?.rollCreatureAttack) {
			ui.notifications.warn("Creature attacks are not available in this world.");
			return;
		}
		await game.imagine.rollCreatureAttack(this.document, tmpitem);
	}

	// This is the function which sets which limb an attack comes from -- or clears it back to
	// blank, for an attack that is not hand-based at all and must never read as off-hand.
	static async #onSetAttackHand(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }
		await tmpitem.update({ "system.hand": target.dataset.hand });
	}

	// This is the function which uses one of the creature's Powers.
	//
	// A Power is an innate spell or invocation, and actually resolving one needs the spell and
	// invocation engine, which is the deferred magic phase. So this spends the use and reports
	// what was used, and says plainly that the effect is not being worked out -- rather than
	// pretending to cast it.
	static async #onUsePower(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }
		var tmppower = tmpitem.system;

		if (!tmppower.hasUseLeft) {
			ui.notifications.warn(`${tmpitem.name} has no uses left.`);
			return;
		}

		if (!tmppower.unlimited) {
			await tmpitem.update({ "system.uses": Math.max(0, (parseInt(tmppower.uses) || 0) - 1) });
		}

		var tmpremaining = tmppower.unlimited
			? "unlimited"
			: `${Math.max(0, (parseInt(tmppower.uses) || 0) - 1)} of ${tmppower.usesMax}`;

		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.document }),
			content: `<div class="imagine-chat power-use">
				<p><strong>${this.document.name}</strong> uses <strong>${tmpitem.name}</strong>
				at level ${this.document.system.identity.powerLevel}${tmppower.selfOnly ? ", on itself" : ""}.</p>
				<p class="muted">Uses left: ${tmpremaining}.</p>
				${tmppower.description ? `<div class="power-text">${tmppower.description}</div>` : ""}
				<p class="muted">A Power is an innate spell or invocation. Working out its effect needs the
				magic phase, which is not built yet, so the Game Master resolves it.</p>
			</div>`
		});
	}
}
// @END (CODE)
