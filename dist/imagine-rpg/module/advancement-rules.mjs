// @START (CODE)
// @MARKER ADVANCEMENT RULES
//==================================================================================================================
// Experience, goals and titles, with no Foundry dependency, so they can be tested outside it.
// The tables themselves are generated into advancement-tables.mjs by
// tools/extract/extract_advancement_tables.py; nothing here transcribes a number of his.
//
// HOW HIS LADDER WORKS. Experience buys GOALS, and three goals make a TITLE (his getTitleByGoal:
// title = goal/3 + 1). A goal advance is the small step -- a chance at an attribute, and a handful
// of skill points. A title advance is the large one -- new class skills, Endurance, attack charts.
// Below title 1 sit three negative goals, his Zero Title: Petitioner, Student, Apprentice.
//
// THE ORDER HIS SHEET IMPOSES, which this follows:
//     1. Experience is added, and REFUSED outright if a level-up is already pending
//        (roll_add_exp, sheet-worker.js:8239). Nothing may be banked on top of unfinished business.
//     2. It is capped by the character's CURRENT title (getExpCapByExistingTitle), so nobody banks
//        more than about a title and a half ahead without levelling.
//     3. Goals are taken one at a time. Each rolls for an attribute and spends skill points.
//     4. Where a goal crosses a title boundary, the TITLE is committed first: his handleGoalCommit
//        refuses a goal commit while a title is pending ("Commit title before committing goal").
//
// WHAT IS NOT HERE. Valuing a creature and splitting its experience among a party -- his
// calcCreatureExp and handleSplitExp. The user's call, 2026-09-19: players enter the experience
// they were awarded, so there is nothing to compute.
//==================================================================================================================

import { GOAL_EXP, TITLE_EXP, EXP_CAP_BY_TITLE, SKILL_POINTS_BY_CLASS } from "./advancement-tables.mjs";

	// The attribute keys in his order, which is the order every attribute list in this port uses.
	const ATTRIBUTE_KEYS = ["str", "agl", "vit", "int", "wis", "knw", "app", "chm", "soc", "aur", "pty", "wil"];

	// The goal at which Arch Mortal begins -- his own number, checked in two places
	// (roll_add_exp at 8259 and handleLevelGoal at 65657) and both times written as 30.
	export const ARCH_MORTAL_GOAL = 30;

