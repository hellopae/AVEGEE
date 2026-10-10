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

// ================================================ sawan / breath (→ boon) =============================================
import * as breath from '../src/minigames/training/breath.js';
const advance = (e, to) => { while (e.view().time < to - 1e-9) e.step(Math.min(.01, to - e.view().time)); };
const cueIn = r => breath.LEAD + r * breath.PERIOD, cueOut = r => cueIn(r) + breath.INHALE;
const breathe = (e, r, pressOff = 0, releaseOff = 0) => { advance(e, cueIn(r) + pressOff); e.input('hold'); advance(e, cueOut(r) + releaseOff); e.input('release'); };

test('B8 sawan: 8 breaths fit exactly in 32 s and perfect timing scores 100', () => {
  assert.equal(breath.LEAD + breath.ROUNDS * breath.PERIOD, breath.SECONDS);
  assert.equal(TRAINING_STATIONS.sawan.seconds, breath.SECONDS);
  const e = createTrainingGame('sawan', 1);
  for (let r = 0; r < 8; r++) breathe(e, r);
  advance(e, 32);
  assert.equal(e.view().done, true); assert.equal(e.view().successes, 8);
  assert.equal(e.score(), 100); assert.equal(e.completed(), true);
});

test('B8 sawan: tolerance edges, accuracy-based score, 6 of 8 needed', () => {
  const sloppy = createTrainingGame('sawan', 1);   // every breath 0.5 s late on press and release: counts, but scores lower
  for (let r = 0; r < 8; r++) breathe(sloppy, r, .5, .5);
  advance(sloppy, 32);
  assert.equal(sloppy.view().successes, 8); assert.equal(sloppy.score(), Math.round(70 + 30 * (1 - .5 / breath.TOLERANCE)));
  assert.ok(sloppy.score() < 100 && sloppy.score() >= 60);
  const six = createTrainingGame('sawan', 1);
  for (let r = 0; r < 6; r++) breathe(six, r);
  advance(six, 32); assert.equal(six.completed(), true); assert.equal(six.score(), 75);
  const five = createTrainingGame('sawan', 1);
  for (let r = 0; r < 5; r++) breathe(five, r);
  advance(five, 32); assert.equal(five.completed(), false);
  const offbeat = createTrainingGame('sawan', 1);   // press OK, release 1 s late → the round fails
  for (let r = 0; r < 8; r++) breathe(offbeat, r, 0, 1);
  advance(offbeat, 32); assert.equal(offbeat.view().successes, 0); assert.equal(offbeat.completed(), false); assert.equal(offbeat.score(), 0);
  const edge = createTrainingGame('sawan', 1);      // exactly on the tolerance boundary still counts
  breathe(edge, 0, breath.TOLERANCE, -breath.TOLERANCE); assert.equal(edge.view().successes, 1);
});

test('B8 sawan: stray presses, repeats, cancel and unreleased holds never score', () => {
  const e = createTrainingGame('sawan', 1);
  advance(e, .2); e.input('hold'); advance(e, .3); e.input('release');           // long before the first cue
  assert.equal(e.view().successes, 0); assert.equal(e.view().results[0], null);
  breathe(e, 0); assert.equal(e.view().successes, 1);
  breathe(e, 0, 0, 0.0001);                                                        // the same round again (time already past): ignored
  advance(e, cueIn(1)); e.input('hold'); advance(e, cueIn(1) + .5); e.input('cancel'); advance(e, cueOut(1)); e.input('release');
  assert.equal(e.view().results[1], null, 'cancelled breath is discarded');
  advance(e, cueIn(7)); e.input('hold'); advance(e, 32);
  assert.equal(e.view().done, true); assert.equal(e.view().holding, false); assert.equal(e.view().successes, 1);
  e.input('hold'); e.input('release'); e.step(1); assert.equal(e.view().successes, 1, 'nothing after the end');
  const f = createTrainingGame('sawan', 1); f.step(NaN); f.step(-3); assert.equal(f.view().time, 0);
  f.input('hit'); f.input({ type:'rotate' }); assert.equal(f.view().holding, false);
});

