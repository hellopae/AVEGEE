// HOTFIX 22 ต.ค. 2569 — คดีขอทานในวัด (เทวดา) ต้องรอประตูสวรรค์ที่สร้างเสร็จ
// บั๊กเดิม: ensureDevaCase บังคับเข้าคิวที่คดีที่ 5 โดยไม่เช็คประตู (ขั้น 3) แล้วบล็อกคดีอื่นทั้งหมด → ตัดสินถูกไม่ได้
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';

globalThis.Image ??= class {};
const gateSt = build => ({ def:STATIONS.find(d => d.k === 'sawan'), crewK:null, intensity:3, fire:0, build, slots:[] });
const fresh = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zoneEvents.th = { prisonBreak:'cleared' }; return g; };
const reload = g => { const h = createGame(); h.save = () => true; h.onChange = () => {}; assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); return h; };
const beggars = g => g.queue.filter(s => s.case === 'devaMonk');
/** ตัดสินคดีธรรมดาหนึ่งคดี (ไม่ใช่ขอทาน) — เหมือนผู้เล่นเดินคดีผ่านไป */
const judgeOrdinary = g => {
  g.queue = g.queue.filter(s => s.case !== 'devaMonk');
  g.spawnSoul(); const s = g.queue.at(-1);
  g.applyVerdict({ score:55, karma:0 }, s);
  g.queue = g.queue.filter(x => x !== s);
};

test('bug repro: no gate at case four must NOT queue the beggar or block anything', () => {
  const g = fresh();
  assert.equal(g.has('sawan'), false);
  for (let i = 0; i < 4; i++) judgeOrdinary(g);
  assert.equal(g.zoneCases.th, 4);
  assert.equal(beggars(g).length, 0, 'beggar waits for the gate');
  assert.equal(g.devaCaseOwed(), true);
  // other cases stay free: not reserved, can be jailed / deferred / assigned
  g.queue = []; g.courtArrivals = [];
  g.spawnSoul(); g.spawnSoul(); g.courtArrivals = [];
  const [a, b] = g.queue;
  assert.notEqual(g.assignBlock(a.id, 'krata', 'taan')?.key, 'devaCaseFirst');
  assert.equal(g.defer(), true);                       // not refused by the beggar rule
  assert.equal(g.jail(b.id), true);
});

test('no gate: cases five..ten keep flowing, the beggar never appears, deva event stays locked, ordinary pool never yields it', () => {
  const g = fresh();
  for (let i = 0; i < 10; i++) { judgeOrdinary(g); g.ensureDevaCase(); assert.equal(beggars(g).length, 0, `case ${i + 1}`); }
  assert.equal(g.zoneCases.th, 10);
  assert.equal(g.devaTestStatus(), 'locked');
  assert.equal(g.storyQueue.some(s => s.key.startsWith('deva-th-')), false);
  assert.equal(g.startDevaTest(), null);
  assert.equal(g.bossReady(), false);
  for (let i = 0; i < 200; i++) { g.spawns = 0; g.casesDone = 5; const s = g.nextNamedCase([]); assert.notEqual(s?.case, 'devaMonk'); }
});

test('gate still under scaffolding does not count; finished gate queues the beggar exactly once, others wait behind it', () => {
  const g = fresh();
  for (let i = 0; i < 4; i++) judgeOrdinary(g);
  g.stations.push(gateSt(Date.now() + 60000));
  g.ensureDevaCase(); assert.equal(beggars(g).length, 0, 'scaffolding is not a built gate');
  g.stations.at(-1).build = 0;
  g.ensureDevaCase(); g.ensureDevaCase(); g.ensureDevaCase();
  assert.equal(beggars(g).length, 1);
  assert.equal(g.queue[0].case, 'devaMonk');
  assert.equal(g.usedCases.filter(k => k === 'devaMonk').length, 1);
  // reserved: cannot defer / jail it, other souls cannot be assigned before it
  assert.equal(g.defer(), false); assert.equal(g.jail(g.queue[0].id), false);
  g.queue.push({ id:999999, case:'other' });
  assert.deepEqual(g.assignBlock(999999, 'krata', 'taan'), { key:'devaCaseFirst' });
});

