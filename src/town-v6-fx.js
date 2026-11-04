// Z1-LAYOUT-B2: HD-2D atmosphere for Zone 1 on the layered map (town-v6.js).
// Everything animated is a DRAWN sprite sheet (Kittanate / Codex FX-ART-Z1 run, img/map-zone1/v6/fx/*.webp) played frame by frame:
// river + lava tiles, lava bubbles / fall, foam, sparkle, mist / steam, torch flame, embers, leaves, snowflakes, light shafts, dust.
// Code only moves, clips and blends them; it never recolours or filters the drawn art. The sky clouds are the owner's cloud sprites.
// Where things go is DATA (src/town-v6-fx-data.js, scripts/build-zone1-fx.py): liquid regions come from ok.jpg + the terrain alpha holes,
// mist zones are liquid + bank minus the walk floor, so lava / mist never land on the plaza, buildings or trees.
import { FX_Z1 as F } from './town-v6-fx-data.js';
import { TOWN_V6 as D } from './town-v6-data.js';
import { img } from './art.js';

const W = D.world.w, H = D.world.h;
const key = s => 'v6:' + s;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; };
const hash = (a, b = 0) => { const x = Math.sin(a * 127.1 + b * 311.7 + 17.3) * 43758.5453; return x - Math.floor(x); };
const store = () => { try { return globalThis.window?.localStorage ?? globalThis.localStorage ?? null; } catch { return null; } };

// ---------------------------------------------------------------- settings: quality low / medium / high, flicker on / off
export const FX_LEVELS = Object.freeze(['low', 'medium', 'high']);
const LV = Object.freeze({
  low:    { dof: 0, dofScale: 0,   bloom: 0, objBlur: 0, leaves: 6,  flakes: 6,  sparkle: 6,  bubbles: 3, foam: 3, mist: 2, steam: 2, embers: 0, rays: 1, dust: 0, shadows: 2, grade: 0, glow: 0, clouds: 2 },
  medium: { dof: 1, dofScale: .22, bloom: 0, objBlur: 1, leaves: 20, flakes: 16, sparkle: 12, bubbles: 6, foam: 5, mist: 4, steam: 4, embers: 3, rays: 3, dust: 2, shadows: 4, grade: 1, glow: 1, clouds: 4 },
  high:   { dof: 1, dofScale: .3,  bloom: 1, objBlur: 1, leaves: 44, flakes: 30, sparkle: 26, bubbles: 8, foam: 8, mist: 7, steam: 6, embers: 4, rays: 3, dust: 2, shadows: 5, grade: 1, glow: 1, clouds: 5 },
});
const defaultLevel = () => {
  try { const mq = globalThis.matchMedia; if (mq && (mq('(pointer: coarse)').matches || mq('(max-width: 820px)').matches)) return 'medium'; } catch {}
  return 'high';
};
let level = (() => { const v = store()?.getItem('avegee.fxq'); return FX_LEVELS.includes(v) ? v : defaultLevel(); })();
let flicker = store()?.getItem('avegee.fxflicker') !== 'off';
export const fxQuality = () => level;
export const fxLevelBudget = l => ({ ...LV[l] });
export function setFxQuality(q) { if (!FX_LEVELS.includes(q)) return; level = q; try { store()?.setItem('avegee.fxq', q); } catch {} }
export const fxFlicker = () => flicker;
export function setFxFlicker(on) { flicker = !!on; try { store()?.setItem('avegee.fxflicker', on ? 'on' : 'off'); } catch {} }
const L = () => LV[level];

// ---------------------------------------------------------------- the fx clock: stops with pause / hidden tab / reduced motion
let clock = 0, lastRaw = null, frozen = false, stats = { drawn: 0, level };
/** Call once per frame before drawing. `raw` = the scene time (ms). Time only advances while the game runs and the tab is visible. */
export function tickTownV6Fx(raw, paused = false, reduced = false) {
  const hidden = typeof document !== 'undefined' && document.hidden;
  frozen = !!paused || !!reduced || !!hidden;
  if (lastRaw != null && !frozen) clock += clamp(raw - lastRaw, 0, 100);   // a long gap (tab switch, breakpoint) never jumps the animation
  lastRaw = raw;
}
export const townV6FxClock = () => clock;
export const townV6FxFrozen = () => frozen;
export function resetTownV6FxClock(v = 0) { clock = v; lastRaw = null; }

