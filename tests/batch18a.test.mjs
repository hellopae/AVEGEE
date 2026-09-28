import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { MERCHANT, MOB, QUEUE_LINE, SPOTS, STATIONS, ZONES } from '../src/data.js';
import { canWalk } from '../src/walk.js';
import { hitActor, hitStation } from '../src/scene.js';

globalThis.Image = class {};

test('ปีศาจบนแผนที่ไม่เสียเลือดหรือกระสุนจากการฟาด/ขว้างหรือเดินถึง', () => {
  const g = createGame();
  const m = { id: 91, x: g.player.x + 20, y: g.player.y, hp: 1, kind: 0 };
  g.mobs = [m];
  g.fireAmmo = 2;
  const coin = g.coin;
  assert.equal(g.strike(0, 'ท่าน'), false);
  assert.equal(g.strike(0, 'ท่าน', true), false);
  assert.equal(g.attack(), false);
  g.huntMob = true;
  g.stepWorld(16);
  assert.equal(g.mobs.length, 1);
  assert.equal(m.hp, 1);
  assert.equal(g.fireAmmo, 2);
  assert.equal(g.coin, coin);
  assert.equal(g.battle, null);
  assert.equal(g.startMobBattle(0).kind, 'mob');
  assert.equal(g.mobs.length, 1);
});

test('ยักษ์ทวารบาลยังปราบปีศาจบนแผนที่ได้', () => {
  const g = createGame();
  g.mobs = [{ id:92, x:300, y:300, hp:1, kind:0 }];
  const ammo = g.fireAmmo;
  assert.equal(g.strike(0, 'ยักษ์ทวารบาล'), true);
  assert.equal(g.mobs.length, 0);
  assert.equal(g.fireAmmo, ammo);
});

test('เซฟเก่าทิ้งปีศาจชนิดที่ถอดออกและเลื่อน index ชนิดอื่นเพียงครั้งเดียว', () => {
  const old = createGame().snapshot();
  delete old.mobRosterV18;
  old.fireAmmo = 1;
  old.mobs = [
    { id:93, x:300, y:300, hp:1, kind:3 },
    { id:94, x:320, y:300, hp:1, kind:4 },
    { id:95, x:340, y:300, hp:1, kind:6 },
  ];
  const g = createGame();
  assert.equal(g.restore(old), true);
  assert.deepEqual(g.mobs.map(m => m.kind), [3, 5]);
  assert.equal(g.fireAmmo, 1);
  assert.ok(MOB.kinds.every(k => k.img));
  const again = createGame();
  assert.equal(again.restore(g.snapshot()), true);
  assert.deepEqual(again.mobs.map(m => m.kind), [3, 5]);
});

test('ทุกโซนคิวอยู่แนวสะพานและท่าเรือกับจุดคุยบอสเดินถึงได้', () => {
  const g = createGame();
  g.level = 5;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  for (const z of ZONES) {
    if (g.zone !== z.k) assert.equal(g.moveZone(z.k), true);
    const bridgeX = z.k === 'th' ? 835 : 740;
    assert.ok(QUEUE_LINE.slice(1).every(([x]) => x === bridgeX));
    assert.ok(canWalk(MERCHANT.x, MERCHANT.y), `${z.k}: merchant on pier`);
    assert.ok(canWalk(SPOTS.bossPier.x, SPOTS.bossPier.y), `${z.k}: boss on pier`);
    assert.deepEqual(hitActor(g, SPOTS.bossPier.x, SPOTS.bossPier.y), { kind:'boss', key:z.k });
    for (const st of STATIONS) {
      const [x1, y1, x2, y2] = st.hit;
      assert.equal(hitStation((x1 + x2) / 2, (y1 + y2) / 2), st, `${z.k}: ${st.k} clickable`);
    }
  }
});

test('CyberHell เปิดหลังชนะบอสโซน 3 โดยไม่ต้องรอระดับ 5', () => {
  const g = createGame();
  g.level = 4;
  assert.equal(g.canMoveZone('cyberhell'), false);
  g.bossCleared.west = true;
  assert.equal(g.canMoveZone('cyberhell'), true);
  assert.equal(g.moveZone('cyberhell'), true);
  assert.equal(g.zone, 'cyberhell');
  assert.equal(g.moveZone('th'), true);
});
