// T8a/1 - Frontier 3-4 with HOME-67 (Rae R2 part D 1.1 / 1.8 / 2.1-2.3): the team = Yama + Nira + HOME-67 (D7) - he walks as the guest of the route (his guide record is Zone 3's), `z34-arrive` at the first step,
// the gate nobody keeps (`z4-gate-silent`) at the end, NO farewell at the gate (he goes in with the team), `z4-arrive` on entering Zone 4. Before he has answered "I am ready" the walk does not start (NH-4).
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { FRONTIER } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { NOTICES } from '../src/z1-events.js';
import { bossGuideFollowing, bossGuideCombatant, bossGuideDismissed, recordBossGuideWin, initializeBossGuides } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { dungeonPoint } from '../src/dungeon-view.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const drain = g => { const seen = []; for (let i = 0; i < 40 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
function afterSeverin() {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'west'; g.giveLamp(); g.bossCleared.asia = true; g.bossCleared.west = true; g.coin = 5000;
  recordBossGuideWin(g, { over:'win', zone:'west', kind:'zoneBoss' }); g.home67 = { phase:'waiting' }; g.notices = []; g.storyQueue.length = 0; g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; return g;
}
const finishRoute = g => { const a = g.zoneTravel.active, r = dungeonStatus(g).route; a.checkpoint = r.checkpoints.length; a.cleared = r.checkpoints.map(c => c.id); const e = dungeonPoint(1, r.id); a.position = { x:e[0], y:e[1] }; };

test('the walk does not start before HOME-67 has answered; then he is the guest of the route (no farewell, Severin stays gone, no robes yet)', () => {
  const g = afterSeverin(); assert.equal(g.beginBorderDungeon('cyberhell'), false); assert.ok(g.notices.includes('z3-home67-warn'), 'NH-4'); assert.equal(g.zoneTravel.active, null);
  assert.equal(g.joinHome67(), true); drain(g); g.notices = [];
  assert.equal(g.home67Guest(), true); assert.equal(bossGuideFollowing(g), true); assert.equal(bossGuideDismissed(g), true, 'Severin is not on the pier');
  const c = bossGuideCombatant(g); assert.equal(c.name, 'HOME-67'); assert.equal(c.artKey, 'char-home67'); assert.equal(c.id, 'guide:west');
  assert.ok(!g.outfitsOwned.includes('cyberhell'), 'the Zone 4 robes are HOME-67\'s gift in Zone 4, not the old farewell');
  const h = createGame(); h.save = () => true; assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); assert.ok(!h.outfitsOwned.includes('cyberhell'), 'a reload does not hand the robes out either'); assert.equal(h.home67Guest(), true);
});
test('Frontier 3-4: z34-arrive at the first step (once) -> the walk -> z4-gate-silent at the end (once) -> Zone 4 without a farewell -> z4-arrive', () => {
  const g = afterSeverin(); g.joinHome67(); drain(g); g.notices = []; g.pendingReward = null;
  assert.equal(g.beginBorderDungeon('cyberhell'), true); const st = dungeonStatus(g); assert.equal(st.route.id, 'west:cyberhell'); assert.equal(g.z34ArriveDue(0), true); assert.equal(g.z34ArriveDue(1), false, 'only at the first step');
  g.queueStory('z34-arrive'); g.storySeen['z34-arrive'] = true; assert.equal(g.z34ArriveDue(0), false, 'once');
  finishRoute(g); assert.equal(g.silentGateDue(), true); g.storySeen['z4-gate-silent'] = true; assert.equal(g.silentGateDue(), false);
  assert.equal(g.moveZone('cyberhell'), true, 'HOME-67 does not block the way in - he goes with the team'); assert.equal(g.zone, 'cyberhell');
  assert.ok(g.storyQueue.some(s => s.key === 'z4-arrive'), 'the city with nobody in it'); assert.equal(g.home67Guest(), true, 'he is still in the team in Zone 4');
});
test('the scenes: TH + EN on every page, Rae\'s own words', () => {
  for (const lang of ['th', 'en']) { setLang(lang);
    for (const [k, n] of [['z34-arrive', 2], ['col-gate', 2], ['col-thor-win', 1], ['col-lucifer-open', 1], ['col-lucifer-win', 1], ['z4-gate-silent', 1], ['z4-arrive', 2], ['z4-lumen-open', 1], ['z4-lumen-win', 2], ['z4-home67-harbor', 2]]) {
      const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.match(storyOf('z4-gate-silent').pages[0].line, /A Gate Nobody Keeps|metal gate, open/); setLang('th'); assert.ok(NOTICES['z3-home67-warn']);
});
