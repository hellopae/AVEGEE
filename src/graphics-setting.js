// GFX-1110: the "Graphics" setting - High Resolution (everything as drawn) or Performance (cheaper map, for weak / hot GPUs).
//
// EVERYTHING the setting changes lives in PROFILES below.  If WebGL makes the map smooth enough this file, the import in scene.js / town-fluid-fx.js / ui.js,
// the settings block in ui.js (search "GFX-1110") and the i18n keys 'settings.graphics*' can be deleted together; nothing else depends on it.
//   mapDprCap       - highest backing-store density of the map canvas (device px per CSS px)
//   fluidIntervalMs - painted lava / river / cloud layers are re-composed at most this often; in between the last layer is re-blitted at the camera's new
//                     position (0 = every frame, as before)
//   frameIntervalMs - the main map loop draws at most this often (0 = every display frame; ~16.7 = 60 fps cap even on a 120 Hz display)
// "high" must stay exactly what the game did before this setting existed.
export const GRAPHICS_PROFILES = Object.freeze({
  high:        Object.freeze({ mapDprCap: 2,   fluidIntervalMs: 0,  frameIntervalMs: 0 }),
  performance: Object.freeze({ mapDprCap: 1.5, fluidIntervalMs: 33, frameIntervalMs: 1000 / 60 }),
});
export const GRAPHICS_MODES = Object.freeze(Object.keys(GRAPHICS_PROFILES));
export const GRAPHICS_KEY = 'avegee.graphics';
export const DEFAULT_GRAPHICS_MODE = 'high';

const store = () => { try { return globalThis.window?.localStorage ?? globalThis.localStorage ?? null; } catch { return null; } };
let mode = DEFAULT_GRAPHICS_MODE;
try { const saved = store()?.getItem(GRAPHICS_KEY); if (GRAPHICS_PROFILES[saved]) mode = saved; } catch { /* no storage: default */ }
const listeners = new Set();

export const getGraphicsMode = () => mode;
export const graphicsProfile = () => GRAPHICS_PROFILES[mode];
export function setGraphicsMode(next) {
  if (!GRAPHICS_PROFILES[next]) return false;
  if (next === mode) return true;
  mode = next;
  nextFrameAt = 0;
  try { store()?.setItem(GRAPHICS_KEY, mode); } catch { /* private mode: lives until reload */ }
  for (const fn of listeners) fn(mode);
  return true;
}
export const onGraphicsChange = fn => { listeners.add(fn); return () => listeners.delete(fn); };

/** ?mapdpr=1..2 in the page URL beats the setting (kept for measuring). Read once. */
let queryDpr;
function queryMapDpr() {
  if (queryDpr !== undefined) return queryDpr;
  queryDpr = 0;
  try { const q = Number(new URLSearchParams(globalThis.location?.search || '').get('mapdpr')); if (q >= 1 && q <= 2) queryDpr = q; } catch { /* no location (tests) */ }
  return queryDpr;
}
export const mapDprCap = () => queryMapDpr() || graphicsProfile().mapDprCap;

/** Frame limiter for the main loop: true when this display frame should be drawn.  Skipped frames keep their time (the caller's `last` is not advanced),
 *  so movement stays real-time.  A 1 ms slack stops a 60 Hz display with jittery timestamps from losing every other frame. */
let nextFrameAt = 0;
export function frameDue(now) {
  const iv = graphicsProfile().frameIntervalMs;
  if (!iv) return true;
  if (now < nextFrameAt - 1) return false;
  nextFrameAt = now - nextFrameAt > iv ? now + iv : nextFrameAt + iv;
  return true;
}
