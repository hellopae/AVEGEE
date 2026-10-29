import { SKILL_FX } from './combat-skill-assets.js';
// M2: battle effect engine — one canvas over the arena, a pooled particle system and a recipe per move (see battle-fx-map.js).
// Performance rules: single canvas, no ctx.filter / shadowBlur, <= MAX_PARTICLES live particles, requestAnimationFrame only while
// something is playing. Camera: shake/dim/focus go through the adapter below (M1 camera plugs in with setBattleCamera()).
import { texCell, preloadTex, setTexSuffix, TEX_KEYS } from './battle-fx-tex.js?v=m2';
import { recipeFor, slashColorOf, RECIPE_IDS, RECIPE_META, powerVisual } from './battle-fx-map.js?v=m2';

export const MAX_PARTICLES = 300;
/** quality knobs (tests / low-end tuning): canvas pixel-ratio cap, built-in shake and dim fallbacks */
export const FX_TUNE = { dprCap:2, shake:true, dim:true };
const TAU = Math.PI * 2;
const FONT = '"IBM Plex Sans Thai","Sarabun","Noto Sans Thai",system-ui,sans-serif';
let manualT = null;   // lab/test only: fxAdvance() drives a virtual clock so frames can be captured deterministically
const now = () => manualT !== null ? manualT : (typeof performance !== 'undefined' ? performance.now() : Date.now());

// ---------------------------------------------------------------- math / easing
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp = (a, b, k) => a + (b - a) * k;
const ease = {
  lin: k => k, out: k => 1 - (1 - k) ** 3, in: k => k * k, in3: k => k * k * k, io: k => k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2,
  back: k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * (k - 1) ** 3 + c1 * (k - 1) ** 2; },
};
/** value of a prop at time k in 0..1: number | fn(k) | [from, to, easeName] */
const val = (p, k) => typeof p === 'number' ? p : typeof p === 'function' ? p(k) : Array.isArray(p) ? lerp(p[0], p[1], (ease[p[2]] || ease.lin)(k)) : 0;
/** piecewise-linear envelope: kf([[0,0],[.2,1],[1,0]]) */
const kf = pts => k => { if (k <= pts[0][0]) return pts[0][1]; for (let i = 1; i < pts.length; i++) if (k <= pts[i][0]) { const [k0, v0] = pts[i - 1], [k1, v1] = pts[i]; return lerp(v0, v1, (k - k0) / (k1 - k0 || 1)); } return pts[pts.length - 1][1]; };
const env = (inK, outK) => kf([[0, 0], [inK, 1], [outK, 1], [1, 0]]);
const rnd = (a = 0, b = 1) => a + Math.random() * (b - a);
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------------------------------------------------------------- engine state
const E = {
  stage:null, canvas:null, ctx:null, dimEl:null, w:0, h:0, dpr:1, items:[], sched:[], raf:0, last:0,
  shake:null, dim:null, camera:null, reduce:false, started:false,
  stats:{ frames:0, sumMs:0, maxMs:0, peakParticles:0, peakItems:0, plays:0 },
  styleDone:false, res:1, ema:16.7, slow:0, fast:0,
};
const P = Array.from({ length:MAX_PARTICLES }, () => ({ on:false }));
let pCursor = 0, pLive = 0;

function ensureStyle() {
  if (E.styleDone || typeof document === 'undefined') return;
  E.styleDone = true;
  const s = document.createElement('style');
  s.textContent = `.arena.fx-handled .fig .fx,.arena.fx-handled .dmg.foe,.arena.fx-handled .dmg.you{display:none!important}
.fx-layer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8}
.fx-dim{position:absolute;inset:0;pointer-events:none;background:#07030a;opacity:0;will-change:opacity;contain:strict}`;
  document.head.appendChild(s);
}

