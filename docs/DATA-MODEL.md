# Layer 0 — Data Model Design

Design pass, 2026-09-10. **Revised** the same day after discovering the sheet's embedded JavaScript (see `DECISIONS.md` → "CORRECTION: the Roll20 sheet does contain JavaScript"). **Proposal for review — not yet implemented.**

## 0. Sources, in priority order

1. **`docs/reference/sheet-worker.js`** — 180,370 lines extracted from the Roll20 sheet's `<script type="text/worker">` block. Dev-authored, played-with computation code and ~37 data dictionaries. **Primary source.** Where this disagrees with the books, it wins (it *is* the Roll20 sheet, per the standing conflict rule).
2. The Roll20 HTML markup — field names and sheet layout.
3. `docs/reference/players-guide-fulltext.txt`, `masters-manual-fulltext.txt` — OCR'd rulebooks. Prose, rationale, and coverage for anything the JS doesn't implement.

Formulas independently reconstructed from the books *before* the JS was found have since been spot-checked against it and matched (attribute save, Endurance). That's reassuring for book-derived work, but the JS is authoritative from here.

---

## 1. What the source audit found

### The HTML is mostly workaround scaffolding
Field counts per tab, raw vs. normalized (collapsing index numbers):

| Tab | Lines | Raw fields | Real concepts | Inflation |
|---|---|---|---|---|
| profile | 418 | 160 | 138 | 1.2× |
| skills | 7,514 | 579 | **28** | 20.7× |
| combat | 9,428 | 1,040 | 353 | 2.9× |
| equipment | 2,624 | 175 | 175 | 1.0× |
| creature | 32,385 | 2,329 | 1,455 | 1.6× |

Roll20 cannot render a variable-length list declaratively, so the sheet hardcodes a separate hidden block for "1 racial skill", "2 racial skills", … "20 racial skills" and reveals the matching one. Equipment does the same via ~70 catalog dropdowns. **Neither pattern ports** — lists become embedded Items, catalogs become compendiums.

### The JavaScript is the real system
~37 data dictionaries, all sharing one shape:

```js
const <name> = {
  "Key Name": [ "col0", "col1", ... ],   // column meanings in a header comment
};
```

Machine-consistent: `skilldict` parses to 470/470 rows at exactly 10 columns; `socialskilldict` to 204/204 at exactly 8. No ragged rows.

Notable contents: `skilldict` (470 class/racial skills), six social-skill dictionaries (~204 each), `weaponvalueslist` (~596), `armorvalueslist` (~721, per-body-location), five further armor dictionaries (cost, penalty, condition, blocking, damage-type, materials), `classtitledict`, `goalupdict`, eight martial-arts dictionaries, `handtohandvalueslist`, `brawlingvalueslist`, `fatiguelist`, `racefertiledict`, and magic-phase content already present: `rituallist` (~389), `evokedict` (~1,173), `spellPrimers`.

### Sourcebook tagging already exists in the data
Every skill row carries its book and page. Distribution across 674 skills:

| Book | Skills | PDF in hand? |
|---|---|---|
| Player's Guide | 343 | yes |
| Mysteries of the Planes | 115 | no |
| Conquest of the Eternal | 80 | no |
| Master's Manual | 77 | yes |
| Legends of the Unknown | 31 | no |
| Epitaph of the Fallen | 24 | no |

~36% of skills come from books we don't have — but **their mechanical data is already in the JS**, so those PDFs are needed only for prose and edge-case rules, not to implement the skills.

The proposed `sourcebook` field is therefore not an invention imposed on the data; it is the data's native structure.

### Skill types map onto the magic toggle
`skilldict` column 5 is a comma-separated type list: Magical 200, Divine 149, Combat 41, Disciplined 33, Informational 28, Stealth/Intrusive 25. "All magic off" filters on Magical + Divine — **~74% of all class/racial skills**. That switch is far more consequential than a cosmetic tab hide.

---

## 2. Document types

**Actors:** `character`, `creature`

**Items (core scope):** `skill`, `race`, `class`, `weapon`, `armor` (with `layerType`), `equipment`

**Deferred (magic phase):** `spell`, `invocation`, `power`, `ritual`, `evoke`, and the remaining crafting/lore subsystems — all of which have source data already sitting in the JS.

## 3. Character actor schema

