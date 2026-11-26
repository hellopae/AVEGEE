// T6/4 - Zone 2's boss Lian Gang waits at the harbor; "I am ready" = the gift (800 + Zone 3 robes + beasts warning + Musashi joins + the 5th flame) (Rae R2 part B section 4).
import { callHelper, helperAct } from './summon-helper.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { setLang } from '../src/i18n.js';
import { HARBOR, HARBOR_STORIES, PIER_TALK, ART, MUSASHI } from '../src/z2b-harbor.js';
import { bossGuideWaiting, bossGuideFollowing, bossGuideDismissed, bossGuideCombatant, recordBossGuideWin, HARBOR_ZONES } from '../src/boss-guides.js';
import { Z2_STORIES } from '../src/z2-events.js';
import { ZONE_EVENTS } from '../src/data.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { const seen = []; for (let i = 0; i < 12 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
function afterLianWin() {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'asia'; g.giveLamp(); g.notices = [];
  g.bossCleared.asia = true; assert.equal(recordBossGuideWin(g, { over:'win', zone:'asia', kind:'zoneBoss' }), true); return g;
}

test('after the win: no praise scene, NL-1 says he waits at the harbor; his last line in z2-lian-win is "I will stand at this harbor"; he stays on the pier', () => {
  const g = afterLianWin(); assert.ok(g.notices.includes(HARBOR.waitNotice)); assert.equal(g.storyQueue.length, 0);
  assert.equal(NOTICES[HARBOR.waitNotice].en.title, 'The General Waits at the Harbor');
  assert.ok(HARBOR_ZONES.includes('asia')); assert.equal(bossGuideWaiting(g), true); assert.equal(bossGuideDismissed(g), false);
  const last = storyOf('z2-lian-win').pages.at(-1).line; assert.ok(last.includes('ข้าจะยืนอยู่ที่ท่าเรือนี้ เมื่อเจ้าพร้อม มาหาข้า')); assert.ok(!last.includes('ประตูชายแดน'));
});

test('"I am ready": the 3-page gift scene, 800 coins + the Zone 3 robes at once (NL-2 receipt), NL-3 Musashi joins, NL-4 the flame; Musashi is the guest of the walk', () => {
  const g = afterLianWin(); const coin = g.coin;
  assert.equal(g.inviteBossGuide(), true); assert.equal(g.storyQueue[0].key, HARBOR.giftStory);
  const s = storyOf(HARBOR.giftStory); assert.equal(s.pages.length, 3);
  assert.match(s.pages[0].line, /ชุดปัจฉิมกับเงินแปดร้อยเบี้ย/); assert.match(s.pages[1].line, /ผู้ถือสายน้ำ/); assert.match(s.pages[1].line, /ผู้พิทักษ์ประตูสามเศียร/);
  assert.match(s.pages[2].line, /มูซาชิ ไปกับพวกเขา/); assert.match(s.pages[2].line, /ข้ารับปากน้อย แต่เมื่อรับแล้วข้ารักษาคำ/); assert.ok(!/ไม่เคยผิดคำ/.test(JSON.stringify(s)), 'Reese 1.4');
  assert.match(s.pages[2].line, /ไส้อีกดวงสว่างขึ้นด้วยเปลวสีเทาเงินนิ่ง/);
  drain(g);
  assert.equal(g.coin, coin + 800); assert.ok(g.outfitsOwned.includes('west')); assert.equal(g.pendingReward?.guideZone, 'asia'); assert.equal(g.pendingReward.title, 'ของฝากจากแม่ทัพ'); assert.equal(g.pendingReward.coin, 800);
  assert.ok(g.notices.includes(HARBOR.joinNotice)); assert.match(NOTICES[HARBOR.joinNotice].text, /ยามา นิรา และมูซาชิ/); assert.equal(NOTICES[HARBOR.joinNotice].en.text.endsWith('heading for Frontier 2-3.'), true);
  assert.ok(g.notices.includes('lamp-helper-liangang')); assert.equal(NOTICES['lamp-helper-liangang'].en.title, 'Lian Gang Leaves a Flame in the Lamp'); assert.equal(NOTICES['lamp-helper-liangang'].openLamp, true);
  assert.equal(L.ensureMagic(g).unlocked.liangang, true);
  assert.equal(bossGuideFollowing(g), true); const c = bossGuideCombatant(g); assert.equal(c.name, 'มูซาชิ'); assert.equal(c.artKey, MUSASHI.artKey); assert.equal(bossGuideDismissed(g), false, 'Lian Gang stays at the harbor');
  assert.equal(NOTICES[HARBOR.giftNotice].en.text.includes('change over automatically'), true);
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(bossGuideFollowing(copy), true); assert.equal(copy.coin, g.coin);
  const again = afterLianWin(); again.inviteBossGuide(); drain(again); assert.equal(again.inviteBossGuide(), false, 'once');
});

