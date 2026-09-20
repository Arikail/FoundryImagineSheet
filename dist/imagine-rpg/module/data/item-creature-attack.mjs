// @START (CODE)
// @MARKER CREATURE ATTACK ITEM DATA MODEL
//==================================================================================================================
// Schema for one of a creature's natural attacks -- a bite, a claw, a breath, a gaze.
//
// This is NOT a weapon. His sheet stores a creature's attacks in an encoded string of its own,
// read by setCreatureAttack (sheet-worker.js:179472), where attacks are separated by "|", the
// fields of one attack by "^", and each attack may carry up to three rider effects appended
// after "@":
//
//     Bite^Melee^3^^2d6^Cutting@Venom^If hit^the victim swells^1d6^Poison^3^Periodic(Minutes)
//     \___________ main block ___________/ \_____________ rider effect ______________________/
//
// The fields of the main block, in his order, are name, type, speed, minimum speed, damage and
// damage type. A minimum speed of 0 or blank means the speed itself is the minimum, which is
// what his code substitutes (sheet-worker.js:179489).
//
// An attack is an Item rather than a field on the creature so that a Bite can live in a
// compendium and be dropped on anything with teeth, and so each attack can carry its own roll
// button. Powers are a separate item type: a Power is an innate spell or invocation, not a
// strike. See docs/DECISIONS.md, "Creature schema: the three open design calls, resolved".
//==================================================================================================================

import {
	CREATURE_ATTACK_TYPES, CREATURE_DAMAGE_TYPES,
	EFFECT_TRIGGERS, EFFECT_DAMAGE_TYPES, EFFECT_DURATION_TYPES
} from "../creature-tables.mjs";

const fields = foundry.data.fields;

	// This is the function which builds one rider effect -- the poison on a bite, the disease on
	// a claw, the burning that follows a breath. Seven fields, in the order his encoded string
	// carries them (getAttackEffectListing, sheet-worker.js:175221).
	//
	// A trigger of "Auto" needs no hit and allows no save; every other value names the roll that
	// has to fail first. Damage and duration are dice strings, since his data writes "1d6" and
	// "3d4" as often as a flat number.
	function attackEffectField() {
		return new fields.SchemaField({
			name:         new fields.StringField({ required: true, initial: "", label: "Effect Name" }),
			trigger:      new fields.StringField({ required: true, initial: "If hit",
			                  choices: EFFECT_TRIGGERS, label: "Trigger" }),
			description:  new fields.StringField({ required: true, initial: "", label: "Description" }),
			damage:       new fields.StringField({ required: true, initial: "", label: "Damage" }),
			damageType:   new fields.StringField({ required: true, initial: "",
			                  choices: ["", ...EFFECT_DAMAGE_TYPES], label: "Damage Type" }),
			duration:     new fields.StringField({ required: true, initial: "", label: "Duration" }),
			durationType: new fields.StringField({ required: true, initial: "",
			                  choices: ["", ...EFFECT_DURATION_TYPES], label: "Duration Type" })
		});
	}


export default class ImagineCreatureAttackData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER ATTACK VALUES
			// The type decides how the attack resolves: most roll down the attack chart, Direct,
			// Gaze and Voice hit without a roll, and Touch needs a 10 or better plus the Agility
			// modifier. The area shapes -- Bolt, Cloud, Cone and Glob -- take their reach from the
			// creature's Endurance. See CREATURE_ATTACK_TYPES in module/creature-tables.mjs.
			attackType: new fields.StringField({ required: true, initial: "Melee",
			                choices: Object.keys(CREATURE_ATTACK_TYPES), label: "Attack Type" }),

			damage:     new fields.StringField({ required: true, initial: "", label: "Damage" }),
			damageType: new fields.StringField({ required: true, initial: "",
			                choices: ["", ...CREATURE_DAMAGE_TYPES], label: "Damage Type" }),

			// Which limb the attack comes from, when that means anything at all. Blank is "not
			// hand-based" -- a bite, a tail slap, a breath -- and is never off-hand, unlike a
			// weapon's `hand`, which is never blank because every weapon is held in something.
			// Only Left, Right or Both (an off-hand claw, a two-fisted slam) make an attack
			// eligible for the off-hand penalty at all; see isOffhandWeapon in combat-rules.mjs,
			// which this reuses once the caller has ruled out blank.
			hand: new fields.StringField({ required: true, initial: "",
			                choices: ["", "left", "right", "both"], label: "Hand" }),

			// How many of the round's ten seconds the attack takes, and the floor it can be
			// driven down to. His Configurator offers 1 to 10, and "S" for an attack with no
			// ordinary timing -- one that happens during an engagement rather than on a count.
			speed:        new fields.NumberField({ required: true, integer: true, initial: 3, min: 0, label: "Seconds" }),
			minSpeed:     new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, label: "Minimum Seconds" }),
			speedSpecial: new fields.BooleanField({ required: true, initial: false, label: "Special Timing" }),

			// @MARKER RIDER EFFECTS
			// At most three, which is what his encoded string carries and his Configurator
			// authors. Left as a list rather than three fixed slots because nothing depends on
			// their position.
			effects: new fields.ArrayField(attackEffectField()),

			// @MARKER PROVENANCE
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW creature attack data model functions HERE

	// This is the function which gives the attack's effective minimum speed. A minimum of 0 or
	// blank means the speed is its own minimum, exactly as setMainCreatureAttack substitutes it.
	get effectiveMinSpeed() {
		return (parseInt(this.minSpeed) || 0) || (parseInt(this.speed) || 0);
	}
}
// @END (CODE)
