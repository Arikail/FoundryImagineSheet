// @START (CODE)
// @MARKER SYSTEM ENTRY POINT
//==================================================================================================================
// Imagine Role Playing System for Foundry VTT.
//
// Converted from the Roll20 sheet by W. Michael Tenery III, with permission. Where this code
// and the printed rulebooks disagree, the Roll20 sheet is the source of truth -- see
// docs/DECISIONS.md.
//
// Layer 0 status: data model schemas only. Derived values (attribute saves and modifiers,
// Endurance, Shock, body area maxima, skill chances) are documented in the schemas and in
// docs/DATA-MODEL.md section 9 but are NOT implemented yet.
//==================================================================================================================

import ImagineCharacterData from "./data/actor-character.mjs";
import ImagineSkillData from "./data/item-skill.mjs";
import ImagineRaceData from "./data/item-race.mjs";
import ImagineClassData from "./data/item-class.mjs";
import ImagineWeaponData from "./data/item-weapon.mjs";
import ImagineArmorData from "./data/item-armor.mjs";
import ImagineEquipmentData from "./data/item-equipment.mjs";
import ImagineCharacterSheet from "./sheets/actor-character-sheet.mjs";

// @MARKER SYSTEM CONSTANTS
export const IMAGINE = {

	// The twelve attributes, in the order the Player's Guide presents them, grouped
	// physical / mental / personal / mystical.
	attributes: {
		str: "IMAGINE.Attribute.Strength",
		agl: "IMAGINE.Attribute.Agility",
		vit: "IMAGINE.Attribute.Vitality",
		int: "IMAGINE.Attribute.Intelligence",
		wis: "IMAGINE.Attribute.Wisdom",
		knw: "IMAGINE.Attribute.Knowledge",
		app: "IMAGINE.Attribute.Appearance",
		chm: "IMAGINE.Attribute.Charm",
		soc: "IMAGINE.Attribute.SocialClass",
		aur: "IMAGINE.Attribute.Aura",
		pty: "IMAGINE.Attribute.Piety",
		wil: "IMAGINE.Attribute.WillForce"
	},

	// Skill types as they appear in skilldict. Magical and Divine are the two the
	// magic switches filter on.
	skillTypes: ["Magical", "Divine", "Combat", "Disciplined", "Informational", "Stealth/Intrusive"],

	// Armour flexibility classes, innermost-first. The first layer worn must always be
	// flexible, each layer may only sit over something at least as flexible as itself, and
	// rigid may never stack on rigid. Clothing is its own class and does not consume a
	// layer when its armour value is 3 or less.
	armorFlexibility: ["Clothing", "Flexible", "Semi-Flexible", "Rigid"],

	// Maximum attribute rating by being type, from the Master's Manual. A character's
	// title decides which cap applies.
	attributeCaps: {
		mundane:   23,   // title 0
		mortal:    25,   // titles 1-10
		archMortal: 27,  // titles 11-15
		deity:     30    // title 16+
	}
};

// getAttribSave and getAttributeCap live on ImagineCharacterData as static functions, so the
// rule and the data it applies to stay in one place. Reach them via
// ImagineCharacterData.getAttribSave(rating).

// @MARKER SYSTEM INITIALISATION
Hooks.once("init", function () {
	console.log("Imagine RPG | Initialising system");

	CONFIG.IMAGINE = IMAGINE;

	// Register the data models against the document subtypes declared in system.json.
	CONFIG.Actor.dataModels.character = ImagineCharacterData;
	CONFIG.Item.dataModels.skill = ImagineSkillData;
	CONFIG.Item.dataModels.race  = ImagineRaceData;
	CONFIG.Item.dataModels.class = ImagineClassData;
	CONFIG.Item.dataModels.weapon = ImagineWeaponData;
	CONFIG.Item.dataModels.armor = ImagineArmorData;
	CONFIG.Item.dataModels.equipment = ImagineEquipmentData;

	// @MARKER SHEET REGISTRATION
	// The default core sheet is unregistered so it does not offer itself alongside ours.
	foundry.documents.collections.Actors.unregisterSheet("core", foundry.applications.sheets.ActorSheetV2);
	foundry.documents.collections.Actors.registerSheet("imagine-rpg", ImagineCharacterSheet, {
		types: ["character"],
		makeDefault: true,
		label: "IMAGINE.Sheet.Character"
	});

	// The creature actor is still a placeholder. Its schema is deliberately empty until the
	// Bestiary source material is in hand -- the creature sheet normalises to roughly 1,455
	// distinct fields, so guessing at its shape now would mean redoing it. Declared here so
	// creature actors remain creatable in the meantime.
	CONFIG.Actor.dataModels.creature = class extends foundry.abstract.TypeDataModel {
		static defineSchema() { return {}; }
	};
});

// @MARKER ADD NEW sheet specific functions HERE
// @END (CODE)
