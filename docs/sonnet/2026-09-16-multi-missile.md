# Left for Sonnet — 2026-09-16, multiple missile fire

What this pass deliberately did **not** do. Each item is self-contained. Full account in
`DECISIONS.md` → "Multiple missile fire, and two places the books argue with themselves".

**Already done, do not rebuild:** the three firing modes and their penalties, combination parsing
and matching, both skill tiers (Lore removes, Knowledge buys down at 25% a level), the attack
dialog's Firing dropdown, the damage repeat for two and three projectiles, and the two list fields
on the Combat tab.

---

## 1. Acquiring a combination, rather than typing it

**Why it was left:** it belongs with character generation, which is not built.

Both skills are learned one launcher/missile pair at a time, by a skill roll against the skill's
own chance — his `handleRollMultiMissileKnow` / `handleRollMultiMissileLore`
(sheet-worker.js:88805 and 88950) do the roll, refuse a pair already known, refuse a launcher and
missile that do not go together, and append to the list on success. They also carry the skills'
Critical Failure rule: a failed attempt locks that specific combination out until the skill chance
increases.

Today the two lists are text fields a player types into, which is the same shape the three other
lore lists have and is fine until there is an acquisition flow to hang this on.

**Done when:** either the roll exists, or a line in `DECISIONS.md` records that typing the list is
the whole of it for now and why.

---

## 2. Cross-check the six Multiple Missile Lore classes

**Why it was left:** cheap, no judgement, and it mirrors a check already run for Projectile Lore.

The generator reports six classes reaching Multiple Missile Lore: Archer, Archer(Arcane), Archer
(Zen), Border Scout, Hunter, Mounted Archer — the same six that get Projectile Lore, which is a
good sign given the Master's Manual makes Projectile Lore a prerequisite for Multiple Missile
Knowledge, which is in turn the prerequisite for Multiple Missile Lore.

Worth confirming the two lists really are identical rather than coincidentally the same length,
and worth noting if any class reaches Multiple Missile Lore without reaching Projectile Lore first,
since the Master's Manual says that cannot happen.

**Done when:** a one-line note in `DECISIONS.md` says the two lists agree, or any class that breaks
the prerequisite chain is written up as a new `UPSTREAM-ISSUES.md` item.

---

## 3. If he answers item 28 or 29

**Why it was left:** blocked on the developer.

- **Item 28** (his sheet rolls double/triple fire once, the book says roll separately): if he says
  the book's version is what he plays, `resolveMultiMissile` already reports `shots`, so the change
  is in `attack.mjs` — loop that many attack rolls instead of multiplying one damage figure — plus
  a card that can show more than one result. If he confirms the single roll, close the item.
- **Item 29** (the Knowledge skill's worked example contradicts its own rule): if he says the
  example is right and the rule is wrong, each level is worth 2 to hit and 3 damage instead of 1
  and 2, which is two constants in `MULTI_MISSILE_PER_LEVEL` and the tests that pin -2/-2 at 50%.

**Done when:** all four suites pass at their counts (combat 374, derivation 251, creature 139,
availability 39).

---

## 4. Special projectile types, when they land

**Why it was left:** there is nothing to attach it to yet.

Both skills reduce or remove three kinds of penalty. Two exist in the port — multiple projectiles
and two weapons at once. The third, "penalties for special projectile types", needs a launcher to
be loadable with something other than its normal ammunition, which is his `switchedProjectiles` /
`altProjectileName` path and is not modelled here at all.

When special projectiles do land, `resolveMultiMissile` takes a `mode` key, so the work is adding a
mode (or modes) to `MULTI_MISSILE_MODES` with the right figures and letting the existing tier logic
apply unchanged. His two match branches at sheet-worker.js:64699-64703 are the switched-projectile
half of the combination matching and would come back into `hasMissileCombo` at the same time.

**Done when:** special projectiles exist and their penalty is in the table, or this note is folded
into whatever story builds them.
