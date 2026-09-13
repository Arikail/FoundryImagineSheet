// @START (CODE)
// @MARKER COMBAT RULES
//==================================================================================================================
// The combat arithmetic, as plain functions.
//
// Nothing in this file touches Foundry. Every function takes values and returns values -- dice
// results included, which are rolled by the caller and passed in. That keeps the rules
// testable on their own, and it keeps them readable against the original sheet-worker, which
// is where each one is ported from (line numbers given with each function).
//
// Where his code and the Player's Guide disagree, his code wins, per the standing rule. Where
// his code has a plain bug that defeats its own evident intent, the intent is implemented and
// the bug is recorded in docs/UPSTREAM-ISSUES.md for him to confirm.
//==================================================================================================================

import {
	ATTACK_CHARTS, ATTACK_SKILL_ORDER, BODY_CHARTS,
	ARMOR_BLOCKING, ARMOR_DAMAGE_DIVIDERS, ARMOR_MATERIAL_RANK,
	ARMOR_COVERAGE_BY_BODY_TYPE, ARMOR_REQUIRES_ITEM,
	SHIELD_COVERAGE, SHIELD_SIZES,
	ENDURED_BY, REBOUNDED_TYPES,
	PROJECTILE_MATCHES, LAUNCHER_MATCHES, LAUNCHER_PROJECTILE,
	OFFHAND_PENALTIES, MOVEMENT_BASE
} from "../combat-tables.mjs";

// The zones an attack can land in, in the order his code tests them.
export const HIT_ZONES = ["Hit(Center)", "Hit(Right)", "Hit(High)", "Hit(Left)", "Hit(Low)"];
export const MISS_ZONES = ["Miss(Right)", "Miss(High)", "Miss(Left)", "Miss(Low)", "Miss(Short)"];

// Which attack modes are melee. Missile is the only other.
export const MELEE_MODES = ["thrust", "cut", "smash"];

// Which armour coverage slot protects each body chart area, for a humanoid shape. Armour data
// gives a value for each of nineteen locations (armorvalueslist); these are the chart names they
// line up with.
//
// This is the Humanoid case only. The per-body-type mapping now lives in
// ARMOR_COVERAGE_BY_BODY_TYPE (module/combat-tables.mjs, generated from his own branches) and is
// reached through getAreaArmorSlot below, which is what the actor models use. This table is kept
// because it is the shape most content is authored against and it reads clearly.
export const ARMOR_COVERAGE_BY_AREA = {
	"Head":           "head",
	"Neck":           "neck",
	"Left Shoulder":  "shoulderLeft",
	"Right Shoulder": "shoulderRight",
	"Upper Torso":    "torsoUpper",
	"Mid Torso":      "torsoMid",
	"Lower Torso":    "torsoLower",
	"Left Arm":       "armLeft",
	"Right Arm":      "armRight",
	"Left Forearm":   "forearmLeft",
	"Right Forearm":  "forearmRight",
	"Left Hand":      "handLeft",
	"Right Hand":     "handRight",
	"Left Thigh":     "thighLeft",
	"Right Thigh":    "thighRight",
	"Left Shin":      "shinLeft",
	"Right Shin":     "shinRight",
	"Left Foot":      "footLeft",
	"Right Foot":     "footRight"
};

// The damage type each attack mode deals by default. The attacker can change it when damage is
// applied -- a club thrust is still Smashing, for instance.
export const MODE_DAMAGE_TYPES = {
	thrust:  "Thrusting",
	cut:     "Cutting",
	smash:   "Smashing",
	missile: "Piercing"
};


//==================================================================================================================
// @MARKER ATTACK SKILL
//==================================================================================================================

	// This is the function which reads an attack chart into named thresholds.
	//
	// Each chart value is the LOWEST roll that reaches that result. "19+" and "9-11" are read by
	// their first number, exactly as his code does it with parseInt. "-" means the result cannot
	// happen at that skill, and becomes NaN -- which fails every comparison, again as in his code.
	export function getAttackChart(tmpskill) {
		var tmprow = ATTACK_CHARTS[tmpskill] ?? ATTACK_CHARTS["None"];
		return {
			skill:      ATTACK_CHARTS[tmpskill] ? tmpskill : "None",
			missHigh:   parseInt(tmprow[0]),
			hitHigh:    parseInt(tmprow[1]),
			missLeft:   parseInt(tmprow[2]),
			hitLeft:    parseInt(tmprow[3]),
			hitCenter:  parseInt(tmprow[4]),
			hitRight:   parseInt(tmprow[5]),
			missRight:  parseInt(tmprow[6]),
			hitLow:     parseInt(tmprow[7]),
			missLow:    parseInt(tmprow[8]),
			missShort:  parseInt(tmprow[9]),
			calledShot: parseInt(tmprow[10])
		};
	}

	// This is the function which works out a character's attack skill from their class's
	// progression and their current title.
	//
	// A class lists its progression as text, e.g.
	//     "Beginner at 1, Novice at 3, Intermediate at 5, Advanced at 7, Expert at 9, Master at 12"
	// and occasionally with a note in brackets: "Grandmaster(mastered weapons at 9)".
	// His code splits on " at " (setAttackChartsChanges, sheet-worker.js:94835). The level held is
	// the last one whose title has been reached. Before the first listed title, the first level
	// is used: a character can always swing, however badly.
	export function getAttackSkillForTitle(tmplist, tmptitle) {
		var tmptext = String(tmplist ?? "").trim();
		if (tmptext == "" || tmptext == "None") { return "None"; }

		var tmpparts = tmptext.replaceAll(" at ", ",").split(",");
		var tmplevels = [];
		for (var i = 0; i < tmpparts.length - 1; i = i + 2) {
			var tmpname = tmpparts[i].trim().split("(")[0].trim();   // "Grandmaster(mastered weapons" -> "Grandmaster"
			var tmpat = parseInt(tmpparts[i + 1]) || 0;
			if (ATTACK_CHARTS[tmpname]) { tmplevels.push({ name: tmpname, at: tmpat }); }
		}
		if (!tmplevels.length) { return "None"; }

		var tmpheld = tmplevels[0].name;
		for (const tmplevel of tmplevels) {
			if ((parseInt(tmptitle) || 0) >= tmplevel.at) { tmpheld = tmplevel.name; }
		}

		// The standard chart stops at Master. A class listing "Grandmaster(mastered weapons at 9)"
		// means Grandmaster only with weapons the character has mastered -- that is the Weapon Lore
		// chart, one step up -- so for everything else it is Master. His code says exactly this:
		// "cannot set Grandmaster for standard Attack Chart so just use Master"
		// (setAttackChartsChanges, sheet-worker.js:94848).
		if (tmpheld == "Grandmaster") { tmpheld = "Master"; }
		return tmpheld;
	}

	// This is the function which returns the attack skill one step above the one given. Weapon
	// Lore and Missile Lore read the chart one level up (getNextAttackSkill in his code).
	export function getNextAttackSkill(tmpskill) {
		var tmpindex = ATTACK_SKILL_ORDER.indexOf(tmpskill);
		if (tmpindex < 0) { return tmpskill; }
		return ATTACK_SKILL_ORDER[Math.min(tmpindex + 1, ATTACK_SKILL_ORDER.length - 1)];
	}


