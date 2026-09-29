import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BAL, STATIONS } from '../src/data.js';

globalThis.Image = class {};

function caseAtCourt(g) {
  const soul = g.queue[0];
  soul.pure = false;
  soul.deeds = [{ s:'kong', w:5, known:true }, { s:'bian', w:1, known:false }];
  soul.merits = [{ t:'เท็จ', v:1, fake:true, exposed:false }];
  soul.deserved = 3;
  return soul;
}

test('no power keeps the case answer hidden while the same station still earns its bonus', () => {
  const g = createGame();
  const soul = caseAtCourt(g);
  const station = g.stations.find(st => st.def.k === 'krata');
  station.crewK = 'taan';
  assert.equal(g.trialAnswer(soul), null);
  const verdict = g.judge(station, { soul, intensity:soul.deserved });
  assert.equal(verdict.bonus, Math.round((verdict.coin - verdict.bonus) * BAL.matchBonus));
  assert.ok(verdict.bonus > 0);
});

test('mirror reveals the bonus station, deserved intensity and highest scoring assignable keeper for this case', () => {
  const g = createGame();
  const soul = caseAtCourt(g);
  g.level = 2;
  g.coin = 1000;
  assert.equal(g.hire('kan'), true);
  const logsBefore = g.logs.length;
  assert.ok(g.usePower('mirror', soul));
  const answer = g.trialAnswer(soul);
  assert.equal(answer.station.k, 'krata');
  assert.equal(answer.intensity, soul.deserved);
  const station = g.stations.find(st => st.def.k === answer.station.k);
  const scores = ['taan', 'kan'].map(k => ({ k, score:g.judge({ ...station, crewK:k }, { soul, intensity:soul.deserved }).score }));
  assert.equal(answer.crew.k, scores.sort((a, b) => b.score - a.score)[0].k);
  assert.equal(answer.unavailable, null);
  assert.equal(g.logs.length, logsBefore);

  g.courtClosed = true;
  assert.equal(g.trialAnswer(soul).station.k, 'krata');
  const restored = createGame();
  assert.equal(restored.restore(g.snapshot()), true);
  assert.equal(restored.trialAnswer(restored.queue[0]).station.k, 'krata');
  assert.equal(restored.trialAnswer(restored.queue[0]).intensity, 3);
  restored.spawnSoul();
  assert.equal(restored.defer(), true);
  assert.equal(restored.trialAnswer(restored.queue[0]), null);
  assert.equal(restored.defer(), true);
  assert.equal(restored.trialAnswer(restored.queue[0]).station.k, 'krata');
});

test('mirror names the strongest keeper and why they cannot take the case when all are busy', () => {
  const g = createGame();
  const soul = caseAtCourt(g);
  g.level = 2;
  g.coin = 1000;
  g.hire('kan');
  g.crewOf('taan').at = 'sala';
  g.crewOf('kan').at = 'sala';
  g.usePower('mirror', soul);
  const answer = g.trialAnswer(soul);
  assert.equal(answer.crew.k, 'kan');
  assert.equal(answer.unavailable.key, 'crewAt');
  assert.ok(answer.unavailable.station);
});

test('an occupied matching station recommends only its assigned keeper', () => {
  const g = createGame();
  const soul = caseAtCourt(g);
  g.level = 2;
  g.coin = 1000;
  g.hire('kan');
  const station = g.stations.find(st => st.def.k === 'krata');
  station.crewK = 'taan';
  station.slots.push({ soul:{ id:999 }, intensity:1 });
  g.crewOf('taan').escort = 999;
  g.usePower('mirror', soul);
  const answer = g.trialAnswer(soul);
  assert.equal(answer.crew.k, 'taan');
  assert.equal(answer.unavailable.key, 'crewEscort');
});

test('hypnosis confesses every hidden deed and reveals only the matching station', () => {
  const g = createGame();
  const soul = caseAtCourt(g);
  g.level = 4;
  g.powerOf('hypno').ammo = 1;
  assert.ok(g.usePower('hypno', soul));
  assert.ok(soul.deeds.every(d => d.known));
  assert.ok(soul.merits.every(m => !m.fake || m.exposed));
  assert.equal(g.trialAnswer(soul).station.k, 'krata');
  assert.equal(g.trialAnswer(soul).intensity, null);
  assert.equal(g.trialAnswer(soul).crew, null);
  const restored = createGame();
  assert.equal(restored.restore(g.snapshot()), true);
  assert.equal(restored.trialAnswer(restored.queue[0]).station.k, 'krata');
  assert.equal(restored.trialAnswer(restored.queue[0]).intensity, null);
});

test('mirror gives a pure soul the heaven gate and zero punishment', () => {
  const g = createGame();
  const soul = caseAtCourt(g);
  soul.pure = true;
  soul.deserved = 0;
  g.stations.push({ def:STATIONS.find(st => st.k === 'sawan'), slots:[], crewK:null, build:0, repair:0, fire:0 });
  g.level = 2;
  assert.ok(g.usePower('mirror', soul));
  const answer = g.trialAnswer(soul);
  assert.equal(answer.station.k, 'sawan');
  assert.equal(answer.intensity, 0);
  assert.equal(answer.crew.k, 'taan');
});
