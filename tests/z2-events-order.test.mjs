// Z2-EVENTS — the owner's order of Zone 2's story beats (spec 14 Nov 2026, Output/Claudy/briefs/2026-11-14-avegee-z234-events-owner-spec.md · Rae's script Output/Rae/2026-11-14-avegee-z2-events.md).
// One full run, case 0 -> 15, plus old saves and the crew's relatives. The Zone 1 order slipped once: this file is the guard for Zone 2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, loadSave } from '../src/game.js';
import { STATIONS, ZONE_EVENTS, ZONE_BOSS_AT, GUARD, SPOTS } from '../src/data.js';
import { bossJusticeCase, bossJusticeAnswer, interrogateBoss, mirrorBoss, sentenceBoss, ARENA_STORIES } from '../src/boss-justice.js';
import { NOTICES, Z1_STORIES, storyCaseRows } from '../src/z1-events.js';
import { Z2_KIN, Z2_STORY_CASES, Z2_STORIES, Z2_TEXT, Z2_ART, AKURA_TRIAL, DEVA_ASIA_ARRIVAL, Z2_KIN_REPEAT_LINE } from '../src/z2-events.js';
import { storyOf, ABILITY_REWARDS } from '../src/story.js';
import { devaMapActors } from '../src/deva-map.js';
import { setLang, t } from '../src/i18n.js';
import { ALL_CASES as CASES_ALL } from '../src/cases.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };

