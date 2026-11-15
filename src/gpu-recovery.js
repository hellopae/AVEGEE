// GPU-LOSS recovery (F4, 15 Nov 2026).  When the browser loses the GPU (the GPU process restarts, or it runs out of graphics memory) every canvas
// loses its pixels.  The game keeps hundreds of baked canvases / ImageBitmaps (graded ground chunks, resampled sprites, shadow bakes, cloud layers ...)
// and draws them for as long as they live, so after a loss they are all blank: the ground and every sprite disappear, only layers that are redrawn
// each frame (rain, wires, HUD) stay.  Owner video error.mov: the Zone 4 map "vanished halfway".
// There is no list of those caches that is safe to keep complete, so the recovery is a save + reload (the same path as the "new version" banner and the
// "restart" button: ?avegee.fresh puts the player straight back into the saved slot).  A second loss inside GUARD_MS does not reload again (no reload loop
// on a machine whose GPU keeps dying); it is only counted.
export const GPU_RELOAD_GUARD_MS = 20000;
export const GPU_RESET_KEY = 'avegee.gpuReset';
export const gpuLossStats = { lost: 0, restored: 0, reloads: 0, skipped: 0 };

/** Pure decision: reload now?  `last` = ms timestamp of the previous recovery reload (or 0). */
export function shouldReloadAfterLoss(now, last, guardMs = GPU_RELOAD_GUARD_MS) {
  return !(Number.isFinite(last) && last > 0 && now - last >= 0 && now - last < guardMs);
}

/** Watch one canvas; `recover()` runs once the context is back (the cached canvases are blank by then).  Returns a function that stops watching. */
export function watchGraphicsLoss(canvas, { recover, storage = globalThis.sessionStorage, now = () => Date.now(), guardMs = GPU_RELOAD_GUARD_MS } = {}) {
  if (!canvas?.addEventListener) return () => {};
  const onLost = () => { gpuLossStats.lost++; };   // no preventDefault: Chrome restores an un-cancelled 2D context by itself; a cancelled one stayed lost in the measurement
  const onRestored = () => {
    gpuLossStats.restored++;
    let last = 0; try { last = Number(storage?.getItem(GPU_RESET_KEY)) || 0; } catch {}
    const t = now();
    if (!shouldReloadAfterLoss(t, last, guardMs)) { gpuLossStats.skipped++; return; }
    try { storage?.setItem(GPU_RESET_KEY, String(t)); } catch {}
    gpuLossStats.reloads++;
    recover();
  };
  canvas.addEventListener('contextlost', onLost);
  canvas.addEventListener('contextrestored', onRestored);
  return () => { canvas.removeEventListener('contextlost', onLost); canvas.removeEventListener('contextrestored', onRestored); };
}
