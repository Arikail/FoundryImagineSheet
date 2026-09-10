# Layer 0 — Data Model Design

Design pass, 2026-09-10. **Proposal for review — not yet implemented.**

Grounded in a field-level audit of the Roll20 sheet (cited as `attr_*`) cross-checked against the rulebooks (cited by line number in `docs/reference/players-guide-fulltext.txt`). Per `DECISIONS.md`, the Roll20 sheet wins on conflict.

---

## 1. What the source audit actually found

Field counts per tab of the Roll20 character sheet, raw vs. normalized (collapsing index numbers):

| Tab | Lines | Raw fields | Real concepts | Inflation |
|---|---|---|---|---|
| profile | 418 | 160 | 138 | 1.2× |
| skills | 7,514 | 579 | **28** | 20.7× |
| combat | 9,428 | 1,040 | 353 | 2.9× |
| equipment | 2,624 | 175 | 175 | 1.0× |
| creature | 32,385 | 2,329 | 1,455 | 1.6× |

**The 20.7× inflation on skills is the headline finding.** The sheet has no JavaScript, so it cannot render a variable-length list. Instead it hardcodes a separate hidden block for "1 racial skill", "2 racial skills", … "20 racial skills", each redundantly re-listing every row, and uses CSS to reveal the matching one. Equipment shows the same pathology differently: ~70 `*_select` dropdowns (`axes_select`, `blades_select`, `projectiles_long_bow_select`, …) are the game's entire item catalog hardcoded into HTML `<option>` lists.

**Neither pattern survives the port.** Variable lists become embedded Items; catalogs become compendiums. The overwhelming majority of the sheet's 279,214 lines is workaround scaffolding for platform limitations Foundry does not have. The real data model underneath is modest.

## 2. Document types

### Actor types
- **`character`** — player character
- **`creature`** — GM-side creature/NPC

### Item types (core scope)
- **`skill`** — one skill, any category
- **`race`** — race definition (attribute mods, body chart, movement, racial skills)
- **`class`** — class definition (Title progression, skill table, core skills, requirements)
- **`weapon`**
- **`armor`** — with a `layerType` discriminator (`armor` / `clothing` / `shield`)
- **`equipment`** — general gear

Deferred to the magic phase: `spell`, `invocation`, `power`, and the ~20 crafting/lore subsystem types.

## 3. Character actor schema

```
system:
  identity:
    race          DocumentUUIDField -> race Item
    class         DocumentUUIDField -> class Item
    classType     string
    title         number            # advancement level
    titleName     string   (derived from class table)
    goal, exp     number
    nextGoalExp   number   (derived from class table)
    alignment, tendencies, gender  string

  attributes:                       # 12: str agl vit int wis knw app chm soc aur pty wil
    <attr>:
      rating      number            # stored, base value
      permMod     number            # stored; sheet's attr_perm_*_mod
    # DERIVED per attribute: max, save, and the attribute's table-driven modifiers
    # (str -> meleeAttack/meleeDamage/loadLimit/weaponSpeed; agl -> missileAttack/
    #  defensive/initiative/weaponSpeed; vit -> healingRate/poisonResist/diseaseResist; etc.)

  characteristics:
    endurance:  { titleBonus: number, misc: number }   # base is DERIVED
    perception: { titleBonus, misc }
    affinity:   { titleBonus, misc }
    fortune:    { titleBonus, misc }

  resistances:                      # magic illusion control poison disease
    <res>: { misc: number }         # base DERIVED from attributes + race

  body:
    shock       number  (derived: endurance x 3)
    areas       [ { key, name, number,
                    enduranceMax  (derived: endurance x race body-chart multiplier),
                    damage: number,
                    effect: string,
                    layers: { armor[], clothing[], shield[] } } ]

  movement:
    walk/jog/run/special: { hourly, tenSec, oneSec }   # derived: race base - encumbrance
    travelHours, restHours, jumpStand, jumpUp

  physical:   heightFeet, heightInches, frame, weight, hair, bodyCovering,
              eyes, skin, handedness, age, apparentAge, maxAge

  languages:  [ { name, speak: bool, write: bool } ]

  wealth:     { copper, silver, gold, platinum, special, gems[], jewelry[] }

  skillSlots: { class, racial, social, memorization }   # all derived from Knowledge

  combat:
    mods: { melee, missile, damage, defense, initiative, skill: { misc: number } }
```

Skills, weapons, armor and equipment are **embedded Items**, not schema fields.

## 4. Skill model

The sheet's 28 real skill concepts reduce to one Item shape, and it matches the rulebook formula exactly (Player's Guide p.94):

```
skill Item system:
  category        "class" | "racial" | "social"
  skillRating     number         # the difficulty number, usually 5-20
  attributes      [string]       # 1 or 2 governing attributes (2 = averaged, round up)
  startingBonus   number         # rolled once on acquisition; racial skills roll x2
  abilityBonus    number         # skill points / training accumulated
  misc            number
  acquiredAtTitle number         # class skills only
  sourcebook      string
```

Derived: `baseChance = (combinedAttributes - skillRating) x 5`, `total = baseChance + startingBonus + abilityBonus + misc`.

Untrained "common skill" use = base chance only, no starting bonus — which is exactly why the sheet's `common_skill_#` fields carry only `name` and `base` while acquired skills carry `base`, `ability` *and* `chance`. Sheet and book agree; no conflict to resolve.

