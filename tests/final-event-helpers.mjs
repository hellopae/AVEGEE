import {bossJusticeCase,interrogateBoss,mirrorBoss,bossJusticeAnswer,sentenceBoss,advanceBossJustice,releaseBoss} from '../src/boss-justice.js';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { syncSceneZone, CREW, SPOTS } from '../src/data.js';
export function finalGame() {
  const g = createGame(); g.zone = 'cyberhell'; g.zoneCases.cyberhell = 10;
  // Direct zone assignment must also select that branch's world geometry.
  syncSceneZone(g.zone);
  Object.assign(g.player,SPOTS.bench,{tx:null,ty:null,path:null});
  for(const c of g.crew) {
    const home=CREW.find(d=>d.k===c.k);
    if(home)Object.assign(c,{hx:home.hx,hy:home.hy,x:null,y:null});
  }
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared' };
  g.refreshZoneEvents(); return g;
}
export function win(g) {
  g.battle.youHp = g.battle.youMax; // State transitions tested independently of attrition.
  for (const f of g.battle.foes) f.atk = [0, 0];   // B5-R: ไม่ให้ลูกน้องล้มกลางทางจากการสุ่มเป้า (ตัวคูณสมดุลทำให้โดนแรงขึ้น)
  for (let i = 0; g.battle.foes.some(f => f.hp > 0) && i < 30; i++) {
    const f = g.battle.foes.find(f => f.hp > 0); g.selectFoe(f.id); f.hp = 1;
    assert.equal(g.battleAct('atk'), true);
  }
  assert.equal(g.battle.over, 'win');
}
export function roundTrip(g) {
  const h = createGame(); assert.equal(h.restore(JSON.parse(JSON.stringify(g.snapshot()))), true); return h;
}
export function acknowledge(g) {
  assert.equal(g.acknowledgeFinalReward(), true);
  if (g.finalEvent.phase === 'reinforcementCutscene') {
    assert.equal(g.storyQueue[0].key, 'cyber-reinforcements'); g.completeStory();
    assert.equal(g.finalEvent.phase, g.finalEvent.rulersCleared.length === 4 ? 'bossReady' : 'staging');
  }
}
export function clearMinions(g) {
  for (let i=1;i<=4;i++) { assert.ok(g.startFinalEncounter(`minion:${i}`)); win(g); g.endBattle(); acknowledge(g); }
}

export function finishBossJustice(g) {
  assert.equal(g.finalEvent.phase,'justice');assert.equal(g.gameCompleted,false);
  while(g.storyQueue.length)g.completeStory();
  interrogateBoss(g);assert.equal(sentenceBoss(g,bossJusticeAnswer(g)),false);
  mirrorBoss(g);assert.equal(sentenceBoss(g,bossJusticeAnswer(g)),true);
  for(let i=0;i<2000&&bossJusticeCase(g)?.phase!=='sentenceScene';i++)advanceBossJustice(g,100);
  assert.equal(bossJusticeCase(g).phase,'sentenceScene');assert.equal(g.gameCompleted,false);
  assert.equal(releaseBoss(g),true);
}
