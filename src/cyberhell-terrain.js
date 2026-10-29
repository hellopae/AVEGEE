// Z4-TOWN-A: detailed owner terrain, shared with the enabled town skin.
export const CYBERHELL_TERRAIN = Object.freeze({
  dir:'img/map-zone4/v3/', full:{w:4915,h:3277}, world:{w:3840,h:2560}, chunk:1024,
});
const entries = new Map();
const MAX_LOADING=3, MAX_IMAGES=12, TIMEOUT=15000;
let loading=0, tick=0;
export const cyberhellTerrainStats = () => ({loading, ready:[...entries.values()].filter(e=>e.ready).length});
export function cyberhellTileRect(row,col) {
  const {full,world,chunk}=CYBERHELL_TERRAIN;
  const x=(col-1)*chunk,y=(row-1)*chunk;
  return {x:x/full.w*world.w,y:y/full.h*world.h,
    w:Math.min(chunk,full.w-x)/full.w*world.w,h:Math.min(chunk,full.h-y)/full.h*world.h};
}
function request(key,protectedKeys) {
  let e=entries.get(key);
  if(!e){e={ready:false,image:null,retryAt:0,failures:0,pending:false,at:tick};entries.set(key,e);}
  e.at=tick;
  if(e.ready||e.pending||loading>=MAX_LOADING||Date.now()<e.retryAt||typeof Image==='undefined')return e;
  // Bound decoded and in-flight images, retaining every tile in the current view.
  while([...entries.values()].filter(v=>v.image).length>=MAX_IMAGES){
    const victim=[...entries].filter(([k,v])=>!protectedKeys.has(k)&&v.ready).sort((a,b)=>a[1].at-b[1].at)[0];
    if(!victim)return e;
    entries.delete(victim[0]);
  }
  const image=new Image();image.decoding='async';e.image=image;e.pending=true;loading++;
  let settled=false;
  const finish=ok=>{if(settled)return;settled=true;clearTimeout(timer);image.onload=image.onerror=null;
    loading--;e.pending=false;e.ready=ok;
    if(ok){e.failures=0;}else{image.removeAttribute?.('src');e.image=null;e.retryAt=Date.now()+Math.min(30000,1000*2**Math.min(5,e.failures++));}};
  const timer=setTimeout(()=>finish(false),TIMEOUT);
  image.onload=async()=>{try{if(image.decode)await image.decode();finish(true);}catch{finish(false);}};
  image.onerror=()=>finish(false);
  image.src=CYBERHELL_TERRAIN.dir+key+'.webp'+(e.failures?'?recover='+Date.now():'');
  return e;
}
/** Return false until the complete camera footprint is ready; caller draws its
 * existing painting. No full-world canvas, partial sharp rectangles or new mask. */
export function drawCyberhellTerrain(ctx) {
  const m=ctx.getTransform?.();
  if(!m||m.b||m.c||m.a<=0||m.d<=0)return false;
  const {full,world}=CYBERHELL_TERRAIN;
  if(m.a*world.w<=1536&&m.d*world.h<=1024)return false;
  const bounds={x0:Math.max(0,-m.e/m.a),y0:Math.max(0,-m.f/m.d),
    x1:Math.min(world.w,(ctx.canvas.width-m.e)/m.a),y1:Math.min(world.h,(ctx.canvas.height-m.f)/m.d)};
  const visible=[];
  for(let row=1;row<=Math.ceil(full.h/1024);row++)for(let col=1;col<=Math.ceil(full.w/1024);col++){
    const r=cyberhellTileRect(row,col);
    if(r.x>=bounds.x1||r.y>=bounds.y1||r.x+r.w<=bounds.x0||r.y+r.h<=bounds.y0)continue;
    visible.push({key:`r${row}-c${col}`,r});
  }
  if(!visible.length||visible.length>MAX_IMAGES)return false;
  tick++;
  const keys=new Set(visible.map(v=>v.key));
  for(const v of visible)v.entry=request(v.key,keys);
  if(!visible.every(v=>v.entry.ready))return false;
  // Exact shared boundaries preserve the source pixel-to-world mapping.
  for(const {r,entry} of visible)ctx.drawImage(entry.image,r.x,r.y,r.w,r.h);
  return true;
}
