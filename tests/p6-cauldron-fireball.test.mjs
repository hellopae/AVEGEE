import { assertVersionedImports } from './helpers/versioned-imports.mjs';
// P6 — กระทะทองแดง: วิญญาณโดนไฟ (ไฟหน้า/หลัง · แดงกะพริบ · เหงื่อ · reduced-motion) + มินิเกมฝึกลูกไฟกดติดทุก input
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { POTS, drawPotSoul } from '../src/pot-souls.js';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';

globalThis.devicePixelRatio ??= 1;

// ---------- กระทะ ----------
function recorder() {
  const log = [];
  const mk = (tag) => new Proxy({ getTransform: () => ({ a: 1 }), createRadialGradient: () => ({ addColorStop() {} }), createLinearGradient: () => ({ addColorStop() {} }) },
    { get: (o, k) => k in o ? o[k] : (...a) => { log.push({ tag, k, a }); }, set: (o, k, v) => { log.push({ tag, set: k, v }); o[k] = v; return true; } });
  return { log, ctx: mk('main'), mk };
}
function withImages(fn) {
  const old = { Image: globalThis.Image, document: globalThis.document, OffscreenCanvas: globalThis.OffscreenCanvas };
  globalThis.Image = class { set src(v) { this._src = v; this.complete = true; this.naturalWidth = 128; this.naturalHeight = 128; } get src() { return this._src; } };
  try { return fn(); } finally { for (const [k, v] of Object.entries(old)) { if (v === undefined) delete globalThis[k]; else globalThis[k] = v; } }
}
const env = (t, reduced = false) => ({ px: u => 100 + u * 800, py: v => 50 + v * 450, U: 450, t, reduced });

test('P6 cauldron: painted flames behind AND in front of the soul, sweat drawn, red tint via source-atop (never ctx.filter)', () => withImages(() => {
  const main = recorder(), buf = recorder();
  const bufCtx = buf.mk('buf');
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return bufCtx; } };
  const order = [];
  drawPotSoul(main.ctx, POTS.th, 1, env(1234), (x, y, c) => { order.push(c === bufCtx ? 'soul-in-buffer' : 'soul-direct'); });
  assert.deepEqual(order, ['soul-in-buffer']);
  const sprites = main.log.filter(e => e.k === 'drawImage').map(e => e.a[0]._src);
  const firstFlame = sprites.findIndex(s => /fx-fire-flame-[abc]\.webp/.test(s));
  const bufferDraw = main.log.findIndex(e => e.k === 'drawImage' && e.a[0] && e.a[0].width !== undefined && !e.a[0]._src);
  assert.ok(firstFlame >= 0, 'back flames drawn');
  const imgCalls = main.log.map((e, i) => ({ e, i })).filter(({ e }) => e.k === 'drawImage');
  const flameIdx = imgCalls.filter(({ e }) => /fx-fire-flame/.test(e.a[0]._src || '')).map(x => x.i);
  assert.ok(flameIdx.some(i => i < bufferDraw) && flameIdx.some(i => i > bufferDraw), 'flames both before and after the soul');
  assert.ok(sprites.some(s => /fx-soul-sweat-drops\.webp/.test(s)), 'sweat drops');
  assert.ok(sprites.some(s => /fx-fire-embers\.webp/.test(s)), 'embers');
  assert.ok(buf.log.some(e => e.set === 'globalCompositeOperation' && e.v === 'source-atop'), 'tint overlay');
  assert.ok(![...main.log, ...buf.log].some(e => e.set === 'filter'), 'no ctx.filter');
  assert.ok(main.log.some(e => e.set === 'globalCompositeOperation' && e.v === 'lighter'), 'painted fire is additive');
}));

