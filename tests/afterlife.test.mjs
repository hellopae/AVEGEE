import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, syncSceneZone } from '../src/data.js';
import { canWalk, resetWalk } from '../src/walk.js';
import { afterlifeWalkPosition, hitActor } from '../src/scene.js';

const station = k => ({ def:STATIONS.find(x => x.k === k), slots:[], crewK:null, build:0 });
const soul = (id, weights) => ({
  id, who:'ผู้ทดสอบ', sp:1, sex:'m',
  deeds:weights.map(w => ({ w, s:'kong', t:'กรรม', known:true })),
  merits:[], deserved:3,
});
const game = () => {
  const g = createGame();
  g.stations.push(station('tarang'), station('sawan'));
  return g;
};
const sentence = (g, id, weights, intensity, short = 0) => {
  g.sentences.push({ soul:soul(id,weights), verdict:{ short }, intensity,
    stage:'prison', readyAt:g.tick + 1, inspected:false, zone:g.zone });
};
const arrive = g => g.advanceAfterlife(100000);

test('นิราตรวจหลังครบวาระ แล้วบุญแยกเกิดใหม่กับขึ้นสวรรค์', () => {
  const g = game();
  sentence(g, 900, [3], 3);
  assert.equal(g.inspectPrison(900), false);
  g.tick++;
  assert.equal(g.inspectPrison(900), true);
  assert.equal(g.sentenceOf(900, 'prison').repentant, true);
  assert.equal(g.moveFromPrison(900), true);
  assert.equal(g.resolveGate(900), false);
  arrive(g);
  assert.equal(g.inspectGate(900), true);
  assert.equal(g.sentenceOf(900, 'gate').karmaLeft, 0);
  const coin = g.coin;
  assert.equal(g.resolveGate(900), true);
  assert.equal(g.ascended, 1);
  assert.equal(g.coin, coin + 60);
  assert.equal(g.resolveGate(900), false);

  sentence(g, 901, [3, 2], 3);
  g.tick++;
  g.inspectPrison(901);
  g.moveFromPrison(901);
  arrive(g);
  g.inspectGate(901);
  assert.equal(g.sentenceOf(901, 'gate').karmaLeft, 2);
  g.resolveGate(901);
  assert.equal(g.reborn, 1);

  const restored = createGame();
  assert.equal(restored.restore(g.snapshot()), true);
  assert.equal(restored.ascended, 1);
  assert.equal(restored.reborn, 1);
});

test('คนไม่เข็ดกลับคิว และผลตรวจไม่สุ่มซ้ำ', () => {
  const g = game();
  sentence(g, 902, [4], 2, 1);
  g.tick++;
  const original = Math.random;
  Math.random = () => 0;
  try {
    assert.equal(g.inspectPrison(902), true);
    assert.equal(g.sentenceOf(902, 'prison').repentant, false);
    assert.equal(g.inspectPrison(902), true);
    assert.equal(g.sentenceOf(902, 'prison').repentant, false);
  } finally { Math.random = original; }
  const before = g.queue.length;
  assert.equal(g.moveFromPrison(902), true);
  arrive(g);
  assert.equal(g.queue.length, before + 1);
  assert.equal(g.returned, 1);
});

test('ประตูสวรรค์ปฏิเสธคนที่ส่งผิด และตะรางรอสร้างประตูให้เสร็จ', () => {
  const g = game();
  const gate = g.stations.find(x => x.def.k === 'sawan');
  const wrong = { soul:soul(903,[4]), intensity:1, verdict:{ right:false, coin:0, short:0, heaven:true } };
  gate.slots.push(wrong);
  const before = g.queue.length;
  g.finish(gate, wrong);
  assert.equal(g.queue.length, before + 1);
  assert.equal(g.sentenceOf(903, 'gate'), undefined);

  sentence(g, 904, [3], 3);
  g.tick++;
  g.inspectPrison(904);
  gate.build = Date.now() + 10000;
  assert.equal(g.moveFromPrison(904), false);
  gate.build = 0;
  assert.equal(g.moveFromPrison(904), true);
});

