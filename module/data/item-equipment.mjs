// @START (CODE)
// @MARKER EQUIPMENT ITEM DATA MODEL
//==================================================================================================================
// Schema for general equipment -- everything that is neither a weapon nor armour.
//
// equipvalueslist in the original sheet-worker carries only a weight per item, so most of what
// is here is the common item handling that every carried thing needs rather than anything
// drawn from that dictionary.
//
// One quirk carried over: the source marks some entries as tagalong items, given a weight of
// zero because they are already counted elsewhere. A scabbard listed in general equipment is
// also part of the sword's own weight, so counting it again would double-charge the character.
//==================================================================================================================

const fields = foundry.data.fields;

export default class ImagineEquipmentData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER PHYSICAL
			weight:   new fields.NumberField({ required: true, initial: 0 }),
			quantity: new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),

			// Set where this item's weight is already accounted for by another item, so it is
			// not charged to encumbrance twice.
			isTagalong: new fields.BooleanField({ required: true, initial: false }),
			// Weighs nothing to carry: his "[Float]" marker, which his own sheet reads out of the
			// item's NAME (sheet-worker.js:81815). The name is still honoured -- see itemFloats in
			// combat-rules.mjs -- and this is the tidier way to say it on a sheet with real fields.
			floats: new fields.BooleanField({ required: true, initial: false, label: "Floats (no carried weight)" }),


			// @MARKER CARRIED STATE
			location: new fields.StringField({ required: true, initial: "carried",
			              choices: ["equipped", "carried", "mount", "stash"] }),

			// @MARKER CLASSIFICATION
			equipmentType: new fields.StringField({ required: true, initial: "" }),

			// @MARKER PROVENANCE
			cost:        new fields.StringField({ required: true, initial: "" }),
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW equipment data model functions HERE
}
// @END (CODE)