test('B8 sawan: host buttons, pause freezes and cancels the hold, abandon cleans up', () => withDom(doc => {
  const f = frames(), host = new FakeEl('div'), results = [];
  let paused = false, alive = true, abandoned = 0;
  const stop = runTraining(host, { station:'sawan', session:{ id:'b1', seed:1 }, paused:() => paused, alive:() => alive,
    onResult:r => results.push(r), onAbandon:() => abandoned++, raf:f.raf, caf:f.caf });
  const hold = host.find(n => n.tag === 'button')[0], cue = host.find(n => n.tag === 'p' && n.attrs.class === 'tr-cue')[0];
  let t = 0; const run = until => { while (t < until) { t += 50; f.step(t); } };
  f.step(0); run(500); assert.ok(cue.textContent.startsWith('เตรียม'));
  hold.dispatchEvent(new Event('pointerdown')); run(1700);
  assert.equal(host.find(n => n.attrs.class?.includes('tr-breath-ring'))[0].attrs.class.includes('holding'), true);
  paused = true; run(5000);
  assert.equal(cue.textContent.startsWith('หยุดพัก'), true); assert.equal(hold.disabled, true);
  hold.dispatchEvent(new Event('pointerup'));
  paused = false; run(5100);
  assert.equal(host.find(n => n.attrs.class?.includes('tr-breath-ring'))[0].attrs.class.includes('holding'), false, 'pause cancelled the hold');
  alive = false; run(5200); assert.equal(abandoned, 1); assert.equal(f.pending, false); assert.equal(results.length, 0);
  stop(); stop();
}));

test('B8 sawan: host plays a perfect session through pointer events and reports once', () => withDom(() => {
  const f = frames(), host = new FakeEl('div'), results = [];
  runTraining(host, { station:'sawan', session:{ id:'b2', seed:1 }, paused:() => false, alive:() => true,
    onResult:r => results.push(r), onAbandon:() => assert.fail('abandon'), raf:f.raf, caf:f.caf });
  const hold = host.find(n => n.tag === 'button')[0];
  const events = [];
  for (let r = 0; r < 8; r++) { events.push([cueIn(r), 'pointerdown'], [cueOut(r), 'pointerup']); }
  let t = 0; f.step(0);
  while (f.pending) {
    t += 10;
    f.step(t);
    while (events.length && events[0][0] * 1000 <= t) hold.dispatchEvent(new Event(events.shift()[1]));
  }
  assert.equal(results.length, 1); assert.equal(results[0].completed, true); assert.ok(results[0].score >= 90); assert.equal(results[0].sessionId, 'b2');
}));

test('B8 sawan → boon: EXP reaches only the selected Boon; cancel gives nothing; heal follows the real progression', () => {
  const g = game();
  assert.deepEqual(g.trainingTargets('sawan').map(a => a.id), ['th:boon']);
  const healBefore = g.allyStats(g.roster['th:boon']).heal;
  const s = g.startTraining('sawan', 'th:boon');
  assert.equal(g.cancelTraining(s.id).exp, 0); assert.equal(rec(g, 'th:boon').exp, 0);
  g.tick = 30; win(g, 'sawan', 'th:boon', 85);
  assert.equal(rec(g, 'th:boon').exp, 30);
  for (const other of ['th:kan','th:taan','th:dam',HERO_TRAINING_ID,'global:nira']) assert.equal(rec(g, other)?.exp ?? 0, 0, other);
  g.tick = 130; win(g, 'sawan', 'th:boon', 100);
  assert.ok(g.allyStats(g.roster['th:boon']).heal > healBefore, 'level 2 Boon heals more');
});

// ================================================ sala / documents (→ nira) ===========================================
import * as documents from '../src/minigames/training/documents.js';
const bubble = (list, mode) => {   // optimal adjacent-swap plan: [[i, i+1], …] (length = inversions)
  const a = list.map(d => ({ ...d })), key = d => mode === 'category' ? d.c * 10 + d.n : d.n, plan = [];
  for (let pass = 0; pass < a.length; pass++) for (let i = 0; i < a.length - 1; i++) if (key(a[i]) > key(a[i + 1])) { [a[i], a[i + 1]] = [a[i + 1], a[i]]; plan.push(i); }
  return plan;
};
const playSets = (e, extra = () => {}) => {
  for (const s of e.sets) {
    extra(e);
    for (const i of bubble(s.docs, s.mode)) { e.input({ type:'tap', index:i }); e.input({ type:'tap', index:i + 1 }); }
  }
};

