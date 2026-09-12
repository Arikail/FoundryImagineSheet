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
	getInitiativeModifier, getAreaArmor, getAreaShield, getNextAttackSkill, hasLore, parseLoreList
} from "../combat/combat-rules.mjs";

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
				projectileLoreList: new fields.StringField({ required: true, initial: "" })
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
		this.raceItem  = this._findItem("race");
		this.classItem = this._findItem("class");

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

	// This is the function which finds an embedded item of a given type. Returns the first
	// match, or null. A character is expected to hold at most one race and one class.
	_findItem(tmptype) {
		var tmpactor = this.parent;
		if (!tmpactor || !tmpactor.items) { return null; }
		for (const tmpitem of tmpactor.items) {
			if (tmpitem.type == tmptype) { return tmpitem; }
		}
		return null;
	}

	//==========================================================================================
	// @MARKER DERIVED DATA
	//==========================================================================================
	// Runs after Active Effects have been applied. Order matters here and follows the chain
	// documented in docs/DATA-MODEL.md section 9 -- attributes feed the characteristics, which
	// feed Shock. Nothing in this method may read a value computed later in it.
	prepareDerivedData() {
		super.prepareDerivedData();

		this._prepareIdentity();
		this._prepareAttributes();
		this._prepareCharacteristics();
		this._prepareResistances();
		this._prepareEncumbrance();
		this._prepareCombat();
		this._prepareBody();
		this._prepareMovement();
		this._prepareSkillSlots();
		this._prepareSkills();
		this._prepareAvailability();

		// NOT YET IMPLEMENTED, and deliberately so rather than guessed at:
		//   evoke mutations      -- buildCharacterBody in the original sheet adds extra torsos,
		//                           limbs, wings and tails on top of the body chart. Only the
		//                           stock charts are used here.
		//   movement penalties   -- encumbrance is calculated, but the penalty each band
		//                           applies to movement has not been confirmed against his
		//                           code yet, so it is not applied.
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

		var tmplist = this.classItem ? this.classItem.system.attackSkillList : "";
		this.combat.attackSkill = getAttackSkillForTitle(tmplist, this.identity.title);

		// The Lore chart: the standard chart one level up, for a weapon the character has Weapon
		// or Missile Lore in. A class reaches it at its own title and about half never do.
		// His code keeps this as a second stored chart (special_attack_skill); it is derived here
		// because everything it depends on already is.
		var tmploretitle = this.classItem ? (parseInt(this.classItem.system.loreAttackTitle) || 0) : 0;
		this.combat.loreAttackTitle = tmploretitle;
		this.combat.loreAttackSkill = (tmploretitle > 0 && this.identity.title >= tmploretitle)
			? getNextAttackSkill(this.combat.attackSkill)
			: "";

		// Weapon and Missile Lore themselves, which are a different thing from the chart above:
		// a class can hold the lore without ever reading the Lore attack chart, and the two
		// titles rarely match. Zero means the class never acquires it at all.
		this.combat.weaponLoreTitle = this.classItem
			? (parseInt(this.classItem.system.weaponLoreTitle) || 0) : 0;
		this.combat.missileLoreTitle = this.classItem
			? (parseInt(this.classItem.system.missileLoreTitle) || 0) : 0;
		this.combat.hasWeaponLore = hasLore(this.identity.title, this.combat.weaponLoreTitle);
		this.combat.hasMissileLore = hasLore(this.identity.title, this.combat.missileLoreTitle);

		// The lists themselves are stored as he stores them, one comma-separated string each.
		// Parsed here once so nothing downstream has to split a string.
		this.combat.weaponLoreNames = parseLoreList(this.combat.weaponLoreList);
		this.combat.missileLoreNames = parseLoreList(this.combat.missileLoreList);

		// Projectile Lore, worth damage per die rather than a flat figure.
		this.combat.projectileLoreTitle = this.classItem
			? (parseInt(this.classItem.system.projectileLoreTitle) || 0) : 0;
		this.combat.hasProjectileLore = hasLore(this.identity.title, this.combat.projectileLoreTitle);
		this.combat.projectileLoreNames = parseLoreList(this.combat.projectileLoreList);

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
	// character is.
	//
	// Maximum load is the Strength table's load limit multiplied by the character's own body
	// weight, so a heavier character of the same Strength carries more. The bands fall at a
	// quarter, half, three quarters and the whole of that maximum, which is how
	// changeAttribs sets them in the original sheet.
	//
	// Only what is worn or carried counts. Anything left on a mount or in a stash is not on
	// the character. Tagalong items are skipped because their weight is already counted as
	// part of another item -- a scabbard is part of the sword.
	_prepareEncumbrance() {
		var tmploadlimit = parseFloat(this.attributes.str.mods.loadLimit) || 0;
		var tmpbodyweight = parseFloat(this.physical.weight) || 0;
		var tmpmaxload = tmploadlimit * tmpbodyweight;

		var tmpcarried = 0;
		var tmpactor = this.parent;
		if (tmpactor && tmpactor.items) {
			for (const tmpitem of tmpactor.items) {
				var tmpsys = tmpitem.system;
				if (tmpsys.weight === undefined) { continue; }
				if (tmpsys.isTagalong) { continue; }
				if (tmpsys.location != "equipped" && tmpsys.location != "carried") { continue; }
				tmpcarried = tmpcarried + ((parseFloat(tmpsys.weight) || 0) * (tmpsys.quantity ?? 1));
			}
		}

		this.encumbrance = {
			carried: parseFloat(tmpcarried.toFixed(1)),
			maxLoad: parseFloat(tmpmaxload.toFixed(1)),
			none:    parseFloat((tmpmaxload * 0.25).toFixed(1)),
			slight:  parseFloat((tmpmaxload * 0.5).toFixed(1)),
			moderate:parseFloat((tmpmaxload * 0.75).toFixed(1)),
			heavy:   parseFloat(tmpmaxload.toFixed(1)),
			status:  ""
		};

		var tmpenc = this.encumbrance;
		if      (tmpcarried <= tmpenc.none)     { tmpenc.status = "Unencumbered"; }
		else if (tmpcarried <= tmpenc.slight)   { tmpenc.status = "Slight"; }
		else if (tmpcarried <= tmpenc.moderate) { tmpenc.status = "Moderate"; }
		else if (tmpcarried <= tmpenc.heavy)    { tmpenc.status = "Heavy"; }
		else                                    { tmpenc.status = "Overloaded"; }
	}

	// This is the function which fills in the identity values that come from the class item.
	_prepareIdentity() {
		this.identity.raceName  = this.raceItem ? this.raceItem.name : "";
		this.identity.className = this.classItem ? this.classItem.name : "";
		this.identity.classType = this.classItem ? this.classItem.system.classType : "";
		this.identity.titleName = this.classItem ? this.classItem.getTitleName(this.identity.title) : "";
	}

	// This is the function which sets each attribute's maximum, its save percentage and its
	// table-driven modifiers.
	//
	// The maximum is the race's own limit for that attribute -- until title 11, when the racial
	// limits are discarded and every attribute is capped at a flat 27 instead. It is applied
	// here rather than in prepareBaseData so it also constrains anything an Active Effect added.
	_prepareAttributes() {
		var tmpracelimits = this.raceItem ? this.raceItem.system.attributeLimits : null;

		for (const tmpkey of Object.keys(this.attributes)) {
			var tmpattrib = this.attributes[tmpkey];

			var tmpracelimit = (tmpracelimits && tmpracelimits[tmpkey]) ? tmpracelimits[tmpkey] : 0;
			var tmpcap = ImagineCharacterData.getAttributeMax(this.identity.title, tmpracelimit);

			tmpattrib.max = tmpcap;
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

	// This is the function which sets the character's movement rates from their race.
	// Every mode is tracked at three scales at once -- per hour, per 10 second combat round,
	// and per second.
	//
	// Encumbrance penalties are NOT applied yet: they need equipment items to weigh against
	// the Strength load limit, and those item types do not exist yet.
	_prepareMovement() {
		if (!this.raceItem) { return; }
		var tmpracemove = this.raceItem.system.movement;

		for (const tmpmode of ["walk", "jog", "run"]) {
			this.movement[tmpmode].hourly = tmpracemove[tmpmode].hourly;
			this.movement[tmpmode].tenSec = tmpracemove[tmpmode].tenSec;
			this.movement[tmpmode].oneSec = tmpracemove[tmpmode].oneSec;
		}

		this.movement.specialName = tmpracemove.specialName;
		this.movement.jumpStand   = tmpracemove.jumpStand;
		this.movement.jumpUp      = tmpracemove.jumpUp;
	}

	// This is the function which reads the skill slot allowances off the Knowledge table.
	// A character may not hold more skills in a category than they have slots for it.
	_prepareSkillSlots() {
		var tmpknw = this.attributes.knw.mods;

		this.skillSlots = {
			class:         parseInt(tmpknw.classSkills) || 0,
			racial:        parseInt(tmpknw.raceSkills) || 0,
			social:        parseInt(tmpknw.socialSkills) || 0,
			memorization:  parseInt(tmpknw.memorizationPoints) || 0,
			classUsed:  0,
			racialUsed: 0,
			socialUsed: 0
		};
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

	// This is the function which returns the highest rating an attribute may reach.
	//
	// Ported from his sheet, which does this in two places: the race's limits become the
	// maximums when a race is chosen (sheet-worker.js:8099), and setArchMortalAttributesMax
	// (line 27549) replaces all twelve with a flat 27 on titling to 11 -- discarding the racial
	// limits, upwards or downwards. Twenty is the standing default before a race is picked
	// (clearAttributeModifiersFinals, line 32502).
	//
	// His code fires the arch-mortal replacement once, at exactly title 11, and the value then
	// persists; a derived model recomputes every time, so the test is "title 11 or more", which
	// reproduces the same resulting state.
	//
	// The Master's Manual's mundane / mortal / arch-mortal / deity tiers of 23 / 25 / 27 / 30
	// are NOT implemented here, because they are not implemented in his sheet: nothing in it
	// caps by title below 11, and nothing grants 30 at title 16. The sheet wins on conflict.
	static getAttributeMax(tmpTitle, tmpRaceLimit) {
		var tmpTitleValue = parseInt(tmpTitle) || 0;
		if (tmpTitleValue >= 11) { return 27; }   // arch-mortal: racial limits are discarded
		var tmpLimit = parseInt(tmpRaceLimit) || 0;
		if (tmpLimit <= 0) { tmpLimit = 20; }     // no race chosen yet
		return tmpLimit;
	}

	// @MARKER ADD NEW character data model functions HERE
}
// @END (CODE)
