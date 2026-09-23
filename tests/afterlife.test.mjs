import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';

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

test('นิราตรวจหลังครบวาระ แล้วบุญแยกเกิดใหม่กับขึ้นสวรรค์', () => {
  const g = game();
  sentence(g, 900, [3], 3);
  assert.equal(g.inspectPrison(900), false);
  g.tick++;
  assert.equal(g.inspectPrison(900), true);
  assert.equal(g.sentenceOf(900, 'prison').repentant, true);
  assert.equal(g.moveFromPrison(900), true);
  assert.equal(g.resolveGate(900), false);
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