test('B8 sala: every board is solvable by adjacent swaps, starts unsorted, 3–6 swaps, numbers/categories valid', () => {
  for (let seed = 1; seed <= 300; seed++) for (let i = 0; i < 2; i++) {
    const s = documents.makeSet(seed, i);
    assert.equal(s.mode, i === 0 ? 'number' : 'category');
    assert.equal(documents.isSorted(s.start, s.mode), false, `seed ${seed} set ${i} starts unsorted`);
    assert.ok(s.minSwaps >= 3 && s.minSwaps <= 6, `${s.minSwaps} swaps`);
    assert.equal(bubble(s.start, s.mode).length, s.minSwaps);
    assert.deepEqual([...s.start].map(d => d.n).sort(), [1,2,3,4,5,6]);
    assert.equal(documents.isSorted(s.target, s.mode), true);
    if (s.mode === 'category') assert.deepEqual([0,1,2].map(c => s.start.filter(d => d.c === c).length), [2,2,2]);
    const e = createTrainingGame('sala', seed);
    // play the optimal plan through the engine's real input path
    let guard = 0;
    for (const set of e.sets) for (const p of bubble(set.docs, set.mode)) { e.input({ type:'tap', index:p }); e.input({ type:'tap', index:p + 1 }); guard++; }
    assert.equal(e.completed(), true, `seed ${seed} solved through the engine`);
  }
});

test('B8 sala: engine rules — select, deselect, reselect, non-adjacent, swaps counted, 2 sets then done, perfect = 100', () => {
  const e = createTrainingGame('sala', 3), first = e.view().docs.map(d => d.n).join();
  e.input({ type:'tap', index:0 }); assert.equal(e.view().selected, 0);
  e.input({ type:'tap', index:0 }); assert.equal(e.view().selected, null);
  e.input({ type:'tap', index:0 }); e.input({ type:'tap', index:3 });
  assert.equal(e.view().selected, 3, 'non-adjacent second tap moves the selection'); assert.equal(e.view().swaps, 0);
  assert.equal(e.view().docs.map(d => d.n).join(), first);
  for (const bad of [null, 'hit', { type:'tap', index:-1 }, { type:'tap', index:6 }, { type:'tap', index:1.5 }, { type:'tap' }, { type:'swap', index:1 }]) e.input(bad);
  assert.equal(e.view().selected, 3);
  e.input({ type:'tap', index:3 });
  playSets(e);
  assert.equal(e.view().done, true); assert.equal(e.completed(), true); assert.equal(e.score(), 100);
  e.input({ type:'tap', index:0 }); e.step(1); assert.equal(e.score(), 100, 'finished game ignores input');
});

test('B8 sala: wasted swaps lower the score (5% each, floor 70% of a set); partial/unsolved never completes', () => {
  const e = createTrainingGame('sala', 4);
  playSets(e, g => { const s = g.sets[g.view().set - 1]; g.input({ type:'tap', index:0 }); g.input({ type:'tap', index:1 }); g.input({ type:'tap', index:0 }); g.input({ type:'tap', index:1 }); });
  // two wasted swaps per set: 50 * (1 - .10) * 2 = 90
  assert.equal(e.completed(), true); assert.equal(e.score(), 90);
  const slow = createTrainingGame('sala', 4);
  for (let i = 0; i < 20; i++) { slow.input({ type:'tap', index:0 }); slow.input({ type:'tap', index:1 }); }
  slow.input({ type:'tap', index:0 });
  while (!slow.view().done) slow.step(.5);
  assert.equal(slow.view().time, 45); assert.equal(slow.completed(), false); assert.ok(slow.score() < 60);
  const half = createTrainingGame('sala', 4);
  for (const p of bubble(half.sets[0].docs, 'number')) { half.input({ type:'tap', index:p }); half.input({ type:'tap', index:p + 1 }); }
  while (!half.view().done) half.step(.5);
  assert.equal(half.view().solvedSets, 1); assert.equal(half.completed(), false); assert.ok(half.score() >= 50 && half.score() < 60, 'set 1 earns 50, set 2 only partial credit');
  const n = createTrainingGame('sala', 4); n.step(NaN); n.step(-1); assert.equal(n.view().time, 0);
});

