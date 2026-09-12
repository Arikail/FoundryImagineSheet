// @START (CODE)
// @MARKER CREATURE ATTACK
//==================================================================================================================
// Rolling one of a creature's natural attacks, and writing it to chat.
//
// The thin Foundry layer over combat/creature-rules.mjs, in the same shape as combat/attack.mjs
// is over combat-rules.mjs: this asks how the attack is being made, rolls the dice, and renders
// the card. Every rule it applies lives in the pure module.
//
// The card carries the same "attack" flag a weapon attack does, so the Apply Damage and Spend
// Seconds buttons already wired by registerAttackCardListeners work on it unchanged.
//==================================================================================================================

import { resolveAttack, resolveFumble } from "./combat-rules.mjs";
import {
	getCreatureAttackBehaviour, getAreaAttackSize, resolveTouchAttack,
	getCreatureToHitModifiers, getCreatureDamageMods, getTriggeredEffects
} from "./creature-rules.mjs";

	// This is the function which rolls a single die and returns the number.
	async function rollDie(tmpformula) {
		var tmproll = await new Roll(tmpformula).evaluate();
		return tmproll.total;
	}

	// This is the function which escapes text for chat. Item and actor names are editable, so
	// they never go into markup raw.
	function esc(tmptext) {
		return foundry.utils.escapeHTML(String(tmptext ?? ""));
	}

	// This is the function which finds an actor's combatant in the current combat, if any.
	function findCombatant(tmpactor) {
		if (!game.combat || !tmpactor) { return null; }
		for (const tmpcombatant of game.combat.combatants) {
			if (tmpcombatant.actor?.id == tmpactor.id) { return tmpcombatant; }
		}
		return null;
	}


// @MARKER ATTACK DIALOG

	// This is the function which asks how the attack is being made. A creature's attack has one
	// type rather than a choice of modes, so this asks only what varies: where it is aimed, any
	// situational modifier, whether a called shot is declared, and whether the target is able to
	// avoid it. Returns null if cancelled.
	async function askCreatureAttackOptions(tmpactor, tmpattack, tmptarget) {
		var tmpbehaviour = getCreatureAttackBehaviour(tmpattack.system.attackType);
		var tmpareas = tmptarget?.actor?.system?.body?.areas ?? [];
		var tmpaim = tmpareas.length
			? tmpareas.map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("")
			: `<option value="">(no target selected)</option>`;

		// An attack that hits without a roll cannot be aimed or called.
		var tmpisauto = tmpbehaviour.resolve == "auto";

		var tmpcontent = `
			<div class="imagine-attack-dialog">
				<p class="hint">${esc(tmpattack.name)} &mdash; ${esc(tmpattack.system.attackType)}${tmpisauto
					? ": this hits without a roll." : ""}</p>
				<div class="form-group"><label>Aimed at</label><select name="aim">${tmpaim}</select></div>
				<div class="form-group"><label>Situational modifier</label>
					<input type="number" name="situational" value="0"></div>
				<div class="form-group"><label>Situational damage</label>
					<input type="number" name="situationalDamage" value="0"></div>
				${tmpisauto ? "" : `<div class="form-group"><label>Called shot</label>
					<input type="checkbox" name="calledShot">
					<p class="hint">Needs an unmodified roll of 21 minus the attack skill level, takes one
					more second and does half damage whether it lands or not.</p></div>`}
				${(tmptarget && !tmpisauto) ? `<div class="form-group"><label>Target is avoiding the blow</label>
					<input type="checkbox" name="useDefense" checked>
					<p class="hint">Applies ${esc(tmptarget.name)}'s defensive adjustment. Untick if they
					are held, surprised or otherwise cannot move.</p></div>` : ""}
			</div>`;

		return await foundry.applications.api.DialogV2.prompt({
			window: { title: `${tmpattack.name} — Attack` },
			content: tmpcontent,
			rejectClose: false,
			ok: {
				label: "Attack",
				callback: (event, button) => {
					var tmpform = button.form.elements;
					return {
						aim: tmpform.aim ? tmpform.aim.value : "",
						situational: parseInt(tmpform.situational.value) || 0,
						situationalDamage: parseInt(tmpform.situationalDamage.value) || 0,
						calledShot: tmpform.calledShot ? tmpform.calledShot.checked : false,
						useDefense: tmpform.useDefense ? tmpform.useDefense.checked : false
					};
				}
			}
		});
	}


// @MARKER ATTACK ROLL

