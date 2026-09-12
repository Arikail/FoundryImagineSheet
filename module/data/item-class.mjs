// @START (CODE)
// @MARKER CLASS ITEM DATA MODEL
//==================================================================================================================
// Schema for a class.
//
// Fields map onto classRequirementsAndDetails in the original sheet-worker, whose 22 columns
// carry no header comment and were recovered from how the code consumes them (classDetails,
// sheet-worker.js:51002-51023). Two sibling dictionaries hold the rest of a class's data and
// are folded in here, since they are keyed by the same class name:
//     classtitledict -- the title names earned while advancing
//     goalupdict     -- the two attributes this class may raise on a goal advance
//
// NOTE: classRequirementsAndDetails["Monk"] is malformed in the source, carrying 21 columns
// rather than 22. See docs/UPSTREAM-ISSUES.md item 1. It is reported rather than patched.
//==================================================================================================================

const fields = foundry.data.fields;

export default class ImagineClassData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER SPELLCASTING
			// A class can cast Aura magic, invoke Piety magic, both, or neither, and each
			// begins at its own title rather than at title 1.
			casting: new fields.SchemaField({
				isCaster:          new fields.BooleanField({ required: true, initial: false }),
				isInvoker:         new fields.BooleanField({ required: true, initial: false }),
				casterStartTitle:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
				invokerStartTitle: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				communeTitleMod:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				castingNotes:      new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER REQUIREMENTS
			// focusAttributes names the attributes the class is built around, e.g. "STR, AGL, INT".
			// attribQualify is the per-attribute minimum a character must meet to take the
			// class, in attribute order, with 0 meaning no requirement.
			requirements: new fields.SchemaField({
				alignment:      new fields.StringField({ required: true, initial: "Any" }),
				focusAttributes: new fields.StringField({ required: true, initial: "" }),
				attribQualify:  new fields.ArrayField(new fields.NumberField({ integer: true }), { initial: [] })
			}),

			// @MARKER ADVANCEMENT
			// titles lists the name earned at each title in order, so index 0 is Title 1. Kept
			// as a list because the source is not a fixed length -- most classes list 15,
			// one lists 16.
			advancement: new fields.SchemaField({
				titles:     new fields.ArrayField(new fields.StringField(), { initial: [] }),
				goalAttr1:  new fields.StringField({ required: true, initial: "" }),
				goalAttr2:  new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER CLASS BONUSES
			// The original sheet encoded these as display strings that its code then matched
			// against ("+30% to core skills", "+10% Magic Resist", "+5 Endurance"). Here they
			// are kept as the text a player reads, and the mechanical effect is carried by an
			// Active Effect on the class item -- which is what effects are for, and avoids
			// reproducing a pile of string comparisons.
			classMods: new fields.ArrayField(new fields.StringField(), { initial: [] }),

			// @MARKER USAGE RESTRICTIONS
			// Wearing armour a class forbids costs the character experience and the use of
			// non-combat class skills, so this is a live rule rather than flavour.
			armorUsage:  new fields.StringField({ required: true, initial: "Any" }),
			weaponUsage: new fields.StringField({ required: true, initial: "Any" }),

			// @MARKER ATTACK PROGRESSION
			attackSkill:     new fields.StringField({ required: true, initial: "" }),
			attackSkillList: new fields.StringField({ required: true, initial: "" }),

			// The title at which this class begins reading the Weapon and Missile Lore attack
			// chart, which is the standard chart one level up. Zero means it never does -- true
			// of about half of them, and of every class that does not fight.
			//
			// This is NOT the parenthesised title in attackSkillList ("Grandmaster(mastered
			// weapons at 9)"). Those two disagree for all thirty-eight classes carrying both, so
			// they are different things: this is the Lore chart, that is which weapons are
			// mastered. From getLoreAttackChart (sheet-worker.js:94897).
			loreAttackTitle: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// @MARKER CLASSIFICATION
			// classType distinguishes a primary class from a subclass, e.g. "Priest subclass".
			classType: new fields.StringField({ required: true, initial: "" }),

			// @MARKER PROVENANCE
			sourcebook:  new fields.StringField({ required: true, initial: "" }),
			page:        new fields.StringField({ required: true, initial: "" }),
			description: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	// @MARKER ADD NEW class data model functions HERE

	// This is the function which returns the title name a character of this class holds at a
	// given title. Titles are 1-based; index 0 of the list is Title 1. Returns an empty string
	// when the title is outside the range the class defines.
	getTitleName(tmpTitle) {
		var tmpindex = parseInt(tmpTitle) - 1;
		if (tmpindex < 0) { return ""; }
		if (tmpindex >= this.advancement.titles.length) { return ""; }
		return this.advancement.titles[tmpindex];
	}
}
// @END (CODE)
