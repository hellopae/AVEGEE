// GPU-LOSS recovery (F4, 15 Nov 2026).  When the browser loses the GPU (the GPU process restarts, or it runs out of graphics memory) every canvas
// loses its pixels.  The game keeps hundreds of baked canvases / ImageBitmaps (graded ground chunks, resampled sprites, shadow bakes, cloud layers ...)
// and draws them for as long as they live, so after a loss they are all blank: the ground and every sprite disappear, only layers that are redrawn
// each frame (rain, wires, HUD) stay.  Owner video error.mov: the Zone 4 map "vanished halfway".
// There is no list of those caches that is safe to keep complete, so the recovery is a save + reload (the same path as the "new version" banner and the
// "restart" button: ?avegee.fresh puts the player straight back into the saved slot).  A second loss inside GUARD_MS does not reload again (no reload loop
// on a machine whose GPU keeps dying); it is only counted.
export const GPU_RELOAD_GUARD_MS = 20000;
export const GPU_RESET_KEY = 'avegee.gpuReset';
export const GPU_MODE_KEY = 'avegee.gpuRecoverMode';   // dev / test switch in sessionStorage: 'reload' = the T1 path only, 'none' = do nothing (to see what a loss does)
export const gpuLossStats = { lost: 0, restored: 0, reloads: 0, skipped: 0, rebuilds: 0, rebuildFailed: 0, verifyFailed: 0 };

/** Pure decision: reload now?  `last` = ms timestamp of the previous recovery reload (or 0). */
export function shouldReloadAfterLoss(now, last, guardMs = GPU_RELOAD_GUARD_MS) {
  return !(Number.isFinite(last) && last > 0 && now - last >= 0 && now - last < guardMs);
}

/** Watch one canvas; `recover()` runs once the context is back (the cached canvases are blank by then).  Returns a function that stops watching. */
export function watchGraphicsLoss(canvas, { recover, rebuild, verify, onLost: lostHook, onRebuilt, verifyMs = 1500, setTimer = globalThis.setTimeout, storage = globalThis.sessionStorage, now = () => Date.now(), guardMs = GPU_RELOAD_GUARD_MS } = {}) {
  if (!canvas?.addEventListener) return () => {};
  const onLost = () => { gpuLossStats.lost++; try { lostHook?.(); } catch {} };   // T3/13: the frame hold covers the transparent canvas from this moment   // no preventDefault: Chrome restores an un-cancelled 2D context by itself; a cancelled one stayed lost in the measurement
  const reload = () => {
    let last = 0; try { last = Number(storage?.getItem(GPU_RESET_KEY)) || 0; } catch {}
    const t = now();
    if (!shouldReloadAfterLoss(t, last, guardMs)) { gpuLossStats.skipped++; return false; }
    try { storage?.setItem(GPU_RESET_KEY, String(t)); } catch {}
    gpuLossStats.reloads++;
    recover();
    return true;
  };
  const onRestored = () => {
    gpuLossStats.restored++;
    let mode = null; try { mode = storage?.getItem(GPU_MODE_KEY); } catch {}
    if (mode === 'none') return;
    // T1c: rebuild every baked picture in place (no reload).  Anything that throws, or a screen that still has holes a moment later, falls back to save + reload (T1 path).
    if (rebuild && mode !== 'reload') {
      let good = false;
      try { const r = rebuild(); good = !(r && r.failed && r.failed.length); } catch { good = false; }
      if (good) {
        gpuLossStats.rebuilds++;
        try { onRebuilt?.(); } catch {}   // T3/13: the hold fades out once the ground is painted again
        if (verify) setTimer(() => { let fine = true; try { fine = verify() !== false; } catch { fine = true; } if (!fine) { gpuLossStats.verifyFailed++; reload(); } }, verifyMs);
        return;
      }
      gpuLossStats.rebuildFailed++;
    }
    reload();
  };
  canvas.addEventListener('contextlost', onLost);
  canvas.addEventListener('contextrestored', onRestored);
  return () => { canvas.removeEventListener('contextlost', onLost); canvas.removeEventListener('contextrestored', onRestored); };
}
