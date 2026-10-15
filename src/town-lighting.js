// Vivid night: cool ambient light, warm pools around actual town fixtures, emissive lava.
// Pixel grading and fixture falloff are cached; animation only blits two layers.
import {TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES,TOWN_DAIS,TOWN_SIZE} from './town-layout.js?v=k1d';
const cache=new WeakMap(),clamp=x=>Math.max(0,Math.min(1,x));
export function fireStrength(r,g,b){return clamp((r-160)/70)*clamp((r-b-70)/90)*clamp((g-b-20)/60)*clamp((100-b)/65);}
const fixtures=[
 ...TOWN_PROP_SITES.filter(p=>p.kind==='torch'||p.kind==='lamp').map(p=>({x:p.x,y:p.y-25,r:p.kind==='torch'?135:95,power:.9})),
 ...TOWN_HOUSE_SITES.map(p=>({x:p.x,y:p.y-p.h*.25,r:p.w*.95,power:.65})),
 ...Object.values(TOWN_STATION_SITES).map(p=>({x:p.bx,y:p.by-35,r:p.bw*.75,power:.60})),
 {x:TOWN_DAIS.x-65,y:TOWN_DAIS.y-40,r:150,power:.7},{x:TOWN_DAIS.x+65,y:TOWN_DAIS.y-40,r:150,power:.7},
];
const CELL=32,COLS=Math.ceil(TOWN_SIZE.w/CELL),ROWS=Math.ceil(TOWN_SIZE.h/CELL),field=new Float32Array(COLS*ROWS);
for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){
 let sum=0;for(const f of fixtures){const d=Math.hypot((x+.5)*CELL-f.x,(y+.5)*CELL-f.y)/f.r;if(d<1)sum+=f.power*(1-d)*(1-d);}
 field[y*COLS+x]=Math.min(1,sum);
}
export function townLightAt(x,y){return field[Math.max(0,Math.min(ROWS-1,Math.floor(y/CELL)))*COLS+Math.max(0,Math.min(COLS-1,Math.floor(x/CELL)))];}
export function hellColor(r,g,b,out=[0,0,0],light=0){
 const fire=fireStrength(r,g,b),l=.299*r+.587*g+.114*b;
 for(let i=0;i<3;i++){
  const v=i===0?r:i===1?g:b;
  const shade=(i===0?.43:i===1?.48:.66)+light*(i===0?.62:i===1?.40:.12);
  const base=(l+(v-l)*.92)*shade,boost=i===0?1.13:i===1?1.08:1;
  out[i]=Math.round(Math.max(0,Math.min(255,base*(1-fire)+v*boost*fire)));
 }
 return out;
}
function layers(image,rect){
 let entry=cache.get(image);if(entry)return entry;
 const ground=document.createElement('canvas'),fire=document.createElement('canvas');
 ground.width=fire.width=image.naturalWidth;ground.height=fire.height=image.naturalHeight;
 const p=ground.getContext('2d',{willReadFrequently:true}),f=fire.getContext('2d');p.drawImage(image,0,0);
 const pixels=p.getImageData(0,0,ground.width,ground.height),glow=f.createImageData(ground.width,ground.height),rgb=[0,0,0];
 // Preview crops use the whole-world transform; streamed tiles use their own world rectangle.
 const [ox,oy,ww,wh]=rect.length===8?[0,0,TOWN_SIZE.w,TOWN_SIZE.h]:rect;
 for(let y=0;y<ground.height;y++)for(let x=0;x<ground.width;x++){
  const i=(y*ground.width+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],s=fireStrength(r,g,b);
  hellColor(r,g,b,rgb,townLightAt(ox+x/ground.width*ww,oy+y/ground.height*wh));
  pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];
  glow.data[i]=255;glow.data[i+1]=Math.min(230,g);glow.data[i+2]=20;glow.data[i+3]=Math.round(255*s);
 }
 p.putImageData(pixels,0,0);f.putImageData(glow,0,0);entry={ground,fire};cache.set(image,entry);return entry;
}
export function drawHellTerrain(ctx,image,time,reduced,...rect){
 const art=layers(image,rect);ctx.drawImage(art.ground,...rect);
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=reduced?.10:.13+.035*Math.sin(time/510)+.015*Math.sin(time/173);
 ctx.drawImage(art.fire,...rect);ctx.restore();
}
