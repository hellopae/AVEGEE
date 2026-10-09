import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  WALK_SPEED_H, WALK_STRIDE_H, WALK_SLICE_MS, WALK_MAX_CATCHUP_MS, WALK_ART_STRIDE,
  walkStridePx, walkPhase, walkSlices, walkDrawDistance,
} from '../src/walk-motion.js';

// F1 — Yama's walk in rooms and frontier: speed in hero-heights/second, independent of frame rate;
// walk frames follow real distance; the frontier background is resampled once, not per frame.

const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ ok: true, json: async () => manifest });
const handlers = {};
globalThis.addEventListener = (n, f) => { handlers[n] = f; };
globalThis.removeEventListener = () => {};
let rafCb = null;
globalThis.requestAnimationFrame = cb => { rafCb = cb; return 1; };
globalThis.cancelAnimationFrame = () => {};
globalThis.devicePixelRatio = 1;
globalThis.Image = class {
  naturalWidth = 1678; naturalHeight = 937;
  set src(v) { this._src = v; queueMicrotask(() => this.onload?.()); }
  get src() { return this._src; }
};
const calls = [];
const ctx = new Proxy({ drawImage(...a) { calls.push(a); }, measureText: () => ({ width: 20 }) },
  { get: (o, k) => k in o ? o[k] : () => {}, set: () => true });
const mkCanvas = (w, h) => ({ width: 0, height: 0, getContext: () => ctx,
  getBoundingClientRect: () => ({ left: 0, top: 0, width: w, height: h }),
  addEventListener() {}, removeEventListener() {} });

const { ROOMS, STATIONS } = await import('../src/data.js');
const { makeRoom } = await import('../src/room.js');
const { makeFrontierWalk, frontierSession, clearFrontierSession } = await import('../src/frontier.js');
const art = await import('../src/art.js');
const { heroWalkSheet } = await import('../src/hero-walk-assets.js');
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx, isCache: true }) };   // after imports: i18n.js touches document.documentElement
art.bindZone(() => 'cyberhell');
await new Promise(r => setImmediate(r));

const key = (type, k) => handlers[type]({ target: { tagName: 'BODY' }, key: k, type, preventDefault() {} });

test('speed is hero-heights/second whatever the frame length', () => {
  const heroPx = 100;
  for (const frame of [8, 16.7, 33, 83, 125, 250]) {
    let dist = 0;
    for (let t = 0; t < 2000; t += frame) for (const s of walkSlices(frame)) dist += walkStridePx(heroPx, s);
    const expect = WALK_SPEED_H * heroPx * (Math.ceil(2000 / frame) * frame) / 1000;
    assert.ok(Math.abs(dist - expect) < 1e-6, `${frame}ms frames`);
  }
});

test('long frames are consumed in small slices, never clamped to 50ms', () => {
  const s = walkSlices(83);
  assert.ok(s.every(x => x <= WALK_SLICE_MS + 1e-9));
  assert.ok(Math.abs(s.reduce((a, b) => a + b, 0) - 83) < 1e-9);
  assert.ok(Math.abs(walkSlices(5000).reduce((a, b) => a + b, 0) - WALK_MAX_CATCHUP_MS) < 1e-9);
  assert.deepEqual(walkSlices(0), []);
});

test('walk phase follows distance in hero heights and matches the art.js frame counter', () => {
  const h = 120, step = h * WALK_STRIDE_H;
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => walkPhase(i * step + 1, h)), [0, 1, 2, 3, 0, 1]);
  for (const d of [0, 7, 50, 333, 1234]) {
    assert.equal(Math.floor(walkDrawDistance(d, h) / WALK_ART_STRIDE) % 4, walkPhase(d, h));
  }
});

