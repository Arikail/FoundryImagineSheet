// @START (CODE)
// @MARKER ADVANCEMENT
//==================================================================================================================
// Applying a level-up to an actor. The rules live in advancement-rules.mjs, which knows nothing of
// Foundry; this is the half that writes to the character, creates its powers, and posts to chat.
//
// WHAT A STEP IS. His sheet walks a level-up one goal at a time, and commits each in a fixed
// order (handleGoalCommit, sheet-worker.js:65926): where a goal crosses a title boundary, the
// TITLE is committed first -- his own refusal, "Commit title before committing goal". So:
//
//     commitTitle(actor)   the title itself, Endurance, class skills, Arch Mortal, attack charts
//     commitGoal(actor)    the attribute increases rolled, the skill points placed, the goal
//
// ONE STEP IS ATOMIC HERE, where his sheet stores it half-finished. His sheet keeps the rolled
// results and the placed points in temporary attributes, so a browser closed mid-goal leaves them
// on the character. This port rolls, places and commits in one action from the Level Up window
// instead: a window closed early loses nothing, because nothing was written, and the goal is
// simply offered again. The QUEUE itself is stored, exactly as his is (identity.goalsToRaise and
// its siblings), so the level-up survives logging out -- it is only the half-made decisions that
// are not persisted.
//
// NOTHING HERE ROLLS ANYTHING. The rolls happen in the window, through Foundry's dice, and arrive
// as results. That keeps this side testable and the randomness in one place.
//==================================================================================================================

import { planExperienceGain, getTitleEndurance, getArchMortalGains,
         ARCH_MORTAL_INVULNERABILITY } from "./advancement-rules.mjs";
