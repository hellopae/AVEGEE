import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, TRAINING_RULES, TRAINING_STATIONS } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { scoreExp, HERO_TRAINING_ID } from '../src/training.js';
import { TRAINING_GAMES, createTrainingGame } from '../src/minigames/training/index.js';
import { runTraining } from '../src/minigames/training/host.js';
import * as mirror from '../src/minigames/training/mirror.js';

const ALL = ['dab','lan','lokan','krata','krajok','sawan','sala','ngiw'];
function game(zone = 'th') {
  const g = createGame(); g.zone = zone;
  g.stations = ALL.map(k => ({ def:STATIONS.find(s => s.k === k), build:0, slots:[], speedLv:2 }));
  g.crew = ['taan','plerng','kan','boon','dam','nira'].map(k => actorFromLegacy({ k }, zone));
  g.guard = actorFromLegacy({}, zone, 'guard'); syncRoster(g);
  g.save = () => true;
  return g;
}
const rec = (g, id) => id.startsWith('global:') ? g.training.shared[id] : g.training.zones[id.split(':')[0]]?.[id];
const win = (g, station, id, score = 100) => {
  const session = g.startTraining(station, id); assert.ok(session, `${station} ${id} should start`);
  return g.finishTraining({ sessionId:session.id, score, completed:true });
};

// ---- a small fake DOM so the real host + real UI modules run under node --------------------------------------------
class FakeEl extends EventTarget {
  constructor(tag) { super(); this.tag = tag; this.style = {}; this.children = []; this.attrs = {}; this.textContent = ''; this.disabled = false; this.value = 0; }
  setAttribute(k, v) { this.attrs[k] = String(v); } getAttribute(k) { return this.attrs[k]; }
  append(...c) { this.children.push(...c); } appendChild(c) { this.children.push(c); } replaceChildren(...c) { this.children = c; }
  getBoundingClientRect() { return { left:0, top:0, width:100, height:100 }; }
  find(pred, out = []) { if (pred(this)) out.push(this); this.children.forEach(c => c.find?.(pred, out)); return out; }
}
const withDom = fn => {
  const old = globalThis.document;
  const doc = Object.assign(new EventTarget(), { hidden:false, createElement:t => new FakeEl(t), createElementNS:(ns, t) => new FakeEl(t) });
  globalThis.document = doc;
  try { return fn(doc); } finally { globalThis.document = old; }
};
const frames = () => { let queued = null, n = 0; return { raf:fn => { queued = fn; return ++n; }, caf:() => { queued = null; }, step(time) { const fn = queued; queued = null; fn?.(time); }, get pending() { return !!queued; } }; };

// ================================================ krajok / mirror (→ kan) =============================================
const allAngles = n => { const out = []; for (let k = 0; k < mirror.MIRROR_STATES ** n; k++) { let kk = k; const a = []; for (let i = 0; i < n; i++) { a.push(kk % mirror.MIRROR_STATES * mirror.MIRROR_STEP); kk = Math.floor(kk / mirror.MIRROR_STATES); } out.push(a); } return out; };

test('B8 krajok: every level is solvable (brute-force solver), starts unsolved, and the planted solution works', () => {
  let threeMirror = 0;
  for (let seed = 1; seed <= 300; seed++) {
    const level = mirror.makeLevel(seed);
    assert.ok(level.mirrors.length >= 2 && level.mirrors.length <= 3);
    if (level.mirrors.length === 3) threeMirror++;
    assert.equal(mirror.trace(level, level.start).hit, false, `seed ${seed} must not start solved`);
    assert.ok(level.start.every((a, i) => a !== level.solution[i]), `seed ${seed}: no mirror starts correct`);
    const solutions = allAngles(level.mirrors.length).filter(a => mirror.trace(level, a).hit);
    assert.ok(solutions.length >= 1, `seed ${seed} has an answer`);
    assert.ok(solutions.some(a => a.every((x, i) => x === level.solution[i])), `seed ${seed}: planted answer is among them`);
    for (const m of level.mirrors) assert.ok(m.x >= 14 && m.x <= 86 && m.y >= 14 && m.y <= 86, 'mirrors stay inside the board');
  }
  assert.ok(threeMirror > 50 && threeMirror < 250, 'both 2- and 3-mirror boards are generated');
});