// @MARKER THE LADDER

	// This is the function which says which goal an amount of experience reaches: the highest
	// goal whose starting experience it has met. His getNewGoal, read off the generated table.
	export function getGoalForExp(tmpexp) {
		var tmpamount = parseInt(tmpexp) || 0;
		var tmpbest = null;
		for (const tmpkey of Object.keys(GOAL_EXP)) {
			var tmpgoal = parseInt(tmpkey);
			if (tmpamount < GOAL_EXP[tmpkey]) { continue; }
			if (tmpbest === null || tmpgoal > tmpbest) { tmpbest = tmpgoal; }
		}
		// Below his lowest rung there is nowhere further down to go; he answers -3 there.
		return tmpbest === null ? -3 : tmpbest;
	}

	// This is the function which says which title an amount of experience reaches. Read from his
	// own title table rather than worked out from the goal, so the two can be cross-checked.
	export function getTitleForExp(tmpexp) {
		var tmpamount = parseInt(tmpexp) || 0;
		var tmpbest = 0;
		for (const tmpkey of Object.keys(TITLE_EXP)) {
			var tmptitle = parseInt(tmpkey);
			if (tmpamount < TITLE_EXP[tmpkey]) { continue; }
			if (tmptitle > tmpbest) { tmpbest = tmptitle; }
		}
		return tmpbest;
	}

	// This is the function which says what a goal begins at. A goal his table does not hold --
	// anything past his last rung -- answers null rather than 0, which would read as "free".
	export function getExpForGoal(tmpgoal) {
		var tmpkey = "" + (parseInt(tmpgoal) || 0);
		return Object.prototype.hasOwnProperty.call(GOAL_EXP, tmpkey) ? GOAL_EXP[tmpkey] : null;
	}

	// This is the function which says what the next goal costs, for the "next goal" figure his
	// sheet shows. Zero at the top of his ladder, as his getNextGoalExp answers there -- the
	// deity rungs above it are commented out throughout his code.
	export function getNextGoalExp(tmpexp) {
		var tmpnext = getExpForGoal(getGoalForExp(tmpexp) + 1);
		return tmpnext === null ? 0 : tmpnext;
	}

	// This is the function which turns a goal into its title, his getTitleByGoal. Three goals to
	// a title, and everything below goal 0 is Zero Title.
	export function getTitleByGoal(tmpgoal) {
		var tmpat = parseInt(tmpgoal) || 0;
		return tmpat < 0 ? 0 : Math.floor(tmpat / 3) + 1;
	}

	// The first and last goal of a title, his getLowGoalByTitle and getHighGoalByTitle. Zero
	// Title runs -3 to -1.
	export function getLowGoalByTitle(tmptitle) {
		var tmpat = parseInt(tmptitle) || 0;
		return tmpat < 1 ? -3 : (tmpat * 3) - 3;
	}

	export function getHighGoalByTitle(tmptitle) {
		var tmpat = parseInt(tmptitle) || 0;
		return tmpat < 1 ? -1 : (tmpat * 3) - 1;
	}

	// This is the function which says how much experience a character of this title may hold
	// before they must level up, his getExpCapByExistingTitle. Zero means no cap.
	export function getExpCap(tmptitle) {
		var tmpkey = "" + (parseInt(tmptitle) || 0);
		return Object.prototype.hasOwnProperty.call(EXP_CAP_BY_TITLE, tmpkey) ? EXP_CAP_BY_TITLE[tmpkey] : 0;
	}

