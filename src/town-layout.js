// Zone 1 (Suvarnabhumi) layout on the painted terrain img/map-zone1/v2 (3840x2560 world units,
// 1.28 painted px per unit). Everything below was placed from the owner's drawing
// (k1-placement-Kittanate.jpg, 2500x1667 -> world = x * 1.536).
// Ground is painted; here live only invisible rules: what can be walked on (mask), where each
// building / house / decoration stands (foot point), and the anchors used by the game.
import { TOWN_WALK_CELL, TOWN_WALK_COLS, TOWN_WALK_ROWS } from './town-walkmask.js?v=k1d-n1';
import { TOWN_OWNER_WALK_RUNS } from './town-owner-walkmask.js';
// M2: walk masks the owner draws for zones 2-4 (null until drawn = the zone uses Zone 1's mask). Generated files, see town-zone layout below.
import { TOWN_OWNER_WALK_RUNS as ASIA_WALK_RUNS } from './town-owner-walkmask-asia.js';
import { TOWN_OWNER_WALK_RUNS as WEST_WALK_RUNS } from './town-owner-walkmask-west.js';
import { TOWN_OWNER_WALK_RUNS as CYBERHELL_WALK_RUNS } from './town-owner-walkmask-cyberhell.js';
import { ASIA_TREE_POINTS } from './town-asia-trees.js';
import { WEST_TREE_POINTS } from './town-west-trees.js';
export const TOWN_MAP_VERSION = 3;
export const TOWN_SIZE = { w:3840, h:2560 };
// First water row of the soul river on the painting (y 1740..1990); used for invader spawn height.
export const TOWN_RIVER_Y = 1740;
// Invaders land on the north bank, just above the water. These are open stretches of ground at y = TOWN_RIVER_Y-50.
export const TOWN_SHORE_SPANS = [[520,720],[1620,1820],[2060,2250]];
export const TOWN_PLAZA = [1860,1090];
// Foot (x,by) is the bottom-centre of the painted building; (x,y) is the door / working point
// in front of it. mapScale resizes the existing sprite so its painted footprint matches the drawing.
const site = (x,by,bw,mapScale,doorDx=0,doorDy=44) => ({x:x+doorDx,y:by+doorDy,bx:x,by,bw,mapScale,
  sx:x+doorDx,sy:by-70,hit:[x-bw/2,by-bw*.9,x+bw/2,by]});
export const TOWN_STATION_SITES = {
  krata:site(470,565,258,1.32,0,12),   dab:site(465,1038,255,1.43),   ngiw:site(551,1496,286,1.46),
  tarang:site(1651,449,292,1.70,16,44), sawan:site(2536,412,237,.89), lokan:site(3534,507,267,1),
  lan:site(3232,912,283,2.26),    krajok:site(3482,1499,255,.86),
  tea:site(1527,1398,215,.86,0,14),    sala:site(2252,1382,209,.68,-8,36),
};
// The judgement dais is a separate painted sprite drawn by scene.js; (x,y) is its foot centre.
export const TOWN_DAIS = { x:1862, y:1057, w:307 };
export const TOWN_SPOTS = {
  plaza:{x:1862,y:1090}, bench:{x:1862,y:1078}, throne:{x:1862,y:917},
  bossPier:{x:2240,y:1680}, ferry:{from:[2225,1780],to:[2640,1780]},
};
// L1: Nira stands ON the judgement dais (the old spot was hidden behind a banyan). The platform floor is
// x 1760-1965 / y 905-980 (measured on town-judgment-th-v2); the throne seat is at (1862,917), the stairs at
// x 1822-1898 and the soul queue starts at y 1100, so she strolls only inside TOWN_NIRA_STAGE (right of the throne).
export const TOWN_NIRA_STAGE = [1914,934,1962,968];
// Zone 1 only: crew who stroll inside a rectangle instead of a radius around home.
export const TOWN_CREW_STAGE = { nira:TOWN_NIRA_STAGE };
export const TOWN_CREW = {
  nira:[1938,950], taan:[3150,972], dam:[470,1092],
  plerng:[542,640], kan:[2304,1397], boon:[2460,470],
};
export const TOWN_GUARD_POST = [1720,2190];
export const TOWN_CHALLENGE = [2100,2195];
export const TOWN_MERCHANT = {x:1700,y:1640};
export const TOWN_FRONTIER = {...site(1917,2510,292,1.82,0,-310),reach:105,
  sy:2330,hit:[1771,2230,2063,2510]};
