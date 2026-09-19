// @START (CODE)
// @MARKER CHARACTER ACTOR DATA MODEL
//==================================================================================================================
// Schema for a player character in the Imagine Role Playing System.
//
// Field names follow the Roll20 sheet's attributes where they map cleanly, so this can be
// diffed against the original sheet-worker. Anything DERIVED is listed in the comments but
// is NOT stored here -- it is computed in prepareDerivedData() from the attribute tables.
//
// Derivation order matters and is documented in docs/DATA-MODEL.md section 9. The short
// version: attributes -> saves and modifiers -> Endurance -> Shock -> body area maxima.
// Changing Endurance recomputes every body area, exactly as changeCharacteristics() does
// in the original sheet.
//==================================================================================================================

import { ATTRIBUTE_TABLES } from "../config-tables.mjs";
import { explainAvailability } from "../availability.mjs";
import {
	getAttackSkillForTitle, getBodyChart, getAreaEndurance, getStrongestMaterial,
	getInitiativeModifier, getAreaArmor, getAreaShield, getNextAttackSkill, hasLore, parseLoreList,
	getMovementBase, resolveMovementRate, resolveSpecialMovement, specialMovementReplacesOther,
	getOffhandSecondsCap, getBetterAttackSkill, resolveEncumbrance, resolveLoadedMovement
} from "../combat/combat-rules.mjs";
import { getSlotAllowance } from "../skills-rules.mjs";
import { combineHalfRace, getHalfRaceName, isClassBlockedForRaces, canRacesBreed } from "../race-rules.mjs";

