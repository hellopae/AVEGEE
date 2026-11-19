// T5'/6 + T5'/7 - Guan Yu's old comrade (the kin case `deserter`) and the boatman's quest (Rae R2 A sections 9 and 10).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { Z2_KIN_BY_KEY } from '../src/z2-events.js';
import { CASE_DESERTER } from '../src/z2-events-text.js';
import * as B from '../src/boatman.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { for (let i = 0; i < 14 && g.storyQueue.length; i++) g.completeStory(); };
const fresh = () => { const g = createGame(); g.save = () => true; g.onChange = () => {}; return g; };

test('T5\'/6 Guan Yu\'s old comrade: the deserter case keeps its body, the line names Guan Yu, the notice / talks are his, the choice pays the `hard` reward once', () => {
  assert.match(CASE_DESERTER.line, /ท่านกวนอูที่ยืนเฝ้าประตูหน้า/); assert.equal(CASE_DESERTER.claims.length, 4); assert.equal(CASE_DESERTER.kind, 'tragic');
  const row = Z2_KIN_BY_KEY.deserter;
  assert.equal(row.notice.title, 'ทหารเก่าของกวนอู'); assert.equal(NOTICES['kin-deserter'].en.title, "Guan Yu's Old Comrade");
  assert.match(row.before[0], /^กวนอู: "ท่านผู้ถือบัญชี ข้ามีเรื่องจะขอ/); assert.ok(row.before.length >= 5); assert.ok([...row.before, ...row.during, ...row.after, ...row.closing].every(l => !/ยักษ์ทวารบาล/.test(l)));
  assert.equal(row.choices.length, 2); assert.equal(row.choices[0].label, 'ให้กวนอูเอ่ยชื่อเพื่อนสามคนให้เขาฟัง'); assert.equal(row.closing.length, 2);
  const g = fresh(); g.kinDone = { deserter:{ verdict:'punished', choice:null } };
  const coin = g.coin, health = g.inventory.health || 0;
  assert.equal(g.payKinReward('deserter'), true); assert.equal(g.coin, coin + 60); assert.equal(g.inventory.health, health + 2); assert.equal(g.inventory.holyWater >= 2, true);
  assert.equal(g.payKinReward('deserter'), false, 'once'); assert.ok(g.journalNotes.some(n => n.includes('ตราประจำกองของกวนอู')));
  assert.match(g.kinRewardText('deserter'), /60 เบี้ยกรรม/);
});

test('T5\'/7 the boatman: lines of the crossing, quest opens after the 2nd ride, two verses, the song, reward 60 + a keepsake; no fight; survives a save', () => {
  const g = fresh(); const lp = B.ensureBoatman(g);
  assert.equal(B.boatLine(g, 'first'), B.BOAT_LINES.first.th); assert.equal(B.BOAT_LINES.board.length, 3); assert.equal(B.BOAT_LINES.mid.length, 3); assert.equal(B.BOAT_LINES.arrive.length, 3);
  assert.equal(g.boatFirstRide(), true); assert.equal(g.storyQueue[0].key, 'boatman-first'); assert.equal(g.boatFirstRide(), false, 'one page, once'); drain(g);
  g.boatArrived(); assert.equal(lp.quest, 'none', 'after the first ride nothing is asked'); assert.equal(g.storyQueue.length, 0);
  g.boatArrived(); assert.equal(lp.quest, 'active'); assert.equal(g.storyQueue[0].key, 'boatman-ask'); assert.ok(g.notices.includes(B.BOATMAN.askNotice));
  assert.match(storyOf('boatman-ask').pages[0].line, /ท่านนั่งเรือข้ามาสองหนแล้ว/); drain(g);
  // listening: Zone 1 = verse 2, Zone 2 = verse 3; the button only where it belongs
  g.zone = 'west'; assert.equal(B.canListen(g), false, 'the quest speaks of Zone 1 and Zone 2 only');
  g.zone = 'th'; assert.equal(B.canListen(g), true); assert.equal(B.canSing(g), false);
  assert.equal(g.boatListen(), true); assert.equal(g.storyQueue.at(-1).key, 'boatman-verse-th'); assert.match(storyOf('boatman-verse-th').pages[0].line, /ฝั่งเอ๋ยฝั่งไกล/); assert.equal(B.heardCount(g), 1); drain(g);
  assert.equal(g.boatListen(), false, 'a verse is heard once'); assert.equal(B.canSing(g), false);
  g.zone = 'asia'; assert.equal(g.boatListen(), true); assert.match(storyOf('boatman-verse-asia').pages[0].line, /ถึงฝั่งเอ๋ยถึงฝั่ง/); drain(g);
  assert.equal(B.canSing(g), true);
  const copy = fresh(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(copy.boatman.quest, 'active'); assert.equal(B.heardCount(copy), 2);
  const coin = g.coin; assert.equal(g.boatSing(), true); assert.equal(g.coin, coin + 60); assert.equal(lp.quest, 'done'); assert.ok(g.journalNotes.some(n => n.includes('ไม้แจวเพลงเรือ')));
  assert.equal(g.storyQueue.at(-1).key, 'boatman-sing'); assert.ok(g.notices.includes(B.BOATMAN.doneNotice)); assert.equal(g.boatSing(), false, 'once');
  assert.equal(B.boatLine(g, 'mid'), B.BOAT_LINES.done.th, 'after the song the crossing line changes');
  assert.equal(g.battle, null);
});

test('the notices have English; the verses are Rae\'s; every picture is a .webp that exists; the song is never called a traditional boat song', () => {
  for (const id of [B.BOATMAN.askNotice, B.BOATMAN.heardNotice, B.BOATMAN.doneNotice]) assert.ok(NOTICES[id].en.title && NOTICES[id].title, id);
  assert.equal(B.VERSES[1].th.split('\n').length, 2); assert.match(B.VERSES[3].en, /Thank you, whoever listened/);
  for (const f of [B.ART.sprite, B.ART.portrait, B.ART.song, B.ART.water, B.ART.oar]) { assert.ok(f.endsWith('.webp')); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
  for (const s of Object.values(B.BOATMAN_STORIES)) for (const p of s.pages) assert.ok(!/ตามประเพณี/.test(p.line));
});
