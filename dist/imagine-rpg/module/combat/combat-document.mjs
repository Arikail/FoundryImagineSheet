// @START (CODE)
// @MARKER IMAGINE COMBAT
//==================================================================================================================
// The combat tracker, adapted to the 10 second round.
//
// In Imagine, initiative is not a place in a queue -- it is the SECOND of the round in which a
// combatant starts acting, rolled on a d10 with Agility or Intelligence modifying it. Lower is
// earlier. So the tracker sorts lowest first, which is the reverse of Foundry's default.
//
// Every action then costs time: a swing takes as many seconds as the weapon's speed. Spending
// seconds moves a combatant later in the round by that much, and the tracker re-sorts, so whoever
// has the earliest free second is always at the top. That is the event-time round -- built from
// the tracker Foundry already has, rather than a separate clock.
//
// When every combatant is past the tenth second the round is over, and a new one begins with fresh
// initiative, as the Player's Guide describes.
//
// NOT YET AUTOMATED: carry-over. An action still under way when the round ends can be carried
// into the next one, with new initiative rolled when it finishes and added to the seconds it ran
// over (Player's Guide, Carry-Over). For now the Game Master adjusts the initiative by hand.
//==================================================================================================================

export default class ImagineCombat extends Combat {

	// This is the function which orders the tracker: earliest second first. On a tie, the higher
	// Agility goes first, and if that is tied too, the higher Intelligence (Player's Guide,
	// Initiative). Anyone who has not rolled goes to the bottom.
	_sortCombatants(tmpa, tmpb) {
		var tmpia = Number.isFinite(tmpa.initiative) ? tmpa.initiative : Infinity;
		var tmpib = Number.isFinite(tmpb.initiative) ? tmpb.initiative : Infinity;
		if (tmpia != tmpib) { return tmpia - tmpib; }

		var tmpagla = tmpa.actor?.system?.attributes?.agl?.value ?? 0;
		var tmpaglb = tmpb.actor?.system?.attributes?.agl?.value ?? 0;
		if (tmpagla != tmpaglb) { return tmpaglb - tmpagla; }

		var tmpinta = tmpa.actor?.system?.attributes?.int?.value ?? 0;
		var tmpintb = tmpb.actor?.system?.attributes?.int?.value ?? 0;
		if (tmpinta != tmpintb) { return tmpintb - tmpinta; }

		return tmpa.id > tmpb.id ? 1 : -1;
	}

	// This is the function which spends a combatant's time. Their initiative moves on by that many
	// seconds and the tracker jumps back to the top, which is now whoever is free soonest.
	async spendSeconds(tmpcombatant, tmpseconds) {
		var tmpnow = Number.isFinite(tmpcombatant.initiative) ? tmpcombatant.initiative : 1;
		// Nobody acts before second 1; a negative initiative only decides order within it.
		var tmpstart = Math.max(1, tmpnow);
		await tmpcombatant.update({ initiative: tmpstart + (parseInt(tmpseconds) || 0) });
		await this.update({ turn: 0 });

		var tmpnext = this.turns[0];
		if (tmpnext && Number.isFinite(tmpnext.initiative) && tmpnext.initiative > 10) {
			ui.notifications.info("Every combatant is past the tenth second. The round is over.");
		}
	}

	// This is the function which starts a new round with fresh initiative for everyone.
	async nextRound() {
		await this.resetAll();
		var tmpresult = await super.nextRound();
		await this.rollAll();
		await this.update({ turn: 0 });
		return tmpresult;
	}
}
// @END (CODE)
