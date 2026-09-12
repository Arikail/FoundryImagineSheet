# Left for Sonnet — 2026-09-12, lore corrections pass

What this pass deliberately did **not** do, because it is mechanical extension of a pattern that
already exists in the repo. Each item is self-contained: you should not need to read the session
it came from.

---

## 1. Add a `loreSpecific` note to the attack chat card

**Why it was left:** the wiring is done and tested; this is presentation only.

`module/combat/attack.mjs` already computes `tmplore` (from `getLoreModifiers`) and records
`damage.lore` on the attack flag. The chat card does not mention it. Add a line to the card —
next to the existing Strength and magic lines — saying what lore contributed, and whether it was
the general kind or specific to that weapon (`tmplore.specific`).

**Done when:** an attack with lore shows the contribution on the card, an attack without lore
shows nothing new, and `tools/combat-test.html` still passes at its current count.

**Already decided, do not revisit:** the figures themselves (+2/+4/-1/+10% general, +3/+6/-2/+20%
specific) and that specific replaces general rather than adding to it. See `DECISIONS.md`,
"Per-weapon lore", and `UPSTREAM-ISSUES.md` item 21.

---

## 2. Mirror the lore panel onto the creature sheet, or decide it does not belong

**Why it was left:** needs one small judgement, then it is mechanical.

`templates/actor/tab-combat.hbs` has a Lore panel and a per-weapon `lore-tag`; the creature
equivalent, `tab-creature-combat.hbs`, has neither. The creature model already derives
`combat.hasWeaponLore` / `hasMissileLore` from its skill list (see `_prepareCombat` in
`module/data/actor-creature.mjs`), so the flags exist.

The judgement: a creature's lore comes from a flat skill percentage, not a class title, and a
creature has no per-weapon lore list in his data. So the panel probably should **not** be copied —
but the `lore-tag` on the weapons table plausibly should, driven by the general tier only.

**Done when:** either the tag is showing on creature weapons, or a one-line note in
`DECISIONS.md` records that creature lore stays display-free and why.

---

## 3. Sweep the remaining `speedSpecial` weapons for lore interaction

**Why it was left:** small, and needs no judgement about his intent.

The character sheet renders `speed: "Special"` for weapons with `speedSpecial` set (lances,
caltrops, garrotes) and skips `getWeaponSpeed` entirely. Lore's speed modifier therefore never
applies to them, which is almost certainly right, but it is untested.

**Done when:** a test in `tools/combat-test.html` asserts that a `speedSpecial` weapon's displayed
speed is unchanged by lore, alongside the existing lore speed tests.

---

## 4. Regenerate and re-verify if he answers items 20 or 21

**Why it was left:** blocked on the developer, not on effort.

- **Item 20** (`Enduring All` not covering Obliteration): if he adds the missing line,
  re-run `python tools/extract/extract_combat_tables.py` and confirm `ENDURED_BY["Obliteration"]`
  picks up the second tag. The generator already reads it; nothing else should change.
- **Item 21** (per-weapon lore displayed but not applied): if he says the general figures are all
  a lored weapon should get, change `LORE_SPECIFIC` in `module/combat/combat-rules.mjs` to match
  `LORE_GENERAL` and update the tests that assert +3/+6/-2/+20%.

**Done when:** the tables regenerate clean and all four suites pass at their current counts
(combat 270, derivation 123, creature 129, availability 39).
