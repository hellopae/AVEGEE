# Battle camera API (M1) — contract for M2 (battle FX)

Owner: Toby M1 · branch `toby/m1-camera` · file `src/battle-camera.js` (cache token `-m1`)
Status of this file: **contract**. Names, argument shapes and timings below are what M1 implements and M2 may call.
If something here must change, M1 updates this file in the same commit.

## 0. Mental model (read this first)

- The combat arena (`.arena.combat-arena`, the `stage`) keeps its size and never moves.
  Inside it M1 adds **`<div class="cam-world">`** — the *scene* (background image, Yama/crew sprites, foe sprites). Only `.cam-world` is scaled/panned.
  HUD, command menu, timeline, boss HUD, portraits, pause/settings buttons are **siblings of the world** and never zoom.
- Inside the world there are two layers M2 may use:
  - `camera.layer('fx')` → `<div class="cam-fx">` **inside the world, above the sprites** (scales/pans/shakes with the scene). Put spell art, slashes, fireballs, ice crystals here so they stick to the characters.
  - `camera.screenLayer()` → `<div class="cam-screen">` **in the stage, above the world but below the HUD**, not zoomed. Put full-screen flashes, vignettes, speed lines, damage-number overlays that must stay readable here.
- `ui.js` calls `paint()` which replaces `dlg.innerHTML` many times per fight. The camera is a **singleton with its own state** (current zoom/pan/dim) and re-attaches itself after every paint. Layers returned by `layer()` / `screenLayer()` are kept in memory and re-appended into the new stage by `attach()`, so a `<canvas>` you draw on survives repaints. **CSS animations restart when a node is re-appended** — use canvas/rAF, or the negative-delay trick from `heal-fx.js` (`--fx-el:-<elapsed>ms`) for CSS-animated markup.
- All coordinates M2 passes in or reads out are **stage-local CSS px at zoom 1 (identity camera)** — i.e. the same space the K2 formation / `fitBattleSprites` use. Use `camera.pointOf(target)` to get where a character *is*, never `getBoundingClientRect()` on a sprite (it includes the current zoom). If you must read a DOM rect, use `camera.rectOf(el)` (same thing, un-zoomed).
- Honours `prefers-reduced-motion` and the settings toggle "Camera effects" (`localStorage['avegee.cameraFx']` = `'0'` off, default on). When off/reduced: no zoom, no pan, no shake, no flash; `dim()` still works (instant, no tween); **all promises still resolve and all events still fire on schedule** — M2 must not depend on the camera actually moving.

```js
import { camera, CAMERA_TIMING } from './battle-camera.js?v=…-m1';
```

## 1. Targets

Wherever a `target` is accepted:

| form | meaning |
|---|---|
| `'you'` | Yama (`[data-crew-pick="you"]`) |
| `'crew:<key>'` / `'guard'` | crew member / Guard by the game's own `crewBattleKey` (same strings as `data-crew-pick`) — `'crew:'` prefix optional |
| `'foe:<id>'` | enemy with `data-foe-id=<id>`; `'foe'` = the first living foe |
| `'foes'` | union box of all living foes (center = its middle) |
| `'allies'` | union box of Yama + crew |
| `'all'` / `'wide'` | whole stage (zoom 1, centered) |
| `HTMLElement` | center of its visible `<img>` box (or its own box) |
| `{x, y}` | stage-local px, zoom-1 space |
| `{fx, fy}` | fractions 0..1 of stage width/height |
| `[t1, t2, …]` | array of any of the above → center of their union box |

Unknown / missing target → the call is a no-op that still resolves (never throws).

## 2. Methods

All time args are **ms at speed ×1**; the real duration is `ms / camera.timeScale`.

