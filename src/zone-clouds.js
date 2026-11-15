// FLUID-Z234 clouds (15 Nov 2026): floating clouds and cloud shadows of zones 2 / 3 / 4, made in code (no drawn files), like the cloud layer of zone 1.
//
//  * Shadows  : cloud-shaped silhouettes (baked once into small canvases, black + alpha) that drift over the whole map and darken the ground and everything on it; map-ambient.js
//               lays them out exactly like the zone 1 shadows (same lattice, same strength .32, same drift) - only the silhouettes differ per zone.
//  * Clouds   : drifting soft clouds drawn on the GROUND layer (under buildings and characters, like zone 1's puffs).  Where they may show comes from the painted mist of each ground
//               (src/zone-clouds-density.js, built from the ground preview by scripts/build-zone-cloud-density.py); over plazas and roads they fade out, so the screen never gets paler.
//               asia      thin mist clouds with the curling scroll of Japanese / Chinese cloud patterns
//               west      fluffy snow clouds, cool white, flat-bottomed, kept thin so they do not stack with the fog banks (zone3-fog.js)
//               cyberhell dark rain clouds / violet-cyan data smog, wide and ragged, matching the rain
//  Nothing here recolours or filters the ground art.  No imports of map-ambient.js (it imports this file); the caller passes `enabled` / `reduced`.
import { zoneCloudDensity } from './zone-clouds-density.js';

/** `?z234=old` puts the towns of zones 2-4 back to how they were before this round (old particle flow, old gradient cloud banks, old blob shadows): an A/B switch for evidence captures. */
let oldMode = null, cloudsOff = null;
const q = () => { try { return new URLSearchParams(globalThis.location?.search ?? '').get('z234'); } catch { return null; } };
export function zone234Old() { if (oldMode === null) oldMode = q() === 'old'; return oldMode; }
/** `?z234=nocloud` = the new fluid shader without the new clouds / shadows (measurements: which part costs what); `old` also has no clouds. */
export function zone234CloudsOff() { if (cloudsOff === null) cloudsOff = q() === 'nocloud' || zone234Old(); return cloudsOff; }
export function setZone234OldForTest(v) { oldMode = v === null ? null : !!v; cloudsOff = null; }
export const ZONE_CLOUD_ZONES = Object.freeze(['asia', 'west', 'cyberhell']);
const WORLD = [3840, 2560];

/** Every tunable of the three zones.  sizes in world units, speeds in world units per second, `peak` = opacity of a cloud over the thickest mist. */
export const ZONE_CLOUD_FX = Object.freeze({
  asia:      Object.freeze({ peak: .5,  width: [430, 740], speed: [5, 9],   cell: [480, 440], oddFill: .55, minDensity: .1,  breathe: .12, swirl: true,  light: [255, 249, 236], shade: [212, 214, 226] }),
  west:      Object.freeze({ peak: .42, width: [520, 820], speed: [7, 12],  cell: [560, 500], oddFill: .4,  minDensity: .12, breathe: .1,  swirl: false, light: [244, 249, 255], shade: [176, 196, 224] }),
  cyberhell: Object.freeze({ peak: .5,  width: [620, 960], speed: [9, 15],  cell: [620, 520], oddFill: .5,  minDensity: .1,  breathe: .14, swirl: false, light: [150, 118, 196], shade: [58, 40, 96] }),
});
const frac = n => n - Math.floor(n);
const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const cellHash = (i, j, k) => hash(i * 73.13 + j * 191.7 + k * 17.31 + .5);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mod = (n, d) => ((n % d) + d) % d;

