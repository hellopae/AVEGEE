// ข้อ D ชุด 13 คุณเป้ 26 ก.ย. 2569 — ความหิวรายคน + ป้อนข้าวปั้น
// ต้องแยกจากกองเสบียงกลางเดิม (fed/foodMul) แต่หักเสบียงจากกองเดียวกัน และมีผลช้าลงจริงเมื่อหมดแถบ
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { BAL, STATIONS } from '../src/data.js';

const station = k => ({ def: STATIONS.find(x => x.k === k), slots: [], crewK: null, build: 0 });
const soul = (id, weights = [3]) => ({
  id, who: 'ผู้ทดสอบ', sp: 1, sex: 'm',
  deeds: weights.map(w => ({ w, s: 'kong', t: 'กรรม', known: true })), merits: [], deserved: 3,
});

test('ยมทูตเริ่มอิ่มเต็ม (hunger 100) ตอนสร้างเกมใหม่', () => {
  const g = createGame();
  const taan = g.crew.find(c => c.k === 'taan');
  assert.equal(taan.hunger, 100);
});

test('ป้อนข้าวปั้น — หักเสบียงกองกลาง 1 ห่อ เพิ่มแถบหิวของคนนั้นจริง', () => {
  const g = createGame();
  const taan = g.crew.find(c => c.k === 'taan');
  taan.hunger = 50;
  const foodBefore = g.food;
  assert.equal(g.feedCrew('taan'), true);
  assert.equal(taan.hunger, 50 + BAL.feedHunger);
  assert.equal(g.food, foodBefore - BAL.feedFoodCost);
});

test('ป้อนข้าวปั้น ไม่เกิน 100 (เพดาน)', () => {
  const g = createGame();
  const taan = g.crew.find(c => c.k === 'taan');
  taan.hunger = 90;
  assert.equal(g.feedCrew('taan'), true);
  assert.equal(taan.hunger, 100);
});

test('เสบียงกองกลางหมด — ป้อนข้าวปั้นไม่ได้ คืน false', () => {
  const g = createGame();
  g.food = 0;
  assert.equal(g.feedCrew('taan'), false);
});

test('นิรา (reader) กินไม่ได้ ป้อนไม่ได้ — เธอไม่ใช่ยมทูตสายทำงาน', () => {
  const g = createGame();
  assert.equal(g.feedCrew('nira'), false);
});

test('ยมทูตที่กำลังทำงานจริง หิวลดลงทุกวาระ ไม่ทำงาน (ว่าง) หิวไม่ลด', () => {
  const g = createGame();
  g.stations.push(station('krata'));
  const st = g.stations.find(x => x.def.k === 'krata');
  st.crewK = 'taan';
  st.slots.push({ soul: soul(1), intensity: 3, progress: 0, need: 999999, verdict: null });
  const taan = g.crew.find(c => c.k === 'taan');
  const before = taan.hunger;
  for (let i = 0; i < 5; i++) g.step();
  assert.ok(taan.hunger < before, 'หิวต้องลดลงเมื่อกำลังทำงานจริง');

  const dam = g.crew.find(c => c.k === 'dam') || null; // ดำยังไม่ได้จ้าง ไม่ได้ทำงาน ไม่ควรมีอยู่ใน crew
  assert.equal(dam, null);
});

test('เซฟเก่าก่อนชุด 13 (ไม่มี hunger ในตัวยมทูตเลย) โหลดได้ไม่พัง — ได้ค่าเริ่มต้น 100', () => {
  const oldSave = createGame().snapshot();
  oldSave.crew = oldSave.crew.map(c => { const { hunger, ...rest } = c; return rest; }); // จำลองเซฟก่อนมี hunger
  assert.ok(!('hunger' in oldSave.crew.find(c => c.k === 'taan')));

  const g = createGame();
  assert.equal(g.restore(oldSave), true);
  const taan = g.crew.find(c => c.k === 'taan');
  assert.equal(taan.hunger, 100, 'เซฟเก่าไม่มี hunger ต้องได้ค่าเริ่มต้นเต็ม ไม่ใช่ undefined/NaN');
  assert.equal(g.feedCrew('taan'), true, 'ป้อนข้าวปั้นได้ตามปกติทันทีหลังโหลดเซฟเก่า');
});

test('หมดแถบหิว (0) ทำงานช้าลงจริง (hungerPenalty) เทียบกับตอนอิ่ม', () => {
  const gFull = createGame();
  gFull.stations.push(station('krata'));
  const stFull = gFull.stations.find(x => x.def.k === 'krata');
  stFull.crewK = 'taan';
  stFull.slots.push({ soul: soul(1), intensity: 3, progress: 0, need: 999999, verdict: null });
  gFull.food = 999; // เสบียงกองกลางเหลือเฟือ กัน foodMul ปนกับที่กำลังทดสอบ
  gFull.crew.find(c => c.k === 'taan').hunger = 100;
  gFull.step();
  const progressFull = stFull.slots[0].progress;

  const gHungry = createGame();
  gHungry.stations.push(station('krata'));
  const stHungry = gHungry.stations.find(x => x.def.k === 'krata');
  stHungry.crewK = 'taan';
  stHungry.slots.push({ soul: soul(1), intensity: 3, progress: 0, need: 999999, verdict: null });
  gHungry.food = 999;
  gHungry.crew.find(c => c.k === 'taan').hunger = 0;
  gHungry.step();
  const progressHungry = stHungry.slots[0].progress;

  assert.ok(progressHungry < progressFull, 'หมดแถบหิวต้องทำงานได้ความคืบหน้าน้อยกว่าตอนอิ่ม');
  assert.ok(Math.abs(progressHungry / progressFull - BAL.hungerPenalty) < 0.01);
});
