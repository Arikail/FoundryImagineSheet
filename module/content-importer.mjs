// @START (CODE)
// @MARKER CONTENT IMPORTER
//==================================================================================================================
// Builds the system's compendium packs at runtime from the JSON shipped in src/packs/documents/.
//
// The usual route is to compile packs at build time with Foundry's CLI, which needs Node and a
// toolchain. Doing it at runtime instead means the content can be rebuilt from inside Foundry
// by whoever is running the game, with nothing installed -- which matters while the underlying
// game is still being written and the data changes often.
//
// The import is idempotent. Re-running it updates documents that already exist and adds the
// ones that do not, matched by name, rather than piling up duplicates. That is the behaviour
// you want when the developer sends a corrected sheet and the content needs refreshing.
//==================================================================================================================

// Which JSON file feeds which pack, and what each pack holds.
const CONTENT_PACKS = [
	{ file: "skills",    pack: "skills",    label: "Imagine Skills",    type: "Item" },
	{ file: "races",     pack: "races",     label: "Imagine Races",     type: "Item" },
	{ file: "classes",   pack: "classes",   label: "Imagine Classes",   type: "Item" },
	{ file: "weapons",   pack: "weapons",   label: "Imagine Weapons",   type: "Item" },
	{ file: "armor",     pack: "armor",     label: "Imagine Armour",    type: "Item" },
	{ file: "equipment", pack: "equipment", label: "Imagine Equipment", type: "Item" }
];

const SOURCE_PATH = "systems/imagine-rpg/src/packs/documents";


	// This is the function which reads one document file shipped with the system.
	async function loadContentFile(tmpname) {
		var tmpresponse = await fetch(`${SOURCE_PATH}/${tmpname}.json`);
		if (!tmpresponse.ok) {
			throw new Error(`Imagine RPG | could not read ${tmpname}.json (${tmpresponse.status})`);
		}
		return await tmpresponse.json();
	}

	// This is the function which finds a system compendium, creating it if it is not there yet.
	async function ensurePack(tmpdefinition) {
		var tmpid = `world.imagine-${tmpdefinition.pack}`;
		var tmppack = game.packs.get(tmpid);
		if (tmppack) { return tmppack; }

		return await foundry.documents.collections.CompendiumCollection.createCompendium({
			label: tmpdefinition.label,
			name: `imagine-${tmpdefinition.pack}`,
			type: tmpdefinition.type,
			package: "world"
		});
	}

	// This is the function which brings one pack in line with its source file.
	//
	// Existing documents are matched by name and updated in place, so anything a Game Master
	// has already dragged onto a character keeps pointing at the same document rather than
	// being orphaned by a wholesale delete and recreate.
	async function importPack(tmpdefinition) {
		var tmpdocs = await loadContentFile(tmpdefinition.file);
		var tmppack = await ensurePack(tmpdefinition);

		var tmpwaslocked = tmppack.locked;
		if (tmpwaslocked) { await tmppack.configure({ locked: false }); }

		var tmpindex = await tmppack.getIndex();
		var tmpexisting = new Map();
		for (const tmpentry of tmpindex) { tmpexisting.set(tmpentry.name, tmpentry._id); }

		var tmptocreate = [];
		var tmptoupdate = [];
		for (const tmpdoc of tmpdocs) {
			var tmpid = tmpexisting.get(tmpdoc.name);
			if (tmpid) {
				tmptoupdate.push({ _id: tmpid, type: tmpdoc.type, system: tmpdoc.system });
			} else {
				tmptocreate.push(tmpdoc);
			}
		}

		if (tmptocreate.length) {
			await Item.createDocuments(tmptocreate, { pack: tmppack.collection, keepId: false });
		}
		if (tmptoupdate.length) {
			await Item.updateDocuments(tmptoupdate, { pack: tmppack.collection });
		}

		if (tmpwaslocked) { await tmppack.configure({ locked: true }); }

		return { created: tmptocreate.length, updated: tmptoupdate.length, total: tmpdocs.length };
	}


// @MARKER PUBLIC ENTRY POINT

// This is the function which rebuilds every content pack, reporting progress as it goes.
// Game Master only -- it writes to world compendiums.
export async function importAllContent({ notify = true } = {}) {
	if (!game.user.isGM) {
		ui.notifications.warn("Only a Game Master can import Imagine content.");
		return null;
	}

	var tmpresults = [];
	var tmpfailed = [];

	for (const tmpdefinition of CONTENT_PACKS) {
		try {
			if (notify) {
				ui.notifications.info(`Imagine RPG | importing ${tmpdefinition.label}...`);
			}
			var tmpresult = await importPack(tmpdefinition);
			tmpresults.push({ label: tmpdefinition.label, ...tmpresult });
			console.log(`Imagine RPG | ${tmpdefinition.label}: `
				+ `${tmpresult.created} created, ${tmpresult.updated} updated`);
		} catch (err) {
			// One bad file should not abandon the rest of the import half-done.
			console.error(`Imagine RPG | failed importing ${tmpdefinition.label}`, err);
			tmpfailed.push({ label: tmpdefinition.label, error: err.message });
		}
	}

	var tmptotal = tmpresults.reduce((sum, r) => sum + r.total, 0);
	if (notify) {
		if (tmpfailed.length) {
			ui.notifications.error(
				`Imagine RPG | imported ${tmptotal} documents, ${tmpfailed.length} pack(s) failed. See the console.`);
		} else {
			ui.notifications.info(`Imagine RPG | imported ${tmptotal} documents across ${tmpresults.length} packs.`);
		}
	}

	return { packs: tmpresults, failed: tmpfailed, total: tmptotal };
}

// @MARKER ADD NEW importer functions HERE
// @END (CODE)