// ------------------------------------------------------------------------------------------------ silhouettes
const SW = 256, SH = 128;
const vhash = (x, y, s) => frac(Math.sin(x * 12.9898 + y * 78.233 + s * 37.719) * 43758.5453);
function vnoise(x, y, s) {
  const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
  const a = vhash(x0, y0, s), b = vhash(x0 + 1, y0, s), c = vhash(x0, y0 + 1, s), d = vhash(x0 + 1, y0 + 1, s);
  return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
}
const fbm = (x, y, s) => vnoise(x, y, s) * .55 + vnoise(x * 2.1, y * 2.1, s + 3) * .3 + vnoise(x * 4.3, y * 4.3, s + 7) * .15;
/** The lobes of one silhouette: [cx, cy, rx, ry] in 0..1 of the sprite.  Zone style + variant decide the shape. */
function lobes(zone, variant) {
  const h = k => hash(variant * 97.3 + k * 13.7 + (zone === 'asia' ? 1 : zone === 'west' ? 2 : 3) * 331), out = [];
  if (zone === 'asia') {        // the scroll cloud: a round head of 3-4 lobes and a tail of shrinking lobes that curls up and over
    const n = 3 + (variant % 2);
    for (let i = 0; i < n; i++) out.push([.26 + .13 * i + (h(i) - .5) * .05, .58 - .05 * Math.sin(i * 1.6) + (h(i + 9) - .5) * .06, .13 + .05 * h(i + 3), .16 + .06 * h(i + 5)]);
    const hx = .26 + .13 * (n - 1) + .08; let r = .12;
    for (let i = 0; i < 5; i++) { r *= .88; out.push([Math.min(.82, hx + .035 * i + .02 * Math.sin(i * 1.3)), .56 - .045 * i + (variant % 2 ? .012 * i * i : -.004 * i * i), r * .95, r * .85]); }   // the tail rises and curls back
  } else if (zone === 'west') { // cumulus: many lumpy lobes with the biggest in the middle, a flat base
    for (let i = 0; i < 9; i++) { const u = (i + .5) / 9, big = 1 - Math.abs(u - .5) * 1.5; out.push([.2 + .6 * u + (h(i) - .5) * .05, .66 - .24 * big * h(i + 4) - .03, .08 + .1 * big * (.6 + .6 * h(i + 2)), .1 + .16 * big * (.6 + .6 * h(i + 6))]); }
  } else {                      // smog / rain cloud: long and low, overlapping flat ellipses
    for (let i = 0; i < 8; i++) { const u = (i + .5) / 8; out.push([.2 + .6 * u + (h(i) - .5) * .05, .5 + (h(i + 8) - .5) * .3, .1 + .08 * h(i + 3), .1 + .1 * h(i + 5)]); }
  }
  return out;
}
/** Alpha field (0..1) and thickness of one silhouette at SW x SH, with a ragged noisy edge. */
function field(zone, variant) {
  const L = lobes(zone, variant), a = new Float32Array(SW * SH), seed = variant * 5 + (zone === 'asia' ? 1 : zone === 'west' ? 2 : 3) * 11;
  const edge = zone === 'cyberhell' ? .5 : zone === 'asia' ? .18 : .3;
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const u = x / SW, v = y / SH; let f = 0;
    for (const [cx, cy, rx, ry] of L) { const d = Math.hypot((u - cx) / rx, (v - cy) / ry); if (d < 1.4) f = Math.max(f, 1 - d * d * .5 - .0); }
    f += (fbm(u * 9, v * 9, seed) - .5) * edge;
    if (zone === 'west') f *= smooth(.98, .74, v);                         // flat base
    const border = Math.min(smooth(.02, .2, u), smooth(.98, .8, u), smooth(.02, .18, v), smooth(.98, .82, v));   // never touches the sprite edge: no hard rectangle
    a[y * SW + x] = Math.min(1, Math.max(0, smooth(.06, .62, f))) * border;
  }
  return a;
}
const NV = 3;   // silhouettes per zone (each also baked mirrored)
const mk = () => { const c = document.createElement('canvas'); c.width = SW; c.height = SH; return c; };
function bake(zone, variant, kind, flip) {
  const c = mk(), g = c.getContext('2d'); if (!g || typeof g.createImageData !== 'function') return null;
  const a = field(zone, variant), im = g.createImageData(SW, SH), fx = ZONE_CLOUD_FX[zone];
  for (let y = 0; y < SH; y++) for (let x = 0; x < SW; x++) {
    const i = y * SW + x, o = i * 4, al = a[i];
    if (kind === 'shadow') { im.data[o + 3] = Math.round(al * 255); continue; }
    // lit from above: thick and high = light, thin and low = shade
    const lit = Math.min(1, Math.max(0, .35 + .65 * al * (1.15 - y / SH)));
    for (let k = 0; k < 3; k++) im.data[o + k] = Math.round(fx.shade[k] + (fx.light[k] - fx.shade[k]) * lit);
    im.data[o + 3] = Math.round(al * 255);
  }
  g.putImageData(im, 0, 0);
  if (kind === 'cloud' && fx.swirl) {   // Japanese / Chinese scroll: a fine spiral line inside the head lobes, pale gold, only on the cloud body
    g.save(); g.globalCompositeOperation = 'source-atop'; g.strokeStyle = 'rgba(232,196,120,.5)'; g.lineWidth = 1.5; g.lineCap = 'round';
    const L = lobes(zone, variant);
    for (let li = 0; li < Math.min(4, L.length); li++) {
      const [cx, cy, rx, ry] = L[li]; g.beginPath();
      for (let t = 0; t <= 1; t += .04) { const ang = t * 11, r = (1 - t) * .62; const px = (cx + Math.cos(ang) * rx * r) * SW, py = (cy + Math.sin(ang) * ry * r) * SH; t ? g.lineTo(px, py) : g.moveTo(px, py); }
      g.stroke();
    }
    g.restore();
  }
  let out = c;
  if (flip) { const f = mk(), fg = f.getContext('2d'); fg.translate(SW, 0); fg.scale(-1, 1); fg.drawImage(c, 0, 0); out = f; }
  out.aspect = SW / SH; return out;
}
// sprites are baked one per call (a frame each), never all at once: ~32k px of field per silhouette
const baked = {};
function sprites(zone, kind) {
  const key = zone + '|' + kind;
  let b = baked[key];
  if (b && b.state === 'ready') return b.list;
  if (b && b.state === 'failed') return false;
  if (typeof document === 'undefined') return false;
  if (!b) b = baked[key] = { state: 'building', list: [], n: 0 };
  try {
    const v = b.n >> 1, flip = !!(b.n & 1), s = bake(zone, v, kind, flip);
    if (!s) { b.state = 'failed'; return false; }
    b.list.push(s); b.n++;
    if (b.n >= NV * 2) b.state = 'ready';
  } catch { b.state = 'failed'; return false; }
  return b.state === 'ready' ? b.list : null;
}
/** Shadow silhouettes of `zone`: an array of canvases (with .aspect) when ready, null while they are being baked (a frame each), false when they cannot be made. */
export const zoneShadowSprites = zone => ZONE_CLOUD_FX[zone] ? sprites(zone, 'shadow') : false;
export const zoneCloudSprites = zone => ZONE_CLOUD_FX[zone] ? sprites(zone, 'cloud') : false;
export function resetZoneCloudsForTest() { for (const k of Object.keys(baked)) delete baked[k]; }
export const zoneCloudsApply = zone => ZONE_CLOUD_ZONES.includes(zone);

