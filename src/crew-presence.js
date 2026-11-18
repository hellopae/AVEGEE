// T3/1 (owner 18 Nov, G6) - every reaper (and the Guard) has ONE body in the world at any time.
// Before: the resident NPC of a room (Plerng in the kettle hall, Boon at the heaven gate, Kan in the mirror tower, Dam in the sword groves, Nira in the cells)
// was drawn whenever that room was open, even while the same reaper was away guarding another station -> the player met a second copy.
// And a courier walk (Dam carrying a soul back to the queue) drew a walking Dam while his map body kept standing where he started.
// This file holds the predicates the renderers share, so the test can count the bodies with the very same rules the screen uses.
import { actorStanding } from './actor-recovery.js';
import { canteenCookPose, canteenState } from './canteen.js';

/** where each reaper waits when he has no job (the station whose front yard is his post) - Nira / Taan wait on the plaza in front of the judgement dais (TOWN_CREW) */
export const CREW_HOME_STATION = Object.freeze({ dam: 'canteen', plerng: 'krata', kan: 'krajok', boon: 'sawan' });
/** the station room each reaper stands in when you walk in (his "office"); null room = nobody lives there */
export const ROOM_RESIDENT = Object.freeze({ tarang: 'nira', sawan: 'boon', krajok: 'kan', krata: 'plerng', ngiw: 'dam', dab: 'dam' });

/** farther than this from his home point = still on the way back, not "home" yet (world units; the idle stroll is at most ~150) */
export const HOME_RADIUS = 170;

/** why this reaper is NOT free to stand in a room other than `roomKey` (null = he is free / home) */
export function crewAwayReason(g, c, roomKey = null) {
  if (!c) return null;
  if (!actorStanding(c)) return 'down';              // recovering / tea rest / zero morale
  if (c.escort) return 'escort';
  if (c.buildK) return 'build';
  if (c.at && c.at !== roomKey) return 'station:' + c.at;
  if (c.cook || c.eatOrder || canteenState(g).orders.some(o => o.cook === c.k)) return 'canteen';
  if (c.fm || c.fmWork || c.fmCarry) return 'foreman';
  if (c.k === 'nira' && g.niraRest) return 'rest';
  if (g.mapTravel && (c.k === 'nira' || c.k === 'kan')) return 'travel';
  if (g.afterlifeWalks?.some(w => w.courier === c.k || w.escort?.k === c.k)) return 'walk';
  if (g.transits?.some(v => v.pickup && v.crew === c.k && Date.now() < (v.arriveAt || 0))) return 'transit';
  if (c.x != null && c.hx != null && Math.hypot(c.x - c.hx, c.y - c.hy) > HOME_RADIUS && !c.at) return 'returning';
  return null;
}

/** is the resident NPC of room `roomKey` standing there?  A reaper who is not hired yet is the plain scenery NPC (always there);
 *  a hired one is there only when he is free and home. */
export function residentPresent(g, roomKey) {
  const k = ROOM_RESIDENT[roomKey];
  if (!k) return false;
  const c = g.crew?.find(x => x.k === k);
  if (!c) return true;
  return crewAwayReason(g, c, roomKey) === null;
}

/** the keeper of station `st` stands inside its room only once he has really arrived (not while he is still fetching / escorting the soul on the map) */
export function keeperPresent(g, st) {
  const c = st?.crewK && g.crew?.find(x => x.k === st.crewK);
  return !!c && !c.self && crewAwayReason(g, c, st.def.k) === null;
}

/** the map body of a reaper is not drawn while some other animation owns him (escort path, soul pick-up, courier walk) */
export function crewDrawnByWalk(g, k) {
  return !!(g.afterlifeWalks?.some(w => w.zone === g.zone && (w.courier === k || w.escort && w.escort.k === k)) ||
    g.transits?.some(v => v.pickup && v.crew === k && Date.now() < (v.arriveAt || 0)));
}

/** does the map scene draw the standing / walking body of crew member c?  (one rule for scene.js and the test) */
export function mapBodyDrawn(g, c, { rescue = false, justice = null } = {}) {
  if (rescue) return false;
  if (canteenCookPose(g, c)) return false;
  if (g.mapTravel && ['nira', 'kan'].includes(c.k)) return false;
  if (justice && (c.k === justice.pick?.crew || c.k === 'nira' && ['dais', 'trial'].includes(justice.phase))) return false;
  if (!actorStanding(c) && c.teaRest?.phase !== 'travel') return false;
  if (c.x == null || c.escort) return false;
  if (crewDrawnByWalk(g, c.k)) return false;
  return true;
}

/** every place crew member c is drawn right now (list of strings) - used by tests: it must hold at most one "body" and at most one room */
export function crewViews(g, c, opts = {}) {
  const views = [];
  if (mapBodyDrawn(g, c, opts)) views.push('map');
  if (g.afterlifeWalks?.some(w => w.zone === g.zone && (w.courier === c.k || w.escort && w.escort.k === c.k) && actorStanding(c))) views.push('walk');
  if (g.transits?.some(v => v.pickup && v.crew === c.k && Date.now() < (v.arriveAt || 0) && actorStanding(c))) views.push('transit');
  if (canteenCookPose(g, c)) views.push('canteen-room');
  for (const room of new Set([...Object.keys(ROOM_RESIDENT), ...(g.stations || []).map(s => s.def.k)])) {
    const st = g.stations?.find(s => s.def.k === room);
    // the keeper on duty in his own station room
    if (st?.crewK === c.k && keeperPresent(g, st)) views.push('room-guard:' + room);
    // the resident NPC (the keeper of the room is drawn above, not as a second copy)
    else if (ROOM_RESIDENT[room] === c.k && st?.crewK !== c.k && residentPresent(g, room)) views.push('room-resident:' + room);
  }
  return views;
}