test('B8 krajok: solving needs the 2 s hold; moving away resets it; score by solve time', () => {
  const e = createTrainingGame('krajok', 5), level = e.level;
  level.solution.forEach((a, i) => e.input({ type:'set', index:i, angle:a }));
  assert.equal(e.view().beam.hit, true);
  e.step(.1); e.input({ type:'rotate', index:0, delta:15 }); assert.equal(e.view().hold, 0);
  e.input({ type:'rotate', index:0, delta:-15 });
  for (let i = 0; i < 19; i++) e.step(.1);
  assert.equal(e.view().done, false, '1.9 s is not enough');
  e.step(.1); e.step(.1);
  assert.equal(e.view().done, true); assert.equal(e.completed(), true);
  assert.equal(e.score(), 100, 'solved within 15 s earns full marks');
  const slow = createTrainingGame('krajok', 5);
  for (let i = 0; i < 460; i++) slow.step(.1);
  assert.equal(slow.view().done, true, '45 s runs out');
  level.solution.forEach((a, i) => slow.input({ type:'set', index:i, angle:a }));   // too late to count
  assert.equal(slow.completed(), false); assert.equal(slow.score(), 0);
  const mid = createTrainingGame('krajok', 5);
  for (let i = 0; i < 300; i++) mid.step(.1);               // 30 s of fiddling, then solve
  level.solution.forEach((a, i) => mid.input({ type:'set', index:i, angle:a }));
  for (let i = 0; i < 25; i++) mid.step(.1);
  assert.equal(mid.completed(), true); assert.equal(mid.score(), 77, 'solved at 32 s: 100 - (32-15) * 4/3');
});

test('B8 krajok: rotate snaps to 15°, wraps, ignores bad input, cancel/strings do nothing', () => {
  const e = createTrainingGame('krajok', 9), start = e.view().angles[0];
  e.input({ type:'rotate', index:0, delta:15 }); assert.equal(e.view().angles[0], (start + 15) % 180);
  e.input({ type:'rotate', index:0, delta:7 }); assert.equal(e.view().angles[0], (start + 15) % 180, '7° rounds to no step');
  e.input({ type:'set', index:0, angle:-15 }); assert.equal(e.view().angles[0], 165);
  const before = JSON.stringify(e.view());
  for (const bad of ['cancel', 'hit', null, { type:'rotate', index:99, delta:15 }, { type:'rotate', index:0, delta:NaN }, { type:'x' }]) e.input(bad);
  assert.equal(JSON.stringify(e.view()), before);
  e.step(NaN); e.step(-1); assert.equal(e.view().time, 0);
});

