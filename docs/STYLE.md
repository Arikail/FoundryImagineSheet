# Code Style Guide — matching W. Michael Tenery III

This project gets handed back to its original developer. Code should read like his, so he can pick it up without decoding an unfamiliar style. Reference corpus: `docs/reference/sheet-worker.js` (180,370 lines of his actual Roll20 sheet-worker code).

This guide records **his conventions**, then the **unavoidable adaptations** where Roll20 idioms cannot survive in Foundry.

---

## 1. File organization

He bookends the whole file and uses marker comments as navigation and insertion points:

```js
// @START (CODE)
// @MARKER HANDLERS BELOW HERE
...
// @MARKER ADD NEW general purpose functions HERE
...
// @MARKER ADD NEW handle functions HERE
...
// @MARKER CREATURE SPECIFIC FUNCTIONS BELOW
...
// @END (CODE)
```

Markers are directive — they say *where new code of a given kind belongs*. Order runs: event handlers → general-purpose functions → handler functions → creature-specific functions.

**Adopt:** keep `@MARKER` comments as section headers and insertion points in each module.

## 2. Indentation and bracing

- **Tabs**, not spaces.
- Short conditionals collapse onto one line: `if (tempValue<lowValue) { tempValue=lowValue; }`
- Closing braces of long blocks carry a trailing comment naming what closed:
  ```js
  }); // END STR change work
  ```

## 3. Naming

| Kind | Convention | Examples |
|---|---|---|
| Functions | camelCase, verb-first | `getArmorCombatValues`, `changeAttribs`, `buildCharacterBody`, `setIntLowBounds` |
| Data dictionaries | all-lowercase, concatenated | `armorvalueslist`, `skilldict`, `weaponcostlist`, `classtitledict` |
| Working variables | `tmp`/`temp` prefix | `tmpstr`, `tmp_weight`, `tmpSTRtoHitMelee`, `tempSTRDetails` |

Dictionary suffixes carry meaning: `*dict` for keyed lookup data, `*list` for catalogs, `*valueslist` for stat tables.

Casing after the `tmp`/`temp` prefix is inconsistent in his code (`tmpstr`, `tmp_weight`, `tmpSTRtoHitMelee` all coexist). Don't try to regularize it into something he didn't write; follow whatever the neighbouring code does.

## 4. Comments

He comments heavily. **This overrides the usual minimal-comment default.**

- Every function gets a purpose line above it:
  ```js
  // This is the function which reacts to changes in attributes to update the saves, modifiers and base skill chances.
  function changeAttribs() {
  ```
- Inline section headers inside long functions, often shouty:
  ```js
  // STRENGTH Change work
  // Set STR Save
  // Set STR Modifiers (by STR)
  ```
- Non-obvious rules get an explanatory trailing comment:
  ```js
  if (totalChance>90) { totalChance=90; } // cap at 90% under 20
  ```
- Commented-out code is left in place rather than deleted.

## 5. Data dictionaries

The signature pattern — a purpose comment, a column-index row, a column-name row, then aligned entries:

```js
const skilldict = { // This is the data dictionary object for all class/racial skills.
//                                    0      1      2     3        4              5          6      7        8      9
//  Name                              Attr1  Attr2  Raing Start    Time           Type       Learn  Book     Page   Description
    "Abasement":                    [ "AUR", "WIL", "18", "1d10%", "10 Seconds",  "Magical", "",    "...",   "105", "..." ],
```

- Keys quoted; values are positional arrays of **strings**, even for numbers.
- Columns padded into alignment.
- In long dictionaries the two header comment rows are **repeated periodically** so they stay visible while scrolling.

**Adopt this exactly** for any table data that stays in code.

## 6. Idioms

