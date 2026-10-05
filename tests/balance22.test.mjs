import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, deservedOf, primarySinOf } from '../src/game.js';
import { ALL_CASES, CASES_BY_ZONE, isPure } from '../src/cases.js';
import { BAL, ITEMS, KARMA_TIERS, MOB, STATIONS } from '../src/data.js';

globalThis.Image = class {};

const soulOf = c => ({ deeds:[...(c.seen || []), ...(c.hidden || [])], merits:c.merits || [], pure:isPure(c) });
const station = k => ({ def:STATIONS.find(x => x.k === k), crewK:'taan' });

test('approved balance constants', () => {
  assert.equal(BAL.coinPerCase, 50);
  assert.equal(BAL.foodPrice, 1);
  assert.equal(BAL.matchBonus, 0.3);
  assert.equal(MOB.fightWin, 1);
  assert.equal(MOB.bounty, 40);
  assert.equal(MOB.drain, 0.05);
  assert.equal(KARMA_TIERS[2].mob, 0.8);
  assert.equal(KARMA_TIERS[3].mob, 0.7);
  assert.equal(ITEMS.health.hp, 42);
});

test('every dossier deserves 1–5 terms and Thai level-five share falls', () => {
  for (const c of ALL_CASES) {
    if (isPure(c)) continue;
    const actual = deservedOf(soulOf(c));
    assert.ok(Number.isInteger(actual) && actual >= 1 && actual <= 5, c.k);
  }
  const thai = CASES_BY_ZONE.th.filter(c => !isPure(c));
  const old = c => {
    const soul = soulOf(c);
    const ws = soul.deeds.map(d => d.w).sort((a, b) => b - a);
    const merit = soul.merits.filter(m => !m.fake).reduce((sum, m) => sum + m.v, 0);
    return Math.max(1, Math.min(5, Math.round(ws[0] + ws.slice(1).reduce((sum, w) => sum + w * 0.4, 0) - merit)));
  };
  assert.ok(thai.filter(c => deservedOf(soulOf(c)) === 5).length < thai.filter(c => old(c) === 5).length);
});

test('over by two costs 56 ked points', () => {
  const soul = { deeds:[{ s:'kong', w:5 }], merits:[], deserved:1, pure:false };
  const r = createGame().judge(station('krata'), { soul, intensity:3 });
  assert.equal(r.over, 2);
  assert.equal(r.ked, 44);
});

test('matching primary sin pays a separate bonus of about 30 percent', () => {
  const g = createGame();
  const soul = { deeds:[{ s:'kong', w:5 }, { s:'bian', w:1 }], merits:[], deserved:3, pure:false };
  assert.equal(primarySinOf(soul), 'kong');
  const match = g.judge(station('krata'), { soul, intensity:3 });
  const miss = g.judge(station('lan'), { soul, intensity:3 });
  assert.equal(miss.bonus, 0);
  assert.equal(match.bonus, Math.round((match.coin - match.bonus) * BAL.matchBonus));
  assert.ok(match.coin > miss.coin);
  assert.ok(Number.isFinite(match.coin));
  const pure = g.judge(station('krata'), { soul:{ ...soul, pure:true }, intensity:3 });
  assert.equal(pure.coin, 0);
});

test('case completion pays the total once and names the bonus in the log', () => {
  const g = createGame();
  const st = g.stations.find(x => x.def.k === 'krata');
  st.crewK = 'taan';
  const soul = { id:999, who:'test soul', deeds:[{ s:'kong', w:5 }], merits:[], deserved:3, pure:false };
  const slot = { soul, intensity:3, progress:60, need:60 };
  slot.verdict = g.judge(st, slot);
  st.slots.push(slot);
  const before = g.coin;
  g.finish(st, slot);
  assert.equal(g.coin, before + slot.verdict.coin);
  assert.ok(g.logs.some(l => l.text.includes(`+${slot.verdict.coin}`) && l.text.includes(`+${slot.verdict.bonus}`)));
});

test('hammer and healer earn fairness for their actual positive sin', () => {
  const g = createGame();
  for (const k of ['hammer', 'healer']) {
    const c = ALL_CASES.find(x => x.k === k);
    const soul = { ...soulOf(c), deserved:deservedOf(soulOf(c)) };
    const r = g.judge(station('lan'), { soul, intensity:soul.deserved });
    assert.ok(r.tham > 0, k);
    for (const value of [r.tham, r.score, r.coin, r.karma]) assert.ok(Number.isFinite(value), k);
  }
  const noPositive = { deeds:[{ s:'bian', w:-1 }], merits:[], deserved:1, pure:false };
  assert.equal(g.judge(station('lan'), { soul:noPositive, intensity:1 }).tham, 42);
});

test('older queued and assigned souls retain their saved deserved and verdict', () => {
  const g = createGame();
  const saved = g.snapshot();
  saved.queue[0].deserved = 5;
  saved.stations.find(x => x.k === 'krata').slots = [{ soul:{ ...saved.queue[0], id:999, deserved:4 },
    intensity:4, progress:0, need:60, verdict:{ coin:31, score:80, karma:0 } }];
  const loaded = createGame();
  assert.equal(loaded.restore(saved), true);
  assert.equal(loaded.queue[0].deserved, 5);
  assert.equal(loaded.stations.find(x => x.def.k === 'krata').slots[0].soul.deserved, 4);
  assert.equal(loaded.stations.find(x => x.def.k === 'krata').slots[0].verdict.coin, 31);
});
