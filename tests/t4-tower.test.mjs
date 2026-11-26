// T4 step 4 - the Mirror Tower refills the three treasures and (temporarily) upgrades the lamp; Kan explains the lamp once (R2 A 2.1 / 2.4 / 2.5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { storyOf } from '../src/story.js';
import * as L from '../src/lamp.js';
import { lt } from '../src/lamp-text.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };

test('g.rechargeMagic: refills only what is spent, free, saves; "all" does the three', () => {
  const g = createGame(); g.giveLamp(); g.powerLocked = () => false;
  const p = g.powerOf('mirror'); p.ammo = 0; L.spendSummon(g, 'hanuman');
  assert.deepEqual(g.rechargeMagic('clock'), [], 'no clock yet - nothing happens (text: "ยังไม่ได้รับนาฬิกาวิเศษ")');
  const coin = g.coin;
  assert.deepEqual(g.rechargeMagic('all'), ['mirror', 'lamp']); assert.equal(g.coin, coin, 'free');
  assert.equal(p.ammo, p.max); assert.equal(L.summonUsesLeft(g, 'hanuman'), 1);
  assert.deepEqual(g.rechargeMagic('all'), [], 'already full');
});

test('g.upgradeLampDev: zone 1 tower confirms level 1, zone 2/3/4 lift it to 2/3/4, each tower once, never without the lamp', () => {
  const g = createGame();
  assert.equal(g.upgradeLampDev('th'), 'noLamp');
  g.giveLamp();
  assert.equal(g.upgradeLampDev('th'), ''); assert.equal(L.lampSlotCount(g), 1); assert.equal(g.upgradeLampDev('th'), 'already');
  for (const [z, n] of [['asia', 2], ['west', 3], ['cyberhell', 4]]) { assert.equal(g.upgradeLampDev(z), ''); assert.equal(L.lampSlotCount(g), n, z); }
});

test('the dev upgrade is one flag: with it off nothing upgrades', async () => {
  // the flag is a module constant: read the source once to be sure the button and the entry point both check it
  const { readFileSync } = await import('node:fs');
  const lamp = readFileSync(new URL('../src/lamp.js', import.meta.url), 'utf8'), ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(lamp, /if \(!LAMP_DEV_UPGRADE_BUTTON\) return 'off'/);
  assert.match(ui, /LAMP\.LAMP_DEV_UPGRADE_BUTTON \?/);
  assert.equal([...(lamp + ui).matchAll(/LAMP_DEV_UPGRADE_BUTTON/g)].length >= 3, true);
});

test('z1-kan-lamp: Kan\'s lecture is Rae\'s 2.5 text, one page, and plays once', () => {
  const s = storyOf('z1-kan-lamp'); assert.equal(s.pages.length, 1);
  assert.match(s.pages[0].line, /ผมไม่ค่อยพูดครับ แต่เรื่องนี้ต้องพูด/); assert.match(s.pages[0].line, /เรียกเขามาครั้งเดียวมันก็ริบ/); assert.match(s.pages[0].line, /นาฬิกาก็เติมได้ถ้าท่านมี/);
  const g = createGame(); g.queueStory('z1-kan-lamp'); g.completeStory(); g.queueStory('z1-kan-lamp');
  assert.deepEqual(g.storyQueue, [], 'seen once, never queued again');
});

test('tower texts: TH + EN exactly as Rae wrote them', () => {
  assert.equal(lt('tower.doneOne', { item:'กระจกวิเศษ' }, 'th'), 'กระจกวิเศษ พลังเต็มแล้ว');
  assert.equal(lt('tower.doneAll', null, 'en'), 'All treasures are fully charged.');
  assert.equal(lt('tower.upDone', { n:3 }, 'en'), 'The Lamp burns brighter · it now holds 3 helpers.');
  assert.equal(lt('tower.noItem', { item:'นาฬิกาวิเศษ' }, 'th'), 'ยังไม่ได้รับนาฬิกาวิเศษ');
});

test('g.placeHelper (the bag tab): only unlocked helpers, only inside the lamp level, one slot each, can be emptied', () => {
  const g = createGame(); g.giveLamp(); g.unlockHelper('kumanthong');
  assert.equal(g.placeHelper(1, 'kumanthong'), false, 'slot 2 is locked at level 1');
  assert.equal(g.placeHelper(0, 'thor'), false, 'not met');
  g.upgradeLampDev('asia');
  assert.equal(g.placeHelper(1, 'kumanthong'), true); assert.deepEqual(g.magic.lamp.slots.slice(0, 2), ['hanuman', 'kumanthong']);
  assert.equal(g.placeHelper(0, 'kumanthong'), true); assert.deepEqual(g.magic.lamp.slots.slice(0, 2), ['kumanthong', 'hanuman'], 'moving him swaps, never two copies');
  assert.equal(g.placeHelper(0, null), true); assert.deepEqual(L.slottedSummoners(g), ['hanuman']);
  assert.equal(L.lampSlotCount(g), 2);
});