/** Put the canvas (and the dim layer) into the freshly painted arena. Safe to call after every paint; running effects continue. */
export function attachBattleFx(stage) {
  if (!stage || typeof document === 'undefined') return;
  ensureStyle(); setTexSuffix('?v=m3');
  if (!E.canvas) {
    E.canvas = document.createElement('canvas'); E.canvas.className = 'fx-layer'; E.canvas.setAttribute('aria-hidden', 'true');
    E.ctx = E.canvas.getContext('2d');
    E.dimEl = document.createElement('div'); E.dimEl.className = 'fx-dim'; E.dimEl.setAttribute('aria-hidden', 'true');
    E.reduce = !!(typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  E.stage = stage;
  // With the M1 camera the canvas lives in the camera's world-space fx layer (it zooms/pans with the scene) and the camera owns dim/shake/flash.
  const host = E.camera?.layer ? E.camera.layer('fx') : null;
  if (host) { if (E.dimEl.parentNode) E.dimEl.remove(); if (E.canvas.parentNode !== host) host.appendChild(E.canvas); }
  else {
    if (E.dimEl.parentNode !== stage) stage.insertBefore(E.dimEl, stage.firstChild);
    if (E.canvas.parentNode !== stage) stage.appendChild(E.canvas);
  }
  sizeCanvas(!E.sized); E.sized = true;   // resizing clears the bitmap — only when the size really changed or the canvas is new
  prewarm();
  if (E.items.length || E.sched.length || pLive || E.shake || E.dim) wake();
}

/** Build every stand-in texture in small idle slices (a few per tick) so the first effect never hitches on texture creation. Once per page. */
let warmed = false;
function prewarm() {
  if (warmed) return; warmed = true;
  const keys = TEX_KEYS.slice(); let i = 0;
  const slice = () => { const t0 = now(); while (i < keys.length && now() - t0 < 6) texCell(keys[i++], 0); if (i < keys.length) setTimeout(slice, 40); };
  setTimeout(slice, 300);
}

function sizeCanvas(force) {
  const st = E.stage; if (!st || !E.canvas) return;
  const cs = E.camera?.size ? E.camera.size() : null;
  const w = (cs && cs.w) || st.clientWidth || 1, h = (cs && cs.h) || st.clientHeight || 1;
  let dpr = Math.min(FX_TUNE.dprCap, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1);
  dpr *= E.res;   // adaptive resolution: drops below 1 only when frames run long (see frame())
  while (w * h * dpr * dpr > 2.6e6 && dpr > .5) dpr -= .1;
  if (!force && w === E.w && h === E.h && dpr === E.dpr) return;
  E.w = w; E.h = h; E.dpr = dpr;
  E.canvas.width = Math.round(w * dpr); E.canvas.height = Math.round(h * dpr);
}

/** Drop everything (battle ended / dialog closed). */
export function stopBattleFx() {
  E.items.length = 0; E.sched.length = 0; for (const p of P) p.on = false; pLive = 0;
  if (E.raf) cancelAnimationFrame(E.raf); E.raf = 0;
  if (E.ctx) E.ctx.clearRect(0, 0, E.canvas.width, E.canvas.height);
  if (E.stage) { E.stage.style.translate = ''; E.stage.style.willChange = ''; }
  if (E.dimEl) E.dimEl.style.opacity = '0';
  E.shake = null; E.dim = null;
}
export const fxStats = () => ({ ...E.stats, live:pLive, items:E.items.length, avgMs:E.stats.frames ? E.stats.sumMs / E.stats.frames : 0, avgWorkMs:E.stats.frames ? (E.stats.workMs || 0) / E.stats.frames : 0, active:!!E.raf });
export const resetFxStats = () => { E.stats = { frames:0, sumMs:0, maxMs:0, peakParticles:0, peakItems:0, plays:0, log:[] }; };
export const fxResolution = () => E.res;
export const fxIdle = () => !E.raf && !E.items.length && !E.sched.length && !pLive;

// ---------------------------------------------------------------- camera adapter
/** M1 camera plugs in here: api = { focus(point,{zoom,ms}), shake(power,ms), dim(alpha,ms), release() } (any subset). Missing methods use the built-in fallback. */
export function setBattleCamera(api) { E.camera = api || null; if (E.canvas && E.stage) attachBattleFx(E.stage); }
export const hasBattleCamera = () => !!E.camera;
/** stage-local, zoom-1 rect of an element via the camera (only meaningful while a camera is set) */
export const cameraRectOf = el => { const r = E.camera?.rectOf?.(el); return r ? { l:r.left, t:r.top, r:r.right, b:r.bottom } : null; };
const cam = {
  // When the M1 camera is present its cue() already shakes / dims / flashes at the impact moment (docs §5.1) — M2 must not fight it.
  shake(power, ms) {
    if (E.camera || E.reduce || !FX_TUNE.shake) return;
    E.shake = { p:power, t0:now(), ms }; if (E.stage) E.stage.style.willChange = 'translate'; wake();   // own compositor layer while shaking: translate then costs no repaint
  },
  dim(alpha, ms) {
    if (E.camera || !FX_TUNE.dim) return;
    E.dim = { a:alpha * (E.reduce ? .5 : 1), t0:now(), ms }; wake();
  },
  flash(color, alpha, ms, delay = 0) {
    const go = () => E.camera?.flash ? E.camera.flash({ color, alpha, ms }) : add({ kind:'rect', color, dur:ms, a:kf([[0, 0], [.07, alpha], [1, 0]]) });
    if (delay > 0) at(delay, go); else go();
  },
};

// ---------------------------------------------------------------- items, schedule, particles
function wake() { if (manualT === null && !E.raf && E.canvas) { E.last = now(); E.raf = requestAnimationFrame(frame); } }
/** lab/test: advance the virtual clock by ms (in 16 ms steps), rendering every step. Switches the engine to manual time on first call. */
export function fxAdvance(ms, step = 16) {
  if (manualT === null) { manualT = (typeof performance !== 'undefined' ? performance.now() : 0); E.last = manualT; if (E.raf) cancelAnimationFrame(E.raf); E.raf = 0; }
  for (let t = 0; t < ms; t += step) { manualT += Math.min(step, ms - t); E.raf = 0; frame(manualT); }
}
const T0 = () => now();
/** add a timed layer. kind: 'spr' | 'rect' | 'num' */
function add(o) { o.t0 = T0() + (o.delay || 0); o.dur = Math.max(16, o.dur || 400); E.items.push(o); if (E.items.length > E.stats.peakItems) E.stats.peakItems = E.items.length; wake(); return o; }
function at(ms, fn) { if (ms <= 0) fn(); else { E.sched.push({ at:T0() + ms, fn }); wake(); } }
/** one particle. o: tex,cell,x,y,vx,vy,ax,ay,drag,rot,vr,s0,s1,a (peak alpha),life,env('out'|'pop'),blend,sway */
function emit(o) {
  if (pLive >= MAX_PARTICLES) return false;
  for (let n = 0; n < MAX_PARTICLES; n++) {
    const p = P[(pCursor + n) % MAX_PARTICLES];
    if (!p.on) {
      Object.assign(p, { on:true, x:0, y:0, vx:0, vy:0, ax:0, ay:0, drag:0, rot:0, vr:0, s0:12, s1:4, a:1, life:600, age:0, env:'out', blend:null, cell:0, sway:0, ph:Math.random() * TAU }, o);
      p.age = -(o.delay || 0); pCursor = (pCursor + n + 1) % MAX_PARTICLES; pLive++; wake(); return true;
    }
  }
  return false;
}
function updateParticles(c, dt) {
  const k = dt / 1000, dpr = E.dpr; let live = 0;
  for (const p of P) {
    if (!p.on) continue;
    p.age += dt; if (p.age < 0) { live++; continue; }
    if (p.age >= p.life) { p.on = false; continue; }
    live++;
    if (p.drag) { const f = Math.max(0, 1 - p.drag * k); p.vx *= f; p.vy *= f; }
    p.vx += p.ax * k; p.vy += p.ay * k; p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k;
    const u = p.age / p.life, a = p.a * (p.env === 'pop' ? Math.sin(Math.PI * u) ** .6 : p.env === 'in' ? Math.min(1, u * 5) * (1 - u) : (1 - u) ** 1.4);
    if (a < .01) continue;
    const tx = texCell(p.tex, p.cell); if (!tx) continue;
    const s = lerp(p.s0, p.s1, u), cos = Math.cos(p.rot), sin = Math.sin(p.rot), px = p.x + (p.sway ? Math.sin(p.age / 180 + p.ph) * p.sway : 0);
    c.globalAlpha = a > 1 ? 1 : a; c.globalCompositeOperation = p.blend || tx.blend;
    c.setTransform(cos * dpr, sin * dpr, -sin * dpr, cos * dpr, px * dpr, p.y * dpr);
    const asp = tx.sw / tx.sh;
    c.drawImage(tx.src, tx.sx, tx.sy, tx.sw, tx.sh, -s * asp / 2, -s / 2, s * asp, s);
  }
  pLive = live; if (live > E.stats.peakParticles) E.stats.peakParticles = live;
}

function drawItem(c, o, k) {
  const dpr = E.dpr;
  if (o.kind === 'rect') {
    const a = val(o.a, k); if (a <= .004) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.globalAlpha = Math.min(1, a * (E.reduce ? .4 : 1)); c.globalCompositeOperation = o.blend || 'lighter';
    c.fillStyle = o.color; c.fillRect(0, 0, E.w, E.h); return;
  }
  if (o.kind === 'num') { drawNum(c, o, k); return; }
  const tx = texCell(o.tex, o.cell | 0); if (!tx) return;
  const a = val(o.a, k); if (a <= .004) return;
  const w = val(o.w, k), h = val(o.h, k), x = val(o.x, k), y = val(o.y, k), rot = val(o.rot || 0, k), sx = o.sx === undefined ? 1 : val(o.sx, k), sy = o.sy === undefined ? 1 : val(o.sy, k);
  const cos = Math.cos(rot), sin = Math.sin(rot), ax = o.ax ?? .5, ay = o.ay ?? .5, fl = o.flip ? -1 : 1;
  c.globalAlpha = a > 1 ? 1 : a; c.globalCompositeOperation = o.blend || tx.blend;
  if (o.sq === undefined) c.setTransform(cos * sx * fl * dpr, sin * sx * fl * dpr, -sin * sy * dpr, cos * sy * dpr, x * dpr, y * dpr);
  else { const q = val(o.sq, k); c.setTransform(cos * sx * dpr, q * sin * sx * dpr, -sin * sy * dpr, q * cos * sy * dpr, x * dpr, y * dpr); }   // sq = screen-space y squash (a turning ground circle)
  c.drawImage(tx.src, tx.sx, tx.sy, tx.sw, tx.sh, -w * ax, -h * ay, w, h);
}
function drawNum(c, o, k) {
  const pop = k < .18 ? ease.back(k / .18) : 1, a = k < .08 ? k / .08 : k > .72 ? 1 - (k - .72) / .28 : 1;
  const rise = ease.out(Math.min(1, k * 1.4)) * o.rise, sc = (.35 + .65 * pop) * (k > .72 ? 1 - (k - .72) * .25 : 1) * (1 + .12 * Math.sin(Math.min(1, k * 3) * Math.PI));
  const dpr = E.dpr;
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = clamp(a);
  c.setTransform(dpr * sc, 0, 0, dpr * sc, o.x * dpr, (o.y - rise) * dpr);
  c.rotate(o.tilt * (1 - pop * .5)); c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.font = `italic 800 ${o.size}px ${FONT}`;
  c.lineWidth = o.size * .2; c.strokeStyle = 'rgba(30,8,18,.92)'; c.strokeText(o.text, 0, 0);
  const g = c.createLinearGradient(0, -o.size * .5, 0, o.size * .5); g.addColorStop(0, o.c0); g.addColorStop(1, o.c1);
  c.lineWidth = o.size * .06; c.strokeStyle = o.edge; c.strokeText(o.text, 0, 0); c.fillStyle = g; c.fillText(o.text, 0, 0);
  if (o.label) {
    c.setTransform(dpr * sc, 0, 0, dpr * sc, o.x * dpr, (o.y - rise - o.size * .78) * dpr); c.rotate(o.tilt * .5);
    c.font = `italic 800 ${o.size * .42}px ${FONT}`; c.lineWidth = o.size * .1; c.strokeStyle = 'rgba(30,8,18,.92)'; c.strokeText(o.label, 0, 0);
    c.fillStyle = o.labelColor; c.fillText(o.label, 0, 0);
  }
}

function frame(t) {
  const w0 = now();
  E.raf = 0;
  if (!E.canvas || !E.canvas.isConnected) { E.raf = 0; return; }
  const dt = Math.min(64, Math.max(0, t - E.last)); E.last = t;
  if (dt > 0) {
    E.stats.frames++; E.stats.sumMs += dt; if (dt > E.stats.maxMs) E.stats.maxMs = dt;
    if (manualT === null && dt < 120) {   // adaptive resolution: sustained slow frames -> render the canvas at lower pixel ratio (never touches game timing)
      E.ema = E.ema * .92 + dt * .08;
      if (E.ema > 26 && E.res > .55) { if (++E.slow > 14) { E.res = Math.max(.55, E.res - .15); E.slow = 0; E.ema = 20; sizeCanvas(true); E.stats.resDrops = (E.stats.resDrops || 0) + 1; } } else E.slow = 0;
    }
  }
  sizeCanvas(false);
  const c = E.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, E.canvas.width, E.canvas.height);
  const tn = now();
  if (E.sched.length) { const due = E.sched.filter(s => s.at <= tn); if (due.length) { E.sched = E.sched.filter(s => s.at > tn); for (const s of due) s.fn(); } }
  const items = E.items;
  for (let i = items.length - 1; i >= 0; i--) { if ((tn - items[i].t0) / items[i].dur >= 1) items.splice(i, 1); }
  for (const o of items) { const k = (tn - o.t0) / o.dur; if (k >= 0 && k < 1) drawItem(c, o, k); }
  updateParticles(c, dt);
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.setTransform(1, 0, 0, 1, 0, 0);
  // fallback camera: shake (CSS `translate` composes with any transform the real camera sets) and dim (a layer under the figures)
  if (E.shake) {
    const u = (tn - E.shake.t0) / E.shake.ms;
    if (u >= 1) { E.shake = null; E.stage.style.translate = ''; E.stage.style.willChange = ''; }
    else { const m = E.shake.p * (1 - u) ** 1.5; E.stage.style.translate = `${((Math.random() - .5) * 2 * m).toFixed(1)}px ${((Math.random() - .5) * 2 * m).toFixed(1)}px`; }
  }
  if (E.dim && E.dimEl) {
    const u = (tn - E.dim.t0) / E.dim.ms;
    if (u >= 1) { E.dim = null; E.dimEl.style.opacity = '0'; }
    else E.dimEl.style.opacity = (E.dim.a * kf([[0, 0], [.15, 1], [.7, 1], [1, 0]])(u)).toFixed(3);
  }
  E.stats.workMs = (E.stats.workMs || 0) + (now() - w0); if (now() - w0 > (E.stats.maxWorkMs || 0)) E.stats.maxWorkMs = now() - w0;
  if (manualT === null && (items.length || E.sched.length || pLive || E.shake || E.dim)) E.raf = requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- geometry helpers
/** rect {l,t,r,b} (stage-local px) -> body info */
const body = r => ({ x:(r.l + r.r) / 2, y:(r.t + r.b) / 2, w:r.r - r.l, h:r.b - r.t, feet:r.b, top:r.t, l:r.l, r:r.r });
const spr = (tex, o) => add({ kind:'spr', tex, ...o });
const sparks = (tex, x, y, n, o = {}) => {
  for (let i = 0; i < n; i++) {
    const a = o.arc ? o.arc[0] + Math.random() * (o.arc[1] - o.arc[0]) : Math.random() * TAU, sp = rnd(o.v?.[0] ?? 120, o.v?.[1] ?? 340);
    emit({ tex, cell:(Math.random() * 4) | 0, x:x + rnd(-1, 1) * (o.spread || 0), y:y + rnd(-1, 1) * (o.spread || 0), vx:Math.cos(a) * sp, vy:Math.sin(a) * sp, drag:o.drag ?? 2.2, ay:o.g ?? 160,
      s0:rnd(o.s?.[0] ?? 10, o.s?.[1] ?? 20), s1:o.s1 ?? 2, life:rnd(o.life?.[0] ?? 380, o.life?.[1] ?? 700), vr:rnd(-4, 4), a:o.a ?? 1, delay:o.delay || 0 });
  }
};
const numberAt = (t, text, o = {}) => add({ kind:'num', text:String(text), x:t.x, y:t.top + t.h * .08, size:o.size || clamp(t.h * .5, 26, 66), rise:o.rise ?? t.h * .45, tilt:rnd(-.12, .06), delay:o.delay || 0, dur:o.dur || 1100,
  c0:o.c0 || '#fff6cc', c1:o.c1 || '#ffb43a', edge:o.edge || '#ff7a2e', label:o.label || '', labelColor:o.labelColor || '#ffd6ee' });

// ---------------------------------------------------------------- recipes
// ctx: { src (attacker body), tg:[target body + dmg], dir (+1 attacker is left of targets), U (stage unit), opts }
const R = {};

R.slash = (X, cross) => {
  const arc = `fx-slash-arc-${slashColorOf(X.opts.weapon)}`, imp = X.opts.weapon === 'fang' ? 'fx-slash-impact-ember' : 'fx-slash-impact-white';
  X.tg.forEach((t, i) => {
    const d = i * 60, sw = t.h * (cross ? 2.1 : 1.8), ang = (X.dir > 0 ? .55 : Math.PI - .55);
    const cut = (delay, rot, scale = 1) => spr(arc, { x:t.x - Math.cos(rot) * sw * .5 * scale, y:t.y - Math.sin(rot) * sw * .5 * scale, w:sw * scale, h:sw * scale / 4, rot, ax:0, ay:.5, dur:240, delay:d + delay,
      sx:[.25, 1.05, 'out'], a:kf([[0, 0], [.12, 1], [.6, .9], [1, 0]]) });
    cut(70, ang * (X.dir > 0 ? 1 : 1));
    if (cross) cut(150, X.dir > 0 ? -.5 : Math.PI + .5, 1.05);
    spr(imp, { x:t.x, y:t.y, w:t.h * (cross ? 1.5 : 1.05), h:t.h * (cross ? 1.5 : 1.05), rot:rnd(-.5, .5), dur:260, delay:d + (cross ? 170 : 130), sx:[.5, 1.1, 'out'], sy:[.5, 1.1, 'out'], a:kf([[0, 0], [.15, 1], [1, 0]]) });
    spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:t.h * (cross ? 1.8 : 1.1), h:t.h * (cross ? 1.8 : 1.1), dur:220, delay:d + (cross ? 170 : 130), a:kf([[0, 0], [.2, 1], [1, 0]]) });
    at(d + (cross ? 170 : 130), () => { sparks('fx-common-sparks-gold', t.x, t.y, cross ? 14 : 8, { v:[140, 380], s:[10, 22] }); if (X.opts.weapon === 'fang') sparks('fx-common-sparks-orange', t.x, t.y, 5, { v:[80, 240] }); });
    if (cross) spr('fx-common-ray-burst-gold', { x:t.x, y:t.y, w:t.h * 3, h:t.h * 3, rot:rnd(0, 1), dur:420, delay:d + 170, a:kf([[0, 0], [.1, .8], [1, 0]]), sx:[.4, 1, 'out'], sy:[.4, 1, 'out'] });
  });
  X.hit = cross ? 170 : 130; cam.shake(cross ? 5 : 2.5, cross ? 260 : 160); if (cross) cam.dim(.25, 600);
  return cross ? 900 : 620;
};

