# M2 — battle effects (src/battle-fx*.js)

## Files

| file | role |
|---|---|
| `src/battle-fx-map.js` | pure: move key -> recipe id (`recipeFor`), tiers (`fireTier`, `foeTier`), per-recipe metadata (`RECIPE_META`: hit time + camera hints), cue timing (`cueKindFor`, `cueImpactAt`) |
| `src/battle-fx-tex.js` | texture table (62 keys = the art spec) + loader. `img/fx/<key>.webp` when present, else a gradient stand-in drawn here (same key) |
| `src/battle-fx.js` | engine: one canvas, particle pool (300), timeline items, 22 recipes, camera adapter |
| `output/battle-fx-lab/index.html` | preview page — every recipe on the real battle background (`?r=fire_l` auto-plays; `fxAdvance(ms)` steps a virtual clock for frame captures) |
| `tests/m2-battle-fx.test.mjs` | mapping / implementation / no-filter / pool / texture-table checks |

## How a move becomes an effect

`ui.js openBattle()`: after each `paint()` the canvas is re-attached (`attachBattleFx(stage)`). At the three phase starts
(our command, the foe's counter, the enemy's own turn) `startMoveFx()` measures the sprites (stage-local px) and calls
`playBattleFx({ recipe, src, targets:[{rect, dmg, label}], side, delay, impactAt })`. Healing goes through `showHeals()` -> `playHealBattleFx()`
so every source of healing (items, Boon, drain weapon, spare heart) gets the ring of light. The interrogation stage plays hypno / mirror
(`trialFx`). While an effect owns the phase `.arena.fx-handled` hides the old static `.fx` image and the DOM damage number.

## Adding / changing a recipe

1. add the id to `RECIPE_IDS` + `RECIPE_META` (battle-fx-map.js) and map the move in `recipeFor`
2. add `R.<name>` in battle-fx.js and an entry in `RUN` — build it from `spr()` (timed sprite), `emit()` / `sparks()` (particles), `numberAt()`, `cam.*`
3. new texture? add it to `TEX` (battle-fx-tex.js) **and** a `GEN[...]` stand-in, then add the file to the art spec. The test fails until all three agree.

Rules: no `ctx.filter` / `shadowBlur`, never more than `MAX_PARTICLES` (300) live, never recolor a real texture (colour variants are separate keys).

## Swapping in real art

Put `img/fx/<key>.webp` (see `docs/battle-fx-art-spec-2026-10-16.md`). No code change. Check it in the lab page. BLK textures must have pure `#000` edges (drawn with `lighter`).

## Hooking the M1 camera (branch `toby/m1-camera`, `docs/battle-camera-api.md`)

M2 is written to the contract and does nothing camera-specific until the camera is registered. After merging M1:

```js
import { camera } from './battle-camera.js?v=...';
import { attachBattleFx, setBattleCamera, ... } from './battle-fx.js?v=m2';
setBattleCamera(camera);            // once, next to setBattleRectMapper(...)
```

then in `paint()`: `camera.attach(stage); attachBattleFx(stage);` (camera first), and at the phase starts call both
`startActionCue(cutMs)` (M1) and `startMoveFx(..., cutMs)` (M2) with the same `cutMs` (`playActionCutscene()` returns it as a boolean in M1).
With a camera registered the engine: draws into `camera.layer('fx')` (zooms with the scene), measures through the camera's un-zoomed rects,
starts each recipe at `impactAt - RECIPE_META[recipe].hit` so the hit lands on the cue's `impact`, and **does not** call its own shake/dim
(the cue owns them); recipe flashes go through `camera.flash()`.
`RECIPE_META[recipe].camera` = `{ power, scope, dim, flash }` — M1's `startActionCue` can read it instead of its damage-share heuristic.
`DEFAULT_CUE_TIMING` in battle-fx-map.js mirrors the contract numbers (attack 360 / skill 520 / foe 340 / heal 300).

Cache tokens when both land: ui.js `...night-city-v1-m1-m2`, i18n.js `l2-m1-m2`, game.js `...-m2`, combat-sprites `...-m1`.
