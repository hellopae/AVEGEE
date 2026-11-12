import {drawMapWeather,drawBiomeWeather,drawSceneLava,weatherEnabled,weatherBudget,viewMetrics,MAP_FX} from './map-ambient.js';
import {createSceneFluid,loadSceneFxLayout,sceneFxLayoutNow,sceneFxFor,sceneFxKey} from './scene-fluid-fx.js';
export const ATMOSPHERE = Object.freeze({maxCanvasPixels:900000,maxParticles:160,mobileParticles:70,frameMs:33});
// FB2-1: the two lamps by the civic stair stood on top of the rock (1720,1200 / 2115,1200); moved to the foot of the stair where the owner arrows point (still on blocked margin)
export const TH_ATMOS_LAMPS=Object.freeze([{x:1764,y:1247,w:44},{x:1937,y:1240,w:44}].map(Object.freeze));
export const TH_LAMP_ART='img/theme-v4/town-lamp-gold-th-v1.webp';
export const SCENE_EFFECTS=Object.freeze({
 th:Object.freeze(['cloud','leaves','lava']),asia:Object.freeze(['cloud','leaves','light','lava']),
 west:Object.freeze(['cloud','fog','snow']),cyberhell:Object.freeze(['cloud','rain','lightning']),
});
const backgrounds=new Map();
function sceneBackground(world){
 const source=getComputedStyle(world).backgroundImage.match(/url\(["']?(.*?)["']?\)/)?.[1];if(!source)return null;
 if(!backgrounds.has(source)){const image=new Image();image.src=source;backgrounds.set(source,image);}
 return backgrounds.get(source);
}
export function sceneBackgroundBox(W,H,sw,sh,position='50% 50%'){
 const scale=Math.max(W/sw,H/sh),w=sw*scale,h=sh*scale,parts=position.split(/\s+/);
 const fraction=v=>v==='center'?.5:v==='left'||v==='top'?0:v==='right'||v==='bottom'?1:parseFloat(v)/100;
 return {x:(W-w)*(fraction(parts[0])||0),y:(H-h)*(Number.isFinite(fraction(parts[1]))?fraction(parts[1]):.5),w,h};
}
export function drawThaiLeaves(ctx,time,W,H,reduced=false){
 if(reduced)return 0;const count=12,t=time/1000;ctx.save();
 for(let i=0;i<count;i++){
  const x=((i*.173*W+t*(13+i%4*3))%W),y=((i*.283*H+t*(18+i%3*5))%H),size=4+i%4;
  ctx.save();ctx.translate(x,y);ctx.rotate(t*.6+i);ctx.globalAlpha=.42;ctx.fillStyle=i%2?'#b66c3d':'#d3a24b';
  ctx.beginPath();ctx.moveTo(-size,0);ctx.quadraticCurveTo(0,-size*.7,size,0);ctx.quadraticCurveTo(0,size*.5,-size,0);ctx.fill();ctx.restore();
 }
 ctx.restore();return count;
}
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
/** Particle ceiling of the zone-3 snow / zone-4 rain in a dialog scene: the map's own density rule (MAP_FX.snow.max / rain.max scaled by the visible
 *  area and sqrt(dpr)), but never more than SCENE_WEATHER.max; a phone 390 px wide gets a real snowfall, a desktop window about three times that. */
export const SCENE_WEATHER=Object.freeze({max:Object.freeze({west:340,cyberhell:380}),ref:[1100,700]});
export function sceneWeatherCap(zone,width,height,dpr=1){
 const base=zone==='west'?MAP_FX.snow.max:zone==='cyberhell'?MAP_FX.rain.max:0;if(!base)return null;
 return Math.max(24,Math.min(SCENE_WEATHER.max[zone],Math.round(base*Math.min(1,width*height/(SCENE_WEATHER.ref[0]*SCENE_WEATHER.ref[1]))/Math.sqrt(Math.max(1,dpr)))));
}
/** Things that must stay readable under rain, snow and cloud shadows: name plates, hit points, damage numbers, move names. The canvas is cut open there. */
export const SCENE_CLEAR_SELECTOR='.plate,.dmg,.battle-move-name,.target-arrow,.nm,.relief-label,.hpbar';
/** One reused shared biome engine for battle and interrogation; particle count is capped by CSS area.
 *  `clouds:false` = an indoor picture (the cave): no cloud shadows, no falling leaves. `quiet` = paused: nothing may flash. */
export function drawSceneAtmosphere(ctx,zone,time,W,H,{reduced=false,enabled=weatherEnabled(),paused=false,clouds=true,leaves=true,quiet=false}={}){
 if(!enabled||!(W>0&&H>0))return {particles:0};
 const dpr=globalThis.devicePixelRatio||1,cap=sceneWeatherCap(zone,W,H,dpr)??atmosphereBudget(W,H,dpr);
 drawMapWeather(ctx,{zone,time,W,H,reduced,paused,enabled,clouds,sceneClouds:true,viewport:{width:W,height:H,dpr}});
 if(zone==='west'){
  const wash=ctx.createLinearGradient(0,H*.72,0,H);wash.addColorStop(0,'rgba(234,247,255,0)');wash.addColorStop(1,'rgba(234,247,255,.16)');ctx.save();ctx.fillStyle=wash;ctx.fillRect(0,H*.72,W,H*.28);ctx.restore();
 }
 if(zone==='th'&&leaves)drawThaiLeaves(ctx,time,W,H,reduced);
 drawBiomeWeather(ctx,zone,time,W,H,reduced,[0,0,1,1],cap,{quiet});
 return {particles:reduced?0:Math.min(cap,zone==='west'||zone==='cyberhell'?cap:weatherBudget({width:W,height:H,dpr})),cloudPeak:.2};
}
export const SCENE_BLENDS=Object.freeze(['overlay','screen','soft-light','luminosity']);   // CSS mix-blend-mode of a ground canvas; anything else = normal
let styles=false;
function mountStyles(){if(styles)return;styles=true;const sheet=document.createElement('style');sheet.textContent=`
.scene-atmosphere{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;z-index:6;pointer-events:none!important;contain:strict}
.scene-atmosphere-ground{z-index:0!important}
.scene-atmosphere.scene-fluid[data-blend=overlay]{mix-blend-mode:overlay}.scene-atmosphere.scene-fluid[data-blend=screen]{mix-blend-mode:screen}.scene-atmosphere.scene-fluid[data-blend=soft-light]{mix-blend-mode:soft-light}.scene-atmosphere.scene-fluid[data-blend=luminosity]{mix-blend-mode:luminosity}
.arena .scene-atmosphere[data-context=battle]:not(.scene-atmosphere-ground){z-index:30}
.arena>.cam-world{isolation:isolate}.arena>.battle-team-hud,.arena>.battle-boss-hud,.arena>.battle-scene-talk,.arena>.battle-timeline{z-index:10}
`;document.head.append(sheet);}
// One clock + one painted-fluid player per picture, kept across the repaints of a scene (every battle action re-creates the cam-world): the
// shadows do not jump back and the decoded frames are not rebuilt. They are dropped a few seconds after the last scene closed.
const shared={elapsed:0,mounts:0,idleTimer:0,players:new Map()};
function acquire(){clearTimeout(shared.idleTimer);shared.mounts++;}
function release(){shared.mounts=Math.max(0,shared.mounts-1);if(shared.mounts)return;clearTimeout(shared.idleTimer);
 shared.idleTimer=setTimeout(()=>{if(shared.mounts)return;shared.elapsed=0;for(const p of shared.players.values())p.player.destroy();shared.players.clear();},4000);}
function playerFor(key,scene,layout,background){
 let hit=shared.players.get(key);if(hit&&hit.layout===layout)return hit.player;hit?.player.destroy();
 const player=createSceneFluid(scene,layout,background);shared.players.set(key,{player,layout});return player;
}
/** Mount inside the same camera world as the art. HUD is a sibling; effects never intercept input. */
export function mountSceneAtmosphere(stage,{zone='th',context='battle',paused=()=>false}={}){
 const world=stage?.querySelector(':scope > .cam-world');if(!world)return null;
 if(active.has(world))return active.get(world);mountStyles();acquire();
 const canvas=document.createElement('canvas');canvas.className='scene-atmosphere';canvas.dataset.zone=zone;canvas.dataset.context=context;canvas.setAttribute('aria-hidden','true');world.append(canvas);
 const effects=SCENE_EFFECTS[zone]||SCENE_EFFECTS.th;canvas.dataset.effects=effects.join(',');
 const background=sceneBackground(world),bgKey=sceneFxKey(background?.src||'');
 // painted fluids: the layout decides per picture. Until it has loaded (or for a picture that is not in it) zone 1-2 keep the older colour-keyed lava glints.
 let scene=sceneFxFor(sceneFxLayoutNow(),bgKey),settled=sceneFxLayoutNow()!==null,player=null;
 const wantsOldLava=()=>effects.includes('lava')&&!scene&&(zone!=='th'||settled);
 const ground=effects.includes('lava')&&!scene?document.createElement('canvas'):null;
 if(ground){ground.className='scene-atmosphere scene-atmosphere-ground';ground.setAttribute('aria-hidden','true');world.prepend(ground);}
 const groundCtx=ground?.getContext('2d');
 const groups=new Map();   // blend -> {canvas, ctx}: created the first time a painted piece needs it
 const groupCtx=blend=>{
  const b=SCENE_BLENDS.includes(blend)?blend:'normal';let g=groups.get(b);
  if(!g){const c=document.createElement('canvas');c.className='scene-atmosphere scene-atmosphere-ground scene-fluid';c.dataset.blend=b;c.setAttribute('aria-hidden','true');
   world.prepend(c);g={canvas:c,ctx:c.getContext('2d')};groups.set(b,g);sizeGroup(g);g.fresh=true;}
  return g.ctx;
 };
 const ctx=canvas.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');let width=1,height=1,dpr=1,fluidDpr=1,frame=0,last=0,drawAt=-Infinity,disposed=false,clearAt=0,holes=[],heldDrawn=false;
 const sizeGroup=g=>{g.canvas.width=Math.max(1,Math.floor(width*fluidDpr));g.canvas.height=Math.max(1,Math.floor(height*fluidDpr));};
 function resize(){width=Math.max(1,world.clientWidth);height=Math.max(1,world.clientHeight);
  dpr=Math.min(globalThis.devicePixelRatio||1,1.5,Math.sqrt(ATMOSPHERE.maxCanvasPixels/(width*height*(ground?2:1))));
  fluidDpr=Math.min(1,dpr,Math.sqrt(ATMOSPHERE.maxCanvasPixels/(width*height*2)));
  canvas.width=Math.max(1,Math.floor(width*dpr));canvas.height=Math.max(1,Math.floor(height*dpr));
  if(ground){ground.width=Math.max(1,Math.floor(width*dpr));ground.height=Math.max(1,Math.floor(height*dpr));}
  for(const g of groups.values())sizeGroup(g);
  canvas.dataset.pixelBudget=String(canvas.width*canvas.height+(ground?ground.width*ground.height:0)+[...groups.values()].reduce((n,g)=>n+g.canvas.width*g.canvas.height,0));}
 const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;observer?.observe(world);resize();
 if(!settled&&bgKey)loadSceneFxLayout().then(l=>{settled=true;scene=sceneFxFor(l,bgKey);if(scene&&groundCtx){groundCtx.setTransform(1,0,0,1,0,0);groundCtx.clearRect(0,0,ground.width,ground.height);}});
 /** CSS-px rectangles (world space) of the things that must stay clean; measured through the canvas' own box so the camera zoom does not matter. */
 function measureHoles(){
  const cb=canvas.getBoundingClientRect(),k=cb.width>0?width/cb.width:1;holes=[];
  for(const el of world.querySelectorAll(SCENE_CLEAR_SELECTOR)){
   const r=el.getBoundingClientRect();if(!(r.width>0&&r.height>0))continue;
   holes.push([(r.left-cb.left)*k-4,(r.top-cb.top)*k-4,r.width*k+8,r.height*k+8]);
  }
 }
 function destroy(){if(disposed)return;disposed=true;cancelAnimationFrame(frame);observer?.disconnect();canvas.remove();ground?.remove();for(const g of groups.values())g.canvas.remove();groups.clear();active.delete(world);release();}
 const state={canvas,ground,destroy,groups,stats:()=>({elapsed:shared.elapsed,width,height,pixels:+canvas.dataset.pixelBudget,disposed,fluid:player?.stats?.()||null,holes:holes.length}),holes:()=>holes};active.set(world,state);
 function tick(now){if(disposed)return;const dialog=stage.closest('dialog');if(!world.isConnected||(dialog&&!dialog.open)){destroy();return;}
  const hold=paused()||document.hidden;const dt=last?Math.min(120,Math.max(0,now-last)):0;last=now;if(!hold&&!reduced.matches)shared.elapsed+=dt;
  // a held scene (pause menu, hidden tab) is drawn once more without any flash, then left alone
  if(hold&&heldDrawn){frame=requestAnimationFrame(tick);return;}
  heldDrawn=hold;
  if(now-drawAt>=ATMOSPHERE.frameMs||hold){drawAt=now;const elapsed=shared.elapsed;
   const on=weatherEnabled()&&!reduced.matches;
   // ---- ground: painted fluids (or the older colour-keyed lava) between the picture and the figures
   const bgReady=background?.complete&&background.naturalWidth;
   const box=bgReady?sceneBackgroundBox(width,height,background.naturalWidth,background.naturalHeight,getComputedStyle(world).backgroundPosition):null;
   for(const g of groups.values()){g.ctx.setTransform(1,0,0,1,0,0);g.ctx.clearRect(0,0,g.canvas.width,g.canvas.height);g.ctx.setTransform(fluidDpr,0,0,fluidDpr,0,0);}
   if(on&&scene&&box){
    if(!player)player=playerFor(bgKey,scene,sceneFxLayoutNow(),background);
    const n=player.draw(groupCtx,elapsed/1000,box,{dprF:fluidDpr,W:width,H:height});canvas.dataset.fluidPieces=String(n);
    if(groundCtx){groundCtx.setTransform(1,0,0,1,0,0);groundCtx.clearRect(0,0,ground.width,ground.height);}
   }else if(groundCtx){
    groundCtx.setTransform(1,0,0,1,0,0);groundCtx.clearRect(0,0,ground.width,ground.height);
    if(on&&wantsOldLava()&&box){
     groundCtx.setTransform(dpr,0,0,dpr,0,0);groundCtx.save();groundCtx.translate(box.x,box.y);
     ground.dataset.lavaDrawn=String(drawSceneLava(groundCtx,background,zone,elapsed,box.w,box.h,reduced.matches));groundCtx.restore();
    }
   }
   // ---- sky: cloud shadows, leaves, snow / rain / lightning above the figures, cut open over plates and numbers
   if(now-clearAt>60){clearAt=now;measureHoles();}   // a damage number floats: follow it every other frame
   ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);
   const indoor=scene?scene.outdoor===false:false;
   // the interrogation world is taller than the screen (the panels scroll over it): weather and shadows live in the part that can be seen
   const sky=context==='trial'?Math.max(160,Math.min(height,stage.clientHeight||height)):height;
   const stats=drawSceneAtmosphere(ctx,zone,elapsed,width,sky,{reduced:reduced.matches,paused:hold,clouds:!indoor,leaves:!indoor,quiet:hold});
   if(holes.length){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.fillStyle='#000';for(const h of holes)ctx.fillRect(h[0],h[1],h[2],h[3]);ctx.restore();}
   canvas.dataset.holes=String(holes.length);canvas.dataset.particles=String(stats.particles);canvas.dataset.elapsed=String(Math.round(elapsed));canvas.dataset.indoor=String(indoor);}
  frame=requestAnimationFrame(tick);
 }
 frame=requestAnimationFrame(tick);return state;
}
