// @START (CODE)
// @MARKER CREATURE LOOKUP TABLES
//==================================================================================================================
// The option lists a creature is built from.
//
// Every list here is transcribed from the creature Configurator's own <select> elements in
// ImagineTabbedCharacterSheet.html, which is where he authors a creature, so the values match
// what his data already contains. Line numbers are given per table for checking.
//
// These are NOT in config-tables.mjs. That file is generated from his attribute dictionaries and
// gets overwritten; this one is hand-maintained against his markup.
//==================================================================================================================

// The kinds of creature. Required when building one -- his Configurator marks it so, and
// checkAllCreatureValues does nothing at all while creature_type is empty.
// (HTML 80755-80767.)
export const CREATURE_TYPES = [
	"Animal", "Deity", "Humanoid", "Magical", "Magical Animal", "Magical Humanoid",
	"Magical Plant", "Plant", "Slime", "Supernatural", "Undead"
];

// The body types a creature may have, in his order. "Custom" is a real option: it means the
// body chart was built area by area rather than taken from a stock chart, which is why a
// creature stores its own chart instead of only a body type. (HTML 80794-80841.)
//
// Every name except "Custom" is a key in BODY_CHARTS (module/combat-tables.mjs), so the chart
// itself is already ported -- see docs/DECISIONS.md, "CORRECTION: creature audit findings".
export const CREATURE_BODY_TYPES = [
	"Amorphous/Sectional", "Arachen", "Bird", "Brachara", "Centaur", "Crustacean", "Custom",
	"Fish", "Floating Orb", "Giant Insect", "Giant Insect(Wings)", "Giant Spider",
	"Humanoid", "Humanoid(Fish Tail)", "Humanoid(Hooves)", "Humanoid(Hooves/Tail)",
	"Humanoid(Tail)", "Humanoid(Large Tail)", "Humanoid(Wings)", "Humanoid(Wings/Tail)",
	"Humanoid(Wings/Large Tail)", "Humanoid(Hooves/Wings/Tail)", "Humanoid(Hooves/Wings/Large Tail)",
	"Insectoid", "Insectoid(Wings)", "Insectoid(Wings/Stinger)", "Insubstantial(None)",
	"Mollusk", "Mollusk(No Limbs)", "Plant", "Quadruped", "Quadruped(Tail)", "Quadruped(Wings)",
	"Quadruped(Tail/Wings)", "Reptile", "Saurian", "Scethen", "Sea Mammal",
	"Sea Mammal(Dorsal Finned)", "Sea Mammal(Tusk)", "Segmented Worm", "Small", "Snake",
	"Snake(Arms)", "Tiny", "Tree"
];

// The kinds of body area his custom body builder offers. His createBodyAreas only ever asks
// whether the details say "Vital" and calls everything else a Limb, so Other and Wing are
// authoring distinctions that do not change the arithmetic. (HTML 80851-80855.)
export const BODY_AREA_TYPES = ["Vital", "Limb", "Other", "Wing"];

// Which attack chart a creature uses. Chosen outright rather than worked out from a class
// progression the way a character's is. "None" means it does not attack. (HTML 81062-81070.)
export const CREATURE_ATTACK_CHARTS = [
	"Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master", "Grandmaster", "None"
];