//==================================================================================================================
// @MARKER ATTACK RESOLUTION
//==================================================================================================================

	// This is the function which resolves an attack roll: whether it hits, and where.
	// Ported from handlePhysicalAttacks (sheet-worker.js:64802-64893), non-Weapon-Lore branch.
	//
	//   tmproll = {
	//       natural:       the d20 as rolled
	//       mods:          the total of every modifier
	//       skill:         attack skill, e.g. "Novice"
	//       calledShot:    true if the attacker declared a called shot
	//       calledShotMod: anything that makes a called shot easier (default 0)
	//       fumbleMod:     anything that widens the fumble range (default 0)
	//   }
	//
	// Three details that are easy to get wrong, all as his code does them:
	//   - The zone is read from the MODIFIED result, floored at 1.
	//   - A called shot is judged on the NATURAL roll, never the modified one.
	//   - A natural 1 (or up to 1 + fumbleMod) is a fumble whatever the modifiers.
	export function resolveAttack(tmproll) {
		var tmpchart = getAttackChart(tmproll.skill);
		var tmpnatural = parseInt(tmproll.natural) || 0;
		var tmpfinal = tmpnatural + (parseInt(tmproll.mods) || 0);
		if (tmpfinal < 1) { tmpfinal = 1; }

		var tmpzone = "Miss";
		if      (tmpfinal >= tmpchart.hitCenter) { tmpzone = "Hit(Center)"; }
		else if (tmpfinal >= tmpchart.hitRight)  { tmpzone = "Hit(Right)"; }
		else if (tmpfinal >= tmpchart.hitHigh)   { tmpzone = "Hit(High)"; }
		else if (tmpfinal >= tmpchart.hitLeft)   { tmpzone = "Hit(Left)"; }
		else if (tmpfinal >= tmpchart.hitLow)    { tmpzone = "Hit(Low)"; }
		else if (tmpfinal >= tmpchart.missRight) { tmpzone = "Miss(Right)"; }
		else if (tmpfinal >= tmpchart.missHigh)  { tmpzone = "Miss(High)"; }
		else if (tmpfinal >= tmpchart.missLeft)  { tmpzone = "Miss(Left)"; }
		else if (tmpfinal >= tmpchart.missLow)   { tmpzone = "Miss(Low)"; }
		else if (tmpfinal >= tmpchart.missShort && tmpchart.skill == "Beginner") { tmpzone = "Miss(Short)"; }

		var tmpcalled = false;
		if (tmproll.calledShot) {
			tmpcalled = tmpnatural >= (tmpchart.calledShot - (parseInt(tmproll.calledShotMod) || 0));
		}

		var tmpfumble = false;
		if (tmpnatural <= (1 + (parseInt(tmproll.fumbleMod) || 0))) {
			tmpfumble = true;
			tmpfinal = 1;
			tmpzone = "Fumble";
			tmpcalled = false;
		}

		return {
			natural: tmpnatural,
			final: tmpfinal,
			skill: tmpchart.skill,
			zone: tmpzone,
			isHit: tmpzone.startsWith("Hit"),
			isFumble: tmpfumble,
			calledShotDeclared: !!tmproll.calledShot,
			isCalledShot: tmpcalled
		};
	}

	// The eight compass points a dropped weapon flies off in. From getRandomDirection
	// (sheet-worker.js:26444), a d8.
	export const FUMBLE_DIRECTIONS = ["North", "Northeast", "East", "Southeast",
	                                  "South", "Southwest", "West", "Northwest"];

	// This is the function which reads his critical fumble table. Ported from getCriticalFumble
	// (sheet-worker.js:26460).
	//
	// A melee critical is a d100 down nine ten-point bands -- hitting a solid object, hitting
	// another target in range, or hitting yourself, each at half, full and double damage -- then
	// tripping, tripping with damage, and at 99 and 100 losing the weapon as well. Those last two
	// bands roll again: under 20 the damage lands normally, otherwise it bypasses armour. A
	// missile critical is always the same, the weapon breaking.
	//
	// The dice arrive as arguments, as everywhere else in this file:
	//   tmpdice = {
	//       criticalRoll:  d100, which band of the table
	//       variantRoll:   d100, the armour-bypassing split on the 99 and 100 bands
	//       standRoll:     d6, seconds to get up (1d6+1)
	//       throwRoll:     d20, feet the weapon is thrown
	//       directionRoll: d8, which way it goes
	//       stunRoll:      d3, seconds stunned on the 100 band
	//   }
	//
	// Returns the consequence as data as well as prose, so the damage a fumble causes can be
	// applied rather than only read: target is what gets hit ("object", "other", "self" or ""),
	// damageMultiplier is his half/full/double, and bypassesArmor marks the worst two results.
	export function resolveCriticalFumble(tmpismissile, tmpdice) {
		if (tmpismissile) {
			return { target: "", damageMultiplier: 0, bypassesArmor: false, secondsLost: 0,
			         weaponLost: false, weaponBroken: true,
			         text: "the weapon breaks and is unusable until repaired" };
		}

		var tmproll = parseInt(tmpdice.criticalRoll) || 0;
		var tmpstand = (parseInt(tmpdice.standRoll) || 0) + 1;
		var tmpthrown = parseInt(tmpdice.throwRoll) || 0;
		var tmpdirection = FUMBLE_DIRECTIONS[((parseInt(tmpdice.directionRoll) || 1) - 1) % 8];

		// The nine damage bands, in his order: three targets at half, full and double.
		const tmpbands = [
			{ upTo: 10, target: "object", multiplier: 0.5, what: "Hits a solid object" },
			{ upTo: 20, target: "object", multiplier: 1.0, what: "Hits a solid object" },
			{ upTo: 30, target: "object", multiplier: 2.0, what: "Hits a solid object" },
			{ upTo: 40, target: "other",  multiplier: 0.5, what: "Hits another target in range" },
			{ upTo: 50, target: "other",  multiplier: 1.0, what: "Hits another target in range" },
			{ upTo: 60, target: "other",  multiplier: 2.0, what: "Hits another target in range" },
			{ upTo: 70, target: "self",   multiplier: 0.5, what: "Hits self" },
			{ upTo: 80, target: "self",   multiplier: 1.0, what: "Hits self" },
			{ upTo: 90, target: "self",   multiplier: 2.0, what: "Hits self" }
		];
		for (const tmpband of tmpbands) {
			if (tmproll <= tmpband.upTo) {
				var tmpwhere = (tmpband.target == "object") ? "the weapon and the object"
				             : (tmpband.target == "other") ? "a random area on that target"
				             : "a random area";
				return { target: tmpband.target, damageMultiplier: tmpband.multiplier,
				         bypassesArmor: false, secondsLost: 0, weaponLost: false, weaponBroken: false,
				         text: `${tmpband.what}: ${describeMultiplier(tmpband.multiplier)} damage to ${tmpwhere}` };
			}
		}

		if (tmproll <= 94) {
			return { target: "", damageMultiplier: 0, bypassesArmor: false, secondsLost: tmpstand,
			         weaponLost: false, weaponBroken: false,
			         text: `Trips on the weapon: falls, losing ${tmpstand} seconds to stand` };
		}
		if (tmproll <= 98) {
			return { target: "self", damageMultiplier: 1.0, bypassesArmor: false, secondsLost: tmpstand,
			         weaponLost: false, weaponBroken: false,
			         text: `Trips on the weapon, damaging self: full damage to a random area, and falls, `
			             + `losing ${tmpstand} seconds to stand` };
		}

		// The last two bands roll again: under 20 the damage lands normally, otherwise it goes
		// straight through armour.
		var tmpbypass = !((parseInt(tmpdice.variantRoll) || 0) < 20);
		var tmpthrough = tmpbypass ? " bypassing armour" : "";
		if (tmproll <= 99) {
			return { target: "self", damageMultiplier: 1.0, bypassesArmor: tmpbypass,
			         secondsLost: tmpstand, weaponLost: true, weaponBroken: false,
			         text: `Trips on the weapon, damaging self and losing it: full damage${tmpthrough} to a `
			             + `random area, falls losing ${tmpstand} seconds to stand, and the weapon is thrown `
			             + `${tmpthrown} feet ${tmpdirection}` };
		}

		var tmpstun = parseInt(tmpdice.stunRoll) || 0;
		return { target: "self", damageMultiplier: 2.0, bypassesArmor: tmpbypass,
		         secondsLost: tmpstun + tmpstand, weaponLost: true, weaponBroken: false,
		         text: `Trips on the weapon, damaging self and losing it: double damage${tmpthrough} to a `
		             + `random area, falls stunned for ${tmpstun} seconds then loses ${tmpstand} more to `
		             + `stand, and the weapon is thrown ${tmpthrown} feet ${tmpdirection}` };
	}

	// This is the function which names a damage multiplier the way his table reads.
	function describeMultiplier(tmpmultiplier) {
		if (tmpmultiplier == 0.5) { return "half"; }
		if (tmpmultiplier == 2.0) { return "double"; }
		return "full";
	}

	// This is the function which works out what a fumble costs. Ported from
	// handlePhysicalAttacks (sheet-worker.js:64894-64912), with the critical branch reading his
	// table through resolveCriticalFumble.
	//
	// The dice arrive as arguments rather than being rolled here:
	//   tmpdice = {
	//       saveRoll:     d100 against the attacker's Agility save
	//       recoveryRoll: d4, for the seconds lost on a successful save (1d4+1)
	//       severityRoll: d100; 80 or under is an ordinary fumble, above is critical
	//       effectRoll:   d6 for a missile jam (1d6+1 seconds), d20 for melee (feet thrown)
	//   }
	// plus, for a critical, the dice resolveCriticalFumble documents. A caller that does not
	// supply them still gets a sound result -- the table simply reads as its first band.
	export function resolveFumble(tmpaglsave, tmpismissile, tmpdice) {
		if (tmpdice.saveRoll <= tmpaglsave) {
			return { saved: true, critical: false,
			         secondsLost: tmpdice.recoveryRoll + 1,
			         text: `Agility save made: recovers, losing ${tmpdice.recoveryRoll + 1} seconds.` };
		}
		if (tmpdice.severityRoll <= 80) {
			if (tmpismissile) {
				return { saved: false, critical: false, secondsLost: tmpdice.effectRoll + 1,
				         text: `Agility save failed: the weapon jams for ${tmpdice.effectRoll + 1} seconds.` };
			}
			return { saved: false, critical: false, secondsLost: 0,
			         text: `Agility save failed: the weapon is thrown ${tmpdice.effectRoll} feet in a random direction.` };
		}

		var tmpcritical = resolveCriticalFumble(tmpismissile, tmpdice);
		return {
			saved: false, critical: true,
			secondsLost: tmpcritical.secondsLost,
			target: tmpcritical.target,
			damageMultiplier: tmpcritical.damageMultiplier,
			bypassesArmor: tmpcritical.bypassesArmor,
			weaponLost: tmpcritical.weaponLost,
			weaponBroken: tmpcritical.weaponBroken,
			text: `Agility save failed: CRITICAL fumble -- ${tmpcritical.text}.`
		};
	}