test('B8 sala: host UI — buttons ≥6, pause blocks taps, solve through real clicks reports once', () => withDom(doc => {
  const f = frames(), host = new FakeEl('div'), results = [];
  let paused = false, alive = true;
  const engineSeed = 7, ref = createTrainingGame('sala', engineSeed);
  runTraining(host, { station:'sala', session:{ id:'d1', seed:engineSeed }, paused:() => paused, alive:() => alive,
    onResult:r => results.push(r), onAbandon:() => assert.fail('abandon'), raf:f.raf, caf:f.caf });
  const docs = host.find(n => n.tag === 'button');
  assert.equal(docs.length, 6);
  f.step(0); f.step(100);
  paused = true; f.step(200); docs[0].dispatchEvent(new Event('click')); docs[1].dispatchEvent(new Event('click')); f.step(300);
  assert.ok(docs.every(b => b.disabled)); paused = false; f.step(400);
  const swaps = () => host.find(n => n.tag === 'p')[0].textContent;
  assert.ok(swaps().includes('0'), 'paused taps did nothing');
  let t = 400;
  for (const s of ref.sets) for (const p of bubble(s.docs, s.mode)) {
    docs[p].dispatchEvent(new Event('click')); docs[p + 1].dispatchEvent(new Event('click')); t += 100; if (f.pending) f.step(t);
  }
  assert.equal(results.length, 1); assert.equal(results[0].completed, true); assert.equal(results[0].score, 100); assert.equal(f.pending, false);
}));

test('B8 sala → nira: EXP reaches global Nira from any zone, nobody else; order/regeneration follow her level', () => {
  const g = game('asia');
  assert.deepEqual(g.trainingTargets('sala').map(a => a.id), ['global:nira']);
  const base = g.allyStats(g.roster['global:nira']);
  const s = g.startTraining('sala', 'global:nira');
  assert.equal(g.cancelTraining(s.id).exp, 0); assert.equal(rec(g, 'global:nira').exp, 0);
  g.tick = 30; assert.equal(win(g, 'sala', 'global:nira').exp, 40);
  g.tick = 130; win(g, 'sala', 'global:nira');
  for (const other of ['asia:kan','asia:boon','asia:taan','asia:dam',HERO_TRAINING_ID]) assert.equal(rec(g, other)?.exp ?? 0, 0, other);
  const now = g.allyStats(g.roster['global:nira']);
  assert.equal(now.level, 2); assert.equal(now.order, base.order + 1); assert.ok(now.orderRegenMultiplier > base.orderRegenMultiplier);
  g.zone = 'west'; assert.deepEqual(g.trainingTargets('sala').map(a => a.id), ['global:nira'], 'shared across branches');
  assert.equal(rec(g, 'global:nira').exp, 80);
});

// ================================================ ngiw / targets (→ dam) ==============================================
import { runPanel } from '../src/minigames/training/panel-host.js';
const runLegacyTargets=(host,opts)=>runPanel(host,{seconds:30,ui:targets.mount},targets.create(opts.session.seed),opts);
import * as targets from '../src/minigames/training/targets.js';
const atSlot = (e, i, off = .3) => advance(e, i * targets.SLOT + off);
const tapKind = (e, kind) => { const spot = e.view().spots.find(s => s.kind === kind); if (spot) e.input({ type:'tap', slot:spot.slot, kind }); return spot; };

test('B8 ngiw: schedule — 12 slots in 30 s, 6 thorn slots, thorn never on the mark, no repeated mark cell', () => {
  assert.equal(targets.SLOTS * targets.SLOT, targets.SECONDS); assert.equal(TRAINING_STATIONS.ngiw.seconds, targets.SECONDS);
  const seen = new Set();
  for (let seed = 1; seed <= 300; seed++) {
    const plan = targets.makeSchedule(seed);
    assert.equal(plan.length, 12); assert.equal(plan.filter(s => s.thorn != null).length, 6);
    plan.forEach((s, i) => {
      assert.ok(s.cut >= 0 && s.cut < 12); assert.ok(s.thorn == null || (s.thorn >= 0 && s.thorn < 12 && s.thorn !== s.cut));
      if (i) assert.notEqual(s.cut, plan[i - 1].cut); seen.add(s.cut);
    });
  }
  assert.equal(seen.size, 12, 'every trunk cell gets used');
});