// @MARKER ADDING EXPERIENCE

	// This is the function which works out what adding experience does, ported from his
	// roll_add_exp handler (sheet-worker.js:8239). It decides and reports; it changes nothing.
	//
	// Returns { accepted, reason, exp, added, title, goal, titlesToRaise, goalsToRaise,
	//           titleToLevel, goalToLevel, nextGoalExp, cappedBy }.
	//
	// His three refusals, in his order:
	//   a level-up is already pending   "Level up character before adding new EXP"
	//   nothing to add                  zero or negative changes nothing
	//   the Arch Mortal line            crossing into goal 30 unqualified adds NOTHING at all
	//
	// And his one silent adjustment: experience above the title's cap is trimmed to it, and the
	// amount actually added is reported rather than the amount offered.
	export function planExperienceGain(tmpstate, tmpadded) {
		var tmpexp = parseInt(tmpstate?.exp) || 0;
		var tmptitle = parseInt(tmpstate?.title) || 0;
		var tmpgoal = parseInt(tmpstate?.goal) || 0;
		var tmpamount = parseInt(tmpadded) || 0;

		var tmprefused = (tmpreason) => ({
			accepted: false, reason: tmpreason, exp: tmpexp, added: 0,
			title: tmptitle, goal: tmpgoal, titlesToRaise: parseInt(tmpstate?.titlesToRaise) || 0,
			goalsToRaise: parseInt(tmpstate?.goalsToRaise) || 0,
			titleToLevel: 0, goalToLevel: 0, nextGoalExp: getNextGoalExp(tmpexp), cappedBy: 0
		});

		if ((parseInt(tmpstate?.titlesToRaise) || 0) != 0 || (parseInt(tmpstate?.goalsToRaise) || 0) != 0) {
			return tmprefused("There is a level-up waiting. Finish it before adding more experience.");
		}
		if (tmpamount <= 0) {
			return tmprefused("No experience to add.");
		}

		// The cap is read against the title the character HOLDS, not the one they are reaching.
		//
		// It trims what is being ADDED and never touches what is already there. His sheet writes
		// the cap straight over the total, which takes experience away from a character already
		// above it -- and one can be, since a Game Master may set a title back by hand. Here a
		// character at or above the cap simply gains nothing, and is told so.
		var tmpcap = getExpCap(tmptitle);
		var tmptotal = tmpexp + tmpamount;
		var tmpcappedby = 0;
		if (tmpcap && tmptotal > tmpcap) {
			tmpcappedby = tmptotal - Math.max(tmpcap, tmpexp);
			tmptotal = Math.max(tmpcap, tmpexp);
		}
		if (tmptotal <= tmpexp) {
			return tmprefused(`Title ${tmptitle} may hold ${tmpcap} experience, and this character `
				+ `already has ${tmpexp}. Level up before adding more.`);
		}

		var tmpnewtitle = getTitleForExp(tmptotal);
		var tmpnewgoal = getGoalForExp(tmptotal);
		var tmpgoalsraised = tmpnewgoal - tmpgoal;
		var tmptitlesraised = tmpnewtitle - tmptitle;

		// His Arch Mortal gate. Note WHERE it sits: the experience is not added at all, rather
		// than added and the levelling blocked. A character who cannot pass the line does not
		// creep up to it either.
		//
		// IT GUARDS THE CROSSING, not the standing. His sheet stores the qualification as a flag a
		// player refreshes, so once it reads Yes it stays Yes. This port DERIVES it every render,
		// which is better -- it cannot go stale -- but it also means it can flip back to No when a
		// Will Force is drained or a power is lost. Written his way, that would refuse all further
		// experience to an Arch Mortal of 12th title who caught a stat drain. So the gate only
		// looks at characters who are below the line and about to cross it.
		if (tmpgoalsraised > 0 && tmpgoal < ARCH_MORTAL_GOAL && tmpnewgoal >= ARCH_MORTAL_GOAL
		 && !tmpstate?.archQualified) {
			return tmprefused("Blocked from levelling past 10th title. See the Arch Mortal qualifications.");
		}

		return {
			accepted: true,
			reason: tmpcappedby ? `${tmpcappedby} experience was over the cap for title ${tmptitle} and was not added.` : "",
			exp: tmptotal,
			added: tmptotal - tmpexp,
			title: tmpnewtitle,
			goal: tmpnewgoal,
			// Queued, not applied: the character stays at the title and goal they have until each
			// step is walked, which is what his titles_to_raise and goals_to_raise are for.
			titlesToRaise: Math.max(0, tmptitlesraised),
			goalsToRaise: Math.max(0, tmpgoalsraised),
			titleToLevel: tmptitlesraised > 0 ? tmptitle + 1 : 0,
			goalToLevel: tmpgoalsraised > 0 ? tmpgoal + 1 : 0,
			nextGoalExp: getNextGoalExp(tmptotal),
			cappedBy: tmpcappedby
		};
	}

