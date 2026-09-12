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
	ARMOR_COVERAGE_BY_BODY_TYPE, ARMOR_REQUIRES_ITEM
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


	// This is the function which runs a blow against the armour at one area, in his order
	// (handleBodyDamage, sheet-worker.js:71274-71358):
	//   1. armour blocks some or all of it, by band
	//   2. the armour takes its own damage, worked from the damage BEFORE blocking
	//   3. natural hide (a creature's tough skin, etc.) then takes its share off what is left
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

// @MARKER ADD NEW combat rule functions HERE
// @END (CODE)