test('beggar arriving late (gate built at case seven) is judged once; the deva test + story start only then', () => {
  const g = fresh();
  for (let i = 0; i < 7; i++) judgeOrdinary(g);
  assert.equal(g.devaTestStatus(), 'locked');
  g.stations.push(gateSt(0));
  judgeOrdinary(g);                           // next verdict hands the beggar over
  assert.equal(g.zoneCases.th, 8);
  assert.equal(beggars(g).length, 1);
  const monk = beggars(g)[0];
  assert.equal(g.devaTestStatus(), 'locked');
  g.applyVerdict({ score:70, karma:0, right:true }, monk);
  g.queue = g.queue.filter(s => s !== monk);
  assert.equal(g.devaTestStatus(), 'pending');
  assert.ok(g.devaVisits.th);
  assert.equal(g.storyQueue[0].key, 'deva-th-praise');
  g.completeStory();
  assert.equal(g.battle?.kind, 'devaTest');
  // judged once: never handed over again
  g.battle.foes[0].hp = 1; g.battleAct('atk'); g.endBattle();
  for (let i = 0; i < 3; i++) { judgeOrdinary(g); assert.equal(beggars(g).length, 0); }
  assert.equal(g.devaTestStatus(), 'cleared');
});

test('prison break cleared after the beggar was judged still opens the deva test (no double lock)', () => {
  const g = fresh(); g.zoneEvents.th = {};
  g.stations.push(gateSt(0));
  g.zoneCases.th = 4; g.ensureDevaCase();
  const monk = g.queue[0]; g.applyVerdict({ score:55, karma:0 }, monk);
  assert.equal(g.devaTestStatus(), 'pending');
});

test('old save: beggar forced into the queue at case four with no gate is pulled out, not left as an unjudgeable case', () => {
  const g = fresh();
  g.zoneCases.th = 4; g.stations.push(gateSt(0));
  g.ensureDevaCase(); assert.equal(beggars(g).length, 1);
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  snap.stations = snap.stations.filter(s => s.k !== 'sawan');          // the pre-fix save: beggar queued, no gate
  assert.ok(snap.queue.some(s => s.case === 'devaMonk'));
  const old = createGame(); old.save = () => true; old.onChange = () => {};
  assert.equal(old.restore(snap), true);
  assert.equal(old.has('sawan'), false);
  assert.equal(beggars(old).length, 0, 'pulled from the queue');
  assert.equal(old.devaTestStatus(), 'locked');
  assert.equal(old.devaCaseOwed(), true);
  // when the gate is finished the case returns, once
  old.stations.push(gateSt(0)); old.ensureDevaCase(); old.ensureDevaCase();
  assert.equal(beggars(old).length, 1);
});

test('old save: beggar queued while the gate already exists is kept as is', () => {
  const g = fresh(); g.zoneCases.th = 4; g.stations.push(gateSt(0)); g.ensureDevaCase();
  const id = g.queue[0].id;
  const h = reload(g);
  assert.equal(beggars(h).length, 1); assert.equal(h.queue.find(s => s.case === 'devaMonk').id, id);
});

test('old save past the deva case (judged, test pending/cleared) is untouched and gets no second beggar', () => {
  const g = fresh(); g.zoneCases.th = 9; g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' };
  g.devaVisits.th = { phase:'fighting' };
  const h = reload(g);
  h.ensureDevaCase(); assert.equal(beggars(h).length, 0);
  assert.equal(h.devaTestStatus(), 'cleared');
  const p = fresh(); p.zoneCases.th = 6; p.zoneEvents.th = { prisonBreak:'cleared', devaTest:'pending' };
  const q = reload(p); q.stations.push(gateSt(0)); q.ensureDevaCase();
  assert.equal(beggars(q).length, 0); assert.equal(q.devaTestStatus(), 'pending');
});
