// Z1-V5-FX: the painted lava / waterfall / river / ice / cloud-sea FRAMES (img/map-zone1/v5-fx, drawn by Codex) played over the v5 ground.
//
// Code only places, clips, blends and plays the drawn frames; it never recolours or filters them.
//  * Layout = fx-layout.json, in the 4915x3277 master space of v5 (== the 3840x2560 world). It is world based, so swapping the ground for the
//    2x v7 set (zone-skin.js terrain) changes nothing here.
//  * Each piece is clipped by its own coverage mask (alpha) and blended over the ground with the blend / opacity of the layout.
//  * Frames are cross-faded in time: frame N -> N+1 (and 8 -> 1) with premultiplied 'lighter' adds weighted (1-m, m), a true linear mix of two
//    DRAWN frames, so the seam between two drawn batches never jumps.
//  * Only pieces that touch the camera are fetched, decoded and drawn. Tiles are pre-scaled once (3 detail levels); every frame composes just the
//    visible part of a piece into a per-piece layer canvas at <= screen resolution, then blits it once. Nothing is read back.
//  * The clock stops with pause / hidden tab; reduced motion or the "weather" setting off draws nothing (the painted ground still holds the water).
//  * While this layer owns the fluids, the old particle flow (town-flow.js) and the old cloud banks (town-night-effects.js) step aside.
import { weatherEnabled } from './map-ambient.js?v=mapfx-k1d';
import { TOWN_SIZE } from './town-layout.js?v=k1d';
import { activeTownSkin } from './zone-skin.js';
import { graphicsProfile } from './graphics-setting.js';   // GFX-1110
import { fluidShaderRequested, ensureFluidShader, fluidShaderActive, fluidShaderPending, drawFluidShader } from './fluid-shader.js';   // FLUID-SHADER (default; ?fluid=frames = the drawn frames)

export const FLUID_TILE_LEVELS = Object.freeze([2.56, 1.28, .64]);   // pre-scaled tile density, px per world unit
export const FLUID_MAX_SCALE = 2.56;                                  // the composing layer never exceeds this many px per world unit
const LOAD_PAD = 520;            // world units around the camera in which pieces start loading
const MAX_LOADING = 3;
const MIP_LEVELS = 4;
const RETRY_MS = 8000;           // a sheet / mask that failed to load is asked for again after this long
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const mod = (n, d) => ((n % d) + d) % d;

// ------------------------------------------------------------------------------------------------ pure helpers (unit tested)
/** Which two drawn frames to mix at `ms`, and how much of the second: `{i, j, mix}`. Linear in time, wraps n-1 -> 0 without a step. */
export function fluidFrame(frames, fps, ms) {
  if (!(frames > 1)) return { i: 0, j: 0, mix: 0 };
  const phase = Math.max(0, ms) / 1000 * fps, base = Math.floor(phase);
  return { i: base % frames, j: (base + 1) % frames, mix: phase - base };
}
/** World rectangle [x,y,w,h] of a piece (its mask rectangle) for a layout with `masterSize` / `worldSize`. */
export function fluidPieceRect(piece, layout) {
  const ux = layout.worldSize[0] / layout.masterSize[0], uy = layout.worldSize[1] / layout.masterSize[1], [x, y, w, h] = piece.maskRectPx;
  return [x * ux, y * uy, w * ux, h * uy];
}
/** Centre of a drifting puff at `sec`: moves linearly and wraps inside the region rectangle (the draw adds +-1 period copies). */
export function fluidPuffCenter(piece, sec) {
  const [rx, ry, rw, rh] = piece.rectWorld;
  return [rx + mod(piece.driftOriginWorld[0] - rx + piece.driftWorld[0] * sec, rw), ry + mod(piece.driftOriginWorld[1] - ry + piece.driftWorld[1] * sec, rh)];
}
/** Smallest pre-scaled density that is not coarser than `scale` device px per world unit (the sharpest level when zoomed in past it). */
export function fluidTileLevel(scale) {
  let pick = 0;
  for (let k = 0; k < FLUID_TILE_LEVELS.length; k++) if (FLUID_TILE_LEVELS[k] >= scale * .85) pick = k;
  return pick;
}
/** Largest mip whose frame is still at least as big as the destination (never magnifies a mip, never shimmers a big downscale). */
export function fluidMipFor(sourcePx, destPx) {
  let k = 0;
  while (k < MIP_LEVELS - 1 && sourcePx / 2 ** (k + 1) >= destPx * .92) k++;
  return k;
}
/** FX2 placed sprites. spot = [x, y, w, h, rot, phase, period, dx, dy]; returns the state of one sprite at `sec`, or null while it rests.
 *  swell = a wave crest that rises, drifts (dx,dy) toward the shore and fades, every period, each spot on its own phase;
 *  once  = plays the drawn frames once per period during the first `win` of it, then rests; rise = loops the drawn frames while drifting (dx,dy) and fading in/out. */
