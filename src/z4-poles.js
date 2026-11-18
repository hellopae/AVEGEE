import {dischargePath,dischargeBranches,drawDischarge} from './electric-fx.js';
import {startupImage} from './town-startup.js';
import {Z4_POLE_ART,z4PoleArtRect} from './z4-pole-art.js';
import {Z4_POLES,Z4_WIRES} from './z4-poles-data.js?v=z4-poles';
import {LossMap,registerGpuLossReset} from './gpu-budget.js';
// Z4-POLES: electric poles, drooping wires and blue lightning over the Zone 4 town.
// Painted pole sprites share the original foot/cable anchors. Wires, lightning
// and actors keep their existing depth-sorted geometry; code art is a loading/error fallback.
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
    // Z4-WIRES (owner 15 Nov): every span hangs in a gentle catenary-like sag (5-13 % of its length), never a taut straight line.
    // The owner's markup stores a rough curvature (some of it inverted by the trace), so only its size is used, not its sign.
    const droop = chord * (.05 + Math.min(.16, Math.abs(sag)) * .5);
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
  return {runners:Math.max(2, Math.round(10 * area / Math.max(1, dpr / 1.5))), bolts:true, slotMs:width * height < 600000 ? 600 : 400, sparks:Math.max(1, Math.round(4 * area))};
}
const SPARK_LIFE = 170;   // ms a tip spark is visible
const BOLT_LIFE = 240;   // ms a bolt is visible; one bolt per slot, slot >= 400 ms => <= 2.5 flashes/s
/** Which sparks/bolts are active at `time`. Pure + deterministic. visiblePoles/visibleWires are index lists. */
export function z4Electric(time, {reduced = false, enabled = true, viewport = {}, visibleWires = [], visiblePoles = []} = {}) {
  const none = {runners:[], bolt:null, sparks:[]};
  if (reduced || !enabled) return none;
  const budget = z4ElectricBudget({...viewport, reduced});
  const out = {runners:[], bolt:null, sparks:[]};
  if (visibleWires.length) for (let k = 0; k < budget.runners; k++) {
    const period = 1700 + k * 230, shifted = time + k * 977, cycle = Math.floor(shifted / period), phase = (shifted % period) / period;
    if (phase > .5) continue;
    out.runners.push({wire:visibleWires[Math.floor(hash(k * 31 + cycle) * visibleWires.length)], u:phase / .5, k});
  }
  // Small crackles at the insulator tips: a few at a time, each ~170 ms, never more than `budget.sparks` visible together.
  if (visiblePoles.length) for (let k = 0; k < budget.sparks; k++) {
    const slotLen = 310 + k * 83, shifted = time + k * 531, slot = Math.floor(shifted / slotLen), into = shifted - slot * slotLen;
    if (hash(slot * 3 + k * 11 + .3) < .55 && into < SPARK_LIFE)
      out.sparks.push({pole:visiblePoles[Math.floor(hash(slot * 5 + k * 17 + 2) * visiblePoles.length)], side:hash(slot + k * 3.7) < .5 ? -1 : 1, age:into / SPARK_LIFE, seed:slot * 7 + k});
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
const BAKE = 2, bodies = new LossMap();
// T1c: the glow / violet sprites are blank after a GPU loss (the pole bodies live in a LossMap)
registerGpuLossReset('z4-poles', () => { glow = null; violet = null; });
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
let paintedPole=null,retryArtAt=0;
function poleArt(){
 const ready=startupImage(Z4_POLE_ART);if(ready)return ready;
 if(paintedPole)return paintedPole.complete&&paintedPole.naturalWidth>0?paintedPole:null;
 if(typeof Image==='undefined'||Date.now()<retryArtAt)return null;
 const im=new Image();paintedPole=im;
 im.onerror=()=>{if(paintedPole===im)paintedPole=null;retryArtAt=Date.now()+10000;};
 im.src=Z4_POLE_ART;return im.complete&&im.naturalWidth>0?im:null;
}
export function drawZ4Pole(ctx, pole, time = 0, still = false) {
  const {x, y, h, top, arm, variant} = pole;
  const pulse = still ? .75 : .72 + .25 * Math.sin(time / 520 + pole.i * 1.7);
  const painted=poleArt();
  if(painted){const r=z4PoleArtRect(pole);ctx.drawImage(painted,r.x,r.y,r.w,r.h);}
  else {
    const sp = bodySprite(pole);
    if (sp) ctx.drawImage(sp.cv, x - sp.padX, y - sp.hb - sp.up, sp.w, sp.h);
    else { ctx.save(); paintPoleBody(ctx, pole, x, y, .8); ctx.restore(); }
  }
  const gr = Math.max(8, h * .3), barY = top + h * .12, ih = Math.max(4, h * .12);
  for (const sd of [-1, 1]) halo(ctx, x + sd * arm, barY - ih * .5, gr, .3 * pulse);
  if (variant === 1) halo(ctx, x, top - h * .18, gr * .8, .32 * pulse);
}
// World units per device pixel (1 / camera scale). Cable widths are given in device pixels so a cable stays a fine line at every zoom, instead of
// being widened when the camera zooms out (that made the zoomed-out wires thick, grey and flat).
const pixel = ctx => { const a = ctx.getTransform?.()?.a; return a > 0 ? Math.min(4, Math.max(.5, 1 / a)) : 1; };
const lineScale = pixel;   // kept for the bolt / spark sizing below
let violet = null;
function violetSprite() {
  if (violet !== null) return violet;
  violet = false;
  if (typeof document === 'undefined') return violet;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), g = c?.createRadialGradient?.(32, 32, 0, 32, 32, 32);
  if (typeof g?.addColorStop !== 'function') return violet;
  g.addColorStop(0, 'rgba(236,224,255,1)'); g.addColorStop(.22, 'rgba(160,120,255,.6)'); g.addColorStop(1, 'rgba(100,80,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return violet = cv;
}
/** One cable: a soft contact shadow, a slim dark core, a 1-device-pixel highlight along its upper side and, while the line is live, a faint violet glow
 *  that breathes slowly. Painted cable art can replace this by drawing over/instead of it; the geometry (z4Layout) is unchanged. */
export function drawWire(ctx, w, still, k = 1, time = 0) {
  const px = pixel(ctx);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const path = (dy = 0) => { ctx.beginPath(); ctx.moveTo(w.x0, w.y0 + dy); ctx.quadraticCurveTo(w.cx, w.cy + dy, w.x1, w.y1 + dy); };
  if (!still) {   // live line: a wide, very faint violet halo that swells and fades along the span's own phase
    path(); ctx.strokeStyle = `rgba(132,104,255,${.05 + .035 * Math.sin(time / 640 + w.i * 1.9)})`; ctx.lineWidth = 3.4 * px; ctx.stroke();
  }
  path(1.4 * px); ctx.strokeStyle = 'rgba(0,0,10,.26)'; ctx.lineWidth = 1.5 * px; ctx.stroke();      // shadow on the ground side
  path(); ctx.strokeStyle = '#2a3150'; ctx.lineWidth = 1.2 * px; ctx.stroke();                         // core
  path(-.55 * px); ctx.strokeStyle = 'rgba(196,210,250,.72)'; ctx.lineWidth = .6 * px; ctx.stroke();    // light along the top
  // Small bronze sockets connect each span to the painted ceramic insulator.
  ctx.fillStyle = '#a99a70';
  for (const [x, y] of [[w.x0, w.y0], [w.x1, w.y1]]) { ctx.beginPath(); ctx.arc(x, y, .85 * px, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
/** A pulse of current running along a span: a comet tail from violet to white-blue, a glowing head, and a small crackle when it reaches the insulator. */
export function drawRunner(ctx, w, u) {
  const px = pixel(ctx), fade = Math.min(1, u * 10, (1 - u) * 6);
  if (fade <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  const N = 9, span = .085;
  for (let i = N; i > 0; i--) {
    const f = i / N, a = z4WirePoint(w, Math.max(0, u - f * span)), b = z4WirePoint(w, Math.max(0, u - (f - 1 / N) * span));
    ctx.globalAlpha = fade * Math.pow(1 - f, 1.3) * .85;
    ctx.strokeStyle = f < .35 ? '#dff4ff' : f < .65 ? '#8ab8ff' : '#7a5cff';
    ctx.lineWidth = (.55 + (1 - f) * 1.15) * px;
    ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
  }
  const [x, y] = z4WirePoint(w, u), vs = violetSprite();
  if (vs) { ctx.globalAlpha = fade * .6; ctx.drawImage(vs, x - 8 * px, y - 8 * px, 16 * px, 16 * px); }
  halo(ctx, x, y, 5 * px, fade * .5);
  ctx.globalAlpha = fade; ctx.fillStyle = '#f4fbff'; ctx.beginPath(); ctx.arc(x, y, .9 * px, 0, Math.PI * 2); ctx.fill();
  // tiny forked corona beside the head
  const tangent = z4WirePoint(w, Math.min(1, u + .005)), angle = Math.atan2(tangent[1] - y, tangent[0] - x), j = Math.floor(u * 26);
  for (const side of [-1, 1]) {
    const length = (2 + hash(j + side + w.i) * 3) * Math.sqrt(px), nx = Math.cos(angle + side * 1.25), ny = Math.sin(angle + side * 1.25);
    ctx.strokeStyle = '#b9a6ff'; ctx.globalAlpha = fade * .6; ctx.lineWidth = .5 * px;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx * length * .45 - ny, y + ny * length * .45 + nx); ctx.lineTo(x + nx * length, y + ny * length); ctx.stroke();
  }
  // arrival: a few short crackles flick off the insulator
  if (u > .9) {
    const e = (u - .9) / .1, [ex, ey] = z4WirePoint(w, 1), cyc = Math.floor(w.i * 7 + u * 3);
    ctx.globalAlpha = fade * (1 - e) * .9; ctx.strokeStyle = '#d8ccff'; ctx.lineWidth = .6 * px;
    ctx.beginPath();
    for (let n = 0; n < 4; n++) { const ang = -Math.PI * (.1 + .8 * hash(w.i + n * 3.3 + cyc)), len = (2 + 5 * e) * px * (.6 + hash(n + w.i * 1.7)); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(ang) * len, ey + Math.sin(ang) * len); }
    ctx.stroke();
  }
  ctx.restore();
}
/** A crackle at one insulator tip of a pole: a hot dot, a few short forked arcs, a violet-blue flash that dies in ~170 ms. */
export function drawZ4Spark(ctx, pole, side, age, seed) {
  if (age < 0 || age >= 1) return;
  const px = pixel(ctx), sx = pole.x + side * pole.arm, sy = pole.top + pole.h * .12 - Math.max(4, pole.h * .12) * .9, power = Math.pow(1 - age, 1.4);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  halo(ctx, sx, sy, 9 * px, power * .55);
  ctx.strokeStyle = '#d9ccff'; ctx.lineWidth = .7 * px; ctx.globalAlpha = power;
  ctx.beginPath();
  for (let n = 0; n < 4; n++) {
    const ang = -Math.PI * (.05 + .9 * hash(seed + n * 2.7)), len = (3 + 7 * hash(seed + n * 5.1 + 1)) * px * (.5 + age);
    const mx = sx + Math.cos(ang) * len * .5 + (hash(seed + n) - .5) * 2 * px, my = sy + Math.sin(ang) * len * .5;
    ctx.moveTo(sx, sy); ctx.lineTo(mx, my); ctx.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len);
  }
  ctx.stroke();
  ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(sx, sy, .8 * px, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}
/** Local insulator discharge with pinned origin and feathered branching tips. */
export function drawZ4Bolt(ctx, pole, age, seed, k = 1) {
  const side=hash(seed*13.7)<.5?-1:1,sx=pole.x+side*pole.arm,sy=pole.top+pole.h*.12-Math.max(4,pole.h*.12)*.65;
  const length=(25+hash(seed+1)*20)*Math.sqrt(k),end=[sx+side*length*.55,sy-length*.78];
  const path=dischargePath([sx,sy],end,seed,5*Math.sqrt(k));
  drawDischarge(ctx,path,dischargeBranches(path,seed,3*Math.sqrt(k)),age,k);
  ctx.save();ctx.globalCompositeOperation='lighter';halo(ctx,sx,sy,14*Math.sqrt(k),.4*Math.pow(Math.max(0,1-age),2));ctx.restore();
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
    at(w.depth, () => { drawWire(ctx, w, still, k, time); for (const u of runners.get(i) || []) drawRunner(ctx, w, u); });
  }
  for (const sp of fx.sparks) { const p = poles[sp.pole]; at(p.y + 2, () => drawZ4Spark(ctx, p, sp.side, sp.age, sp.seed)); }
  if (fx.bolt) { const p = poles[fx.bolt.pole]; at(p.y + 2, () => drawZ4Bolt(ctx, p, fx.bolt.age, fx.bolt.seed, k)); }
  return {poles:vp.length, wires:vw.length, runners:fx.runners.length, sparks:fx.sparks.length, bolt:!!fx.bolt};
}