test('B8 ngiw: perfect run = 12 cuts, score 100; 8 cuts completes; 7 does not; thorns cost half a mark', () => {
  const run = (cutSlots, thornSlots = []) => {
    const e = targets.create(2);
    for (let i = 0; i < 12; i++) {
      atSlot(e, i);
      if (thornSlots.includes(i)) tapKind(e, 'thorn');
      if (cutSlots.includes(i)) tapKind(e, 'cut');
    }
    advance(e, 30); return e;
  };
  const all = [0,1,2,3,4,5,6,7,8,9,10,11];
  const perfect = run(all); assert.equal(perfect.view().done, true); assert.equal(perfect.score(), 100); assert.equal(perfect.completed(), true);
  const eight = run(all.slice(0, 8)); assert.equal(eight.completed(), true); assert.equal(eight.score(), 67); assert.equal(scoreExp(eight.score()), 20);
  const seven = run(all.slice(0, 7)); assert.equal(seven.completed(), false);
  const plan = targets.makeSchedule(2), thornSlots = plan.map((s, i) => s.thorn != null ? i : -1).filter(i => i >= 0);
  const hurt = run(all, thornSlots.slice(0, 4)); assert.equal(hurt.view().thorns, 4); assert.equal(hurt.score(), Math.round((12 - 2) / 12 * 100));
  assert.equal(run(all, thornSlots).score(), 75, '12 cuts − 6 thorns/2 = 9/12');
  const allThorn = run([], thornSlots); assert.equal(allThorn.score(), 0, 'score never goes negative'); assert.equal(allThorn.completed(), false);
});

test('B8 ngiw: only the visible spot counts — late, early, duplicate, wrong slot/kind and pause-cancel taps do nothing', () => {
  const e = targets.create(2);
  assert.equal(e.view().spots.length >= 1, true, 'first mark is up immediately');
  advance(e, .2); assert.ok(tapKind(e, 'cut')); assert.equal(e.view().cuts, 1);
  e.input({ type:'tap', slot:1, kind:'cut' }); assert.equal(e.view().cuts, 1, 'wrong slot');
  const before = e.view().cuts; for (const bad of [null, 'hit', 'cancel', { type:'tap', slot:1, kind:'x' }, { type:'tap' }, { type:'tap', slot:1 }]) e.input(bad);
  assert.equal(e.view().cuts, before);
  const spot = e.view().spots.find(s => s.kind === 'thorn');
  if (spot) { e.input({ type:'tap', slot:1, kind:'thorn' }); assert.equal(e.view().thorns, 0); }
  advance(e, 2.5 + targets.LIFE + .05);                     // slot 2's mark has expired
  assert.equal(e.view().spots.length, 0); e.input({ type:'tap', slot:2, kind:'cut' }); assert.equal(e.view().cuts, 1);
  advance(e, 2 * 2.5 + .1); const s3 = e.view().spots.find(s => s.kind === 'cut');
  e.input({ type:'tap', slot:s3.slot, kind:'cut' }); e.input({ type:'tap', slot:s3.slot, kind:'cut' }); assert.equal(e.view().cuts, 2, 'a mark cannot be cut twice');
  advance(e, 30); e.input({ type:'tap', slot:12, kind:'cut' }); assert.equal(e.view().cuts, 2);
  const n = targets.create(2); n.step(NaN); n.step(-1); assert.equal(n.view().time, 0);
});

test('B8 ngiw: host — spots are real ≥ buttons, pointer + click both work once, pause blocks, abandon cleans up', () => withDom(doc => {
  const f = frames(), host = new FakeEl('div'), results = [];
  let paused = false, alive = true, abandoned = 0;
  const plan = targets.makeSchedule(2);
  const stop = runLegacyTargets(host, { station:'ngiw', session:{ id:'n1', seed:2 }, paused:() => paused, alive:() => alive,
    onResult:r => results.push(r), onAbandon:() => abandoned++, raf:f.raf, caf:f.caf });
  const trunk = host.children[1], info = host.children[0];
  let t = 0; const run = until => { while (t < until) { t += 50; f.step(t); } };
  f.step(0); run(200);
  const spots = () => trunk.children.filter(n => n.tag === 'button');
  assert.ok(spots().some(b => b.attrs.class.includes('cut')));
  paused = true; run(300); assert.ok(spots().every(b => b.disabled));
  spots().forEach(b => { b.dispatchEvent(new Event('pointerdown')); b.dispatchEvent(new Event('click')); });
  paused = false; run(400); assert.ok(info.textContent.includes('0/8'), 'paused taps did not score');
  for (let i = 0; i < 12; i++) {
    run(i * 2500 + 300);
    for (const b of spots().filter(s => s.attrs.class.includes('cut'))) { b.dispatchEvent(new Event('pointerdown')); b.dispatchEvent(new Event('click')); }
  }
  run(31000);
  assert.equal(results.length, 1); assert.equal(results[0].completed, true); assert.equal(results[0].score, 100); assert.equal(f.pending, false);
  stop();
  const g2 = frames(), h2 = new FakeEl('div'); let gone = 0;
  runLegacyTargets(h2, { station:'ngiw', session:{ id:'n2', seed:2 }, paused:() => false, alive:() => false, onResult:() => assert.fail('result'), onAbandon:() => gone++, raf:g2.raf, caf:g2.caf });
  g2.step(0); assert.equal(gone, 1); assert.equal(g2.pending, false);
}));

