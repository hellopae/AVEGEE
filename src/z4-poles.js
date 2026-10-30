import {Z4_POLES,Z4_WIRES} from './z4-poles-data.js?v=z4-poles';
// Z4-POLES: electric poles, drooping wires and blue lightning over the Zone 4 town.
// Poles are painted in code (drawZ4Pole). To swap in real art later, replace ONLY drawZ4Pole's body
// (it gets x/y of the pole foot, its height in world px and the variant 0/1); layout, depth sorting and
// lightning do not change. Wires/lightning are drawn in the same depth-sorted layer pass as the actors.
export const Z4_WORLD = Object.freeze({w:3840,h:2560});
export const Z4_POLE_COUNT = Z4_POLES.length, Z4_WIRE_COUNT = Z4_WIRES.length;
const frac = n => n - Math.floor(n);
const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const quad = (a, c, b, t) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * c + t * t * b;

let layout = null;
/** World-space geometry, built once. Pure data, no canvas. */
export function z4Layout() {
  if (layout) return layout;
  const {w:W,h:H} = Z4_WORLD;
  const poles = Z4_POLES.map(([x,y,h],i) => {
    const ph = Math.max(20, h * H);
    return {i, x:x * W, y:y * H, h:ph, top:y * H - ph, arm:Math.max(8, ph * .3), variant:i % 2};
  });
  const wires = Z4_WIRES.map(([a,b,sag],i) => {
    const pa = poles[a], pb = poles[b], sa = pb.x >= pa.x ? 1 : -1;
    // Each wire hangs from the crossbar tip that faces its partner.
    const x0 = pa.x + sa * pa.arm, y0 = pa.top + pa.h * .12, x1 = pb.x - sa * pb.arm, y1 = pb.top + pb.h * .12;
    const chord = Math.hypot(x1 - x0, y1 - y0);
    const droop = Math.max(.03, sag) * chord;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + 2 * droop;
    const minX = Math.min(x0, x1, cx), maxX = Math.max(x0, x1, cx), minY = Math.min(y0, y1), maxY = Math.max(y0, y1, cy);
    return {i, a, b, x0, y0, x1, y1, cx, cy, chord, minX, maxX, minY, maxY, depth:(pa.y + pb.y) / 2};
  });
  return layout = {poles, wires};
}
export const z4WirePoint = (w, t) => [quad(w.x0, w.cx, w.x1, t), quad(w.y0, w.cy, w.y1, t)];

/** Electricity budget from the CSS viewport. Phones get a few runners; reduced motion gets none. */
export function z4ElectricBudget({width = 1440, height = 900, dpr = 1, reduced = false} = {}) {
  if (reduced) return {runners:0, bolts:false, slotMs:Infinity};
  const area = Math.min(1, width * height / (1440 * 900));
  return {runners:Math.max(2, Math.round(10 * area / Math.max(1, dpr / 1.5))), bolts:true, slotMs:width * height < 600000 ? 600 : 400};
}
const BOLT_LIFE = 140;   // ms a bolt is visible; one bolt per slot, slot >= 400 ms => <= 2.5 flashes/s
/** Which sparks/bolts are active at `time`. Pure + deterministic. visiblePoles/visibleWires are index lists. */
export function z4Electric(time, {reduced = false, enabled = true, viewport = {}, visibleWires = [], visiblePoles = []} = {}) {
  const none = {runners:[], bolt:null};
  if (reduced || !enabled) return none;
  const budget = z4ElectricBudget({...viewport, reduced});
  const out = {runners:[], bolt:null};
  if (visibleWires.length) for (let k = 0; k < budget.runners; k++) {
    const period = 1700 + k * 230, shifted = time + k * 977, cycle = Math.floor(shifted / period), phase = (shifted % period) / period;
    if (phase > .5) continue;
    out.runners.push({wire:visibleWires[Math.floor(hash(k * 31 + cycle) * visibleWires.length)], u:phase / .5, k});
  }
  if (budget.bolts && visiblePoles.length) {
    const slot = Math.floor(time / budget.slotMs), into = time - slot * budget.slotMs;
    if (hash(slot + .5) < .62 && into < BOLT_LIFE)
      out.bolt = {pole:visiblePoles[Math.floor(hash(slot * 7 + 3) * visiblePoles.length)], age:into / BOLT_LIFE, seed:slot};
  }
  return out;
}

