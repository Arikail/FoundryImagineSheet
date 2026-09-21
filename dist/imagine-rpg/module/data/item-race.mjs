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

			// @MARKER SLIGHT PHYSIQUE
			// What changes for a member of this race who is of slight build, where anything does.
			//
			// Slight Physique in the original rules was the modifier carried by every female of
			// every race. When he built the Roll20 sheet he cut it loose from gender and made it a
			// choice any character may take -- so a stronger female or a slighter male are both
			// ordinary characters now. He confirmed this on 2026-09-20.
			//
			// For all but a handful of races it is only -1 Strength and +1 Agility, which is
			// applied to the ratings and needs nothing here. Four races carry a second, larger
			// difference: FAIRY, FAIRY(DARK), PODLING and SPORELING have WINGS in the slight form
			// and none in the ordinary one, and the two Fairies trade that flight for extra racial
			// skills -- a wingless Dark Fairy gains Climb and Wood Lore +10%, a wingless Fairy
			// gains Climb and Cover Tracks. That trade is the reason this block exists: it cannot
			// be derived from the ordinary row, so both forms are carried and the character's own
			// choice picks between them.
			//
			// `hasVariant` is false for the hundred-odd races where the two forms are identical,
			// and the rest of the block is then ignored.
			slightPhysique: new fields.SchemaField({
				hasVariant:   new fields.BooleanField({ required: true, initial: false }),
				specialName:  new fields.StringField({ required: true, initial: "" }),
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
				// Empty where the slight form's skills match the ordinary form's.
				racialSkills: new fields.ArrayField(new fields.SchemaField({
					name:  new fields.StringField({ required: true, initial: "" }),
					bonus: new fields.StringField({ required: true, initial: "" })
				}), { initial: [] }),
				canSwim: new fields.BooleanField({ required: true, initial: false })
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

			// @MARKER RACIAL SKILLS
			// The racial skills a member of this race may choose from, with his bonus on each
			// ("+10%", or blank), from raceSkillDetailValues (getRaceSkillDetails). How MANY may
			// be chosen is not the race's -- Knowledge sets it. The note is his third column, which
			// is empty for every race but one ("Evoke (special type: Tree)" for the Dryad).
			racialSkills: new fields.ArrayField(new fields.SchemaField({
				name:  new fields.StringField({ required: true, initial: "" }),
				bonus: new fields.StringField({ required: true, initial: "" })
			})),
			racialSkillNote: new fields.StringField({ required: true, initial: "" }),

			// @MARKER COLOURING
			// The hair, eye and skin colours a member of this race is found in, from his
			// raceFeatureHair / raceFeatureEyes / raceFeatureSkin. Offered as choices at character
			// creation rather than enforced: his sheet lists them and lets the player type anything.
			// A race with none -- a construct, an elemental -- carries an empty list, which is an
			// answer rather than a gap.
			features: new fields.SchemaField({
				hair: new fields.ArrayField(new fields.StringField()),
				eyes: new fields.ArrayField(new fields.StringField()),
				skin: new fields.ArrayField(new fields.StringField())
			}),

			// @MARKER RACIAL ABILITIES
			// By name, from raceFeatureAbilities (getRacialFeatureAbilities). These are the names
			// his trait compendia describe (abilities, disabilities, immunities). They are listed,
			// not applied: his racial mechanics switch (setTempRacialAbilities) is not ported yet.
			abilities:    new fields.ArrayField(new fields.StringField()),
			disabilities: new fields.ArrayField(new fields.StringField()),
			immunities:   new fields.ArrayField(new fields.StringField()),

			// @MARKER MIXED RACES
			// The races this one can have children with, from racefertiledict -- the list his
			// Half Race picker offers as the second race. Empty means it cannot breed outside itself.
			fertileWith: new fields.ArrayField(new fields.StringField()),

			// @MARKER AGES
			// From getAge: the range a new character's age is rolled within, and the maximum age,
			// which is a number of years or a word ("Immortal") -- so it is text.
			ages: new fields.SchemaField({
				startLow:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
				startHigh: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				maxAge:    new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER PROVENANCE
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW race data model functions HERE
}
// @END (CODE)
