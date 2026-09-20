// @START (CODE)
// @MARKER PHYSIQUE RULES
//==================================================================================================================
// A character's height, frame and weight, with no Foundry dependency, so they can be tested outside
// it. The tables are generated into physique-tables.mjs by tools/extract/extract_physique_tables.py;
// nothing here transcribes a figure of his.
//
// THE THREE ARE NOT INDEPENDENT, and the order matters:
//
//     1. the RACE gives a height type          Human(Civilized:Village) -> "Average"
//     2. the height type gives INCHES          a d100 down that band's ladder
//     3. the RACE gives a frame type           Human(Civilized:Village) -> "Average"
//     4. frame type + (STRENGTH - AGILITY)     -> the FRAME: Wispy, Light, Medium, Heavy,
//        gives the frame                          Extra-Heavy or Tremendous
//     5. the frame and the inches give WEIGHT  a base for that height, plus a roll
//
// So weight cannot be rolled before height, and the frame cannot be worked out before the
// attributes are settled. His own sheet enforces the same order: its Apply Height/Frame button
// (roll_apply_height_frame, sheet-worker.js:6283) comes after the attribute step.
//
// The measure at step 4 is STRENGTH MINUS AGILITY, which is the Player's Guide's own rule (p.34):
// of two characters of a race, the strong slow one is the heavier-framed.
//
// WHAT IS NOT HERE. His slight-physique variants: every one of these functions answers differently
// for one, and the port has no slight-physique option (a rules call still open with the developer).
// The tables carry the slight figures beside the ordinary ones, unused, so adding the option later
// is reading a table rather than extracting again.
//==================================================================================================================

import { HEIGHT_TYPE_BY_RACE, HEIGHT_BANDS, FRAME_TYPE_BY_RACE,
         FRAME_LADDER, WEIGHT_BANDS } from "./physique-tables.mjs";

	// This is the function which rolls one of his dice strings -- "3d4", "1d6" -- with the roller
	// it is given, so a test can script every die. A band with no dice is a flat figure.
	function rollDice(tmpdice, tmproll) {
		var tmpmatch = ("" + (tmpdice ?? "")).match(/^(\d+)d(\d+)$/);
		if (!tmpmatch) { return 0; }
		var tmptotal = 0;
		for (var i = 0; i < parseInt(tmpmatch[1]); i++) { tmptotal = tmptotal + tmproll(parseInt(tmpmatch[2])); }
		return tmptotal;
	}

	// This is the function which reads a rung ladder: the first rung the roll has not reached.
	function rungFor(tmprows, tmpvalue) {
		for (const tmprow of tmprows ?? []) {
			if (tmpvalue < tmprow.under) { return tmprow; }
		}
		return (tmprows ?? [])[tmprows.length - 1] ?? null;
	}

// @MARKER HEIGHT

	// This is the function which says which height band a race belongs to, his getRaceHeightType.
	// Four races are missing from his switch and are filled from their siblings by the extractor --
	// see the note there, and UPSTREAM-ISSUES.
	export function getHeightType(tmpracename) {
		return HEIGHT_TYPE_BY_RACE[tmpracename] ?? "";
	}

	// This is the function which rolls a character's height in inches, his get<Type>Height.
	//
	// A d100 picks the rung; the rung gives a base in inches and a roll to move it. Returns the
	// inches, the feet and inches it makes, and the band's own shortest and tallest, so a sheet can
	// show what was rolled against what the race runs to.
	//
	// A HALF RACE takes the two bands' results and averages them, which is what his sheet does with
	// every other half-race figure (averageTwoFloatsRounded is for modifiers; a height is a plain
	// mean, rounded up, and his own half-race height code does the same).
	export function rollHeight(tmpracenames, tmproll) {
		var tmpnames = (Array.isArray(tmpracenames) ? tmpracenames : [tmpracenames]).filter(n => n);
		var tmpeach = tmpnames.map(tmpname => rollOneHeight(getHeightType(tmpname), tmproll))
			.filter(tmpone => tmpone);
		if (!tmpeach.length) { return null; }
		if (tmpeach.length == 1) { return tmpeach[0]; }

		var tmpinches = Math.ceil(tmpeach.reduce((tmptotal, tmpone) => tmptotal + tmpone.inches, 0) / tmpeach.length);
		return {
			type: tmpeach.map(tmpone => tmpone.type).join("|"),
			inches: tmpinches,
			feet: Math.floor(tmpinches / 12),
			inchesPart: tmpinches % 12,
			low: tmpeach[0].low,
			high: tmpeach[0].high
		};
	}

	// One race's height. Split out so a half race can roll each side.
	function rollOneHeight(tmptype, tmproll) {
		var tmpband = HEIGHT_BANDS[tmptype];
		if (!tmpband) { return null; }

		var tmprung = rungFor(tmpband.rows, tmproll(100));
		if (!tmprung) { return null; }

		var tmpinches = tmprung.base + (rollDice(tmprung.dice, tmproll) * (tmprung.sign ?? 1));
		if (tmpinches < 1) { tmpinches = 1; }
		return {
			type: tmptype,
			inches: tmpinches,
			feet: Math.floor(tmpinches / 12),
			inchesPart: tmpinches % 12,
			low: { feet: tmpband.bounds.low[0], inches: tmpband.bounds.low[1] },
			high: { feet: tmpband.bounds.high[0], inches: tmpband.bounds.high[1] }
		};
	}

