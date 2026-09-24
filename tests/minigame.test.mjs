// ทดสอบตรรกะมินิเกม "เร่งการทำงาน" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// เกม UI จริง (DOM/canvas) อยู่ใน src/minigames/*.js — ทดสอบด้วยตาที่ browser จริงแล้ว (Toby)
// ไฟล์นี้คุมเฉพาะกติกาฝั่ง game.js ที่ไฟล์เกมพึ่งพา (mgReady/finishMinigame/cooldown/เพดานขั้น)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, UPGRADES } from '../src/data.js';

const station = k => ({ def: STATIONS.find(x => x.k === k), slots: [], crewK: null, build: 0,
  speedLv: 0, capLv: 0, fuelLv: 0, mgCd: 0 });
const game = () => {
  const g = createGame();
  g.stations.push(station('sala'));
  g.level = 5;   // ข้ามเงื่อนไขขั้นยมบาทในเทสต์ที่ไม่ได้ตั้งใจทดสอบเงื่อนไขนั้นโดยตรง
  return g;
};

test('ชนะมินิเกม — speedLv +1 ไม่หักเบี้ยกรรม และตั้งคูลดาวน์', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  const coinBefore = g.coin;
  assert.equal(g.mgReady(st), true);
  assert.equal(g.finishMinigame('sala', true), true);
  assert.equal(st.speedLv, 1);
  assert.equal(g.coin, coinBefore);                 // ไม่หักเบี้ยกรรมเหมือนของเดิม (ชุดที่ 9)
  assert.equal(st.mgCd, g.tick + g.mgCooldownFor({ speedLv: 0 }));
  assert.equal(g.mgReady(st), false);                // ติดคูลดาวน์ทันทีหลังเล่นจบ
});

test('แพ้มินิเกม — ไม่ได้ขั้น แต่ยังติดคูลดาวน์เหมือนชนะ (กันเล่นรัว)', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  assert.equal(g.finishMinigame('sala', false), true);
  assert.equal(st.speedLv, 0);
  assert.equal(st.mgCd, g.tick + UPGRADES.mgCooldown);
  assert.equal(g.mgReady(st), false);
});

test('คูลดาวน์หมดอายุตามวาระ (g.tick) — เล่นซ้ำได้เมื่อถึงเวลา', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  g.finishMinigame('sala', false);
  const readyAt = st.mgCd;
  g.tick = readyAt - 1;
  assert.equal(g.mgReady(st), false);
  g.tick = readyAt;
  assert.equal(g.mgReady(st), true);
});

test('คูลดาวน์ยาวขึ้นตามขั้นที่ทำได้แล้ว (mgCooldownStep)', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  for (let i = 0; i < 3; i++) { st.mgCd = 0; g.finishMinigame('sala', true); }
  assert.equal(st.speedLv, 3);
  const cd = g.mgCooldownFor(st);
  assert.equal(cd, UPGRADES.mgCooldown + UPGRADES.mgCooldownStep * 3);
});

test('เพดานขั้น UPGRADES.max — ชนะซ้ำไม่ทะลุ และ mgReady เป็นเท็จเมื่อเต็มขั้น', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  for (let i = 0; i < UPGRADES.max + 5; i++) { st.mgCd = 0; g.finishMinigame('sala', true); }
  assert.equal(st.speedLv, UPGRADES.max);
  assert.equal(g.mgReady(st), false);
});

test('ต้องเลื่อนขั้นยมบาทถึงระดับที่กำหนดก่อนเล่นขั้นสูง (mgLevelNeed)', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  st.speedLv = 2;                       // ขั้น 2→3 ต้องการ g.level >= mgLevelNeed(2) = 2
  g.level = 1;
  assert.equal(g.mgReady(st), false);
  g.level = 2;
  assert.equal(g.mgReady(st), true);
});

test('สถานีที่ไม่รับวิญญาณ (pow=0 เช่นศาลาน้ำชา) ไม่มีมินิเกมเร่งการทำงาน', () => {
  const g = game();
  g.stations.push(station('tea'));
  const tea = g.stations.find(x => x.def.k === 'tea');
  assert.equal(g.mgReady(tea), false);
  assert.equal(g.finishMinigame('tea', true), false);
});

test('เซฟ/โหลด: mgCd และ speedLv รอดผ่าน snapshot -> restore', () => {
  const g = game();
  const st = g.stations.find(x => x.def.k === 'sala');
  g.finishMinigame('sala', true);
  const restored = createGame();
  assert.equal(restored.restore(g.snapshot()), true);
  const rst = restored.stations.find(x => x.def.k === 'sala');
  assert.equal(rst.speedLv, st.speedLv);
  assert.equal(rst.mgCd, st.mgCd);
});
