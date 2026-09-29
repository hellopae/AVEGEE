import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { GUARD_POST, MOB, STATIONS, ZONES, syncSceneZone } from '../src/data.js';
import { canWalk, findPath, resetWalk } from '../src/walk.js';

globalThis.Image = class {};

test('closed court finishes punishment and afterlife walk without advancing punitive clocks', () => {
  const g = createGame();
  g.stations.push({ def:STATIONS.find(s => s.k === 'tarang'), slots:[], crewK:null, build:0 });
  const st = g.stations.find(s => s.def.k === 'krata');
  const soul = g.queue[0];
  const slot = { soul, intensity:3, progress:0, need:25,
    verdict:{ coin:0, short:0, heaven:false } };
  st.slots.push(slot);
  st.crewK = 'taan';
  g.crewOf('taan').at = 'krata';
  g.courtClosed = true;
  g.nextArrive = g.nextPay = g.nextEvent = g.nextKpi = 1;
  const before = { spawns:g.spawns, queue:g.queue.length, coin:g.coin, order:g.order };

  g.step();
  assert.ok(slot.progress > 0);
  g.paused = true;
  const pausedProgress = slot.progress;
  g.step();
  assert.equal(slot.progress, pausedProgress);
  g.paused = false;
  for (let i = 0; i < 10 && st.slots.length; i++) g.step();
  assert.equal(st.slots.length, 0);
  assert.equal(g.afterlifeWalks[0]?.destination, 'prison');
  g.advanceAfterlife(100000);
  assert.equal(g.sentenceOf(soul.id, 'prison')?.soul.id, soul.id);
  assert.equal(g.spawns, before.spawns);
  assert.equal(g.queue.length, before.queue);
  assert.equal(g.coin, before.coin);
  assert.equal(g.order, before.order);
  assert.equal(g.nextArrive, 1);
  assert.equal(g.nextPay, 1);
  assert.equal(g.nextEvent, 1);
  assert.equal(g.nextKpi, 1);

  g.courtClosed = false;
  g.nextEvent = g.nextKpi = g.nextPay = 100;
  g.step();
  assert.equal(g.spawns, before.spawns + 1);
});

test('an escort already dispatched keeps delivering souls while court is closed', () => {
  const g = createGame();
  const soul = g.queue[0];
  assert.equal(g.assign(soul.id, 'krata', 'taan', 3), true);
  const st = g.stations.find(s => s.def.k === 'krata');
  const slot = st.slots[0];
  assert.ok(g.crewOf('taan').escort);
  g.courtClosed = true;
  slot.pendingUntil = Date.now() - 1;
  g.transits[0].arriveAt = Date.now() - 1;
  g.stepWorld(120);
  assert.equal(g.crewOf('taan').escort, null);
  g.step();
  assert.ok(slot.progress > 0);
});

test('hired guard crosses the river route and defeats a mob without player combat', () => {
  const g = createGame();
  g.coin = 1000;
  g.mobs = [{ id:1900, x:1300, y:675, hp:MOB.hp, kind:0 }];
  assert.equal(g.hireGuard(), true);
  assert.equal(g.attack(), false);
  assert.equal(g.startMobBattle(0), null);
  assert.equal(g.battle, null);
  assert.equal(g.huntMob, undefined);
  assert.ok(findPath(GUARD_POST[0], GUARD_POST[1], 1300, 675));
  g.paused = true;
  const guardAtPause = [g.guard.x, g.guard.y];
  g.stepWorld(120);
  assert.deepEqual([g.guard.x, g.guard.y], guardAtPause);
  g.paused = false;
  for (let i = 0; i < 900 && g.mobs.length; i++) g.stepWorld(120);
  assert.equal(g.mobs.length, 0);
  assert.equal(g.battle, null);
});

test('without guard player combat remains available and mobs spawn on reachable lower shore in every zone', () => {
  const g = createGame();
  g.mobs = [{ id:1901, x:g.player.x + 20, y:g.player.y, hp:MOB.hp, kind:0 }];
  assert.equal(g.startMobBattle(0)?.kind, 'mob');

  for (const zone of ZONES) {
    g.zone = zone.k;
    syncSceneZone(zone.k);
    resetWalk();
    g.syncBlocks(true);
    g.mobs = [];
    g.spawnMob();
    const mob = g.mobs[0];
    assert.ok(mob, zone.k);
    assert.ok(mob.y >= 650 && mob.y <= 700, zone.k);
    assert.equal(canWalk(mob.x, mob.y), true, zone.k);
    assert.ok(findPath(GUARD_POST[0], GUARD_POST[1], mob.x, mob.y), zone.k);
  }
});

test('older saves without court status restore with an open court', () => {
  const old = createGame().snapshot();
  delete old.courtClosed;
  const g = createGame();
  g.courtClosed = true;
  assert.equal(g.restore(old), true);
  assert.equal(g.courtClosed, false);
});