const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
const fresh = () => { const g = createGame(); g.zone = 'asia'; g.coin = 9000; g.stations.push(station('sawan'), station('krata'), station('lan')); g.refreshZoneEvents('asia'); return g; };
const reload = g => { const loaded = createGame(); loaded.restore(JSON.parse(JSON.stringify(g.snapshot()))); return loaded; };
const steady = g => { g.hp = g.hpMax; g.reds = 0; g.dadFight = false; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };
const status = (g, k) => g.zoneEventStatus(k);
/** Judge the soul at the head of the queue (a story case when one is due, else any soul). `heaven` = send to the gate of heaven. */
function judgeNext(g, { heaven = false } = {}) {
  g.ensureDevaCase();
  const owed = g.storyCaseOwed();
  if (!g.queue.some(s => !s.kin)) g.spawnSoul();
  const at = g.queue.findIndex(s => !s.kin), soul = g.queue[at];      // the crew's relatives are heard in their own tests below
  if (owed) assert.equal(soul.case, owed, `case ${g.zoneCases.asia + 1} must be the story case ${owed}`);
  g.queue.splice(at, 1);
  const st = { def:STATIONS.find(d => d.k === (heaven ? 'sawan' : 'krata')), crewK:'taan' };
  g.applyVerdict(g.judge(st, { soul, intensity:1 }), soul);
  steady(g);
  return soul;
}
function strike(g) {
  for (const f of g.battle.foes) f.atk = [0, 0];
  const f = g.battle.foes.find(f => f.hp > 0); f.hp = 1; g.battle.selectedFoeId = f.id;
  assert.equal(g.battleAct('atk'), true);
}
function winFight(g) {
  for (let i = 0; i < 60 && g.battle && !g.battle.over; i++) {
    if (g.battle.pendingWave) { assert.ok(g.advanceZoneEventWave()); continue; }
    if (g.battle.breachFinale === 'ready') { g.battle.storyInterlude = null; g.battleAct(g.battle.finaleMove || 'teamJudgment'); continue; }
    strike(g);
  }
  assert.equal(g.battle?.over, 'win'); g.endBattle(); steady(g);
}
const drainStories = g => { const seen = []; for (let i = 0; i < 30 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
const plain = g => g.notices.filter(n => !n.startsWith('kin-'));      // notices of the story beats (the relatives' own are tested apart)
const ackAll = g => { const seen = []; for (let i = 0; i < 30 && plain(g).length; i++) { seen.push(plain(g)[0]); g.ackNotice(plain(g)[0]); } return seen; };

test('the table itself: case 3 / 7 / 11 / 13 / 15', () => {
  const at = k => ZONE_EVENTS.asia.find(e => e.k === k).atCases;
  assert.deepEqual([at('asiaPrisonFire'), at('asiaDevaTest'), at('asiaWukong'), at('asiaRageBreach')], [3, 3, 7, 11]);
  assert.deepEqual(Z2_STORY_CASES.map(c => [c.k, c.after + 1]), [['apeelder', 7], ['satorifather', 13]]);
  assert.equal(ZONE_BOSS_AT.asia, 15);
  assert.equal(ZONE_EVENTS.asia.find(e => e.k === 'asiaPrisonFire').afterKills, 1, 'the deva comes down after ONE spirit fell');
  const breach = ZONE_EVENTS.asia.find(e => e.k === 'asiaRageBreach');
  assert.equal(breach.waves.length, 4); assert.deepEqual(breach.waves.map(w => w.some(f => f.boss)), [false, false, false, true]);
  assert.equal(breach.waves.at(-1)[0].sp, 'boss-frontier-asia');
  assert.equal(t('deva.asia.arrival'), DEVA_ASIA_ARRIVAL.th); setLang('en'); assert.equal(t('deva.asia.arrival'), DEVA_ASIA_ARRIVAL.en); setLang('th');
});

test('case 3: prison fire -> the deva comes down after ONE spirit, helps -> waits -> test (windFan) -> flies away', () => {
  let g = fresh();
  for (let n = 1; n <= 3; n++) { assert.equal(status(g, 'asiaPrisonFire'), 'locked', `fire must wait for case 3 (at ${n - 1})`); judgeNext(g); }
  assert.equal(status(g, 'asiaPrisonFire'), 'pending');
  const coin = g.coin; g.startZoneEvent('asiaPrisonFire'); assert.equal(g.battle.foes.length, 3);
  assert.equal(g.battle.talk, Z2_TEXT.prisonFire.banner.th);
  strike(g);                                                             // ONE spirit fell
  assert.equal(g.battle, null); assert.equal(g.devaVisits.asia.phase, 'descending');
  assert.equal(g.devaVisits.asia.battle.foes.filter(f => f.hp > 0).length, 2, 'two spirits are left for the deva and Yama');
  assert.equal(g.finishDevaDescent(), true); assert.equal(g.storyQueue[0].key, 'deva-asia');
  assert.equal(storyOf('deva-asia').pages[0].line, DEVA_ASIA_ARRIVAL.th);
  g = reload(g); g.completeStory();
  assert.equal(status(g, 'asiaPrisonFire'), 'cleared'); assert.equal(g.coin - coin, 90);
  assert.deepEqual(drainStories(g), ['z2-kuroha-wait']); assert.deepEqual(plain(g), ['z2-kuroha-wait']);
  assert.equal(NOTICES['z2-kuroha-wait'].text, 'คุโรฮะ ผู้ตรวจแห่งวายุ รออยู่ที่ลานหน้าศาลเพื่อทดสอบท่าน เตรียมทีมให้พร้อมแล้วเดินไปคุยกับเขา');
  assert.deepEqual(ackAll(g), ['z2-kuroha-wait']);
  const actor = devaMapActors(g)[0]; assert.equal(actor.enabled, true, 'Kuroha waits on the map');
  const ev = ZONE_EVENTS.asia.find(e => e.k === 'asiaDevaTest');
  assert.equal(ev.openStory, 'z2-kuroha-open'); assert.equal(g.abilities.windFan, undefined);
  // lose first: the scene plays once, he waits, try again
  g.startZoneEvent('asiaDevaTest'); g.battle.foes.forEach(f => { f.hp = 99999; f.atk = [999, 999]; }); g.youHp = 1;
  g.battle.youHp = 1; for (let i = 0; i < 12 && !g.battle.over; i++) g.battleAct('atk');
  assert.equal(g.battle.over, 'lose'); g.endBattle(); steady(g);
  assert.ok(g.storyQueue.some(p => p.key === 'z2-kuroha-lose')); drainStories(g);
  assert.equal(status(g, 'asiaDevaTest'), 'pending'); assert.equal(devaMapActors(g).length, 1);
  g.startZoneEvent('asiaDevaTest'); assert.equal(g.battle.foes[0].who, 'คุโรฮะ'); winFight(g);
  assert.equal(g.abilities.windFan, true); assert.equal(status(g, 'asiaDevaTest'), 'cleared');
  assert.deepEqual(drainStories(g), ['z2-kuroha-win']);
  assert.equal(devaMapActors(g).length, 0, 'he flies back to the sky: no deva stands on the map afterwards');
  assert.equal(devaMapActors(reload(g)).length, 0);
});

/** Play on from a fresh Zone 2 to the moment right after case 3 (fire out, Kuroha's test passed). */
function passCase3(g) {
  for (let n = 1; n <= 3; n++) judgeNext(g);
  g.startZoneEvent('asiaPrisonFire'); strike(g); g.finishDevaDescent(); g.completeStory(); drainStories(g); ackAll(g);
  g.startZoneEvent('asiaDevaTest'); winFight(g); drainStories(g);
  assert.equal(status(g, 'asiaDevaTest'), 'cleared');
}

for (const heaven of [true, false]) test(`case 7 (${heaven ? 'ape sent to heaven' : 'ape punished'}): old ape -> Wukong -> PHANTOM-404 -> he goes back`, () => {
  let g = fresh(); passCase3(g);
  for (let n = 4; n <= 6; n++) { assert.equal(status(g, 'asiaWukong'), 'locked'); judgeNext(g); }
  assert.equal(g.zoneCases.asia, 6); assert.equal(g.storyCaseOwed(), 'apeelder');
  g = reload(g);
  assert.equal(g.queue.find(s => !s.kin).case, 'apeelder'); assert.equal(g.queue.filter(s => s.case === 'apeelder').length, 1);
  assert.deepEqual(plain(g), ['z2-ape-arrive']); const apeSoul = g.queue.find(s => s.case === 'apeelder'); assert.equal(apeSoul.sp, 'soul-ape-elder-asia'); assert.equal(apeSoul.pure, true);
  for (let i = 0; i < 12; i++) g.spawnSoul();
  assert.equal(g.queue.filter(s => s.case === 'apeelder').length, 1, 'never drawn by chance, never twice');
  g.queue = g.queue.filter(s => s.case === 'apeelder' || s.kin);
  assert.equal(g.jail(g.queue.find(s => s.case === 'apeelder').id), false, 'he cannot be jailed or skipped');
  ackAll(g);
  const ape = judgeNext(g, { heaven }); assert.equal(ape.case, 'apeelder'); assert.equal(g.zoneCases.asia, 7);
  assert.equal(status(g, 'asiaWukong'), 'pending');
  assert.equal(g.storyQueue[0].key, heaven ? 'z2-wukong-open' : 'z2-wukong-open-b');
  assert.equal(storyOf(g.storyQueue[0].key).pages.length, 3);
  assert.ok(storyOf(g.storyQueue[0].key).pages[1].line.includes(heaven ? 'ผมส่งผู้อาวุโสของท่านขึ้นประตูสวรรค์แล้วครับ' : 'ผมตัดสินตามบัญชีที่ได้รับมาครับ'));
  g = reload(g); assert.equal(g.apeVerdict, heaven ? 'heaven' : 'punished'); assert.equal(g.storyQueue[0].key, heaven ? 'z2-wukong-open' : 'z2-wukong-open-b');
  drainStories(g);
  const w = g.startZoneEvent('asiaWukong'); assert.ok(w); assert.equal(w.foes[0].who, 'หงอคง'); assert.equal(w.talk, Z2_TEXT.wukong.lines.start);
  w.foes.forEach(f => { f.hp = 99999; f.atk = [999, 999]; }); w.youHp = 1;
  for (let i = 0; i < 12 && !g.battle.over; i++) g.battleAct('atk');
  assert.equal(g.battle.over, 'lose'); g.endBattle(); steady(g);
  assert.deepEqual(drainStories(g), ['z2-wukong-lose']); assert.equal(status(g, 'asiaWukong'), 'pending');
  g = reload(g);
  g.startZoneEvent('asiaWukong'); winFight(g);
  assert.equal(status(g, 'asiaWukong'), 'cleared');
  assert.deepEqual(drainStories(g), ['z2-wukong-win', 'z2-ape-phantom', 'z2-wukong-return']);
  assert.deepEqual(plain(g), ['z2-ape-phantom']); assert.ok(NOTICES['z2-ape-phantom'].text.includes('[PHANTOM-404]'));
  ackAll(g); assert.ok(g.journalNotes.some(n => n.includes('PHANTOM-404 (ครั้งที่ 2)')));
  assert.equal(g.storyCaseOwed(), null); g = reload(g); assert.equal(g.storyCaseOwed(), null);
  assert.equal(g.startZoneEvent('asiaWukong'), null, 'he never comes down twice');
});

test('Wukong half-way line is said once', () => {
  const g = fresh(); passCase3(g); g.zoneCases.asia = 7; g.storyCaseDone.apeelder = true; g.refreshZoneEvents('asia');
  const b = g.startZoneEvent('asiaWukong'); const boss = b.foes[0];
  assert.equal(b.halfLine, Z2_TEXT.wukong.lines.half);
  for (const f of b.foes) f.atk = [0, 0];
  boss.hp = Math.floor(boss.maxHp / 2); b.selectedFoeId = boss.id; g.battleAct('atk');
  assert.equal(g.battle.talk, Z2_TEXT.wukong.lines.half);
});

/** ... on to just after case 7 (Wukong calmed). */
function passCase7(g, heaven = true) {
  passCase3(g);
  for (let n = 4; n <= 6; n++) judgeNext(g);
  judgeNext(g, { heaven }); drainStories(g); ackAll(g);
  g.startZoneEvent('asiaWukong'); winFight(g); drainStories(g); ackAll(g);
  assert.equal(status(g, 'asiaWukong'), 'cleared'); assert.equal(g.zoneCases.asia, 7);
}

test('case 11: 3 waves -> Akura -> the closing fireball -> court with the locked answer -> punished -> back to the cave', () => {
  let g = fresh(); passCase7(g);
  for (let n = 8; n <= 11; n++) { assert.equal(status(g, 'asiaRageBreach'), 'locked', `breach must wait for case 11 (at ${n - 1})`); judgeNext(g); }
  assert.equal(status(g, 'asiaRageBreach'), 'pending'); assert.equal(g.zoneCases.asia, 11);
  assert.equal(ZONE_EVENTS.asia.find(e => e.k === 'asiaRageBreach').alert.th, 'ปีศาจกำลังฝ่าชายแดนบูรพา ให้เดินลงไปตรวจที่ชายแดนด้านล่าง');
  assert.equal(g.breachPending().key, 'asiaRageBreach');
  const b = g.startZoneEvent('asiaRageBreach'); assert.ok(b);
  const subs = [];
  for (let wave = 1; wave <= 3; wave++) {
    assert.equal(g.battle.wave, wave); assert.ok(!g.battle.foes.some(f => f.boss)); subs.push(g.battle.foes[0].sub);
    while (!g.battle.pendingWave) strike(g);
    assert.equal(g.advanceZoneEventWave(), true);
    if (wave === 1) assert.equal(g.battle.talk, Z2_TEXT.breach.afterWave1);
    if (wave === 2) assert.equal(g.battle.talk, Z2_TEXT.breach.afterWave2);
  }
  assert.deepEqual(subs, ['ระลอก 1/3', 'ระลอก 2/3', 'ระลอก 3/3']);
  const boss = g.battle.foes.find(f => f.boss); assert.equal(boss.sp, 'boss-frontier-asia'); assert.equal(boss.who, 'อากุระ'); assert.equal(g.battle.foes.length, 1);
  assert.equal(g.battle.talk, Z2_TEXT.breach.lines.start); assert.equal(g.abilities.bigFire, undefined);
  for (const f of g.battle.foes) f.atk = [0, 0];
  boss.hp = Math.floor(boss.maxHp * 0.25); g.battle.selectedFoeId = boss.id; g.battleAct('atk');
  assert.equal(g.battle.breachFinale, 'ready'); assert.equal(g.battle.finaleMove, 'fire'); assert.equal(g.battle.storyInterlude, 'asia-big-fire-unlock');
  assert.equal(g.abilities.bigFire, true); assert.ok(boss.hp >= 1, 'the boss cannot fall to anything but the story move');
  assert.equal(storyOf('asia-big-fire-unlock').pages[0].title, ABILITY_REWARDS.bigFire.name);
  assert.equal(g.battleAct('atk'), true);     // pressing anything IS the closing move
  assert.equal(g.battle.over, 'win'); const mp = g.mp; assert.equal(g.battle.breachFinale, 'done');
  g.endBattle(); steady(g);
  assert.equal(status(g, 'asiaRageBreach'), 'cleared');
  // the court: Akura is tried in the arena (not on a walk), answer locked = the exercise yard at middle strength
  const c = bossJusticeCase(g); assert.ok(c && c.arena && c.zone === 'asia' && c.phase === 'capture');
  assert.deepEqual(g.storyQueue.map(p => p.key), ['z2-akura-down', ARENA_STORIES.asia.toDais]);
  drainStories(g); assert.deepEqual(plain(g), ['z2-akura-to-dais']); ackAll(g); assert.equal(bossJusticeCase(g).phase, 'dais');
  const ans = bossJusticeAnswer(g); assert.deepEqual([ans.station, ans.intensity], [AKURA_TRIAL.station, 3]); assert.equal(AKURA_TRIAL.station, 'lan');
  assert.ok(interrogateBoss(g)); assert.ok(mirrorBoss(g));
  assert.equal(sentenceBoss(g, { station:'krata', crew:ans.crew, intensity:5 }), false, 'a wrong sentence is refused');
  assert.equal(sentenceBoss(g, { station:'lan', crew:ans.crew, intensity:5 }), false);
  assert.equal(sentenceBoss(g, { station:'lan', crew:ans.crew, intensity:3 }), true);
  assert.equal(bossJusticeCase(g).phase, 'aftermath');
  g = reload(g); assert.equal(bossJusticeCase(g).phase, 'aftermath');
  assert.deepEqual(g.storyQueue.map(p => p.key), [ARENA_STORIES.asia.punished, ARENA_STORIES.asia.released]);
  drainStories(g); assert.deepEqual(plain(g), ['z2-akura-cave']); assert.equal(NOTICES['z2-akura-cave'].text, 'อากุระรับโทษเสร็จแล้วและกลับไปยืนอยู่ในถ้ำริมชายแดน แวะไปคุยกับเขาได้'); ackAll(g);
  assert.equal(bossJusticeCase(g), null); assert.equal(Object.values(g.bossJustice.ledger)[0].phase, 'released');
  assert.equal(storyOf(ARENA_STORIES.asia.released).pages[0].line.includes('เจ้าไม่ได้ล่ามข้า ข้าจำไว้'), true);
  g.refreshZoneEvents('asia'); assert.equal(status(g, 'asiaRageBreach'), 'cleared'); assert.equal(g.abilities.bigFire, true);
});

function passCase11(g) {
  passCase7(g);
  for (let n = 8; n <= 11; n++) judgeNext(g);
  g.startZoneEvent('asiaRageBreach'); winFight(g); drainStories(g);
  const ans = bossJusticeAnswer(g); interrogateBoss(g); mirrorBoss(g); sentenceBoss(g, { station:'lan', crew:ans.crew, intensity:3 }); drainStories(g); ackAll(g);
  assert.equal(bossJusticeCase(g), null);
}

for (const hired of [true, false]) test(`case 13 (Satori ${hired ? 'hired' : 'not hired'}): his father always comes · the clue button is off · farewell`, () => {
  let g = fresh(); passCase11(g);
  if (hired) { assert.ok(g.hire('kan')); } else assert.ok(!g.crew.some(c => c.k === 'kan'));
  assert.equal(g.storyCaseOwed(), null, 'case 12 is still an ordinary case');
  const n12 = judgeNext(g); assert.notEqual(n12.case, 'satorifather'); assert.equal(g.zoneCases.asia, 12);
  assert.equal(g.storyCaseOwed(), 'satorifather'); g = reload(g);
  const father = g.queue.find(s => s.case === 'satorifather'); assert.ok(father); assert.equal(father.sp, 'soul-satori-father-asia'); assert.equal(father.sex, 'm');
  assert.equal(g.queue.filter(s => s.case === 'satorifather').length, 1); assert.deepEqual(plain(g), ['z2-satori-arrive']);
  assert.equal(NOTICES['z2-satori-arrive'].button, 'ฟังซาโตริ');
  // Satori's clue button is closed for this case, with his own words
  if (hired) assert.equal(g.kanClueWhy(father), Z2_TEXT.satori.blocked);
  assert.equal(g.kanRevealClue(father), null);
  ackAll(g); assert.equal(g.storyQueue[0].key, hired ? 'z2-satori-ask' : 'z2-satori-ask-b');
  const ask = storyOf(g.storyQueue[0].key).pages[0].line;
  assert.ok(ask.startsWith(hired ? 'บรรยาย: ซาโตริเดินมาหยุดหน้าโต๊ะของท่าน' : 'บรรยาย: ชายหนุ่มผู้ถือสมุดบันทึกเดินเข้ามาในโถงพิพากษา'));
  drainStories(g);
  const soul = judgeNext(g); assert.equal(soul.case, 'satorifather'); assert.equal(g.zoneCases.asia, 13);
  assert.equal(g.storyQueue[0].key, hired ? 'z2-satori-farewell' : 'z2-satori-farewell-b');
  const last = storyOf(g.storyQueue[0].key).pages.at(-1).line;
  assert.equal(last.includes('ข้ายังอยู่ที่บูรพาครับ'), !hired);
  drainStories(g); assert.equal(g.storyCaseOwed(), null); g = reload(g); assert.equal(g.storyCaseOwed(), null);
  assert.ok(!g.queue.some(s => s.case === 'satorifather'));
});

test('case 15: the zone boss comes at the 15th case only, after 11 and 13 · Lian Gang · then the boss guide takes over', () => {
  let g = fresh(); passCase11(g);
  for (let n = 12; n <= 13; n++) judgeNext(g);
  assert.equal(g.zoneCases.asia, 13); assert.equal(g.bossReady(), false);
  judgeNext(g); assert.equal(g.zoneCases.asia, 14); assert.equal(g.bossReady(), false, 'not at 14');
  g.bossPending = false;
  judgeNext(g); assert.equal(g.zoneCases.asia, 15); assert.equal(g.bossReady(), true); assert.equal(g.bossPending, true);
  assert.equal(NOTICES['z2-lian-arrive'].title, 'แม่ทัพแห่งบูรพามาถึงแล้ว'); assert.equal(NOTICES['z2-lian-arrive'].button, 'ไปที่ท่าเรือ');
  const z = g.zoneDef(); assert.equal(z.bossName, 'เหลียนกัง'); assert.ok(z.bossArrive.length >= 6 && z.bossArrive.some(l => l.includes('ข้าชื่อเหลียนกัง แม่ทัพตรวนบูรพา')));
  g = reload(g); assert.equal(g.bossReady(), true);
  const b = g.startZoneBoss(); assert.ok(b); assert.equal(b.talk, Z2_TEXT.lian.lines.start); assert.equal(b.halfLine, Z2_TEXT.lian.lines.half);
  g.battle.foes.forEach(f => { f.hp = 99999; f.atk = [999, 999]; }); g.battle.youHp = 1;
  for (let i = 0; i < 12 && !g.battle.over; i++) g.battleAct('atk');
  assert.equal(g.battle.over, 'lose'); g.endBattle(); steady(g);
  assert.ok(g.storyQueue.some(p => p.key === 'z2-lian-lose')); drainStories(g);
  assert.equal(g.bossGuarding.asia, true); assert.equal(g.bossCleared.asia, undefined);
  Object.assign(g.player, { x:SPOTS.bossPier.x, y:SPOTS.bossPier.y });
  assert.ok(g.startZoneBoss(true), 'retry from the pier');
  for (const f of g.battle.foes) f.atk = [0, 0];
  for (let i = 0; i < 40 && g.battle && !g.battle.over; i++) strike(g);
  assert.equal(g.battle.over, 'win'); g.endBattle(); steady(g);
  assert.equal(g.bossCleared.asia, true);
  assert.deepEqual(drainStories(g).filter(k => k.startsWith('z2-') || k === 'asia'), ['asia', 'z2-lian-win']);
  assert.equal(bossJusticeCase(g), null, 'a zone boss is never tried');
  assert.equal(g.bossGuideWaiting(), true, 'the existing boss-guide system takes over: he waits at the border gate');
  assert.equal(g.abilities.rage, true);
});

test('the Guard of Zone 2 must be beaten before he is hired (Rae 7.1) - hire button -> test -> win hires him; lose = try again', () => {
  const g = fresh(); g.coin = 9000;
  assert.equal(g.guard, null); assert.equal(g.guardTestNeeded(), true);
  const coin = g.coin;
  assert.equal(g.hireGuard(), false); assert.equal(g.guard, null); assert.equal(g.coin, coin, 'nothing is paid before the test');
  assert.equal(status(g, 'asiaGuardTest'), 'pending');
  const ev = ZONE_EVENTS.asia.find(e => e.k === 'asiaGuardTest'); assert.equal(ev.openStory, 'z2-guard-test-open'); assert.equal(ev.alert.th.startsWith('ก่อนรับท่านเป็นนาย'), true);
  assert.equal(ev.go.th, 'รับมือ'); assert.equal(ev.retry.th, 'ทดสอบอีกครั้ง');
  let b = g.startZoneEvent('asiaGuardTest'); assert.ok(b); assert.equal(b.foes[0].who, 'ยักษ์ทวารบาล');
  b.foes.forEach(f => { f.hp = 99999; f.atk = [999, 999]; }); b.youHp = 1;
  for (let i = 0; i < 12 && !g.battle.over; i++) g.battleAct('atk');
  assert.equal(g.battle.over, 'lose'); g.endBattle(); steady(g);
  assert.equal(g.guard, null, 'losing does not hire him'); assert.equal(status(g, 'asiaGuardTest'), 'pending');
  assert.deepEqual(drainStories(g), ['z2-guard-test-lose']);
  g.startZoneEvent('asiaGuardTest'); winFight(g);
  assert.ok(g.guard, 'winning hires him'); assert.equal(g.coin, coin - GUARD.hire); assert.equal(status(g, 'asiaGuardTest'), 'cleared');
  assert.deepEqual(drainStories(g), ['z2-guard-test-win']);
  assert.equal(reload(g).guard.k, 'guard');
  // a Guard hired before this package (old save) is never asked to fight
  const old = fresh(); old.guard = reload(g).guard; assert.equal(old.guardTestNeeded(), false);
});

test('the crew relatives: unlocked by hiring, put in the queue once, the lines in order, a choice at the end', () => {
  const g = fresh(); g.coin = 99999; g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' }; g.zoneCases.asia = 4;
  assert.ok(g.crew.some(c => c.k === 'taan'), 'Taan is hired from the first day');
  g.zoneEvents.asia.asiaDevaTest = 'pending'; g.ensureKinCases(); assert.deepEqual(g.queue.filter(s => s.kin), [], 'the relatives wait for the end of the zone opening'); g.zoneEvents.asia.asiaDevaTest = 'cleared';
  const expectCase = { chaincmd:'taan', deserter:'guard', fakecup:'plerng', A2:'dam', granarysister:'boon' };
  for (const [k, who] of Object.entries(expectCase)) {
    assert.equal(g.queue.some(s => s.kin === k), false);
    if (who === 'guard') { g.zoneEvents.asia.asiaGuardTest = 'cleared'; assert.ok(g.hireGuard()); } else if (who !== 'taan') assert.ok(g.hire(who), `hire ${who}`);
    g.ensureKinCases(); g.ensureKinCases();
    const soul = g.queue.find(s => s.kin === k); assert.ok(soul, `${k} is in the queue once`); assert.equal(g.queue.filter(s => s.kin === k).length, 1);
    const row = Z2_KIN.find(r => r.k === k); assert.equal(g.notices.includes(`kin-${k}`), true);
    assert.equal(NOTICES[`kin-${k}`].button, row.notice.button); assert.equal(NOTICES[`kin-${k}`].detail, row.before.join('\n'));
    assert.ok(NOTICES[`kin-${k}`].detail.length > 20);
    if (k !== 'A2') assert.equal(soul.sp, Z2_ART && { deserter:'soul-deserter-asia', chaincmd:'soul-commander-asia', fakecup:'soul-cupdealer-asia', granarysister:'soul-granary-sister-asia' }[k]);
    // the relative speaks at the first question, once
    assert.equal(soul.said.some(x => x.kind === 'kin'), false);
    g.press(soul, 0); assert.equal(soul.said.filter(x => x.kind === 'kin').length, row.during.length);
    g.press(soul, 1); assert.equal(soul.said.filter(x => x.kind === 'kin').length, row.during.length, 'only once');
    ackAll(g); g.notices = g.notices.filter(n => n !== `kin-${k}`);
    // the verdict opens the closing window; its two choices are saved
    g.queue.splice(g.queue.indexOf(soul), 1);
    g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === 'krata'), crewK:'taan' }, { soul, intensity:2 }), soul); steady(g);
    assert.ok(g.notices.includes(`kin-after-${k}`)); assert.equal(g.kinDone[k].choice, null);
    assert.equal(row.choices.length, 2); g.kinDone[k].choice = 1; g.ackNotice(`kin-after-${k}`);
    const again = reload(g); assert.equal(again.kinDone[k].choice, 1); again.ensureKinCases();
    assert.equal(again.queue.some(s => s.kin === k), false, 'a relative is never queued twice');
  }
});