//==================================================================================================================
// @MARKER TO HIT
//==================================================================================================================

	// This is the function which gathers every modifier to an attack roll, each with the label
	// his sheet would print beside it.
	//
	//   tmpinput = {
	//       mode:        "thrust" | "cut" | "smash" | "missile"
	//       weapon:      the weapon's system data
	//       attacker:    { meleeAttack, missileAttack, meleeMisc, missileMisc }
	//       target:      { defensiveAdjust } or null when there is no target
	//       situational: a free modifier from the attack dialog
	//   }
	//
	// The target's defensive adjustment is not in his code -- his sheet only ever knew about one
	// character. It is in the Player's Guide ("a negative number applied to the attacker's
	// roll"), and in Foundry the target is known, so it is applied when a target is selected.
	export function getToHitModifiers(tmpinput) {
		var tmpweapon = tmpinput.weapon;
		var tmpmode = tmpinput.mode;
		var tmpattacker = tmpinput.attacker;
		var tmplist = [];

		var tmpmodeMod = parseInt(tmpweapon[tmpmode]?.mod) || 0;
		if (tmpmodeMod) { tmplist.push({ label: "Attack Type", value: tmpmodeMod }); }

		var tmpmagic = parseInt(tmpweapon.magicBonus) || 0;
		if (tmpmagic) { tmplist.push({ label: "Magic", value: tmpmagic }); }

		if (tmpmode == "missile") {
			var tmpagl = parseInt(tmpattacker.missileAttack) || 0;
			if (tmpagl) { tmplist.push({ label: "AGL", value: tmpagl }); }
			var tmpmissileMisc = parseInt(tmpattacker.missileMisc) || 0;
			if (tmpmissileMisc) { tmplist.push({ label: "Missile Other", value: tmpmissileMisc }); }
		} else {
			var tmpstr = parseInt(tmpattacker.meleeAttack) || 0;
			if (tmpstr) { tmplist.push({ label: "STR", value: tmpstr }); }
			var tmpmeleeMisc = parseInt(tmpattacker.meleeMisc) || 0;
			if (tmpmeleeMisc) { tmplist.push({ label: "Melee Other", value: tmpmeleeMisc }); }
		}

		if (tmpinput.target) {
			var tmpdef = parseInt(tmpinput.target.defensiveAdjust) || 0;
			if (tmpdef) { tmplist.push({ label: "Target Defence", value: tmpdef }); }
		}

		// Weapon or Missile Lore, worked out by getLoreModifiers and passed in, so this function
		// stays a plain sum. Melee reads Weapon Lore and missile reads Missile Lore.
		var tmplore = parseInt(tmpinput.lore) || 0;
		if (tmplore) { tmplist.push({ label: "Lore", value: tmplore }); }

		// The off-hand penalty, worked out by resolveOffhandPenalties and passed in for the same
		// reason lore is, so this function stays a plain sum.
		//
		// IT IS NOT MELEE-ONLY, despite his function being named getOffhandMeleeAdj. His
		// offHandPenalty appears in BOTH totalmods branches -- the missile one at
		// sheet-worker.js:64804 and the melee one at 64806 -- so a bow drawn in the wrong hand is
		// penalised exactly as a sword swung in it is. The name is the only thing that says melee.
		var tmpoffhand = parseInt(tmpinput.offhand) || 0;
		if (tmpoffhand) { tmplist.push({ label: "Off Hand", value: tmpoffhand }); }

		var tmpsit = parseInt(tmpinput.situational) || 0;
		if (tmpsit) { tmplist.push({ label: "Situational", value: tmpsit }); }

		var tmptotal = tmplist.reduce((sum, m) => sum + m.value, 0);
		return { list: tmplist, total: tmptotal };
	}


//==================================================================================================================
// @MARKER DAMAGE
//==================================================================================================================

	// This is the function which picks the damage dice for a weapon in a given attack mode.
	// A Spear thrown and an Axe Hammer thrusting use their bracketed damage instead.
	export function getWeaponDamageDice(tmpweapon, tmpmode) {
		if (tmpweapon.damageAlt && tmpweapon.damageAltMode == tmpmode) { return tmpweapon.damageAlt; }
		return tmpweapon.damage;
	}

	// This is the function which works out the Strength damage bonus for an attack.
	// Ported from handlePhysicalAttacks (sheet-worker.js:64783-64800).
	//
	// Strength adds to melee damage only; projectile weapons get none. Held in two hands, a
	// positive bonus is doubled -- but a NEGATIVE bonus is halved, so a weak character is not
	// punished twice for using both hands. parseInt truncates toward zero, as in his code, so
	// -3 halves to -1.
	export function getStrengthDamageMod(tmpmeleeDamage, tmpmode, tmptwohanded) {
		if (!MELEE_MODES.includes(tmpmode)) { return 0; }
		var tmpmod = parseInt(tmpmeleeDamage) || 0;
		if (tmptwohanded) {
			if (tmpmod > 0) { tmpmod = parseInt(tmpmod * 2); }
			else if (tmpmod < 0) { tmpmod = parseInt(tmpmod / 2); }
		}
		return tmpmod;
	}

	// This is the function which combines damage multipliers. The Player's Guide: "no matter
	// how many multipliers to damage one can gain, base damage may never be multiplied by more
	// than three."
	export function combineDamageMultipliers(tmplist) {
		var tmpmulti = 1;
		for (const tmpvalue of tmplist) { tmpmulti = tmpmulti * (parseFloat(tmpvalue) || 1); }
		if (tmpmulti > 3) { tmpmulti = 3; }
		return tmpmulti;
	}