// Souls wait in a line down the central road and bridge, nearest the dais first.
export const TOWN_QUEUE = [[1856,1100],[1856,1190],[1856,1260],[1860,1330],
  [1880,1400],[1910,1470],[1924,1540]];
export const TOWN_ENTRY = {gate:[1917,2200],nira:[1870,2200],
  goal:[1922,1078],niraGoal:[1938,950]};

// ---- walkable ground: plazas, roads, stairs, bridges and the dock (traced from the painting) ----
const mask = new Uint8Array(TOWN_WALK_COLS*TOWN_WALK_ROWS);
const fillMask = runs => {
  mask.fill(0);
  let i=0,on=0;
  for(const run of runs){ if(on)mask.fill(1,i,i+run); i+=run; on^=1; }
};
fillMask(TOWN_OWNER_WALK_RUNS);
// Zone-1 hand patches (stairs, lava road, cauldron court) were added on top of the owner's mask. A zone whose mask the
// owner drew from the full overlay (which already contains them) switches them off: townZoneLayout({patches:false}).
let usePatches = true, ownerFloorOnly = false;
export const TOWN_WALK_MASK = { cell:TOWN_WALK_CELL, cols:TOWN_WALK_COLS, rows:TOWN_WALK_ROWS, data:mask };
// Upper bridge-to-city flight, painted in the v5 r1-c2 terrain tile.
export const TOWN_UPPER_BRIDGE_STAIRS = [[1050,675],[1130,743],[1485,505],[1420,455]];
export const TOWN_UPPER_BRIDGE_LANDING = [[1380,480],[1510,490],[1510,550],[1380,550]];
// The two west-city links are visibly paved in the production painting.  Keep their complete
// lanes open rather than trying to infer cliff colour from the bitmap (the orange flowers were
// previously read as rock and cut both routes in half).
export const TOWN_LAVA_STAIRS = [[1018,954],[1095,950],[1500,995],[1505,1072],[1434,1092],[1120,1142],[1044,1115],[1004,1018]];
export const TOWN_LAVA_STAIR_LANDING = [[1018,954],[1095,955],[1156,1010],[1112,1095],[1042,1082],[1004,1018]];
export const TOWN_LAVA_LOWER_ROAD = [[690,1130],[790,1108],[1092,1110],[1265,1178],[1432,1160],[1480,1218],[1250,1250],[1060,1196],[790,1196],[700,1172]];
// P5: the cobbled east half of the cauldron (krata) courtyard.  The owner-reference mask (town-owner-walkmask.js) paints it
// blocked as one big lobe between the cauldron's own footprint and the torch ring, so Yama stopped dead at the torch line and the
// east bridge could not be entered from the plaza (owner image 10, 22 Oct).  The painting shows plain open pavement there.
// Only the pavement is opened: the west edge stays 12 units clear of the cauldron's masked footprint (x <= 570), the cauldron
// body itself is still solid through the station blocks, and torch/prop colliders still apply.
export const TOWN_CAULDRON_COURT = [[582,412],[686,412],[696,444],[696,492],[712,502],[712,596],[516,596],[516,560],[582,556]];
// Rebuilt by applyTownZoneLayout when a zone moves a station / spot (the array itself is never replaced).
const interactionPads=[...Object.values(TOWN_STATION_SITES),...Object.values(TOWN_SPOTS)].filter(s=>typeof s.x==='number');
export const townFloorAt = (x,y) => {
  if(!(x>=0&&y>=0&&x<TOWN_SIZE.w&&y<TOWN_SIZE.h))return false;
  // An owner-complete floor must never be reopened by legacy door/UI pads.
  if(ownerFloorOnly)return mask[((y/TOWN_WALK_CELL)|0)*TOWN_WALK_COLS+((x/TOWN_WALK_CELL)|0)]===1;
  // Keep feet on the pier top; edge tolerance must never open its front face or water.
  if(x>=2150&&x<2350&&y>=1700&&y<1860
    &&(x<2188||x>2292||y>1796))return false;
  // Screenshot overlays and the red building footprints cover some interaction
  // anchors. Keep only their small door pads; prop collision remains authoritative.
  // The shop speech/button banner obscures a strip of the paved merchant court
  // in the reference screenshot; it is UI, not a terrain barrier.
  if(x>=1620&&x<=1730&&y>=1508&&y<=1560)return true;
  if(interactionPads.some(s=>(x-s.x)**2+(y-s.y)**2<48**2))return true;
  if(usePatches&&(townInPolygon(x,y,TOWN_UPPER_BRIDGE_STAIRS)||townInPolygon(x,y,TOWN_UPPER_BRIDGE_LANDING)
    ||townInPolygon(x,y,TOWN_LAVA_STAIRS)||townInPolygon(x,y,TOWN_LAVA_STAIR_LANDING)
    ||townInPolygon(x,y,TOWN_LAVA_LOWER_ROAD)||townInPolygon(x,y,TOWN_CAULDRON_COURT)))return true;
  return mask[((y/TOWN_WALK_CELL)|0)*TOWN_WALK_COLS+((x/TOWN_WALK_CELL)|0)]===1;
};
// Landmarks that must stay connected to the plaza (stairs, bridges, dock); checked by tests.
export const TOWN_STAIRS = [
  {key:'upper-bridge-stairs',point:[1280,600]}, {key:'lava-east-stairs',point:[1270,1050]}, {key:'krata-descent',point:[516,670]}, {key:'krata-lower',point:[480,800]},
  {key:'dab-descent',point:[524,1172]}, {key:'ngiw-descent',point:[596,1280]}, {key:'ngiw-mid',point:[610,1570]},
  {key:'tarang',point:[1744,560]}, {key:'civic-north',point:[1854,770]}, {key:'civic-south',point:[1854,1160]},
  {key:'west-terrace',point:[1656,1484]}, {key:'east-terrace',point:[2212,1484]},
  {key:'bridge-north',point:[1920,1544]}, {key:'bridge-south',point:[1920,1944]}, {key:'gate',point:[1920,2364]},
  {key:'dock',point:[2224,1724]}, {key:'sawan',point:[2500,616]}, {key:'heaven-link',point:[2252,834]},
  {key:'ice-quarry',point:[3516,650]}, {key:'quarry-lower',point:[3090,1050]}, {key:'forest',point:[3320,1250]},
];

