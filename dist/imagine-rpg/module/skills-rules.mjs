// @START (CODE)
// @MARKER SKILL RULES
//==================================================================================================================
// The skill arithmetic, as plain functions.
//
// Nothing in this file touches Foundry, in the same shape as combat/combat-rules.mjs: every
// function takes values and returns values, dice results included, which the caller rolls and
// passes in. Line numbers against docs/reference/sheet-worker.js are given with each rule.
//
// Two things live here that the chance formula in the character model does not cover: what
// happens when the same skill is held more than once, and the slot economy the Player's Guide
// calls "slot tricks" -- trading skill slots between categories, or giving one up for a bonus.
//==================================================================================================================


// @MARKER DUPLICATE SKILLS

	// The four outcomes of a percentile skill roll, best first. His sheet prints the same four
	// words; the +/-20% margin that separates a critical from an ordinary result is the Player's
	// Guide's (p.94), not his, since his skill roll template only reports the number.
	export const SKILL_OUTCOMES = ["Critical success", "Succeeded", "Failed", "Critical failure"];

	// This is the function which reads one percentile roll against one chance.
	//
	// Rolled at or under the chance succeeds. Beating it by more than 20 is a critical success;
	// missing it by more than 20 is a critical failure. The margin is reported because the caller
	// needs it to choose between two rolls of the same kind, and because the card prints it.
	export function resolveSkillOutcome(tmpchance, tmproll) {
		var tmpnumchance = parseInt(tmpchance) || 0;
		var tmpnumroll = parseInt(tmproll) || 0;
		var tmpmargin = tmpnumchance - tmpnumroll;

		var tmpoutcome = "";
		if (tmpnumroll <= tmpnumchance) {
			tmpoutcome = (tmpmargin > 20) ? "Critical success" : "Succeeded";
		} else {
			tmpoutcome = (tmpmargin < -20) ? "Critical failure" : "Failed";
		}

		return { chance: tmpnumchance, roll: tmpnumroll, margin: tmpmargin, outcome: tmpoutcome };
	}

	// This is the function which picks the best of several rolls of the same skill.
	//
	// Player's Guide, "Duplicate Class and Racial Skills": a character may hold the same skill both
	// racially and as a class skill, and then "a skill roll can be made for each multiple of the
	// same skill, and the best roll can be chosen". His own worked example is a Civilized Human
	// Rogue with Move Unseen both ways -- one roll failed and one made is a success, and a critical
	// alongside an ordinary success may be taken as the critical.
	//
	// THE TWO ROLLS ARE NOT AGAINST THE SAME NUMBER. Each instance carries its own chance (the
	// racial one may have a racial bonus, the class one its own starting bonus and points), so each
	// is resolved against its own and only then compared -- which is why this takes resolved
	// results rather than one chance and a list of dice.
	//
	// Ranking is by outcome first, in SKILL_OUTCOMES order. Where two rolls share an outcome the
	// larger margin is named the chosen one; that tie-break is presentation only, since two
	// ordinary successes do the same thing, and the book leaves the choice to the player anyway.
	// Every roll is returned, not just the winner, so the card can show what was given up.
	export function pickBestSkillRoll(tmpresults) {
		var tmplist = Array.isArray(tmpresults) ? tmpresults : [];
		if (!tmplist.length) { return { rolls: [], best: null, bestIndex: -1 }; }

		var tmpbestindex = 0;
		for (var i = 1; i < tmplist.length; i++) {
			var tmprank = SKILL_OUTCOMES.indexOf(tmplist[i].outcome);
			var tmpbestrank = SKILL_OUTCOMES.indexOf(tmplist[tmpbestindex].outcome);
			if (tmprank < tmpbestrank) { tmpbestindex = i; }
			else if (tmprank == tmpbestrank && tmplist[i].margin > tmplist[tmpbestindex].margin) { tmpbestindex = i; }
		}

		return { rolls: tmplist, best: tmplist[tmpbestindex], bestIndex: tmpbestindex };
	}