test('room: same distance walked at 60fps, 12fps and 4fps; speed = 2.5 hero heights/s', () => {
  const run = (frame) => {
    const room = makeRoom(mkCanvas(1248, 669), { zone: 'cyberhell', items: [], held: [], sentences: [] },
      STATIONS.find(s => s.k === 'krata'), { ...ROOMS.krata, walk: [{ poly: [[0, 0], [1, 0], [1, 1], [0, 1]] }], me: [.2, .5] }, 'img/BG-Krata.webp', null);
    room.start(); room.tick(0);
    const x0 = room.pos()[0];
    key('keydown', 'd');
    for (let t = 0; t < 1000; t += frame) room.tick(Math.min(frame, 1000 - t));
    key('keyup', 'd');
    const x1 = room.pos()[0];
    room.destroy();
    return x1 - x0;
  };
  const a = run(16.6), b = run(83), c = run(250);
  assert.ok(Math.abs(a - b) < 0.004 && Math.abs(a - c) < 0.012, `${a} ${b} ${c}`);
  // 1s * 2.5 hero heights; hero = 0.15 of the short side (669px); x is a fraction of the image width
  const heroPx = 669 * 0.15;
  const frac = WALK_SPEED_H * heroPx / (669 * 1913 / 1025 > 1248 ? 1248 : 669 * 1913 / 1025);
  assert.ok(a > 0.1, 'actually moved');
  assert.ok(Math.abs(a - frac) / frac < 0.12, `speed ${a} vs ${frac}`);
});

test('frontier: speed and walk frames independent of frame rate; background resampled once; always walk frames while moving', () => {
  const sheet = heroWalkSheet('cyberhell');
  const walkFrameX = new Set(Object.values(sheet.directions).flat().map(b => b.x));
  const run = (frame) => {
    clearFrontierSession(); calls.length = 0;
    let clock = 1000;
    const orig = performance.now; performance.now = () => clock;
    const FW = makeFrontierWalk(mkCanvas(1758, 964), { zone: 'cyberhell', guard: null }, { bg: 'img/theme-v4/frontier-cyberhell.webp', kinds: [], wave: 1, alive: () => true });
    FW.start();
    const P = frontierSession('cyberhell').player;
    return new Promise(res => setImmediate(() => {
      rafCb(clock += 16); // first frame after the background has loaded
      const y0 = P.y; key('keydown', 's');
      const seq = [];
      for (let t = 0; t < 600; t += frame) {
        calls.length = 0; rafCb(clock += Math.min(frame, 600 - t));
        const w = calls.find(c => c.length === 9 && c[0]?.src?.includes('walk-4dir'));
        seq.push(!!w);
      }
      key('keyup', 's');
      const bgDraws = calls.length;
      performance.now = orig; FW.destroy();
      res({ dy: P.y - y0, seq, bgDraws });
    }));
  };
  return (async () => {
    const a = await run(16), b = await run(83), c = await run(250);
    assert.ok(a.dy > 0.05, 'moved: ' + a.dy);
    assert.ok(Math.abs(a.dy - b.dy) < 0.006 && Math.abs(a.dy - c.dy) < 0.02, `${a.dy} ${b.dy} ${c.dy}`);
    // speed: 2.5 hero heights/s * 0.085 of the short side; box.h = bg scaled to cover (964*... px)
    const boxH = 964 * Math.max(1758 / 1678, 964 / 937) * 937 / 964;
    const expect = WALK_SPEED_H * 0.085 * Math.min(1678 * Math.max(1758 / 1678, 964 / 937), boxH) * 0.6 / boxH;
    assert.ok(Math.abs(a.dy - expect) / expect < 0.15, `speed ${a.dy} vs ${expect}`);
    for (const r of [a, b, c]) assert.ok(r.seq.every(Boolean), 'no idle-pose flicker while moving');
  })();
});

test('frontier: scene image is resampled once, then blitted from a cached canvas every frame', async () => {
  clearFrontierSession();
  let clock = 5000; const orig = performance.now; performance.now = () => clock;
  const FW = makeFrontierWalk(mkCanvas(1758, 964), { zone: 'cyberhell', guard: null }, { bg: 'img/theme-v4/frontier-cyberhell.webp', kinds: [], wave: 1, alive: () => true });
  FW.start(); await new Promise(r => setImmediate(r));
  calls.length = 0;
  for (let i = 0; i < 20; i++) rafCb(clock += 16);
  performance.now = orig; FW.destroy();
  const full = calls.filter(c => c.length === 9 && c[0]?.src?.includes('frontier-cyberhell'));
  const blits = calls.filter(c => c[0]?.isCache);
  assert.equal(full.length, 1, 'the 1678px scene image is scaled exactly once');
  assert.equal(blits.length, 20, 'one cached-canvas blit per frame');
});