//==================================================================================================================
// @MARKER ARMOUR
//==================================================================================================================

	// This is the function which works out how much damage gets through the armour at the struck
	// area. Ported from handleBodyDamage (sheet-worker.js:71276-71321).
	//
	// The damage falls into one of four bands against the area's total armour -- under a
	// quarter, quarter to half, half to full, or over -- and that band's value from
	// ARMOR_BLOCKING decides what happens:
	//     negative  ->  damage + (total armour x value)   armour subtracts a fraction of itself
	//     positive  ->  damage x value                    only that share gets through
	//     zero      ->  no damage at all
	// The band edges are strict (">"), so damage exactly equal to the armour falls in the
	// half-to-full band.
	export function blockDamage(tmpdamage, tmptype, tmptotalarmor, tmpbypass) {
		var tmpdmg = parseInt(tmpdamage) || 0;
		if (tmpbypass) { return tmpdmg; }

		var tmpblock = ARMOR_BLOCKING[tmptype] ?? ARMOR_BLOCKING["Other"];
		var tmpfull = parseInt(tmptotalarmor) || 0;
		if (tmpfull < 0) { tmpfull = 0; }
		var tmphalf = parseInt(tmpfull * 0.5) || 0;
		var tmpquarter = parseInt(tmpfull * 0.25) || 0;

		var tmpvalue;
		if      (tmpdmg > tmpfull)    { tmpvalue = tmpblock[3]; }
		else if (tmpdmg > tmphalf)    { tmpvalue = tmpblock[2]; }
		else if (tmpdmg > tmpquarter) { tmpvalue = tmpblock[1]; }
		else                          { tmpvalue = tmpblock[0]; }

		if (tmpvalue < 0)      { tmpdmg = tmpdmg + (parseInt(tmpfull * tmpvalue)); }
		else if (tmpvalue > 0) { tmpdmg = parseInt(tmpdmg * tmpvalue); }
		else                   { tmpdmg = 0; }

		if (tmpdmg < 0) { tmpdmg = 0; }
		return tmpdmg;
	}

	// This is the function which finds the strongest material among the armour covering an
	// area. Its degradation divider is the one that applies (getBestArmorType, sheet-worker.js:
	// 118887).
	export function getStrongestMaterial(tmpmaterials) {
		var tmpbest = "";
		var tmpbestrank = -1;
		for (const tmpmaterial of tmpmaterials) {
			var tmprank = ARMOR_MATERIAL_RANK[tmpmaterial] ?? 0;
			if (tmprank > tmpbestrank) { tmpbest = tmpmaterial; tmpbestrank = tmprank; }
		}
		return tmpbest;
	}

	// This is the function which works out how much damage the armour itself takes.
	// Ported from getArmorDamage (sheet-worker.js:118851).
	//
	// The damage used is the damage BEFORE armour blocked any of it. It is divided by the
	// strongest material's divider for that family of damage, truncated. Acid and Obliteration
	// strike the armour at full value. Magical armour is never degraded -- it can only be
	// destroyed, which is handled elsewhere.
	//
	// His version has two bugs that defeat its own intent: it walks the area's armour list but
	// indexes the character's full equipped list, and its magic check compares array elements to
	// "+" so it is never true. The intent is implemented here. See docs/UPSTREAM-ISSUES.md.
	export function getArmorDamage(tmpdamage, tmptype, tmpmaterial, tmpismagic) {
		if (tmpismagic) { return 0; }
		var tmpdmg = parseInt(tmpdamage) || 0;
		if (tmptype == "Acid" || tmptype == "Obliteration") { return tmpdmg; }

		var tmpdivider = ARMOR_DAMAGE_DIVIDERS[tmpmaterial];
		if (!tmpdivider) { return 0; }

		var tmpindex = -1;
		if (tmptype == "Cutting") { tmpindex = 0; }
		else if (tmptype == "Thrusting" || tmptype == "Piercing") { tmpindex = 1; }
		else if (["Smashing", "Crushing", "Force", "Sonic", "Kinetic"].includes(tmptype)) { tmpindex = 2; }
		else if (["Constricting", "Aura/Divine", "Life/Death"].includes(tmptype)) { tmpindex = 3; }
		if (tmpindex < 0) { return 0; }

		var tmpdiv = parseFloat(tmpdivider[tmpindex]) || 1;
		return parseInt(tmpdmg / tmpdiv) || 0;
	}


	// This is the function which applies a target's pain threshold to a blow, before anything
	// else touches it. (handleBodyDamage, sheet-worker.js:71186-71193.)
	//
	// His field is a SIGNED modifier on incoming damage, not a level a blow has to get over.
	// The note beside it on his own sheet reads "reduces or adds to all incoming damage (-/+)",
	// so a negative pain threshold is a tougher character and a positive one a more tender one,
	// and the number is simply added. The Famorian "High Pain Threshold" evoke takes a further
	// point off; nothing sets that yet, because the evoke system is its own piece of work, but
	// the argument is here so the arithmetic is complete and wiring it up later is one line.
	//
	// The result is deliberately NOT floored at zero. His is not either: the floor comes further
	// down the pipeline, after the magical pre-reductions, and resolveAreaDamage applies it.
	export function applyPainThreshold(tmpdamage, tmppainthreshold, tmphighpainthreshold) {
		var tmpvalue = parseInt(tmpdamage) || 0;
		tmpvalue = tmpvalue + (parseInt(tmppainthreshold) || 0);
		if (tmphighpainthreshold) { tmpvalue = tmpvalue - 1; }
		return tmpvalue;
	}

	// This is the function which runs a blow against the armour at one area, in his order
	// (handleBodyDamage, sheet-worker.js:71274-71358):
	//   1. armour blocks some or all of it, by band
	//   2. the armour takes its own damage, worked from the damage BEFORE blocking
	//   3. natural hide (a creature's tough skin, etc.) then takes its share off what is left
	//
	// The target's pain threshold has already been applied by then -- it is the first thing his
	// handler does, above all of this -- so pass the damage through applyPainThreshold first.
	//
	// Whether a blow lands at all is decided BEFORE any of this, by blowLands below. His whole
	// apply block, armour damage and hide and absorption and the store alike, sits inside
	// `if (!isLost && !noDamageInput)` (line 71322), so a blow of under 1 does nothing whatever.
	//
	//   tmpinput = { damage, type, totalArmor, bypass, hide, material, isMagicArmor }
	export function resolveAreaDamage(tmpinput) {
		var tmporiginal = parseInt(tmpinput.damage) || 0;
		if (tmporiginal < 0) { tmporiginal = 0; }

		var tmpnet = blockDamage(tmporiginal, tmpinput.type, tmpinput.totalArmor, tmpinput.bypass);

		var tmparmordamage = 0;
		if (!tmpinput.bypass && (parseInt(tmpinput.totalArmor) || 0) > 0) {
			tmparmordamage = getArmorDamage(tmporiginal, tmpinput.type, tmpinput.material, tmpinput.isMagicArmor);
			if (tmparmordamage > tmpinput.totalArmor) { tmparmordamage = parseInt(tmpinput.totalArmor); }
		}

		var tmphide = parseInt(tmpinput.hide) || 0;
		if (tmphide > 0) { tmpnet = tmpnet - tmphide; }
		if (tmpnet < 0) { tmpnet = 0; }

		return { net: tmpnet, blocked: tmporiginal - tmpnet, armorDamage: tmparmordamage };
	}

	// @MARKER MAGICAL PROTECTION
	// Everything here sits ABOVE the armour in his pipeline: it happens to the damage before any
	// worn armour is asked to block it. The order is his (handleBodyDamage, sheet-worker.js:
	// 71249-71272) and it is worth keeping, because these subtract rather than scale and the
	// floor at zero only lands once, at the end.

	// This is the function which says whether a damage type is endured -- shrugged off entirely.
	// A tag on anything worn does it: "Enduring Frost", or the blanket "Enduring All", which
	// covers nine of his ten types but not Obliteration. See ENDURED_BY, generated from his own
	// switch, and docs/UPSTREAM-ISSUES.md item 20 for the asymmetry.
	export function isEndured(tmpdamagetype, tmpwornnames) {
		var tmptags = ENDURED_BY[String(tmpdamagetype ?? "")];
		if (!tmptags) { return false; }
		var tmpworn = (tmpwornnames ?? []).join(",");
		for (const tmptag of tmptags) {
			if (tmpworn.includes(tmptag)) { return true; }
		}
		return false;
	}

	// This is the function which says whether a blow rebounds off a "Rebound" item. Only the five
	// physical damage types do (sheet-worker.js:71222); magic and the elements pass straight by.
	export function isRebounded(tmpdamagetype, tmpwornnames) {
		if (!REBOUNDED_TYPES.includes(String(tmpdamagetype ?? ""))) { return false; }
		return (tmpwornnames ?? []).join(",").includes("Rebound");
	}

	// This is the function which totals the magical weave protecting one area.
	// Ported from getWeaveValue (sheet-worker.js:119188).
	//
	// A weave is magical CLOTHING tagged "[Magical Weave]" -- all three conditions, since his
	// test is clothing AND weave AND magical. What it is worth at an area is that garment's own
	// armour value there plus its magical plus, DOUBLED, and several weaves add up.
	//
	// It comes off the damage like hide rather than like armour, and his blocking then works
	// from the armour total with the weave taken back out, so it is never counted twice.
	export function getWeaveValue(tmpworn, tmpslot) {
		var tmptotal = 0;
		if (!tmpslot) { return 0; }
		for (const tmpitem of tmpworn ?? []) {
			if (tmpitem.system?.flexibility != "Clothing") { continue; }
			if (!String(tmpitem.name ?? "").includes("[Magical Weave]")) { continue; }
			var tmpplus = parseInt(tmpitem.system?.magicBonus) || 0;
			if (tmpplus <= 0) { continue; }              // his test is "the name carries a +"
			var tmpvalue = parseInt(tmpitem.system?.coverage?.[tmpslot]) || 0;
			tmptotal = tmptotal + ((tmpvalue + tmpplus) * 2);
		}
		return tmptotal;
	}

	// This is the function which runs a blow past everything magical protecting the target,
	// before any worn armour sees it. Ported from handleBodyDamage (sheet-worker.js:71249-71272),
	// in his order:
	//   1. invulnerability scales the whole blow by how magical the weapon is
	//   2. spiritual armour subtracts
	//   3. force armour subtracts
	//   4. outer kinetic armour subtracts
	//   5. a magic shield subtracts, unless the blow bypasses armour
	//   6. a magical weave subtracts, counted as hide
	//   7. and only then is the result floored at zero
	//
	// Invulnerability is the one that scales rather than subtracts: a weapon with no magical plus
	// does nothing at all to an invulnerable target, +1 or +2 does a quarter, +3 or +4 a half,
	// and +5 or better lands in full.
	//
	// Where these values come from is a separate piece of work. His checkSpiritForceArmorModifiers
	// (line 106966) sets each to the BEST of what worn magic items grant and the Game Master's own
	// modifier -- they take the maximum rather than stacking -- and the items that grant them are
	// named by the deferred magic subsystems. Until then they are entered by hand.
	//
	//   tmpinput = { invulnerable, magicPlus, spiritArmor, forceArmor, outerKinetic,
	//                magicShield, weave, bypass }
	//
	// Returns { damage, weave } -- what is left, and the weave that was used, which the caller
	// must take back out of the armour total so it is not counted a second time.
	export function applyMagicalReductions(tmpdamage, tmpinput) {
		var tmpvalue = parseInt(tmpdamage) || 0;
		var tmpweave = parseInt(tmpinput.weave) || 0;

		if (tmpinput.invulnerable && tmpvalue != 0) {
			var tmpplus = parseInt(tmpinput.magicPlus) || 0;
			if (tmpplus < 1)      { tmpvalue = 0; }                          // no plus, no damage
			else if (tmpplus < 3) { tmpvalue = parseInt(tmpvalue * 0.25) || 0; }   // +1/+2 = a quarter
			else if (tmpplus < 5) { tmpvalue = parseInt(tmpvalue * 0.5) || 0; }    // +3/+4 = a half
			// +5 and better lands in full
		}

		tmpvalue = tmpvalue - (parseInt(tmpinput.spiritArmor) || 0);
		tmpvalue = tmpvalue - (parseInt(tmpinput.forceArmor) || 0);
		tmpvalue = tmpvalue - (parseInt(tmpinput.outerKinetic) || 0);
		if (!tmpinput.bypass) { tmpvalue = tmpvalue - (parseInt(tmpinput.magicShield) || 0); }
		tmpvalue = tmpvalue - tmpweave;
		if (tmpvalue < 0) { tmpvalue = 0; }

		return { damage: tmpvalue, weave: tmpweave };
	}

	// This is the function which says whether a blow does anything at all.
	//
	// His whole apply block is wrapped in `if (!isLost && !noDamageInput)` (sheet-worker.js:71322),
	// and noDamageInput is read from the RAW damage figure, before the pain threshold is added
	// (line 71188). So a hit that rolled under 1 damage does nothing whatever -- no wounds, no
	// armour damage, no absorption spent -- however large a positive pain threshold the target
	// carries. An area already marked LOST cannot be hurt either; lost limbs are not modelled
	// yet, so that argument is here for when they are.
	export function blowLands(tmprawdamage, tmpisareaLost) {
		if (tmpisareaLost) { return false; }
		return (parseInt(tmprawdamage) || 0) >= 1;
	}

	// This is the function which spends a target's damage absorption on a blow.
	// Ported from handleBodyDamage (sheet-worker.js:71359-71366), where it is the very last thing
	// to touch the damage -- after armour has blocked its share and after natural hide.
	//
	// Absorption is a POOL, not a per-blow reduction: it takes what it can off the damage and is
	// itself spent by the same amount, so it wears out. Both figures are worked from the values
	// before either changed, then floored at zero, which is his arithmetic exactly.
	//
	// Where the pool comes from is a separate piece of work. His checkSpiritForceArmorModifiers
	// (line 106966) refills it to the best of a "Rune Absorption: +N" on worn armour and the
	// Game Master's own modifier, every time equipment changes -- and the runes that feed it are
	// a deferred subsystem. Until then the pool is simply entered and spent.
	//
	// Returns { damage, pool } -- what gets through, and what is left in the pool.
	export function absorbDamage(tmpdamage, tmppool) {
		var tmpvalue = parseInt(tmpdamage) || 0;
		var tmpabsorb = parseInt(tmppool) || 0;
		if (tmpabsorb <= 0) { return { damage: tmpvalue, pool: tmpabsorb > 0 ? tmpabsorb : 0 }; }

		var tmpleft = tmpabsorb - tmpvalue;
		var tmpthrough = tmpvalue - tmpabsorb;
		if (tmpthrough < 0) { tmpthrough = 0; }
		if (tmpleft < 0) { tmpleft = 0; }
		return { damage: tmpthrough, pool: tmpleft };
	}