test("Akura's cave follow-up (Rae 7.3): only after the chain-commander case is closed with its choice, said once, kept across a reload", () => {
  const g = fresh(); g.coin = 99999; g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' }; g.zoneCases.asia = 4;
  const row = Z2_KIN.find(r => r.k === 'chaincmd'); assert.equal(row.followUp.length, 2);
  assert.equal(g.kinFollowUpLines(), null, 'nothing before the case');
  g.ensureKinCases(); const soul = g.queue.find(s => s.kin === 'chaincmd'); assert.ok(soul);
  assert.equal(g.kinFollowUpLines(), null, 'nothing while the case is open');
  g.queue.splice(g.queue.indexOf(soul), 1);
  g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === 'krata'), crewK:'taan' }, { soul, intensity:2 }), soul); steady(g);
  assert.equal(g.kinFollowUpLines(), null, 'nothing before the closing choice is made');
  g.kinDone.chaincmd.choice = 0; g.ackNotice('kin-after-chaincmd');
  assert.deepEqual(g.kinFollowUpLines(), row.followUp);
  assert.deepEqual(reload(g).kinFollowUpLines(), row.followUp, 'a reload before hearing it keeps it');
  g.kinFollowUpSeen();
  assert.equal(g.kinFollowUpLines(), null, 'said once'); assert.equal(reload(g).kinFollowUpLines(), null, 'and not again after a reload');
  const other = fresh(); other.kinDone.chaincmd = { verdict:'punished', choice:1 }; other.zone = 'th'; assert.equal(other.kinFollowUpLines(), null, 'only in Zone 2');
});

