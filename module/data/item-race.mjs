// @START (CODE)
// @MARKER RACE ITEM DATA MODEL
//==================================================================================================================
// Schema for a race.
//
// Fields map onto the 62 columns of raceStatsAndMoveDetails in the original sheet-worker.
// That dictionary carries no column-header comment, so the layout was recovered by reading
// how the code consumes the row (tempRaceStatMoves, sheet-worker.js:33697-33758) rather than
// transcribed -- see tools/extract/column_maps.py.
//
// A race supplies three kinds of thing:
//   1. modifiers to attributes, characteristics and resistances
//   2. a per-race cap on each attribute, which is separate from and stricter than the
//      being-type cap that title confers
//   3. movement rates, at the three scales the system tracks
//
// These are read directly by the character rather than being turned into Active Effects.
// Effects are for things that come and go -- spells, conditions, injuries. A race is
// permanent character definition, the original sheet stores it as plain fields
// (race_per_mod, race_aff_mod and so on), and the character schema already has raceMod slots
// waiting for it.
//==================================================================================================================

const fields = foundry.data.fields;

	// This is the function which builds a modifier field, used for the twelve attribute
	// modifiers and the characteristic and resistance modifiers.
	function modField() {
		return new fields.NumberField({ required: true, integer: true, initial: 0 });
	}

	// This is the function which builds a per-race attribute cap. A race may not exceed this
	// even where the character's title would otherwise allow a higher rating.
	function limitField() {
		return new fields.NumberField({ required: true, integer: true, initial: 20, min: 0, max: 30 });
	}

	// This is the function which builds one movement rate. Every movement mode is tracked at
	// three scales at once: per hour, per 10 seconds (one combat round) and per second.
	function movementRateField() {
		return new fields.SchemaField({
			hourly: new fields.NumberField({ required: true, initial: 0 }),
			tenSec: new fields.NumberField({ required: true, initial: 0 }),
			oneSec: new fields.NumberField({ required: true, initial: 0 })
		});
	}


export default class ImagineRaceData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER ATTRIBUTE MODIFIERS
			// Applied to the character's attribute ratings.
			attributeMods: new fields.SchemaField({
				str: modField(), agl: modField(), vit: modField(),
				int: modField(), wis: modField(), knw: modField(),
				app: modField(), chm: modField(), soc: modField(),
				aur: modField(), pty: modField(), wil: modField()
			}),

			// @MARKER ATTRIBUTE CAPS
			// The highest rating a member of this race may reach in each attribute.
			attributeLimits: new fields.SchemaField({
				str: limitField(), agl: limitField(), vit: limitField(),
				int: limitField(), wis: limitField(), knw: limitField(),
				app: limitField(), chm: limitField(), soc: limitField(),
				aur: limitField(), pty: limitField(), wil: limitField()
			}),

			// @MARKER ENDURANCE
			// Endurance at creation, and how much is gained on each title advance. The title
			// gain is rolled rather than fixed, which is why the dice and maximum are carried
			// separately from the flat modifier.
			endurance: new fields.SchemaField({
				startFormula: new fields.StringField({ required: true, initial: "" }),
				startMod:     modField(),
				titleFormula: new fields.StringField({ required: true, initial: "" }),
				titleDice:    new fields.StringField({ required: true, initial: "" }),
				titleMax:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
				titleMod:     modField()
			}),

			// @MARKER CHARACTERISTIC AND RESISTANCE MODIFIERS
			characteristicMods: new fields.SchemaField({
				perception: modField(),
				affinity:   modField(),
				fortune:    modField()
			}),

			resistanceMods: new fields.SchemaField({
				magic:    modField(),
				illusion: modField(),
				control:  modField(),
				poison:   modField(),
				disease:  modField()
			}),

			// @MARKER MOVEMENT
			// specialName holds what the special movement mode actually is -- flying,
			// swimming, scurrying and so on. The multiplier and modifier fields exist because
			// some races derive their special rate from another rate rather than stating it
			// outright.
			movement: new fields.SchemaField({
				speedMultiplier: new fields.NumberField({ required: true, initial: 1 }),
				walk: movementRateField(),
				jog:  movementRateField(),
				run:  movementRateField(),
				specialName: new fields.StringField({ required: true, initial: "" }),
				special: new fields.SchemaField({
					hourly:           new fields.StringField({ required: true, initial: "" }),
					hourlyMultiplier: new fields.NumberField({ required: true, initial: 0 }),
					hourlyMod:        new fields.NumberField({ required: true, initial: 0 }),
					tenSec:           new fields.StringField({ required: true, initial: "" }),
					tenSecMultiplier: new fields.NumberField({ required: true, initial: 0 }),
					tenSecMod:        new fields.NumberField({ required: true, initial: 0 }),
					oneSec:           new fields.StringField({ required: true, initial: "" }),
					oneSecMultiplier: new fields.NumberField({ required: true, initial: 0 }),
					oneSecMod:        new fields.NumberField({ required: true, initial: 0 })
				}),
				jumpStand: new fields.NumberField({ required: true, initial: 0 }),
				jumpUp:    new fields.NumberField({ required: true, initial: 0 })
			}),

			// @MARKER TRAITS
			// formless marks a race with no fixed body, which matters to the body chart and to
			// transformation. canSwim is stored per race because it is not universal.
			formless: new fields.BooleanField({ required: true, initial: false }),
			canSwim:  new fields.BooleanField({ required: true, initial: false }),

			// The body chart this race uses, by name -- one of the 45 in BODY_CHARTS
			// (module/combat-tables.mjs), taken from getRacialBodyType in the original sheet.
			// Evoke mutations (extra torsos, limbs, wings, tails) add areas on top of the
			// chart in his sheet; that part is not modelled yet.
			bodyType: new fields.StringField({ required: true, initial: "Humanoid" }),

			// @MARKER PROVENANCE
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW race data model functions HERE
}
// @END (CODE)
