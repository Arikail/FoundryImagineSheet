// @START (CODE)
// @MARKER POWER ITEM DATA MODEL
//==================================================================================================================
// Schema for a Power -- something a creature can do innately, a set number of times.
//
// A Power is NOT a kind of attack, and it is not free-form either. His usePower
// (sheet-worker.js:177399) looks the Power's name up in the spell dictionary, then the invocation
// dictionary, and if it is in neither it reports that the creature "is trying to use a power
// which is neither a spell effect nor an invocation effect" and does nothing. So a Power is an
// innate spell or invocation, cast at the creature's own level, with a use count.
//
// That has a consequence for what can be built now. Storing and listing a Power needs nothing
// but this schema. RESOLVING one needs the spell and invocation engine, which belongs to the
// deferred magic phase (see CLAUDE.md, Layer 4). Until then a Power is carried and shown, and
// its Use button will say so rather than pretending to cast it.
//
// The same function also runs the powers granted by magic and divine items, which is why the
// kind is recorded rather than assumed.
//==================================================================================================================

const fields = foundry.data.fields;

export default class ImaginePowerData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER USES
			// His data writes a count, or "at will" / "constant" for something unlimited, which
			// createAllCreaturePowers turns into the string "Infinite"
			// (sheet-worker.js:176197). Unlimited is a flag here, so the count stays a number.
			unlimited: new fields.BooleanField({ required: true, initial: false, label: "Unlimited Uses" }),
			uses:      new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, label: "Uses Remaining" }),
			usesMax:   new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, label: "Uses per Day" }),

			// Whether the Power only ever affects the creature itself. His sheet carries this as
			// a tick on each power row (attr_power_self) and passes it into the casting code.
			selfOnly: new fields.BooleanField({ required: true, initial: false, label: "Self Only" }),

			// @MARKER SOURCE OF THE EFFECT
			// Which dictionary the Power's name resolves in. "unknown" is honest rather than
			// broken: it is what his code reports when a name matches neither, and it is also the
			// state every Power is in until the magic phase ports those dictionaries.
			powerKind: new fields.StringField({ required: true, initial: "unknown",
			               choices: ["unknown", "spell", "invocation", "magicItem", "divineItem"],
			               label: "Kind" }),

			// @MARKER PROVENANCE
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW power data model functions HERE

	// This is the function which says whether the Power can be used right now.
	get hasUseLeft() {
		return this.unlimited || (parseInt(this.uses) || 0) > 0;
	}
}
// @END (CODE)
