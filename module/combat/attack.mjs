// @START (CODE)
// @MARKER WEAPON ATTACKS
//==================================================================================================================
// The part of combat that talks to Foundry: asking how the attack is made, rolling it, writing it
// to chat, and applying the damage to whoever was hit.
//
// All of the arithmetic lives in combat-rules.mjs and is tested there. This file only gathers the
// inputs, rolls the dice, and records the results.
//
// The attack follows the Player's Guide's sequence: the attacker declares where they are aiming,
// rolls a d20, and the modified result read against their attack chart says whether the blow
// lands and where relative to the aim. A centre hit lands exactly where aimed. An off-centre hit
// lands on whatever area sits that way from the aim on the target -- which depends on the attack's
// motion and the target's shape, so the Game Master picks it when damage is applied, just as the
// original sheet left it to the table.
//==================================================================================================================

import {
	MELEE_MODES, MODE_DAMAGE_TYPES,
	resolveAttack, resolveFumble, getToHitModifiers,
	getWeaponDamageDice, getStrengthDamageMod, combineDamageMultipliers,
	resolveAreaDamage, applyAreaDamage, getWeaponSpeed
} from "./combat-rules.mjs";
import { ARMOR_BLOCKING } from "../combat-tables.mjs";

const MODE_LABELS = { thrust: "Thrust", cut: "Cut", smash: "Smash", missile: "Missile" };


	// This is the function which rolls a single die and returns the number, for the dice the rules
	// functions take as arguments.
	async function rollDie(tmpformula) {
		var tmproll = await new Roll(tmpformula).evaluate();
		return tmproll.total;
	}

	// This is the function which finds an actor's combatant in the current combat, if they have
	// one. Searches the combatants directly rather than relying on a lookup helper whose name has
	// changed between Foundry versions.
	function findCombatant(tmpactor) {
		if (!game.combat || !tmpactor) { return null; }
		for (const tmpcombatant of game.combat.combatants) {
			if (tmpcombatant.actor?.id == tmpactor.id) { return tmpcombatant; }
		}
		return null;
	}

	// This is the function which escapes text for safe inclusion in chat HTML. Item and actor
	// names are user-editable, so they are never put into markup raw.
	function esc(tmptext) {
		return foundry.utils.escapeHTML(String(tmptext ?? ""));
	}


// @MARKER ATTACK DIALOG

	// This is the function which asks how the attack is being made: which mode, where it is aimed,
	// whether it is a called shot, and any situational modifier. Returns null if cancelled.
	async function askAttackOptions(tmpweapon, tmptarget) {
		var tmpmodes = ["thrust", "cut", "smash", "missile"].filter(m => tmpweapon.system[m]?.available);
		if (!tmpmodes.length) {
			ui.notifications.warn(`${tmpweapon.name} has no attack modes.`);
			return null;
		}

		var tmpareas = tmptarget?.actor?.system?.body?.areas ?? [];
		var tmpaim = tmpareas.length
			? tmpareas.map(a => `<option value="${esc(a.name)}">${esc(a.name)}</option>`).join("")
			: `<option value="">(no target selected)</option>`;

		var tmpcontent = `
			<div class="imagine-attack-dialog">
				<div class="form-group"><label>Attack</label>
					<select name="mode">${tmpmodes.map(m =>
						`<option value="${m}">${MODE_LABELS[m]} (${tmpweapon.system[m].mod >= 0 ? "+" : ""}${tmpweapon.system[m].mod})</option>`).join("")}
					</select></div>
				<div class="form-group"><label>Aimed at</label><select name="aim">${tmpaim}</select></div>
				<div class="form-group"><label>Situational modifier</label>
					<input type="number" name="situational" value="0"></div>
				<div class="form-group"><label>Called shot</label>
					<input type="checkbox" name="calledShot">
					<p class="hint">Needs an unmodified roll of 21 minus your attack skill level, takes one more
					second and does half damage whether it lands or not.</p></div>
				${tmptarget ? `<div class="form-group"><label>Target is avoiding the blow</label>
					<input type="checkbox" name="useDefense" checked>
					<p class="hint">Applies ${esc(tmptarget.name)}'s defensive adjustment. Untick if they
					are held, surprised or otherwise cannot move.</p></div>` : ""}
			</div>`;

		return await foundry.applications.api.DialogV2.prompt({
			window: { title: `${tmpweapon.name} — Attack` },
			content: tmpcontent,
			rejectClose: false,
			ok: {
				label: "Attack",
				callback: (event, button) => {
					var tmpform = button.form.elements;
					return {
						mode: tmpform.mode.value,
						aim: tmpform.aim.value,
						situational: parseInt(tmpform.situational.value) || 0,
						calledShot: tmpform.calledShot.checked,
						useDefense: tmpform.useDefense ? tmpform.useDefense.checked : false
					};
				}
			}
		});
	}


