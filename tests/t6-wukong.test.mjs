// T6/3 - Wukong leaves a flame in the lamp: scene z2-wukong-flame inside his return scene (Rae R2 part B section 3), helper no. 4 "Strand Barrage".
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { setLang } from '../src/i18n.js';
import { WUKONG_FLAME, ART } from '../src/z2b-wukong.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { const seen = []; for (let i = 0; i < 20 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
const game = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; return g; };

test('the return scene is cut at his promise, the flame scene follows, then the golden cloud (Rae 3.1); Wukong wins queue them in that order', () => {
  const ev = ZONE_EVENTS.asia.find(e => e.k === 'asiaWukong');
  assert.deepEqual(ev.winStories, ['z2-wukong-win', 'z2-ape-phantom', 'z2-wukong-return', 'z2-wukong-flame', 'z2-wukong-leave']);
  const ret = storyOf('z2-wukong-return'); assert.equal(ret.pages.length, 2);
  assert.ok(ret.pages[1].line.trim().endsWith('ยมบาทน้อย: "ผมสัญญาครับ"')); assert.ok(!ret.pages[1].line.includes('เมฆสีทอง'));
  assert.match(storyOf('z2-wukong-leave').pages[0].line, /หงอคงเรียกเมฆสีทองมารับลิงเฒ่า/);
  const f = storyOf(WUKONG_FLAME.story); assert.equal(f.pages.length, 1); assert.match(f.pages[0].line, /ขนเส้นนี้ข้าเคยเป่าเป็นร่างแยกนับพันครั้ง/); assert.match(f.pages[0].line, /รักษาคำที่เจ้าสัญญาไว้เรื่องมือที่แก้บัญชี/);
});

test('the flame scene hands over Wukong: unlocked, the generic NA-2 window, helper "Strand Barrage" with Rae\'s lines; a reload keeps it', () => {
  const g = game(); g.giveLamp(); g.notices = [];
  assert.equal(L.ensureMagic(g).unlocked.wukong, undefined);
  g.queueStory('z2-wukong-flame'); drain(g);
  assert.equal(L.ensureMagic(g).unlocked.wukong, true); assert.ok(g.notices.includes('lamp-helper-wukong'));
  const d = L.SUMMONERS.wukong; assert.equal(d.ready, true); assert.equal(d.move.name.th, 'ขนวิเศษรุมซัด'); assert.equal(d.move.name.en, 'Strand Barrage');
  assert.equal(d.say.call.th, 'หงอคง: "เจ้าเรียกข้าแล้ว ข้ามาแล้ว ชี้เป้ามา!"'); assert.equal(d.say.end.en, 'Wukong: "That is all the hair I can spare. Call me again when you need me."');
  assert.equal(NOTICES['lamp-helper-wukong'].art, ART.icon);
  const copy = game(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(L.ensureMagic(copy).unlocked.wukong, true);
});

test('an old save that already saw the return scene gets the flame scene once', () => {
  const g = game(); g.giveLamp(); g.storySeen['z2-wukong-return'] = true;
  const copy = game(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.ok(copy.storyQueue.some(s => s.key === 'z2-wukong-flame'));
  drain(copy); const again = game(); again.restore(JSON.parse(JSON.stringify(copy.snapshot()))); assert.ok(!again.storyQueue.some(s => s.key === 'z2-wukong-flame'));
});

test('as a helper: 3 quick hits on the CHOSEN foe only (the sum lands at once), 1 of 3 uses, once per call', () => {
  const g = game(); g.giveLamp(); L.unlockSummoner(g, 'wukong'); L.ensureMagic(g).lamp.level = 2; g.placeHelper(1, 'wukong');
  g.zoneEvents.th = { prisonBreak:'pending' }; const b = g.startPrisonBreak(); assert.ok(b);
  for (const f of b.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 9999; }
  const target = b.foes[1]; b.selectedFoeId = target.id; const before = b.foes.map(f => f.hp), one = L.SUMMONERS.wukong.move.damage.base + 0, dmg = L.summonDamage(g, 'wukong');
  assert.equal(dmg, one * 3, 'level 1: base x 3 hits');
  assert.equal(g.confirmBattleCommand('summon:wukong', 'you'), true);
  assert.equal(target.hp, before[1] - dmg); assert.equal(b.foes[0].hp, before[0]); assert.equal(b.summon.move, 'ขนวิเศษรุมซัด'); assert.equal(b.summon.left, 2);
});

test('pictures are .webp files that exist (stand-ins copied from his own drawings until Codex draws them)', () => {
  for (const f of Object.values(ART)) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
});

test('English: the flame scene reads in English', () => {
  try { setLang('en'); const s = storyOf(WUKONG_FLAME.story); assert.equal(s.title, 'A Single Hair'); assert.match(s.pages[0].line, /Spend it well/); } finally { setLang('th'); }
});