R.slash_multi = X => {
  const arc = `fx-slash-arc-${slashColorOf(X.opts.weapon)}`;
  X.tg.forEach(t => {
    for (let i = 0; i < 4; i++) {
      const d = 60 + i * 95, rot = (X.dir > 0 ? 1 : -1) * [.5, -.45, .15, -.7][i] + (X.dir > 0 ? 0 : Math.PI), sw = t.h * rnd(1.4, 1.9), ox = rnd(-.2, .2) * t.w, oy = rnd(-.15, .15) * t.h;
      spr(arc, { x:t.x + ox - Math.cos(rot) * sw * .5, y:t.y + oy - Math.sin(rot) * sw * .5, w:sw, h:sw / 4, rot, ax:0, dur:210, delay:d, sx:[.25, 1.05, 'out'], a:kf([[0, 0], [.15, 1], [.6, .9], [1, 0]]) });
      spr('fx-slash-impact-white', { x:t.x + ox, y:t.y + oy, w:t.h * .85, h:t.h * .85, rot:rnd(-.6, .6), dur:220, delay:d + 70, sx:[.5, 1.1, 'out'], sy:[.5, 1.1, 'out'], a:kf([[0, 0], [.2, 1], [1, 0]]) });
      at(d + 70, () => { sparks('fx-common-sparks-gold', t.x + ox, t.y + oy, 5, { v:[120, 300] }); cam.shake(2, 110); });
    }
    spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:t.h * 1.7, h:t.h * 1.7, dur:260, delay:60 + 3 * 95 + 70, a:kf([[0, 0], [.2, 1], [1, 0]]) });
  });
  X.hit = 415; return 900;
};