export function fluidSpotState(piece, spot, sec) {
  const period = spot[6] || 4, f = mod(sec / period + spot[5], 1), n = piece.frames, fps = piece.fps || 8;
  if (piece.mode === 'once') {
    const win = piece.win || .5;
    if (f >= win) return null;
    const g = f / win, pos = Math.min(n - 1, g * (n - 1)), i = Math.floor(pos), j = Math.min(n - 1, i + 1);
    const alpha = piece.group === 'sparkle' ? Math.sin(Math.PI * g) : Math.min(1, g * 6, (1 - g) * 6);   // glints swell and fade; a bubble only needs soft ends
    return { alpha, i, j, mix: pos - i, ox: 0, oy: 0 };
  }
  const fr = fluidFrame(n, fps, (sec + spot[5] * period) * 1000);
  if (piece.mode === 'rise') return { alpha: Math.sin(Math.PI * f) ** 1.2, ...fr, ox: spot[7] * f, oy: spot[8] * f };
  return { alpha: Math.sin(Math.PI * f) ** 1.5, ...fr, ox: spot[7] * (f - .5), oy: spot[8] * (f - .5) };   // swell
}
/** FLUID-SHADER: the drawn frames the shader replaces (lava / ice / river surfaces and every fall).  Spots (bubbles, steam, embers, sparkle, foam) and clouds are not among them. */
export const fluidShaderReplaces = p => (p.kind === 'tile' && (p.group === 'lava' || p.group === 'ice' || p.group === 'river')) || p.kind === 'rect';
/** Per piece: same-mask puffs are drawn together in one layer so the 4 drifting clouds cost one composite. */
export function fluidDrawPlan(layout) {
  const plan = [];
  for (const p of layout.pieces) {
    if (p.off) continue;      // FX4: a piece switched off in fx-layout.json (no real painted fluid under it) is never loaded or drawn
    const last = plan[plan.length - 1], rect = fluidPieceRect(p, layout);
    if (p.kind === 'puff' && last && last.puffs && last.mask === p.mask && last.opacity === p.opacity && last.blend === p.blend) last.puffs.push(p);
    else if (p.kind === 'puff') plan.push({ puffs: [p], mask: p.mask, opacity: p.opacity, blend: p.blend, rect });
    else plan.push({ piece: p, rect });
  }
  return plan;
}

