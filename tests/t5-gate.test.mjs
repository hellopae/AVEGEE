// T5'/4-5 - the gate of Zone 2: Guan Yu fights, becomes Zone 2's Guard; Yomathat's gift, he leaves the team and leaves a flame (Rae R2 A sections 7-8).
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { createGame } from '../src/game.js';
import { FRONTIER, ZONE_EVENTS, guardName, guardTitle } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { NOTICES } from '../src/z1-events.js';
import { GATE, GATE_TEXT, ART } from '../src/z2-gate.js';
import { BOSS_SKILLS } from '../src/boss-skills-data.js';
import { BOSS_GUIDE_GRANTS, bossGuideFollowing } from '../src/boss-guides.js';
import * as L from '../src/lamp.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { dungeonPoint } from '../src/dungeon-view.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { for (let i = 0; i < 14 && g.storyQueue.length; i++) g.completeStory(); };
/** Yama + Yomathat on the border walk, at its end */
function atTheGate() {
  const g = createGame(); g.save = () => true; g.onChange = () => {};
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', sitaHanuman:'cleared', khunPhaen:'cleared', thBorderBoss:'cleared' }; g.bossCleared.th = true; g.zoneCases.th = 15;
  g.queueStory('boss-guide-th-praise'); drain(g); g.inviteBossGuide(); drain(g); g.notices = []; g.giveLamp(); g.notices = [];
  g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; assert.equal(g.beginBorderDungeon('asia'), true);
  return g;
}
const finishRoute = g => { const a = g.zoneTravel.active, r = dungeonStatus(g).route; a.checkpoint = r.checkpoints.length; a.cleared = r.checkpoints.map(c => c.id); const e = dungeonPoint(1, r.id); a.position = { x:e[0], y:e[1] }; };
const win = g => { const b = g.battle; for (const f of b.foes) f.atk = [0, 0]; for (let i = 0; i < 40 && !b.over; i++) { const f = b.foes.find(f => f.hp > 0); f.hp = 1; b.selectedFoeId = f.id; g.battleAct('atk'); } assert.equal(b.over, 'win'); g.endBattle(); };

test('the gate fight is due only with Yomathat in the team on the border walk; Rae\'s windows, scenes and moves', () => {
  const g = atTheGate(); assert.equal(g.gateFightDue(), true);
  const plain = createGame(); assert.equal(plain.gateFightDue(), false);
  assert.equal(NOTICES[GATE.arriveNotice].button, 'เข้าไปพบ'); assert.equal(NOTICES[GATE.arriveNotice].en.title, 'The Keeper of the Eastern Gate');
  assert.equal(storyOf('z2-guanyu-open').pages.length, 3); assert.match(storyOf('z2-guanyu-open').pages[1].line, /ประตูเมืองไม่เคยถูกบุกจากข้างนอก/);
  assert.equal(storyOf('z2-guanyu-win').pages.length, 2); assert.equal(storyOf('z2-guanyu-lose').pages.length, 1);
  assert.deepEqual(BOSS_SKILLS.guanyu.map(m => [m.id, m.kind, m.name.th]), [['greenDragonSweep', 'groupHit', 'ง้าวมังกรเขียวกวาดลาน'], ['oneCutNoRetreat', 'heavyHit', 'ฟันเดียวไม่ถอย']]);
  assert.equal(guardName('asia'), 'กวนอู'); assert.equal(guardTitle('asia'), 'ผู้เฝ้าด่านบูรพา'); assert.equal(guardName('west'), 'แวน เฮลซิง', 'T7/2: Zone 3 has Van Helsing'); assert.equal(guardName('cyberhell'), 'WATSON-03', 'T8b/2: Zone 4 has WATSON-03');
  const row = ZONE_EVENTS.th.find(e => e.k === GATE.eventKey); assert.ok(row.gate); assert.equal(row.atCases, 999); assert.equal(row.foe.sp, 'boss-guanyu-asia');
});

test('the fight: Yama + Nira + Yomathat; a lost fight sends Yama to rest and can be tried again; a win opens the gate and queues his win scene', () => {
  let g = atTheGate(); g.ackNotice?.(GATE.arriveNotice); g.queueNotice(GATE.arriveNotice); g.ackNotice(GATE.arriveNotice); assert.equal(g.storyQueue.at(-1).key, 'z2-guanyu-open'); drain(g);
  let b = g.startGateFight(); assert.ok(b); assert.equal(b.expeditionParty, true); assert.equal(b.talk, GATE_TEXT.lines.start); assert.ok(g.battleActors().some(a => a.guestGuide), 'Yomathat fights beside them');
  b.youHp = 1; for (const f of b.foes) { f.atk = [999, 999]; f.hp = f.maxHp = 9999; }
  for (let i = 0; i < 60 && !b.over; i++) { if (!g.runEnemyTurn()) g.battleAct('atk', { actorId:b.actorId || 'you', recipientId:'you' }); }
  assert.equal(b.over, 'lose'); assert.ok(g.storyQueue.some(s => s.key === 'z2-guanyu-lose')); g.endBattle(); g.completeTeaRecovery(); drain(g);
  assert.equal(g.zoneEventStatus(GATE.eventKey), 'pending'); assert.ok(!g.guanyuEarned);
  g.hp = g.hpMax; b = g.startGateFight(); assert.ok(b); win(g);
  assert.equal(g.guanyuEarned, true); assert.equal(g.zoneEventStatus(GATE.eventKey), 'cleared'); assert.ok(g.storyQueue.some(s => s.key === 'z2-guanyu-win'));
  drain(g); assert.equal(g.gateFightDue(), false, 'once');
  const copy = createGame(); copy.restore(JSON.parse(JSON.stringify(g.snapshot()))); assert.equal(copy.guanyuEarned, true);
});

