// @START (CODE)
// @MARKER STARTING KIT TABLES
//==================================================================================================================
// GENERATED FILE -- do not edit by hand.
// Produced by tools/extract/extract_starting_kit.py from the original Roll20 sheet-worker.
// Regenerate rather than editing, or this will drift from his sheet.
//
// The three OPTIONAL ways his sheet gives a new character its kit. Any combination may be on, and
// all three are off by default, because his own sheet leaves them off and a Game Master who has
// not asked for them should not find gear appearing on their players.
//
//     by CULTURE   wilderness gear suited to the race, taken INSTEAD of starting coins
//     by STATUS    free clothing by race, social class, gender and style
//     by SKILLS    each social skill the character took brings its own tools
//
// Social class drives two of the three, and his rule for a being outside the mortal range is the
// same in both: a social class below 5 or above 20 has no meaning in the mortal realms, so an
// APPARENT one is rolled (5d4) and used instead. That is done once, by the caller, so the same
// apparent class serves the clothing and the gear rather than each rolling its own.
//==================================================================================================================

// @MARKER GEAR BY CULTURE -- which kit each race takes.
export const RACE_WILDERNESS_KIT = {
	"Apocritara": "setStandardWildernessEquipment",
	"Arachen": "setNoArmorCompressedSocialWildernessEquipment",
	"Avian(Dark)": "setStandardWildernessEquipment",
	"Avian(Forest)": "setStandardWildernessEquipment",
	"Avian(Mountain)": "setStandardWildernessEquipment",
	"Ba’Cora": "setStandardWildernessEquipment",
	"Beastman": "setStandardWildernessEquipment",
	"Bracharia": "setNoArmorCompressedSocialWildernessEquipment",
	"Brok": "setStandardWildernessEquipment",
	"Brownie": "setGnomeWildernessEquipment",
	"Centaur": "setNoArmorCompressedSocialWildernessEquipment",
	"Cervara": "setStandardWildernessEquipment",
	"Changeling": "setStandardWildernessEquipment",
	"Chetahl": "setStandardWildernessEquipment",
	"Crystori": "setNoArmorCompressedSocialWildernessEquipment",
	"Dao": "setLightChainWildernessEquipment",
	"Djinn": "setStandardWildernessEquipment",
	"Dryad": "setStandardWildernessEquipment",
	"Dwarf(Civilized)": "setLightChainWildernessEquipment",
	"Dwarf(Dark)": "setLightChainWildernessEquipment",
	"Dwarf(Fire)": "setLightChainWildernessEquipment",
	"Dwarf(Iron)": "setNoArmorCompressedSocialWildernessEquipment",
	"Dwarf(Mountain)": "setLightChainWildernessEquipment",
	"Dwarf(Stone)": "setNoArmorCompressedSocialWildernessEquipment",
	"Elf(Dark)": "setStandardWildernessEquipment",
	"Elf(Desert)": "setStandardWildernessEquipment",
	"Elf(Dread)": "setStandardWildernessEquipment",
	"Elf(Gray)": "setStandardWildernessEquipment",
	"Elf(High)": "setStandardWildernessEquipment",
	"Elf(Ice)": "setStandardWildernessEquipment",
	"Elf(Sea)": "setStandardWildernessEquipment",
	"Elf(Shadow)": "setStandardWildernessEquipment",
	"Elf(Silver)": "setStandardWildernessEquipment",
	"Elf(Wild)": "setStandardWildernessEquipment",
	"Elf(Wood)": "setStandardWildernessEquipment",
	"Equara": "setLightChainWildernessEquipment",
	"Fairy": "setGnomeWildernessEquipment",
	"Fairy(Dark)": "setGnomeWildernessEquipment",
	"Famorian": "setLightChainWildernessEquipment",
	"Formless": "setStandardWildernessEquipment",
	"Gaunt": "setStandardWildernessEquipment",
	"Geebra": "setStandardWildernessEquipment",
	"Giant(Civilized)": "setGiantWildernessEquipment",
	"Giant(Civilized:Seafaring)": "setGiantWildernessEquipment",
	"Giant(True)": "setGiantWildernessEquipment",
	"Gnome": "setGnomeWildernessEquipment",
	"Goblin(Forest)": "setGoblinForestWildernessEquipment",
	"Goblin(Mountain)": "setLightChainWildernessEquipment",
	"Goblin(Mountain:Magic)": "setLightChainWildernessEquipment",
	"Goblin(Plains)": "setLightChainWildernessEquipment",
	"Grahl": "setLightChainWildernessEquipment",
	"Gremlin": "setStandardWildernessEquipment",
	"Grethen": "setStandardWildernessEquipment",
	"Gryphara": "setStandardWildernessEquipment",
	"Hippotara": "setLightChainWildernessEquipment",
	"Hobgoblin": "setLightChainWildernessEquipment",
	"Human(Barbaric)": "setLightChainWildernessEquipment",
	"Human(Civilized:City)": "setLightChainWildernessEquipment",
	"Human(Civilized:Port)": "setLightChainWildernessEquipment",
	"Human(Civilized:Town)": "setLightChainWildernessEquipment",
	"Human(Civilized:Village)": "setLightChainWildernessEquipment",
	"Ifrit": "setStandardWildernessEquipment",
	"Jumara": "setStandardWildernessEquipment",
	"Katara": "setNoArmorCompressedSocialWildernessEquipment",
	"Kenku": "setStandardWildernessEquipment",
	"Kerasara": "setLightChainWildernessEquipment",
	"Lagara": "setStandardWildernessEquipment",
	"Leprechaun": "setStandardWildernessEquipment",
	"Lissara": "setStandardWildernessEquipment",
	"Lotara": "setStandardWildernessEquipment",
	"Loxodara": "setLightChainWildernessEquipment",
	"Lutrinara": "setStandardWildernessEquipment",
	"Maginos": "setNoArmorCompressedSocialWildernessEquipment",
	"Maginos(Clay)": "setNoArmorCompressedSocialWildernessEquipment",
	"Maginos(Metal)": "setNoArmorCompressedSocialWildernessEquipment",
	"Maginos(Stone)": "setNoArmorCompressedSocialWildernessEquipment",
	"Maginos(Wood)": "setNoArmorCompressedSocialWildernessEquipment",
	"Marid": "setStandardWildernessEquipment",
	"Mechanos": "setNoArmorCompressedSocialWildernessEquipment",
	"Mellivara": "setStandardWildernessEquipment",
	"Mephyt(Fire)": "setStandardWildernessEquipment",
	"Mephyt(Ice)": "setStandardWildernessEquipment",
	"Merfolk": "setStandardWildernessEquipment",
	"Midfolk(Forest)": "setStandardWildernessEquipment",
	"Midfolk(River)": "setStandardWildernessEquipment",
	"Midfolk(Town)": "setStandardWildernessEquipment",
	"Nixie": "setGnomeWildernessEquipment",
	"Nymph": "setStandardWildernessEquipment",
	"Ogre": "setLightChainWildernessEquipment",
	"Ogre(Magic)": "setLightChainWildernessEquipment",
	"Planar": "setLightChainWildernessEquipment",
	"Podling": "setGnomeWildernessEquipment",
	"Ratahl": "setStandardWildernessEquipment",
	"S’rett": "setStandardWildernessEquipment",
	"Sasquatch/Yeti": "setLightChainWildernessEquipment",
	"Satyr/Fawn": "setStandardWildernessEquipment",
	"Saurian": "setStandardWildernessEquipment",
	"Scethen": "setNoArmorCompressedSocialWildernessEquipment",
	"Se’eth": "setStandardWildernessEquipment",
	"Sha’Cora": "setStandardWildernessEquipment",
	"Sporeling": "setGnomeWildernessEquipment",
	"Sura’keth": "setStandardWildernessEquipment",
	"Sura’rath": "setStandardWildernessEquipment",
	"Susara": "setStandardWildernessEquipment",
	"Sylph": "setStandardWildernessEquipment",
	"Taurian": "setLightChainWildernessEquipment",
	"Testudara": "setStandardWildernessEquipment",
	"Troll": "setNoArmorCompressedSocialWildernessEquipment",
	"Troll(Ice)": "setNoArmorCompressedSocialWildernessEquipment",
	"Troll(Rock)": "setNoArmorCompressedSocialWildernessEquipment",
	"Ursara": "setLightChainWildernessEquipment",
	"Vulpara": "setStandardWildernessEquipment",
	"Whalrog": "setStandardWildernessEquipment",
	"Wildling": "setStandardWildernessEquipment",
	"Wolfen": "setStandardWildernessEquipment",
	"Xar’Xeth": "setNoArmorCompressedSocialWildernessEquipment"
};

