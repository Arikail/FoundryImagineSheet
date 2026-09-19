# Adding Content

How to add races, classes, skills, weapons, armour, equipment, abilities, disabilities and
immunities to the Imagine RPG system, whether it is your own homebrew, material from a book that
is not in the system yet, or a correction to something that is. None of it needs a code change.

There are two routes. Use the first for your own table. Use the second for content that should ship
with the system for everyone.

| | In Foundry | In the content files |
|---|---|---|
| For | a Game Master's own campaign | content shipped with the system |
| Needs | nothing but Foundry | Python, and a rebuild |
| Survives a content re-import | yes, if kept in your own compendium | yes, it is part of the build |
| Can change a stock entry | no, make a copy under a new name | yes, with `"_override": true` |

---

## Route 1: in Foundry

1. **Make a compendium of your own.** In the Compendium tab, create a compendium of type Item, for
   example "Our Campaign". Keep your content there, not in the system's own "Imagine ..." compendiums.
2. **Create the item** in it, of the right type:

   | to add a... | item type | notes |
   |---|---|---|
   | skill | Skill | category is class, racial or social |
   | weapon, armour, piece of gear | Weapon / Armour / Equipment | |
   | race | Race | a character with TWO race items is a Half Race, the two combined as his sheet combines them |
   | class | Class | a class with a choice (element, Call of Life/Death...) is one item per path |
   | ability, disability, immunity | Trait | set its category |
   | creature attack, creature power | Creature Attack / Power | creature-only |

3. **Set the Sourcebook field**, for example "Custom" or your campaign's name. Every sourcebook any
   compendium cites turns up by itself as a switch in **Game Settings → Configure Settings → Content Availability**. That is
   how a Game Master turns a whole body of homebrew off, or keeps a campaign to the published books.
4. **Drag it onto a character** as you would any stock item.

**Do not edit the system's own compendium entries.** Re-importing content (`game.imagine.importContent()`,
which is how a corrected sheet from the developer is brought in) updates those entries by name and
overwrites your changes. To change a stock entry, duplicate it into your own compendium under a new
name. To stop the stock one being used, forbid it in the content settings (its override key is
`type:Name`, for example `class:Warrior`).

**Known gap:** the Race and Class item sheets do not yet let you edit their list fields: racial
skills, abilities, fertile races, blocked races, and a class's skill list. Until they do (see
`docs/sonnet/2026-09-18-races-classes.md`, item 1), author those through Route 2.

---

## Route 2: in the content files

Every pack has a hand-authored file in `src/packs/manual/`:

```
abilities.json  armor.json  classes.json  disabilities.json  equipment.json
immunities.json  races.json  skills.json  weapons.json
```

Each has the same shape, and each carries a worked `_example` to copy from:

```json
{
  "_about": "notes -- any key starting with _ is never read as content",
  "entries": {
    "Knot Craft": { "attr1": "AGL", "attr2": "INT", "skillRating": 12, "category": "class" },
    "Climb":      { "_override": true, "description": "Only the fields given are changed." }
  }
}
```

Then rebuild the documents and re-import them:

```bash
python tools/extract/build_documents.py --write
```

and in Foundry, as the Game Master: `game.imagine.importContent()`.

**The rules** (`apply_manual_content` in `tools/extract/build_documents.py`):

- **A new name is added.** Give only the fields that matter; the rest take the schema's defaults
  when it is imported.
- **Unless you give a sourcebook, it is tagged "Custom"**, so all of it shares one switch in the
  content settings.
- **A name the developer's data already builds is ignored, and reported**, unless the entry says
  `"_override": true`. Then only the fields you give are laid over his, field by field. A list
  replaces a list whole. Every override is reported on every build. His sheet is the source of truth,
  so changing it has to be done out loud.
- **A class that is the base of several paths** (Elemental Dancer, of Elemental Dancer(Water) and the
  rest) cannot be overridden as a whole. Override each path by its own name.
- **A misspelt field is reported**, checked against the item's schema, rather than silently dropped
  on import.

`--check` in place of `--write` reports all of this without writing anything.

**What the fields are:** the item's data model in `module/data/item-<type>.mjs` declares every
field, with a comment on each. The generated documents in `src/packs/documents/` show real values
for every one.

---

## Which is the source of truth

The developer's Roll20 sheet is. Everything in `src/packs/documents/` is generated from it by
`tools/extract/`, and nothing there should be edited by hand, since the next build overwrites it. Hand
content lives only in `src/packs/manual/` (Route 2) or in your own compendiums (Route 1). His data
is never changed except by an `_override` that says so on every build.

**Not verified:** Route 1 depends on Foundry V14's own item creation and compendium tools, which
have not yet been exercised against this system in a running V14 install. Route 2 is tested
(`build_documents.py --check` against every example).
