import { getLang } from './i18n.js';
import { finalReinforcementLabel } from './z4h-final.js';
import { FINAL_EVENT, ZONE_EVENTS, MOB, MERCHANT, STATIONS } from './data.js';
// Persistent progress for the fixed Zone 4 finale. UI acknowledgement never pays loot.
export const RULER_ORDER = ['th', 'asia', 'west', 'cyberhell'];
/** T8d (Rae R2 D 8.1): the soldiers come in THREE waves (the game had four) */
export const MINION_WAVES = FINAL_EVENT.minionWaves;
/** the phase the map goes back to after a fight that is not over the whole finale */
export const finalPhaseAfterBattle = s => s.minionsCleared < MINION_WAVES ? 'ready' : s.rulersCleared.length === 4 ? 'bossReady' : 'staging';
export function migrateFinalEvent(save = {}) {
  if (save.finalEvent?.version === 1) {
    const s = structuredClone(save.finalEvent);
    s.minionsCleared ||= 0; s.rulersCleared ||= []; s.rewardLedger ||= {};
    s.pendingReward ||= null; s.activeEncounter ||= null;
    // Interrupted battles without a serialized encounter become map retries.
    // (T8d: a battle of the old fourth minion wave that was saved mid-fight no longer exists - the map takes it back)
    if ((!save.finalBattle || save.finalBattle.encounter === 'minion:4') && ['minions','rulerBattle','finalBoss'].includes(s.phase)) {
      s.activeEncounter = null;
      s.phase = finalPhaseAfterBattle(s);
    }
    if (s.phase === 'reward' && !s.pendingReward)
      s.phase = s.minionsCleared < MINION_WAVES ? 'ready' : !s.reinforcementsSeen ? 'reinforcementCutscene' : s.rulersCleared.length === 4 ? 'bossReady' : 'staging';
    if (s.phase === 'ending' && !s.pendingReward && !save.finalBattle) s.phase = 'completed';
    // v1 presentation had control in the approach panel and no map intermission.
    if (!(s.migrationVersion >= 2)) {
      s.presentation = null;
      s.approachSeen = !!save.storySeen?.['cyber-approach'] || s.minionsCleared > 0;
      s.controlSeen = !!s.reinforcementsSeen;
      s.duelSeen = !!save.storySeen?.['cyber-duel'];
      s.migrationVersion = 2;
    }
    // T8d: three minion waves, and `cyber-approach` now plays AFTER them (Rae R2 D 8.1) - an old save that cleared 3 or 4 waves has cleared them all
    if (!(s.migrationVersion >= 3)) {
      const oldMinions = s.minionsCleared;
      s.minionsCleared = Math.min(MINION_WAVES, s.minionsCleared);
      s.openSeen = !!save.storySeen?.['z4-final-open'] || oldMinions > 0 || s.approachSeen || s.rulersCleared.length > 0 || !['locked', 'ready'].includes(s.phase);
      s.warpDone = s.openSeen;
      s.approachSeen = !!save.storySeen?.['cyber-approach'] && oldMinions >= MINION_WAVES;   // the old story played BEFORE the first wave: the new one (after the third) has not been seen
      if (s.presentation === 'approach' && s.minionsCleared < MINION_WAVES) s.presentation = null;
      if (s.minionsCleared >= MINION_WAVES && !s.reinforcementsSeen && s.phase === 'ready') s.phase = 'reinforcementCutscene';
      s.migrationVersion = 3;
    }
    return s;
  }
  const status = save.zoneEvents?.cyberhell?.cyberFinal;
  const state = { version:1, migrationVersion:3, openSeen:false, warpDone:false, phase:['pending','active'].includes(status) ? 'ready' : 'locked',
    minionsCleared:0, rulersCleared:[], activeEncounter:null, pendingReward:null,
    rewardLedger:{}, reinforcementsSeen:false, stagingPosition:null };
  if (save.gameCompleted || status === 'cleared') {
    Object.assign(state, { phase:'completed', minionsCleared:MINION_WAVES, rulersCleared:[...RULER_ORDER], reinforcementsSeen:true, openSeen:true, warpDone:true });
  } else if (save.battle?.eventKey === 'cyberFinal') {
    // Old saves normally omitted battle; only use an explicit legacy wave if present.
    const b = save.battle, completed = Math.max(0, Math.min(8, (b.pendingWave || b.wave || 1) - 1 + (b.over === 'win' ? 1 : 0)));
    state.minionsCleared = Math.min(MINION_WAVES, completed);
    state.rulersCleared = RULER_ORDER.slice(0, Math.max(0, completed - MINION_WAVES));
    state.openSeen = state.warpDone = completed > 0;
    state.reinforcementsSeen = completed > MINION_WAVES;   // T8d: the three legacy minion waves ARE the three waves of the finale
    state.phase = completed < MINION_WAVES ? 'ready' : completed === MINION_WAVES ? 'reinforcementCutscene' : finalPhaseAfterBattle(state);
    for (let i = 1; i <= state.minionsCleared; i++) state.rewardLedger[`minion:${i}`] = { migrated:true };
  }
  return state;
}
/** The first map entrance belongs to a new finale; older saves may already have seen its dialogue. */
export function archonArrivalPending(s, seen = {}) {
  return s.phase === 'ready' && !s.presentation && !s.archonWalkSeen && !s.warpDone && !s.openSeen &&
    !s.minionsCleared && !s.rulersCleared?.length &&
    !seen['z4-final-open'] && !seen['cyber-approach'] && !seen['cyber-duel'];
}