// Each kit by social class. A band holding more than one entry is a die roll
// between them, which is how his own code writes it.
export const WILDERNESS_KITS = {
	"setGiantWildernessEquipment": {
		"5": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Giant Dagger",
					"Giant Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"6": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Giant Dagger",
					"Giant Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"7": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Giant Dagger",
					"Giant Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"8": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Dagger",
					"Giant Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear"
				]
			}
		],
		"9": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Dagger",
					"Giant Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear"
				]
			}
		],
		"10": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Medium Tree",
					"Giant Dagger"
				]
			}
		],
		"11": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Medium Tree",
					"Giant Dagger"
				]
			}
		],
		"12": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"13": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"14": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"15": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"16": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"17": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"18": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"19": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		],
		"20": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Spear",
					"Giant Giant Medium Tree",
					"Giant Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Dagger",
					"Giant Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Giant Battle Axe",
					"Giant Hand Axe",
					"Giant Bastard Sword"
				]
			}
		]
	},
	"setGnomeWildernessEquipment": {
		"5": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Fairy Dagger",
					"Fairy Staff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"6": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Fairy Dagger",
					"Fairy Staff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"7": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Fairy Dagger",
					"Fairy Staff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"8": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Dagger",
					"Fairy Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear"
				]
			}
		],
		"9": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Dagger",
					"Fairy Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear"
				]
			}
		],
		"10": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy War Hammer",
					"Fairy Dagger"
				]
			}
		],
		"11": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy War Hammer",
					"Fairy Dagger"
				]
			}
		],
		"12": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"13": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"14": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"15": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"16": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"17": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"18": [
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"19": [
			{},
			{},
			{},
			{},
			{},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		],
		"20": [
			{},
			{},
			{},
			{},
			{},
			{
				"armorClothing": [
					"Armor(Hard Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			},
			{
				"weapons": [
					"Fairy Spear",
					"Fairy War Hammer",
					"Fairy Short Sword"
				]
			},
			{
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Dagger",
					"Fairy Broad Sword"
				]
			},
			{
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Long Sword"
				]
			},
			{
				"weapons": [
					"Fairy Battle Axe",
					"Fairy Hand Axe",
					"Fairy Bastard Sword"
				]
			}
		]
	},
	"setGoblinForestWildernessEquipment": {
		"5": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"6": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"7": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"8": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"9": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"10": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"11": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"12": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"13": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"14": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"15": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"16": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"17": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"18": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"19": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"20": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		]
	},
	"setLightChainWildernessEquipment": {
		"5": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"6": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"7": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"8": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"9": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"10": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"11": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"12": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"13": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"14": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"15": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"16": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"17": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"18": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"19": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"20": [
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Light Chain)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		]
	},
	"setNoArmorCompressedSocialWildernessEquipment": {
		"5": [
			{
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"6": [
			{
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"7": [
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"8": [
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"9": [
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"10": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"11": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"12": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"13": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"14": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"15": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"16": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"17": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"18": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"19": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"20": [
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		]
	},
	"setStandardWildernessEquipment": {
		"0": [
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Stone)"
				],
				"generalEquipment": [
					"Waterskin(3-days)"
				]
			},
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Obsidian)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"1": [
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Stone)"
				],
				"generalEquipment": [
					"Waterskin(3-days)"
				]
			},
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Obsidian)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"2": [
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Stone)"
				],
				"generalEquipment": [
					"Waterskin(3-days)"
				]
			},
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Obsidian)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"3": [
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Stone)"
				],
				"generalEquipment": [
					"Waterskin(3-days)"
				]
			},
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Obsidian)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"4": [
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Stone)"
				],
				"generalEquipment": [
					"Waterskin(3-days)"
				]
			},
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Obsidian)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"5": [
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Stone)"
				],
				"generalEquipment": [
					"Waterskin(3-days)"
				]
			},
			{
				"armorClothing": [
					"Tunic(Leather)"
				],
				"weapons": [
					"Club",
					"Knife(Obsidian)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"6": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"7": [
			{
				"armorClothing": [
					"Tunic(Leather)",
					"Breeches(Leather)"
				],
				"weapons": [
					"Dagger",
					"Quarterstaff"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				]
			}
		],
		"8": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"9": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Dagger",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear"
				]
			}
		],
		"10": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"11": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"Hand Axe"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"War Club",
					"Dagger"
				]
			}
		],
		"12": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"13": [
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"14": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"15": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"16": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"17": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"18": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"19": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		],
		"20": [
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Spear",
					"War Club",
					"Short Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Dagger",
					"Broad Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Long Sword"
				]
			},
			{
				"armorClothing": [
					"Armor Suit(Leather)",
					"Shield(Medium/Wood)"
				],
				"generalEquipment": [
					"Waterskin(1-week)"
				],
				"weapons": [
					"Battle Axe",
					"Hand Axe",
					"Bastard Sword"
				]
			}
		]
	}
};

