import {createDistantLayer} from '../../../src/map-distant-layer.js';
import {loadTownReviewObjects,reviewObjectFootGrid} from '../../../src/map-review-town-objects.js';
import {createObjectDepthScene,drawObjectDepthQueue,authoredObjectFootGrid} from '../../../src/map-object-depth.js';
import {drawMapWeather,drawBiomeWeather} from '../../../src/map-ambient.js';
import {createRepairedFloor} from '../../../src/map-floor-repair.js';
import {createSurfaceMaterial} from '../../../src/map-surface-material.js';
import {traceStructureRuns,structureFootGrid,maskWithoutStructureFeet,drawStructureDepth,registerStructurePlate} from '../../../src/map-structures.js';
import {createFrontierNavigation} from '../../../src/dungeon-navigation.js';
import {routeRow} from '../../../src/route-geometry.js';
const $=id=>document.getElementById(id),ctx=$('scene').getContext('2d');
const owners={zone1:'town-owner-walkmask',zone2:'town-owner-walkmask-asia',zone3:'town-owner-walkmask-west',zone4:'town-owner-walkmask-cyberhell'};
const routes={border23:'asia:west',border34:'west:cyberhell'};
const heroes={zone1:'img/hero-yama.png',zone2:'img/Asia/hero-yama-asia.png',zone3:'img/West/hero-yama-west.png',zone4:'img/CyberHell/hero-yama-cyberhell.png',border23:'img/Asia/hero-yama-asia.png',border34:'img/West/hero-yama-west.png'};
let distant=null,townObjects=null,depthScene=null,depthSpec=null,liquidBase=null,weatherTime=0,floor=null,background=null,nature=null,rails=null,structure=null,heroImage=null,baseNav=null,nav=null,hero=null,path=[],reference=null,surface=null,atlas=null,sprites=null,paused=false,generation=0,maskCanvas=null,world=[3840,2560],baseStatus='';
function sourceLayers(){return [{id:'floor',image:floor,enabled:$('floor').checked},{id:'nature',image:nature,enabled:$('nature').checked}].filter(l=>l.enabled&&l.image);}
function rebuildDepth(){depthScene?.destroy();depthScene=createObjectDepthScene(sourceLayers(),depthSpec);}
$('floor').addEventListener('change',rebuildDepth);$('nature').addEventListener('change',rebuildDepth);
const keys=new Set(),load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error(src));im.src=src;});
async function ownerMask(id){
 if(routes[id]){const row=routeRow(routes[id]);return {mask:row.walkMask,corridor:row.corridor,start:row.corridor[0],world:[1672,941]};}
 const m=await import('../../../src/'+owners[id]+'.js');return {mask:{cols:480,rows:320,runs:m.TOWN_OWNER_WALK_RUNS},corridor:[[.5,.84],[.49,.38]],start:[.5,.84],world:[3840,2560]};
}
async function select(){
 if(distant)distant.width=distant.height=1;distant=null;const token=++generation,id=$('map').value;townObjects?.destroy();townObjects=null;depthScene?.destroy();depthScene=null;depthSpec=null;surface?.destroy();surface=null;liquidBase=floor=background=nature=rails=structure=heroImage=baseNav=nav=hero=reference=maskCanvas=null;path=[];keys.clear();$('map').disabled=true;$('status').textContent='กำลังโหลดทีละเลเยอร์…';
 try{
  const registry=await fetch('asset-manifest.json').then(r=>r.json()),spec=registry.maps[id];
  depthSpec=(await fetch('object-depth.json').then(r=>r.json())).maps[id];if(token!==generation)return;
  const bg=await load('../../../'+spec.reference);if(token!==generation)return;
  let fl=await load(spec.floor);if(token!==generation)return;
  const owner=await ownerMask(id);if(token!==generation)return;let floorRepair=null;
  if(spec.floorPatches?.length){floorRepair=await createRepairedFloor(fl,owner.mask,spec.floorPatches,{loadImage:load,infill:spec.floorInfill});if(token!==generation)return;fl=floorRepair.image;}
  const nat=await load(spec.nature);if(token!==generation)return;
  const railSource=spec.rails?await load(spec.rails):null;const rail=railSource?registerStructurePlate(railSource,spec.railsRegistration):null;if(token!==generation)return;
  const actor=await load('../../../'+heroes[id]);if(token!==generation)return;
  const townPlan=await fetch('town-object-plan.json').then(r=>r.json());
  if(townPlan.maps[id]){const manifest=await fetch('../../../img/manifest.json').then(r=>r.json());const loaded=await loadTownReviewObjects(townPlan.maps[id],townPlan.assets,{manifest,loadSprite:async(src,[w,h])=>{const scale=Math.min(1,512/Math.max(w,h));const blob=await fetch('../../../'+src).then(r=>{if(!r.ok)throw Error(src);return r.blob();});return createImageBitmap(blob,{resizeWidth:Math.max(1,Math.round(w*scale)),resizeHeight:Math.max(1,Math.round(h*scale)),resizeQuality:'high'});}});if(token!==generation){loaded.destroy();return;}townObjects=loaded;}
  if(!atlas)atlas=await load('material-atlas.png');if(token!==generation)return;
  if(!sprites){sprites={};for(const [kind,sheet]of Object.entries(registry.sprites))sprites[kind]={...sheet,image:await load(sheet.src)};if(token!==generation)return;}
  const c=$('scene');c.height=Math.round(c.width*(fl.naturalHeight||fl.height)/(fl.naturalWidth||fl.width));
  distant=await createDistantLayer(spec.distance,{width:c.width,height:c.height,loadImage:load});if(token!==generation){if(distant)distant.width=distant.height=1;return;}
  const liquidFile=spec.liquid||spec.flow;
  if(liquidFile){const liquid=await load(spec.liquid?liquidFile:'../../../'+liquidFile);if(token!==generation)return;liquidBase=spec.liquid?liquid:null;surface=createSurfaceMaterial(liquid,atlas,{width:c.width,height:c.height,encodedFlow:!spec.liquid,spriteSheets:sprites});}
  if(token!==generation)return;world=owner.world;baseNav=createFrontierNavigation(owner.mask,owner.corridor);
  let mask=owner.mask;
  if(rail){
   const rc=document.createElement('canvas');rc.width=rail.naturalWidth||rail.width;rc.height=rail.naturalHeight||rail.height;const rx=rc.getContext('2d',{willReadFrequently:true});rx.drawImage(rail,0,0);
   structure=traceStructureRuns(rx.getImageData(0,0,rc.width,rc.height).data,rc.width,rc.height,{footDepth:Math.max(3,Math.ceil(rc.height/mask.rows))});
   mask=maskWithoutStructureFeet(mask,structureFootGrid(structure,mask.cols,mask.rows));rc.width=rc.height=1;
  }
  if(depthSpec)mask=maskWithoutStructureFeet(mask,authoredObjectFootGrid(depthSpec,mask.cols,mask.rows));
  if(townObjects)mask=maskWithoutStructureFeet(mask,reviewObjectFootGrid(townObjects.objects,mask.cols,mask.rows,owner.world));
  nav=createFrontierNavigation(mask,owner.corridor);hero=nav.snap(owner.start);background=bg;floor=fl;nature=nat;rails=rail;heroImage=actor;rebuildDepth();
  maskCanvas=document.createElement('canvas');maskCanvas.width=nav.cols;maskCanvas.height=nav.rows;const mc=maskCanvas.getContext('2d'),data=mc.createImageData(nav.cols,nav.rows);
  for(let i=0;i<nav.cells.length;i++)if(nav.cells[i]){data.data[i*4]=40;data.data[i*4+1]=250;data.data[i*4+2]=130;data.data[i*4+3]=100;}mc.putImageData(data,0,0);
  $('motion').disabled=!surface;$('rails').disabled=!rails;
  baseStatus=`พื้น ${fl.naturalWidth||fl.width}×${fl.naturalHeight||fl.height} · ${rails?'เสา/ราวแยกแล้ว':'รอชั้นเสา/ราว'} · วัตถุ ${depthScene?.objects.length||0} + สไปรท์ ${townObjects?.objects.length||0} · ภาพร่างสำหรับตรวจตำแหน่งเท้า`;$('status').textContent=baseStatus;
  window.layerReviewGallery={get railImage(){return rails;},get liquidImage(){return liquidBase;},get distantImage(){return distant;},get heroImage(){return heroImage;},get surfaceSprites(){return sprites;},get townObjects(){return townObjects?.objects||[];},get townSpritePixels(){return townObjects?.decodedPixels||0;},get depthScene(){return depthScene;},get sourceLayers(){return sourceLayers();},get nav(){return nav;},get baseNav(){return baseNav;},get hero(){return hero;},get structure(){return structure;},world,sourceMask:owner.mask,floorRepair:floorRepair?{before:floorRepair.before,afterPatches:floorRepair.afterPatches,after:floorRepair.after,infillPixels:floorRepair.infillPixels,repairedPixels:floorRepair.repairedPixels}:null,storyGoals:routes[id]?[...routeRow(routes[id]).checkpointVertex.map(i=>owner.corridor[i]),owner.corridor.at(-1)]:null};
  if($('reference').checked)reference=await load('../../../'+spec.reference);
 }catch(e){if(token===generation)$('status').textContent='โหลดฉากไม่สำเร็จ: '+e.message;}
 finally{if(token===generation)$('map').disabled=false;}
}
$('map').onchange=select;
$('reference').onchange=async()=>{if($('reference').checked&&!reference){const token=generation,registry=await fetch('asset-manifest.json').then(r=>r.json()),im=await load('../../../'+registry.maps[$('map').value].reference);if(token===generation)reference=im;}};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'เล่น':'หยุด';};
$('scene').onclick=e=>{if(!nav||!hero)return;const r=$('scene').getBoundingClientRect(),goal=[(e.clientX-r.left)/r.width,(e.clientY-r.top)/r.height];path=nav.path(hero,goal);$('status').textContent=baseStatus+(path.length?'':' · จุดนี้เดินไม่ได้');$('scene').focus();};
const controls={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]};
window.addEventListener('keydown',e=>{if(!controls[e.key]||['INPUT','SELECT','BUTTON'].includes(e.target.tagName))return;e.preventDefault();keys.add(e.key);path=[];});
window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
let lastDraw=0;
function render(t){
 requestAnimationFrame(render);if(t-lastDraw<33)return;const dt=Math.min(.05,(t-lastDraw)/1000);lastDraw=t;const c=$('scene');
 if(hero&&nav&&!paused){
  let dx=0,dy=0;for(const k of keys){dx+=controls[k][0];dy+=controls[k][1];}
  if(dx||dy){const d=Math.hypot(dx,dy);hero=nav.move(hero,[hero[0]+dx/d*160*dt/world[0],hero[1]+dy/d*160*dt/world[1]]);}
  else if(path.length){const next=path[0],x=next[0]-hero[0],y=next[1]-hero[1],d=Math.hypot(x*world[0],y*world[1]),step=160*dt;if(d<=step){hero=next;path.shift();}else hero=nav.move(hero,[hero[0]+x*step/d,hero[1]+y*step/d]);}
 }
 if(!paused)weatherTime+=dt*1000;
 ctx.clearRect(0,0,c.width,c.height);
 const sky=ctx.createLinearGradient(0,0,0,c.height);sky.addColorStop(0,$('map').value==='zone4'?'#201b32':'#7f9baa');sky.addColorStop(1,'#d9e0dd');ctx.fillStyle=sky;ctx.fillRect(0,0,c.width,c.height);
 if($('distance').checked&&distant)ctx.drawImage(distant,0,0,c.width,c.height);
 if($('background').checked&&background)ctx.drawImage(background,0,0,c.width,c.height);
 if($('liquid').checked&&liquidBase)ctx.drawImage(liquidBase,0,0,c.width,c.height);
 surface?.draw(ctx,{time:t,paused,reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,enabled:$('motion').checked&&$('liquid').checked,w:c.width,h:c.height});
 if(depthScene)ctx.drawImage(depthScene.base,0,0,c.width,c.height);
 if($('mask').checked&&maskCanvas)ctx.drawImage(maskCanvas,0,0,c.width,c.height);
 const actors=[];
 if(hero&&heroImage)actors.push({depth:hero[1],draw(){const h=routes[$('map').value]?34:26,w=h*heroImage.naturalWidth/heroImage.naturalHeight;ctx.drawImage(heroImage,hero[0]*c.width-w/2,hero[1]*c.height-h,w,h);ctx.fillStyle='#ffd271';ctx.beginPath();ctx.arc(hero[0]*c.width,hero[1]*c.height,2,0,Math.PI*2);ctx.fill();}});
 const composed=depthScene?{...depthScene,objects:[...depthScene.objects,...($('objects').checked?townObjects?.objects||[]:[])]}:null;
 const ordered=$('depth').checked?composed:composed?{...composed,objects:composed.objects.map(o=>({...o,depth:-Infinity}))}:null;
 drawObjectDepthQueue(ctx,ordered,{x:0,y:0,w:c.width,h:c.height,actors,rails:$('rails').checked&&rails?{image:rails,structure}:null,drawRails:drawStructureDepth});
 if($('bounds').checked&&depthScene){ctx.save();ctx.strokeStyle='#ff69d3';ctx.fillStyle='#ffe7b0';ctx.font='12px system-ui';for(const obj of [...depthScene.objects,...(townObjects?.objects||[])]){const [x,y,w,h]=obj.rect;ctx.strokeRect(x*c.width,y*c.height,w*c.width,h*c.height);ctx.beginPath();ctx.moveTo(x*c.width,obj.depth*c.height);ctx.lineTo((x+w)*c.width,obj.depth*c.height);ctx.stroke();ctx.fillText(obj.id,x*c.width,y*c.height-3);}ctx.restore();}
 if($('weather').checked){const biomes={zone1:['th'],zone2:['asia'],zone3:['west'],zone4:['cyberhell'],border23:['asia','west'],border34:['west','cyberhell']},zones=biomes[$('map').value],reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;drawMapWeather(ctx,{time:t,paused,reduced,W:c.width,H:c.height,regions:zones.map((zone,i)=>({zone,from:i/zones.length,to:(i+1)/zones.length})),enabled:true});zones.forEach((zone,i)=>drawBiomeWeather(ctx,zone,weatherTime,c.width,c.height,reduced,[i/zones.length,0,(i+1)/zones.length,1],150));}
 if($('reference').checked&&reference){ctx.save();ctx.globalAlpha=.5;ctx.drawImage(reference,0,0,c.width,c.height);ctx.restore();}
}
window.addEventListener('pagehide',()=>{generation++;surface?.destroy();depthScene?.destroy();townObjects?.destroy();if(distant)distant.width=distant.height=1;keys.clear();});select();requestAnimationFrame(render);