**Class skill Title progression belongs on the `class` Item, not the skill.** The sheet's `class_skill_#_#_*` double index is `[title][slot]` — that's the class's advancement table, which is class content, not per-character data. The character's acquired skill just records `acquiredAtTitle`.

## 5. Attribute lookup tables — composable, sourcebook-tagged

Derived attribute values are **irregular lookup tables, not formulas**. Strength damage modifier across ratings 5-20 runs -6,-5,-4,-3,-2,-1,0,0,0,0,+1,+2,+3,+4,+5,+6; load limit runs .05,.1,.2,.4,.6,.8,1.0,1.1…2.0. No formula reproduces these. (Attribute *save* is the exception: `rating x 5%` capped at 90%.)

These live as **JSON data files, split by sourcebook and merged at init**:

```
data/tables/attributes/players-guide.json    # ratings 5-20
data/tables/attributes/masters-manual.json   # ratings 0-4 and 21-30
```

This falls straight out of how the books themselves are written: every Master's Manual attribute table literally has a row reading "5-20: See Player's Guide". The two books *are* fragments of one table. Merging sourcebook-tagged fragments reproduces that faithfully — and if a GM disables the Master's Manual, extended attribute ranges simply cease to exist, which is the correct behaviour.

Not compendium documents: these are system math, not content a GM browses or drags onto a sheet. JSON keeps them editable without code changes (satisfying "upload new content") without abusing the compendium UI.

## 6. Content / sourcebook availability layer

Every content Item carries `sourcebook: string`. World settings hold:

```
imagine-rpg.sourcebooks      { "players-guide": true, "masters-manual": true, ... }
imagine-rpg.magicEnabled     bool            # master kill switch
imagine-rpg.magicSubsystems  { runes: true, potions: false, ... }
imagine-rpg.contentOverrides { "<uuid>": false }   # individual allow/deny
```

Single resolver used by every content picker:

```
isAvailable(item):
    if item is a magic-subsystem type:
        if not magicEnabled: return false
        if not magicSubsystems[item.subsystem]: return false
    if item.uuid in contentOverrides: return contentOverrides[item.uuid]
    return sourcebooks[item.system.sourcebook] ?? true
```

This one function satisfies every toggle requirement in `DECISIONS.md`: per-subsystem magic toggles, the master magic switch, per-class enable/disable, and sourcebook-level campaign filtering — without special-casing any of them.

## 7. Modifiers: ActiveEffects, with one escape hatch

The sheet decomposes every combat modifier by contributing source — `combat_mod_melee` = `combat_mod_melee_str` + `combat_mod_melee_other`, `combat_mod_init_agl` + `combat_mod_init_int` + `combat_mod_init_other`. That decomposition exists because Roll20 had no effect system and the author had to sum sources by hand.

Foundry replaces this natively: anything granted by race, class, magic, or condition becomes an **ActiveEffect**. We keep exactly one stored `misc` field per modifiable stat as the GM escape hatch — that's what the sheet's `_other` fields were for, and users will expect it.

Two V14 specifics that bite here (see `foundry-v14-requirements.md`):
- Effect changes live at `effect.system.changes`, and `mode` is now `type` taking lowercase strings (`"add"`, `"override"`, `"multiply"`) — never the old numeric constants.
- Any custom Actor subclass **must** call `super.prepareBaseData()`, or two-phase effect application breaks silently and only errors later on update.

## 8. Derivation order

The dependency chain for `prepareDerivedData()`. It is acyclic, and order matters:

1. Attribute ratings (base + effects)
2. Attribute `max` ← Title/being-type table (Title 0→23, 1-10→25, 11-15→27, 16+→30)
3. Attribute saves ← rating (`x5` capped 90, or table lookup at 21+)
4. Attribute-derived modifiers ← lookup tables
5. **Endurance** ← average of STR/AGL/VIT rounded up, + racial starting modifier + rolled Title bonuses
6. **Shock** ← Endurance × 3
7. **Body area maxima** ← Endurance × race body-chart multiplier (recomputes on any Endurance change)
8. Resistances ← attribute modifiers + race
9. Skill slots ← Knowledge table
10. Skill base chances ← governing attributes − skill rating, ×5
11. Skill totals ← base + ability + misc
12. Encumbrance ← carried weight vs. STR load limit
13. Movement ← race base − encumbrance penalties
14. Combat modifiers ← attribute modifiers + effects + misc

Cross-validated against the sample character in `preview.png`: Title 12 → attribute max 27 ✓; STR 19 → 90% save ✓ (plateaus at 90 from rating 18); the sheet's `attr_endurance` of 72 is consistent with a derived pool feeding per-area body charts.

## 9. Open questions for review

1. **Armor / clothing / shield** — one `armor` Item type with a `layerType` discriminator (proposed, since the sheet layers all three per body area and they share coverage/penalty shape), or three separate Item types?
2. **Attribute tables as JSON** (proposed) vs. compendium documents — JSON keeps them editable but out of the GM's content browser. Reasonable?
3. **Creature schema** — the creature tab normalizes to ~1,455 concepts, nearly as complex as the character. Does `creature` share the character schema with fields hidden, or get a genuinely separate, leaner schema? Needs the Bestiary book to answer properly.
4. **Body-area transformation** — the sheet has `body_transform_selection` / `body_transform_sheet` (shapeshifting: swap the whole body chart). Confirm this is a real mechanic to design for now, or defer.
