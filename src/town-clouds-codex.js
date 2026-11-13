// CLOUDS-MIX (13 Nov 2026): Codex's drawn sea-mist layers (img/map-zone1/v7r-clouds, docs/art-reviews/2026-11-05-z1v7-clouds) mixed with the cloud shader of the v7r ground.
//
//   ?clouds=shader   the shader clouds alone, as before this mix (the painted ground's own cloud sea, moved by the flow shader)
//   ?clouds=codex    the old comparison: Codex's layers laid OVER the shader clouds (two layers on top of each other)
//   (default) mix    Codex's layers are the base picture of the cloud sea and the shader drives their movement:
//                      1. the cloud pieces of fluid-shader.js take "ground + Codex layer A" and "ground + Codex layer B" as their paint (paintCodexClouds below),
//                         cross-fade A -> B -> A with Codex's own weight (codexCloudWeight) and slide the result along the cloud flow field, as they did the ground's own clouds;
//                      2. where Codex has clouds but the shader has no cloud piece / flow mask (west ridge mist, left edge), the same A/B cross-fade is drawn directly under the
//                         shader (drawCodexClouds, with Codex's slow sine drift) - the shader output is opaque inside its mask, so nothing is doubled;
//                      3. Codex's 8 puffs drift slowly on top (drawCodexPuffs), clipped by Codex's cloud mask;
//                      4. everywhere Codex drew no cloud, the shader clouds of the ground play exactly as before.
// Nothing here recolours or filters the drawn layers.  Recipe from clouds.json: weight of B = 0.5 - 0.5 cos(2 pi t / 24), mixed in premultiplied RGBA; layer drift = sine of period 48 s, amplitude [1.5, 0.3] world units.
import { TOWN_SIZE } from './town-layout.js?v=k1d';
import { activeTownSkin } from './zone-skin.js';

const DIR = 'img/map-zone1/v7r-clouds/';
const FULL = [9830, 6554], CHUNK = 2048, ROWS = 4, COLS = 5;

let modeCache = null;
/** 'mix' (default) | 'shader' (?clouds=shader: the original) | 'overlay' (?clouds=codex: Codex laid over the shader clouds, the 13 Nov comparison). */
export function cloudsMode() {
  if (modeCache) return modeCache;
  try { const v = new URLSearchParams(globalThis.location?.search ?? '').get('clouds'); modeCache = v === 'shader' ? 'shader' : v === 'codex' ? 'overlay' : 'mix'; } catch { modeCache = 'mix'; }
  return modeCache;
}
export function setCloudsModeForTest(m) { modeCache = ['mix', 'shader', 'overlay'].includes(m) ? m : null; }
export const codexCloudsRequested = () => cloudsMode() === 'overlay';
/** True where Codex's layers belong: zone 1 on the v7r ground (the only skin with a painted fluid layer).  Other town zones never see them. */
export const codexCloudsApply = () => { try { const s = activeTownSkin(); return !!s?.fluidFx && /\/v7r\//.test(s?.terrain?.dir || ''); } catch { return false; } };

/** Weight of variant B at `ms`: 0 at t=0, 1 at 12 s, back to 0 at 24 s. */
export const codexCloudWeight = ms => .5 - .5 * Math.cos(2 * Math.PI * (ms / 1000) / 24);
export const codexCloudDrift = ms => { const s = Math.sin(2 * Math.PI * (ms / 1000) / 48); return [1.5 * s, .3 * s]; };
/** World rect [x, y, w, h] of chunk r, c (0-based). */
export function codexCloudChunkRect(r, c) {
  const ux = TOWN_SIZE.w / FULL[0], uy = TOWN_SIZE.h / FULL[1];
  const x = c * CHUNK, y = r * CHUNK, w = Math.min(CHUNK, FULL[0] - x), h = Math.min(CHUNK, FULL[1] - y);
  return [x * ux, y * uy, w * ux, h * uy];
}
const hit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];

// ------------------------------------------------------------------------------------------------ chunk files
const imgs = new Map();
function chunkRec(v, r, c) {
  const key = `${v}${r}${c}`; let rec = imgs.get(key);
  if (!rec) {
    const el = new Image(); rec = { el, ok: false, err: false }; el.decoding = 'async';
    el.onload = () => { rec.ok = true; }; el.onerror = () => { rec.err = true; };
    el.src = `${DIR}layer-${v}/r${r + 1}-c${c + 1}.webp`; imgs.set(key, rec);
  }
  return rec;
}
const chunkImage = (v, r, c) => { const rec = chunkRec(v, r, c); return rec.ok ? rec.el : null; };

/** 'ready' | 'wait' | 'failed' for BOTH layers over the world rect (requests the files); nothing is painted. */
export function codexCloudsState(rect) {
  let wait = false;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!hit(codexCloudChunkRect(r, c), rect)) continue;
    for (const v of 'AB') { const rec = chunkRec(v, r, c); if (rec.err) return 'failed'; if (!rec.ok) wait = true; }
  }
  return wait ? 'wait' : 'ready';
}
/** Paint the chunks of layer `variant` ('A' | 'B') that touch the world rect onto `g`, whose transform maps world units to its pixels.
 *  Returns 'ready' (painted), 'wait' (a chunk is still loading: nothing painted, the files are requested) or 'failed' (a chunk file cannot be loaded). */
