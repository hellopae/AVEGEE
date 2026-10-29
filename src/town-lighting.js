// Clear night: neutral ambient light matching placed scenery, warm pools around actual town fixtures, emissive lava.
// Pixel grading and fixture falloff are cached; animation only blits two layers.
import {TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES,TOWN_DAIS,TOWN_SIZE,onTownLayoutChange} from './town-layout.js?v=k1d';
import {activeTownSkin} from './zone-skin.js';
const cache=new WeakMap(),clamp=x=>Math.max(0,Math.min(1,x));
export function fireStrength(r,g,b){return clamp((r-160)/70)*clamp((r-b-70)/90)*clamp((g-b-20)/60)*clamp((100-b)/65);}
// M2: a zone may list extra light sources (zone-skin.js light.emit). A 'hue' source marks bright, saturated pixels inside
// its hue range as glowing, exactly the way fireStrength() marks orange fire. Zone 1 lists only the fire reader.
export function hueStrength(r,g,b,e){
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;if(!d)return 0;
 const v=mx/255,sat=d/mx;
 if(v<e.vMin-.2||sat<e.sMin-.25)return 0;
 const h=(mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4)*60,hue=(h+360)%360;
 if(hue<e.hue[0]||hue>e.hue[1])return 0;
 return clamp((v-(e.vMin-.2))/.2)*clamp((sat-(e.sMin-.25))/.25);
}
// Strongest emitter at a pixel and its glow colour (rgb), for zones with more than the fire reader.
export function emitAt(emit,r,g,b,out=[0,0,0,0]){
 let best=0,col=null;
 for(const e of emit){
  const s=e.type==='fire'?fireStrength(r,g,b):hueStrength(r,g,b,e);
  if(s>best){best=s;col=e.type==='fire'?null:e.color;}
 }
 out[0]=best;out[1]=col?col[0]:255;out[2]=col?col[1]:Math.min(230,g);out[3]=col?col[2]:20;return out;
}
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
export function hellColor(r,g,b,out=[0,0,0],light=0,strength=null){
 const fire=strength===null?fireStrength(r,g,b):strength,l=.299*r+.587*g+.114*b;
 for(let i=0;i<3;i++){
  const v=i===0?r:i===1?g:b;
  const shade=(i===0?.74:i===1?.73:.76)+light*(i===0?.30:i===1?.24:.12);
  const base=(l+(v-l)*1.03)*shade,boost=i===0?1.13:i===1?1.08:1;
  out[i]=Math.round(Math.max(0,Math.min(255,base*(1-fire)+v*boost*fire)));
 }
 return out;
}
// LOAD-01b: the per-pixel grade used to run in ONE synchronous call the first time an image was drawn (1-2 M pixels per
// terrain chunk, 3-12 s on a throttled phone, one stall per chunk set while walking). It now runs in slices of a few ms
// (prepareTownLighting, awaited by the terrain loader BEFORE a chunk is marked ready) and the maths is unchanged:
// same formulas, same cell lookups (hoisted per row / column), so every output pixel is identical.
function startBake(image,rect){
 const ground=document.createElement('canvas'),fire=document.createElement('canvas');
 const W=ground.width=fire.width=image.naturalWidth,H=ground.height=fire.height=image.naturalHeight;
 const p=ground.getContext('2d',{willReadFrequently:true}),f=fire.getContext('2d');p.drawImage(image,0,0);
 const pixels=p.getImageData(0,0,W,H),glow=f.createImageData(W,H),rgb=[0,0,0],px=pixels.data,gl=glow.data;
 // Preview crops use the whole-world transform; streamed tiles use their own world rectangle.
 const [ox,oy,ww,wh]=rect.length===8?[0,0,TOWN_SIZE.w,TOWN_SIZE.h]:rect;
 const emit=activeTownSkin().light.emit,fireOnly=emit.length===1&&emit[0].type==='fire',em=[0,0,0,0];
 // townLightAt(ox+x/W*ww, oy+y/H*wh) factorised: the field cell column depends on x only and the row on y only.
 const col=new Int32Array(W);
 for(let x=0;x<W;x++)col[x]=Math.max(0,Math.min(COLS-1,Math.floor((ox+x/W*ww)/CELL)));
 let y=0;
 function run(budgetMs){
  const t0=performance.now();
  while(y<H){
   const row=Math.max(0,Math.min(ROWS-1,Math.floor((oy+y/H*wh)/CELL)))*COLS;
   for(let x=0;x<W;x++){
    const i=(y*W+x)*4,r=px[i],g=px[i+1],b=px[i+2],light=field[row+col[x]];
    if(fireOnly){
     if(r<=160){   // fireStrength is exactly 0 here (first clamp), so the grade reduces to the plain shaded base colour
      const l=.299*r+.587*g+.114*b,s0=.74+light*.30,s1=.73+light*.24,s2=.76+light*.12;
      px[i]=Math.round(Math.max(0,Math.min(255,(l+(r-l)*1.03)*s0)));
      px[i+1]=Math.round(Math.max(0,Math.min(255,(l+(g-l)*1.03)*s1)));
      px[i+2]=Math.round(Math.max(0,Math.min(255,(l+(b-l)*1.03)*s2)));
      gl[i]=255;gl[i+1]=Math.min(230,g);gl[i+2]=20;gl[i+3]=0;
     }else{
      const s=fireStrength(r,g,b);
      hellColor(r,g,b,rgb,light);
      px[i]=rgb[0];px[i+1]=rgb[1];px[i+2]=rgb[2];
      gl[i]=255;gl[i+1]=Math.min(230,g);gl[i+2]=20;gl[i+3]=Math.round(255*s);
     }
    }else{
     emitAt(emit,r,g,b,em);
     hellColor(r,g,b,rgb,light,em[0]);
     px[i]=rgb[0];px[i+1]=rgb[1];px[i+2]=rgb[2];
     gl[i]=em[1];gl[i+1]=em[2];gl[i+2]=em[3];gl[i+3]=Math.round(255*em[0]);
    }
   }
   y++;
   if(performance.now()-t0>=budgetMs&&y<H)return false;
  }
  return true;
 }
 function finish(){p.putImageData(pixels,0,0);f.putImageData(glow,0,0);return {ground,fire};}
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
export async function prepareTownLighting(image,rect,budgetMs=4){
 if(typeof document==='undefined'||typeof performance==='undefined'||!image||!image.naturalWidth||cache.has(image))return;
 let job=pending.get(image);if(!job){job=startBake(image,rect);pending.set(image,job);}
 while(pending.get(image)===job&&!job.run(budgetMs))await yieldToFrame();
 if(pending.get(image)!==job)return;   // a synchronous layers() call finished it first
 pending.delete(image);cache.set(image,job.finish());
}
export function drawHellTerrain(ctx,image,time,reduced,...rect){
 const art=layers(image,rect);ctx.drawImage(art.ground,...rect);
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=reduced?.10:.13+.035*Math.sin(time/510)+.015*Math.sin(time/173);
 ctx.drawImage(art.fire,...rect);ctx.restore();
}