// @MARKER ATTACK ROLL

// This is the function which makes a weapon attack and writes it to chat.
export async function rollWeaponAttack(tmpactor, tmpweapon) {
	var tmptargets = Array.from(game.user.targets);
	var tmptarget = tmptargets.length == 1 ? tmptargets[0] : null;
	if (tmptargets.length > 1) {
		ui.notifications.info("Several tokens are targeted; attacking without a target's defence. Target one to include it.");
	}

	var tmpoptions = await askAttackOptions(tmpweapon, tmptarget);
	if (!tmpoptions) { return null; }

	var tmpsys = tmpactor.system;
	var tmpw = tmpweapon.system;
	var tmpmode = tmpoptions.mode;

	// To hit
	var tmpmods = getToHitModifiers({
		mode: tmpmode,
		weapon: tmpw,
		attacker: {
			meleeAttack: tmpsys.combat.meleeAttack,
			missileAttack: tmpsys.combat.missileAttack,
			meleeMisc: tmpsys.combat.meleeMisc,
			missileMisc: tmpsys.combat.missileMisc
		},
		target: (tmptarget && tmpoptions.useDefense) ? { defensiveAdjust: tmptarget.actor?.system?.combat?.defensiveAdjust } : null,
		situational: tmpoptions.situational
	});

	var tmpd20 = await new Roll("1d20").evaluate();
	var tmpresult = resolveAttack({
		natural: tmpd20.total,
		mods: tmpmods.total,
		skill: tmpsys.combat.attackSkill,
		calledShot: tmpoptions.calledShot
	});

	// Time. A called shot takes one more second (Player's Guide, Called Shots).
	var tmpspeed = getWeaponSpeed(tmpw.speed, tmpw.minSpeed, tmpsys.combat.weaponSpeedMod);
	if (tmpoptions.calledShot) { tmpspeed = tmpspeed + 1; }

	// A fumble
	var tmpfumble = null;
	if (tmpresult.isFumble) {
		tmpfumble = resolveFumble(tmpsys.attributes.agl.save, tmpmode == "missile", {
			saveRoll: await rollDie("1d100"),
			recoveryRoll: await rollDie("1d4"),
			severityRoll: await rollDie("1d100"),
			effectRoll: await rollDie(tmpmode == "missile" ? "1d6" : "1d20"),
			// His critical fumble table, rolled up front so the rules stay free of dice.
			criticalRoll: await rollDie("1d100"),
			variantRoll: await rollDie("1d100"),
			standRoll: await rollDie("1d6"),
			throwRoll: await rollDie("1d20"),
			directionRoll: await rollDie("1d8"),
			stunRoll: await rollDie("1d3")
		});
	}

	// Damage. A called shot does half, whether or not it is made.
	var tmpdamage = null;
	var tmprolls = [tmpd20];
	if (tmpresult.isHit) {
		var tmpdice = getWeaponDamageDice(tmpw, tmpmode);
		var tmpstrmod = getStrengthDamageMod(tmpsys.combat.meleeDamage, tmpmode, tmpw.twoHanded);
		var tmpmagic = parseInt(tmpw.magicBonus) || 0;
		var tmpmisc = MELEE_MODES.includes(tmpmode) ? (parseInt(tmpsys.combat.damageMisc) || 0) : 0;

		var tmpdmgroll = await new Roll(`${tmpdice} + @str + @magic + @misc`,
			{ str: tmpstrmod, magic: tmpmagic, misc: tmpmisc }).evaluate();
		tmprolls.push(tmpdmgroll);

		var tmpmulti = combineDamageMultipliers(tmpoptions.calledShot ? [0.5] : []);
		var tmptotal = Math.max(0, parseInt(tmpdmgroll.total * tmpmulti) || 0);

		tmpdamage = {
			dice: tmpdice, str: tmpstrmod, magic: tmpmagic, misc: tmpmisc,
			rolled: tmpdmgroll.total, multiplier: tmpmulti, total: tmptotal,
			type: MODE_DAMAGE_TYPES[tmpmode]
		};
	}

	// The chat card
	var tmpattack = {
		attackerUuid: tmpactor.uuid,
		weapon: tmpweapon.name,
		mode: tmpmode,
		aim: tmpoptions.aim,
		targetUuid: tmptarget?.actor?.uuid ?? null,
		targetName: tmptarget?.name ?? null,
		result: tmpresult,
		mods: tmpmods,
		speed: tmpspeed,
		fumble: tmpfumble,
		damage: tmpdamage,
		// Once set, the Apply Damage button stops offering itself, so a hit cannot be applied twice.
		applied: false
	};

	var tmphtml = await foundry.applications.handlebars.renderTemplate(
		"systems/imagine-rpg/templates/chat/attack-card.hbs",
		{ ...tmpattack, modeLabel: MODE_LABELS[tmpmode], actorName: tmpactor.name, inCombat: !!findCombatant(tmpactor) });

	return await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: tmpactor }),
		content: tmphtml,
		rolls: tmprolls,
		flags: { "imagine-rpg": { attack: tmpattack } }
	});
}


