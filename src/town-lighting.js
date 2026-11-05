import {drawTerrainDetail} from './terrain-detail.js';
import {clamp,fireStrength,hueStrength,emitAt,hellColor,gradeStrip,lightColumns} from './town-grade.js';
// Clear night: neutral ambient light matching placed scenery, warm pools around actual town fixtures, emissive lava.
// Pixel grading and fixture falloff are cached; animation only blits two layers.
import {TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES,TOWN_DAIS,TOWN_SIZE,onTownLayoutChange} from './town-layout.js?v=k1d';
import {activeTownSkin} from './zone-skin.js';
const GLOW_DIV=4,cache=new WeakMap();
export {fireStrength,hueStrength,emitAt,hellColor};
const CELL=32,COLS=Math.ceil(TOWN_SIZE.w/CELL),ROWS=Math.ceil(TOWN_SIZE.h/CELL),field=new Float32Array(COLS*ROWS);
// The pools of light follow the placed lamps / torches / houses / stations / dais of the active zone layout.
function rebuildField(){
 const fixtures=[
  ...TOWN_PROP_SITES.filter(p=>p.kind==='torch'||p.kind==='lamp').map(p=>({x:p.x,y:p.y-25,r:p.kind==='torch'?135:95,power:.9})),
  ...TOWN_HOUSE_SITES.map(p=>({x:p.x,y:p.y-p.h*.25,r:p.w*.95,power:.65})),
  ...Object.values(TOWN_STATION_SITES).map(p=>({x:p.bx,y:p.by-35,r:p.bw*.75,power:.60})),
  {x:TOWN_DAIS.x-65,y:TOWN_DAIS.y-40,r:150,power:.7},{x:TOWN_DAIS.x+65,y:TOWN_DAIS.y-40,r:150,power:.7},
 ];
 for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
  let sum=0;for(const f of fixtures){const d=Math.hypot((x+.5)*CELL-f.x,(y+.5)*CELL-f.y)/f.r;if(d<1)sum+=f.power*(1-d)*(1-d);}
  field[y*COLS+x]=Math.min(1,sum);
 }
}
rebuildField();
onTownLayoutChange(()=>rebuildField());
export function townLightAt(x,y){return field[Math.max(0,Math.min(ROWS-1,Math.floor(y/CELL)))*COLS+Math.max(0,Math.min(COLS-1,Math.floor(x/CELL)))];}
// LOAD-01b: the per-pixel grade used to run in ONE synchronous call the first time an image was drawn (1-2 M pixels per
// terrain chunk, 3-12 s on a throttled phone, one stall per chunk set while walking). It now runs in slices of a few ms
// (prepareTownLighting, awaited by the terrain loader BEFORE a chunk is marked ready) and the maths is unchanged:
// same formulas, same cell lookups (hoisted per row / column), so every output pixel is identical.
function startBake(image,rect,source=image){
 // FX3: the chunk is graded in horizontal strips: a strip is drawn from the source into a small scratch canvas, graded, and put into the
 // ground canvas.  The old version read the WHOLE chunk (16.8 MB for a 2048 px chunk) with one getImageData + two full ImageData + two
 // putImageData, which was one 400-600 ms frame on a throttled phone and three full-size buffers on top of the two canvases.
 // The grade maths is unchanged (same formulas, same cell lookups), only the order of the rows' bookkeeping.
 const W=image.naturalWidth,H=image.naturalHeight;
 const ground=document.createElement('canvas');ground.width=W;ground.height=H;
 const gc=ground.getContext('2d');
 const SH=16,scratch=document.createElement('canvas');scratch.width=W;scratch.height=SH;
 const sc=scratch.getContext('2d',{willReadFrequently:true});
 // The glow layer exists only if some pixel glows, and it is kept at 1/GLOW_DIV of the ground resolution (it is blended at ~13% 'screen' and
 // carries colour + strength only: a full-size copy was a second 16.8 MB canvas per lava chunk).
 let fire=null,fc=null,glowStrip=null,gsc=null;
 // Preview crops use the whole-world transform; streamed tiles use their own world rectangle.
 const [ox,oy,ww,wh]=rect.length===8?[0,0,TOWN_SIZE.w,TOWN_SIZE.h]:rect;
 const emit=activeTownSkin().light.emit,fireOnly=emit.length===1&&emit[0].type==='fire';
 // townLightAt(ox+x/W*ww, oy+y/H*wh) factorised: the field cell column depends on x only and the row on y only.
 const col=lightColumns(W,ox,ww,CELL,COLS);
 let y0=0;
 const geo={ox,oy,ww,wh,CELL,COLS,ROWS,field,col};
 function strip(y0,h){
  sc.drawImage(source,0,y0,W,h,0,0,W,h);
  const pixels=sc.getImageData(0,0,W,h),glow=sc.createImageData(W,h);
  const any=gradeStrip(pixels.data,glow.data,W,h,y0,H,geo,emit,fireOnly);
  gc.putImageData(pixels,0,y0);
  if(any){
   if(!fire){fire=document.createElement('canvas');fire.width=Math.ceil(W/GLOW_DIV);fire.height=Math.ceil(H/GLOW_DIV);fc=fire.getContext('2d');fc.imageSmoothingEnabled=true;
    glowStrip=document.createElement('canvas');glowStrip.width=W;glowStrip.height=SH;gsc=glowStrip.getContext('2d');}
   gsc.clearRect(0,0,W,SH);gsc.putImageData(glow,0,0);
   fc.drawImage(glowStrip,0,0,W,h,0,y0/GLOW_DIV,W/GLOW_DIV,h/GLOW_DIV);
  }
 }
 function run(budgetMs){
  const t0=performance.now();
  while(y0<H){
   const h=Math.min(SH,H-y0);strip(y0,h);y0+=h;
   if(performance.now()-t0>=budgetMs&&y0<H)return false;
  }
  return true;
 }
 function finish(){
  scratch.width=scratch.height=1;if(glowStrip)glowStrip.width=glowStrip.height=1;
  let glowLayer=null;
  if(fire){
   // x,y,w,h = the part of the chunk (in ground pixels) the glow canvas covers: always all of it; the canvas itself is 1/GLOW_DIV size
   glowLayer={canvas:fire,x:0,y:0,w:W,h:H};
  }
  return {ground,fire:glowLayer,W,H};
 }
 return {run,finish};
}
const pending=new WeakMap();
function layers(image,rect){
 let entry=cache.get(image);if(entry)return entry;
 const job=pending.get(image)||startBake(image,rect);pending.delete(image);
 job.run(Infinity);entry=job.finish();cache.set(image,entry);return entry;
}
const yieldToFrame=()=>new Promise(resolve=>{
 if(typeof MessageChannel==='function'){const c=new MessageChannel();c.port1.onmessage=()=>{c.port1.close();resolve();};c.port2.postMessage(0);}
 else setTimeout(resolve,0);
});
/** Bake an image's lit ground + glow layers in ~4 ms slices so no frame is blocked; resolves when drawHellTerrain can blit it.
 *  Call it with the same rect drawHellTerrain will use (the world rectangle of a chunk, or the full world for the preview). */
