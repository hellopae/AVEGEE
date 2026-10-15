// Terrain is assembled from native material tiles; solid props belong to scenery.
// Texture pixels repeat at 6.67 source pixels per world pixel, including close zoom.
import {TOWN_SIZE,TOWN_WALK_RECTS,TOWN_WALK_POLYS,TOWN_STAIRS} from './town-layout.js';

// K3: patterns are keyed by image only. Every chunk used to own a fresh context, so each new chunk
// re-created (and re-snapshotted) all seven 1254px patterns; a CanvasPattern can be shared across contexts.
const patterns=new WeakMap();
function material(ctx,resolve,key,fallback) {
  const image=resolve(key);if(!image)return fallback;
  if(!patterns.has(image)){
    const pattern=ctx.createPattern(image,'repeat');
    if(pattern?.setTransform)pattern.setTransform({a:.15,b:0,c:0,d:.15,e:0,f:0});
    patterns.set(image,pattern);
  }
  return patterns.get(image)||fallback;
}
function polygon(ctx,points){ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();}
function fillRegion(ctx,points,fill){polygon(ctx,points);ctx.fillStyle=fill;ctx.fill();}
function floors(ctx,offset=0){ctx.beginPath();for(const[x1,y1,x2,y2]of TOWN_WALK_RECTS)ctx.rect(x1,y1+offset,x2-x1,y2-y1);for(const source of TOWN_WALK_POLYS){const area=source.reduce((a,p,i)=>a+p[0]*source[(i+1)%source.length][1]-source[(i+1)%source.length][0]*p[1],0);const points=area<0?[...source].reverse():source;points.forEach(([x,y],i)=>i?ctx.lineTo(x,y+offset):ctx.moveTo(x,y+offset));ctx.closePath();}}
const WEST=[[0,0],[1200,0],[1210,700],[1150,1190],[1240,1600],[1140,1950],[0,1980]];
const CITY=[[1180,0],[2720,0],[2820,680],[2650,1280],[2830,1900],[1200,1950],[1210,1450],[1090,1030]];
const ICE=[[2790,0],[3840,0],[3840,1040],[3580,1050],[3000,880],[2830,620]];
const QUARRY=[[2860,950],[3400,890],[3800,1100],[3830,1470],[3380,1480],[2830,1390],[2700,1170]];
const FOREST=[[2730,1520],[3340,1490],[3840,1530],[3840,2110],[3150,2040],[2750,1870]];

function paintTerrain(ctx,resolve=()=>null,time=0,reduced=true) {
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  const stone=material(ctx,resolve,'town-terrain-plaza','#746557');
  const earth=material(ctx,resolve,'town-terrain-earth','#526345');
  const volcanic=material(ctx,resolve,'town-terrain-volcanic','#56352f');
  const frost=material(ctx,resolve,'town-terrain-frost','#d0dfe1');
  const grass=material(ctx,resolve,'town-terrain-grass',earth);
  const riverWater=material(ctx,resolve,'town-terrain-water','#368da8');
  const molten=material(ctx,resolve,'town-terrain-lava','#f57b21');
  const water=ctx.createLinearGradient(0,0,0,TOWN_SIZE.h);water.addColorStop(0,'#55b6c5');water.addColorStop(.65,'#307e9e');water.addColorStop(.83,'#282739');water.addColorStop(1,'#171726');
  ctx.fillStyle=riverWater;ctx.fillRect(0,0,TOWN_SIZE.w,TOWN_SIZE.h);
  ctx.save();ctx.globalAlpha=.75;ctx.fillStyle=water;ctx.fillRect(0,0,TOWN_SIZE.w,TOWN_SIZE.h);ctx.restore();
  // Shore terraces are ground relief, not baked buildings or vegetation.
  for(const land of[WEST,CITY,ICE,QUARRY,FOREST]){
    fillRegion(ctx,land.map(([x,y])=>[x,y+30]),'#282c32');
    polygon(ctx,land);ctx.strokeStyle='#63766b';ctx.lineWidth=6;ctx.stroke();
  }
  fillRegion(ctx,WEST,volcanic);fillRegion(ctx,CITY,grass);
  fillRegion(ctx,[[2160,0],[2830,0],[2840,650],[2650,850],[2250,660]],frost);
  fillRegion(ctx,ICE,frost);fillRegion(ctx,QUARRY,stone);fillRegion(ctx,FOREST,grass);
  // A winding river divides the eastern biomes. Every crossing is real paving.
  ctx.lineCap='round';ctx.lineJoin='round';
  const river=[[2840,-50],[2820,360],[2920,650],[2750,900],[2630,1160],[2760,1460],[3180,1460],[3380,1690],[3310,1950]];
  ctx.beginPath();river.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.strokeStyle='#87d0d1';ctx.lineWidth=115;ctx.stroke();ctx.strokeStyle=riverWater;ctx.lineWidth=83;ctx.stroke();
  ctx.strokeStyle='rgba(197,242,239,.45)';ctx.lineWidth=3;ctx.setLineDash([18,27]);ctx.lineDashOffset=reduced?0:-time/80;ctx.stroke();ctx.setLineDash([]);
  const lava=[[800,-100],[800,360],[920,650],[980,970],[950,1260],[1080,1510],[980,1860],[860,1950]];
  ctx.beginPath();lava.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));
  ctx.strokeStyle='#452a30';ctx.lineWidth=135;ctx.stroke();ctx.strokeStyle='#ad391f';ctx.lineWidth=108;ctx.stroke();ctx.strokeStyle=molten;ctx.lineWidth=80;ctx.stroke();ctx.strokeStyle='rgba(255,195,91,.28)';ctx.lineWidth=3;ctx.stroke();
  // One union of the exact navigation shapes: visible floor and collision agree.
  floors(ctx,24);ctx.fillStyle='#29242c';ctx.fill();
  floors(ctx);ctx.strokeStyle='#998467';ctx.lineWidth=3;ctx.stroke();ctx.fillStyle=stone;ctx.fill();
  floors(ctx);ctx.save();ctx.clip();
  const light=ctx.createLinearGradient(0,0,3840,2560);light.addColorStop(0,'rgba(255,216,134,.10)');light.addColorStop(1,'rgba(10,17,28,.16)');ctx.fillStyle=light;ctx.fillRect(0,0,3840,2560);ctx.restore();
  for(const{key,rect:[x1,y1,x2,y2],steps}of TOWN_STAIRS){
    if(key==='civic')continue; // The independent judgment platform supplies these steps.
    ctx.fillStyle=stone;ctx.fillRect(x1,y1,x2-x1,y2-y1);
    for(let i=0;i<=steps;i++){const y=y1+(y2-y1)*i/steps;ctx.fillStyle='#292629';ctx.fillRect(x1,y,x2-x1,5);ctx.fillStyle='rgba(239,215,173,.5)';ctx.fillRect(x1,y+5,x2-x1,2);}
  }
  // Harbour decking is walkable; boat, lamps and structures are separate props.
  ctx.fillStyle='#644732';ctx.fillRect(2115,1790,130,118);
  for(let y=1790;y<1908;y+=14){ctx.fillStyle='#b49364';ctx.fillRect(2115,y,130,2);}
  ctx.restore();
}