// ------------------------------------------------------------------------------------------------ state
const stores = new Map();    // dir -> store
function storeOf(dir) {
  let st = stores.get(dir);
  if (!st) {
    st = { dir, status: 'idle', layout: null, plan: [], sheets: new Map(), masks: new Map(), loading: 0, clock: 0, lastRaw: null, frozen: false,
      drawn: 0, composites: 0, lastDraw: 0, ms: 0, error: null, layers: new Map(), frameNo: 0, last: new Map(), shader: null };
    stores.set(dir, st);
  }
  return st;
}
const cfgOf = () => activeTownSkin()?.fluidFx || null;
let shaderFlag;   // ?fluid=frames turns the shader off (read once); the shader is the default since 12 Nov
const shaderWanted = () => shaderFlag ?? (shaderFlag = fluidShaderRequested());
/** True while the painted fluid layer is the one animating water / lava (loading or ready, not failed): the old particle flow must stay off. */
export const townFluidOwnsFlow = () => { const c = cfgOf(); return !!c && storeOf(c.dir).status !== 'failed'; };
/** True when the painted cloud-sea is actually on screen duty: the old cloud banks over the heaven gate must stay off then. */
export const townFluidOwnsClouds = (reduced = false) => { const c = cfgOf(); return !!c && !reduced && weatherEnabled() && storeOf(c.dir).status === 'ready'; };
export const townFluidFxStats = () => { const c = cfgOf(); if (!c) return null; const st = storeOf(c.dir);
  return { status: st.status, clock: st.clock, frozen: st.frozen, ms: Math.round(st.ms * 100) / 100, drawn: st.drawn, composites: st.composites,
    shader: st.shader?.status || null, shaderDrawn: st.shader?.composites || 0, sheetsReady: [...st.sheets.values()].filter(s => s.state === 'ready').length, masksReady: [...st.masks.values()].filter(s => s.state === 'ready').length }; };
export const townFluidFxClock = () => { const c = cfgOf(); return c ? storeOf(c.dir).clock : 0; };
/** Test hook: install a layout without fetching. */
export function setFluidLayoutForTest(dir, layout) {
  const st = storeOf(dir); st.layout = layout; st.plan = fluidDrawPlan(layout); st.status = 'ready'; return st;
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = async () => { try { if (im.decode) await im.decode(); } catch {} resolve(im); };
    im.onerror = () => reject(new Error('fluid art unavailable: ' + url));
    im.src = url;
  });
}
function ensureLayout(cfg) {
  const st = storeOf(cfg.dir);
  if (st.status !== 'idle' || typeof fetch !== 'function') return st;
  st.status = 'loading';
  fetch(cfg.dir + 'fx-layout.json').then(r => { if (!r.ok) throw new Error('fx-layout ' + r.status); return r.json(); })
    .then(layout => { st.layout = layout; st.plan = fluidDrawPlan(layout); st.status = 'ready'; })
    .catch(error => { st.status = 'failed'; st.error = String(error); });
  return st;
}

