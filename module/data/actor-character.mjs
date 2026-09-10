// @START (CODE)
// @MARKER CHARACTER ACTOR DATA MODEL
//==================================================================================================================
// Schema for a player character in the Imagine Role Playing System.
//
// Field names follow the Roll20 sheet's attributes where they map cleanly, so this can be
// diffed against the original sheet-worker. Anything DERIVED is listed in the comments but
// is NOT stored here -- it is computed in prepareDerivedData() from the attribute tables.
//
// Derivation order matters and is documented in docs/DATA-MODEL.md section 9. The short
// version: attributes -> saves and modifiers -> Endurance -> Shock -> body area maxima.
// Changing Endurance recomputes every body area, exactly as changeCharacteristics() does
// in the original sheet.
//==================================================================================================================

const fields = foundry.data.fields;

	// This is the function which builds the schema shared by all twelve attributes.
	// Rating is the stored value; permMod and tempMod are the permanent and temporary
	// adjustments the original sheet kept in attr_perm_*_mod and attr_tmp_*_mod.
	// The save percentage and every derived modifier come from the attribute tables.
	function attributeField(label) {
		return new fields.SchemaField({
			rating:  new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, max: 30, label: label }),
			permMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			tempMod: new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds the schema for a derived characteristic.
	// Endurance, Perception, Affinity and Fortune all work the same way: a base value
	// calculated from attributes, plus a racial modifier, plus bonuses rolled on title
	// advancement, plus permanent and temporary adjustments.
	function characteristicField() {
		return new fields.SchemaField({
			titleBonus: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			raceMod:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
			permMod:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
			tempMod:    new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds the schema for one resistance track.
	// The base chance comes from attributes and race; misc is the manual adjustment,
	// standing in for the sheet's various *_other fields.
	function resistanceField() {
		return new fields.SchemaField({
			misc: new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds one movement rate. The Imagine system tracks
	// every movement mode at three scales at once: distance per hour, per 10 seconds
	// (one combat round) and per second.
	function movementRateField() {
		return new fields.SchemaField({
			hourly: new fields.NumberField({ required: true, initial: 0 }),
			tenSec: new fields.NumberField({ required: true, initial: 0 }),
			oneSec: new fields.NumberField({ required: true, initial: 0 })
		});
	}


export default class ImagineCharacterData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER IDENTITY
			// Race and class point at compendium items rather than storing loose strings, so a
			// campaign can enable or disable sourcebooks without orphaning character data.
			identity: new fields.SchemaField({
				race:        new fields.DocumentUUIDField({ type: "Item", nullable: true, initial: null }),
				class:       new fields.DocumentUUIDField({ type: "Item", nullable: true, initial: null }),
				classType:   new fields.StringField({ required: true, initial: "" }),
				title:       new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				goal:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
				exp:         new fields.NumberField({ required: true, integer: true, initial: 0 }),
				alignment:   new fields.StringField({ required: true, initial: "" }),
				tendencies:  new fields.StringField({ required: true, initial: "" }),
				gender:      new fields.StringField({ required: true, initial: "" })
				// DERIVED: titleName (from classtitledict), nextGoalExp (from goalupdict),
				//          and the per-race attribute caps.
			}),

			// @MARKER ATTRIBUTES
			// The twelve attributes, grouped physical / mental / personal / mystical as the
			// Player's Guide presents them. Listed out individually rather than generated in a
			// loop so the set is visible at a glance.
			attributes: new fields.SchemaField({
				str: attributeField("Strength"),
				agl: attributeField("Agility"),
				vit: attributeField("Vitality"),
				int: attributeField("Intelligence"),
				wis: attributeField("Wisdom"),
				knw: attributeField("Knowledge"),
				app: attributeField("Appearance"),
				chm: attributeField("Charm"),
				soc: attributeField("Social Class"),
				aur: attributeField("Aura"),
				pty: attributeField("Piety"),
				wil: attributeField("Will Force")
				// DERIVED per attribute: max, save, and that attribute's table modifiers
				// (str -> meleeAttack/meleeDamage/loadLimit/weaponSpeed, and so on).
			}),

			// @MARKER CHARACTERISTICS
			// Endurance is the average of the three physical attributes rounded up, then
			// modified. Perception, Affinity and Fortune work the same way off other groupings.
			characteristics: new fields.SchemaField({
				endurance:  characteristicField(),
				perception: characteristicField(),
				affinity:   characteristicField(),
				fortune:    characteristicField()
			}),

			// @MARKER RESISTANCES
			resistances: new fields.SchemaField({
				magic:    resistanceField(),
				illusion: resistanceField(),
				control:  resistanceField(),
				poison:   resistanceField(),
				disease:  resistanceField()
			}),

			// @MARKER BODY AND WOUNDS
			// Imagine does not use a single hit point pool. Endurance is distributed across the
			// body areas defined by the character's race, and damage is tracked per area.
			// bodyType names the chart in use; transformation swaps the whole chart, which is
			// why areas is a list rather than a fixed set of humanoid slots.
			body: new fields.SchemaField({
				bodyType: new fields.StringField({ required: true, initial: "Humanoid" }),
				areas: new fields.ArrayField(new fields.SchemaField({
					key:       new fields.StringField({ required: true }),
					name:      new fields.StringField({ required: true }),
					type:      new fields.StringField({ required: true, initial: "" }),
					number:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
					damage:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
					effect:    new fields.StringField({ required: true, initial: "" })
					// DERIVED: enduranceMax = character Endurance x this area's race chart multiplier.
					// Armour, clothing and shield layers are resolved from equipped items rather
					// than stored here, so an item moving between areas cannot desynchronise.
				}))
				// DERIVED: shock = Endurance x 3.
			}),

			// @MARKER MOVEMENT
			movement: new fields.SchemaField({
				walk:    movementRateField(),
				jog:     movementRateField(),
				run:     movementRateField(),
				special: movementRateField(),
				specialName: new fields.StringField({ required: true, initial: "" }),
				travelHours: new fields.NumberField({ required: true, initial: 0 }),
				restHours:   new fields.NumberField({ required: true, initial: 0 }),
				jumpStand:   new fields.NumberField({ required: true, initial: 0 }),
				jumpUp:      new fields.NumberField({ required: true, initial: 0 })
			}),

			// @MARKER PHYSICAL FEATURES
			physical: new fields.SchemaField({
				heightFeet:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				heightInches: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				frame:        new fields.StringField({ required: true, initial: "" }),
				weight:       new fields.NumberField({ required: true, initial: 0 }),
				hair:         new fields.StringField({ required: true, initial: "" }),
				bodyCovering: new fields.StringField({ required: true, initial: "" }),
				eyes:         new fields.StringField({ required: true, initial: "" }),
				skin:         new fields.StringField({ required: true, initial: "" }),
				handedness:   new fields.StringField({ required: true, initial: "" }),
				age:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
				apparentAge:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
				maxAge:       new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER LANGUAGES
			// How many a character may know is capped by Intelligence; the sheet tracked
			// speaking and writing separately because they have separate limits.
			languages: new fields.ArrayField(new fields.SchemaField({
				name:  new fields.StringField({ required: true, initial: "" }),
				speak: new fields.BooleanField({ required: true, initial: true }),
				write: new fields.BooleanField({ required: true, initial: false })
			})),

			// @MARKER WEALTH
			wealth: new fields.SchemaField({
				copper:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				silver:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				gold:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
				platinum: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				special:  new fields.StringField({ required: true, initial: "" }),
				gems:     new fields.StringField({ required: true, initial: "" }),
				jewelry:  new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER COMBAT ADJUSTMENTS
			// Everything granted by race, class, magic or condition arrives as an Active Effect.
			// These misc fields are the manual override the Game Master can always reach for,
			// and stand in for the original sheet's combat_mod_*_other attributes.
			combat: new fields.SchemaField({
				meleeMisc:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
				missileMisc:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
				damageMisc:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
				defenseMisc:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
				initiativeMisc: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				skillMisc:      new fields.NumberField({ required: true, integer: true, initial: 0 })
			}),

			// @MARKER NOTES
			biography: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW character data model functions HERE
}
// @END (CODE)
