// @START (CODE)
// @MARKER COMBAT TABLES
//==================================================================================================================
// GENERATED FILE -- do not edit by hand.
// Produced by tools/extract/extract_combat_tables.py from the original Roll20 sheet-worker.
// Regenerate rather than editing, or this will drift from his sheet.
//==================================================================================================================

// @MARKER ATTACK CHARTS
// From attackSkillValuesDetails (sheet-worker.js:82108). The d20 attack roll, after modifiers, is
// read against these to find both whether the blow lands and where. Each value is the LOWEST
// roll that reaches that result -- "19+" and "9-11" are read by their first number, exactly as
// his code does with parseInt. "-" means the result cannot occur at that skill.
//              0          1         2          3         4           5          6           7         8          9           10
//              MissHigh   HitHigh   MissLeft   HitLeft   HitCenter   HitRight   MissRight   HitLow    MissLow    MissShort   CalledShot
export const ATTACK_CHARTS = {
	"Beginner":    ["9-11", "17", "6-8", "16", "19+", "18", "12-14", "15", "3-5", "1-2", "20"],
	"Novice":      ["7-9", "15", "4-6", "14", "17+", "16", "10-12", "13", "1-3", "-", "19"],
	"Intermediate": ["6-7", "13", "3-5", "12", "15+", "14", "8-10", "11", "1-2", "-", "18"],
	"Advanced":    ["5-6", "11", "3-4", "10", "13+", "12", "7-8", "9", "1-2", "-", "17"],
	"Expert":      ["4", "9", "2-3", "8", "11+", "10", "5-6", "7", "1", "-", "16"],
	"Master":      ["3", "7", "2", "6", "9+", "8", "4", "5", "1", "-", "15"],
	"Grandmaster": ["1", "4", "1", "3", "6+", "5", "1", "2", "1", "-", "14"],
	"None":        ["-", "-", "-", "-", "-", "-", "-", "-", "-", "-", "-"],
};

// The skill levels in order, weakest first. Weapon Lore reads the chart one step up.
export const ATTACK_SKILL_ORDER = ["Beginner", "Novice", "Intermediate", "Advanced", "Expert", "Master", "Grandmaster"];

