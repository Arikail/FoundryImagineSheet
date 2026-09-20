// @START (CODE)
// @MARKER BEST ARMOUR
//==================================================================================================================
// Which armour a character should wear, worked out from what they own.
//
// This is a helper for the Equip Best Armour button on the Equipment tab; his sheet has no such
// button, so nothing here is ported. It follows the layering rules quoted at the top of
// module/data/item-armor.mjs (Player's Guide, Layering Armor), and it decides nothing the rules do not:
//   - at most three layers of armour on any one body location
//   - the first layer worn must be flexible (a piece with its own padding counts)
//   - each layer may only sit over something at least as flexible as itself
//   - rigid may never stack on rigid (the three "Rigid/Rigid" suits are the book's stated exception)
//   - clothing of 3 armour value or less takes no layer at all
//
// Pure rules, no Foundry: it is handed plain item data and hands back plain answers, so the test page
// can run it as it stands. Shields are left alone -- which shield to carry depends on which hand is
// free, and that is the player's call.
//==================================================================================================================

// The body locations an armour piece may cover, as item-armor.mjs names them.
export const ARMOR_LOCATIONS = ["head", "neck", "shoulderLeft", "shoulderRight", "torsoUpper", "torsoMid",
	"torsoLower", "armLeft", "armRight", "forearmLeft", "forearmRight", "handLeft", "handRight",
	"thighLeft", "thighRight", "shinLeft", "shinRight", "footLeft", "footRight"];

// How stiff each flexibility class is. A layer may only sit over a layer of equal or lower stiffness,
// so the innermost layer of any stack is always the lowest number in it.
//                        stiffness
export const ARMOR_STIFFNESS = {
	"Clothing":            0,
	"Flexible":            1,
	"Semi-Flexible":       2,
	"Mixed":               2,     // the book gives no ruling; treated as the middle class
	"Rigid/Flexible":      3,     // composite: a rigid shell on a flexible lining
	"Rigid/Semi-Flexible": 3,
	"Rigid/Rigid":         3,
	"Rigid":               3
};

// The pieces that may be the first layer against the body. A composite piece with a flexible lining
// may ("skull caps and some gauntlets"); a plain rigid one may not.
const FIRST_LAYER_CLASSES = ["Clothing", "Flexible", "Rigid/Flexible"];

// This is the function which says how much protection a piece gives, added over every location it
// covers. This is the measure "best" is judged by.
export function getArmorTotal(tmpitem) {
	var tmptotal = 0;
	var tmpcoverage = tmpitem?.system?.coverage ?? {};
	for (const tmplocation of ARMOR_LOCATIONS) { tmptotal = tmptotal + (parseInt(tmpcoverage[tmplocation]) || 0); }
	return tmptotal;
}

// This is the function which adds up what wearing a piece costs, as one number. The penalties are
// stored negative, so a bigger number is a smaller cost.
function getPenaltyTotal(tmpitem) {
	var tmppenalties = tmpitem?.system?.penalties ?? {};
	return (parseInt(tmppenalties.skills) || 0) + (parseInt(tmppenalties.defense) || 0)
		+ (parseInt(tmppenalties.initiative) || 0) + (parseInt(tmppenalties.speed) || 0);
}

// This is the function which says whether a piece takes one of the three layers. Mirrors
// consumesLayer on the armour data model, which cannot be called on plain data.
export function consumesLayer(tmpitem) {
	var tmpsys = tmpitem?.system ?? {};
	if (tmpsys.isShield) { return true; }
	if (tmpsys.flexibility != "Clothing") { return true; }
	var tmphighest = 0;
	for (const tmplocation of ARMOR_LOCATIONS) {
		tmphighest = Math.max(tmphighest, parseInt(tmpsys.coverage?.[tmplocation]) || 0);
	}
	return tmphighest > 3;
}