//==================================================================================================================
// @MARKER BODY AND WOUNDS
//==================================================================================================================

	// This is the function which reads a body chart into areas.
	// Ported from createBodyAreas (sheet-worker.js:180208).
	//
	// A chart is written "Head(Vital:x1),Neck(Vital:x1/2),...". An area is Vital if its details
	// say so and a Limb otherwise -- which is how his code treats wings, tails and the rest. The
	// multiplier is matched in his exact order; the order matters because "x1" appears inside
	// "x1/2" and "x10", so it has to be tested last.
	export function parseBodyChart(tmpchart) {
		var tmpareas = [];
		if (!tmpchart) { return tmpareas; }
		for (const tmpentry of String(tmpchart).split(",")) {
			var tmpopen = tmpentry.lastIndexOf("(");
			var tmpname = (tmpopen >= 0 ? tmpentry.slice(0, tmpopen) : tmpentry).trim();
			var tmpdetails = tmpopen >= 0 ? tmpentry.slice(tmpopen + 1).replace(")", "") : "";
			tmpareas.push({
				name: tmpname,
				type: tmpdetails.includes("Vital") ? "Vital" : "Limb",
				multiplier: getAreaMultiplier(tmpdetails)
			});
		}
		return tmpareas;
	}

	// This is the function which reads an area's Endurance multiplier out of its details.
	//
	// Follows his order (createBodyAreas, sheet-worker.js:180218-180241) with one change. His code
	// tests "x1/2" before "x1/20", and since "x1/20" contains "x1/2", an area marked x1/20 gets
	// half Endurance instead of a twentieth. No stock body chart uses x1/20 -- it can only arise
	// from his custom body area builder -- so it has never shown in play, but the longer
	// fractions are tested first here. Recorded in docs/UPSTREAM-ISSUES.md.
	export function getAreaMultiplier(tmpdetails) {
		var tmpd = String(tmpdetails);
		if (tmpd.includes("x2"))    { return 2; }
		if (tmpd.includes("x3"))    { return 3; }
		if (tmpd.includes("x4"))    { return 4; }
		if (tmpd.includes("x5"))    { return 5; }
		if (tmpd.includes("x6"))    { return 6; }
		if (tmpd.includes("x7"))    { return 7; }
		if (tmpd.includes("x8"))    { return 8; }
		if (tmpd.includes("x9"))    { return 9; }
		if (tmpd.includes("x10"))   { return 10; }
		if (tmpd.includes("x1/20")) { return 0.05; }  // before x1/2, which it contains
		if (tmpd.includes("x1/10")) { return 0.1; }
		if (tmpd.includes("x1/4"))  { return 0.25; }
		if (tmpd.includes("x1/2"))  { return 0.5; }
		if (tmpd.includes("x1"))    { return 1; }     // last, because "x1" appears in all the others
		return 1;
	}

	// This is the function which returns the body chart for a body type, as areas.
	export function getBodyChart(tmpbodytype) {
		return parseBodyChart(BODY_CHARTS[tmpbodytype] ?? BODY_CHARTS["Humanoid"]);
	}

	// This is the function which finds which armour-family covers a body type.
	//
	// His code matches with includes(), so one branch serves every chart whose name contains the
	// family word -- "Humanoid" covers all eleven Humanoid variants. No chart matches two
	// families, so the first hit is the only hit.
	// Returns "" for the twenty-three body types he wrote no branch for; those take no protection
	// from worn armour, in his sheet as in this port.
	export function getArmorFamily(tmpbodytype) {
		var tmptype = String(tmpbodytype ?? "");
		for (const tmpfamily of Object.keys(ARMOR_COVERAGE_BY_BODY_TYPE)) {
			if (tmptype.includes(tmpfamily)) { return tmpfamily; }
		}
		return "";
	}

	// This is the function which says which armour slot covers one area of one body type, and
	// whether that area needs a particular kind of armour to be covered at all.
	//
	// Ported from getArmorValuesByBodyTypeAndArmor, with one deliberate difference. His version
	// switches on the area's POSITION in the body chart; two of his branches have drifted out of
	// step with the charts they serve, so a position-keyed port would put armour on the wrong
	// limb (docs/UPSTREAM-ISSUES.md items 17 and 18). This keys by area name, which is what the
	// comments on his own cases say each position was meant to be.
	//
	// Returns { slot, requiresItem }. slot is "" when nothing covers the area. requiresItem is
	// the text an armour's name must contain for it to count there -- a centaur's quarters and
	// legs are covered by barding and by nothing else -- and "" when any armour counts.
	export function getAreaArmorSlot(tmpbodytype, tmpareaname) {
		var tmpfamily = getArmorFamily(tmpbodytype);
		if (!tmpfamily) { return { slot: "", requiresItem: "" }; }
		return {
			slot: ARMOR_COVERAGE_BY_BODY_TYPE[tmpfamily][tmpareaname] ?? "",
			requiresItem: ARMOR_REQUIRES_ITEM[tmpfamily]?.[tmpareaname] ?? ""
		};
	}

	// This is the function which totals the armour covering one area, from the layers worn.
	// Kept here rather than in each actor model, because a character and a creature work out
	// their body the same way and only differ in where the Endurance comes from.
	//
	// Returns { armor, materials, layers } before any accumulated damage is taken off.
	export function getAreaArmor(tmpbodytype, tmpareaname, tmpworn) {
		var tmpcover = getAreaArmorSlot(tmpbodytype, tmpareaname);
		var tmpout = { armor: 0, materials: [], layers: [], slot: tmpcover.slot };
		if (!tmpcover.slot) { return tmpout; }

		for (const tmpitem of tmpworn ?? []) {
			// A gated area only counts armour of the right kind, whatever else is worn over it.
			if (tmpcover.requiresItem && !String(tmpitem.name ?? "").includes(tmpcover.requiresItem)) {
				continue;
			}
			var tmpvalue = parseInt(tmpitem.system?.coverage?.[tmpcover.slot]) || 0;
			if (tmpvalue > 0) {
				tmpout.armor = tmpout.armor + tmpvalue;
				tmpout.materials.push(tmpitem.system.material);
				tmpout.layers.push(tmpitem.name);
			}
		}
		return tmpout;
	}

	// @MARKER SHIELD COVER
	// A shield is a FIFTH layer, worn over the four armour ones, and it covers a run of areas
	// down one side of the body rather than a single slot. Ported from equipShield
	// (sheet-worker.js:103777); unequipShield needs nothing here, since it only clears the layer.

	// This is the function which reads a shield's size out of its name. His equipShield tests the
	// name with includes() in this order, so "Shield(Body/Steel)" is a Body shield. Anything with
	// no size in its name is not one of his shields and covers nothing.
	export function getShieldSize(tmpitemname) {
		var tmpname = "" + (tmpitemname ?? "");
		for (const tmpsize of SHIELD_SIZES) {
			if (tmpname.includes(tmpsize)) { return tmpsize; }
		}
		return "";
	}

	// This is the function which finds which shield-family covers a body type. Same substring
	// match his includes() does, and the same eight families the armour coverage has. Returns ""
	// for the twenty-three body types he wrote no branch for, which carry no shield.
	export function getShieldFamily(tmpbodytype) {
		var tmptype = "" + (tmpbodytype ?? "");
		for (const tmpfamily of Object.keys(SHIELD_COVERAGE)) {
			if (tmptype.includes(tmpfamily)) { return tmpfamily; }
		}
		return "";
	}

	// This is the function which gives a shield its own armour value.
	//
	// Every shield carries its value in the LEFT HAND column whichever hand it is really held in
	// -- his comment at equipShield says so outright, "All shields have at least armor value in
	// area 13 (use this as the basis)" -- so the column is read rather than the covered area's.
	//
	// A magical shield adds its plus and then doubles the whole lot. That is his arithmetic as
	// written, not a misreading: a +2 shield of 10 becomes 24, not 12.
	//
	// His rune modifiers (Rune Strenghthen, Rune Armor) are added before the doubling in his
	// version. Runes are a deferred subsystem here, so nothing supplies them yet; the slot for
	// them is where his is, so adding them later is a one-line change.
	export function getShieldValue(tmpshield) {
		var tmpvalue = parseInt(tmpshield?.system?.coverage?.handLeft) || 0;
		var tmpplus = parseInt(tmpshield?.system?.magicBonus) || 0;
		if (tmpplus > 0) {
			tmpvalue = tmpvalue + tmpplus;
			tmpvalue = tmpvalue * 2;
		}
		return tmpvalue;
	}

	// This is the function which lists the areas one shield covers on one body.
	//
	// A shield is held in the off hand, so a right-hander is covered down the LEFT side. His code
	// tests only for "Left" and treats everything else as right-handed, which is how
	// "Ambidextrous" -- a value his racial code really does set -- ends up shielded on the right.
	// That is followed here rather than invented away.
	//
	// A Buckler is the one size worn two ways: strapped to the forearm, or held in the hand,
	// which is his equip_buckler_on_wrist flag.
	//
	// The list returned is the FAMILY's, so it can name an area a particular chart in that family
	// does not have -- a plain Snake has four areas and no arms at all -- and it can name the same
	// area under two spellings, since a hooved Humanoid calls its foot a hoof. Neither matters,
	// because everything downstream asks about areas the chart really has, one at a time. No chart
	// carries both a spelling and its alias, so nothing is ever counted twice.
	export function getShieldAreas(tmpbodytype, tmpshield, tmphandedness) {
		var tmpfamily = getShieldFamily(tmpbodytype);
		if (!tmpfamily) { return []; }

		var tmpsize = getShieldSize(tmpshield?.name);
		if (!tmpsize) { return []; }
		if (tmpsize == "Buckler" && tmpshield?.system?.bucklerOnWrist) { tmpsize = "Buckler(Wrist)"; }

		var tmphand = (("" + (tmphandedness ?? "")) == "Left") ? "Left" : "Right";
		return SHIELD_COVERAGE[tmpfamily][tmpsize]?.[tmphand] ?? [];
	}

	// This is the function which totals the shields covering one area.
	//
	// Kept separate from getAreaArmor rather than folded into it, because a shield is his own
	// fifth layer: he stores it in bodyarea*_shield_layer5 apart from the four armour layers, and
	// clears that layer wholesale when the shield comes off. Armour damage is tracked per area
	// against the worn layers and does not touch it.
	//
	// Returns { armor, layers } -- the value added at this area, and which shields added it.
	export function getAreaShield(tmpbodytype, tmpareaname, tmpshields, tmphandedness) {
		var tmpout = { armor: 0, layers: [] };
		for (const tmpshield of tmpshields ?? []) {
			if (!getShieldAreas(tmpbodytype, tmpshield, tmphandedness).includes(tmpareaname)) {
				continue;
			}
			var tmpvalue = getShieldValue(tmpshield);
			if (tmpvalue > 0) {
				tmpout.armor = tmpout.armor + tmpvalue;
				tmpout.layers.push(tmpshield.name);
			}
		}
		return tmpout;
	}

	// @MARKER OFF-HAND FIGHTING

	// This is the function which says whether a weapon is being used in the off hand.
	//
	// Off-handedness is DERIVED, never stored. The weapon carries which hand it is in
	// ("right" / "left" / "both") and the actor carries handedness; a weapon is off-hand when
	// those disagree. A weapon held in BOTH hands is not off-hand -- there is no spare hand for
	// a second weapon, which is the situation the whole penalty exists to describe.
	//
	// AMBIDEXTROUS HAS NO OFF HAND AT ALL. All three of his penalty functions short-circuit on
	// handedness before they ever look at Agility (sheet-worker.js:83307, 83331, 83351), so
	// ambidexterity is the ABSENCE of the cost rather than a bonus laid on top of it.
	//
	// Note the deliberate asymmetry with getShieldAreas above, which lets "Ambidextrous" fall
	// through its else branch and read as right-handed. Both behaviours are his, in different
	// functions; neither is invented away here.
	export function isOffhandWeapon(tmphand, tmphandedness) {
		var tmpwielded = "" + (tmphand ?? "right");
		if (tmpwielded == "both") { return false; }

		var tmphanded = "" + (tmphandedness ?? "");
		if (tmphanded == "Ambidextrous") { return false; }

		var tmpdominant = (tmphanded == "Left") ? "left" : "right";
		return tmpwielded != tmpdominant;
	}

	// This is the function which reads one Agility-banded off-hand penalty.
	//
	// tmpkind is "melee", "damage" or "skill". THE THREE TABLES DO NOT SHARE BAND EDGES -- melee
	// reaches zero at Agility 19, damage and skills at 20 -- so each is read from its own rows and
	// none is inferred from another.
	//
	// Any rating outside every band returns zero, which covers both his "<=0" branch and the open
	// top of each chain without special-casing either.
	export function getOffhandPenalty(tmpkind, tmpagility, tmphandedness) {
		if (("" + (tmphandedness ?? "")) == "Ambidextrous") { return 0; }

		var tmpbands = OFFHAND_PENALTIES[tmpkind];
		if (!tmpbands) { return 0; }

		var tmprating = parseInt(tmpagility) || 0;
		for (const tmpband of tmpbands) {
			if (tmprating >= tmpband[0] && tmprating <= tmpband[1]) { return tmpband[2]; }
		}
		return 0;
	}

	// This is the function which works out what fighting with this weapon in the off hand costs.
	//
	// His handlePhysicalAttacks picks ONE of three tiers per weapon, and they do not stack -- Lore
	// is tested first and stops there:
	//
	//     Second Weapon Lore       -> no penalty at all
	//     Second Weapon Knowledge  -> the penalty bought down by the skill's own levels
	//     neither                  -> the full banded penalty
	//
	// Returns { offhand, tier, melee, damage, skill }. A weapon that is not in the off hand comes
	// back with tier "none" and three zeroes, so the caller can add these unconditionally.
	//
	// NOT YET IMPLEMENTED: the "knowledge" tier's buy-down. Second Weapon Knowledge gives
	// skillChance/20 levels, each worth one point of to-hit and damage back and 5% of skills, never
	// past zero (sheet-worker.js:83188). That needs skills resolving to a number on the actor and is
	// the second half of this subsystem; until it lands, a weapon with Knowledge but not Lore takes
	// the full penalty, which is his behaviour for a character whose skill has not yet reached one
	// level. See docs/sonnet/2026-09-12-offhand-planning.md.
	export function resolveOffhandPenalties(tmpweapon, tmpagility, tmphandedness) {
		var tmpout = { offhand: false, tier: "none", melee: 0, damage: 0, skill: 0 };

		var tmpsystem = tmpweapon?.system ?? tmpweapon ?? {};
		if (!isOffhandWeapon(tmpsystem.hand, tmphandedness)) { return tmpout; }
		tmpout.offhand = true;

		if (tmpsystem.secondWeaponLore) {
			tmpout.tier = "lore";
			return tmpout;
		}

		tmpout.tier   = tmpsystem.secondWeaponKnowledge ? "knowledge" : "full";
		tmpout.melee  = getOffhandPenalty("melee",  tmpagility, tmphandedness);
		tmpout.damage = getOffhandPenalty("damage", tmpagility, tmphandedness);
		tmpout.skill  = getOffhandPenalty("skill",  tmpagility, tmphandedness);
		return tmpout;
	}

	// This is the function which gives one area's Endurance: the character's Endurance times the
	// area's multiplier, rounded up with his +0.99 idiom (createBodyAreas, sheet-worker.js:180250).
	export function getAreaEndurance(tmpendurance, tmpmultiplier) {
		return parseInt((tmpendurance * tmpmultiplier) + 0.99) || 0;
	}

	// This is the function which applies damage that has already got past the armour to one
	// area, and reports what it means. Ported from handleBodyDamage (sheet-worker.js:71368-71404).
	//
	//   tmpinput = {
	//       damage:        damage getting through
	//       areaWounds:    wounds already on this area
	//       areaEndurance: this area's Endurance
	//       vitality:      the character's Vitality rating
	//       totalWounds:   wounds across the whole body before this hit
	//       shock:         the character's Shock; 0 means immune to shock
	//   }
	//
	// Wounds on an area are capped at its Endurance plus Vitality. Past the area's Endurance a
	// Vitality save is needed; past Endurance plus Vitality the area's effect is triggered (a limb
	// disabled, a vital area lethal). Total wounds over Shock put the character into shock.
	// Anything over 9 points pierces the armour.
	export function applyAreaDamage(tmpinput) {
		var tmpdamage = parseInt(tmpinput.damage) || 0;
		var tmpwounds = parseInt(tmpinput.areaWounds) || 0;
		var tmpend = parseInt(tmpinput.areaEndurance) || 0;
		var tmpvit = parseInt(tmpinput.vitality) || 0;
		var tmpcap = tmpend + tmpvit;

		var tmpnewwounds = tmpwounds;
		var tmptotal = parseInt(tmpinput.totalWounds) || 0;
		if (tmpdamage > 0) {
			tmpnewwounds = tmpwounds + tmpdamage;
			if (tmpnewwounds > tmpcap) { tmpnewwounds = tmpcap; }
			tmptotal = tmptotal + tmpdamage;
		}

		var tmpeffect = false;
		var tmpvitsave = false;
		if ((tmpdamage + tmpwounds) > tmpcap)      { tmpeffect = true; }
		else if ((tmpdamage + tmpwounds) > tmpend) { tmpvitsave = true; }

		var tmpshock = parseInt(tmpinput.shock) || 0;
		var tmpinshock = (tmpshock != 0) && (tmptotal > tmpshock);

		return {
			wounds: tmpnewwounds,
			totalWounds: tmptotal,
			vitalitySaveNeeded: tmpvitsave,
			effectTriggered: tmpeffect,
			inShock: tmpinshock,
			armorPierced: tmpdamage > 9
		};
	}