```ts
camera.focus(target, opts?: { zoom?: number; ms?: number; ease?: 'out'|'inOut'|'in'|'linear';
                              offset?: {x:number,y:number}; keepVisible?: Target }): Promise<void>
```
Move the camera so `target` is at the screen center (clamped so the scene edge never shows) at `zoom` (1 = wide, default 1.2, clamped 1..1.6). Omit `zoom` to **pan only** (keep current zoom). `ms` default 260, `ease` default `'out'`. Starts from the *current* state (cancels a running move — no jump). `keepVisible` = targets that must stay on screen (zoom is reduced / center nudged until they fit; used by the command-select push-in so every enemy stays clickable). Resolves when the move has ended.

```ts
camera.reset(opts?: { ms?: number; ease?: string }): Promise<void>   // back to wide (zoom 1), dim off, shake stopped
camera.shake(power?: number, opts?: { ms?: number }): void            // power 1 ≈ 2px/150ms, 2 ≈ 3px/200ms, 3 ≈ 4px/250ms (clamped 0.5..3). Replaces a weaker running shake.
camera.hitStop(ms?: number): void                                     // default 75 (clamped 40..120). Freezes the camera clock and CSS animations inside the world. Game timers are NOT paused (no added wait).
camera.dim(on: boolean, opts?: { alpha?: number; ms?: number; lit?: Target }): void
                                                                      // dark overlay inside the world, alpha default .42 (clamped .35–.5), ms default 180.
                                                                      // `lit` = actors kept ABOVE the overlay (user + target(s)). dim(false) clears it.
camera.flash(opts?: { color?: string; alpha?: number; ms?: number }): void   // full-screen flash in the screen layer. default '#fff', .85, 160ms. Off in reduced-motion.
camera.punch(amount?: number, ms?: number): void                      // tiny zoom kick (+amount, default .04) that eases back — for combo hits / BREAK text
```

Reading state / geometry:

```ts
camera.pointOf(target): {x:number, y:number} | null    // stage-local px, zoom-1 space
camera.rectOf(el: Element, mode?: 'layout'|'settled'): {left,top,right,bottom,width,height}
                                                       // like getBoundingClientRect but as if the camera were at rest ('layout', default),
                                                       // or as the element will look once the running move ends ('settled' — used to place menus)
camera.size(): {w:number, h:number}                    // stage size in px
camera.state(): { zoom:number, cx:number, cy:number, dim:number, moving:boolean, enabled:boolean, reduced:boolean, pending:number, running:boolean }
camera.currentCue: string                              // 'select:"<key>"' | 'attack' | 'skill' | 'foe-attack' | 'heal' | 'idle' | 'interrogate-…'
camera.stageEl(): Element | null                        // the stage the camera is attached to
camera.layer(name: 'fx' | string): HTMLElement          // world-space layer (above sprites). Created on demand, kept across repaints.
camera.screenLayer(name?: string): HTMLElement          // stage-space layer (not zoomed, under HUD).
```

Settings / tuning (single place):

```ts
camera.timeScale            // number, default 1. ONE speed knob for every camera duration & the cue timeline. 1.25 = 25% faster.
camera.setEnabled(on: boolean)   // settings toggle; persists to localStorage
camera.enabled              // boolean
```

## 3. Events (sync points for FX)

```ts
const off = camera.on(name, fn: (info) => void): () => void
camera.off(name, fn)
```

| event | when | `info` |
|---|---|---|
| `windup` | camera has arrived on the user (skill/attack) | `{ user, targets, action }` |
| `impact` | the hit lands — **spawn the hit FX / damage numbers now** | `{ user, targets, action, power, crit, scope }` |
| `recover` | camera starts going back to the wide shot | same |
| `settled` | camera idle at rest, input unlocked | `{}` |

Events fire on schedule even when the camera is disabled/reduced (so FX timing is identical with or without camera moves).

## 4. Cue = the default choreography (what `ui.js` calls; M2 can call it too)

