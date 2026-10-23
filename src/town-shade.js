// L1 — light and shadow on the Zone 1 painted map.
// One sun for the whole town: it stands upper-left, so every object (building, tree, rock, lamp, actor)
// throws its shadow to the lower-right, the same way for everyone and proportional to its height.
//  * ground shadow: the object's own alpha silhouette, sheared once; two baked layers (tight + soft) give a
//    soft edge without shadowBlur / ctx.filter (both silhouettes are baked ONCE into small canvases);
//  * contact shade (AO): a baked radial blob under the base so nothing floats;
//  * a 1/4-resolution "shadow field" (all silhouettes unioned, baked only when the set of casters changes)
//    answers "is this actor standing in a shadow?"; only then is the actor drawn through a small offscreen
//    layer and darkened where the field overlaps it (cheap: usually zero actors are in shade).
// Relation to town-lighting.js (Codex): that file grades the painted ground and owns emissive lava + torch glow.
// This file never re-grades anything; it only multiplies a dark, soft shadow on top of the graded ground, and the
// torch pillars it lights are casters here too (their sprite comes from the same resolver the scenery draws with).
import { stationBox } from './art.js';
import { TOWN_PROP_SITES, TOWN_HOUSE_SITES, TOWN_DAIS, TOWN_SIZE, onTownLayoutChange } from './town-layout.js?v=k1d';
import { activeTownZone } from './zone-skin.js';

// Shadow offset per unit of height. A point H above the foot lands (KX*H, KY*H) right/below the foot.
export const SUN = { kx:.42, ky:.3 };
const SINK = .08;                      // fraction of sprite height the shadow root sits above the lowest visible pixel
const FIELD_RES = .25;                 // shadow-field pixels per world unit
const SHADE_ALPHA = .58;               // how much darker an actor gets inside a shadow
const SHADE_RGB = '16,8,34';
const GROUND = { tight:'rgba(14,8,26,.20)', soft:'rgba(14,8,26,.15)' };

// ---------- baked silhouettes ----------
const sil = new WeakMap();
function silhouette(art, level) {          // level: 'tight' (~192 px) | 'soft' (~40 px, upscaled = blurry)
  let per = sil.get(art); if (!per) { per = {}; sil.set(art, per); }
  if (per[level]) return per[level];
  const aw = art.naturalWidth || art.width, ah = art.naturalHeight || art.height;
  const sc = (level === 'soft' ? 40 : 192) / Math.max(aw, ah);
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.ceil(aw * sc)); c.height = Math.max(2, Math.ceil(ah * sc));
  const p = c.getContext('2d'); p.imageSmoothingEnabled = true; p.imageSmoothingQuality = 'high';
  p.drawImage(art, 0, 0, c.width, c.height);
  p.globalCompositeOperation = 'source-in'; p.fillStyle = 'rgb(255,255,255)'; p.fillRect(0, 0, c.width, c.height);
  per[level] = c; return c;
}
// Painted sprites carry transparent margins, so the anchor point (x,y) can sit well below the visible base
// (the rock floated ~30 units above its anchor). Shadow and contact shade must follow the VISIBLE base.
const baseCache = new WeakMap();
export function baseOf(art) {
  let r = baseCache.get(art); if (r) return r;
  const N = 96, c = document.createElement('canvas'); c.width = c.height = N;
  const p = c.getContext('2d', { willReadFrequently:true }); p.drawImage(art, 0, 0, N, N);
  let d; try { d = p.getImageData(0, 0, N, N).data; } catch { return { b:1, cx:.5, wf:.5 }; }
  let bot = -1;
  for (let y = N - 1; y >= 0 && bot < 0; y--) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { bot = y; break; }
  if (bot < 0) return { b:1, cx:.5, wf:.5 };
  let x1 = N, x2 = -1;
  for (let y = Math.max(0, bot - 12); y <= bot; y++) for (let x = 0; x < N; x++) if (d[(y * N + x) * 4 + 3] > 40) { if (x < x1) x1 = x; if (x > x2) x2 = x; }
  r = { b:(bot + 1) / N, cx:(x1 + x2 + 1) / 2 / N, wf:(x2 - x1 + 1) / N };
  baseCache.set(art, r); return r;
}
/** Visible ground contact of a sprite anchored at (x,y), drawn w x h, optionally mirrored: {x,y,w}. */
export function visibleBase(art, x, y, w, h, flip = false) {
  if (!art || !(art.naturalWidth || art.width)) return { x, y, w:w * .4 };
  const b = baseOf(art);
  return { x:x + ((flip ? 1 - b.cx : b.cx) - .5) * w, y:y - h * (1 - b.b) - h * SINK, w:b.wf * w };
}
let aoSprite = null;
function ao() {
  if (aoSprite) return aoSprite;
  const c = document.createElement('canvas'); c.width = 64; c.height = 32;
  const p = c.getContext('2d'), g = p?.createRadialGradient?.(0, 0, 0, 0, 0, 32);
  if (!g) return (aoSprite = c);                       // stub canvas (tests): empty blob
  p.translate(32, 16); p.scale(1, .5);
  g.addColorStop(0, 'rgba(10,5,18,.8)'); g.addColorStop(.55, 'rgba(10,5,18,.42)'); g.addColorStop(1, 'rgba(10,5,18,0)');
  p.fillStyle = g; p.beginPath(); p.arc(0, 0, 32, 0, Math.PI * 2); p.fill();
  return (aoSprite = c);
}
/** Soft contact blob under an object's base (rx, ry in world units). */
export function drawContactAO(ctx, x, y, rx, ry, alpha = 1) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.drawImage(ao(), x - rx, y - ry, rx * 2, ry * 2); ctx.restore();
}

