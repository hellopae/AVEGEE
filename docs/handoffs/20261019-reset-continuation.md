# Handoff after usage reset — 2026-10-19

Repository: `/Users/agapae/Documents/Work PAE/Claude/AVEGEE/release-worktree-20261019`

Branch: `codex/release-20261019`

Latest deployed commit at handoff: `06beabc5dc97602b4b0fa889809d62456f537ea0`

Production: <https://hellopae.github.io/AVEGEE/>

This checklist is the source of truth for the continuation. Do not report the work as complete merely because the automated suite passes. Validate the requested visual behavior in the real game and compare it with the supplied references.

## Required order after reset

1. Finish and visually verify every open or partial item below.
2. Re-audit all prior owner comments against the real deployed game, not only source/tests.
3. Implement the expanded interrogation/sentencing system described below.
4. Run focused tests, full tests, browser gameplay checks, and inspect the final diff.
5. Push only when the checklist is complete; verify `main`, GitHub Pages deployment, and the live build marker.

## Open — must be implemented

### Zone 1 map and navigation

- Rebuild the Zone 1 walkmask to match every visible walkable route in `/Users/agapae/Desktop/map/Map-Zone1-3.jpg`. The red overlay in that reference marks blocked terrain; every exposed path/stair/bridge must be connected and traversable. The current release only added a few local polygons and does not satisfy the full reference.
- Verify the upper-left stairs/bridge route from `/Users/agapae/Desktop/map/2.png`: Yama must use the upper route, must not walk through trees, and the blocking tree group must be removed cleanly.
- Verify both routes marked in `/Users/agapae/Desktop/map/3.png` are traversable end-to-end, including the lower-left path and the path beside the building.
- Add navigation regression samples for all major connected branches from `Map-Zone1-3.jpg`, then manually walk them in the real game with the camera following Yama.

### Zone 1 visual cleanup

- Repaint the square/rectangular ground seams under buildings and trees shown in map images 6, 8, and 11. The current atomic tile loading avoids mixed loading states but does not repair defects baked into the artwork.
- Repair incomplete building shadows in map images 6, 11, and 12 so buildings sit on the ground. Current generic shadow changes are not enough for each marked prop.
- Visually inspect the requested station/house flips and the removed waterfall building in the actual game at gameplay zoom.
- Inspect and refine moving clouds, boiling/hot lava, flame shapes, and falling leaf shapes. Code effects exist, but acceptance requires visual comparison with images 5 and 5.5.

### Outside-border map

- Replace `img/frontier-route/zone1-2-v2.webp` with genuinely redrawn, detailed production art. It is currently an enlargement of the old 1672×941 image; its downscaled pixels differ by only about 1–2 RGB levels.
- Ensure the full map remains sharp while the camera moves. Match Yama, Nira, and enemy scale to the normal Zone 1 map.
- Keep trees, shadows, flowing-water effects, and falling leaves; remove all geographic labels such as waterfall/valley/cave.
- Increase roaming encounters outside the border and verify proximity starts battle. Keep the border checkpoint at only 2–3 smaller normal enemies.
- Confirm only Yama and Nira travel by default; the relevant zone boss joins only during the guided journey.

### Soul ferry and workers

- Tie the ferry to opening the court and pending cases. It currently loops independently of court state.
- On court opening, show the ferry arriving at the harbour, souls disembarking, and a hired worker escorting them toward the judgment dais.
- Make the case immediately available after disembarkation so the player can press “เริ่มพิจารณาคดี” without waiting for the full walk.
- Define and implement a graceful flow when no worker is available: the soul should wait at the harbour or use an explicit fallback attendant, not appear suddenly on the dais stairs.
- Re-test worker jobs in live gameplay: thorn-tree cutting, sword-fragment collection and merchant sale, prison/punishment/heaven escort, Taan repair, and building construction.

### Story/cutscene art still incomplete

- Draw a real boss gift scene for bosses 1–3 giving money and the next-zone outfit at the new-zone gate. The current flow grants rewards and shows text but reuses the older farewell illustration.
- Verify the new Nira combat/healing ultimate illustrations for zones 1–4 in real battles, including orientation, camera reset, no giant zoom, hurt reactions, and absence of a black rectangle behind hit effects.

## Partial — code exists, visual/gameplay acceptance still required

- Battle polish: allied forward lunge, Nira facing right, Yama/Nira hurt poses, closer formation, command-menu spacing, classic ultimate transition, hit-effect transparency, and post-cutscene camera reset are implemented and covered by tests. Replay the supplied recording scenario in a browser before acceptance.
- Preloading: the exact map preview is retained/decoded and corrupt image cache retries are implemented. Test with cache disabled, normal cache, and throttled network to ensure the map never remains black after entering play.
- Dialogue placement/team button/spirit text: CSS and placement changes exist; verify Nira, King Yom, and spirit bubbles at common camera positions and multiple viewport sizes.
- Boss guide rewards: money/outfit state and merchant removal are implemented; the bespoke gift artwork remains open.
- Regional Nira cutscenes: four new images exist; validate all four routes from command selection through return to normal battle framing.

## Implemented and covered, but include in the final regression pass

- Yama display name is “ยามา”; “ยมบาทน้อย” is the title.
- Normal border enemies are smaller and limited; boss scale remains authored separately.
- Boss weapon powers include area attacks: wind fan, Valkyrie spear, hypnosis, and ice.
- Bosses 1–3 praise Yama, invite Yama to the border, accompany Yama/Nira, and provide reward state at farewell.
- Existing sentencing flow and final-boss forced mirror/max settings have automated coverage. The expanded interrogation work below still must be implemented and verified as a user-facing sequence.

## Expanded interrogation and sentencing system — do after the fixes above

### Border bosses in every zone

- After defeating each zone’s border boss, cut to that zone’s judgment dais.
- Show Yama, Nira, and the captured border boss on the map.
- Enter an interrogation screen where the player chooses punishment location, keeper, and severity.
- After judgment, show the keeper escorting the boss to the selected punishment.
- When punishment is complete, release the boss back to the border with persistent state preventing duplicate sentencing.

### Zone 4 final boss ending sequence

- After defeating the Zone 4 boss and playing `story-ending-01-v4`, show the bound Zone 4 boss in the interrogation screen.
- Force use of the magic mirror; it must reveal/confirm the punishment location, keeper, and maximum severity.
- Draw and play a new cutscene of the keeper taking the bound Zone 4 boss to punishment.
- Only after that sequence completes, play `story-ending-02-v3`.
- Test save/reload at every boundary so the ending cannot skip sentencing, replay rewards, or deadlock.

## Release gate

- Manual route matrix: every branch visible in `Map-Zone1-3.jpg` walked end-to-end.
- Manual visual matrix: map images 1–14, 3.5, 5.5 and the battle recording checked against the live build.
- Story matrix: bosses 1–4, guide journey/reward, border sentencing, final ending, save/reload.
- Focused tests pass, then `node --test --test-reporter=spec tests/*.test.mjs` passes.
- Working tree clean after commit; push branch/main as authorized.
- Confirm remote `main` SHA, successful Pages run, and the same build marker from the live URL.

