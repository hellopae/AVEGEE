import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { resetWalk } from '../src/walk.js';
import { afterlifeWalkPosition } from '../src/scene.js';
import { escortCrewPosition, ESCORT_LEAD } from '../src/escort.js';

globalThis.Image = class {};

const soul = id => ({ id, who:`ผู้ทดสอบ${id}`, sp:1, sex:'m', deserved:3,
  deeds:[{ w:3, s:'kong', t:'กรรม', known:true }], merits:[] });
// เกมที่มีกระทะ + ตะราง และยมทูตสองคน (เพลิง · กานต์) ยืนประจำจุดของตัวเอง
function setup() {
  resetWalk();
  const g = createGame();
  g.coin = 5000;
  assert.equal(g.hire('plerng'), true);
  assert.equal(g.hire('kan'), true);
  g.queue = [];
  return g;
}
// ผู้คุมเดินมารับตัวถึงสถานีแล้ว (ล้างสถานะรับตัวของระบบเดิม) → ทัณฑ์ครบ → finish() (ทางเดียวกับที่ step() เรียกตอนทัณฑ์จบ)
const arrived = (g, crewK) => { g.transits = []; g.crewOf(crewK).escort = null; };
function punish(g, id, crewK, stK = 'krata') {
  g.queue.push(soul(id));
  assert.equal(g.assign(id, stK, crewK, 3), true);
  arrived(g, crewK);
  const st = g.stations.find(x => x.def.k === stK);
  const slot = st.slots.find(x => x.soul.id === id);
  g.finish(st, slot);
  return st;
}

test('ยมทูตที่คุมการลงทัณฑ์นำวิญญาณไปตะราง วิญญาณตามติด ส่งเสร็จแล้วปล่อยให้เดินกลับเอง', () => {
  const g = setup();
  const keeper = g.crewOf('plerng');
  punish(g, 7001, 'plerng');
  const walk = g.afterlifeWalks.find(w => w.soul.id === 7001);
  assert.ok(walk, 'มีเส้นทางเดินไปตะราง');
  assert.equal(walk.destination, 'prison');
  assert.equal(walk.escort.k, 'plerng', 'ยมทูตที่คุมเป็นคนนำ');
  assert.equal(keeper.escort, 7001, 'ยมทูตถูกจองไว้ระหว่างนำทาง');
  g.queue.push(soul(7002));
  assert.equal(g.assignBlock(7002, 'krata', 'plerng')?.key, 'crewEscort', 'ระหว่างนำทางออกหมายใหม่ให้คนนี้ไม่ได้');
  // ยังไม่ถึง: วิญญาณไม่อยู่ในรายชื่อตะราง
  assert.equal(g.sentences.some(x => x.soul.id === 7001), false);

  // เดินระหว่างทาง: ยมทูตอยู่หน้าวิญญาณราว ESCORT_LEAD และไม่เดินเล่นทับ (stepWorld ห้ามขยับ)
  for (const f of [0.3, 0.6]) {
    g.afterlifeWalks[0].elapsed = 0;
    g.advanceAfterlife(walk.duration * f);
    const [sx, sy] = afterlifeWalkPosition(walk);
    const before = [keeper.x, keeper.y];
    g.stepWorld(120);
    assert.deepEqual([keeper.x, keeper.y], before, 'stepWorld ไม่ขยับยมทูตที่กำลังนำทาง');
    const d = Math.hypot(keeper.x - sx, keeper.y - sy);
    assert.ok(d > 5 && d <= ESCORT_LEAD + 1, `ยมทูตนำหน้าวิญญาณ ${d.toFixed(1)}px`);
    assert.equal(g.sentences.some(x => x.soul.id === 7001), false);
  }

  // ถึงตะรางแล้ว: เข้ารายชื่อ · ปล่อยยมทูต · ยมทูตยืนที่ปลายทางแล้วเดินกลับเอง
  const end = walk.path.at(-1);
  g.advanceAfterlife(walk.duration);
  assert.equal(g.sentences.some(x => x.soul.id === 7001 && x.stage === 'prison'), true);
  assert.equal(keeper.escort, null);
  assert.deepEqual([keeper.x, keeper.y], end);
  for (let i = 0; i < 400; i++) g.stepWorld(120);
  assert.ok(Math.hypot(keeper.x - end[0], keeper.y - end[1]) > 80, 'เดินกลับไปทำงานต่อ');
});