const rocks = (x, y, n, h, vUp) => { for (let i = 0; i < n; i++) emit({ tex:'fx-club-rocks', cell:i % 8, x:x + rnd(-1, 1) * h * .3, y, vx:rnd(-1, 1) * h * 1.6, vy:-rnd(.6, 1) * vUp, ay:1500, s0:rnd(.12, .26) * h, s1:rnd(.1, .2) * h, life:rnd(550, 850), vr:rnd(-9, 9), a:1, env:'out' }); };
R.club = (X, big) => {
  const m = big ? 1.5 : 1;
  X.tg.forEach(t => {
    const d = 110, fy = t.feet - t.h * .04, ww = t.h * 2.2 * m;
    spr('fx-club-impact', { x:t.x, y:t.y + t.h * .15, w:t.h * 1.2 * m, h:t.h * 1.2 * m, rot:rnd(-.3, .3), dur:240, delay:d, sx:[.4, 1.15, 'out'], sy:[.4, 1.15, 'out'], a:kf([[0, 0], [.12, 1], [1, 0]]) });
    spr('fx-club-shockwave', { x:t.x, y:fy, w:ww, h:ww * .3125, dur:520, delay:d, sx:[.2, 1.4, 'out'], sy:[.2, 1.4, 'out'], a:kf([[0, 0], [.1, 1], [1, 0]]) });
    spr('fx-club-shockwave', { x:t.x, y:fy, w:ww, h:ww * .3125, dur:620, delay:d + 90, sx:[.1, 1.8, 'out'], sy:[.1, 1.8, 'out'], a:kf([[0, 0], [.1, .7], [1, 0]]) });
    spr('fx-club-crack', { x:t.x, y:fy, w:ww * .8, h:ww * .25, dur:760, delay:d, sx:[.4, 1, 'out'], a:kf([[0, 0], [.08, 1], [.6, .8], [1, 0]]) });
    for (let i = 0; i < (big ? 6 : 4); i++) spr('fx-club-dust', { x:t.x + rnd(-1, 1) * t.w * .7, y:fy - t.h * .05, w:t.h * .8, h:t.h * .8, dur:760, delay:d + i * 25, a:kf([[0, 0], [.15, .75], [1, 0]]), sx:[.4, 1.5, 'out'], sy:[.4, 1.5, 'out'], rot:rnd(-1, 1) });
    at(d, () => { rocks(t.x, fy, big ? 14 : 8, t.h, t.h * 5.2); sparks('fx-common-sparks-gold', t.x, t.y, big ? 12 : 7, { v:[160, 400] }); });
    if (big) spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:t.h * 2, h:t.h * 2, dur:240, delay:d, a:kf([[0, 0], [.2, 1], [1, 0]]) });
  });
  X.hit = 110; cam.shake(big ? 9 : 6, big ? 420 : 300); if (big) cam.dim(.3, 800);
  return big ? 1000 : 900;
};

const fireBlast = (t, size, d, o = {}) => {
  const e = t.h * size;
  spr('fx-fire-explosion', { x:t.x, y:t.y, w:e * 1.6, h:e * 1.6, dur:o.dur || 560, delay:d, sx:[.25, 1.05, 'out'], sy:[.25, 1.05, 'out'], rot:rnd(-.3, .3), a:kf([[0, 0], [.1, 1], [.55, .85], [1, 0]]) });
  spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:e * 1.5, h:e * 1.5, dur:260, delay:d, a:kf([[0, 0], [.15, 1], [1, 0]]) });
  spr('fx-fire-ground-glow', { x:t.x, y:t.feet, w:e * 2.4, h:e * .75, dur:o.dur ? o.dur + 300 : 900, delay:d, a:kf([[0, 0], [.15, 1], [.7, .7], [1, 0]]) });
  const nF = o.flames ?? 3;
  for (let i = 0; i < nF; i++) spr(`fx-fire-flame-${'abc'[i % 3]}`, { x:t.x + (i - (nF - 1) / 2) * e * .38 + rnd(-1, 1) * e * .08, y:t.feet, w:e * .36, h:e * .72, ax:.5, ay:1, dur:o.dur ? o.dur + 200 : 700, delay:d + 40 + i * 35, sy:[.15, 1.15, 'out'], sx:[.7, 1, 'lin'], a:kf([[0, 0], [.15, 1], [.7, .85], [1, 0]]) });
  at(d, () => { sparks('fx-common-sparks-orange', t.x, t.y, o.sparks ?? 12, { v:[160, 460], s:[10, 24], g:300 }); sparks('fx-fire-embers', t.x, t.y, o.embers ?? 8, { v:[80, 300], s:[12, 26], g:-60, life:[600, 1100] });
    for (let i = 0; i < (o.smoke ?? 2); i++) spr('fx-common-smoke-dark', { x:t.x + rnd(-1, 1) * e * .3, y:t.y - e * .1, w:e * .9, h:e * .9, dur:900, delay:rnd(160, 340), sx:[.5, 1.5, 'out'], sy:[.5, 1.5, 'out'], a:kf([[0, 0], [.25, .4], [1, 0]]), rot:rnd(-1, 1) }); });
};
const fireFlight = (X, t, size, d, travel) => {
  const s = X.src, dx = t.x - s.x, dy = (t.y - s.y), ang = Math.atan2(dy, dx), dist = Math.hypot(dx, dy), orb = t.h * size;
  spr('fx-fire-orb', { x:(k => lerp(s.x, t.x, k)), y:(k => lerp(s.y, t.y, k)), w:orb, h:orb, rot:ang, dur:travel, delay:d, a:kf([[0, 0], [.1, 1], [1, 1]]), sx:[.5, 1.1, 'lin'], sy:[.5, 1.1, 'lin'], flip:false });
  const tl = Math.min(dist, orb * 3);
  spr('fx-fire-comet-trail', { x:(k => lerp(s.x, t.x, k) - Math.cos(ang) * tl * .5), y:(k => lerp(s.y, t.y, k) - Math.sin(ang) * tl * .5), w:tl, h:tl / 4 * (orb / (t.h * .8)), rot:ang, dur:travel, delay:d, a:kf([[0, 0], [.1, .95], [1, .95]]) });
  for (let i = 0; i < Math.round(travel / 45); i++) at(d + i * 45, () => { const k = i * 45 / travel; sparks('fx-fire-embers', lerp(s.x, t.x, k), lerp(s.y, t.y, k), 1, { v:[20, 90], s:[10, 18], g:60, spread:orb * .2, life:[300, 500] }); });
};
R.fire = (X, tier) => {
  elementalCast(X, 'fire');
  const size = tier === 'l' ? 1.15 : tier === 'm' ? .85 : .6, blast = tier === 'l' ? 2.2 : tier === 'm' ? 1.5 : 1.05, travel = tier === 'l' ? 340 : tier === 'm' ? 280 : 230;
  const charge = tier === 'l' ? 260 : tier === 'm' ? 120 : 0;
  if (charge) {
    const s = X.src; spr('fx-fire-orb', { x:s.x + X.dir * s.w * .5, y:s.y - s.h * .1, w:s.h * 1.1, h:s.h * 1.1, dur:charge, a:kf([[0, 0], [.5, 1], [1, .9]]), sx:[.2, 1, 'out'], sy:[.2, 1, 'out'] });
    spr('fx-common-ring-gold', { x:s.x, y:s.y, w:s.h * 1.8, h:s.h * 1.8, dur:charge, a:kf([[0, 0], [.5, .8], [1, 0]]), sx:[1.2, .3, 'in'], sy:[1.2, .3, 'in'] });
  }
  X.tg.forEach((t, i) => {
    fireFlight(X, t, size, charge + i * 40, travel);
    fireBlast(t, blast, charge + i * 40 + travel - 30, tier === 'l' ? { dur:760, flames:6, sparks:24, embers:16, smoke:4 } : tier === 'm' ? { dur:620, flames:4, sparks:16, embers:10, smoke:3 } : {});
    if (tier === 'l') {
      const d = charge + travel - 30;
      spr('fx-common-ray-burst-gold', { x:t.x, y:t.y, w:X.U * 1.5, h:X.U * 1.5, dur:700, delay:d, a:kf([[0, 0], [.1, 1], [1, 0]]), sx:[.3, 1, 'out'], sy:[.3, 1, 'out'], rot:rnd(0, 1) });
      spr('fx-common-ring-gold', { x:t.x, y:t.y, w:X.U * 1.3, h:X.U * 1.3, dur:560, delay:d, a:kf([[0, 0], [.1, 1], [1, 0]]), sx:[.2, 1.2, 'out'], sy:[.2, 1.2, 'out'] });
      spr('fx-common-ring-gold', { x:t.x, y:t.y, w:X.U * 1.3, h:X.U * 1.3, dur:700, delay:d + 110, a:kf([[0, 0], [.1, .8], [1, 0]]), sx:[.1, 1.6, 'out'], sy:[.1, 1.6, 'out'] });
    }
  });
  if (tier === 'l') cam.flash('rgb(255,215,140)', .45, 380, charge + travel - 40);
  const hitAt = charge + travel - 30; X.hit = hitAt;
  at(hitAt, () => cam.shake(tier === 'l' ? 12 : tier === 'm' ? 7 : 3.5, tier === 'l' ? 560 : tier === 'm' ? 380 : 220));
  if (tier !== 's') cam.dim(tier === 'l' ? .55 : .3, hitAt + 700);
  return hitAt + (tier === 'l' ? 1000 : tier === 'm' ? 800 : 600);
};