//==================================================================================================================
// @MARKER WEAPON AND MISSILE LORE
//==================================================================================================================

	// This is the function which strips a customised item name back to the name his lore lists
	// are keyed by. Ported from getSimplifiedName (sheet-worker.js).
	//
	// He writes a customised item as "...{Base Name}...", and everything outside the braces is
	// decoration. A name with no braces is already simple and comes back unchanged.
	export function getSimplifiedName(tmpcomplexname) {
		var tmpname = "" + (tmpcomplexname ?? "");
		if (tmpname == "undefined") { tmpname = ""; }
		var tmpopen = tmpname.lastIndexOf("{");
		var tmpclose = tmpname.lastIndexOf("}");
		if (tmpclose > tmpopen + 1) { return tmpname.slice(tmpopen + 1, tmpclose); }
		return tmpname;
	}

	// This is the function which reads one of his lore lists into names.
	// He keeps each as a single comma-separated string; blanks and stray spaces are dropped so a
	// trailing comma or a typed space cannot become an entry that matches nothing.
	export function parseLoreList(tmplist) {
		if (Array.isArray(tmplist)) { return tmplist.map(n => ("" + n).trim()).filter(n => n); }
		return ("" + (tmplist ?? "")).split(",").map(n => n.trim()).filter(n => n);
	}

	// This is the function which says whether a character has a lore skill yet.
	//
	// A class carries the title at which it acquires each, and zero means it never does -- true
	// of 59 of his 92 classes for Weapon Lore and 70 for Missile Lore.
	//
	// The test follows the ONE call site he wrote correctly, `(currentTitle+1)>whenAcquired`
	// (sheet-worker.js:82558), which for whole titles is exactly `title >= when`. Seven other
	// gates on the same two lores are written `currentTitle=>whenAcquired`, which builds an arrow
	// function instead of comparing and is therefore always true -- docs/UPSTREAM-ISSUES.md item
	// 19. Those are not reproduced: where his own code contradicts itself, the half that is
	// written correctly is the half that states the intent.
	export function hasLore(tmptitle, tmpwhenacquired) {
		var tmpwhen = parseInt(tmpwhenacquired) || 0;
		if (tmpwhen == 0) { return false; }          // this class never acquires it
		return (parseInt(tmptitle) || 0) >= tmpwhen;
	}

	// This is the function which says whether one weapon is specifically lored.
	// His lists hold SIMPLIFIED names, so the weapon's name is simplified before matching
	// (checkEquippedWeaponsAgainstWeaponLoreList, sheet-worker.js:90780).
	export function isWeaponLored(tmpweaponname, tmplorelist) {
		var tmpsimple = getSimplifiedName(tmpweaponname);
		if (!tmpsimple) { return false; }
		for (const tmpentry of tmplorelist ?? []) {
			if (getSimplifiedName(tmpentry) == tmpsimple) { return true; }
		}
		return false;
	}

	// What lore is worth. From the modifier list his sheet builds (sheet-worker.js:82559-82572
	// for Weapon Lore, 82592-82605 for Missile), and confirmed against the weapon-speed path.
	//
	// These are TOTALS, not additions on top of one another. A specifically lored weapon gets +3
	// to hit, NOT +2 general and +3 again -- his own comment in
	// getWeaponSpeedListingAdjustmentForModifier says so of the speed: "only give a -1 more, -1
	// is already accounted for in the general mod", making the lored weapon's total -2.
	//
	//            attack  damage  speed  skills
	export const LORE_GENERAL  = { attack: 2, damage: 4, speed: -1, skills: 10 };
	export const LORE_SPECIFIC = { attack: 3, damage: 6, speed: -2, skills: 20 };

	// This is the function which gives what lore is worth for one weapon in one attack.
	//
	// Weapon Lore covers melee, Missile Lore covers missile, and neither touches the other. A
	// character with the lore gets the general figures for every weapon of that kind, and the
	// larger specific figures instead for a weapon named in the matching list.
	//
	// Returns { attack, damage, speed, skills, specific } -- all zero when the lore is not held.
	export function getLoreModifiers(tmpinput) {
		var tmpismissile = !MELEE_MODES.includes(tmpinput.mode);
		var tmphas = tmpismissile ? tmpinput.hasMissileLore : tmpinput.hasWeaponLore;
		if (!tmphas) { return { attack: 0, damage: 0, speed: 0, skills: 0, specific: false }; }

		var tmplist = parseLoreList(tmpismissile ? tmpinput.missileLoreList : tmpinput.weaponLoreList);
		var tmpspecific = isWeaponLored(tmpinput.weaponName, tmplist);
		var tmpvalues = tmpspecific ? LORE_SPECIFIC : LORE_GENERAL;
		return { ...tmpvalues, specific: tmpspecific };
	}

	// @MARKER PROJECTILE LORE
	// Projectile Lore is the odd one of the lore family: it is worth damage PER DIE rather than a
	// flat figure, and it attaches to the ammunition rather than to the weapon in hand. A bow's
	// lore is read off the arrow it normally fires.

	// This is the function which reads the number of dice off a damage string.
	// Ported from getNumberOfDice: everything before the first "d". "2d6" is two dice, "8" is
	// none at all, which is what makes a flat-damage weapon get nothing from Projectile Lore.
	export function getNumberOfDice(tmpdicestring) {
		var tmpstring = "" + (tmpdicestring ?? "");
		var tmpat = tmpstring.indexOf("d");
		if (tmpat < 1) { return 0; }
		return parseInt(tmpstring.slice(0, tmpat)) || 0;
	}

	// This is the function which walks one of his ordered name chains and returns the first match.
	// The order is the whole point: "Bolted" is tested before "Bolt", so a bolted-leather piece
	// does not read as a crossbow bolt. See the tables' comment in module/combat-tables.mjs.
	function matchWeaponName(tmpname, tmpchain) {
		var tmpweapon = getSimplifiedName(tmpname);
		for (const [tmpsubstring, tmpvalue] of tmpchain) {
			if (tmpweapon.includes(tmpsubstring)) { return tmpvalue; }
		}
		return null;
	}

	// This is the function which says whether a weapon is ammunition -- an arrow, a bolt, a rock.
	export function isProjectileWeapon(tmpname) {
		return matchWeaponName(tmpname, PROJECTILE_MATCHES) === true;
	}

	// This is the function which says whether a weapon launches ammunition -- a bow, a crossbow.
	export function isLauncherWeapon(tmpname) {
		return matchWeaponName(tmpname, LAUNCHER_MATCHES) === true;
	}

	// This is the function which gives the projectile a launcher normally fires, so a Long Bow's
	// Projectile Lore is looked up against its Arrow. Returns "" for anything not a launcher.
	export function getProjectileForLauncher(tmpname) {
		return matchWeaponName(tmpname, LAUNCHER_PROJECTILE) ?? "";
	}

	// This is the function which gives Projectile Lore's damage for one attack.
	// Ported from handlePhysicalAttacks (sheet-worker.js:64518-64545 and 64990).
	//
	// It applies only to a launcher or to ammunition, and only to a character who has the lore.
	// The projectile checked is the ammunition itself, or the one the launcher normally fires.
	// Worth +1 per damage die generally, +2 per die for a projectile named in the list -- and as
	// with the other lores the specific figure REPLACES the general one rather than adding to it.
	//
	// Returns { damage, perDie, dice, projectile, specific }.
	export function getProjectileLoreDamage(tmpinput) {
		var tmpout = { damage: 0, perDie: 0, dice: 0, projectile: "", specific: false };
		if (!tmpinput.hasProjectileLore) { return tmpout; }

		var tmplauncher = isLauncherWeapon(tmpinput.weaponName);
		var tmpammo = isProjectileWeapon(tmpinput.weaponName);
		if (!tmplauncher && !tmpammo) { return tmpout; }

		tmpout.projectile = tmplauncher
			? getProjectileForLauncher(tmpinput.weaponName)
			: getSimplifiedName(tmpinput.weaponName);

		tmpout.specific = isWeaponLored(tmpout.projectile, tmpinput.projectileLoreList);
		tmpout.perDie = tmpout.specific ? 2 : 1;
		tmpout.dice = getNumberOfDice(tmpinput.damageDice);
		tmpout.damage = tmpout.dice * tmpout.perDie;
		return tmpout;
	}