```ts
camera.cue(kind: 'select'|'attack'|'skill'|'foe-attack'|'heal'|'interrogate-ask'|'interrogate-reveal'|'idle',
           ctx: { user?: Target; targets?: Target;        // who acts / who is hit ('foes' for a team move)
                  action?: string;                        // game action key, only passed through to events
                  power?: 1|2|3;                          // hit weight: 1 light, 2 heavy, 3 crit/finisher
                  crit?: boolean; scope?: 'single'|'all'; // 'all' = wide pull-back instead of a pan to one target
                  cutMs?: number;                         // length of a full-screen action cutscene covering the stage (0 if none)
                  dim?: boolean;                          // darken the background (default: true for 'skill')
                  flash?: boolean }): { done: Promise<void>, cancel(): void, impactAt: number }
```

Timeline (ms from `cue()` call, speed ×1; `CAMERA_TIMING` exports these numbers):

| kind | 0 → | windup | impactAt | recover |
|---|---|---|---|---|
| `select` | ease to the active ally, zoom 1.10, all foes kept visible (240ms) | – | – | – (stays until next cue) |
| `attack` | push to user zoom 1.16 (200ms) | 220 | 360 (pan to target 160ms) | 760 |
| `skill` | dim on, push to user zoom 1.26 (260ms) | 300 | `cutMs>0 ? max(windup+120, cutMs-60) : 520` (the hit lands as the full-screen cutscene fades out); starts the pan to the target 200ms earlier (or a wide pull-back if `scope:'all'`) | impactAt + 560 |
| `foe-attack` | push to the foe zoom 1.14 | 200 | 340 (pan to the hit ally) | 740 |
| `heal` | push to the healed ally 1.18, green-friendly (no shake) | 160 | 300 | 700 |
| `interrogate-ask` | zoom to the suspect 1.18 | – | – | stays |
| `interrogate-reveal` | zoom to the suspect 1.32 + flash | – | 200 | stays |

At `impact`: `shake(power)` (power≥2 also `hitStop(power>=3?90:70)`), `flash()` if `ctx.flash` or power 3. Total added game time = **0** (cue runs inside the existing `phase` timers; the only change to game flow is `ACTION_CUT` wait is not extended). Recover always finishes ≤ 280ms after `recover`.

