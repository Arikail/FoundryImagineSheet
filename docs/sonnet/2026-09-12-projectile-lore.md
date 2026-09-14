# Left for Sonnet — 2026-09-12, Projectile Lore pass

> **Items 1-4 DONE 2026-09-14.** A real Archer at title 12 (weapon/missile/projectile titles
> 12/3/7, all reachable at once) confirmed the Lore panel shows all three rows and the chat card
> shows "+10 projectile lore (2/die)" on a real Long Bow attack — both as a second, isolated
> render on the sheet preview, since the Warrior fixture never acquires this lore. Item 2's line
> was already built as a side effect of the lore-corrections pass. Item 4 found there is no data
> to cross-check against at all — `skilldict` carries one generic "Projectile Lore" skill with no
> class association, and `classSkills` (the only class-to-skill mapping that exists) is empty for
> all 86 generated classes. Full account in `DECISIONS.md` → "Projectile Lore's remaining items...".
> Item 5 stays blocked on the developer.

Mechanical follow-through from the Projectile Lore pass. Each item stands alone; you should not
need the session it came from. The earlier note `2026-09-12-lore-corrections.md` is still open too.

---

## 1. Exercise the Projectile Lore panel in the sheet preview

**Why it was left:** needs a fixture change, and the pass was short on context.

`templates/actor/tab-combat.hbs` gained a "Projectiles specifically lored" row, and
`#buildLorePanel` in `module/sheets/actor-character-sheet.mjs` gained `hasProjectile` /
`projectileText`. Neither has been seen rendered: the preview character in
`tools/sheet-preview.html` is a **Warrior**, and no Warrior ever acquires Projectile Lore.

Swap the preview's class to one that does — `Archer`, `Hunter`, `Border Scout`,
`Mounted Archer`, `Archer(Arcane)` or `Archer(Zen)` — or add a second preview character. Give it
`projectileLoreList: "Arrow(Long Bow/Normal)"` in the `combat:` block of the fixture, beside the
`weaponLoreList` already there, and add a bow and an arrow to the weapon list.

**Done when:** the Lore panel shows three rows, the label reads "Weapon, Missile, Projectile" (or
whichever the class actually has), and the projectile input carries its value.

**Already decided, do not revisit:** the figures (+1 per die general, +2 per die specific) and
that a launcher is lored through its ammunition rather than its own name. See `DECISIONS.md`,
"Projectile Lore, per die".

---

## 2. Show Projectile Lore on the attack chat card

**Why it was left:** presentation only; the data is already on the flag.

`module/combat/attack.mjs` records `damage.projectileLore` and `damage.projectileLorePerDie` on
the attack flag. The card does not mention them. Add a line saying what it contributed and at what
rate — "Projectile Lore +4 (2 per die)" — alongside the Strength and magic lines.

This overlaps item 1 of the earlier note (the same job for Weapon/Missile Lore); do both together
and it is one edit.

**Done when:** an archer's bow attack shows the contribution, a sword attack shows nothing new,
and `tools/combat-test.html` still passes at 291.

---

## 3. Add a derivation test for the Projectile Lore flags

**Why it was left:** mirrors tests that already exist; no judgement needed.

`tools/derive-test.html` has a block "lore from the class and the title" covering
`hasWeaponLore` / `hasMissileLore` and the parsed name lists. Projectile Lore has an equivalent
derivation in `module/data/actor-character.mjs` — `projectileLoreTitle`, `hasProjectileLore`,
`projectileLoreNames` — and no test.

Copy the existing block's shape: a class fixture with `projectileLoreTitle` set, a character below
the title and one at it, and one asserting `projectileLoreNames` parses a stored string.

**Done when:** the derivation suite passes above 123 with the new checks.

---

## 4. Check the six projectile-lore classes against his class data

**Why it was left:** cheap sanity check, no judgement.

The generator reports six classes acquiring Projectile Lore: Archer, Archer(Arcane), Archer(Zen),
Border Scout, Hunter, Mounted Archer. That is a plausible list, but it has not been cross-checked
against anything else in his data — for instance whether those same six are the classes whose
`skilldict` entries include a Projectile Lore skill.

**Done when:** either a one-line note in `DECISIONS.md` says the two agree, or any disagreement is
written up for the developer as a new `UPSTREAM-ISSUES.md` item.

---

## 5. If he answers item 21

**Why it was left:** blocked on the developer.

Item 21 now reports that `MLDamMod` is missing from the damage sum, so Missile Lore's specific
damage never rolls. The port already gives it. If he says the omission was deliberate, remove the
missile branch's damage from `LORE_SPECIFIC` handling in `module/combat/combat-rules.mjs` and
update the tests that assert +6 for a lored missile weapon.

**Done when:** all four suites pass at their counts (combat 291, derivation 123, creature 129,
availability 39).
