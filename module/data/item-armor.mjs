// @START (CODE)
// @MARKER ARMOUR ITEM DATA MODEL
//==================================================================================================================
// Schema for armour, clothing and shields.
//
// Fields map onto the 22 columns of armorvalueslist in the original sheet-worker: material,
// flexibility class, an armour value for each of nineteen body locations, and weight.
//
// All three kinds share one item type because the layering engine has to walk them together.
// Flexibility is what separates them mechanically, and the source data treats Clothing as a
// flexibility class of its own alongside Flexible, Semi-Flexible and Rigid.
//
// The layering rules (Player's Guide, Layering Armor):
//   - up to three layers of armour; the first worn must be flexible
//   - each layer may only sit over material at least as flexible as itself
//   - rigid may never stack on rigid
//   - shields are a fourth layer, and some other objects also qualify
//   - clothing of 3 armour value or less does not consume a layer at all, and grants one
//     free layer above or below armour
//==================================================================================================================

const fields = foundry.data.fields;

	// This is the function which builds the armour value for one body location.
	function coverageField() {
		return new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 });
	}


export default class ImagineArmorData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER CONSTRUCTION
			// flexibility drives the whole layering engine -- see the rules quoted above.
			material:    new fields.StringField({ required: true, initial: "" }),

			// Some pieces are composite, built from two materials of different flexibility --
			// a helm with a rigid shell over a flexible lining, for instance. The source
			// records these as "Rigid/Flexible", "Rigid/Semi-Flexible", "Rigid/Rigid" or
			// "Mixed".
			//
			// This is the data encoding of a real rule: "Some pieces of armor come with their
			// own padding or flexible layer built in, such as skull caps and some gauntlets.
			// In these cases, it is acceptable to use one layer of rigid armor against the
			// body." A composite piece with a flexible inner face may therefore sit in the
			// first layer, which a plain rigid piece may not.
			//
			// "Rigid/Rigid" looks contradictory against the no-rigid-on-rigid rule, but the
			// rules allow it: "A few suits allow two sections of rigid armor because they do
			// not touch."
			flexibility: new fields.StringField({ required: true, initial: "Flexible",
			                 choices: ["Clothing", "Flexible", "Semi-Flexible", "Rigid",
			                           "Rigid/Flexible", "Rigid/Semi-Flexible", "Rigid/Rigid",
			                           "Mixed"] }),

			// Shields are worn over armour as a fourth layer and are used actively with the
			// Shield Parry skill, so they are flagged rather than being their own item type.
			isShield: new fields.BooleanField({ required: true, initial: false }),

			// @MARKER COVERAGE
			// Armour value at each body location. Zero means this piece does not cover it.
			// These nineteen locations are the humanoid mapping; a non-humanoid body has its
			// own chart and its own armour.
			coverage: new fields.SchemaField({
				head:          coverageField(),
				neck:          coverageField(),
				shoulderLeft:  coverageField(),
				shoulderRight: coverageField(),
				torsoUpper:    coverageField(),
				torsoMid:      coverageField(),
				torsoLower:    coverageField(),
				armLeft:       coverageField(),
				armRight:      coverageField(),
				forearmLeft:   coverageField(),
				forearmRight:  coverageField(),
				handLeft:      coverageField(),
				handRight:     coverageField(),
				thighLeft:     coverageField(),
				thighRight:    coverageField(),
				shinLeft:      coverageField(),
				shinRight:     coverageField(),
				footLeft:      coverageField(),
				footRight:     coverageField()
			}),

			// Locations whose armour value is not fixed on the piece but derived from the
			// material it is made of -- the source writes "S" there rather than a number.
			// Giant-material armour (chitin, scales, hide) works this way, resolved in the
			// original sheet by getArmorGiantArmorValue.
			//
			// The location names are kept rather than being flattened to zero, because a zero
			// would assert the piece offers no protection there, which is false. Resolving
			// these needs the giant-material rules, which are not implemented yet.
			coverageFromMaterial: new fields.ArrayField(new fields.StringField(), { initial: [] }),

			// @MARKER PENALTIES
			// Worn armour costs the wearer skill, defence, initiative and speed. Values come
			// from armorpenaltydict in the original sheet and are negative.
			penalties: new fields.SchemaField({
				skills:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
				defense:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
				initiative: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				speed:      new fields.NumberField({ required: true, integer: true, initial: 0 })
			}),

			// @MARKER WEAR AND CONDITION
			// Layers rub against each other and wear out; the rules suggest a point of armour
			// damage per layer per week when worn layered.
			armorDamage: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// @MARKER WORN STATE
			// layer is which of the three armour layers this piece occupies, innermost first.
			// Shields and other fourth-layer objects use 4. Clothing of 3 armour value or less
			// does not consume a layer, so it sits at 0.
			layer:    new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, max: 4 }),
			location: new fields.StringField({ required: true, initial: "carried",
			              choices: ["equipped", "carried", "mount", "stash"] }),
			quantity: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),
			weight:   new fields.NumberField({ required: true, initial: 0 }),

			// @MARKER PROVENANCE
			cost:        new fields.StringField({ required: true, initial: "" }),
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW armour data model functions HERE

	// This is the function which reports whether this piece consumes one of the three armour
	// layers. Light clothing does not: anything of 3 armour value or less is worn without
	// interfering, and allows one free layer above or below the armour proper.
	consumesLayer() {
		if (this.isShield) { return true; }        // shields occupy the fourth layer
		if (this.flexibility != "Clothing") { return true; }
		return this.getHighestCoverage() > 3;
	}

	// This is the function which returns the highest armour value this piece offers at any
	// single location, which is what the clothing exemption is measured against.
	getHighestCoverage() {
		var tmphighest = 0;
		for (const tmpkey of Object.keys(this.coverage)) {
			if (this.coverage[tmpkey] > tmphighest) { tmphighest = this.coverage[tmpkey]; }
		}
		return tmphighest;
	}
}
// @END (CODE)
