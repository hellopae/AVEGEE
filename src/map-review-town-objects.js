// Review-only adapter for the game's existing independently anchored town sprites.
import {reviewStationBox} from './map-art-v5.js';
import {CANTEEN_ART_SCALE,CANTEEN_ART_FOOT_Y} from './canteen-art-layout.js';
import {daisBlocks} from './town-dais-geometry.js';
export function townReviewBox(o,size,zone,manifest){
 const [iw,ih]=size;
 if(o.kind!=='station'){
  const h=o.w*ih/iw,[ax,ay]=o.anchor||[.5,1];return {x:o.x-ax*o.w,y:o.y-ay*h,w:o.w,h,flip:!!o.flip};
 }
 const p=o.site;
 if(o.boxMode==='canteen'){const w=p.bw*CANTEEN_ART_SCALE,h=w*ih/iw;return {x:p.bx-w/2,y:p.by-h*(CANTEEN_ART_FOOT_Y[zone]??1),w,h,flip:['th','asia','cyberhell'].includes(zone)};}
 if(o.src.includes('/map-v5/'))return reviewStationBox(p,{naturalWidth:iw,naturalHeight:ih},zone);
 if(o.boxMode==='frontier')return {x:p.bx-p.bw/2,y:p.by-p.bw,w:p.bw,h:p.bw,flip:!!p.flip};
 const sourceKey=o.src.split('/').at(-1).replace(/\.(png|webp)$/,''),key='st-'+o.key,B=manifest.boxes?.[sourceKey]||[0,0,1,1];
 let scale=p.bw/512;
 if(sourceKey!==key){const A=manifest.boxes?.[key],base=manifest.stationSizes?.[key];if(A&&base)scale=Math.min((A[2]-A[0])*base[0]*p.bw/512/((B[2]-B[0])*iw),(A[3]-A[1])*base[1]*p.bw/512*(o.src.includes('/theme-v4/')?1:1.5)/((B[3]-B[1])*ih));}
 const cx=p.flip?1-(B[0]+B[2])/2:(B[0]+B[2])/2;
 return {x:p.bx-cx*iw*scale,y:p.by-B[3]*ih*scale,w:iw*scale,h:ih*scale,flip:!!p.flip};
}
function spriteFoot(image,box,canvas){
 const c=canvas();c.width=c.height=72;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0,72,72);const rgba=ctx.getImageData(0,0,72,72).data;
 const solid=(x,y)=>rgba[(y*72+(box.flip?71-x:x))*4+3]>40;
 let bottom=-1;for(let y=71;y>=0&&bottom<0;y--)for(let x=0;x<72;x++)if(solid(x,y)){bottom=y;break;}
 if(bottom<0)return null;
 const band=Math.max(2,Math.round(72*.16));let left=72,right=-1;
 for(let y=Math.max(0,bottom-band);y<=bottom;y++)for(let x=0;x<72;x++)if(solid(x,y)){left=Math.min(left,x);right=Math.max(right,x);}
 c.width=c.height=1;if(right<left)return null;
 const pad=(right-left)/72*box.w*.06;
 return {kind:'rect',rect:[box.x+left/72*box.w+pad,box.y+(bottom-band)/72*box.h,box.x+right/72*box.w-pad,box.y+bottom/72*box.h]};
}
export function reviewObjectBlocks(c,x,y){
 if(!c)return false;
 if(c.kind==='ellipse')return ((x-c.x)/c.rx)**2+((y-c.y)/c.ry)**2<=1;
 if(c.kind==='rect'){const [x0,y0,x1,y1]=c.rect;return x>=x0&&x<=x1&&y>=y0&&y<=y1;}
 if(c.kind==='dais')return daisBlocks(x,y,c.zone,c.dais);
 return false;
}
export function reviewObjectFootGrid(objects,cols,rows,world=[3840,2560]){
 const blocked=new Uint8Array(cols*rows);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++)if(objects.some(o=>reviewObjectBlocks(o.collider,(x+.5)/cols*world[0],(y+.5)/rows*world[1])))blocked[y*cols+x]=1;
 return {width:cols,height:rows,blocked};
}
export async function loadTownReviewObjects(row,assets,{manifest,loadSprite,canvas=()=>document.createElement('canvas')}={}){
 if(!row)return {objects:[],destroy(){}};
 const images=new Map(),objects=[];
 try{
  for(const o of row.objects){
   if(!images.has(o.src))images.set(o.src,await loadSprite(o.src,assets[o.src].size));
   const image=images.get(o.src),box=townReviewBox(o,assets[o.src].size,row.zone,manifest),collider=o.collider?.kind==='sprite-foot'?spriteFoot(image,box,canvas):o.collider;
   const x=o.x??o.site.bx,y=o.y??o.site.by;
   objects.push({...o,image,box,collider,depth:y/row.world[1],foot:[x/row.world[0],y/row.world[1]],rect:[box.x/row.world[0],box.y/row.world[1],box.w/row.world[0],box.h/row.world[1]],flip:box.flip});
  }
 }catch(error){for(const image of images.values())image.close?.();throw error;}
 return {objects,get decodedPixels(){return [...images.values()].reduce((n,image)=>n+image.width*image.height,0);},destroy(){for(const image of images.values())image.close?.();images.clear();objects.length=0;}};
}