test('Yomathat\'s gift: the scene (his farewell), 800 coins + the Zone 2 robes, NY-3 / NY-4, he leaves the team and the lamp holds his flame', () => {
  const g = atTheGate(); g.guanyuEarned = true; const coin = g.coin;
  assert.equal(BOSS_GUIDE_GRANTS.th, 800); assert.equal(GATE_TEXT.win.en.title, 'Guan Yu Accepts You');
  assert.equal(storyOf('boss-guide-th-farewell').pages.length, 3); assert.match(storyOf('boss-guide-th-farewell').pages[0].line, /เงินแปดร้อยเบี้ย/); assert.equal(storyOf('z2-yomathat-gift').pages.length, 3);
  assert.equal(g.farewellBossGuide(), true); drain(g);
  assert.equal(g.coin, coin + 800); assert.ok(g.outfitsOwned.includes('asia')); assert.equal(bossGuideFollowing(g), false);
  assert.ok(g.notices.includes(GATE.flameNotice)); assert.equal(g.pendingReward?.guideZone, 'th'); assert.equal(g.pendingReward.title, 'ของฝากจากพี่ชาย'); assert.match(g.pendingReward.who, /ชุดประจำบูรพาและเงิน 800 เบี้ยกรรม/);   // NY-3 = the receipt window
  assert.equal(L.ensureMagic(g).unlocked.yomathat, true); assert.equal(NOTICES['lamp-helper-yomathat'].art, L.SUMMONERS.yomathat.art.icon);
  assert.equal(NOTICES[GATE.flameNotice].openLamp, true);
});

test('Yomathat as a helper: one heavy hit on the chosen foe, the whole team takes less damage until its next turn, 1 of 3 uses', () => {
  const g = atTheGate(); L.unlockSummoner(g, 'yomathat'); L.ensureMagic(g).lamp.level = 2; g.placeHelper(1, 'yomathat');
  g.zoneEvents.th.prisonBreak = 'pending'; const b = g.startPrisonBreak(); assert.ok(b);
  for (const f of b.foes) { f.atk = [0, 0]; f.hp = f.maxHp = 9999; }
  const target = b.foes[1]; b.selectedFoeId = target.id; const before = b.foes.map(f => f.hp), dmg = L.summonDamage(g, 'yomathat'); assert.ok(dmg > L.summonDamage(g, 'hanuman'));
  assert.equal(g.confirmBattleCommand('summon:yomathat', 'you'), true);
  assert.equal(target.hp, before[1] - dmg); assert.equal(b.foes[0].hp, before[0], 'single target'); assert.ok(Object.values(b.defending).some(Boolean), 'the team stands behind him (the "defend" flag; Yama\'s own is cleared when his next turn begins)');
  assert.equal(b.summon.move, 'ดาบเพลิงคุ้มน้อง'); assert.equal(b.summon.left, 2);
});

test('Zone 2 gets Guan Yu as its Guard on the first arrival (no hire, no proving fight, NG-4); without the gate he is not given', () => {
  const g = atTheGate(); g.guanyuEarned = true; g.farewellBossGuide(); drain(g); g.notices = [];
  finishRoute(g);
  assert.equal(g.moveZone('asia'), true); assert.equal(g.zone, 'asia');
  assert.ok(g.guard, 'a Guard stands at the gate'); assert.equal(g.guardTestNeeded(), false); assert.ok(g.notices.includes(GATE.guardNotice));
  assert.match(NOTICES[GATE.guardNotice].text, /1 นาที/);
  const h = atTheGate(); h.farewellBossGuide(); drain(h); finishRoute(h); assert.equal(h.moveZone('asia'), true); assert.equal(h.guard, null); assert.equal(h.guardTestNeeded(), true, 'the old proving fight stays only as the fallback of a save that skipped the gate');
});

test('pictures are .webp files that exist (placeholders until Codex draws them)', () => {
  for (const f of [...Object.values(ART), ...Object.values(L.SUMMONERS.yomathat.art)]) { assert.ok(f.endsWith('.webp'), f); assert.ok(existsSync(new URL('../' + f, import.meta.url)), f); }
});