test('the talk: first words, two answers, "not yet" changes nothing and every later tap gives one of two lines; after the gift he says the cold-West line', () => {
  assert.equal(PIER_TALK.first.length, 2); assert.equal(PIER_TALK.go.th, 'พร้อมครับ'); assert.equal(PIER_TALK.wait.th, 'ขอเตรียมตัวก่อน'); assert.equal(PIER_TALK.again.length, 2);
  assert.equal(PIER_TALK.firstEn[1], 'Lian Gang: "The West is not a land I keep. I only know the road there is not like this one. Are you ready to go?"');
  const g = afterLianWin(); assert.equal(bossGuideWaiting(g), true, 'not answering = still waiting'); assert.equal(g.bossGuideWaiting(), true);
  assert.equal(NOTICES[HARBOR.remindNotice].en.button, 'Understood');
});

test('Chain Line: a light hit on every foe and their next blow is lighter; 1 of 3 lamp uses (he stands in the team for 3 acts); he is helper no. 5', () => {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.giveLamp(); L.unlockSummoner(g, 'liangang'); L.ensureMagic(g).lamp.level = 2; g.placeHelper(1, 'liangang');
  g.zoneEvents.th = { prisonBreak:'pending' }; const b = g.startPrisonBreak(); assert.ok(b);
  for (const f of b.foes) { f.atk = [20, 20]; f.hp = f.maxHp = 9999; }
  const before = b.foes.map(f => f.hp), dmg = L.helperActDamage(g, 'liangang', 'move'); assert.ok(dmg > 0 && dmg < L.helperActDamage(g, 'hanuman', 'move'), 'light');   // FB3-EV5: the call hits nobody, the standing helper's move does
  assert.equal(callHelper(g, 'liangang'), true); assert.deepEqual(b.foes.map(f => f.hp), before);
  assert.equal(helperAct(g, 'helper:move', 'liangang', false), true);
  b.foes.forEach((f, i) => assert.equal(f.hp, before[i] - dmg)); assert.ok(b.foes.filter(f => f.weak > 0).length >= b.foes.length - 1, 'every foe is weakened (the one that already answered used its weak blow up)'); assert.equal(b.summon.move, 'ตรวนกั้นแถว'); assert.equal(b.summon.left, 2);
  assert.equal(L.SUMMONERS.liangang.move.kind, 'group'); assert.equal(L.SUMMONERS.liangang.say.end.th, 'เหลียนกัง: "ข้ามาตามที่ให้คำ ที่เหลือเป็นของเจ้า"');
});

test('pictures are .webp files that exist (stand-ins / placeholders until Codex draws them); English on the scene', () => {
  for (const f of [ART.gift, ART.portrait, ART.musashiProfile, ART.icon, ART.battle, ART.cut, 'img/z2-events/char-musashi-asia.webp']) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
  try { setLang('en'); const s = storyOf(HARBOR.giftStory); assert.equal(s.title, 'A Gift from the General'); assert.match(s.pages[2].line, /Musashi, go with them/); } finally { setLang('th'); }
});
