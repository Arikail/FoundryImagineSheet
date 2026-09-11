// @START (CODE)
// @MARKER WEAPON ITEM DATA MODEL
//==================================================================================================================
// Schema for a weapon.
//
// Fields map onto the 18 columns of weaponvalueslist in the original sheet-worker, whose
// header comment documents the layout and which was cross-checked against how the code
// consumes the row (tempweaponcombatvalues, sheet-worker.js:83991-84023).
//
// A weapon can be used in up to four attack modes -- missile, thrust, cut and smash -- and
// each carries its own modifier. The source data writes "Non" where a mode is unavailable to
// that weapon, which is why each mode has an "available" flag rather than a modifier of zero:
// a dagger with no smash mode is not the same as one that smashes at +0.
//==================================================================================================================

const fields = foundry.data.fields;

	// This is the function which builds one attack mode. available is false where the source
	// data reads "Non", meaning the weapon cannot be used that way at all.
	function attackModeField() {
		return new fields.SchemaField({
			available: new fields.BooleanField({ required: true, initial: false }),
			mod:       new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}


export default class ImagineWeaponData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER COMBAT VALUES
			damage: new fields.StringField({ required: true, initial: "", label: "Damage" }),

			// Speed is how long a swing takes in the 10 second round; minSpeed is the floor it
			// can be driven down to no matter how much Strength or Agility shortens it.
			speed:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
			minSpeed: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			length:   new fields.StringField({ required: true, initial: "" }),

			// Some weapons have no ordinary swing speed at all -- a lance depends on the
			// charge, caltrops are placed rather than swung, a garrote is a grapple. The
			// source writes "S" for these, and the Game Master sets the timing in play.
			speedSpecial: new fields.BooleanField({ required: true, initial: false }),

			// A dual-headed weapon carries a second set of values for its other head, which
			// the source records in parentheses: an Axe Hammer is "5d6(2d6)" damage at speed
			// "8(6)" -- the axe head at 5d6 speed 8, the hammer head at 2d6 speed 6.
			alternateHead: new fields.SchemaField({
				exists:   new fields.BooleanField({ required: true, initial: false }),
				damage:   new fields.StringField({ required: true, initial: "" }),
				speed:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
				minSpeed: new fields.NumberField({ required: true, integer: true, initial: 0 })
			}),

			// @MARKER ATTACK MODES
			missile: attackModeField(),
			thrust:  attackModeField(),
			cut:     attackModeField(),
			smash:   attackModeField(),

			// Flat modifier this weapon applies to combat skill rolls, e.g. "+5%".
			skillsMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),

			// @MARKER CONSTRUCTION
			// structuralStrength is how much punishment the weapon takes before it breaks --
			// NOT a Strength requirement to wield it. The original sheet scales this by the
			// weapon's construction quality: [Tempered] x1.5, [Double Head] x1.2, [Good] x1.1,
			// [Poor] x0.9, [Shoddy] x0.75, [Serrated] x0.33.
			structuralStrength: new fields.NumberField({ required: true, initial: 0 }),
			weight:   new fields.NumberField({ required: true, initial: 0 }),
			type:     new fields.StringField({ required: true, initial: "" }),  // Blade, Bludgeon, ...
			material: new fields.StringField({ required: true, initial: "" }),

			// @MARKER RANGES
			// Blank on a melee weapon. The source writes "-" for a range band that does not apply.
			ranges: new fields.SchemaField({
				pointBlank: new fields.StringField({ required: true, initial: "" }),
				short:      new fields.StringField({ required: true, initial: "" }),
				medium:     new fields.StringField({ required: true, initial: "" }),
				long:       new fields.StringField({ required: true, initial: "" }),
				extreme:    new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER CARRIED STATE
			// The original sheet tracked three places a thing could be: carried and ready,
			// stowed on a mount, or left in a stash. Only equipped weight counts fully toward
			// encumbrance.
			location:  new fields.StringField({ required: true, initial: "carried",
			               choices: ["equipped", "carried", "mount", "stash"] }),
			quantity:  new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),
			twoHanded: new fields.BooleanField({ required: true, initial: false }),
			offhand:   new fields.BooleanField({ required: true, initial: false }),

			// @MARKER PROVENANCE
			cost:        new fields.StringField({ required: true, initial: "" }),
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW weapon data model functions HERE
}
// @END (CODE)