test('ครบวาระทัณฑ์เข้าตะราง ส่วนดวงบริสุทธิ์รอบุญที่ประตู', () => {
  const g = game();
  const punishment = station('krata');
  const punished = { soul:soul(905,[3]), intensity:3,
    verdict:{ coin:0, short:0, heaven:false } };
  punishment.slots.push(punished);
  g.finish(punishment, punished);
  assert.equal(g.sentenceOf(905, 'prison'), undefined);
  assert.equal(g.afterlifeWalks[0]?.destination, 'prison');
  arrive(g);
  assert.equal(g.sentenceOf(905, 'prison')?.inspected, false);

  const gate = g.stations.find(x => x.def.k === 'sawan');
  const pure = { ...soul(906,[]), pure:true };
  const accepted = { soul:pure, intensity:1,
    verdict:{ coin:0, short:0, heaven:true, right:true } };
  gate.slots.push(accepted);
  g.finish(gate, accepted);
  assert.equal(g.sentenceOf(906, 'gate')?.checked, false);
  assert.equal(g.ascended, 0);
});

test('เดินตามทางจากสถานีไปตะราง แล้วตะรางไปประตู ก่อนเปลี่ยนรายชื่อ', () => {
  const g = game();
  const punishment = station('krata');
  const slot = { soul:soul(910,[3]), intensity:3,
    verdict:{ coin:0, short:0, heaven:false } };
  punishment.slots.push(slot);
  g.finish(punishment, slot);
  const walk = g.afterlifeWalks[0];
  assert.equal(walk?.destination, 'prison');
  assert.equal(g.sentenceOf(910, 'prison'), undefined);
  for (const [x, y] of walk.path) assert.equal(canWalk(x, y), true);
  g.advanceAfterlife(walk.duration / 4);
  assert.equal(g.sentenceOf(910, 'prison'), undefined);
  g.paused = true;
  const elapsed = walk.elapsed;
  g.advanceAfterlife(walk.duration);
  assert.equal(walk.elapsed, elapsed);
  g.paused = false;
  g.speed = 2;
  g.advanceAfterlife(walk.duration / 2);
  assert.equal(g.sentenceOf(910, 'prison')?.soul.id, 910);
  g.tick += 6;
  assert.equal(g.inspectPrison(910), true);
  assert.equal(g.moveFromPrison(910), true);
  assert.equal(g.sentenceOf(910, 'gate'), undefined);
  assert.equal(g.afterlifeWalks[0]?.destination, 'gate');
  const [x, y] = afterlifeWalkPosition(g.afterlifeWalks[0]);
  assert.deepEqual(hitActor(g, x, y), { kind:'soul', key:910 });
  arrive(g);
  assert.equal(g.sentenceOf(910, 'gate')?.soul.id, 910);
});

test('เส้นทางคำนวณจากตำแหน่งสถานีปัจจุบันทุกโซน', () => {
  const g = createGame();
  try {
    for (const zone of ['th', 'asia', 'west', 'cyberhell']) {
      syncSceneZone(zone);
      resetWalk();
      g.zone = zone;
      g.afterlifeWalks = [];
      const a = STATIONS.find(st => st.k === 'krata');
      const prison = STATIONS.find(st => st.k === 'tarang');
      const gate = STATIONS.find(st => st.k === 'sawan');
      const subject = soul(920, [3]);
      assert.equal(g.startAfterlifeWalk(subject, [a.x, a.y], [prison.x, prison.y],
        'prison', { soul:subject, stage:'prison', zone }), true, zone);
      assert.equal(g.startAfterlifeWalk(subject, [prison.x, prison.y], [gate.x, gate.y],
        'gate', { soul:subject, stage:'gate', zone }), true, zone);
      for (const walk of g.afterlifeWalks) {
        for (const [x, y] of walk.path) assert.equal(canWalk(x, y), true, zone);
        for (let i = 1; i < walk.path.length; i++) {
          const [ax, ay] = walk.path[i - 1], [bx, by] = walk.path[i];
          const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 4);
          for (let j = 1; j <= steps; j++)
            assert.equal(canWalk(ax + (bx - ax) * j / steps,
              ay + (by - ay) * j / steps), true, zone);
        }
      }
    }
  } finally {
    syncSceneZone('th');
    resetWalk();
  }
});

