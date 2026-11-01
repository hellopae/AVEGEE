import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ROUTE_FOREGROUND} from '../src/route-occlusion.js';
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
let failReplacement=false;
globalThis.Image=class {complete=true;naturalWidth=512;naturalHeight=1024;set src(v){this._src=v;queueMicrotask(()=>failReplacement&&v.startsWith('img/frontier-route/tree-')?this.onerror?.():this.onload?.());}get src(){return this._src;}};
const drawn=[];let captureDraw=false;
const ctx=new Proxy({drawImage(...args){if(captureDraw)drawn.push(args);},getImageData:()=>({data:new Uint8ClampedArray(512*1024*4)}),createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
const node=()=>({getContext:()=>ctx,handlers:{},addEventListener(k,f){this.handlers[k]=f;},removeEventListener(){},focus(){},setPointerCapture(){},remove(){}});
let frame,clock=1000,size=1280,stageHeight=800;
const windowHandlers={};
globalThis.window={matchMedia:()=>({matches:true}),devicePixelRatio:1,addEventListener(k,f){windowHandlers[k]=f;},removeEventListener(){}};
globalThis.requestAnimationFrame=f=>{frame=f;return 1;};globalThis.cancelAnimationFrame=()=>{};
let root;
globalThis.document={documentElement:{},createElement(tag){if(tag==='canvas')return node();const main=node(),mini=node(),status=node(),loading=node(),guide=node(),challenge=node(),menu=node();
 const hud=['profile','manual','bag','pause','settings'].map(k=>Object.assign(node(),{dataset:{hud:k}}));
 const stage={insertAdjacentHTML(){}},controls=Object.fromEntries(['less','more','overview'].map(k=>[k,node()]));
 main.parentElement={getBoundingClientRect:()=>({width:size,height:stageHeight})};main.getBoundingClientRect=()=>({left:0,top:0,width:size,height:stageHeight});
 root={...node(),classList:{add(){}},querySelectorAll:()=>hud,controls,hud,main,mini,querySelector:s=>s==='.dungeon-stage'?stage:s.startsWith('[data-zoom=')?controls[s.match(/"(.*?)"/)[1]]:({' .unused':null,'.dungeon-stage > canvas':main,'.dungeon-minimap':mini,'.dungeon-status':status,'.dungeon-load':loading,'.dungeon-guide':guide,'.dungeon-challenge':challenge,'[data-action="menu"]':menu})[s]};return root;}};
const view=await import('../src/dungeon-view.js');const travel=await import('../src/zone-travel.js');const {frontierCameraTarget}=await import('../src/frontier-view-metrics.js');
await new Promise(r=>setImmediate(r));
const tick=(ms=16)=>{clock+=ms;frame(clock);};
const pos=g=>Object.values(g.zoneTravel.active.position);
function click(g,p){const cam=frontierCameraTarget(size,stageHeight,pos(g)),e={pointerId:1,clientX:cam.x+p[0]*1672*cam.scale,clientY:cam.y+p[1]*941*cam.scale};root.main.handlers.pointerdown(e);root.main.handlers.pointerup(e);}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const id='west:cyberhell';
const {routeRow}=await import('../src/route-geometry.js');const row=routeRow(id);
function game(){const g={zone:'west',bossCleared:{west:true},zoneEvents:{},save(){}};travel.initializeZoneTravel(g);travel.beginDungeon(g,'cyberhell');g.zoneTravel.active.patrolDefeated=travel.dungeonPatrols(id).map(p=>p.id);return g;}
for(const width of [1280,390])test(`B34 native view handlers ${width}: traverse three gated fights and reach cyber exit`,async()=>{
 size=width;stageHeight=width===390?844:800;const g=game();let arrived=false;
 for(let cp=0;cp<3;cp++){
  let encounter=null;const destroy=view.mountDungeonView({append(){}},g,{onEncounter:e=>{encounter=e;}});
  tick();const goal=view.dungeonPoint(view.dungeonCheckpointProgress(id)[cp],id);
  click(g,view.dungeonSnap(goal,id,view.dungeonCheckpointProgress(id)[cp]-.018));
  let still=0,last=pos(g),pressed=false;
  for(let i=0;i<2000&&!encounter;i++){
   // Q4-3: enemies stroll and never start a fight with a standing Yama; once her route has ended at the road limit the player keeps pressing toward the enemy.
   const p=pos(g);still=distance(p,last)<1e-9?still+1:0;last=p;
   if(still>=10&&!pressed){pressed=true;const dx=goal[0]-p[0],dy=goal[1]-p[1];for(const key of [dx<0?'a':'d',dy<0?'w':'s'])root.main.handlers.keydown({key,preventDefault(){}});}
   tick(50);assert.ok(view.dungeonWalkable(pos(g),id));if(i%10===0)await new Promise(r=>setImmediate(r));}
  assert.ok(encounter,`checkpoint ${cp} must trigger through native view: ${pos(g)} goal ${goal} enemies ${JSON.stringify(view.dungeonEnemyPositions(g,g.zoneTravel.active.roamTime).filter(e=>e.checkpoint===cp).map(e=>[e.anchor,e.position]))} keys`);
  assert.equal(encounter.checkpoint,cp);assert.ok(view.dungeonAtCheckpoint(g,cp));
  destroy();const e=travel.nextDungeonEncounter(g,cp);assert.equal(e.kindIdx,10+cp);assert.ok(travel.resolveDungeonEncounter(g,e.token,true));
 }
 const destroy=view.mountDungeonView({append(){}},g,{onArrival:()=>{arrived=true;}});tick();const exit=row.corridor.at(-1);click(g,exit);
 for(let i=0;i<2000&&!view.dungeonAtExit(g);i++){tick(50);assert.ok(view.dungeonWalkable(pos(g),id));}
 assert.ok(view.dungeonAtExit(g));await new Promise(r=>setImmediate(r));assert.ok(arrived);destroy();
});
test('B34 renderer reuses painted foreground and never draws the removed tree sprites',()=>{
 size=1280;stageHeight=800;const g=game();
 const destroy=view.mountDungeonView({append(){}},g);drawn.length=0;captureDraw=true;tick();captureDraw=false;
 assert.deepEqual(row.ambient.trees,[]);assert.equal(row.ambient.bakedTrees.length,28);
 assert.ok(ROUTE_FOREGROUND[id].length>=3);
 assert.ok(drawn.filter(a=>a.length===9&&a[0]?.src===row.background).length>=ROUTE_FOREGROUND[id].length,'cropped foreground comes from the new route image');
 assert.equal(drawn.some(a=>Object.values(row.ambient.treeArt).includes(a[0]?.src)),false);
 destroy();
});
test('B34 native input handlers: six blocked banks reject clicks and held keys, including northern branch',()=>{
 size=1280;stageHeight=800;const nav=view.dungeonNavigation(id);
 for(const bank of [[.12,.14],[.22,.22],[.4,.47],[.58,.29],[.81,.6],[.67,.78]]){
  const g=game();for(let i=0;i<3;i++){const e=travel.nextDungeonEncounter(g);assert.ok(travel.resolveDungeonEncounter(g,e.token,true));}
  const start=nav.snap(bank);g.zoneTravel.active.position={x:start[0],y:start[1]};
  const destroy=view.mountDungeonView({append(){}},g);tick();click(g,bank);
  for(let i=0;i<20;i++){tick(50);assert.ok(nav.walkable(pos(g)));}
  assert.deepEqual(pos(g),start,'blocked click must not set a walking target');
  const keys=[bank[0]<start[0]?'a':'d',bank[1]<start[1]?'w':'s'];
  for(const key of keys)root.main.handlers.keydown({key,preventDefault(){}});
  for(let i=0;i<80;i++){tick(50);assert.ok(nav.walkable(pos(g)),`held input at ${bank}`);}
  for(const key of keys)windowHandlers.keyup({key});
  assert.notDeepEqual(pos(g),bank);destroy();
 }
});

test('redraw native renderer: zoom buttons and five HUD actions work at 390 and desktop',()=>{
 for(const w of [390,1280]){
  size=w;stageHeight=w===390?844:800;const g=game(),actions=[];
  const destroy=view.mountDungeonView({append(){}},g,{onHud:a=>actions.push(a)});
  const imageWidth=()=>{drawn.length=0;captureDraw=true;tick();captureDraw=false;return drawn.find(a=>a.length===5&&a[0]?.src===row.background)?.[3];};
  const ordinary=imageWidth();assert.ok(ordinary>0);
  root.controls.more.handlers.click();assert.ok(imageWidth()>ordinary);
  root.controls.overview.handlers.click();assert.ok(imageWidth()<=size+1e-7);
  for(const button of root.hud)button.handlers.click();assert.deepEqual(actions,['profile','manual','bag','pause','settings']);
  destroy();
 }
});
