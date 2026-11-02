import {drawMapWeather,drawBiomeWeather,weatherEnabled,weatherBudget,viewMetrics} from './map-ambient.js';
export const ATMOSPHERE = Object.freeze({maxCanvasPixels:900000,maxParticles:160,mobileParticles:70,frameMs:33});
export const TH_ATMOS_LAMPS=Object.freeze([{x:1720,y:1200,w:44},{x:2115,y:1200,w:44}].map(Object.freeze));
export const TH_LAMP_ART='img/theme-v4/town-lamp-gold-th-v1.webp';
const active=new WeakMap(),fraction=n=>n-Math.floor(n),noise=n=>fraction(Math.sin(n*127.1+311.7)*43758.5453);
export function atmosphereBudget(width,height,dpr=1){return Math.min(ATMOSPHERE.maxParticles,Math.max(24,Math.round(ATMOSPHERE.maxParticles*Math.min(1,width*height/900000)/Math.max(1,dpr/1.5))));}
/** Soft snow lies on validated floor only. No images/pixels/masks are read back in this draw. */
export function drawSnowGround(ctx,W,H,{validAt=()=>true,area=[0,0,1,1],strength=.25}={}){
 const view=viewMetrics(ctx,W,H);if(!view)return;const [ax,ay,bx,by]=area,cell=110;
 ctx.save();ctx.fillStyle='#f1f8ff';let drawn=0;
 for(let row=Math.floor(Math.max(view.y,ay*H)/cell);row<=Math.ceil(Math.min(view.y+view.h,by*H)/cell)&&drawn<120;row++)for(let col=Math.floor(Math.max(view.x,ax*W)/cell);col<=Math.ceil(Math.min(view.x+view.w,bx*W)/cell)&&drawn<120;col++){
  const id=row*73+col,x=(col+.2+noise(id)*.6)*cell,y=(row+.2+noise(id+70)*.6)*cell,rx=22+noise(id+12)*20,ry=8+noise(id+16)*9;
  if(x<ax*W||x>bx*W||y<ay*H||y>by*H||!validAt(x,y)||!validAt(x-rx,y)||!validAt(x+rx,y)||!validAt(x,y-ry)||!validAt(x,y+ry))continue;
  ctx.globalAlpha=strength*(.55+.45*noise(id+9));ctx.beginPath();ctx.ellipse(x,y,rx,ry,-.18,0,Math.PI*2);ctx.fill();drawn++;
 }
 ctx.restore();return drawn;
}
/** One reused shared biome engine for battle and interrogation; particle count is capped by CSS area. */
export function drawSceneAtmosphere(ctx,zone,time,W,H,{reduced=false,enabled=weatherEnabled(),paused=false}={}){
 if(!enabled||!(W>0&&H>0))return {particles:0};
 const dpr=globalThis.devicePixelRatio||1,cap=atmosphereBudget(W,H,dpr);
 drawMapWeather(ctx,{zone,time,W,H,reduced,paused,enabled,viewport:{width:W,height:H,dpr}});
 if(zone==='west'){
  const wash=ctx.createLinearGradient(0,H*.72,0,H);wash.addColorStop(0,'rgba(234,247,255,0)');wash.addColorStop(1,'rgba(234,247,255,.16)');ctx.save();ctx.fillStyle=wash;ctx.fillRect(0,H*.72,W,H*.28);ctx.restore();
 }
 drawBiomeWeather(ctx,zone,time,W,H,reduced,[0,0,1,1],cap);
 return {particles:reduced?0:Math.min(cap,zone==='west'||zone==='cyberhell'?cap:weatherBudget({width:W,height:H,dpr})),cloudPeak:zone==='th'||zone==='asia'?.2:.45};
}
let styles=false;
function mountStyles(){if(styles)return;styles=true;const sheet=document.createElement('style');sheet.textContent=`
.scene-atmosphere{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:6;pointer-events:none!important;contain:strict}
.scene-atmosphere-props{position:absolute;inset:0;z-index:1;pointer-events:none!important;overflow:hidden}
.scene-atmosphere-props img{position:absolute;bottom:8%;height:45%;width:auto;max-width:14%;object-fit:contain;opacity:.92;pointer-events:none!important}
.scene-atmosphere-props img:first-child{left:5%}.scene-atmosphere-props img:last-child{right:5%}
.arena>.cam-world{isolation:isolate}.arena>.battle-team-hud,.arena>.battle-boss-hud,.arena>.battle-scene-talk,.arena>.battle-timeline{z-index:10}
`;document.head.append(sheet);}
/** Mount inside the same camera world as the art. HUD is a sibling; effects never intercept input. */
export function mountSceneAtmosphere(stage,{zone='th',context='battle',paused=()=>false}={}){
 const world=stage?.querySelector(':scope > .cam-world');if(!world)return null;
 if(active.has(world))return active.get(world);mountStyles();
 const canvas=document.createElement('canvas');canvas.className='scene-atmosphere';canvas.dataset.zone=zone;canvas.dataset.context=context;canvas.setAttribute('aria-hidden','true');world.append(canvas);
 let props=null;if(zone==='th'){props=document.createElement('div');props.className='scene-atmosphere-props';props.setAttribute('aria-hidden','true');for(let i=0;i<2;i++){const image=document.createElement('img');image.src=TH_LAMP_ART;image.alt='';props.append(image);} (context==='trial'?world.querySelector('.cam-stage-box')||world:world).prepend(props);}
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let width=1,height=1,dpr=1,frame=0,last=0,elapsed=0,drawAt=-Infinity,disposed=false;
 function resize(){width=Math.max(1,world.clientWidth);height=Math.max(1,world.clientHeight);dpr=Math.min(globalThis.devicePixelRatio||1,1.5,Math.sqrt(ATMOSPHERE.maxCanvasPixels/(width*height)));canvas.width=Math.max(1,Math.round(width*dpr));canvas.height=Math.max(1,Math.round(height*dpr));canvas.dataset.pixelBudget=String(canvas.width*canvas.height);}
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(world);resize();
 function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.remove();props?.remove();active.delete(world);}
 const state={canvas,destroy,stats:()=>({elapsed,width,height,pixels:canvas.width*canvas.height,disposed})};active.set(world,state);
 function tick(now){if(disposed)return;const dialog=stage.closest('dialog');if(!world.isConnected||(dialog&&!dialog.open)){destroy();return;}const hold=paused()||document.hidden;const dt=last?Math.min(120,Math.max(0,now-last)):0;last=now;if(!hold&&!reduced.matches)elapsed+=dt;
  if(now-drawAt>=ATMOSPHERE.frameMs){drawAt=now;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);const stats=drawSceneAtmosphere(ctx,zone,elapsed,width,height,{reduced:reduced.matches,paused:hold});canvas.dataset.particles=String(stats.particles);canvas.dataset.elapsed=String(Math.round(elapsed));}
  frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);return state;
}