export function paintCodexClouds(g, variant, rect) {
  const todo = []; let wait = false;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cr = codexCloudChunkRect(r, c); if (!hit(cr, rect)) continue;
    const rec = chunkRec(variant, r, c);
    if (rec.err) return 'failed';
    if (!rec.ok) wait = true; else todo.push([rec.el, cr]);
  }
  if (wait) return 'wait';
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  for (const [el, [x, y, w, h]] of todo) g.drawImage(el, x, y, w, h);
  g.restore();
  return 'ready';
}

// ------------------------------------------------------------------------------------------------ direct layer (under the shader in mix mode, over everything in overlay mode)
// The two layers are 99.5 % transparent: clouds-bounds.json (scripts/build-cloud-mix-assets.py) gives the box of each chunk that holds any cloud, and only those
// boxes are drawn, cleared and blitted (the first mix drew and cleared whole 2048 px chunks every frame and cost ~10 fps on a desktop).
let bounds = null, boundsAsked = false;
function boundsOf() {
  if (!boundsAsked && typeof fetch === 'function') {
    boundsAsked = true;
    fetch(DIR + 'clouds-bounds.json').then(r => r.json()).then(j => { bounds = j.chunks; }).catch(() => { bounds = {}; });
  }
  return bounds;
}
/** Box [x, y, w, h] in file pixels of chunk r, c -> world rect, or null when the chunk holds no cloud. */
export function codexCloudBoxRect(r, c, b) {
  if (!b) return null;
  const [cx, cy, cw, ch] = codexCloudChunkRect(r, c), pw = Math.min(CHUNK, FULL[0] - c * CHUNK), ph = Math.min(CHUNK, FULL[1] - r * CHUNK), kx = cw / pw, ky = ch / ph;
  return [cx + b[0] * kx, cy + b[1] * ky, b[2] * kx, b[3] * ky];
}
let layer = null, last = null;
export const REUSE_MS = 100, REUSE_FRAMES = 5, PUFF_REUSE_FRAMES = 7;   // at most 5 (puffs 7) frames in a row; the two counts differ so the two compositions rarely fall on the same frame (a frozen clock - pause, reduced motion - must not freeze the layer while the camera moves)
/** Screen box [x0, y0, x1, y1] (device px, clamped to the canvas) of a world rect, or null when it is off screen. */
function screenBox(m, rect, cw, ch, pad = 2) {
  const x0 = Math.max(0, Math.floor(m.e + rect[0] * m.a) - pad), y0 = Math.max(0, Math.floor(m.f + rect[1] * m.d) - pad);
  const x1 = Math.min(cw, Math.ceil(m.e + (rect[0] + rect[2]) * m.a) + pad), y1 = Math.min(ch, Math.ceil(m.f + (rect[1] + rect[3]) * m.d) + pad);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1, y1] : null;
}
/** Call with the world transform active.  mix: BEFORE the fluid layer (the shader paints opaque over it inside its own mask); overlay: after it.  `ms` = clock in ms. */
export function drawCodexClouds(ctx, ms, { reduced = false } = {}) {
  if (cloudsMode() === 'shader' || typeof document === 'undefined' || typeof ctx.getTransform !== 'function' || !codexCloudsApply()) return;
  const bnd = boundsOf(); if (!bnd) return;
  const m = ctx.getTransform(); if (!(m.a > 0 && m.d > 0) || m.b || m.c) return;
  const cv = ctx.canvas;
  // The A/B weight moves < 2 % in 0.1 s and the sine drift less than a pixel: the mixed layer is re-composed every REUSE_MS (100 ms) at most; in between the last one is blitted again,
  // moved by the camera's whole-pixel shift (same zoom, same canvas size).  A retina display spent ~3 ms a frame on composing it every frame.
  if (last && last.cvW === cv.width && last.cvH === cv.height && Math.abs(m.a - last.a) < 1e-9 && Math.abs(m.d - last.d) < 1e-9 && ms >= last.at && ms - last.at < REUSE_MS && last.reused < REUSE_FRAMES) {
    last.reused++;
    const sx = Math.round(m.e - last.e), sy = Math.round(m.f - last.f), bx = last.box;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(layer.cv, bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1], bx[0] + sx, bx[1] + sy, bx[2] - bx[0], bx[3] - bx[1]); ctx.restore();
    return;
  }
  last = null;
  const w = reduced ? 0 : codexCloudWeight(ms), [dx, dy] = reduced ? [0, 0] : codexCloudDrift(ms);
  const view = [-m.e / m.a, -m.f / m.d, cv.width / m.a, cv.height / m.d];
  const todo = []; let box = null;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const b = bnd[`r${r + 1}-c${c + 1}`], wr = codexCloudBoxRect(r, c, b); if (!wr) continue;
    const at = [wr[0] + dx, wr[1] + dy, wr[2], wr[3]];
    // only the part of the box that is on screen is read and drawn (a source rect of the 9-argument drawImage): zoomed in that is a fraction of the 2048 px chunk
    const x0 = Math.max(at[0], view[0]), y0 = Math.max(at[1], view[1]), x1 = Math.min(at[0] + at[2], view[0] + view[2]), y1 = Math.min(at[1] + at[3], view[1] + view[3]);
    if (!(x1 > x0 && y1 > y0)) continue;
    const A = chunkImage('A', r, c), B = chunkImage('B', r, c); if (!A || !B) continue;
    const kx = b[2] / at[2], ky = b[3] / at[3];
    const src = [b[0] + (x0 - at[0]) * kx, b[1] + (y0 - at[1]) * ky, (x1 - x0) * kx, (y1 - y0) * ky], dst = [x0, y0, x1 - x0, y1 - y0];
    const sb = screenBox(m, dst, cv.width, cv.height); if (!sb) continue;
    todo.push([A, B, src, dst]); box = box ? [Math.min(box[0], sb[0]), Math.min(box[1], sb[1]), Math.max(box[2], sb[2]), Math.max(box[3], sb[3])] : sb;
  }
  if (!todo.length) return;
  if (!layer) layer = { cv: document.createElement('canvas') }; if (layer.cv.width !== cv.width || layer.cv.height !== cv.height) { layer.cv.width = cv.width; layer.cv.height = cv.height; }
  const L = layer.cv.getContext('2d'), bw = box[2] - box[0], bh = box[3] - box[1];
  // bilinear is enough (and cheap): the 'high' (bicubic) setting cost ~20 ms a frame on a retina display; strong zoom-out gets mip-maps against shimmer
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1; L.clearRect(box[0], box[1], bw, bh); L.imageSmoothingEnabled = true; L.imageSmoothingQuality = m.a < .9 ? 'medium' : 'low';
  L.setTransform(m.a, 0, 0, m.d, m.e, m.f);
  for (const [A, B, s, d] of todo) {
    if (w < .996) { L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1 - w; L.drawImage(A, s[0], s[1], s[2], s[3], d[0], d[1], d[2], d[3]); }
    if (w > .004) { L.globalCompositeOperation = w < .996 ? 'lighter' : 'source-over'; L.globalAlpha = w; L.drawImage(B, s[0], s[1], s[2], s[3], d[0], d[1], d[2], d[3]); }   // premultiplied add = a true mix of the two drawn variants
  }
  L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(layer.cv, box[0], box[1], bw, bh, box[0], box[1], bw, bh); ctx.restore();
  last = { at: ms, reused: 0, e: m.e, f: m.f, a: m.a, d: m.d, box, cvW: cv.width, cvH: cv.height };
}