test('ยมทูตผู้คุมยังมีดวงอื่นในสถานี → ใช้ยมทูตว่างที่ใกล้จุดรับที่สุด · ผู้คุมไม่ถูกดึงไป', () => {
  const g = setup();
  g.queue.push(soul(7101), soul(7102));
  assert.equal(g.assign(7101, 'krata', 'plerng', 3), true);
  arrived(g, 'plerng');
  assert.equal(g.assign(7102, 'krata', 'plerng', 3), true);
  arrived(g, 'plerng');
  const st = g.stations.find(x => x.def.k === 'krata');
  g.finish(st, st.slots.find(x => x.soul.id === 7101));
  const walk = g.afterlifeWalks.find(w => w.soul.id === 7101);
  assert.equal(walk.escort.k, 'kan', 'เพลิงยังคุมดวงที่สองอยู่ จึงใช้กานต์');
  assert.ok(walk.delay > 0, 'กานต์ต้องเดินมารับก่อน วิญญาณยืนรอ');
  assert.equal(g.crewOf('plerng').escort ?? null, null);
  // ช่วงรอ: วิญญาณยังอยู่ที่ต้นทาง
  g.advanceAfterlife(walk.delay * 0.5);
  assert.deepEqual(afterlifeWalkPosition(walk), walk.path[0]);
  assert.equal(escortCrewPosition(walk).phase, 'pickup');
  g.advanceAfterlife(walk.delay * 0.6);
  assert.equal(escortCrewPosition(walk).phase, 'lead');
});

test('ไม่มียมทูตว่างเลย → วิญญาณเดินเข้าตะรางเองเหมือนเดิม', () => {
  const g = setup();
  g.queue.push(soul(7201));
  assert.equal(g.assign(7201, 'krata', 'plerng', 3), true);
  arrived(g, 'plerng');
  g.crew.forEach(c => { if (!c.reader && c.k !== 'plerng') c.at = 'dab'; });   // คนอื่นติดงานหมด
  const st = g.stations.find(x => x.def.k === 'krata');
  st.slots.push({ ...st.slots[0], soul:soul(7202) });                            // เพลิงยังมีอีกดวงให้คุม
  g.finish(st, st.slots[0]);
  const walk = g.afterlifeWalks.find(w => w.soul.id === 7201);
  assert.ok(walk);
  assert.equal(walk.escort, undefined);
  g.advanceAfterlife(walk.duration);
  assert.equal(g.sentences.some(x => x.soul.id === 7201), true);
});

test('ย้ายโซน / เซฟ-โหลดระหว่างนำทาง ไม่ทิ้งยมทูตค้างสถานะ escort และวิญญาณไม่หาย', () => {
  const g = setup();
  g.level = 5;
  for (const k of ['th', 'asia']) g.bossCleared[k] = true;
  punish(g, 7301, 'plerng');
  const keeper = g.crewOf('plerng');
  assert.equal(keeper.escort, 7301);
  const snap = JSON.parse(JSON.stringify(g.snapshot()));
  const restored = createGame();
  assert.equal(restored.restore(snap), true);
  assert.equal(restored.crew.every(c => !c.escort), true, 'โหลดแล้วไม่มียมทูตค้าง escort');
  assert.equal(restored.sentences.some(x => x.soul.id === 7301), true, 'โหลดแล้ววิญญาณเข้าตะรางครบ');
  assert.equal(restored.afterlifeWalks.length, 0);

  assert.equal(g.moveZone('asia'), true);
  assert.equal(keeper.escort ?? null, null);
  assert.equal(g.afterlifeWalks.length, 0);
});
