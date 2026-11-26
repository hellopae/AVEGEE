// T8b - the order of the whole package in ONE run (Rae R2 part D 0.1 rows 3-6 and 9): case 4 (AI Scammer's teacher) -> case 7 (Trojan-9 + WATSON-03: z4-troj-run, z4-troj-pre, 4 waves, the boss, z4-wat-join, NV-W) -> cases 8, 9 (the relatives)
// -> case 10 (the record hall: N10-1, z4-reveal, the AI Scammer Robot, z4-sala-win, NS-10) -> case 12 (WATSON-03's quest) -> HOME-67's quest (NQ-1, the catch, the fight, z4-lupin-win, NQ-2, NU-1). Every scene and window in order.
// The windows of the screens that the browser opens by itself (the intro of Trojan-9, the choice window of the worker) are not part of the game object: they are listed here as the steps the player takes.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as L from '../src/lamp.js';
import { zone4, drain, judge } from './helpers/zone4.mjs';
test('Zone 4 cases 4 -> 7 -> 8 -> 9 -> 10 -> 12 and HOME-67\'s quest: every scene and window in order', () => {
  const g = zone4(); const played = [], notices = [];
  const cs = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return cs(); };
  const qn = g.queueNotice.bind(g); g.queueNotice = id => { if (!g.notices.includes(id) && !id.startsWith('build-open-')) notices.push(id); return qn(id); };   // FB3-MP6: rank windows are not story beats
  const win = b => { b.youHp = 99999; for (let i = 0; i < 80 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); if (!b.over && b.pendingWave) g.advanceZoneEventWave(true); } assert.equal(b.over, 'win'); g.endBattle(); drain(g); };
  g.guard = null;
  // case 4
  g.zoneCases.cyberhell = 4; g.ensureStoryCase(); judge(g, 'aiscam'); assert.equal(g.zoneCases.cyberhell, 5);
  // case 7: the alert, the walk down (the intro of Trojan-9 is the browser's), then HOME-67 runs in and calls the Guard, the fight
  g.zoneCases.cyberhell = 7; g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberBreach'), 'pending'); assert.equal(g.guard, null, 'WATSON-03 is not here yet');
  for (const k of ['z4-troj-run', 'z4-troj-pre']) { g.queueStory(k); } drain(g);
  const b = g.startZoneEvent('cyberBreach'); assert.ok(g.guard.breachGuest); win(b); assert.ok(g.guard && !g.guard.breachGuest, 'WATSON-03 stays');
  // Trojan-9 is tried in the arena as before (boss-justice) - nothing else can start until that is over: here the trial is closed by hand
  for (const e of Object.values(g.bossJustice?.ledger || {})) e.phase = 'released';
  // cases 8 and 9
  g.zoneCases.cyberhell = 8; g.ensureStoryCase(); judge(g, 'kin8'); judge(g, 'kin9'); assert.equal(g.zoneCases.cyberhell, 10);
  // case 10: the record hall
  g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberSala'), 'pending'); g.queueStory('z4-reveal'); drain(g); win(g.startZoneEvent('cyberSala'));
  // case 12: WATSON-03's quest
  g.zoneCases.cyberhell = 12; g.ensureKinCases(); assert.ok(g.queue.some(s => s.case === 'watkin')); judge2(g);
  // HOME-67's quest
  assert.equal(g.takeLupinQuest(), true); g.queueStory('z4-lupin-catch'); drain(g); win(g.startLupinFight());
  assert.deepEqual(played.filter(k => k !== undefined), ['z4-troj-run', 'z4-troj-pre', 'z4-wat-join', 'z4-reveal', 'z4-sala-win', 'z4-lupin-catch', 'z4-lupin-win']);
  assert.deepEqual(notices, ['z4-aiscam-arrive', 'z4-wat-guard', 'z4-kin8-arrive', 'z4-kin9-arrive', 'z4-seized', 'kin-watkin', 'kin-after-watkin', 'z4-lupin-take', 'z4-lupin-done', 'lamp-helper-lupin']);
  assert.deepEqual(g.journalNotes.map(x => x.split(' ')[0]), ['PHANTOM-404:', 'WATSON-03:', 'PHANTOM-404:', 'PHANTOM-404:']); assert.match(g.journalNotes[0], /ครูเกษียณ/); assert.match(g.journalNotes[1], /ผู้เฝ้าด่านนรกเครือข่าย/); assert.match(g.journalNotes[2], /นักร้อง/); assert.match(g.journalNotes[3], /หอจดหมายเหตุ/);
  assert.ok(L.unlockedSummoners(g).includes('lupin')); assert.equal(g.lupin.phase, 'done');
  function judge2(game) { game.notices = game.notices; const soul = game.queue.find(s => s.case === 'watkin'); game.queue.splice(game.queue.indexOf(soul), 1); game.kinSpeaks(soul);
    game.applyVerdict(game.judge({ def:{ k:'krata', name:'ทัณฑ์', pow:1, tags:[] }, crewK:'taan' }, { soul, intensity:1 }), soul); game.hp = game.hpMax; game.reds = 0; game.over = null; game.pendingWarn = null; game.pendingVerdictScene = null; }
});