// @MARKER BY STATUS -- free clothing. Race to wardrobe, then wardrobe by
// style, gender and the social class at or above which it is worn.
export const RACE_WARDROBE = {
	"Apocritara": "wardrobe01",
	"Arachen": "wardrobe02",
	"Avian(Dark)": "wardrobe01",
	"Avian(Forest)": "wardrobe01",
	"Avian(Mountain)": "wardrobe01",
	"Ba’Cora": "wardrobe01",
	"Beastman": "wardrobe03",
	"Bracharia": "wardrobe02",
	"Brok": "wardrobe03",
	"Brownie": "wardrobe04",
	"Centaur": "wardrobe05",
	"Cervara": "wardrobe03",
	"Changeling": "wardrobe04",
	"Chetahl": "wardrobe03",
	"Crystori": "wardrobe06",
	"Dao": "wardrobe04",
	"Djinn": "wardrobe01",
	"Dryad": "wardrobe03",
	"Dwarf(Civilized)": "wardrobe04",
	"Dwarf(Dark)": "wardrobe07",
	"Dwarf(Fire)": "wardrobe04",
	"Dwarf(Iron)": "wardrobe06",
	"Dwarf(Mountain)": "wardrobe03",
	"Dwarf(Stone)": "wardrobe06",
	"Elf(Dark)": "wardrobe07",
	"Elf(Desert)": "wardrobe07",
	"Elf(Dread)": "wardrobe04",
	"Elf(Gray)": "wardrobe04",
	"Elf(High)": "wardrobe04",
	"Elf(Ice)": "wardrobe04",
	"Elf(Sea)": "wardrobe04",
	"Elf(Shadow)": "wardrobe04",
	"Elf(Silver)": "wardrobe04",
	"Elf(Wild)": "wardrobe03",
	"Elf(Wood)": "wardrobe03",
	"Equara": "wardrobe03",
	"Fairy": "wardrobe04",
	"Fairy(Dark)": "wardrobe04",
	"Famorian": "wardrobe04",
	"Formless": "wardrobe04",
	"Gaunt": "wardrobe04",
	"Geebra": "wardrobe03",
	"Giant(Civilized)": "wardrobe08",
	"Giant(Civilized:Seafaring)": "wardrobe08",
	"Giant(True)": "wardrobe08",
	"Gnome": "wardrobe03",
	"Goblin(Forest)": "wardrobe03",
	"Goblin(Mountain)": "wardrobe03",
	"Goblin(Mountain:Magic)": "wardrobe03",
	"Goblin(Plains)": "wardrobe03",
	"Grahl": "wardrobe04",
	"Gremlin": "wardrobe03",
	"Grethen": "wardrobe03",
	"Gryphara": "wardrobe01",
	"Hippotara": "wardrobe09",
	"Hobgoblin": "wardrobe03",
	"Human(Barbaric)": "wardrobe03",
	"Human(Civilized:City)": "wardrobe04",
	"Human(Civilized:Port)": "wardrobe04",
	"Human(Civilized:Town)": "wardrobe04",
	"Human(Civilized:Village)": "wardrobe04",
	"Ifrit": "wardrobe04",
	"Jumara": "wardrobe03",
	"Katara": "wardrobe05",
	"Kenku": "wardrobe01",
	"Kerasara": "wardrobe03",
	"Lagara": "wardrobe03",
	"Leprechaun": "wardrobe04",
	"Lissara": "wardrobe10",
	"Lotara": "wardrobe03",
	"Loxodara": "wardrobe03",
	"Lutrinara": "wardrobe09",
	"Maginos": "wardrobe06",
	"Maginos(Clay)": "wardrobe06",
	"Maginos(Metal)": "wardrobe06",
	"Maginos(Stone)": "wardrobe06",
	"Maginos(Wood)": "wardrobe06",
	"Marid": "wardrobe09",
	"Mechanos": "wardrobe06",
	"Mellivara": "wardrobe03",
	"Mephyt(Fire)": "wardrobe01",
	"Mephyt(Ice)": "wardrobe01",
	"Merfolk": "wardrobe09",
	"Midfolk(Forest)": "wardrobe03",
	"Midfolk(River)": "wardrobe04",
	"Midfolk(Town)": "wardrobe04",
	"Nixie": "wardrobe09",
	"Nymph": "wardrobe04",
	"Ogre": "wardrobe03",
	"Ogre(Magic)": "wardrobe03",
	"Planar": "wardrobe04",
	"Podling": "wardrobe04",
	"Ratahl": "wardrobe03",
	"Sasquatch/Yeti": "wardrobe03",
	"Satyr/Fawn": "wardrobe03",
	"Saurian": "wardrobe11",
	"Scethen": "wardrobe02",
	"Se’eth": "wardrobe12",
	"Sha’Cora": "wardrobe09",
	"Sporeling": "wardrobe04",
	"Sura’keth": "wardrobe01",
	"Sura’rath": "wardrobe10",
	"Susara": "wardrobe03",
	"Sylph": "wardrobe01",
	"S’rett": "wardrobe11",
	"Taurian": "wardrobe03",
	"Testudara": "wardrobe03",
	"Troll": "wardrobe03",
	"Troll(Ice)": "wardrobe03",
	"Troll(Rock)": "wardrobe03",
	"Ursara": "wardrobe03",
	"Vulpara": "wardrobe03",
	"Whalrog": "wardrobe09",
	"Wildling": "wardrobe03",
	"Wolfen": "wardrobe03",
	"Xar’Xeth": "wardrobe07"
};