// This is the function which makes one of a creature's natural attacks and writes it to chat.
export async function rollCreatureAttack(tmpactor, tmpattackitem) {
	var tmptargets = Array.from(game.user.targets);
	var tmptarget = tmptargets.length == 1 ? tmptargets[0] : null;
	if (tmptargets.length > 1) {
		ui.notifications.info("Several tokens are targeted; attacking without a target's defence. Target one to include it.");
	}

	var tmpoptions = await askCreatureAttackOptions(tmpactor, tmpattackitem, tmptarget);
	if (!tmpoptions) { return null; }

	var tmpsys = tmpactor.system;
	var tmpa = tmpattackitem.system;
	var tmpbehaviour = getCreatureAttackBehaviour(tmpa.attackType);

	// To hit.
	var tmpmods = getCreatureToHitModifiers({
		mods: tmpbehaviour.mods,
		attacker: {
			meleeAttack: tmpsys.combat.meleeAttack,
			missileAttack: tmpsys.combat.missileAttack,
			meleeMisc: tmpsys.combat.meleeMisc,
			missileMisc: tmpsys.combat.missileMisc
		},
		target: (tmptarget && tmpoptions.useDefense) ? { defensiveAdjust: tmptarget.actor?.system?.combat?.defensiveAdjust } : null,
		situational: tmpoptions.situational
	});

	// The roll, in whichever of the three ways this type resolves.
	var tmprolls = [];
	var tmpresult = null;
	var tmptouch = null;

	if (tmpbehaviour.resolve == "auto") {
		// Direct, Gaze and Voice need no roll at all. The zone is named for what it is rather
		// than borrowed from the chart, so the card does not claim a centre hit it never rolled.
		tmpresult = {
			natural: 0, final: 0, skill: tmpsys.combat.attackSkill,
			zone: tmpa.attackType, isHit: true, isFumble: false,
			calledShotDeclared: false, isCalledShot: false
		};
	} else if (tmpbehaviour.resolve == "touch") {
		var tmptouchd20 = await new Roll("1d20").evaluate();
		tmprolls.push(tmptouchd20);
		tmptouch = resolveTouchAttack(tmptouchd20.total, tmpmods.total);
		tmpresult = {
			natural: tmptouch.natural, final: tmptouch.total, skill: tmpsys.combat.attackSkill,
			zone: tmptouch.touched ? "Touched" : "Missed", isHit: tmptouch.touched, isFumble: false,
			calledShotDeclared: false, isCalledShot: false
		};
	} else {
		var tmpd20 = await new Roll("1d20").evaluate();
		tmprolls.push(tmpd20);
		tmpresult = resolveAttack({
			natural: tmpd20.total,
			mods: tmpmods.total,
			skill: tmpsys.combat.attackSkill,
			calledShot: tmpoptions.calledShot
		});
	}

	// How long it takes. A creature's attack carries its own seconds; there is no weapon speed
	// modifier to fold in. A called shot takes one more second (Player's Guide, Called Shots).
	var tmpspeed = tmpa.speedSpecial ? 0 : (parseInt(tmpa.speed) || 0);
	if (tmpoptions.calledShot && !tmpa.speedSpecial) { tmpspeed = tmpspeed + 1; }

	// A fumble, on the same three tiers a weapon attack uses.
	var tmpfumble = null;
	if (tmpresult.isFumble) {
		tmpfumble = resolveFumble(tmpsys.attributes.agl.save, tmpbehaviour.mods == "missile", {
			saveRoll: await rollDie("1d100"),
			recoveryRoll: await rollDie("1d4"),
			severityRoll: await rollDie("1d100"),
			effectRoll: await rollDie(tmpbehaviour.mods == "missile" ? "1d6" : "1d20")
		});
	}

	// The area an attack of this shape covers, sized from the creature's own Endurance.
	var tmpshape = null;
	if (tmpbehaviour.shape) {
		var tmpconedice = tmpbehaviour.shape == "cone" ? await rollDie("1d4") : 0;
		tmpshape = getAreaAttackSize(tmpbehaviour.shape, tmpbehaviour.tier,
			tmpsys.characteristics.endurance.value, tmpconedice);
	}

	// Damage.
	//
	// A called shot does half whether or not it is made, as for a character. His creature path
	// does not halve it, though his character path and the book both do -- recorded in
	// docs/UPSTREAM-ISSUES.md item 15 -- and the two actor types are kept consistent here.
	var tmpdamage = null;
	if (tmpresult.isHit && tmpa.damage) {
		var tmpdammods = getCreatureDamageMods({
			damageMisc: tmpsys.combat.damageMisc,
			situational: tmpoptions.situationalDamage
		});

		var tmpdmgroll = await new Roll(`${tmpa.damage} + @mods`, { mods: tmpdammods.total }).evaluate();
		tmprolls.push(tmpdmgroll);

		var tmpmulti = tmpoptions.calledShot ? 0.5 : 1;
		var tmptotal = Math.max(0, parseInt(tmpdmgroll.total * tmpmulti) || 0);

		tmpdamage = {
			dice: tmpa.damage, str: 0, magic: 0, misc: tmpdammods.total,
			rolled: tmpdmgroll.total, multiplier: tmpmulti, total: tmptotal,
			type: tmpa.damageType || "Other"
		};
	}

	// Which rider effects this result sets off.
	var tmpeffects = getTriggeredEffects(tmpa.effects, {
		isHit: tmpresult.isHit,
		isCalledShot: tmpresult.isCalledShot,
		damageTotal: tmpdamage ? tmpdamage.total : 0
	});

	// The chat card. Same flag shape as a weapon attack, so Apply Damage and Spend Seconds work.
	var tmpattack = {
		attackerUuid: tmpactor.uuid,
		weapon: tmpattackitem.name,
		mode: tmpa.attackType,
		aim: tmpoptions.aim,
		targetUuid: tmptarget?.actor?.uuid ?? null,
		targetName: tmptarget?.name ?? null,
		result: tmpresult,
		mods: tmpmods,
		speed: tmpspeed,
		fumble: tmpfumble,
		damage: tmpdamage,
		applied: false
	};

	var tmphtml = await foundry.applications.handlebars.renderTemplate(
		"systems/imagine-rpg/templates/chat/creature-attack-card.hbs",
		{
			...tmpattack,
			actorName: tmpactor.name,
			attackType: tmpa.attackType,
			speedSpecial: tmpa.speedSpecial,
			shape: tmpshape,
			effects: tmpeffects,
			resolveKind: tmpbehaviour.resolve,
			inCombat: !!findCombatant(tmpactor)
		});

	return await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: tmpactor }),
		content: tmphtml,
		rolls: tmprolls,
		flags: { "imagine-rpg": { attack: tmpattack } }
	});
}
// @END (CODE)