test('fakecup: the relative tells the truth himself - no hypnosis, no karma, once', () => {
  const g = fresh(); g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' }; g.zoneCases.asia = 4; assert.ok(g.hire('plerng')); g.ensureKinCases();
  const soul = g.queue.find(s => s.kin === 'fakecup'); assert.ok(soul.assist);
  const hiddenBefore = soul.deeds.filter(d => !d.known).length; assert.ok(hiddenBefore >= 1); const karma = g.karma, mp = g.mp;
  assert.equal(g.kinAssistWhy(soul), '');
  const out = g.kinAssist(soul); assert.ok(out);
  assert.equal(soul.deeds.filter(d => !d.known).length, hiddenBefore - 1); assert.equal(g.karma, karma); assert.equal(g.mp, mp);
  assert.ok(soul.said.some(x => x.kind === 'truth' && x.text.startsWith('โฮมุระ: "ขอผมดูใต้ก้นถ้วยหน่อยครับ')));
  assert.notEqual(g.kinAssistWhy(soul), ''); assert.equal(g.kinAssist(soul), null);
  assert.equal(reload(g).queue.find(s => s.kin === 'fakecup').assist.used, true);
});

test('A2 (old bandit case): Rae rewrite - the families\' winter help is a real merit, the whole-city sharing is a false one', () => {
  const a2 = [...CASES_ALL].find(c => c.k === 'A2');
  assert.equal(a2.merits.length, 2); assert.deepEqual(a2.merits.map(m => m.fake), [false, true]);
  assert.ok(a2.merits[0].t.startsWith('ช่วยครอบครัวของลูกน้องในแก๊ง'));
  assert.equal(a2.claims.some(c => c.kind === 'boast'), true);
  const g = fresh(); g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' }; g.queue = []; g.casesDone = 2;
  g.usedCases = CASES_ALL.filter(c => c.zone === 'asia' && c.k !== 'A2' && !c.quest).map(c => c.k);   // only A2 is left to be drawn
  for (let i = 0; i < 6 && !g.queue.some(s => s.case === 'A2'); i++) g.spawnSoul();
  const soul = g.queue.find(s => s.case === 'A2'); assert.ok(soul, 'A2 is drawn'); assert.equal(soul.kin, undefined);
  assert.ok(g.hire('dam')); g.ensureKinCases();
  assert.equal(g.queue.filter(s => s.case === 'A2').length, 1, 'the existing A2 soul gets the relative - no second copy'); assert.equal(soul.kin, 'A2');
  assert.equal(soul.kinRepeat, undefined); assert.equal(g.kinRepeatLine('A2'), '', 'still waiting in the queue: nothing to explain');
});