//==================================================================================================================
// @MARKER TIME
//==================================================================================================================

	// This is the function which gives a character's initiative modifier: the BETTER of the
	// Agility and Intelligence adjustments -- lower is better, and they are not added together --
	// plus armour and anything else. (sheet-worker.js:82366-82372.)
	export function getInitiativeModifier(tmpaglinit, tmpintinit, tmpother) {
		var tmpagl = parseInt(tmpaglinit) || 0;
		var tmpint = parseInt(tmpintinit) || 0;
		return Math.min(tmpagl, tmpint) + (parseInt(tmpother) || 0);
	}

	// This is the function which turns an initiative total into the second of the round a
	// character begins acting in. Lower is earlier. Nobody starts before second 1 -- a negative
	// result only decides who goes first within it -- and every point below -10 buys an extra
	// second of action, up to ten more (Player's Guide, Agility / Initiative Adjustment).
	export function getActingSecond(tmptotal) {
		var tmpvalue = parseInt(tmptotal) || 0;
		var tmpextra = 0;
		if (tmpvalue < -10) { tmpextra = Math.min(10, -10 - tmpvalue); }
		return { second: Math.max(1, tmpvalue), extraSeconds: tmpextra };
	}

	// This is the function which gives how long a swing takes: the weapon's speed plus every
	// speed modifier (Strength, Agility and armour), never below the weapon's minimum speed.
	// (sheet-worker.js:82388-82394.)
	export function getWeaponSpeed(tmpspeed, tmpminspeed, tmpmodifiers) {
		var tmpvalue = (parseInt(tmpspeed) || 0) + (parseInt(tmpmodifiers) || 0);
		var tmpmin = parseInt(tmpminspeed) || 0;
		if (tmpvalue < tmpmin) { tmpvalue = tmpmin; }
		return tmpvalue;
	}

