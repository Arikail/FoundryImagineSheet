// @START (CODE)
// @MARKER ITEM DIRECTORY
//==================================================================================================================
// Fills Foundry's Items sidebar with the system's content, in folders.
//
// The compendia remain the system's own copy and are what the importer maintains; this puts a
// working set in the world where a Game Master can see it, search it and drag from it. Daryl
// asked for it on 2026-09-21 after finding the sidebar empty, and it is the right answer to that:
// a compendium is a library, and a library you have to go and open is not where you reach for a
// sword mid-session.
//
// GROUPED THE WAY HIS OWN DATA GROUPS THINGS, where it groups them at all:
//
//     Weapons        his `type` -- Blade, Axe, Bludgeon, Pick, Piercer, Missile, Explosive, Special
//     Armour         shields first, then his flexibility classes
//     Skills         his class/social split, then the sourcebook each came from
//     Classes        his classType -- Warrior subclass, Mage subclass and the rest
//
// Equipment, races, abilities, disabilities and immunities have NO category in his tables: his
// equipment dictionary is a name and a weight and nothing else. Those are bucketed by initial
// letter instead, which is a way of finding things rather than a claim about the game, and is
// labelled as such below so nobody mistakes an A-C folder for one of his categories.
//==================================================================================================================

const SOURCE_PATH = "systems/imagine-rpg/src/packs/documents";

// Items are created in batches. One call with four thousand documents in it makes Foundry
// unresponsive for the duration and gives no sign of progress; this way the notification can move.
const BATCH = 250;

