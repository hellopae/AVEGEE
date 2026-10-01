# AVEGEE implementation status — 1 October 2026

This tracks the owner's phased request and its verification status.

## Core systems and presentation

- [x] Pause on window blur or tab hide and show a resume overlay.
- [x] Add subtle movement to interrogation and combat; reduce map name and speech label sizes.
- [x] Keep father's punishment at HP 1 when order collapses.
- [x] Add persistent MP and EXP. Verdicts and battles grant EXP; leveling raises HP, MP and attack slightly.
- [x] Charge fire, ice, hypnosis, flame charge, wind fan, Rage and Valkyrie spear from MP. Tea restores MP.
- [x] Remove attack powers from merchant stock. Sell tea, medicine, onigiri, lotus and zone outfits. Outfits become available for purchase only after travel.
- [x] Deliver onigiri to Nira and lotus to Boon for their requested effects.
- [x] Place Yama and Nira at the upper border when entering a zone.
- [x] Expand Zone 1 room art to fill the room viewport with floating information and action panels. The tea house was visually checked in Brave.
- [x] Use cutscenes for Yama's new powers and stronger enemy boss attacks. Event foe images resolve to their own zone art.
- [x] Show pending event opponents at the boss area on the map so they remain available for a retry. Zone 3's hypnotized spirits also wander visibly and can be clicked to start their battle.

## Story events

- [x] Zone 1: case 3 prison break; case 5 deva test and mirror; case 8 two-wave border battle and flame charge; case 10 Zone 2 boss plus two demons and big fireball.
- [x] Zone 2: case 3 arson with three spirits and a deva assist, followed by the wind fan test; case 6 three waves and Rage; case 10 boss plus two demons. One building is damaged by arson.
- [x] Zone 3: hypnotized spirits block construction on arrival; case 3 three border waves, vampire and hypnosis; case 7 deva and Valkyrie spear; case 10 boss plus two demons and ice.
- [x] Zone 4: Taan and the merchant appear captive at the prison; trade stays closed until the deva rescue battle frees them and grants the cooldown clock. Case 5 four waves grants a spare heart, which revives Yama once; case 10 is a four-boss gauntlet in the requested order.
- [x] Event defeats leave HP 1 and keep the opponent available. The tea house remains available for recovery.
- [x] The final victory opens an ending with continue or New Game. Continue keeps the world open for old boss rematches.

## Batch 27 (1 Oct 2026)

- [x] 27A rooms: all 10 rooms redrawn to the UI4 layout (crop, action buttons, walk areas, prison list panel).
- [x] 27B battle scene: full-frame battle dialog with team HUD, boss HUD, numbered meters, multi-foe name plates.
- [x] 27C profile screen, short goal moved into the bell inbox, crew help from level 1, event text fixes.
- [x] 27D walkable bridges, throne seat, free prison, win loot instead of map drops.
- [x] 27E shared event alert window with three prep slots (merchant / Nira / medicine). Closing the window sends raiders to burn buildings or leaves the foe waiting at the right bridge; clicking it reopens the window. Zone 3 uses skeletons, Zone 4 uses bot / bug / worm. The merchant slot stays locked until the CyberHell rescue is cleared.
- [x] Hero renamed to "ยมบาทน้อย" in all player-visible text.
- [x] Merge review: the prep slots returned to the alert immediately because the replaced dialog's async `close` event was read as a player close (fixed with `visit()` in `openEventAlert`); the nearby-mob button did nothing for event raiders and now opens their alert.
- [x] 155 Node tests pass (`combat-power` "cooldown B" is a known 1 ms timing flake). Browser checked at 1440x810 and 390x844: 10 rooms, event windows, boss alert and fight, Zone 3/4 waves, profile.

## Verification and follow-up

- [x] 124 Node tests passed; JavaScript syntax and `git diff --check` passed.
- [x] Opened the local game and inspected the Zone 1 map and tea house; browser console reported no errors.
- [ ] Play the whole four-zone story through the UI with a fresh save. Automated logic tests cover the event and reward transitions, but this longer manual run remains.