// Cache only visible native-resolution chunks. Camera motion reuses neighbouring
// chunks instead of repainting the entire enlarged world on every frame.
const terrainCaches=new WeakMap();
export function drawTownTerrain(ctx,resolve=()=>null,time=0,reduced=true) {
  if(typeof document==='undefined'||!ctx.getTransform){paintTerrain(ctx,resolve,time,reduced);return;}
  const keys=['earth','plaza','volcanic','frost','grass','water','lava'];
  const signature=keys.map(k=>resolve('town-terrain-'+k)?.src||'').join('|');
  let cache=terrainCaches.get(ctx);
  if(!cache||cache.signature!==signature){cache={signature,chunks:new Map()};terrainCaches.set(ctx,cache);}
  const chunks=cache.chunks;
  const m=ctx.getTransform();
  if(!m||m.b||m.c||!Number.isFinite(m.a)||!Number.isFinite(m.d)||m.a<=0||m.d<=0){paintTerrain(ctx,resolve,time,reduced);return;}
  const density=Math.max(m.a,m.d),level=density<=.5?.5:density<=1?1:density<=2?2:density<=4?4:8;
  const CHUNK=level<=1?512:level<=2?256:128;
  const left=Math.max(0,Math.floor(-m.e/m.a/CHUNK)),top=Math.max(0,Math.floor(-m.f/m.d/CHUNK));
  const right=Math.min(Math.ceil(TOWN_SIZE.w/CHUNK),Math.ceil((ctx.canvas.width-m.e)/m.a/CHUNK));
  const bottom=Math.min(Math.ceil(TOWN_SIZE.h/CHUNK),Math.ceil((ctx.canvas.height-m.f)/m.d/CHUNK));
  // K3: the cap must exceed the visible chunk count. A fixed 48 was smaller than the ~54+ chunks seen at
  // 3.5x zoom on a DPR2 screen, so every frame evicted and repainted all of them (hundreds of canvases/s).
  const MAX_CHUNKS=Math.max(48,(right-left+2)*(bottom-top+2)*2);
  const build=(x,y,key)=>{
    const tile=document.createElement('canvas');tile.width=tile.height=CHUNK*level;
    const c=tile.getContext('2d');c.setTransform(level,0,0,level,-x*CHUNK*level,-y*CHUNK*level);
    paintTerrain(c,resolve,0,true);
    chunks.set(key,tile);
    if(chunks.size>MAX_CHUNKS)chunks.delete(chunks.keys().next().value);
    return tile;
  };
  let built=0;
  ctx.save();ctx.imageSmoothingEnabled=true;
  for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
    const key=level+':'+x+':'+y;
    let tile=chunks.get(key);
    if(!tile){tile=build(x,y,key);built++;}
    else{chunks.delete(key);chunks.set(key,tile);}
    ctx.drawImage(tile,x*CHUNK,y*CHUNK,CHUNK,CHUNK);
  }
  ctx.restore();
  // K3: paint at most ONE not-yet-visible neighbour chunk per frame (only on frames that built nothing
  // else), so walking onto fresh ground finds it ready instead of stalling ~70 ms for a whole row.
  if(!built){
    const maxX=Math.ceil(TOWN_SIZE.w/CHUNK),maxY=Math.ceil(TOWN_SIZE.h/CHUNK);
    for(let y=Math.max(0,top-1);y<Math.min(maxY,bottom+1);y++)for(let x=Math.max(0,left-1);x<Math.min(maxX,right+1);x++){
      const key=level+':'+x+':'+y;
      if(chunks.has(key))continue;
      build(x,y,key);return;
    }
  }
}