// @MARKER THE SHAPE OF THE DIRECTORY
// Each entry is one top-level folder. `group` returns the subfolder a document belongs in, or ""
// for none. `order` fixes the subfolder order where his data has a natural one; anything not named
// sorts alphabetically after those that are.
const DIRECTORY = [
	{
		file: "weapons", folder: "Weapons",
		// His own column. Blade, Axe and Bludgeon first because that is the order his weapon
		// tables run in, and the order a player thinks in.
		order: ["Blade", "Axe", "Bludgeon", "Pick", "Piercer", "Missile", "Explosive", "Special"],
		// Missile is 408 of the 594 weapons and would be a folder nobody could use, so it splits
		// again -- and his data says how. A weapon with NO SPEED OF ITS OWN is ammunition: an arrow
		// is loosed, not swung, and he gives it no swing. That is 317 of the 408. Each of those
		// names its launcher in its own brackets -- "Arrow(Long Bow/Normal)" -- which is both his
		// grouping and the question a player actually asks: what fits my bow? The 91 that do have a
		// speed are the bows, crossbows and thrown weapons themselves.
		group: (tmpdoc) => {
			var tmptype = tmpdoc.system?.type || "Other";
			if (tmptype != "Missile") { return tmptype; }
			if (tmpdoc.system?.speed) { return "Missile/Launchers and thrown"; }
			var tmpfor = ("" + tmpdoc.name).match(/^[^(]+\(([^/)]+)/);
			return "Missile/" + (tmpfor ? tmpfor[1].trim() : "Unstated launcher");
		}
	},
	{
		file: "armor", folder: "Armour",
		order: ["Shields", "Clothing", "Flexible", "Semi-Flexible", "Rigid",
		        "Rigid/Flexible", "Rigid/Semi-Flexible", "Rigid/Rigid", "Mixed"],
		// A shield is armour with a flag rather than a flexibility of its own, and is what a
		// player looks for by name, so it gets the first folder.
		group: (tmpdoc) => tmpdoc.system?.isShield ? "Shields" : (tmpdoc.system?.flexibility || "Other")
	},
	{
		file: "skills", folder: "Skills",
		order: ["Class skills", "Social skills"],
		// Two levels: his category, then the book it came from. Skills are the one pack where
		// the sourcebook is filled in throughout, and which book a skill is from is exactly the
		// question a Game Master running one campaign asks about it.
		// "?" is his own placeholder sourcebook, carried by Open Slot and Unavailable -- the two
		// entries in his dictionary that are slot markers rather than skills. A folder called "?"
		// says nothing; they go in with the genuinely unattributed.
		group: (tmpdoc) => {
			var tmpbook = tmpdoc.system?.sourcebook;
			if (!tmpbook || tmpbook == "?") { tmpbook = "Unattributed"; }
			return (tmpdoc.system?.category == "social" ? "Social skills" : "Class skills") + "/" + tmpbook;
		}
	},
	{
		file: "classes", folder: "Classes",
		order: ["Primary class"],
		// Beguiler's classType holds its whole 264-character description -- his description has
		// landed in the wrong column (UPSTREAM-ISSUES item 44). Anything that long is not a
		// category name and would make a folder titled with a paragraph, so it goes to Other.
		group: (tmpdoc) => {
			var tmpkind = "" + (tmpdoc.system?.classType || "Other");
			return tmpkind.length > 40 ? "Other" : tmpkind;
		}
	},
	{ file: "races",        folder: "Races",        group: byLetter },
	{ file: "equipment",    folder: "Equipment",    group: byLetter },
	{ file: "abilities",    folder: "Abilities",    group: byLetter },
	{ file: "disabilities", folder: "Disabilities", group: byLetter },
	{ file: "immunities",   folder: "Immunities",   group: byLetter }
];

// The letter buckets, for the packs his tables give no category at all. Three letters to a folder
// so a pack of 1,154 abilities lands around a hundred per folder rather than four hundred under S.
const LETTER_BUCKETS = ["A-C", "D-F", "G-I", "J-L", "M-O", "P-R", "S-U", "V-Z"];

function byLetter(tmpdoc) {
	var tmpfirst = ("" + (tmpdoc.name ?? "")).trim().charAt(0).toUpperCase();
	if (!tmpfirst || tmpfirst < "A" || tmpfirst > "Z") { return "Other"; }
	return LETTER_BUCKETS[Math.min(LETTER_BUCKETS.length - 1,
		Math.floor((tmpfirst.charCodeAt(0) - 65) / 3))];
}

	// This is the function which reads one document file shipped with the system.
	async function loadContentFile(tmpname) {
		var tmpresponse = await fetch(`${SOURCE_PATH}/${tmpname}.json`);
		if (!tmpresponse.ok) {
			throw new Error(`Imagine RPG | could not read ${tmpname}.json (${tmpresponse.status})`);
		}
		return await tmpresponse.json();
	}

	// This is the function which finds or makes one folder, by name and parent. Foundry allows two
	// folders of the same name in different places, so the parent is part of the identity -- the
	// "A-C" under Equipment must not be confused with the "A-C" under Abilities.
	async function ensureFolder(tmpname, tmpparent, tmpsort) {
		var tmpexisting = game.folders.find(tmpfolder => tmpfolder.type == "Item"
			&& tmpfolder.name == tmpname
			&& (tmpfolder.folder?.id ?? null) == (tmpparent?.id ?? null));
		if (tmpexisting) { return tmpexisting; }
		return await Folder.create({
			name: tmpname, type: "Item", folder: tmpparent?.id ?? null, sort: tmpsort ?? 0
		});
	}

	// @MARKER POPULATE
	// This is the function which fills the sidebar.
	//
	// Idempotent, like the compendium import: an item already in its folder is left alone rather
	// than duplicated, so this can be run again after the content is rebuilt and only the new
	// entries appear. It does NOT update what is already there -- a Game Master who has edited a
	// world item meant to, and a refresh that silently reverted their work would be a poor trade
	// for saving them a delete.
	export async function populateItemDirectory({ notify = true } = {}) {
		if (!game.user.isGM) {
			ui.notifications.warn("Only the Game Master can fill the Items directory.");
			return { created: 0, skipped: 0 };
		}

		var tmpcreated = 0;
		var tmpskipped = 0;
		if (notify) { ui.notifications.info("Imagine RPG | filling the Items directory, this takes a moment..."); }

		for (const tmpentry of DIRECTORY) {
			var tmpdocs = await loadContentFile(tmpentry.file);
			var tmproot = await ensureFolder(tmpentry.folder, null, DIRECTORY.indexOf(tmpentry) * 100000);

			// Everything already in this tree, by folder id and name, so nothing is added twice.
			var tmpseen = new Set(game.items
				.filter(tmpitem => tmpitem.folder)
				.map(tmpitem => `${tmpitem.folder.id}::${tmpitem.name}`));

			// Group first, so each folder is made once rather than once per document.
			var tmpbygroup = {};
			for (const tmpdoc of tmpdocs) {
				var tmpkey = tmpentry.group ? (tmpentry.group(tmpdoc) || "") : "";
				(tmpbygroup[tmpkey] ??= []).push(tmpdoc);
			}

			var tmpfolders = Object.keys(tmpbygroup).sort((a, b) => {
				var tmpa = (tmpentry.order ?? []).indexOf(a.split("/")[0]);
				var tmpb = (tmpentry.order ?? []).indexOf(b.split("/")[0]);
				if (tmpa != tmpb) { return (tmpa < 0 ? 999 : tmpa) - (tmpb < 0 ? 999 : tmpb); }
				return a.localeCompare(b);
			});

			var tmptocreate = [];
			for (const tmpkey of tmpfolders) {
				// A group may be two levels deep -- "Class skills/Player's Guide".
				var tmpfolder = tmproot;
				var tmpdepth = 0;
				for (const tmppart of tmpkey.split("/").filter(tmppart => tmppart)) {
					tmpfolder = await ensureFolder(tmppart, tmpfolder, tmpfolders.indexOf(tmpkey) * 1000 + tmpdepth);
					tmpdepth += 1;
				}
				for (const tmpdoc of tmpbygroup[tmpkey]) {
					if (tmpseen.has(`${tmpfolder.id}::${tmpdoc.name}`)) { tmpskipped += 1; continue; }
					tmptocreate.push({ ...tmpdoc, folder: tmpfolder.id });
				}
			}

			for (var tmpat = 0; tmpat < tmptocreate.length; tmpat += BATCH) {
				await Item.createDocuments(tmptocreate.slice(tmpat, tmpat + BATCH), { keepId: false });
			}
			tmpcreated += tmptocreate.length;
			console.log(`Imagine RPG | ${tmpentry.folder}: ${tmptocreate.length} created`);
		}

		if (notify) {
			ui.notifications.info(tmpskipped
				? `Imagine RPG | Items directory filled: ${tmpcreated} added, ${tmpskipped} already there.`
				: `Imagine RPG | Items directory filled: ${tmpcreated} items.`);
		}
		return { created: tmpcreated, skipped: tmpskipped };
	}

	// @MARKER EMPTY
	// This is the function which takes it all out again, for a Game Master who tried it and would
	// rather have their sidebar back. Only the folders this made and what is inside them: an item
	// filed somewhere else, or made by hand, is not touched.
	export async function clearItemDirectory({ notify = true } = {}) {
		if (!game.user.isGM) {
			ui.notifications.warn("Only the Game Master can empty the Items directory.");
			return { removed: 0 };
		}
		var tmproots = game.folders.filter(tmpfolder => tmpfolder.type == "Item" && !tmpfolder.folder
			&& DIRECTORY.some(tmpentry => tmpentry.folder == tmpfolder.name));
		var tmpremoved = 0;
		for (const tmpfolder of tmproots) {
			tmpremoved += tmpfolder.contents?.length ?? 0;
			// deleteSubfolders takes the whole tree; deleteContents takes the items in it.
			await tmpfolder.delete({ deleteSubfolders: true, deleteContents: true });
		}
		if (notify) { ui.notifications.info(`Imagine RPG | removed ${tmproots.length} folder tree(s).`); }
		return { removed: tmpremoved };
	}

// @MARKER ADD NEW item-directory functions HERE
// @END (CODE)
