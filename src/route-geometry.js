// M2 R1 — ROUTE GEOMETRY: one row per frontier route (the walk between two cities).  No imports.
//
// Route 'th:asia' (Zone 1-2) is the reference: a 31-point trail on one full-screen picture, three checkpoints on trail
// vertices 7 / 15 / 23, six optional patrols, hand-placed trees and waterfalls over the picture, and a boss cave at
// checkpoint 2 (Zone 1's inspector).  Routes 'asia:west' (2-3) and 'west:cyberhell' (3-4) are built on the SAME trail
// and the same walkable pads; they have no boss cave (the zone boss is fought at the pier of its own city).
//
// A route with `enabled:false` keeps the OLD system (a straight vertical corridor over three pictures, one per
// checkpoint, no patrols).  Switching a route on is data only:
//   1. put the picture in place (`background`, 1672x941 RGB, the trail must follow `corridor`)
//   2. set `enabled: true`
export const DUNGEON_CORRIDOR = Object.freeze([[.12,.22],[.19,.25],[.21,.28],[.20,.31],[.26,.33],[.32,.38],[.37,.43],[.42,.43],[.47,.40],[.48,.36],[.54,.35],[.59,.34],[.63,.39],[.69,.43],[.74,.47],[.79,.51],[.77,.55],[.74,.58],[.72,.62],[.67,.63],[.63,.64],[.60,.68],[.58,.72],[.53,.75],[.62,.77],[.67,.80],[.72,.85],[.78,.87],[.84,.85],[.88,.80],[.91,.79]].map(Object.freeze));
export const LEGACY_CORRIDOR = Object.freeze([[.5,.925],[.5,.78],[.43,.65],[.53,.49],[.48,.35],[.5,.19]].map(Object.freeze));
export const LEGACY_CHECKPOINT_PROGRESS = Object.freeze([.25,.52,.79]);

// Oval pads on the trail that are walkable beyond the ±0.026 strip: start, bend, first checkpoint, cave yard, exit gate.
const PADS = Object.freeze([[.12,.22,.052,.036],[.26,.33,.062,.035],[.42,.43,.042,.028],[.53,.75,.085,.042],[.91,.79,.042,.033]].map(Object.freeze));
const CHECKPOINT_VERTEX = Object.freeze([7,15,23]);
const PATROL_PROGRESS = Object.freeze([.08,.19,.32,.48,.66,.90]);
// Which checkpoint's foe each patrol borrows (Zone 1-2: checkpoint foes 2,3,5 -> patrol foes 2,3,2,5,3,5).
const PATROL_FROM_CHECKPOINT = Object.freeze([0,1,0,2,1,2]);

// Hand-placed overlay on the Zone 1-2 picture (0-1 of the picture).
const TREES = Object.freeze([[.15,.16],[.24,.25],[.30,.30],[.39,.36],[.50,.29],[.57,.28],[.66,.36],[.81,.46],[.71,.55],[.64,.58],[.55,.69],[.66,.73],[.81,.80]].map(Object.freeze));
const WATERFALLS = Object.freeze([[.435,.215,.08],[.423,.34,.045],[.37,.43,.075],[.35,.565,.07],[.32,.69,.065],[.94,.86,.10]].map(Object.freeze));

const row = (id, o) => ({
  id, enabled:false,
  corridor:DUNGEON_CORRIDOR, checkpointVertex:CHECKPOINT_VERTEX, pads:PADS,
  patrolProgress:PATROL_PROGRESS, patrolFoe:null,
  ambient:{ trees:[], waterfalls:[] },
  bossCave:null,
  ...o,
});
/** The table.  `foes` = the foe kinds of the route's three checkpoints (zone-travel.js DUNGEON_ROUTES). */
export const ROUTE_GEOMETRY = {
  'th:asia': row('th:asia', {
    enabled:true, background:'img/frontier-route/zone1-2-v3.webp', patrolFoe:[2,3,2,5,3,5],
    ambient:{ trees:TREES, waterfalls:WATERFALLS },
    // Checkpoint 2 is Zone 1's boss cave: locked until checkpoint 1 is done, the guide waits there, the zone event fights.
    bossCave:{ zone:'th', checkpoint:2, eventKey:'thBorderBoss', breachKey:'frontierBreach', guide:[.055,.01], interactReach:.065 },
  }),
  'asia:west': row('asia:west', {
    enabled:false, background:'img/frontier-route/zone2-3-v1.webp', foes:[6,7,9],
  }),
  'west:cyberhell': row('west:cyberhell', {
    enabled:false, background:'img/frontier-route/zone3-4-v1.webp', foes:[10,11,12],
  }),
};
for (const r of Object.values(ROUTE_GEOMETRY)) if (!r.patrolFoe) r.patrolFoe = PATROL_FROM_CHECKPOINT.map(i => r.foes[i]);

/** Does this route use the 31-point trail system (true) or the old vertical corridor (false)? */
export const isWildernessRoute = routeId => !!ROUTE_GEOMETRY[routeId]?.enabled;
export const routeRow = routeId => ROUTE_GEOMETRY[routeId] || null;
/** The boss-cave description of a route, or null (only Zone 1-2 has one). */
export const routeBossCave = routeId => (isWildernessRoute(routeId) ? ROUTE_GEOMETRY[routeId].bossCave : null);

/** Dev / test hook: switch a route on at run time. */
export function enableRoute(routeId) { ROUTE_GEOMETRY[routeId].enabled = true; }
export function disableRoute(routeId) { if (routeId === 'th:asia') throw new Error('reference route'); ROUTE_GEOMETRY[routeId].enabled = false; }
