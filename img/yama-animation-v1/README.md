# Reviewed Yama animation exports

Lossless WebP production copies of the 2026-10-15 approved sprite pilot. Thai book walk includes the final ear-v6 cleanup. Asia, West and CyberHell use the matching zone costume variants.

- `book-idle.webp`: 4 columns × 4 direction rows, 320×480 per frame, root (160,440), drawn body height 320. Row order down, left, right, up. Timing 1000/320/100/480 ms.
- `book-walk.webp`: 8 columns × 4 rows with the same geometry. Eight poses cover the existing 56-unit full stride; world movement speed is unchanged.
- `sword-idle.webp`: 6 columns, 640×640 per frame, root (240,570), body height 354 for Thai and 420 for other outfits. Timing 1000/240/420/100/100/260 ms. Original attack sheets and attack timing remain in use.

`src/yama-animation.js` draws these sheets in the shared map/room/frontier renderer, battle idle overlay and sword training. Existing art is retained while sheets load or fail. The preload catalog includes all twelve exports. The HTML import map gives changed modules one canonical fresh URL, preserving shared outfit bindings while bypassing earlier browser module caches.

Validation: 39 focused Node tests, including distance/stride, idle timing, atlas anchors, zone preload coverage, rooms, frontier and battle turns. Local game browser confirmed `book-idle` advances frames and `book-walk` is selected when moving; no console errors. Map/UI layout and saved-game schema are unchanged by this release.