// @MARKER BODY CHARTS
// From getBodyList (sheet-worker.js:175002). Each body type is a list of areas written as
// "Name(Type:xMultiplier)". An area's Endurance is the character's Endurance times its
// multiplier, rounded up. His evoke mutations (extra limbs, wings, tails) add further
// areas on top of these and are not reflected here.
export const BODY_CHARTS = {
	"Amorphous/Sectional": "Vital Area(Vital:x1),Non-Vital(Limb:x1)",
	"Arachen": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Abdomen(Vital:x2),Underbelly(Vital:x1),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Left Fore Shin(Limb:x1/2),Right Fore Shin(Limb:x1/2),Left Fore Foot(Limb:x1/2),Right Fore Foot(Limb:x1/2),Left Mid Leg(Limb:x1),Right Mid Leg(Limb:x1),Left Mid Shin(Limb:x1/2),Right Mid Shin(Limb:x1/2),Left Mid Foot(Limb:x1/2),Right Mid Foot(Limb:x1/2),Left Hind Leg(Limb:x1),Right Hind Leg(Limb:x1),Left Hind Shin(Limb:x1/2),Right Hind Shin(Limb:x1/2),Left Hind Foot(Limb:x1/2),Right Hind Foot(Limb:x1/2)",
	"Bird": "Head(Vital:x1),Neck(Vital:x1/2),Upper Torso(Vital:x2),Lower Torso(Vital:x2),Left Wing(Wing:x1),Right Wing(Wing:x1),Left Leg(Limb:x1),Right Leg(Limb:x1),Left Claw(Limb:x1/2),Right Claw(Limb:x1/2),Tail(Limb:x1/2)",
	"Brachara": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Mid Torso(Vital:x1),Left Mid Arm(Limb:x1),Right Mid Arm(Limb:x1),Left Mid Forearm(Limb:x1/2),Right Mid Forearm(Limb:x1/2),Left Pincer(Limb:x1/2),Right Pincer(Limb:x1/2),Abdomen(Vital:x2),Underbelly(Vital:x1),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Left Fore Shin(Limb:x1/2),Right Fore Shin(Limb:x1/2),Left Fore Foot(Limb:x1/2),Right Fore Foot(Limb:x1/2),Left Mid Leg(Limb:x1),Right Mid Leg(Limb:x1),Left Mid Shin(Limb:x1/2),Right Mid Shin(Limb:x1/2),Left Mid Foot(Limb:x1/2),Right Mid Foot(Limb:x1/2),Left Hind Leg(Limb:x1),Right Hind Leg(Limb:x1),Left Hind Shin(Limb:x1/2),Right Hind Shin(Limb:x1/2),Left Hind Foot(Limb:x1/2),Right Hind Foot(Limb:x1/2)",
	"Centaur": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Underbelly(Vital:x1),Forequarters(Vital:x2),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Left Fore Shin(Limb:x1/2),Right Fore Shin(Limb:x1/2),Hindquarters(Vital:x2),Left Hindleg(Limb:x1),Right Hindleg(Limb:x1),Left Hind Shin(Limb:x1/2),Right Hind Shin(Limb:x1/2),Tail(Limb:x1/2)",
	"Crustacean": "Cephalothorax/Head(Vital:x2),Left Claw(Limb:x2),Right Claw(Limb:x2),Left Foreleg(Limb:x1/2),Right Foreleg(Limb:x1/2),Left Frontal Midleg(Limb:x1/2),Right Frontal Midleg(Limb:x1/2),Left Back Hindleg(Limb:x1/2),Right Back Hindleg(Limb:x1/2),Left Hindleg(Limb:x1/2),Right Hindleg(Limb:x1/2),Abdomen/Tail(Vital:x1)",
	"Fish": "Head(Vital:x1),Main Trunk(Vital:x2),Left Fin(Limb:x1/2),Right Fin(Limb:x1/2),Dorsal Fin(Limb:x1/2),Rear Trunk(Vital:x2),Fluke/Tail(Limb:x1)",
	"Floating Orb": "Orb(Vital:x2),Eye(Other:x1),Left Upper Tentacle(Limb:x1/2),Left Mid Tentacle(Limb:x1/2),Left Lower Tentacle(Limb:x1/2),Right Upper Tentacle(Limb:x1/2),Right Mid Tentacle(Limb:x1/2),Right Lower Tentacle(Limb:x1/2)",
	"Giant Insect": "Head(Vital:x1),Prothorax(Vital:2),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Mesathorax(Vital:2),Left Midleg(Limb:x1),Right Midleg(Limb:x1),Metathorax(Vital:2),Left Hindleg(Limb:x1),Right Hindleg(Limb:x1)",
	"Giant Insect(Wings)": "Head(Vital:x1),Prothorax(Vital:2),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Mesathorax(Vital:2),Left Midleg(Limb:x1),Right Midleg(Limb:x1),Metathorax(Vital:2),Left Hindleg(Limb:x1),Right Hindleg(Limb:x1),Left Lower Wing(Wing:x1/2),Right Lower Wing(Wing:x1/2),Left Upper Wing(Wing:x1/2),Right Upper Wing(Wing:x1/2)",
	"Giant Spider": "Cephalothorax/Head(Vital:x1),Abdomen(Vital:x2),Left Front Foreleg(Limb:x1),Right Front Foreleg(Limb:x1),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Left Hindleg(Limb:x1),Right Hindleg(Limb:x1),Left Back Hindleg(Limb:x1),Right Back Hindleg(Limb:x1)",
	"Humanoid": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2)",
	"Humanoid(Fish Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Finned Tail(Limb:x2)",
	"Humanoid(Hooves)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Hoof(Limb:x1/2),Right Hoof(Limb:x1/2)",
	"Humanoid(Hooves/Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Hoof(Limb:x1/2),Right Hoof(Limb:x1/2),Tail(Limb:x1/2)",
	"Humanoid(Hooves/Large Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Hoof(Limb:x1/2),Right Hoof(Limb:x1/2),Tail(Limb:x1)",
	"Humanoid(Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Tail(Limb:x1/2)",
	"Humanoid(Large Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Tail(Limb:x1)",
	"Humanoid(Wings)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Left Wing(Wing:x1),Right Wing(Wing:x1)",
	"Humanoid(Wings/Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Left Wing(Wing:x1),Right Wing(Wing:x1),Tail(Limb:x1/2)",
	"Humanoid(Wings/Large Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Left Wing(Wing:x1),Right Wing(Wing:x1),Tail(Limb:x1)",
	"Humanoid(Hooves/Wings/Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Hoof(Limb:x1/2),Right Hoof(Limb:x1/2),Left Wing(Wing:x1),Right Wing(Wing:x1),Tail(Limb:x1/2)",
	"Humanoid(Hooves/Wings/Large Tail)": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Hoof(Limb:x1/2),Right Hoof(Limb:x1/2),Left Wing(Wing:x1),Right Wing(Wing:x1),Tail(Limb:x1)",
	"Insectoid": "Head(Vital:x1),Thorax(Vital:2),Left Upper Arm(Limb:x1),Right Upper Arm(Limb:x1),Left Upper Forearm(Limb:x1),Right Upper Forearm(Limb:x1),Left Upper Hand(Limb:x1/2),Right Upper Hand(Limb:x1/2),Left Mid Arm(Limb:x1),Right Mid Arm(Limb:x1),Left Mid Forearm(Limb:x1),Right Mid Forearm(Limb:x1),Left Mid Claw/Hand(Limb:x1/2),Right Mid Claw/Hand(Limb:x1/2),Left Leg(Limb:x1),Right Leg(Limb:x1),Left Lower Leg(Limb:x1),Right Lower Leg(Limb:x1),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Abdomen(Vital:x2)",
	"Insectoid(Wings)": "Head(Vital:x1),Thorax(Vital:2),Left Upper Arm(Limb:x1),Right Upper Arm(Limb:x1),Left Upper Forearm(Limb:x1),Right Upper Forearm(Limb:x1),Left Upper Hand(Limb:x1/2),Right Upper Hand(Limb:x1/2),Left Mid Arm(Limb:x1),Right Mid Arm(Limb:x1),Left Mid Forearm(Limb:x1),Right Mid Forearm(Limb:x1),Left Mid Claw/Hand(Limb:x1/2),Right Mid Claw/Hand(Limb:x1/2),Left Leg(Limb:x1),Right Leg(Limb:x1),Left Lower Leg(Limb:x1),Right Lower Leg(Limb:x1),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Abdomen(Vital:x2),Left Wingcase(Limb:x1),Right Wingcase(Limb:x1),Left Outer Wing(Wing:x1/4),Right Outer Wing(Wing:x1/4),Left Inner Wing(Wing:x1/4),Right Inner Wing(Wing:x1/4)",
	"Insectoid(Wings/Stinger)": "Head(Vital:x1),Thorax(Vital:2),Left Upper Arm(Limb:x1),Right Upper Arm(Limb:x1),Left Upper Forearm(Limb:x1),Right Upper Forearm(Limb:x1),Left Upper Hand(Limb:x1/2),Right Upper Hand(Limb:x1/2),Left Mid Arm(Limb:x1),Right Mid Arm(Limb:x1),Left Mid Forearm(Limb:x1),Right Mid Forearm(Limb:x1),Left Mid Claw/Hand(Limb:x1/2),Right Mid Claw/Hand(Limb:x1/2),Left Leg(Limb:x1),Right Leg(Limb:x1),Left Lower Leg(Limb:x1),Right Lower Leg(Limb:x1),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Abdomen(Vital:x2),Left Wingcase(Limb:x1),Right Wingcase(Limb:x1),Left Outer Wing(Wing:x1/4),Right Outer Wing(Wing:x1/4),Left Inner Wing(Wing:x1/4),Right Inner Wing(Wing:x1/4),Stinger(Limb:x1/2)",
	"Mollusk": "Head/Foot(Vital:x1),Limb1(Limb:x1),Limb2(Limb:x1),Limb3(Limb:x1),Limb4(Limb:x1),Limb5(Limb:x1),Limb6(Limb:x1),Limb7(Limb:x1),Limb8(Limb:x1),Visceral Mass(Vital:x2)",
	"Mollusk(No Limbs)": "Head/Foot(Vital:x1),Visceral Mass(Vital:x2)",
	"Plant": "Stem(Other:x1),Leaves(Other:x1/2),Roots(Other:x1/2)",
	"Quadruped": "Head(Vital:x1),Neck(Vital:x1),Forequarters(Vital:x2),Right Foreleg(Limb:x1/2),Left Foreleg(Limb:x1/2),Right Forefoot(Limb:x1/2),Left Forefoot(Limb:x1/2),Underbelly(Vital:x1),Hindquarters(Vital:x2),Right Hindleg(Limb:x1/2),Left Hindleg(Limb:x1/2),Right Hindfoot(Limb:x1/2),Left Hindfoot(Limb:x1/2)",
	"Quadruped(Tail)": "Head(Vital:x1),Neck(Vital:x1),Forequarters(Vital:x2),Right Foreleg(Limb:x1/2),Left Foreleg(Limb:x1/2),Right Forefoot(Limb:x1/2),Left Forefoot(Limb:x1/2),Underbelly(Vital:x1),Hindquarters(Vital:x2),Right Hindleg(Limb:x1/2),Left Hindleg(Limb:x1/2),Right Hindfoot(Limb:x1/2),Left Hindfoot(Limb:x1/2),Tail(Limb:x1/2)",
	"Quadruped(Wings)": "Head(Vital:x1),Neck(Vital:x1),Forequarters(Vital:x2),Right Foreleg(Limb:x1/2),Left Foreleg(Limb:x1/2),Right Forefoot(Limb:x1/2),Left Forefoot(Limb:x1/2),Underbelly(Vital:x1),Hindquarters(Vital:x2),Right Hindleg(Limb:x1/2),Left Hindleg(Limb:x1/2),Right Hindfoot(Limb:x1/2),Left Hindfoot(Limb:x1/2),Right Wing(Limb:x1/2),Left Wing(Limb:x1/2)",
	"Quadruped(Tail/Wings)": "Head(Vital:x1),Neck(Vital:x1),Forequarters(Vital:x2),Right Foreleg(Limb:x1/2),Left Foreleg(Limb:x1/2),Right Forefoot(Limb:x1/2),Left Forefoot(Limb:x1/2),Underbelly(Vital:x1),Hindquarters(Vital:x2),Right Hindleg(Limb:x1/2),Left Hindleg(Limb:x1/2),Right Hindfoot(Limb:x1/2),Left Hindfoot(Limb:x1/2),Right Wing(Limb:x1/2),Left Wing(Limb:x1/2),Tail(Limb:x1/2)",
	"Reptile": "Head(Vital:x1),Neck(Vital:x1),Forequarters(Vital:x2),Right Foreleg(Limb:x1/2),Left Foreleg(Limb:x1/2),Right Foreclaw(Limb:x1/2),Left Foreclaw(Limb:x1/2),Underbelly(Vital:x1),Hindquarters(Vital:x2),Right Hindleg(Limb:x1/2),Left Hindleg(Limb:x1/2),Right Hindclaw(Limb:x1/2),Left Hindclaw(Limb:x1/2),Upper Tail(Limb:x1),Lower Tail(Limb:x1/2)",
	"Saurian": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Torso(Vital:x2),Left Thigh(Limb:x1),Right Thigh(Limb:x1),Left Shin(Limb:x1/2),Right Shin(Limb:x1/2),Left Foot(Limb:x1/2),Right Foot(Limb:x1/2),Tail(Limb:x2)",
	"Sea Mammal": "Head(Vital:x1),Main Trunk(Vital:x2),Left Flipper(Limb:x1/2),Right Flipper(Limb:x1/2),Rear Trunk(Vital:x2),Fluke/Tail(Limb:x1)",
	"Sea Mammal(Dorsal Finned)": "Head(Vital:x1),Main Trunk(Vital:x2),Left Flipper(Limb:x1/2),Right Flipper(Limb:x1/2),Dorsal Fin(Limb:x1/2),Rear Trunk(Vital:x2),Fluke/Tail(Limb:x1)",
	"Sea Mammal(Tusk)": "Head(Vital:x1),Main Trunk(Vital:x2),Left Flipper(Limb:x1/2),Right Flipper(Limb:x1/2),Rear Trunk(Vital:x2),Fluke/Tail(Limb:x1),Tusk(Limb:x1/2)",
	"Segmented Worm": "Maw(Vital:x1),Brain Segment1(Vital:x1),Left Foot1(Limb:x1/2),Right Foot1(Limb:x1/2),Heart Segment1(Vital:x1),Left Foot2(Limb:x1/2),Right Foot2(Limb:x1/2),Body Segment1(Vital:x1),Left Foot3(Limb:x1/2),Right Foot3(Limb:x1/2),Body Segment2(Vital:x1),Left Foot4(Limb:x1/2),Right Foot4(Limb:x1/2),Brain Segment2(Vital:x1),Left Foot5(Limb:x1/2),Right Foot5(Limb:x1/2),Heart Segment2(Vital:x1),Left Foot6(Limb:x1/2),Right Foot6(Limb:x1/2),Body Segment3(Vital:x1),Left Foot7(Limb:x1/2),Right Foot7(Limb:x1/2),Body Segment4(Vital:x1),Left Foot8(Limb:x1/2),Right Foot8(Limb:x1/2),Brain Segment3(Vital:x1),Left Foot9(Limb:x1/2),Right Foot9(Limb:x1/2),Heart Segment3(Vital:x1),Left Foot10(Limb:x1/2),Right Foot10(Limb:x1/2),Body Segment5(Vital:x1),Left Foot11(Limb:x1/2),Right Foot11(Limb:x1/2),Body Segment6(Vital:x1),Left Foot12(Limb:x1/2),Right Foot12(Limb:x1/2),Body Segment7(Vital:x1),Left Foot12(Limb:x1/2),Right Foot12(Limb:x1/2),Heart Segment4(Vital:x1),Left Foot13(Limb:x1/2),Right Foot13(Limb:x1/2),Body Segment8(Vital:x1),Left Foot14(Limb:x1/2),Right Foot14(Limb:x1/2),Body Segment9(Vital:x1),Left Foot15(Limb:x1/2),Right Foot15(Limb:x1/2),Body Segment10(Vital:x1),Left Foot16(Limb:x1/2),Right Foot16(Limb:x1/2)",
	"Scethen": "Head(Vital:x1),Neck(Vital:x1/2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Upper Torso(Vital:x2),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Mid Torso(Vital:x1),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Abdomen(Vital:x2),Underbelly(Vital:x1),Left Foreleg(Limb:x1),Right Foreleg(Limb:x1),Left Fore Shin(Limb:x1/2),Right Fore Shin(Limb:x1/2),Left Fore Foot(Limb:x1/2),Right Fore Foot(Limb:x1/2),Left Mid Leg(Limb:x1),Right Mid Leg(Limb:x1),Left Mid Shin(Limb:x1/2),Right Mid Shin(Limb:x1/2),Left Mid Foot(Limb:x1/2),Right Mid Foot(Limb:x1/2),Left Hind Leg(Limb:x1),Right Hind Leg(Limb:x1),Left Hind Shin(Limb:x1/2),Right Hind Shin(Limb:x1/2),Left Hind Foot(Limb:x1/2),Right Hind Foot(Limb:x1/2),Segment Tail(Limb:x1),Barb(Limb:x1/2)",
	"Small": "Body(Vital:x1),Limbs(Limb:x1/2)",
	"Snake": "Head(Vital:x1),Upper Length(Vital:x2),Lower Length(Vital:x1),Tail(Limb:x1/2)",
	"Snake(Arms)": "Head(Vital:x1),Upper Length(Vital:x2),Left Shoulder(Limb:x1),Right Shoulder(Limb:x1),Left Arm(Limb:x1),Right Arm(Limb:x1),Left Forearm(Limb:x1/2),Right Forearm(Limb:x1/2),Left Hand(Limb:x1/2),Right Hand(Limb:x1/2),Lower Length(Vital:x1),Tail(Limb:x1/2)",
	"Tiny": "Entire Body(Vital:x1)",
	"Tree": "Low Trunk(Vital:x3),Trunk(Vital:x2),Roots(Vital:x1),Limbs(Limb:x1),Branches(Limb:x1/2)",
};