test('A2 judged BEFORE Kuro is hired: the copy that comes for the relative carries the explaining line (temporary text, Rae to replace)', () => {
  const g = fresh(); g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' }; g.queue = []; g.casesDone = 2;
  g.usedCases = CASES_ALL.filter(c => c.zone === 'asia' && c.k !== 'A2' && !c.quest).map(c => c.k);
  for (let i = 0; i < 6 && !g.queue.some(s => s.case === 'A2'); i++) g.spawnSoul();
  const first = g.queue.find(s => s.case === 'A2'); assert.ok(first); g.queue.splice(g.queue.indexOf(first), 1);       // judged and gone
  assert.ok(g.hire('dam')); g.ensureKinCases();
  const copy = g.queue.find(s => s.kin === 'A2'); assert.ok(copy, 'the relative still gets its case'); assert.equal(copy.kinRepeat, true);
  assert.equal(g.kinRepeatLine('A2'), Z2_KIN_REPEAT_LINE); assert.ok(Z2_KIN_REPEAT_LINE.length > 20);
  assert.equal(reload(g).kinRepeatLine('A2'), Z2_KIN_REPEAT_LINE, 'kept across a reload');
  for (const k of ['deserter', 'chaincmd', 'fakecup', 'granarysister']) assert.equal(g.kinRepeatLine(k), '');
});