// ------------------------------------------------------------------------------------------------ floating clouds
/** Cloud `(i, j)` of `zone` at `sec`: { x, y, w, h, alpha, sprite } or null (no cloud in this slot / over no mist).  World units; pure (tests). */
export function zoneCloudAt(zone, i, j, sec, aspect = 2) {
  const fx = ZONE_CLOUD_FX[zone]; if (!fx) return null;
  if ((i + j) % 2 && cellHash(i, j, 1) > fx.oddFill) return null;
  const span = WORLD[0] + 2 * 700, w = fx.width[0] + cellHash(i, j, 2) * (fx.width[1] - fx.width[0]), h = w / aspect;
  const vx = fx.speed[0] + cellHash(i, j, 3) * (fx.speed[1] - fx.speed[0]);
  const x = mod(i * fx.cell[0] + cellHash(i, j, 4) * fx.cell[0] * .6 + vx * sec, span) - 700, y = j * fx.cell[1] + cellHash(i, j, 5) * fx.cell[1] * .6 + Math.sin(sec * .03 + cellHash(i, j, 6) * 6.28) * 14;
  const cx = x + w / 2, cy = y + h / 2;
  const d = zoneCloudDensity(zone, Math.min(.999, Math.max(0, cx / WORLD[0])), Math.min(.999, Math.max(0, cy / WORLD[1])));
  if (d < fx.minDensity) return null;
  const edge = smooth(-300, 100, cx) * smooth(WORLD[0] + 300, WORLD[0] - 100, cx);   // fade in / out at the map's sides while it wraps around
  const breath = 1 - fx.breathe + fx.breathe * Math.sin(sec * .05 + cellHash(i, j, 7) * 6.28);
  return { x, y, w, h, alpha: fx.peak * d * edge * breath * (.85 + .15 * cellHash(i, j, 8)), flip: cellHash(i, j, 9) };
}
let lastDrawn = 0, layer = null, last = null;
export const zoneCloudsDrawn = () => lastDrawn;
export const CLOUD_LAYER_SCALE = .5, CLOUD_REUSE_MS = 100;   // the clouds are composed at half resolution (they are soft), and again only every 100 ms while the camera stands still
const hit = (a, b) => a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1];
/** Draw the floating clouds of `zone` onto `ctx` (world transform active), on the ground layer.  `ms` = the game's FX clock (stops with pause).  Returns how many were drawn.
 *  All clouds are composed into one half-resolution layer (source-over, so the result equals drawing them one by one) and that layer is blitted once; a still camera re-blits the last one for up to 100 ms. */
