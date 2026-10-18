import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  clampCenter, viewTransform, planCamera, mapRect, unmapRect, shakeSpec, shakeAt, unionRect, ease,
  CAMERA_TIMING, createBattleCamera, MIN_ZOOM, MAX_ZOOM, strikeTime,
} from '../src/battle-camera.js';

const read = f => readFileSync(new URL('../' + f, import.meta.url), 'utf8');
const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} ≈ ${b}`);

// ---------- pure maths ----------
test('M1 clampCenter keeps the view inside the world (no edge ever shows)', () => {
  const W = 1000, H = 500, z = 1.25;                    // view = 800 × 400
  const c = clampCenter(W, H, z, 10, 10);
  near(c.cx, 400); near(c.cy, 200);                      // pushed in from the top-left corner
  const d = clampCenter(W, H, z, 990, 490);
  near(d.cx, 600); near(d.cy, 300);
  const mid = clampCenter(W, H, 1, 123, 456);            // zoom 1: only one legal centre
  near(mid.cx, 500); near(mid.cy, 250);
});

test('M1 viewTransform: the focus point lands in the middle of the stage, edges stay covered', () => {
  const W = 1678, H = 937, z = 1.26, fx = 800, fy = 560;
  const v = viewTransform(W, H, z, fx, fy);
  near(v.z * v.cx + v.tx, W / 2); near(v.z * v.cy + v.ty, H / 2);   // focus -> screen centre
  assert.ok(v.tx <= 1e-9 && v.ty <= 1e-9, 'world left/top edge never moves right/down of the stage');
  assert.ok(v.tx + W * z >= W - 1e-6 && v.ty + H * z >= H - 1e-6, 'world right/bottom edge always covers the stage');
  const wide = viewTransform(W, H, 1, 300, 300);
  near(wide.tx, 0); near(wide.ty, 0);
});

test('M1 planCamera lowers the zoom (never below 1) so every keepVisible rect stays on screen', () => {
  const W = 1678, H = 937;
  const foes = { l:1200, r:1640, t:420, b:700 };           // far right
  const p = planCamera({ W, H, focus:{ x:300, y:560 }, zoom:1.6, keepVisible:[foes] });
  assert.ok(p.z >= MIN_ZOOM && p.z <= 1.6);
  const v = viewTransform(W, H, p.z, p.cx, p.cy), box = mapRect(foes, v);
  assert.ok(box.l >= -0.5 && box.r <= W + 0.5 && box.t >= -0.5 && box.b <= H + 0.5, 'enemies fully inside the view');
  const ally = { l:200, r:330, t:430, b:700 };
  const q = planCamera({ W, H, focus:{ x:265, y:560 }, zoom:1.1, keepVisible:[unionRect([foes, ally])] });
  const v2 = viewTransform(W, H, q.z, q.cx, q.cy);
  for (const r of [foes, ally]) { const m = mapRect(r, v2); assert.ok(m.l >= -0.5 && m.r <= W + 0.5, 'ally + foes both visible at the select zoom'); }
  assert.equal(planCamera({ W, H, focus:{ x:1, y:1 }, zoom:9 }).z, MAX_ZOOM, 'zoom clamped to 1.6');
  assert.equal(planCamera({ W, H, focus:{ x:1, y:1 }, zoom:0.2 }).z, MIN_ZOOM, 'never zooms out past the wide shot');
});

test('M1 click after transform: mapRect / unmapRect are exact inverses (hit points still land on the sprite)', () => {
  const W = 1678, H = 937, v = viewTransform(W, H, 1.26, 1271, 567);
  const sprite = { l:1200, r:1340, t:500, b:700 };
  const shown = mapRect(sprite, v);
  const back = unmapRect(shown, v);
  for (const k of ['l', 'r', 't', 'b']) near(back[k], sprite[k], 1e-6);
  // the centre of the drawn sprite, mapped back, is inside the layout sprite → a click there selects it
  const cx = (shown.l + shown.r) / 2, cy = (shown.t + shown.b) / 2;
  const lx = (cx - v.tx) / v.z, ly = (cy - v.ty) / v.z;
  assert.ok(lx > sprite.l && lx < sprite.r && ly > sprite.t && ly < sprite.b);
});

test('M1 shake: 2–4 px per axis, 150–250 ms, decays to zero', () => {
  const a = shakeSpec(1), b = shakeSpec(3);
  assert.deepEqual([a.amp, a.ms, b.amp, b.ms], [2, 150, 4, 250]);
  assert.deepEqual(shakeSpec(99), shakeSpec(3), 'power clamped');
  for (const p of [1, 2, 3]) {
    const s = shakeSpec(p);
    for (let t = 0; t < s.ms; t += 7) { const o = shakeAt(s, t); assert.ok(Math.abs(o.x) <= s.amp + 1e-9 && Math.abs(o.y) <= s.amp + 1e-9); }
    assert.deepEqual(shakeAt(s, s.ms), { x:0, y:0, amp:0 });
  }
});

test('M1 timing contract: values in the brief (zoom 1.08–1.12 select, 1.2–1.3 skill, dim 35–50 %, hit-stop 60–90 ms)', () => {
  assert.ok(CAMERA_TIMING.select.zoom >= 1.08 && CAMERA_TIMING.select.zoom <= 1.12);
  assert.ok(CAMERA_TIMING.skill.zoom >= 1.2 && CAMERA_TIMING.skill.zoom <= 1.3);
  assert.ok(CAMERA_TIMING.skill.dimAlpha >= .35 && CAMERA_TIMING.skill.dimAlpha <= .5);
  assert.ok(CAMERA_TIMING.hitStop.heavy >= 60 && CAMERA_TIMING.hitStop.crit <= 90);
  assert.ok(ease.out(0) === 0 && ease.out(1) === 1 && ease.inOut(.5) === .5);
});

// ---------- controller with a fake DOM ----------
function fakeDom({ reduced = false, stored = null } = {}) {
  const cls = new Set();
  const classList = { add:c => cls.add(c), remove:c => cls.delete(c), toggle:(c, on) => (on ?? !cls.has(c)) ? cls.add(c) : cls.delete(c), contains:c => cls.has(c), _s:cls };
  const mk = () => ({ style:{ setProperty(k, v) { this[k] = v; }, getPropertyValue() { return ''; } }, classList:{ add() {}, remove() {}, toggle() {}, contains:() => false }, dataset:{}, parentNode:null, remove() {}, after() {}, appendChild() {}, querySelectorAll:() => [], isConnected:true, offsetWidth:1 });
  const sprites = new Map();
  const sprite = (key, l, t, w, h) => { const el = { ...mk(), matches:s => s === 'img', getBoundingClientRect:() => ({ left:l, top:t, right:l + w, bottom:t + h, width:w, height:h }), querySelector:() => null }; sprites.set(key, el); return el; };
  const world = { ...mk(), classList, isConnected:true, style:{}, contains:() => true, querySelector:() => null,
    querySelectorAll(sel) {
      const m = sel.match(/data-crew-pick="([^"]+)"|data-foe-id="([^"]+)"/);
      if (/data-foe-id\]:not/.test(sel)) return [sprites.get('foe:f1')].filter(Boolean);
      const key = m && (m[1] || ('foe:' + m[2]));
      return key && sprites.get(key) ? [sprites.get(key)] : [];
    } };
  const stage = { isConnected:true, clientWidth:1000, clientHeight:500, clientLeft:0, clientTop:0, getBoundingClientRect:() => ({ left:0, top:0, right:1000, bottom:500, width:1000, height:500 }),
    classList:{ ...classList }, querySelector:() => world };
  sprite('you', 200, 250, 60, 120); sprite('foe:f1', 700, 250, 60, 120);
  globalThis.matchMedia = () => ({ matches:reduced });
  globalThis.localStorage = { getItem:() => stored, setItem(k, v) { stored = v; } };
  globalThis.document = { createElement:() => mk() };
  globalThis.CSS = { escape:s => s };
  return { stage, world };
}
const wait = ms => new Promise(r => setTimeout(r, ms));

test('M1 camera zooms and re-centres, flags busy while moving, and lands exactly on the plan', async () => {
  const { stage, world } = fakeDom();
  const cam = createBattleCamera(); cam.timeScale = 4;
  assert.ok(cam.attach(stage));
  const p = cam.focus('you', { zoom:1.26, ms:240 });
  assert.equal(cam.state().moving, true);
  assert.ok(world.classList.contains('cam-busy'), 'scene is click-blocked while the camera moves');
  await p;
  const s = cam.state();
  assert.equal(s.moving, false); assert.ok(!world.classList.contains('cam-busy'));
  near(s.zoom, 1.26, 1e-3);
  assert.match(world.style.transform, /scale\(1\.2600\)/);
  // rectOf un-zooms: the sprite's layout box is recovered from the drawn box
  const v = cam.applied();
  const drawn = { left:200 * v.z + v.tx, top:250 * v.z + v.ty, right:260 * v.z + v.tx, bottom:370 * v.z + v.ty };
  const el = { getBoundingClientRect:() => ({ ...drawn, width:drawn.right - drawn.left, height:drawn.bottom - drawn.top }) };
  const r = cam.rectOf(el);
  near(r.left, 200, 1e-3); near(r.top, 250, 1e-3); near(r.width, 60, 1e-3);
  cam.detach();
});

test('M1 reduced-motion: no zoom, no pan, no shake — events still fire on schedule, dim still works', async () => {
  const { stage } = fakeDom({ reduced:true });
  const cam = createBattleCamera(); cam.timeScale = 10;
  cam.attach(stage);
  const seen = []; for (const n of ['windup', 'impact', 'recover']) cam.on(n, () => seen.push(n));
  const zs = [];
  const run = cam.cue('skill', { user:'you', targets:['foe:f1'], power:3, cutMs:0 });
  const t0 = Date.now();
  while (Date.now() - t0 < 400) { zs.push(cam.applied().z); await wait(8); }
  await run.done;
  assert.deepEqual(seen, ['windup', 'impact', 'recover']);
  assert.ok(zs.every(z => z === 1), 'camera stayed on the wide shot');
  assert.equal(cam.reduced, true);
  cam.dim(true, { alpha:.42 });
  assert.equal(cam.state().dim, .42);
  cam.detach();
});

test('M1 settings toggle: off = same as reduced motion, persisted in localStorage; on again restores moves', async () => {
  const { stage } = fakeDom({ stored:'0' });
  const cam = createBattleCamera(); cam.timeScale = 10;
  assert.equal(cam.enabled, false, 'reads the stored setting');
  cam.attach(stage);
  await cam.focus('you', { zoom:1.3, ms:100 });
  assert.equal(cam.state().zoom, 1);
  cam.setEnabled(true);
  assert.equal(globalThis.localStorage.getItem(), '1');
  await cam.focus('you', { zoom:1.3, ms:100 });
  near(cam.state().zoom, 1.3, 1e-3);
  cam.detach();
});

test('M1 single speed knob: timeScale shortens every camera duration', async () => {
  const { stage } = fakeDom();
  const slow = createBattleCamera(), fast = createBattleCamera();
  slow.timeScale = 1; fast.timeScale = 4;
  slow.attach(stage); fast.attach(stage);
  const a = Date.now(); await fast.focus('you', { zoom:1.2, ms:400 }); const tf = Date.now() - a;
  assert.ok(tf < 250, `x4 finishes ~100 ms, took ${tf}`);
  slow.detach(); fast.detach();
});

test('M1 cue emits impact exactly once even when a newer cue replaces it mid-way', async () => {
  const { stage } = fakeDom();
  const cam = createBattleCamera(); cam.timeScale = 1;
  cam.attach(stage);
  const seen = []; cam.on('impact', i => seen.push(i.action));
  cam.cue('attack', { user:'you', targets:['foe:f1'], action:'atk', power:2 });
  await wait(60);                                      // before windup/impact
  cam.cue('select', { user:'you' });                   // phase ended early → replaced
  await wait(30);
  assert.deepEqual(seen, ['atk'], 'the replaced cue still delivered its impact');
  await wait(500);
  assert.deepEqual(seen, ['atk'], 'and never twice');
  cam.detach();
});

// ---------- wiring (source level) ----------
test('M1 wiring: only .cam-world is transformed; HUD stays outside; cache-bust -m1 in both entry pages', () => {
  const ui = read('src/ui.js'), cam = read('src/battle-camera.js'), css = read('src/battle-camera.css');
  assert.match(ui, /from '\.\/battle-camera\.js\?v=[^']*m1'/);
  assert.match(ui, /\$\{hp \? `<div class="cam-world"/, 'combat arena wraps scene in .cam-world');
  assert.match(ui, /\$\{hp \? '<\/div>' : ''\}\s*\n\s*\$\{controls\}/, 'world closes before controls/HUD');
  assert.doesNotMatch(cam, /\.filter\s*=|filter:\s*blur|style\.filter/, 'no per-frame filters');
  assert.match(css, /\.cam-world>\.cam-dim\{[^}]*opacity:0/);
  assert.match(read('src/battle-scale.js'), /setBattleRectMapper/);
  for (const f of ['index.html', 'output/game-review/index.html']) {
    const h = read(f);
    assert.match(h, /src\/ui\.js\?v=[^"]*-m1(?:-m2)?(?:-n2)?(?:-n1)?"/, f);
    assert.match(h, /src\/battle-camera\.css\?v=[^"]*m1"/, f);
  }
  assert.match(read('docs/battle-camera-api.md'), /camera\.focus\(target/);
});

test('M1 strikeTime: contact frame of a drawn attack (Codex combat-animation-v1) and camera impact retimed to it', async () => {
  assert.equal(strikeTime([100, 90, 100, 120, 100, 140]), 410, '6 frames -> start of frame 4');
  assert.equal(strikeTime([100, 100]), 100, 'short sequences strike on the last frame');
  assert.equal(strikeTime([]), null); assert.equal(strikeTime(undefined), null);
  const m = JSON.parse(readFileSync(new URL('../img/combat-animation-v1/manifest.json', import.meta.url), 'utf8')).sprites;
  const attacks = Object.entries(m).filter(([, r]) => r.modes?.attack);
  assert.ok(attacks.length > 10, 'manifest has attack animations');
  for (const [k, r] of attacks) { const t = strikeTime(r.modes.attack.durations), total = r.modes.attack.durations.reduce((a, b) => a + b, 0); assert.ok(t > 0 && t < total, k); }
  const { stage } = fakeDom();
  const cam = createBattleCamera(); cam.attach(stage);
  let at = 0; const t0 = Date.now(); cam.on('impact', () => { at = Date.now() - t0; });
  cam.cue('attack', { user:'you', targets:['foe:f1'], action:'atk', power:2, impactAt:700 });
  await wait(900);
  assert.ok(at >= 690 && at < 850, `impact followed the drawn contact frame (700 ms), got ${at}`);
  cam.detach();
});