// @MARKER ARMOUR BLOCKING
// From armorblockingdict. Incoming damage is compared with the total armour at the struck area
// and falls into one of four bands. For that band's value:
//     negative  ->  damage + (total armour x value)     armour subtracts a fraction of itself
//     positive  ->  damage x value                      only that share gets through
//     zero      ->  no damage at all
//                        0            1             2            3
//                        UnderQuarter QuarterToHalf HalfToFull   OverArmour
export const ARMOR_BLOCKING = {
	"Cutting":         [0, 0, 0.25, -0.5],
	"Thrusting":       [0, 0, 0.25, -0.5],
	"Piercing":        [0, 0, 0.25, -0.25],
	"Smashing":        [0, 0, 0.25, -0.5],
	"Crushing":        [0, -0.25, -0.25, -0.25],
	"Constricting":    [0, 0, 0, -1],
	"Force":           [-1, -1, -1, -1],
	"Poison":          [0, 0, 0, 0],
	"Disease":         [0, 0, 0, 0],
	"Light":           [-1, -1, -1, -1],
	"Sonic":           [-1, -1, -1, -1],
	"Frost":           [-1, -1, -1, -1],
	"Kinetic":         [-1, -1, -1, -1],
	"Flame":           [-1, -1, -1, -1],
	"Electricity":     [-1, -1, -1, -1],
	"Acid":            [-1, -1, -1, -1],
	"Aura/Divine":     [-1, -1, -1, -1],
	"Life/Death":      [-1, -1, -1, -1],
	"Obliteration":    [-1, -1, -1, -1],
	"Other":           [-1, -1, -1, -1],
};