// FX3: grading runs in a module worker (src/terrain-bake-worker.js) when the browser has Worker + OffscreenCanvas + createImageBitmap, so a tile never costs
// main-thread frames; otherwise (and if the worker fails) the sliced main-thread bake below runs as before.
let worker=null,workerFailed=false,nextJob=0;const bakeStats={worker:0,main:0,workerFailed:false};
export const townLightingBakeStats=()=>({...bakeStats,workerFailed});const waiting=new Map();
function getWorker(){
 if(worker||workerFailed)return worker;
 if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap!=='function'||typeof HTMLImageElement==='undefined'){workerFailed=true;return null;}
 try{
  worker=new Worker(new URL('./terrain-bake-worker.js?v=20261105-z1v5-fx4',import.meta.url),{type:'module'});
  worker.onmessage=e=>{const w=waiting.get(e.data.id);if(!w)return;waiting.delete(e.data.id);if(e.data.ok)w.resolve(e.data);else w.reject(new Error(e.data.error));};
  worker.onerror=()=>{workerFailed=true;const dead=[...waiting.values()];waiting.clear();worker=null;for(const w of dead)w.reject(new Error('terrain worker failed'));};
 }catch{workerFailed=true;worker=null;}
 return worker;
}
async function bakeInWorker(image,rect){
 const w=getWorker();if(!w)return null;
 let bitmap;try{bitmap=await createImageBitmap(image);}catch{return null;}
 const id=++nextJob,emit=activeTownSkin().light.emit,W=bitmap.width,H=bitmap.height;
 const done=new Promise((resolve,reject)=>waiting.set(id,{resolve,reject}));
 try{w.postMessage({id,bitmap,W,H,rect,field:field.slice(),COLS,ROWS,CELL,world:{w:TOWN_SIZE.w,h:TOWN_SIZE.h},emit,fireOnly:emit.length===1&&emit[0].type==='fire',glowDiv:GLOW_DIV},[bitmap]);}
 catch{waiting.delete(id);bitmap.close?.();return null;}
 try{const r=await done;return {ground:r.ground,fire:r.fire?{canvas:r.fire,x:0,y:0,w:W,h:H}:null,W,H};}catch{return null;}
}
let bakeTurn=Promise.resolve();   // one tile is graded at a time: three parallel bakes each took their own slice of the frame (3 x 4-10 ms)
export async function prepareTownLighting(image,rect,budgetMs=4){
 if(typeof document==='undefined'||typeof performance==='undefined'||!image||!image.naturalWidth||cache.has(image))return;
 {const baked=await bakeInWorker(image,rect);if(baked){bakeStats.worker++;if(!cache.has(image))cache.set(image,baked);return;}}
 bakeStats.main++;
 // FX3: decode once into an ImageBitmap (off the main thread) and read the strips from it; it is closed as soon as the grade is done, so the
 // 16.8 MB of a decoded 2048 px chunk does not stay alive next to the graded canvases.  No createImageBitmap (old browser / tests) = the image itself.
 let source=image,bitmap=null;
 if(typeof createImageBitmap==='function'&&typeof HTMLImageElement!=='undefined'&&image instanceof HTMLImageElement){try{bitmap=await createImageBitmap(image);source=bitmap;}catch{bitmap=null;}}
 let job=pending.get(image);if(!job){job=startBake(image,rect,source);pending.set(image,job);}
 const before=bakeTurn;let done;bakeTurn=new Promise(r=>{done=r;});await before;
 try{
  while(pending.get(image)===job&&!job.run(typeof budgetMs==='function'?budgetMs():budgetMs))await yieldToFrame();
  if(pending.get(image)!==job)return;   // a synchronous layers() call finished it first
  pending.delete(image);cache.set(image,job.finish());
 }finally{bitmap?.close?.();done();}
}
export function drawHellTerrain(ctx,image,time,reduced,...rect){
 const art=layers(image,rect);drawTerrainDetail(ctx,art.ground,rect);
 if(!art.fire)return;   // no glowing pixel in this chunk: the whole screen-blended pass is skipped (it blitted an empty 2048 px canvas every frame)
 const f=art.fire,D=art.W/f.canvas.width,fr=f.w===art.W&&f.h===art.H?(rect.length===8?[rect[0]/D,rect[1]/D,rect[2]/D,rect[3]/D,rect[4],rect[5],rect[6],rect[7]]:rect):[rect[0]+f.x/art.W*rect[2],rect[1]+f.y/art.H*rect[3],f.w/art.W*rect[2],f.h/art.H*rect[3]];
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=reduced?.10:.13+.035*Math.sin(time/510)+.015*Math.sin(time/173);
 drawTerrainDetail(ctx,f.canvas,fr);ctx.restore();
}
/** Free the graded layers of an image the terrain no longer needs (a chunk that left the camera for good). */
export function releaseTownLighting(image){
 const e=cache.get(image);if(!e)return;
 cache.delete(image);pending.delete(image);
 const kill=c=>{if(typeof c.close==='function')c.close();else c.width=c.height=1;};kill(e.ground);if(e.fire)kill(e.fire.canvas);
}
export const townLightingBakedPixels=(image)=>{const e=cache.get(image);return e?e.ground.width*e.ground.height+(e.fire?e.fire.canvas.width*e.fire.canvas.height:0):0;};
