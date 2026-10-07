import { t } from './i18n.js';
// Reusable deva actors: register another zone here; event keys stay in zoneEvents.
export const DEVA_MAP = {
  asia:{ key:'asiaDevaTest', prerequisite:'asiaPrisonFire', x:1120, y:400 },
};
export const DEVA_DESCENT_MS = 3200;
export function devaMapActors(g, now = Date.now()) {
  const def = DEVA_MAP[g.zone];
  if (!def || g.zoneEventStatus(def.key) === 'cleared') return [];
  const phase = g.devaVisits?.[g.zone]?.phase;
  const descending = phase === 'descending';
  const waiting = phase === 'waiting' || (!phase && g.zoneEventStatus(def.prerequisite) === 'cleared');
  if (!descending && !waiting) return [];
  const progress = descending ? Math.min(1, Math.max(0, (now - (g.devaDescentStartedAt || now)) / DEVA_DESCENT_MS)) : 1;
  return [{ ...def, id:`deva:${g.zone}`, art:`boss-tester-${g.zone}`, sourceZone:g.zone,
    y:descending ? -100 + (def.y + 100) * progress : def.y,
    enabled:waiting && g.zoneEventStatus(def.key) === 'pending', label:t('deva.map.test') }];
}
export function prisonEventBurning(g) {
  return g.zone === 'asia' && ['pending','active'].includes(g.zoneEventStatus('asiaPrisonFire'));
}
