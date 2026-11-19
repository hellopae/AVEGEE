// T6 - the order of Zone 2's story from case 12 to the western gate, one run (Rae R2 part B 0.1): Guanyin's father (12) -> Satori's father (13) -> the zone boss Lian Gang (15) -> the harbor (gift, Musashi joins)
// -> the water cave (Ryujin; Musashi's strike is a scene inside the fight, not in the story queue) -> the western gate (Cerberus bows) -> Musashi's farewell -> Zone 3 in the Zone 3 robes. Every scene is logged in the order the game plays it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, FRONTIER, syncSceneZone } from '../src/data.js';
import { bossGuideFollowing } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { dungeonPoint } from '../src/dungeon-view.js';
import * as L from '../src/lamp.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
test('Zone 2: case 12 -> 13 -> boss -> harbor -> water cave -> western gate -> Musashi leaves -> Zone 3 (every scene, in order, helpers 4-7 unlocked after their own events)', () => {
  const g = createGame(); g.zone = 'asia'; syncSceneZone('asia'); g.save = () => true; g.onChange = () => {}; g.coin = 20000; g.food = 100; g.courtClosed = true; g.hpMax = g.hp = 500;
  g.stations.push(station('sawan'), station('krata'), station('lan')); g.giveLamp(); g.notices = [];
  const played = []; const complete = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return complete(); };
  const drain = () => { for (let i = 0; i < 40 && g.storyQueue.length; i++) g.completeStory(); };
  const ack = ids => { for (const id of ids) { assert.ok(g.notices.includes(id), `${id} is waiting`); g.ackNotice(id); } };
  const judge = k => { g.ensureStoryCase(); const at = g.queue.findIndex(s => s.case === k); assert.ok(at >= 0, `${k} is in the queue`); const soul = g.queue[at]; g.queue.splice(at, 1);
    g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === 'krata'), crewK:'taan' }, { soul, intensity:1 }), soul); g.hp = g.hpMax; g.reds = 0; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };
  // the first 11 cases and the events before them are tested in z2-events-order; here Zone 2 stands after Akura
  g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaWukong:'cleared', asiaRageBreach:'cleared', asiaGuardTest:'cleared' }; g.zoneCases.asia = 11; g.storyCaseDone.apeelder = true;
  // case 12
  assert.equal(g.storyCaseOwed(), 'guanyinfather'); judge('guanyinfather'); ack(['z2-guanyin-after']); drain(); ack(['z2-guanyin-petal']);
  // case 13
  assert.equal(g.storyCaseOwed(), 'satorifather'); judge('satorifather'); drain(); assert.equal(g.storyCaseOwed(), null);
  // the zone boss (case 15)
  g.zoneCases.asia = 15; const boss = g.startZoneBoss('alert'); assert.ok(boss);
  for (const f of boss.foes) { f.atk = [0, 0]; f.hp = 1; } for (let n = 0; n < 40 && !boss.over; n++) { const f = boss.foes.find(v => v.hp > 0); g.selectFoe(f.id); g.battleAct('atk'); }
  assert.equal(boss.over, 'win'); g.endBattle(); drain();
  assert.ok(g.notices.includes('z2-lian-wait'), 'NL-1'); ack(['z2-lian-wait']); assert.equal(g.bossGuideWaiting(), true);
  // the harbor
  assert.equal(g.inviteBossGuide(), true); drain(); assert.equal(bossGuideFollowing(g), true); g.pendingReward = null; g.notices = [];
  assert.equal(L.ensureMagic(g).unlocked.liangang, true);
  // the walk to Border 2-3
  g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; assert.equal(g.beginBorderDungeon('west'), true);
  assert.equal(g.cerberusFightDue(), true); assert.equal(g.ryujinFightDue(1), true);
  const fight = (start, key) => { const b = start(); assert.ok(b, key); for (const f of b.foes) f.atk = [0, 0];
    for (let n = 0; n < 60 && !b.over; n++) { if (b.breachFinale === 'ready') { b.storyInterlude = null; g.battleAct('atk'); continue; }
      const f = b.foes.find(v => v.hp > 0); f.hp = Math.min(f.hp, Math.floor(f.maxHp * .25) + 1); g.selectFoe(f.id); g.battleAct('atk'); }
    assert.equal(b.over, 'win', key); g.endBattle(); return b; };
  g.queueNotice('z2-ryujin-cave'); g.ackNotice('z2-ryujin-cave'); fight(() => g.startRyujinFight(), 'ryujin'); drain(); ack(['lamp-helper-ryujin']);
  assert.equal(L.ensureMagic(g).unlocked.ryujin, true);
  g.queueNotice('z3gate-cerberus-gate'); g.ackNotice('z3gate-cerberus-gate'); fight(() => g.startCerberusFight(), 'cerberus'); drain(); ack(['z3gate-cerberus-won']);
  assert.equal(bossGuideFollowing(g), true, 'Musashi is still beside Yama at the gate');
  // Musashi's farewell, then Zone 3
  assert.equal(g.farewellBossGuide(), true); drain(); ack(['lamp-helper-musashi']);
  assert.equal(bossGuideFollowing(g), false); assert.equal(L.ensureMagic(g).unlocked.musashi, true);
  const a = g.zoneTravel.active, r = dungeonStatus(g).route; a.checkpoint = r.checkpoints.length; a.cleared = r.checkpoints.map(c => c.id); const e = dungeonPoint(1, r.id); a.position = { x:e[0], y:e[1] };
  assert.equal(g.moveZone('west'), true); assert.equal(g.zone, 'west'); assert.equal(g.outfit, 'west');
  const order = ['z2-guanyin-thanks-', 'z2-satori-', 'z2-lian-win', 'boss-guide-asia-welcome', 'z2-ryujin-open', 'z2-ryujin-win', 'z3gate-cerberus-open', 'z3gate-cerberus-win', 'boss-guide-asia-farewell'];
  let at = -1; for (const prefix of order) { const i = played.findIndex((k, n) => n > at && k?.startsWith(prefix)); assert.ok(i > at, `${prefix} plays after the one before it (played: ${played.join(' > ')})`); at = i; }
  assert.deepEqual(['hanuman', 'liangang', 'ryujin', 'musashi'].filter(k => L.ensureMagic(g).unlocked[k]), ['hanuman', 'liangang', 'ryujin', 'musashi']);
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(copy.zone, 'west'); assert.equal(copy.cerberusGuarding(), true); assert.equal(copy.ryujinDone(), true);
});