// @MARKER ATTACK TYPES
// How each kind of creature attack resolves, from handleCreatureAttack (sheet-worker.js:179754-179850).
// The Configurator's own note reads: "Direct: no roll to hit, Grappling: used during grappling,
// Touch 10+AGL bonus to hit, etc.". (HTML 81074-81094.)
//
//   resolve  "chart" rolls d20 down the attack chart's zone ladder, as a weapon attack does
//            "auto"  hits without a roll -- it affects everyone who can see or hear it
//            "touch" rolls d20 plus the Agility missile modifier and touches on 10 or more
//   mods     which set of to-hit modifiers applies, melee or missile
//   shape    the area shape whose size comes from the creature's Endurance, or "" for none
//   tier     which size band that shape uses
//
// Beam and Grappling have no branch of their own in his code, so they fall through to a plain
// chart roll with melee modifiers. Beam reading as melee looks wrong for something fired at
// range, but it is what his code does, and the sheet is the source of truth.
//                        //  resolve   mods       shape    tier
export const CREATURE_ATTACK_TYPES = {
	"Melee":              [ "chart",  "melee",   "",      ""       ],
	"Missile":            [ "chart",  "missile", "",      ""       ],
	"Touch":              [ "touch",  "missile", "",      ""       ],
	"Grappling":          [ "chart",  "melee",   "",      ""       ],
	"Direct":             [ "auto",   "melee",   "",      ""       ],
	"Beam":               [ "chart",  "melee",   "",      ""       ],
	"Gaze":               [ "auto",   "melee",   "gaze",  ""       ],
	"Voice":              [ "auto",   "melee",   "voice", ""       ],
	"Weak Bolt":          [ "chart",  "missile", "bolt",  "weak"   ],
	"Bolt":               [ "chart",  "missile", "bolt",  "normal" ],
	"Strong Bolt":        [ "chart",  "missile", "bolt",  "strong" ],
	"Weak Cloud":         [ "chart",  "melee",   "cloud", "weak"   ],
	"Cloud":              [ "chart",  "melee",   "cloud", "normal" ],
	"Strong Cloud":       [ "chart",  "melee",   "cloud", "strong" ],
	"Weak Cone":          [ "chart",  "melee",   "cone",  "weak"   ],
	"Cone":               [ "chart",  "melee",   "cone",  "normal" ],
	"Strong Cone":        [ "chart",  "melee",   "cone",  "strong" ],
	"Weak Glob":          [ "chart",  "missile", "glob",  "weak"   ],
	"Glob":               [ "chart",  "missile", "glob",  "normal" ],
	"Strong Glob":        [ "chart",  "missile", "glob",  "strong" ]
};

// The damage a creature's attack can do. (HTML 81129-81154.)
export const CREATURE_DAMAGE_TYPES = [
	"Cutting", "Thrusting", "Piercing", "Smashing", "Crushing", "Constricting", "Draining",
	"Force", "Poison", "Disease", "Light", "Sonic", "Frost", "Kinetic", "Flame", "Electricity",
	"Acid", "Aura", "Divine", "Holy", "Unholy", "Death", "Life", "Obliteration", "Other"
];

// @MARKER ATTACK EFFECT RIDERS
// What makes an attack's rider effect happen. "Auto" needs no hit and allows no save; every
// other value names the roll that has to fail. (HTML 81162-81183.)
export const EFFECT_TRIGGERS = [
	"Auto", "If hit", "If natural critical", "If 10 damage",
	"If STR save fails", "If AGL save fails", "If VIT save fails", "If WIL save fails",
	"If half STR save fails", "If half AGL save fails", "If half VIT save fails", "If half WIL save fails",
	"If MR fails", "If CR fails", "If IR fails", "If PR fails", "If DR fails",
	"If half MR fails", "If half CR fails", "If half IR fails", "If half PR fails", "If half DR fails"
];

// What a rider effect does damage to. Wider than the attack list: a rider can drain an
// attribute or cause bleeding rather than wound a body area. (HTML 81191-81224.)
export const EFFECT_DAMAGE_TYPES = [
	"Body Areas", "Bleeding", "Drain", "Force", "Illusion", "Poison", "Disease",
	"Strength", "Agility", "Vitality", "Intelligence", "Wisdom", "Knowledge", "Appearance",
	"Charm", "Aura", "Piety", "Will Force", "Light", "Sonic", "Frost", "Kinetic", "Flame",
	"Electricity", "Acid", "Chaos", "Divine", "Holy", "Unholy", "Death", "Life",
	"Obliteration", "Other"
];

// How long a rider effect lasts. A "Periodic" duration repeats every interval instead of
// running once. (HTML 81230-81241.)
export const EFFECT_DURATION_TYPES = [
	"Instant", "Seconds", "Minutes", "Hours", "Weeks",
	"Periodic(Seconds)", "Periodic(Minutes)", "Periodic(Hours)", "Periodic(Days)",
	"Periodic(Weeks)", "Permanent"
];

// The most rider effects one attack can carry. His creature-finish reads exactly three
// (handleCreatureFinish, sheet-worker.js:174825-174833) and his Configurator authors three.
export const MAX_ATTACK_EFFECTS = 3;

// @MARKER ADD NEW creature lookup tables HERE
// @END (CODE)
