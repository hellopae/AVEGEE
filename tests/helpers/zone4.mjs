// T8b: a game standing in Zone 4 right after T8a (Lumen-01 beaten, HOME-67 waiting on the pier). The zone is switched by hand (the walk there is tested in t8-order).
import assert from 'node:assert/strict';
import { createGame } from '../../src/game.js';
import { STATIONS } from '../../src/data.js';
import { bossGuideState } from '../../src/boss-guides.js';
globalThis.document = { documentElement:{} };
globalThis.Image = class { set src(value) {} };
export function zone4() {
  const g = createGame(); g.save = () => true; g.onChange = () => {}; g.giveLamp(); g.bossCleared.asia = true; g.bossCleared.west = true; g.hpMax = g.hp = 900; g.coin = 5000;
  g.zone = 'cyberhell'; g.zoneEvents.cyberhell = { cyberRescue:'cleared' }; g.abilities.cooldownClock = true; g.home67Joined = true; g.home67 = { phase:'harbor', gift:true };
  Object.assign(bossGuideState(g, 'west'), { won:true, following:false, farewell:true }); g.notices = []; g.storyQueue.length = 0; g.refreshZoneEvents(); return g;
}
export const drain = g => { const seen = []; for (let i = 0; i < 80 && g.storyQueue.length; i++) { seen.push(g.storyQueue[0].key); g.completeStory(); } return seen; };
/** judge the story case `k` that is due (any verdict): puts it in the queue, takes it out, applies a verdict at the Krata station */
export const judge = (g, k, stK = 'krata') => { g.ensureStoryCase(); const at = g.queue.findIndex(s => s.case === k); assert.ok(at >= 0, `${k} is in the queue`); const soul = g.queue[at]; g.queue.splice(at, 1);
  g.applyVerdict(g.judge({ def:STATIONS.find(d => d.k === stK), crewK:'taan' }, { soul, intensity:1 }), soul); g.hp = g.hpMax; g.reds = 0; g.over = null; g.pendingWarn = null; g.pendingVerdictScene = null; };
