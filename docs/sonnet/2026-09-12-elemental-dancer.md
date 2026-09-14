# Left for Sonnet — 2026-09-12, Elemental Dancer pass

> **Items 3 and 4 DONE 2026-09-14.** See `DECISIONS.md` → "A character's Skills tab shows the
> class skills around its current title" and item 27 in `UPSTREAM-ISSUES.md` (the Beguiler swap).
> **Items 1 and 2 remain blocked on source material, not on effort** — they need the Word
> templates for Elementalist, Inquisitor and Summoner, which this session does not have. GME is
> confirmed NOT a playable class (a Game-Master stand-in; see the comment on `skillSlotsNeeded`
> in `item-class.mjs`), so it needs no template at all.

Mechanical follow-through from adding the Elemental Dancer class. Two earlier notes are still
open: `2026-09-12-lore-corrections.md` and `2026-09-12-projectile-lore.md`.

---

## 1. Author the other four missing classes, if their templates exist

**Why it was left:** needs the source documents, not judgement.

Five classes are in his `classtitledict` and `goalupdict` but have no
`classRequirementsAndDetails` row, so none of them builds from the sheet-worker
(`UPSTREAM-ISSUES.md` item 22). **Elemental Dancer** is now authored from his Word template.
The other four are not: **Elementalist, GME, Inquisitor, Summoner**.

If the user supplies the matching `.doc` templates, add each to `src/packs/manual/classes.json`
following the Elemental Dancer entry exactly — same key order, same `_document` /
`_fromSheetWorker` / `_notes` provenance keys.

Extract a `.doc` with Word COM; the command used for this pass is in the session, and the shape is:
open read-only, take `$doc.Content.Text` **and** iterate `$doc.Tables` cell by cell, because the
class progression, attack-skill row and attribute row are all tables and the flattened body text
runs them together.

**Rules to follow, already decided:** his sheet-worker wins every field it carries
(`classtitledict` for titles, `goalupdict` for goal attributes, the switches for the four lore
titles); the template fills only the rest; every disagreement goes in `_notes` and in item 22.
Keys starting with `_` are stripped at build time.

**Done when:** `python tools/extract/build_documents.py --write` reports each as
`manual-class-used`, the class count rises accordingly, and all four suites pass.

**Careful:** confirm with the user whether **GME** is a playable class at all before authoring it.

---

## 2. Fill `advancement.classSkills` for the 86 generated classes

**Why it was left:** it is a large transcription job with no source in his code.

`advancement.classSkills` is a new field holding the skills gained at each title. His
`classtitledict` carries only the title *names*, so the field is empty for all 86 generated
classes and populated only for Elemental Dancer, from its Word template.

If the user has the rest of the `.doc` templates, this is the field they populate. Do **not**
invent the data from the rulebooks — the templates are the source.

**Done when:** whichever classes have templates carry a `classSkills` array the same length as
their `titles` array, and a note in `DECISIONS.md` records which classes are still empty.

---

## 3. Show class skills and the title track on the character sheet

**Why it was left:** presentation, and nothing displays `classSkills` yet.

Nothing on the character sheet reads `advancement.classSkills`. A character of a class that has
it should be able to see the skills due at their current title, and ideally the track above and
below. The skills tab (`templates/actor/tab-skills.hbs`) is the natural home.

Note the angle-bracketed entries — "<1st Kinesis>", "<Lore Type>" — are element-dependent
placeholders and should be shown verbatim, not hidden. The element table that resolves them is in
the class's description.

**Done when:** an Elemental Dancer character shows its per-title class skills, a Warrior shows
nothing extra, and the sheet preview renders both without error.

---

## 4. Check Beguiler's `classType`

**Why it was left:** small, and probably an upstream data slip rather than ours.

`Beguiler`'s `classType` holds a paragraph of description rather than a class type. Every other
class has a short value like "Warrior subclass". Noted at the end of item 22 as looking like the
same kind of column slip as item 1.

Check whether his raw `classRequirementsAndDetails` row for Beguiler has the right column count.
If it is short like Monk's, it belongs in item 1 rather than item 22; if the count is right, the
row simply has prose in the wrong cell and is a one-cell fix for him.

**Done when:** the finding is written into whichever upstream item it belongs to, with the column
count stated.