// ---- houses: small dark houses placed by the owner. Foot-centre, drawn width, sprite and facing ----
const HOUSE_RATIO = {'front-one':1122/1402,'right-one':1094/1438,'left-two':1518/1036,'right-two':1518/1036};
const house = (key,x,y,w,flip=false) => ({key,x,y,w,flip,h:w*HOUSE_RATIO[key]});
export const TOWN_HOUSE_SITES = [
  house('front-one',1551,655,142), house('left-two',1945,699,119), house('front-one',2118,766,129),
  house('left-two',1536,960,98,true), house('front-one',1546,1073,129), house('right-one',2239,1014,147,true),
  house('front-one',2010,1294,138), house('right-two',1551,1661,120,true), house('right-two',2283,1588,114,true),
  house('front-one',639,751,142),  house('right-one',710,1204,149),
];
// Only the ground floor of a house is solid; the roof can be walked behind and is faded by scenery.
const houseRect = h=>{
  const band=Math.min(46,h.h*.34);
  return [h.x-h.w/2+h.w*.06,h.y-band,h.x+h.w/2-h.w*.06,h.y];
};
export const TOWN_HOUSES = TOWN_HOUSE_SITES.map(houseRect);

// ---- decorations (the owner's marks): each owns one foot point, art width and a small ground root ----
// kind: tree | rock | palm | lamp | torch. biome picks the baked tint (lava = red leaves, ice = snow).
// key: art to resolve (tree and rock use existing sprites; palm, lamp and torch have key null: placeholders
// drawn in code until the real drawings arrive - see the Toby K1d report for the asset specs).
// h is only needed for placeholders drawn in code (no sprite yet); sprites derive their height from the art.
const deco = (id,kind,x,y,w,biome,rx,ry,key,h) => ({id,kind,x,y,w,rx,ry,biome,h,
  key:key===undefined?(kind==='tree'?'town-tree-th':kind==='rock'?'town-prop-rock':null):key});
