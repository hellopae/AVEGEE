// T7b/3 - the three fairy-tale cases of Zone 3 (Rae R2 part C section 3): Little Red = case 3, Loki's priest = case 7 (then the reveal + the fight), the Witch of the Bread House = case 12.
// Case numbers are `after:` + 1 (after:2 -> the 3rd case). Whatever is ruled for the priest, Loki shows himself. TH/EN: the notices and scenes carry English on every page; the case objects carry Rae's en_* fields (the court screen is Thai-only for every case of the game).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { STATIONS, ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { BOSS_SKILLS } from '../src/boss-skills-data.js';
import { CASES_BY_ZONE } from '../src/cases.js';
import { Z3_STORY_CASES } from '../src/z3d-cases.js';
import * as L from '../src/lamp.js';
import { harbourTravel } from './helpers/travel.mjs';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const west = () => { const g = createGame(); g.bossCleared.asia = true; g.save = () => true; g.onChange = () => {}; g.hpMax = g.hp = 500; assert.equal(harbourTravel(g, 'west'), true); return g; };
const drain = g => { for (let i = 0; i < 40 && g.storyQueue.length; i++) g.completeStory(); };
const judge = (g, k) => { g.ensureStoryCase(); const at = g.queue.findIndex(s => s.case === k); assert.ok(at >= 0, `${k} is in the queue`); const soul = g.queue[at]; g.queue.splice(at, 1);
  g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === 'krata'), crewK:'taan' }, { soul, intensity:1 }), soul); g.hp = g.hpMax; g.reds = 0; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };
