// @START (CODE)
// @MARKER CREATURE COMBAT RULES
//==================================================================================================================
// The rules for a creature's own attacks, as pure functions with no Foundry in them, so they can
// be tested outside it. The Foundry layer that rolls the dice and writes the chat card is
// combat/creature-attack.mjs.
//
// Ported from handleCreatureAttack (sheet-worker.js:179717-180136) and handleTouchAttack
// (sheet-worker.js:67731). A creature's attack shares the zone ladder, the fumble handling and
// the body damage of a weapon attack -- those are already in combat-rules.mjs and are reused
// rather than copied. What is creature-only is here:
//
//   - which kind of roll a given attack type needs, if any
//   - the area shapes, whose reach comes from the creature's own Endurance
//   - the touch rule
//   - how a creature's to-hit and damage modifiers add up
//==================================================================================================================

import { CREATURE_ATTACK_TYPES } from "../creature-tables.mjs";

//==================================================================================================================
// @MARKER ATTACK BEHAVIOUR
//==================================================================================================================

	// This is the function which says how an attack type resolves.
	// Returns { resolve, mods, shape, tier }:
	//     resolve  "chart" rolls d20 down the attack chart, "auto" hits without a roll,
	//              "touch" needs a 10 or better once the Agility modifier is in
	//     mods     "melee" or "missile", which set of to-hit modifiers applies
	//     shape    the area shape sized from Endurance, or "" for none
	//     tier     which size band that shape uses
	// An unknown type falls back to a plain melee chart roll, which is what his code does with
	// anything its branches do not recognise.
	export function getCreatureAttackBehaviour(tmptype) {
		var tmprow = CREATURE_ATTACK_TYPES[tmptype] ?? CREATURE_ATTACK_TYPES["Melee"];
		return { resolve: tmprow[0], mods: tmprow[1], shape: tmprow[2], tier: tmprow[3] };
	}

	// This is the function which resolves a touch attack. Ported from handleTouchAttack.
	// A natural 1 always misses; otherwise 10 or better once the Agility missile modifier and
	// any declared modifier are added makes contact.
	export function resolveTouchAttack(tmpnatural, tmpmods) {
		var tmpnat = parseInt(tmpnatural) || 0;
		if (tmpnat == 1) { return { natural: tmpnat, total: tmpnat, touched: false }; }
		var tmptotal = tmpnat + (parseInt(tmpmods) || 0);
		return { natural: tmpnat, total: tmptotal, touched: tmptotal > 9 };
	}

//==================================================================================================================
// @MARKER AREA SHAPES
//==================================================================================================================

	// His two dividing helpers, ported so the arithmetic matches exactly.
	// divideWithMin never returns less than 1 (sheet-worker.js:25595).
	function divideWithMin(tmpdividend, tmpdivisor) {
		var tmpvalue = parseInt(tmpdividend / tmpdivisor) || 0;
		if (tmpvalue < 1) { tmpvalue = 1; }
		return tmpvalue;
	}

	// divideWithMinAndMax is the same with a ceiling -- and the ceiling is the part his own
	// version never applies: it reads `tempValue=>tmpMaxValue`, an arrow function rather than an
	// assignment, so the maximum is silently dropped (sheet-worker.js:25604). The cap is applied
	// here, which is plainly what it was for. Recorded in docs/UPSTREAM-ISSUES.md.
	function divideWithMinAndMax(tmpdividend, tmpdivisor, tmpmax) {
		var tmpvalue = divideWithMin(tmpdividend, tmpdivisor);
		if (tmpvalue > tmpmax) { tmpvalue = tmpmax; }
		return tmpvalue;
	}

	// The ceiling each shape and tier uses, from his branches at sheet-worker.js:179789-179845.
	// Note the plain tier sits BETWEEN weak and strong for a bolt or a cone, which is the order
	// his code has them in.
	//                                    weak  normal  strong
	const SHAPE_LIMITS = {
		cloud: { weak: 25,  normal: 35,  strong: 50  },   // cloud caps the level, then length at 100
		bolt:  { weak: 100, normal: 150, strong: 200 },
		cone:  { weak: 100, normal: 150, strong: 200 },
		glob:  { weak: 150, normal: 200, strong: 300 }
	};

	// This is the function which works out how far an area attack reaches, from the creature's
	// Endurance, and describes it the way his chat output does.
	//
	// tmpdice is only needed for a cone, which affects 1d4 body areas of anyone caught in it;
	// it arrives as an argument rather than being rolled here so this stays pure.
	// Returns null for an attack with no shape.
	export function getAreaAttackSize(tmpshape, tmptier, tmpendurance, tmpdice) {
		var tmpend = parseInt(tmpendurance) || 0;
		var tmptierkey = tmptier || "normal";

		if (tmpshape == "gaze") {
			return { shape: tmpshape, text: "effects all who are gazed on by the creature" };
		}
		if (tmpshape == "voice") {
			return { shape: tmpshape, text: "effects all who hear the creature's voice" };
		}

		var tmplimits = SHAPE_LIMITS[tmpshape];
		if (!tmplimits) { return null; }
		var tmpmax = tmplimits[tmptierkey];

		if (tmpshape == "cloud") {
			var tmpwidth = divideWithMin(tmpend, 10);
			if (tmpwidth > tmpmax) { tmpwidth = tmpmax; }
			var tmplength = parseInt(tmpwidth * 2) || 0;
			if (tmplength > 100) { tmplength = 100; }
			return {
				shape: tmpshape, length: tmplength, width: tmpwidth,
				text: `releases an oval cloud ${tmplength}' long, and ${tmpwidth}' wide (and deep)`
			};
		}

		if (tmpshape == "bolt") {
			var tmprange = divideWithMinAndMax(tmpend, 10, tmpmax);
			return { shape: tmpshape, range: tmprange, text: `fires a bolt that travels up to ${tmprange}'` };
		}

		if (tmpshape == "cone") {
			var tmplen = divideWithMinAndMax(tmpend, 10, tmpmax);
			var tmpdiameter = divideWithMin(tmplen, 4);
			var tmpareas = parseInt(tmpdice) || 0;
			return {
				shape: tmpshape, range: tmplen, diameter: tmpdiameter, areas: tmpareas,
				text: `emits a cone that extends outward up to ${tmplen}' with a diameter of ${tmpdiameter}'`
				      + `, affecting ${tmpareas} body areas of anyone caught in it`
			};
		}

		// glob
		var tmpthrow = divideWithMin(tmpend, 20);
		tmpthrow = parseInt(tmpthrow * 3) || 0;
		if (tmpthrow > tmpmax) { tmpthrow = tmpmax; }
		return { shape: tmpshape, range: tmpthrow, text: `shoots a glob up to ${tmpthrow}'` };
	}

