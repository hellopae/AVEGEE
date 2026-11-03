// Resample decoded ground/glow once at the camera's device scale; bound memory,
// and never allocate a full-world canvas for the zoomed overview fallback.
const entries=new Map(),ids=new WeakMap();let nextId=0,pixels=0;
const MAX_PIXELS=16_000_000,MAX_TILE_PIXELS=3_000_000;
export function drawTerrainDetail(ctx,image,rect){
 const m=ctx.getTransform?.(),sw=image.width||image.naturalWidth,sh=image.height||image.naturalHeight;
 if(!m||m.b||m.c||rect.length!==4||!sw||!sh||typeof document==='undefined'){ctx.drawImage(image,...rect);return;}
 const w=Math.max(1,Math.round(Math.abs(rect[2]*m.a))),h=Math.max(1,Math.round(Math.abs(rect[3]*m.d)));
 if(w*h>MAX_TILE_PIXELS){ctx.drawImage(image,...rect);return;}
 if(!ids.has(image))ids.set(image,++nextId);
 const key=`${ids.get(image)}:${w}:${h}`;let cv=entries.get(key);
 if(cv){entries.delete(key);entries.set(key,cv);}
 else{
  cv=document.createElement('canvas');cv.width=w;cv.height=h;const c=cv.getContext('2d');
  c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(image,0,0,w,h);
  while(pixels+w*h>MAX_PIXELS&&entries.size){const [key,old]=entries.entries().next().value;pixels-=old.width*old.height;entries.delete(key);}
  entries.set(key,cv);pixels+=w*h;
 }
 ctx.drawImage(cv,...rect);
}
export const terrainDetailStats=()=>({entries:entries.size,pixels,maxPixels:MAX_PIXELS});
