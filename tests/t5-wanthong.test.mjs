// T5'/1 - case 13: Lady Wanthong -> Khun Phaen -> Kuman Thong (Rae R2 A section 4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES, TH_STORY_CASES } from '../src/z1-events.js';
import { WANTHONG_CASE, WANTHONG_STORIES, WANTHONG_TEXT, ART } from '../src/z1-wanthong.js';
import { BOSS_SKILLS } from '../src/boss-skills-data.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:'taan', intensity:3, fire:0, build:0, slots:[] });
/** a game at the 13th case: Sita's event cleared, the lamp owned, Wanthong at the head of the queue */
function atCase13() {
  const g = createGame(); g.stations.push(station('sawan'), station('krata')); g.coin = 5000; g.hp = g.hpMax;
  g.zoneCases.th = 12; g.storyCaseDone.sitaledger = true;
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', sitaHanuman:'cleared' };
  g.giveLamp(); g.notices = []; g.storyQueue = [];
  g.ensureStoryCase(); assert.equal(g.queue[0].case, 'wanthong'); return g;
}
const judge = (g, stationK) => { const soul = g.queue.shift(); g.applyVerdict(g.judge(station(stationK), { soul, intensity:1 }), soul); g.reds = 0; g.pendingWarn = null; return soul; };
const drain = g => { for (let i = 0; i < 10 && g.storyQueue.length; i++) g.completeStory(); };

test('the case: Rae\'s text, a twist case (one false merit, one deny), her own picture, never drawn by chance', () => {
  assert.equal(WANTHONG_CASE.kind, 'twist'); assert.equal(WANTHONG_CASE.merits.filter(m => m.fake).length, 1); assert.equal(WANTHONG_CASE.claims.filter(c => c.kind === 'deny').length, 1);
  assert.equal(WANTHONG_CASE.sex, 'f'); assert.ok(WANTHONG_CASE.story);
  assert.deepEqual(TH_STORY_CASES.at(-1).k, 'wanthong'); assert.equal(TH_STORY_CASES.at(-1).after + 1, 13);
  assert.ok(NOTICES['z1-wanthong-arrive'].en.button); assert.equal(NOTICES['z1-wanthong-arrive'].button, 'เริ่มไต่สวน');
  const g = atCase13(); assert.equal(g.queue[0].sp, 'soul-wanthong-th'); assert.deepEqual(g.notices, ['z1-wanthong-arrive']);
  for (let i = 0; i < 30; i++) g.spawnSoul(); assert.equal(g.queue.filter(s => s.case === 'wanthong').length, 1, 'once');
});

test('punish path (any station): the scene "open-punish" with Rae\'s variables, the fight is pending, the elder brother still waits', () => {
  const g = atCase13(); judge(g, 'krata');
  assert.equal(g.wanthongPath, 'punish'); assert.equal(g.storyQueue[0].key, 'z1-khunphaen-open-punish'); assert.equal(g.zoneEventStatus('khunPhaen'), 'pending');
  const s = storyOf('z1-khunphaen-open-punish');
  assert.equal(s.pages.length, 2); assert.match(s.pages[0].line, /ตราหมายกดลงบนกระดาษ/); assert.match(s.pages[0].line, /ผู้ถือบัญชีที่จะลงโทษนางวันทอง ต้องผ่านข้าก่อน/);
  assert.match(s.pages[1].line, /ผมออกหมายตามระดับที่บัญชีและคำให้การรองรับครับ/); assert.match(s.pages[0].line, /ผ้าประเจียดสีเหลืองซีดพันต้นแขน/); assert.match(s.pages[0].line, /ม้าสีหมอก/);
  assert.equal(g.zoneEventStatus('thBorderBoss'), 'locked');
});

test('free path (gate of heaven): the other version of the scene, and Wanthong asks for the lightest note', () => {
  const g = atCase13(); judge(g, 'sawan');
  assert.equal(g.wanthongPath, 'free'); assert.equal(g.storyQueue[0].key, 'z1-khunphaen-open-free'); assert.equal(g.zoneEventStatus('khunPhaen'), 'pending');
  assert.match(storyOf('z1-khunphaen-open-free').pages[0].line, /ยมบาทน้อยเพิ่งวางปากกา/); assert.match(storyOf('z1-khunphaen-open-free').pages[1].line, /ผมไม่ได้ลงโทษนางครับ/);
  assert.match(storyOf('z1-khunphaen-win-free').pages[1].line, /บันทึกโทษเบาที่สุด/); assert.match(storyOf('z1-khunphaen-win-punish').pages[1].line, /ตามผู้คุมไป/);
  assert.equal(storyOf('z1-khunphaen-win-free').pages.length, 3);
});

