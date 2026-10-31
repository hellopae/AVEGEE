import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
let failReplacement=false;
globalThis.Image=class {complete=true;naturalWidth=512;naturalHeight=1024;set src(v){this._src=v;queueMicrotask(()=>failReplacement&&v.startsWith('img/frontier-route/tree-')?this.onerror?.():this.onload?.());}get src(){return this._src;}};
const drawn=[];let captureDraw=false;
const ctx=new Proxy({drawImage(...args){if(captureDraw)drawn.push(args);},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
const node=()=>({getContext:()=>ctx,handlers:{},addEventListener(k,f){this.handlers[k]=f;},removeEventListener(){},focus(){},setPointerCapture(){},remove(){}});
let frame,clock=1000,size=1280,stageHeight=800;
const windowHandlers={};
globalThis.window={matchMedia:()=>({matches:true}),devicePixelRatio:1,addEventListener(k,f){windowHandlers[k]=f;},removeEventListener(){}};
globalThis.requestAnimationFrame=f=>{frame=f;return 1;};globalThis.cancelAnimationFrame=()=>{};
let root;
globalThis.document={documentElement:{},createElement(tag){if(tag==='canvas')return node();const main=node(),mini=node(),status=node(),loading=node(),guide=node(),challenge=node(),menu=node();
 main.parentElement={getBoundingClientRect:()=>({width:size,height:stageHeight})};main.getBoundingClientRect=()=>({left:0,top:0,width:size,height:stageHeight});
 root={...node(),main,mini,querySelector:s=>({' .unused':null,'.dungeon-stage > canvas':main,'.dungeon-minimap':mini,'.dungeon-status':status,'.dungeon-load':loading,'.dungeon-guide':guide,'.dungeon-challenge':challenge,'[data-action="menu"]':menu})[s]};return root;}};
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
test('B34 renderer: all 28 trees draw at their root; Yama is sorted on both sides of tree 25',()=>{
 size=1280,stageHeight=800;const nav=view.dungeonNavigation(id),tree=row.ambient.trees.find(t=>t.id===25);
 for(const side of [-1,1]){
  const g=game();for(let i=0;i<3;i++){const e=travel.nextDungeonEncounter(g);travel.resolveDungeonEncounter(g,e.token,true);}
  // Find floor behind/in front of the root while staying close enough for overlap.
  let p=null;
  for(let dy=1;dy<70&&!p;dy++)for(let dx=-35;dx<=35;dx++){
   const q=[tree.x+dx/1672,tree.y+side*dy/941];if(nav.walkable(q)){p=q;break;}
  }
  assert.ok(p);g.zoneTravel.active.position={x:p[0],y:p[1]};
  const destroy=view.mountDungeonView({append(){}},g);drawn.length=0;captureDraw=true;tick();captureDraw=false;
  const cam=frontierCameraTarget(size,stageHeight,pos(g));
  for(const t of row.ambient.trees){const anchor=row.ambient.treeAnchors[t.kind],x=cam.x+t.x*1672*cam.scale,y=cam.y+t.y*941*cam.scale;
   assert.ok(drawn.some(a=>a[0]?.src===row.ambient.treeArt[t.kind]&&Math.abs(a[1]+a[3]*anchor[0]-x)<.01&&Math.abs(a[2]+a[4]*anchor[1]-y)<.01),`root ${t.id}`);
  }
  const anchor=row.ambient.treeAnchors[tree.kind],ty=cam.y+tree.y*941*cam.scale;
  const ti=drawn.findIndex(a=>a[0]?.src===row.ambient.treeArt[tree.kind]&&Math.abs(a[2]+a[4]*anchor[1]-ty)<.01);
  const hi=drawn.findIndex(a=>/hero-yama|yama.*walk|hero.*walk/.test(a[0]?.src||''));
  assert.ok(ti>=0&&hi>=0);assert.equal(hi<ti,side<0);destroy();
 }
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