// ---------- casters ----------
// caster: {kind:'sprite', art, x, y (foot), left, top (offset of the drawn box from the foot), w, h, flip, lift}
//         {kind:'post', x, y, h, crown}   // lamp / torch / palm placeholders still drawn in code
function spriteCaster(art, x, y, w, h, flip, lift, contour = false) {   // anchor the shadow on the visible base, not on the anchor point
  const b = baseOf(art);
  // the cast shadow starts a little INSIDE the sprite's lowest rows (SINK) so it is attached to the object, not under it
  const off = ((flip ? 1 - b.cx : b.cx) - .5) * w;
  return { kind:'sprite', art, x:x + off, y:y - h * (1 - b.b) - h * SINK, left:-w / 2 - off, top:-h * b.b + h * SINK, w, h, flip, lift, contour };
}

// ---------- P5: buildings cast from their whole ground contour ----------
// A building is painted in 3/4 view: its footprint is a diamond, so the lowest pixel of each COLUMN of the sprite differs
// (the right wall meets the ground well above the front corner).  Rooting the whole shadow at the single lowest point (the old
// spriteCaster root) left a strip of bare pavement between the right wall and its shadow - the building looked like it floated
// (owner image 6, 22 Oct).  Here every column casts from its own lowest opaque pixel (contact line) instead.
// Only buildings (stations, houses) use it; trees/rocks keep the single trunk root (their canopy columns are not ground contact).
const CONTOUR_SINK = .022;              // fraction of sprite height the contact line sits inside the lowest rows
const contourProfiles = new WeakMap();  // art -> Float32Array of per-column lowest opaque row (0..1 of height), 192 columns
function contourProfile(art) {
  let p = contourProfiles.get(art); if (p) return p;
  const s = silhouette(art, 'tight'), cw = s.width, ch = s.height;
  let d; try { d = s.getContext('2d', { willReadFrequently:true }).getImageData(0, 0, cw, ch).data; } catch { d = null; }
  const raw = new Float32Array(cw).fill(-1);
  if (d) for (let x = 0; x < cw; x++) for (let y = ch - 1; y >= 0; y--) if (d[(y * cw + x) * 4 + 3] > 40) { raw[x] = (y + 1) / ch; break; }
  // gaps (spires, doorways) borrow the nearest column's contact; a +-2 column maximum keeps hairline columns attached
  p = new Float32Array(cw);
  let any = -1; for (let x = 0; x < cw; x++) if (raw[x] >= 0) { any = raw[x]; break; }
  let last = any;
  for (let x = 0; x < cw; x++) { if (raw[x] >= 0) last = raw[x]; p[x] = raw[x] >= 0 ? raw[x] : last; }
  const out = new Float32Array(cw);
  for (let x = 0; x < cw; x++) { let m = 0; for (let k = -2; k <= 2; k++) m = Math.max(m, p[Math.min(cw - 1, Math.max(0, x + k))]); out[x] = m; }
  contourProfiles.set(art, out); return out;
}
const BAKE = .6;                        // baked shadow pixels per world unit
const contourCache = new WeakMap();     // art -> Map(key -> baked | null)
/** Pure core of the contour shadow (exported for tests): inverse-maps every shadow pixel to the sprite.
 *  a shadow pixel (x,y) relative to the foot comes from the sprite point (X, yb(X) - v) with v = (y - yb(X)) / ky, X = x - kx*v,
 *  where yb(X) is the ground-contact row of the sprite column under X (no per-column strips, so no hatching).
 *  alpha = silhouette alpha (sw*sh, 0..255) · prof = per-column contact (0..1 of height, any column count) ·
 *  c = {left, top, w, h, flip, lift} foot-relative sprite box · returns {W,H,x,y,data (RGBA, white)} in bake pixels. */