test('Sword schools share Yama progress, cooldown and quota without increasing Dam or station speed', () => {
  const g=game(); assert.deepEqual(g.trainingTargets('ngiw').map(a=>a.id),[HERO_TRAINING_ID]);
  const s=g.startTraining('ngiw',HERO_TRAINING_ID);
  assert.equal(g.finishTraining({sessionId:s.id+'wrong',score:100,completed:true}),null);
  const result={sessionId:s.id,score:100,completed:true};
  assert.equal(g.finishTraining(result).exp,40);assert.equal(g.finishTraining(result),null);
  assert.equal(rec(g,'th:dam')?.exp||0,0);assert.ok(g.trainingWhy('dab',HERO_TRAINING_ID));
  g.tick=30;assert.equal(win(g,'dab',HERO_TRAINING_ID,100).exp,40);
  assert.equal(rec(g,HERO_TRAINING_ID).exp,80);
  const h=game('asia');assert.deepEqual(h.trainingTargets('ngiw').map(a=>a.id),[HERO_TRAINING_ID]);
});

test('B8 all 8 training stations are playable: registry, kinds, seconds, trainee kinds and mobile-safe durations', () => {
  assert.deepEqual(Object.keys(TRAINING_STATIONS).sort(), [...ALL].sort());
  for (const k of ALL) {
    assert.ok(TRAINING_GAMES[k], `${k} has a game`);
    const e = createTrainingGame(k, 1); assert.equal(typeof e.step, 'function'); assert.equal(typeof e.input, 'function'); assert.equal(typeof e.view, 'function'); assert.equal(typeof e.score, 'function');
    const seconds = TRAINING_GAMES[k].seconds || 30;
    assert.equal(seconds, TRAINING_STATIONS[k].seconds, `${k} duration matches the station table`);
    assert.ok(seconds >= 20 && seconds <= 60);
    const g = game(); assert.ok(g.trainingTargets(k).length >= 1, `${k} has a trainee`);
    // every station: finish pays the selected trainee exactly once, cancel pays nothing, duplicate result pays nothing
    const id = g.trainingTargets(k)[0].id, s = g.startTraining(k, id);
    assert.equal(g.cancelTraining(s.id).exp, 0);
    g.tick = 30; const s2 = g.startTraining(k, id), r = { sessionId:s2.id, completed:true, score:100 };
    assert.equal(g.finishTraining(r).exp, 40); assert.equal(g.finishTraining(r), null);
  }
  const expTarget = { dab:HERO_TRAINING_ID, lan:'th:taan', lokan:'th:guard', krata:'th:plerng', krajok:'th:kan', sawan:'th:boon', sala:'global:nira', ngiw:HERO_TRAINING_ID };
  for (const [k, id] of Object.entries(expTarget)) assert.ok(game().trainingTargets(k).some(a => a.id === id), `${k} → ${id}`);
});

test('B8 every new game: closing mid-play leaves no frame/listener behind and an old save loads without B8 data', () => withDom(doc => {
  for (const station of ['krajok','sawan','sala']) {
    const f = frames(), host = new FakeEl('div'); let alive = true, abandoned = 0;
    const stop = runTraining(host, { station, session:{ id:station, seed:3 }, paused:() => false, alive:() => alive, onResult:() => {}, onAbandon:() => abandoned++, raf:f.raf, caf:f.caf });
    f.step(0); f.step(50); stop(); assert.equal(f.pending, false, `${station}: frame cancelled`);
    doc.hidden = true; doc.dispatchEvent(new Event('visibilitychange'));   // listener already removed: must not throw or react
    doc.hidden = false; alive = false; stop(); assert.equal(abandoned, 0);
  }
  const g = game(), snap = JSON.parse(JSON.stringify(g.snapshot())); delete snap.training;
  const h = game(); assert.equal(h.restore(snap), true); assert.equal(h.training.activeSession, null);
}));