// ---------------------------------------------------------------- sheets
const sheetOf = id => F.sheets[id];
const sheetImg = id => img(key(sheetOf(id).src));
/** Draw one drawn frame of a sheet into (x,y,w,h). `off` offsets the frame counter so copies do not play in lockstep. Returns false while not decoded. */
function blit(ctx, id, x, y, w, h, off = 0, alpha = 1, tMs = clock) {
  const s = sheetOf(id), im = sheetImg(id); if (!im) return false;
  const n = s.order.length, i = ((Math.floor(tMs / 1000 * s.fps + off) % n) + n) % n, f = s.order[i];
  const prev = ctx.globalAlpha; ctx.globalAlpha = prev * alpha;
  ctx.drawImage(im, f * s.fw, 0, s.fw, s.fh, x, y, w, h); ctx.globalAlpha = prev; return true;
}
/** Slow cloud morph: two neighbouring DRAWN frames of the cloud sheet, mixed at runtime (the art itself has no fade frames). */
function blitMorph(ctx, id, x, y, w, h, rate, off, alpha = 1) {
  const s = sheetOf(id), im = sheetImg(id); if (!im) return false;
  const n = s.order.length, pos = clock / 1000 * rate + off, i = Math.floor(pos), k = pos - i;
  const a = s.order[((i % n) + n) % n], b = s.order[(((i + 1) % n) + n) % n], prev = ctx.globalAlpha;
  ctx.globalAlpha = prev * alpha * (1 - k * k * (3 - 2 * k)); ctx.drawImage(im, a * s.fw, 0, s.fw, s.fh, x, y, w, h);
  ctx.globalAlpha = prev * alpha * k * k * (3 - 2 * k); ctx.drawImage(im, b * s.fw, 0, s.fw, s.fh, x, y, w, h);
  ctx.globalAlpha = prev; return true;
}
export const fxSheetUrls = () => Object.values(F.sheets).map(s => s.src);
/** Sheets that must be ready at boot (the two tiles cover whole regions: no pop-in when the camera arrives). */
export const fxBootUrls = () => ['spirit-river', 'lava-surface'].map(i => sheetOf(i).src);

// ---------------------------------------------------------------- regions (Path2D built lazily, bbox for culling)
const paths = new Map(), boxes = new Map();
function polyBox(polys) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of polys) for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); } return [x0, y0, x1 - x0, y1 - y0]; }
function regionPath(name) {
  if (paths.has(name)) return paths.get(name);
  let p = null;
  if (typeof Path2D !== 'undefined') { p = new Path2D(); for (const poly of F.regions[name]) { p.moveTo(poly[0], poly[1]); for (let i = 2; i < poly.length; i += 2) p.lineTo(poly[i], poly[i + 1]); p.closePath(); } }
  paths.set(name, p); return p;
}
const regionBox = name => boxes.get(name) || (boxes.set(name, polyBox(F.regions[name])), boxes.get(name));
const hits = (v, [x, y, w, h], pad = 0) => !(x > v.x1 + pad || x + w < v.x0 - pad || y > v.y1 + pad || y + h < v.y0 - pad);
const inView = (v, x, y, pad = 0) => x >= v.x0 - pad && x <= v.x1 + pad && y >= v.y0 - pad && y <= v.y1 + pad;
export const fxRegion = name => F.regions[name];
export function pointInRegion(name, x, y) {      // even-odd, for tests / evidence
  let c = false;
  for (const p of F.regions[name]) { let inside = false; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const xi = p[i], yi = p[i + 1], xj = p[j], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside; } if (inside) c = !c; }
  return c;
}