// This is the function which puts the pieces covering one body location in wearing order, innermost
// first, and reports whether that stack is legal. Returns { ok, stack }.
export function getLocationStack(tmppieces, tmplocation, tmpcheckfirst = true) {
	var tmpcovering = tmppieces.filter(tmpitem => consumesLayer(tmpitem)
		&& (parseInt(tmpitem.system?.coverage?.[tmplocation]) || 0) > 0);
	// Stiffness decides the order; the rules leave no other legal one.
	var tmpstack = [...tmpcovering].sort((tmpa, tmpb) =>
		(ARMOR_STIFFNESS[tmpa.system.flexibility] ?? 3) - (ARMOR_STIFFNESS[tmpb.system.flexibility] ?? 3));

	if (tmpstack.length > 3) { return { ok: false, stack: tmpstack }; }
	if (tmpcheckfirst && tmpstack.length && !FIRST_LAYER_CLASSES.includes(tmpstack[0].system.flexibility)
	    && tmpstack[0].system.flexibility != "Semi-Flexible" && tmpstack[0].system.flexibility != "Mixed") {
		// A plain rigid piece against the body. Semi-flexible and mixed pieces are let through: the
		// book only names flexible and padded as required, and refusing them would leave a
		// character in a chain shirt no way to wear it.
		return { ok: false, stack: tmpstack };
	}
	for (var tmpindex = 1; tmpindex < tmpstack.length; tmpindex++) {
		var tmpinner = tmpstack[tmpindex - 1].system.flexibility;
		var tmpouter = tmpstack[tmpindex].system.flexibility;
		var tmpbothrigid = ARMOR_STIFFNESS[tmpinner] == 3 && ARMOR_STIFFNESS[tmpouter] == 3;
		// "A few suits allow two sections of rigid armor because they do not touch."
		if (tmpbothrigid && tmpouter != "Rigid/Rigid" && tmpinner != "Rigid/Rigid") { return { ok: false, stack: tmpstack }; }
	}
	return { ok: true, stack: tmpstack };
}

// This is the function which says whether every location of a set of pieces is legally stacked.
//
// tmpcheckfirst is false while a set is still being built: a rigid piece is chosen before the padding
// it needs, so asking for the padding at that point would throw every plate out.
export function isLegalSet(tmppieces, tmpcheckfirst = true) {
	for (const tmplocation of ARMOR_LOCATIONS) {
		if (!getLocationStack(tmppieces, tmplocation, tmpcheckfirst).ok) { return false; }
	}
	return true;
}

// This is the function which chooses the best armour from what is owned. Best means the most
// protection added over the whole body, taken greedily -- the strongest piece first, then the next
// strongest that still fits legally on top of or beside what is already chosen. Ties go to the piece
// that costs the wearer less.
//
// Takes plain item data ({ id, name, system }). Returns { worn, layers, left }:
//   worn   - the ids to wear
//   layers - { id: layer number }, 0 for clothing that takes no layer, else the outermost place the
//            piece holds at any location it covers
//   left   - the armour it did not use, with the reason
export function chooseBestArmor(tmpitems) {
	var tmpcandidates = (tmpitems ?? []).filter(tmpitem => tmpitem.type == "armor"
		&& !tmpitem.system?.isShield && (parseInt(tmpitem.system?.quantity) ?? 1) != 0
		&& tmpitem.system?.available !== false && getArmorTotal(tmpitem) > 0);
	tmpcandidates.sort((tmpa, tmpb) => (getArmorTotal(tmpb) - getArmorTotal(tmpa))
		|| (getPenaltyTotal(tmpb) - getPenaltyTotal(tmpa)));

	var tmpchosen = [];
	var tmpleft = [];
	for (const tmpcandidate of tmpcandidates) {
		// Two of the same thing stacked is legal and pointless.
		if (tmpchosen.some(tmpitem => tmpitem.name == tmpcandidate.name)) {
			tmpleft.push({ id: tmpcandidate.id, name: tmpcandidate.name, why: "already wearing one" });
			continue;
		}
		if (isLegalSet([...tmpchosen, tmpcandidate], false)) { tmpchosen.push(tmpcandidate); }
		else { tmpleft.push({ id: tmpcandidate.id, name: tmpcandidate.name, why: "does not layer over what is worn" }); }
	}

	// Now the first-layer rule. Wherever a plain rigid piece ended up against the body with nothing
	// padded under it, it comes off -- it could not be worn like that.
	var tmpfixed = false;
	while (!tmpfixed) {
		tmpfixed = true;
		for (const tmplocation of ARMOR_LOCATIONS) {
			var tmpcheck = getLocationStack(tmpchosen, tmplocation);
			if (tmpcheck.ok) { continue; }
			var tmpoff = tmpcheck.stack[0];
			tmpchosen = tmpchosen.filter(tmpitem => tmpitem !== tmpoff);
			tmpleft.push({ id: tmpoff.id, name: tmpoff.name, why: "has no flexible layer to go over" });
			tmpfixed = false;
			break;
		}
	}

	var tmplayers = {};
	for (const tmpitem of tmpchosen) {
		var tmplayer = 0;
		for (const tmplocation of ARMOR_LOCATIONS) {
			var tmpposition = getLocationStack(tmpchosen, tmplocation).stack.indexOf(tmpitem);
			if (tmpposition >= 0) { tmplayer = Math.max(tmplayer, tmpposition + 1); }
		}
		tmplayers[tmpitem.id] = tmplayer;
	}
	return { worn: tmpchosen.map(tmpitem => tmpitem.id), layers: tmplayers, left: tmpleft };
}

// @MARKER ADD NEW equip rules HERE
// @END (CODE)
