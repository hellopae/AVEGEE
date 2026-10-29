import {BORDER12_MASK} from './frontier-walkmask-th-asia-b12.js';
import {BORDER34_MASK,BORDER34_CORRIDOR,BORDER34_CHECKPOINT_VERTEX,BORDER34_TREES} from './frontier-walkmask-west-cyberhell.js';
import {BORDER23_MASK,BORDER23_CORRIDOR,BORDER23_CHECKPOINT_VERTEX} from './frontier-walkmask-asia-west.js';
import {FRONTIER_CORRIDOR_MASK} from './frontier-walkmask-th-asia.js';
// M2 R1 — ROUTE GEOMETRY: one row per frontier route (the walk between two cities).
//
// Route 'th:asia' (Zone 1-2) is the reference: a 31-point trail on one full-screen picture, three checkpoints on trail
// vertices 7 / 15 / 23, six optional patrols, surface FX registered to the painting, and a boss cave at
// checkpoint 2 (Zone 1's inspector). Zones 2-3 and 3-4 have independent owner masks and centerlines.
//
// A route with `enabled:false` keeps the OLD system (a straight vertical corridor over three pictures, one per
// checkpoint, no patrols).  Switching a route on is data only:
//   1. put the picture in place (`background`, 16:9 RGB at 1672x941 or 3344x1882, the trail must follow `corridor`)
//   2. set `enabled: true`
export const FALLBACK_CORRIDOR = Object.freeze([[.12,.22],[.19,.25],[.21,.28],[.20,.31],[.26,.33],[.32,.38],[.37,.43],[.42,.43],[.47,.40],[.48,.36],[.54,.35],[.59,.34],[.63,.39],[.69,.43],[.74,.47],[.79,.51],[.77,.55],[.74,.58],[.72,.62],[.67,.63],[.63,.64],[.60,.68],[.58,.72],[.53,.75],[.62,.77],[.67,.80],[.72,.85],[.78,.87],[.84,.85],[.88,.80],[.91,.79]].map(Object.freeze));
// B12 v3: non-checkpoint vertices fitted to the broad repainted stair/rail interiors.
// Entry, exit and all three checkpoint vertices retain their owner positions.
export const DUNGEON_CORRIDOR = Object.freeze([[0.12,0.22],[0.1794258,0.2369819],[0.2093301,0.272051],[0.2314593,0.325186],[0.2703349,0.3411265],[0.3289474,0.3878852],[0.3767943,0.4112646],[0.4204958,0.4323339],[0.4665072,0.4102019],[0.4886364,0.3793836],[0.5406699,0.360255],[0.5938995,0.3390011],[0.632177,0.381509],[0.6889952,0.4218916],[0.7416268,0.4675877],[0.791388,0.5047959],[0.8313397,0.5494155],[0.7811005,0.5951116],[0.729067,0.6365569],[0.6836124,0.6546227],[0.6537081,0.685441],[0.617823,0.7088204],[0.5855263,0.7332625],[0.53,0.75],[0.6196172,0.7630181],[0.6698565,0.8182784],[0.7200957,0.8618491],[0.7799043,0.8777896],[0.8438995,0.8607864],[0.8869617,0.8182784],[0.91,0.79]].map(Object.freeze));
export const LEGACY_CORRIDOR = Object.freeze([[.5,.925],[.5,.78],[.43,.65],[.53,.49],[.48,.35],[.5,.19]].map(Object.freeze));
export const LEGACY_CHECKPOINT_PROGRESS = Object.freeze([.25,.52,.79]);

// Oval pads on the trail that are walkable beyond the ±0.026 strip: start, bend, first checkpoint, cave yard, exit gate.
const PADS = Object.freeze([[.12,.22,.052,.036],[.26,.33,.062,.035],[.42,.43,.042,.028],[.53,.75,.085,.042],[.91,.79,.042,.033]].map(Object.freeze));
const CHECKPOINT_VERTEX = Object.freeze([7,15,23]);
const PATROL_PROGRESS = Object.freeze([.08,.19,.32,.48,.66,.90]);
// Which checkpoint's foe each patrol borrows (Zone 1-2: checkpoint foes 2,3,5 -> patrol foes 2,3,2,5,3,5).
const PATROL_FROM_CHECKPOINT = Object.freeze([0,1,0,2,1,2]);

