// T4 step 3 - `sita-lamp` (R2 A 3.3) + NA-1: Sita gives the lamp after the PHANTOM-404 scene, Hanuman is the first flame and stands in the first slot.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { SITA, NOTICES, Z1_STORIES } from '../src/z1-events.js';
import { storyOf } from '../src/story.js';
import { lampOwned, slottedSummoners, unlockedSummoners, summonUsesLeft, SUMMONERS } from '../src/lamp.js';
import { existsSync } from 'node:fs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };

test('sita-lamp: 3 pages, Rae\'s lines, a picture slot that has a file', () => {
  const s = storyOf('sita-lamp'); assert.equal(s.title, 'ประทีปของพระนาง'); assert.equal(s.pages.length, 3);
  assert.match(s.pages[0].line, /ตะเกียงทองดวงเล็กที่ฐานเป็นกลีบบัว ไส้ตะเกียงยังไม่มีเปลว/);
  assert.match(s.pages[1].line, /ท่านหนุมานเป็นผู้แรกที่ยอมรับท่านต่อหน้าหม่อมฉัน/); assert.match(s.pages[1].line, /เปลวสั่นครั้งเดียวแล้วนิ่ง/);
  assert.match(s.pages[2].line, /ไฟของข้ามีจำกัด จงใช้ให้คุ้ม/); assert.match(s.pages[2].line, /เหมือนมีใครหายใจอยู่ข้างใน/);
  assert.ok(!/พระราม(เจ้า)?\s*(ปรากฏ|ลงมา)/.test(JSON.stringify(s)), 'Rama never appears');
  for (const p of s.pages) { assert.equal(p.image, 'img/z1-events/cut-sita-lamp-th.webp'); assert.ok(existsSync(new URL('../' + p.image, import.meta.url)), p.image); }
  assert.equal(Z1_STORIES['sita-lamp'], s);
});

test('NA-1 text: the lamp window names Hanuman in the first slot (the default LAMP_FIRST_SLOT_ON = receive) and opens the lamp tab', () => {
  const n = NOTICES['lamp-received'];
  assert.equal(n.title, 'ได้รับ ตะเกียงวิเศษ');
  assert.match(n.text, /นางสีดามอบตะเกียงวิเศษให้ยามา/); assert.match(n.text, /ผู้ช่วยแต่ละตนใช้ท่าไม้ตายได้ 3 ครั้ง เติมพลังที่หอกระจก/); assert.match(n.text, /ใส่ผู้ช่วยได้ 1 ตน มี หนุมาน อยู่ในตะเกียง/);
  assert.equal(n.button, 'ดูตะเกียง'); assert.equal(n.openLamp, true);
  assert.equal(n.en.title, 'Magic Lamp Received'); assert.match(n.en.text, /Hanuman is already inside it/);
  assert.ok(existsSync(new URL('../' + n.art, import.meta.url)), n.art);
});

test('completing sita-lamp gives the lamp once: Hanuman unlocked + in slot 1, 3 uses, window queued, survives save/load', () => {
  let g = createGame(); g.queueStory('sita-lamp');
  assert.equal(lampOwned(g), false);
  g.completeStory();
  assert.equal(lampOwned(g), true); assert.deepEqual(unlockedSummoners(g), ['hanuman']); assert.deepEqual(slottedSummoners(g), ['hanuman']); assert.equal(summonUsesLeft(g, 'hanuman'), 3);
  assert.deepEqual(g.notices, ['lamp-received']);
  g = (() => { const n = createGame(); n.restore(JSON.parse(JSON.stringify(g.snapshot()))); return n; })();
  assert.equal(lampOwned(g), true); assert.deepEqual(g.notices, ['lamp-received']);
  g.ackNotice('lamp-received'); assert.deepEqual(g.notices, []);
  assert.equal(g.giveLamp(), false, 'never twice');
});

test('a later helper (D4: its own event passed) queues the "new helper" window with its name; a not-yet-ready one is unlocked silently-safe', () => {
  const g = createGame(); g.giveLamp(); g.ackNotice('lamp-received');
  assert.equal(g.unlockHelper('kumanthong'), true); assert.equal(g.unlockHelper('kumanthong'), false);
  assert.deepEqual(g.notices, ['lamp-helper-kumanthong']);
  assert.equal(NOTICES['lamp-helper-kumanthong'].text, 'กุมารทอง ยอมรับท่านแล้ว และฝากไฟไว้ในตะเกียงวิเศษ เลือกใส่ในช่องได้ที่เมนูกระเป๋า');
  assert.equal(NOTICES['lamp-helper-kumanthong'].en.text, 'Kuman Thong has accepted you and left a flame in the Magic Lamp. Place them in a slot from the bag menu.');
  for (const k of Object.keys(SUMMONERS)) assert.ok(NOTICES[`lamp-helper-${k}`], k);
  assert.equal(NOTICES['lamp-helper-kumanthong'].art, SUMMONERS.kumanthong.art.icon);   // T5'/1: his (placeholder) picture exists now
  assert.equal(NOTICES['lamp-helper-lupin'].art, SUMMONERS.lupin.art.icon);   // T8b/6: Lupin has his (placeholder) picture now, like Thor
  assert.equal(NOTICES['lamp-helper-hanuman'].art, SUMMONERS.hanuman.art.icon);
  assert.equal(NOTICES['lamp-low'].title, 'ไฟในตะเกียงริบหรี่');
});