// @MARKER SKILL SLOT TRICKS

	// What one slot may be traded for, from his four conversion functions. Each is one move; a
	// character wanting two social slots out of two racial ones makes the same move twice.
	//
	//                                     from        to          cost  gain   sheet-worker.js
	//                                     ----------  ----------  ----  ----   ---------------
	export const SLOT_TRANSFERS = {
		racialToClass:   { from: "racial", to: "class",  cost: 1, gain: 1, source: 52649 },
		racialToSocial:  { from: "racial", to: "social", cost: 1, gain: 2, source: 52336 },
		socialToRacial:  { from: "social", to: "racial", cost: 2, gain: 1, source: 56119 },
		socialToClass:   { from: "social", to: "class",  cost: 2, gain: 1, source: 56433 }
	};

	// A slot may also be given up for nothing but a bonus to a skill already held: 2d4%, added to
	// that skill's modifier (sacrificeRacialSkillSlot, sheet-worker.js:52310; the social one at
	// 55824 rolls the same 2d4). His code lets the result stay negative where the skill already
	// carried a penalty larger than the bonus, so the bonus is added rather than floored.
	//
	// ONLY RACIAL AND SOCIAL SLOTS CAN BE GIVEN UP. There is no class equivalent in his sheet, and
	// no class conversion out of class either -- class slots are what every other slot is traded
	// FOR, never traded away.
	export const SLOT_SACRIFICE_DICE = "2d4";
	export const SACRIFICEABLE_SLOTS = ["racial", "social"];

	// This is the function which works out how many slots each category actually has, after the
	// trades a character has made. The base figures come from the Knowledge table; everything here
	// is the arithmetic of his four conversion functions and his two sacrifices, applied to them.
	//
	//   tmpbase  = { class, racial, social }, the Knowledge allowance
	//   tmpmoves = how many times each transfer was made, plus the two sacrifice counts
	//
	// Nothing is floored: a character who has traded away more than they had reads as negative,
	// which the sheet shows as over-allocated rather than silently correcting. His sheet cannot
	// reach that state because it blocks the move at the point of making it; this model records
	// the moves instead, so it can show the arithmetic that got there.
	export function getSlotAllowance(tmpbase, tmpmoves) {
		var tmpout = {
			class:  parseInt(tmpbase?.class) || 0,
			racial: parseInt(tmpbase?.racial) || 0,
			social: parseInt(tmpbase?.social) || 0
		};

		for (const tmpkey of Object.keys(SLOT_TRANSFERS)) {
			var tmptransfer = SLOT_TRANSFERS[tmpkey];
			var tmpcount = parseInt(tmpmoves?.[tmpkey]) || 0;
			if (tmpcount <= 0) { continue; }
			tmpout[tmptransfer.from] = tmpout[tmptransfer.from] - (tmptransfer.cost * tmpcount);
			tmpout[tmptransfer.to]   = tmpout[tmptransfer.to]   + (tmptransfer.gain * tmpcount);
		}

		tmpout.racial = tmpout.racial - (parseInt(tmpmoves?.racialSacrificed) || 0);
		tmpout.social = tmpout.social - (parseInt(tmpmoves?.socialSacrificed) || 0);

		return tmpout;
	}

	// This is the function which says whether one more of a given move can be made.
	//
	// His guard is that the source category must have an OPEN slot to give up -- "There are no open
	// slots to convert. Nothing done." (sheet-worker.js:7353), and the same shape for a sacrifice.
	// A slot already filled by a skill is not open, so the test is against what is left unused,
	// not against the allowance.
	//
	// His social-to-racial move carries a second guard, that racial must have an unavailable slot
	// for the new one to open into (sheet-worker.js:7607). That is his twenty-row sheet running out
	// of rows, not a rule, and there are no rows here, so it is deliberately not ported.
	export function canTransferSlot(tmpkey, tmpallowance, tmpused) {
		var tmptransfer = SLOT_TRANSFERS[tmpkey];
		if (!tmptransfer) { return { allowed: false, reason: "No such transfer." }; }

		var tmpfree = (parseInt(tmpallowance?.[tmptransfer.from]) || 0) - (parseInt(tmpused?.[tmptransfer.from]) || 0);
		if (tmpfree < tmptransfer.cost) {
			return { allowed: false, reason: `Needs ${tmptransfer.cost} unused ${tmptransfer.from} slot${tmptransfer.cost > 1 ? "s" : ""}; ${tmpfree} left.` };
		}
		return { allowed: true, reason: "" };
	}

	// This is the function which says whether a slot of a category can be given up for a bonus.
	// The same open-slot test as a transfer, plus his rule that the bonus must land on a skill the
	// character actually holds -- "Cannot select an Open Slot to receive modifiers from Sacrifice"
	// (sheet-worker.js:7244).
	export function canSacrificeSlot(tmpcategory, tmpallowance, tmpused, tmphasskill) {
		if (!SACRIFICEABLE_SLOTS.includes(tmpcategory)) {
			return { allowed: false, reason: "Only racial and social slots can be given up." };
		}
		var tmpfree = (parseInt(tmpallowance?.[tmpcategory]) || 0) - (parseInt(tmpused?.[tmpcategory]) || 0);
		if (tmpfree < 1) { return { allowed: false, reason: `No unused ${tmpcategory} slot to give up.` }; }
		if (!tmphasskill) { return { allowed: false, reason: "The bonus needs a skill to land on." }; }
		return { allowed: true, reason: "" };
	}
// @END (CODE)
