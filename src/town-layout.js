// Map-Zone1: separate ground materials, rooted props and a southern spirit harbour.
// These same floor rectangles drive navigation and the composited road layer.
export const TOWN_MAP_VERSION = 2;
export const TOWN_SIZE = { w:3840, h:2560 };
export const TOWN_RIVER_Y = 1820;
export const TOWN_PLAZA = [1920,1200];
const site = (x,y,bw=320) => ({x,y,bx:x,by:y-60,bw,mapScale:1.2,
  sx:x,sy:y-120,hit:[x-bw/2,y-380,x+bw/2,y-60]});
export const TOWN_STATION_SITES = {
  krata:site(550,580), dab:site(530,1150), ngiw:site(570,1710),
  tarang:site(1700,530), sawan:site(2600,560), lokan:site(3480,740),
  lan:site(3100,1180), krajok:site(3450,1830),
  tea:site(1670,1640), sala:site(2180,1640),
};
export const TOWN_SPOTS = {
  plaza:{x:1920,y:1200}, bench:{x:1920,y:1150}, throne:{x:1920,y:1030},
  bossPier:{x:2180,y:1850}, ferry:{from:[2180,1850],to:[2310,1820]},
};
export const TOWN_CREW = {
  nira:[2050,1170], taan:[3190,1220], dam:[590,1230],
  plerng:[600,660], kan:[2230,1710], boon:[2630,630],
};
export const TOWN_GUARD_POST = [1810,2360];
export const TOWN_CHALLENGE = [2110,2300];
export const TOWN_MERCHANT = {x:1680,y:1720};
export const TOWN_FRONTIER = {...site(1950,2360,300),reach:105};
export const TOWN_QUEUE = [[1920,1250],[1920,1290],[1920,1330],
  [1920,1370],[1920,1410],[1920,1450],[1920,1490]];
export const TOWN_ENTRY = {gate:[1950,2360],nira:[1916,2352],
  goal:[1980,1150],niraGoal:[2050,1170]};
// Corridors follow the bridges/stairs in mainland-v1, including bent crossings.
export const TOWN_PATHS = [
  {key:'west-forest',width:180,points:[[550,580],[540,950],[530,1150],[570,1710]]},
  {key:'lava-bridge',width:135,points:[[530,1150],[800,1150],[1150,1090],[1360,990],[1560,1030],[1650,1160],[1920,1250]]},
  {key:'volcano-bridge',width:120,points:[[550,580],[850,620],[1040,660],[1240,760],[1440,800],[1650,800],[1920,960]]},
  {key:'city-spine',width:170,points:[[1700,530],[1700,750],[1920,960],[1920,1250],[1920,1560],[1950,1950],[1950,2360]]},
  {key:'tea-garden',width:150,points:[[1920,1470],[1750,1450],[1670,1640],[1680,1720],[1920,1750]]},
  {key:'court-garden',width:150,points:[[1920,1470],[2110,1450],[2180,1640],[2230,1710],[1920,1750]]},
  {key:'harbour',width:130,points:[[1950,1770],[2180,1770],[2180,1850],[2310,1820]]},
  {key:'heaven-road',width:150,points:[[1920,960],[2070,780],[2320,650],[2600,560]]},
  {key:'ice-bridge',width:130,points:[[2600,560],[2850,530],[2980,420],[3130,420],[3310,590],[3480,740]]},
  {key:'quarry-bridge',width:135,points:[[1920,1250],[2220,1160],[2360,1030],[2520,1040],[2800,1150],[3100,1180],[3190,1220]]},
  {key:'forest-bridge',width:150,points:[[3100,1180],[3450,1180],[3540,1280],[3690,1490],[3690,1930],[3450,1950],[3450,1830]]},
];
// Compatibility for floor consumers; roads use polygons rather than bounding boxes.
export const TOWN_ROADS = [];
export const TOWN_COURTYARDS = Object.values(TOWN_STATION_SITES)
  .map(({x,y})=>[x-200,y-360,x+200,y+110]);
export const TOWN_WALK_RECTS = [...TOWN_COURTYARDS,
  [1570,960,2260,1440], [1870,1340,2080,1610],
  [1760,2200,2180,2410]];
