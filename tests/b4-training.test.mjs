import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, TRAINING_RULES } from '../src/data.js';
import { actorFromLegacy, syncRoster } from '../src/roster.js';
import { normalizeTraining, trainingLevel } from '../src/progression.js';
import { scoreExp, trainingProgress, HERO_TRAINING_ID } from '../src/training.js';
import { createTrainingGame } from '../src/minigames/training/index.js';
import { runTraining } from '../src/minigames/training/host.js';

function game(zone = 'th') {
  const g = createGame(); g.zone = zone;
  g.stations = ['dab','lan','lokan','krata'].map(k => ({ def:STATIONS.find(s => s.k === k), build:0, slots:[], speedLv:2 }));
  g.crew = ['taan','plerng'].map(k => actorFromLegacy({ k }, zone));
  g.guard = actorFromLegacy({}, zone, 'guard'); syncRoster(g);
  g.save = () => true;
  return g;
}
// B3 record location: shared['global:yama'] or zones[zone][rosterId]
const rec = (g, id) => id.startsWith('global:') ? g.training.shared[id] : g.training.zones[id.split(':')[0]]?.[id];
const win = (g, station, id, score = 100) => {
  const session = g.startTraining(station, id); assert.ok(session);
  return g.finishTraining({ sessionId:session.id, score, completed:true });
};

test('B4 EXP thresholds, caps, zone IDs and global hero identity', () => {
  assert.deepEqual([59,60,79,80,94,95,100,101,NaN].map(scoreExp), [0,20,20,30,30,40,40,0,0]);
  for (let i = 0; i < TRAINING_RULES.exp.length; i++) assert.equal(trainingLevel(TRAINING_RULES.exp[i], 'cyberhell'), i + 1);
  const g = game(); win(g,'lan','th:taan'); g.tick = 30; win(g,'lan','th:taan');
  assert.equal(rec(g,'th:taan').exp,60); assert.equal(g.trainingWhy('lan','th:taan').includes('cap'),true);
  g.zone = 'asia'; g.crew = [actorFromLegacy({ k:'taan' }, 'asia')]; syncRoster(g);
  win(g,'lan','asia:taan'); assert.equal(rec(g,'asia:taan').exp,40);
  assert.equal(trainingProgress(g,'th:taan').level,2); assert.equal(trainingProgress(g,'asia:taan').level,1);
  win(g,'dab',HERO_TRAINING_ID); g.zone = 'west';
  assert.equal(g.trainingTargets('dab')[0].id,HERO_TRAINING_ID);
  assert.equal(rec(g,HERO_TRAINING_ID).exp,40);
});

test('B4 lan rewards only the selected trainee; station speed remains unchanged', () => {
  const g = game(); win(g,'lan','th:guard');
  assert.equal(rec(g,'th:guard').exp,40);
  assert.equal(rec(g,'th:taan'),undefined);
  assert.equal(g.stations.find(s => s.def.k === 'lan').speedLv,2);
  g.tick = 30; win(g,'lan','th:taan');
  assert.equal(rec(g,'th:guard').exp,40);
  assert.equal(rec(g,'th:taan').exp,40);
});

test('B4 cancel, interruption, wrong ID and duplicate callbacks cannot reward', () => {
  const g = game(), s = g.startTraining('lan','th:taan');
  assert.equal(g.finishTraining({ sessionId:'wrong', completed:true, score:100 }),null);
  assert.equal(g.cancelTraining(s.id).exp,0);
  assert.equal(g.finishTraining({ sessionId:s.id, completed:true, score:100 }),null);
  assert.equal(rec(g,'th:taan').attempts.count,1);
  assert.equal(rec(g,'th:taan').readyAtTick,30);
  g.tick = 30; const next = g.startTraining('lan','th:taan');
  const snap = g.snapshot(), h = game(); assert.equal(h.restore(snap),true);
  assert.equal(h.training.activeSession,null);
  assert.equal(h.finishTraining({ sessionId:next.id, completed:true, score:100 }),null);
  assert.equal(rec(h,'th:taan').exp,0);
  assert.equal(rec(h,'th:taan').attempts.count,2);
  assert.deepEqual(snap.training.activeSession,next,'restore leaves evidence input untouched');
});

test('B4 successful result only pays once and survives JSON save/load', () => {
  const g = game(), s = g.startTraining('krata','th:plerng');
  const result = { sessionId:s.id, completed:true, score:90 };
  assert.equal(g.finishTraining(result).exp,30); assert.equal(g.finishTraining(result),null);
  const h = game(); assert.ok(h.restore(JSON.parse(JSON.stringify(g.snapshot()))));
  assert.equal(rec(h,'th:plerng').exp,30); assert.equal(h.finishTraining(result),null);
});

