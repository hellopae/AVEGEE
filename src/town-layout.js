// Zone 1 (Suvarnabhumi) layout on the painted terrain img/map-zone1/v2 (3840x2560 world units,
// 1.28 painted px per unit). Everything below was placed from the owner's drawing
// (k1-placement-Kittanate.jpg, 2500x1667 -> world = x * 1.536).
// Ground is painted; here live only invisible rules: what can be walked on (mask), where each
// building / house / decoration stands (foot point), and the anchors used by the game.
import { TOWN_WALK_CELL, TOWN_WALK_COLS, TOWN_WALK_ROWS, TOWN_WALK_RUNS } from './town-walkmask.js?v=k1d-n1';
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
{
  let i=0,on=0;
  for(const run of TOWN_WALK_RUNS){ if(on)mask.fill(1,i,i+run); i+=run; on^=1; }
}
export const TOWN_WALK_MASK = { cell:TOWN_WALK_CELL, cols:TOWN_WALK_COLS, rows:TOWN_WALK_ROWS, data:mask };
// Upper bridge-to-city flight, painted in the v5 r1-c2 terrain tile.
export const TOWN_UPPER_BRIDGE_STAIRS = [[1050,675],[1130,743],[1485,505],[1420,455]];
export const TOWN_UPPER_BRIDGE_LANDING = [[1380,480],[1510,490],[1510,550],[1380,550]];
export const TOWN_LAVA_EAST_CLIFF = [[1090,1005],[1160,1000],[1420,1130],[1450,1235],[1370,1230],[1250,1130],[1120,1080]];
export const TOWN_LAVA_STAIRS = [[1080,1070],[1110,1125],[1480,1025],[1440,965]];
export const TOWN_LAVA_STAIR_LANDING = [[1045,985],[1090,995],[1145,1080],[1100,1115],[1040,1030]];
export const townFloorAt = (x,y) => {
  if(!(x>=0&&y>=0&&x<TOWN_SIZE.w&&y<TOWN_SIZE.h))return false;
  if(townInPolygon(x,y,TOWN_UPPER_BRIDGE_STAIRS)||townInPolygon(x,y,TOWN_UPPER_BRIDGE_LANDING)||townInPolygon(x,y,TOWN_LAVA_STAIRS)||townInPolygon(x,y,TOWN_LAVA_STAIR_LANDING))return true;
  // The new stair flight crosses only its painted corridor; the surrounding cliff stays solid.
  // Use the northern bridge and the painted western stairs to reach these terraces.
  if(townInPolygon(x,y,TOWN_LAVA_EAST_CLIFF))return false;
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
  house('left-two',1536,960,98),   house('front-one',1546,1073,129), house('right-one',2239,1014,147,true),
  house('front-one',2010,1294,138), house('right-two',1551,1661,120), house('right-two',2283,1588,114),
  house('front-one',3016,1607,129), house('front-one',639,751,142),  house('right-one',710,1204,149),
];
// Only the ground floor of a house is solid; the roof can be walked behind and is faded by scenery.
export const TOWN_HOUSES = TOWN_HOUSE_SITES.map(h=>{
  const band=Math.min(46,h.h*.34);
  return [h.x-h.w/2+h.w*.06,h.y-band,h.x+h.w/2-h.w*.06,h.y];
});

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
    [1436,691,136,'city'],[1738,835,156,'city'],[2060,743,136,'city'],
    [1757,1133,159,'city'],[1962,1137,159,'city'],[2185,977,136,'city'],[2945,1146,202,'city'],
    [1413,1457,175,'city'],[1818,1478,161,'city'],[2016,1478,161,'city'],[2314,1453,161,'city'],
    [2346,1678,159,'city'],[3231,1453,198,'city'],[3567,1632,200,'city'],
    [1421,455,96,'city'],[1482,480,100,'city'],[1540,493,106,'city'],[1584,493,106,'city'],
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
export const TOWN_PROP_COLLIDERS = TOWN_PROP_SITES.map(p=>({
  id:p.id,x:p.x,y:p.y,rx:p.rx,ry:p.ry,
  bounds:[p.x-p.rx,p.y-p.ry,p.x+p.rx,p.y+p.ry],
}));
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
