// T3/10 + T3/11: Rae's R1 section B (general's case) and D (ordinary foes' moves, "รอบ")
import test from 'node:test';
import assert from 'node:assert/strict';
import { CASES } from '../src/cases.js';
import { CROWD_SKILLS } from '../src/boss-skills-data.js';
import { t } from '../src/i18n.js';
const gen = CASES.find(c => c.k === 'gen');
test('T3/10 (F18): the general\'s fake merit is the free hospital, and the claim / merit / reveal agree', () => {
  assert.equal(gen.merits.length, 1);
  assert.equal(gen.merits[0].t, 'สร้างโรงพยาบาลให้ประชาชนรักษาฟรีทั้งจังหวัด'); assert.equal(gen.merits[0].fake, true);
  const boast = gen.claims.find(c => c.kind === 'boast');
  assert.equal(boast.merit, gen.merits[0].t, 'matched by text');
  assert.equal(boast.t, 'ท่านดูเถอะครับ — ผมสร้างโรงพยาบาลให้ชาวบ้านรักษาฟรีทั้งจังหวัด');
  assert.match(boast.reveal, /รับเฉพาะครอบครัวทหาร/);
  assert.ok(!JSON.stringify(gen).includes('เงินเดือนตัวเอง'));
});
test('T3/11: the four ordinary-foe moves use R1 D1 names and lines (TH + EN), "next round" = the real mechanic', () => {
  const all = [...CROWD_SKILLS.mob, ...CROWD_SKILLS.soul];
  assert.deepEqual(all.map(s => s.name.th), ['เสียงหอนระงม', 'ฟาดคลั่ง', 'เสียงอาฆาตก้องศาล', 'ฟาดเฮือกสุดท้าย']);
  assert.deepEqual(all.map(s => s.name.en), ['Wailing Horde', 'Frenzied Smash', 'Echoing Spite', 'Last Gasp Strike']);
  for (const s of all) { assert.match(s.warnText.th, /รอบหน้า/); assert.match(s.warnText.en, /next round/); assert.ok(!/["“”]/.test(s.warnText.th + s.useText.th), 'no speech marks'); }
});
test('T3/11: ice / hypnosis texts say a full round', () => {
  assert.match(t('profile.power.ice'), /หนึ่งรอบเต็ม/);
});
