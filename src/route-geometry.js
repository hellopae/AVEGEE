import {BORDER23_MASK,BORDER23_CORRIDOR,BORDER23_CHECKPOINT_VERTEX} from './frontier-walkmask-asia-west.js';
import {FRONTIER_WALK_COLS,FRONTIER_WALK_ROWS,FRONTIER_WALK_RUNS,FRONTIER_OWNER_TREES,FRONTIER_CORRIDOR_MASK} from './frontier-walkmask-th-asia.js';
// M2 R1 — ROUTE GEOMETRY: one row per frontier route (the walk between two cities).
//
// Route 'th:asia' (Zone 1-2) is the reference: a 31-point trail on one full-screen picture, three checkpoints on trail
// vertices 7 / 15 / 23, six optional patrols, hand-placed trees and waterfalls over the picture, and a boss cave at
// checkpoint 2 (Zone 1's inspector).  Routes 'asia:west' (2-3) and 'west:cyberhell' (3-4) are built on the SAME trail
// and the same walkable pads by default. Zone 2-3 now has its own registered owner mask and repaired staircase;
// Zone 3-4 remains on the legacy system until its owner mask arrives.
//
// A route with `enabled:false` keeps the OLD system (a straight vertical corridor over three pictures, one per
// checkpoint, no patrols).  Switching a route on is data only:
//   1. put the picture in place (`background`, 1672x941 RGB, the trail must follow `corridor`)
//   2. set `enabled: true`
export const FALLBACK_CORRIDOR = Object.freeze([[.12,.22],[.19,.25],[.21,.28],[.20,.31],[.26,.33],[.32,.38],[.37,.43],[.42,.43],[.47,.40],[.48,.36],[.54,.35],[.59,.34],[.63,.39],[.69,.43],[.74,.47],[.79,.51],[.77,.55],[.74,.58],[.72,.62],[.67,.63],[.63,.64],[.60,.68],[.58,.72],[.53,.75],[.62,.77],[.67,.80],[.72,.85],[.78,.87],[.84,.85],[.88,.80],[.91,.79]].map(Object.freeze));
// Owner-fitted reference for Zone 1-2. Zone 2-3 has independent owner-fitted geometry.
export const DUNGEON_CORRIDOR = Object.freeze([[0.12,0.22],[0.19,0.25],[0.21,0.28],[0.1995997,0.3138409],[0.259462,0.3352336],[0.3209046,0.3770783],[0.3706797,0.4278192],[0.4204958,0.4323339],[0.4704112,0.4019354],[0.48,0.36],[0.54,0.35],[0.5921537,0.3354136],[0.6324162,0.3816239],[0.691737,0.4223149],[0.7412542,0.4652813],[0.791388,0.5047959],[0.7700559,0.5502091],[0.7400217,0.5800813],[0.72,0.62],[0.67,0.63],[0.6314375,0.6443486],[0.6017651,0.6853705],[0.58,0.72],[0.53,0.75],[0.62,0.77],[0.67,0.8],[0.72,0.85],[0.78,0.87],[0.8460416,0.8568359],[0.8870761,0.8079557],[0.91,0.79]].map(Object.freeze));
export const LEGACY_CORRIDOR = Object.freeze([[.5,.925],[.5,.78],[.43,.65],[.53,.49],[.48,.35],[.5,.19]].map(Object.freeze));
export const LEGACY_CHECKPOINT_PROGRESS = Object.freeze([.25,.52,.79]);

// Oval pads on the trail that are walkable beyond the ±0.026 strip: start, bend, first checkpoint, cave yard, exit gate.
const PADS = Object.freeze([[.12,.22,.052,.036],[.26,.33,.062,.035],[.42,.43,.042,.028],[.53,.75,.085,.042],[.91,.79,.042,.033]].map(Object.freeze));
const CHECKPOINT_VERTEX = Object.freeze([7,15,23]);
const PATROL_PROGRESS = Object.freeze([.08,.19,.32,.48,.66,.90]);
// Which checkpoint's foe each patrol borrows (Zone 1-2: checkpoint foes 2,3,5 -> patrol foes 2,3,2,5,3,5).
const PATROL_FROM_CHECKPOINT = Object.freeze([0,1,0,2,1,2]);

// Hand-placed overlay on the Zone 1-2 picture (0-1 of the picture).
const TREES = FRONTIER_OWNER_TREES;
const WATERFALLS = Object.freeze([[.435,.215,.08],[.423,.34,.045],[.37,.43,.075],[.35,.565,.07],[.32,.69,.065],[.94,.86,.10]].map(Object.freeze));

const fallbackMask=FRONTIER_CORRIDOR_MASK;
const row = (id, o) => ({
  id, enabled:false,
  corridor:FALLBACK_CORRIDOR, checkpointVertex:CHECKPOINT_VERTEX, pads:PADS,
  walkMask:fallbackMask,
  patrolProgress:PATROL_PROGRESS, patrolFoe:null,
  ambient:{ trees:[], waterfalls:[] },
  bossCave:null,
  ...o,
});
/** The table.  `foes` = the foe kinds of the route's three checkpoints (zone-travel.js DUNGEON_ROUTES). */
export const ROUTE_GEOMETRY = {
  'th:asia': row('th:asia', {
    // F12: minimally fitted centerline; all segments stay inside the owner mask (see output/f12-code.md).
    corridor:DUNGEON_CORRIDOR,
    walkMask:{cols:FRONTIER_WALK_COLS,rows:FRONTIER_WALK_ROWS,runs:FRONTIER_WALK_RUNS},
    enabled:true, background:'img/frontier-route/zone1-2-v4.webp', patrolFoe:[2,3,2,5,3,5],
    ambient:{ trees:TREES, waterfalls:WATERFALLS },
    // Checkpoint 2 is Zone 1's boss cave: locked until checkpoint 1 is done, the guide waits there, the zone event fights.
    bossCave:{ zone:'th', checkpoint:2, eventKey:'thBorderBoss', breachKey:'frontierBreach', guide:[.055,.01], interactReach:.065 },
  }),
  'asia:west': row('asia:west', {
    enabled:true, geometryVersion:1, background:'img/frontier-route/zone2-3-v2-stairs.png', foes:[6,7,9],
    corridor:BORDER23_CORRIDOR, checkpointVertex:BORDER23_CHECKPOINT_VERTEX, pads:[], walkMask:BORDER23_MASK,
  }),
  'west:cyberhell': row('west:cyberhell', {
    enabled:false, background:'img/frontier-route/zone3-4-v1.webp', foes:[10,11,12],
  }),
};
for (const r of Object.values(ROUTE_GEOMETRY)) if (!r.patrolFoe) r.patrolFoe = PATROL_FROM_CHECKPOINT.map(i => r.foes[i]);

/** Does this route use the full-picture trail system (true) or the old vertical corridor (false)? */
export const isWildernessRoute = routeId => !!ROUTE_GEOMETRY[routeId]?.enabled;
export const routeRow = routeId => ROUTE_GEOMETRY[routeId] || null;
/** The boss-cave description of a route, or null (only Zone 1-2 has one). */
export const routeBossCave = routeId => (isWildernessRoute(routeId) ? ROUTE_GEOMETRY[routeId].bossCave : null);

/** Dev / test hook: switch a route on at run time. */
export function enableRoute(routeId) { ROUTE_GEOMETRY[routeId].enabled = true; }
export function disableRoute(routeId) { if (routeId === 'th:asia') throw new Error('reference route'); ROUTE_GEOMETRY[routeId].enabled = false; }
