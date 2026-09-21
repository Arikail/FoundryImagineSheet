// @START (CODE)
// @MARKER CONTENT AVAILABILITY WINDOW
//==================================================================================================================
// The Game Master's window for switching sourcebooks and magic on and off, and for allowing
// or forbidding individual items.
//
// Edits are held in a draft until Save. Adding or removing an override re-renders the window,
// and a plain re-render would rebuild every checkbox from the saved settings and quietly throw
// away whatever the Game Master had ticked but not yet saved. So before any re-render the
// current state of the form is captured into the draft, and the window always renders from
// the draft.
//==================================================================================================================

import { SOURCEBOOKS, MAGIC_SUBSYSTEMS, getSourcebookId } from "../availability.mjs";

const { HandlebarsApplicationMixin, ApplicationV2 } = foundry.applications.api;

// The item types an override can name.
const OVERRIDE_TYPES = ["skill", "race", "class", "weapon", "armor", "equipment"];

export default class ImagineAvailabilityConfig extends HandlebarsApplicationMixin(ApplicationV2) {

	static DEFAULT_OPTIONS = {
		id: "imagine-availability-config",
		tag: "form",
		classes: ["imagine", "themed", "theme-light", "availability-config"],
		window: { title: "Imagine RPG — Content Availability", contentClasses: ["standard-form"] },
		position: { width: 580, height: 680 },
		form: { handler: ImagineAvailabilityConfig.#onSubmit, closeOnSubmit: true },
		actions: {
			addOverride:    ImagineAvailabilityConfig.#onAddOverride,
			removeOverride: ImagineAvailabilityConfig.#onRemoveOverride
		}
	};

	static PARTS = {
		form:   { template: "systems/imagine-rpg/templates/apps/availability-config.hbs", scrollable: [""] },
		footer: { template: "templates/generic/form-footer.hbs" }
	};

	// The unsaved working copy. Null until the window first renders.
	#draft = null;

	// This is the function which loads the saved settings into a fresh draft.
	#loadDraft() {
		var tmpoverrides = game.settings.get("imagine-rpg", "contentOverrides");
		this.#draft = {
			magicEnabled:    game.settings.get("imagine-rpg", "magicEnabled"),
			magicSubsystems: foundry.utils.deepClone(game.settings.get("imagine-rpg", "magicSubsystems")),
			sourcebooks:     foundry.utils.deepClone(game.settings.get("imagine-rpg", "sourcebooks")),
			overrides:       Object.entries(tmpoverrides).map(([k, v]) => ({ key: k, allow: v === true }))
		};
	}

	// This is the function which copies whatever is currently on screen into the draft, so a
	// re-render does not lose unsaved changes.
	#captureForm() {
		if (!this.element) { return; }
		var tmpdata = foundry.utils.expandObject(
			new foundry.applications.ux.FormDataExtended(this.element).object);

		this.#draft.magicEnabled    = tmpdata.magicEnabled === true;
		this.#draft.magicSubsystems = tmpdata.magicSubsystems ?? {};
		this.#draft.sourcebooks     = tmpdata.sourcebooks ?? {};

		// Override rows are submitted as overrides.0.allow, overrides.1.allow, ... in the same
		// order the draft holds them.
		var tmprows = tmpdata.overrides ?? {};
		this.#draft.overrides.forEach((tmprow, tmpindex) => {
			if (tmprows[tmpindex]) { tmprow.allow = tmprows[tmpindex].allow === "allow"; }
		});
	}

	// This is the function which finds every sourcebook the content actually cites, so a book
	// shows up here the moment its content is imported even if nobody added it to the list.
	async #discoverSourcebooks() {
		var tmpfound = {};
		for (const tmppack of game.packs) {
			if (tmppack.documentName != "Item") { continue; }
			var tmpindex = await tmppack.getIndex({ fields: ["system.sourcebook"] });
			for (const tmpentry of tmpindex) {
				var tmpname = tmpentry.system?.sourcebook;
				var tmpid = getSourcebookId(tmpname);
				if (tmpid && !tmpfound[tmpid]) { tmpfound[tmpid] = String(tmpname).replace(/`/g, "'"); }
			}
		}
		return tmpfound;
	}

	// This is the function which assembles what the template renders.
	async _prepareContext(options) {
		var tmpcontext = await super._prepareContext(options);
		if (!this.#draft) { this.#loadDraft(); }

		// Known books keep their declared names and order; any the content cites that are not
		// in the list follow after them.
		var tmpbooks = { ...SOURCEBOOKS };
		var tmpdiscovered = await this.#discoverSourcebooks();
		for (const [tmpid, tmplabel] of Object.entries(tmpdiscovered)) {
			if (!tmpbooks[tmpid]) { tmpbooks[tmpid] = tmplabel; }
		}

		tmpcontext.magicEnabled = this.#draft.magicEnabled;
		tmpcontext.subsystems = Object.entries(MAGIC_SUBSYSTEMS).map(([tmpid, tmpdef]) => ({
			id: tmpid,
			label: tmpdef.label,
			enabled: this.#draft.magicSubsystems[tmpid] !== false
		}));
		tmpcontext.sourcebooks = Object.entries(tmpbooks).map(([tmpid, tmplabel]) => ({
			id: tmpid,
			label: tmplabel,
			enabled: this.#draft.sourcebooks[tmpid] !== false
		}));
		tmpcontext.overrides = this.#draft.overrides.map((tmprow, tmpindex) => ({
			index: tmpindex,
			key: tmprow.key,
			type: tmprow.key.split(":")[0],
			name: tmprow.key.slice(tmprow.key.indexOf(":") + 1),
			allow: tmprow.allow
		}));
		tmpcontext.overrideTypes = OVERRIDE_TYPES;
		tmpcontext.buttons = [{ type: "submit", icon: "fa-solid fa-floppy-disk", label: "Save" }];
		return tmpcontext;
	}

	// @MARKER ACTION HANDLERS

	// This is the function which adds an override from the type and name fields.
	static #onAddOverride(event, target) {
		this.#captureForm();

		var tmptype = this.element.querySelector("[name='newOverrideType']")?.value;
		var tmpname = this.element.querySelector("[name='newOverrideName']")?.value?.trim();
		var tmpallow = this.element.querySelector("[name='newOverrideAllow']")?.value == "allow";
		if (!tmptype || !tmpname) {
			ui.notifications.warn("Give the item's type and its exact name.");
			return;
		}

		var tmpkey = `${tmptype}:${tmpname}`;
		var tmpexisting = this.#draft.overrides.find(r => r.key == tmpkey);
		if (tmpexisting) {
			tmpexisting.allow = tmpallow;
		} else {
			this.#draft.overrides.push({ key: tmpkey, allow: tmpallow });
		}
		this.render();
	}

	// This is the function which removes one override.
	static #onRemoveOverride(event, target) {
		this.#captureForm();
		var tmpindex = parseInt(target.dataset.index);
		this.#draft.overrides.splice(tmpindex, 1);
		this.render();
	}

	// This is the function which saves the draft to the world settings.
	static async #onSubmit(event, form, formData) {
		this.#captureForm();

		var tmpoverrides = {};
		for (const tmprow of this.#draft.overrides) { tmpoverrides[tmprow.key] = tmprow.allow; }

		await game.settings.set("imagine-rpg", "magicEnabled", this.#draft.magicEnabled);
		await game.settings.set("imagine-rpg", "magicSubsystems", this.#draft.magicSubsystems);
		await game.settings.set("imagine-rpg", "sourcebooks", this.#draft.sourcebooks);
		await game.settings.set("imagine-rpg", "contentOverrides", tmpoverrides);
		ui.notifications.info("Content availability saved.");
	}
}
// @END (CODE)