// ------------------------------------------------------------------------------------------------ art loading
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function scaled(source, sx, sy, sw, sh, w, h) {
  const c = mk(w, h), g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.drawImage(source, sx, sy, sw, sh, 0, 0, c.width, c.height); return c;
}
/** Tile families of a sheet: one pre-scaled canvas per frame and density level, cut from the decoded sheet then released. */
function buildTiles(entry, image, tileWorld) {
  entry.tiles = FLUID_TILE_LEVELS.map(ppu => {
    const tw = Math.min(entry.fw, Math.ceil(tileWorld[0] * ppu)), th = Math.min(entry.fh, Math.ceil(tileWorld[1] * ppu));
    const frames = [];
    for (let f = 0; f < entry.frames; f++) frames.push(scaled(image, f * entry.fw, 0, entry.fw, entry.fh, tw, th));
    return { tw, th, frames, patterns: null, tileWorld };
  });
}
/** Single drawn frames (waterfalls, lava falls, puffs): per frame a mip chain, each half the size of the one before. */
function buildMips(entry, image, baseW, baseH) {
  entry.mips = [];
  for (let k = 0; k < MIP_LEVELS; k++) {
    const w = Math.max(2, Math.round(baseW / 2 ** k)), h = Math.max(2, Math.round(baseH / 2 ** k)), frames = [];
    for (let f = 0; f < entry.frames; f++) frames.push(scaled(image, f * entry.fw, 0, entry.fw, entry.fh, w, h));
    entry.mips.push({ w, h, frames });
  }
}
function requestSheet(st, name) {
  let e = st.sheets.get(name);
  if (!e) {
    const users = st.layout.pieces.filter(p => p.sheet === name), p0 = users[0];
    e = { name, state: 'idle', frames: p0.frames, fw: p0.frameW, fh: p0.frameH, kind: p0.kind, tileWorld: p0.tileWorld || null,
      spriteWorld: p0.spriteWorld || null, tiles: null, mips: null };
    st.sheets.set(name, e);
  }
  if (e.state === 'error' && Date.now() - e.failedAt > RETRY_MS) e.state = 'idle';
  if (e.state !== 'idle' || st.loading >= MAX_LOADING) return e;
  e.state = 'loading'; st.loading++;
  loadImage(st.dir + 'sheets/' + name).then(image => {
    if (e.kind === 'tile') buildTiles(e, image, e.tileWorld);
    else if (e.kind === 'puff') buildMips(e, image, Math.ceil(e.spriteWorld[0] * FLUID_MAX_SCALE), Math.ceil(e.spriteWorld[1] * FLUID_MAX_SCALE));
    else buildMips(e, image, e.fw, e.fh);
    e.state = 'ready';
  }).catch(() => { e.state = 'error'; e.failedAt = Date.now(); }).finally(() => { st.loading--; });
  return e;
}
function requestMask(st, name) {
  let e = st.masks.get(name);
  if (!e) { e = { name, state: 'idle', image: null }; st.masks.set(name, e); }
  if (e.state === 'error' && Date.now() - e.failedAt > RETRY_MS) e.state = 'idle';
  if (e.state !== 'idle' || st.loading >= MAX_LOADING) return e;
  e.state = 'loading'; st.loading++;
  loadImage(st.dir + 'masks/' + name + '.webp').then(image => { e.image = image; e.state = 'ready'; })
    .catch(() => { e.state = 'error'; e.failedAt = Date.now(); }).finally(() => { st.loading--; });
  return e;
}
const maskNames = p => p.clipMask ? [p.mask, p.clipMask] : [p.mask];
function pieceReady(st, p, request) {
  const sheet = request ? requestSheet(st, p.sheet) : st.sheets.get(p.sheet);
  let ok = sheet?.state === 'ready';
  for (const m of maskNames(p)) { const e = request ? requestMask(st, m) : st.masks.get(m); ok = ok && e?.state === 'ready'; }
  return ok;
}

// ------------------------------------------------------------------------------------------------ drawing
// One composing canvas PER PIECE (sized up in 64 px steps, never shrunk while in use). A single shared scratch canvas forced the browser to
// copy its whole texture each time it was re-cleared for the next piece, before the main canvas had read the previous one: measured as the
// main cost of this layer on a throttled phone. Layers of pieces that left the camera are dropped after a few seconds.
function layerOf(st, id, w, h, frameNo) {
  let s = st.layers.get(id);
  if (!s) { const canvas = mk(Math.ceil(w / 64) * 64, Math.ceil(h / 64) * 64); s = { canvas, ctx: canvas.getContext('2d'), used: frameNo }; st.layers.set(id, s); }
  else if (s.canvas.width < w || s.canvas.height < h) { s.canvas.width = Math.max(s.canvas.width, Math.ceil(w / 64) * 64); s.canvas.height = Math.max(s.canvas.height, Math.ceil(h / 64) * 64); }
  s.used = frameNo;
  return s;
}
function pruneLayers(st, frameNo) {
  if (frameNo % 180) return;
  for (const [id, s] of st.layers) if (frameNo - s.used > 300) { s.canvas.width = s.canvas.height = 1; st.layers.delete(id); }
}
function tilePatterns(g, level) {
  if (!level.patterns) {
    level.patterns = level.frames.map(canvas => {
      const p = g.createPattern(canvas, 'repeat');
      // tile pixels -> world units, so a pattern tile is exactly tileWorld big and anchored at world (0,0)
      if (p?.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix([level.tileWorld[0] / canvas.width, 0, 0, level.tileWorld[1] / canvas.height, 0, 0]));
      return p;
    });
  }
  return level.patterns;
}
/** Draw `fn(frameIndex, alpha)` for the two mixed frames with premultiplied adds: a true cross-fade of two drawn frames. */
function mixFrames(g, frame, fn) {
  g.globalCompositeOperation = 'lighter';
  if (frame.mix < .004 || frame.i === frame.j) { g.globalAlpha = 1; fn(frame.i); }
  else { g.globalAlpha = 1 - frame.mix; fn(frame.i); g.globalAlpha = frame.mix; fn(frame.j); }
  g.globalAlpha = 1;
}
function clipToMask(g, st, p, rect) {
  g.globalCompositeOperation = 'destination-in';
  for (const name of maskNames(p)) g.drawImage(st.masks.get(name).image, rect[0], rect[1], rect[2], rect[3]);
  g.globalCompositeOperation = 'source-over';
}
const rawDraw = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype.drawImage : null;