// ------------------------------------------------------------------------------------------------ the 8 puffs
/** puffs of clouds.json (spriteWorld, origin of the top-left, drift in world units / s, opacity .55); the 2 numbers are only what the game needs. */
export const CODEX_PUFFS = Object.freeze([
  { id: 'puff-01', size: [100, 96.484375], origin: [2094.616480162767, 279.67043027158985], drift: [.8, .08] },
  { id: 'puff-02', size: [110, 108.28125], origin: [1890.7019328585961, 233.57949343912114], drift: [1.05, -.08] },
  { id: 'puff-03', size: [120, 113.671875], origin: [3014.1851475076296, 255.45315837656392], drift: [1.3, .08] },
  { id: 'puff-04', size: [100, 100], origin: [0, 708.5505035093073], drift: [.8, -.08] },
  { id: 'puff-05', size: [110, 110.859375], origin: [2863.3977619532043, 178.1141287763198], drift: [1.05, .08] },
  { id: 'puff-06', size: [120, 121.875], origin: [1210.205493387589, 239.04790967348185], drift: [1.3, -.08] },
  { id: 'puff-07', size: [100, 100], origin: [2356.345879959308, 168.73970094598718], drift: [.8, .08] },
  { id: 'puff-08', size: [110, 109.5703125], origin: [2197.7456765005086, 207.01861458651206], drift: [1.05, -.08] },
].map(Object.freeze));
export const PUFF_OPACITY = .55;
/** Codex gives the speed (.8 - 1.3 units / s) but a clip is bounded by its mask, so the puff goes there and back: x = origin + drift * (P / 2 pi) * sin(2 pi t / P), speed never above Codex's. */
export const PUFF_PERIOD = 160;
export function codexPuffPos(p, ms) {
  const k = PUFF_PERIOD / (2 * Math.PI), s = Math.sin(2 * Math.PI * (ms / 1000) / PUFF_PERIOD);
  return [p.origin[0] + p.drift[0] * k * s, p.origin[1] + p.drift[1] * k * s];
}
const puffEls = new Map(); let maskRec = null, puffLayer = null, puffDrawn = 0, puffLast = null;
export const codexPuffStats = () => ({ drawn: puffDrawn, maskReady: !!(maskRec && maskRec.ok) });
function puffImage(id) {
  let rec = puffEls.get(id);
  if (!rec) { const el = new Image(); rec = { el, ok: false }; el.decoding = 'async'; el.onload = () => { rec.ok = true; }; el.src = `${DIR}puffs/${id}.png`; puffEls.set(id, rec); }
  return rec.ok ? rec.el : null;
}
function puffMask() {
  if (!maskRec) {
    const el = new Image(); maskRec = { el, ok: false, rect: null }; el.decoding = 'async'; el.onload = () => { maskRec.ok = true; };
    fetch(DIR + 'mask-q.json').then(r => r.json()).then(j => { maskRec.rect = j.worldRect; el.src = DIR + j.file; }).catch(() => {});
  }
  return maskRec.ok && maskRec.rect ? maskRec : null;
}
/** Call with the world transform active, AFTER the fluid layer (the puffs float on top of the cloud sea).  mix mode only.  `ms` = fluid clock.
 *  Only the screen box of the visible puffs is cleared, clipped by the mask and blitted. */