const fallbackMask=FRONTIER_CORRIDOR_MASK;
const row = (id, o) => ({
  id, enabled:false,
  corridor:FALLBACK_CORRIDOR, checkpointVertex:CHECKPOINT_VERTEX, pads:PADS,
  walkMask:fallbackMask,
  patrolProgress:PATROL_PROGRESS, patrolFoe:null,
  ambient:{ trees:[], waterfalls:[] },
  bossCave:null, captainCave:null,
  ...o,
});
/** The table.  `foes` = the foe kinds of the route's three checkpoints (zone-travel.js DUNGEON_ROUTES). */
export const ROUTE_GEOMETRY = {
  'th:asia': row('th:asia', {
    // B12 pilot: retain story anchors; use the floor traced on the wider repaint.
    corridor:DUNGEON_CORRIDOR,
    walkMask:BORDER12_MASK,
    enabled:true, geometryVersion:2, background:'img/frontier-route/zone1-2-v6.webp', patrolFoe:[2,3,2,5,3,5],
    ambient:{ trees:[], waterfalls:[], leafArea:null, flowUrl:'img/frontier-route/zone1-2-v6-flow.png', treeArt:{red:'img/frontier-route/tree-maple-v2.png',green:'img/frontier-route/tree-pine-v2.png',lightgreen:'img/frontier-route/tree-bamboo-v2.png'}, treeAnchors:{"green":[0.567556297,0.958841463],"red":[0.569224354,0.987804878],"lightgreen":[0.510842369,0.971036585]} },
    // Checkpoint 2 is Zone 1's boss cave: locked until checkpoint 1 is done, the guide waits there, the zone event fights.
    bossCave:{ zone:'th', checkpoint:2, eventKey:'thBorderBoss', breachKey:'frontierBreach', guide:[.055,.01], interactReach:.065 },
  }),
  'asia:west': row('asia:west', {
    enabled:true, geometryVersion:1, background:'img/frontier-route/zone2-3-v3-cave.png', foes:[6,7,9],
    captainCave:{zone:'asia',breachKey:'asiaRageBreach',position:[.55,.72],interactReach:.055},
    corridor:BORDER23_CORRIDOR, checkpointVertex:BORDER23_CHECKPOINT_VERTEX, pads:[], walkMask:BORDER23_MASK,
    // L3: authored falls and weather regions on the cave repaint. The road/mask
    // stays unchanged; warm leaves stay west of the snow-covered mountains.
    ambient:{trees:[],waterfalls:[[.066,.53,.08],[.264,.61,.10],
      [.621,.472,.08],[.615,.82,.07]],
      leafArea:[0,0,.44,1],snowArea:[.48,0,1,1]},
  }),
  'west:cyberhell': row('west:cyberhell', {
    enabled:true, geometryVersion:1, background:'img/frontier-route/zone3-4-v1.webp', foes:[10,11,12],
    corridor:BORDER34_CORRIDOR, checkpointVertex:BORDER34_CHECKPOINT_VERTEX, pads:[], walkMask:BORDER34_MASK,
    ambient:{trees:BORDER34_TREES,waterfalls:[],leafArea:null,snowArea:[0,0,.46,1],rainArea:[.54,0,1,1],
      treeArt:{white:'img/theme-v4/town-tree-snow-th-v1.webp',teal:'img/frontier-route/tree-pine-v2.png',purple:'img/theme-v4/town-tree-cyberhell-v1.webp'},
      treeAnchors:{white:[.569224354,.987804878],teal:[.567556297,.958841463],purple:[.5,.987804878]}},
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

/** Post-invasion captain refuge; separate from the ruler's story encounter. */
export const routeCaptainCave = routeId => isWildernessRoute(routeId)?routeRow(routeId)?.captainCave:null;
export const captainCaveForZone = zone => Object.values(ROUTE_GEOMETRY).find(r=>r.enabled&&r.captainCave?.zone===zone)?.captainCave||null;
