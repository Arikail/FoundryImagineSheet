// @START (CODE)
// @MARKER ITEM PICKER
//==================================================================================================================
// A searchable list of the system's own content, for putting a real item on a character.
//
// WHY THIS EXISTS. The system's content lives in COMPENDIA -- world.imagine-weapons and its eight
// siblings, built by the importer -- and nothing is ever put in Foundry's Items sidebar. That is
// deliberate: four and a half thousand documents in the sidebar would bury whatever a Game Master
// actually made themselves. But it left a dead end, which Daryl walked into on 2026-09-21: "the
// items menu is empty, so I can't add items to my character". The Items directory IS empty, and
// the Equipment tab's Add buttons made a blank "New Weapon" rather than offering the 594 real
// ones. Dragging out of an open compendium window was the only way to get a real item onto a
// character, and nothing said so.
//
// So the Add buttons open this instead. The blank item is still one click away, for homebrew.
//
// Availability is honoured: a weapon from a sourcebook the campaign has switched off does not
// appear, the same rule the character generator applies to races and classes.
//==================================================================================================================

import { explainAvailability } from "../availability.mjs";
import { applySheetTheme } from "../sheet-theme.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

// Which compendium each gear type is picked from, and how to name it on screen.
const PICKER_PACKS = {
	//  item type   compendium                    heading
	weapon:    { pack: "world.imagine-weapons",   label: "Weapon" },
	armor:     { pack: "world.imagine-armor",     label: "Armour" },
	equipment: { pack: "world.imagine-equipment", label: "Equipment" }
};

// Long lists are cut to this until a search narrows them. Nine hundred rows of armour render
// slowly and read worse; the count above the list always says how many matched in full.
const PICKER_SHOWN = 60;

export default class ImagineItemPicker extends HandlebarsApplicationMixin(ApplicationV2) {

	static DEFAULT_OPTIONS = {
		id: "imagine-item-picker",
		classes: ["imagine", "item-picker"],
		window: { title: "Imagine RPG — Add an item", resizable: true },
		position: { width: 560, height: 620 },
		actions: {
			pickItem:  ImagineItemPicker.#onPickItem,
			blankItem: ImagineItemPicker.#onBlankItem
		}
	};

	static PARTS = {
		body: { template: "systems/imagine-rpg/templates/apps/item-picker.hbs", scrollable: [".picker-body"] }
	};

	#actor = null;
	#type = "equipment";
	#search = "";
	#entries = null;

	constructor(tmpactor, tmptype, tmpoptions) {
		super(tmpoptions ?? {});
		this.#actor = tmpactor;
		this.#type = PICKER_PACKS[tmptype] ? tmptype : "equipment";
	}

	get title() {
		return `Add ${(PICKER_PACKS[this.#type]?.label ?? "Equipment").toLowerCase()} to ${this.#actor?.name ?? ""}`;
	}

	// @MARKER CONTENT
	// This is the function which loads the pack once, as plain index data rather than documents.
	// The index carries the name and the type, which is all the list needs; the document itself is
	// only fetched for the one entry actually picked. Loading 594 weapons as documents to show a
	// list of names would be slow for no gain.
	async #loadEntries() {
		if (this.#entries) { return this.#entries; }
		var tmpdefinition = PICKER_PACKS[this.#type];
		var tmppack = game.packs.get(tmpdefinition.pack);
		if (!tmppack) { this.#entries = []; return this.#entries; }

		var tmprules = game.imagine?.getAvailabilityRules?.() ?? null;
		var tmpindex = await tmppack.getIndex({ fields: ["system.sourcebook", "system.types"] });
		this.#entries = tmpindex
			.map(tmpentry => ({ id: tmpentry._id, name: tmpentry.name, type: tmpentry.type,
			                    system: tmpentry.system ?? {} }))
			.filter(tmpentry => explainAvailability(tmpentry, tmprules).available)
			.sort((a, b) => a.name.localeCompare(b.name));
		return this.#entries;
	}

	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		var tmpall = await this.#loadEntries();
		var tmpneedle = this.#search.trim().toLowerCase();
		var tmpmatched = tmpneedle
			? tmpall.filter(tmpentry => tmpentry.name.toLowerCase().includes(tmpneedle))
			: tmpall;

		tmpcontext.label = PICKER_PACKS[this.#type].label;
		tmpcontext.search = this.#search;
		tmpcontext.total = tmpall.length;
		tmpcontext.matched = tmpmatched.length;
		tmpcontext.shown = tmpmatched.slice(0, PICKER_SHOWN);
		tmpcontext.truncated = tmpmatched.length > PICKER_SHOWN;
		tmpcontext.limit = PICKER_SHOWN;
		tmpcontext.noContent = !tmpall.length;
		return tmpcontext;
	}

	_onRender(context, options) {
		super._onRender?.(context, options);
		applySheetTheme(this.element);

		// Typing filters as it goes, and the box keeps focus and caret across the re-render it
		// causes -- a search that jumped to the end of the text on every keystroke would be
		// unusable on a list this size.
		var tmpsearch = this.element.querySelector("input[name='search']");
		if (!tmpsearch) { return; }
		tmpsearch.addEventListener("input", (tmpevent) => {
			this.#search = tmpevent.target.value;
			this.render();
		});
		if (this.#search) {
			tmpsearch.focus();
			tmpsearch.setSelectionRange(tmpsearch.value.length, tmpsearch.value.length);
		}
	}

	// @MARKER ACTIONS
	// This is the function which puts the chosen item on the character. The full document is
	// fetched now, so the item carries every field the compendium entry has rather than the few
	// the index holds.
	static async #onPickItem(event, target) {
		event.preventDefault();
		var tmpid = target.dataset.id;
		var tmppack = game.packs.get(PICKER_PACKS[this.#type].pack);
		var tmpdoc = tmpid ? await tmppack?.getDocument(tmpid) : null;
		if (!tmpdoc) { ui.notifications.warn("That item could not be loaded."); return; }

		var tmpdata = tmpdoc.toObject();
		delete tmpdata._id;
		// Carried, not equipped: a thing just acquired is in a pack, not in a hand.
		tmpdata.system = { ...tmpdata.system, location: "carried" };
		await this.#actor.createEmbeddedDocuments("Item", [tmpdata]);
		ui.notifications.info(`${tmpdoc.name} added to ${this.#actor.name}, carried.`);

		// Left open on purpose: kitting a character out is many additions, not one, and reopening
		// the window and retyping the search for each would be its own annoyance.
		this.render();
	}

	// This is the function which makes an empty item of this type, for something his tables do not
	// carry. The same thing the Add buttons used to do, kept because homebrew needs a way in.
	static async #onBlankItem(event, target) {
		event.preventDefault();
		var tmplabel = PICKER_PACKS[this.#type].label;
		var tmpcreated = await this.#actor.createEmbeddedDocuments("Item", [{
			name: `New ${tmplabel}`,
			type: this.#type,
			system: { location: "carried", quantity: 1, weight: 0 }
		}]);
		await this.close();
		if (tmpcreated?.length) { tmpcreated[0].sheet.render(true); }
	}
}

// @MARKER ADD NEW picker functions HERE
// @END (CODE)