R.fire_charge = X => {
  const s = X.src;
  for (let i = 0; i < 6; i++) spr(`fx-fire-flame-${'abc'[i % 3]}`, { x:s.x + (i - 2.5) * s.w * .28, y:s.feet, w:s.h * .6, h:s.h * 1.3, ax:.5, ay:1, dur:520, delay:i * 30, sy:[.2, 1, 'out'], a:kf([[0, 0], [.2, 1], [.75, .9], [1, 0]]) });
  spr('fx-common-ring-gold', { x:s.x, y:s.feet, w:s.h * 3, h:s.h * 1.1, dur:420, a:kf([[0, 0], [.2, 1], [1, 0]]), sx:[.3, 1, 'out'], sy:[.3, 1, 'out'] });
  X.tg.forEach((t, i) => {
    fireFlight(X, t, 1, 330 + i * 40, 230);
    fireBlast(t, 2, 520 + i * 40, { dur:720, flames:5, sparks:22, embers:14, smoke:3 });
    spr('fx-common-ray-burst-gold', { x:t.x, y:t.y, w:X.U * 1.3, h:X.U * 1.3, dur:620, delay:520 + i * 40, a:kf([[0, 0], [.1, 1], [1, 0]]), sx:[.3, 1, 'out'], sy:[.3, 1, 'out'], rot:rnd(0, 1) });
  });
  cam.flash('rgb(255,200,120)', .5, 360, 515);
  X.hit = 520; at(520, () => cam.shake(10, 480)); cam.dim(.4, 1400);
  return 1500;
};

// Existing transparent textures supply the shard/spiral/blade; no generic fire fallback.
function elementalCast(X, action, travel = 220) {
  const visual = powerVisual(action), s = X.src;
  if (!visual?.hand) return;
  const x = s.x + X.dir * s.w * .4, y = s.y - s.h * .12;
  spr(visual.hand, { x, y, w:s.h * .85, h:s.h * .85, dur:180,
    a:kf([[0,0],[.25,.95],[1,0]]), sx:[.3,1,'out'], sy:[.3,1,'out'] });
  if (!['ice','hypno'].includes(action)) return; // These recipes already fly.
  X.tg.forEach((t,i) => {
    const angle = Math.atan2(t.y-y,t.x-x);
    spr(visual.projectile, { x:k=>lerp(x,t.x,k), y:k=>lerp(y,t.y,k),
      w:t.h * .65, h:t.h * (action === 'ice' ? 1.3 : .65),
      rot:action === 'ice' ? angle + Math.PI/2 : k=>k*6,
      dur:travel, delay:i*40, a:kf([[0,0],[.12,1],[1,1]]) });
  });
}

R.ice = X => {
  elementalCast(X, 'ice');
  X.tg.forEach((t, i) => {
    const d = 220 + i * 80, ch = t.h;
    spr('fx-ice-frost-ground', { x:t.x, y:t.feet, w:ch * 3.2, h:ch * 1, dur:900, delay:d, a:kf([[0, 0], [.12, 1], [.75, .8], [1, 0]]), sx:[.3, 1, 'out'], sy:[.3, 1, 'out'] });
    spr('fx-ice-glow-core', { x:t.x, y:t.y, w:ch * 2.4, h:ch * 2.4, dur:880, delay:d + 60, a:kf([[0, 0], [.2, .9], [.7, .7], [1, 0]]), sx:[.4, 1, 'out'], sy:[.4, 1, 'out'] });
    spr('fx-ice-crystal-cluster', { x:t.x, y:t.feet + ch * .05, w:ch * 2.0, h:ch * 2.0 * 0.7, ax:.5, ay:1, dur:860, delay:d + 40, sy:kf([[0, .05], [.22, 1.06], [.3, 1], [1, 1]]), a:kf([[0, 0], [.04, 1], [.78, 1], [1, 0]]) });
    const kinds = ['a', 'b', 'c'];
    for (let n = 0; n < 5; n++) {
      const ox = (n - 2) * t.w * .38 + rnd(-1, 1) * t.w * .08, hh = ch * rnd(1.0, 1.7), ww = hh * .5;
      spr(`fx-ice-crystal-${kinds[n % 3]}`, { x:t.x + ox, y:t.feet + ch * .03 * (n % 2), w:ww, h:hh, ax:.5, ay:1, dur:820, delay:d + n * 35, sy:kf([[0, .05], [.2, 1.08], [.3, 1], [1, 1]]), sx:kf([[0, .6], [.3, 1], [1, 1]]), a:kf([[0, 0], [.05, 1], [.78, 1], [1, 0]]) });
    }
    at(d + 690, () => { for (let n = 0; n < 12; n++) emit({ tex:'fx-ice-shards', cell:n % 4, x:t.x + rnd(-1, 1) * t.w * .8, y:t.feet - rnd(.1, 1) * ch, vx:rnd(-1, 1) * ch * 2, vy:-rnd(.3, 1.3) * ch * 2, ay:1700, s0:rnd(.18, .36) * ch, s1:rnd(.1, .2) * ch, life:rnd(500, 800), vr:rnd(-8, 8) });
      sparks('fx-common-sparks-blue', t.x, t.y, 12, { v:[140, 380], s:[10, 24], g:120 }); });
    spr('fx-common-ring-blue', { x:t.x, y:t.feet, w:ch * 3.6, h:ch * 1.1, dur:520, delay:d + 40, a:kf([[0, 0], [.12, 1], [1, 0]]), sx:[.2, 1, 'out'], sy:[.2, 1, 'out'] });
    spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:ch * 1.8, h:ch * 1.8, dur:280, delay:d + 120, a:kf([[0, 0], [.2, .9], [1, 0]]) });
    at(d, () => { for (let n = 0; n < 8; n++) emit({ tex:'fx-common-sparks-blue', cell:1, x:t.x + rnd(-1.4, 1.4) * ch, y:t.y - ch * rnd(.8, 1.6), vx:rnd(-20, 20), vy:rnd(40, 110), s0:rnd(8, 16), s1:6, life:rnd(700, 1100), a:.9, env:'pop', delay:rnd(0, 400) }); });
  });
  cam.flash('rgb(170,215,255)', .45, 340, 30);
  X.hit = 250; at(60, () => cam.shake(5, 320)); cam.dim(.4, 1200);
  return 1300;
};