let glow = null;
function glowSprite() {
  if (glow !== null) return glow;
  glow = false;
  if (typeof document === 'undefined') return glow;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), g = c?.createRadialGradient?.(32, 32, 0, 32, 32, 32);
  if (typeof g?.addColorStop !== 'function') return glow;
  g.addColorStop(0, 'rgba(190,240,255,1)'); g.addColorStop(.25, 'rgba(90,190,255,.55)'); g.addColorStop(1, 'rgba(70,120,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return glow = cv;
}
function halo(ctx, x, y, r, alpha) {
  const s = glowSprite(); if (!s || alpha <= 0) return;
  ctx.globalAlpha = Math.min(1, alpha); ctx.drawImage(s, x - r, y - r, r * 2, r * 2); ctx.globalAlpha = 1;
}

/** Placeholder art for one pole body: black metal, gold collars, insulators, neon. (x,y) = foot. Replace paintPoleBody + the sprite bake with a real drawing. */
function paintPoleBody(ctx, pole, x, y, pulse) {
  const {h, arm, variant} = pole, w = Math.max(4.5, h * .13), top = y - h;
  ctx.fillStyle = 'rgba(0,0,0,.32)'; ctx.beginPath(); ctx.ellipse(x, y + 1, w * 1.7, w * .6, 0, 0, 7); ctx.fill();
  // plinth + tapered shaft
  ctx.fillStyle = '#17131f'; ctx.fillRect(x - w * .95, y - h * .07, w * 1.9, h * .07);
  ctx.fillStyle = '#7a5a1c'; ctx.fillRect(x - w * .95, y - h * .07, w * 1.9, 1.2);
  ctx.fillStyle = '#0d0a14';
  ctx.beginPath(); ctx.moveTo(x - w * .62, y - h * .06); ctx.lineTo(x - w * .4, top); ctx.lineTo(x + w * .4, top); ctx.lineTo(x + w * .62, y - h * .06); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#2b2440'; ctx.fillRect(x - w * .42, top + 2, w * .22, h * .9);
  // gold collars
  ctx.fillStyle = '#c9a24a';
  for (const f of [.2, .58]) ctx.fillRect(x - w * .62, y - h * f, w * 1.24, Math.max(1.6, h * .035));
  // crossbar
  const barY = top + h * .12;
  ctx.fillStyle = '#0d0a14'; ctx.fillRect(x - arm, barY - w * .3, arm * 2, w * .6);
  ctx.fillStyle = '#c9a24a'; ctx.fillRect(x - arm, barY - w * .3, arm * 2, 1.2);
  // insulators
  const ih = Math.max(4, h * .12);
  for (const sd of [-1, 1]) {
    const ix = x + sd * arm;
    ctx.fillStyle = `rgba(150,225,255,${.65 + pulse * .3})`; ctx.fillRect(ix - 1.6, barY - ih, 3.2, ih);
    ctx.fillStyle = '#e9fbff'; ctx.fillRect(ix - .6, barY - ih, 1.2, ih * .8);
  }
  if (variant === 0) { // neon strip down the shaft
    ctx.fillStyle = `rgba(110,210,255,${pulse * .85})`; ctx.fillRect(x - .7, top + h * .2, 1.4, h * .55);
  } else {             // violet spire + coil rings
    ctx.fillStyle = '#0d0a14'; ctx.beginPath(); ctx.moveTo(x - w * .3, top); ctx.lineTo(x, top - h * .2); ctx.lineTo(x + w * .3, top); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(200,140,255,${pulse})`; ctx.fillRect(x - 1.4, top - h * .2, 2.8, 2.8);
    ctx.fillStyle = `rgba(180,120,255,${pulse * .8})`;
    for (const f of [.36, .44, .52]) ctx.fillRect(x - w * .5, y - h * f, w, 1.2);
  }
}
// The static body is baked once per (variant, height bucket) into a small canvas and blitted; only the glow pulses per frame.
const BAKE = 2, bodies = new Map();
function bodySprite(pole) {
  const hb = Math.max(20, Math.round(pole.h / 3) * 3), key = pole.variant + ':' + hb + ':' + Math.round(pole.arm);
  let e = bodies.get(key); if (e !== undefined) return e;
  bodies.set(key, e = null);
  if (typeof document === 'undefined') return e;
  const proto = {...pole, h:hb, x:0, y:0}, padX = Math.ceil(pole.arm + 6), up = Math.ceil(hb * .25 + 4), down = 6;
  const cv = document.createElement('canvas'); cv.width = padX * 2 * BAKE; cv.height = (hb + up + down) * BAKE;
  const c = cv.getContext('2d'); if (!c) return e;
  c.scale(BAKE, BAKE); paintPoleBody(c, proto, padX, up + hb, .8);
  return bodies.set(key, e = {cv, padX, up, w:padX * 2, h:hb + up + down, hb}).get(key);
}
export function drawZ4Pole(ctx, pole, time = 0, still = false) {
  const {x, y, h, top, arm, variant} = pole;
  const pulse = still ? .75 : .72 + .25 * Math.sin(time / 520 + pole.i * 1.7);
  const sp = bodySprite(pole);
  if (sp) ctx.drawImage(sp.cv, x - sp.padX, y - sp.hb - sp.up, sp.w, sp.h);
  else { ctx.save(); paintPoleBody(ctx, pole, x, y, .8); ctx.restore(); }
  const gr = Math.max(8, h * .3), barY = top + h * .12, ih = Math.max(4, h * .12);
  for (const sd of [-1, 1]) halo(ctx, x + sd * arm, barY - ih * .5, gr, .3 * pulse);
  if (variant === 1) halo(ctx, x, top - h * .18, gr * .8, .32 * pulse);
}
// Thin lines vanish when the camera is zoomed out (phones): widen them so they stay >= ~1.2 device px.
const lineScale = ctx => { const a = ctx.getTransform?.()?.a; return a > 0 ? Math.min(3, Math.max(1, 1.2 / a)) : 1; };
function drawWire(ctx, w, still, k = 1) {
  ctx.beginPath(); ctx.moveTo(w.x0, w.y0); ctx.quadraticCurveTo(w.cx, w.cy, w.x1, w.y1);
  ctx.lineCap = 'round';
  ctx.strokeStyle = `rgba(70,170,255,${still ? .26 : .2})`; ctx.lineWidth = 5 * k; ctx.stroke();
  ctx.strokeStyle = 'rgba(8,8,22,.95)'; ctx.lineWidth = 2 * k; ctx.stroke();
  if (k > 1.5) return;   // zoomed out (phones): glow + dark core only, one stroke less per wire
  ctx.strokeStyle = `rgba(140,225,255,${still ? .55 : .42})`; ctx.lineWidth = 1 * k; ctx.stroke();
}
function drawRunner(ctx, w, u) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const t = Math.max(0, u - i * .035), [x, y] = z4WirePoint(w, t);
    halo(ctx, x, y, (10 - i * 1.7) * Math.sqrt(lineScale(ctx)), (1 - i * .22) * .85);
    ctx.fillStyle = `rgba(235,252,255,${1 - i * .25})`; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  ctx.restore();
}
/** Short forked bolt from a pole's insulator. Local to the pole: never a full-screen flash. */
export function drawZ4Bolt(ctx, pole, age, seed, k = 1) {
  const s = seed * 13.7, fade = age < .5 ? 1 : 1 - (age - .5) * 2;
  const side = hash(s) < .5 ? -1 : 1, sx = pole.x + side * pole.arm, sy = pole.top + pole.h * .12 - Math.max(4, pole.h * .12);
  const len = (34 + hash(s + 1) * 30) * Math.sqrt(k), segs = 6;
  const path = [[sx, sy]];
  let px = sx, py = sy, ang = -Math.PI / 2 + side * (.3 + hash(s + 2) * .9);
  for (let i = 1; i <= segs; i++) {
    ang += (hash(s + 10 + i) - .5) * 1.5;
    px += Math.cos(ang) * len / segs; py += Math.sin(ang) * len / segs; path.push([px, py]);
  }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineJoin = 'round';
  halo(ctx, sx, sy, 24 * Math.sqrt(k), .5 * fade);
  const stroke = pts => { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
  const branches = [];
  for (let b = 0; b < 2; b++) {
    const at = path[2 + b], a = ang + (b ? 1 : -1) * (.6 + hash(s + 30 + b) * .6);
    branches.push([at, [at[0] + Math.cos(a) * len * .35, at[1] + Math.sin(a) * len * .35 + 4], [at[0] + Math.cos(a + .6) * len * .5, at[1] + Math.sin(a + .6) * len * .45 + 7]]);
  }
  ctx.strokeStyle = `rgba(150,110,255,${.55 * fade})`; ctx.lineWidth = 6 * k; stroke(path); for (const br of branches) stroke(br);
  ctx.strokeStyle = `rgba(190,240,255,${.95 * fade})`; ctx.lineWidth = 2.2 * k; stroke(path);
  ctx.lineWidth = 1.3 * k; for (const br of branches) stroke(br);
  ctx.strokeStyle = `rgba(255,255,255,${fade})`; ctx.lineWidth = 1 * k; stroke(path);
  ctx.restore();
}

function viewRect(ctx) {
  const m = ctx.getTransform?.();
  if (!m || m.b || m.c || !m.a || !m.d) return null;
  return [-m.e / m.a, -m.f / m.d, (ctx.canvas.width - m.e) / m.a, (ctx.canvas.height - m.f) / m.d];
}
/** Adds this frame's visible poles, wires, sparks and bolt to the depth-sorted layer list `at(y, fn)`. */
export function addZ4PoleLayers(at, ctx, time, {reduced = false, enabled = true, viewport} = {}) {
  const {poles, wires} = z4Layout(), v = viewRect(ctx), pad = 70;
  const inView = (x0, y0, x1, y1) => !v || !(x1 + pad < v[0] || x0 - pad > v[2] || y1 + pad < v[1] || y0 - pad > v[3]);
  const vp = [], vw = [];
  for (const p of poles) if (inView(p.x - p.arm, p.top - p.h * .25, p.x + p.arm, p.y)) vp.push(p.i);
  for (const w of wires) if (inView(w.minX, w.minY, w.maxX, w.maxY)) vw.push(w.i);
  const still = reduced || !enabled, k = lineScale(ctx);
  const fx = z4Electric(time, {reduced, enabled, viewport:viewport || {width:ctx.canvas?.clientWidth || 1440, height:ctx.canvas?.clientHeight || 900, dpr:globalThis.devicePixelRatio || 1}, visibleWires:vw, visiblePoles:vp});
  const runners = new Map(); for (const r of fx.runners) (runners.get(r.wire) || runners.set(r.wire, []).get(r.wire)).push(r.u);
  for (const i of vp) { const p = poles[i]; at(p.y, () => drawZ4Pole(ctx, p, time, still)); }
  for (const i of vw) {
    const w = wires[i];
    at(w.depth, () => { drawWire(ctx, w, still, k); for (const u of runners.get(i) || []) drawRunner(ctx, w, u); });
  }
  if (fx.bolt) { const p = poles[fx.bolt.pole]; at(p.y + 2, () => drawZ4Bolt(ctx, p, fx.bolt.age, fx.bolt.seed, k)); }
  return {poles:vp.length, wires:vw.length, runners:fx.runners.length, bolt:!!fx.bolt};
}
