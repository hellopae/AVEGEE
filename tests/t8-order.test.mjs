// T8a - the order of the whole package in ONE run (Rae R2 part D 0.1 rows 1-2): the walk with HOME-67 -> z34-arrive -> col-gate + N-COL-1 -> bouts 1-8 -> Thor (col-thor-win, NT-1) -> Lucifer (col-lucifer-open, col-lucifer-win, NL-1)
// -> the way on -> z4-gate-silent -> Zone 4 -> z4-arrive -> the deva court (z4-lumen-open) -> Lumen-01 -> z4-lumen-win + NW-1 + NZ-2 -> HOME-67 leaves (NH-6) -> z4-home67-harbor + NH-5 (1,200 + robes). Every scene in order.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { FRONTIER, SPOTS } from '../src/data.js';
import { recordBossGuideWin } from '../src/boss-guides.js';
import { dungeonStatus } from '../src/zone-travel.js';
import { dungeonPoint } from '../src/dungeon-view.js';
import { COL } from '../src/z4b-colosseum.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
const finishRoute = g => { const a = g.zoneTravel.active, r = dungeonStatus(g).route; a.checkpoint = r.checkpoints.length; a.cleared = r.checkpoints.map(c => c.id); const e = dungeonPoint(1, r.id); a.position = { x:e[0], y:e[1] }; };
test('Frontier 3-4 -> the colosseum -> the silent gate -> Zone 4 -> Lumen-01 -> HOME-67 at the harbour: every scene and window in order', () => {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.zone = 'west'; g.giveLamp(); g.bossCleared.asia = true; g.bossCleared.west = true; g.coin = 100; g.hpMax = g.hp = 500;
  const played = [], notices = []; const cs = g.completeStory.bind(g); g.completeStory = () => { played.push(g.storyQueue[0]?.key); return cs(); }; const qn = g.queueNotice.bind(g); g.queueNotice = id => { if (!g.notices.includes(id)) notices.push(id); return qn(id); };
  const drain = () => { for (let i = 0; i < 80 && g.storyQueue.length; i++) g.completeStory(); };
  const fight = b => { b.youHp = 99999; for (let i = 0; i < 40 && !b.over; i++) { for (const f of b.foes) if (f.hp > 0) { f.hp = 1; f.atk = [0, 0]; } g.selectFoe(b.foes.find(f => f.hp > 0).id); g.battleAct('atk'); } assert.equal(b.over, 'win'); g.endBattle(); drain(); };
  recordBossGuideWin(g, { over:'win', zone:'west', kind:'zoneBoss' }); g.home67 = { phase:'waiting' }; g.player.x = FRONTIER.x; g.player.y = FRONTIER.y; g.joinHome67(); drain(); played.length = 0; notices.length = 0; g.pendingReward = null;
  assert.equal(g.beginBorderDungeon('cyberhell'), true);
  assert.equal(g.z34ArriveDue(0), true); g.queueStory('z34-arrive'); g.storySeen['z34-arrive'] = true; drain();                       // the first step
  assert.equal(g.colosseumDue(COL.checkpoint), true); g.queueStory('col-gate'); drain(); g.queueNotice(COL.noticeMouth);                   // the middle: the gate scene, then N-COL-1
  for (let n = 1; n <= 10; n++) { if (n === 10) { g.queueStory('col-lucifer-open'); drain(); } fight(g.startColosseumBout()); }
  assert.equal(g.colosseumDue(COL.checkpoint), false); finishRoute(g); assert.equal(g.silentGateDue(), true); g.queueStory('z4-gate-silent'); g.storySeen['z4-gate-silent'] = true; drain();   // the end
  assert.equal(g.moveZone('cyberhell'), true); drain();
  g.refreshZoneEvents(); g.queueStory('z4-lumen-open'); drain(); fight(g.startZoneEvent('cyberRescue'));
  Object.assign(g.player, { x:SPOTS.bossPier.x, y:SPOTS.bossPier.y }); g.queueStory('z4-home67-harbor'); drain(); g.ackNotice('z4-home67-gift');
  const order = ['z34-arrive', 'col-gate', 'col-thor-win', 'col-lucifer-open', 'col-lucifer-win', 'z4-gate-silent', 'z4-arrive', 'z4-lumen-open', 'z4-lumen-win', 'z4-home67-harbor'];
  let at = -1; for (const k of order) { const i = played.indexOf(k, at + 1); assert.ok(i > at, `${k} plays after the one before it (${played.join(' > ')})`); at = i; }
  const norder = ['col-mouth', 'lamp-helper-thor', 'lamp-helper-lucifer', 'z4-clock', 'z4-released', 'z4-home67-left', 'z4-home67-gift']; at = -1; for (const id of norder) { const i = notices.indexOf(id, at + 1); assert.ok(i > at, `window ${id} comes after the one before it (${notices.join(' > ')})`); at = i; }
  assert.equal(g.outfit, 'cyberhell'); assert.equal(g.home67Joined, true); assert.equal(g.home67.phase, 'harbor'); assert.ok(g.abilities.cooldownClock);
});
