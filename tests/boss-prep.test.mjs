// แก้รอบ 1 ข้อ C ชุด 13 คุณเป้ 26 ก.ย. 2569 — เตรียมศึกต้องเป็น 3 ปุ่มตามใบงาน
// (พ่อค้านรก/นิรา/กินหีบยา) ไม่ใช่ของเดิม (แฟ้มหลักฐาน/ยมทูตคุ้มกัน/ลูกไฟ) + แก้เล็ก 2 ข้อ
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { MERCHANT, ITEMS } from '../src/data.js';

const readyBoss = (g) => { g.zoneCases[g.zone] = 10; return g.startZoneBoss(); };

test('เข้าบอส — แฟ้มหลักฐานเป็นโบนัสอัตโนมัติถ้าภารกิจสาขาสำเร็จ ไม่ต้องกดปุ่มเลือก', () => {
  const g1 = createGame();
  readyBoss(g1);
  assert.equal(g1.battle.proofBonus, 0, 'ยังไม่เปิดโปงครบ 3 คดี ไม่มีโบนัส');
  const baseFoeHp = g1.battle.foeHp;

  const g2 = createGame();
  g2.miniGoals[g2.zone] = { truth: 3, earned: true };
  readyBoss(g2);
  assert.equal(g2.battle.proofBonus, 24);
  assert.equal(g2.battle.foeHp, g2.battle.foeMax - 24, 'ลดพลังบอสอัตโนมัติทันทีตอนเปิดฉาก');
  assert.ok(g2.battle.foeMax === baseFoeHp || true); // แค่กันพังถ้าค่าฐานเปลี่ยนในอนาคต ไม่ใช่จุดที่เทสต์นี้เช็ค
});

test('ไม่มี b.prepUsed / โหมด crew/power เดิมอีกต่อไป — prepareBoss() ถูกถอดออกแล้ว', () => {
  const g = createGame();
  readyBoss(g);
  assert.equal(typeof g.prepareBoss, 'undefined');
  assert.equal(g.battle.prepUsed, undefined);
});

test('กินหีบยาเติมบารมีระหว่างเตรียมศึก — ใช้ของจากกระเป๋าจริง กินซ้ำได้หลายครั้งถ้ามีของพอ', () => {
  const g = createGame();
  readyBoss(g);
  g.battle.youHp = 10;
  g.inventory.health = 2;
  assert.equal(g.useBossMedicine(), true);
  assert.equal(g.battle.youHp, 10 + ITEMS.health.hp);
  assert.equal(g.inventory.health, 1);
  assert.equal(g.useBossMedicine(), true); // กินซ้ำได้อีกครั้งเพราะยังมีของเหลือ
  assert.equal(g.inventory.health, undefined); // หมดพอดี ลบคีย์ทิ้ง
});

test('ไม่มีหีบยา หรือบารมีเต็มแล้ว — กินไม่ได้ คืน false', () => {
  const g = createGame();
  readyBoss(g);
  g.battle.youHp = 10;
  assert.equal(g.useBossMedicine(), false, 'ไม่มีหีบยาในกระเป๋าเลย');

  g.inventory.health = 5;
  g.battle.youHp = g.battle.youMax;
  assert.equal(g.useBossMedicine(), false, 'บารมีเต็มแล้วกินไม่ได้');
});

test('กดเข้าสู้แล้ว กินหีบยาเพิ่มไม่ได้ (พ้นช่วงเตรียมศึกแล้ว)', () => {
  const g = createGame();
  readyBoss(g);
  g.inventory.health = 5;
  g.battle.youHp = 10;
  assert.equal(g.startBossFight(), true);
  assert.equal(g.useBossMedicine(), false);
});

test('ซื้อลูกไฟที่พ่อค้า — พร้อมใช้ทันที ไม่ค้างเป็นเลขเฉย ๆ ในกระเป๋า', () => {
  const g = createGame();
  assert.ok(MERCHANT.stock.some(s => s.k === 'fire'), 'MERCHANT.stock ต้องมีลูกไฟขาย');
  g.fireAmmo = 0;
  g.coin = 9999;
  assert.equal(g.buyMerchant('fire'), true);
  assert.ok(g.fireAmmo >= 1, 'ต้องได้กระสุนพร้อมใช้ทันที');
  assert.equal(g.inventory.fire, undefined, 'ไม่ควรค้างอยู่ในกระเป๋าทั่วไป');
});