// ---------------------------------------------------------------- sky: owner's clouds drift + parallax, far drawn clouds, mountains
const CLOUD_V = [15, 9, 12];                                  // world units / second for the owner's three cloud sprites (smaller / farther = slower)
const PAR = { sky: .9, cloud: .78, farCloud: .86, mountains: .97 };
const FAR_CLOUDS = [                                          // Codex clouds are small: far, thin extras between the owner's clouds
  { id: 'cloud-far-01', x: 760, y: 215, w: 560, v: 7, rate: .30, par: PAR.farCloud, alpha: .8 },
  { id: 'cloud-far-02', x: 2250, y: 255, w: 640, v: 6, rate: .26, par: PAR.farCloud, alpha: .8 },
  { id: 'cloud-03',     x: 3120, y: 120, w: 520, v: 10, rate: .30, par: PAR.cloud, alpha: .75 },
];
const WRAP_PAD = 760;                                         // clouds wrap well outside any camera x + parallax offset
const wrapX = (x0, w, v, t) => { const span = W + w + 2 * WRAP_PAD, min = -w - WRAP_PAD; return ((((x0 - min) + v * t / 1000) % span) + span) % span + min; };
/** Left edge of the cloud now (drift only, before parallax). Shadows read the same function, so shadow and cloud move together. */
export const cloudX = (i, tMs = clock) => { const c = D.clouds[i]; return wrapX(c.box[0], c.box[2], CLOUD_V[i] || 10, tMs); };
const parOff = (v, p) => (v.x0 - (W - (v.x1 - v.x0)) / 2) * (1 - p);   // 0 when the camera is centred; `p` = share of the ground speed
export const parallaxOffset = parOff;

export function drawSkyBase(ctx, sky, rect, v) {
  const sk = 1 + 2 * (1 - PAR.sky) * W / 2 / W + .02, w = rect[2] * sk;       // stretched a touch so the parallax shift never shows an edge
  ctx.drawImage(sky, rect[0] + rect[2] / 2 - w / 2 + parOff(v, PAR.sky), rect[1], w, rect[3]);
}
export function drawSkyClouds(ctx, v, record = true) {
  const q = L();
  D.clouds.forEach((c, i) => {
    const im = img(key(c.src)); if (!im) return;
    const x = cloudX(i), off = parOff(v, PAR.cloud);
    if (x + off > v.x1 + 40 || x + off + c.box[2] < v.x0 - 40) return;
    ctx.save(); ctx.translate(x - c.box[0] + off, 0); ctx.transform(c.m[0], c.m[3], c.m[1], c.m[4], c.m[2], c.m[5]); ctx.drawImage(im, 0, 0); ctx.restore();
  });
  if (!record) return;
  FAR_CLOUDS.forEach((c, i) => {
    if (i >= q.clouds - 2) return;                      // low: none, medium: 2, high: 3
    const x = wrapX(c.x, c.w, c.v, clock) + parOff(v, c.par), h = c.w * sheetOf(c.id).fh / sheetOf(c.id).fw;
    if (x > v.x1 + 40 || x + c.w < v.x0 - 40) return;
    blitMorph(ctx, c.id, x, c.y - h / 2, c.w, h, c.rate, i * 1.7, c.alpha);
  });
}
export const mountainShift = v => parOff(v, PAR.mountains);