export function drawCodexPuffs(ctx, ms, { reduced = false } = {}) {
  if (cloudsMode() !== 'mix' || typeof document === 'undefined' || typeof ctx.getTransform !== 'function' || !codexCloudsApply()) return;
  const m = ctx.getTransform(); if (!(m.a > 0 && m.d > 0) || m.b || m.c) return;
  const cv = ctx.canvas, view = [-m.e / m.a, -m.f / m.d, cv.width / m.a, cv.height / m.d];
  const t = reduced ? 0 : ms;
  // a puff moves < 1.3 units a second: composed (and masked) every 8th frame at most, blitted again moved by the camera's whole-pixel shift in between
  if (puffLast && puffLast.cvW === cv.width && puffLast.cvH === cv.height && Math.abs(m.a - puffLast.a) < 1e-9 && Math.abs(m.d - puffLast.d) < 1e-9 && t >= puffLast.at && t - puffLast.at < REUSE_MS * 2 && puffLast.reused < PUFF_REUSE_FRAMES) {
    puffLast.reused++;
    const sx = Math.round(m.e - puffLast.e), sy = Math.round(m.f - puffLast.f), bx = puffLast.box;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(puffLayer.cv, bx[0], bx[1], bx[2] - bx[0], bx[3] - bx[1], bx[0] + sx, bx[1] + sy, bx[2] - bx[0], bx[3] - bx[1]); ctx.restore();
    return;
  }
  puffLast = null;
  puffDrawn = 0;
  const vis = []; let box = null;
  for (const p of CODEX_PUFFS) {
    const [cx, cy] = codexPuffPos(p, t), r = [cx, cy, p.size[0], p.size[1]]; if (!hit(r, view)) continue;
    const sb = screenBox(m, r, cv.width, cv.height); if (!sb) continue;
    vis.push([p, r]); box = box ? [Math.min(box[0], sb[0]), Math.min(box[1], sb[1]), Math.max(box[2], sb[2]), Math.max(box[3], sb[3])] : sb;
  }
  if (!vis.length) return;
  const mk = puffMask(); if (!mk) return;
  if (!puffLayer) puffLayer = { cv: document.createElement('canvas') };
  if (puffLayer.cv.width !== cv.width || puffLayer.cv.height !== cv.height) { puffLayer.cv.width = cv.width; puffLayer.cv.height = cv.height; }
  const L = puffLayer.cv.getContext('2d'), bw = box[2] - box[0], bh = box[3] - box[1];
  L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1; L.clearRect(box[0], box[1], bw, bh);
  L.save(); L.beginPath(); L.rect(box[0], box[1], bw, bh); L.clip();   // every operation below, the mask's destination-in included, stays inside the box
  L.imageSmoothingEnabled = true; L.setTransform(m.a, 0, 0, m.d, m.e, m.f);
  let any = false;
  for (const [p, r] of vis) { const el = puffImage(p.id); if (!el) continue; L.globalAlpha = PUFF_OPACITY; L.drawImage(el, r[0], r[1], r[2], r[3]); any = true; puffDrawn++; }
  if (any) {
    // the mask is cut to the part of its rect inside the box (world), so only that part of the small mask is read
    const [mx, my, mw, mh] = mk.rect, kx = mk.el.width / mw, ky = mk.el.height / mh;
    const wx0 = Math.max(mx, (box[0] - m.e) / m.a), wy0 = Math.max(my, (box[1] - m.f) / m.d), wx1 = Math.min(mx + mw, (box[2] - m.e) / m.a), wy1 = Math.min(my + mh, (box[3] - m.f) / m.d);
    L.globalAlpha = 1; L.globalCompositeOperation = 'destination-in';
    if (wx1 > wx0 && wy1 > wy0) L.drawImage(mk.el, (wx0 - mx) * kx, (wy0 - my) * ky, (wx1 - wx0) * kx, (wy1 - wy0) * ky, wx0, wy0, wx1 - wx0, wy1 - wy0);
    else { L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(box[0], box[1], bw, bh); any = false; }   // the box is entirely outside the mask rect: nothing to show
  }
  L.restore();
  if (!any) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(puffLayer.cv, box[0], box[1], bw, bh, box[0], box[1], bw, bh); ctx.restore();
  puffLast = { at: t, reused: 0, e: m.e, f: m.f, a: m.a, d: m.d, box, cvW: cv.width, cvH: cv.height };
}