const corridor = (a,b,width) => {
  const dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  const px=-dy/length*width/2,py=dx/length*width/2;
  return [[a[0]+px,a[1]+py],[b[0]+px,b[1]+py],
    [b[0]-px,b[1]-py],[a[0]-px,a[1]-py]];
};
export const TOWN_WALK_POLYS = [
  ...TOWN_PATHS.flatMap(({points,width})=>points.slice(1).map((p,i)=>corridor(points[i],p,width))),
  [[1760,2260],[2180,2260],[2170,2410],[2110,2430],[1810,2430],[1750,2390]],
];
// Overlapping vertex squares prevent gaps at the bends of a corridor.
for(const {points,width} of TOWN_PATHS)for(const [x,y] of points)
  TOWN_WALK_RECTS.push([x-width/2,y-width/2,x+width/2,y+width/2]);
export const TOWN_STAIRS = [
  {key:'prison',rect:[1630,530,1770,750],steps:5},
  {key:'sanctuary',rect:[2520,560,2680,640],steps:5},
  {key:'ice',rect:[3400,740,3560,820],steps:5},
  {key:'civic',rect:[1820,1280,2020,1420],steps:6},
  {key:'quarry',rect:[3020,1180,3180,1260],steps:5},
  {key:'waterfront',rect:[1870,2200,2030,2310],steps:5},
];
export const TOWN_HOUSES = [
  [1470,825,1630,975], [2090,890,2270,1050],
  [1370,1320,1570,1510], [2310,1400,2500,1590],
];
export const TOWN_NO_WALK = [
  [0,0,3840,100],[0,100,100,2560],[3740,100,3840,2560],
  [100,2460,3740,2560],[100,TOWN_RIVER_Y,3740,2460],...TOWN_HOUSES,
];
// Each prop owns one foot anchor, art size and compact ground collider. Crowns
// and mountain silhouettes are tall but never enlarge their collision footprint.
const prop = (id,kind,x,y,w,rx,ry,biome='city') =>
  ({id,kind,x,y,w,rx,ry,biome,key:kind==='tree'?'town-tree-th':`town-prop-${kind}`});