// @MARKER FRAME

	// This is the function which says a race's frame type, his setTempRaceFrameType -- the build
	// before the character's own attributes are taken into account.
	export function getFrameType(tmpracename) {
		return FRAME_TYPE_BY_RACE[tmpracename] ?? "";
	}

	// This is the function which turns a frame type and the character's Strength and Agility into
	// the frame his weight tables are keyed by, his getTempFrame.
	//
	// A half race takes the FIRST race's frame type, as his half-race code takes the first race's
	// body and special movement. Nothing in his code averages two frame types, and there is no
	// obvious way to: they are words, not numbers.
	export function getFrame(tmpracenames, tmpstr, tmpagl) {
		var tmpnames = (Array.isArray(tmpracenames) ? tmpracenames : [tmpracenames]).filter(n => n);
		var tmptype = getFrameType(tmpnames[0] ?? "");
		var tmpladder = FRAME_LADDER[tmptype];
		if (!tmpladder) { return { type: tmptype, frame: "", measure: 0 }; }

		var tmpmeasure = (parseInt(tmpstr) || 0) - (parseInt(tmpagl) || 0);
		var tmprung = rungFor(tmpladder, tmpmeasure);
		return { type: tmptype, frame: tmprung ? tmprung.frame : "", measure: tmpmeasure };
	}

// @MARKER WEIGHT

	// This is the function which rolls a character's weight, his get<Frame>Weight.
	//
	// The frame picks the table and the height picks the band within it; the band gives a base
	// weight and a roll to add. A few of his bands double the roll afterwards, which the tables
	// carry as a flag. Returns the weight and the band's own lightest and heaviest.
	//
	// Weight needs the height, so this cannot be rolled first -- see the note at the top.
	export function rollWeight(tmpframe, tmpinches, tmproll) {
		var tmpbands = WEIGHT_BANDS[tmpframe];
		if (!tmpbands) { return null; }

		var tmprung = rungFor(tmpbands, parseInt(tmpinches) || 0);
		if (!tmprung) { return null; }

		var tmprolled = rollDice(tmprung.dice, tmproll) * (tmprung.sign ?? 1);
		if (tmprung.double) { tmprolled = tmprolled * 2; }

		var tmpweight = tmprung.base + tmprolled;
		if (tmpweight < 1) { tmpweight = 1; }
		return { weight: tmpweight, low: tmprung.low, high: tmprung.high, frame: tmpframe };
	}

// @MARKER ALL THREE AT ONCE

	// This is the function behind his Apply Height/Frame button (roll_apply_height_frame): height,
	// then frame, then the weight that depends on both. Returns everything it worked out, so a
	// window can show the roll as well as the result.
	//
	// A race the tables do not know -- one a Game Master authored -- answers with what it can and
	// says what it could not, rather than throwing or inventing a figure.
	export function rollPhysique(tmpracenames, tmpstr, tmpagl, tmproll) {
		var tmpheight = rollHeight(tmpracenames, tmproll);
		var tmpframe = getFrame(tmpracenames, tmpstr, tmpagl);
		var tmpweight = (tmpheight && tmpframe.frame)
			? rollWeight(tmpframe.frame, tmpheight.inches, tmproll) : null;

		var tmpissues = [];
		if (!tmpheight) { tmpissues.push("This race has no height table; enter a height by hand."); }
		if (!tmpframe.frame) { tmpissues.push("This race has no frame table; enter a weight by hand."); }
		else if (!tmpweight) { tmpissues.push(`No weight table for a ${tmpframe.frame} frame.`); }

		return {
			height: tmpheight,
			frameType: tmpframe.type,
			frame: tmpframe.frame,
			frameMeasure: tmpframe.measure,
			weight: tmpweight,
			issues: tmpissues
		};
	}

// @MARKER ADD NEW physique rules functions HERE
// @END (CODE)
