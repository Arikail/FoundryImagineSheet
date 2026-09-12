# Left for Sonnet — 2026-09-12, off-hand fighting planning pass

This pass was research only; no code was written. What follows is the mechanical part of the
build, which does not need the expensive window once the two design questions in `DECISIONS.md`
("Off-hand fighting: audit before schema design") are answered.

> **UNBLOCKED 2026-09-12.** The user has answered both questions, so items 2 and 3 are now safe to
> start. **Item 3 changed shape as a result and has been rewritten — read its correction notice
> before building it.** The answers are recorded in `DECISIONS.md` → "RESOLVED 2026-09-12 — the
> three questions above, answered by the user".

Three earlier notes are still open: `2026-09-12-lore-corrections.md`,
`2026-09-12-projectile-lore.md`, `2026-09-12-elemental-dancer.md`.

---

## 1. Generate the two remaining lore-title tables

**Why it was left:** identical to a pattern already run three times; no judgement at all.

`tools/extract/extract_combat_tables.py` has `class_lore_when(tmpfunction)`, already used for
`getWeaponLoreWhen`, `getMissileLoreWhen` and `getProjectileLoreWhen`. Call it twice more for
**`get2ndWeaponKnowWhen`** and **`get2ndWeaponLoreWhen`**, add both to `classLoreTitles.json`
beside the existing three, propagate through `build_documents.py` and `module/data/item-class.mjs`
as `secondWeaponKnowTitle` / `secondWeaponLoreTitle`, and rebuild with `--write`.

Follow the existing three exactly — same JSON keys, same `_source` provenance block, same field
naming, same summary line in the generator's output.

**Done when:** `python tools/extract/extract_combat_tables.py` reports both counts,
`build_documents.py --write` carries both onto the 87 class documents, and all four suites pass
(combat 300, derivation 123, creature 129, availability 39).

**Already decided, do not revisit:** the acquisition rule is `title >= when`, taken from the
correctly written gates at 82620 and 82657, not from the broken `=>` ones. Zero means the class
never acquires it. See `UPSTREAM-ISSUES.md` item 19.

---

## 2. Generate the three off-hand penalty tables

**Why it was left:** mechanical, but it comes after the design question is settled so the table
shape is not guessed at.

`getOffhandMeleeAdj`, `getOffhandDamageAdj` and `getOffhandSkillAdj` (sheet-worker.js:83305-83370)
are Agility-banded chains returning a penalty, all returning 0 for `"Ambidextrous"`.

Write a generator function that reads a banded `if/else if` chain into ordered
`[minAgility, maxAgility, value]` rows and emit all three as `OFFHAND_PENALTIES` in
`module/combat-tables.mjs`.

**The bands are NOT the same across the three** — melee reaches 0 at Agility 19, damage and skills
at 20, and the damage table singles out 16 and 17 individually. Generating rather than
transcribing is the point; add a check that each table's bands are contiguous and cover 1..30,
and report any gap rather than silently leaving a hole.

**Done when:** the three tables regenerate, the contiguity check passes, and spot tests assert the
band edges that differ between them (Agility 19 melee vs damage, and Agility 16 vs 17 on damage).

---

## 3. ~~Three booleans~~ One hand field and two booleans on the weapon item

> **CORRECTED 2026-09-12 — do not build this as it was first written.** The user answered the
> design question and the answer was not either branch this item anticipated. There is **no
> `offHand` boolean.** See `DECISIONS.md` → "RESOLVED 2026-09-12 — the three questions above".

**Why it was left:** trivial once the model is agreed. It is still trivial; it is just a different
shape than it was.

`module/data/item-weapon.mjs` needs:

- **`hand`** — a three-state string field, `"left" | "right" | "both"`, tagged on the combat page.
  This **replaces** his boolean `weaponN_offhand` rather than mirroring it.
- **`secondWeaponKnowledge`** and **`secondWeaponLore`** — booleans, mirroring
  `weaponN_2weapknow` / `weaponN_2weaplore`. These are unchanged; comment them against his field
  names so the mapping is obvious on handoff.

**Off-handedness is derived, never stored.** A weapon is off-hand when `hand` is not the wielder's
dominant hand; `handedness` already exists on both actor types from the shield pass, so read it
rather than adding anything. An **Ambidextrous** wielder has no off hand at all, so the penalty
tier never applies — that is the same `"Ambidextrous"` short-circuit his three penalty tables
already have.

**`"both"` is not only an off-hand concern.** It is the two-handed case, which the damage rule
already cares about (a Strength bonus is doubled two-handed). Check what the existing damage path
currently keys two-handedness off, and make `hand` feed it rather than leaving two sources of the
same fact. **If that turns out to be a real conflict rather than a rename, stop and raise it** —
that is a judgement call, not mechanical work.

**Done when:** the three fields exist with comments naming his originals, off-handedness resolves
from `hand` + `handedness` with Ambidextrous short-circuiting, two-handedness has exactly one
source of truth, and 26 modules still parse.

---

## 4. Check whether creatures use any of this

**Why it was left:** a quick read, and it decides whether the creature model needs the same fields.

`setGeneralCombatModifierDisplay` has creature branches for Second Weapon Knowledge and Lore that
read `getCreatureSkillChance(...)` rather than a class title. Whether the creature *attack* path
(`handleCreatureAttack`) honours an off-hand penalty at all has not been checked.

**Done when:** a line in `DECISIONS.md` records whether creatures take an off-hand penalty in his
code, and therefore whether the creature model needs the same three flags.