test('P6 cauldron: red flash pulses over time; reduced-motion = constant tint, static flames/sweat/embers', () => withImages(() => {
  const buf = recorder(), bufCtx = buf.mk('buf');            // module keeps one buffer per pot → one shared recorder, read by slice
  globalThis.OffscreenCanvas = class { constructor(w, h) { this.width = w; this.height = h; } getContext() { return bufCtx; } };
  const tints = (t, reduced) => {
    const main = recorder(), from = buf.log.length;
    drawPotSoul(main.ctx, POTS.th, 0, env(t, reduced), () => {});
    const fill = buf.log.slice(from).find(e => e.set === 'fillStyle' && /255,32,20/.test(e.v));
    const alpha = +/rgba\(255,32,20,([\d.]+)\)/.exec(fill.v)[1];
    const geometry = JSON.stringify(main.log.filter(e => e.k === 'drawImage').map(e => e.a.slice(1).map(n => typeof n === 'number' ? Math.round(n * 100) / 100 : n)));
    return { alpha, geometry };
  };
  const live = [0, 150, 400, 700, 1100].map(t => tints(t, false).alpha);
  assert.ok(Math.max(...live) - Math.min(...live) > 0.3, 'flashes: ' + live.join(','));
  assert.ok(Math.min(...live) >= 0.05 && Math.max(...live) <= 0.7);
  const a = tints(0, true), b = tints(3777, true);
  assert.equal(a.alpha, b.alpha); assert.equal(a.geometry, b.geometry, 'reduced motion: nothing moves');
  assert.notEqual(tints(0, false).geometry, tints(3777, false).geometry);
}));

