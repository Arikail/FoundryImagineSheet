// @START (CODE)
// @MARKER SHEET THEME
//==================================================================================================================
// Which palette the Imagine windows paint themselves in.
//
// The system's own look is cream paper with brown ink -- a deliberate choice, because a character
// sheet with this many numbers on it reads better as a printed page than as a dark panel, and
// because entered values and derived values are told apart by field-against-flat-text, which needs
// a light ground to work. That look is kept as the default.
//
// But it is not everyone's, and a Game Master running a dark table had the Imagine windows glaring
// out of an otherwise dark screen with no way to say otherwise. So it is a setting, and the other
// choice is simply to stop overriding: "Foundry standard" hands the colours back to whatever theme
// Foundry itself is using, light or dark, and the sheets follow the rest of the interface.
//
// THE CLASSES ARE PUT ON AT RENDER, not declared in DEFAULT_OPTIONS.classes. A window's static
// classes are fixed when it is constructed, so a sheet already open when the setting changed would
// have kept the old palette until it was closed and reopened. Doing it in _onRender means an
// ordinary re-render repaints it, which is what the setting's onChange asks every open window to do.
//==================================================================================================================

// The palettes, and what each puts on the window's root element.
//   paper     the system's own cream: Foundry's light theme variables, plus the overrides in
//             styles/imagine-rpg.css that this file's "themed"/"theme-light" pair switch on
//   foundry   no override at all: imagine-foundry maps the system's colour variables onto
//             Foundry's own, so the sheets take the interface's theme, dark or light
const THEME_CLASSES = {
	//  setting value   classes added to the window root
	paper:   ["themed", "theme-light"],
	foundry: ["imagine-foundry"]
};

// Every class this module might add, so switching themes can take the other one's off again.
const ALL_THEME_CLASSES = ["themed", "theme-light", "imagine-foundry"];

// This is the function which reads the setting, defaulting to the paper look. Guarded because a
// sheet can render before the settings are registered -- and during the preview harnesses, where
// there is no `game` at all.
export function getSheetTheme() {
	try {
		return game?.settings?.get("imagine-rpg", "sheetTheme") ?? "paper";
	} catch (tmperror) {
		return "paper";
	}
}

// This is the function which paints one window. Called from _onRender on each sheet and app.
export function applySheetTheme(tmpelement) {
	if (!tmpelement?.classList) { return; }
	var tmpwanted = THEME_CLASSES[getSheetTheme()] ?? THEME_CLASSES.paper;
	for (const tmpclass of ALL_THEME_CLASSES) {
		tmpelement.classList.toggle(tmpclass, tmpwanted.includes(tmpclass));
	}
}

// This is the function which repaints everything already on screen, for the setting's onChange.
// Re-rendering is enough because the classes are applied in _onRender rather than at construction.
export function refreshOpenWindows() {
	for (const tmpapp of Object.values(ui.windows ?? {})) { tmpapp.render?.(false); }
	for (const tmpapp of (foundry.applications?.instances?.values?.() ?? [])) {
		if (tmpapp.element?.classList?.contains("imagine")) { tmpapp.render?.(false); }
	}
}

// @MARKER ADD NEW theme functions HERE
// @END (CODE)
