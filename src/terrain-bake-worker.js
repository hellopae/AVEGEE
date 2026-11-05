// Z1-V5-FX3: grades one terrain tile off the main thread.  Receives an ImageBitmap + the light field, returns the graded ground and the (1/glowDiv) glow layer
// as ImageBitmaps.  Same maths as the main-thread fallback (town-grade.js gradeStrip).
import { gradeStrip, lightColumns } from './town-grade.js';
const SH = 32;
async function bake(m) {
  const { bitmap, W, H, rect, field, COLS, ROWS, CELL, world, emit, fireOnly, glowDiv } = m;
  const [ox, oy, ww, wh] = rect.length === 8 ? [0, 0, world.w, world.h] : rect;
  const ground = new OffscreenCanvas(W, H), gc = ground.getContext('2d');
  const scratch = new OffscreenCanvas(W, SH), sc = scratch.getContext('2d', { willReadFrequently: true });
  const geo = { ox, oy, ww, wh, CELL, COLS, ROWS, field, col: lightColumns(W, ox, ww, CELL, COLS) };
  let fire = null, fc = null, gs = null, gsc = null;
  for (let y0 = 0; y0 < H; y0 += SH) {
    const h = Math.min(SH, H - y0);
    sc.drawImage(bitmap, 0, y0, W, h, 0, 0, W, h);
    const pixels = sc.getImageData(0, 0, W, h), glow = sc.createImageData(W, h);
    const any = gradeStrip(pixels.data, glow.data, W, h, y0, H, geo, emit, fireOnly);
    gc.putImageData(pixels, 0, y0);
    if (any) {
      if (!fire) { fire = new OffscreenCanvas(Math.ceil(W / glowDiv), Math.ceil(H / glowDiv)); fc = fire.getContext('2d'); fc.imageSmoothingEnabled = true; gs = new OffscreenCanvas(W, SH); gsc = gs.getContext('2d'); }
      gsc.clearRect(0, 0, W, SH); gsc.putImageData(glow, 0, 0);
      fc.drawImage(gs, 0, 0, W, h, 0, y0 / glowDiv, W / glowDiv, h / glowDiv);
    }
  }
  bitmap.close();
  const g = ground.transferToImageBitmap(), f = fire ? fire.transferToImageBitmap() : null;
  return { ground: g, fire: f };
}
if (typeof self !== 'undefined' && typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope) {
  self.onmessage = async ev => {
    const m = ev.data;
    try { const r = await bake(m); self.postMessage({ id: m.id, ok: true, ...r }, [r.ground, ...(r.fire ? [r.fire] : [])]); }
    catch (error) { self.postMessage({ id: m.id, ok: false, error: String(error) }); }
  };
}