R.wind = X => {
  elementalCast(X, 'windFan');
  const s = X.src;
  X.tg.forEach((t, i) => {
    const d = i * 60;
    for (let b = 0; b < 3; b++) {
      const yy = lerp(s.y, t.y, .5) + (b - 1) * t.h * .35, dist = Math.abs(t.x - s.x), w = t.h * 1.8, rot = (X.dir > 0 ? 0 : Math.PI) + (b - 1) * .12;
      spr('fx-wind-blade', { x:k => lerp(s.x, t.x, k), y:k => lerp(lerp(s.y, t.y, .3), yy, k), w, h:w / 4, rot, dur:260 + b * 40, delay:d + b * 70, a:kf([[0, 0], [.12, 1], [.75, .9], [1, 0]]), flip:false });
      void dist;
    }
    spr('fx-wind-vortex', { x:t.x, y:t.y, w:t.h * 2.2, h:t.h * 2.2, rot:k => k * 7, dur:760, delay:d + 220, a:kf([[0, 0], [.18, .95], [.7, .8], [1, 0]]), sx:[.4, 1.1, 'out'], sy:[.4, 1.1, 'out'] });
    spr('fx-wind-column', { x:t.x, y:t.feet, w:t.h * 1.3, h:t.h * 2.6, ax:.5, ay:1, dur:760, delay:d + 240, sy:[.2, 1, 'out'], a:kf([[0, 0], [.2, .9], [.75, .7], [1, 0]]), rot:k => Math.sin(k * 12) * .06 });
    at(d + 220, () => {
      for (let n = 0; n < 12; n++) { const a = rnd(0, TAU); emit({ tex:'fx-wind-leaves', cell:n % 4, x:t.x + Math.cos(a) * t.h * .5, y:t.y + Math.sin(a) * t.h * .5, vx:Math.cos(a + 1.5) * t.h * 2.2, vy:Math.sin(a + 1.5) * t.h * 1.4 - t.h, ax:Math.cos(a) * -t.h * 1.5, ay:-t.h * .6, drag:.8, s0:t.h * rnd(.2, .34), s1:t.h * .15, life:rnd(600, 950), vr:rnd(-9, 9), a:1, delay:rnd(0, 200) }); }
      for (let n = 0; n < 10; n++) { const a = rnd(0, TAU); emit({ tex:'fx-wind-streaks', cell:n % 4, x:t.x + Math.cos(a) * t.h * .6, y:t.y + Math.sin(a) * t.h * .5, vx:Math.cos(a + 1.57) * t.h * 4, vy:Math.sin(a + 1.57) * t.h * 3, rot:a + 1.57, s0:t.h * .9, s1:t.h * .5, life:rnd(300, 520), a:.9 }); }
    });
    spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:t.h * 1.1, h:t.h * 1.1, dur:220, delay:d + 230, a:kf([[0, 0], [.2, .8], [1, 0]]) });
  });
  X.hit = 300; cam.shake(2.5, 600); cam.dim(.25, 1000);
  return 1100;
};

R.hypno = X => {
  elementalCast(X, 'hypno');
  X.tg.forEach((t, i) => {
    const d = i * 90, ch = t.h;
    spr('fx-hypno-circle', { x:t.x, y:t.feet - ch * .02, w:ch * 3, h:ch * 3, rot:k => k * 5, dur:1250, delay:d, a:kf([[0, 0], [.14, 1], [.8, .9], [1, 0]]), sx:kf([[0, .3], [.25, 1], [1, 1.05]]), sy:kf([[0, .3], [.25, 1], [1, 1.05]]), sq:kf([[0, .2], [.25, .34], [1, .36]]) });
    spr('fx-common-ring-violet', { x:t.x, y:t.feet, w:ch * 3.4, h:ch * 3.4, dur:620, delay:d + 100, a:kf([[0, 0], [.12, 1], [1, 0]]), sx:[.2, 1, 'out'], sy:kf([[0, .06], [1, .32]]) });
    spr('fx-hypno-ribbons', { x:t.x, y:t.feet, w:ch * 1.5, h:ch * 3, ax:.5, ay:1, dur:1050, delay:d + 160, sy:[.1, 1, 'out'], a:kf([[0, 0], [.2, 1], [.75, .85], [1, 0]]) });
    spr('fx-hypno-spiral', { x:t.x, y:t.y, w:ch * 1.7, h:ch * 1.7, rot:k => -k * 9, dur:1000, delay:d + 220, a:kf([[0, 0], [.2, .85], [.75, .7], [1, 0]]), sx:[.4, 1, 'out'], sy:[.4, 1, 'out'] });
    spr('fx-hypno-eye', { x:t.x, y:t.top - ch * .1, w:ch * 1.1, h:ch * 1.1, dur:520, delay:d + 330, a:kf([[0, 0], [.2, 1], [1, 0]]), sx:[.5, 1.1, 'out'], sy:[.5, 1.1, 'out'] });
    at(d + 200, () => { for (let n = 0; n < 16; n++) emit({ tex:'fx-common-sparks-violet', cell:n % 4, x:t.x + rnd(-1, 1) * ch * 1.1, y:t.feet - rnd(0, .3) * ch, vx:rnd(-30, 30), vy:-rnd(60, 200), s0:rnd(10, 22), s1:4, life:rnd(700, 1200), a:1, env:'pop', sway:rnd(6, 16), delay:rnd(0, 500) }); });
  });
  cam.flash('rgb(190,110,255)', .3, 420, 140);
  X.hit = 500; cam.dim(.5, 1500);
  return 1500;
};

R.spear = X => {
  elementalCast(X, 'valkyrieSpear');
  const s = X.src;
  for (let n = 0; n < 6; n++) emit({ tex:'fx-spear-feathers', cell:n % 4, x:s.x, y:s.y, vx:-X.dir * rnd(40, 160), vy:rnd(-120, 40), ay:140, drag:1, s0:s.h * .5, s1:s.h * .35, life:rnd(500, 800), vr:rnd(-3, 3), a:1, delay:rnd(0, 140) });
  spr('fx-common-flash-star-white', { x:s.x + X.dir * s.w * .4, y:s.y, w:s.h * 1.3, h:s.h * 1.3, dur:240, a:kf([[0, 0], [.4, 1], [1, 0]]) });
  X.tg.forEach((t, i) => {
    const d = 230 + i * 60, dx = t.x - s.x, dy = t.y - s.y, ang = Math.atan2(dy, dx), dist = Math.hypot(dx, dy), L = Math.max(dist * 1.15, t.h * 3);
    spr('fx-spear-lance', { x:k => lerp(s.x, t.x, k) - Math.cos(ang) * L * (.5 - k * .15), y:k => lerp(s.y, t.y, k) - Math.sin(ang) * L * (.5 - k * .15), w:L, h:L * 96 / 768 * 1.2, rot:ang, dur:170, delay:d, a:kf([[0, 0], [.1, 1], [1, 1]]) });
    spr('fx-spear-lance', { x:t.x - Math.cos(ang) * L * .36, y:t.y - Math.sin(ang) * L * .36, w:L, h:L * 96 / 768 * 1.1, rot:ang, dur:360, delay:d + 170, a:kf([[0, 1], [.35, .9], [1, 0]]), sy:kf([[0, 1], [1, .2]]) });
    spr('fx-spear-pierce-cone', { x:t.x + Math.cos(ang) * t.h * .5, y:t.y + Math.sin(ang) * t.h * .5, w:t.h * 2.2, h:t.h * 2.2, rot:ang, dur:420, delay:d + 160, ax:.3, a:kf([[0, 0], [.1, 1], [1, 0]]), sx:[.4, 1.1, 'out'], sy:[.5, 1, 'out'] });
    spr('fx-common-ring-gold', { x:t.x, y:t.y, w:t.h * 2.4, h:t.h * 2.4, dur:480, delay:d + 170, a:kf([[0, 0], [.1, 1], [1, 0]]), sx:[.1, .55, 'out'], sy:[.1, 1, 'out'], rot:ang });
    spr('fx-common-flash-star-white', { x:t.x, y:t.y, w:t.h * 2, h:t.h * 2, dur:300, delay:d + 165, a:kf([[0, 0], [.15, 1], [1, 0]]) });
    spr('fx-common-ray-burst-gold', { x:t.x, y:t.y, w:t.h * 3.2, h:t.h * 3.2, dur:520, delay:d + 170, a:kf([[0, 0], [.1, .9], [1, 0]]), sx:[.3, 1, 'out'], sy:[.3, 1, 'out'], rot:rnd(0, 1) });
    at(d + 165, () => { sparks('fx-common-sparks-gold', t.x, t.y, 16, { v:[160, 500], s:[12, 26], g:100 }); for (let n = 0; n < 6; n++) emit({ tex:'fx-spear-feathers', cell:n % 4, x:t.x, y:t.y, vx:Math.cos(ang) * rnd(100, 300) + rnd(-80, 80), vy:Math.sin(ang) * rnd(100, 300) + rnd(-120, 40), ay:260, drag:1.2, s0:t.h * .55, s1:t.h * .3, life:rnd(600, 900), vr:rnd(-4, 4) }); cam.shake(8, 360); });
  });
  X.hit = 400; cam.dim(.4, 1000);
  return 1000;
};