// @MARKER DAMAGE APPLICATION

	// This is the function which asks where the blow landed and what kind of damage it is.
	async function askDamageOptions(tmptargetactor, tmpattack) {
		var tmpareas = tmptargetactor.system.body?.areas ?? [];
		if (!tmpareas.length) {
			ui.notifications.warn(`${tmptargetactor.name} has no body areas to damage.`);
			return null;
		}
		var tmpcentre = tmpattack.result.zone == "Hit(Center)";
		var tmpdefault = tmpcentre ? tmpattack.aim : "";
		var tmpareahint = tmpcentre
			? `A centre hit: it lands where it was aimed (${esc(tmpattack.aim)}).`
			: `An off-centre hit, <strong>${esc(tmpattack.result.zone.replace("Hit(", "").replace(")", ""))}</strong> of
			   where it was aimed (${esc(tmpattack.aim) || "no aim declared"}). Pick the area that sits that way on the target.`;

		var tmpcontent = `
			<div class="imagine-damage-dialog">
				<p>${tmpareahint}</p>
				<div class="form-group"><label>Area struck</label>
					<select name="area">${tmpareas.map(a =>
						`<option value="${esc(a.name)}" ${a.name == tmpdefault ? "selected" : ""}>${esc(a.name)} (armour ${a.armor})</option>`).join("")}
					</select></div>
				<div class="form-group"><label>Damage type</label>
					<select name="type">${Object.keys(ARMOR_BLOCKING).map(t =>
						`<option value="${t}" ${t == tmpattack.damage.type ? "selected" : ""}>${t}</option>`).join("")}
					</select></div>
				<div class="form-group"><label>Bypasses armour</label><input type="checkbox" name="bypass">
					<p class="hint">For a called shot that goes through a gap, or damage armour cannot stop.</p></div>
			</div>`;

		return await foundry.applications.api.DialogV2.prompt({
			window: { title: `Apply damage to ${tmptargetactor.name}` },
			content: tmpcontent,
			rejectClose: false,
			ok: {
				label: "Apply",
				callback: (event, button) => {
					var tmpform = button.form.elements;
					return { area: tmpform.area.value, type: tmpform.type.value, bypass: tmpform.bypass.checked };
				}
			}
		});
	}