import { grantClassSkills } from "./class-advancement.mjs";

	// @MARKER EXPERIENCE

	// This is the function which adds experience to a character, his roll_add_exp.
	// Returns the plan, applied or refused, so a caller can say what happened.
	export async function addExperience(tmpactor, tmpamount, { notify = true } = {}) {
		if (!tmpactor || tmpactor.type != "character") { return null; }

		var tmpsystem = tmpactor.system;
		var tmpplan = planExperienceGain({
			exp: tmpsystem.identity.exp,
			title: tmpsystem.identity.title,
			goal: tmpsystem.identity.goal,
			titlesToRaise: tmpsystem.identity.titlesToRaise,
			goalsToRaise: tmpsystem.identity.goalsToRaise,
			archQualified: tmpsystem.identity.archQualified
		}, tmpamount);

		if (!tmpplan.accepted) {
			if (notify) { ui.notifications.warn(`${tmpactor.name}: ${tmpplan.reason}`); }
			return tmpplan;
		}

		await tmpactor.update({
			"system.identity.exp": tmpplan.exp,
			"system.identity.titlesToRaise": tmpplan.titlesToRaise,
			"system.identity.goalsToRaise": tmpplan.goalsToRaise,
			"system.identity.titleToLevel": tmpplan.titleToLevel,
			"system.identity.goalToLevel": tmpplan.goalToLevel
		});

		if (notify) {
			var tmpmessage = `${tmpactor.name} gains ${tmpplan.added} experience.`;
			if (tmpplan.goalsToRaise) {
				tmpmessage = tmpmessage + ` ${tmpplan.goalsToRaise} goal(s)`
					+ (tmpplan.titlesToRaise ? ` and ${tmpplan.titlesToRaise} title(s)` : "")
					+ " to level up.";
			}
			if (tmpplan.reason) { tmpmessage = tmpmessage + " " + tmpplan.reason; }
			ui.notifications.info(tmpmessage);
		}
		return tmpplan;
	}

	// @MARKER A GOAL

	// This is the function which commits one goal advance: the attribute increases that were
	// rolled for, the skill points that were placed, and the goal itself.
	//
	// tmpincreases is what resolveGoalAdvance returned -- [{ key, increased }] -- and tmpspends
	// is [{ itemId, points }]. Both are already decided; this writes them.
	//
	// An attribute at its maximum is not raised past it. His increaseAttribute clamps the same
	// way, and _prepareAttributes would clamp it again on the next render regardless; doing it
	// here means the character never briefly holds a figure that is not legal.
	export async function commitGoal(tmpactor, tmpincreases, tmpspends, { notify = true } = {}) {
		if (!tmpactor || tmpactor.type != "character") { return null; }
		var tmpsystem = tmpactor.system;

		// His refusal: a title waiting on this goal is committed first.
		if ((parseInt(tmpsystem.identity.titlesToRaise) || 0) > 0
		 && (parseInt(tmpsystem.identity.titleToLevel) || 0) <= getTitleOfGoal(tmpsystem.identity.goalToLevel)) {
			if (notify) {
				ui.notifications.warn(`${tmpactor.name}: commit title `
					+ `${tmpsystem.identity.titleToLevel} before this goal.`);
			}
			return null;
		}

		var tmpupdate = {};
		var tmpraised = [];
		var tmpcount = parseInt(tmpsystem.identity.attributeIncreases) || 0;
		for (const tmpincrease of tmpincreases ?? []) {
			if (!tmpincrease.increased || !tmpincrease.key) { continue; }
			var tmpattribute = tmpsystem.attributes[tmpincrease.key];
			if (!tmpattribute) { continue; }
			if ((parseInt(tmpattribute.value) || 0) >= (parseInt(tmpattribute.max) || 0)) { continue; }
			tmpupdate[`system.attributes.${tmpincrease.key}.rating`] =
				(parseInt(tmpattribute.rating) || 0) + 1;
			tmpraised.push(tmpincrease.key.toUpperCase());
			tmpcount = tmpcount + 1;
		}

		// The goal itself, and one off the queue.
		var tmpgoal = parseInt(tmpsystem.identity.goalToLevel) || 0;
		var tmpremaining = Math.max(0, (parseInt(tmpsystem.identity.goalsToRaise) || 0) - 1);
		tmpupdate["system.identity.goal"] = tmpgoal;
		tmpupdate["system.identity.goalsToRaise"] = tmpremaining;
		tmpupdate["system.identity.goalToLevel"] = tmpremaining ? tmpgoal + 1 : 0;
		tmpupdate["system.identity.attributeIncreases"] = tmpcount;
		await tmpactor.update(tmpupdate);

		// Skill points: each point is +1% on that skill's ability
		// (commitSingleSkillPointAdds, sheet-worker.js:94756).
		var tmpspent = 0;
		for (const tmpspend of tmpspends ?? []) {
			var tmpitem = tmpactor.items.get(tmpspend.itemId);
			var tmppoints = parseInt(tmpspend.points) || 0;
			if (!tmpitem || tmppoints < 1) { continue; }
			await tmpitem.update({ "system.abilityBonus": (parseInt(tmpitem.system.abilityBonus) || 0) + tmppoints });
			tmpspent = tmpspent + tmppoints;
		}

		if (notify) {
			ui.notifications.info(`${tmpactor.name} reaches goal ${tmpgoal}`
				+ (tmpraised.length ? `, and gains +1 ${tmpraised.join(" and +1 ")}` : "")
				+ (tmpspent ? `, with ${tmpspent} skill point(s) placed` : "") + ".");
		}
		return { goal: tmpgoal, raised: tmpraised, pointsSpent: tmpspent };
	}

	// The title a goal belongs to, without importing the whole ladder for one line.
	function getTitleOfGoal(tmpgoal) {
		var tmpat = parseInt(tmpgoal) || 0;
		return tmpat < 0 ? 0 : Math.floor(tmpat / 3) + 1;
	}

	// @MARKER A TITLE

	// This is the function which commits one title advance, his handleTitleCommit
	// (sheet-worker.js:66108) in the order he does it:
	//
	//     the title itself                  setAttrs({title})
	//     the Endurance the title brings     setUpdatedCharacteristicValues
	//     the class skills it brings         setAcquiredSkillValues -> grantClassSkills here
	//     the Arch Mortal package at 11+     setArchMortal* (four of them)
	//
	// What is NOT here, and deliberately: the attack charts (derived on this port, so they
	// change by themselves), the racial attribute maximums at 11th (also derived --
	// getAttributeMax already discards the racial limit at title 11), and the magic side --
	// Aura and Piety control, regeneration rates, Spell Lore -- which belongs to the deferred
	// magic layer and has nothing to write to yet.
	export async function commitTitle(tmpactor, tmpendurancerolled, { notify = true } = {}) {
		if (!tmpactor || tmpactor.type != "character") { return null; }
		var tmpsystem = tmpactor.system;
		var tmptitle = parseInt(tmpsystem.identity.titleToLevel) || 0;
		if (tmptitle < 1) { return null; }

		var tmpremaining = Math.max(0, (parseInt(tmpsystem.identity.titlesToRaise) || 0) - 1);
		var tmpendurance = parseInt(tmpendurancerolled) || 0;
		var tmpupdate = {
			"system.identity.title": tmptitle,
			"system.identity.titlesToRaise": tmpremaining,
			"system.identity.titleToLevel": tmpremaining ? tmptitle + 1 : 0,
			"system.characteristics.endurance.titleBonus":
				(parseInt(tmpsystem.characteristics.endurance.titleBonus) || 0) + tmpendurance
		};

		// @MARKER ARCH MORTAL
		var tmpgains = getArchMortalGains(tmptitle);
		if (tmpgains?.immortal) {
			// His setArchMortalMaximumAge: at 11th they stop ageing, and the word he writes is
			// "Immortal", which is why maximum age is a string on this port as it is on his sheet.
			tmpupdate["system.physical.maxAge"] = "Immortal";
		}
		await tmpactor.update(tmpupdate);

		// The class skills the title brings, which the class-advancement pass already builds.
		// It reads the title off the actor, so it runs after the update above, not before.
		var tmpgranted = await grantClassSkills(tmpactor, { notify: false });

		var tmppower = tmpgains ? await applyArchMortalPower(tmpactor, tmpgains) : null;
		var tmpsense = tmpgains ? await applyArchMortalSense(tmpactor, tmpgains) : 0;

		if (notify) {
			var tmpname = tmpactor.system.identity.titleName || `title ${tmptitle}`;
			var tmpparts = [];
			if (tmpendurance) { tmpparts.push(`+${tmpendurance} Endurance`); }
			if (tmpgranted.length) { tmpparts.push(`${tmpgranted.length} class skill(s): ${tmpgranted.join(", ")}`); }
			if (tmpgains?.immortal) { tmpparts.push("ageing stops, and every attribute maximum is now 27"); }
			if (tmppower) { tmpparts.push(tmppower); }
			if (tmpsense) { tmpparts.push(`Sense Supernatural at ${tmpsense}%`); }
			ui.notifications.info(`${tmpactor.name} reaches ${tmpname}`
				+ (tmpparts.length ? ` -- ${tmpparts.join("; ")}` : "") + ".");
		}
		return { title: tmptitle, endurance: tmpendurance, granted: tmpgranted, archMortal: tmpgains };
	}

	// This is the function which gives an Arch Mortal their invulnerability, his
	// setArchMortalInvulnerability (sheet-worker.js:27574). It arrives at 11th and is REPLACED at
	// 13th and again at 15th -- his code does a string replace on the powers list, never an add,
	// so the three never stack.
	//
	// His sheet keeps powers as one comma-separated field. Here each is a power Item, the same
	// type a creature's powers use, so it can be read, described and eventually cast by the same
	// code. It is marked constant, because his own wording says so: "(Constant: ...)".
	async function applyArchMortalPower(tmpactor, tmpgains) {
		if (!tmpgains?.invulnerability) { return ""; }

		var tmpheld = tmpactor.items.filter(tmpitem => tmpitem.type == "power");
		if (tmpheld.some(tmpitem => tmpitem.name == tmpgains.invulnerability)) { return ""; }

		// The weaker wordings this one replaces, removed rather than left beside it.
		var tmpold = tmpheld.filter(tmpitem => tmpgains.replaces.includes(tmpitem.name));
		if (tmpold.length) {
			await tmpactor.deleteEmbeddedDocuments("Item", tmpold.map(tmpitem => tmpitem.id));
		}

		await tmpactor.createEmbeddedDocuments("Item", [{
			name: tmpgains.invulnerability,
			type: "power",
			system: {
				unlimited: true, uses: 0, usesMax: 0, selfOnly: true,
				powerKind: "unknown",
				sourcebook: "Player`s Guide",
				description: "Granted on reaching Arch Mortal. His setArchMortalInvulnerability."
			}
		}]);
		return tmpold.length
			? `invulnerability improves to "${tmpgains.invulnerability}"`
			: `gains "${tmpgains.invulnerability}"`;
	}

	// This is the function which gives an Arch Mortal Sense Supernatural, his
	// setArchMortalSenseSupernatural (27598). It is not rolled for and not chosen: an Arch Mortal
	// simply has it, at 20% on reaching 11th and 20 more each title after, ending at his own 99.
	//
	// His sheet writes the figure straight into the 11th-title class skill slot, which is where
	// every class keeps Sense Supernatural. Here it is a skill item like any other, created if the
	// character has none and set to the title's figure either way. The figure is his ABILITY, so
	// it goes to abilityBonus and the character's attributes still contribute the base chance.
	async function applyArchMortalSense(tmpactor, tmpgains) {
		if (!tmpgains?.senseSupernatural) { return 0; }

		var tmpheld = tmpactor.items.find(tmpitem => tmpitem.type == "skill"
			&& tmpitem.name == "Sense Supernatural");
		if (tmpheld) {
			await tmpheld.update({ "system.abilityBonus": tmpgains.senseSupernatural });
			return tmpgains.senseSupernatural;
		}

		// The compendium copy where there is one, so the skill carries its own description,
		// sourcebook and type rather than a stub. Its attributes are "Special" in his skilldict
		// -- this skill has no attribute base at all -- so the ability IS the whole chance.
		var tmpdoc = null;
		var tmppack = game.packs.get("world.imagine-skills");
		if (tmppack) {
			var tmpindex = (await tmppack.getDocuments())
				.find(tmpcandidate => tmpcandidate.name == "Sense Supernatural");
			tmpdoc = tmpindex ? tmpindex.toObject() : null;
		}

		await tmpactor.createEmbeddedDocuments("Item", [{
			name: "Sense Supernatural",
			type: "skill",
			img: tmpdoc?.img,
			system: {
				...foundry.utils.deepClone(tmpdoc?.system ?? { attr1: "Special", attr2: "Special", skillRating: 0 }),
				category: "class", acquiredAtTitle: 11, startingBonus: 0,
				abilityBonus: tmpgains.senseSupernatural, misc: 0, isCommon: false
			}
		}]);
		return tmpgains.senseSupernatural;
	}

// @MARKER ADD NEW advancement functions HERE
// @END (CODE)
