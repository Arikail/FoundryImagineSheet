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
import {
	resolveSkillOutcome, pickBestSkillRoll, canTransferSlot, canSacrificeSlot,
	SLOT_TRANSFERS, SLOT_SACRIFICE_DICE, SACRIFICEABLE_SLOTS
} from "../skills-rules.mjs";

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
			rollUntrainedSkill: ImagineCharacterSheet.#onRollUntrainedSkill,
			stepClassTitle: ImagineCharacterSheet.#onStepClassTitle,
			openLevelUp: ImagineCharacterSheet.#onOpenLevelUp,
			transferSlot: ImagineCharacterSheet.#onTransferSlot,
			sacrificeSlot: ImagineCharacterSheet.#onSacrificeSlot,
			addLanguage: ImagineCharacterSheet.#onAddLanguage,
			deleteLanguage: ImagineCharacterSheet.#onDeleteLanguage,
			createGear: ImagineCharacterSheet.#onCreateGear,
			openItem: ImagineCharacterSheet.#onOpenItem,
			deleteItem: ImagineCharacterSheet.#onDeleteItem
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
		// A GME picks its attack chart outright; the same selected-flag list the handedness
		// dropdown uses, so it renders the same way everywhere.
		tmpcontext.chosenAttackSkillChoices = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master"]
			.map(tmpskill => ({ value: tmpskill, label: tmpskill,
			                    selected: tmpskill == this.document.system.combat.chosenAttackSkill }));
		tmpcontext.lore = ImagineCharacterSheet.#buildLorePanel(this.document.system);
		tmpcontext.languages = ImagineCharacterSheet.#buildLanguageRows(this.document.system);
		tmpcontext.classProgress = ImagineCharacterSheet.#buildClassProgress(this.document.system);
		tmpcontext.slotTransfers = ImagineCharacterSheet.#buildSlotTransfers(this.document);

		return tmpcontext;
	}

	// This is the function which lists every slot trick with whether it can be taken right now, so
	// one that has nothing left to spend explains itself on hover rather than failing on click.
	// The rates themselves come from SLOT_TRANSFERS and are not restated here.
	//
	// The four trades and the two sacrifices are one list because the tab shows them as one row of
	// buttons; a sacrifice carries no destination, which is what `sacrifice` marks.
	static #buildSlotTransfers(tmpactor) {
		var tmpslots = tmpactor.system.skillSlots;
		var tmpallowance = { class: tmpslots.class, racial: tmpslots.racial, social: tmpslots.social };
		var tmpused = { class: tmpslots.classUsed, racial: tmpslots.racialUsed, social: tmpslots.socialUsed };
		var tmphasskill = tmpactor.items.some(i => i.type == "skill");

		var tmprows = [];
		for (const tmpkey of Object.keys(SLOT_TRANSFERS)) {
			var tmptransfer = SLOT_TRANSFERS[tmpkey];
			var tmpcheck = canTransferSlot(tmpkey, tmpallowance, tmpused);
			tmprows.push({
				key: tmpkey, sacrifice: false,
				from: tmptransfer.from, to: tmptransfer.to,
				cost: tmptransfer.cost, gain: tmptransfer.gain,
				allowed: tmpcheck.allowed, reason: tmpcheck.reason
			});
		}

		for (const tmpcategory of SACRIFICEABLE_SLOTS) {
			var tmpsac = canSacrificeSlot(tmpcategory, tmpallowance, tmpused, tmphasskill);
			tmprows.push({
				key: tmpcategory, sacrifice: true,
				from: tmpcategory, to: `${SLOT_SACRIFICE_DICE}%`,
				cost: 1, gain: 1,
				allowed: tmpsac.allowed, reason: tmpsac.reason
			});
		}
		return tmprows;
	}

	// This is the function which shows each class's whole skill progression -- every title that
	// brings skills, which ones, and whether the character has reached it yet.
	//
	// It reads what the data model has already worked out (identity.classProgression, built by
	// buildClassProgression in class-rules.mjs), so the sheet and the character generator's preview
	// cannot drift apart. A dual-classed character gets one panel per class, each on its own title.
	//
	// ROW CORRECTED 2026-09-19: this used to read advancement.classSkills, the per-title TEXT, and
	// said in a comment that his sheet-worker carried no per-title skills. It does -- his
	// setClassSkillLists holds all 92 classes' progressions -- and classSkillList is where the
	// extraction now puts them, so every class has something to show here rather than the handful
	// authored from his Word templates.
	static #buildClassProgress(tmpsystem) {
		var tmpclasses = (tmpsystem.identity.classProgression ?? []).filter(tmpclass => tmpclass.rows.length);
		if (!tmpclasses.length) { return { show: false, classes: [], owed: 0 }; }

		return {
			show: true,
			// Named only when there is more than one, the way the title steppers are.
			showNames: tmpclasses.length > 1,
			classes: tmpclasses.map(tmpclass => ({
				name: tmpclass.name,
				title: tmpclass.title,
				rows: tmpclass.rows
			})),
			// Ordinarily zero: the grant runs on every title change. A number here means a
			// character who earned skills the grant could not give them -- worth saying so.
			owed: tmpsystem.identity.classSkillsOwed ?? 0,
			usage: tmpsystem.identity.classUsage ?? []
		};
	}

	// This is the function which numbers the character's languages so a row can be written back
	// to the right entry -- the same reason the creature attack's rider effects are numbered.
	//
	// Each row also carries the slot it sits in and its two flags, which the data model has
	// already worked out (assignLanguageSlots) -- they are only merged in here.
	static #buildLanguageRows(tmpsystem) {
		var tmpslotrows = tmpsystem.languageAllowance?.rows ?? [];
		return (tmpsystem.languages ?? []).map((tmplang, tmpindex) =>
			({ ...tmplang, ...(tmpslotrows[tmpindex] ?? {}), index: tmpindex }));
	}

	// This is the function which assembles the Lore panel. Holding Weapon or Missile Lore at all
	// comes from the class and the title, so it is derived; the two lists only name the weapons
	// singled out for the larger bonus. Built here rather than in the template because joining a
	// list and testing two flags at once both need Handlebars helpers. Foundry V14 does provide
	// them (eq, gt, lt, and, or -- confirmed against the V14 API docs 2026-09-19), so this could
	// now be done in the template; it is built here because the previews render the same file
	// through plain Handlebars, which has them only if the harness registers them.
	static #buildLorePanel(tmpsystem) {
		var tmpweapon = !!tmpsystem.combat.hasWeaponLore;
		var tmpmissile = !!tmpsystem.combat.hasMissileLore;
		var tmpprojectile = !!tmpsystem.combat.hasProjectileLore;

		// The two multi-missile lists are shown on different terms from the three above. Those
		// name weapons singled out for a LARGER bonus, so they only matter once the class has
		// granted the lore. A multi-missile combination is what makes its skill apply at all, and
		// Knowledge has no class title gating it whatever -- so the Knowledge row shows whenever
		// the character actually holds that skill, and only the Lore row waits on a title.
		var tmpknowchance = parseInt(tmpsystem.combat.multiMissileKnowChance) || 0;
		var tmpmultiknow = tmpknowchance > 0;
		var tmpmultilore = !!tmpsystem.combat.hasMultiMissileLore;

		var tmpkinds = [];
		if (tmpweapon) { tmpkinds.push("Weapon"); }
		if (tmpmissile) { tmpkinds.push("Missile"); }
		if (tmpprojectile) { tmpkinds.push("Projectile"); }
		if (tmpmultiknow || tmpmultilore) { tmpkinds.push("Multiple Missile"); }

		return {
			show: tmpweapon || tmpmissile || tmpprojectile || tmpmultiknow || tmpmultilore,
			hasWeapon: tmpweapon,
			hasMissile: tmpmissile,
			hasProjectile: tmpprojectile,
			hasMultiKnow: tmpmultiknow,
			hasMultiLore: tmpmultilore,
			label: tmpkinds.join(", "),
			weaponText: tmpsystem.combat.weaponLoreList ?? "",
			missileText: tmpsystem.combat.missileLoreList ?? "",
			projectileText: tmpsystem.combat.projectileLoreList ?? "",
			multiKnowText: tmpsystem.combat.multiMissileKnowList ?? "",
			multiLoreText: tmpsystem.combat.multiMissileLoreList ?? "",
			multiKnowChance: tmpknowchance,
			multiKnowLevels: Math.floor(tmpknowchance / 25)
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
				unavailableReason: tmpsys.unavailableReason ?? "",
				// A class skill whose title has not been reached: held, shown, and refused on the
				// roll -- his "this skill cannot be used before <name> title".
				usableByTitle: tmpsys.usableByTitle !== false,
				titleGateReason: tmpsys.titleGateReason ?? "",
				acquiredAtTitle: parseInt(tmpsys.acquiredAtTitle) || 0
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
	// This is the function which rolls a skill, once for every copy of it the character holds.
	//
	// Player's Guide, "Duplicate Class and Racial Skills": the same skill held both racially and as
	// a class skill is rolled for each copy and the best result taken. The copies do NOT share a
	// chance -- each carries its own bonuses -- so each is rolled against its own and compared
	// afterwards, which is what pickBestSkillRoll does. Every roll is shown, not just the winner.
	//
	// Copies are found by name, which is what makes two items one skill here. His sheet matches the
	// same way when it refuses a duplicate within a category (sheet-worker.js:7017).
	static async #onRollSkill(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }

		// His handleHighTitleClassSkillRoll refuses a class skill the character's title has not
		// reached, and says so instead of rolling (sheet-worker.js:64169). The skill is on the
		// sheet before its title -- that is how his own sheet writes it -- so the refusal is here
		// rather than the row being hidden.
		if (tmpitem.system.usableByTitle === false) {
			ui.notifications.warn(`${this.document.name}: ${tmpitem.system.titleGateReason}`);
			return;
		}

		var tmpcopies = this.document.items.filter(i => i.type == "skill" && i.name == tmpitem.name);
		if (!tmpcopies.length) { tmpcopies = [tmpitem]; }

		var tmprolls = [];
		var tmpresults = [];
		for (const tmpcopy of tmpcopies) {
			var tmproll = await new Roll("1d100").evaluate();
			tmprolls.push(tmproll);
			var tmpresult = resolveSkillOutcome(tmpcopy.system.totalChance, tmproll.total);
			tmpresult.category = tmpcopy.system.category;
			tmpresults.push(tmpresult);
		}

		var tmpbest = pickBestSkillRoll(tmpresults);

		var tmplines = tmpresults.map(function (tmpresult, tmpindex) {
			var tmpchosen = tmpindex == tmpbest.bestIndex;
			var tmplabel = tmpresult.category ? `${tmpresult.category} ` : "";
			return `<div class="skill-roll-line${tmpchosen ? " chosen" : ""}">${tmplabel}${tmpresult.chance}%:
				rolled ${tmpresult.roll} &mdash; <strong>${tmpresult.outcome}</strong></div>`;
		}).join("");

		var tmpheading = tmpresults.length > 1
			? `${tmpitem.name} &mdash; held ${tmpresults.length} times, best taken`
			: `${tmpitem.name}`;

		await ChatMessage.create({
			speaker: ChatMessage.getSpeaker({ actor: this.document }),
			flavor: `${tmpheading} &mdash; <strong>${tmpbest.best.outcome}</strong>`,
			content: `<div class="imagine-skill-roll">${tmplines}</div>`,
			rolls: tmprolls
		});
	}

	// @MARKER INVENTORY
	// This is the function which makes a new piece of gear on the character, for something a
	// compendium does not hold -- a rope cut in half, a Game Master's invention, a sword taken
	// from an orc and not yet written up.
	//
	// It creates the item and opens its sheet straight away, because a thing called "New
	// Equipment" weighing nothing is not what anyone wanted; the sheet is where it becomes real.
	// Dragging from a compendium still works and is still the better route for anything the
	// system already knows -- see docs/ADDING-CONTENT.md for putting it in a pack instead.
	static async #onCreateGear(event, target) {
		event.preventDefault();
		var tmptype = target.dataset.type || "equipment";
		var tmplabel = { equipment: "Equipment", weapon: "Weapon", armor: "Armour" }[tmptype] ?? "Equipment";

		var tmpcreated = await this.document.createEmbeddedDocuments("Item", [{
			name: `New ${tmplabel}`,
			type: tmptype,
			// Carried rather than equipped: a thing just picked up is in a pack, not in a hand,
			// and carried is what counts against encumbrance either way.
			system: { location: "carried", quantity: 1, weight: 0 }
		}]);
		if (tmpcreated?.length) { tmpcreated[0].sheet.render(true); }
	}

	// This is the function which opens a carried item's own sheet, to edit what it is.
	static async #onOpenItem(event, target) {
		event.preventDefault();
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (tmpitem) { tmpitem.sheet.render(true); }
	}

	// This is the function which removes a carried item from the character. Asked first: an item
	// deleted here is gone, and a mis-click on a row of small buttons is easy.
	static async #onDeleteItem(event, target) {
		event.preventDefault();
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }

		var tmpconfirmed = await foundry.applications.api.DialogV2.confirm({
			window: { title: "Imagine RPG" },
			content: `<p>Remove <strong>${tmpitem.name}</strong> from ${this.document.name}?</p>`,
			rejectClose: false,
			modal: true
		});
		if (tmpconfirmed) { await tmpitem.delete(); }
	}

	// This is the function which opens the Level Up window. Experience, goals and titles are all
	// taken there rather than typed onto the sheet, because each has decisions and refusals in it
	// -- see module/apps/level-up.mjs.
	static async #onOpenLevelUp(event, target) {
		event.preventDefault();
		game.imagine.levelUp(this.document);
	}

	// This is the function which advances or steps back one class's own title.
	//
	// Only a dual-classed character has these: with one class the title lives on the character,
	// where it always has, and this never renders. A class whose title is still zero is following
	// the character's, so the first step starts from there rather than from nothing.
	static async #onStepClassTitle(event, target) {
		var tmpitem = this.document.items.get(target.dataset.itemId);
		if (!tmpitem) { return; }

		var tmpstep = parseInt(target.dataset.step) || 0;
		var tmpnow = (parseInt(tmpitem.system.title) || 0)
			|| (parseInt(this.document.system.identity.title) || 0);
		await tmpitem.update({ "system.title": Math.max(0, tmpnow + tmpstep) });
	}

	// This is the function which attempts a skill the character has never learned.
	//
	// Player's Guide, "Who Can Use a Skill": almost any skill may be tried untrained, at the base
	// chance with no starting bonus. Two limits come from the same passage and are applied here
	// rather than in the chance itself: a skill already held is rolled as itself instead (the book
	// is explicit -- "any skill for which the character has rolled a starting bonus can no longer
	// be attempted as a common skill"), and a restricted skill cannot be tried at all.
	//
	// THE RESTRICTED FLAG HAS NO DATA BEHIND IT YET. His skilldict carries no restricted column --
	// the book states it per skill and he never brought it across -- so `isRestricted` is on the
	// schema, honoured here, and false on all 674 extracted skills until something populates it.
	// Filtering on it now rather than later means nothing has to be rewired when it lands.
	static async #onRollUntrainedSkill(event, target) {
		var tmppack = game.packs.get("world.imagine-skills");
		if (!tmppack) {
			ui.notifications.warn("No skill compendium in this world. Import the system content first.");
			return;
		}

		var tmpindex = await tmppack.getIndex({ fields: ["system.attr1", "system.attr2",
			"system.skillRating", "system.isRestricted"] });
		var tmpheld = new Set(this.document.items.filter(i => i.type == "skill").map(i => i.name));
		var tmpoffer = tmpindex
			.filter(e => !tmpheld.has(e.name) && !e.system?.isRestricted)
			.sort((a, b) => a.name.localeCompare(b.name));
		if (!tmpoffer.length) {
			ui.notifications.info("No skill left to attempt untrained.");
			return;
		}

		var tmpoptions = tmpoffer
			.map(e => `<option value="${e._id}">${foundry.utils.escapeHTML(e.name)}</option>`).join("");
		var tmpchoice = await foundry.applications.api.DialogV2.prompt({
			window: { title: "Attempt a Skill Untrained" },
			content: `<p class="hint">The base chance alone, with no starting bonus.</p>
				<div class="form-group"><label>Skill</label><select name="skill">${tmpoptions}</select></div>
				<div class="form-group"><label>Modifier</label>
					<input type="number" name="modifier" value="0"></div>`,
			rejectClose: false,
			ok: {
				label: "Attempt it",
				callback: (event, button) => ({
					id: button.form.elements.skill.value,
					modifier: parseInt(button.form.elements.modifier.value) || 0
				})
			}
		});
		if (!tmpchoice) { return; }

		var tmpentry = tmpoffer.find(e => e._id == tmpchoice.id);
		if (!tmpentry) { return; }

		var tmpchance = this.document.system.getCommonSkillChance(
			tmpentry.system?.attr1, tmpentry.system?.attr2, tmpentry.system?.skillRating)
			+ tmpchoice.modifier;

		var tmproll = await new Roll("1d100").evaluate();
		var tmpresult = resolveSkillOutcome(tmpchance, tmproll.total);

		await tmproll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.document }),
			flavor: `${tmpentry.name} (untrained) &mdash; ${tmpresult.chance}% &mdash;
				<strong>${tmpresult.outcome}</strong>`
		});
	}

	// This is the function which trades one category's skill slots for another's -- the Player's
	// Guide's "slot tricks", ported from his four conversion functions. The rates are in
	// SLOT_TRANSFERS; nothing about them is decided here.
	//
	// It asks first. His sheet's trade is a one-way door (there is no function that undoes one),
	// and this port keeps that, so a mis-click would otherwise cost a slot with no way back.
	static async #onTransferSlot(event, target) {
		var tmpkey = target.dataset.transfer;
		var tmptransfer = SLOT_TRANSFERS[tmpkey];
		if (!tmptransfer) { return; }

		var tmpslots = this.document.system.skillSlots;
		var tmpallowed = canTransferSlot(tmpkey,
			{ class: tmpslots.class, racial: tmpslots.racial, social: tmpslots.social },
			{ class: tmpslots.classUsed, racial: tmpslots.racialUsed, social: tmpslots.socialUsed });
		if (!tmpallowed.allowed) {
			ui.notifications.warn(tmpallowed.reason);
			return;
		}

		var tmpconfirmed = await foundry.applications.api.DialogV2.confirm({
			window: { title: "Trade Skill Slots" },
			content: `<p>Give up ${tmptransfer.cost} ${tmptransfer.from} slot${tmptransfer.cost > 1 ? "s" : ""}
				for ${tmptransfer.gain} ${tmptransfer.to} slot${tmptransfer.gain > 1 ? "s" : ""}?</p>
				<p class="hint">This cannot be undone.</p>`
		});
		if (!tmpconfirmed) { return; }

		var tmpmoves = this.document.system.skillSlotMoves;
		await this.document.update({ [`system.skillSlotMoves.${tmpkey}`]: (parseInt(tmpmoves[tmpkey]) || 0) + 1 });
	}

	// This is the function which gives up a slot outright for a bonus to a skill already held:
	// 2d4%, added to that skill's own modifier, from his sacrificeRacialSkillSlot and its social
	// twin. The bonus is added rather than floored at zero, as his code adds it -- a skill carrying
	// a larger penalty stays negative.
	static async #onSacrificeSlot(event, target) {
		var tmpcategory = target.dataset.category;
		var tmpslots = this.document.system.skillSlots;
		var tmpskills = this.document.items.filter(i => i.type == "skill");

		var tmpallowed = canSacrificeSlot(tmpcategory,
			{ class: tmpslots.class, racial: tmpslots.racial, social: tmpslots.social },
			{ class: tmpslots.classUsed, racial: tmpslots.racialUsed, social: tmpslots.socialUsed },
			tmpskills.length > 0);
		if (!tmpallowed.allowed) {
			ui.notifications.warn(tmpallowed.reason);
			return;
		}

		var tmpoptions = tmpskills
			.map(s => `<option value="${s.id}">${foundry.utils.escapeHTML(s.name)}</option>`).join("");
		var tmptarget = await foundry.applications.api.DialogV2.prompt({
			window: { title: "Give Up a Skill Slot" },
			content: `<p>Give up one ${tmpcategory} slot. The skill chosen gains ${SLOT_SACRIFICE_DICE}%.</p>
				<div class="form-group"><label>Skill</label><select name="skill">${tmpoptions}</select></div>
				<p class="hint">This cannot be undone.</p>`,
			rejectClose: false,
			ok: { label: "Give it up", callback: (event, button) => button.form.elements.skill.value }
		});
		if (!tmptarget) { return; }

		var tmpskill = this.document.items.get(tmptarget);
		if (!tmpskill) { return; }

		var tmproll = await new Roll(SLOT_SACRIFICE_DICE).evaluate();
		var tmpmoves = this.document.system.skillSlotMoves;
		var tmpkey = tmpcategory == "racial" ? "racialSacrificed" : "socialSacrificed";

		await this.document.update({ [`system.skillSlotMoves.${tmpkey}`]: (parseInt(tmpmoves[tmpkey]) || 0) + 1 });
		await tmpskill.update({ "system.misc": (parseInt(tmpskill.system.misc) || 0) + tmproll.total });

		await tmproll.toMessage({
			speaker: ChatMessage.getSpeaker({ actor: this.document }),
			flavor: `Gave up a ${tmpcategory} skill slot &mdash; ${tmpskill.name} gains the bonus`
		});
	}
}
// @END (CODE)