// @MARKER ARMOUR DEGRADATION
// From armordamagedict. Armour takes (damage / divider) points of damage itself, using the
// divider for the damage's family and the strongest material covering the struck area.
//                           0      1        2       3
//                           Cut    Thrust   Crush   Constrict
export const ARMOR_DAMAGE_DIVIDERS = {
	"Rags":                    [2, 5, 20, 20],
	"Silk":                    [2, 5, 20, 20],
	"Cloth":                   [2, 5, 20, 20],
	"Woven":                   [2, 5, 20, 20],
	"Wool":                    [3, 5, 20, 20],
	"Padding":                 [3, 5, 20, 20],
	"Soft Leather":            [3, 5, 20, 20],
	"Fur":                     [5, 5, 20, 20],
	"Leather":                 [5, 5, 20, 20],
	"Gambeson":                [3, 5, 20, 20],
	"Hard Leather":            [5, 5, 20, 20],
	"Giant Leather":           [5, 5, 5, 5],
	"Copper":                  [5, 5, 20, 20],
	"Studded Leather":         [5, 5, 20, 20],
	"Gambeson/Thick":          [3, 5, 20, 20],
	"Brass":                   [10, 10, 20, 20],
	"Wood":                    [10, 10, 20, 20],
	"Lacquered Wood":          [10, 10, 20, 20],
	"Gambeson/Heavy":          [3, 5, 20, 20],
	"Bolted Leather":          [5, 5, 20, 20],
	"Ring Mail":               [10, 10, 20, 20],
	"Bone":                    [10, 10, 5, 20],
	"Heavy Bone":              [15, 10, 5, 20],
	"Giant Chitin":            [10, 15, 10, 10],
	"Bronze":                  [15, 10, 5, 20],
	"Chain":                   [15, 10, 15, 20],
	"Heavy Chain":             [15, 10, 15, 20],
	"Banded Chain":            [15, 10, 15, 20],
	"Scale":                   [15, 10, 15, 20],
	"Heavy Scale":             [15, 10, 15, 20],
	"Giant Scales":            [15, 20, 15, 20],
	"Plate":                   [20, 25, 20, 25],
	"Laminar":                 [20, 25, 20, 25],
	"Heavy Plate":             [20, 25, 20, 25],
	"Stainless Steel":         [20, 25, 20, 25],
	"Bloodracite":             [20, 25, 20, 25],
	"Pearlacite":              [20, 25, 20, 25],
	"Stone":                   [20, 25, 20, 25],
	"Tempered Plate":          [20, 25, 20, 25],
	"Titanium":                [25, 30, 25, 30],
};

