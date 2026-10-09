import { specialCooldown } from './actor-recovery.js';
import { migrateStatTraining } from './progression.js';
// Owned actors only: hiring a kind in another branch creates a different person.
import { CREW, crewName } from './data.js';

export const ROSTER_VERSION = 1;
export const TEAM_LIMITS = Object.freeze({ normalTeamMax: 2, finalTeamMax: 6 });
export const ROSTER_BACKUP_KEY = 'avegee.save.v2.before-roster-v1';
export const rosterId = (zone, kind) => kind === 'nira' ? 'global:nira' : `${zone}:${kind}`;
export const findActor = (roster, id) => roster?.[id];
export const actorsInZone = (roster, zone) => Object.values(roster || {}).filter(a => a.homeZone === zone);
export const listActors = roster => Object.values(roster || {});

export function actorFromLegacy(sv, zone, kind = sv.k) {
  const def = CREW.find(c => c.k === kind);
  if (!def && kind !== 'guard') return null;
  const id = rosterId(zone, kind);
  return migrateStatTraining({ ...(def || {}), morale: kind === 'guard' ? 100 : 92, hunger: 100,
    upLv: 0, recoverUntil: 0, ...sv, helpRemainingMs: sv.helpRemainingMs ?? Math.min(specialCooldown({k:kind}) * 1000, Math.max(0, (sv.helpReadyAt || 0) - Date.now())), id, kind, k: kind,
    homeZone: kind === 'nira' ? 'global' : zone,
    ...(def ? { name: crewName(def, zone) } : {}) });
}

const STATE_FIELDS = ['id', 'kind', 'homeZone', 'k', 'morale', 'hunger', 'upLv',
  'statTraining', 'raeng', 'rabiab', 'panya', 'metta', 'recoverUntil', 'helpReadyAt', 'helpRemainingMs',
  'teaRest', 'at', 'tired', 'x', 'y', 'buildK'];
export function snapshotRoster(roster) {
  return Object.fromEntries(listActors(roster).map(a => [a.id,
    Object.fromEntries(STATE_FIELDS.filter(k => a[k] !== undefined).map(k => [k, k === 'teaRest' ? structuredClone(a[k]) : k === 'statTraining' ? { ...a[k] } : a[k]]))]));
}

export function teamIds(keys, roster, zone) {
  return [...new Set((keys || []).map(k => roster[k] ? k : rosterId(zone, k)))]
    .filter(id => roster[id] && roster[id].kind !== 'nira' && roster[id].kind !== 'guard');
}
export function teamKeys(ids, roster, zone) {
  return teamIds(ids, roster, zone).filter(id => roster[id].homeZone === zone).map(id => roster[id].kind);
}

// Pure conversion: active branch wins over its stale zoneSave copy; Nira is global.
// An entry snapshot is a separate restore point, not another source of owned actors.
export function migrateRosterSave(input, now = Date.now()) {
  const d = structuredClone(input);
  const zone = d.zone || 'th';
  const roster = {};
  if (d.rosterVersion === ROSTER_VERSION) {
    for (const sv of Object.values(d.roster || {})) {
      const a = actorFromLegacy(sv, sv.homeZone, sv.kind);
      if (a) roster[a.id] = a;
    }
  }
  const absorb = (branch, home) => {
    for (const sv of branch.crew || []) {
      const a = actorFromLegacy(sv, home);
      if (a && (!roster[a.id] || d.rosterVersion !== ROSTER_VERSION)) roster[a.id] = a;
    }
    if (branch.guard) {
      const a = actorFromLegacy(branch.guard, home, 'guard');
      if (!roster[a.id] || d.rosterVersion !== ROSTER_VERSION) roster[a.id] = a;
    }
  };
  for (const [home, branch] of Object.entries(d.zoneSave || {})) if (home !== zone) absorb(branch, home);
  absorb(d, zone);
  if (d.rosterVersion !== ROSTER_VERSION) {
    for (const a of Object.values(roster)) if (a.morale === 0 && !a.recoverUntil) a.recoverUntil = now + 60000;
  }
  d.roster = snapshotRoster(roster);
  d.rosterVersion = ROSTER_VERSION;
  d.teamLimits = { ...TEAM_LIMITS };
  d.party = { ...(d.party || {}), members: teamIds(d.party?.members, roster, zone),
    finalMembers: teamIds(d.party?.finalMembers, roster, zone).slice(0, TEAM_LIMITS.finalTeamMax), guard: false };
  if (d.frontier) {
    if (!d.frontier.zones) d.frontier = { zones: { th: d.frontier } };
    for (const [home, state] of Object.entries(d.frontier.zones)) state.team = teamIds(state.team, roster, home);
  }
  if (d.zoneEntry) d.zoneEntry = migrateRosterSave(d.zoneEntry, now);
  return d;
}

// Bind the current branch and dormant branch copies to the same actor objects.
// Current gameplay continues to address crew by kind; persistence uses stable IDs.
export function syncRoster(game) {
  game.roster ||= {};
  for (const [zone, branch] of Object.entries(game.zoneSave || {})) {
    if (zone === game.zone) continue;
    branch.crew = (branch.crew || []).map(sv => {
      const id = rosterId(zone, sv.k);
      return game.roster[id] ||= actorFromLegacy(sv, zone);
    }).filter(Boolean);
    if (branch.guard) branch.guard = game.roster[rosterId(zone, 'guard')] ||= actorFromLegacy(branch.guard, zone, 'guard');
  }
  for (const c of game.crew) {
    Object.assign(c, { id: rosterId(game.zone, c.k), kind: c.k, homeZone: c.k === 'nira' ? 'global' : game.zone });
    c.recoverUntil ??= 0;
    migrateStatTraining(c);
    game.roster[c.id] = c;
  }
  if (game.guard) {
    Object.assign(game.guard, { id: rosterId(game.zone, 'guard'), kind: 'guard', k: 'guard', homeZone: game.zone });
    game.guard.morale ??= 100; game.guard.hunger ??= 100;
    game.guard.upLv ??= 0; game.guard.recoverUntil ??= 0;
    migrateStatTraining(game.guard);
    game.roster[game.guard.id] = game.guard;
  }
}
