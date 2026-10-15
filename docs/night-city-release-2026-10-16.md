# Night city and drawn combat animations — 16 October 2026

Zone 1 now uses cool night ambient light with warm pools at lamps, torches, buildings and the dais. Emissive lava remains bright. Natural tree art is restored; detached scenery is drawn over ground cleared within the L1b footprint mask. The 4915 × 3277 terrain remains 20 lazily loaded chunks. New v3 paths avoid stale v2 image caches.

Animated flame tongues, window light, lava bubbles, flowing river glints, localized ice-plateau snow and falling woodland leaves respect reduced motion. Cast shadows darken actors more clearly. The middle lava bridge cannot exit through the eastern cliff face; navigation still reaches stations and uses real stairs/bridges.

NPC action buttons follow Nira and the merchant above their heads. Building actions sit at 48% of visible building height. Item flyouts open lower, the allied formation moves left, and defense uses a newly drawn transparent shield with a corrected CSS URL.

## Animation coverage

The unified manifest contains 76 sprite records and 560 drawn frames:

- Five fighting crew plus Guard: idle (4), normal attack (6), hurt (2), in each of four zones.
- Nira: idle (4) per zone, with existing four-direction walking retained. No fighting animation.
- Yama: hurt (4) in each outfit; existing sword idle, attack and map walking remain.
- Five boss identities per zone: authority, zone boss, frontier boss, tester and possessed authority. Idle (3), attack (6), hurt (3). Minions retain existing art.

Combat canvases keep fixed feet and isotropic scale, choose the actor’s home zone, and resize with the formation. A layout race discovered in real battle verification was fixed by binding to stable squad selectors before formation classes are added. Original images remain load-error fallbacks.

Healing sparks/rings and numbers attach to actual vital gains. Boon explicitly records the selected receiver and heal amount; its visual appears after the special cut-in. Browser verification healed Taan from 50 to 100 and observed `.heal-fx` on `data-crew-pick="taan"` with `+50`.

## Verification and handoff

- Full suite: 996 tests, 991 pass, 5 fail. All five failures also occur on clean pre-change main (a511143); baseline was 991 tests, 985 pass, 6 fail.
- Existing failures: concurrent construction render-state test; h5b cover-fx old version-token assertion; two I1-A mirror/attack-pose source assertions; I1-A old cache-token assertion. They are outside this delivery and are suitable for Claude system follow-up.
- Navigation checks cover cliff rejection, all station reachability, props and walk edges.
- Browser checked real allied idle poses, boss idle/hurt, selected-target healing, and all regional atlas loading without broken images.
- `output/night-review/` previews the production animation renderer for all four zones. `output/game-review/` uses memory-only saves and supports a boss toggle plus an injured Taan for healing checks.

Art was drawn by Codex. Claude’s CLI was unavailable until its 03:40 reset, so no concurrent Claude edits were mixed into this release. The shared original checkout was preserved, including unrelated changes/deletions. No production save reset is required.
