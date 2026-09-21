// @START (CODE)
// @MARKER STARTING KIT
//==================================================================================================================
// The three OPTIONAL ways his sheet gives a new character its kit. Rules only -- no Foundry here,
// so tools/chargen-test.html can drive the lot without one.
//
//     by CULTURE   wilderness gear suited to the race, taken INSTEAD of starting coins. His
//                  override_coins tick; setWildernessEquipmentByRace, sheet-worker.js:73810.
//     by STATUS    free clothing by race, social class, gender and style. His do_clothing tick;
//                  setClothing, 75027.
//     by SKILLS    each social skill the character took brings its own tools. His
//                  do_social_skill_equip tick; socialskillequiplist, 188 skills that bring
//                  something.
//
// All three are OFF unless asked for. They are optional in his sheet and a Game Master who has not
// asked for them should not find gear appearing on their players.
//
// The tables are generated -- see module/starting-kit-tables.mjs and the extractor that writes it.
//==================================================================================================================

import {
	RACE_WILDERNESS_KIT, WILDERNESS_KITS,
	RACE_WARDROBE, WARDROBES, CLOTHING_BANDS,
	SOCIAL_SKILL_EQUIPMENT
} from "./starting-kit-tables.mjs";

	// @MARKER APPARENT SOCIAL CLASS
	// This is the function which gives the social class the kit rules actually read.
	//
	// His rule, and it is the same one in the clothing, the gear and the starting money: a social
	// class below 5 or above 20 "has an apparent social class in the mortal realms" -- such a being
	// does not register on a mortal scale, so one is rolled (5d4) and used instead. A class already
	// between 5 and 20 is its own apparent class and nothing is rolled.
	//
	// Rolled ONCE by the caller and passed to all three rules, so a character does not appear
	// destitute to its tailor and wealthy to its outfitter.
	export function getApparentSocialClass(tmpSocial, tmpRoll) {
		var tmpClass = parseInt(tmpSocial) || 0;
		if (tmpClass >= 5 && tmpClass <= 20) { return { social: tmpClass, apparent: false }; }
		var tmpRolled = 0;
		for (var tmpDie = 0; tmpDie < 5; tmpDie += 1) { tmpRolled += tmpRoll(4); }
		return { social: tmpRolled, apparent: true };
	}

	// @MARKER ITEM NAMES
	// This is the function which reads one of his item strings into a name and a count. He writes a
	// quantity as a leading number -- "10 Piton", "2 Oar" -- so the number is taken off the front
	// and the remainder is the name to look up. A name that simply starts with a digit would be
	// misread, and none in his tables does.
	export function splitItemCount(tmpText) {
		var tmpMatch = ("" + (tmpText ?? "")).trim().match(/^(\d+)\s+(.*)$/);
		if (!tmpMatch) { return { name: ("" + (tmpText ?? "")).trim(), count: 1 }; }
		return { name: tmpMatch[2].trim(), count: parseInt(tmpMatch[1]) || 1 };
	}

	// This is the function which turns a list of his item strings into counted entries.
	function countedItems(tmpList, tmpSource) {
		return (tmpList ?? []).filter(tmpText => tmpText).map(tmpText => {
			var tmpSplit = splitItemCount(tmpText);
			return { name: tmpSplit.name, count: tmpSplit.count, source: tmpSource };
		});
	}

	// @MARKER BY CULTURE
	// This is the function which gives the wilderness gear a race of this social class carries.
	//
	// A band may hold more than one alternative, which is his own die roll between them -- the
	// standard kit at social 5 is a club with either a stone knife and three days of water, or an
	// obsidian knife and a week of it. The roll is made here so the caller need not know which
	// bands are alternatives and which are not.
	export function rollWildernessKit(tmpRaceName, tmpSocial, tmpRoll) {
		var tmpKitName = RACE_WILDERNESS_KIT[tmpRaceName];
		if (!tmpKitName) { return { items: [], issues: [`No wilderness kit is listed for ${tmpRaceName}.`] }; }
		var tmpKit = WILDERNESS_KITS[tmpKitName] ?? {};

		// His switches run 0 or 1 up to 20 and every band in between is present, so a class inside
		// that range always hits. Anything outside is held to the ends rather than falling through
		// to nothing -- the apparent-class roll should already have prevented it.
		var tmpBands = Object.keys(tmpKit).map(tmpKey => parseInt(tmpKey)).sort((a, b) => a - b);
		if (!tmpBands.length) { return { items: [], issues: [`Kit ${tmpKitName} is empty.`] }; }
		var tmpWanted = Math.max(tmpBands[0], Math.min(tmpBands[tmpBands.length - 1], parseInt(tmpSocial) || 0));
		var tmpAlternatives = tmpKit["" + tmpWanted] ?? [];
		if (!tmpAlternatives.length) { return { items: [], issues: [`Kit ${tmpKitName} has nothing at social ${tmpWanted}.`] }; }

		var tmpChosen = tmpAlternatives.length > 1
			? tmpAlternatives[tmpRoll(tmpAlternatives.length) - 1]
			: tmpAlternatives[0];

		return {
			items: countedItems(tmpChosen.armorClothing, "culture")
				.concat(countedItems(tmpChosen.weapons, "culture"))
				.concat(countedItems(tmpChosen.generalEquipment, "culture")),
			kit: tmpKitName,
			issues: []
		};
	}

	// @MARKER BY STATUS
	// This is the function which gives the free clothing for a race at a social class.
	//
	// His ladder is written richest-first as "social class above 14, above 11, above 9, above 6,
	// otherwise", so the bands are thresholds and the first one the class clears is the one worn.
	// A wardrobe that does not vary by style or by gender carries "any" in that place, which is
	// what the extractor writes when his case has no such branch.
	export function getClothing(tmpRaceName, tmpSocial, tmpGender, tmpStyle) {
		var tmpWardrobeName = RACE_WARDROBE[tmpRaceName];
		if (!tmpWardrobeName) { return { items: [], issues: [`No clothing is listed for ${tmpRaceName}.`] }; }
		var tmpWardrobe = WARDROBES[tmpWardrobeName] ?? {};

		var tmpStyles = tmpWardrobe[tmpStyle] ? tmpWardrobe[tmpStyle]
			: (tmpWardrobe.any ?? tmpWardrobe[Object.keys(tmpWardrobe)[0]] ?? {});
		// Only "Female" is tested by name in his code; everything else takes the other branch.
		var tmpByGender = tmpStyles[tmpGender == "Female" ? "Female" : "Other"] ?? tmpStyles.any
			?? tmpStyles[Object.keys(tmpStyles)[0]] ?? {};

		var tmpClass = parseInt(tmpSocial) || 0;
		for (const tmpBand of CLOTHING_BANDS) {
			if (tmpClass > tmpBand || tmpBand === 0) {
				var tmpList = tmpByGender["" + tmpBand];
				if (tmpList) { return { items: countedItems(tmpList, "status"), issues: [] }; }
			}
		}
		return { items: [], issues: [] };
	}

	// @MARKER BY SKILLS
	// This is the function which gives the tools that come with the social skills taken. A skill
	// that brings nothing is simply absent from his list, which is not a gap.
	export function getSocialSkillKit(tmpSkillNames) {
		var tmpItems = [];
		for (const tmpName of tmpSkillNames ?? []) {
			for (const tmpEntry of countedItems(SOCIAL_SKILL_EQUIPMENT[tmpName], "skill")) {
				tmpItems.push(tmpEntry);
			}
		}
		return { items: tmpItems, issues: [] };
	}

	// @MARKER THE WHOLE KIT
	// This is the function which puts the three together for a character.
	//
	// Duplicates are MERGED rather than listed twice: a character whose culture and whose skills
	// both bring a knife carries two knives, not two entries each saying one. The sources are kept
	// so a sheet can say where a thing came from.
	export function buildStartingKit(tmpChoices, tmpRoll) {
		var tmpOut = { items: [], issues: [], usedSocialClass: 0, apparentSocialClass: false, kit: "" };
		var tmpApparent = getApparentSocialClass(tmpChoices.social, tmpRoll);
		tmpOut.usedSocialClass = tmpApparent.social;
		tmpOut.apparentSocialClass = tmpApparent.apparent;

		var tmpParts = [];
		if (tmpChoices.byCulture) {
			var tmpGear = rollWildernessKit(tmpChoices.raceName, tmpApparent.social, tmpRoll);
			tmpOut.kit = tmpGear.kit ?? "";
			tmpParts.push(tmpGear);
		}
		if (tmpChoices.byStatus) {
			tmpParts.push(getClothing(tmpChoices.raceName, tmpApparent.social,
				tmpChoices.gender, tmpChoices.style));
		}
		if (tmpChoices.bySkills) {
			tmpParts.push(getSocialSkillKit(tmpChoices.socialSkillNames));
		}

		var tmpByName = {};
		for (const tmpPart of tmpParts) {
			for (const tmpIssue of tmpPart.issues) { tmpOut.issues.push(tmpIssue); }
			for (const tmpItem of tmpPart.items) {
				if (tmpByName[tmpItem.name]) {
					tmpByName[tmpItem.name].count += tmpItem.count;
					if (!tmpByName[tmpItem.name].sources.includes(tmpItem.source)) {
						tmpByName[tmpItem.name].sources.push(tmpItem.source);
					}
					continue;
				}
				tmpByName[tmpItem.name] = { name: tmpItem.name, count: tmpItem.count, sources: [tmpItem.source] };
				tmpOut.items.push(tmpByName[tmpItem.name]);
			}
		}
		return tmpOut;
	}

// @MARKER ADD NEW starting-kit functions HERE
// @END (CODE)
