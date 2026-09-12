# Left for Sonnet — 2026-09-12, off-hand fighting planning pass

This pass was research only; no code was written. What follows is the mechanical part of the
build, which does not need the expensive window once the two design questions in `DECISIONS.md`
("Off-hand fighting: audit before schema design") are answered. **Do not start items 2 and 3 until
the user has answered the off-hand-seconds question** — item 1 is safe to do either way.

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

## 3. Three booleans on the weapon item

**Why it was left:** trivial once the model is agreed.

`module/data/item-weapon.mjs` needs `offHand`, `secondWeaponKnowledge` and `secondWeaponLore`
booleans, mirroring his `weaponN_offhand` / `weaponN_2weapknow` / `weaponN_2weaplore`. Comment
them against those field names so the mapping is obvious on handoff.

**Hold off if** the user answers question 3 in the `DECISIONS.md` entry by saying the off-hand
choice should be made at attack time rather than stored on the weapon — in that case they belong
in the attack dialog instead, and only `secondWeaponKnowledge` / `secondWeaponLore` stay on the
item.

**Done when:** the fields exist with comments naming his originals, and 26 modules still parse.

---

## 4. Check whether creatures use any of this

**Why it was left:** a quick read, and it decides whether the creature model needs the same fields.

`setGeneralCombatModifierDisplay` has creature branches for Second Weapon Knowledge and Lore that
read `getCreatureSkillChance(...)` rather than a class title. Whether the creature *attack* path
(`handleCreatureAttack`) honours an off-hand penalty at all has not been checked.

**Done when:** a line in `DECISIONS.md` records whether creatures take an off-hand penalty in his
code, and therefore whether the creature model needs the same three flags.
