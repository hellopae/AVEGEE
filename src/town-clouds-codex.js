// CLOUDS-COMPARE (13 Nov 2026): Codex's drawn sea-mist layers (img/map-zone1/v7r-clouds, docs/art-reviews/2026-11-05-z1v7-clouds) played over the v7r ground.
// Only with ?clouds=codex - the default game is untouched, so the owner can compare it with the shader clouds in the same place.
// Recipe from clouds.json: two drawn variants A / B, weight of B = 0.5 - 0.5 cos(2 pi t / 24), mixed in premultiplied RGBA (A at (1-w), B added at w), then source-over;
// the layer drifts by a sine of period 48 s, amplitude [1.5, 0.3] world units.  Nothing is recoloured or filtered; the 8 drifting puffs and the fixed re-clip mask are not played (drift is < 2 units).
import { TOWN_SIZE } from './town-layout.js?v=k1d';

const DIR = 'img/map-zone1/v7r-clouds/';
const FULL = [9830, 6554], CHUNK = 2048, ROWS = 4, COLS = 5;
export const codexCloudsRequested = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('clouds') === 'codex'; } catch { return false; } };
/** Weight of variant B at `ms`: 0 at t=0, 1 at 12 s, back to 0 at 24 s. */
export const codexCloudWeight = ms => .5 - .5 * Math.cos(2 * Math.PI * (ms / 1000) / 24);
export const codexCloudDrift = ms => { const s = Math.sin(2 * Math.PI * (ms / 1000) / 48); return [1.5 * s, .3 * s]; };
/** World rect [x, y, w, h] of chunk r, c (0-based). */
export function codexCloudChunkRect(r, c) {
  const ux = TOWN_SIZE.w / FULL[0], uy = TOWN_SIZE.h / FULL[1];
  const x = c * CHUNK, y = r * CHUNK, w = Math.min(CHUNK, FULL[0] - x), h = Math.min(CHUNK, FULL[1] - y);
  return [x * ux, y * uy, w * ux, h * uy];
}
const imgs = new Map();
function chunkImage(v, r, c) {
  const key = `${v}${r}${c}`; let rec = imgs.get(key);
  if (!rec) { const el = new Image(); rec = { el, ok: false }; el.decoding = 'async'; el.onload = () => { rec.ok = true; }; el.src = `${DIR}layer-${v}/r${r + 1}-c${c + 1}.webp`; imgs.set(key, rec); }
  return rec.ok ? rec.el : null;
}
let layer = null;
/** Call with the world transform active, after the ground / fluids and before the props and characters.  `time` = scene ms. */
export function drawCodexClouds(ctx, time, { reduced = false } = {}) {
  if (!codexCloudsRequested() || typeof document === 'undefined' || typeof ctx.getTransform !== 'function') return;
  const m = ctx.getTransform(); if (!(m.a > 0 && m.d > 0) || m.b || m.c) return;
  const cv = ctx.canvas, vx = -m.e / m.a, vy = -m.f / m.d, vw = cv.width / m.a, vh = cv.height / m.d;
  const w = reduced ? 0 : codexCloudWeight(time), [dx, dy] = reduced ? [0, 0] : codexCloudDrift(time);
  if (!layer) layer = { cv: document.createElement('canvas') }; if (layer.cv.width !== cv.width || layer.cv.height !== cv.height) { layer.cv.width = cv.width; layer.cv.height = cv.height; }
  const L = layer.cv.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, cv.width, cv.height); L.imageSmoothingEnabled = true; L.imageSmoothingQuality = 'high';
  let any = false;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const [x, y, cw, ch] = codexCloudChunkRect(r, c);
    if (x + dx + cw < vx || x + dx > vx + vw || y + dy + ch < vy || y + dy > vy + vh) continue;
    const A = chunkImage('A', r, c), B = chunkImage('B', r, c); if (!A || !B) continue;
    L.setTransform(m.a, 0, 0, m.d, m.e, m.f);
    L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1 - w; L.drawImage(A, x + dx, y + dy, cw, ch);
    L.globalCompositeOperation = 'lighter'; L.globalAlpha = w; L.drawImage(B, x + dx, y + dy, cw, ch);   // premultiplied add = a true mix of the two drawn variants
    any = true;
  }
  if (!any) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(layer.cv, 0, 0); ctx.restore();
}