test('P6 cauldron: wired into the room, no per-frame ctx.filter, assets present, cache-bust suffixes', () => {
  const room = readFileSync(new URL('../src/room.js', import.meta.url), 'utf8');
  assert.match(room, /drawPotSoul\(ctx, pot, i, \{ px, py, U, t, reduced:prefersReducedMotion\(\) \}/);
  assert.match(room, /reducedQuery \|\|= matchMedia/, 'MediaQueryList cached, not rebuilt every frame');
  const pot = readFileSync(new URL('../src/pot-souls.js', import.meta.url), 'utf8');
  assert.ok(!/\.filter\s*=/.test(pot));
  for (const f of ['fx-soul-sweat-drops', 'fx-fire-flame-a', 'fx-fire-flame-b', 'fx-fire-flame-c', 'fx-fire-embers']) assert.ok(existsSync(new URL(`../img/fx/${f}.webp`, import.meta.url)), f);
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assertVersionedImports(html, ['room.js']);
  assertVersionedImports(html, ['pot-souls.js']);
  assertVersionedImports(html, ['minigames/krata-qte.js']);
  assertVersionedImports(html, ['ui.js']);
});

// ---------- มินิเกมฝึกลูกไฟ ----------
class El extends EventTarget {
  constructor() { super(); this.cls = new Set(); this.classList = { add: c => this.cls.add(c), remove: c => this.cls.delete(c), toggle: (c, on) => { (on === undefined ? !this.cls.has(c) : on) ? this.cls.add(c) : this.cls.delete(c); } }; this.nodes = new Map(); this.style = {}; this.disabled = false; this.textContent = ''; }
  set innerHTML(html) { this.html = html; this.nodes.clear(); for (const s of ['.mg-x', '.g5-content', '.g5-choices', '.g5-count', '.g5-round-message', '.g5-closeup', '.g5-orb img', '.g5-green', '.g5-white', '.g5-needle', '[data-fire]', 'p']) this.nodes.set(s, new El()); this.nodes.get('[data-fire]').disabled = html.includes('type="button" disabled'); }
  querySelector(s) { return this.nodes.get(s) || null; }
  append() {}
  setAttribute(k) { if (k === 'disabled') this.disabled = true; }
  closest() { return null; }
}
// The choice buttons are created through document.createElement in play(); start() captures the first one (Yama) and clicks it.
async function start() {
  const { runKrataQte } = await import('../src/minigames/krata-qte.js');
  const env0 = { document: globalThis.document, raf: globalThis.requestAnimationFrame, caf: globalThis.cancelAnimationFrame, createElement: null };
  let now = performance.now(), frame = null;
  const created = [];
  globalThis.document = Object.assign(new EventTarget(), { hidden: false, documentElement: {}, createElement: () => { const b = new El(); created.push(b); return b; } });
  globalThis.requestAnimationFrame = fn => { frame = fn; return 1; }; globalThis.cancelAnimationFrame = () => { frame = null; };
  const advance = ms => { for (let e = 0; e < ms; e += 50) { now += 50; const f = frame; frame = null; f?.(now); } };
  const g = createGame(); g.save = () => true; g.coin = 1000; assert.ok(g.hire('plerng'));
  const st = { def: STATIONS.find(s => s.k === 'krata'), slots: [], fire: 0 }; g.stations.push(st);
  const room = { krataApproach: [.5, .54], walkTo() {}, pos: () => [.5, .54], stokeEffect() {} };
  const host = new El(); let closed = 0;
  const stop = runKrataQte(host, { g, st, room, training: true, alive: () => true, onClose: () => closed++ });
  created[0].onclick();                       // first choice = Yama → play()
  const body = host.querySelector('.g5-content');
  return { g, host, body, button: body.querySelector('[data-fire]'), msg: body.querySelector('.g5-round-message'), advance, now: () => now, stop, restore: () => Object.assign(globalThis, { document: env0.document, requestAnimationFrame: env0.raf, cancelAnimationFrame: env0.caf }), closed: () => closed };
}
const ptr = (type, extra = {}) => { const e = new Event(type, { cancelable: true, bubbles: true }); for (const [k, v] of Object.entries({ button: 0, pointerType: 'mouse', ...extra })) Object.defineProperty(e, k, { value: v }); return e; };
const key = (k, extra = {}) => { const e = new Event('keydown', { cancelable: true }); Object.defineProperty(e, 'key', { value: k }); for (const [a, v] of Object.entries(extra)) Object.defineProperty(e, a, { value: v }); return e; };
const hitsOf = s => s.g._krataSession?.hits ?? -1;

test('P6 minigame: every input counts a hit inside the green window (mouse, touch, portrait tap, tap anywhere, Space/Enter without focus)', async () => {
  const cases = [
    ['mouse on button', s => s.button.dispatchEvent(ptr('pointerdown'))],
    ['touch on button', s => s.button.dispatchEvent(ptr('pointerdown', { pointerType: 'touch' }))],
    ['tap on portrait', s => s.body.querySelector('.g5-closeup').dispatchEvent(ptr('pointerdown', { pointerType: 'touch' }))],
    ['tap anywhere on the overlay', s => s.host.dispatchEvent(ptr('pointerdown', { pointerType: 'touch', target: new El() }))],
    ['Space with nothing focused', s => globalThis.document.dispatchEvent(key(' ', { target: new El() }))],
    ['Enter with nothing focused', s => globalThis.document.dispatchEvent(key('Enter', { target: new El() }))],
    ['programmatic/AT click (detail 0)', s => s.button.onclick({ detail: 0 })],
  ];
  for (const [name, fire] of cases) {
    const s = await start();
    try { s.advance(1600); assert.equal(hitsOf(s), 0, name); fire(s); assert.equal(hitsOf(s), 1, name + ' must count'); assert.equal(s.g._krataSession.misses, 0, name); }
    finally { s.stop(); s.restore(); }
  }
});

test('P6 minigame: a press never vanishes — wait period gives feedback without a miss, the button is never disabled', async () => {
  const s = await start();
  try {
    s.advance(1600); s.button.dispatchEvent(ptr('pointerdown'));
    assert.equal(hitsOf(s), 1); assert.equal(s.button.disabled, false);
    s.advance(100);
    const before = s.msg.textContent;
    s.button.dispatchEvent(ptr('pointerdown')); globalThis.document.dispatchEvent(key(' ', { target: new El() }));
    assert.equal(s.g._krataSession.misses, 0, 'press during the 650 ms wait is not a miss');
    assert.equal(hitsOf(s), 1);
    assert.notEqual(s.msg.textContent, before); assert.match(s.msg.textContent, /รอ/);
    assert.equal(s.button.disabled, false, 'button stays enabled so the browser still delivers the press');
    assert.ok(s.button.cls.has('fire-wait'));
    s.advance(700); assert.ok(!s.button.cls.has('fire-wait'));
    s.advance(900);   // ring passes untouched
    assert.equal(s.button.disabled, false);
    assert.equal(s.g._krataSession.misses, 0);
  } finally { s.stop(); s.restore(); }
});

test('P6 minigame: Space keydown + the keyup click it spawns count once; Close button keys are ignored; non-primary mouse buttons ignored', async () => {
  const s = await start();
  try {
    s.advance(1600);
    globalThis.document.dispatchEvent(key(' ', { target: new El() })); s.button.onclick({ detail: 0 });
    assert.equal(hitsOf(s), 1); assert.equal(s.msg.textContent, 'ถูกจังหวะ · เตรียมลูกไฟถัดไป', 'keyup click did not overwrite the result with a wait message');
    s.advance(700 + 1600 - 700);
    const closeBtn = new El(); closeBtn.closest = sel => sel.includes('.mg-head') ? closeBtn : null;
    globalThis.document.dispatchEvent(key('Enter', { target: closeBtn })); assert.equal(hitsOf(s), 1);
    s.button.dispatchEvent(ptr('pointerdown', { button: 2 })); assert.equal(hitsOf(s), 1);
    const head = new El(); head.closest = () => head; s.host.dispatchEvent(ptr('pointerdown', { target: head })); assert.equal(hitsOf(s), 1);
    globalThis.document.dispatchEvent(key(' ', { target: new El(), repeat: true })); assert.equal(hitsOf(s), 1);
  } finally { s.stop(); s.restore(); }
});

test('P6 minigame: judged at the moment of the press (event time), not the last painted frame; early/late is reported', async () => {
  const s = await start();
  try {
    s.advance(1400);                                                   // painted ring r=1.133 — just outside the window
    const late = ptr('pointerdown'); Object.defineProperty(late, 'timeStamp', { value: s.now() + 60 });
    s.button.dispatchEvent(late);                                      // 60 ms later the ring is at r=1.088 → inside
    assert.equal(hitsOf(s), 1, 'press 60 ms after the last frame is judged at its own time');
  } finally { s.stop(); s.restore(); }
  const e = await start();
  try {
    e.advance(500); e.button.dispatchEvent(ptr('pointerdown'));
    assert.equal(e.g._krataSession.misses, 1); assert.match(e.msg.textContent, /เร็วไป/);
    e.advance(2400);                                                   // painted ring r=0.8875, still inside
    const slow = ptr('pointerdown'); Object.defineProperty(slow, 'timeStamp', { value: e.now() + 40 });
    e.button.dispatchEvent(slow);                                      // 40 ms later r=0.8575 → just past the window
    assert.equal(e.g._krataSession.misses, 2); assert.match(e.msg.textContent, /ช้าไป/);
  } finally { e.stop(); e.restore(); }
});

test('P6 minigame: reward/difficulty numbers unchanged (window ±0.12 radius, 5 hits / 3 misses, 650 ms retry)', async () => {
  const { trainingHit, trainingRadius } = await import('../src/krata-control.js');
  assert.ok(trainingHit(1.119) && trainingHit(.881) && !trainingHit(1.13) && !trainingHit(.87));
  assert.ok(Math.abs(trainingRadius(0) - 2.2) < 1e-9 && Math.abs(trainingRadius(1100) - 1.375) < 1e-9);
  const src = readFileSync(new URL('../src/minigames/krata-qte.js', import.meta.url), 'utf8');
  assert.match(src, /elapsed=-650/); assert.match(src, /radius < \.86 \|\| elapsed >= 2200/);
});

test('P6 minigame: cleanup — stop() removes every listener and pending flash timer', async () => {
  const s = await start();
  s.advance(1600); s.button.dispatchEvent(ptr('pointerdown'));                     // schedules a flash timer
  s.stop(); s.advance(3000);
  const after = hitsOf(s); s.button.dispatchEvent(ptr('pointerdown')); globalThis.document.dispatchEvent(key(' ', { target: new El() })); s.host.dispatchEvent(ptr('pointerdown', { target: new El() }));
  assert.equal(hitsOf(s), after); s.restore();
});
