import {LossMap} from './gpu-budget.js';
// Blend restored ground only over earlier object-removal patches. Original borders
// remain untouched so generated artwork cannot move a neighboring tile or staircase.
// FB3-CLEAN2 (26 Nov 2026): the three repair images of the v5 ground (img/map-zone1/repairs/) were removed with the v5 set - nothing plays v5 any more (the game plays v7r, repairs:false), so the
// registry is EMPTY and repairTownTerrain() hands every chunk back untouched.  The entries (row 2 col 3 r2-c3-v1, row 3 col 3 r3-c3-pier-v1, row 1 col 3 r1-c3-v1, each with border / fade / boxes) and the files
// are in git at 6e752785; tests/helpers/zone1-ground-v5.mjs registers them again for the loader contract tests.  To bring v5 back: git checkout 6e752785 -- img/map-zone1/repairs, then add the entries here.
export const TOWN_TERRAIN_REPAIRS=[];
const loads=new Map(),overlays=new LossMap();
function loadRepair(url){
  if(!loads.has(url))loads.set(url,new Promise((resolve,reject)=>{
    const im=new Image(),timer=setTimeout(()=>{im.onload=im.onerror=null;reject(new Error('ground repair timeout'));},8000);
    im.onload=()=>{clearTimeout(timer);resolve(im);};im.onerror=error=>{clearTimeout(timer);reject(error);};im.src=url;
  }).catch(error=>{loads.delete(url);throw error;}));
  return loads.get(url);
}
function repairOverlay(art,def){
  if(overlays.has(def.url))return overlays.get(def.url);
  const mask=document.createElement('canvas');mask.width=mask.height=1024;const m=mask.getContext('2d');
  for(const [x0,y0,x1,y1]of def.boxes){
    const part=document.createElement('canvas');part.width=x1-x0;part.height=y1-y0;const c=part.getContext('2d');
    const g=c.createLinearGradient(0,0,part.width,0),edge=42/part.width;
    g.addColorStop(0,'transparent');g.addColorStop(edge,'white');g.addColorStop(1-edge,'white');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,part.width,part.height);
    const v=c.createLinearGradient(0,0,0,part.height),ey=42/part.height;
    v.addColorStop(0,'transparent');v.addColorStop(ey,'white');v.addColorStop(1-ey,'white');v.addColorStop(1,'transparent');c.globalCompositeOperation='destination-in';c.fillStyle=v;c.fillRect(0,0,part.width,part.height);
    m.drawImage(part,x0,y0);
  }
  const out=document.createElement('canvas');out.width=out.height=1024;const c=out.getContext('2d');c.drawImage(art,0,0,1024,1024);
  c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);
  for(const vertical of [false,true]){
    const edge=c.createLinearGradient(0,0,vertical?0:1024,vertical?1024:0),a=def.border,b=a+def.fade;
    for(const [at,color]of [[0,'transparent'],[a/1024,'transparent'],[b/1024,'white'],[(1024-b)/1024,'white'],[(1024-a)/1024,'transparent'],[1,'transparent']])edge.addColorStop(at,color);
    c.fillStyle=edge;c.fillRect(0,0,1024,1024);
  }
  overlays.set(def.url,out);return out;
}
/** Compose once after decode; overview and detail share the same restoration. */
export async function repairTownTerrain(source,{row=null,col=null}={}){
  if(typeof HTMLImageElement==='undefined'||typeof document==='undefined'||!(source instanceof HTMLImageElement))return source;
  const defs=TOWN_TERRAIN_REPAIRS.filter(d=>row===null||d.row===row&&d.col===col);if(!defs.length)return source;
  try{
    const layers=await Promise.all(defs.map(async d=>{try{return {def:d,patch:repairOverlay(await loadRepair(d.url),d)};}catch{return null;}}));
    if(!layers.some(Boolean))return source;
    const out=document.createElement('canvas');out.width=source.naturalWidth;out.height=source.naturalHeight;const c=out.getContext('2d');c.drawImage(source,0,0);
    for(const layer of layers){if(!layer)continue;const {def:d,patch}=layer;
      if(row!==null)c.drawImage(patch,0,0,out.width,out.height);
      else c.drawImage(patch,(d.col-1)*1024/4915*out.width,(d.row-1)*1024/3277*out.height,1024/4915*out.width,1024/3277*out.height);
    }
    const result=new Image();result.src=out.toDataURL('image/png');await result.decode();return result;
  }catch{return source;} // Optional art must never strand a town on a loading screen.
}