const fields = foundry.data.fields;

	// This is the function which builds the schema shared by all twelve attributes.
	// Rating is the stored value; permMod and tempMod are the permanent and temporary
	// adjustments the original sheet kept in attr_perm_*_mod and attr_tmp_*_mod.
	// The save percentage and every derived modifier come from the attribute tables.
	function attributeField(label) {
		return new fields.SchemaField({
			rating:  new fields.NumberField({ required: true, integer: true, initial: 10, min: 0, max: 30, label: label }),
			permMod: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			tempMod: new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds the schema for a derived characteristic.
	// Endurance, Perception, Affinity and Fortune all work the same way: a base value
	// calculated from attributes, plus a racial modifier, plus bonuses rolled on title
	// advancement, plus permanent and temporary adjustments.
	function characteristicField() {
		return new fields.SchemaField({
			titleBonus: new fields.NumberField({ required: true, integer: true, initial: 0 }),
			raceMod:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
			permMod:    new fields.NumberField({ required: true, integer: true, initial: 0 }),
			tempMod:    new fields.NumberField({ required: true, integer: true, initial: 0 })
		});
	}

	// This is the function which builds the schema for one resistance track.
	// The base chance comes from attributes and race; misc is the manual adjustment,
	// standing in for the sheet's various *_other fields.
	// A resistance can also be an outright immunity, which the original sheet handled by
	// replacing the percentage with the word "Immune" -- so it is a state, not a big number.
	function resistanceField() {
		return new fields.SchemaField({
			misc:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
			immune: new fields.BooleanField({ required: true, initial: false })
		});
	}

	// This is the function which builds one movement rate. The Imagine system tracks
	// every movement mode at three scales at once: distance per hour, per 10 seconds
	// (one combat round) and per second.
	function movementRateField() {
		return new fields.SchemaField({
			hourly: new fields.NumberField({ required: true, initial: 0 }),
			tenSec: new fields.NumberField({ required: true, initial: 0 }),
			oneSec: new fields.NumberField({ required: true, initial: 0 })
		});
	}


export default class ImagineCharacterData extends foundry.abstract.TypeDataModel {

	static defineSchema() {
		return {

			// @MARKER IDENTITY
			// Race and class are not referenced by UUID here. They are embedded Items on the
			// actor, found during data preparation, because resolving a UUID synchronously
			// while preparing data is unreliable for compendium content that has not been
			// loaded yet. Dragging the race or class item onto the sheet is what sets them.
			identity: new fields.SchemaField({
				title:       new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				goal:        new fields.NumberField({ required: true, integer: true, initial: 0 }),
				exp:         new fields.NumberField({ required: true, integer: true, initial: 0 }),
				alignment:   new fields.StringField({ required: true, initial: "" }),
				tendencies:  new fields.StringField({ required: true, initial: "" }),
				gender:      new fields.StringField({ required: true, initial: "" })
				// DERIVED: titleName (from classtitledict), nextGoalExp (from goalupdict),
				//          and the per-race attribute caps.
			}),

			// @MARKER ATTRIBUTES
			// The twelve attributes, grouped physical / mental / personal / mystical as the
			// Player's Guide presents them. Listed out individually rather than generated in a
			// loop so the set is visible at a glance.
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
				// DERIVED per attribute: max, save, and that attribute's table modifiers
				// (str -> meleeAttack/meleeDamage/loadLimit/weaponSpeed, and so on).
			}),

			// @MARKER CHARACTERISTICS
			// Endurance is the average of the three physical attributes rounded up, then
			// modified. Perception, Affinity and Fortune work the same way off other groupings.
			characteristics: new fields.SchemaField({
				endurance:  characteristicField(),
				perception: characteristicField(),
				affinity:   characteristicField(),
				fortune:    characteristicField()
			}),

			// @MARKER RESISTANCES
			resistances: new fields.SchemaField({
				magic:    resistanceField(),
				illusion: resistanceField(),
				control:  resistanceField(),
				poison:   resistanceField(),
				disease:  resistanceField()
			}),

			// @MARKER BODY AND WOUNDS
			// Imagine does not use a single hit point pool. Endurance is distributed across the
			// body areas of the character's body chart, and damage is tracked per area.
			//
			// The areas themselves are NOT stored. They come from the body chart -- the race's,
			// unless bodyType overrides it (a transformation, say) -- every time the character
			// is prepared. Only what happens to them is stored, keyed by area name: the wounds
			// each has taken and the damage its armour has taken. Keying by name rather than by
			// position means a change of race or body cannot slide existing wounds onto the
			// wrong limbs.
			body: new fields.SchemaField({
				bodyType:    new fields.StringField({ required: true, initial: "" }),  // "" = the race's
				wounds:      new fields.TypedObjectField(new fields.NumberField({ integer: true, min: 0 })),
				armorDamage: new fields.TypedObjectField(new fields.NumberField({ integer: true, min: 0 })),
				hide:        new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 })
				// DERIVED: areas (each with its Endurance, wounds, armour and state), shock,
				// totalWounds, inShock. See _prepareBody.
			}),

			// @MARKER MOVEMENT
			movement: new fields.SchemaField({
				walk:    movementRateField(),
				jog:     movementRateField(),
				run:     movementRateField(),
				special: movementRateField(),
				specialName: new fields.StringField({ required: true, initial: "" }),
				travelHours: new fields.NumberField({ required: true, initial: 0 }),
				restHours:   new fields.NumberField({ required: true, initial: 0 }),
				jumpStand:   new fields.NumberField({ required: true, initial: 0 }),
				jumpUp:      new fields.NumberField({ required: true, initial: 0 })
			}),

			// @MARKER PHYSICAL FEATURES
			physical: new fields.SchemaField({
				heightFeet:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				heightInches: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				frame:        new fields.StringField({ required: true, initial: "" }),
				weight:       new fields.NumberField({ required: true, initial: 0 }),
				hair:         new fields.StringField({ required: true, initial: "" }),
				bodyCovering: new fields.StringField({ required: true, initial: "" }),
				eyes:         new fields.StringField({ required: true, initial: "" }),
				skin:         new fields.StringField({ required: true, initial: "" }),
				handedness:   new fields.StringField({ required: true, initial: "" }),
				age:          new fields.NumberField({ required: true, integer: true, initial: 0 }),
				apparentAge:  new fields.NumberField({ required: true, integer: true, initial: 0 }),
				maxAge:       new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER LANGUAGES
			// How many a character may know is capped by Intelligence; the sheet tracked
			// speaking and writing separately because they have separate limits.
			languages: new fields.ArrayField(new fields.SchemaField({
				name:  new fields.StringField({ required: true, initial: "" }),
				speak: new fields.BooleanField({ required: true, initial: true }),
				write: new fields.BooleanField({ required: true, initial: false })
			})),

			// @MARKER WEALTH
			wealth: new fields.SchemaField({
				copper:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				silver:   new fields.NumberField({ required: true, integer: true, initial: 0 }),
				gold:     new fields.NumberField({ required: true, integer: true, initial: 0 }),
				platinum: new fields.NumberField({ required: true, integer: true, initial: 0 }),
				special:  new fields.StringField({ required: true, initial: "" }),
				gems:     new fields.StringField({ required: true, initial: "" }),
				jewelry:  new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER SKILL SLOT TRICKS
			// How many times each of the Player's Guide's slot trades has been made, and how many
			// slots have been given up outright for a bonus. The Knowledge table's allowance is
			// derived; these are the only stored part, because a trade is a decision rather than a
			// calculation and nothing else on the character records that it happened.
			//
			// Kept as counts rather than as a list of moves: his sheet stores exactly the same
			// thing (tmp_race_skill_slots_removed and its siblings), a move is not undoable once
			// the slot it opened has been filled, and the arithmetic in getSlotAllowance only ever
			// needs how many. The 2d4% a sacrifice grants is not here -- it is rolled once and
			// added to the chosen skill's own modifier, which is where a permanent bonus belongs.
			skillSlotMoves: new fields.SchemaField({
				racialToClass:    new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				racialToSocial:   new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				socialToRacial:   new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				socialToClass:    new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				racialSacrificed: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 }),
				socialSacrificed: new fields.NumberField({ required: true, integer: true, initial: 0, min: 0 })
			}),

			// @MARKER COMBAT ADJUSTMENTS
			// Everything granted by race, class, magic or condition arrives as an Active Effect.
			// These misc fields are the manual override the Game Master can always reach for,
			// and stand in for the original sheet's combat_mod_*_other attributes.
			combat: new fields.SchemaField({
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
				invulnerable: new fields.BooleanField({ required: true, initial: false }),

				// @MARKER LORE
				// The weapons this character has SPECIFIC Weapon or Missile Lore in, by name.
				// His sheet keeps each as one comma-separated string of simplified names
				// (weapon_lore_list / missile_lore_list); an array is the same thing without the
				// parsing. Having the lore at all comes from the class and the title, so it is
				// derived rather than stored -- these lists only say which weapons are singled
				// out for the larger bonus.
				// Kept as one comma-separated string each, which is his shape exactly
				// (weapon_lore_list / missile_lore_list). A plain string is also the only thing a
				// text field on the sheet can write back, and the parsed arrays are derived.
				weaponLoreList:  new fields.StringField({ required: true, initial: "" }),
				missileLoreList: new fields.StringField({ required: true, initial: "" }),

				// Projectile Lore names AMMUNITION, not the weapon in hand -- an Arrow rather
				// than the Long Bow that fires it. Only six of his 92 classes ever acquire it.
				projectileLoreList: new fields.StringField({ required: true, initial: "" }),

				// The launcher/missile combinations learned for firing more than one missile at a
				// time. These are NOT a list of weapons singled out for a larger bonus, the way
				// the three lists above are -- both multi-missile skills are learned one
				// combination at a time ("a skill roll is required to learn each particular
				// combination of missile weapon type and projectile type", Master's Manual), so an
				// entry here is what makes the skill apply at all.
				//
				// Each entry is "Launcher/Missile" -- "Long Bow/Arrow", or "Thrown/Dagger" for a
				// weapon thrown from the hand -- which is his shape (multi_missile_know_list /
				// multi_missile_lore_list).
				multiMissileKnowList: new fields.StringField({ required: true, initial: "" }),
				multiMissileLoreList: new fields.StringField({ required: true, initial: "" })
			}),

			// @MARKER NOTES
			biography: new fields.HTMLField({ required: true, initial: "" })
		};
	}

	//==========================================================================================
	// @MARKER BASE DATA
	//==========================================================================================
	// Everything Active Effects are allowed to target must exist by the end of this step,
	// because effects are applied between prepareBaseData and prepareDerivedData.
	//
	// The effect target is attributes.<attr>.value. Putting it here and deriving everything
	// else from it in the next step means a single "+2 Strength" effect correctly cascades
	// into the save, the melee and damage modifiers, load limit, Endurance, and every skill
	// governed by Strength -- rather than each of those needing its own effect.
	prepareBaseData() {
		super.prepareBaseData(); // required: skipping this silently breaks two-phase effects

		// Race and class are embedded items. Cache them here so every later step can reach
		// them without searching the collection again.
		//
		// A character may be of two races -- his Half Race (see module/race-rules.mjs). With two
		// race items, raceItem is NOT either of them: it is a stand-in carrying the combined race
		// his applyHalfRaceToAttribs would produce, in the same shape as a race item, so every
		// step below that reads raceItem.system reads the half race without knowing it is one.
		// raceItems is always the real items, in the order they were added; the first is the one
		// whose body and special movement a half race keeps.
		this.raceItems = this._findItems("race");
		this.raceItem  = this._getEffectiveRace(this.raceItems);

		// A character may hold more than one class. The Player's Guide allows a dual-classed
		// character who meets both classes' requirements, and his Roll20 sheet has no provision
		// for it at all -- one classname field and nothing else -- so this half is built from the
		// book rather than ported. classItem stays as the first one, which is what a single-classed
		// character has and what everything reading one class still wants; classItems is the whole
		// list, and the rules that combine two classes read that.
		this.classItems = this._findItems("class");
		this.classItem = this.classItems[0] ?? null;

		// Racial attribute modifiers are folded into the base, BEFORE effects, so that a
		// temporary magical bonus stacks on top of the racial baseline rather than competing
		// with it.
		var tmpracemods = this.raceItem ? this.raceItem.system.attributeMods : null;

		for (const tmpkey of Object.keys(this.attributes)) {
			var tmpattrib = this.attributes[tmpkey];
			var tmpracemod = (tmpracemods && tmpracemods[tmpkey]) ? tmpracemods[tmpkey] : 0;
			tmpattrib.raceMod = tmpracemod;
			tmpattrib.value = tmpattrib.rating + tmpracemod + tmpattrib.permMod + tmpattrib.tempMod;
		}
	}

	// This is the function which works out the race a character actually has.
	//
	//     no race item        null
	//     one                 that item, as it is -- his One Race
	//     two                 a stand-in { name, system } holding the two combined as his Half
	//                         Race combines them (combineHalfRace), named "first|second" as his
	//                         full_race_name is
	//     three or more       the first two, as a Half Race. His Multi Race(3) and (4) are on his
	//                         race-type list but not implemented ("not yet implemented. Nothing
	//                         done."), so there is no rule of his to follow for a third race; the
	//                         extras are reported on identity.raceWarning rather than dropped silently.
	_getEffectiveRace(tmpraceitems) {
		if (tmpraceitems.length == 0) { return null; }
		if (tmpraceitems.length == 1) { return tmpraceitems[0]; }
		return {
			name:   getHalfRaceName(tmpraceitems[0].name, tmpraceitems[1].name),
			system: combineHalfRace(tmpraceitems[0].system, tmpraceitems[1].system)
		};
	}

	// This is the function which finds every embedded item of a given type, in the order the
	// actor holds them. Used for classes, where a second one means a dual-classed character, and
	// for races, where a second one means a half race.
	_findItems(tmptype) {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return []; }
		var tmpfound = [];
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type == tmptype) { tmpfound.push(tmpitem); }
		}
		return tmpfound;
	}

	// This is the function which asks every class the character holds whether it grants something
	// at a title, and reports the best answer.
	//
	// Each class carries its own "when" for a lore or a chart, and each is tested against its own
	// title, because a dual-classed character advances the two separately. A character HAS the
	// thing if any class has reached its own threshold -- they learn the skills of both classes
	// (Dual Class, Class Determination rule 5), and where two versions compete the better applies
	// (Experience and Advancement rule 4).
	//
	// The `when` reported back is the threshold of whichever class actually granted it, or the
	// lowest non-zero one where none has been reached yet, so the sheet can say what is still to
	// come rather than showing a zero that reads as "never".
	_getBestClassTitle(tmpfield) {
		var tmpout = { when: 0, reached: false, title: 0 };
		for (const tmpclass of this.classItems) {
			var tmpwhen = parseInt(tmpclass.system[tmpfield]) || 0;
			if (tmpwhen <= 0) { continue; }

			var tmptitle = this._getClassTitle(tmpclass);
			if (hasLore(tmptitle, tmpwhen)) {
				if (!tmpout.reached || tmpwhen < tmpout.when) {
					tmpout = { when: tmpwhen, reached: true, title: tmptitle };
				}
			} else if (!tmpout.reached && (tmpout.when == 0 || tmpwhen < tmpout.when)) {
				tmpout = { when: tmpwhen, reached: false, title: tmptitle };
			}
		}
		return tmpout;
	}

	// This is the function which gives one class's own title on this character.
	//
	// A dual-classed character advances each class separately, so the title belongs with the
	// class. Zero on the class means "follow the character's own title", which is every
	// single-classed character and why nothing had to change for one.
	_getClassTitle(tmpclassitem) {
		if (!tmpclassitem) { return 0; }
		return (parseInt(tmpclassitem.system.title) || 0) || (parseInt(this.identity.title) || 0);
	}

	//==========================================================================================
	// @MARKER DERIVED DATA
	//==========================================================================================
	// Runs after Active Effects have been applied. Order matters here and follows the chain
	// documented in docs/DATA-MODEL.md section 9 -- attributes feed the characteristics, which
	// feed Shock. Nothing in this method may read a value computed later in it.
	prepareDerivedData() {
		super.prepareDerivedData();

		// Attributes first: the dual-class requirement check in _prepareIdentity compares against
		// them, and _prepareAttributes is where a rating above its racial cap gets clamped down.
		// Nothing in _prepareAttributes reads anything _prepareIdentity derives -- the title it
		// uses for the cap rule is stored, not derived -- so the two swap safely.
		this._prepareAttributes();
		this._prepareIdentity();
		this._prepareCharacteristics();
		this._prepareResistances();
		this._prepareLanguages();
		this._prepareEncumbrance();
		this._prepareCombat();
		this._prepareBody();
		this._prepareMovement();
		// The book's encumbrance penalty, beside the unencumbered rates rather than over them.
		this.movement.loaded = resolveLoadedMovement(this.movement, this.encumbrance);
		this._prepareSkillSlots();
		this._prepareSkills();
		this._prepareSkillSlotStatus();
		this._prepareOffhandSkills();
		this._prepareAvailability();

		// NOT YET IMPLEMENTED, and deliberately so rather than guessed at:
		//   evoke mutations      -- buildCharacterBody in the original sheet adds extra torsos,
		//                           limbs, wings and tails on top of the body chart. Only the
		//                           stock charts are used here.
		//   encumbrance extras   -- quality tags, floating items, and the Lighten Load / Spirit
		//                           of the Donkey magic his calcEncumbrance reads; see the
		//                           encumbrance block in combat-rules.mjs.
	}

	// This is the function which flags every item on the character that the campaign's
	// content switches currently disallow.
	//
	// Items are flagged, never removed. If a Game Master switches a sourcebook or a kind of
	// magic off mid-campaign, a player's existing skills and gear stay on their sheet, marked
	// unavailable with the reason, rather than disappearing behind their back.
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

	// This is the function which returns the armour the character is actually wearing.
	_getWornArmor() {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return []; }
		var tmpworn = [];
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type == "armor" && tmpitem.system.location == "equipped") { tmpworn.push(tmpitem); }
		}
		return tmpworn;
	}

	// This is the function which separates what is worn into the four armour layers and the
	// shields over them. A shield covers a run of areas down one side rather than a single slot,
	// and his sheet keeps it in a fifth layer of its own, so the two are totalled separately and
	// a shield must not also be counted as ordinary armour -- its armour value sits in the
	// left-hand column whichever hand holds it, so counting it twice would armour the wrong hand.
	_getWornShields() {
		return this._getWornArmor().filter(tmpitem => tmpitem.system.isShield);
	}

	// This is the function which works out the character's standing combat values.
	//
	// Attack skill comes from the class's progression and the character's title. Armour worn
	// counts against initiative, defence and weapon speed, and all three work the same way
	// round: a positive penalty is worse. A heavy scale suit is +1 to initiative (acting a second
	// later), +3 to anyone attacking the wearer, and +2 seconds on every swing.
	_prepareCombat() {
		var tmpaglmods = this.attributes.agl.mods;
		var tmpintmods = this.attributes.int.mods;
		var tmpstrmods = this.attributes.str.mods;

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

		// The attack chart. A dual-classed character fights at the better of their two classes'
		// charts -- Player's Guide, Dual Class, Experience and Advancement rule 5, "Attack skill is
		// determined by the greater of the two values" -- and each class is read at ITS OWN title,
		// since the two advance separately.
		this.combat.attackSkill = "None";
		for (const tmpclass of this.classItems) {
			var tmpclassskill = getAttackSkillForTitle(tmpclass.system.attackSkillList,
				this._getClassTitle(tmpclass));
			this.combat.attackSkill = getBetterAttackSkill(this.combat.attackSkill, tmpclassskill);
		}

		// The Lore chart: the standard chart one level up, for a weapon the character has Weapon
		// or Missile Lore in. A class reaches it at its own title and about half never do.
		// His code keeps this as a second stored chart (special_attack_skill); it is derived here
		// because everything it depends on already is.
		//
		// Reached if EITHER class reaches it, each at its own title. The book does not rule on
		// this one directly, so it follows rule 4's principle -- where two versions of something
		// compete, the better applies -- which is also what rule 5 does for the chart it is built
		// from. Recorded in DECISIONS.md as a reading rather than a citation.
		this.combat.loreAttackTitle = this._getBestClassTitle("loreAttackTitle").when;
		this.combat.loreAttackSkill = this._getBestClassTitle("loreAttackTitle").reached
			? getNextAttackSkill(this.combat.attackSkill)
			: "";

		// Weapon and Missile Lore themselves, which are a different thing from the chart above:
		// a class can hold the lore without ever reading the Lore attack chart, and the two
		// titles rarely match. Zero means the class never acquires it at all.
		var tmpweaponlore = this._getBestClassTitle("weaponLoreTitle");
		var tmpmissilelore = this._getBestClassTitle("missileLoreTitle");
		this.combat.weaponLoreTitle = tmpweaponlore.when;
		this.combat.missileLoreTitle = tmpmissilelore.when;
		this.combat.hasWeaponLore = tmpweaponlore.reached;
		this.combat.hasMissileLore = tmpmissilelore.reached;

		// The lists themselves are stored as he stores them, one comma-separated string each.
		// Parsed here once so nothing downstream has to split a string.
		this.combat.weaponLoreNames = parseLoreList(this.combat.weaponLoreList);
		this.combat.missileLoreNames = parseLoreList(this.combat.missileLoreList);

		// Projectile Lore, worth damage per die rather than a flat figure.
		var tmpprojlore = this._getBestClassTitle("projectileLoreTitle");
		this.combat.projectileLoreTitle = tmpprojlore.when;
		this.combat.hasProjectileLore = tmpprojlore.reached;
		this.combat.projectileLoreNames = parseLoreList(this.combat.projectileLoreList);

		// Eligibility for the two off-hand fighting disciplines. This is title eligibility only
		// -- whether the class has reached the title that makes the skill available at all -- not
		// whether the character actually has the skill. The skill's own chance is read once
		// skills have resolved, in _prepareOffhandSkills below, since embedded skill items are not
		// finished computing here yet (see the ordering note on _prepareSkills).
		var tmpknow2nd = this._getBestClassTitle("secondWeaponKnowTitle");
		var tmplore2nd = this._getBestClassTitle("secondWeaponLoreTitle");
		this.combat.secondWeaponKnowTitle = tmpknow2nd.when;
		this.combat.secondWeaponLoreTitle = tmplore2nd.when;
		this.combat.hasSecondWeaponKnowledge = tmpknow2nd.reached;
		this.combat.hasSecondWeaponLore = tmplore2nd.reached;

		// Multiple Missile Lore, the last of the family. Title eligibility only, as above; the
		// combos themselves are named launcher/missile pairs and the mechanics that read them are
		// not built yet. Its Knowledge half has no title gate in his sheet at all.
		var tmpmmlore = this._getBestClassTitle("multiMissileLoreTitle");
		this.combat.multiMissileLoreTitle = tmpmmlore.when;
		this.combat.hasMultiMissileLore = tmpmmlore.reached;

		this.combat.initiativeMod = getInitiativeModifier(
			tmpaglmods.initiativeAdjust, tmpintmods.initiativeAdjust,
			tmparmorinit + (parseInt(this.combat.initiativeMisc) || 0));

		// Added to anyone's attack roll against this character. Lower is better for them.
		this.combat.defensiveAdjust = (parseInt(tmpaglmods.defensiveAdjust) || 0)
		                            + tmparmordef + (parseInt(this.combat.defenseMisc) || 0);

		// Added to every weapon's speed: Strength, Agility, then armour.
		this.combat.weaponSpeedMod = (parseInt(tmpstrmods.weaponSpeed) || 0)
		                           + (parseInt(tmpaglmods.weaponSpeed) || 0) + tmparmorspeed;

		this.combat.meleeAttack   = parseInt(tmpstrmods.meleeAttack) || 0;
		this.combat.meleeDamage   = parseInt(tmpstrmods.meleeDamage) || 0;
		this.combat.missileAttack = parseInt(tmpaglmods.missileAttack) || 0;
		this.combat.armorSkillPenalty = tmparmorskills;
	}

	// This is the function which lays out the character's body: every area of their body chart,
	// with its Endurance, the wounds it has taken, the armour protecting it, and what state it
	// is in.
	//
	// An area's Endurance is the character's Endurance times the area's multiplier, rounded up.
	// Its armour is the sum of every worn layer covering it, less any damage that armour has
	// taken. Beyond its Endurance a Vitality save is needed; beyond Endurance plus Vitality the
	// area's effect is triggered. Total wounds over Shock put the character into shock.
	_prepareBody() {
		var tmpbodytype = this.body.bodyType || (this.raceItem ? this.raceItem.system.bodyType : "") || "Humanoid";
		var tmpendurance = this.characteristics.endurance.value;
		var tmpvitality = this.attributes.vit.value;
		var tmpworn = this._getWornArmor().filter(tmpitem => !tmpitem.system.isShield);
		var tmpshields = this._getWornShields();
		var tmphandedness = this.physical.handedness;
		var tmpwounds = this.body.wounds ?? {};
		var tmparmordamage = this.body.armorDamage ?? {};

		var tmpareas = [];
		var tmptotal = 0;
		for (const tmparea of getBodyChart(tmpbodytype)) {
			var tmpend = getAreaEndurance(tmpendurance, tmparea.multiplier);
			var tmphurt = parseInt(tmpwounds[tmparea.name]) || 0;
			tmptotal = tmptotal + tmphurt;

			// Armour here: every worn layer that covers this area, less its accumulated damage.
			// Which slot covers an area depends on the body: a centaur's forequarters take
			// barding, a snake's length takes a torso piece. See getAreaArmorSlot.
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

		this.body.type = tmpbodytype;
		this.body.areas = tmpareas;
		this.body.totalWounds = tmptotal;
		this.body.inShock = (this.body.shock != 0) && (tmptotal > this.body.shock);
	}

	// This is the function which totals carried weight and works out how encumbered the
	// character is. The arithmetic is his calcEncumbrance, shared with the creature model --
	// see resolveEncumbrance in combat-rules.mjs for the bands, the size scaling of armour and
	// gear, and the magical-plus weight reduction.
	_prepareEncumbrance() {
		var tmpphys = this.physical ?? {};
		var tmpinches = ((parseInt(tmpphys.heightFeet) || 0) * 12) + (parseInt(tmpphys.heightInches) || 0);
		this.encumbrance = resolveEncumbrance(this.parent?.items,
			this.attributes.str.mods.loadLimit, tmpphys.weight, tmpinches);
	}

	// This is the function which fills in the identity values that come from the class items.
	//
	// A dual-classed character is named for both -- "Mage/Warrior", which is how the Player's Guide
	// writes them -- and carries a row per class, since each has its own title and its own title
	// name. The single-class strings stay exactly what they were, so nothing that reads className
	// has to know about any of this.
	_prepareIdentity() {
		this.identity.raceName  = this.raceItem ? this.raceItem.name : "";
		// His race_type values; only these two are implemented in his sheet.
		this.identity.raceType  = (this.raceItems.length > 1) ? "Half Race" : "One Race";
		this.identity.isHalfRace = this.raceItems.length > 1;
		this.identity.raceWarning = (this.raceItems.length > 2)
			? "Only two races combine: his sheet's Multi Race is not implemented. "
			  + this.raceItems.slice(2).map(tmprace => tmprace.name).join(", ") + " ignored."
			: "";
		// What the race (or the half race, already combined) gives, for the sheet to show. Listed,
		// not applied: the ability mechanics and the racial-skill picker are not ported yet.
		var tmpracesys = this.raceItem ? this.raceItem.system : null;
		this.identity.race = tmpracesys ? {
			skills:       tmpracesys.racialSkills ?? [],
			skillNote:    tmpracesys.racialSkillNote ?? "",
			abilities:    tmpracesys.abilities ?? [],
			disabilities: tmpracesys.disabilities ?? [],
			immunities:   tmpracesys.immunities ?? [],
			ages:         tmpracesys.ages ?? { startLow: 0, startHigh: 0, maxAge: "" }
		} : null;
		this.identity.className = this.classItem ? this.classItem.name : "";
		this.identity.classType = this.classItem ? this.classItem.system.classType : "";
		this.identity.titleName = this.classItem ? this.classItem.getTitleName(this.identity.title) : "";

		this.identity.classes = this.classItems.map(tmpclass => {
			var tmptitle = this._getClassTitle(tmpclass);
			return {
				id: tmpclass.id,
				name: tmpclass.name,
				classType: tmpclass.system.classType,
				title: tmptitle,
				titleName: tmpclass.getTitleName(tmptitle),
				skillSlotsNeeded: parseInt(tmpclass.system.skillSlotsNeeded) || 0
			};
		});
		this.identity.isDualClass = this.identity.classes.length > 1;
		this.identity.classNames = this.identity.classes.map(c => c.name).join("/");

		// Both classes' progressions have to be paid for out of one Knowledge allowance, which is
		// the Player's Guide's own reason for the slot tricks existing ("a dual classed character
		// will need to have many class skill slots"). Summed rather than maxed for that reason.
		this.identity.classSlotsNeeded = this.identity.classes
			.reduce((tmptotal, tmpclass) => tmptotal + tmpclass.skillSlotsNeeded, 0);

		this.identity.dualClassIssues = this._getDualClassIssues();
		this.identity.raceIssues = this._getRaceIssues();
	}

	// This is the function which lists what is wrong with the character's race against the rest
	// of the character. Reported, never refused -- his sheet lets the player override a barred
	// class ("is usually not this class. This was overriden!"), and the Player's Guide makes a
	// mixed race the Game Master's call.
	//
	//   a class the race cannot take      his classRaceAndDetails, via isClassBlockedForRaces:
	//                                     for a half race, only if BOTH races are barred
	//   two races that cannot breed       his racefertiledict, the list his Half Race picker
	//                                     offers -- so on his sheet this pair could not be chosen
	_getRaceIssues() {
		var tmpissues = [];
		var tmpnames = this.raceItems.map(tmprace => tmprace.name);
		if (tmpnames.length == 0) { return tmpissues; }

		for (const tmpclass of this.classItems) {
			if (isClassBlockedForRaces(tmpclass.system.blockedRaces, tmpnames)) {
				tmpissues.push(`${this.identity.raceName} is usually not a ${tmpclass.name}.`);
			}
		}

		if (this.raceItems.length > 1) {
			var tmpfirst = this.raceItems[0];
			if (!canRacesBreed(tmpfirst.name, tmpfirst.system.fertileWith, this.raceItems[1].name)) {
				tmpissues.push(`${tmpfirst.name} and ${this.raceItems[1].name} cannot have children together.`);
			}
		}
		return tmpissues;
	}

	// This is the function which lists what stops this character being dual-classed.
	//
	// Player's Guide, "Dual Class Characters", Requirements: the character "must meet attribute
	// requirements of both classes and must have a minimum Knowledge of 15", and must meet the
	// racial requirements for both. It is also a decision the Game Master has to support, so
	// nothing here refuses anything -- it reports, and the sheet shows it.
	//
	// The racial half is checked separately, for every character and not only a dual-classed
	// one, by _getRaceIssues -- his classRaceAndDetails does carry which races each class is
	// closed to, which an earlier pass here missed.
	_getDualClassIssues() {
		if (!this.identity.isDualClass) { return []; }

		var tmpissues = [];
		if ((parseInt(this.attributes.knw.value) || 0) < 15) {
			tmpissues.push(`Dual class needs Knowledge 15; this character has ${this.attributes.knw.value}.`);
		}

		var tmporder = ["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"];
		for (const tmpclass of this.classItems) {
			var tmpqualify = tmpclass.system.requirements?.attribQualify ?? [];
			for (var i = 0; i < tmporder.length; i++) {
				var tmpneeded = parseInt(tmpqualify[i]) || 0;
				if (!tmpneeded) { continue; }
				var tmphas = parseInt(this.attributes[tmporder[i]].value) || 0;
				if (tmphas < tmpneeded) {
					tmpissues.push(`${tmpclass.name} needs ${tmporder[i].toUpperCase()} ${tmpneeded}; this character has ${tmphas}.`);
				}
			}
		}
		return tmpissues;
	}

	// This is the function which sets each attribute's two maximums, its save percentage and its
	// table-driven modifiers.
	//
	// THERE ARE TWO CEILINGS, not one. The ordinary maximum is the race's own limit until title
	// 11, when racial limits are discarded and 25 applies; the magical maximum is higher and
	// tiered by title (23 / 25 / 27). He confirmed the pair on 2026-09-16 -- "25 for normal
	// statistic upgrades, 27 for magical upgrades" -- which resolved what had looked like a
	// contradiction in his code. See getMagicalAttributeMax and UPSTREAM-ISSUES.md item 16.
	//
	// Only the ordinary maximum clamps the value today. Applying the magical one needs modifiers
	// split into mundane and magical channels the way his sheet splits them (tmp_mod_str_mundane
	// against tmp_mod_str_magic), which the port does not do yet -- so the figure is derived and
	// shown, and nothing is clamped by it until there is a magical modifier to clamp.
	//
	// It is applied here rather than in prepareBaseData so it also constrains anything an Active
	// Effect added.
	_prepareAttributes() {
		var tmpracelimits = this.raceItem ? this.raceItem.system.attributeLimits : null;
		var tmpmagicalcap = ImagineCharacterData.getMagicalAttributeMax(this.identity.title);

		for (const tmpkey of Object.keys(this.attributes)) {
			var tmpattrib = this.attributes[tmpkey];

			var tmpracelimit = (tmpracelimits && tmpracelimits[tmpkey]) ? tmpracelimits[tmpkey] : 0;
			var tmpcap = ImagineCharacterData.getAttributeMax(this.identity.title, tmpracelimit);

			tmpattrib.max = tmpcap;
			tmpattrib.magicalMax = tmpmagicalcap;
			if (tmpattrib.value > tmpcap) { tmpattrib.value = tmpcap; }
			if (tmpattrib.value < 0) { tmpattrib.value = 0; }

			tmpattrib.save = ImagineCharacterData.getAttribSave(tmpattrib.value);

			// The table modifiers are irregular lookup values, not formulas -- see
			// module/config-tables.mjs. Missing ratings fall back to an empty set rather
			// than throwing, so a malformed actor still opens.
			var tmptable = ATTRIBUTE_TABLES[tmpkey];
			tmpattrib.mods = (tmptable && tmptable[tmpattrib.value]) ? tmptable[tmpattrib.value] : {};
		}
	}

	// This is the function which calculates the four characteristics. Each is the average of
	// one of the four attribute categories, rounded up, then adjusted.
	//     Endurance  = physical  (STR AGL VIT)
	//     Perception = mental    (INT WIS KNW)
	//     Affinity   = personal  (APP CHM SOC)
	//     Fortune    = mystical  (AUR PTY WIL)
	// Shock is Endurance x 3, per the Player's Guide character creation steps.
	_prepareCharacteristics() {
		var tmpattribs = this.attributes;

		// Pull the racial modifiers across before the totals are worked out. Endurance takes
		// its racial modifier from the race's starting-endurance figure, which is where the
		// original sheet kept it (race_start_end_mod).
		if (this.raceItem) {
			var tmpracesys = this.raceItem.system;
			this.characteristics.endurance.raceMod  = tmpracesys.endurance.startMod;
			this.characteristics.perception.raceMod = tmpracesys.characteristicMods.perception;
			this.characteristics.affinity.raceMod   = tmpracesys.characteristicMods.affinity;
			this.characteristics.fortune.raceMod    = tmpracesys.characteristicMods.fortune;
		}

		this._setCharacteristic("endurance",  tmpattribs.str.value, tmpattribs.agl.value, tmpattribs.vit.value);
		this._setCharacteristic("perception", tmpattribs.int.value, tmpattribs.wis.value, tmpattribs.knw.value);
		this._setCharacteristic("affinity",   tmpattribs.app.value, tmpattribs.chm.value, tmpattribs.soc.value);
		this._setCharacteristic("fortune",    tmpattribs.aur.value, tmpattribs.pty.value, tmpattribs.wil.value);

		this.body.shock = this.characteristics.endurance.value * 3;
	}

	// This is the function which averages three attributes and applies the stored adjustments.
	// The +.99 truncation is his rounding idiom from changeCharacteristics, kept as-is so the
	// arithmetic matches his sheet exactly rather than merely closely.
	_setCharacteristic(tmpname, tmpvalue1, tmpvalue2, tmpvalue3) {
		var tmpchar = this.characteristics[tmpname];
		var tmpbase = parseInt(((tmpvalue1 + tmpvalue2 + tmpvalue3) / 3) + 0.99) || 0;

		tmpchar.base = tmpbase;
		tmpchar.value = tmpbase + tmpchar.titleBonus + tmpchar.raceMod + tmpchar.permMod + tmpchar.tempMod;
	}

	// This is the function which resolves the five resistance tracks. Each has a base drawn
	// from an attribute's table, plus manual adjustment. Class and racial bonuses arrive as
	// Active Effects rather than the string matching the original sheet used
	// ("+10% Magic Resist", "+5% all Resists").
	// An immunity replaces the percentage outright, so it is checked first.
	_prepareResistances() {
		var tmpmods = {
			str: this.attributes.str.mods, agl: this.attributes.agl.mods,
			vit: this.attributes.vit.mods, int: this.attributes.int.mods,
			wis: this.attributes.wis.mods, aur: this.attributes.aur.mods,
			wil: this.attributes.wil.mods
		};

		this._setResistance("magic",    tmpmods.aur.magicResist);
		this._setResistance("illusion", tmpmods.wis.illusionResist);
		this._setResistance("poison",   tmpmods.vit.poisonResist);
		this._setResistance("disease",  tmpmods.vit.diseaseResist);

		// Control Resistance is the one that combines sources: a base from Will Force, then
		// adjustments from both Intelligence and Wisdom.
		var tmpcontrol = (tmpmods.wil.controlResist || 0)
		               + (tmpmods.int.controlResistAdjust || 0)
		               + (tmpmods.wis.controlResistAdjust || 0);
		this._setResistance("control", tmpcontrol);
	}

	// This is the function which finalises one resistance track.
	_setResistance(tmpname, tmpbase) {
		var tmpresist = this.resistances[tmpname];
		var tmpracemod = 0;
		if (this.raceItem) { tmpracemod = this.raceItem.system.resistanceMods[tmpname] || 0; }

		tmpresist.base = parseInt(tmpbase) || 0;
		tmpresist.raceMod = tmpracemod;
		tmpresist.value = tmpresist.immune ? null : tmpresist.base + tmpracemod + tmpresist.misc;
	}

	// @MARKER LANGUAGE ALLOWANCE
	// This is the function which works out how many languages the character's Intelligence
	// allows, and whether the languages recorded on the sheet fit inside it.
	//
	// Ported from his setLangSheet (sheet-worker.js:49228, run at character creation) and its
	// twin setUpdateLanguageSheet (50561, run from the Update Languages step). The two switches
	// agree case for case across all 31 ratings -- checked 2026-09-18. The update copy reads the
	// character's CURRENT intelligence, not the creation-time int_final, so the allowance
	// follows the attribute as it stands, which is what a derived value does anyway. The Player's
	// Guide agrees: the figures come from "Intelligence score after all modifications".
	//
	// A row on the sheet is a slot, named or not. The Player's Guide lets a character "leave any
	// number of language slots open for future learning", and an empty row is exactly that, so
	// it counts against the allowance like a named one.
	//
	// Nothing is refused or removed. A character whose Intelligence falls keeps every language
	// they had, and the rows past the allowance are flagged -- the same call already made for
	// skill slots and for content the campaign has switched off.
	_prepareLanguages() {
		var tmpintmods  = this.attributes.int.mods;
		var tmpspoken   = parseFloat(tmpintmods.spokenLanguages)  || 0;
		var tmpwritten  = parseFloat(tmpintmods.writtenLanguages) || 0;
		var tmplabels   = ImagineCharacterData.getLanguageSlotLabels(tmpspoken, tmpwritten);

		// A slot writes if his label says it does, whole or partly ("Speaks/third writes:").
		var tmpwriteslots = tmplabels.filter(tmplabel => tmplabel.includes("writes")).length;

		var tmplanguages = this.languages ?? [];
		var tmpwrittenused = tmplanguages.filter(tmplang => tmplang.write).length;

		this.languageAllowance = {
			spoken:       tmpspoken,          // straight off his Intelligence table
			written:      tmpwritten,
			labels:       tmplabels,          // his own slot labels, one per slot
			slots:        tmplabels.length,
			writtenSlots: tmpwriteslots,
			used:         tmplanguages.length,
			writtenUsed:  tmpwrittenused,
			overSpoken:   tmplanguages.length > tmplabels.length,
			overWritten:  tmpwrittenused > tmpwriteslots,
			rows:         ImagineCharacterData.assignLanguageSlots(tmplanguages, tmplabels)
		};
	}

	// This is the function which sets the character's movement rates from their race.
	// Every mode is tracked at three scales at once -- per hour, per 10 second combat round,
	// and per second.
	//
	// The rates here are UNENCUMBERED, as his sheet shows them. His sheet never slows a loaded
	// character down; the Player's Guide does, so the rates at the current load are worked out
	// alongside as movement.loaded (resolveLoadedMovement) rather than replacing these.
	_prepareMovement() {
		if (!this.raceItem) { return; }
		var tmpracemove = this.raceItem.system.movement;
		var tmpbase     = getMovementBase(this.attributes.agl.value);
		var tmpmulti    = tmpracemove.speedMultiplier;

		// The race's figures are MODIFIERS on the Agility base, not finished rates -- see the
		// movement block in combat-rules.mjs. A race carrying 0/0/0 has no modifier and moves at
		// the full base; it is not a race that cannot move.
		//
		// Each scale carries its own floor for a negative result: 1 mile, 10 feet, 1 foot.
		var tmpfloors = { hourly: 1, tenSec: 10, oneSec: 1 };
		for (const tmpmode of ["walk", "jog", "run"]) {
			for (const [tmpscale, tmpcolumn] of [["hourly", 0], ["tenSec", 1], ["oneSec", 2]]) {
				this.movement[tmpmode][tmpscale] = resolveMovementRate(
					tmpbase[tmpmode][tmpcolumn], tmpracemove[tmpmode][tmpscale],
					tmpmulti, tmpfloors[tmpscale]);
			}
		}

		// Jumping is the same shape -- an Agility base plus the race's modifier -- but has no
		// speed multiplier and no published floor, so a penalty is allowed to take it to zero.
		this.movement.jumpStand = Math.max(0, tmpbase.jumpStand + (parseFloat(tmpracemove.jumpStand) || 0));
		this.movement.jumpUp    = Math.max(0, tmpbase.jumpUp    + (parseFloat(tmpracemove.jumpUp)    || 0));

		// "None:" is his sentinel for a race with no special rate, not the name of one -- it is
		// carried by exactly the 79 races whose special base rate is empty. It is dropped here so
		// that absence reads as absence, and the sheet does not print a row labelled "None:".
		this.movement.specialName =
			(("" + (tmpracemove.specialName ?? "")).trim() == "None:") ? "" : tmpracemove.specialName;

		// The special rate builds on the rates just resolved, so it has to come after them.
		var tmpspecial = resolveSpecialMovement(tmpracemove.specialName, tmpracemove.special,
			this.movement, tmpmulti, this.attributes.int.value);
		this.movement.special.hourly = tmpspecial.hourly;
		this.movement.special.tenSec = tmpspecial.tenSec;
		this.movement.special.oneSec = tmpspecial.oneSec;

		// For a slithering race the special rate is not an extra on top of walking, it is the whole
		// of their movement -- "Slither is the only movement sssssnake people have", and they do
		// not jump either. His sheet zeroes these after the fact too, so this runs last.
		if (specialMovementReplacesOther(tmpracemove.specialName)) {
			for (const tmpmode of ["walk", "jog", "run"]) {
				this.movement[tmpmode].hourly = 0;
				this.movement[tmpmode].tenSec = 0;
				this.movement[tmpmode].oneSec = 0;
			}
			this.movement.jumpStand = 0;
			this.movement.jumpUp    = 0;
		}
	}

	// This is the function which reads the skill slot allowances off the Knowledge table, and
	// then applies whatever trades the character has made to them.
	//
	// A character may not hold more skills in a category than they have slots for it -- but the
	// allowance itself is not fixed, since the Player's Guide's "slot tricks" let racial and
	// social slots be traded between categories or given up for a bonus. The base figures are
	// Knowledge's; getSlotAllowance does the trading arithmetic, ported from his four conversion
	// functions. Both are kept, so the sheet can show what the trades cost.
	_prepareSkillSlots() {
		var tmpknw = this.attributes.knw.mods;

		var tmpbase = {
			class:  parseInt(tmpknw.classSkills) || 0,
			racial: parseInt(tmpknw.raceSkills) || 0,
			social: parseInt(tmpknw.socialSkills) || 0
		};
		var tmpallowance = getSlotAllowance(tmpbase, this.skillSlotMoves);

		this.skillSlots = {
			class:         tmpallowance.class,
			racial:        tmpallowance.racial,
			social:        tmpallowance.social,
			classBase:     tmpbase.class,
			racialBase:    tmpbase.racial,
			socialBase:    tmpbase.social,
			memorization:  parseInt(tmpknw.memorizationPoints) || 0,
			classUsed:  0,
			racialUsed: 0,
			socialUsed: 0,
			classOver:  false,
			racialOver: false,
			socialOver: false
		};
	}

	// This is the function which notices a category holding more skills than it has slots for.
	//
	// Split out as its own step, run straight after _prepareSkills, because the used counts are
	// made there and the allowance is made in _prepareSkillSlots before it -- the comparison
	// cannot live in either without one of them reading a value the other has not written yet.
	//
	// It flags rather than prevents. His sheet refuses the selection outright ("More selected than
	// total slots. Nothing done.", sheet-worker.js:7049), but it refuses at a character-generation
	// step this port has not built, and a skill here is an Item that can be dropped on an actor
	// from anywhere. Flagging matches how availability already marks an item that should not be
	// there without deleting it, and leaves the Game Master the last word.
	_prepareSkillSlotStatus() {
		this.skillSlots.classOver  = this.skillSlots.classUsed  > this.skillSlots.class;
		this.skillSlots.racialOver = this.skillSlots.racialUsed > this.skillSlots.racial;
		this.skillSlots.socialOver = this.skillSlots.socialUsed > this.skillSlots.social;
	}

	// This is the function which calculates every skill chance on the character, and counts
	// how many slots each category has consumed.
	//
	// Player's Guide p.94:
	//     base chance  = (combined attributes - skill rating) x 5%
	//     total chance = base chance + starting bonus + ability bonus + modifiers
	// A skill being attempted untrained uses the base chance alone, with no starting bonus.
	//
	// This runs from the actor rather than from the skill item because embedded items are
	// prepared BEFORE the actor's derived data, so a skill computing for itself would read
	// attribute values that are not final yet.
	_prepareSkills() {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return; }

		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type != "skill") { continue; }
			var tmpskill = tmpitem.system;

			var tmpcombined = this._getCombinedAttributes(tmpskill.attr1, tmpskill.attr2);
			tmpskill.combinedAttributes = tmpcombined;
			tmpskill.baseChance = (tmpcombined - tmpskill.skillRating) * 5;

			if (tmpskill.isCommon) {
				tmpskill.totalChance = tmpskill.baseChance + tmpskill.misc;
			} else {
				tmpskill.totalChance = tmpskill.baseChance
				                     + tmpskill.startingBonus
				                     + tmpskill.abilityBonus
				                     + tmpskill.misc;
				if (tmpskill.category == "class")  { this.skillSlots.classUsed++; }
				if (tmpskill.category == "racial") { this.skillSlots.racialUsed++; }
				if (tmpskill.category == "social") { this.skillSlots.socialUsed++; }
			}
		}
	}

	// This is the function which resolves the two off-hand fighting skills' chances, once
	// _prepareSkills above has finished computing every skill's totalChance. Split out as its
	// own step, run straight after _prepareSkills in prepareDerivedData, because _prepareCombat
	// -- where the title-eligibility flags above are set -- runs BEFORE skills are prepared, and
	// changing that order would risk other combat fields silently depending on it.
	//
	// A character not yet eligible by title reads as 0, exactly as having no skill at all would --
	// see the gating note on resolveOffhandPenalties in combat-rules.mjs.
	_prepareOffhandSkills() {
		this.combat.secondWeaponKnowChance = this.combat.hasSecondWeaponKnowledge
			? this._getSkillChance("Second Weapon Knowledge") : 0;
		this.combat.secondWeaponLoreChance = this.combat.hasSecondWeaponLore
			? this._getSkillChance("Second Weapon Lore") : 0;

		// Multiple Missile Knowledge's own percentage, which is what buys the multi-missile
		// penalty down 1 and 2 at a time. Unlike its Lore half there is no class title gating it
		// in his sheet at all -- holding the skill is the whole of it -- so this is read straight
		// off the actor with no eligibility test in front of it.
		this.combat.multiMissileKnowChance = this._getSkillChance("Multiple Missile Knowledge");

		// How many of the round's ten seconds may go to off-hand actions -- a cap, not a pool;
		// nothing here tracks how much of it a round has already spent. See getOffhandSecondsCap.
		this.combat.offhandSecondsCap = getOffhandSecondsCap(
			this.physical.handedness, this.combat.secondWeaponLoreChance);
	}

	// This is the function which reads one named skill's resolved chance off the actor, for the
	// handful of places (currently only off-hand fighting) that need a skill's own percentage
	// rather than its presence. Zero if the character has no skill of that name -- untrained
	// reads the same as absent, which is his behaviour too (storeTempSkillChanceAndMessage finds
	// nothing and temp_skill_chance stays 0).
	_getSkillChance(tmpname) {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return 0; }
		var tmpskill = tmpactor.items.find(i => i.type == "skill" && i.name == tmpname);
		return tmpskill ? (parseInt(tmpskill.system.totalChance) || 0) : 0;
	}

	// This is the function which gives the chance for a skill the character does NOT hold,
	// attempted as a common skill.
	//
	// Player's Guide, "Who Can Use a Skill": "a character may attempt almost any skill in the game,
	// whether or not he has actually learned or acquired the skill... The common skill chance is
	// simply the base chance without the starting bonus." So this is the same first half of the
	// formula _prepareSkills uses, and deliberately none of the second: no starting bonus, no
	// ability bonus, no modifiers of the skill's own, because the character has no skill of their
	// own here to carry them.
	//
	// Two limits the book puts on it are the caller's, not this function's: a restricted skill
	// cannot be attempted at all, and "any skill for which the character has rolled a starting
	// bonus can no longer be attempted as a common skill" -- once held, it is rolled as itself.
	getCommonSkillChance(tmpattr1, tmpattr2, tmprating) {
		var tmpcombined = this._getCombinedAttributes(tmpattr1, tmpattr2);
		return (tmpcombined - (parseInt(tmprating) || 0)) * 5;
	}

	// This is the function which produces the combined attribute value for a skill.
	// One governing attribute is used as it stands; two are averaged and rounded up.
	_getCombinedAttributes(tmpattr1, tmpattr2) {
		var tmpfirst = this.attributes[String(tmpattr1 || "").toLowerCase()];
		if (!tmpfirst) { return 0; }
		if (!tmpattr2) { return tmpfirst.value; }

		var tmpsecond = this.attributes[String(tmpattr2).toLowerCase()];
		if (!tmpsecond) { return tmpfirst.value; }

		return Math.ceil((tmpfirst.value + tmpsecond.value) / 2);
	}

	//==========================================================================================
	// @MARKER GENERAL PURPOSE FUNCTIONS
	//==========================================================================================

	// This is the function which converts an attribute rating into its save percentage.
	// Ported from getAttribSave in the original sheet-worker with the branch order intact.
	// Ratings 18 through 20 all save at 90%; only a rating above 20 exceeds it.
	//
	// Note this is the BASE save only. The separate cap that applies when a save is modified
	// at roll time -- bonuses cannot lift a save past 90%, and cannot raise it at all once the
	// attribute is 21 or better -- belongs with the roll logic, not here.
	static getAttribSave(tmpAttribRating) {
		var tmpSaveValue = 0;
		if (tmpAttribRating < 18) {
			tmpSaveValue = parseInt(tmpAttribRating * 5);
		} else if (tmpAttribRating > 20) {
			tmpSaveValue = parseInt(90 + (tmpAttribRating - 20));
		} else {
			tmpSaveValue = 90;
		}
		return tmpSaveValue;
	}

	// This is the function which turns the Intelligence table's language figures into his slot
	// labels, exactly as setLangSheet writes them into tmp_lang1_sw through tmp_lang10_sw.
	//
	// His switch is written out case by case, one per rating, but every case follows the same
	// rule, and the rule is stated here rather than the 31 cases copied, since the figures it
	// reads are already in ATTRIBUTE_TABLES.int. The derivation suite holds his labels for every
	// rating 0-30 and checks this function against all of them.
	//
	//     spoken  written   slots
	//     0       0         none at all -- his "None"
	//     below 1 0         one language, only partly spoken: "Speaks(quarter):"
	//     1+      any       spoken rounded up; the first floor(written) of them also write,
	//                       and a fractional written figure lands on the next slot
	//
	// A fraction below 1 is a degree of command of ONE language, not a share of a second one.
	// The Player's Guide: "1/3 indicates the character has only the most basic vocabulary, 2/3
	// indicates ... limited comprehension", and a full language adds grammar.
	static getLanguageSlotLabels(tmpSpoken, tmpWritten) {
		// his fractions, rounded to the two places the table carries them at
		var tmpFractionWords = { 0.25: "quarter", 0.33: "third", 0.66: "two-thirds" };
		var tmpFractionWord = function (tmpValue) {
			return tmpFractionWords[Math.round(tmpValue * 100) / 100] || "";
		};

		var tmpLabels = [];
		if (tmpSpoken <= 0) { return tmpLabels; }
		if (tmpSpoken < 1) {
			tmpLabels.push("Speaks(" + tmpFractionWord(tmpSpoken) + "):");
			return tmpLabels;
		}

		var tmpSlots        = Math.ceil(tmpSpoken);
		var tmpFullWritten  = Math.floor(tmpWritten);
		var tmpPartWritten  = tmpWritten - tmpFullWritten;
		for (let tmpSlot = 0; tmpSlot < tmpSlots; tmpSlot++) {
			if (tmpSlot < tmpFullWritten) {
				tmpLabels.push("Speaks/writes:");
			} else if (tmpSlot == tmpFullWritten && tmpPartWritten > 0) {
				tmpLabels.push("Speaks/" + tmpFractionWord(tmpPartWritten) + " writes:");
			} else {
				tmpLabels.push("Speaks:");
			}
		}
		return tmpLabels;
	}

	// This is the function which decides which of his slots each recorded language sits in, so
	// every row can show the slot it is actually using and whether it is past the allowance.
	//
	// His sheet had no need of this: its slots were fixed rows with the label printed beside
	// each, and the player typed a name into one. Here a language is a row with its own speak
	// and write boxes, in whatever order they were added, so the slots are handed out by USE
	// rather than by position. Otherwise a written language added second would sit beside a
	// "Speaks:" label while an unwritten one sat on "Speaks/writes:".
	//
	// The Player's Guide sets the order: "A character can use a written slot for a spoken slot,
	// but not vice versa." So written languages take the writing slots first, the rest take the
	// speaking slots, and a speaking language may overflow into a writing slot nobody wrote in.
	// A written language with no writing slot left still speaks, in a speaking slot if one is
	// free -- it is over on writing only.
	//
	// Returns one entry per language, in the order given: { slotLabel, overSpoken, overWritten }.
	static assignLanguageSlots(tmpLanguages, tmpLabels) {
		var tmpWriteSlots = tmpLabels.filter(tmpLabel => tmpLabel.includes("writes"));
		var tmpSpeakSlots = tmpLabels.filter(tmpLabel => !tmpLabel.includes("writes"));
		var tmpRows = tmpLanguages.map(() => ({ slotLabel: "", overSpoken: false, overWritten: false }));

		// pass 1 -- written languages into the writing slots
		tmpLanguages.forEach((tmpLang, tmpIndex) => {
			if (tmpLang.write && tmpWriteSlots.length > 0) { tmpRows[tmpIndex].slotLabel = tmpWriteSlots.shift(); }
		});
		// pass 2 -- everything still unplaced into a speaking slot, then any writing slot left
		tmpLanguages.forEach((tmpLang, tmpIndex) => {
			if (tmpRows[tmpIndex].slotLabel != "") { return; }
			if (tmpLang.write) { tmpRows[tmpIndex].overWritten = true; }
			if (tmpSpeakSlots.length > 0)      { tmpRows[tmpIndex].slotLabel = tmpSpeakSlots.shift(); }
			else if (!tmpLang.write && tmpWriteSlots.length > 0) { tmpRows[tmpIndex].slotLabel = tmpWriteSlots.shift(); }
			else                               { tmpRows[tmpIndex].overSpoken = true; }
		});
		return tmpRows;
	}

	// This is the function which returns the highest rating an attribute may reach.
	//
	// This is the ORDINARY maximum -- how far stat-up rolls can take an attribute. The magical
	// maximum is a separate, higher ceiling; see getMagicalAttributeMax below.
	//
	// Ported from his sheet, which does this in two places: the race's limits become the
	// maximums when a race is chosen (sheet-worker.js:8099), and setArchMortalAttributesMax
	// (line 27549) replaces all twelve on titling to 11 -- discarding the racial limits, upwards
	// or downwards. Twenty is the standing default before a race is picked
	// (clearAttributeModifiersFinals, line 32502).
	//
	// That function writes 27, but his comment at its call site says 25, and he settled it on
	// 2026-09-16: 25 is the ordinary cap and 27 the magical one (UPSTREAM-ISSUES.md item 16).
	// So this returns 25, and the 27 lives in getMagicalAttributeMax.
	//
	// His code fires the arch-mortal replacement once, at exactly title 11, and the value then
	// persists; a derived model recomputes every time, so the test is "title 11 or more", which
	// reproduces the same resulting state.
	static getAttributeMax(tmpTitle, tmpRaceLimit) {
		var tmpTitleValue = parseInt(tmpTitle) || 0;
		if (tmpTitleValue >= 11) { return 25; }   // arch-mortal: racial limits are discarded
		var tmpLimit = parseInt(tmpRaceLimit) || 0;
		if (tmpLimit <= 0) { tmpLimit = 20; }     // no race chosen yet
		return tmpLimit;
	}

	// This is the function which gives how high an attribute may be raised BY MAGIC, which is a
	// different and higher ceiling from the one above.
	//
	// He settled this on 2026-09-16, answering what looked like a contradiction between a comment
	// saying 25 and a function setting 27 (docs/UPSTREAM-ISSUES.md item 16): *"25 for normal
	// statistic upgrades, 27 for magical upgrades. So you can raise it to 25 with stat up rolls,
	// and 27 is the cap when using magical boosts."* Both numbers were right; they are two caps.
	//
	// The tiers are his own, from setMagicalAttributeMaximums (sheet-worker.js:123007), and they
	// are the Master's Manual's four ranges exactly:
	//
	//     title 0        mundane      23
	//     titles 1-10    mortal       25
	//     titles 11-15   arch-mortal  27
	//
	// His function stops there and writes nothing above title 15, so nothing is invented for a
	// deity range: title 16 and up hold the arch-mortal 27 until he says otherwise.
	static getMagicalAttributeMax(tmpTitle) {
		var tmpTitleValue = parseInt(tmpTitle) || 0;
		if (tmpTitleValue < 1) { return 23; }
		if (tmpTitleValue < 11) { return 25; }
		return 27;
	}

	// @MARKER ADD NEW character data model functions HERE
}
// @END (CODE)