R.heal = X => {
  const mp = !!X.opts.mp, ring = mp ? 'fx-common-ring-blue' : 'fx-common-ring-green', aura = mp ? 'fx-heal-aura-blue' : 'fx-heal-aura-green', floor = mp ? 'fx-heal-ring-floor-blue' : 'fx-heal-ring-floor', sp = mp ? 'fx-common-sparks-blue' : 'fx-common-sparks-green';
  const all = X.tg;
  all.forEach((t, i) => {
    const d = i * 70, ch = t.h;
    spr(aura, { x:t.x, y:t.y, w:ch * 3, h:ch * 3, dur:1000, delay:d, a:kf([[0, 0], [.25, .95], [.7, .6], [1, 0]]), sx:[.5, 1.15, 'out'], sy:[.5, 1.15, 'out'] });
    spr(floor, { x:t.x, y:t.feet, w:ch * 3.8, h:ch * 1.2, dur:800, delay:d, a:kf([[0, 0], [.15, 1], [.8, .7], [1, 0]]), sx:[.3, 1.1, 'out'], sy:[.3, 1.1, 'out'] });
    spr(floor, { x:t.x, y:t.feet, w:ch * 3.8, h:ch * 1.2, dur:700, delay:d + 200, a:kf([[0, 0], [.15, .8], [1, 0]]), sx:[.2, 1.4, 'out'], sy:[.2, 1.4, 'out'] });
    spr('fx-heal-flower', { x:t.x, y:t.top - ch * .15, w:ch * 1.1, h:ch * 1.1, rot:k => k * 2, dur:900, delay:d + 120, a:kf([[0, 0], [.2, 1], [.7, .9], [1, 0]]), sx:[.4, 1, 'out'], sy:[.4, 1, 'out'] });
    at(d + 80, () => {
      for (let n = 0; n < 16; n++) emit({ tex:n % 3 ? sp : 'fx-heal-petals', cell:n % 4, x:t.x + rnd(-1, 1) * t.w * .8, y:t.feet - rnd(0, .4) * ch, vx:rnd(-15, 15), vy:-rnd(70, 200), s0:rnd(14, 28), s1:6, life:rnd(700, 1200), a:1, env:'pop', sway:rnd(5, 14), delay:rnd(0, 500) });
    });
  });
  if (all.length > 1) {   // a ring of light around the whole team
    const l = Math.min(...all.map(t => t.l)), r = Math.max(...all.map(t => t.r)), top = Math.min(...all.map(t => t.top)), fe = Math.max(...all.map(t => t.feet)), w = (r - l) * 1.15 + 40, cx = (l + r) / 2;
    spr(ring, { x:cx, y:(top + fe) / 2, w, h:w, dur:900, delay:60, a:kf([[0, 0], [.2, 1], [1, 0]]), sx:[.3, 1, 'out'], sy:[.2, Math.max(.35, (fe - top) / w * 1.2), 'out'] });
  } else {
    const t = all[0]; if (t) spr(ring, { x:t.x, y:t.y, w:t.h * 3.4, h:t.h * 3.4, dur:700, delay:40, a:kf([[0, 0], [.2, 1], [1, 0]]), sx:[.2, 1, 'out'], sy:[.2, 1, 'out'] });
  }
  cam.dim(.18, 1000);
  return 1300;
};

R.rage = X => {
  const s = X.src;
  spr('fx-aura-rage', { x:s.x, y:s.feet, w:s.h * 1.7, h:s.h * 2.3, ax:.5, ay:1, dur:1000, a:kf([[0, 0], [.25, 1], [.7, .8], [1, 0]]), sy:[.4, 1.05, 'out'] });
  for (let i = 0; i < 5; i++) spr(`fx-fire-flame-${'abc'[i % 3]}`, { x:s.x + (i - 2) * s.w * .3, y:s.feet, w:s.h * .5, h:s.h * 1.1, ax:.5, ay:1, dur:780, delay:i * 55, sy:[.2, 1, 'out'], a:kf([[0, 0], [.2, 1], [.7, .8], [1, 0]]) });
  spr('fx-common-ring-gold', { x:s.x, y:s.feet, w:s.h * 3, h:s.h * 1.05, dur:620, a:kf([[0, 0], [.15, 1], [1, 0]]), sx:[.2, 1, 'out'], sy:[.2, 1, 'out'] });
  at(0, () => { sparks('fx-common-sparks-orange', s.x, s.y, 14, { v:[100, 300], s:[10, 22] }); sparks('fx-fire-embers', s.x, s.feet, 8, { v:[40, 160], arc:[-2.6, -.5], g:-120, life:[700, 1100] }); cam.shake(4, 420); });
  cam.dim(.25, 900);
  return 1100;
};

R.clock = X => {
  elementalCast(X, 'cooldownClock');
  const s = X.src;
  spr('fx-clock-ring', { x:s.x, y:s.y, w:s.h * 2.6, h:s.h * 2.6, rot:k => -k * 5.2, dur:1000, a:kf([[0, 0], [.15, 1], [.8, .9], [1, 0]]), sx:[.5, 1.1, 'out'], sy:[.5, 1.1, 'out'] });
  spr('fx-common-ring-gold', { x:s.x, y:s.y, w:s.h * 3.2, h:s.h * 3.2, dur:700, delay:200, a:kf([[0, 0], [.15, 1], [1, 0]]), sx:[1.1, .3, 'in'], sy:[1.1, .3, 'in'] });
  at(180, () => sparks('fx-common-sparks-gold', s.x, s.y, 14, { v:[60, 200], s:[10, 20], g:-40 }));
  cam.dim(.2, 900);
  return 1050;
};

R.mirror = X => {
  elementalCast(X, 'mirror');
  const s = X.src;
  spr('fx-mirror-glint', { x:k => lerp(s.x - s.h * 1.2, s.x + s.h * 1.2, k), y:s.y, w:s.h * 2.4, h:s.h * .6, dur:520, a:kf([[0, 0], [.2, 1], [.8, 1], [1, 0]]) });
  spr('fx-common-ring-blue', { x:s.x, y:s.y, w:s.h * 2.4, h:s.h * 2.4, dur:620, delay:120, a:kf([[0, 0], [.15, 1], [1, 0]]), sx:[.2, 1, 'out'], sy:[.2, 1, 'out'] });
  at(150, () => sparks('fx-common-sparks-blue', s.x, s.y, 12, { v:[80, 260], g:60 }));
  return 800;
};

