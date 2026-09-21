# Left for a cheaper window — 2026-09-21, source attribution

Every document now carries a sourcebook, from his own Master Index. The method, the rejected
heuristic and the XXX decision are all settled in `DECISIONS.md` 2026-09-21 — none of it needs
re-litigating. What follows is mechanical extension of a pattern already established.

---

## 1. Work the XXX list down from the books we hold

**What to do.** `docs/UNATTRIBUTED.md` lists the 1,702 documents with no source, worst first:
abilities 907, equipment 260, disabilities 199, armour 144, weapons 109, immunities 67,
classes 12, skills 4. Many will be his generated variants whose BASE name is in the index under a
spelling `variants()` in `tools/extract/extract_sources.py` does not yet produce. Read a dozen
misses, find the spelling rule, add it to `variants()`, re-run `--verify` to confirm the skills
ground truth has not dropped below 98%, then regenerate.

**Files.** `tools/extract/extract_sources.py` (`variants()` only), then
`python tools/extract/extract_sources.py && python tools/extract/build_documents.py --write`.

**Done looks like.** The XXX count falls, `--verify` still reports 98% or better, and
`docs/UNATTRIBUTED.md` is regenerated. **Do not** widen `variants()` so far that a bare
parenthetical qualifier matches alone — that bug made "Boomerang(Wood)" resolve to the index
entry for "wood" and is commented against in the file.

## 2. The four skills marked XXX

Only 4 of 680 skills failed to resolve, and skills are the one pack where his own answer exists.
Find them (`grep -A2 '## skills' docs/UNATTRIBUTED.md`), see what his dictionary says, and either
fix the match or record them in `src/packs/manual/skills.json` with `"_override": true`.

## 3. Re-extract the scanned books table-aware

The armour and equipment VALUE tables in the Player's Guide are images — page 188-190 gave prose
and left blank gaps where the tables are. That is why armour resolved at 4% from the books and had
to lean on the Master Index. `extract_book_text.py` uses PyMuPDF, which has `find_tables()`;
a table-aware pass may recover them and give real book pages instead of Master Index pages.
PDFs are in `C:/Users/samwy/Downloads/` (`IRP_playersguide.pdf`, `IRP_mastersmanual_scan.pdf`,
`IRP_aspects.pdf`, `IRP_mysteries.pdf`).

## 4. One book is still missing, and it may not exist

**Conquest of the Eternal** -- cited by 100 documents, no PDF. He said on 2026-09-21 that it may
be unreleased, so treat this as pinned, not as a task. Those documents are NOT a gap: they carry
his book name from his own data and are merely not page-referenced.

**Legends of the Unknown** arrived the same day and is done (465 pages, index at 462-465, offset
6, in `BOOK_INDEXES`). **Epitaph of the Fallen** and **Aspects of the Wild** are extracted but
carry no back-of-book index, so they can never contribute page numbers -- checked, commented in
`extract_sources.py`, do not look again.

If Conquest ever appears: extract it, check the last twenty pages for an index, and add it to
`BOOK_INDEXES` only if it has one. Then re-run `--verify` before regenerating.

## 5. An "XXX — no source found" folder in the Items sidebar

`module/item-directory.mjs` groups items into folders. A top-level folder collecting everything
whose `system.sourcebook` is `XXX` would let a Game Master see the whole gap in one list rather
than one red field at a time. The `DIRECTORY` table's `group` callbacks already do exactly this
kind of thing — follow the `byLetter` pattern.

**Done looks like.** The folder appears only when something is unattributed, and is not created
in a world where the list is empty.