`cue()` **replaces** any running cue (cancels its remaining camera moves). **A replaced cue still owes its sync events:** every `windup` / `impact` / `recover` that had not fired yet is emitted immediately, once, in order — so FX listening to `impact` never hang when the fight moves on early (e.g. no counter-attack → the next turn's `select` cue arrives ~100ms after the impact). `camera.cue('idle')` = `reset()` as a cue.

A cue's clock starts at its first rendered frame (a long paint right before it cannot swallow the lead-in), and runs on the camera's virtual clock (a hit-stop pushes later steps back).

### Lower level: your own timeline

```ts
camera.play(steps: Array<{ at: number;                  // ms from now (× timeScale)
                           focus?: Target | { target: Target; zoom?: number; ms?: number; ease?: string };
                           shake?: number; hitStop?: number; dim?: boolean | { alpha?: number; lit?: Target };
                           flash?: boolean | object; punch?: number;
                           emit?: string;               // fires camera.on(<that name>)
                           reset?: boolean }>): { done: Promise<void>, cancel(): void }
```
Hit-stop pauses the timeline clock, so steps after a hit-stop slide by that amount.

## 5. How M2 should hook in (recommended)

1. Each FX recipe declares metadata only: `{ camera: { power: 1|2|3, scope: 'single'|'all', dim: true|false, flash: true|false } }`. `ui.js` passes it into `camera.cue('skill', { …ctx })`. M2 does **not** call `focus`/`shake` itself for the standard flow — otherwise two choreographies fight.
2. Draw the actual effect on `camera.on('impact', …)`: get the position with `camera.pointOf(info.targets)` and draw into `camera.layer('fx')` (follows the scene) or `camera.screenLayer()` (screen-sized: flash, speed lines, big numbers).
3. For a bespoke show (e.g. Grand-Trinity style multi-hit), build your own with `camera.play([...])` and `camera.punch()`; it replaces the running cue.
4. Never write `transform` on `.cam-world`, `.cam-fx`, `.cam-screen`, `.cam-dim` or on `.arena` — camera owns them. Don't use `filter`/`blur` that animates per frame (project rule); use opacity.
5. z-order inside the world: background (0) < sprites (1..30, formation depth) < dim overlay (z 31) < **lit actors (z 40, set inline `!important` by `dim(true,{lit})` and restored by `dim(false)`; `fitBattleSprites` keeps 40 for `.cam-lit`)** < `cam-fx` (z 50) < click shield (z 99). The dim overlay therefore covers the background and the non-lit sprites only.

## 5b. Where `ui.js` calls the cues (M1 — read before adding a second caller)

| moment | cue |
|---|---|
| after every battle `paint()`: our turn, menu open | `select` (user = active ally, `keepVisible:['foes', user]`), only if the target changed |
| after every battle `paint()`: enemy's turn / prep / battle over | `idle` |
| `executeCommand` → phase `'you'` | normal attack/strike → `attack`; item/power that heals → `heal` (targets = receiver); rage → `skill` on self; everything else → `skill` (`scope:'all'` when `b.dmg.foeHits` has more than one entry) |
| phase `'foe'` (counter-attack or enemy turn) | `foe-attack` (user = `foe:<id>`, targets = who was hit) |
| interrogation: line pressed | `interrogate-ask` (`interrogate-reveal` when the answer exposed a truth/confession) |
| interrogation: power used (roar / mirror / hypnosis) | `interrogate-reveal` |
| interrogation: any court menu panel opened | `idle` |

`power` (1..3) is derived from the hit's share of the target's max morale (≥ 15 % = 2, ≥ 30 % = 3; skills are at least 2) because the game rules store no crit flag. The camera never reads or changes game values.

Interrogation scene: the world is the whole `.trial-comment8` (behind the right panels); targets are `'you'` and `'suspect'` (`[data-cam]`). The command menu and cards stay above the world.

## 6. Interaction / input guarantees

- Browser hit-testing already honours transforms, so clicking foes/crew works at any zoom. While the camera is *moving* (`state().moving`) a transparent shield (`.cam-world.cam-busy::after`) sits over the scene so scene clicks are ignored; HUD buttons, the command menu and the portraits are not affected.
- The command-select zoom keeps every living foe fully visible, so target picking never needs a pan.
- `fitBattleSprites`, `placeMenu`, `place`, `placeFin` measure through `camera.rectOf`, so the K2/K5/L2 layout is identical at any zoom.

## 7. Files

- `src/battle-camera.js` — controller + pure planners (`planCamera`, `clampCenter`, `ease`) — exports `camera`, `CAMERA_TIMING`, planners for tests.
- `src/battle-camera.css` — `.cam-world`, `.cam-dim`, `.cam-fx`, `.cam-screen`, `.cam-lit`.
- `tests/battle-camera.test.mjs` — pure-math + fake-DOM controller tests (transform maths, reduced-motion, settings toggle, speed knob, impact-once guarantee, wiring).
- `src/battle-scale.js` — `setBattleRectMapper()` lets `fitBattleSprites` / `battleSpriteRect(img, mode)` measure through `camera.rectOf` (ui.js registers it once).
- Debug handle: `window.__camera` (like `window.G`).

## 8. Known limits (so M2 does not trip on them)

- Full-screen **action cutscenes** (`.action-cutscene`, 1.3 s) cover the whole dialog, camera included. For skills with a cutscene the lead-in (push + dim) is hidden under it and the impact is timed to land as it fades. M2 FX that must be seen before the cutscene ends belong in the cutscene itself.
- The hero's own sword slash (`yama-sword.js`) and the combat sprite canvases live in the world and zoom with it (bitmap scaling, not re-rendered).
- `hitStop` pauses CSS animations inside the world and the camera clock only. Canvas/rAF animations and game timers keep running (by design: it must add no wait).
- Reduced-motion / camera-off: the scene stays on the wide shot; `dim()` still applies instantly; `flash`, `shake`, `punch`, `hitStop` are no-ops. M2 should treat its own flashes the same way (`camera.state().reduced`).
