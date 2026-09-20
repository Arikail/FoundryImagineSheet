// @START (CODE)
// @MARKER CLASS RULES
//==================================================================================================================
// Rules for what a class gives a character as it advances, with no Foundry dependency, so they can
// be tested outside it. The race half of the module lives in race-rules.mjs; this is the class half.
//
// HIS MODEL, which this follows. setClassSkillLists (sheet-worker.js:57903) gives a class its whole
// skill progression at once -- every skill, each tagged with the title it arrives at -- and
// setFinalClassSkills (63177) writes all fifteen titles onto the sheet at creation. Only the FIRST
// title's skills get a live ability and chance there; every later title's are written with
// "_ability"=0 and "_chance"=0 (63292, 63327, and so on down to 63692). They are on the sheet, and
// they do not work yet.
//
// A later title's skills come alive when the character reaches that title. handleLevelTitle (66058)
// asks getTitleToAcquireSkillsByGoal (92462) which title's skills a goal buys, and its answer is
// the plain title boundary -- goal 0 gives title 1, 3 gives 2, 6 gives 3, up to 42 giving 15 -- so
// reaching title N is exactly when title N's skills are acquired. That is what makes granting on
// the title faithful rather than a simplification.
//
// His two gates on USING one, from handleHighTitleClassSkillRoll (64169) and its Mod twin:
//     the skill's title is above the character's      "this skill cannot be used before <name> title."
//     the skill has no ability yet                    the roll falls back to the base chance alone
// The first is ported here as checkClassSkillTitle. The second needs no rule: a skill the character
// does not hold has no bonuses to read.
//
// WHAT IS NOT HERE. Whether the character has a free class skill slot for the skill. His sheet
// marks a skill "REMOVED" when the slots run short (63268), and the slot accounting already lives
// in skills-rules.mjs and _prepareSkillSlots; a grant that overruns is therefore reported by the
// slot panel that is already there, exactly as one made by hand is.
//==================================================================================================================

	// This is the function which decides whether a class skill is for this character at all.
	// His nocast, set by the racial disability "Cannot Cast Spells": a few casting classes give a
	// race that cannot cast a different skill in the same slot, so each of the pair is tagged and
	// only one of them is ever this character's.
	export function isClassSkillForCharacter(tmpskill, tmpcannotcast) {
		if (tmpskill?.requires == "nonCaster") { return !!tmpcannotcast; }
		if (tmpskill?.requires == "caster")    { return !tmpcannotcast; }
		return true;
	}

	// This is the function which lists the class skills that arrive AT one title.
	export function getClassSkillsAtTitle(tmpclasssystem, tmptitle, tmpcannotcast) {
		var tmplist = tmpclasssystem?.advancement?.classSkillList ?? [];
		return tmplist
			.filter(tmpskill => (parseInt(tmpskill.title) || 0) == (parseInt(tmptitle) || 0))
			.filter(tmpskill => isClassSkillForCharacter(tmpskill, tmpcannotcast))
			.map(tmpskill => ({ name: tmpskill.name, core: !!tmpskill.core, title: parseInt(tmpskill.title) || 0 }));
	}

	// This is the function which lists every class skill the character's title entitles them to --
	// this title's and every earlier one's, because a character who reached title 5 passed through
	// 1 to 4 to get there.
	export function getClassSkillsThroughTitle(tmpclasssystem, tmptitle, tmpcannotcast) {
		var tmplist = tmpclasssystem?.advancement?.classSkillList ?? [];
		var tmpat = parseInt(tmptitle) || 0;
		return tmplist
			.filter(tmpskill => {
				var tmpneeded = parseInt(tmpskill.title) || 0;
				return tmpneeded > 0 && tmpneeded <= tmpat;
			})
			.filter(tmpskill => isClassSkillForCharacter(tmpskill, tmpcannotcast))
			.map(tmpskill => ({ name: tmpskill.name, core: !!tmpskill.core, title: parseInt(tmpskill.title) || 0 }));
	}

	// This is the function which says which entitled class skills the character does not hold yet,
	// so they can be granted. A skill already on the character is never granted a second time,
	// whoever put it there -- a player who added it by hand keeps their copy and its bonuses.
	//
	// A non-classed character (his GME) is entitled to nothing: it picks its skills one at a time,
	// which is the whole point of it. Its skill list is empty anyway, so this is belt and braces.
	export function getClassSkillsToGrant(tmpclasssystem, tmptitle, tmpcannotcast, tmpheldnames) {
		if (tmpclasssystem?.nonClassed) { return []; }

		var tmpheld = (tmpheldnames ?? []).map(tmpname => "" + tmpname);
		return getClassSkillsThroughTitle(tmpclasssystem, tmptitle, tmpcannotcast)
			.filter(tmpskill => !tmpheld.includes(tmpskill.name));
	}

	// This is the function which says at which title a named skill arrives in a class, or 0 if the
	// class never gives it. Where a class lists the same skill twice, the EARLIEST title wins: the
	// character has it from then on, and the later entry cannot take it away again.
	export function getClassSkillTitle(tmpclasssystem, tmpname) {
		var tmplist = tmpclasssystem?.advancement?.classSkillList ?? [];
		var tmpearliest = 0;
		for (const tmpskill of tmplist) {
			if (tmpskill.name != tmpname) { continue; }
			var tmptitle = parseInt(tmpskill.title) || 0;
			if (tmptitle > 0 && (tmpearliest == 0 || tmptitle < tmpearliest)) { tmpearliest = tmptitle; }
		}
		return tmpearliest;
	}

	// This is the function which answers whether a skill may be used yet, ported from his
	// handleHighTitleClassSkillRoll (sheet-worker.js:64169): "classtitle<titleNeeded" refuses the
	// roll and says so by title NAME, not number, which is how a player reads their own sheet.
	//
	// Only a class skill is ever gated this way. A racial or social skill is acquired outside the
	// class progression altogether and has no title to wait for -- acquiredAtTitle is 0 on those,
	// which this reads as "no gate", his own convention.
	export function checkClassSkillTitle(tmpacquiredattitle, tmpcurrenttitle, tmptitlename) {
		var tmpneeded = parseInt(tmpacquiredattitle) || 0;
		var tmphas = parseInt(tmpcurrenttitle) || 0;
		if (tmpneeded <= 0 || tmphas >= tmpneeded) { return { usable: true, reason: "" }; }

		var tmplabel = tmptitlename ? `${tmptitlename} (title ${tmpneeded})` : `title ${tmpneeded}`;
		return { usable: false, reason: `This skill cannot be used before ${tmplabel}.` };
	}

	// This is the function which builds the progression panel the sheet shows: one row per title
	// the class has skills at, each saying whether the character has reached it and which skills
	// it brings. Built here rather than in the sheet so it can be tested without Foundry, and so
	// the generator's preview and the sheet cannot drift apart.
	//
	// Rows run from title 1 to the highest title the class lists, and a title with no skills of its
	// own is left out rather than rendered empty -- most classes have several.
	export function buildClassProgression(tmpclasssystem, tmptitle, tmpcannotcast) {
		var tmplist = tmpclasssystem?.advancement?.classSkillList ?? [];
		var tmpat = parseInt(tmptitle) || 0;
		var tmphighest = tmplist.reduce((tmpmax, tmpskill) =>
			Math.max(tmpmax, parseInt(tmpskill.title) || 0), 0);

		var tmprows = [];
		for (var tmpwhich = 1; tmpwhich <= tmphighest; tmpwhich++) {
			var tmpskills = getClassSkillsAtTitle(tmpclasssystem, tmpwhich, tmpcannotcast);
			if (!tmpskills.length) { continue; }
			tmprows.push({
				title:     tmpwhich,
				reached:   tmpat >= tmpwhich,
				current:   tmpat == tmpwhich,
				skills:    tmpskills,
				skillText: tmpskills.map(tmpskill => tmpskill.core ? `${tmpskill.name} (core)` : tmpskill.name).join(", ")
			});
		}
		return tmprows;
	}

	// @MARKER USAGE RESTRICTIONS
	// This is the function which reads a class's armour and weapon usage for display. His sheet
	// carries both as text and shows them (tmp_class_armor_usage / tmp_class_weapon_usage, set at
	// sheet-worker.js:51018-51019 and written to the sheet at 51297-51298) and NEVER compares them
	// against what the character is wearing or wielding -- the Game Master does that at the table.
	//
	// So this shows them and stops there. Deciding whether a given piece of armour is "Leather or
	// less" would mean inventing a comparison he does not make, against strings the extraction
	// found in 40-odd shapes. The Player's Guide's cost for breaking the rule -- experience, and
	// the use of non-combat class skills -- is likewise the Game Master's to apply.
	export function getClassUsageRestrictions(tmpclassitems) {
		return (tmpclassitems ?? [])
			.filter(tmpclass => tmpclass && !tmpclass.system?.nonClassed)
			.map(tmpclass => ({
				name:        tmpclass.name,
				armorUsage:  tmpclass.system?.armorUsage || "Any",
				weaponUsage: tmpclass.system?.weaponUsage || "Any"
			}));
	}

// @MARKER ADD NEW class rules functions HERE
// @END (CODE)