// @MARKER A GOAL ADVANCE

	// This is the function which decides what a goal advance offers for an attribute, ported
	// from his handleLevelGoal (sheet-worker.js:65652). Four shapes, and his own order of them:
	//
	//   mode "choose"   a guaranteed +1 to any attribute the player picks. His minimum-increase
	//                   floor: at goal 12 with no increases yet, goal 27 with one or fewer, goal
	//                   42 with two or fewer. Written as chance 100 on his sheet.
	//   mode "two"      the class's two goal attributes, each rolled separately
	//   mode "one"      one of them is already at its maximum, so the other rolls alone
	//   mode "any"      both are at maximum -- OR the goal is past 29, where he stops caring
	//                   about the class's pair and offers any attribute
	//
	// The chances are his: 5 each for a pair below goal 31 and 10 above; 10 for a single below
	// goal 31 and 20 above. A goal past 29 always reads as the single/any chance, never the pair's.
	export function planGoalAdvance(tmpplan) {
		var tmpgoal = parseInt(tmpplan?.goalToLevel) || 0;
		var tmpattrs = (tmpplan?.goalAttributes ?? []).filter(tmpkey => tmpkey);
		var tmpatmax = tmpplan?.atMax ?? {};
		var tmpincreases = parseInt(tmpplan?.totalIncreases) || 0;

		// His floor on attribute increases, three fixed goals with a different allowance each.
		if ((tmpgoal == 12 && tmpincreases == 0)
		 || (tmpgoal == 27 && tmpincreases <= 1)
		 || (tmpgoal == 42 && tmpincreases <= 2)) {
			return { mode: "choose", goal: tmpgoal, rolls: [{ key: "", chance: 100, anyAttribute: true }] };
		}

		var tmpsinglechance = tmpgoal < 31 ? 10 : 20;
		var tmppairchance   = tmpgoal < 31 ? 5 : 10;

		// Past goal 29 the class's own pair stops mattering: one roll, any attribute.
		if (tmpgoal > 29) {
			return { mode: "any", goal: tmpgoal, rolls: [{ key: "", chance: tmpsinglechance, anyAttribute: true }] };
		}

		var tmpopen = tmpattrs.filter(tmpkey => !tmpatmax[tmpkey]);
		if (tmpopen.length == 0) {
			return { mode: "any", goal: tmpgoal, rolls: [{ key: "", chance: tmpsinglechance, anyAttribute: true }] };
		}
		if (tmpopen.length == 1) {
			return { mode: "one", goal: tmpgoal, rolls: [{ key: tmpopen[0], chance: tmpsinglechance, anyAttribute: false }] };
		}
		return {
			mode: "two", goal: tmpgoal,
			rolls: tmpopen.map(tmpkey => ({ key: tmpkey, chance: tmppairchance, anyAttribute: false }))
		};
	}

	// This is the function which reads the d100s against a plan. A roll at or below the chance
	// raises that attribute by 1, which is the only size of increase his sheet ever gives.
	//
	// A "choose" plan is not rolled at all -- it is chance 100 -- so it comes through here with
	// whatever the player picked and always succeeds.
	export function resolveGoalAdvance(tmpplan, tmprolls, tmppicked) {
		var tmpout = [];
		(tmpplan?.rolls ?? []).forEach((tmproll, tmpindex) => {
			var tmpkey = tmproll.anyAttribute ? ((tmppicked ?? [])[tmpindex] ?? "") : tmproll.key;
			var tmpnatural = parseInt((tmprolls ?? [])[tmpindex]) || 0;
			var tmpsucceeded = tmpnatural > 0 && tmpnatural <= tmproll.chance;
			tmpout.push({
				key: tmpkey, chance: tmproll.chance, roll: tmpnatural,
				increased: tmpsucceeded && !!tmpkey
			});
		});
		return tmpout;
	}

	// This is the function which says how many skill points a goal advance gives, from his
	// getSkillPointsByClass. Each point is +1% on the ability of a class skill the character has
	// already acquired (commitSingleSkillPointAdds, sheet-worker.js:94756).
	//
	// A class path document is looked up by its BASE class, because his table is keyed by the
	// class his sheet knows -- "Elementalist", never "Elementalist(Call of Death)".
	export function getSkillPointsForGoal(tmpclasssystem, tmpname) {
		if (tmpclasssystem?.nonClassed) { return 0; }
		var tmpbase = tmpclasssystem?.baseClass || tmpname || "";
		if (Object.prototype.hasOwnProperty.call(SKILL_POINTS_BY_CLASS, tmpbase)) {
			return SKILL_POINTS_BY_CLASS[tmpbase];
		}
		if (tmpname && Object.prototype.hasOwnProperty.call(SKILL_POINTS_BY_CLASS, tmpname)) {
			return SKILL_POINTS_BY_CLASS[tmpname];
		}
		return 0;
	}

	// This is the function which checks a spend of skill points, his handleAddSkillPoints
	// (sheet-worker.js:65866): a positive number, no more than remain, and on a skill the
	// character has actually acquired. He caps nothing per skill, and nor does this.
	export function checkSkillPointSpend(tmppoints, tmpremaining, tmpskill, tmptitle) {
		var tmpamount = parseInt(tmppoints) || 0;
		if (tmpamount < 1) { return { allowed: false, reason: "A positive number of points is needed." }; }
		if (tmpamount > (parseInt(tmpremaining) || 0)) {
			return { allowed: false, reason: `Only ${parseInt(tmpremaining) || 0} points remain.` };
		}
		if (!tmpskill) { return { allowed: false, reason: "No skill is selected." }; }
		// His skill-point screens only ever show titles already reached (setSkillPointNavigation
		// walks up to the title of goal - 1), so a skill above the character's title is not offered.
		if ((parseInt(tmpskill.acquiredAtTitle) || 0) > (parseInt(tmptitle) || 0)) {
			return { allowed: false, reason: `${tmpskill.name} has not been acquired yet.` };
		}
		return { allowed: true, reason: "" };
	}

