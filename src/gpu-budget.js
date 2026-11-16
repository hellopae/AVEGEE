// GPU-BUDGET (T1b, 16 Nov 2026).  Owner: "the graphics card resets by itself" (screen flashes grey, the map comes back with the ground and the sprites gone).
// Measured with scripts/gpu-memory-probe.py (Chromium, 1536x864 @2x = a Retina laptop window): everything a zone bakes for the GPU - the zone's own WebGL context (fluid shader: drawing buffer + ground
// and flow textures), the full-map ground canvas of scene.js ... - was kept for ever once the zone had been visited, so visiting all four zones added ~300-400 MB of graphics memory on top of
// a ~1 GB constant (decoded pictures, the camera's tile cache, cover fx).  A MacBook Pro with the Intel UHD 630 (1.5 GB, shared) is at its ceiling there.
// A module that bakes per-zone GPU data registers a release function here; when the player has stayed in a zone for a while everything of the OTHER zones is released
// (it is rebuilt by the same code the first visit used when the player goes back).  `releaseGpuCaches(null)` drops everything (after a GPU loss).
const caches = new Map();
/** release(keepZone, now) frees what it can of the zones that are not `keepZone` (null = everything) and returns a rough count of what it freed (MB, 0 = unknown). */
export function registerGpuCache(name, release) { caches.set(name, release); }
export function releaseGpuCaches(keepZone, now = (typeof performance !== 'undefined' ? performance.now() : 0)) {
  let freed = 0; const done = [];
  for (const [name, release] of caches) { try { const n = release(keepZone, now) || 0; freed += n; done.push(name); } catch { /* one cache failing must not stop the others */ } }
  gpuBudgetStats.releases++; gpuBudgetStats.lastFreedMB = freed; gpuBudgetStats.lastNames = done;
  return freed;
}
export const gpuBudgetStats = { releases: 0, lastFreedMB: 0, lastNames: [] };
export const ZONE_STAY_MS = 12000;
let zone = null, since = 0, released = false;
/** Call once per frame: after ZONE_STAY_MS in one zone the caches of the other zones are released (once per stay). */
export function gpuBudgetTick(now, currentZone) {
  if (currentZone !== zone) { zone = currentZone; since = now; released = false; return false; }
  if (released || now - since < ZONE_STAY_MS) return false;
  released = true; releaseGpuCaches(currentZone, now); return true;
}