//==================================================================================================================
// @MARKER MODIFIERS
//==================================================================================================================

	// This is the function which gathers every modifier to a creature's attack roll, each with
	// the label the chat card shows, in the manner of getToHitModifiers for a weapon.
	//
	// Melee takes the Strength modifier, missile the Agility one, and each its own manual
	// adjustment. A creature has no weapon to contribute a modifier and no proficiency to lack.
	//
	// Note this does NOT reproduce his arithmetic literally. His creature path adds
	// combat_mod_missile -- which is already the Agility modifier plus the others -- and then
	// adds the "other" modifier again, and its `||0` precedence wipes the running total whenever
	// a field is blank. Both are recorded in docs/UPSTREAM-ISSUES.md item 11; this follows
	// handlePhysicalAttacks, which sums each modifier once and separately, as evidently intended.
	export function getCreatureToHitModifiers(tmpinput) {
		var tmpattacker = tmpinput.attacker ?? {};
		var tmplist = [];

		if (tmpinput.mods == "missile") {
			var tmpagl = parseInt(tmpattacker.missileAttack) || 0;
			if (tmpagl) { tmplist.push({ label: "AGL", value: tmpagl }); }
			var tmpmissilemisc = parseInt(tmpattacker.missileMisc) || 0;
			if (tmpmissilemisc) { tmplist.push({ label: "Missile Other", value: tmpmissilemisc }); }
		} else {
			var tmpstr = parseInt(tmpattacker.meleeAttack) || 0;
			if (tmpstr) { tmplist.push({ label: "STR", value: tmpstr }); }
			var tmpmeleemisc = parseInt(tmpattacker.meleeMisc) || 0;
			if (tmpmeleemisc) { tmplist.push({ label: "Melee Other", value: tmpmeleemisc }); }
		}

		if (tmpinput.target) {
			var tmpdef = parseInt(tmpinput.target.defensiveAdjust) || 0;
			if (tmpdef) { tmplist.push({ label: "Target's Defence", value: tmpdef }); }
		}

		var tmpsituational = parseInt(tmpinput.situational) || 0;
		if (tmpsituational) { tmplist.push({ label: "Situational", value: tmpsituational }); }

		var tmptotal = 0;
		for (const tmpmod of tmplist) { tmptotal = tmptotal + tmpmod.value; }
		return { list: tmplist, total: tmptotal };
	}

	// This is the function which totals the flat additions to a creature's damage.
	// From his damage block (sheet-worker.js:179920-179930): the standing damage modifier plus
	// any situational one. A creature gets no Strength damage bonus on top of its attack's own
	// dice -- the dice on the stat block are the whole of it.
	export function getCreatureDamageMods(tmpinput) {
		var tmplist = [];
		var tmpmisc = parseInt(tmpinput.damageMisc) || 0;
		if (tmpmisc) { tmplist.push({ label: "Damage Other", value: tmpmisc }); }
		var tmpsituational = parseInt(tmpinput.situational) || 0;
		if (tmpsituational) { tmplist.push({ label: "Situational", value: tmpsituational }); }

		var tmptotal = 0;
		for (const tmpmod of tmplist) { tmptotal = tmptotal + tmpmod.value; }
		return { list: tmplist, total: tmptotal };
	}

	// This is the function which picks out the rider effects that a given result sets off.
	//
	// A trigger of "Auto" always fires. "If hit" needs the attack to have landed. Everything
	// else names a save or a resistance that has to fail, which the Game Master rolls -- those
	// are reported as pending rather than decided here, because the target's own sheet owns
	// those rolls. "If 10 damage" is decided by the damage actually done, as his code does when
	// it annotates the trigger with the total.
	export function getTriggeredEffects(tmpeffects, tmpresult) {
		var tmpout = [];
		for (const tmpeffect of tmpeffects ?? []) {
			var tmptrigger = String(tmpeffect.trigger ?? "");
			var tmpstate = "pending";

			if (tmptrigger == "Auto") { tmpstate = "fires"; }
			else if (tmptrigger == "If hit") { tmpstate = tmpresult.isHit ? "fires" : "no"; }
			else if (tmptrigger == "If natural critical") {
				tmpstate = tmpresult.isCalledShot ? "fires" : "no";
			}
			else if (tmptrigger == "If 10 damage") {
				tmpstate = ((parseInt(tmpresult.damageTotal) || 0) >= 10) ? "fires" : "no";
			}
			else if (!tmpresult.isHit) { tmpstate = "no"; }   // a save only matters once it lands

			tmpout.push({ ...tmpeffect, state: tmpstate });
		}
		return tmpout;
	}

// @MARKER ADD NEW creature combat rule functions HERE
// @END (CODE)
