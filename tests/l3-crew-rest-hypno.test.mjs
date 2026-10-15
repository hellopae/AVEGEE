// L3 — (1) every reaper can be sent to the tea pavilion from the crew card whenever HP < 100
//      (2) hypnosis is unlocked only by beating the zone-3 frontier boss (westVampireBreach), not by level
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { POWERS, STATIONS } from '../src/data.js';
import { harbourTravel } from './helpers/travel.mjs';

globalThis.Image ??= class {};
globalThis.document ??= { documentElement:{} };
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; g.coin = 10000; return g; };
const hypno = () => POWERS.find(p => p.k === 'hypno');
const levelTo = (g, n) => { g.exp = 1e9; for (let i = 0; i < 6 && g.level < n; i++) g.checkLevel(); };

test('L3 rest: HP 97 reaper can walk to the tea pavilion, rests, returns to post at full HP', () => {
  const g = game(); g.hire('taan');
  const c = g.crewOf('taan'); c.morale = 97; c.x = c.hx; c.y = c.hy;
  assert.equal(g.restActor(c.id), false, 'no pavilion yet');
  g.stations.push({ def:STATIONS.find(s => s.k === 'tea'), build:0, slots:[], fire:0 });
  const post = [c.x, c.y], now = Date.now();
  assert.ok(g.restActor(c.id, now)); assert.equal(c.teaRest.phase, 'travel');
  g.updateActorRecovery(now + 60000); assert.equal(c.teaRest.phase, 'rest');
  const started = c.teaRest.startedAt;
  g.updateActorRecovery(started + 60000);
  assert.equal(c.morale, 100); assert.equal(c.teaRest, null); assert.deepEqual([c.x, c.y], post);
  assert.equal(g.restActor(c.id), false, 'full HP cannot rest again');
});

test('L3 rest: crew in the battle team may rest; he sits out while resting but stays on the team', () => {
  const g = game(); g.hire('taan'); g.stations.push({ def:STATIONS.find(s => s.k === 'tea'), build:0, slots:[], fire:0 });
  g.toggleParty('taan'); const c = g.crewOf('taan'); c.morale = 80; c.x = c.hx; c.y = c.hy;
  assert.ok(g.party.members.includes('taan'));
  assert.ok(g.restActor(c.id));
  assert.ok(g.party.members.includes('taan'), 'still on team');
  assert.equal(g.crewHelpers().some(x => x.k === 'taan'), false, 'not available for fights while resting');
});

test('L3 rest UI: button for everyone below full HP, disabled with a reason for full HP / no pavilion / battle', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /const full = c\.morale >= 100, why = full \? t\('g1\.full'\) : !ready \? t\('g1\.needTea'\)/);
  assert.doesNotMatch(ui, /c\.morale < \(c\.k === 'guard' \? 100 : 50\)/);
});

test('L3 hypnosis: level 4 in zone 1 no longer unlocks it (no power, no discovery popup, interrogation/battle blocked)', () => {
  const g = game(); levelTo(g, 4); assert.equal(g.level, 4);
  assert.equal(g.powerLocked(g.powerOf('hypno')), true);
  g.mp = 100; assert.equal(g.powerReady('hypno'), false);
  g.syncDiscoveries();
  assert.ok(!g.discoveryQueue.includes('power:hypno') && !g.discoveryQueue.includes('ability:hypno'));
  assert.equal(g.powerLocked(g.powerOf('ice')), false, 'other powers keep their level unlock');
});

test('L3 hypnosis: unlocked after winning the zone-3 frontier boss, announced once', () => {
  const g = game(); g.bossCleared.asia = true; assert.equal(harbourTravel(g, 'west'), true);
  g.abilities.hypno = false;
  g.syncDiscoveries(); assert.ok(!g.discoveryQueue.includes('power:hypno'));
  g.abilities.hypno = true;   // what a westVampireBreach win does (e4-events-z3 test covers the real fight)
  g.syncDiscoveries();
  assert.equal(g.discoveryQueue.filter(x => x.endsWith(':hypno')).length, 1);
  assert.ok(g.discoveryQueue.includes('power:hypno'));
  assert.equal(g.powerLocked(g.powerOf('hypno')), false);
  g.mp = 100; assert.equal(g.powerReady('hypno'), true);
});

test('L3 hypnosis data: reward on the boss event, no "buy from boon" wording left', () => {
  const data = readFileSync(new URL('../src/data.js', import.meta.url), 'utf8');
  assert.match(data, /westVampireBreach[\s\S]{0,1500}reward:\{ coin:170, ability:'hypno' \}/);
  assert.doesNotMatch(hypno().desc, /ซื้อ|บุญ/); assert.doesNotMatch(hypno().howTo, /ซื้อ|บุญ/);
  assert.doesNotMatch(data, /ซื้อ 🌀 วงสะกดจิต|บุญยังขาย/);
});

test('L3 old saves keep hypnosis; new saves do not get it from level alone', () => {
  const g = game(); levelTo(g, 4);
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  assert.equal(snap.hypnoGateL3, true);
  const fresh = game(); fresh.restore(snap); assert.equal(fresh.abilities.hypno, undefined, 'marker present: no grandfather');
  const legacy = { ...snap }; delete legacy.hypnoGateL3;
  const old = game(); old.restore(legacy); assert.equal(old.abilities.hypno, true, 'level-4 legacy save keeps it');
  const low = game(); const s1 = JSON.parse(JSON.stringify(low.snapshot())); delete s1.hypnoGateL3;
  const o2 = game(); o2.restore(s1); assert.notEqual(o2.abilities.hypno, true, 'level-1 legacy save does not get it');
});
