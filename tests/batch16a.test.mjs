import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { REPAIR_TIME, BUILD_TIME } from '../src/data.js';

globalThis.Image = class {};

test('กระจกในกระเป๋าไม่ถูกใช้บนแผนที่ แต่พลังในห้องสอบสวนยังทำงาน', () => {
  const g = createGame();
  g.level = 2; (g.zoneEvents.th ||= {}).devaTest = 'cleared'; g.powerOf('mirror').ammo = 1;
  g.inventory.mirror = 1;
  const ammo = g.powerOf('mirror').ammo;
  assert.equal(g.useBag('mirror'), false);
  assert.equal(g.inventory.mirror, 1);
  assert.equal(g.powerOf('mirror').ammo, ammo);
  const result = g.usePower('mirror', g.queue[0]);
  assert.ok(result);
  assert.equal(g.powerOf('mirror').ammo, ammo - 1);
  g.powerOf('mirror').ammo = 0;
  g.powerOf('mirror').cd = 0;
  assert.equal(g.powerReady('mirror'), true);
  assert.ok(g.usePower('mirror', g.queue[0]));
  assert.equal(g.inventory.mirror, undefined);
});

test('อาคารถูกเผาอยู่รอซ่อม และทัณฑ์ติดงานหรือมีเปรตสั่งซ่อมไม่ได้', () => {
  const g = createGame();
  const st = g.stations[0];
  st.fire = 100;
  g.burnDown(st);
  assert.ok(g.stations.includes(st));
  assert.equal(st.fire, 100);
  assert.equal(g.stFree(st), 0);
  g.mobs.push({ id: 999, x: 300, y: 300 });
  assert.equal(g.canRepair(st.def.k), false);
  g.mobs = [];
  const taan = g.crew.find(c => c.k === 'taan');
  taan.at = 'krata';
  assert.equal(g.canRepair(st.def.k), false);
  taan.at = null;
  taan.buildK = 'lan';
  assert.equal(g.canRepair(st.def.k), false);
  taan.buildK = null;
  assert.equal(g.canRepair(st.def.k), true);
});

test('ทัณฑ์เดินถึงก่อนเริ่มซ่อม เซฟ/โหลดระหว่างรอและระหว่างซ่อม แล้วกลับจุดประจำ', () => {
  const g = createGame();
  const st = g.stations[0];
  const taan = g.crew.find(c => c.k === 'taan');
  st.fire = 100;
  const coin = g.coin;
  assert.equal(REPAIR_TIME, BUILD_TIME / 2);
  assert.equal(g.repairStation(st.def.k), true);
  assert.equal(g.coin, coin);
  assert.equal(st.repairWait, true);
  assert.equal(taan.buildK, st.def.k);
  st.repair = Date.now() - 1; // เดินไปนานกว่าเวลาซ่อม ก็ยังต้องรอถึงไซต์

  const walking = createGame();
  assert.equal(walking.restore(g.snapshot()), true);
  const waiting = walking.stations.find(s => s.def.k === st.def.k);
  const worker = walking.crew.find(c => c.k === 'taan');
  assert.equal(waiting.repairWait, true);
  assert.equal(worker.buildK, st.def.k);
  worker.x = waiting.def.x; worker.y = waiting.def.y;
  walking.stepWorld(16);
  assert.equal(waiting.repairWait, false);
  assert.ok(waiting.repair > Date.now());
  assert.equal(worker.buildK, st.def.k);

  const repairing = createGame();
  assert.equal(repairing.restore(walking.snapshot()), true);
  const resumed = repairing.stations.find(s => s.def.k === st.def.k);
  const returning = repairing.crew.find(c => c.k === 'taan');
  assert.equal(resumed.repairWait, false);
  assert.ok(resumed.repair > Date.now());
  assert.equal(returning.buildK, st.def.k);
  resumed.repair = Date.now() - 1;
  repairing.stepWorld(16);
  assert.equal(resumed.fire, 0);
  assert.equal(resumed.repair, 0);
  assert.equal(returning.buildK, null);
});
