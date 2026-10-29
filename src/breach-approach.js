import { t } from './i18n.js';
import { ZONE_EVENTS, MOB, CHALLENGE_STAND, BOSS_NAMES } from './data.js';
// Display actors only: the existing event remains responsible for combat stats/rewards.
export function breachApproachActors(zone, key) {
  if (!['frontierBreach','asiaRageBreach','westVampireBreach','cyberBreach','cyberSignal','signalTh','signalAsia','signalWest'].includes(key)) return [];
  const ev = ZONE_EVENTS[zone]?.find(ev => ev.k === key);
  const boss = ev?.waves.flat().find(foe => foe.boss);
  if (!boss) return [];
  // artUrl() appends the zone suffix itself, so non-th keys must not carry it (else 404 -> emoji fallback)
  const mob = ev.waves[0][0];
  return [
    { id:'breach:boss', ...CHALLENGE_STAND[zone], art:boss.sp.replace(/-(asia|west|cyberhell)$/, ''), name:BOSS_NAMES[zone].frontier, boss:true, hypno:!!ev.signal, arrived:true },
    { id:'breach:add:1', x:.72, y:.53, art:MOB.kinds[mob.kind].img, name:t('event.frontierBreach.marker'), arrived:true },
    { id:'breach:add:2', x:.63, y:.70, art:MOB.kinds[mob.kind].img, name:t('event.frontierBreach.marker'), arrived:true },
  ];
}