// @MARKER ARMOUR MATERIAL RANK
// From getArmorValue (sheet-worker.js:118903). Higher is stronger. Used to pick which material's
// degradation divider applies when several layers cover one area.
export const ARMOR_MATERIAL_RANK = {
	"Rags":                    1,
	"Silk":                    1,
	"Cloth":                   2,
	"Woven":                   2,
	"Wool":                    3,
	"Padding":                 3,
	"Soft Leather":            4,
	"Fur":                     5,
	"Leather":                 5,
	"Gambeson":                6,
	"Hard Leather":            6,
	"Copper":                  7,
	"Giant Leather":           7,
	"Studded Leather":         8,
	"Brass":                   9,
	"Gambeson/Thick":          9,
	"Wood":                    10,
	"Lacquered Wood":          11,
	"Gambeson/Heavy":          12,
	"Bolted Leather":          12,
	"Ring Mail":               12,
	"Bone":                    13,
	"Heavy Bone":              14,
	"Giant Chitin":            14,
	"Bronze":                  15,
	"Chain":                   15,
	"Heavy Chain":             16,
	"Banded Chain":            17,
	"Scale":                   18,
	"Heavy Scale":             19,
	"Giant Scales":            19,
	"Plate":                   20,
	"Laminar":                 21,
	"Heavy Plate":             22,
	"Stainless Steel":         22,
	"Bloodracite":             23,
	"Pearlacite":              23,
	"Stone":                   23,
	"Tempered Plate":          24,
	"Titanium":                25,
};

