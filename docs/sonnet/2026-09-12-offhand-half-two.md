# Left for Sonnet — 2026-09-12, off-hand fighting, second half

> **ALL FOUR ITEMS NOW DONE. Item 2 was answered by the developer 2026-09-14 and is built.** See
> `DECISIONS.md` → "Off-hand fighting's last two blockers, both answered by the developer" for the
> full account.
>
> - **Item 0 (the blocker):** cleared. Skills already resolve to `totalChance` on embedded skill
>   items via `_prepareSkills()`. A new `_getSkillChance(name)` helper and `_prepareOffhandSkills()`
>   step read a named skill's chance off the actor.
> - **Item 1 (Knowledge buy-down):** built exactly as specced — `floor(chance/20)` levels, each
>   worth a point of melee/damage and 5% of skill, floored at zero independently per figure.
> - **Item 3 (the two planning-note items):** both done; see `2026-09-12-offhand-planning.md`.
> - **Item 2 (Lore's seconds discount):** the finding below still stands as a fact about his sheet
>   — it really does compute `offhand_2nd_lore_seconds`, store it, and read it back exactly once,
>   into a display string, never subtracting it from anything. What was missing was not in his
>   code: the 5-second base cost is a fixed Player's Guide rule (p.178) a player tracks by hand, not
>   something his sheet ever needed to compute. The developer confirmed the number directly: 5
>   seconds off the round for a non-ambidextrous character, Lore adding up to 5 more, capped at 10,
>   Ambidextrous exempt outright. Built as `getOffhandSecondsCap` in `combat-rules.mjs`, exposed on
>   the Combat tab as a cap rather than enforced as a round-tracker pool — see the DECISIONS.md
>   entry for why enforcement is left open rather than decided alone.

Half one is built: the `hand` field, derived off-handedness, the three generated penalty tables and
the full-penalty tier, with the tag on the combat page. **Do not rebuild any of it.** See
`DECISIONS.md` → "Off-hand fighting, first half", and note that items 2 and 3 of
`2026-09-12-offhand-planning.md` are now marked DONE.

The description below is kept for the reasoning, not as work still to do.

---

## 0. The blocker, which must be checked before anything else

Both skills read **the character's own skill percentage** and convert it to levels. So this whole
half depends on Second Weapon Knowledge and Second Weapon Lore resolving to a NUMBER on the actor.

The Skills module is still Backlog (Epic 2), so **check first** whether a named skill's chance can be
read off a character today. If it cannot, stop and say so on the board rather than inventing a
lookup — a guessed skill resolver would be re-done the moment the real one lands, and worse, might
disagree with it silently.

If skills do resolve, everything below is mechanical.

## 1. Second Weapon Knowledge buys the penalty down

`sheet-worker.js:83188`. `skillChance / 20` levels, each worth **one point of to-hit back, one point
of damage back, and 5% of skills back**, and **never past zero** — the buy-down can cancel the
penalty but cannot turn it into a bonus.

The seam is already in place: `resolveOffhandPenalties` in `module/combat/combat-rules.mjs` already
returns tier `"knowledge"` and currently pays the full penalty, with a comment saying why. Fill in
the reduction there; nothing calling it has to change.

**Done when:** a character with a 60% skill gets 3 levels, a -4 melee penalty becomes -1, a -20 skill
penalty becomes -5, and a large enough skill floors all three at 0 rather than going positive. Test
the floor explicitly — it is the easy thing to get wrong.

## 2. Second Weapon Lore buys off-hand seconds

`sheet-worker.js:83242`. `skillChance / 20` levels **capped at 5**, each worth one extra off-hand
second, and **zero if Ambidextrous**, who need no extra time.

**The design question is settled, do not reopen it.** The user's answer: fighting off-handed COSTS
seconds, and ambidexterity is the absence of that cost rather than a bonus. So each level is a
**discount on the off-hand attack's own cost**, not extra general action time in the round — the
seconds cannot be spent on anything else. See `DECISIONS.md` → "RESOLVED 2026-09-12 — the three
questions above, answered by the user".

This needs the off-hand attack to HAVE a seconds cost to discount, which half one did not give it —
work out where that cost comes from before writing the discount. **If it turns out his sheet never
charges the extra second anywhere, stop and raise it**; that would mean the Lore skill's payoff has
no mechanical home yet, which is a finding, not something to invent.

**Done when:** five levels is the ceiling, an Ambidextrous character gets zero, and the discount
reaches the round tracker.

## 3. Still open from the earlier note

Both items below are unchanged and still wanted:

- **`2026-09-12-offhand-planning.md` item 1** — generate `get2ndWeaponKnowWhen` and
  `get2ndWeaponLoreWhen` into `classLoreTitles.json` beside the existing three. This is a
  **prerequisite for items 1 and 2 above**, since without it nothing knows at which title a class
  acquires either skill.
- **`2026-09-12-offhand-planning.md` item 4** — check whether creatures take an off-hand penalty at
  all in his code, and therefore whether the creature model needs the same `hand` field.

## Verification

All four suites, as ever: combat (335 now), derivation 173, creature 129,
availability 39, and 26 modules parsing. Run them with

```
python -m http.server 8777 --bind 127.0.0.1
```

**Not verifiable here:** anything needing a running Foundry V14.