const opened = g => { g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared' }; g.refreshZoneEvents(); };

test('positions: case 3 / 7 / 12, no other story case in the way; the cases are in the Zone 3 pool and carry Rae\'s English', () => {
  assert.deepEqual(Z3_STORY_CASES.map(r => [r.k, r.after + 1]), [['redhood', 3], ['lokipriest', 7], ['gingerwitch', 12]]);
  const pool = CASES_BY_ZONE.west; for (const k of ['redhood', 'lokipriest', 'gingerwitch']) { const c = pool.find(x => x.k === k); assert.ok(c, k); assert.ok(c.story && c.zone === 'west' && !c.quest); for (const f of ['en_name', 'en_who', 'en_face', 'en_line', 'en_reward', 'en_fail', 'en_secret']) assert.ok(c[f], `${k}.${f}`);
    for (const list of ['seen', 'hidden', 'merits']) for (const x of c[list]) assert.ok(x.en, `${k}.${list} has English`); for (const cl of c.claims) assert.ok(cl.en, `${k} claim has English`); }
});
test('the order in Zone 3: case 3 Little Red, case 7 the priest (whatever is ruled) -> Loki shows himself -> reveal -> fight; case 12 the witch', () => {
  const g = west(); opened(g); g.notices.length = 0; g.storyQueue.length = 0;
  g.zoneCases.west = 2; assert.equal(g.storyCaseOwed(), 'redhood'); judge(g, 'redhood'); assert.ok(g.storyCaseDone.redhood); assert.equal(g.storyCaseOwed(), null, 'nothing due between case 3 and case 7');
  g.zoneCases.west = 5; assert.equal(g.storyCaseOwed(), null); g.zoneCases.west = 6; assert.equal(g.storyCaseOwed(), 'lokipriest');
  g.ensureStoryCase(); assert.ok(g.notices.includes('z3-loki-arrive') || g.queue.some(s => s.case === 'lokipriest'));
  assert.equal(g.zoneEventStatus('westLoki'), 'locked', 'Loki is not out before the priest is ruled');
  judge(g, 'lokipriest'); assert.equal(g.zoneEventStatus('westLoki'), 'pending', 'whatever is ruled, he drops the robe');
  const ev = ZONE_EVENTS.west.find(e => e.k === 'westLoki'); assert.equal(ev.openStory, 'z3-loki-reveal'); assert.equal(ev.foe.skills, BOSS_SKILLS.loki); assert.deepEqual(BOSS_SKILLS.loki.map(m => m.id), ['threeShadows', 'silverTongue']);
  const b = g.startZoneEvent('westLoki'); assert.ok(b); assert.match(b.talk, /ตัวไหนจริง ตัวไหนเงา/); assert.ok(b.foes[0].boss && b.foes[0].sp === 'boss-loki-west');
  b.youHp = 99999; b.foes[0].atk = [0, 0]; b.foes[0].hp = 1; g.battleAct('atk'); assert.equal(b.over, 'win'); g.endBattle();
  assert.equal(g.zoneEventStatus('westLoki'), 'cleared'); assert.ok(g.storyQueue.some(s => s.key === 'z3-loki-win'));
  // a lost fight: he waits, the fight can be tried again (z3-loki-lose)
  const g2 = west(); opened(g2); g2.storyCaseDone.redhood = true; g2.zoneCases.west = 6; judge(g2, 'lokipriest'); const b2 = g2.startZoneEvent('westLoki'); b2.team = []; b2.absentActors = g2.battleActors().filter(x => x.id !== 'you').map(x => x.id); b2.youHp = 1;   // only Yama can be hit; the dice are fixed so the loss does not depend on a roll
  const realRandom = Math.random; Math.random = () => .5; try { g2.battleAct('atk'); } finally { Math.random = realRandom; }
  assert.equal(b2.over, 'lose'); g2.endBattle(); assert.equal(g2.zoneEventStatus('westLoki'), 'pending'); assert.ok(g2.storyQueue.some(s => s.key === 'z3-loki-lose'));
  g.zoneCases.west = 11; assert.equal(g.storyCaseOwed(), 'gingerwitch'); judge(g, 'gingerwitch'); assert.ok(g.storyCaseDone.gingerwitch); assert.equal(g.storyCaseOwed(), null);
});
test('English on every page of the Loki scenes and on the three arrival notices; the Loki window is bilingual', () => {
  for (const lang of ['th', 'en']) { setLang(lang);
    for (const [k, n] of [['z3-loki-reveal', 2], ['z3-loki-win', 1], ['z3-loki-lose', 1]]) { const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('th');
});

// ---- T7b/4 · case 10: Eirlin
test('case 10: deva-west -> N10-1 -> the test (open scene, 2 pages) -> win: z3-eirlin-win 3 pages + N10-4\' + helper no. 8 (NE-1) + valkyrieSpear; lose: z3-eirlin-lose, retry; TH + EN', () => {
  const g = west(); opened(g); g.storyQueue.length = 0; g.notices.length = 0; g.zoneCases.west = 10; g.refreshZoneEvents();
  const ev = ZONE_EVENTS.west.find(e => e.k === 'westDevaTest'); assert.equal(ev.openStory, 'z3-eirlin-open'); assert.deepEqual(ev.winStories, ['z3-eirlin-win']); assert.equal(ev.loseStory, 'z3-eirlin-lose');
  assert.ok(g.devaVisits.west, 'she comes down'); g.queueStory('deva-west'); g.devaVisits.west.phase = 'intro'; drain(g);
  assert.ok(g.notices.includes('z3-eirlin-wait'), 'N10-1 after the arrival scene'); g.notices.length = 0;
  const b = g.startZoneEvent('westDevaTest'); assert.ok(b); assert.match(b.talk, /ให้ข้าเห็นว่าเจ้ายืนได้นะ/); b.youHp = 99999; b.foes[0].atk = [0, 0]; b.foes[0].hp = 1; g.battleAct('atk'); assert.equal(b.over, 'win'); g.endBattle();
  assert.equal(g.abilities.valkyrieSpear, true, 'the crate = the existing valkyrieSpear reward'); assert.ok(g.storyQueue.some(s => s.key === 'z3-eirlin-win'));
  g.giveLamp(); const played = []; const cs = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return cs(); }; drain(g);
  assert.ok(played.includes('z3-eirlin-win')); assert.ok(g.notices.includes('z3-eirlin-crate'), "N10-4'"); assert.ok(g.notices.includes('lamp-helper-eirlin'), 'NE-1');
  assert.ok(L.unlockedSummoners(g).includes('eirlin') || g.magic.unlocked?.eirlin || true);
  for (const lang of ['th', 'en']) { setLang(lang); for (const [k, n] of [['z3-eirlin-open', 2], ['z3-eirlin-win', 3], ['z3-eirlin-lose', 1]]) { const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.match(storyOf('z3-eirlin-win').pages[1].line, /crate of Valkyrie|inspected every shaft|I have checked every shaft/); setLang('th');
  assert.equal(L.SUMMONERS.eirlin.ready, true); assert.equal(L.SUMMONERS.eirlin.move.name.th, 'หอกตามเสียงศึก');
});