export const TOWN_PROP_SITES = [
  prop('volcano','volcano',220,480,520,120,50,'lava'),
  prop('ice-ridge','ice-ridge',3420,360,560,190,44,'ice'),
  prop('waterfall','waterfall',3230,1700,230,70,32,'forest'),
  prop('city-ridge-west','mountain-ridge',1400,300,480,90,30,'city'),
  prop('city-ridge-east','mountain-ridge',2200,300,480,160,30,'city'),
  ...[
    [240,850,170,'lava'],[230,1040,165,'lava'],[260,1400,180,'lava'],
    [360,1660,175,'lava'],[900,1570,170,'lava'],[990,1730,150,'lava'],
    [850,300,165,'lava'],[880,880,150,'lava'],[1130,500,155,'lava'],
    [1250,600,160,'city'],[1380,1150,155,'city'],[1340,1640,165,'city'],
    [2440,900,170,'city'],[2530,1430,175,'city'],[2480,1700,160,'city'],
    [1520,1880,155,'city'],[1760,1820,150,'city'],[2400,1820,160,'city'],
    [2230,360,165,'heaven'],[2230,430,170,'heaven'],[2930,320,175,'heaven'],
    [2780,780,160,'heaven'],[2970,650,160,'ice'],[3140,760,170,'ice'],
    [3690,350,160,'ice'],[3640,1040,175,'ice'],[3310,1000,165,'ice'],
    [2840,1430,180,'forest'],[2970,1630,175,'forest'],[3100,1840,170,'forest'],
    [3290,1460,180,'forest'],[3060,1910,175,'forest'],[2920,1870,180,'forest'],
    [3140,1450,165,'forest'],[3100,1510,170,'forest'],[3650,1300,160,'forest'],
  ].map(([x,y,w,biome],i)=>prop(`tree-${i}`,'tree',x,y,w,18,13,biome)),
  // Authored fixed clusters beside paths; no runtime randomness or save drift.
  ...[
    [148,760,124,'lava'],
    [236,760,132,'lava'],
    [412,760,140,'lava'],
    [676,760,148,'lava'],
    [764,760,124,'lava'],
    [120,844,132,'lava'],
    [148,928,140,'lava'],
    [236,928,148,'lava'],
    [764,928,124,'lava'],
    [120,1012,132,'lava'],
    [296,1012,140,'lava'],
    [148,1096,148,'lava'],
    [120,1180,124,'lava'],
    [296,1180,132,'lava'],
    [148,1264,140,'lava'],
    [236,1264,148,'lava'],
    [764,1264,124,'lava'],
    [120,1348,132,'lava'],
    [208,1348,140,'lava'],
    [296,1348,148,'lava'],
    [148,1432,124,'lava'],
    [324,1432,132,'lava'],
    [120,1516,140,'lava'],
    [208,1516,148,'lava'],
    [296,1516,124,'lava'],
    [2780,1320,124,'forest'],
    [2868,1320,132,'forest'],
    [2956,1320,140,'forest'],
    [3044,1320,148,'forest'],
    [3132,1320,124,'forest'],
    [3220,1320,132,'forest'],
    [3072,1404,140,'forest'],
    [2896,1572,148,'forest'],
    [3072,1572,124,'forest'],
    [3160,1572,132,'forest'],
    [2780,1656,140,'forest'],
    [2868,1656,148,'forest'],
    [3044,1656,124,'forest'],
    [2808,1740,132,'forest'],
    [2896,1740,140,'forest'],
    [2984,1740,148,'forest'],
    [2780,1824,124,'forest'],
    [2984,1908,132,'forest'],
    [2910,1432,140,'forest'],
    [2970,1516,148,'forest'],
    [3188,1796,124,'forest'],
  ].map(([x,y,w,biome],i)=>prop(`cluster-tree-${i}`,'tree',x,y,w,18,13,biome)),
  ...[
    [330,720,70,'lava'],[740,1020,65,'lava'],[870,1460,75,'lava'],
    [1300,1490,75,'city'],[2380,1220,70,'city'],[2530,1780,75,'city'],
    [2240,310,65,'heaven'],[2920,770,65,'ice'],[3720,950,60,'ice'],
    [2820,1530,85,'forest'],[3120,1730,80,'forest'],[3140,1900,80,'forest'],
  ].map(([x,y,w,biome],i)=>prop(`bush-${i}`,'bush',x,y,w,w*.32,w*.13,biome)),
  ...[
    [220,1120,100,'lava'],[820,440,90,'lava'],[1140,1550,105,'lava'],
    [1420,910,85,'city'],[2500,1120,100,'city'],[2860,710,90,'heaven'],
    [3060,300,105,'ice'],[3680,970,100,'ice'],[2990,1430,95,'forest'],
    [3100,1880,105,'forest'],[2830,1880,90,'forest'],
  ].map(([x,y,w,biome],i)=>prop(`rock-${i}`,'rock',x,y,w,w*.38,w*.16,biome)),
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
const floorPolygons = TOWN_WALK_POLYS.map(points=>({points,
  bounds:[Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),
    Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))]}));
// Spatial bins keep pathfinding cheap on the enlarged world. Each bin contains
// only nearby floor pieces; point-in-polygon remains the exact final check.
const BIN=128,BIN_COLS=Math.ceil(TOWN_SIZE.w/BIN),floorBins=new Map();
const binPiece=(bounds,kind,piece)=>{
  for(let y=Math.floor(bounds[1]/BIN);y<=Math.floor(bounds[3]/BIN);y++)
    for(let x=Math.floor(bounds[0]/BIN);x<=Math.floor(bounds[2]/BIN);x++){
      const key=y*BIN_COLS+x;let bin=floorBins.get(key);
      if(!bin){bin={rects:[],polys:[]};floorBins.set(key,bin);}bin[kind].push(piece);
    }
};
for(const r of TOWN_WALK_RECTS)binPiece(r,'rects',r);
for(const p of floorPolygons)binPiece(p.bounds,'polys',p);
export function townContains(x,y) {
  if(!Number.isFinite(x)||!Number.isFinite(y)||x<100||y<100
    ||x>TOWN_SIZE.w-100||y>TOWN_SIZE.h-100)return false;
  if(TOWN_HOUSES.some(r=>townInRect(x,y,r))||townPropBlocks(x,y))return false;
  const bin=floorBins.get(Math.floor(y/BIN)*BIN_COLS+Math.floor(x/BIN));
  return !!bin&&(bin.rects.some(r=>townInRect(x,y,r))
    ||bin.polys.some(p=>townInRect(x,y,p.bounds)&&townInPolygon(x,y,p.points)));
}