/** Layer geometry for the visible part `vis` (world rect) of something, in the main canvas device pixels. */
function layerGeometry(m, vis, cw, ch) {
  const dx0 = Math.max(0, Math.floor(m.e + vis[0] * m.a)), dy0 = Math.max(0, Math.floor(m.f + vis[1] * m.d));
  const dx1 = Math.min(cw, Math.ceil(m.e + (vis[0] + vis[2]) * m.a)), dy1 = Math.min(ch, Math.ceil(m.f + (vis[1] + vis[3]) * m.d));
  if (dx1 <= dx0 || dy1 <= dy0) return null;
  const ratio = Math.min(1, FLUID_MAX_SCALE / Math.max(m.a, m.d));
  const sx = m.a * ratio, sy = m.d * ratio, wx0 = (dx0 - m.e) / m.a, wy0 = (dy0 - m.f) / m.d;
  return { dx0, dy0, dw: dx1 - dx0, dh: dy1 - dy0, lw: Math.max(1, Math.ceil((dx1 - dx0) * ratio)), lh: Math.max(1, Math.ceil((dy1 - dy0) * ratio)), sx, sy, wx0, wy0 };
}
function drawPiece(st, p, geo, rect, sec) {
  const layer = layerOf(st, p.id, geo.lw, geo.lh, st.frameNo), g = layer.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, geo.lw, geo.lh);
  g.setTransform(geo.sx, 0, 0, geo.sy, -geo.wx0 * geo.sx, -geo.wy0 * geo.sy);
  const sheet = st.sheets.get(p.sheet), frame = fluidFrame(p.frames, p.fps, sec * 1000);
  if (p.kind === 'tile') {
    const level = sheet.tiles[fluidTileLevel(Math.max(geo.sx, geo.sy))], pats = tilePatterns(g, level);
    mixFrames(g, frame, f => { g.fillStyle = pats[f]; g.fillRect(geo.wx0, geo.wy0, geo.lw / geo.sx + 1, geo.lh / geo.sy + 1); });
  } else {
    const m0 = sheet.mips[0], mip = sheet.mips[Math.min(fluidMipFor(m0.w, rect[2] * geo.sx), fluidMipFor(m0.h, rect[3] * geo.sy))];
    mixFrames(g, frame, f => g.drawImage(mip.frames[f], rect[0], rect[1], rect[2], rect[3]));
  }
  g.setTransform(geo.sx, 0, 0, geo.sy, -geo.wx0 * geo.sx, -geo.wy0 * geo.sy);
  clipToMask(g, st, p, rect);
  return layer;
}
function drawSpots(st, p, geo, rect, vis, sec) {
  const layer = layerOf(st, p.id, geo.lw, geo.lh, st.frameNo), g = layer.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, geo.lw, geo.lh);
  const sheet = st.sheets.get(p.sheet), m0 = sheet.mips[0];
  for (const sp of p.spots) {
    const r = Math.max(sp[2], sp[3]) * .75 + Math.hypot(sp[7], sp[8]);
    if (sp[0] + r < vis[0] || sp[0] - r > vis[0] + vis[2] || sp[1] + r < vis[1] || sp[1] - r > vis[1] + vis[3]) continue;
    const s = fluidSpotState(p, sp, sec);
    if (!s || s.alpha < .01) continue;
    const mip = sheet.mips[Math.min(fluidMipFor(m0.w, sp[2] * geo.sx), fluidMipFor(m0.h, sp[3] * geo.sy))];
    g.setTransform(geo.sx, 0, 0, geo.sy, -geo.wx0 * geo.sx, -geo.wy0 * geo.sy);
    g.translate(sp[0] + s.ox, sp[1] + s.oy); g.rotate(sp[4]);
    g.globalCompositeOperation = 'lighter';
    if (s.mix < .004 || s.i === s.j) { g.globalAlpha = s.alpha; g.drawImage(mip.frames[s.i], -sp[2] / 2, -sp[3] / 2, sp[2], sp[3]); }
    else {
      g.globalAlpha = s.alpha * (1 - s.mix); g.drawImage(mip.frames[s.i], -sp[2] / 2, -sp[3] / 2, sp[2], sp[3]);
      g.globalAlpha = s.alpha * s.mix; g.drawImage(mip.frames[s.j], -sp[2] / 2, -sp[3] / 2, sp[2], sp[3]);
    }
  }
  g.setTransform(geo.sx, 0, 0, geo.sy, -geo.wx0 * geo.sx, -geo.wy0 * geo.sy); g.globalAlpha = 1;
  clipToMask(g, st, p, rect);
  return layer;
}
function drawPuffs(st, group, geo, vis, sec) {
  const layer = layerOf(st, group.puffs[0].id, geo.lw, geo.lh, st.frameNo), g = layer.ctx;
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1; g.clearRect(0, 0, geo.lw, geo.lh);
  g.setTransform(geo.sx, 0, 0, geo.sy, -geo.wx0 * geo.sx, -geo.wy0 * geo.sy);
  const [rx, ry, rw, rh] = group.rect;
  for (const p of group.puffs) {
    const sheet = st.sheets.get(p.sheet), [sw, sh] = p.spriteWorld, [cx, cy] = fluidPuffCenter(p, sec);
    const mip = sheet.mips[fluidMipFor(sheet.mips[0].w, sw * geo.sx)].frames[0];
    for (const ox of [-rw, 0, rw]) for (const oy of [-rh, 0, rh]) {
      const x = cx + ox - sw / 2, y = cy + oy - sh / 2;
      if (x + sw < vis[0] || x > vis[0] + vis[2] || y + sh < vis[1] || y > vis[1] + vis[3]) continue;
      g.drawImage(mip, x, y, sw, sh);
    }
  }
  clipToMask(g, st, group.puffs[0], [rx, ry, rw, rh]);
  return layer;
}
/** The previous composition of a piece, re-aimed at the camera as it is now, while it is younger than `intervalMs` and the zoom has not changed. */
function reuseLayer(st, id, m, time, intervalMs) {
  if (!intervalMs) return null;
  const prev = st.last.get(id), layer = st.layers.get(id);
  if (!prev || !layer || time < prev.at || time - prev.at >= intervalMs || Math.abs(m.a - prev.a) > 1e-6 || Math.abs(m.d - prev.d) > 1e-6) return null;
  layer.used = st.frameNo;
  return { layer, geo: { ...prev.geo, dx0: prev.geo.dx0 + (m.e - prev.e), dy0: prev.geo.dy0 + (m.f - prev.f) } };
}
function composite(ctx, st, layer, geo, blend, opacity) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = opacity; ctx.globalCompositeOperation = blend === 'normal' ? 'source-over' : blend; ctx.imageSmoothingQuality = 'low';
  if (rawDraw) rawDraw.call(ctx, layer.canvas, 0, 0, geo.lw, geo.lh, geo.dx0, geo.dy0, geo.dw, geo.dh);
  else ctx.drawImage(layer.canvas, 0, 0, geo.lw, geo.lh, geo.dx0, geo.dy0, geo.dw, geo.dh);
  ctx.restore();
  st.composites++;
}
const intersect = (a, b) => {
  const x0 = Math.max(a[0], b[0]), y0 = Math.max(a[1], b[1]), x1 = Math.min(a[0] + a[2], b[0] + b[2]), y1 = Math.min(a[1] + a[3], b[1] + b[3]);
  return x1 > x0 && y1 > y0 ? [x0, y0, x1 - x0, y1 - y0] : null;
};
export function fluidClockTick(st, raw, frozen) {
  st.frozen = !!frozen;
  if (st.lastRaw != null && !st.frozen) st.clock += clamp(raw - st.lastRaw, 0, 100);   // a long gap (tab switch, breakpoint) never jumps the animation
  st.lastRaw = raw;
}