test('old saves and Zone 1 are untouched', () => {
  // Zone 1: nothing of Zone 2's tables is read
  const th = createGame(); assert.equal(th.storyCaseOwed(), null); assert.deepEqual(storyCaseRows('th').map(r => r.k), ['nurse', 'devaMonk', 'sitaledger']);
  // an old Zone 2 save in the middle of the zone: ape already judged under no rule -> the story catches up in order, never twice
  const g = fresh(); g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared' }; g.zoneCases.asia = 9;
  const loaded = reload(g); assert.equal(loaded.storyCaseOwed(), 'apeelder');
  loaded.queue = []; loaded.ensureDevaCase(); assert.equal(loaded.queue[0].case, 'apeelder');
  // a save whose boss was already beaten never gets the story cases
  const done = fresh(); done.zoneCases.asia = 20; done.bossCleared.asia = true; assert.equal(reload(done).storyCaseOwed(), null);
});

test('an old Zone 2 save with the border breach already pending (old case 6) waits for Wukong and case 11 again', () => {
  const g = fresh(); g.zoneCases.asia = 6; g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'pending' }; g.eventMapClosed['asia:asiaRageBreach'] = true;
  const loaded = reload(g);
  assert.equal(status(loaded, 'asiaRageBreach'), 'locked'); assert.equal(loaded.breachMarch(), null); assert.equal(loaded.startZoneEvent('asiaRageBreach'), null);
  // a save that already cleared it keeps it
  const done = fresh(); done.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'cleared' };
  assert.equal(status(reload(done), 'asiaRageBreach'), 'cleared');
});

test('the clue orb of the court shows Satori\'s own words on the father\'s case (and not on any other)', async () => {
  const { kanOrbHtml } = await import('../src/interrogation-ui.js');
  const g = fresh(); g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaWukong:'cleared', asiaRageBreach:'cleared' }; g.zoneCases.asia = 12; g.storyCaseDone.apeelder = true;
  assert.ok(g.hire('kan')); g.ensureStoryCase();
  const father = g.queue.find(s => s.case === 'satorifather');
  const html = kanOrbHtml(g, father, 'img/x.webp');
  assert.ok(html.includes(Z2_TEXT.satori.blocked.replaceAll('"', '&quot;')) || html.includes(Z2_TEXT.satori.blocked), 'his sentence is on the disabled orb'); assert.ok(html.includes('is-off'));
  assert.ok(html.includes('disabled'));
  g.spawnSoul(); const other = g.queue.find(s => s.case !== 'satorifather');
  assert.ok(!kanOrbHtml(g, other, 'img/x.webp').includes(Z2_TEXT.satori.blocked));
});
