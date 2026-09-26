// ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — ค่าพลัง/คูลดาวน์ยมทูตต้องตรงตารางที่คุณเป้กำหนดเป๊ะ
// (ไม่สุ่มอีกต่อไป) และสะกดจิตต้องทำให้ศัตรูฟาดใส่ตัวเอง ไม่ใช่แค่ข้ามตาเฉย ๆ แบบน้ำแข็ง
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BATTLE, GUARD, CREW_POWER } from '../src/data.js';

const soul = (id, deserved = 10) => ({
  id, who:'ผู้ทดสอบ', name:'ผู้ทดสอบ', sp:1, sex:'m', deserved,
});

/** เกมใหม่ + จ้าง/จัดทีมยมทูตที่ระบุ (สูงสุด 2 คนต่อทีม ตามกติกาเกม) แล้วเปิดฉากต่อสู้พร้อมใช้ */
const battleWith = (members) => {
  const g = createGame();
  members.forEach(k => { if (k !== 'taan' && k !== 'nira') g.hire(k); });
  members.slice(0, 2).forEach(k => g.toggleParty(k));
  g.startBattle(soul(1));
  return g;
};

test('ตารางค่าพลัง B — ทัณฑ์/เพลิง/ดำ/ยักษ์ ดาเมจตรงเป๊ะ ไม่สุ่ม', () => {
  assert.equal(CREW_POWER.taan.dmg, 35);
  assert.equal(CREW_POWER.plerng.dmg, 40);
  assert.equal(CREW_POWER.dam.dmg, 35);
  assert.equal(CREW_POWER.guard.dmg, 60);
  assert.equal(CREW_POWER.boon.heal, 50);

  let g = battleWith(['taan']);
  assert.equal(g.battleAct('crew:taan'), true);
  assert.equal(g.battle.dmg.foe, 35);

  g = battleWith(['plerng']);
  assert.equal(g.battleAct('crew:plerng'), true);
  assert.equal(g.battle.dmg.foe, 40);

  g = battleWith(['dam']);
  assert.equal(g.battleAct('crew:dam'), true);
  assert.equal(g.battle.dmg.foe, 35);

  g = battleWith([]);
  assert.equal(g.hireGuard(), true);
  assert.equal(g.battleAct('guard'), true);
  assert.equal(g.battle.dmg.foe, 60);
});

test('คูลดาวน์ B — ยมทูตทั่วไป 1 นาที (60 วิ) · ยักษ์ 2 นาที (120 วิ)', () => {
  assert.equal(BATTLE.crewCd, 60);
  assert.equal(GUARD.battleCd, 120);

  const g = battleWith(['taan']);
  const before = Date.now();
  assert.equal(g.battleAct('crew:taan'), true);
  const c = g.crew.find(x => x.k === 'taan');
  const waitMs = c.helpReadyAt - before;
  assert.ok(waitMs > 59000 && waitMs <= 60000, `คูลดาวน์ควรตั้งไว้ ~60 วิ ได้ ${waitMs}ms`);
});

test('ลูกไฟ 40 คงที่ · น้ำแข็ง 30 + ศัตรูข้าม 1 ตา — ไม่สุ่มอีกต่อไป', () => {
  const g = createGame();
  g.startBattle(soul(1));
  g.fireAmmo = 3;
  assert.equal(g.battleAct('fire'), true);
  assert.equal(g.battle.dmg.foe, 40);

  const g2 = createGame();
  g2.startBattle(soul(1));
  g2.level = 3;                       // ปลดล็อกคัมภีร์น้ำแข็ง (POWERS.ice.lv = 3)
  const p = g2.powerOf('ice');
  p.ammo = p.max;
  const youHpBefore = g2.battle.youHp;
  assert.equal(g2.battleAct('ice'), true);
  assert.equal(g2.battle.dmg.foe, 30);
  // ผนึกไว้ได้ 1 ตาจริง — ตาของเขาที่ตามมาทันทีถูกข้าม ยมน้อยจึงไม่โดนแตะเลยเทิร์นนี้
  // (เหมือนกับกลไกสะกดจิต/ผนึกน้ำแข็งเดิม: หยุดตาที่ "ตามมาติด ๆ" ในการประมวลผลเดียวกัน)
  assert.equal(g2.battle.youHp, youHpBefore);
});

test('บุญเติมบารมี 50 (ไม่เกินเพดาน) — ค่าฐานตรงตาราง B', () => {
  const g = battleWith(['boon']);
  g.battle.youHp = Math.max(1, g.battle.youMax - 70);   // จำลองว่ายมน้อยเสียบารมีไปมากก่อนหน้า
  const before = g.battle.youHp;
  const expectHeal = Math.min(50, g.battle.youMax - before);
  assert.equal(g.battleAct('crew:boon'), true);
  // ดูค่า "หลังฟื้นแต่ก่อนเขาสวนกลับ" (B.mid) — youHp สุดท้ายอาจถูกฟาดสวนกลับต่อในเทิร์นเดียวกันด้วย
  // (บุญไม่ใช่กานต์/น้ำแข็ง จึงไม่ได้ข้ามตาศัตรู) ไม่ใช่บั๊ก แค่ไม่ใช่สิ่งที่เทสต์นี้อยากวัด
  assert.equal(g.battle.mid.youHp, before + expectHeal);
  assert.equal(g.battle.helper.lunge, false);   // บุญร่ายจากที่เดิม ไม่พุ่งเข้าใส่
});

test('กานต์สะกดจิต — เทิร์นถัดไปของศัตรู มึน ฟาดใส่ตัวเองแทนยมน้อย', () => {
  const g = battleWith(['kan']);
  const foeHpBefore = g.battle.foeHp;
  const youHpBefore = g.battle.youHp;
  assert.equal(g.battleAct('crew:kan'), true);
  assert.equal(g.battle.helper.lunge, false);   // กานต์ก็ร่ายจากที่เดิมเหมือนบุญ
  assert.ok(g.battle.dmg.confuseSelf > 0, 'ต้องมีดาเมจที่ศัตรูฟาดใส่ตัวเอง');
  assert.equal(g.battle.youHp, youHpBefore, 'ยมน้อยต้องไม่โดนแตะเลยเทิร์นนี้');
  assert.equal(g.battle.foeHp, foeHpBefore - g.battle.dmg.confuseSelf, 'ดาเมจต้องตกที่ศัตรูเอง');
  assert.equal(g.battle.confuse, 0, 'ใช้ผลไปแล้วในเทิร์นถัดมาที่ตามมาทันที');
});

test('ระบบฝึก "แรง" (upgradeCrew) ยังเพิ่มดาเมจต่อยอดบนฐานใหม่ได้ตามเดิม', () => {
  const g = battleWith(['taan']);
  const c = g.crew.find(x => x.k === 'taan');
  c.upLv = 2;   // จำลองฝึกมาแล้ว 2 ขั้น โดยไม่ต้องเสียเบี้ยกรรมจริงในเทสต์นี้
  assert.equal(g.battleAct('crew:taan'), true);
  assert.equal(g.battle.dmg.foe, 35 + 2 * CREW_POWER.taan.trainDmg);
});
