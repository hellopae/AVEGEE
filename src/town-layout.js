// Map-Zone1: painted mainland with distinct biomes and a southern spirit harbour.
// These same floor rectangles drive navigation and the composited road layer.
export const TOWN_MAP_VERSION = 2;
export const TOWN_SIZE = { w:3840, h:2560 };
export const TOWN_RIVER_Y = 1820;
export const TOWN_PLAZA = [1920,1250];
const site = (x,y,bw=320) => ({x,y,bx:x,by:y-60,bw,mapScale:1.5,
  sx:x,sy:y-120,hit:[x-bw/2,y-380,x+bw/2,y-60]});
export const TOWN_STATION_SITES = {
  krata:site(550,580), dab:site(530,1150), ngiw:site(570,1710),
  tarang:site(1700,530), sawan:site(2600,560), lokan:site(3480,740),
  lan:site(3100,1180), krajok:site(3450,1830),
  tea:site(1670,1640), sala:site(2180,1640),
};
export const TOWN_SPOTS = {
  plaza:{x:1920,y:1250}, bench:{x:1920,y:1250}, throne:{x:1920,y:1130},
  bossPier:{x:2180,y:1850}, ferry:{from:[2180,1850],to:[2310,1820]},
};
export const TOWN_CREW = {
  nira:[2050,1270], taan:[3190,1220], dam:[590,1230],
  plerng:[600,660], kan:[2230,1710], boon:[2630,630],
};
export const TOWN_GUARD_POST = [1810,2360];
export const TOWN_CHALLENGE = [2110,2300];
export const TOWN_MERCHANT = {x:1680,y:1720};
export const TOWN_FRONTIER = {...site(1950,2360,300),reach:105};
export const TOWN_QUEUE = [[1920,1350],[1920,1390],[1920,1430],
  [1920,1470],[1920,1510],[1920,1550],[1920,1590]];
export const TOWN_ENTRY = {gate:[1950,2360],nira:[1916,2352],
  goal:[1980,1250],niraGoal:[2050,1270]};
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
  if(TOWN_HOUSES.some(r=>townInRect(x,y,r)))return false;
  const bin=floorBins.get(Math.floor(y/BIN)*BIN_COLS+Math.floor(x/BIN));
  return !!bin&&(bin.rects.some(r=>townInRect(x,y,r))
    ||bin.polys.some(p=>townInRect(x,y,p.bounds)&&townInPolygon(x,y,p.points)));
}
