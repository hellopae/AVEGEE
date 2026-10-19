// Night weather is attached to biomes and visible scenery, never to the UI or navigation.
import {TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES} from './town-layout.js?v=k1d';
import {drawLocalLight} from './scene-style.js';
const windows=[...TOWN_HOUSE_SITES,...Object.values(TOWN_STATION_SITES)];
const frac=n=>n-Math.floor(n),seed=n=>frac(Math.sin(n*127.1+311.7)*43758.5453),mod=(n,d)=>((n%d)+d)%d;
function view(ctx){const m=ctx.getTransform?.()||{a:1,d:1,e:0,f:0};return{x:-m.e/m.a,y:-m.f/m.d,w:ctx.canvas.width/m.a,h:ctx.canvas.height/m.d};}
let cloudArt=null;
function cloudSprite(){
 if(cloudArt||typeof document==='undefined')return cloudArt;
 const c=document.createElement('canvas');c.width=256;c.height=96;const p=c.getContext('2d');
 const blobs=[[42,59,42,25],[82,43,52,36],[132,49,62,34],[184,57,51,26],[220,66,31,18]];
 for(const [x,y,rx,ry]of blobs){
  const g=p.createRadialGradient(x,y,2,x,y,rx);g.addColorStop(0,'rgba(255,249,235,.62)');
  g.addColorStop(.56,'rgba(244,239,226,.28)');g.addColorStop(1,'rgba(236,231,224,0)');
  p.save();p.translate(x,y);p.scale(1,ry/rx);p.fillStyle=g;p.beginPath();p.arc(0,0,rx,0,Math.PI*2);p.fill();p.restore();
 }
 return(cloudArt=c);
}
// Thin cloud banks move above the painted cloud biome.  This is a ground pass so they never wash
// over characters, dialogue or buildings in the shared depth queue.
export function drawTownClouds(ctx,time,reduced=false){
 const art=cloudSprite();if(!art)return;const v=view(ctx),t=reduced?0:time/1000;
 const banks=[[1650,150,340,.10],[2080,310,420,.075],[2620,470,380,.09],[3040,255,300,.065]];
 ctx.save();ctx.globalCompositeOperation='screen';
 for(let i=0;i<banks.length;i++){
  const [ox,oy,w,speed]=banks[i],travel=260,x=ox+mod(t*speed*60+i*73,travel)-travel/2;
  if(x+w<v.x||x-w>v.x+v.w||oy+160<v.y||oy-160>v.y+v.h)continue;
  const h=w*art.height/art.width;ctx.globalAlpha=.16+i*.015;
  ctx.drawImage(art,x-w/2,oy-h/2+Math.sin(t*.08+i)*10,w,h);
 }
 ctx.restore();
}
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
   // Pointed asymmetric leaf silhouette, rather than the old circular confetti dots.
   const s=3.2+seed(j*11+i)*1.8;
   ctx.beginPath();ctx.moveTo(0,-s);ctx.bezierCurveTo(s*.9,-s*.25,s*.65,s*.72,0,s);
   ctx.bezierCurveTo(-s*.82,s*.28,-s*.75,-s*.55,0,-s);ctx.fill();
   ctx.globalAlpha*=.55;ctx.strokeStyle='rgba(74,41,18,.65)';ctx.lineWidth=.45;
   ctx.beginPath();ctx.moveTo(0,-s*.7);ctx.lineTo(0,s*.78);ctx.stroke();ctx.restore();
  }
 }
 ctx.restore();
}
