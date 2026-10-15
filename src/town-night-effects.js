// Night weather is attached to biomes and visible scenery, never to the UI or navigation.
import {TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES} from './town-layout.js?v=k1d';
import {drawLocalLight} from './scene-style.js';
const windows=[...TOWN_HOUSE_SITES,...Object.values(TOWN_STATION_SITES)];
const frac=n=>n-Math.floor(n),seed=n=>frac(Math.sin(n*127.1+311.7)*43758.5453),mod=(n,d)=>((n%d)+d)%d;
function view(ctx){const m=ctx.getTransform?.()||{a:1,d:1,e:0,f:0};return{x:-m.e/m.a,y:-m.f/m.d,w:ctx.canvas.width/m.a,h:ctx.canvas.height/m.d};}
export function drawTownNightEffects(ctx,time,reduced=false){
 const v=view(ctx),inside=(x,y,p=25)=>x>v.x-p&&x<v.x+v.w+p&&y>v.y-p&&y<v.y+v.h+p;
 ctx.save();ctx.globalCompositeOperation='screen';
 // Window/door halos pulse independently, not in synchrony with all the torches.
 for(const p of windows){
  const x=p.bx??p.x,y=(p.by??p.y)-(p.h||p.bw*.6)*.25,w=p.w||p.bw;
  if(!inside(x,y,w))continue;
  drawLocalLight(ctx,'th',x,y,w*.32,time+x*3,reduced);
 }
 ctx.restore();if(reduced)return;
 const t=time/1000;ctx.save();
 // Snow is confined to the ice plateau, with world-space drift and a shared camera transform.
 for(let i=0;i<105;i++){
  const x=2900+mod(seed(i+31)*940+t*(8+seed(i+12)*9),940),y=mod(seed(i+51)*1140+t*(15+seed(i+72)*18),1140);
  if(!inside(x,y))continue;ctx.globalAlpha=.35+seed(i+4)*.4;ctx.fillStyle='#e4f5ff';
  ctx.beginPath();ctx.arc(x,y,1.1+seed(i+20)*1.6,0,Math.PI*2);ctx.fill();
 }
 // Leaves fall beneath the real tree canopies (not across buildings, river or icy courtyard).
 for(const [j,p]of TOWN_PROP_SITES.entries()){
  if(p.kind!=='tree'||p.biome==='ice'||!inside(p.x,p.y,p.w))continue;
  for(let i=0;i<2;i++){
   const age=mod(t*.12+seed(j*3+i),1),x=p.x+(seed(j+i+4)-.5)*p.w*.7+Math.sin(age*6+j)*12,y=p.y-p.w*.8+age*p.w*.8;
   ctx.save();ctx.translate(x,y);ctx.rotate(t*.7+j+i);ctx.globalAlpha=Math.sin(age*Math.PI)*.75;
   ctx.fillStyle=p.biome==='lava'?'#ff8550':['#d6ac57','#b1c67c','#b97649'][j%3];
   ctx.beginPath();ctx.ellipse(0,0,3.3,1.5,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
 }
 ctx.restore();
}
