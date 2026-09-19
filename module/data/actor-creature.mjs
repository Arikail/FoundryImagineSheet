// @START (CODE)
// @MARKER CREATURE ACTOR DATA MODEL
//==================================================================================================================
// Schema for a creature in the Imagine Role Playing System.
//
// A creature is NOT a character with fewer fields. The two share their attributes, their saves,
// their per-area wounds and the attack chart, but almost everything else works the other way
// round: where a character DERIVES Endurance, resistances and its attack skill from attributes,
// race and class, a creature has them written into its stat block and simply carries them.
// Ported from his creature functions (sheet-worker.js:174658 onward) -- see docs/DECISIONS.md,
// "Creature/NPC audit findings" and the CORRECTION entry that follows it.
//
// What is entered rather than worked out:
//     Endurance, Hide, Shock       -- calcAllCreatureCaracs reads them straight off the stat block
//     all five resistances         -- entered percentages plus modifiers, with no attribute table
//     the attack chart             -- chosen outright, not read off a class progression
//     the body chart               -- stored and editable, because "Custom" is a real body type
//     every skill's chance         -- a flat percentage per skill, as the Bestiary prints it
//
// What IS worked out, in prepareDerivedData:
//     attribute saves and their table modifiers, as for a character
//     Perception, Affinity and Fortune, on a creature-only formula
//     the body's areas, their Endurance and the armour over them
//     encumbrance, and the standing combat numbers
//==================================================================================================================

import { ATTRIBUTE_TABLES } from "../config-tables.mjs";
import { explainAvailability } from "../availability.mjs";
import ImagineCharacterData from "./actor-character.mjs";
import { CREATURE_TYPES, CREATURE_BODY_TYPES, CREATURE_ATTACK_CHARTS } from "../creature-tables.mjs";
import {
	getBodyChart, parseBodyChart, getAreaEndurance, getStrongestMaterial,
	getInitiativeModifier, getNextAttackSkill, getAreaArmor, getAreaShield, resolveEncumbrance
} from "../combat/combat-rules.mjs";