// @MARKER A TITLE ADVANCE

	// This is the function which rolls the Endurance a title advance gives, ported from his
	// setNewCharacteristics (sheet-worker.js:27479). The race's title formula, read five ways:
	//
	//     titles 1-10    rolled
	//     titles 11-12   its MAXIMUM instead of a roll -- an Arch Mortal stops being unlucky
	//     title 13       maximum x2
	//     title 14       maximum x3
	//     title 15       maximum x4
	//
	// A half race carries both formulas as "first|second"; his code takes each, adds them and
	// halves the total rounding up (his divideWithMinRoundUp, minimum 1).
	//
	// NOTE a slip of his in the 11-12 branch: it adds both halves, then overwrites the sum with
	// the FIRST half alone before halving, so a half race's 11th and 12th titles are worked out
	// from one parent only. Every other branch adds both. It is followed here -- the sheet is the
	// source of truth -- and reported as an upstream issue rather than quietly corrected.
	export function getTitleEndurance(tmpformula, tmptitle, tmproll) {
		var tmptext = "" + (tmpformula ?? "");
		var tmpat = parseInt(tmptitle) || 0;
		if (!tmptext.trim()) { return 0; }

		var tmphalves = tmptext.split("|");
		var tmpishalf = tmphalves.length > 1;

		if (tmpat < 11) {
			if (!tmpishalf) { return rollDiceString(tmptext, tmproll); }
			return divideWithMinRoundUp(rollDiceString(tmphalves[0], tmproll)
			                          + rollDiceString(tmphalves[1], tmproll), 2);
		}

		var tmpmultiplier = tmpat == 13 ? 2 : (tmpat == 14 ? 3 : (tmpat >= 15 ? 4 : 1));
		if (!tmpishalf) { return maxOfDiceString(tmptext) * tmpmultiplier; }

		if (tmpat < 13) {
			// His slip, reproduced: the sum is computed and then thrown away for the first half.
			return divideWithMinRoundUp(maxOfDiceString(tmphalves[0]), 2);
		}
		return divideWithMinRoundUp(maxOfDiceString(tmphalves[0]) + maxOfDiceString(tmphalves[1]), 2)
		       * tmpmultiplier;
	}

	// This is the function which reads one of his Endurance dice strings -- "1d4+1", "2d6", "1d3".
	// Anything it cannot read rolls as 0, the same answer the skill dice reader gives.
	export function rollDiceString(tmpexpression, tmproll) {
		var tmpflat = flatFormula(tmpexpression);
		if (tmpflat !== null) { return tmpflat; }
		var tmpmatch = ("" + (tmpexpression ?? "")).trim().toLowerCase().match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/);
		if (!tmpmatch) { return 0; }
		var tmptotal = 0;
		for (var i = 0; i < parseInt(tmpmatch[1]); i++) { tmptotal = tmptotal + tmproll(parseInt(tmpmatch[2])); }
		return tmptotal + (tmpmatch[3] ? parseInt(tmpmatch[3].replace(/\s+/g, "")) : 0);
	}

	// The same string read for its highest possible result, his getMaxValueFromDiceString.
	export function maxOfDiceString(tmpexpression) {
		var tmpflat = flatFormula(tmpexpression);
		if (tmpflat !== null) { return tmpflat; }
		var tmpmatch = ("" + (tmpexpression ?? "")).trim().toLowerCase().match(/^(\d+)d(\d+)\s*([+-]\s*\d+)?$/);
		if (!tmpmatch) { return 0; }
		return (parseInt(tmpmatch[1]) * parseInt(tmpmatch[2]))
		     + (tmpmatch[3] ? parseInt(tmpmatch[3].replace(/\s+/g, "")) : 0);
	}

	// This is the function which reads a formula that is a plain number rather than dice. One race
	// writes its title Endurance that way -- Elf(Silver)'s is "1" -- and read as dice it would gain
	// that race nothing at any title, for ever. Answers null when it is not a bare number, so the
	// dice readers can go on to try it as dice.
	function flatFormula(tmpexpression) {
		var tmptext = ("" + (tmpexpression ?? "")).trim();
		return /^-?\d+$/.test(tmptext) ? parseInt(tmptext) : null;
	}

	// His divideWithMinRoundUp: round up, and never answer less than 1.
	export function divideWithMinRoundUp(tmpdividend, tmpdivisor) {
		var tmpresult = Math.ceil((parseInt(tmpdividend) || 0) / (parseInt(tmpdivisor) || 1));
		return tmpresult < 1 ? 1 : tmpresult;
	}

