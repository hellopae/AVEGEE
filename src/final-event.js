import { FINAL_EVENT, ZONE_EVENTS, MOB } from './data.js';
// Persistent progress for the fixed Zone 4 finale. UI acknowledgement never pays loot.
export const RULER_ORDER = ['th', 'asia', 'west', 'cyberhell'];
export function migrateFinalEvent(save = {}) {
  if (save.finalEvent?.version === 1) return structuredClone(save.finalEvent);
  const status = save.zoneEvents?.cyberhell?.cyberFinal;
  const state = { version:1, migrationVersion:1, phase:['pending','active'].includes(status) ? 'ready' : 'locked',
    minionsCleared:0, rulersCleared:[], activeEncounter:null, pendingReward:null,
    rewardLedger:{}, reinforcementsSeen:false, stagingPosition:null };
  if (save.gameCompleted || status === 'cleared') {
    Object.assign(state, { phase:'completed', minionsCleared:4, rulersCleared:[...RULER_ORDER], reinforcementsSeen:true });
  } else if (save.battle?.eventKey === 'cyberFinal') {
    // Old saves normally omitted battle; only use an explicit legacy wave if present.
    const b = save.battle, completed = Math.max(0, Math.min(8, (b.pendingWave || b.wave || 1) - 1 + (b.over === 'win' ? 1 : 0)));
    state.minionsCleared = Math.min(3, completed);
    state.rulersCleared = RULER_ORDER.slice(0, Math.max(0, completed - 3));
    state.phase = 'ready'; // The newly added fourth minion wave must still be won.
    for (let i = 1; i <= state.minionsCleared; i++) state.rewardLedger[`minion:${i}`] = { migrated:true };
  }
  return state;
}
export function nextFinalEncounter(s) {
  if (!s || !['ready', 'staging', 'bossReady'].includes(s.phase) || s.pendingReward || s.activeEncounter) return null;
  if (s.minionsCleared < 4) return `minion:${s.minionsCleared + 1}`;
  if (!s.reinforcementsSeen) return null;
  const ruler = RULER_ORDER.find(k => !s.rulersCleared.includes(k));
  return ruler ? `ruler:${ruler}` : 'boss';
}
export function winFinalEncounter(s, id, reward) {
  if (s.activeEncounter !== id || s.rewardLedger[id]) return false;
  if (id.startsWith('minion:')) s.minionsCleared = Number(id.split(':')[1]);
  if (id.startsWith('ruler:')) s.rulersCleared.push(id.split(':')[1]);
  s.rewardLedger[id] = structuredClone(reward);
  s.pendingReward = { ...structuredClone(reward), encounter:id };
  s.activeEncounter = null; s.phase = id === 'boss' ? 'ending' : 'reward';
  return true;
}
export function acknowledgeFinalReward(s) {
  if (!s.pendingReward) return false;
  s.pendingReward = null;
  if (s.phase === 'completed' || s.phase === 'ending') return true;
  s.phase = s.minionsCleared === 4 && !s.reinforcementsSeen ? 'reinforcementCutscene'
    : s.minionsCleared < 4 ? 'ready' : s.rulersCleared.length === 4 ? 'bossReady' : 'staging';
  return true;
}

// Shared map identities for rendering, hit tests and walk obstacles.
export function finalEventActors(g) {
  if (g.zone !== 'cyberhell') return [];
  const s = g.finalEventState?.();
  if (!s) return [];
  if (['locked','completed'].includes(s.phase)) return [];
  const next = nextFinalEncounter(s), waves = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal').waves;
  if (s.minionsCleared < 4) {
    const entry = waves[s.minionsCleared][0], [x,y] = FINAL_EVENT.enemyPositions[0];
    return [{ id:`minion:${s.minionsCleared + 1}`, x,y, art:MOB.kinds[entry.kind].img,
      name:`ลูกน้องระลอก ${s.minionsCleared + 1}/4`, enabled:!!next }];
  }
  if (!s.reinforcementsSeen) return [];
  const enemies = [...RULER_ORDER.map((z,i) => ({ id:`ruler:${z}`, entry:waves[i+4][0], i })) , { id:'boss', entry:waves[8][0], i:4 }]
    .filter(a => !s.rulersCleared.includes(a.id.split(':')[1]))
    .map(a => ({ id:a.id, x:FINAL_EVENT.enemyPositions[a.i][0], y:FINAL_EVENT.enemyPositions[a.i][1],
      art:a.entry.sp, name:a.entry.name, enabled:a.id === next }));
  return [...enemies, ...RULER_ORDER.map((zone,i) => ({ id:`reinforcement:${zone}:taan`,
    x:FINAL_EVENT.reinforcementPositions[i][0], y:FINAL_EVENT.reinforcementPositions[i][1],
    art:'crew-taan', sourceZone:zone, name:`กำลังเสริมโซน ${i+1}`, reinforcement:true }))];
}

export function finalRestSpot(g) {
  if (!g.finalEventOnMap?.() || g.stations.some(st => st.def.k === 'tea' && !st.build)) return null;
  return { x:FINAL_EVENT.restPosition[0], y:FINAL_EVENT.restPosition[1] };
}