/** Call once per frame with the world transform active (after the terrain, before props / characters). `time` = scene ms. */
export function drawTownFluidFx(ctx, time, { reduced = false, paused = false } = {}) {
  const cfg = cfgOf();
  if (!cfg || typeof document === 'undefined' || typeof ctx.getTransform !== 'function') return;
  const st = ensureLayout(cfg);
  fluidClockTick(st, time, paused || reduced || document.hidden);
  if (st.status !== 'ready' || reduced || !weatherEnabled()) return;
  const m = ctx.getTransform();
  if (!(m.a > 0 && m.d > 0) || m.b || m.c) return;
  const cv = ctx.canvas;
  const view = [Math.max(0, -m.e / m.a), Math.max(0, -m.f / m.d), 0, 0];
  view[2] = Math.min(TOWN_SIZE.w, (cv.width - m.e) / m.a) - view[0]; view[3] = Math.min(TOWN_SIZE.h, (cv.height - m.f) / m.d) - view[1];
  if (!(view[2] > 0 && view[3] > 0)) return;
  const loadView = [view[0] - LOAD_PAD, view[1] - LOAD_PAD, view[2] + 2 * LOAD_PAD, view[3] + 2 * LOAD_PAD];
  const sec = st.clock / 1000, t0 = performance.now(), fluidMs = graphicsProfile().fluidIntervalMs;
  st.frameNo++;
  if (!fluidMs && st.last.size) st.last.clear();
  let drawn = 0;
  // FLUID-SHADER: the default, before the drawn layers (so its copy of the ground is clean).  Any failure leaves st.shader.status 'failed' = drawn frames only.
  st.shader = shaderWanted() ? ensureFluidShader(cfg.dir) : null;
  if (fluidShaderActive(st.shader)) drawn += drawFluidShader(ctx, st.shader, { m, view, cv, sec, time, geometry: layerGeometry, intersect });
  const shaderOwns = fluidShaderActive(st.shader) || fluidShaderPending(st.shader);   // loading: the painted ground holds the liquid for the moment - no frames, no flip
  for (const item of st.plan) {
    const p = item.piece || item.puffs[0], rect = item.rect;
    if (shaderOwns && item.piece && fluidShaderReplaces(p)) continue;   // not even fetched while the shader plays it
    if (!intersect(rect, loadView)) continue;
    const ready = (item.piece ? [p] : item.puffs).every(q => pieceReady(st, q, true));
    const vis = intersect(rect, view);
    if (!ready || !vis) continue;
    // GFX-1110 (Performance graphics): between two re-compositions the last layer is blitted again at the camera's new position
    const again = reuseLayer(st, p.id, m, time, fluidMs);
    if (again) { composite(ctx, st, again.layer, again.geo, p.blend, p.opacity); drawn++; continue; }
    const geo = layerGeometry(m, vis, cv.width, cv.height);
    if (!geo) continue;
    const layer = !item.piece ? drawPuffs(st, item, geo, vis, sec) : p.kind === 'spots' ? drawSpots(st, p, geo, rect, vis, sec) : drawPiece(st, p, geo, rect, sec);
    if (fluidMs) st.last.set(p.id, { geo, at: time, e: m.e, f: m.f, a: m.a, d: m.d });
    composite(ctx, st, layer, geo, p.blend, p.opacity);
    drawn++;
  }
  pruneLayers(st, st.frameNo);
  st.drawn = drawn; st.lastDraw = time; st.ms += (performance.now() - t0 - st.ms) * .05;   // smoothed cost of this pass, for diagnostics
}