// ---------------------------------------------------------------- liquids: tiles clipped to the data regions, then point sprites
function tileSheet(ctx, id, bb, v, tw, th, tMs) {
  const s = sheetOf(id), im = sheetImg(id); if (!im) return false;
  const n = s.order.length, f = s.order[Math.floor(tMs / 1000 * s.fps) % n];
  const x0 = Math.max(bb[0], v.x0), x1 = Math.min(bb[0] + bb[2], v.x1), y0 = Math.max(bb[1], v.y0), y1 = Math.min(bb[1] + bb[3], v.y1);
  if (x1 <= x0 || y1 <= y0) return true;
  const c0 = Math.floor(x0 / tw), c1 = Math.ceil(x1 / tw), r0 = Math.floor(y0 / th), r1 = Math.ceil(y1 / th);
  for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) {
    const x = c * tw, y = r * th;
    if (r & 1) { ctx.save(); ctx.translate(0, 2 * y + th); ctx.scale(1, -1); ctx.drawImage(im, f * s.fw, 0, s.fw, s.fh, x, y, tw + .7, th + .7); ctx.restore(); }   // mirrored rows: the drawn tile only promises to tile in x
    else ctx.drawImage(im, f * s.fw, 0, s.fw, s.fh, x, y, tw + .7, th + .7);
  }
  return true;
}
const pts = name => F.points[name] || [];
export function drawFxLiquid(ctx, v) {
  const q = L(), P = regionPath('water'), PL = regionPath('lava');
  if (P && hits(v, regionBox('water'))) {
    ctx.save(); ctx.clip(P, 'evenodd');
    tileSheet(ctx, 'spirit-river', regionBox('water'), v, 768, 384, clock);
    pts('foam').slice(0, q.foam).forEach(([x, y], i) => { if (inView(v, x, y, 300)) blit(ctx, "river-foam", x - 190, y - 66, 380, 152, i * 1.3, .85); });
    ctx.globalCompositeOperation = 'screen';
    pts('sparkle').slice(0, q.sparkle).forEach(([x, y], i) => { if (inView(v, x, y, 120)) blit(ctx, 'water-sparkle', x - 80, y - 40, 160, 80, i * 2.1, .9); });
    ctx.restore();
  }
  if (PL && hits(v, regionBox('lava'))) {
    ctx.save(); ctx.clip(PL, 'evenodd');
    tileSheet(ctx, 'lava-surface', regionBox('lava'), v, 480, 288, clock);
    if (q.glow) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .65; tileSheet(ctx, 'lava-surface', regionBox('lava'), v, 480, 288, clock); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }   // the same drawn frames again, screened: ok.jpg's lava glows brighter than the plain sheet
    pts('lavaBubble').slice(0, q.bubbles).forEach(([x, y], i) => { if (inView(v, x, y, 140)) blit(ctx, 'lava-bubble', x - 56, y - 56, 112, 112, i * 1.7); });
    pts('lavaFall').forEach(([x, y]) => { if (inView(v, x, y, 240)) blit(ctx, 'lava-fall-left', x - 80, y - 235, 160, 250, 0); });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- ground phase: mist / steam (only above liquid + bank), pools of light round the fire
function drawMistSet(ctx, v, zone, name, id, w, count, spd, alpha, seed) {
  const P = regionPath(zone); if (!P || !count) return;
  const s = sheetOf(id), h = w * s.fh / s.fw; let started = false;
  pts(name).slice(0, count).forEach(([px, py], i) => {
    if (!inView(v, px, py, w)) return;
    if (!started) { ctx.save(); ctx.clip(P, 'evenodd'); started = true; }
    const ph = clock / 1000 * spd + seed + i * 2.3;
    const x = px + Math.sin(ph) * w * .22, y = py - h * .25 + Math.sin(ph * .7 + i) * h * .08;
    blit(ctx, id, x - w / 2, y - h / 2, w, h, i * 1.9, alpha * (.75 + .25 * Math.sin(ph * 1.3 + i)));
  });
  if (started) ctx.restore();
}
const flick = (i, t = clock) => .75 + .25 * Math.sin(t / 1000 * (5.3 + i * .9) + i * 4.1) * Math.sin(t / 1000 * 2.7 + i) + .12 * Math.sin(t / 1000 * 11 + i * 2);
export function drawFxGround(ctx, v) {
  const q = L();
  drawMistSet(ctx, v, 'mistWater', 'waterMist', 'river-mist', 600, q.mist, .09, Math.min(1, sheetOf('river-mist').alpha * 1.35), 0);
  drawMistSet(ctx, v, 'mistLava', 'lavaSteam', 'lava-steam', 430, q.steam, .12, sheetOf('lava-steam').alpha, 3);
  drawMistSet(ctx, v, 'mistIce', 'iceMist', 'ice-mist', 420, Math.min(q.mist, 3), .1, sheetOf('ice-mist').alpha, 5);
  if (q.glow && flicker) {                                                   // warm pools of light on the ground round every flame
    ctx.save(); ctx.globalCompositeOperation = 'screen';
    F.torches.forEach(([x, y], i) => {
      if (!inView(v, x, y, 260)) return;
      const big = i === 3 ? 2.4 : 1, r = 150 * big, a = .2 * flick(i) * (i === 3 ? 1.3 : 1);
      const g = ctx.createRadialGradient(x, y + 70 * big, 6, x, y + 70 * big, r);
      g.addColorStop(0, `rgba(255,170,70,${a})`); g.addColorStop(.5, `rgba(255,120,40,${a * .4})`); g.addColorStop(1, 'rgba(255,100,30,0)');
      ctx.fillStyle = g; ctx.fillRect(x - r, y + 70 * big - r, r * 2, r * 2);
    });
    ctx.restore();
  }
}

// ---------------------------------------------------------------- over phase: leaves / snow, flames, embers, light shafts, dust, cloud shadows, grade
const LEAF = { maple: 'leaf-maple', gold: 'leaf-gold', green: 'leaf-green', snow: 'snowflake' };
const treeKind = label => /snow|crystal/.test(label) ? 'snow' : /maple|sapling/.test(label) ? 'maple' : /golden/.test(label) ? 'gold' : 'green';
let emitters = null;
function buildEmitters() {
  emitters = D.objects.filter(o => o.cat === 'tree').map((o, i) => {
    const [x, y, w, h] = o.box, kind = treeKind(o.label || '');
    return { i, kind, x: x + w * .16, w: w * .68, top: y + h * .16, bottom: y + h * .62, foot: y + h - 6, size: clamp(w / 230, .9, 1.9) };
  });
}
export const fxEmitterCount = () => (emitters || (buildEmitters(), emitters)).length;
function drawLeaves(ctx, v) {
  const q = L(); if (!emitters) buildEmitters();
  const near = emitters.filter(e => hits(v, [e.x - 200, e.top - 80, e.w + 400, e.foot - e.top + 160])).sort((a, b) => (a.x + a.w / 2 - (v.x0 + v.x1) / 2) ** 2 - (b.x + b.w / 2 - (v.x0 + v.x1) / 2) ** 2);
  let budgetLeaf = q.leaves, budgetSnow = q.flakes;
  const t = clock / 1000;
  for (const e of near) {
    const snow = e.kind === 'snow';
    if ((snow ? budgetSnow : budgetLeaf) <= 0) continue;
    const per = e.size > 1.4 ? 2 : 1;
    for (let k = 0; k < per && (snow ? budgetSnow : budgetLeaf) > 0; k++) {
      const life = snow ? 11 + hash(e.i, k) * 4 : 7 + hash(e.i, k + 9) * 3, ph = t / life + hash(e.i * 3 + k, 5), cyc = Math.floor(ph), u = ph - cyc;
      const sx = e.x + hash(e.i + cyc * 7.1, k + 1) * e.w, sy = e.top + hash(e.i - cyc * 3.7, k + 2) * (e.bottom - e.top), gy = e.foot + hash(e.i, cyc + k) * 40;
      const x = sx + u * (snow ? 60 : 90) + Math.sin(u * 9 + e.i + k) * (snow ? 20 : 16), y = sy + (gy - sy) * u;
      const a = smooth(0, .08, u) * (1 - smooth(.82, 1, u));
      if (a <= .01 || !inView(v, x, y, 40)) continue;
      const sz = (snow ? 17 : 30) * e.size * (.85 + hash(e.i, k + 4) * .3);
      blit(ctx, LEAF[e.kind], x - sz / 2, y - sz / 2, sz, sz, hash(e.i, k) * 6 + t * 7, a, 0);
      if (snow) budgetSnow--; else budgetLeaf--;
      // `blit` with tMs=0 plus the offset: frame = (offset) -> each leaf spins at its own rate through its drawn flip frames
    }
  }
}
function drawFlames(ctx, v) {
  const q = L();
  F.torches.forEach(([x, y, w, h], i) => {
    if (!inView(v, x, y, 160)) return;
    const k = i === 3 ? 3.2 : 1.45, fw = w * k, fh = h * k * 1.25;
    blit(ctx, 'torch-flame', x - fw / 2, y - fh * .95, fw, fh, i * 2.7);
  });
  if (q.embers) pts('embers').slice(0, q.embers).forEach(([x, y], i) => { if (inView(v, x, y, 160)) blit(ctx, 'embers-ash', x - 70, y - 190, 140, 175, i * 1.1, .9); });
}
function drawShafts(ctx, v) {
  const q = L(); if (!q.rays) return;
  const prevOp = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  F.rays.slice(0, q.rays).forEach(([x, y, w, h], i) => {
    if (!hits(v, [x, y, w, h])) return;
    const id = 'god-ray-0' + (i + 1), breathe = .8 + .2 * Math.sin(clock / 1000 * .5 + i * 2);
    blit(ctx, id, x, y, w, h, i * .7, sheetOf(id).alpha * 1.1 * breathe);
  });
  if (q.dust) F.dust.slice(0, q.dust).forEach(([x, y, w, h], i) => {
    if (!hits(v, [x - 80, y - 80, w + 160, h + 160])) return;
    const ph = clock / 1000 * .12 + i * 3;
    blit(ctx, 'air-dust', x + Math.sin(ph) * 40, y + Math.cos(ph * .8) * 30, w, w * 1.0, i * 1.3, sheetOf('air-dust').alpha);
  });
  ctx.globalCompositeOperation = prevOp;
}

// cloud shadows: soft silhouettes of the owner's cloud sprite, drifting at the SAME speed + direction as the sky clouds (cloudX), kept off the sky
let shadowTile = null, shadowTried = false;
function shadowSprite() {
  if (shadowTile || shadowTried) return shadowTile;
  const src = img(key(D.clouds[0].src)); if (!src) return null;
  shadowTried = true; if (typeof document === 'undefined') return null;
  const w = 160, h = Math.round(160 * src.naturalHeight / src.naturalWidth) + 16, a = document.createElement('canvas'); a.width = w; a.height = h;
  const c = a.getContext('2d'); c.imageSmoothingQuality = 'high'; c.drawImage(src, 8, 8, w - 16, h - 16);
  c.globalCompositeOperation = 'source-in'; c.fillStyle = '#1b1030'; c.fillRect(0, 0, w, h);          // the cloud's own outline, flat dark
  const b = document.createElement('canvas'); b.width = 40; b.height = Math.max(8, Math.round(h / 4)); const bc = b.getContext('2d'); bc.imageSmoothingQuality = 'high'; bc.drawImage(a, 0, 0, b.width, b.height);
  const s = document.createElement('canvas'); s.width = 80; s.height = b.height * 2; const sc = s.getContext('2d'); sc.imageSmoothingQuality = 'high'; sc.drawImage(b, 0, 0, s.width, s.height);
  return shadowTile = s;
}
const SHADOWS = [   // cloud index (owner's clouds) | far cloud, ground lane (y), sun offset x, size
  { c: 0, y: 1130, dx: 380, w: 1500, h: 520, a: .42 },
  { c: 1, y: 1650, dx: 300, w: 1150, h: 430, a: .38 },
  { c: 2, y: 790,  dx: 420, w: 1750, h: 560, a: .42 },
  { c: 0, y: 2050, dx: 1900, w: 1050, h: 380, a: .32, lag: 2900 },
  { c: 2, y: 1400, dx: 1500, w: 1250, h: 420, a: .32, lag: 2200 },
];
export const cloudShadowRects = (tMs = clock) => SHADOWS.slice(0, L().shadows).map(s => {
  const c = D.clouds[s.c], x = wrapX(c.box[0] + (s.lag || 0), c.box[2], CLOUD_V[s.c], tMs) + c.box[2] / 2 + s.dx - 0 ;
  return { x: x - s.w / 2, y: s.y - s.h / 2, w: s.w, h: s.h, a: s.a };
});
// The shadows are painted into a small layer (1 px = 8 world units), cut by the ground mask (never over the sky), then laid over the world once, soft.
const SH_K = 8; let shLayer = null, shMask = null;
function shadowLayers() {
  if (shLayer || typeof document === 'undefined') return shLayer;
  shLayer = mk(W / SH_K, H / SH_K); shMask = mk(W / SH_K, H / SH_K);
  const m = shMask.getContext('2d'), P = regionPath('ground'); if (P) { m.scale(1 / SH_K, 1 / SH_K); m.fillStyle = '#000'; m.fill(P, 'evenodd'); }
  return shLayer;
}
function drawCloudShadows(ctx, v) {
  const tile = shadowSprite(), layer = shadowLayers(); if (!tile || !layer) return;
  const rects = cloudShadowRects().filter(r => hits(v, [r.x, r.y, r.w, r.h])); if (!rects.length) return;
  const c = layer.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, layer.width, layer.height);
  for (const r of rects) { c.globalAlpha = r.a; c.drawImage(tile, r.x / SH_K, r.y / SH_K, r.w / SH_K, r.h / SH_K); }
  c.globalAlpha = 1; c.globalCompositeOperation = 'destination-in'; c.drawImage(shMask, 0, 0); c.globalCompositeOperation = 'source-over';
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  const x0 = Math.max(0, Math.floor(v.x0 / SH_K) - 1), y0 = Math.max(0, Math.floor(v.y0 / SH_K) - 1), x1 = Math.min(layer.width, Math.ceil(v.x1 / SH_K) + 1), y1 = Math.min(layer.height, Math.ceil(v.y1 / SH_K) + 1);
  ctx.drawImage(layer, x0, y0, x1 - x0, y1 - y0, x0 * SH_K, y0 * SH_K, (x1 - x0) * SH_K, (y1 - y0) * SH_K);
  ctx.restore();
}
const GRADES = [{ x: 260, y: 1050, r: 1250, rgb: '255,92,28', a: .34 }, { x: 3480, y: 880, r: 1200, rgb: '110,185,255', a: .34 }];   // lava side warm red / ice side cool blue
function drawGrade(ctx, v) {
  if (!L().grade) return;
  ctx.save(); ctx.globalCompositeOperation = 'overlay';
  for (const g of GRADES) {
    if (!hits(v, [g.x - g.r, g.y - g.r, g.r * 2, g.r * 2])) continue;                  // only where the glow reaches the screen: a full-screen blend is the costly part
    const x0 = Math.max(v.x0, g.x - g.r), y0 = Math.max(v.y0, g.y - g.r), x1 = Math.min(v.x1, g.x + g.r), y1 = Math.min(v.y1, g.y + g.r);
    const gr = ctx.createRadialGradient(g.x, g.y, 80, g.x, g.y, g.r); gr.addColorStop(0, `rgba(${g.rgb},${g.a})`); gr.addColorStop(1, `rgba(${g.rgb},0)`);
    ctx.fillStyle = gr; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  }
  ctx.restore();
}
/** Everything that sits on top of the depth-sorted objects (called by scene.js right after the queue). */
export function drawFxOver(ctx, v) {
  const q = L();
  drawLeaves(ctx, v); drawFlames(ctx, v); drawShafts(ctx, v);
  drawCloudShadows(ctx, v);
  drawGrade(ctx, v);
  stats = { level, leaves: q.leaves, shadows: q.shadows };
}

