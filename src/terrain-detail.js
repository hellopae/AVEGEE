// Resample decoded ground/glow once at the camera's device scale; bound memory,
// and never allocate a full-world canvas for the zoomed overview fallback.
// PERF-1110: the budget used to be one hard LRU of 16 M px.  A 1792x958 window at DPR 2 shows 8 chunks = 16 cache tiles of ~36 M px, so every frame
// evicted the tiles it was about to draw and re-resampled them (16 canvases / ~3.6 M px per frame at 'high' quality = 6 fps on an iGPU).
// Now a tile that was drawn in the last HOT_MS is part of the camera's working set and is never evicted for budget reasons: MAX_PIXELS only trims
// cold tiles (chunks the camera left).  HARD_PIXELS bounds the working set itself (huge window / extreme zoom): past it a tile is blitted straight
// from the source image instead of allocating, so memory stays bounded and nothing churns.
const entries=new Map(),ids=new WeakMap();let nextId=0,pixels=0;
const MAX_PIXELS=16_000_000,HARD_PIXELS=72_000_000,HOT_MS=1500,MAX_TILE_PIXELS=3_000_000;
const clock=()=>(typeof performance!=='undefined'?performance.now():Date.now());
export function drawTerrainDetail(ctx,image,rect){
 const m=ctx.getTransform?.(),sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight;
 if(!m||m.b||m.c||rect.length!==4||!sw||!sh||typeof document==='undefined'){ctx.drawImage(image,...rect);return;}
 const w=Math.max(1,Math.round(Math.abs(rect[2]*m.a))),h=Math.max(1,Math.round(Math.abs(rect[3]*m.d)));
 if(w*h>MAX_TILE_PIXELS){ctx.drawImage(image,...rect);return;}
 if(!ids.has(image))ids.set(image,++nextId);
 const key=`${ids.get(image)}:${w}:${h}`,now=clock();let cv=entries.get(key);
 if(cv){entries.delete(key);entries.set(key,cv);cv.__hot=now;}
 else{
  // cold tiles first (oldest first); a tile drawn within HOT_MS is the working set and stays
  for(const [k,old] of entries){
   if(pixels+w*h<=MAX_PIXELS)break;
   if(now-(old.__hot||0)<HOT_MS)break;   // Map order = least recently drawn first, so everything after this one is hotter
   pixels-=old.width*old.height;entries.delete(k);
  }
  if(pixels+w*h>HARD_PIXELS){ctx.drawImage(image,...rect);return;}
  cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,0,0,w,h);
  cv.__hot=now;entries.set(key,cv);pixels+=w*h;
 }
 ctx.drawImage(cv,...rect);
}
export const terrainDetailStats=()=>({entries:entries.size,pixels,maxPixels:MAX_PIXELS,hardPixels:HARD_PIXELS});