test('B4 Guard shares lan/lokan cooldown and two attempts per 100 ticks', () => {
  const g = game('cyberhell'); win(g,'lan','cyberhell:guard');
  assert.equal(g.startTraining('lokan','cyberhell:guard'),null);
  g.tick = 30; win(g,'lokan','cyberhell:guard');
  g.tick = 60; assert.equal(g.startTraining('lan','cyberhell:guard'),null);
  g.tick = 100; assert.ok(g.startTraining('lokan','cyberhell:guard'));
  assert.equal(rec(g,'cyberhell:guard').attempts.count,1);
});

test('B4 no quota before start; unavailable station/actor, pause, and storage failure block start', () => {
  const g = game(); g.trainingTargets('lan'); assert.deepEqual(g.training.zones,{});
  assert.equal(g.startTraining('lan','west:taan'),null);
  assert.equal(g.startTraining('lokan','th:taan'),null);
  g.stations[1].build = 1; assert.equal(g.startTraining('lan','th:taan'),null); g.stations[1].build = 0;
  g.paused = true; assert.equal(g.startTraining('lan','th:taan'),null); g.paused = false;
  g.save = () => false; assert.equal(g.startTraining('lan','th:taan'),null); assert.deepEqual(g.training.zones,{});
});

test('B4 failed result save rolls back and retry pays exactly once', () => {
  const g = game(), s = g.startTraining('dab',HERO_TRAINING_ID);
  g.save = () => false;
  const result = { sessionId:s.id, completed:true, score:100 };
  assert.equal(g.finishTraining(result),null); assert.equal(rec(g,HERO_TRAINING_ID).exp,0);
  g.save = () => true; assert.equal(g.finishTraining(result).exp,40); assert.equal(g.finishTraining(result),null);
});

test('B4 sword affects actual normal battle attack only; MP abilities/items unchanged', () => {
  const random = Math.random; Math.random = () => .99;
  try {
    const damage = (exp, action) => {
      const g = game(); g.training = normalizeTraining({ shared:{ [HERO_TRAINING_ID]:{ exp } } });
      g.startBattle({ id:7, who:'test', deserved:50, sp:6 });
      g.battle.foes.forEach(f => { f.hp = f.maxHp = 1000; });
      g.mp = 100; g.abilities.flameCharge = true; g.inventory.health = 1; g.battle.youHp = 10;   // B3: chest refuses at full HP
      assert.equal(g.battleAct(action),true); return g.battle.dmg.foe;
    };
    assert.ok(damage(420,'atk') > damage(0,'atk'));
    for (const action of ['fire','flameCharge','health']) assert.equal(damage(420,action),damage(0,action), action);
  } finally { Math.random = random; }
});

test('B4 selected helper damage uses its progression, not another branch', () => {
  const g = game(); g.training = normalizeTraining({ zones:{ th:{ 'th:taan':{ exp:60 } }, west:{ 'west:taan':{ exp:420 } } } });
  assert.equal(g.allyStats(g.roster['th:taan']).dmg,37);
  assert.equal(g.allyStats(g.roster['th:plerng']).dmg,40);
});

test('B4 original station acceleration still works independently', () => {
  const g = game(); assert.equal(g.finishMinigame('lan',true),true);
  assert.equal(g.stations.find(s => s.def.k === 'lan').speedLv,3);
  assert.deepEqual(g.training.zones,{});
});

test('B4 stone mechanics shared, sword note timing, fire clock finishes at 30 seconds', () => {
  for (const station of ['lan','lokan']) {
    const e = createTrainingGame(station); e.input('hold'); e.step(1.4); e.input('release');
    assert.equal(e.view().successes,1); e.input('hold'); e.input('release'); assert.equal(e.view().successes,1);
    e.step(1.6); assert.equal(e.view().round,2);
  }
  const e = createTrainingGame('dab',1); e.step(e.view().notes[0].at); e.input({type:'note',lane:e.view().notes[0].lane}); assert.equal(e.view().hits,1);
  const fire = createTrainingGame('krata');
  for (let i = 0; i < 300; i++) { if (fire.view().heat < 45) fire.input('hit'); fire.step(.1); }
  fire.step(.001); assert.equal(fire.view().done,true); assert.ok(fire.score() >= 95);
});

test('B4 cancellation input never changes sword/fire score or heat', () => {
  for (const station of ['dab','krata']) {
    const e = createTrainingGame(station,1); e.step(1);
    const before = e.view(); e.input('cancel');
    assert.deepEqual(e.view(),before);
  }
});