const trees = (list,tag)=>list.map(([x,y,w,biome],i)=>deco(`${tag}-${i}`,'tree',x,y,w,biome,16,11));
export const TOWN_PROP_SITES = [
  // green / orange trees (owner: green marks)
  ...trees([
    // The tree that used to stand at 1436,691 is intentionally omitted.  Its canopy sat over
    // the newly painted upper-west stair and made the shortest route appear to cut through the
    // trunk.  Map-Zone1-3 keeps this whole landing clear so movement follows the stone flight.
    [1738,835,156,'city'],[2060,743,136,'city'],
    [1757,1133,159,'city'],[1962,1137,159,'city'],[2185,977,136,'city'],[2945,1146,202,'city'],
    [1413,1457,175,'city'],[1818,1478,161,'city'],[2016,1478,161,'city'],[2314,1453,161,'city'],
    [2346,1678,159,'city'],[3231,1453,198,'city'],[3567,1632,200,'city'],
    // The upper bridge landing is a route, not a grove.  Four old trees here made Yama walk
    // through trunks and could close the corridor entirely once their root colliders loaded.
    [1805,493,106,'city'],[1837,499,106,'city'],[1939,470,115,'city'],
  ],'tree'),
  // red leaves beside the lava (owner: red marks)
  ...trees([
    [298,950,144,'lava'],[355,1096,150,'lava'],[693,879,156,'lava'],[674,1102,161,'lava'],
    [749,1336,156,'lava'],[365,1498,152,'lava'],[388,1557,152,'lava'],[803,1534,144,'lava'],
  ],'lava-tree'),
  // snow trees by the ice gate (owner: white marks)
  ...trees([[3375,545,131,'ice'],[3677,586,140,'ice']],'snow-tree'),
  // palm and banyan flanking the great stair to the river (owner: pasted pictures)
  deco('palm','palm',1780,1663,132,'city',14,10,null,171),
  deco('banyan','tree',2068,1663,167,'city',16,11),
  // rocks beside the quarry
  ...[[3014,868,77],[3496,887,119],[3312,981,79],[3241,996,52]].map(([x,y,w],i)=>deco(`rock-${i}`,'rock',x,y,w,'ice',w*.34,w*.14)),
  // Additional fire pillars flank the civic stairs, river approach and entry plaza.
  ...[[1710,1080],[2100,1080],[1788,1405],[2050,1405],[1790,1560],[2050,1560],
      [1770,2080],[2070,2080],[1770,2250],[2070,2250]]
    .map(([x,y],i)=>deco(`hell-pillar-${i}`,'torch',x,y,34,'lava',7,5,null,112)),
  // gold lanterns around the heaven gate (owner: yellow marks)
  ...[[2356,397],[2398,349],[2388,474],[2429,509],[2490,497],[2605,522],[2678,518],[2726,490],[2723,409],[2675,365]]
    .map(([x,y],i)=>deco(`lamp-${i}`,'lamp',x,y,34,'heaven',7,5,null,74)),
  // torches around the cauldron courtyard (owner: red marks)
  ...[[470,359],[557,378],[305,403],[261,455],[300,518],[349,566],[417,599],[492,614],[605,422],[662,436],[712,484],[733,541],[599,618],[664,599]]
    .map(([x,y],i)=>deco(`torch-${i}`,'torch',x,y,34,'lava',7,5,null,70)),
];
const propCollider = p=>({
  id:p.id,x:p.x,y:p.y,rx:p.rx,ry:p.ry,
  bounds:[p.x-p.rx,p.y-p.ry,p.x+p.rx,p.y+p.ry],
});
export const TOWN_PROP_COLLIDERS = TOWN_PROP_SITES.map(propCollider);
export function townPropBlocks(x,y) {
  return TOWN_PROP_COLLIDERS.some(p=>x>=p.bounds[0]&&x<=p.bounds[2]
    &&y>=p.bounds[1]&&y<=p.bounds[3]&&((x-p.x)/p.rx)**2+((y-p.y)/p.ry)**2<=1);
}
export const townInRect = (x,y,[x1,y1,x2,y2])=>x>=x1&&x<=x2&&y>=y1&&y<=y2;
export function townInPolygon(x,y,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [ax,ay]=points[i],[bx,by]=points[j];
    const cross=(x-ax)*(by-ay)-(y-ay)*(bx-ax);
    if(Math.abs(cross)<1e-8&&x>=Math.min(ax,bx)&&x<=Math.max(ax,bx)
      &&y>=Math.min(ay,by)&&y<=Math.max(ay,by))return true;
    if((ay>y)!==(by>y)&&x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
export function townContains(x,y) {
  if(!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(!townFloorAt(x,y))return false;
  return !TOWN_HOUSES.some(r=>townInRect(x,y,r))&&!townPropBlocks(x,y);
}

// ================= M2: layout per zone =================
// Zones 2-4 use Zone 1's whole city (same roads, stations, dais, houses, props). A zone's entry below only lists what
// differs; `null` / missing = inherit Zone 1.  Everything is applied IN PLACE into the shared objects above (same pattern as
// syncSceneZone in data.js), so the ~12 modules that import TOWN_* never have to change.
//   walkRuns : run-length mask (see town-owner-walkmask-<zone>.js, written by scripts/extract-town-owner-mask.py --zone)
//   patches  : false = leave out Zone 1's hand-made walkable polygons (the zone's own mask already contains the stairs)
//   stations : { key: {x,y,bx,by,bw,mapScale,sx,sy,hit} }   patch per station site
//   spots    : { key: {...} }                                 patch per spot (bench, throne, bossPier, ...)
//   dais     : { x, y, w }
//   houses   : [{key,x,y,w,flip}, ...]                        replaces the whole house list
//   props    : [...]                                          replaces the whole decoration list (same shape as TOWN_PROP_SITES)
// Preserve all non-tree decorations (including the 34 lamps/torches) at Zone 1 feet.
const ASIA_TREE_KEYS = {green:'town-tree-th', red:'town-tree-red-th', white:'town-tree-sakura', teal:'town-tree-willow'};
const ASIA_TREE_FALLBACK = {white:'town-tree-snow-th', teal:'town-tree-th'};
const ASIA_PROPS = [
  ...TOWN_PROP_SITES.filter(p=>p.kind!=='tree'&&p.kind!=='palm'),
  ...ASIA_TREE_POINTS.map((p,i)=>({
    ...deco(`asia-tree-${i}`, 'tree', p.x*TOWN_SIZE.w, p.y*TOWN_SIZE.h,
      160*(p.big?1.4:1), 'city', 16, 11, ASIA_TREE_KEYS[p.kind]),
    treeKind:p.kind, big:!!p.big, on_walk:p.on_walk, fallbackKey:ASIA_TREE_FALLBACK[p.kind],
  })),
];
const WEST_PROPS = [
  ...TOWN_PROP_SITES.filter(p=>p.kind!=='tree'&&p.kind!=='palm'),
  ...WEST_TREE_POINTS.map((p,i)=>({
    ...deco(`west-tree-${i}`, 'tree', p.x*TOWN_SIZE.w, p.y*TOWN_SIZE.h,
      160, 'city', 16, 11, p.key),
    treeKind:p.kind, species:p.species, ownerFoot:true,
  })),
];
export const TOWN_ZONE_LAYOUT = {
  th:        {},
  asia:      { walkRuns:ASIA_WALK_RUNS, patches:ASIA_WALK_RUNS?false:true, props:ASIA_PROPS, pathCell:8 },
  west:      { walkRuns:WEST_WALK_RUNS, patches:WEST_WALK_RUNS?false:true, props:WEST_PROPS, pathCell:8, strictFloor:true, stations:{ngiw:{y:1532}}, crew:{boon:[2460,468]} },
  cyberhell: { walkRuns:CYBERHELL_WALK_RUNS, patches:CYBERHELL_WALK_RUNS?false:true },
};
const clone = v => structuredClone(v);
const BASE = {
  runs:TOWN_OWNER_WALK_RUNS, stations:clone(TOWN_STATION_SITES), spots:clone(TOWN_SPOTS), dais:{...TOWN_DAIS}, crew:clone(TOWN_CREW),
  houses:TOWN_HOUSE_SITES.map(h=>({...h})), props:TOWN_PROP_SITES.map(p=>({...p})),
};
const layoutListeners = new Set();
/** Call fn() after a zone layout was applied (light field, shadow field, ...). */
export const onTownLayoutChange = fn => { layoutListeners.add(fn); return () => layoutListeners.delete(fn); };
let appliedZone = 'th';
export const townLayoutZone = () => appliedZone;
// Owner-painted Asia and west bridges need the full 8-unit mask resolution; other zones retain16.
export const townPathCell = () => TOWN_ZONE_LAYOUT[appliedZone]?.pathCell || 16;
export function applyTownZoneLayout(zone, table = TOWN_ZONE_LAYOUT, force = false) {
  const L = table[zone] || {};
  // Same zone again: nothing to do (syncSceneZone runs on every zone change).
  if (!force && table === TOWN_ZONE_LAYOUT && zone === appliedZone) return false;
  appliedZone = zone;
  // mask + patches
  fillMask(L.walkRuns || BASE.runs);
  usePatches = L.patches !== false;
  ownerFloorOnly = L.strictFloor === true;
  // stations: back to Zone 1, then this zone's patches
  for (const k of Object.keys(TOWN_STATION_SITES)) Object.assign(TOWN_STATION_SITES[k], clone(BASE.stations[k]));
  for (const [k, patch] of Object.entries(L.stations || {})) if (TOWN_STATION_SITES[k]) Object.assign(TOWN_STATION_SITES[k], clone(patch));
  for (const k of Object.keys(TOWN_SPOTS)) Object.assign(TOWN_SPOTS[k], clone(BASE.spots[k]));
  for (const [k, patch] of Object.entries(L.spots || {})) if (TOWN_SPOTS[k]) Object.assign(TOWN_SPOTS[k], clone(patch));
  Object.assign(TOWN_DAIS, BASE.dais, L.dais || {});
  // Zone-specific homes keep NPC feet clear of the owner mask's cliff edge.
  for (const [key,home] of Object.entries(BASE.crew)) TOWN_CREW[key].splice(0,2,...(L.crew?.[key] || home));
  // houses / props: lists keep their identity
  const houses = (L.houses || BASE.houses).map(h => ({...h, h:h.w*HOUSE_RATIO[h.key]}));
  TOWN_HOUSE_SITES.splice(0, TOWN_HOUSE_SITES.length, ...houses);
  TOWN_HOUSES.splice(0, TOWN_HOUSES.length, ...TOWN_HOUSE_SITES.map(houseRect));
  TOWN_PROP_SITES.splice(0, TOWN_PROP_SITES.length, ...(L.props || BASE.props).map(p => ({...p})));
  TOWN_PROP_COLLIDERS.splice(0, TOWN_PROP_COLLIDERS.length, ...TOWN_PROP_SITES.map(propCollider));
  interactionPads.splice(0, interactionPads.length,
    ...[...Object.values(TOWN_STATION_SITES), ...Object.values(TOWN_SPOTS)].filter(s => typeof s.x === 'number'));
  for (const fn of layoutListeners) fn(zone);
  return true;
}