// @MARKER ARCH MORTAL

	// The invulnerability his sheet grants at 11th, 13th and 15th title, from
	// setArchMortalInvulnerability (sheet-worker.js:27574). Each REPLACES the one before rather
	// than stacking, which is why the name changes at 15 -- his own text, word for word.
	export const ARCH_MORTAL_INVULNERABILITY = {
		11: "Special Invulnerability (Constant: Normal weapons do 1/2. Blessed and +1 do full)",
		13: "Special Invulnerability (Constant: Normal weapons do 1/4. Blessed do 1/2 and +1 do full.)",
		15: "Invulnerability (Constant: Normal weapons do none. Blessed and +1/+2 do 1/2. +3 do full.)"
	};

	// His Sense Supernatural, which an Arch Mortal is simply given and which improves with every
	// title after (setArchMortalSenseSupernatural, 27598). The figure is the skill's ability, and
	// 99 is his own ceiling for it -- not 100.
	export const ARCH_MORTAL_SENSE_SUPERNATURAL = { 11: 20, 12: 40, 13: 60, 14: 80, 15: 99 };

	// This is the function which lists everything reaching a title gives an Arch Mortal, so the
	// level-up window can show it before it is applied and the actor can apply it afterwards.
	//
	// At 11th: every attribute maximum becomes 27, ageing stops, Sense Supernatural arrives, and
	// the first invulnerability. At 12th through 15th: Sense Supernatural improves, and at 13 and
	// 15 the invulnerability is replaced by a stronger one.
	export function getArchMortalGains(tmptitle) {
		var tmpat = parseInt(tmptitle) || 0;
		if (tmpat < 11) { return null; }

		return {
			title: tmpat,
			// His setArchMortalAttributesMax writes 27 into every *_max at 11th, but the pair he
			// confirmed on 2026-09-16 is 25 for ordinary increases and 27 for magical ones
			// (UPSTREAM-ISSUES item 16, and getAttributeMax / getMagicalAttributeMax here). What
			// actually happens at 11th is that the RACIAL limits are discarded for those two, so
			// both figures are reported rather than his single one.
			attributeMax: tmpat == 11 ? 25 : 0,
			magicalAttributeMax: tmpat == 11 ? 27 : 0,
			immortal: tmpat == 11,
			senseSupernatural: ARCH_MORTAL_SENSE_SUPERNATURAL[tmpat] ?? 0,
			invulnerability: ARCH_MORTAL_INVULNERABILITY[tmpat] ?? "",
			// Every earlier wording, so applying a new one can replace whichever is held.
			replaces: Object.keys(ARCH_MORTAL_INVULNERABILITY)
				.filter(tmpkey => parseInt(tmpkey) < tmpat)
				.map(tmpkey => ARCH_MORTAL_INVULNERABILITY[tmpkey])
		};
	}

	// This is the function which works out what an attribute requirement means for this
	// character, from setArchmortalAttributeQualifications (sheet-worker.js:122429). Three forms
	// in his data, and a fourth state for no requirement at all:
	//     ""      none -- answers null
	//     "RM"    the character's racial maximum
	//     n > 0   that rating
	//     n < 0   the racial maximum plus n, floored at 0
	export function getArchMortalAttributeNeeded(tmprequirement, tmpmax) {
		var tmptext = ("" + (tmprequirement ?? "")).trim();
		if (!tmptext) { return null; }
		if (tmptext.toUpperCase() == "RM") { return parseInt(tmpmax) || 0; }

		var tmpvalue = parseFloat(tmptext);
		if (isNaN(tmpvalue)) { return null; }
		if (tmpvalue > 0) { return tmpvalue; }
		return Math.max(0, (parseInt(tmpmax) || 0) + tmpvalue);
	}

	// This is the function which says whether a character may pass 10th title, his qualification
	// screen in one place (setArchmortalAttributeQualifications through
	// setArchmortalSpecialQualifications, sheet-worker.js:122429-122965).
	//
	// Four parts, all of which must pass: every attribute requirement the class names, all five
	// core skills at their chances, at least one power held, and the class's special requirement
	// -- which is a sentence only a Game Master can judge, so it is asked as a flag and treated
	// as met where the class names none, exactly as his sheet does.
	export function checkArchMortalQualification(tmpclasssystem, tmpcharacter) {
		var tmprules = tmpclasssystem?.archMortal;
		var tmprows = [];
		if (!tmprules) { return { qualified: false, rows: [], reason: "This class has no Arch Mortal qualifications." }; }

		for (const tmpkey of ATTRIBUTE_KEYS) {
			var tmpneeded = getArchMortalAttributeNeeded(tmprules.attributes?.[tmpkey],
			                                             tmpcharacter?.attributeMax?.[tmpkey]);
			if (tmpneeded === null) { continue; }
			var tmphas = parseInt(tmpcharacter?.attributes?.[tmpkey]) || 0;
			tmprows.push({
				kind: "attribute", name: tmpkey.toUpperCase(),
				needed: tmpneeded, has: tmphas, met: tmphas >= tmpneeded
			});
		}

		for (const tmpskill of tmprules.skills ?? []) {
			var tmpchance = parseInt(tmpcharacter?.skillChances?.[tmpskill.name]) || 0;
			tmprows.push({
				kind: "skill", name: tmpskill.name,
				needed: parseInt(tmpskill.chance) || 0, has: tmpchance,
				met: tmpchance >= (parseInt(tmpskill.chance) || 0)
			});
		}

		tmprows.push({
			kind: "power", name: "Any power or ability", needed: 1,
			has: parseInt(tmpcharacter?.powerCount) || 0,
			met: (parseInt(tmpcharacter?.powerCount) || 0) > 0
		});

		if (tmprules.special) {
			tmprows.push({
				kind: "special", name: tmprules.special, needed: 1,
				has: tmpcharacter?.specialMet ? 1 : 0, met: !!tmpcharacter?.specialMet
			});
		}

		var tmpfailed = tmprows.filter(tmprow => !tmprow.met);
		return {
			qualified: tmpfailed.length == 0,
			rows: tmprows,
			reason: tmpfailed.length ? `${tmpfailed.length} qualification(s) not met.` : ""
		};
	}

// @MARKER ADD NEW advancement rules functions HERE
// @END (CODE)