// ---------------------------------------------------------------- depth of field (tilt-shift) + soft bloom, cached at low resolution
let bufA = null, bufB = null, bufC = null, dofFrame = 0, dofFocus = 0;
let dofStats = { on: false, ms: 0 };
export const townV6DofStats = () => ({ ...dofStats });
/** The blurred picture (1/4 -> 1/8 -> back up) is rebuilt every other frame and faded in by distance from the character's screen y;
 *  the sharp band is never drawn over, only the soft top and bottom strips are. focusScreenY = device px y of the character. */
export function drawFxDof(ctx, focusScreenY) {
  const q = L(); const cv = ctx.canvas; dofStats = { on: false, ms: 0 };
  if ((!q.dof && !q.bloom) || typeof document === 'undefined' || cv.width < 300) return;
  const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
  const cw = cv.width, ch = cv.height, s = q.dofScale || .25, bw = Math.round(cw * s), bh = Math.round(ch * s);
  if (!bufA || bufA.width !== bw || bufA.height !== bh) { bufA = mk(bw, bh); bufB = mk(Math.round(bw / 2), Math.round(bh / 2)); bufC = mk(bw, bh); dofFrame = 0; }
  const rebuild = (dofFrame++ & 1) === 0 || frozen;
  const fy = clamp(focusScreenY, ch * .2, ch * .8) * s, band = ch * s * .17, fade = ch * s * .3;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  if (rebuild) {
    const a = bufA.getContext('2d'), b = bufB.getContext('2d'), c = bufC.getContext('2d');
    a.globalCompositeOperation = 'copy'; a.imageSmoothingEnabled = true; a.imageSmoothingQuality = 'medium'; a.drawImage(cv, 0, 0, bw, bh);
    b.globalCompositeOperation = 'copy'; b.imageSmoothingEnabled = true; b.drawImage(bufA, 0, 0, bufB.width, bufB.height);
    c.globalCompositeOperation = 'copy'; c.imageSmoothingEnabled = true; c.drawImage(bufB, 0, 0, bw, bh);
    if (q.bloom) {                                                       // bloom: the blur multiplied by itself keeps only the bright parts
      a.globalCompositeOperation = 'copy'; a.drawImage(bufC, 0, 0); a.globalCompositeOperation = 'multiply'; a.drawImage(bufC, 0, 0); a.globalCompositeOperation = 'source-over';
    }
    if (q.dof) {
      c.globalCompositeOperation = 'destination-in';
      const g = c.createLinearGradient(0, 0, 0, bh), st = (y, al) => g.addColorStop(clamp(y / bh, 0, 1), `rgba(0,0,0,${al})`);
      st(0, 1); st(fy - band - fade, .8); st(fy - band, 0); st(fy + band, 0); st(fy + band + fade * .8, .85); st(bh, 1);
      c.fillStyle = g; c.fillRect(0, 0, bw, bh); c.globalCompositeOperation = 'source-over';
    }
    dofFocus = fy;
  }
  if (q.bloom) { ctx.globalCompositeOperation = 'screen'; ctx.globalAlpha = .55; ctx.drawImage(bufA, 0, 0, cw, ch); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (q.dof) {                                                           // only the two soft strips; the band round the character keeps the sharp frame
    const top = Math.max(0, Math.ceil((dofFocus - band) / s)), bot = Math.max(0, Math.floor((dofFocus + band) / s));
    if (top > 0) ctx.drawImage(bufC, 0, 0, bw, Math.ceil(top * s), 0, 0, cw, top);
    if (bot < ch) ctx.drawImage(bufC, 0, Math.floor(bot * s), bw, bh - Math.floor(bot * s), 0, bot, cw, ch - bot);
  }
  ctx.restore();
  dofStats = { on: true, ms: (typeof performance !== 'undefined' ? performance.now() : 0) - t0, scale: s };
}

// ---------------------------------------------------------------- near-camera objects: blurred copies of the sprite (cached), mixed in by distance below the focus
const blurCache = new Map();
function blurredSprite(o, im) {
  if (blurCache.has(o.id)) return blurCache.get(o.id);
  if (typeof document === 'undefined') return null;
  const f = 10, pad = 2, w = Math.max(2, Math.ceil(im.naturalWidth / f) + pad * 2), h = Math.max(2, Math.ceil(im.naturalHeight / f) + pad * 2);
  const c = mk(w, h), x = c.getContext('2d'); x.imageSmoothingQuality = 'high';
  const mid = mk(Math.max(2, Math.ceil(w / 2)), Math.max(2, Math.ceil(h / 2))), m = mid.getContext('2d'); m.imageSmoothingQuality = 'high';
  m.drawImage(im, pad / 2, pad / 2, mid.width - pad, mid.height - pad); x.drawImage(mid, 0, 0, w, h);
  const rec = { c, pad, f }; blurCache.set(o.id, rec); return rec;
}
/** 0 = sharp ... 1 = fully blurred. Objects whose foot is well below the character's are nearer the camera. */
export const frontBlurAmount = (depth, focusY) => smooth(300, 800, depth - focusY);
export function drawObjectBlurred(ctx, o, im, amount) {
  const rec = blurredSprite(o, im); if (!rec) return false;
  ctx.save(); ctx.transform(o.m[0], o.m[3], o.m[1], o.m[4], o.m[2], o.m[5]);
  if (amount < .98) { ctx.globalAlpha = 1 - amount * .85; ctx.drawImage(im, 0, 0); }
  ctx.globalAlpha = amount;
  const k = rec.f; ctx.drawImage(rec.c, -rec.pad * k, -rec.pad * k, rec.c.width * k, rec.c.height * k);
  ctx.restore(); return true;
}
export const fxObjBlurEnabled = () => !!L().objBlur;
export const townV6FxStats = () => ({ ...stats, clock, frozen, level, flicker });