// @MARKER ARMOUR COVERAGE BY BODY TYPE
// From getArmorValuesByBodyTypeAndArmor (sheet-worker.js:105929). Which armour slot covers each
// area, for the eight body-type families his code handles. A family matches by substring, so
// "Humanoid" serves every Humanoid variant. Any family absent here -- Bird, Quadruped, Fish
// and the rest -- takes no protection from worn armour, which is what his sheet does too.
//
// Keyed by area NAME rather than by position. His version switches on the area's position in
// the body chart, and two of his branches have drifted out of step with the charts they serve,
// so a position-keyed port would put armour on the wrong limb. See docs/UPSTREAM-ISSUES.md.
export const ARMOR_COVERAGE_BY_BODY_TYPE = {
	"Humanoid": {
		"Head":                    "head",
		"Neck":                    "neck",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Upper Torso":             "torsoUpper",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Mid Torso":               "torsoMid",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
		"Lower Torso":             "torsoLower",
		"Left Thigh":              "thighLeft",
		"Right Thigh":             "thighRight",
		"Left Shin":               "shinLeft",
		"Right Shin":              "shinRight",
		"Left Foot":               "footLeft",
		"Right Foot":              "footRight",
		"Finned Tail":             "thighLeft",
		"Left Hoof":               "footLeft",
		"Right Hoof":              "footRight",
	},
	"Saurian": {
		"Head":                    "head",
		"Neck":                    "neck",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Upper Torso":             "torsoUpper",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Mid Torso":               "torsoMid",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
		"Lower Torso":             "torsoLower",
		"Left Thigh":              "thighLeft",
		"Right Thigh":             "thighRight",
		"Left Shin":               "shinLeft",
		"Right Shin":              "shinRight",
		"Left Foot":               "footLeft",
		"Right Foot":              "footRight",
	},
	"Insectoid": {
		"Head":                    "head",
		"Thorax":                  "torsoUpper",
		"Left Upper Arm":          "armLeft",
		"Right Upper Arm":         "armRight",
		"Left Upper Forearm":      "forearmLeft",
		"Right Upper Forearm":     "forearmRight",
		"Left Upper Hand":         "handLeft",
		"Right Upper Hand":        "handRight",
		"Left Mid Arm":            "armLeft",
		"Right Mid Arm":           "armRight",
		"Left Mid Forearm":        "forearmLeft",
		"Right Mid Forearm":       "forearmRight",
		"Left Mid Claw/Hand":      "handLeft",
		"Right Mid Claw/Hand":     "handRight",
		"Left Leg":                "thighLeft",
		"Right Leg":               "thighRight",
		"Left Lower Leg":          "shinLeft",
		"Right Lower Leg":         "shinRight",
		"Left Foot":               "footLeft",
		"Right Foot":              "footRight",
		"Abdomen":                 "torsoLower",
	},
	"Snake": {
		"Head":                    "head",
		"Upper Length":            "torsoUpper",
		"Lower Length":            "torsoLower",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
	},
	"Centaur": {
		"Head":                    "head",
		"Neck":                    "neck",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Upper Torso":             "torsoUpper",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
		"Forequarters":            "torsoLower",
		"Left Foreleg":            "torsoLower",
		"Right Foreleg":           "torsoLower",
		"Hindquarters":            "torsoLower",
		"Left Hindleg":            "torsoLower",
		"Right Hindleg":           "torsoLower",
	},
	"Arachen": {
		"Head":                    "head",
		"Neck":                    "neck",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Upper Torso":             "torsoUpper",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Mid Torso":               "torsoMid",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
		"Abdomen":                 "torsoLower",
		"Left Foreleg":            "torsoLower",
		"Right Foreleg":           "torsoLower",
		"Left Mid Leg":            "torsoLower",
		"Right Mid Leg":           "torsoLower",
		"Left Hind Leg":           "torsoLower",
		"Right Hind Leg":          "torsoLower",
	},
	"Scethen": {
		"Head":                    "head",
		"Neck":                    "neck",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Upper Torso":             "torsoUpper",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Mid Torso":               "torsoMid",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
		"Abdomen":                 "torsoLower",
		"Left Foreleg":            "torsoLower",
		"Right Foreleg":           "torsoLower",
		"Left Mid Leg":            "torsoLower",
		"Right Mid Leg":           "torsoLower",
		"Left Hind Leg":           "torsoLower",
		"Right Hind Leg":          "torsoLower",
	},
	"Brachara": {
		"Head":                    "head",
		"Neck":                    "neck",
		"Left Shoulder":           "shoulderLeft",
		"Right Shoulder":          "shoulderRight",
		"Upper Torso":             "torsoUpper",
		"Left Arm":                "armLeft",
		"Right Arm":               "armRight",
		"Left Forearm":            "forearmLeft",
		"Right Forearm":           "forearmRight",
		"Left Hand":               "handLeft",
		"Right Hand":              "handRight",
		"Mid Torso":               "torsoMid",
		"Left Mid Arm":            "armLeft",
		"Right Mid Arm":           "armRight",
		"Left Mid Forearm":        "forearmLeft",
		"Right Mid Forearm":       "forearmRight",
		"Abdomen":                 "torsoLower",
		"Left Foreleg":            "torsoLower",
		"Right Foreleg":           "torsoLower",
		"Left Mid Leg":            "torsoLower",
		"Right Mid Leg":           "torsoLower",
		"Left Hind Leg":           "torsoLower",
		"Right Hind Leg":          "torsoLower",
	},
};