test('เซฟระหว่างเดินแล้วโหลดส่งถึงปลายทางหนึ่งครั้ง; เซฟเก่ายังโหลดได้', () => {
  const g = game();
  sentence(g, 911, [3], 3);
  g.tick++;
  g.inspectPrison(911);
  assert.equal(g.moveFromPrison(911), true);
  const saved = g.snapshot();
  assert.equal(saved.afterlifeWalks[0]?.destination, 'gate');
  const restored = createGame();
  assert.equal(restored.restore(saved), true);
  assert.equal(restored.afterlifeWalks.length, 0);
  assert.equal(restored.sentences.filter(x => x.soul.id === 911).length, 1);
  assert.equal(restored.sentenceOf(911, 'gate')?.soul.id, 911);
  const returning = game();
  sentence(returning, 912, [4], 2, 1);
  returning.tick++;
  returning.inspectPrison(912);
  returning.sentenceOf(912, 'prison').repentant = false;
  assert.equal(returning.moveFromPrison(912), true);
  assert.equal(returning.returned, 0);
  const back = createGame();
  back.restore(returning.snapshot());
  assert.equal(back.queue.filter(s => s.back?.id === 912).length, 1);
  assert.equal(back.returned, 1);
  const old = createGame().snapshot();
  delete old.afterlifeWalks;
  assert.equal(createGame().restore(old), true);
});

// Dale ตรวจชุดที่ 10 (25 ก.ย. 2569) — ข้อ E1: เซฟเก่าที่บั๊กเดิม (ก่อนแพตช์ข้อ E1) เคยติดธง
// bossArriveSeen[zone]=true ไปแล้วก่อนผู้เล่นได้เห็นฉากมาถึงจริง (เช่นเซฟของคุณเป้ที่เจอบอสโซน 1
// "เดินเข้ามาหาเลย ไม่มีฉากเปิด") ต้องได้เห็นฉากอีกครั้งหลังโหลดเซฟเก่าเข้าโค้ดที่แก้แล้ว — แต่โซนที่
// ชนะบอสไปแล้วจริง (bossCleared=true) ห้ามถูกรีเซ็ต ไม่งั้นฉากขึ้นย้อนหลังทั้งที่สู้จบไปแล้ว
test('ไมเกรตเซฟเก่า: bossArriveSeen ที่ติดธงมาก่อนแพตช์ต้องรีเซ็ตเฉพาะโซนที่ยังไม่ชนะบอส', () => {
  const oldSave = createGame().snapshot();
  delete oldSave.bossArriveFixV10;                 // จำลองเซฟที่เขียนไว้ก่อนแพตช์นี้ (ไม่มี marker)
  oldSave.bossArriveSeen = { th: true, asia: true }; // บั๊กเดิม: ติดธงไปแล้วทั้งที่ยังไม่เคยเห็นฉากจริง
  oldSave.bossCleared = { asia: true };              // แต่โซนบูรพาชนะบอสไปแล้วจริง ๆ (ต้องคงเดิม)

  const g = createGame();
  assert.equal(g.restore(oldSave), true);
  assert.equal(g.bossArriveSeen.th, undefined, 'โซนที่ยังไม่ชนะบอสต้องถูกรีเซ็ตให้เห็นฉากอีกครั้ง');
  assert.equal(g.bossArriveSeen.asia, true, 'โซนที่ชนะบอสไปแล้วจริงต้องไม่ถูกแตะ');

  // โหลดซ้ำอีกรอบด้วยเซฟที่ผ่านการไมเกรตแล้ว (มี marker) ต้องไม่รีเซ็ตซ้ำอีก
  const migrated = g.snapshot();
  assert.equal(migrated.bossArriveFixV10, true);
  const g2 = createGame();
  migrated.bossArriveSeen.th = true;   // จำลองว่าเล่นต่อแล้วเห็นฉากจริงหลังไมเกรตรอบแรก
  assert.equal(g2.restore(migrated), true);
  assert.equal(g2.bossArriveSeen.th, true, 'เซฟที่ไมเกรตแล้ว (มี marker) ต้องไม่ถูกรีเซ็ตซ้ำ');
});
