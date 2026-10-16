import { initializeZoneTravel, DUNGEON_ROUTES } from '../../src/zone-travel.js';
import { dungeonPoint } from '../../src/dungeon-view.js';

/** Established harbour fixture for tests of branch gameplay, not discovery gates.
 * Keep all gameplay state intact and call the real guarded moveZone method.
 */
export function harbourTravel(g, to) {
  const travel = g.zoneTravel || initializeZoneTravel(g);
  travel.visited[g.zone] = true;
  travel.visited[to] = true;
  travel.ports[g.zone] = true;
  travel.ports[to] = true;
  Object.assign(g.player, g.harbourPoint());
  return g.moveZone(to);
}

/** First-arrival geometry fixture: all route encounters won, party at exit.
 * Does not create a harbour at the destination or bypass actual arrival checks.
 */
export function clearedDungeonTravel(g, to) {
  const travel = g.zoneTravel || initializeZoneTravel(g);
  const route = DUNGEON_ROUTES.find(r => r.from === g.zone && r.to === to);
  if (!route || !g.bossCleared[g.zone]) throw new Error('Cleared source boss and connecting dungeon required');
  travel.active = {
    route: route.id, checkpoint: route.checkpoints.length,
    cleared: route.checkpoints.map(c => c.id), attempt: route.checkpoints.length,
    pending: null, position: { x: dungeonPoint(1,route.id)[0], y: dungeonPoint(1,route.id)[1] },
  };
  return g.moveZone(to);
}
