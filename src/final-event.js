import { t } from './i18n.js';
import { FINAL_EVENT, ZONE_EVENTS, MOB, MERCHANT, STATIONS } from './data.js';
// Persistent progress for the fixed Zone 4 finale. UI acknowledgement never pays loot.
export const RULER_ORDER = ['th', 'asia', 'west', 'cyberhell'];
export function migrateFinalEvent(save = {}) {
  if (save.finalEvent?.version === 1) {
    const s = structuredClone(save.finalEvent);
    s.minionsCleared ||= 0; s.rulersCleared ||= []; s.rewardLedger ||= {};
    s.pendingReward ||= null; s.activeEncounter ||= null;
    // Interrupted battles without a serialized encounter become map retries.
    if (!save.finalBattle && ['minions','rulerBattle','finalBoss'].includes(s.phase)) {
      s.activeEncounter = null;
      s.phase = s.minionsCleared < 4 ? 'ready' : s.rulersCleared.length === 4 ? 'bossReady' : 'staging';
    }
    if (s.phase === 'reward' && !s.pendingReward)
      s.phase = s.minionsCleared < 4 ? 'ready' : !s.reinforcementsSeen ? 'reinforcementCutscene' : s.rulersCleared.length === 4 ? 'bossReady' : 'staging';
    if (s.phase === 'ending' && !s.pendingReward && !save.finalBattle) s.phase = 'completed';
    // v1 presentation had control in the approach panel and no map intermission.
    if (s.migrationVersion !== 2) {
      s.presentation = null;
      s.approachSeen = !!save.storySeen?.['cyber-approach'] || s.minionsCleared > 0;
      s.controlSeen = !!s.reinforcementsSeen;
      s.duelSeen = !!save.storySeen?.['cyber-duel'];
      s.migrationVersion = 2;
    }
    return s;
  }
  const status = save.zoneEvents?.cyberhell?.cyberFinal;
  const state = { version:1, migrationVersion:2, phase:['pending','active'].includes(status) ? 'ready' : 'locked',
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
  const reinforcements = s.reinforcementsSeen ? RULER_ORDER.map((zone,i) => ({ id:`reinforcement:${zone}`,
    x:FINAL_EVENT.reinforcementPositions[i][0], y:FINAL_EVENT.reinforcementPositions[i][1],
    art:['crew-plerng','crew-dam','crew-boon','crew-guard'][i], sourceZone:zone,
    name:t('final.reinforcement.' + zone), reinforcement:true })) : [];
  if (s.minionsCleared < 4 || ['reinforcementIntro','reinforcementMap','reinforcementAdvance'].includes(s.presentation)) {
    const entry = waves[Math.min(3,s.minionsCleared)][0], [x,y] = FINAL_EVENT.enemyPositions[0];
    return [{ id:'boss', x:1390, y:615, art:'zone-boss', name:waves[8][0].name, enabled:false },
      { id:s.minionsCleared < 4 ? `minion:${s.minionsCleared + 1}` : 'army:front', x,y, art:MOB.kinds[entry.kind].img,
        name:s.minionsCleared < 4 ? `ลูกน้องระลอก ${s.minionsCleared + 1}/4` : '', enabled:!!next && !s.presentation },
      ...[0,1].map(i => ({ id:`army:${i}`, x:1190+i*80, y:540+i*30, art:MOB.kinds[entry.kind].img, name:'', enabled:false })),
      ...reinforcements];
  }
  if (!s.reinforcementsSeen) return [];
  const enemies = [...RULER_ORDER.map((z,i) => ({ id:`ruler:${z}`, entry:waves[i+4][0], i })) , { id:'boss', entry:waves[8][0], i:4 }]
    .filter(a => !s.rulersCleared.includes(a.id.split(':')[1]))
    .map(a => ({ id:a.id, x:FINAL_EVENT.enemyPositions[a.i][0], y:FINAL_EVENT.enemyPositions[a.i][1],
      art:a.id === 'boss' ? 'zone-boss' : a.entry.sp, name:a.entry.name, enabled:a.id === next && !s.presentation }));
  return [...enemies, ...reinforcements];
}

export function finalRestSpot(g) {
  if (!g.finalEventOnMap?.() || g.stations.some(st => st.def.k === 'tea' && !st.build)) return null;
  return { x:FINAL_EVENT.restPosition[0], y:FINAL_EVENT.restPosition[1] };
}

// Destinations are shared by the map preparation UI and its navigation tests.
export function finalPreparationTargets(g) {
  const nira = g.crewOf('nira'), tea = g.stations.find(st => st.def.k === 'tea' && !st.build);
  return { merchant:{ x:MERCHANT.x, y:MERCHANT.y },
    nira:nira ? { x:nira.x ?? nira.hx, y:nira.y ?? nira.hy } : null,
    tea:tea ? { x:tea.def.x, y:tea.def.y } : finalRestSpot(g) || { x:STATIONS.find(st => st.k === 'tea').x, y:STATIONS.find(st => st.k === 'tea').y } };
}