export function nextFinalEncounter(s) {
  if (!s || !['ready', 'staging', 'bossReady'].includes(s.phase) || s.pendingReward || s.activeEncounter) return null;
  if (s.minionsCleared < MINION_WAVES) return `minion:${s.minionsCleared + 1}`;
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
  if (s.phase === 'completed' || s.phase === 'ending' || s.phase === 'justice') return true;
  s.phase = s.minionsCleared === MINION_WAVES && !s.reinforcementsSeen ? 'reinforcementCutscene' : finalPhaseAfterBattle(s);
  return true;
}

// Shared map identities for rendering, hit tests and walk obstacles.
export function finalEventActors(g) {
  if (g.zone !== 'cyberhell') return [];
  const s = g.finalEventState?.();
  if (!s) return [];
  if (['locked','completed','justice'].includes(s.phase)) return [];
  const next = nextFinalEncounter(s), waves = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal').waves;
  const reinforcements = s.reinforcementsSeen ? RULER_ORDER.map((zone,i) => ({ id:`reinforcement:${zone}`,
    x:FINAL_EVENT.reinforcementPositions[i][0], y:FINAL_EVENT.reinforcementPositions[i][1],
    art:['crew-plerng','crew-dam','crew-boon','crew-guard'][i], sourceZone:zone,
    name:finalReinforcementLabel(zone, getLang()), reinforcement:true })) : [];   // T8d: Rae's labels (the Zone 4 one = "Zone 4 Gate Guard", it is the picture crew-guard)
  // T8d (Rae NF-1 / z4-final-open): HOME-67 kneels bound by lines of green light beside Archon-Zero until the boss falls (he is not on the pier of the harbour meanwhile - scene.js)
  const bound = s.phase === 'ending' ? [] : [{ id:'home67-bound', x:FINAL_EVENT.boundPosition[0], y:FINAL_EVENT.boundPosition[1], art:'char-home67', sourceZone:'west', name:'HOME-67', bound:true, enabled:false }];
  if (s.minionsCleared < MINION_WAVES || ['approach','reinforcementIntro','reinforcementMap','reinforcementAdvance'].includes(s.presentation)) {
    const entry = waves[Math.min(MINION_WAVES - 1,s.minionsCleared)][0], [x,y] = FINAL_EVENT.enemyPositions[0];
    const boss=FINAL_EVENT.enemyPositions[4];
    return [{ id:'boss', x:boss[0], y:boss[1], art:'zone-boss', name:waves[MINION_WAVES + 4][0].name, enabled:false },
      { id:s.minionsCleared < MINION_WAVES ? `minion:${s.minionsCleared + 1}` : 'army:front', x,y, art:MOB.kinds[entry.kind].img,
        name:s.minionsCleared < MINION_WAVES ? `ลูกน้องระลอก ${s.minionsCleared + 1}/${MINION_WAVES}` : '', enabled:!!next && !s.presentation },
      ...[0,1].map(i => ({ id:`army:${i}`, x:FINAL_EVENT.enemyPositions[i+1][0], y:FINAL_EVENT.enemyPositions[i+1][1], art:MOB.kinds[entry.kind].img, name:'', enabled:false })),
      ...bound, ...reinforcements];
  }
  if (!s.reinforcementsSeen) return [];
  const enemies = [...RULER_ORDER.map((z,i) => ({ id:`ruler:${z}`, entry:waves[i+MINION_WAVES][0], i })) , { id:'boss', entry:waves[MINION_WAVES + 4][0], i:4 }]
    .filter(a => !s.rulersCleared.includes(a.id.split(':')[1]))
    .map(a => ({ id:a.id, x:FINAL_EVENT.enemyPositions[a.i][0], y:FINAL_EVENT.enemyPositions[a.i][1],
      art:a.id === 'boss' ? 'zone-boss' : a.entry.sp, name:a.entry.name, enabled:a.id === next && !s.presentation }));
  return [...enemies, ...bound, ...reinforcements];
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
