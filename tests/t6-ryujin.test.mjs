// T6/5 - Border 2-3: the water cave, Ryujin, Musashi's strike at ~25 % HP, the 6th helper (Rae R2 part B section 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { FRONTIER, ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { setLang } from '../src/i18n.js';
import { RYUJIN, RYUJIN_TEXT, ART, MUSASHI_TALK } from '../src/z2b-ryujin.js';
import { HARBOR } from '../src/z2b-harbor.js';
import { BOSS_SKILLS } from '../src/boss-skills-data.js';
import { bossGuideFollowing, recordBossGuideWin } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { const seen = []; for (let i = 0; i < 14 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
/** Yama + Nira + Musashi, on the walk to Border 2-3 */
function onTheWalk() {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'asia'; g.giveLamp(); g.bossCleared.asia = true; g.coin = 5000;
  recordBossGuideWin(g, { over:'win', zone:'asia', kind:'zoneBoss' }); g.inviteBossGuide(); drain(g); g.notices = []; g.pendingReward = null;
  g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; assert.equal(g.beginBorderDungeon('west'), true); assert.equal(bossGuideFollowing(g), true);
  return g;
}
const strikeAt = (g, boss) => { for (const f of g.battle.foes) f.atk = [0, 0]; boss.hp = Math.floor(boss.maxHp * .25) + 1; /* any hit takes him under a quarter */ g.battle.selectedFoeId = boss.id; assert.equal(g.battleAct('atk'), true); };

test('the water cave is due once, at the middle checkpoint of the walk to Border 2-3, only while Musashi walks with Yama; NR-1 leads into the 2-page scene', () => {
  const g = onTheWalk(); const st = dungeonStatus(g); assert.equal(st.route.id, 'asia:west');
  assert.equal(g.ryujinFightDue(0), false); assert.equal(g.ryujinFightDue(2), false); assert.equal(g.ryujinFightDue(RYUJIN.checkpoint), true);
  const plain = createGame(); assert.equal(plain.ryujinFightDue(RYUJIN.checkpoint), false);
  assert.equal(NOTICES[RYUJIN.arriveNotice].en.title, 'The Water Cave at the Frontier'); assert.equal(NOTICES[RYUJIN.arriveNotice].button, 'เดินเข้าไป');
  g.queueNotice(RYUJIN.arriveNotice); g.ackNotice(RYUJIN.arriveNotice); assert.equal(g.storyQueue.at(-1).key, 'z2-ryujin-open');
  const s = storyOf('z2-ryujin-open'); assert.equal(s.pages.length, 2); assert.match(s.pages[0].line, /ผู้ใดล่วงล้ำสายน้ำของข้า/); assert.match(s.pages[1].line, /จงแสดงให้ข้าเห็น/); assert.ok(s.pages[0].en.line.includes('Who tramples the waters'));
  const row = ZONE_EVENTS.asia.find(e => e.k === RYUJIN.eventKey); assert.ok(row.gate); assert.equal(row.atCases, 999); assert.equal(row.foe.sp, 'boss-ryujin-asia');
  assert.deepEqual(BOSS_SKILLS.ryujin.map(m => [m.id, m.kind, m.name.th]), [['wrathTide', 'groupHit', 'คลื่นสายน้ำโกรธ'], ['cliffTail', 'heavyHit', 'หางมังกรทุบผา']]);
  assert.ok(row.lines.start.includes('จงเห็นความโกรธของสายน้ำ'));
});

test('the fight: Yama + Nira + Musashi; at ~25 % HP it stops for the strike scene (2 pages, a light - no blood), the next move ends it as a win; the dragon is never below 1 HP before that', () => {
  const g = onTheWalk(); const b = g.startRyujinFight(); assert.ok(b); assert.equal(b.expeditionParty, true); assert.equal(b.talk, RYUJIN_TEXT.lines.start);
  assert.ok(g.battleActors().some(a => a.guestGuide && a.name === 'มูซาชิ'), 'Musashi fights beside them');
  const boss = b.foes.find(f => f.boss); boss.hp = boss.maxHp;
  strikeAt(g, boss); assert.equal(b.breachFinale, 'ready'); assert.equal(b.finaleMove, 'musashiStrike'); assert.equal(b.storyInterlude, RYUJIN.strikeStory); assert.ok(boss.hp >= 1 && boss.hp <= boss.maxHp * .25);
  const s = storyOf(RYUJIN.strikeStory); assert.equal(s.pages.length, 2); assert.match(s.pages[1].line, /ไม่มีเลือด ไม่มีบาดแผลบนเกล็ด/); assert.ok(!/ฟันคลื่น/.test(JSON.stringify(s)), 'Reese 4.1'); assert.match(s.pages[1].line, /ข้าฟันเพื่อหยุด ข้าไม่ฟันผู้ที่ควรได้รับความเคารพ/);
  assert.equal(g.battleAct('atk', { actorId:'you', recipientId:'you' }), true, 'whatever is pressed IS the strike');
  assert.equal(b.over, 'win'); assert.equal(b.breachFinale, 'done'); assert.ok(b.foes.every(f => f.hp <= 0));
  g.endBattle(); assert.equal(g.zoneEventStatus(RYUJIN.eventKey), 'cleared'); assert.ok(g.storyQueue.some(s => s.key === RYUJIN.winStory)); assert.equal(g.ryujinDone(), true); assert.equal(g.ryujinFightDue(RYUJIN.checkpoint), false, 'once');
});

test('the win scene hands over Ryujin: NR-3 (the helper window) + the 6th flame; a reload keeps it; "Dragon Beneath the Cave" is a strong group hit', () => {
  const g = onTheWalk(); const b = g.startRyujinFight(); const boss = b.foes.find(f => f.boss); strikeAt(g, boss); g.battleAct('atk'); g.endBattle(); g.notices = [];
  assert.equal(storyOf('z2-ryujin-win').pages.length, 2); assert.match(storyOf('z2-ryujin-win').pages[1].line, /น้ำจะมาเมื่อถูกเรียก/);
  drain(g); assert.equal(L.ensureMagic(g).unlocked.ryujin, true); assert.ok(g.notices.includes('lamp-helper-ryujin'));
  assert.equal(NOTICES['lamp-helper-ryujin'].en.title, 'Ryujin Accepts You'); assert.equal(NOTICES['lamp-helper-ryujin'].openLamp, true);
  const d = L.SUMMONERS.ryujin; assert.equal(d.ready, true); assert.equal(d.move.kind, 'group'); assert.equal(d.move.name.en, 'Dragon Beneath the Cave'); assert.equal(d.name.en, 'Ryujin (the Dragon)');
  assert.ok(L.summonDamage(g, 'ryujin') > L.summonDamage(g, 'hanuman') && L.summonDamage(g, 'ryujin') < 88);
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(L.ensureMagic(copy).unlocked.ryujin, true);
});

test('a lost fight: its lose scene, then the tea house (Zone 2 events lose like the others), the cave can be tried again', () => {
  const g = onTheWalk(); const b = g.startRyujinFight(); assert.ok(b);
  b.youHp = 1; for (const f of b.foes) { f.atk = [999, 999]; f.hp = f.maxHp = 9999; }
  for (let i = 0; i < 60 && !b.over; i++) { if (!g.runEnemyTurn()) g.battleAct('atk', { actorId:b.actorId || 'you', recipientId:'you' }); }
  assert.equal(b.over, 'lose'); assert.ok(g.storyQueue.some(s => s.key === 'z2-ryujin-lose')); assert.equal(storyOf('z2-ryujin-lose').pages.length, 1);
  g.endBattle(); assert.ok(g.pendingRecovery, 'the tea house follows'); assert.equal(g.ryujinDone(), false);
});

test('Musashi\'s walking lines are Rae\'s four; pictures exist; the scenes read in English', () => {
  assert.equal(MUSASHI_TALK.length, 4); assert.ok(MUSASHI_TALK[2].th.includes('นิรา: "จดค่ะ'));
  for (const f of [ART.open, ART.yields, ART.tide, ART.portrait, ART.strike, ART.icon, ART.battle, ART.cut, 'img/z2-events/boss-ryujin-asia.webp']) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
  try { setLang('en'); assert.match(storyOf(RYUJIN.strikeStory).pages[1].line, /There is no blood and no wound on the scales/); assert.equal(storyOf('z2-ryujin-lose').pages[0].title, 'The Water Does Not Pile On'); } finally { setLang('th'); }
});