export function contourShadowPixels(alpha, sw, sh, prof, c, bake = BAKE) {
  const pw = prof.length, kx = SUN.kx * c.lift, ky = SUN.ky * c.lift, sink = c.h * CONTOUR_SINK;
  const cols = new Float32Array(sw); let minY = 1e9, maxY = -1e9;
  for (let i = 0; i < sw; i++) {
    const k = Math.min(pw - 1, Math.max(0, Math.floor((c.flip ? 1 - (i + .5) / sw : (i + .5) / sw) * pw)));
    cols[i] = c.top + prof[k] * c.h - sink; minY = Math.min(minY, cols[i]); maxY = Math.max(maxY, cols[i]);
  }
  const ybAt = X => { const f = Math.min(sw - 1, Math.max(0, (X - c.left) / c.w * sw - .5)), i = Math.floor(f), j = Math.min(sw - 1, i + 1), t = f - i;
    return cols[i] * (1 - t) + cols[j] * t; };
  const x0 = c.left, x1 = c.left + c.w + kx * c.h, y0 = minY, y1 = maxY + ky * c.h + 2;
  const W = Math.max(2, Math.ceil((x1 - x0) * bake)), H = Math.max(2, Math.ceil((y1 - y0) * bake));
  const data = new Uint8ClampedArray(W * H * 4);
  const alphaAt = (fx, fy) => { // bilinear alpha of the silhouette at fractional pixel (fx,fy)
    if (fx < 0 || fy < 0 || fx > sw - 1 || fy > sh - 1) return 0;
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy, jx = Math.min(sw - 1, ix + 1), jy = Math.min(sh - 1, iy + 1);
    const a = alpha[iy * sw + ix], b = alpha[iy * sw + jx], d = alpha[jy * sw + ix], e = alpha[jy * sw + jx];
    return (a * (1 - tx) + b * tx) * (1 - ty) + (d * (1 - tx) + e * tx) * ty;
  };
  for (let py = 0; py < H; py++) for (let px = 0; px < W; px++) {
    const xw = x0 + (px + .5) / bake, yw = y0 + (py + .5) / bake;
    let X = xw, v = 0;
    for (let it = 0; it < 4; it++) { v = (yw - ybAt(X)) / ky; X = xw - kx * v; }
    if (v < 0 || X < c.left || X > c.left + c.w) continue;
    const Y = ybAt(X) - v;                               // foot-relative sprite row
    if (Y < c.top || Y > c.top + c.h) continue;
    let fx = (X - c.left) / c.w * sw - .5; if (c.flip) fx = sw - 1 - fx;
    const a = alphaAt(fx, (Y - c.top) / c.h * sh - .5);
    if (a <= 0) continue;
    const o = (py * W + px) * 4; data[o] = data[o + 1] = data[o + 2] = 255; data[o + 3] = a;
  }
  return { W, H, x:x0, y:y0, data, bake };
}
function bakeContour(c, level) {
  const key = [level, c.w | 0, c.h | 0, c.flip ? 1 : 0, c.lift, c.left | 0, c.top | 0].join('|');
  let per = contourCache.get(c.art); if (!per) { per = new Map(); contourCache.set(c.art, per); }
  if (per.has(key)) return per.get(key);
  let baked = null;
  try {
    const s = silhouette(c.art, level), sw = s.width, sh = s.height;
    const px = s.getContext('2d', { willReadFrequently:true }).getImageData(0, 0, sw, sh).data;
    const alpha = new Uint8Array(sw * sh); for (let i = 0; i < alpha.length; i++) alpha[i] = px[i * 4 + 3];
    const r = contourShadowPixels(alpha, sw, sh, contourProfile(c.art), c);
    const cv = document.createElement('canvas'); cv.width = r.W; cv.height = r.H;
    const p = cv.getContext('2d'), img = p.createImageData(r.W, r.H); img.data.set(r.data); p.putImageData(img, 0, 0);
    baked = { canvas:cv, x:r.x, y:r.y, w:r.W / BAKE, h:r.H / BAKE };
  } catch { baked = null; }
  per.set(key, baked); return baked;
}

