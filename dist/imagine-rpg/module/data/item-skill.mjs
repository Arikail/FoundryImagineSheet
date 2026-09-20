// @START (CODE)
// @MARKER SKILL ITEM DATA MODEL
//==================================================================================================================
// Schema for a single skill -- class, racial or social.
//
// The definition fields map one for one onto the columns of skilldict and socialskilldict in
// the original sheet-worker, so extracted content drops straight in. See
// tools/extract/column_maps.py for the mapping and its provenance.
//
// Total chance is NOT stored. Player's Guide p.94:
//     base chance  = (combined attributes - skill rating) x 5%
//     total chance = base chance + starting bonus + ability bonus + modifiers
// Combined attributes means attr1 when only one governs the skill, otherwise the average of
// attr1 and attr2 rounded up. An untrained character attempting a skill as a common skill uses
// the base chance ALONE, with no starting bonus -- which is why the original sheet's
// common_skill_# fields carried only a name and a base.
//==================================================================================================================

const fields = foundry.data.fields;

export default class ImagineSkillData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER SKILL DEFINITION
			// These come from the source books and do not vary between characters.
			attr1:        new fields.StringField({ required: true, initial: "", label: "Governing Attribute" }),
			attr2:        new fields.StringField({ required: true, initial: "", label: "Second Attribute" }),
			skillRating:  new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, label: "Skill Rating" }),
			startingDice: new fields.StringField({ required: true, initial: "", label: "Starting Bonus Dice" }),
			time:         new fields.StringField({ required: true, initial: "", label: "Time to Use" }),
			learn:        new fields.StringField({ required: true, initial: "", label: "Learn Time" }),

			// Skill types drive the magic switches. A skill typed Magical or Divine disappears
			// when magic is turned off, which is not a cosmetic filter -- roughly three quarters
			// of all class and racial skills carry one of those two types.
			// Stored as a list because the source data allows several, e.g. "Disciplined,Magical".
			types: new fields.ArrayField(new fields.StringField(), { initial: [] }),

			// @MARKER PROVENANCE
			// Every skill in the source data already records which book and page it came from.
			// The campaign-level sourcebook toggles filter on this.
			sourcebook: new fields.StringField({ required: true, initial: "", label: "Sourcebook" }),
			page:       new fields.StringField({ required: true, initial: "", label: "Page" }),

			// @MARKER PER CHARACTER STATE
			// Only meaningful once the skill is on an actor. A skill sitting in a compendium
			// carries the definition above and leaves all of this at its default.
			category:        new fields.StringField({ required: true, initial: "class",
			                     choices: ["class", "racial", "social"], label: "Category" }),
			startingBonus:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
			abilityBonus:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
			misc:            new fields.NumberField({ required: true, integer: true, initial: 0 }),
			acquiredAtTitle: new fields.NumberField({ required: true, integer: true, initial: 0 }),

			// Set when the skill is being attempted untrained. Common skill use gets the base
			// chance with no starting bonus, and cannot be used at all for restricted skills.
			isCommon:     new fields.BooleanField({ required: true, initial: false }),
			isRestricted: new fields.BooleanField({ required: true, initial: false }),

			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW skill data model functions HERE

	// Note: baseChance, totalChance and combinedAttributes are NOT computed here. Embedded
	// items are prepared before the owning actor's derived data, so a skill calculating for
	// itself would read attribute values that are not final yet. The actor fills these in
	// during its own prepareDerivedData -- see _prepareSkills in data/actor-character.mjs.
}
// @END (CODE)