```
system:
  identity:
    race          DocumentUUIDField -> race Item
    class         DocumentUUIDField -> class Item
    classType     string
    title         number
    titleName     string   (derived, from classtitledict)
    goal, exp     number
    nextGoalExp   number   (derived, from goalupdict)
    alignment, tendencies, gender  string

  attributes:                       # str agl vit int wis knw app chm soc aur pty wil
    <attr>: { rating: number, permMod: number, tempMod: number }
    # DERIVED: max, save, and each attribute's table-driven modifiers

  characteristics:
    endurance:  { titleBonus, raceMod, permMod, tempMod }   # base DERIVED
    perception: { titleBonus, raceMod, permMod, tempMod }
    affinity:   { titleBonus, raceMod, permMod, tempMod }
    fortune:    { titleBonus, raceMod, permMod, tempMod }

  resistances:                      # magic illusion control poison disease
    <res>: { misc: number }         # base DERIVED from attributes + race

  body:
    bodyType    string              # "Humanoid", "Humanoid(Fish Tail)", ...
    shock       number  (derived: endurance x 3)
    areas       [ { key, name, type, number,
                    enduranceMax (derived: endurance x race chart multiplier),
                    damage, effect,
                    layers: { armor[], clothing[], shield[] } } ]

  movement:   walk/jog/run/special: { hourly, tenSec, oneSec }
              travelHours, restHours, jumpStand, jumpUp

  physical:   heightFeet, heightInches, frame, weight, hair, bodyCovering,
              eyes, skin, handedness, age, apparentAge, maxAge

  languages:  [ { name, speak: bool, write: bool } ]
  wealth:     { copper, silver, gold, platinum, special, gems[], jewelry[] }
  skillSlots: { class, racial, social, memorization }   # derived from Knowledge
  combat:     mods: { melee, missile, damage, defense, initiative, skill: { misc } }
```

### Body areas are dynamic and race-owned
The JS builds the body from the race (`buildCharacterBody(race)`) into a repeating section, supports authoring **custom body areas** (`new_bodyarea_name/_type/_end`), and `body_transform_selection` swaps `body_type` wholesale — the fish-tail transform being a worked example.

So `areas[]` stays a dynamic array, **not** a fixed humanoid slot list. `armorvalueslist`'s 19 fixed columns (Head, Neck, L/R Shoulder, Upper/Mid/Lower Torso, L/R Arm, L/R Forearm, L/R Hand, L/R Thigh, L/R Shin, L/R Foot) are the *humanoid coverage mapping* for armor, not the definition of a body. Non-humanoid bodies get their own charts and their own armor (`armor_centaur_barding_select`). Transformation is therefore a data swap, not a schema migration — the free option, taken.

## 4. Skill Item schema

Columns come straight from `skilldict`:

```
skill Item system:
  attr1, attr2     string        # governing attributes; both present = averaged, round up
  skillRating      number        # difficulty number
  startingDice     string        # "2d6%", "1d10%", "4d10%" - rolled on acquisition
  time             string        # "10 Seconds", "Varies", "1 Hour"
  types            [string]      # Magical | Divine | Combat | Disciplined | Informational | Stealth/Intrusive
  learn            string        # learn cost/time, often empty
  sourcebook       string        # "Player`s Guide", "Mysteries of the Planes", ...
  page             string
  description      string
  # per-character instance state:
  category         "class" | "racial" | "social"
  startingBonus    number        # rolled; racial skills roll x2
  abilityBonus     number
  misc             number
  acquiredAtTitle  number
```

Derived: `baseChance = (combinedAttributes - skillRating) x 5`, `total = baseChance + startingBonus + abilityBonus + misc`. Untrained common-skill use = base chance only, which is why the sheet's `common_skill_#` fields carry only name and base.

