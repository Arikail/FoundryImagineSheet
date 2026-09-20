// @START (CODE)
// @MARKER ADVANCEMENT TABLES
//==================================================================================================================
// GENERATED FILE -- do not edit by hand.
// Produced by tools/extract/extract_advancement_tables.py from the original Roll20 sheet-worker.
// Regenerate rather than editing, or this will drift from his sheet.
//==================================================================================================================

// @MARKER THE GOAL LADDER
// From getNewGoal (sheet-worker.js:91915). The experience each goal BEGINS at, so a
// character's goal is the highest entry their experience reaches. Three goals make a title.
// The three negative goals are his Zero Title -- Petitioner, Student and Apprentice.
// Goal -3 has no floor in his code (anything below), so it is written at getExpByGoal's
// own figure for it. Goal -2 begins at -999 because that is where getNewGoal puts it;
// getExpByGoal says -1000, and the two are one point apart. UPSTREAM-ISSUES.md.
//
// Taken from getNewGoal rather than getExpByGoal because that switch writes `case 30:`
// twice, where the second belongs to goal 40, leaving goal 40 answering 0 on his sheet.
export const GOAL_EXP = {
	"-3": -1500,
	"-2": -999,
	"-1": -500,
	"0": 0,
	"1": 500,
	"2": 1000,
	"3": 1500,
	"4": 2500,
	"5": 3500,
	"6": 4500,
	"7": 6000,
	"8": 7500,
	"9": 9000,
	"10": 11000,
	"11": 13000,
	"12": 15000,
	"13": 18000,
	"14": 21000,
	"15": 24000,
	"16": 28000,
	"17": 32000,
	"18": 36000,
	"19": 41000,
	"20": 46000,
	"21": 51000,
	"22": 61000,
	"23": 71000,
	"24": 86000,
	"25": 101000,
	"26": 116000,
	"27": 136000,
	"28": 156000,
	"29": 176000,
	"30": 206000,
	"31": 236000,
	"32": 266000,
	"33": 306000,
	"34": 346000,
	"35": 386000,
	"36": 436000,
	"37": 486000,
	"38": 536000,
	"39": 606000,
	"40": 676000,
	"41": 746000,
	"42": 836000,
	"43": 926000,
	"44": 1016000,
};

// @MARKER THE TITLE LADDER
// From getNewTitle (sheet-worker.js:91894). Title 1 is Mortal; 11 begins Arch Mortal.
// His table stops at 15 -- "if deities are allowed" is commented out throughout.
export const TITLE_EXP = {
	"0": -1500,
	"1": 0,
	"2": 1500,
	"3": 4500,
	"4": 9000,
	"5": 15000,
	"6": 24000,
	"7": 36000,
	"8": 51000,
	"9": 86000,
	"10": 136000,
	"11": 206000,
	"12": 306000,
	"13": 436000,
	"14": 606000,
	"15": 836000,
};

// @MARKER THE EXPERIENCE CAP
// From getExpCapByExistingTitle (sheet-worker.js:91968). Experience is refused above this
// until the character levels up, so nobody banks more than about a title and a half
// ahead. Titles 13, 14 and 15 share a cap: his sheet will not pass 15 (deities are off).
export const EXP_CAP_BY_TITLE = {
	"0": 4499,
	"1": 8999,
	"2": 14999,
	"3": 23999,
	"4": 35999,
	"5": 50999,
	"6": 85999,
	"7": 135999,
	"8": 205999,
	"9": 305999,
	"10": 435999,
	"11": 605999,
	"12": 835999,
	"13": 1125999,
	"14": 1125999,
	"15": 1125999,
};

// @MARKER SKILL POINTS PER GOAL
// From getSkillPointsByClass (sheet-worker.js:94571). Every goal advance gives this many
// points, each worth +1%% on a class skill the character has already acquired. GME gets
// none, having no class skills at all.
export const SKILL_POINTS_BY_CLASS = {
	"Acrobat": 17,
	"Alchemist": 18,
	"Arcanist": 20,
	"Archer": 19,
	"Archer(Arcane)": 19,
	"Archer(Zen)": 21,
	"Assassin": 18,
	"Bandit": 17,
	"Banisher": 19,
	"Bard": 19,
	"Battlemancer": 18,
	"Beastmaster": 21,
	"Beguiler": 20,
	"Berserker": 17,
	"Border Scout": 19,
	"Bounty Hunter": 18,
	"Buccaneer": 18,
	"Cacophonist": 18,
	"Cajoler": 18,
	"Cavalier": 15,
	"Channeler": 17,
	"Conqueror": 18,
	"Crypt Robber": 20,
	"Curse Breaker": 19,
	"Delver": 20,
	"Dervish": 17,
	"Dreamer": 19,
	"Druid": 18,
	"Duelist": 16,
	"Elemental Dancer": 18,
	"Elementalist": 20,
	"Enchanter": 19,
	"Exorcist": 17,
	"Explorer": 17,
	"GME": 0,
	"Gypsy": 21,
	"Harbinger": 20,
	"Harmonist": 18,
	"Healer": 17,
	"Heretic": 18,
	"Hermeticist": 18,
	"Hero": 18,
	"Hunter": 17,
	"Illuminator": 17,
	"Innominate": 20,
	"Inquisitor": 20,
	"Intercessor": 20,
	"Investigator": 20,
	"Jester": 17,
	"Kineticist": 19,
	"Knight": 17,
	"Knight(Dark)": 17,
	"Knight(Death)": 17,
	"Legendier": 21,
	"Luckster": 18,
	"Mage": 17,
	"Martial Artist": 19,
	"Medium": 19,
	"Mentalist": 15,
	"Minstrel": 18,
	"Missionary": 19,
	"Monk": 21,
	"Mounted Archer": 17,
	"Necromancer": 18,
	"Obscuratum": 20,
	"Paladin": 19,
	"Plunderer": 20,
	"Priest": 18,
	"Priest(Dark)": 18,
	"Psychokineticist": 20,
	"Ranger": 18,
	"Ritual Leader": 20,
	"Rogue": 18,
	"Runesmith": 18,
	"Sage": 20,
	"Seer": 21,
	"Shadow Stalker": 16,
	"Shadowfrost Caster": 17,
	"Shaman": 17,
	"Shaman(Drum)": 17,
	"Shaman(Rune)": 18,
	"Sorcerer": 18,
	"Summoner": 19,
	"Trickster": 19,
	"Vivisectionist": 19,
	"Warden": 19,
	"Warrior": 17,
	"Wilder": 18,
	"Witch Hunter": 18,
	"Witch(Black)": 18,
	"Witch(Gray)": 18,
	"Witch(White)": 18,
};

// @MARKER ADD NEW advancement tables HERE
// @END (CODE)
