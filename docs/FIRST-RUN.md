# The First Foundry Run

Nothing in this system has ever been loaded by Foundry. Every "not verified" note on the board
reduces to that one sentence, and this document exists to make the first run short: what was checked
against the V14 API ahead of time, what could not be, and the order to test things in so that each
failure is the smallest one left.

Audit date **2026-09-19**, against the Foundry V14 API documentation (`foundryvtt.com/api/v14`).

---

## What was verified against the V14 docs

Every namespaced path the system calls was checked against the published V14 API. All of them are
current:

| What the system calls | Verified |
|---|---|
| `foundry.applications.sheets.ActorSheetV2` / `ItemSheetV2` | yes, both exist |
| `foundry.applications.api.DialogV2.confirm` | yes; takes `window`, `content`, `modal`, `rejectClose`, and returns `true` / `false` / `null` |
| `foundry.documents.collections.Items.registerSheet` / `Actors.registerSheet` | yes, static, inherited from `WorldCollection` |
| `foundry.applications.ux.FormDataExtended` | yes |
| `foundry.applications.handlebars.renderTemplate` | yes |
| `foundry.documents.collections.CompendiumCollection.createCompendium` | yes; `(metadata, options)` |
| `CONFIG.Actor.dataModels` / `CONFIG.Item.dataModels` | yes, the documented way to register a `TypeDataModel` |
| `ApplicationV2`: `title` getter overridable, `element` is an `HTMLElement` | yes, both |
| `DocumentSheetV2#_processFormData(event, form, formData)` | yes — **returns an EXPANDED object** |
| `updateDocument` hook `(document, changed, options, userId)` | yes; fires on **all** clients, `options` is a partial of the update operation |

**`system.json` is correct**: `documentTypes` declares 2 actor and 9 item types, and every one has a
data model registered for it in `init`. A mismatch there is the classic first-run failure — an actor
of an undeclared type is discarded by the server as invalid — and there is none.

**Foundry does ship the Handlebars comparison helpers** (`eq`, `ne`, `lt`, `gt`, `lte`, `gte`, `not`,
`and`, `or`). Two comments in this codebase said their presence "cannot be checked"; it can, and they
are there. The templates still mostly avoid them, for a different and still-good reason: the preview
harnesses render the same files through plain Handlebars, where a helper exists only if the harness
registered it.

## What the audit found and fixed

- **`_processFormData` returns an expanded object**, so the skill sheet's `tmpdata["system.types"]`
  would never have matched and a skill's types would have reached the document as a string, failing
  the `ArrayField`'s validation. Corrected to `tmpdata.system.types`.
- **Equipment, weapons and skills had no sheet**, and the Equipment tab's new Add buttons create
  exactly those and open the sheet at once — onto Foundry's generic fallback, with none of this
  system's fields on it. All three now have sheets.

## What could NOT be verified without running it

These are the things to watch on the first run, and why:

1. **The update-options passthrough.** `commitTitle` marks its own update with `GRANT_HANDLED` so the
   `updateActor` hook does not grant the same class skills a second time. The docs describe `options`
   as "additional options which modified the update request" but do not promise that arbitrary keys
   survive — including across the socket to other clients. **If it does not hold, a title advance
   grants every skill of that title twice.** See `module/class-advancement.mjs`; there is a second
   guard (an in-flight set) that should catch it even if the option is dropped.
2. **Hook timing.** The grant reads `actor.system.identity.classProgression`, which is derived data.
   It assumes the actor has been re-prepared by the time `updateActor` fires.
3. **Sheet registration actually taking.** Eleven registrations, three of them new today.
4. **`createCompendium` metadata.** The importer builds nine world packs on first launch.
5. **Anything to do with the dice, chat cards and notifications**, none of which exist outside Foundry.

---

## Smoke test, in the order things will break

Work down this list. Each step is ordered so that a failure is the smallest one left standing — do
not skip ahead, because a failure at step 2 makes everything after it meaningless.

**1. The system loads.**
Create a world with the system. Open the console (F12) before anything else. A red error at load is
almost always a bad namespace path or a missing file in `esmodules`/`styles`.
*Expect:* no errors, and a prompt offering to build the content packs.

**2. The content imports.**
Accept the prompt, or run `game.imagine.importContent()`. It builds nine compendia from
`src/packs/documents/*.json`.
*Expect:* nine packs in the sidebar — skills 674, weapons 594, armour 719, equipment 637, races 105,
classes 103, abilities 1,154, disabilities 249, immunities 149. **4,384 documents.**
*If it fails:* the `createCompendium` metadata, or a schema field the data does not match.

**3. An actor exists and opens.**
Create a Character. This is the moment `documentTypes` and `CONFIG.Actor.dataModels` are both proved.
*Expect:* the sheet opens on five tabs, with zeros rather than blanks or `NaN`.

**4. A race and a class go on.**
Drag `Human(Civilized:Village)` and `Warrior` from the compendia onto the sheet.
*Expect:* attributes gain their racial modifiers; the header names the class and title; the Skills
tab shows the class progression; movement rates stop reading zero.

**5. The class-skill grant.** ← *the riskiest thing in the system*
Set the character's title to 2 (header, or `game.imagine.grantClassSkills(actor)`).
*Expect:* the title's class skills arrive **once each**. Count them. **Two of anything means the
option passthrough at 1 above did not hold** — tell me and it is a ten-minute fix.

**6. Rolls and chat.**
Roll an attribute save and a skill. Then equip a weapon and attack a target.
*Expect:* chat cards with the outcome tiers, and Apply Damage on the attack card.

**7. The character generator.**
`game.imagine.generateCharacter()`, or the button in the Actors directory. Walk all seven steps.
*Expect:* attributes roll; the class refuses a character who does not qualify and offers an override;
Roll height, frame & weight fills all three; hair, eyes and skin are dropdowns of the race's colours;
Create makes an actor whose derived attributes equal what the last step showed.

**8. Levelling.**
Experience & levels on the header. Add 2,000 experience to a title-1 character.
*Expect:* the queue fills; the goal step offers the class's two attributes at 5% each; skill points
must all be placed before Commit will enable.

**9. The Game Master's windows.**
Content Availability in the settings menu. Switch a sourcebook off.
*Expect:* affected items on a character are flagged with a reason, never removed.

**10. Adding gear by hand.**
Equipment tab → Add equipment. *Expect:* a new item, its sheet opening at once with a weight field
on it. Set a weight; check encumbrance moves.

---

## When something fails

The browser console is the only thing worth sending: the error text and the stack. Nearly everything
here is one of four things — a namespace path that moved, a schema field the data does not match, a
hook that did not fire, or derived data read before it was prepared. All four are quick to fix once
the message is in hand; what is slow is guessing without one.
