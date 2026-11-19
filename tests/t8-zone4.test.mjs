// T8a/3 - entering Zone 4, Lumen-01 and the Magic Clock, HOME-67 leaves for the harbour with 1,200 coins + the Zone 4 robes (Rae R2 part D 2.1-2.5, owner 20 Nov): the order of every scene, in one run.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { FRONTIER, SPOTS, ZONE_EVENTS } from '../src/data.js';
import { storyOf } from '../src/story.js';
import { setLang } from '../src/i18n.js';
import { NOTICES } from '../src/z1-events.js';
import { recordBossGuideWin, bossGuideFollowing } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { dungeonPoint } from '../src/dungeon-view.js';
import { HOME67_HARBOR_LINES } from '../src/z4a-border.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const finishRoute = g => { const a = g.zoneTravel.active, r = dungeonStatus(g).route; a.checkpoint = r.checkpoints.length; a.cleared = r.checkpoints.map(c => c.id); const e = dungeonPoint(1, r.id); a.position = { x:e[0], y:e[1] }; };
test('Zone 4: the walk ends, z4-arrive, the deva court (z4-lumen-open), Lumen-01 with Yama + Nira + HOME-67, z4-lumen-win -> clock + release windows -> HOME-67 leaves (NH-6) -> the harbour scene -> 1,200 + robes (NH-5)', () => {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'west'; g.giveLamp(); g.bossCleared.asia = true; g.bossCleared.west = true; g.coin = 100; g.hpMax = g.hp = 500;
  const played = []; const cs = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return cs(); }; const drain = () => { for (let i = 0; i < 60 && g.storyQueue.length; i++) g.completeStory(); };
  recordBossGuideWin(g, { over:'win', zone:'west', kind:'zoneBoss' }); g.home67 = { phase:'waiting' }; g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; g.joinHome67(); drain(); g.notices = []; g.pendingReward = null;
  assert.equal(g.beginBorderDungeon('cyberhell'), true); finishRoute(g); g.storySeen['z34-arrive'] = true; g.storySeen['col-gate'] = true;
  assert.equal(g.moveZone('cyberhell'), true); assert.equal(g.zone, 'cyberhell'); drain(); assert.ok(played.includes('z4-arrive'), 'z4-arrive');
  assert.ok(!g.outfitsOwned.includes('cyberhell'), 'no robes before the harbour');
  // Lumen-01: the existing deva-cyberhell scene, then the event (a gate fight: the walk party)
  const ev = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberRescue'); assert.equal(ev.openStory, 'z4-lumen-open'); assert.deepEqual(ev.winStories, ['z4-lumen-win']); assert.deepEqual(ev.winNotices, ['z4-clock', 'z4-released']); assert.equal(ev.banner.en, 'Zone 4 · The Deva Court · Lumen-01');
  g.refreshZoneEvents(); assert.equal(g.zoneEventStatus('cyberRescue'), 'pending'); assert.equal(g.zoneCaptivesFree(), false, 'nothing can be built before the captives are out');
  const coin0 = g.coin; const b = g.startZoneEvent('cyberRescue'); assert.ok(b); assert.ok(b.expeditionParty, 'Yama + Nira + HOME-67'); assert.ok(g.battleActors().some(a => a.guestGuide && a.name === 'HOME-67'));
  b.youHp = 99999; for (let i = 0; i < 40 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); } assert.equal(b.over, 'win'); g.endBattle();
  assert.equal(g.abilities.cooldownClock, true, 'the Magic Clock'); assert.equal(g.zoneCaptivesFree(), true, 'Sysop and the hell merchant are out'); assert.ok(g.storyQueue.some(s => s.key === 'z4-lumen-win'));
  for (const id of ['z4-clock', 'z4-released']) assert.ok(g.notices.includes(id), id);
  drain(); assert.ok(g.notices.includes('z4-home67-left'), 'NH-6'); assert.equal(g.home67?.phase, 'harbor'); assert.equal(g.home67Guest(), false); assert.equal(bossGuideFollowing(g), false); assert.equal(g.coin, coin0 + ev.reward.coin, 'no gift yet');
  // the harbour
  Object.assign(g.player, { x:SPOTS.bossPier.x, y:SPOTS.bossPier.y }); assert.equal(g.home67Talk(), true); assert.equal(g.bossPierCanTalk(), true, 'he can be talked to on the pier');
  g.notices = []; const coin = g.coin; g.queueStory('z4-home67-harbor'); drain();
  assert.equal(g.coin, coin + 1200); assert.ok(g.outfitsOwned.includes('cyberhell')); assert.ok(g.notices.includes('z4-home67-gift'), 'NH-5'); assert.notEqual(g.outfit, 'cyberhell', 'the robes change when the window is acknowledged');
  g.ackNotice('z4-home67-gift'); assert.equal(g.outfit, 'cyberhell'); g.home67Gift(); assert.equal(g.coin, coin + 1200, 'once');
  assert.ok(played.indexOf('z4-arrive') < played.indexOf('z4-lumen-win') && played.indexOf('z4-lumen-win') < played.indexOf('z4-home67-harbor'));
  assert.equal(HOME67_HARBOR_LINES.length, 3); const h = createGame(); h.save = () => true; assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); assert.equal(h.home67?.phase, 'harbor'); assert.equal(h.home67?.gift, true); assert.equal(h.home67Joined, true);
});
test('the scenes of Zone 4 are Rae\'s in both languages', () => {
  for (const lang of ['th', 'en']) { setLang(lang); for (const [k, n] of [['z4-arrive', 2], ['z4-lumen-open', 1], ['z4-lumen-win', 2], ['z4-home67-harbor', 2]]) { const s = storyOf(k); assert.equal(s.pages.length, n, k); for (const p of s.pages) { assert.ok(p.line && p.title); if (lang === 'en') assert.ok(!/[฀-๿]/.test(p.line + p.title), `${k} English page has no Thai`); } } }
  setLang('en'); assert.equal(NOTICES['z4-clock'].en.title, 'The Clock That Turns Back Time'); assert.match(NOTICES['z4-home67-gift'].en.text, /1,200 karma coins/); setLang('th');
});
