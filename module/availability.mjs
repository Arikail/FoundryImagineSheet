// @START (CODE)
// @MARKER CONTENT AVAILABILITY
//==================================================================================================================
// Decides whether a piece of content may be used in this campaign.
//
// Three layers of control, checked in this order:
//
//   1. MAGIC SWITCHES -- a master "all magic off" switch, and one switch per magic subsystem.
//      These are a hard ceiling. Nothing below can re-enable something a magic switch has
//      turned off, which is what "all magic off" has to mean to be worth having.
//
//   2. OVERRIDES -- the Game Master allowing or forbidding one specific item, keyed by
//      "type:name" (e.g. "class:Monk"). This is how a single class is disallowed in a
//      campaign, or a single entry from a disabled book is let back in.
//
//   3. SOURCEBOOKS -- whole books switched on or off. Content that carries no sourcebook is
//      always available here; it can still be forbidden individually by an override.
//
// Anything not explicitly switched off is on. A sourcebook or subsystem added later is
// therefore enabled by default rather than silently vanishing.
//
// Nothing is ever deleted when a switch flips. Content already on a character is flagged
// unavailable and shown as such, because removing a player's things behind their back is
// not an acceptable side effect of a settings change.
//
// None of this exists in the original Roll20 sheet -- its Config tab covers sheet style,
// equipment handling and experience display, not content availability. This layer is new.
//==================================================================================================================

// @MARKER SOURCEBOOKS
// Every book the extracted content cites, plus Custom for homebrew. Books not listed here
// are still picked up from the content itself at runtime; this list just gives them names
// and a stable order.
export const SOURCEBOOKS = {
	"players-guide":           "Player's Guide",
	"masters-manual":          "Master's Manual",
	"aspects-of-the-wild":     "Aspects of the Wild",
	"mysteries-of-the-planes": "Mysteries of the Planes",
	"conquest-of-the-eternal": "Conquest of the Eternal",
	"legends-of-the-unknown":  "Legends of the Unknown",
	"epitaph-of-the-fallen":   "Epitaph of the Fallen",
	// His own cross-book consolidation, and a real place to look something up. It is where the
	// content build gets a page for anything his per-book Source columns do not cover -- the
	// Heroic Melee Weapons table names no book, so Angel Sword cites the Master Index at 326.
	"imagine-master-index":    "Imagine Master Index",
	"custom":                  "Custom / Homebrew"
};

// @MARKER MAGIC SUBSYSTEMS
// One entry per independently switchable kind of magic. "sections" records which repeating
// sections of the original Roll20 sheet each one covers, so the grouping can be checked
// against his sheet -- and split further if a finer switch is ever wanted.
export const MAGIC_SUBSYSTEMS = {
	arcane:      { label: "Arcane Magic (Aura)",   sections: ["spells"] },
	divine:      { label: "Divine Magic (Piety)",  sections: ["invocations"] },
	evoke:       { label: "Evocation",             sections: ["evoketree", "evokeskill"] },
	powers:      { label: "Powers",                sections: ["powers"] },
	enchanting:  { label: "Magic Item Empowering", sections: ["mitempowers"] },
	divineItems: { label: "Divine Item Empowering", sections: ["ditempowers"] },
	herbalism:   { label: "Herbs, Potions & Elixirs", sections: ["herb", "potion", "elixir", "potionrecipe"] },
	poisons:     { label: "Poisons",               sections: ["poison", "poisonrecipe"] },
	charms:      { label: "Charms",                sections: ["charm"] },
	bardic:      { label: "Bardic Magic",          sections: ["ballad", "hymn", "poem", "song"] },
	candlelore:  { label: "Candle Lore",           sections: ["candlelore"] },
	empathy:     { label: "Empathy Magic",         sections: ["empathymagic"] },
	sympathy:    { label: "Sympathy Magic",        sections: ["sympathymagic"] },
	glyphs:      { label: "Glyphs",                sections: ["glyph"] },
	runes:       { label: "Runes",                 sections: ["rune"] },
	rituals:     { label: "Rituals",               sections: ["ritual"] }
};

// Skill types that make a skill magical, and which subsystem each one answers to.
// A skill typed "Magical,Divine" belongs to both, and needs both switched on.
const SKILL_TYPE_SUBSYSTEMS = {
	"Magical": "arcane",
	"Divine":  "divine"
};


