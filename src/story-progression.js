// Story sources are independent of level, party size and the foe's generic `boss` flag.
// Per-zone W4 tasks change their scene/case timing; these identities stay stable for old saves.
export const STORY_PROGRESS = Object.freeze({
  th:Object.freeze({frontier:'frontierBreach',tester:'devaTest',ruler:'thBorderBoss',frontierPower:'teamJudgment',rulerPower:'flameCharge'}),
  asia:Object.freeze({frontier:'asiaRageBreach',tester:'asiaDevaTest',frontierPower:'bigFire',testerPower:'windFan',rulerPower:'rage'}),
  west:Object.freeze({frontier:'westVampireBreach',tester:'westDevaTest',frontierPower:'hypno',testerPower:'valkyrieSpear',rulerPower:'ice'}),
  cyberhell:Object.freeze({frontier:'cyberBreach',tester:'cyberRescue',testerPower:'cooldownClock',final:'cyberFinal'}),
});
export function storyEncounterRole(b){
  if(!b)return 'ordinary';
  if(b.challenge)return 'challenge';
  const row=STORY_PROGRESS[b.zone];if(!row)return 'ordinary';
  if(b.kind==='zoneBoss')return 'ruler';
  if(b.kind==='frontierBreach'&&b.zone==='th')return 'frontier';
  if(b.kind==='devaTest'&&b.zone==='th')return 'tester';
  if(b.kind==='zoneEvent')for(const role of ['frontier','tester','ruler','final'])if(row[role]&&row[role]===b.eventKey)return role;
  return 'ordinary';
}
export function grantStoryBattleAbilities(g,b){
  if(b?.over!=='win')return [];
  const role=storyEncounterRole(b),power=STORY_PROGRESS[b.zone]?.[role+'Power'];
  if(!power)return [];
  const fresh=!g.abilities[power];g.abilities[power]=true;
  if(power==='cooldownClock')g.inventory.cooldownClock=1;
  return fresh?[power]:[];
}
export function storyPowerLocked(g,p){
  if(p?.k==='ice'||p?.k==='hypno')return !g.abilities[p.k];
  if(p?.k==='mirror')return g.devaTestStatus('th')!=='cleared';
  return null;
}
export const storyPowerHint=p=>({ice:'ชนะบอสใหญ่โซน 3',hypno:'ชนะบอสชายแดนโซน 3',mirror:'ชนะเทวดาโซน 1'})[p?.k]||null;
export function restoreStoryAbilities(g){
  for(const [zone,row]of Object.entries(STORY_PROGRESS))for(const role of ['frontier','tester','ruler']){
    const power=row[role+'Power'];if(!power)continue;
    if((role==='ruler'&&g.bossCleared?.[zone])||(row[role]&&g.zoneEvents?.[zone]?.[row[role]]==='cleared'))g.abilities[power]=true;
  }
  // Historical level unlocks are not evidence of the West ruler's defeat.
  if(!g.bossCleared?.west){
    delete g.abilities.ice;
    for(const id of ['power:ice','ability:ice'])delete g.discoverySeen[id];
    g.discoveryQueue=g.discoveryQueue.filter(id=>id!=='power:ice'&&id!=='ability:ice');
    g.storyQueue=g.storyQueue.filter(p=>p.reward!=='ice');
    if(g.pendingReward?.abilities)g.pendingReward.abilities=g.pendingReward.abilities.filter(k=>k!=='ice');
  }
}
