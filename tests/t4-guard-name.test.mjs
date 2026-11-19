// T4 step 7 - the Zone 1 Guard is "กุมภัณฑ์" (Rae R2 A section 1 · owner G10) - Zone 1 only; the other zones keep "ยักษ์ทวารบาล" until their own Guard is named.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { GUARD, guardName, guardTitle } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { Z1_STORIES } from '../src/z1-events.js';
import { SIDE_CONTENT } from '../src/e1-content.js';
import { QUEST_FIGHTS } from '../src/quest-fights.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };

test('names: Zone 1 = กุมภัณฑ์ / Kumphan with his title; every other zone keeps the old word', () => {
  assert.equal(guardName('th'), 'กุมภัณฑ์'); assert.equal(guardName('th', 'en'), 'Kumphan');
  assert.equal(guardTitle('th'), 'ยักษ์ทวารบาลประจำสุวรรณภูมิ'); assert.equal(guardTitle('th', 'en'), 'Gate Guard of Suvarnabhumi');
  for (const z of ['asia', 'west', 'cyberhell']) { assert.equal(guardName(z), GUARD.name, z); assert.equal(guardTitle(z), ''); }
  assert.equal(GUARD.name, 'ยักษ์ทวารบาล');
});

test('z1-guard-name (R2 A 1.2): one page, the speaker changes from "ยักษ์เขียว" to "กุมภัณฑ์" after he says it, and it plays right after he joins (case 9) - once', () => {
  const s = storyOf('z1-guard-name'); assert.equal(s.pages.length, 1); assert.equal(Z1_STORIES['z1-guard-name'], s);
  const line = s.pages[0].line;
  assert.match(line, /ยักษ์เขียว: "เอ่อ/); assert.match(line, /ข้าชื่อกุมภัณฑ์ \(กระแอม\) ตั้งแต่รุ่นพ่อข้าเฝ้าด่านนี้/);
  assert.match(line, /นิรา: "บันทึกชื่อแล้วค่ะ กุมภัณฑ์ ผู้เฝ้าด่านสุวรรณภูมิ"/); assert.match(line, /กุมภัณฑ์: "ฮะ ฮะ/);
  const src = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
  assert.ok(src.indexOf("this.queueStory('c1-guard-arrival');") < src.indexOf("this.queueStory('z1-guard-name');"), 'after the join scene');
  const g = createGame(); g.queueStory('z1-guard-name'); g.completeStory(); g.queueStory('z1-guard-name'); assert.deepEqual(g.storyQueue, []);
});

test('the Zone 1 guard side quest speaks as กุมภัณฑ์ everywhere; no "ยักษ์ทวารบาล" is left in it', () => {
  const q = JSON.stringify(SIDE_CONTENT?.sqGuard ?? SIDE_CONTENT?.find?.(x => x.id === 'sqGuard') ?? {});
  assert.ok(q.length > 50); assert.ok(!q.includes('ยักษ์ทวารบาล')); assert.ok(q.includes('กุมภัณฑ์'));
  assert.equal(QUEST_FIGHTS.sqGuard.ownerName, 'กุมภัณฑ์'); assert.ok(!JSON.stringify(QUEST_FIGHTS.sqGuard, (k, v) => typeof v === 'function' ? String(v) : v).includes('ยักษ์ทวารบาล'));
});

test('Zone 2 story text is untouched (its Guard becomes Guan Yu in its own part)', () => {
  const z2 = readFileSync(new URL('../src/z2-events.js', import.meta.url), 'utf8');
  assert.ok(z2.includes('ยักษ์ทวารบาลขอทดสอบ')); assert.ok(!z2.includes('กุมภัณฑ์'));
});

test('the team, the hire card and the battle all read the name of the zone the player is in', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8'), game = readFileSync(new URL('../src/game.js', import.meta.url), 'utf8');
  assert.ok(!/GUARD\.name/.test(ui) && !/GUARD\.name/.test(game), 'every display site goes through guardName(zone)');
  assert.ok(ui.includes('guardName(g.zone)') && game.includes('guardName(this.zone)'));
});
