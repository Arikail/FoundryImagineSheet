// @START (CODE)
// @MARKER TRAIT ITEM DATA MODEL
//==================================================================================================================
// Schema for an ability, a disability or an immunity.
//
// All three are one item type because all three are one shape in his data: three dictionaries
// with identical columns -- canonical name, two values whose meaning varies by entry, and the
// description that is actually shown (getCreatureAbilityDetails, getCreatureDisabilityDetails,
// getCreatureImmunityDetails, sheet-worker.js:176209, 177693, 177961). The category says which
// dictionary an entry came from.
//
// These are DESCRIPTIVE items. They carry their text and their two values, and they do not
// apply their own mechanical effect. That is a faithful port, not a shortcut:
//   - On a creature, his code only ever concatenates the description for display
//     (createFullCreatureAbilities, sheet-worker.js:175436). The few abilities that do anything
//     mechanically are hand-checked by name in his characteristics code, and the creature data
//     model reproduces exactly those.
//   - On a character, racial abilities DO drive mechanics, through a hand-written switch on each
//     canonical name (setTempRacialAbilities, sheet-worker.js:46293). When racial abilities are
//     ported, each one that matters gets an Active Effect authored on that specific item -- which
//     is the same thing his switch does, expressed the way Foundry expects.
// See docs/DECISIONS.md and UPSTREAM-ISSUES.md item 10, which also records that his two sets of
// dictionaries disagree on some names and values.
//
// value1 and value2 are deliberately strings. Their meaning is per entry rather than per column:
// for "Frost Sensitivity" they are a magic-resistance penalty and extra damage per die, and for
// "Acid Resistant" a damage multiplier and a resistance bonus. Some are fractions like ".5".
// Reading them as numbers would imply a consistency the data does not have.
//==================================================================================================================

const fields = foundry.data.fields;

export default class ImagineTraitData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER CATEGORY
			category: new fields.StringField({ required: true, initial: "ability",
			              choices: ["ability", "disability", "immunity"], label: "Category" }),

			// The dictionary's canonical name, which is not always the key it is looked up by --
			// "Acid Regeneration" resolves to "Regeneration(Acid)", and three spellings of
			// "360-degree vision" resolve to one entry. Kept so the original spelling survives
			// alongside the item's own name.
			canonicalName: new fields.StringField({ required: true, initial: "", label: "Canonical Name" }),

			// @MARKER VALUES
			value1: new fields.StringField({ required: true, initial: "", label: "Value 1" }),
			value2: new fields.StringField({ required: true, initial: "", label: "Value 2" }),

			// @MARKER PROVENANCE
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW trait data model functions HERE
}
// @END (CODE)
