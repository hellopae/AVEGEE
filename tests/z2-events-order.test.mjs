// Z2-EVENTS — the owner's order of Zone 2's story beats (spec 14 Nov 2026, Output/Claudy/briefs/2026-11-14-avegee-z234-events-owner-spec.md · Rae's script Output/Rae/2026-11-14-avegee-z2-events.md).
// One full run, case 0 -> 15, plus old saves and the crew's relatives. The Zone 1 order slipped once: this file is the guard for Zone 2.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame, loadSave } from '../src/game.js';
import { STATIONS, ZONE_EVENTS, ZONE_BOSS_AT, GUARD } from '../src/data.js';
import { bossJusticeCase, bossJusticeAnswer, interrogateBoss, mirrorBoss, sentenceBoss, ARENA_STORIES } from '../src/boss-justice.js';
import { NOTICES, Z1_STORIES, storyCaseRows } from '../src/z1-events.js';
import { Z2_KIN, Z2_STORY_CASES, Z2_STORIES, Z2_TEXT, Z2_ART, AKURA_TRIAL, DEVA_ASIA_ARRIVAL } from '../src/z2-events.js';
import { storyOf, ABILITY_REWARDS } from '../src/story.js';
import { devaMapActors } from '../src/deva-map.js';
import { setLang, t } from '../src/i18n.js';
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