test('B8 krajok: host runs the real mirror UI, freezes on pause/hidden, abandons and cleans up', () => withDom(doc => {
  const f = frames(), host = new FakeEl('div'), session = { id:'m1', seed:5 };
  let paused = false, alive = true, abandoned = 0; const results = [];
  const stop = runTraining(host, { station:'krajok', session, paused:() => paused, alive:() => alive,
    onResult:r => results.push(r), onAbandon:() => abandoned++, raf:f.raf, caf:f.caf });
  f.step(0); f.step(100);
  const info = host.children[0], buttons = host.find(n => n.tag === 'button');
  assert.ok(buttons.length >= 4, 'rotate buttons plus one picker per mirror');
  const t0 = info.textContent;
  paused = true; for (let i = 2; i < 100; i++) f.step(i * 100);
  assert.equal(info.textContent.startsWith('หยุดพัก'), true); assert.ok(buttons.every(b => b.disabled));
  const rotateRight = buttons.find(b => b.textContent.includes('+15'));
  const angleBefore = host.find(n => n.tag === 'line' && n.attrs.transform).map(n => n.attrs.transform);
  rotateRight.dispatchEvent(new Event('click'));
  f.step(10100);
  assert.deepEqual(host.find(n => n.tag === 'line' && n.attrs.transform).map(n => n.attrs.transform), angleBefore, 'paused clicks are ignored');
  paused = false; for (let i = 0; i < 15; i++) f.step(10200 + i * 100); assert.notEqual(info.textContent, t0, 'clock runs again after resume');
  rotateRight.dispatchEvent(new Event('click')); f.step(12000);
  assert.notDeepEqual(host.find(n => n.tag === 'line' && n.attrs.transform).map(n => n.attrs.transform), angleBefore, 'unpaused click rotates the selected mirror');
  doc.hidden = true; f.step(10400); assert.ok(buttons.every(b => b.disabled));
  doc.hidden = false; alive = false; f.step(10500);
  assert.equal(abandoned, 1); assert.equal(f.pending, false); assert.equal(results.length, 0);
  stop(); stop(); assert.equal(results.length, 0);
}));

test('B8 krajok: host reports one result when solved (planted answer, real UI path)', () => withDom(() => {
  const f = frames(), host = new FakeEl('div'), results = [];
  const level = mirror.makeLevel(5);
  runTraining(host, { station:'krajok', session:{ id:'m2', seed:5 }, paused:() => false, alive:() => true,
    onResult:r => results.push(r), onAbandon:() => assert.fail('abandon'), raf:f.raf, caf:f.caf });
  const pickers = host.find(n => n.tag === 'button' && n.textContent.startsWith('🪞')), right = host.find(n => n.tag === 'button' && n.textContent.includes('+15'))[0];
  f.step(0);
  level.solution.forEach((target, i) => {
    pickers[i].dispatchEvent(new Event('click'));
    const start = level.start[i], steps = ((target - start) / 15 + 12) % 12;
    for (let k = 0; k < steps; k++) right.dispatchEvent(new Event('click'));
  });
  for (let i = 1; i < 60 && f.pending; i++) f.step(i * 100);
  assert.equal(results.length, 1); assert.equal(results[0].completed, true); assert.equal(results[0].sessionId, 'm2'); assert.ok(results[0].score >= 60);
}));

test('B8 krajok → kan: EXP reaches only the selected Kan; cancel, wrong id, repeat give nothing', () => {
  const g = game();
  assert.deepEqual(g.trainingTargets('krajok').map(a => a.id), ['th:kan']);
  const s = g.startTraining('krajok', 'th:kan');
  assert.equal(g.finishTraining({ sessionId:'wrong', completed:true, score:100 }), null);
  const done = g.finishTraining({ sessionId:s.id, completed:true, score:100 });
  assert.equal(done.exp, 40); assert.equal(g.finishTraining({ sessionId:s.id, completed:true, score:100 }), null);
  assert.equal(rec(g, 'th:kan').exp, 40);
  for (const other of ['th:taan','th:plerng','th:boon','th:dam','th:guard',HERO_TRAINING_ID,'global:nira']) assert.equal(rec(g, other)?.exp ?? 0, 0, other);
  g.tick = 30; const cancelled = g.startTraining('krajok', 'th:kan');
  assert.equal(g.cancelTraining(cancelled.id).exp, 0); assert.equal(rec(g, 'th:kan').exp, 40);
  g.tick = 60; assert.equal(g.startTraining('krajok', 'th:kan'), null, 'second attempt in the 100-tick window was spent by the cancel');
  const before = g.allyStats(g.roster['th:kan']).confuseMultiplier;
  g.tick = 100; win(g, 'krajok', 'th:kan');
  assert.ok(g.allyStats(g.roster['th:kan']).confuseMultiplier > before, 'Kan confuse multiplier follows the real progression');
});