// propArt(p) = the scenery's own resolver (town-scenery.js: tree / rock / torch-pillar sprite), so shadow == what is drawn
const treeArt = (p, resolve, propArt) => propArt ? propArt(p) : (p.key ? (resolve(p.key) || (p.kind === 'tree' ? resolve('town-tree-th') : null)) : null);
export function listCasters(resolve, houseKey, stations, propArt) {
  const out = [];
  for (const p of TOWN_PROP_SITES) {
    const art = treeArt(p, resolve, propArt);
    if (art) {
      const h = p.w * (art.naturalHeight || art.height) / (art.naturalWidth || art.width);
      out.push(spriteCaster(art, p.x, p.y, p.w, h, false, 1));
    } else if (p.kind === 'lamp' || p.kind === 'torch' || p.kind === 'palm') {
      out.push({ kind:'post', x:p.x, y:p.y, h:p.h || 72, crown:p.kind === 'palm' ? p.w * .5 : 0 });
    } else if (p.kind === 'rock') {
      out.push({ kind:'post', x:p.x, y:p.y, h:p.w * .34, crown:p.w * .3 });
    }
  }
  const houseFallback = resolve('town-house-th');
  TOWN_HOUSE_SITES.forEach((s, i) => {
    const art = resolve(houseKey(i)) || houseFallback; if (!art) return;
    out.push(spriteCaster(art, s.x, s.y, s.w, s.h, !!s.flip, 1, true));
  });
  for (const d of stations) {
    const b = stationBox(d); if (!b) continue;
    // Full facade silhouette: the former .48 lift cut the roof and crane shadows in half,
    // leaving the large punishment buildings looking detached from their ground plane.
    out.push(spriteCaster(b.im,b.x+b.w/2,b.y+b.h,b.w,b.h,!!b.flip,.92,true));
  }
  const dais = resolve('town-judgment-th');
  if (dais) {   // a flat platform: its sprite height is mostly ground, so it throws a short shadow
    const h = TOWN_DAIS.w * dais.naturalHeight / dais.naturalWidth;
    out.push(spriteCaster(dais, TOWN_DAIS.x, TOWN_DAIS.y, TOWN_DAIS.w, h, false, .32));
  }
  return out;
}
function paintCaster(ctx, c, level, fill) {
  if (c.kind === 'post') {
    ctx.save(); ctx.fillStyle = ctx.strokeStyle = fill;
    const tx = c.x + SUN.kx * c.h, ty = c.y + SUN.ky * c.h;
    ctx.lineCap = 'round'; ctx.lineWidth = level === 'soft' ? 7 : 3.6;
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(tx, ty); ctx.stroke();
    if (c.crown) { ctx.beginPath(); ctx.ellipse(tx, ty, c.crown, c.crown * .38, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore(); return;
  }
  const baked = c.contour ? bakeContour(c, level) : null;
  if (baked) { ctx.drawImage(baked.canvas, c.x + baked.x, c.y + baked.y, baked.w, baked.h); return; }
  const s = silhouette(c.art, level);
  ctx.save();
  // (u,v) with v up from the foot -> (x + kx*|v|, y + ky*|v|): sheared and flattened, mirrored vertically
  ctx.transform(1, 0, -SUN.kx * c.lift, -SUN.ky * c.lift, c.x, c.y);
  if (c.flip) { ctx.translate(c.left + c.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(c.left + c.w / 2), 0); }
  ctx.drawImage(s, c.left, c.top, c.w, c.h);
  ctx.restore();
}

// ---------- state: caster list + shadow field, rebuilt only when the set of ready art changes ----------
let casters = [], signature = '', field = null, fieldAlpha = null, fieldTint = null;
function sig(resolve, houseKey, stations, propArt) {
  let s = activeTownZone() + '|' + stations.map(d => d.k).join(',') + '|';   // M2: the zone is part of the signature (each zone has its own sprites)
  if (propArt) { const t = TOWN_PROP_SITES.find(p => p.kind === 'torch'); const a = t && propArt(t); s += a && (a.naturalWidth || a.width) ? 'T1' : 'T0'; }
  for (const k of ['town-tree-th', 'town-judgment-th', 'town-house-th', 'town-prop-rock', 'town-prop-palm',
                   'town-prop-lamp-gold', 'town-tree-red-th', 'town-tree-snow-th',   // K1e sprites load async: rebuild the shadow field when they arrive
                   ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(houseKey)]) { const a = resolve(k); s += a && (a.naturalWidth || a.width) ? '1' : '0'; }
  for (const d of stations) { const b = stationBox(d); s += b ? '1' : '0'; }
  return s;
}
function rebuildField() {
  const w = Math.ceil(TOWN_SIZE.w * FIELD_RES), h = Math.ceil(TOWN_SIZE.h * FIELD_RES);
  if (!field) { field = document.createElement('canvas'); field.width = w; field.height = h; fieldTint = document.createElement('canvas'); fieldTint.width = w; fieldTint.height = h; }
  const p = field.getContext('2d', { willReadFrequently: true });
  p.setTransform(1, 0, 0, 1, 0, 0); p.clearRect(0, 0, w, h);
  p.imageSmoothingEnabled = true; p.setTransform(FIELD_RES, 0, 0, FIELD_RES, 0, 0);
  for (const c of casters) paintCaster(p, c, 'soft', 'rgb(255,255,255)');
  try { fieldAlpha = p.getImageData(0, 0, w, h).data; } catch { fieldAlpha = null; }
  const t = fieldTint.getContext('2d'); t.setTransform(1, 0, 0, 1, 0, 0); t.clearRect(0, 0, w, h);
  t.drawImage(field, 0, 0); t.globalCompositeOperation = 'source-in'; t.fillStyle = `rgb(${SHADE_RGB})`; t.fillRect(0, 0, w, h);
  t.globalCompositeOperation = 'source-over';
}
/** Call once per frame before drawing shadows / actors (cheap when nothing changed). */
export function updateTownShade(resolve, houseKey, stations, propArt) {
  const s = sig(resolve, houseKey, stations, propArt);
  if (s === signature) return;
  signature = s; casters = listCasters(resolve, houseKey, stations, propArt); rebuildField();
}
onTownLayoutChange(() => { signature = ''; });   // M2: casters follow the placed objects of the active zone layout
export const townShadeStats = () => ({ casters:casters.length, field:!!fieldAlpha });

const fieldAt = (x, y) => {
  if (!fieldAlpha) return 0;
  const ix = (x * FIELD_RES) | 0, iy = (y * FIELD_RES) | 0, w = field.width;
  if (ix < 0 || iy < 0 || ix >= w || iy >= field.height) return 0;
  return fieldAlpha[(iy * w + ix) * 4 + 3];
};
/** 0..255: the strongest shadow found over the actor's body (sampled on a small grid). */
export function townShadeAt(x, y, h) {
  let m = 0;
  for (const fy of [.02, .3, .6, .9]) for (const fx of [-.3, 0, .3]) m = Math.max(m, fieldAt(x + fx * h, y - fy * h));
  return m;
}

// ---------- drawing ----------
/** Ground shadows of every caster (call before the depth-sorted layer, after the terrain). */
export function drawTownShadows(ctx) {
  const m = ctx.getTransform?.(), plain = m && !m.b && !m.c && m.a && m.d;
  const x0 = plain ? -m.e / m.a : -1e9, y0 = plain ? -m.f / m.d : -1e9;
  const x1 = plain ? x0 + ctx.canvas.width / m.a : 1e9, y1 = plain ? y0 + ctx.canvas.height / m.d : 1e9;
  for (const level of ['soft', 'tight']) {
    ctx.fillStyle = ctx.strokeStyle = GROUND[level];
    for (const c of casters) {
      const reach = (c.kind === 'post' ? c.h : c.h * c.lift) * SUN.kx + (c.kind === 'post' ? c.crown : c.w);
      if (c.x + reach < x0 || c.x - reach > x1 || c.y + reach * .5 < y0 || c.y - (c.kind === 'post' ? c.h : c.h) > y1) continue;
      if (c.kind === 'sprite') {   // sprites are silhouettes in white: tint through alpha of a pre-multiplied colour pass
        ctx.save(); ctx.globalAlpha = level === 'soft' ? .3 : .38;
        paintTinted(ctx, c, level); ctx.restore();
      } else paintCaster(ctx, c, level, GROUND[level]);
    }
  }
}
// Silhouettes are baked white; tint them dark with one small scratch canvas per level instead of per-sprite colour variants.
const dark = new WeakMap();
function paintTinted(ctx, c, level) {
  const b = c.contour ? bakeContour(c, level) : null;
  if (b) {
    if (!b.dark) { const d = document.createElement('canvas'); d.width = b.canvas.width; d.height = b.canvas.height; const p = d.getContext('2d');
      if (p) { p.drawImage(b.canvas, 0, 0); p.globalCompositeOperation = 'source-in'; p.fillStyle = '#0e081a'; p.fillRect(0, 0, d.width, d.height); } b.dark = d; }
    ctx.drawImage(b.dark, c.x + b.x, c.y + b.y, b.w, b.h); return;
  }
  let per = dark.get(c.art); if (!per) { per = {}; dark.set(c.art, per); }
  if (!per[level]) {
    const s = silhouette(c.art, level), d = document.createElement('canvas'); d.width = s.width; d.height = s.height;
    const p = d.getContext('2d'); p.drawImage(s, 0, 0); p.globalCompositeOperation = 'source-in'; p.fillStyle = '#0e081a'; p.fillRect(0, 0, d.width, d.height);
    per[level] = d;
  }
  ctx.save();
  ctx.transform(1, 0, -SUN.kx * c.lift, -SUN.ky * c.lift, c.x, c.y);
  if (c.flip) { ctx.translate(c.left + c.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-(c.left + c.w / 2), 0); }
  ctx.drawImage(per[level], c.left, c.top, c.w, c.h);
  ctx.restore();
}

/** Soft ground shadow + contact blob of one actor (feet at x,y; height h). Drawn with the ground shadows. */
export function drawActorShadow(ctx, x, y, h) {
  const len = h * .62;
  ctx.save(); ctx.globalAlpha = .26;
  ctx.drawImage(ao(), x - h * .12, y - h * .06, h * .55 + len * .6, h * .17);   // long soft blob toward the lower right
  ctx.restore();
}

let layer = null, actorShade = true;
/** Test / tool hook: switch the actor darkening on or off (A/B screenshots). */
export const setActorShade = on => { actorShade = !!on; };
/** Draw an actor; if it stands in a building/tree shadow, darken the part that is shaded (no per-frame filters). */
export function withTownShade(ctx, x, y, h, draw) {
  if (!actorShade || !fieldAlpha || townShadeAt(x, y, h) < 24) return draw(ctx);
  const m = ctx.getTransform(); if (m.b || m.c || !m.a) return draw(ctx);
  const sc = m.a, bw = h * 1.5, bh = h * 1.4, left = x - bw / 2, top = y - h * 1.25;
  const pw = Math.ceil(bw * sc), ph = Math.ceil(bh * sc);
  if (pw > 1400 || ph > 1400 || pw < 2 || ph < 2) return draw(ctx);
  if (!layer) layer = document.createElement('canvas');
  if (layer.width < pw || layer.height < ph) { layer.width = Math.max(layer.width, pw); layer.height = Math.max(layer.height, ph); }
  const p = layer.getContext('2d'); p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-over';
  p.globalAlpha = 1; p.clearRect(0, 0, layer.width, layer.height); p.imageSmoothingEnabled = true;
  p.setTransform(sc, 0, 0, sc, -left * sc, -top * sc);
  const r = draw(p);
  p.setTransform(1, 0, 0, 1, 0, 0); p.globalCompositeOperation = 'source-atop'; p.globalAlpha = SHADE_ALPHA;
  p.drawImage(fieldTint, left * FIELD_RES, top * FIELD_RES, bw * FIELD_RES, bh * FIELD_RES, 0, 0, pw, ph);
  p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(layer, 0, 0, pw, ph, left, top, bw, bh); ctx.restore();
  return r;
}