R.foe_claw = (X, tier) => {
  const m = tier === 'l' ? 1.5 : tier === 'm' ? 1.15 : .85;
  X.tg.forEach((t, i) => {
    const d = 90 + i * 60;
    spr('fx-foe-claw-triple', { x:t.x, y:t.y, w:t.h * 1.5 * m, h:t.h * 1.5 * m, rot:X.dir > 0 ? .1 : -.1, dur:300, delay:d, sx:[.5, 1.1, 'out'], sy:[.5, 1.1, 'out'], a:kf([[0, 0], [.15, 1], [.65, .9], [1, 0]]) });
    spr('fx-foe-impact-red', { x:t.x, y:t.y, w:t.h * 1.2 * m, h:t.h * 1.2 * m, rot:rnd(-.5, .5), dur:260, delay:d + 80, sx:[.5, 1.1, 'out'], sy:[.5, 1.1, 'out'], a:kf([[0, 0], [.15, 1], [1, 0]]) });
    if (tier !== 's') spr('fx-foe-dark-orb', { x:t.x, y:t.y, w:t.h * 2 * m, h:t.h * 2 * m, dur:420, delay:d + 60, sx:[.3, 1, 'out'], sy:[.3, 1, 'out'], a:kf([[0, 0], [.15, .9], [1, 0]]) });
    at(d + 80, () => sparks('fx-common-sparks-orange', t.x, t.y, tier === 'l' ? 14 : 8, { v:[120, 360] }));
  });
  X.hit = 170; at(170, () => cam.shake(tier === 'l' ? 10 : tier === 'm' ? 6 : 3.5, tier === 'l' ? 420 : 260));
  if (tier === 'l') { cam.flash('rgb(255,60,70)', .2, 320, 150); cam.dim(.3, 800); }
  return 800;
};
R.foe_ult = X => {
  const t = X.tg[0]; if (!t) return 0;
  cam.flash('rgb(255,70,90)', .4, 520);
  spr('fx-foe-dark-orb', { x:t.x, y:t.y, w:X.U * 1.1, h:X.U * 1.1, dur:700, delay:60, sx:[.2, 1, 'out'], sy:[.2, 1, 'out'], a:kf([[0, 0], [.15, 1], [1, 0]]) });
  spr('fx-common-ray-burst-gold', { x:t.x, y:t.y, w:X.U * 1.3, h:X.U * 1.3, dur:700, delay:80, a:kf([[0, 0], [.12, .8], [1, 0]]), sx:[.3, 1, 'out'], sy:[.3, 1, 'out'] });
  at(80, () => { sparks('fx-common-sparks-orange', t.x, t.y, 24, { v:[200, 560] }); cam.shake(14, 560); }); cam.dim(.5, 1100);
  return 1100;
};
R.burn = X => {
  X.hit = 0; X.tg.forEach(t => { for (let i = 0; i < 3; i++) spr(`fx-fire-flame-${'abc'[i]}`, { x:t.x + (i - 1) * t.w * .3, y:t.feet, w:t.h * .4, h:t.h * .8, ax:.5, ay:1, dur:600, delay:i * 60, sy:[.2, 1, 'out'], a:kf([[0, 0], [.2, 1], [.7, .7], [1, 0]]) }); at(0, () => sparks('fx-fire-embers', t.x, t.feet, 5, { v:[30, 120], arc:[-2.4, -.7], g:-80 })); });
  return 700;
};

const RUN = {
  slash:X => R.slash(X, false), slash_cross:X => R.slash(X, true), slash_multi:X => R.slash_multi(X),
  club:X => R.club(X, false), club_big:X => R.club(X, true),
  fire_s:X => R.fire(X, 's'), fire_m:X => R.fire(X, 'm'), fire_l:X => R.fire(X, 'l'), fire_charge:X => R.fire_charge(X),
  ice:X => R.ice(X), wind:X => R.wind(X), hypno:X => R.hypno(X), spear:X => R.spear(X),
  heal:X => R.heal(X), rage:X => R.rage(X), clock:X => R.clock(X), mirror:X => R.mirror(X),
  foe_claw_s:X => R.foe_claw(X, 's'), foe_claw_m:X => R.foe_claw(X, 'm'), foe_claw_l:X => R.foe_claw(X, 'l'), foe_ult:X => R.foe_ult(X), burn:X => R.burn(X),
};
export const IMPLEMENTED_RECIPES = Object.freeze(Object.keys(RUN));
/** textures each recipe uses, so they can be warmed before the first play */
const WARM = TEX_KEYS;

/** Play one effect.
 *  spec: { recipe | action, src: rect, targets: [{ rect, dmg, label, hit }], opts:{ weapon, crit, mp, replay }, delay }
 *  rect = { l, t, r, b } in stage-local px. Returns estimated duration in ms (0 when nothing played). */
export function playBattleFx(spec) {
  if (!E.canvas || !E.stage) return 0;
  const recipe = spec.recipe || recipeFor(spec.action, { dmg:spec.dmg, crit:spec.opts?.crit, replay:spec.opts?.replay });
  const run = RUN[recipe]; if (!run) return 0;
  const tg = (spec.targets || []).map(t => ({ ...body(t.rect), dmg:t.dmg || 0, label:t.label || '', side:t.side })), src = body(spec.src || spec.targets?.[0]?.rect || { l:0, t:0, r:1, b:1 });
  if (!tg.length) return 0;
  const dir = (tg.reduce((a, t) => a + t.x, 0) / tg.length - src.x) >= 0 ? 1 : -1;
  const X = { src, tg, dir, U:Math.min(E.w, E.h * .9), opts:spec.opts || {} };
  // Camera sync: when the cue's impact time is known, start early enough that the recipe's own hit moment lands on it.
  if (E.camera && spec.impactAt != null) spec = { ...spec, delay:Math.max(0, spec.impactAt / (E.camera.timeScale || 1) - (RECIPE_META[recipe]?.hit || 0)) };
  E.stats.plays++; (E.stats.log ||= []).push(recipe); if (E.stats.log.length > 60) E.stats.log.shift();
  const go = () => {
    preloadTex(WARM.filter(k => k.startsWith('fx-common')));
    const art = SKILL_FX[X.opts.skill];
    // New ranged moves have one 250 ms flight; don't also emit the old slash/fire recipe.
    const ranged = !!art?.projectile;
    const dur = ranged ? 900 : run(X);
    if (art) {
      const impact = ranged ? (E.reduce ? 0 : 250) : (X.hit || 110);
      const texture = key => art.shared ? key : `fx-c1-${key.toLowerCase()}`;
      preloadTex([art.impact,art.projectile].filter(Boolean).map(texture));
      for (const t of tg) {
        if (art.projectile && !E.reduce) {
          const hand = { x:src.x+dir*src.w*.4, y:src.y-src.h*.12 };
          spr(texture(art.projectile), { x:k=>lerp(hand.x,t.x,k), y:k=>lerp(hand.y,t.y,k), w:src.h*.4, h:src.h*.4, dur:250, a:1 });
        }
        spr(texture(art.impact), { x:t.x, y:t.y, w:t.h*1.4, h:t.h*1.4, dur:650, delay:impact, a:kf([[0,0],[.15,1],[.8,.8],[1,0]]) });
      }
      X.hit = impact;
    }
    if (spec.numbers !== false) tg.forEach((t, i) => { if (t.dmg > 0) numberAt(t, t.dmg > 900 ? '∞' : t.dmg, spec.side === 'you' ? { c0:'#ffe0d6', c1:'#ff7a62', edge:'#c42a2a', label:t.label, delay:(spec.numberDelay ?? X.hit ?? 200) + 120 + i * 60 } : { label:t.label, delay:(spec.numberDelay ?? X.hit ?? 170) + i * 60, ...(t.label ? { labelColor:'#ffd6ee' } : {}) }); });
    return dur;
  };
  if (spec.delay > 0) { at(spec.delay, go); return spec.delay + 1000; }
  return go();
}

/** Codex pose atlases (img/combat-animation-v1/manifest.json): read-only, same URL combat-sprites.js uses so the browser cache serves it. Used only to find an attack pose's contact time. */
let poseCatalog = null, poseRequested = false;
export function loadPoseCatalog() {
  if (!poseRequested && typeof fetch === 'function') {
    poseRequested = true;
    fetch('img/combat-animation-v1/manifest.json?v=night-v1-p9-grace-f').then(r => r.ok ? r.json() : null).then(j => { poseCatalog = j?.sprites || null; }).catch(() => {});
  }
  return poseCatalog;
}
/** attack-pose durations for a combat-sprites key ('crew:th:kan', 'boss:th:zone-boss'); [] when unknown */
export const poseDurations = (key, mode = 'attack') => { const r = loadPoseCatalog(); const rec = r && (r[key + ':' + mode] || r[key]); return rec?.modes?.[mode]?.durations || []; };

/** warm every texture (used by tests/tools; the game warms lazily) */
export const warmAllFx = () => preloadTex(TEX_KEYS);
export { RECIPE_IDS, recipeFor, RECIPE_META };
