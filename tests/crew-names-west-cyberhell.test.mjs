// ข้อ C ชุด 14 คุณเป้ 26 ก.ย. 2569 — ชื่อยมทูตโซนปัจฉิม (west) / นรกเครือข่าย (cyberhell)
// ที่มา: Output/Rae/2026-09-26-avegee-crew-names-west-cyberhell.md (Reese ตรวจแล้ว, คุณเป้อนุมัติ)
import test from 'node:test';
import assert from 'node:assert/strict';
import { CREW, crewName } from '../src/data.js';
import { createGame } from '../src/game.js';

// moveZone() วาดฉาก sync ผ่าน art.js ซึ่งเรียก `new Image()` — มีแค่ในเบราว์เซอร์
// Node ไม่มี Image ให้ ต้อง stub ขั้นต่ำ (ไม่โหลดจริง = img() คืน null เอง โค้ดเกมรับมือกรณีนี้อยู่แล้ว)
if (typeof globalThis.Image === 'undefined') {
  globalThis.Image = class { set src(_v) {} };
}

const EXPECT = {
  taan:   { west: 'โพเอน่า', cyberhell: 'ซิสอ็อป' },
  plerng: { west: 'อ็อกเนียน', cyberhell: 'เทอร์โบ' },
  dam:    { west: 'นัวร์', cyberhell: 'ดาร์กเน็ต' },
  kan:    { west: 'ซิบิล', cyberhell: 'ไซเฟอร์' },
  boon:   { west: 'เกรซ', cyberhell: 'บัฟเฟอร์' },
};

test('crewName() คืนชื่อ west/cyberhell ตามตารางที่คุณเป้อนุมัติ', () => {
  for (const [k, zones] of Object.entries(EXPECT)) {
    const def = CREW.find(c => c.k === k);
    assert.ok(def, `ต้องมียมทูต ${k} ใน CREW`);
    assert.equal(crewName(def, 'west'), zones.west, `${k} west`);
    assert.equal(crewName(def, 'cyberhell'), zones.cyberhell, `${k} cyberhell`);
  }
});

test('crewName() โซนไทย (th) ยังใช้ชื่อเดิม ไม่หลุดไปใช้ชื่อ west/cyberhell', () => {
  const taan = CREW.find(c => c.k === 'taan');
  assert.equal(crewName(taan, 'th'), 'ทัณฑ์');
});

test('g.crew[].name อัปเดตเป็นชื่อโซน west/cyberhell จริงตอนจ้างใหม่ในโซนนั้น (ไม่ใช่แค่ crewName เฉย ๆ)', () => {
  const g = createGame();
  // เลื่อนขั้น + ปลดบอสให้ย้ายโซนได้จริงตามกติกาเดิม (canMoveZone ต้องการ level พอและบอสก่อนหน้าถูกปราบ)
  g.level = 99;
  g.coin = 99999;
  g.bossCleared = { th: true, asia: true };
  assert.equal(g.canMoveZone('west'), true, 'เตรียมเงื่อนไขให้ย้ายโซน west ได้จริงก่อนเช็คชื่อ');
  g.moveZone('west');
  assert.equal(g.crew.some(c => c.k === 'taan'), false, 'สาขาใหม่ยังไม่มีลูกน้อง — ต้องจ้างเอง (พฤติกรรมเดิม)');
  g.hire('taan');
  const taan = g.crew.find(c => c.k === 'taan');
  assert.ok(taan, 'จ้างทัณฑ์ในโซน west แล้วต้องมีในทีม');
  assert.equal(taan.name, 'โพเอน่า');
});
