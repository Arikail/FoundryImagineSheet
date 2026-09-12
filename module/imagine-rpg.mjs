// @START (CODE)
// @MARKER SYSTEM ENTRY POINT
//==================================================================================================================
// Imagine Role Playing System for Foundry VTT.
//
// Converted from the Roll20 sheet by W. Michael Tenery III, with permission. Where this code
// and the printed rulebooks disagree, the Roll20 sheet is the source of truth -- see
// docs/DECISIONS.md.
//
// Status: character and creature data models with derived values, sheets for both, a runtime
// content importer, the content availability switches, and combat phase 1 (attack charts, attack
// and damage rolls, armour, body areas and wounds, the 10 second round). Not yet built: combat
// phase 2 and the magic subsystems, which is also what a creature's Powers wait on. See
// docs/PROGRESS.md.
//==================================================================================================================

import ImagineCharacterData from "./data/actor-character.mjs";
import ImagineCreatureData from "./data/actor-creature.mjs";
import ImagineSkillData from "./data/item-skill.mjs";
import ImagineRaceData from "./data/item-race.mjs";
import ImagineClassData from "./data/item-class.mjs";
import ImagineWeaponData from "./data/item-weapon.mjs";
import ImagineArmorData from "./data/item-armor.mjs";
import ImagineEquipmentData from "./data/item-equipment.mjs";
import ImagineCreatureAttackData from "./data/item-creature-attack.mjs";
import ImaginePowerData from "./data/item-power.mjs";
import ImagineTraitData from "./data/item-trait.mjs";
import ImagineCharacterSheet from "./sheets/actor-character-sheet.mjs";
import ImagineCreatureSheet from "./sheets/actor-creature-sheet.mjs";
import { importAllContent } from "./content-importer.mjs";
import ImagineAvailabilityConfig from "./apps/availability-config.mjs";
import ImagineCombat from "./combat/combat-document.mjs";
import { rollWeaponAttack, registerAttackCardListeners } from "./combat/attack.mjs";
import { rollCreatureAttack } from "./combat/creature-attack.mjs";
import {
	SOURCEBOOKS, MAGIC_SUBSYSTEMS,
	registerAvailabilitySettings, registerAvailabilityEnforcement,
	getAvailabilityRules, explainAvailability
} from "./availability.mjs";

// @MARKER SYSTEM CONSTANTS
export const IMAGINE = {

	// The twelve attributes, in the order the Player's Guide presents them, grouped
	// physical / mental / personal / mystical.
	attributes: {
		str: "IMAGINE.Attribute.str",
		agl: "IMAGINE.Attribute.agl",
		vit: "IMAGINE.Attribute.vit",
		int: "IMAGINE.Attribute.int",
		wis: "IMAGINE.Attribute.wis",
		knw: "IMAGINE.Attribute.knw",
		app: "IMAGINE.Attribute.app",
		chm: "IMAGINE.Attribute.chm",
		soc: "IMAGINE.Attribute.soc",
		aur: "IMAGINE.Attribute.aur",
		pty: "IMAGINE.Attribute.pty",
		wil: "IMAGINE.Attribute.wil"
	},

	// Skill types as they appear in skilldict. Magical and Divine are the two the
	// magic switches filter on.
	skillTypes: ["Magical", "Divine", "Combat", "Disciplined", "Informational", "Stealth/Intrusive"],

	// Armour flexibility classes, innermost-first. The first layer worn must always be
	// flexible, each layer may only sit over something at least as flexible as itself, and
	// rigid may never stack on rigid. Clothing is its own class and does not consume a
	// layer when its armour value is 3 or less.
	armorFlexibility: ["Clothing", "Flexible", "Semi-Flexible", "Rigid"]
};

// getAttribSave and getAttributeMax live on ImagineCharacterData as static functions, so the
// rule and the data it applies to stay in one place. Reach them via
// ImagineCharacterData.getAttribSave(rating).
//
// There is deliberately no table of attribute caps by being type here. The Master's Manual
// describes mundane, mortal, arch-mortal and deity ranges, but his sheet implements none of
// them: a maximum is the race's limit until title 11, and a flat 27 from then on. The sheet
// wins on conflict -- see docs/DECISIONS.md.