export function drawZoneClouds(ctx, ms, zone, { reduced = false, enabled = true } = {}) {
  lastDrawn = 0;
  if (!enabled || reduced || zone234CloudsOff() || !ZONE_CLOUD_FX[zone] || typeof ctx.getTransform !== 'function' || typeof document === 'undefined') return 0;
  const sp = zoneCloudSprites(zone); if (!sp) return 0;
  const m = ctx.getTransform(); if (!(m.a > 0 && m.d > 0) || m.b || m.c) return 0;
  const cv = ctx.canvas, k = CLOUD_LAYER_SCALE;
  if (last && last.zone === zone && layer && last.w === cv.width && last.h === cv.height && last.e === m.e && last.f === m.f && last.a === m.a && last.d === m.d && ms >= last.ms && ms - last.ms < CLOUD_REUSE_MS) {
    const b = last.box; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true;
    ctx.drawImage(layer, b[0] * k, b[1] * k, (b[2] - b[0]) * k, (b[3] - b[1]) * k, b[0], b[1], b[2] - b[0], b[3] - b[1]); ctx.restore(); lastDrawn = last.n; return last.n;
  }
  last = null;
  const view = [-m.e / m.a, -m.f / m.d, cv.width / m.a, cv.height / m.d], fx = ZONE_CLOUD_FX[zone], sec = ms / 1000;
  const cols = Math.ceil((WORLD[0] + 1400) / fx.cell[0]) + 1, rows = Math.ceil(WORLD[1] / fx.cell[1]) + 1, todo = []; let box = null;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const s = sp[Math.floor(cellHash(i, j, 10) * sp.length) % sp.length], c = zoneCloudAt(zone, i, j, sec, s.aspect); if (!c || c.alpha < .04) continue;   // too faint to see: not drawn at all
    if (!hit([c.x, c.y, c.w, c.h], view)) continue;
    const b = [Math.max(0, Math.floor(m.e + c.x * m.a) - 2), Math.max(0, Math.floor(m.f + c.y * m.d) - 2), Math.min(cv.width, Math.ceil(m.e + (c.x + c.w) * m.a) + 2), Math.min(cv.height, Math.ceil(m.f + (c.y + c.h) * m.d) + 2)];
    if (b[2] <= b[0] || b[3] <= b[1]) continue;
    todo.push([s, c]); box = box ? [Math.min(box[0], b[0]), Math.min(box[1], b[1]), Math.max(box[2], b[2]), Math.max(box[3], b[3])] : b;
  }
  if (!todo.length) return 0;
  if (!layer) layer = document.createElement('canvas');
  const lw = Math.ceil(cv.width * k), lh = Math.ceil(cv.height * k); if (layer.width !== lw || layer.height !== lh) { layer.width = lw; layer.height = lh; }
  const L = layer.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.globalCompositeOperation = 'source-over'; L.globalAlpha = 1;
  L.clearRect(Math.floor(box[0] * k), Math.floor(box[1] * k), Math.ceil((box[2] - box[0]) * k) + 1, Math.ceil((box[3] - box[1]) * k) + 1);
  L.imageSmoothingEnabled = true; L.imageSmoothingQuality = 'low'; L.setTransform(m.a * k, 0, 0, m.d * k, m.e * k, m.f * k);
  for (const [s, c] of todo) { L.globalAlpha = Math.min(1, c.alpha); L.drawImage(s, c.x, c.y, c.w, c.h); }
  L.globalAlpha = 1;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(layer, box[0] * k, box[1] * k, (box[2] - box[0]) * k, (box[3] - box[1]) * k, box[0], box[1], box[2] - box[0], box[3] - box[1]); ctx.restore();
  last = { zone, ms, e: m.e, f: m.f, a: m.a, d: m.d, w: cv.width, h: cv.height, box, n: todo.length }; lastDrawn = todo.length;
  return lastDrawn;
}