// Areas that take armour only from a particular item -- a Centaur's quarters and legs are
// covered by barding and by nothing else.
export const ARMOR_REQUIRES_ITEM = {
	"Centaur": {
		"Forequarters":            "Centaur Barding",
		"Left Foreleg":            "Centaur Barding",
		"Right Foreleg":           "Centaur Barding",
		"Hindquarters":            "Centaur Barding",
		"Left Hindleg":            "Centaur Barding",
		"Right Hindleg":           "Centaur Barding",
	},
	"Arachen": {
		"Abdomen":                 "Insectaur Barding",
		"Left Foreleg":            "Insectaur Barding",
		"Right Foreleg":           "Insectaur Barding",
		"Left Mid Leg":            "Insectaur Barding",
		"Right Mid Leg":           "Insectaur Barding",
		"Left Hind Leg":           "Insectaur Barding",
		"Right Hind Leg":          "Insectaur Barding",
	},
	"Scethen": {
		"Abdomen":                 "Insectaur Barding",
		"Left Foreleg":            "Insectaur Barding",
		"Right Foreleg":           "Insectaur Barding",
		"Left Mid Leg":            "Insectaur Barding",
		"Right Mid Leg":           "Insectaur Barding",
		"Left Hind Leg":           "Insectaur Barding",
		"Right Hind Leg":          "Insectaur Barding",
	},
	"Brachara": {
		"Abdomen":                 "Insectaur Barding",
		"Left Foreleg":            "Insectaur Barding",
		"Right Foreleg":           "Insectaur Barding",
		"Left Mid Leg":            "Insectaur Barding",
		"Right Mid Leg":           "Insectaur Barding",
		"Left Hind Leg":           "Insectaur Barding",
		"Right Hind Leg":          "Insectaur Barding",
	},
};