test('the fight: boss moves from Rae (horse charge = group hit, sword = single heavy), lose scene + retry, win -> win scene -> Kuman Thong unlocked once', () => {
  const g = atCase13(); judge(g, 'krata'); drain(g);
  const ev = ZONE_EVENTS.th.find(e => e.k === 'khunPhaen'); assert.equal(ev.atCases, 13); assert.equal(ev.foe.skills, BOSS_SKILLS.khunphaen);
  assert.deepEqual(BOSS_SKILLS.khunphaen.map(m => [m.id, m.kind]), [['simoCharge', 'groupHit'], ['faFuenSlash', 'heavyHit']]);
  assert.equal(BOSS_SKILLS.khunphaen[0].name.th, 'ม้าสีหมอกควบทะลวง');
  let b = g.startZoneEvent('khunPhaen'); assert.equal(b.talk, WANTHONG_TEXT.lines.start);
  // lose: the one-line scene, the event stays fightable
  b.youHp = 1; for (const f of b.foes) { f.atk = [999, 999]; f.hp = f.maxHp = 9999; }
  for (let i = 0; i < 60 && !b.over; i++) { if (!g.runEnemyTurn()) g.battleAct('atk', { actorId:b.actorId || 'you', recipientId:'you' }); }
  assert.equal(b.over, 'lose'); assert.ok(g.storyQueue.some(s => s.key === 'z1-khunphaen-lose')); g.endBattle(); g.completeTeaRecovery(); drain(g);
  assert.equal(g.zoneEventStatus('khunPhaen'), 'pending');
  // win
  b = g.startZoneEvent('khunPhaen'); for (const f of b.foes) f.atk = [0, 0];
  for (let i = 0; i < 40 && !b.over; i++) { const f = b.foes.find(f => f.hp > 0); f.hp = 1; b.selectedFoeId = f.id; g.battleAct('atk'); }
  assert.equal(b.over, 'win'); g.endBattle();
  assert.equal(g.zoneEventStatus('khunPhaen'), 'cleared'); assert.equal(g.storyQueue.at(-1).key, 'z1-khunphaen-win-punish');
  assert.equal(L.ensureMagic(g).unlocked.kumanthong, undefined); drain(g);
  assert.equal(L.ensureMagic(g).unlocked.kumanthong, true); assert.ok(g.notices.includes('lamp-helper-kumanthong'));
  assert.equal(g.unlockHelper('kumanthong'), false, 'once');
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(copy.wanthongPath, 'punish'); assert.equal(copy.zoneEventStatus('khunPhaen'), 'cleared');
});

test('Kuman Thong (Golden Aegis): a team shield + small heal, the fallen helped up, no damage, one of 3 uses; placed in a slot it can be called', () => {
  assert.match(L.SUMMONERS.kumanthong.say.call.th, /กุมารทอง: "ยามา/);
  assert.match(L.SUMMONERS.kumanthong.say.call.en, /Kuman Thong: "Yama/);
  const g = atCase13(); judge(g, 'krata'); drain(g); g.ensureMagic?.(); L.unlockSummoner(g, 'kumanthong'); L.ensureMagic(g).lamp.level = 2; g.placeHelper(1, 'kumanthong');
  assert.equal(L.summonWhy(g, 'kumanthong', { kind:'zoneEvent', over:null }), '');
  g.hire('taan'); g.zoneEvents.th.prisonBreak = 'pending'; g.battle = null;
  const b = g.startZoneEvent('khunPhaen'); for (const f of b.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 9999; }
  b.youHp = 40; const hpFoe = b.foes[0].hp;
  assert.equal(g.confirmBattleCommand('summon:kumanthong', 'you'), true);
  assert.equal(b.foes[0].hp, hpFoe, 'no damage'); assert.ok(b.youHp > 40, 'small heal'); assert.ok(b.protection.you.shield > 0, 'a shield on Yama');
  assert.equal(b.summon.key, 'kumanthong'); assert.equal(b.summon.move, 'แสงทองคุ้มกาย'); assert.equal(b.summon.left, 2);
  assert.equal(L.summonGuard(g, 'kumanthong').raise, 25);
});

test('every picture the case names exists as a .webp (placeholders until Codex draws them)', () => {
  for (const f of [...Object.values(ART), 'img/summon/kuman-thong.webp', ...Object.values(L.SUMMONERS.kumanthong.art)]) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
  for (const k of Object.keys(WANTHONG_STORIES)) assert.ok(storyOf(k), k);
});
