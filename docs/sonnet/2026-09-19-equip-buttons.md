# Sonnet follow-through: Equip Best Armour / Remove All Arms

Left undone on purpose (mechanical, or waiting on a decision by the developer):

1. **Same two buttons inside the Character Generator.** The generator has no equipment step
   (starting money and equipment are still on the Character Generation leftovers list), so the
   buttons went on the sheet's Equipment tab, which serves creation and play alike. When a starting-kit
   step is added, call `chooseBestArmor` from `module/equip-rules.mjs` and reuse the sheet handlers'
   update shape (`system.location: "equipped"`, `system.layer`). Done = same buttons on that step,
   plus one test in `tools/chargen-test.html`.
2. **Equip weapons.** Only armour is equipped. Which weapon goes in which hand is the player's call
   (`setWeaponHand`), so it was not decided for them.
3. **Shields.** Left untouched by Equip Best Armour, for the same reason (which hand is free).
4. **Ruling to confirm with the developer:** `Mixed` flexibility is treated as Semi-Flexible, and
   Semi-Flexible/Mixed pieces are allowed against the body. The Player's Guide only requires the first layer
   to be flexible or padded; refusing chain shirts against the skin looked wrong. Change in
   `getLocationStack` if he rules otherwise.
5. Layer numbers are per piece (outermost place it holds at any location); the layering itself is
   not yet enforced anywhere else, e.g. when a player equips armour by hand.