test('B4 host freezes timers/input on pause/hidden, abandons and cancels frame/listeners', () => {
  const oldDocument = globalThis.document;
  class Element extends EventTarget {
    constructor() { super(); this.style = {}; }
    setAttribute() {} replaceChildren(...children) { this.children = children; } append(child) { this.children.push(child); }
  }
  const doc = Object.assign(new EventTarget(), { hidden:false, createElement:() => new Element() }); globalThis.document = doc;
  try {
    let queue = new Map(), n = 0, paused = false, alive = true, abandoned = 0, result = 0;
    const host = new Element();
    const stop = runTraining(host,{ station:'lan',session:{ id:'one', seed:1 },paused:() => paused,alive:() => alive,
      onResult:() => result++,onAbandon:() => abandoned++,raf:fn => { queue.set(++n,fn); return n; },caf:id => queue.delete(id) });
    const frame = time => { const [id,fn] = queue.entries().next().value; queue.delete(id); fn(time); };
    frame(0); frame(100); const text = host.children[0].textContent;
    paused = true; for (let i = 2; i < 320; i++) frame(i * 100);
    assert.equal(result,0); assert.equal(host.children[2].disabled,true);
    host.children[2].dispatchEvent(new Event('click'));
    paused = false; frame(32000); assert.equal(host.children[0].textContent,text);
    doc.hidden = true; frame(32100); assert.equal(host.children[2].disabled,true);
    alive = false; frame(32200); assert.equal(abandoned,1); assert.equal(queue.size,0);
    stop(); stop(); assert.equal(result,0);
  } finally { globalThis.document = oldDocument; }
});


test('B4 paused fire host preserves heat and stops exactly once after 30 active seconds', () => {
  const oldDocument = globalThis.document;
  class Element extends EventTarget {
    constructor() { super(); this.style = {}; }
    setAttribute() {} replaceChildren(...children) { this.children = children; } append(child) { this.children.push(child); }
  }
  globalThis.document = Object.assign(new EventTarget(), { hidden:false, createElement:() => new Element() });
  try {
    let queued, paused = false, results = [];
    const host = new Element();
    const stop = runTraining(host,{ station:'krata', session:{ id:'fire', seed:1 },paused:() => paused, alive:() => true,
      onAbandon:() => assert.fail('unexpected abandon'),onResult:r => results.push(r),raf:fn => { queued = fn; return 1; },caf:() => { queued = null; } });
    const frame = time => { const fn = queued; queued = null; fn(time); };
    frame(0); frame(100); const heat = host.children[1].value;
    paused = true; for (let i = 2; i <= 400; i++) frame(i * 100);
    assert.equal(host.children[1].value,heat); assert.equal(results.length,0);
    paused = false;
    for (let i = 401; i < 705 && queued; i++) { if (host.children[1].value < 45) host.children[2].dispatchEvent(new Event('click')); frame(i * 100); }
    assert.equal(results.length,1); assert.equal(results[0].completed,true);
    assert.equal(results[0].sessionId,'fire'); assert.equal(queued,null); stop(); stop();
  } finally { globalThis.document = oldDocument; }
});

test('B4 actual helper combat reads only selected actor progression including Guard', () => {
  for (const [kind, action, base] of [['taan','crew:taan',35], ['plerng','crew:plerng',40], ['guard','guard',60]]) {
    const g = game();
    const id = `th:${kind}`;
    g.training = normalizeTraining({ zones:{ th:{ [id]:{ exp:60 } }, west:{ [`west:${kind}`]:{ exp:420 } } } });
    g.startBattle({ id:7, who:'test', deserved:50, sp:6 }); g.battle.team = ['taan','plerng'];
    g.battle.foes.forEach(f => { f.hp = f.maxHp = 1000; });
    assert.equal(g.battleAct(action),true);
    assert.equal(g.battle.dmg.foe,Math.round(base * 1.06));
    assert.ok(g.stations.every(s => s.speedLv === 2));
  }
});

test('B4 finished sessions feed the real B3 power: hero normal attack and selected ally stats rise', () => {
  const g = game(), base = g.normalAttack(100), allyBase = g.allyStats(g.roster['th:taan']).dmg;
  win(g,'dab',HERO_TRAINING_ID); g.tick = 30; win(g,'dab',HERO_TRAINING_ID);
  assert.ok(g.normalAttack(100) > base);
  win(g,'lan','th:taan'); g.tick = 60; win(g,'lan','th:taan');
  assert.ok(g.allyStats(g.roster['th:taan']).dmg > allyBase);
  assert.equal(g.allyStats(g.roster['th:plerng']).level,1);
});

test('B4 in-progress session survives snapshot (needed to report the result) and is cleared on load', () => {
  const g = game(), s = g.startTraining('lan','th:taan');
  assert.equal(g.snapshot().training.activeSession.id,s.id);
  assert.equal(g.training.activeSession.id,s.id,'snapshot does not drop the session it just saved');
  assert.equal(g.finishTraining({ sessionId:s.id, completed:true, score:100 }).exp,40);
  const next = g.startTraining('lan','th:taan'); assert.equal(next,null,'cooldown still applies');
  g.tick = 30; const again = g.startTraining('lan','th:taan');
  assert.notEqual(again.id,s.id,'sequence is unique across snapshots');
  const h = game(); h.restore(JSON.parse(JSON.stringify(g.snapshot())));
  assert.equal(h.training.activeSession,null); assert.equal(h.training.sequence,2);
});