export const WARDROBES = {
	"wardrobe01": {
		"any": {
			"any": {
				"14": [
					"Headdress(Silk)",
					"Tunic(Silk)",
					"Breeches(Silk)",
					"Cloak(Fur-lined)",
					"Scarf(Silk)",
					"Goggles(Flying)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"11": [
					"Headdress(Wool)",
					"Tunic(Wool)",
					"Breeches(Wool)",
					"Cloak",
					"Scarf(Wool)",
					"Goggles(Flying)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"9": [
					"Headdress(Cloth)",
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Scarf(Cloth)",
					"Goggles(Flying)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt(Rope)",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			}
		}
	},
	"wardrobe02": {
		"any": {
			"any": {
				"14": [
					"Hat",
					"Tunic(Decorative)",
					"Insectaur Barding(Wool)",
					"Cloak(Fur-lined)",
					"Belt(w/Buckle)"
				],
				"11": [
					"Tunic(Wool)",
					"Insectaur Barding(Wool)",
					"Cloak",
					"Belt(w/Buckle)"
				],
				"9": [
					"Tunic(Cloth)",
					"Insectaur Barding(Cloth)",
					"Belt"
				],
				"6": [
					"Poncho(Wool)",
					"Insectaur Barding(Cloth)",
					"Belt(Rope)"
				],
				"0": [
					"Poncho(Rags)",
					"Insectaur Barding(Rags)",
					"Belt(Rope)"
				]
			}
		}
	},
	"wardrobe03": {
		"any": {
			"any": {
				"14": [
					"Headdress(Decorative)",
					"Jacket",
					"Tunic(Decorative)",
					"Breeches(Wool)",
					"Cloak(Fur-lined)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"11": [
					"Hat(Decorative)",
					"Tunic(Wool)",
					"Breeches(Wool)",
					"Cloak(Fur-lined)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"9": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Cloak",
					"Belt",
					"Boots(Leather)"
				],
				"6": [
					"Poncho(Wool)",
					"Breeches(Cloth)",
					"Belt(Rope)",
					"Shoes"
				],
				"0": [
					"Poncho(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		}
	},
	"wardrobe04": {
		"western": {
			"Female": {
				"14": [
					"Hat(Fine)",
					"Dress(Fine)",
					"Cloak(Fur-lined)",
					"Scarf(Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Fine)",
					"Dress(Fine)",
					"Scarf(Silk)",
					"Belt",
					"Shoes(Fine)"
				],
				"9": [
					"Hat",
					"Dress(Wool)",
					"Belt",
					"Scarf(Wool)",
					"Shoes"
				],
				"6": [
					"Shirt(Gusseted)",
					"Skirt(Cloth)",
					"Scarf(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Shirt(Rags)",
					"Skirt(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Other": {
				"14": [
					"Hat(Fine)",
					"Suit(Fine)",
					"Cloak(Fur-lined)",
					"Scarf(Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Wide-brimmed)",
					"Tunic(Wool)",
					"Breeches(Wool)",
					"Cloak",
					"Scarf(Wool)",
					"Belt(w/Buckle)",
					"Boots(Leather)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Cloak",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		},
		"renaissance": {
			"Female": {
				"14": [
					"Hat(Fine)",
					"Dress(Fine)",
					"Corset",
					"Cape(Fur-lined)",
					"Scarf(Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Decorative)",
					"Dress(Fine)",
					"Corset",
					"Scarf(Silk)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Hat",
					"Dress(Wool)",
					"Corset",
					"Belt",
					"Scarf(Wool)",
					"Shoes"
				],
				"6": [
					"Shirt(Gusseted)",
					"Skirt(Cloth)",
					"Scarf(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Shirt(Rags)",
					"Skirt(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Other": {
				"14": [
					"Hat(Fine)",
					"Suit(Fine)",
					"Cape(Fur-lined)",
					"Scarf(Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Narrow-rimmed)",
					"Tunic(Wool)",
					"Pantaloons",
					"Cape(Fur-lined)",
					"Scarf(Wool)",
					"Belt(w/Buckle)",
					"Boots(Leather)"
				],
				"9": [
					"Hat",
					"Shirt(Billowed)",
					"Hose(Silk)",
					"Cape",
					"Belt",
					"Shoes"
				],
				"6": [
					"Shirt(Billowed)",
					"Hose",
					"Belt",
					"Shoes"
				],
				"0": [
					"Shirt(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		},
		"kilted": {
			"any": {
				"14": [
					"Hat(Fine)",
					"Shirt(Billowed)",
					"Kilt(Wool)",
					"Cloak(Fur-lined)",
					"Scarf(Wool)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"11": [
					"Hat(Fine)",
					"Shirt(Gusseted)",
					"Kilt(Wool)",
					"Cloak",
					"Scarf(Wool)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Kilt(Cloth)",
					"Cloak",
					"Belt",
					"Boots(Leather)"
				],
				"6": [
					"Tunic(Cloth)",
					"Kilt(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Tunic(Rags)",
					"Kilt(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Female": {
				"14": [
					"Headdress(Silk)",
					"Sarong(Silk)",
					"Veil(Silk)",
					"Scarf(Dust)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Headdress(Decorative)",
					"Sarong(Wool)",
					"Scarf(Dust)",
					"Belt(w/Buckle)",
					"Shoes(Sand)"
				],
				"9": [
					"Headdress",
					"Sarong(Wool)",
					"Veil(Wool)",
					"Belt",
					"Scarf(Dust)",
					"Sandals(Sand)"
				],
				"6": [
					"Headdress",
					"Sarong(Cloth)",
					"Veil(Cloth)",
					"Scarf(Dust)",
					"Belt",
					"Sandals(Sand)"
				],
				"0": [
					"Headdress",
					"Sarong(Rags)",
					"Veil(Cloth)",
					"Scarf(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Other": {
				"14": [
					"Turban(Silk)",
					"Thawb(Silk)",
					"Scarf(Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Turban(Wool)",
					"Thawb(Wool)",
					"Scarf(Dust)",
					"Belt(w/Buckle)",
					"Shoes(Sand)"
				],
				"9": [
					"Turban(Cloth)",
					"Thawb(Cloth)",
					"Belt",
					"Scarf(Dust)",
					"Shoes(Sand)"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Scarf(Dust)",
					"Belt",
					"Sandals(Sand)"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Scarf(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		},
		"african": {
			"Female": {
				"14": [
					"Headdress(Silk)",
					"Tunic(Decorative)",
					"Wrap Skirt(Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Headdress(Wool)",
					"Tunic(Wool)",
					"Wrap Skirt(Wool)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Headdress(Cloth)",
					"Tunic(Cloth)",
					"Wrap Skirt(Cloth)",
					"Belt",
					"Sandals"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			},
			"Other": {
				"14": [
					"Headdress(Silk)",
					"Dress(Boubou/Silk)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Headdress(Wool)",
					"Dress(Boubou/Wool)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Headdress(Cloth)",
					"Dress(Boubou/Cloth)",
					"Belt",
					"Sandals"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			}
		},
		"eastern": {
			"Female": {
				"14": [
					"Hat(Fine)",
					"Kimono(Silk)",
					"Jacket(Haori)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"11": [
					"Hat",
					"Kimono(Cloth)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			},
			"Other": {
				"14": [
					"Hat(Fine)",
					"Kimono(Silk)",
					"Hakama(Silk)",
					"Jacket(Haori)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"11": [
					"Hat",
					"Kimono(Wool)",
					"Hakama(Wool)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Hakama(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			}
		}
	},
	"wardrobe05": {
		"any": {
			"any": {
				"14": [
					"Headdress(Decorative)",
					"Tunic(Decorative)",
					"Centaur Barding(Wool)",
					"Cloak(Fur-lined)",
					"Belt(w/Buckle)"
				],
				"11": [
					"Headdress(Wool)",
					"Tunic(Wool)",
					"Centaur Barding(Wool)",
					"Cloak",
					"Belt(w/Buckle)"
				],
				"9": [
					"Headdress(Cloth)",
					"Tunic(Cloth)",
					"Centaur Barding(Cloth)",
					"Belt"
				],
				"6": [
					"Tunic(Cloth)",
					"Centaur Barding(Cloth)",
					"Belt(Rope)"
				],
				"0": [
					"Tunic(Rags)",
					"Centaur Barding(Rags)",
					"Belt(Rope)"
				]
			}
		}
	},
	"wardrobe06": {
		"any": {
			"any": {
				"14": [
					"Tabard(Satin)",
					"Belt(w/Buckle)"
				],
				"11": [
					"Tabard(Cloth)",
					"Belt(w/Buckle)"
				],
				"9": [
					"Tabard(Cloth)",
					"Belt"
				],
				"6": [
					"Poncho(Cloth)",
					"Belt"
				],
				"0": [
					"Poncho(Rags)",
					"Belt(Rope)"
				]
			}
		}
	},
	"wardrobe07": {
		"western": {
			"Female": {
				"14": [
					"Hat(Fine)",
					"Dress(Fine)",
					"Cape(Fur-lined)",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Decorative)",
					"Dress(Fine)",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Hat",
					"Dress(wool)",
					"Belt",
					"Scarf(Wool)",
					"Goggles(Sun/Tinted)",
					"Shoes"
				],
				"6": [
					"Shirt(Gusseted)",
					"Skirt(Cloth)",
					"Scarf(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Shirt(Rags)",
					"Skirt(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Other": {
				"14": [
					"Hat(Fine)",
					"Suit(Fine)",
					"Cape(Fur-lined)",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Wide-brimmed)",
					"Tunic(Wool)",
					"Breeches(Wool)",
					"Goggles(Sun/Tinted)",
					"Cloak(Fur-lined)",
					"Scarf(Wool)",
					"Belt(w/Buckle)",
					"Boots(Leather)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Goggles(Sun/Tinted)",
					"Cloak",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		},
		"renaissance": {
			"Female": {
				"14": [
					"Hat(Fine)",
					"Dress(Fine)",
					"Corset",
					"Cape(Fur-lined)",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Decorative)",
					"Dress(Fine)",
					"Corset",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Hat",
					"Dress(Wool)",
					"Corset",
					"Belt",
					"Scarf(Wool)",
					"Goggles(Sun/Tinted)",
					"Shoes"
				],
				"6": [
					"Shirt(Gusseted)",
					"Skirt(Cloth)",
					"Scarf(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Shirt(Rags)",
					"Skirt(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Other": {
				"14": [
					"Hat(Fine)",
					"Suit(Fine)",
					"Cape(Fur-lined)",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Hat(Narrow-rimmed)",
					"Tunic(Wool)",
					"Pantaloons",
					"Cape(Fur-lined)",
					"Scarf(Wool)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Boots(Leather)"
				],
				"9": [
					"Hat",
					"Shirt(Billowed)",
					"Hose(Silk)",
					"Goggles(Sun/Tinted)",
					"Cape",
					"Belt",
					"Shoes"
				],
				"6": [
					"Shirt(Billowed)",
					"Hose",
					"Belt",
					"Shoes"
				],
				"0": [
					"Shirt(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		},
		"kilted": {
			"any": {
				"14": [
					"Hat(Fine)",
					"Shirt(Billowed)",
					"Kilt(Wool)",
					"Cloak(Fur-lined)",
					"Scarf(Wool)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"11": [
					"Hat(Fine)",
					"Shirt(Gusseted)",
					"Kilt(Wool)",
					"Cloak",
					"Scarf(Wool)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Kilt(Cloth)",
					"Goggles(Sun/Tinted)",
					"Cloak",
					"Belt",
					"Boots(Leather)"
				],
				"6": [
					"Tunic(Cloth)",
					"Kilt(Cloth)",
					"Belt",
					"Shoes"
				],
				"0": [
					"Tunic(Rags)",
					"Kilt(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Female": {
				"14": [
					"Headdress(Silk)",
					"Sarong(Silk)",
					"Veil(Silk)",
					"Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Headdress(Decorative)",
					"Sarong(Wool) Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Sand)"
				],
				"9": [
					"Headdress",
					"Sarong(Wool)",
					"Veil(Wool)",
					"Belt",
					"Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Sandals(Sand)"
				],
				"6": [
					"Headdress",
					"Sarong(Cloth)",
					"Veil(Cloth)",
					"Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Belt",
					"Sandals(Sand)"
				],
				"0": [
					"Headdress",
					"Sarong(Rags)",
					"Veil(Cloth)",
					"Scarf(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			},
			"Other": {
				"14": [
					"Turban(Silk)",
					"Thawb(Silk)",
					"Scarf(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Turban(Wool)",
					"Thawb(Wool)",
					"Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Sand)"
				],
				"9": [
					"Turban(Cloth)",
					"Thawb(Cloth)",
					"Belt",
					"Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Shoes(Sand)"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Scarf(Dust)",
					"Goggles(Sun/Tinted)",
					"Belt",
					"Sandals(Sand)"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Scarf(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		},
		"african": {
			"Female": {
				"14": [
					"Headdress(Silk)",
					"Tunic(Silk)",
					"Wrap Skirt(Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Headdress(Wool)",
					"Tunic(Wool)",
					"Wrap Skirt(Wool)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Headdress(Cloth)",
					"Tunic(Cloth)",
					"Wrap Skirt(Cloth)",
					"Goggles(Sun/Tinted)",
					"Belt",
					"Sandals"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			},
			"Other": {
				"14": [
					"Headdress(Silk)",
					"Dress(Boubou/Silk)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes(Fine)"
				],
				"11": [
					"Headdress(Wool)",
					"Dress(Boubou/Wool)",
					"Goggles(Sun/Tinted)",
					"Belt(w/Buckle)",
					"Shoes"
				],
				"9": [
					"Headdress(Cloth)",
					"Dress(Boubou/Cloth)",
					"Goggles(Sun/Tinted)",
					"Belt",
					"Sandals"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			}
		},
		"eastern": {
			"Female": {
				"14": [
					"Hat(Fine)",
					"Kimono(Silk)",
					"Jacket(Haori)",
					"Goggles(Sun/Tinted)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"11": [
					"Hat",
					"Kimono(Cloth)",
					"Goggles(Sun/Tinted)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Goggles(Sun/Tinted)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			},
			"Other": {
				"14": [
					"Hat(Fine)",
					"Kimono(Silk)",
					"Hakama(Silk)",
					"Jacket(Haori)",
					"Goggles(Sun/Tinted)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"11": [
					"Hat",
					"Kimono(Wool)",
					"Hakama(Wool)",
					"Goggles(Sun/Tinted)",
					"Belt(Obi)",
					"Sandals(Zōri)"
				],
				"9": [
					"Hat",
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Goggles(Sun/Tinted)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Tunic(Cloth)",
					"Hakama(Cloth)",
					"Belt",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Hakama(Rags)",
					"Belt(Rope)",
					"Sandals(Worn)"
				]
			}
		}
	},
	"wardrobe08": {
		"any": {
			"any": {
				"14": [
					"Hat",
					"Tunic(Decorative)",
					"Breeches(Wool)",
					"Cloak(Fur-lined)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"11": [
					"Tunic(Wool)",
					"Breeches(Wool)",
					"Cloak",
					"Belt(w/Buckle)",
					"Boots(Leather)"
				],
				"9": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Poncho(Wool)",
					"Breeches(Cloth)",
					"Belt(Rope)",
					"Sandals"
				],
				"0": [
					"Poncho(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)",
					"Sandals"
				]
			}
		}
	},
	"wardrobe09": {
		"any": {
			"any": {
				"14": [
					"Headdress(Silk)",
					"Skin Suit(Watertight)",
					"Goggles(Diving)",
					"Belt(w/Buckle)",
					"Sandals"
				],
				"11": [
					"Skin Suit(Watertight)",
					"Goggles(Diving)",
					"Belt(w/Buckle)",
					"Sandals"
				],
				"9": [
					"Tunic(Silk)",
					"Breeches(Silk)",
					"Goggles(Diving)",
					"Belt",
					"Sandals"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt(Rope)",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)"
				]
			}
		}
	},
	"wardrobe10": {
		"any": {
			"any": {
				"14": [
					"Headdress(Decorative)",
					"Skin Suit(Watertight)",
					"Goggles(Diving)",
					"Belt(w/Buckle)",
					"Sandals"
				],
				"11": [
					"Headdress(Silk)",
					"Tunic(Silk)",
					"Breeches(Silk)",
					"Goggles(Diving)",
					"Belt(w/Buckle)",
					"Sandals"
				],
				"9": [
					"Tunic(Silk)",
					"Breeches(Silk)",
					"Goggles(Diving)",
					"Belt",
					"Sandals"
				],
				"6": [
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt(Rope)",
					"Sandals"
				],
				"0": [
					"Tunic(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)"
				]
			}
		}
	},
	"wardrobe11": {
		"any": {
			"any": {
				"14": [
					"Headdress(Decorative)",
					"Tunic(Silk)",
					"Breeches(Silk)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"11": [
					"Headdress(Silk)",
					"Tunic(Silk)",
					"Breeches(Silk)",
					"Belt(w/Buckle)",
					"Boots(High/Leather)"
				],
				"9": [
					"Headdress(Cloth)",
					"Tunic(Cloth)",
					"Breeches(Cloth)",
					"Belt",
					"Shoes"
				],
				"6": [
					"Poncho(Cloth)",
					"Breeches(Cloth)",
					"Belt(Rope)",
					"Sandals"
				],
				"0": [
					"Poncho(Rags)",
					"Breeches(Rags)",
					"Belt(Rope)"
				]
			}
		}
	},
	"wardrobe12": {
		"any": {
			"any": {
				"14": [
					"Headdress(Decorative)",
					"Tunic(Silk)",
					"Wrap Skirt(Silk)",
					"Belt(w/Buckle)"
				],
				"11": [
					"Headdress(Silk)",
					"Tunic(Silk)",
					"Wrap Skirt(Silk)",
					"Belt(w/Buckle)"
				],
				"9": [
					"Headdress(Cloth)",
					"Tunic(Cloth)",
					"Wrap Skirt(Cloth)",
					"Belt"
				],
				"6": [
					"Tunic(Cloth)",
					"Wrap Skirt(Cloth)",
					"Belt(Rope)"
				],
				"0": [
					"Tunic(Rags)",
					"Wrap Skirt(Rags)",
					"Belt(Rope)"
				]
			}
		}
	}
};

export const CLOTHING_BANDS = [
	14,
	11,
	9,
	6,
	0
];

// @MARKER BY SKILLS -- what each social skill brings with it.
export const SOCIAL_SKILL_EQUIPMENT = {
	"Accounting": [
		"Abacus"
	],
	"Acting": [
		"Costume(Dramatic)",
		"Mask(Dramatic)"
	],
	"Administration": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Animal Husbandry": [
		"Brush(Animal Hair)",
		"Reins",
		"Sheers"
	],
	"Animal Training": [
		"Bell(Small)"
	],
	"Anthropology": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Appraisal": [
		"Ruler(Measure)",
		"Scales(Weights/Small)"
	],
	"Archaeology": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Architecture/Engineering": [
		"Chalk(5 pieces)",
		"Compass(Drawing)",
		"Plumb Line",
		"Ruler(Measure)",
		"50 Twine(Light/per')"
	],
	"Armoring": [
		"Metal Working Tools",
		"Leather Working Tools",
		"2 Leather(Sq.’)",
		"3 Leather Cord(1')"
	],
	"Artisan": [
		"Compass(Drawing)",
		"Ink(Well)",
		"Ink(Black)",
		"10 Paper Sheets",
		"Pen",
		"Ruler(Measure)"
	],
	"Astrology": [
		"Astrology Charts"
	],
	"Astronomy": [
		"Astrolabe",
		"Telescope",
		"Star Charts"
	],
	"Baking/Cooking": [
		"Cup(Measuring)",
		"Pan",
		"Pot(Metal)",
		"Sieve(Small)",
		"1 Utensils(Tin/set)"
	],
	"Ballooning": [
		"Compass(Directional Lodestone)",
		"Knife(Hook)",
		"Windlass(Small)",
		"50 Rope(Hemp per')"
	],
	"Banker/Broker": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Bar/Inn Keeping": [
		"Pitcher/Jug(Metal)",
		"3 Mug(Metal)",
		"Whiskey(Bottle)"
	],
	"Barbering": [
		"Comb",
		"Brush(Hair)",
		"Mirror(Small/Silver)",
		"Scissors"
	],
	"Barrel Making": [
		"Iron Mallet",
		"Iron Saw",
		"Wood Working Tools"
	],
	"Basket Weaving": [
		"Basket(Small/Holds 15)",
		"50 Twine(Light/per')"
	],
	"Bee Keeping/Insect Handling": [
		"Bee Keeper Suit(Canvas)"
	],
	"Begging": [
		"Bowl(Wooden)"
	],
	"Boat Wright": [
		"Chalk(5 pieces)",
		"Compass(Drawing)",
		"Plumb Line",
		"Ruler(Measure)",
		"Wood Working Tools"
	],
	"Bookbinder": [
		"3 Hard Leather(Sq.')",
		"50 Twine(Light/per')",
		"50 Paper Sheets"
	],
	"Botany": [
		"Knife(Tool)",
		"Magnifying Glass",
		"Mortar and Pestle",
		"Sheers",
		"Spade/Trowel"
	],
	"Botanist": [
		"Knife(Tool)",
		"Magnifying Glass",
		"Mortar and Pestle",
		"Sheers",
		"Spade/Trowel"
	],
	"Brewing": [
		"Pitcher/Jug(Wooden)",
		"3 Mug(Wooden)",
		"2 Glass Flask(1 cup)",
		"50 Air Hose(Per')",
		"2 Metal Flask(1 Cup)",
		"3 Pipe(Segment)",
		"Urn"
	],
	"Butcher": [
		"Cleaver",
		"Knife(Tool)"
	],
	"Butler": [
		"Comb",
		"Mirror(Small/Silver)",
		"Scissors"
	],
	"Cabinetry": [
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Wood Working Tools"
	],
	"Cage Making": [
		"Cage(Small: 1' x 1' x 1')",
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Metal File",
		"Metal Working Tools",
		"Padlock(Simple)",
		"Wood Working Tools"
	],
	"Calligraphy": [
		"10 Paper Sheets",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Candle/Oil Making": [
		"Animal Fat(1 lb.)",
		"3 Candle(6-hour)",
		"Crucible(Covered)",
		"Flint and Steel",
		"2 Lamp(Oil)",
		"2 Metal Flask(1 Cup)",
		"Tallow(1 lb.)",
		"10 Twine(Light/per')"
	],
	"Carousing": [
		"Mug(Wooden)"
	],
	"Carving": [
		"Knife(Tool)",
		"Metal File"
	],
	"Chariot Driving": [
		"Reins"
	],
	"Chariot Making": [
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Metal Working Tools",
		"Metal File",
		"Tongs(Small)",
		"Wood Working Tools"
	],
	"Chemistry": [
		"Chemistry Set(Basic)",
		"Flint and Steel",
		"2 Glass Flask(1 cup)",
		"2 Metal Flask(1 Cup)",
		"Mortar and Pestle",
		"2 Vial(1/2 cup)"
	],
	"Chirugeon": [
		"Coffer(5“x 8“x 3“/Holds 12)",
		"20 Bandages(Cloth)",
		"Flint and Steel",
		"3 Leather Cord(1')",
		"Magnifying Glass",
		"10 Needles(Assorted)",
		"Oil(Rubbing)",
		"Knife(Tool)",
		"Scissors",
		"50 Thread Spool(per')",
		"10 Twine(Light/per')",
		"2 Vial(1/2 cup)"
	],
	"Climatology": [
		"Astrolabe",
		"Telescope",
		"Spyglass",
		"Star Charts",
		"Weather Charts"
	],
	"Clowning/Jesting": [
		"Costume(Humor)",
		"Mask(Humor)"
	],
	"Cobbling": [
		"Cobbler's Tools",
		"Knife(Tool)",
		"3 Leather Cord(1')",
		"Leather(Sq.')"
	],
	"Composer": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Cosmetics": [
		"Makeup(Full Kit)",
		"Mirror(Small/Silver)",
		"Talc Powder"
	],
	"Courtesan": [
		"Makeup(Exotic Kit)",
		"Comb",
		"Brush(Hair)",
		"Mirror(Small/Silver)",
		"Perfume(Exotic)",
		"Soap(Exotic/Perfumed)",
		"Talc Powder",
		"Wig"
	],
	"Craftsman": [
		"Chalk(5 pieces)",
		"Compass(Drawing)",
		"Ruler(Measure)",
		"Wraparound Carryall(Holds 50)"
	],
	"Dancing": [
		"Costume(Dance)",
		"Shoes(Dance)"
	],
	"Diving": [
		"Goggles(Diving)",
		"Plugs(Ear)",
		"Plugs(Nose)",
		"Diving Weights"
	],
	"Doll Making": [
		"Doll",
		"10 Needles(Assorted)",
		"100 Pins(Assorted)",
		"Scissors",
		"50 Thread Spool(per')",
		"50 Twine(Light/per')"
	],
	"Drawing/Sketching": [
		"Chalk(5 pieces)",
		"Compass(Drawing)",
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Drudgery": [
		"Broom",
		"Mop",
		"Shovel"
	],
	"Dyer": [
		"3 Pigments/Dye(1 color)"
	],
	"Engraving/Etching": [
		"Metal Working Tools",
		"Metal File"
	],
	"Espionage": [
		"Grappling Hook",
		"Iron Mallet",
		"Iron Saw",
		"12 Lock Picks(Assorted)",
		"Metal File",
		"50 Rope(Silk per')",
		"Sack(Large/Holds 30)",
		"Spyglass",
		"50 Twine(Light/per')"
	],
	"Etiquette": [
		"Hankerchief(Silk)",
		"Napkin(Cloth)"
	],
	"Excavation": [
		"Pick(Digging)",
		"Shovel",
		"Spade/Trowel"
	],
	"Explorer": [
		"Book(Small)",
		"10 Paper Sheets",
		"2 Ink(Well)",
		"Ink(Black)",
		"Ink(Red)",
		"Pen",
		"Spyglass"
	],
	"Exploser": [
		"Flint and Steel",
		"2 Glass Flask(1 cup)",
		"2 Metal Flask(1 Cup)",
		"Mortar and Pestle",
		"2 Vial(1/2 cup)",
		"2 Oil(Pint)",
		"1 Pitch(Pint)"
	],
	"Falconry": [
		"Gloves(Leather)",
		"10 Twine(Light/per')",
		"Hood(Bird,Leather)"
	],
	"Farming/Planting": [
		"Hoe",
		"Rake",
		"Spade/Trowel"
	],
	"Fashion": [
		"Makeup(Full Kit)",
		"Comb",
		"Gloves(Silk)",
		"Brush(Hair)",
		"Mirror(Small/Silver)",
		"Perfume(Herbal)",
		"Soap(Herbal)"
	],
	"Ferrier": [
		"Pole(15' Ferrier)"
	],
	"Fire Making": [
		"Tinder Box"
	],
	"Fishing": [
		"30 Fishing Line(per')",
		"10 Fishhooks(Assorted)",
		"Fishing Pole"
	],
	"Fletching/Bow Making": [
		"10 Arrow Head",
		"Bowstring(Sinew)",
		"10 Feathers",
		"Iron Saw",
		"3 Leather Cord(1')",
		"50 Twine(Light/per')",
		"Wood Working Tools"
	],
	"Flint Knapping": [
		"Stone Working Tools"
	],
	"Florist/Horticulturist": [
		"Knife(Tool)",
		"Mortar and Pestle",
		"Sheers",
		"Spade/Trowel"
	],
	"Foraging/Forestry": [
		"Sack(Large/Holds 30)"
	],
	"Forensics": [
		"Magnifying Glass"
	],
	"Fortune Telling": [
		"Tarot Cards",
		"Semi-precious Orb"
	],
	"Furniture Making": [
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Wood Working Tools"
	],
	"Gambling": [
		"Dice(Bone/Set)",
		"Playing Cards"
	],
	"Gemology": [
		"Gemcutting Tools",
		"Magnifying Glass"
	],
	"Genealogy": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Geography": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Geology": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Magnifying Glass",
		"Pen",
		"Pick(Digging)",
		"Hammer(Rock)",
		"Shovel",
		"Spade/Trowel"
	],
	"Glass Blowing": [
		"Pipe(Glassblowing)",
		"Gloves(Leather)"
	],
	"Haberdasher": [
		"Hat",
		"Hat(Fine)",
		"Knife(Tool)",
		"10 Needles(Assorted)",
		"100 Pins(Assorted)",
		"Scissors",
		"50 Thread Spool(per')"
	],
	"Harlotry": [
		"Makeup(Bright Kit)",
		"Mirror(Small/Silver)",
		"Perfume(Fruit)",
		"Soap(Animal)"
	],
	"Harvesting": [
		"Hoe",
		"Sheers",
		"Sack(Large/Holds 30)"
	],
	"Heavy Drinking": [
		"Whiskey(Bottle)"
	],
	"History": [
		"Book(History/1 Subject)",
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Hunting/Trapping": [
		"Knife(Skinning)",
		"Iron Mallet",
		"Spring Snare(9-Inch)"
	],
	"Hydrology": [
		"Book(Small)",
		"Glass Flask",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Instruction": [
		"Bell(Small)"
	],
	"Instrument Making": [
		"Wood Working Tools"
	],
	"Instrument Playing": [
		"Book(Popular Music)"
	],
	"Inventor": [
		"Catches and Pulleys",
		"Compass(Drawing)",
		"Hooks and Wires",
		"Plumb Line",
		"Ruler(Measure)",
		"Book(Small)",
		"Metal File",
		"Metal Working Tools",
		"Glass Flask(1 cup)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen",
		"10 Springs(Assorted)",
		"50 Twine(Light/per ')",
		"Wraparound Carryall(Holds 50)"
	],
	"Irrigation": [
		"Shovel",
		"Spade/Trowel"
	],
	"Juggling": [
		"5 Ball(Wooden)"
	],
	"Kite Flying": [
		"Kite(Plain)",
		"100 Twine(Light/per ')"
	],
	"Lady Servant": [
		"Brush(Hair)",
		"Mirror(Small/Silver)",
		"Scissors"
	],
	"Leather Working": [
		"Leather Working Tools",
		"3 Leather(Sq.')",
		"3 Leather Cord(1')"
	],
	"Leeching": [
		"Leecher's Tools"
	],
	"Lens Making": [
		"Goggles(Sun/Tinted)",
		"Magnifying Glass",
		"Metal File",
		"Polishing Cloth",
		"Stone File",
		"Spectacles(Reading)"
	],
	"Librarian": [
		"Book(History/1 Subject)",
		"Book(Popular Story)",
		"Book(Large)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Lip Reading": [
		"Spyglass"
	],
	"Locksmith": [
		"Locksmith Tools",
		"12 Lock Picks(Assorted)",
		"Padlock(Well-Made)"
	],
	"Logic": [
		"Puzzle Box(Wooden)"
	],
	"Loom Mastery": [
		"Loom(Hand)"
	],
	"Lumberjack": [
		"Axe(Woodcutting)",
		"Iron Saw"
	],
	"Massage Therapy": [
		"Oil(Rubbing)",
		"Perfume(Herbal)"
	],
	"Mathematics": [
		"Abacus",
		"Ruler(Measure)"
	],
	"Metal Working": [
		"Iron Mallet",
		"Metal File",
		"Metal Working Tools"
	],
	"Metallurgy": [
		"Chemistry Set(Basic)",
		"Magnifying Glass",
		"Metal File",
		"Metal Working Tools"
	],
	"Metaphysics": [
		"Book(Metaphysics)"
	],
	"Meteorology": [
		"Sextant",
		"Telescope",
		"Spyglass",
		"Weather Charts"
	],
	"Midwife": [
		"20 Bandages(Cloth)",
		"3 Leather Cord(1')",
		"10 Needles(Assorted)",
		"Oil(Rubbing)",
		"Knife(Tool)",
		"Scissors",
		"50 Thread Spool(per')"
	],
	"Milling": [
		"Mortar and Pestle"
	],
	"Mining/Tunneling": [
		"Pick(Digging)",
		"Shovel",
		"Spade/Trowel"
	],
	"Mountaineering": [
		"Gloves(Climbing)",
		"Grappling Hook(Climbing)",
		"Hammer(Rock)",
		"Knife(Hook)",
		"10 Piton",
		"100 Rope(Silk per')",
		"Shoes(Climbing)"
	],
	"Music Theory": [
		"Book(Popular Music)",
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Oceanography": [
		"Sextant",
		"Spyglass"
	],
	"Page": [
		"Tabard(Page/Child's)"
	],
	"Painting": [
		"Canvas(Paint/Linen 1 sq.')",
		"3 Brush(Paint/Sable Hair)",
		"6 Pigments/Dye(1 color)"
	],
	"Paving/Road Building": [
		"Pick(Digging)",
		"Shovel",
		"Spade/Trowel",
		"1 Pitch(Pint)",
		"Metal Flask(1 Cup)"
	],
	"Perfume/Scent Making": [
		"Chemistry Set(Basic)",
		"Perfume(Exotic)",
		"Perfume(Herbal)",
		"Perfume(Fruit)",
		"Mortar and Pestle",
		"2 Vial(1/2 cup)",
		"Glass Flask(1 cup)"
	],
	"Philosophy": [
		"Book(Popular Philosophy)"
	],
	"Physics": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Physiology": [
		"Book(Illustrated Humanoid Anatomy)"
	],
	"Plumbing": [
		"Iron Mallet",
		"Metal File",
		"Metal Working Tools",
		"3 Pipe(Segment)"
	],
	"Politics": [
		"Book(Popular Politics)"
	],
	"Pottery Making": [
		"Pitcher/Jug(Baked Clay)",
		"Mug(Baked Clay)",
		"Knife(Tool)"
	],
	"Printing/Typesetting": [
		"Book(Medium)",
		"10 Paper Sheets",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Prospecting": [
		"Pick(Digging)",
		"Shovel",
		"Spade/Trowel",
		"Spyglass"
	],
	"Psychology": [
		"Book(Theories of the Mind)"
	],
	"Pulper": [
		"Frame(Wooden/per sq')",
		"10 Paper Sheets",
		"Rags(1 lb.)",
		"Sieve(Small)"
	],
	"Puppetry": [
		"Puppet(Angry)",
		"Puppet(Happy)",
		"Puppet(Sad)"
	],
	"Pyrotechnics": [
		"Chemistry Set(Basic)",
		"Flint and Steel",
		"2 Glass Flask(1 cup)",
		"2 Metal Flask(1 Cup)",
		"Mortar and Pestle",
		"2 Vial(1/2 cup)",
		"Oil(2 Pints)",
		"1 Pitch(Pint)"
	],
	"Recite Poetry": [
		"Book(Popular Poems)"
	],
	"Reporting/Journalism": [
		"Book(Recent Events)"
	],
	"Riding": [
		"Reins",
		"Brush(Animal Hair)",
		"50 Rope(Hemp per')"
	],
	"Rope Making": [
		"Knife(Tool)",
		"Scissors",
		"50 Twine(Heavy/per ')"
	],
	"Rope Use": [
		"50 Rope(Hemp per')"
	],
	"Rowing": [
		"2 Oar"
	],
	"Running": [
		"Shoes(Running)"
	],
	"Sapping": [
		"Pick(Digging)",
		"Spade/Trowel",
		"Shovel"
	],
	"Scavenging": [
		"Sack(Large/Holds 30)"
	],
	"Scholar": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Science": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Magnifying Glass",
		"Pen"
	],
	"Scribing": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Sculpting": [
		"Stone Working Tools",
		"Metal File",
		"Iron Mallet"
	],
	"Sewing": [
		"10 Needles(Assorted)",
		"100 Pins(Assorted)",
		"Scissors",
		"Sewing Box",
		"50 Thread Spool(per')"
	],
	"Shepherdry": [
		"Shepherd Crook"
	],
	"Signaling": [
		"Flint and Steel",
		"Spyglass"
	],
	"Sing Songs": [
		"Book(Popular Songs)"
	],
	"Skinning/Tanning": [
		"Frame(Wooden/per sq')",
		"Knife(Skinning)"
	],
	"Slave Driving": [
		"Manacles",
		"50 Rope(Hemp per')",
		"Shackles(Wrist)",
		"Shackles(Leg)"
	],
	"Smithy": [
		"Flint and Steel",
		"Bellows(Small)",
		"Iron Mallet",
		"Gloves(Leather)",
		"Metal File",
		"Metal Working Tools",
		"Tongs(Large)"
	],
	"Soap Making": [
		"Mortar and Pestle",
		"Animal Fat(1 lb.)"
	],
	"Soldiering": [
		"Cloth(Polishing)",
		"Boots(High/Leather)"
	],
	"Spelunking": [
		"Gloves(Climbing)",
		"Grappling Hook(Climbing)",
		"Hammer(Rock)",
		"Knife(Hook)",
		"10 Piton",
		"100 Rope(Silk per')",
		"Shoes(Climbing)"
	],
	"Spinning": [
		"Loom(Hand)",
		"100 Twine(Light/per ')"
	],
	"Squire": [
		"Back Pack(Holds 60)",
		"Cloth(Polishing)",
		"Tabard(Page/Child's)",
		"Whetstone"
	],
	"Steam Power": [
		"Flint and Steel",
		"Metal Working Tools",
		"Iron Mallet",
		"Metal File",
		"50 Air Hose(Per ')",
		"3 Pipe(Segment)"
	],
	"Stone Masonry": [
		"Stone Working Tools",
		"Metal File",
		"Iron Mallet"
	],
	"Store Keeping": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Story Telling": [
		"Book(Popular Story)"
	],
	"Supplier": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	],
	"Surfing": [
		"Surf Board"
	],
	"Surveyor": [
		"Spyglass"
	],
	"Survival": [
		"Compass(Directional Lodestone)",
		"6 Canvas(Waterproof/sq.')",
		"Flint and Steel"
	],
	"Swimming": [
		"Goggles(Diving)",
		"Plugs(Nose)"
	],
	"Tactics/Strategy": [
		"Book(Tactical Theory)"
	],
	"Tailoring": [
		"Chalk(5 pieces)",
		"Knife(Tool)",
		"10 Needles(Assorted)",
		"100 Pins(Assorted)",
		"Scissors",
		"Sewing Box",
		"50 Thread Spool(per')"
	],
	"Tattoo Artistry": [
		"Tattooing Tools",
		"Ink(Well)",
		"Indelible Ink(1 Color/1 cup)",
		"10 Needles(Assorted)"
	],
	"Taxidermy": [
		"10 Needles(Assorted)",
		"Knife(Skinning)",
		"100 Pins(Assorted)",
		"Scissors",
		"50 Thread Spool(per')",
		"5 Marbles(1 Pair/Eyes)"
	],
	"Theology": [
		"Book(Divine Teachings)"
	],
	"Tightrope Walking": [
		"50 Rope(Hemp per')",
		"Iron Mallet",
		"2 Spike"
	],
	"Tobacconist": [
		"Tobacco Box",
		"Sheers",
		"Knife(Tool)",
		"Flint and Steel",
		"Pipe(Smoking)"
	],
	"Tool Making": [
		"Crucible(Covered)",
		"Metal File",
		"Metal Working Tools",
		"Tongs(Small)",
		"Wood Working Tools"
	],
	"Torturing": [
		"Flint and Steel",
		"Manacles",
		"Metal File",
		"Knife(Tool)",
		"50 Rope(Hemp per')",
		"Shackles(Wrist)",
		"Shackles(Leg)",
		"Tongs(Small)"
	],
	"Translating": [
		"Book(Popular Phrases)"
	],
	"Tumbling": [
		"Costume(Animal)",
		"Mask(Animal)"
	],
	"Undertaking": [
		"Makeup(Full Kit)",
		"Knife(Tool)",
		"Perfume(Herbal)",
		"Needles(10 Assorted)",
		"Scissors",
		"Shovel",
		"50 Thread Spool(per')"
	],
	"Upholstery": [
		"Knife(Tool)",
		"Leather Working Tools",
		"3 Leather(Sq.')",
		"3 Leather Cord(1')"
	],
	"Valet": [
		"Comb",
		"Mirror(Small/Silver)",
		"Scissors"
	],
	"Wagon/Carriage Driving": [
		"Reins"
	],
	"Wagon/Carriage Making": [
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Metal Working Tools",
		"Metal File",
		"Tongs(Small)",
		"Wood Working Tools"
	],
	"Water/Wind Power": [
		"Wood Working Tools",
		"Iron Mallet",
		"Iron Saw",
		"Catches and Pulleys",
		"Hooks and Wires",
		"Knife(Tool)",
		"Scissors",
		"50 Twine(Light/per ')"
	],
	"Weapon Making": [
		"Metal Working Tools",
		"Metal File",
		"Tongs(Small)",
		"Whetstone"
	],
	"Weaving": [
		"Loom(Hand)",
		"100  Twine(Light/per ')"
	],
	"Wheel Wright": [
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Metal Working Tools",
		"Metal File",
		"Tongs(Small)",
		"Wood Working Tools"
	],
	"Wigweaving": [
		"Scissors",
		"Wig"
	],
	"Wood Curing": [
		"1 Pitch(Pint)",
		"Wood Working Tools",
		"2 Metal Flask(1 Cup)",
		"Stain(Pint)"
	],
	"Wood Cutting": [
		"Iron Saw"
	],
	"Wood Working": [
		"Iron Saw",
		"Iron Mallet",
		"20 Nails",
		"Wood Working Tools"
	],
	"Writing": [
		"Book(Small)",
		"Ink(Well)",
		"Ink(Black)",
		"Pen"
	]
};

// @END (CODE)