Class-skill Title progression belongs on the **class** Item (the sheet's `class_skill_#_#` double index is `[title][slot]`), not on the skill.

## 5. Content extraction pipeline

**Decision: parse the dictionaries mechanically; do not hand-port.**

There are roughly 7,000+ data rows across the 37 dictionaries. Hand-transcription of that volume guarantees silent errors that surface later as wrong game math, and the alternative source (OCR'd scans) is strictly worse than dev-authored JS. The dictionaries' uniform `"Key": [array]` shape and verified column consistency make parsing reliable.

Shape:
```
tools/extract/                 # build-time only, not shipped to Foundry
  parse-dictionaries.mjs       # generic: JS object literal -> JSON
  column-maps.mjs              # per-dictionary column -> field-name mapping
src/packs/                     # generated JSON, checked in and reviewable in diffs
  skills.json, weapons.json, armor.json, ...
packs/                         # compiled Foundry compendium output
```

Generated JSON is **checked in**, so regenerating produces a reviewable diff rather than an opaque binary change. Extraction is idempotent and re-runnable if the dev ships an updated sheet.

**Run extraction across all 37 dictionaries at once, including magic.** The parser cost is essentially identical for 10 dictionaries or 37; only the column maps differ. This decouples *having the content* from *implementing the mechanics*, so magic data sits ready in compendiums whenever that phase starts. It does not change core-first phasing for mechanics.

## 6. Content / sourcebook availability layer

Every content Item carries `sourcebook`. World settings:

```
imagine-rpg.sourcebooks      { "players-guide": true, "masters-manual": true, ... }
imagine-rpg.magicEnabled     bool
imagine-rpg.magicSubsystems  { runes: true, potions: false, ... }
imagine-rpg.contentOverrides { "<uuid>": false }
```

One resolver serves every toggle requirement:
```
isAvailable(item):
    if item carries a magic/divine type or belongs to a magic subsystem:
        if not magicEnabled: return false
        if item.subsystem and not magicSubsystems[item.subsystem]: return false
    if item.uuid in contentOverrides: return contentOverrides[item.uuid]
    return sourcebooks[item.system.sourcebook] ?? true
```

**Open policy question:** should disabling a sourcebook also remove *core math* it contributes (e.g. the Master's Manual's extended attribute rows 0-4 / 21-30), or only gate *content availability*? Recommendation: gate content only. Silently breaking the math when an attribute lands at 25 is worse than leaving unreachable table rows in place.

## 7. Armor layering

Rules (Player's Guide ~p.190) confirmed against the dev's data:
- Up to **3 armor layers**; the 1st must be flexible
- Each layer may only sit over material at least as flexible as itself; **rigid may not stack on rigid**
- **Shields are a 4th layer**; certain other objects also qualify
- **Clothing ≤3 armor value doesn't consume a layer** (grants one free layer above or below)
- Layers accrue wear independently; donning times are cumulative per layer

`armorvalueslist` column 1 is the flexibility class, and it includes **`Clothing` as a distinct class** alongside Flexible / Semi-Flexible / Rigid — four values, matching the dev's note that clothing and shields are discrete layers. Armor items therefore carry `flexibility` plus per-location coverage values, and the layering engine validates stacking order while walking each body area's stack.

## 8. Modifiers: ActiveEffects, with one escape hatch

The sheet hand-decomposes every modifier by source (`combat_mod_melee_str` + `combat_mod_melee_other`, `combat_mod_init_agl` + `_int` + `_other`) because Roll20 has no effect system. Foundry replaces this natively: race/class/magic/condition grants become **ActiveEffects**; one stored `misc` field per modifiable stat remains as the GM escape hatch, which is what `_other` was.

V14 specifics: effect changes live at `effect.system.changes` with `type` taking lowercase strings (`"add"`, `"override"`, `"multiply"`); custom Actor subclasses **must** call `super.prepareBaseData()` or two-phase effect application breaks silently.

## 9. Derivation order

Acyclic; order matters:

1. Attribute ratings (base + effects)
2. Attribute `max` ← Title/being-type table (Title 0→23, 1-10→25, 11-15→27, 16+→30)
3. Attribute saves ← `getAttribSave`: `<18 → rating x5`; `18-20 → 90`; `>20 → 90 + (rating-20)`
4. Attribute-derived modifiers ← lookup tables
5. **Endurance** ← `((STR+AGL+VIT)/3)` rounded up, + class modifier + title bonus + race mod + temp/perm mods
6. **Shock** ← Endurance × 3
7. **Body area maxima** ← Endurance × race chart multiplier (recomputes on any Endurance change)
8. Resistances ← attribute modifiers + race
9. Skill slots ← Knowledge table
10. Skill base chances ← governing attributes − skill rating, ×5
11. Skill totals ← base + starting + ability + misc
12. Encumbrance ← carried weight vs. STR load limit
13. Movement ← race base − encumbrance penalties
14. Combat modifiers ← attribute modifiers + effects + misc

Steps 3 and 5 are transcribed from the dev's `getAttribSave` and `changeCharacteristics` respectively, not inferred.

## 10. Open questions

1. **Sourcebook gating policy** — content-only, or core math too? (§6; recommendation: content only)
2. **Is `sheet-worker.js` current?** The dev described `getArmorCombatValues` from memory rather than sending it. Worth confirming this file reflects his intended present ruleset and not a superseded version, before ~7,000 rows are extracted from it.
3. **Creature schema** — normalizes to ~1,455 concepts, nearly character-complexity. Shares the character schema with fields hidden, or a separate leaner one? Still wants the Bestiary book.
4. **Which remaining PDFs are actually worth ingesting** — the four books we lack contribute ~36% of skills, but their mechanical data is already in the JS. Likely needed only where prose changes behaviour.