const fields = foundry.data.fields;

	// This is the function which builds the schema shared by all twelve attributes.
	//
	// Same shape as a character's, so anything reading attributes.<attr>.value works on either
	// actor type. rating is the stat block's figure; there is no racial modifier, because a
	// creature has no race item -- its type and body are its own.
	function attributeField(label) {
		return new fields.SchemaField({
			rating:  new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, max: 30, label: label }),
			permMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			tempMod: new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds an entered characteristic -- one the stat block states
	// and the sheet does not calculate. Endurance and Hide are both of these.
	function enteredField(label) {
		return new fields.SchemaField({
			entered: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, label: label }),
			tempMod: new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds a calculated characteristic. Perception, Affinity and
	// Fortune are averaged from attributes like a character's, but with a level term and the
	// bonuses certain abilities grant, so only the manual adjustment is stored.
	function calculatedField(label) {
		return new fields.SchemaField({
			tempMod: new fields.NumberField({ required: true, integer: true, initial: 0, label: label })
		});
	}

	// This is the function which builds one resistance track.
	//
	// Unlike a character's, a creature's resistance has no attribute table behind it: the stat
	// block states a percentage. His code also accepts the word "Immune" typed into the figure
	// (calcAllCreatureResists, sheet-worker.js:178276), which is a state rather than a large
	// number, so it is a flag here.
	function resistanceField(label) {
		return new fields.SchemaField({
			entered: new fields.NumberField({ required: true, integer: true, initial: 0, label: label }),
			tempMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			permMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			immune:  new fields.BooleanField({ required: true, initial: false })
		});
	}


export default class ImagineCreatureData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER IDENTITY
			// Type is required in his Configurator, and checkAllCreatureValues does nothing at
			// all while it is empty, so a creature with no type is an unfinished creature.
			// Subtype, life cycle and habitat are free text: his Configurator takes them as
			// typed input rather than from a list.
			identity: new fields.SchemaField({
				creatureType: new fields.StringField({ required: true, initial: "",
				                  choices: ["", ...CREATURE_TYPES], label: "Creature Type" }),
				subtype:    new fields.StringField({ required: true, initial: "", label: "Subtype" }),
				level:      new fields.NumberField({ required: true, integer: true, initial: 1, min: 0, label: "Level" }),
				lifecycle:  new fields.StringField({ required: true, initial: "", label: "Habits / Life Cycle" }),
				habitat:    new fields.StringField({ required: true, initial: "", label: "Climate / Habitat" }),
				alignment:  new fields.StringField({ required: true, initial: "", label: "Alignment" }),
				tendencies: new fields.StringField({ required: true, initial: "", label: "Tendencies" }),
				expValue:   new fields.NumberField({ required: true, integer: true, initial: 0, label: "Experience Value" }),
				expNote:    new fields.StringField({ required: true, initial: "", label: "Experience Note" }),
				// Which hand a shield goes in. His sheet has one handedness field shared by both
				// sheets, set from a race's abilities for a character and left blank for a
				// creature; blank reads as right-handed, which is what his equipShield does with
				// anything that is not exactly "Left".
				handedness: new fields.StringField({ required: true, initial: "",
				                choices: ["", "Right", "Left", "Ambidextrous"], label: "Handedness" })
				// DERIVED: title and powerLevel, both of which are simply the level
				// (updateCreatureTitle and updatePowerLevel, sheet-worker.js:178477-178487).
			}),

			// @MARKER ATTRIBUTES
			// The same twelve as a character, and the same saves from the same function. Their
			// maximum works differently: a creature's comes from its level, not from a title.
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
			}),

			// @MARKER CHARACTERISTICS
			// Endurance is entered, NOT averaged from the physical attributes the way a
			// character's is -- there is no such formula for a creature anywhere in his code.
			// Shock is entered too, and falls back to Endurance x 3 when left at zero.
			characteristics: new fields.SchemaField({
				endurance:  enteredField("Endurance"),
				perception: calculatedField("Perception"),
				affinity:   calculatedField("Affinity"),
				fortune:    calculatedField("Fortune"),
				shock: new fields.SchemaField({
					entered: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0,
					             label: "Shock" }),          // 0 means "use Endurance x 3"
					immune:  new fields.BooleanField({ required: true, initial: false })
				})
			}),

			// A modifier to Affinity for a creature that has been tamed. His Affinity formula
			// takes it as a plain number (calcAllCreatureCaracs, sheet-worker.js:178413), and it
			// is kept as one here. Modelling the relationship it implies -- who tamed it, how
			// loyal it is -- is deliberately deferred; see docs/DECISIONS.md.
			tameBonus: new fields.NumberField({ required: true, integer: true, initial: 0, label: "Tame Bonus" }),

			// @MARKER RESISTANCES
			resistances: new fields.SchemaField({
				magic:    resistanceField("Magic Resistance"),
				control:  resistanceField("Control Resistance"),
				illusion: resistanceField("Illusion Resistance"),
				poison:   resistanceField("Poison Resistance"),
				disease:  resistanceField("Disease Resistance")
			}),

			// @MARKER BODY AND WOUNDS
			// Wounds are tracked per body area, exactly as for a character, and the same
			// functions do it.
			//
			// bodyChart is the one real difference. A character takes its chart from its race,
			// but a creature's chart is stored and editable: his Configurator seeds it from the
			// body type and then lets areas be added or removed, and "Custom" is itself a body
			// type (sheet-worker.js:22291-22361). So the chart is kept here, and the body type
			// is only used to look one up when this is empty.
			//
			// hide is the creature's rolled-up damage mitigation. His own note on the sheet:
			// "Includes natural hide, force armor, spiritual armor, and all damage mitigation
			// (except worn armor)". It sits here rather than with the characteristics so that
			// the damage pipeline, which reads body.hide for either actor type, needs no change.
			body: new fields.SchemaField({
				bodyType:  new fields.StringField({ required: true, initial: "Humanoid",
				               choices: ["", ...CREATURE_BODY_TYPES], label: "Body Type" }),
				bodyChart: new fields.StringField({ required: true, initial: "", label: "Body Chart" }),
				hide:      new fields.NumberField({ required: true, integer: true, initial: 0, min: 0, label: "Hide" }),
				wounds:      new fields.TypedObjectField(new fields.NumberField({ integer: true, min: 0 })),
				armorDamage: new fields.TypedObjectField(new fields.NumberField({ integer: true, min: 0 }))
				// DERIVED: areas, shock, totalWounds, inShock. See _prepareBody.
			}),

			// @MARKER MOVEMENT
			// A creature's movement is an ordered list, not the character's fixed walk / jog /
			// run. His Configurator takes a typed mode name -- "Walk, Jog, Run, Gallop, Scurry,
			// Slither, Fly, etc." -- with three rates each, and asks for them slowest first with
			// special modes at the end (HTML 81003-81007).
			movement: new fields.SchemaField({
				modes: new fields.ArrayField(new fields.SchemaField({
					name:   new fields.StringField({ required: true, initial: "" }),
					hourly: new fields.NumberField({ required: true, initial: 0 }),
					tenSec: new fields.NumberField({ required: true, initial: 0 }),
					oneSec: new fields.NumberField({ required: true, initial: 0 })
				})),
				// Entered rather than derived. His code sets a creature's jump distances from a
				// switch on Agility (setCreatureMovementValues, sheet-worker.js:178893), which is
				// not one of the attribute dictionaries and is not ported yet.
				jumpStand: new fields.NumberField({ required: true, initial: 0, label: "Standing Jump" }),
				jumpUp:    new fields.NumberField({ required: true, initial: 0, label: "Jump Up" })
			}),

			// @MARKER PHYSICAL FEATURES
			physical: new fields.SchemaField({
				heightFeet:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				heightInches: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				weight:       new fields.NumberField({ required: true, initial: 0 })
			}),

			// @MARKER SKILLS
			// A creature's skills are a name and a flat percentage, which is how the Bestiary
			// prints them and how his sheet stores them (repeating_creatureskills: skill_name and
			// skill_chance, filled from a "Name 45%" list by createAllCreatureSkills,
			// sheet-worker.js:176164). They are NOT recomputed from attributes; doing that would
			// produce different numbers from the printed stat block.
			skills: new fields.ArrayField(new fields.SchemaField({
				name:   new fields.StringField({ required: true, initial: "" }),
				chance: new fields.NumberField({ required: true, integer: true, initial: 0 })
			})),

			// @MARKER COMBAT
			// The attack chart is chosen for the creature rather than worked out. Everything
			// else here is the manual adjustment a Game Master can always reach for, and carries
			// the same field names as a character's so the shared combat code needs no change.
			combat: new fields.SchemaField({
				attackChart: new fields.StringField({ required: true, initial: "None",
				                 choices: CREATURE_ATTACK_CHARTS, label: "Attack Chart" }),
				attackNotes: new fields.StringField({ required: true, initial: "", label: "Attack Notes" }),
				meleeMisc:      new fields.NumberField({ required: true, integer: true, initial: 0 }),
				missileMisc:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
				damageMisc:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
				defenseMisc:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
				initiativeMisc: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				skillMisc:      new fields.NumberField({ required: true, integer: true, initial: 0 }),

				// @MARKER PAIN THRESHOLD
				// A SIGNED modifier on every point of damage coming in, applied before armour
				// and before anything magical takes its share. His own note beside the field
				// reads "reduces or adds to all incoming damage (-/+)", so a negative number is
				// a tougher target. (sheet-worker.js:71186-71193, and his sheet at line 56643.)
				painThreshold: new fields.NumberField({ required: true, integer: true, initial: 0 }),

				// The Famorian "High Pain Threshold" evoke, worth one further point off. Nothing
				// sets this yet -- the evoke system is a separate piece of work -- but the field
				// exists so a Game Master can tick it and so the evoke has somewhere to land.
				highPainThreshold: new fields.BooleanField({ required: true, initial: false }),

				// @MARKER DAMAGE ABSORPTION
				// A POOL, not a per-blow reduction. It takes what it can off a blow after armour
				// and hide have had theirs, and is spent by the same amount, so it wears out.
				// (sheet-worker.js:71359-71366.) His checkSpiritForceArmorModifiers refills it to
				// the best of a "Rune Absorption: +N" on worn armour and the Game Master's own
				// modifier whenever equipment changes; runes are a deferred subsystem, so for now
				// the pool is entered and spent by hand.
				damageAbsorb: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

				// @MARKER MAGICAL PROTECTION
				// These all come off a blow BEFORE any worn armour is asked to block it, in the
				// order his handler applies them (sheet-worker.js:71249-71272). They subtract
				// rather than scale, and each is the BEST of what worn magic items grant and the
				// Game Master's own modifier rather than a sum of them -- which is what his
				// checkSpiritForceArmorModifiers (line 106966) works out. The items that grant
				// them are named by the deferred magic subsystems, so for now these are entered
				// by hand.
				spiritArmor:  new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				forceArmor:   new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				outerKinetic: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				magicShield:  new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),

				// Invulnerability scales rather than subtracts: a weapon with no magical plus
				// does nothing at all, +1/+2 a quarter, +3/+4 a half, +5 and better full damage.
				invulnerable: new fields.BooleanField({ required: true, initial: false })
			}),

			// @MARKER NOTES
			notes:     new fields.StringField({ required: true, initial: "", label: "Notes" }),
			biography: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	//==========================================================================================
	// @MARKER BASE DATA
	//==========================================================================================
	// Everything an Active Effect may target has to exist by the end of this step, because
	// effects are applied between prepareBaseData and prepareDerivedData. The target is
	// attributes.<attr>.value, as it is for a character.
	prepareBaseData() {
		super.prepareBaseData(); // required: skipping this silently breaks two-phase effects

		for (const tmpkey of Object.keys(this.attributes)) {
			var tmpattrib = this.attributes[tmpkey];
			tmpattrib.value = tmpattrib.rating + tmpattrib.permMod + tmpattrib.tempMod;
		}
	}

	//==========================================================================================
	// @MARKER DERIVED DATA
	//==========================================================================================
	prepareDerivedData() {
		super.prepareDerivedData();

		// Attributes come first. Identity's memorization points read the Knowledge table's figure,
		// which only exists once the attribute tables have been looked up. The cap those lookups
		// need comes from the stored level, not from anything derived here, so this order is safe.
		this._prepareAttributes();
		this._prepareIdentity();
		this._prepareCharacteristics();
		this._prepareResistances();
		this._prepareEncumbrance();
		this._prepareCombat();
		this._prepareBody();
		this._prepareAvailability();

		// NOT YET IMPLEMENTED, and deliberately so rather than guessed at:
		//   ability effects      -- his creature path only ever shows an ability's description.
		//                           The few that do something (Enhanced Perception and the
		//                           senses) are handled in _prepareCharacteristics because his
		//                           code handles exactly those. Everything else is text, which
		//                           is a faithful port and not an oversight. See
		//                           UPSTREAM-ISSUES.md item 10.
		//   power resolution     -- a Power is an innate spell or invocation, and using one needs
		//                           the spell and invocation engine, which is the deferred magic
		//                           phase. Powers are carried and listed, not resolved.
		//   evoke body mutations -- the Famorian and Evoked body types build their chart from
		//                           toggles at runtime. Shared gap with the character model.
		//   jump distances       -- see the movement field above.
	}

	// This is the function which fills in the values that follow from the creature's level.
	// His sheet keeps three separate fields that are all just the level: the practitioner title
	// every skill uses, the level every Power is cast at, and the level itself.
	_prepareIdentity() {
		var tmplevel = parseInt(this.identity.level) || 0;
		this.identity.title = tmplevel;
		this.identity.powerLevel = tmplevel;

		// Memorization points, from updateCreatureMemPoints (sheet-worker.js:178462): three per
		// level, multiplied by the Knowledge table's points figure.
		var tmpknw = this.attributes.knw.mods ?? {};
		this.identity.memorizationPoints = (tmplevel * 3) * (parseInt(tmpknw.memorizationPoints) || 0);
	}

	// This is the function which sets each attribute's maximum, its save and its table modifiers.
	//
	// The maximum comes from the creature's level and nothing else -- there is no race to impose
	// a stricter one. His sheet also sets a separate magical maximum to the same number; nothing
	// in the port distinguishes the two yet, so it is not carried as its own field.
	_prepareAttributes() {
		var tmpcap = ImagineCreatureData.getCreatureAttributeCap(this.identity.level);

		for (const tmpkey of Object.keys(this.attributes)) {
			var tmpattrib = this.attributes[tmpkey];

			tmpattrib.max = tmpcap;
			if (tmpattrib.value > tmpcap) { tmpattrib.value = tmpcap; }
			if (tmpattrib.value < 0) { tmpattrib.value = 0; }

			// The same save function a character uses. Kept in one place rather than copied.
			tmpattrib.save = ImagineCharacterData.getAttribSave(tmpattrib.value);

			var tmptable = ATTRIBUTE_TABLES[tmpkey];
			tmpattrib.mods = (tmptable && tmptable[tmpattrib.value]) ? tmptable[tmpattrib.value] : {};
		}
	}

	// This is the function which works out the four characteristics.
	// Ported from calcAllCreatureCaracs (sheet-worker.js:178346), which the creature-finish
	// handler repeats verbatim.
	//
	//     Endurance  = entered + its modifier                       (no formula at all)
	//     Shock      = entered, or Endurance x 3 when left at zero, or Immune
	//     Perception = average(INT WIS KNW) + level
	//     Affinity   = average(APP CHM SOC) + level x 2             (x2, not x1)
	//     Fortune    = average(AUR PTY WIL) + level
	//
	// Two details that are easy to get wrong, both as his code has them:
	//   - Affinity averages only APP and CHM when Social Class is 0, on the grounds that a
	//     creature outside society has no social standing to average in.
	//   - All three averages use the creature's OWN RATINGS rather than its modified values, so
	//     a temporary change to an attribute does not move them. A character works the other way.
	//     This is faithful to his sheet; making effects cascade would be a one-line change here.
	_prepareCharacteristics() {
		var tmpattribs = this.attributes;
		var tmplevel = parseInt(this.identity.level) || 0;

		// Endurance: entered, plus its manual modifier.
		var tmpend = this.characteristics.endurance;
		tmpend.base = parseInt(tmpend.entered) || 0;
		tmpend.value = tmpend.base + (parseInt(tmpend.tempMod) || 0);

		// Shock. The fallback uses the entered Endurance, before the modifier, as his does.
		var tmpshock = this.characteristics.shock;
		var tmpshockentered = parseInt(tmpshock.entered) || 0;
		this.body.shock = tmpshock.immune ? 0 : (tmpshockentered || (tmpend.base * 3));
		tmpshock.value = tmpshock.immune ? null : this.body.shock;

		// The ability and skill names his checks look at.
		var tmpabilities = this._getTraitNames("ability");
		var tmpskilltext = this.skills.map(s => String(s.name ?? "")).join(",");

		// Perception.
		var tmpper = parseInt(((tmpattribs.int.rating + tmpattribs.wis.rating + tmpattribs.knw.rating) / 3) + 0.99) || 0;
		tmpper = tmpper + tmplevel;
		if (tmpabilities.join(",").includes("Enhanced Perception")) { tmpper = tmpper + 10; }
		if (tmpskilltext.includes("Smell"))      { tmpper = tmpper + 5; }
		if (tmpskilltext.includes("Listen"))     { tmpper = tmpper + 5; }
		var tmphaslifesense = false;
		if (tmpskilltext.includes("Life Sense")) { tmpper = tmpper + 5; tmphaslifesense = true; }

		// Every special sense is worth +5, and life sense is only ever counted once however it
		// is spelled.
		for (const tmpability of tmpabilities) {
			var tmpislife = (tmpability == "Sense(Life)" || tmpability == "Life Sense" || tmpability == "Life Sensing");
			if (!tmphaslifesense && tmpislife) {
				tmpper = tmpper + 5;
				tmphaslifesense = true;
			} else if (!tmpislife && (tmpability.includes("Sense") || tmpability.includes("Sensing"))) {
				tmpper = tmpper + 5;
			}
		}

		// Affinity.
		var tmpaff = 0;
		if (tmpattribs.soc.rating > 0) {
			tmpaff = parseInt(((tmpattribs.app.rating + tmpattribs.chm.rating + tmpattribs.soc.rating) / 3) + 0.99) || 0;
		} else {
			tmpaff = parseInt(((tmpattribs.app.rating + tmpattribs.chm.rating) / 2) + 0.99) || 0;
		}
		tmpaff = tmpaff + (tmplevel * 2);
		if (tmpabilities.join(",").includes("Enhanced Affinity")) { tmpaff = tmpaff + 10; }
		tmpaff = tmpaff + (parseInt(this.tameBonus) || 0);

		// Fortune.
		var tmpfor = parseInt(((tmpattribs.aur.rating + tmpattribs.pty.rating + tmpattribs.wil.rating) / 3) + 0.99) || 0;
		tmpfor = tmpfor + tmplevel;
		if (tmpabilities.join(",").includes("Enhanced Fortune")) { tmpfor = tmpfor + 10; }

		this._setCalculated("perception", tmpper);
		this._setCalculated("affinity", tmpaff);
		this._setCalculated("fortune", tmpfor);
	}

	// This is the function which stores one calculated characteristic and its modifier.
	_setCalculated(tmpname, tmpbase) {
		var tmpchar = this.characteristics[tmpname];
		tmpchar.base = tmpbase;
		tmpchar.value = tmpbase + (parseInt(tmpchar.tempMod) || 0);
	}

	// This is the function which resolves the five resistances.
	// Ported from calcAllCreatureResists (sheet-worker.js:178273): the entered percentage plus a
	// temporary and a permanent modifier, or Immune outright.
	//
	// There is no attribute table in this at all, which is the sharpest break from a character.
	// His code also adds a flat +20 to Control, Poison or Disease for certain evoke and immunity
	// flags; those flags are only ever set on the character side, never for a creature, so they
	// are not ported here. See UPSTREAM-ISSUES.md item 10.
	_prepareResistances() {
		for (const tmpkey of Object.keys(this.resistances)) {
			var tmpresist = this.resistances[tmpkey];
			tmpresist.base = parseInt(tmpresist.entered) || 0;
			tmpresist.value = tmpresist.immune
				? null
				: tmpresist.base + (parseInt(tmpresist.tempMod) || 0) + (parseInt(tmpresist.permMod) || 0);
		}
	}

	// This is the function which separates what is worn into the four armour layers and the
	// shields over them. A shield covers a run of areas down one side rather than a single slot,
	// and his sheet keeps it in a fifth layer of its own, so the two are totalled separately and
	// a shield must not also be counted as ordinary armour -- its armour value sits in the
	// left-hand column whichever hand holds it, so counting it twice would armour the wrong hand.
	_getWornShields() {
		return this._getWornArmor().filter(tmpitem => tmpitem.system.isShield);
	}

	// This is the function which works out the creature's standing combat numbers.
	//
	// The attack chart is taken as chosen. Where a character's comes from a class progression and
	// a title, a creature's is simply what its stat block says (setCreatureAttackSkillValues,
	// sheet-worker.js:178489). A creature that knows Weapon Lore or Missile Lore also gets the
	// chart one step up for those weapons, as his code does.
	_prepareCombat() {
		var tmpaglmods = this.attributes.agl.mods ?? {};
		var tmpintmods = this.attributes.int.mods ?? {};
		var tmpstrmods = this.attributes.str.mods ?? {};

		var tmparmorinit = 0;
		var tmparmordef = 0;
		var tmparmorspeed = 0;
		var tmparmorskills = 0;
		for (const tmpitem of this._getWornArmor()) {
			var tmppen = tmpitem.system.penalties ?? {};
			tmparmorinit   = tmparmorinit   + (parseInt(tmppen.initiative) || 0);
			tmparmordef    = tmparmordef    + (parseInt(tmppen.defense) || 0);
			tmparmorspeed  = tmparmorspeed  + (parseInt(tmppen.speed) || 0);
			tmparmorskills = tmparmorskills + (parseInt(tmppen.skills) || 0);
		}

		this.combat.attackSkill = this.combat.attackChart;

		// Which handedness an off-hand attack is judged against. The Ambidextrous, Fully
		// Ambidextrous and Omnidextrous abilities all grant the same exemption isOffhandWeapon
		// reads as "Ambidextrous" -- his creature ability dictionary gives all three the identical
		// "10 seconds and no penalties" description, just over a different span of limbs -- and
		// the ability applies regardless of what the stored handedness says, since that field is
		// only ever about which side a shield covers (see the note above _prepareBody). Absent the
		// ability, the stored handedness stands, blank reading as right-handed as it does there.
		var tmpabilities = this._getTraitNames("ability").join(",");
		var tmpisambidextrous = tmpabilities.includes("Ambidextrous") || tmpabilities.includes("Omnidextrous");
		this.combat.offhandHandedness = tmpisambidextrous ? "Ambidextrous" : (this.identity.handedness || "");

		// The Lore chart, one step better, for a creature that has the skill for it.
		var tmpskilltext = this.skills.map(s => String(s.name ?? "")).join(",");
		this.combat.hasWeaponLore = tmpskilltext.includes("Weapon Lore");
		this.combat.hasMissileLore = tmpskilltext.includes("Missile Lore");
		this.combat.loreAttackSkill = (this.combat.hasWeaponLore || this.combat.hasMissileLore)
			? getNextAttackSkill(this.combat.attackChart)
			: "";

		this.combat.initiativeMod = getInitiativeModifier(
			tmpaglmods.initiativeAdjust, tmpintmods.initiativeAdjust,
			tmparmorinit + (parseInt(this.combat.initiativeMisc) || 0));

		this.combat.defensiveAdjust = (parseInt(tmpaglmods.defensiveAdjust) || 0)
		                            + tmparmordef + (parseInt(this.combat.defenseMisc) || 0);

		this.combat.weaponSpeedMod = (parseInt(tmpstrmods.weaponSpeed) || 0)
		                           + (parseInt(tmpaglmods.weaponSpeed) || 0) + tmparmorspeed;

		this.combat.meleeAttack   = parseInt(tmpstrmods.meleeAttack) || 0;
		this.combat.meleeDamage   = parseInt(tmpstrmods.meleeDamage) || 0;
		this.combat.missileAttack = parseInt(tmpaglmods.missileAttack) || 0;
		this.combat.armorSkillPenalty = tmparmorskills;
	}

	// This is the function which lays out the creature's body: every area of its chart, with its
	// Endurance, its wounds, the armour over it and what state it is in.
	//
	// The chart is the creature's own stored one where it has it, and the stock chart for its body
	// type otherwise. Everything after that is the same arithmetic a character uses.
	_prepareBody() {
		var tmpendurance = this.characteristics.endurance.value;
		var tmpvitality = this.attributes.vit.value;
		var tmpworn = this._getWornArmor().filter(tmpitem => !tmpitem.system.isShield);
		var tmpshields = this._getWornShields();
		var tmphandedness = this.identity.handedness;
		var tmpwounds = this.body.wounds ?? {};
		var tmparmordamage = this.body.armorDamage ?? {};

		// A stored chart wins. Only fall back to the body type's stock chart when there is none,
		// which is also what happens for a body type of "Custom" that has not been built yet.
		// The body type still decides which armour slots cover which area, even when the chart
		// itself was built by hand.
		var tmpbodytype = this.body.bodyType || "Humanoid";
		var tmpchart = String(this.body.bodyChart ?? "").trim();
		var tmpareadefs = tmpchart ? parseBodyChart(tmpchart) : getBodyChart(tmpbodytype);

		var tmpareas = [];
		var tmptotal = 0;
		for (const tmparea of tmpareadefs) {
			var tmpend = getAreaEndurance(tmpendurance, tmparea.multiplier);
			var tmphurt = parseInt(tmpwounds[tmparea.name]) || 0;
			tmptotal = tmptotal + tmphurt;

			// Which slot covers an area depends on the body type, and a few areas take armour
			// only from a named kind -- barding on a centaur or an arachen. See getAreaArmorSlot.
			// A creature's body type is far more likely than a character's to be one his code
			// wrote no branch for, in which case nothing worn protects it, as in his sheet.
			var tmpcover = getAreaArmor(tmpbodytype, tmparea.name, tmpworn);
			var tmparmor = tmpcover.armor;
			var tmpmaterials = tmpcover.materials;
			var tmplayers = tmpcover.layers;
			var tmpslot = tmpcover.slot;
			var tmpdamaged = parseInt(tmparmordamage[tmparea.name]) || 0;
			tmparmor = Math.max(0, tmparmor - tmpdamaged);

			// A shield is the fifth layer, added on top of the worn armour and untouched by the
			// damage that armour has taken -- his sheet tracks it in its own layer and clears it
			// wholesale when the shield comes off, rather than degrading it area by area.
			var tmpshielded = getAreaShield(tmpbodytype, tmparea.name, tmpshields, tmphandedness);
			tmparmor = tmparmor + tmpshielded.armor;

			var tmpstate = "sound";
			if (tmphurt > tmpend + tmpvitality) { tmpstate = "effect"; }
			else if (tmphurt > tmpend)          { tmpstate = "vitalitySave"; }
			else if (tmphurt > 0)               { tmpstate = "wounded"; }

			tmpareas.push({
				name: tmparea.name,
				type: tmparea.type,
				multiplier: tmparea.multiplier,
				endurance: tmpend,
				wounds: tmphurt,
				armor: tmparmor,
				armorDamage: tmpdamaged,
				material: getStrongestMaterial(tmpmaterials),
				layers: tmplayers.concat(tmpshielded.layers),
				shield: tmpshielded.armor,
				shieldLayers: tmpshielded.layers,
				protectedByArmor: !!tmpslot || tmpshielded.armor > 0,
				state: tmpstate
			});
		}

		this.body.type = this.body.bodyType;
		this.body.areas = tmpareas;
		this.body.totalWounds = tmptotal;
		this.body.inShock = (this.body.shock != 0) && (tmptotal > this.body.shock);
	}

	// This is the function which totals what the creature is carrying and how encumbered it is.
	// Same rule as a character: the Strength table's load limit times its own body weight, with
	// the bands at a quarter, half, three quarters and the whole of it. His creature recalculation
	// calls the same calcEncumbrance (checkAllCreatureValues, sheet-worker.js:178196).
	//
	// The arithmetic -- bands, size scaling of armour and gear, magical-plus weight reduction --
	// is resolveEncumbrance in combat-rules.mjs, the one port of his one calcEncumbrance.
	_prepareEncumbrance() {
		var tmpphys = this.physical ?? {};
		var tmpinches = ((parseInt(tmpphys.heightFeet) || 0) * 12) + (parseInt(tmpphys.heightInches) || 0);
		this.encumbrance = resolveEncumbrance(this.parent?.items,
			this.attributes.str.mods?.loadLimit, tmpphys.weight, tmpinches);
	}

	// This is the function which flags every item on the creature that the campaign's content
	// switches currently disallow. Items are flagged, never removed -- as for a character.
	_prepareAvailability() {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return; }

		var tmprules = game.imagine.getAvailabilityRules();
		for (const tmpitem of tmpactor.items) {
			var tmpresult = explainAvailability(tmpitem, tmprules);
			tmpitem.system.available = tmpresult.available;
			tmpitem.system.unavailableReason = tmpresult.reason;
		}
	}

	//==========================================================================================
	// @MARKER GENERAL PURPOSE FUNCTIONS
	//==========================================================================================

	// This is the function which returns the armour the creature is actually wearing. A creature
	// can wear armour -- his sheet gives it an equipment tab of its own -- though most do not.
	_getWornArmor() {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return []; }
		var tmpworn = [];
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type == "armor" && tmpitem.system.location == "equipped") { tmpworn.push(tmpitem); }
		}
		return tmpworn;
	}

	// This is the function which returns the names of the creature's traits of one category --
	// ability, disability or immunity.
	_getTraitNames(tmpcategory) {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return []; }
		var tmpnames = [];
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type == "trait" && tmpitem.system.category == tmpcategory) {
				tmpnames.push(String(tmpitem.name ?? ""));
			}
		}
		return tmpnames;
	}

	// This is the function which returns the highest attribute rating a creature may reach.
	// Ported from handleCreatureFinish (sheet-worker.js:174723).
	//
	// Note this is NOT the character rule. A character's cap comes from its title in four tiers;
	// a creature's comes from its level in three, and the numbers differ (28 has no character
	// equivalent). The difference is recorded in UPSTREAM-ISSUES.md item 8 as a question for him,
	// but it is his code, so it is what the port does.
	static getCreatureAttributeCap(tmpLevel) {
		var tmpLevelValue = parseInt(tmpLevel) || 0;
		if (tmpLevelValue < 10) { return 25; }
		if (tmpLevelValue < 15) { return 28; }
		return 30;
	}

	// This is the function which reads a skill list as his data writes it -- "Ambush 45%, Blend
	// 30%" -- into name and chance pairs. Kept here so a stat block can be typed or pasted in one
	// field rather than row by row. Ported from createAllCreatureSkills (sheet-worker.js:176164).
	static parseSkillList(tmpText) {
		var tmpout = [];
		for (const tmpentry of String(tmpText ?? "").split(",")) {
			var tmptrimmed = tmpentry.trim();
			if (tmptrimmed == "" || tmptrimmed == "None") { continue; }
			var tmpmatch = tmptrimmed.match(/[0-9]+/);
			var tmpchance = tmpmatch ? (parseInt(tmpmatch[0]) || 0) : 0;
			var tmpname = tmptrimmed.replace(`${tmpchance}%`, "").trim();
			tmpout.push({ name: tmpname, chance: tmpchance });
		}
		return tmpout;
	}

	// @MARKER ADD NEW creature data model functions HERE
}
// @END (CODE)