// @MARKER GENERAL PURPOSE FUNCTIONS

	// This is the function which turns a sourcebook name into the key its switch is stored
	// under. His data writes a backtick where an apostrophe belongs, so "Player`s Guide" and
	// "Player's Guide" have to land on the same key. Returns "" for untagged content, and
	// for the "?" his data uses where the book is unknown.
	export function getSourcebookId(tmpname) {
		var tmptext = String(tmpname ?? "").toLowerCase();

		// "XXX" IS A MARK, NOT A BOOK. The content build writes it into the sourcebook field of
		// anything his Master Index does not list, so that a gap is searchable rather than an
		// empty box. It must not become a switchable sourcebook: this window discovers books from
		// the content, so an "XXX" row would appear beside the real ones and one tick would hide
		// the 1,702 items that merely have not been traced to a book yet. Returning no id puts
		// them on the same footing as content that carries no sourcebook at all -- always
		// available here, and still forbiddable one at a time by an override.
		if (tmptext == "xxx") { return ""; }

		tmptext = tmptext.replace(/[`']/g, "");
		tmptext = tmptext.replace(/[^a-z0-9]+/g, "-");
		tmptext = tmptext.replace(/^-+|-+$/g, "");
		return tmptext;
	}

	// This is the function which works out which magic subsystems an item belongs to.
	// Skills answer through their types. Magic content items, once they exist, will carry a
	// subsystem field of their own. Everything else belongs to none.
	export function getItemMagicSubsystems(tmpitem) {
		var tmpsystem = tmpitem.system ?? {};
		if (tmpsystem.subsystem) { return [tmpsystem.subsystem]; }

		var tmpout = [];
		if (tmpitem.type == "skill" && Array.isArray(tmpsystem.types)) {
			for (const tmptype of tmpsystem.types) {
				var tmpsub = SKILL_TYPE_SUBSYSTEMS[tmptype];
				if (tmpsub && !tmpout.includes(tmpsub)) { tmpout.push(tmpsub); }
			}
		}
		return tmpout;
	}

	// This is the function which builds the key an override is stored under.
	export function getOverrideKey(tmptype, tmpname) {
		return `${tmptype}:${tmpname}`;
	}

	// This is the function which lists the override keys an item answers to, most specific
	// first. Nearly everything answers to one key, its own name.
	//
	// A class with a choice in it is one document per path -- "Elementalist(Call of Death)",
	// "Knight(Dark Templar)" -- so a Game Master switching off "Elementalist" would otherwise
	// have switched off nothing at all, six documents being named something else. The base
	// class is therefore a second key BELOW the path's own: setting the path decides it, and
	// setting the base class decides every path that has no key of its own.
	//
	// The base class comes from the document's own baseClass field where it has one (that is
	// what build_documents.py writes), and from the name before the bracket otherwise, so a
	// path a Game Master authored by hand behaves the same way.
	export function getOverrideKeys(tmpitem) {
		var tmpkeys = [getOverrideKey(tmpitem.type, tmpitem.name)];
		if (tmpitem.type != "class") { return tmpkeys; }

		var tmpbase = tmpitem.system?.baseClass || ("" + tmpitem.name).split("(")[0].trim();
		if (tmpbase && tmpbase != tmpitem.name) { tmpkeys.push(getOverrideKey("class", tmpbase)); }
		return tmpkeys;
	}

	// This is the function which decides whether an item may be used, and says why.
	// Returns { available, reason }. Pure -- everything it needs arrives in tmprules, so it
	// can be tested without Foundry running.
	//
	// tmprules = {
	//     magicEnabled:    bool,
	//     magicSubsystems: { arcane: true, runes: false, ... },
	//     overrides:       { "class:Monk": false, ... },
	//     sourcebooks:     { "players-guide": true, "mysteries-of-the-planes": false, ... }
	// }
	export function explainAvailability(tmpitem, tmprules) {
		if (!tmprules) { return { available: true, reason: "" }; }

		// 1. Magic switches -- a ceiling nothing else can lift.
		var tmpsubsystems = getItemMagicSubsystems(tmpitem);
		if (tmpsubsystems.length) {
			if (tmprules.magicEnabled === false) {
				return { available: false, reason: "All magic is switched off in this campaign." };
			}
			for (const tmpsub of tmpsubsystems) {
				if (tmprules.magicSubsystems?.[tmpsub] === false) {
					var tmplabel = MAGIC_SUBSYSTEMS[tmpsub]?.label ?? tmpsub;
					return { available: false, reason: `${tmplabel} is switched off in this campaign.` };
				}
			}
		}

		// 2. Individual overrides. Most specific key first -- a class path's own key answers
		// before the base class's, so one path can be allowed out of a class that is otherwise
		// switched off.
		for (const tmpkey of getOverrideKeys(tmpitem)) {
			if (!tmprules.overrides) { break; }
			if (!Object.prototype.hasOwnProperty.call(tmprules.overrides, tmpkey)) { continue; }
			var tmpallowed = tmprules.overrides[tmpkey] === true;
			return {
				available: tmpallowed,
				reason: tmpallowed ? "" : `${tmpitem.name} is disallowed in this campaign.`
			};
		}

		// 3. Sourcebooks. Untagged content is always available at this level.
		var tmpbook = tmpitem.system?.sourcebook ?? "";
		var tmpbookid = getSourcebookId(tmpbook);
		if (tmpbookid && tmprules.sourcebooks?.[tmpbookid] === false) {
			return { available: false, reason: `${tmpbook} is switched off in this campaign.` };
		}

		return { available: true, reason: "" };
	}

	// This is the function which answers the plain yes-or-no question.
	export function isItemAvailable(tmpitem, tmprules) {
		return explainAvailability(tmpitem, tmprules).available;
	}


// @MARKER SETTINGS

	// This is the function which reads the current campaign's rules out of the world settings,
	// in the shape explainAvailability expects.
	export function getAvailabilityRules() {
		return {
			magicEnabled:    game.settings.get("imagine-rpg", "magicEnabled"),
			magicSubsystems: game.settings.get("imagine-rpg", "magicSubsystems"),
			overrides:       game.settings.get("imagine-rpg", "contentOverrides"),
			sourcebooks:     game.settings.get("imagine-rpg", "sourcebooks")
		};
	}

	// This is the function which refreshes every character after a switch changes, so the
	// unavailable flags on their items update without anyone having to reload.
	function refreshAfterChange() {
		for (const tmpactor of game.actors) { tmpactor.reset(); }
		for (const tmpapp of foundry.applications.instances.values()) {
			if (tmpapp.document?.documentName == "Actor" && tmpapp.rendered) { tmpapp.render(); }
		}
	}

	// This is the function which registers the four world settings the switches live in.
	// All are hidden from the default settings list; they are edited through the
	// Content Availability window instead, where they make sense together.
	export function registerAvailabilitySettings() {
		game.settings.register("imagine-rpg", "magicEnabled", {
			scope: "world", config: false, type: Boolean, default: true,
			onChange: refreshAfterChange
		});
		game.settings.register("imagine-rpg", "magicSubsystems", {
			scope: "world", config: false, type: Object, default: {},
			onChange: refreshAfterChange
		});
		game.settings.register("imagine-rpg", "contentOverrides", {
			scope: "world", config: false, type: Object, default: {},
			onChange: refreshAfterChange
		});
		game.settings.register("imagine-rpg", "sourcebooks", {
			scope: "world", config: false, type: Object, default: {},
			onChange: refreshAfterChange
		});

		// Carry sourcebook and type in the compendium index, so the availability window can
		// find every book the content actually cites without loading thousands of documents.
		CONFIG.Item.compendiumIndexFields.push("system.sourcebook", "system.types");
	}


// @MARKER ENFORCEMENT

	// This is the function which stops disallowed content being added to a character.
	//
	// It sits on item creation rather than on any one sheet or drop handler, so it holds no
	// matter how the item arrives -- dragged from a compendium, created by a macro, copied
	// from another actor.
	//
	// Players are blocked outright. A Game Master is allowed through with a warning, because
	// the Game Master is the one who decides what is in the campaign and may be making a
	// deliberate exception.
	export function registerAvailabilityEnforcement() {
		Hooks.on("preCreateItem", function (tmpitem, tmpdata, tmpoptions, tmpuserid) {
			if (tmpitem.parent?.documentName != "Actor") { return true; }

			var tmpresult = explainAvailability(tmpitem, getAvailabilityRules());
			if (tmpresult.available) { return true; }

			if (game.user.isGM) {
				ui.notifications.warn(`${tmpresult.reason} Added anyway, because you are the Game Master.`);
				return true;
			}
			ui.notifications.warn(`${tmpresult.reason} It cannot be added.`);
			return false;
		});
	}

// @MARKER ADD NEW availability functions HERE
// @END (CODE)