// This is the function which applies an attack's damage to its target: through the armour at the
// struck area, onto the area's wounds, and reports what that means.
export async function applyAttackDamage(tmpmessage) {
	var tmpattack = tmpmessage.getFlag("imagine-rpg", "attack");
	if (!tmpattack?.damage) { return; }
	if (tmpattack.applied) {
		ui.notifications.warn("That damage has already been applied.");
		return;
	}

	var tmptargetactor = tmpattack.targetUuid ? await fromUuid(tmpattack.targetUuid) : null;
	if (!tmptargetactor) {
		var tmptargets = Array.from(game.user.targets);
		tmptargetactor = tmptargets.length == 1 ? tmptargets[0].actor : null;
	}
	if (!tmptargetactor) {
		ui.notifications.warn("Target the token that was hit, then apply the damage.");
		return;
	}
	if (!tmptargetactor.isOwner) {
		ui.notifications.warn(`You do not have permission to change ${tmptargetactor.name}. Ask the Game Master to apply it.`);
		return;
	}

	var tmpoptions = await askDamageOptions(tmptargetactor, tmpattack);
	if (!tmpoptions) { return; }

	var tmpsys = tmptargetactor.system;
	var tmparea = tmpsys.body.areas.find(a => a.name == tmpoptions.area);
	if (!tmparea) { return; }

	var tmpblow = resolveAreaDamage({
		damage: tmpattack.damage.total,
		type: tmpoptions.type,
		totalArmor: tmparea.armor,
		bypass: tmpoptions.bypass,
		hide: tmpsys.body.hide,
		material: tmparea.material,
		isMagicArmor: false
	});
	var tmpafter = applyAreaDamage({
		damage: tmpblow.net,
		areaWounds: tmparea.wounds,
		areaEndurance: tmparea.endurance,
		vitality: tmpsys.attributes.vit.value,
		totalWounds: tmpsys.body.totalWounds,
		shock: tmpsys.body.shock
	});

	var tmpupdate = {};
	tmpupdate[`system.body.wounds.${tmparea.name}`] = tmpafter.wounds;
	if (tmpblow.armorDamage > 0) {
		tmpupdate[`system.body.armorDamage.${tmparea.name}`] = tmparea.armorDamage + tmpblow.armorDamage;
	}
	await tmptargetactor.update(tmpupdate);

	var tmpnotes = [];
	if (tmpafter.effectTriggered) { tmpnotes.push(`<strong>${esc(tmparea.name)} is past Endurance plus Vitality: its effect is triggered.</strong>`); }
	else if (tmpafter.vitalitySaveNeeded) { tmpnotes.push(`${esc(tmparea.name)} is past its Endurance: a Vitality save is needed.`); }
	if (tmpafter.inShock) { tmpnotes.push(`<strong>${esc(tmptargetactor.name)} is in shock.</strong>`); }
	if (tmpblow.armorDamage > 0) { tmpnotes.push(`The armour there takes ${tmpblow.armorDamage} damage.`); }

	await ChatMessage.create({
		speaker: ChatMessage.getSpeaker({ actor: tmptargetactor }),
		content: `<div class="imagine-chat damage-result">
			<p><strong>${esc(tmptargetactor.name)}</strong> takes ${tmpattack.damage.total} ${esc(tmpoptions.type)}
			damage to the ${esc(tmparea.name)}${tmpoptions.bypass ? " (bypassing armour)" : ` (armour ${tmparea.armor})`}.</p>
			<p>${tmpblow.blocked} stopped, <strong>${tmpblow.net}</strong> through.
			Wounds there: ${tmpafter.wounds} / ${tmparea.endurance}.</p>
			${tmpnotes.map(n => `<p>${n}</p>`).join("")}
		</div>`
	});

	// Only the message's author or the Game Master may mark it. If someone else applied the
	// damage the mark cannot be written, and the button stays live -- so the Game Master should
	// be the one applying damage from other people's attacks.
	if (tmpmessage.isOwner) { await tmpmessage.setFlag("imagine-rpg", "attack.applied", true); }
}

// This is the function which spends the attack's seconds for the attacker, if they are fighting.
export async function spendAttackTime(tmpmessage) {
	var tmpattack = tmpmessage.getFlag("imagine-rpg", "attack");
	if (!tmpattack || !game.combat) { return; }
	var tmpactor = await fromUuid(tmpattack.attackerUuid);
	var tmpcombatant = findCombatant(tmpactor);
	if (!tmpcombatant) {
		ui.notifications.warn("The attacker is not in the current combat.");
		return;
	}
	if (!tmpcombatant.isOwner) { return; }
	await game.combat.spendSeconds(tmpcombatant, tmpattack.speed);
}

// This is the function which wires the chat card's buttons whenever an attack card is shown.
export function registerAttackCardListeners() {
	Hooks.on("renderChatMessageHTML", function (tmpmessage, tmphtml) {
		if (!tmpmessage.getFlag("imagine-rpg", "attack")) { return; }
		tmphtml.querySelector("[data-imagine-action='applyDamage']")
			?.addEventListener("click", () => applyAttackDamage(tmpmessage));
		tmphtml.querySelector("[data-imagine-action='spendTime']")
			?.addEventListener("click", () => spendAttackTime(tmpmessage));
	});
}
// @END (CODE)
