// Z1-EVENTS — the owner's order of Zone 1's story beats (spec 13 Nov 2026, Output/Claudy/briefs/2026-11-13-avegee-z1-events-owner-spec.md).
// One full run, case 0 -> 15, plus old saves. The owner had this order fixed once and it slipped back: this file is the guard.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS, GUARD, FRONTIER } from '../src/data.js';
import { bossJusticeCase, bossJusticeAnswer, interrogateBoss, mirrorBoss, sentenceBoss, bossJusticeActors, ARENA_STORY } from '../src/boss-justice.js';
import { SITA, NOTICES, TH_STORY_CASES, Z1_STORIES, BREACH_FINALE_AT } from '../src/z1-events.js';
import { storyOf, ABILITY_REWARDS } from '../src/story.js';
import { COMBAT_SKILLS } from '../src/combat-skills.js';
import { waitingEvents } from '../src/npc-stand.js';
import { dungeonEnemyPositions } from '../src/dungeon-view.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };

const station = k => ({ def:STATIONS.find(d => d.k === k), crewK:null, intensity:3, fire:0, build:0, slots:[] });
const fresh = () => { const g = createGame(); g.stations.push(station('sawan'), station('krata')); return g; };
const reload = g => { const loaded = createGame(); loaded.restore(JSON.parse(JSON.stringify(g.snapshot()))); return loaded; };
const steady = g => { g.hp = g.hpMax; g.reds = 0; g.dadFight = false; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };
const status = (g, k) => g.zoneEventStatus(k);
/** Judge the soul at the head of the queue (a story case when one is due, else any soul). */
function judgeNext(g) {
  g.ensureStoryCase();
  const owed = g.storyCaseOwed();
  if (!g.queue.length) g.spawnSoul();
  const soul = g.queue[0];
  if (owed) assert.equal(soul.case, owed, `case ${g.zoneCases.th + 1} must be the story case ${owed}`);
  assert.notEqual(soul.case, SITA.caseKey, 'Sita is heard, never judged');
  g.queue.shift();
  const st = { def:STATIONS.find(d => d.k === (soul.pure ? 'sawan' : 'krata')), crewK:'taan' };
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
  for (let i = 0; i < 40 && g.battle && !g.battle.over; i++) {
    if (g.battle.pendingWave) { assert.ok(g.battle.kind === 'frontierBreach' ? g.advanceFrontierBreachWave() : g.advanceZoneEventWave()); continue; }
    strike(g);
  }
  assert.equal(g.battle?.over, 'win'); g.endBattle(); steady(g);
}
const drainStories = g => { const seen = []; for (let i = 0; i < 20 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
const soulAnywhere = (g, k) => g.queue.some(s => s.case === k) || g.stations.some(st => st.slots.some(x => x.soul.case === k)) ||
  g.sentences.some(x => x.soul.case === k) || g.afterlifeWalks.some(w => w.soul.case === k) || g.transits.some(v => v.case === k);

test('the table itself: case 3 / 5 / 6 / 9 / 12 / 15', () => {
  const at = k => ZONE_EVENTS.th.find(e => e.k === k).atCases;
  assert.deepEqual([at('prisonBreak'), at('devaTest'), at('frontierBreach'), at('sitaHanuman'), at('thBorderBoss')], [3, 6, 9, 12, 15]);
  assert.deepEqual(TH_STORY_CASES.map(c => [c.k, c.after + 1]), [['nurse', 5], ['devaMonk', 6], ['sitaledger', 12]]);
  assert.deepEqual(ZONE_EVENTS.th.slice(0, 3).map(e => e.k), ['prisonBreak', 'frontierBreach', 'devaTest']);   // game.js reads these three by index
  assert.equal(ZONE_EVENTS.th.find(e => e.k === 'frontierBreach').waves.length, 4);                              // 3 demon waves + the border boss
  assert.deepEqual(ZONE_EVENTS.th.find(e => e.k === 'frontierBreach').waves.map(w => w.some(f => f.boss)), [false, false, false, true]);
  assert.equal(COMBAT_SKILLS.teamJudgment.name, 'บัญชาการประสานยมทูตพิพากษา');                                     // the owner's name for the move
  assert.equal(ABILITY_REWARDS.teamJudgment.name, 'บัญชาการประสานยมทูตพิพากษา');
});

test('full run: case 0 -> 15 in the owner\'s order, nothing early, nothing twice', () => {
  let g = fresh(); g.coin = 5000;
  // ---- cases 1-3 -> prison break (case 3)
  for (let n = 1; n <= 3; n++) {
    assert.equal(status(g, 'prisonBreak'), 'locked', `prison break must wait for case 3 (at ${n - 1})`);
    judgeNext(g);
  }
  assert.equal(g.zoneCases.th, 3); assert.equal(status(g, 'prisonBreak'), 'pending');
  assert.equal(ZONE_EVENTS.th[0].foes[0].count, 3);
  assert.equal(g.startPrisonBreak().foes.length, 3); winFight(g);
  assert.equal(status(g, 'prisonBreak'), 'cleared');
  // The Guard cannot be hired in Zone 1 before the frontier event (owner e2 / e3) -> team = Yama + 2
  assert.equal(g.hireGuard(), false); assert.equal(g.guard, null); assert.equal(g.partyCap(), 3); assert.equal(g.partyMax(), 2);
  // ---- case 4, then case 5 = ER nurse (existing case)
  for (let i = 0; i < 12; i++) g.spawnSoul();
  assert.ok(!g.queue.some(s => TH_STORY_CASES.some(c => c.k === s.case)), 'story cases never come by chance before their turn');
  g.queue = [];
  judgeNext(g); assert.equal(g.zoneCases.th, 4);
  assert.equal(g.storyCaseOwed(), 'nurse');
  const nurse = judgeNext(g); assert.equal(nurse.case, 'nurse'); assert.equal(g.zoneCases.th, 5);
  assert.deepEqual(g.notices, ['nurse-ledger']);
  assert.equal(NOTICES['nurse-ledger'].text, 'ลายมือในแฟ้มต้นทางที่สลับเลขเป็นของเพื่อนร่วมโต๊ะเดิมของนิรา');
  g.ackNotice('nurse-ledger'); assert.deepEqual(g.notices, []);
  assert.equal(status(g, 'devaTest'), 'locked');
  // ---- case 6 = temple beggar -> deva-intro-th-beggar-v2 -> fight -> mirror
  g = reload(g);
  assert.equal(g.storyCaseOwed(), 'devaMonk'); assert.equal(g.queue[0].case, 'devaMonk');
  assert.equal(g.queue.filter(s => s.case === 'devaMonk').length, 1);
  const beggar = judgeNext(g); assert.equal(beggar.case, 'devaMonk'); assert.equal(g.zoneCases.th, 6);
  assert.equal(g.storyQueue[0].key, 'deva-th-praise');
  assert.equal(storyOf('deva-th-praise').pages[0].image, 'img/deva-intro/deva-intro-th-beggar-v2.webp');
  assert.equal(soulAnywhere(g, 'devaMonk'), false, 'e1: once judged the beggar IS the deva - no beggar soul is left standing');
  g = reload(g); assert.equal(soulAnywhere(g, 'devaMonk'), false);
  g.completeStory(); assert.equal(g.battle.kind, 'devaTest');
  assert.equal(g.battleActors().some(a => a.k === 'guard'), false, 'e3: no green giant in the deva fight');
  assert.equal(g.inventory.mirror || 0, 0);
  winFight(g); assert.equal(g.inventory.mirror, 1); assert.equal(status(g, 'devaTest'), 'cleared');
  g = reload(g);
  assert.equal(g.storyCaseOwed(), null); assert.equal(soulAnywhere(g, 'devaMonk'), false); assert.equal(g.startDevaTest(), null);
  for (let i = 0; i < 12; i++) g.spawnSoul();
  assert.ok(!g.queue.some(s => s.case === 'devaMonk'), 'e1: the beggar never comes back'); g.queue = [];
  // ---- cases 7-9 -> frontier breach (case 9)
  for (let n = 7; n <= 9; n++) { assert.equal(status(g, 'frontierBreach'), 'locked', `breach must wait for case 9 (at ${n - 1})`); judgeNext(g); }
  assert.equal(status(g, 'frontierBreach'), 'pending'); assert.equal(g.hireGuard(), false);
  g.dismissEventAlert('frontierBreach'); assert.equal(g.breachMarch().key, 'frontierBreach');
  assert.equal(g.breachPending().key, 'frontierBreach');
  const b = g.startFrontierBreach(); assert.ok(b);
  assert.equal(b.team.length <= 2, true);
  assert.ok(g.battleActors().some(a => a.k === 'guard'), 'the gate keeper steps out to help in this fight');
  assert.equal(!!g.abilities.teamJudgment, false);
  const subs = [];
  for (let wave = 1; wave <= 3; wave++) {
    assert.equal(g.battle.wave, wave); assert.ok(!g.battle.foes.some(f => f.boss)); subs.push(g.battle.foes[0].sub);
    while (!g.battle.pendingWave) strike(g);
    assert.equal(g.advanceFrontierBreachWave(), true);
  }
  assert.deepEqual(subs, ['ระลอก 1/3', 'ระลอก 2/3', 'ระลอก 3/3']);
  const boss = g.battle.foes.find(f => f.boss); assert.equal(boss.sp, 'boss-frontier-th'); assert.equal(g.battle.foes.length, 1);
  // the new move unlocks in the middle of the boss fight and is the move that ends it
  for (const f of g.battle.foes) f.atk = [0, 0];
  boss.hp = Math.floor(boss.maxHp * BREACH_FINALE_AT) + 1; g.battle.selectedFoeId = boss.id;
  assert.equal(g.battleAct('atk'), true);
  assert.equal(g.battle.over, null); assert.ok(boss.hp >= 1);
  assert.equal(g.battle.breachFinale, 'ready'); assert.equal(g.battle.storyInterlude, 'th-team-judgment-unlock');
  assert.equal(g.abilities.teamJudgment, true);
  assert.equal(storyOf('th-team-judgment-unlock').title, 'ยามาได้ท่าไม้ตายใหม่');
  assert.equal(g.runEnemyTurn(), false, 'foes wait for the closing move');
  assert.equal(g.completeBattleInterlude(), true);
  g.mp = 0;                                                       // the closing move is free
  assert.equal(g.breachFinaleStrike(), true); assert.equal(g.battle.over, 'win'); assert.equal(g.battle.breachFinale, 'done');
  assert.ok(g.battle.comboHits.length >= 1); assert.equal(g.battle.talk.includes('บัญชาการประสานยมทูตพิพากษา') || g.battle.over === 'win', true);
  g.finishBattleCommand(); g.endBattle(); steady(g);
  assert.equal(status(g, 'frontierBreach'), 'cleared');
  assert.ok(g.guard && !g.guard.breachGuest); assert.equal(g.partyCap(), 4); assert.equal(g.partyMax(), 2);   // Yama + 2 + Guard = 4
  // ---- after the win: cutscene to the dais -> trial arena (locked answer) -> cutscene punished -> cutscene released -> he stands in the cave
  let c = bossJusticeCase(g); assert.ok(c?.arena); assert.equal(c.phase, 'capture');
  assert.ok(g.storyQueue.some(p => p.key === ARENA_STORY.toDais));
  g = reload(g); c = bossJusticeCase(g); assert.equal(c.phase, 'capture');
  drainStories(g); assert.equal(c.phase, 'dais');
  assert.deepEqual(bossJusticeActors(g).map(a => a.id).includes('justice-keeper'), false);
  const answer = bossJusticeAnswer(g);
  assert.equal(interrogateBoss(g), true);
  assert.equal(sentenceBoss(g, answer), false, 'the answer is locked until the mirror shows it');
  assert.equal(mirrorBoss(g), true);
  assert.equal(sentenceBoss(g, { ...answer, intensity:1 }), false);
  assert.equal(sentenceBoss(g, answer), true);
  assert.equal(c.phase, 'aftermath'); assert.deepEqual(bossJusticeActors(g), [], 'no escort walk on the map (owner e7)');
  assert.deepEqual(g.storyQueue.map(p => p.key).filter(k => Object.values(ARENA_STORY).includes(k)), [ARENA_STORY.punished, ARENA_STORY.released]);
  g = reload(g); assert.equal(bossJusticeCase(g).phase, 'aftermath');
  drainStories(g);
  assert.equal(g.bossJustice.active, null); assert.equal(Object.values(g.bossJustice.ledger)[0].phase, 'released');
  assert.equal(g.challengeUnlocked(), true);
  for (const key of Object.values(ARENA_STORY)) assert.ok(g.storySeen[key]);
  // ---- cases 10-11: the elder brother must NOT come at case 10 any more
  judgeNext(g); assert.equal(g.zoneCases.th, 10);
  assert.equal(status(g, 'thBorderBoss'), 'locked', 'old order (boss at case 10) must not return');
  assert.equal(g.storyCaseOwed(), null);
  judgeNext(g); assert.equal(g.zoneCases.th, 11);
  // ---- case 12 = Sita
  assert.equal(g.storyCaseOwed(), 'sitaledger'); assert.equal(g.queue[0].case, 'sitaledger'); assert.equal(g.queue[0].sp, 'soul-sita-th');
  assert.deepEqual(g.notices, ['sita-arrive']); g.ackNotice('sita-arrive');
  g = reload(g); assert.equal(g.queue[0].case, 'sitaledger'); assert.equal(g.queue[0].sp, 'soul-sita-th'); assert.deepEqual(g.notices, []);
  const sita = g.queue[0];
  assert.equal(g.assignBlock(sita.id, 'krata', 'taan')?.key, 'storyHearing', 'she can never be sentenced or escorted');
  assert.equal(g.assignBlock(sita.id, 'sawan', 'taan')?.key, 'storyHearing');
  assert.equal(g.defer(), false); assert.equal(g.jail(sita.id), false);
  assert.deepEqual(SITA.hearing.choices.map(x => x.k), ['suspend', 'pavilion'], 'choice C is cut');
  assert.equal(g.resolveSitaCase('stamp'), false);
  const karma = g.karma, order = g.order;
  assert.equal(g.resolveSitaCase('pavilion'), true);
  assert.equal(g.zoneCases.th, 12); assert.equal(g.karma, karma); assert.equal(g.order, order); assert.equal(soulAnywhere(g, 'sitaledger'), false);
  assert.equal(g.storyQueue[0].key, 'sita-hanuman-open'); assert.equal(status(g, 'sitaHanuman'), 'pending');
  assert.equal(status(g, 'thBorderBoss'), 'locked');
  g = reload(g); drainStories(g);
  const hb = g.startZoneEvent('sitaHanuman'); assert.equal(hb.foes.length, 1); assert.equal(hb.foes[0].sp, 'boss-hanuman-th'); assert.equal(hb.foes[0].who, 'หนุมาน');
  winFight(g); assert.equal(status(g, 'sitaHanuman'), 'cleared');
  assert.deepEqual(drainStories(g).filter(k => k.startsWith('sita-')), ['sita-hanuman-win', 'sita-phantom', 'sita-return']);
  assert.deepEqual(g.notices, ['sita-phantom']); assert.match(NOTICES['sita-phantom'].text, /\[PHANTOM-404\]/);
  g.ackNotice('sita-phantom'); assert.deepEqual(g.journalNotes, [SITA.journal]);
  // ---- cases 13-15 -> elder brother Yommathat (case 15), at the pier
  for (let n = 13; n <= 15; n++) { assert.equal(status(g, 'thBorderBoss'), 'locked', `the elder brother must wait for case 15 (at ${n - 1})`); judgeNext(g); }
  assert.equal(g.zoneCases.th, 15); assert.equal(status(g, 'thBorderBoss'), 'pending');
  g = reload(g); assert.equal(status(g, 'thBorderBoss'), 'pending');
  g.dismissEventAlert('thBorderBoss');
  assert.deepEqual(waitingEvents(g).map(e => [e.key, e.art]), [['thBorderBoss', 'zone-boss']], 'e8: he stands at the pier');
  g.player.x = FRONTIER.x; g.player.y = FRONTIER.y;
  assert.equal(g.beginBorderDungeon('asia'), true);
  assert.ok(!dungeonEnemyPositions(g).some(e => e.boss), 'e9: he does not stand at the cave with the border boss');
  assert.equal(g.leaveBorderDungeon(), true);
  const fight = g.startZoneEvent('thBorderBoss'); assert.equal(fight.foes.length, 3); assert.equal(fight.foes[0].sp, 'zone-boss');
  for (const f of fight.foes) f.atk = [0, 0];
  const brother = fight.foes.find(f => f.boss); brother.hp = Math.floor(brother.maxHp * .25); g.battle.selectedFoeId = brother.id;
  const hpBefore = g.battle.youHp;
  assert.equal(g.battleAct('atk'), true);
  assert.equal(g.battle.over, 'win'); assert.equal(g.battle.storyFinale, 'th'); assert.ok(g.battle.youHp < hpBefore, 'his last move wounds Yama');
  g.endBattle(); steady(g);
  assert.equal(g.bossCleared.th, true); assert.equal(g.abilities.flameCharge, true);
  const th = g.storyQueue.find(p => p.key === 'th'); assert.equal(th.reward, 'flameCharge');
  assert.deepEqual(storyOf('th').pages.map(p => p.image), [1, 2, 3, 4, 5].map(n => `img/story-th-0${n}.webp`));
  // ---- owner 14 Nov: no court for the elder brother; he waits at the border and takes Yama + Nira to the next land
  assert.equal(bossJusticeCase(g), null, 'the elder brother is not tried'); assert.equal(g.bossJustice?.active || null, null);
  drainStories(g); g = reload(g);
  assert.equal(g.bossGuideWaiting(), true, 'he stands at the border and can be talked to'); assert.equal(g.bossGuideFollowing(), false);
  assert.equal(g.inviteBossGuide(), true); assert.equal(g.storyQueue.at(-1).key, 'boss-guide-th-welcome');
  g.completeStory(); assert.equal(g.bossGuideFollowing(), true, 'after the talk he travels with the team (Yama + Nira + him)');
  const coinBefore = g.coin;
  assert.equal(g.farewellBossGuide(), true); assert.equal(g.storyQueue.at(-1).key, 'boss-guide-th-farewell');
  g.completeStory(); assert.equal(g.bossGuideFollowing(), false); assert.equal(g.coin, coinBefore + 500, 'farewell at the new land\'s gate pays the boss-guide grant');
  assert.equal(g.outfitsOwned.includes('asia'), true);
  // ---- nothing replays
  g = reload(g); drainStories(g); g = reload(g);
  assert.equal(g.storyCaseOwed(), null); assert.deepEqual(g.notices, []);
  for (const k of ['prisonBreak', 'devaTest', 'frontierBreach', 'sitaHanuman', 'thBorderBoss']) assert.equal(status(g, k), 'cleared', k);
  assert.equal(g.startZoneEvent('sitaHanuman'), null); assert.equal(g.startFrontierBreach(), null);
  assert.ok(!g.storyQueue.some(p => Z1_STORIES[p.key]));
});

test('a lost frontier breach sends the gate keeper back; the breach can be tried again', () => {
  const g = fresh(); g.zoneCases.th = 9; g.devaVisits.th = { phase:'fighting' };
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared' }; g.refreshZoneEvents();
  assert.ok(g.startFrontierBreach()); assert.ok(g.guard?.breachGuest);
  g.battle.youHp = 1; g.enemyTarget = () => ({ id:'you' }); for (const f of g.battle.foes) f.atk = [50, 50];
  g.battleAct('atk'); assert.equal(g.battle.over, 'lose'); g.endBattle(); steady(g);
  assert.equal(g.guard, null); assert.equal(g.hireGuard(), false); assert.equal(g.zoneEventStatus('frontierBreach'), 'pending');
  assert.ok(g.startFrontierBreach()); assert.ok(g.guard);
  const mid = reload(g); assert.equal(mid.guard, null, 'a reload in the middle of the fight does not keep him');
});

test('the border boss cannot fall to anything but the new move', () => {
  const g = fresh(); g.zoneCases.th = 9; g.devaVisits.th = { phase:'fighting' };
  g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared' }; g.refreshZoneEvents();
  g.startFrontierBreach();
  for (let wave = 1; wave <= 3; wave++) { while (!g.battle.pendingWave) strike(g); g.advanceFrontierBreachWave(); }
  strike(g);                                                    // a killing blow
  assert.equal(g.battle.over, null); assert.equal(g.battle.foes[0].hp, 1); assert.equal(g.battle.breachFinale, 'ready');
  // whatever is pressed next IS the closing move - the fight can never dead-end
  assert.equal(g.battleAct('fire'), true); assert.equal(g.battle.over, 'win'); assert.ok(g.battle.comboHits.length >= 1);
  assert.equal(g.battle.breachFinale, 'done');
});

test('old saves: no repeat, no hang', async t => {
  await t.test('Zone 1 already finished -> Sita / Hanuman is not replayed', () => {
    const old = fresh(); old.zoneCases.th = 14; old.bossCleared.th = true; old.devaVisits.th = { phase:'fighting' };
    old.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'cleared' };
    const d = JSON.parse(JSON.stringify(old.snapshot())); delete d.z1EventsVersion; delete d.storyCaseDone;
    const g = createGame(); g.restore(d);
    assert.equal(g.zoneEventStatus('sitaHanuman'), 'cleared'); assert.equal(g.storyCaseOwed(), null); assert.deepEqual(g.notices, []);
    assert.equal(g.zoneEventStatus('thBorderBoss'), 'cleared');
  });
  await t.test('elder brother announced under the old order (case 10) -> waits for Sita and case 15', () => {
    const old = fresh(); old.zoneCases.th = 10; old.devaVisits.th = { phase:'fighting' };
    old.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'pending' };
    old.eventMapClosed['th:thBorderBoss'] = true;
    const d = JSON.parse(JSON.stringify(old.snapshot())); delete d.z1EventsVersion; delete d.storyCaseDone;
    let g = createGame(); g.restore(d);
    assert.equal(g.zoneEventStatus('thBorderBoss'), 'locked'); assert.deepEqual(waitingEvents(g), []);
    assert.equal(g.storyCaseOwed(), null);
    judgeNext(g); assert.equal(g.storyCaseOwed(), 'sitaledger');
    g = reload(g); assert.equal(g.zoneEventStatus('thBorderBoss'), 'locked'); assert.equal(g.queue[0].case, 'sitaledger');
    g.resolveSitaCase('suspend'); drainStories(g); g.startZoneEvent('sitaHanuman'); winFight(g); drainStories(g);
    for (let n = 13; n <= 15; n++) judgeNext(g);
    assert.equal(g.zoneEventStatus('thBorderBoss'), 'pending');
  });
  await t.test('Guard hired at the desk before the frontier event -> back to the gate, hire refunded', () => {
    const old = fresh(); old.zoneCases.th = 4; old.zoneEvents.th = { prisonBreak:'cleared' }; old.coin = 1000;
    const legacyHire = old.hireGuard; assert.equal(legacyHire.call(old), false);
    old.zoneEvents.th.frontierBreach = 'cleared'; assert.equal(old.hireGuard(), true); delete old.zoneEvents.th.frontierBreach;   // the old game let him be hired here
    const d = JSON.parse(JSON.stringify(old.snapshot())); delete d.z1EventsVersion;
    const g = createGame(); g.restore(d);
    assert.equal(g.guard, null); assert.equal(g.coin, 1000); assert.equal(g.partyMax(), 2); assert.ok(g.guardReserve);
    assert.equal(Object.values(g.roster).some(a => a.kind === 'guard' && a.homeZone === 'th'), false);
    const again = reload(g); assert.equal(again.coin, 1000, 'refunded once'); assert.equal(again.guard, null);
    assert.equal(GUARD.hire, 420);
  });
  await t.test('e1: a beggar soul left over after the deva revealed himself is cleared on load', () => {
    const old = fresh(); old.zoneCases.th = 6; old.devaVisits.th = { phase:'fighting' };
    old.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared' };
    old.ensureStoryCase(); assert.equal(old.queue.some(x => x.case === 'devaMonk'), false);
    const d = JSON.parse(JSON.stringify(old.snapshot())); delete d.z1EventsVersion;
    const beggar = { id:991, case:'devaMonk', name:'ขอทานในวัด', who:'ขอทานในวัด', sp:'soul-deva', sex:'m', pure:true, deeds:[], merits:[], said:[], lines:[], deserved:0 };
    d.sentences = [{ soul:beggar, verdict:{ right:true, coin:0 }, intensity:1, stage:'gate', checked:false, zone:'th' }];
    d.queue = [{ ...beggar, id:992 }];
    const g = createGame(); g.restore(d);
    assert.equal(soulAnywhere(g, 'devaMonk'), false);
  });
  await t.test('the story is already past the nurse -> she is not forced in, nothing hangs', () => {
    const old = fresh(); old.zoneCases.th = 7; old.devaVisits.th = { phase:'fighting' };
    old.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared' };
    const d = JSON.parse(JSON.stringify(old.snapshot())); delete d.z1EventsVersion; delete d.storyCaseDone;
    const g = createGame(); g.restore(d);
    assert.equal(g.storyCaseOwed(), null); assert.equal(g.queue.some(s => s.case === 'nurse'), false);
    judgeNext(g); judgeNext(g); assert.equal(g.zoneEventStatus('frontierBreach'), 'pending');
  });
});