```js
tmpstr = parseInt(values.strength)||0;          // parseInt/parseFloat with ||0 default
tmp_weight = parseFloat(values.weight)||0;
if (tmpRace=="undefined") { tmpRace=""; }       // string "undefined" comparisons
tmpBodyType = ""+values.body_type;              // ""+ string coercion
if (total>chance) { ... }                       // loose == / != throughout, not ===
```

Two quirks worth recognizing (he uses array brackets to force numeric coercion):
```js
parseFloat([tmp_str_load_limit*tmp_weight]*0.25)||0
parseInt(([tempattrib1+tempattrib2+tempattrib3]/3)+.99)||0   // the +.99 ceiling idiom
```

He also prefers small bounds/parsing helpers over inline logic: `setIntLowBounds`, `divideWithMin`, `getFirstHalfSlash`, `getSimplifiedName`, `startsWithCapital`.

**Adopt:** the `||0` defaulting habit, the small-helper habit, and his `+.99` rounding where reproducing his exact arithmetic matters. Keep `===` for new comparisons where it doesn't change behaviour, but never "fix" a loose comparison in ported logic — his `==` sometimes relies on coercion.

## 7. Declaration style — and the one place we cannot follow him

Counts across his file: `var` 749, `const` 522 (almost all data dictionaries), `let` 18. But the dominant pattern is neither — **most working variables are undeclared implicit globals**:

```js
function getAttribSave(tmpAttribRating) {
    tmpSaveValue=0;                    // no var/let/const
    ...
    return tmpSaveValue;
}
```

**This cannot be carried into Foundry.** ES modules are always strict mode, and an assignment to an undeclared identifier throws `ReferenceError`. His style here isn't a preference we can honour — it's incompatible with the target platform.

**Adaptation:** declare working variables with `var` at function scope. `var` (not `let`) keeps the function-scoped, hoisted, redeclarable behaviour his code assumes, so ported logic behaves identically, and it stays visually closest to code he'd recognize. Keep `const` for data dictionaries, matching his usage.

```js
// his (Roll20, sloppy mode)          // ours (Foundry, strict mode)
tmpSaveValue=0;                       var tmpSaveValue = 0;
```

That is the *only* deliberate departure. Everything else above is preserved.

## 8. Roll20 APIs with no Foundry equivalent

These are platform calls, not style, and must be translated rather than imitated:

| Roll20 | Foundry equivalent |
|---|---|
| `getAttrs([...], cb)` | direct property access on `actor.system` |
| `setAttrs({...})` | `actor.update({...})` — and batch, don't repeat calls |
| `startRoll` / `finishRoll` | `Roll` + `ChatMessage` with a template |
| `on('change:x')` / `on('clicked:y')` | derived data in `prepareDerivedData()`; sheet `data-action` handlers |
| `&{template:...}` roll templates | Handlebars chat-card templates |

One habit to *drop*: he issues repeated sequential `setAttrs()` calls for related fields —
```js
setAttrs({str_melee_attack: tmpSTRtoHitMelee });
setAttrs({str_melee_damage: tmpSTRMeleeDamage });
setAttrs({str_load_limit: tempSTRDetails[2] });
```
In Foundry each `update()` is a database write and a re-render. Batch them into a single call. This is a platform correctness issue, not a style choice — but note it in a comment where it diverges visibly from his original.

## 9. Preserving his logic verbatim

Where we port one of his functions, keep the **shape** recognizable — same function name, same branch order, same variable names — so he can diff his version against ours mentally. Example, his attribute save, ported:

```js
	// This is the function which converts an attribute rating into its save percentage.
	function getAttribSave(tmpAttribRating) {
		var tmpSaveValue = 0;
		if (tmpAttribRating<18) {
			tmpSaveValue = parseInt(tmpAttribRating*5);
		} else if (tmpAttribRating>20) {
			tmpSaveValue = parseInt(90+(tmpAttribRating-20));
		} else {
			tmpSaveValue = 90;
		}
		return tmpSaveValue;
	}
```

Same name, same structure, same branch order, same variable name — only the declaration added.
