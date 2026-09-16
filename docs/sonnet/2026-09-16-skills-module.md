# Left for Sonnet — 2026-09-16, the Skills module pass

What this pass deliberately did **not** do. Each item is self-contained: you should not need the
session it came from. Full account in `DECISIONS.md` → "The Skills module's four open items, and
one that was already done".

**Already done, do not rebuild:** duplicate-skill rolling (roll each copy, take the best), the four
slot trades and both sacrifices, over-allocation flagging, untrained common-skill rolls, and
`getSlotsNeededForClass` (which was extracted long ago — the board row claiming otherwise was
stale and is now corrected).

---

## 1. Extract the restricted flag for the 674 skills

**Why it was left:** bulk text parsing, no judgement, and the alternative was guessing.

`isRestricted` is on `module/data/item-skill.mjs`, honoured by the untrained-skill picker in
`module/sheets/actor-character-sheet.mjs` (`#onRollUntrainedSkill`), and **false on every skill**,
because his `skilldict` has no restricted column. The seventh column is learn time — Climb carries
`"32"`, Second Weapon Lore carries `""` — so restriction cannot be read out of his data.

The Player's Guide states it per skill, in the block above each description:

```
SECOND WEAPON LORE
Attributes: Agility, Intelligence
Rating: 17
Start Bonus: 1d10%
Time: Varies
Restricted: Yes
Learn Time: N/A
```

Parse `Restricted:\s*(Yes|No)` out of `docs/reference/players-guide-fulltext.txt` (and the other
three books for skills sourced from them — `skills.json` records a `sourcebook` per skill, so each
skill knows which book to look in), key it by skill name, and set `isRestricted` in
`tools/extract/build_documents.py` where the rest of the skill fields are mapped.

**Do not infer it from the blank learn time.** The two correlate, but that is a correlation and
this project does not encode one as the datum. If a skill's entry cannot be found in the book text,
leave it false and report the count, rather than falling back to the proxy.

**Done when:** `skills.json` carries `isRestricted` for every skill the books state it for, the
generator reports how many were found and how many were not, and all four suites still pass
(combat 345, derivation 227, creature 139, availability 39).

---

## 2. Show which skills a character could attempt untrained

**Why it was left:** presentation only, and it wants item 1 first to be worth much.

The untrained roll is a button and a picker dialog today. The skills tab could list the handful a
character is most likely to reach for — but with `isRestricted` false everywhere the list would be
all 674 skills, which is why this waits.

**Done when:** either the tab shows something useful, or a line in `DECISIONS.md` records that the
picker is the whole of it and why.

---

## 3. Exercise the new sheet actions in a running Foundry V14

**Why it was left:** blocked, not on effort — there is no V14 install on this machine.

Four things are built and unverified end to end: the trade confirmation writing
`system.skillSlotMoves` back and re-rendering, the sacrifice dialog rolling 2d4 and adding it to
the chosen skill's `system.misc`, the duplicate-skill card showing one line per copy with the taken
one marked, and the untrained picker reading `world.imagine-skills` (which needs the content
importer to have run, so it cannot be exercised in a preview harness at all).

**Done when:** each has been driven once in a real world, or the blocker is recorded against the
board row.

---

## 4. Dual class shares two foundations with this

> **DONE 2026-09-16, same day as this note.** Built as its own board row ("Dual Class Characters")
> rather than as an item here. See `DECISIONS.md` → "Dual Class Characters, built from the book
> alone" for the full account.

Dual classing leaned on the same two things this pass touched: `skillSlotsNeeded` (a
dual-classed character needs both classes' slots out of one Knowledge allowance, which is the
motivating example the book gives for the slot tricks existing at all) and the duplicate-skill
rule (dual class rule 6 of the first list, "May choose a skill twice and have two versions of the
same skill" — note there are two rule 6s in that section; the other, under Experience and
Advancement, is about Knowledge maximums and is unrelated).

Nothing here blocks that story; it is noted so it is not re-derived.
