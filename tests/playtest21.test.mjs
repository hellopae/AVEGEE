import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { ALL_CASES, isPure } from '../src/cases.js';
import { STATIONS, BAL } from '../src/data.js';

globalThis.Image = class {};

test('all named cases score and pay finite amounts at every station and intensity', () => {
  const g = createGame();
  const keeper = g.crewOf('taan');
  for (const dossier of ALL_CASES) {
    const soul = { deeds:[...(dossier.seen || []), ...(dossier.hidden || [])],
      deserved:3, pure:isPure(dossier), said:[] };
    for (const def of STATIONS) {
      const st = { def, crewK:keeper.k };
      for (let intensity = 1; intensity <= 5; intensity++) {
        const r = g.judge(st, { soul, intensity });
        assert.ok(r.tham >= 0 && r.tham <= 100, `${dossier.k}/${def.k}/${intensity}: tham`);
        for (const k of ['score', 'coin', 'karma'])
          assert.ok(Number.isFinite(r[k]), `${dossier.k}/${def.k}/${intensity}: ${k}`);
      }
    }
  }
});

test('zero-weight hammer verdict keeps HUD economy finite through assignment and completion', () => {
  for (let intensity = 1; intensity <= 5; intensity++) {
    const g = createGame();
    const soul = g.queue[0];
    soul.deeds = [{ s:'bian', w:2 }, { s:'bian', w:-2 }];
    soul.deserved = 3;
    soul.pure = false;
    soul.resist = false;
    assert.equal(g.assign(soul.id, 'krata', 'taan', intensity), true);
    const st = g.stations.find(x => x.def.k === 'krata');
    const slot = st.slots[0];
    assert.ok(Number.isFinite(slot.verdict.score), `intensity ${intensity}: score`);
    g.finish(st, slot);
    for (const k of ['coin', 'order', 'karma'])
      assert.ok(Number.isFinite(g[k]), `intensity ${intensity}: ${k}`);
  }
});

test('a damaged save restores finite economy values from NaN and JSON null', () => {
  const g = createGame();
  const d = g.snapshot();
  d.coin = NaN; d.order = null; d.karma = NaN; d.scoreSum = null;
  assert.equal(g.restore(d), true);
  assert.equal(g.coin, BAL.startCoin);
  assert.equal(g.order, 72);
  assert.equal(g.karma, 0);
  assert.equal(g.scoreSum, 0);
  assert.equal(g.restore(JSON.parse(JSON.stringify(d))), true);
  for (const k of ['coin', 'order', 'karma', 'scoreSum']) assert.ok(Number.isFinite(g[k]), k);
});

test('nonfinite verdict rewards cannot poison economy values', () => {
  const g = createGame();
  const before = [g.coin, g.order, g.karma, g.scoreSum];
  const soul = { id:9001, said:[], pure:false };
  g.applyVerdict({ score:NaN, karma:Infinity, coin:NaN, tham:0, ked:0, rab:0, short:0, over:0 }, soul);
  assert.deepEqual([g.coin, g.order, g.karma, g.scoreSum], before);
});

test('repro: a station keeper escorting the previous soul exposes the same block to UI', () => {
  const g = createGame();
  g.coin = 1000;
  assert.equal(g.hire('dam'), true);
  g.spawnSoul();
  g.queue.forEach(s => { s.resist = false; s.beaten = true; });
  assert.equal(g.assign(g.queue[0].id, 'krata', 'taan', 3), true);
  const next = g.queue[0];
  assert.deepEqual(g.assignBlock(next.id, 'krata', 'dam'), { key:'crewEscort' });
  assert.equal(g.assign(next.id, 'krata', 'dam', 3), false);
  assert.ok(g.queue.includes(next));
  g.crewOf('taan').escort = null;
  assert.equal(g.assignBlock(next.id, 'krata', 'dam'), null);
  assert.equal(g.assign(next.id, 'krata', 'dam', 3), true);
});

test('keeper assigned elsewhere reports its station and builder cannot be reassigned', () => {
  const g = createGame();
  const soul = g.queue[0];
  g.crewOf('taan').at = 'krata';
  g.stations.push({ def:STATIONS.find(s => s.k === 'sawan'), slots:[], crewK:null, build:0, fire:0 });
  assert.equal(g.assignBlock(soul.id, 'sawan', 'taan').key, 'crewAt');
  assert.equal(g.build('sawan'), false);
  g.crewOf('taan').at = null;
  g.stations.pop();
  g.coin = 1000;
  assert.equal(g.build('sawan'), true);
  assert.deepEqual(g.assignBlock(soul.id, 'krata', 'taan'), { key:'crewBuilding' });
});
