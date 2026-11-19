// T7c/6 - the relatives of the crew in Zone 3 (Rae R2 part C section 6 + her first script 5.1-5.4, 7.1): six cases built like Zone 2's. Each comes to the tail of the queue once its crew member is hired AND Eirlin's test (case 10) is passed,
// with its notice (behind the button = what the crew member says before the hearing); after the verdict the crew member asks one thing and the player answers with one of two choices; relative 5 is VAN HELSING's (the Gate Guard of the West), not the gate giant's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { Z3_KIN, KIN_BY_KEY, Z3_KIN_NOTICES, Z3_KIN_AWAY } from '../src/z3g-kin.js';
import { CASES_BY_ZONE } from '../src/cases.js';
import { NOTICES } from '../src/z1-events.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const west = () => { const g = createGame(); g.bossCleared.asia = true; g.save = () => true; g.onChange = () => {}; g.hpMax = g.hp = 500; g.coin = 99999; g.level = 5; assert.equal(harbourTravel(g, 'west'), true);
  g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared' }; g.storyQueue.length = 0; g.notices.length = 0; return g; };
const judge = (g, k) => { const at = g.queue.findIndex(s => s.case === k); assert.ok(at >= 0, `${k} is in the queue`); const soul = g.queue[at]; g.queue.splice(at, 1);
  g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === 'krata'), crewK:'taan' }, { soul, intensity:1 }), soul); g.hp = g.hpMax; g.reds = 0; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };

test('the six relatives: crew, Rae\'s notice + talk in both languages, Van Helsing (not the gate giant) for the sentry, in the Zone 3 pool and in the one lookup', () => {
  assert.deepEqual(Z3_KIN.map(r => [r.k, r.crew]), [['falseorder', 'taan'], ['youngerbrother', 'plerng'], ['doomclient', 'kan'], ['carerdaughter', 'boon'], ['gatesentry', 'guard'], ['soupcook', 'dam']]);
  for (const r of Z3_KIN) { assert.ok(r.notice.title && r.notice.en.title && r.before.length === r.beforeEn.length && r.after.length === r.afterEn.length && r.during.length === r.duringEn.length, r.k);
    assert.equal(r.choices.length, 2); for (const c of r.choices) assert.ok(c.label && c.labelEn && c.lines.length === c.linesEn.length && c.lines.length >= 2, `${r.k} choice`);
    assert.equal(KIN_BY_KEY[r.k], r); assert.ok(CASES_BY_ZONE.west.some(c => c.k === r.k && c.story && !c.quest)); assert.ok(NOTICES[`kin-${r.k}`], 'notice registered'); assert.ok(r.def.en_name, 'the case keeps its English fields'); }
  const sentry = Z3_KIN.find(r => r.k === 'gatesentry'); const all = JSON.stringify(sentry);
  assert.ok(all.includes('แวน เฮลซิง') && !all.includes('ยักษ์ทวารบาล'), 'the talk is Van Helsing\'s'); assert.match(sentry.beforeEn[0], /^Van Helsing:/); assert.match(sentry.notice.en.button, /Van Helsing/);
  assert.ok(KIN_BY_KEY.deserter && KIN_BY_KEY.chaincmd, 'Zone 2\'s relatives are still in the same lookup');
});
test('they come after Eirlin\'s test, only for hired crew, at the tail of the queue; the sentry needs the Guard; the choices answer in the crew member\'s own words', () => {
  const g = west(); g.hire('plerng'); g.hire('kan'); g.hire('boon'); g.hire('dam');
  g.ensureKinCases(); assert.equal(g.queue.filter(s => s.kin).length, 0, 'not before Eirlin\'s test');
  g.zoneEvents.west.westDevaTest = 'cleared'; g.ensureKinCases();
  const kinSouls = g.queue.filter(s => s.kin).map(s => s.kin).sort(); assert.deepEqual(kinSouls, ['carerdaughter', 'doomclient', 'falseorder', 'soupcook', 'youngerbrother'], 'Poena is hired from the first day; the Guard is not here yet');
  for (const k of kinSouls) assert.ok(g.notices.includes(`kin-${k}`), `notice of ${k}`);
  g.guard = { id:'west:guard', k:'guard', kind:'guard', homeZone:'west', morale:100 }; g.ensureKinCases(); assert.ok(g.queue.some(s => s.kin === 'gatesentry'), 'the Guard (Van Helsing) is the owner of the 5th');
  g.ensureKinCases(); assert.equal(g.queue.filter(s => s.kin === 'gatesentry').length, 1, 'only once');
  // a verdict -> the crew member's question; the choice is recorded
  judge(g, 'falseorder'); assert.ok(g.notices.includes('kin-after-falseorder')); assert.deepEqual(g.kinDone.falseorder, { verdict:g.kinDone.falseorder.verdict, choice:null });
  g.kinDone.falseorder.choice = 0; g.kinChoiceMade('falseorder', 0);
  // Noir's first choice = a journal line
  judge(g, 'soupcook'); g.kinDone.soupcook.choice = 0; g.kinChoiceMade('soupcook', 0); assert.ok(g.journalNotes.includes(Z3_KIN_AWAY.journalCook));
});
test('Sibyl\'s second choice: she goes to serve a penalty (cannot work), the window says so, and when she is back on her feet the "back at work" window comes once', () => {
  const g = west(); g.hire('kan'); g.zoneEvents.west.westDevaTest = 'cleared'; g.ensureKinCases(); judge(g, 'doomclient');
  const sib = g.crewOf('kan'); assert.ok(sib && !sib.recoverUntil); g.notices.length = 0;
  g.kinDone.doomclient.choice = 1; g.kinChoiceMade('doomclient', 1);
  assert.ok(g.notices.includes('z3-kin3-away')); assert.ok(sib.recoverUntil > 0, 'she is away'); assert.equal(g.kinDone.doomclient.away, true);
  const back = sib.recoverUntil + 10; g.updateActorRecovery(back); for (let i = 0; i < 20 && sib.recoverUntil; i++) g.updateActorRecovery(back + i * 5000);
  g.updateActorRecovery(back + 200000);
  assert.equal(sib.recoverUntil, 0); assert.ok(g.notices.includes('z3-kin3-back'), 'back at work'); assert.equal(g.kinDone.doomclient.away, false);
  const n = g.notices.filter(x => x === 'z3-kin3-back').length; g.updateActorRecovery(back + 300000); assert.equal(g.notices.filter(x => x === 'z3-kin3-back').length, n, 'once');
  // her first choice (answer A) does not send her away
  const h = west(); h.hire('kan'); h.zoneEvents.west.westDevaTest = 'cleared'; h.ensureKinCases(); judge(h, 'doomclient'); h.kinDone.doomclient.choice = 0; h.kinChoiceMade('doomclient', 0); assert.ok(!h.crewOf('kan').recoverUntil);
  assert.match(Z3_KIN_NOTICES['z3-kin3-away'].en.text, /cannot work until she returns/);
});