// @MARKER MOVEMENT
//==================================================================================================================
// How far a character travels, at three scales at once: per hour (miles), per 10 second combat
// round (feet), and per second (feet).
//
// A RACE'S MOVEMENT FIGURES ARE MODIFIERS, NOT FINISHED RATES. His calcMovement
// (sheet-worker.js:30856) switches on Agility for a base and ADDS the race's figure to it:
//
//     setAttrs({move_walk_hourly: 2+racetmpwalkhourly+tmpwalktemphourlymod});
//
// so a race carrying 0/0/0 -- Human(Civilized) among them -- is a race with NO MODIFIER, and
// walks at the full base for its Agility. It is not a race that cannot walk. The Player's Guide
// prints the same split on page 36: base tables by Agility, then a separate "Racial Movement
// Modifiers" table, and his Human(Barbaric) row is that table's +1/+10/+1, +2/+20/+2, +2/+30/+3
// to the digit.
//==================================================================================================================

	// This is the function which reads the base distances for an Agility rating.
	//
	// His switch runs 0 to 30 with no default, so a rating above it would leave whatever the
	// previous character's values happened to be. Here the top band is held instead, which is the
	// same answer his sheet gives for 30 and a defined one for anything past it.
	export function getMovementBase(tmpagility) {
		var tmprating = parseInt(tmpagility) || 0;
		if (tmprating < 0) { tmprating = 0; }

		for (const tmpband of MOVEMENT_BASE) {
			if (tmprating >= tmpband[0] && tmprating <= tmpband[1]) { return tmpband[2]; }
		}
		return MOVEMENT_BASE[MOVEMENT_BASE.length - 1][2];
	}

	// This is the function which finishes one movement rate: base for the Agility, plus the race's
	// modifier, times the race's speed multiplier.
	//
	// A speed multiplier of 0 means NO multiplier. That is his sentinel, not a stationary race --
	// calcSpecialMovement says so in as many words: "most races are 0 (this makes the multiplier 1".
	//
	// A NEGATIVE multiplier is ignored the same way, because it is not a coherent quantity: a
	// multiplier scales a rate, it does not reverse its direction. Only Elf(Sea) and Elf(Ice) carry
	// one, both -10, against 0 for the other 103 races, and his own sheet multiplies straight
	// through it into large negative distances. Those two are also the only elves of eleven with no
	// disease-resistance modifier, where every other elf has one -- a -10 in this column beside a
	// hole in the one before it. Read as a mis-keyed cell and skipped; see UPSTREAM-ISSUES.md
	// item 24. They then walk and swim like any other elf, rather than at the floor below.
	//
	// tmpfloor is what a NEGATIVE rate becomes at this scale. The Player's Guide (p.36): a race
	// whose penalties "cause a negative movement rate" has it "reduced to 1 mile (hourly), 10 feet
	// (10 seconds) or 1 foot (1 second)". Only a rate below zero is lifted -- a rate that lands on
	// zero honestly, as Agility 0-1 does, stays zero, which is what his sheet shows.
	//
	// HIS SHEET DOES NOT IMPLEMENT THAT RULE. Elf(Sea) and Elf(Ice) carry a -10 speed multiplier,
	// and his sheet multiplies straight through it and hands them large negative distances. The
	// book's floor is applied here rather than reproducing that. See docs/UPSTREAM-ISSUES.md.
	export function resolveMovementRate(tmpbase, tmpracemod, tmpmultiplier, tmpfloor) {
		var tmpmulti = parseFloat(tmpmultiplier) || 0;
		if (tmpmulti <= 0) { tmpmulti = 1; }

		var tmprate = ((parseFloat(tmpbase) || 0) + (parseFloat(tmpracemod) || 0)) * tmpmulti;
		if (tmprate < 0) { tmprate = tmpfloor; }
		return Math.round(tmprate * 10) / 10;
	}

// @MARKER SPECIAL MOVEMENT
//==================================================================================================================
// The extra rate some races have -- Fly, Gallop, Swim, Scurry, Slither -- which is never written as
// a distance. It is written RELATIVE to another of the character's own rates: the name of a base
// rate, with a multiplier and an additive beside it, for each of the three scales.
//
// From calcSpecialMovement (sheet-worker.js:32110). 26 of his 105 races have one.
//
// THE FIVE KINDS DO NOT SHARE A FORMULA, which is why this is a table rather than one expression:
// only Scurry adds its additive, and Slither alone ignores the race's speed multiplier. Reading
// one kind's shape off another would be wrong for four of the five.
//==================================================================================================================

	// What each kind of special movement does with the additive and the race's speed multiplier.
	// Slither also REPLACES ordinary movement rather than adding to it -- his comment: "Slither is
	// the only movement sssssnake people have", and "Snakes can`t jump".
	const SPECIAL_MOVEMENT_SHAPES = {
		"Fly:":     { usesMod: false, usesSpeedMultiplier: true,  replacesMovement: false },
		"Gallop:":  { usesMod: false, usesSpeedMultiplier: true,  replacesMovement: false },
		"Swim:":    { usesMod: false, usesSpeedMultiplier: true,  replacesMovement: false },
		"Scurry:":  { usesMod: true,  usesSpeedMultiplier: true,  replacesMovement: false },
		"Slither:": { usesMod: false, usesSpeedMultiplier: false, replacesMovement: true  }
	};

	// This is the function which says whether a kind of special movement is the only movement its
	// race has, rather than an extra on top of walking.
	export function specialMovementReplacesOther(tmpname) {
		var tmpshape = SPECIAL_MOVEMENT_SHAPES[("" + (tmpname ?? "")).trim()];
		return tmpshape ? tmpshape.replacesMovement : false;
	}

	// This is the function which works the special rate out into real distances.
	//
	// tmpmovement is the character's ALREADY-RESOLVED walk and run, so "Walk" means this
	// character's finished walking rate rather than the race's modifier.
	//
	// The base rate is named per scale in his data, but his own code branches on the HOURLY name
	// alone and uses it for all three; that is followed here. All 26 races agree across the three
	// anyway, so the two readings cannot currently diverge.
	//
	// A multiplier of 0 means one, the same sentinel as the race speed multiplier.
	//
	// An unrecognised kind or base name resolves to nothing rather than throwing or guessing: a new
	// name in his data is a new fact about his system and should be read before being encoded.
	//
	// ONE DELIBERATE DEPARTURE FROM HIS LIVE CODE, for magical flight. His INT line multiplies by a
	// further literal 30 / 30 / 3 on top of the race's own multiplier (sheet-worker.js:32397). Three
	// things say that is a slip rather than the rule:
	//
	//   - Mephyt(Fire) and Mephyt(Ice), the only two races that use INT, carry per-scale multipliers
	//     of 0.75 / 30 / 3 where every other race's are uniform. Those only make sense applied on
	//     their own -- 30 feet per 10 seconds is exactly ten times 3 feet per second.
	//   - With his extra literals the ten-second rate becomes ONE HUNDRED times the one-second rate
	//     instead of ten, which no other rate in the system does.
	//   - The version commented out directly above that line (32366-32368) is exactly this: the
	//     multiplier alone, with no literal factor.
	//
	// So the multiplier is applied on its own here. This is sheet-versus-sheet rather than
	// sheet-versus-book, so the standing "the sheet wins" rule does not settle it. Two races are
	// affected and it is one line to put back. Logged for him as UPSTREAM-ISSUES.md item 25.
	export function resolveSpecialMovement(tmpname, tmpspecial, tmpmovement, tmpspeedmultiplier, tmpintelligence) {
		var tmpout = { hourly: 0, tenSec: 0, oneSec: 0 };
		if (!tmpspecial || !tmpmovement) { return tmpout; }

		var tmpshape = SPECIAL_MOVEMENT_SHAPES[("" + (tmpname ?? "")).trim()];
		if (!tmpshape) { return tmpout; }

		var tmpbasename = ("" + (tmpspecial.hourly ?? "")).trim().toLowerCase();
		if (tmpbasename != "walk" && tmpbasename != "run" && tmpbasename != "int") { return tmpout; }

		// Magical flight reads Intelligence and takes no speed multiplier -- his comment on the
		// INT branch: "it never has a multiplier, even for speed".
		var tmpspeed = parseFloat(tmpspeedmultiplier) || 0;
		if (tmpspeed <= 0) { tmpspeed = 1; }   // 0 is his "none"; negative is incoherent, see above
		if (!tmpshape.usesSpeedMultiplier || tmpbasename == "int") { tmpspeed = 1; }

		// The same floor the ordinary rates take: a race carrying a negative speed multiplier drags
		// its special rate negative too, so Elf(Sea) would otherwise swim at -150 miles an hour.
		var tmpfloors = { hourly: 1, tenSec: 10, oneSec: 1 };

		for (const tmpscale of ["hourly", "tenSec", "oneSec"]) {
			var tmpmulti = parseFloat(tmpspecial[tmpscale + "Multiplier"]) || 0;
			if (tmpmulti == 0) { tmpmulti = 1; }

			var tmpmod = tmpshape.usesMod ? (parseFloat(tmpspecial[tmpscale + "Mod"]) || 0) : 0;

			var tmpbase = 0;
			if (tmpbasename == "int") {
				tmpbase = parseFloat(tmpintelligence) || 0;
			} else {
				tmpbase = parseFloat((tmpmovement[tmpbasename] ?? {})[tmpscale]) || 0;
			}

			var tmprate = (((tmpbase * tmpmulti) + tmpmod) * tmpspeed);
			if (tmprate < 0) { tmprate = tmpfloors[tmpscale]; }
			tmpout[tmpscale] = Math.round(tmprate * 10) / 10;
		}
		return tmpout;
	}

// @MARKER ADD NEW combat rule functions HERE
// @END (CODE)