// @MARKER SHIELD COVERAGE BY HANDEDNESS
// From equipShield (sheet-worker.js:103777). Which areas a shield covers, by body-type
// family, shield size and the wielder's handedness. A shield is a FIFTH layer, added on
// top of the four worn ones, and every area it covers gains the shield's own armour value.
//
// A shield is held in the off hand, so a right-hander is covered down the LEFT side. His
// code tests only for "Left" and takes everything else as right-handed, which is how an
// Ambidextrous character -- a real value his racial code sets -- ends up on the right.
//
// A Buckler appears twice: on the hand, or strapped to the forearm, which is the choice
// his equip_buckler_on_wrist flag makes. The larger sizes add an area each as they grow --
// forearm and hand, then the arm, then the shoulder, and a Body shield the whole flank.
//
// Keyed by area NAME, not by his positions. His Snake and Centaur branches are displaced
// by one in exactly the way his armour branches are -- docs/UPSTREAM-ISSUES.md items 17
// and 18, showing up a second time here. Families absent below take no shield cover.
export const SHIELD_COVERAGE = {
	"Humanoid": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Right Thigh", "Right Shin", "Right Foot", "Right Hoof"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Left Thigh", "Finned Tail", "Left Shin", "Left Foot", "Left Hoof"] },
	},
	"Saurian": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Right Thigh", "Right Shin", "Right Foot"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Left Thigh", "Left Shin", "Left Foot"] },
	},
	"Insectoid": {
		"Buckler(Wrist)":  { "Left": ["Right Upper Forearm"], "Right": ["Left Upper Forearm"] },
		"Buckler":         { "Left": ["Right Upper Hand"], "Right": ["Left Upper Hand"] },
		"Small":           { "Left": ["Right Upper Forearm", "Right Upper Hand"], "Right": ["Left Upper Forearm", "Left Upper Hand"] },
		"Medium":          { "Left": ["Right Upper Arm", "Right Upper Forearm", "Right Upper Hand"], "Right": ["Left Upper Arm", "Left Upper Forearm", "Left Upper Hand"] },
		"Large":           { "Left": ["Right Upper Arm", "Right Upper Forearm", "Right Upper Hand"], "Right": ["Left Upper Arm", "Left Upper Forearm", "Left Upper Hand"] },
		"Body":            { "Left": ["Right Upper Arm", "Right Upper Forearm", "Right Upper Hand", "Right Leg", "Right Lower Leg", "Right Foot"], "Right": ["Left Upper Arm", "Left Upper Forearm", "Left Upper Hand", "Left Leg", "Left Lower Leg", "Left Foot"] },
	},
	"Snake": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Lower Length", "Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Tail"], "Right": ["Lower Length", "Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Tail"] },
	},
	"Centaur": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Right Foreleg", "Right Fore Shin"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Left Foreleg", "Left Fore Shin"] },
	},
	"Arachen": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Right Foreleg", "Right Fore Shin", "Right Fore Foot"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Left Foreleg", "Left Fore Shin", "Left Fore Foot"] },
	},
	"Scethen": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Right Foreleg", "Right Fore Shin", "Right Fore Foot"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Left Foreleg", "Left Fore Shin", "Left Fore Foot"] },
	},
	"Brachara": {
		"Buckler(Wrist)":  { "Left": ["Right Forearm"], "Right": ["Left Forearm"] },
		"Buckler":         { "Left": ["Right Hand"], "Right": ["Left Hand"] },
		"Small":           { "Left": ["Right Forearm", "Right Hand"], "Right": ["Left Forearm", "Left Hand"] },
		"Medium":          { "Left": ["Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Arm", "Left Forearm", "Left Hand"] },
		"Large":           { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand"] },
		"Body":            { "Left": ["Right Shoulder", "Right Arm", "Right Forearm", "Right Hand", "Right Foreleg", "Right Fore Shin", "Right Fore Foot"], "Right": ["Left Shoulder", "Left Arm", "Left Forearm", "Left Hand", "Left Foreleg", "Left Fore Shin", "Left Fore Foot"] },
	},
};

// The five sizes, smallest first, as his equipShield tests them. A shield's name carries
// its size, so "Shield(Large/Steel)" is a Large.
export const SHIELD_SIZES = ["Buckler", "Small", "Medium", "Large", "Body"];

// @END (CODE)