// @MARKER SYSTEM INITIALISATION
Hooks.once("init", function () {
	console.log("Imagine RPG | Initialising system");

	CONFIG.IMAGINE = IMAGINE;
	CONFIG.IMAGINE.sourcebooks = SOURCEBOOKS;
	CONFIG.IMAGINE.magicSubsystems = MAGIC_SUBSYSTEMS;

	// Register the data models against the document subtypes declared in system.json.
	CONFIG.Actor.dataModels.character = ImagineCharacterData;
	CONFIG.Actor.dataModels.creature = ImagineCreatureData;
	CONFIG.Item.dataModels.skill = ImagineSkillData;
	CONFIG.Item.dataModels.race  = ImagineRaceData;
	CONFIG.Item.dataModels.class = ImagineClassData;
	CONFIG.Item.dataModels.weapon = ImagineWeaponData;
	CONFIG.Item.dataModels.armor = ImagineArmorData;
	CONFIG.Item.dataModels.equipment = ImagineEquipmentData;

	// A creature's own item types. An attack is one of its natural strikes, a power an innate
	// spell or invocation, and a trait an ability, disability or immunity.
	CONFIG.Item.dataModels.creatureAttack = ImagineCreatureAttackData;
	CONFIG.Item.dataModels.power = ImaginePowerData;
	CONFIG.Item.dataModels.trait = ImagineTraitData;

	// @MARKER SHEET REGISTRATION
	// The default core sheet is unregistered so it does not offer itself alongside ours.
	foundry.documents.collections.Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);
	foundry.documents.collections.Actors.registerSheet("imagine-rpg", ImagineCharacterSheet, {
		types: ["character"],
		makeDefault: true,
		label: "IMAGINE.Sheet.Character"
	});

	foundry.documents.collections.Actors.registerSheet("imagine-rpg", ImagineCreatureSheet, {
		types: ["creature"],
		makeDefault: true,
		label: "IMAGINE.Sheet.Creature"
	});

	// @MARKER SYSTEM API
	// Exposed so the content import can be run from a macro or the console at any time,
	// not only when first prompted:  game.imagine.importContent()
	// @MARKER COMBAT
	// Initiative is the second of the round a combatant starts acting in: a d10 plus the better
	// of their Agility and Intelligence adjustments and their armour. Lower is earlier, so the
	// tracker sorts lowest first -- see combat/combat-document.mjs.
	CONFIG.Combat.documentClass = ImagineCombat;
	CONFIG.Combat.initiative = { formula: "1d10 + @combat.initiativeMod", decimals: 0 };
	registerAttackCardListeners();

	game.imagine = {
		importContent: importAllContent,
		rollWeaponAttack: rollWeaponAttack,
		rollCreatureAttack: rollCreatureAttack,
		getAvailabilityRules: getAvailabilityRules,
		explainAvailability: explainAvailability
	};

	// Records whether the content has ever been imported into this world, so the first-launch
	// prompt does not keep reappearing once it has been dealt with.
	game.settings.register("imagine-rpg", "contentImported", {
		scope: "world",
		config: false,
		type: Boolean,
		default: false
	});

	// @MARKER CONTENT AVAILABILITY
	// Sourcebook and magic switches, individual overrides, and the check that stops disallowed
	// content being added to a character. See module/availability.mjs.
	registerAvailabilitySettings();
	registerAvailabilityEnforcement();

	game.settings.registerMenu("imagine-rpg", "availabilityMenu", {
		name: "Content Availability",
		label: "Configure",
		hint: "Switch sourcebooks and magic on or off for this campaign, and allow or forbid individual items such as a class.",
		icon: "fa-solid fa-book-open",
		type: ImagineAvailabilityConfig,
		restricted: true
	});
});

// @MARKER FIRST LAUNCH
// The content packs are built from JSON at runtime rather than compiled ahead of time, so a
// fresh world starts with none. Offer to build them once, and let the Game Master decline
// without being asked again.
Hooks.once("ready", async function () {
	if (!game.user.isGM) { return; }
	if (game.settings.get("imagine-rpg", "contentImported")) { return; }

	var tmpconfirmed = await foundry.applications.api.DialogV2.confirm({
		window: { title: "Imagine RPG" },
		content: `<p>This world has no Imagine content yet.</p>
		          <p>Build the compendium packs now? This creates roughly 2,800 skills, races,
		          classes, weapons, armour and equipment entries, and takes a moment.</p>
		          <p>You can run it later from a macro with
		          <code>game.imagine.importContent()</code>.</p>`,
		rejectClose: false,
		modal: true
	});

	// Recorded either way. Declining is an answer, and repeating the question is rude.
	await game.settings.set("imagine-rpg", "contentImported", true);
	if (tmpconfirmed) { await importAllContent(); }
});

// @MARKER ADD NEW sheet specific functions HERE
// @END (CODE)
