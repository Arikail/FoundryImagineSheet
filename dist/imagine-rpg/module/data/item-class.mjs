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
				// The class skills gained at each title, parallel to titles above. His sheet-worker
				// does not carry these -- classtitledict holds only the title NAMES -- so they are
				// empty for every class built from it, and filled only for classes authored from
				// his Word class templates (src/packs/manual/). Angle-bracketed entries such as
				// "<1st Kinesis>" are placeholders his templates resolve from a per-class table.
				classSkills: new fields.ArrayField(new fields.StringField(), { initial: [] }),
				// The same progression one skill at a time, from his setClassSkillLists: the title a
				// skill arrives at, whether it is a CORE skill (the class's +30%), and whether it is
				// only for a race that can cast ("caster") or cannot ("nonCaster") -- a few casting
				// classes give a race that cannot cast a different skill in that slot.
				classSkillList: new fields.ArrayField(new fields.SchemaField({
					title:    new fields.NumberField({ required: true, integer: true, initial: 1, min: 0 }),
					name:     new fields.StringField({ required: true, initial: "" }),
					core:     new fields.BooleanField({ required: true, initial: false }),
					requires: new fields.StringField({ required: true, blank: true, initial: "",
						choices: { "": "Any race", caster: "Casting races", nonCaster: "No-casting races" } })
				})),
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

			// The titles at which the class acquires Weapon Lore and Missile Lore themselves,
			// from getWeaponLoreWhen / getMissileLoreWhen. Zero means it never does -- true of
			// 59 of the 92 for Weapon Lore and 70 for Missile Lore. These are NOT the same as
			// loreAttackTitle above, which is when the Lore attack CHART is read; a class can
			// have the lore without the chart and the two numbers rarely match.
			weaponLoreTitle:  new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
			missileLoreTitle: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
			// Projectile Lore, from getProjectileLoreWhen. Only six of the 92 classes ever get it.
			projectileLoreTitle: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// The titles at which the class becomes eligible for the two off-hand fighting
			// skills, from get2ndWeaponKnowWhen / get2ndWeaponLoreWhen (sheet-worker.js:95195,
			// 95294). Zero means the class never gets it -- true of 70 of 92 for Knowledge and
			// 73 of 92 for Lore. Being eligible is not the same as having the skill: a character
			// still needs the actual "Second Weapon Knowledge" / "Second Weapon Lore" skill on
			// their sheet, and its own percentage is what buys the off-hand penalty down. See
			// resolveOffhandPenalties in combat-rules.mjs.
			secondWeaponKnowTitle: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
			secondWeaponLoreTitle: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// The title at which the class may start acquiring Multiple Missile Lore combos, from
			// getMultiMissileLoreWhen (sheet-worker.js:95492). Six classes reach it, all archers:
			// Archer and Hunter and Mounted Archer at 10, Archer(Zen) and Border Scout at 13.
			//
			// There is NO equivalent for Multiple Missile Knowledge. His sheet gates that on
			// holding the skill and nothing else -- no title function exists for it -- so there is
			// no second field here and none should be invented.
			multiMissileLoreTitle: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// @MARKER SKILL SLOTS
			// How many class skill slots this class needs to run its whole progression, from
			// getSlotsNeededForClass (sheet-worker.js:62881). Knowledge hands out a fixed
			// allowance of class slots; where it falls short of this number the shortfall is made
			// up by transferring racial or social slots in, which is the Player's Guide's
			// "Transferring Skill Slots". Zero is real for GME, his Game Master Extra, which is a
			// stand-in for a being with no class at all rather than a class of its own.
			skillSlotsNeeded: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// @MARKER PER-CHARACTER STATE
			// Everything above describes the class itself and is the same on every copy. This is
			// the one thing that belongs to the character holding it: how far along this class
			// they are.
			//
			// A DUAL-CLASSED CHARACTER ADVANCES EACH CLASS SEPARATELY. The Player's Guide's own
			// example is a Mage/Warrior who "advances from 1st to 2nd Title in the Mage class
			// only", so a title cannot live on the character as one number once there are two
			// classes -- it belongs with the class, exactly as a skill item carries its own
			// startingBonus and category.
			//
			// Zero means "follow the character's own title" (identity.title), which is what a
			// single-classed character does and why nothing had to change for one. It is only
			// worth setting on a character holding more than one class.
			title: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

			// @MARKER CLASSIFICATION
			// classType distinguishes a primary class from a subclass, e.g. "Priest subclass".
			classType: new fields.StringField({ required: true, initial: "" }),

			// @MARKER RACE RESTRICTIONS
			// The races that may NOT take this class, from his classRaceAndDetails. A list of
			// barred races rather than allowed ones: empty, as Warrior's is, means any race. A
			// half race is barred only if BOTH its races are (setClassDetails, sheet-worker.js:51163).
			blockedRaces: new fields.ArrayField(new fields.StringField()),

			// @MARKER PATHS
			// A class with a choice made when it is taken -- Elementalist's Call of Life or Call of
			// Death, Elemental Dancer's element, and so on -- is one document per path. baseClass is
			// the class his tables know it by ("Elementalist"); path is the choice ("Call of Death"),
			// blank for a class with no choice.
			baseClass: new fields.StringField({ required: true, initial: "" }),
			path:      new fields.StringField({ required: true, initial: "" }),

			// A "class" that is not one. His GME (Game Master Extra) is a 0-title non-classed
			// character: no class skills, no racial title-1 Endurance bonus, and an attack chart
			// picked outright (his gme_all_attack_skills_select) rather than earned by title.
			nonClassed: new fields.BooleanField({ required: true, initial: false }),

			// @MARKER ARCH MORTAL QUALIFICATIONS
			// What a character of this class must have before they may pass 10th title, from his
			// archmortalqualifylist (sheet-worker.js:122311) and the checks that read it
			// (setArchmortalAttributeQualifications, 122429 onward).
			//
			// The twelve attribute entries are HIS OWN STRINGS, not numbers, because two of the
			// three forms are relative to the character's racial maximum and cannot be resolved
			// without one:
			//     ""            no requirement
			//     "RM"          at the character's racial maximum for that attribute
			//     a positive n  at that rating
			//     a negative n  the racial maximum plus n, floored at 0 -- "-1" is one below it
			//
			// Each of the five skills must have reached its chance. The power requirement is not a
			// field: it is simply holding any power at all. The special requirement is a sentence
			// only a Game Master can judge, and is blank where his data says "None".
			archMortal: new fields.SchemaField({
				attributes: new fields.SchemaField(Object.fromEntries(
					["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"]
						.map(tmpkey => [tmpkey, new fields.StringField({ required: true, initial: "" })])
				)),
				skills: new fields.ArrayField(new fields.SchemaField({
					name:   new fields.StringField({ required: true, initial: "" }),
					chance: new fields.NumberField({ required: true, integer: true, initial: 0 })
				})),
				special: new fields.StringField({ required: true, initial: "" })
			}),

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

	// This is the function which returns the class skills gained at a given title, parallel to
	// getTitleName above. His classtitledict carries only the title names, never the skills
	// gained at each, so this is empty for every class built from the sheet-worker and populated
	// only for classes hand-authored from his Word class templates (src/packs/manual/).
	getClassSkills(tmpTitle) {
		var tmpindex = parseInt(tmpTitle) - 1;
		if (tmpindex < 0) { return ""; }
		if (tmpindex >= this.advancement.classSkills.length) { return ""; }
		return this.advancement.classSkills[tmpindex];
	}
}
// @END (CODE)
