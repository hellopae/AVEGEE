import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {complete=true;naturalWidth=512;naturalHeight=1024;set src(v){this._src=v;queueMicrotask(()=>this.onload?.());}get src(){return this._src;}};
const drawn=[];let captureDraw=false;
const ctx=new Proxy({drawImage(...args){if(captureDraw)drawn.push(args);},createRadialGradient:()=>({addColorStop(){}}),createLinearGradient:()=>({addColorStop(){}})}, {get:(o,k)=>o[k]??(()=>{}),set:(o,k,v)=>{o[k]=v;return true;}});
const node=()=>({getContext:()=>ctx,handlers:{},addEventListener(k,f){this.handlers[k]=f;},removeEventListener(){},focus(){},setPointerCapture(){},remove(){}});
let frame,clock=1000,size=1280;
const windowHandlers={};
globalThis.window={matchMedia:()=>({matches:true}),devicePixelRatio:1,addEventListener(k,f){windowHandlers[k]=f;},removeEventListener(){}};
globalThis.requestAnimationFrame=f=>{frame=f;return 1;};globalThis.cancelAnimationFrame=()=>{};
let root;
globalThis.document={documentElement:{},createElement(tag){if(tag==='canvas')return node();const main=node(),mini=node(),status=node(),loading=node(),guide=node(),challenge=node(),menu=node();
 main.parentElement={getBoundingClientRect:()=>({width:size,height:800})};main.getBoundingClientRect=()=>({left:0,top:0,width:size,height:800});
 root={...node(),main,mini,querySelector:s=>({' .unused':null,'.dungeon-stage > canvas':main,'.dungeon-minimap':mini,'.dungeon-status':status,'.dungeon-load':loading,'.dungeon-guide':guide,'.dungeon-challenge':challenge,'[data-action="menu"]':menu})[s]};return root;}};
const view=await import('../src/dungeon-view.js');const travel=await import('../src/zone-travel.js');const {frontierCameraTarget}=await import('../src/frontier-view-metrics.js');
await new Promise(r=>setImmediate(r));
const tick=(ms=16)=>{clock+=ms;frame(clock);};
const pos=g=>Object.values(g.zoneTravel.active.position);
function game(ready=true){const g={zone:'th',bossCleared:{th:true},zoneEvents:{th:{thBorderBoss:'cleared'}},save(){}};travel.initializeZoneTravel(g);travel.beginDungeon(g,'asia');if(ready)for(let i=0;i<3;i++){const e=travel.nextDungeonEncounter(g);travel.resolveDungeonEncounter(g,e.token,true);}g.zoneTravel.active.patrolDefeated=travel.dungeonPatrols('th:asia').map(p=>p.id);return g;}
function click(g,p){const cam=frontierCameraTarget(size,800,pos(g)),e={pointerId:1,clientX:cam.x+p[0]*1672*cam.scale,clientY:cam.y+p[1]*941*cam.scale};root.main.handlers.pointerdown(e);root.main.handlers.pointerup(e);}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
for(const width of [1280,390])test(`F12 input ${width}: real view click handler reaches six branches, key and joystick use 2D positions`,()=>{
 size=width;
 for(const goal of [[.357,.636],[.58,.247],[.889,.596],[.565,.946],[.424,.751],[.451,.471]]){
  const g=game(),destroy=view.mountDungeonView({append(){}},g);for(let i=0;i<3;i++)tick();click(g,goal);
  for(let i=0;i<1800&&distance(pos(g),goal)>.001;i++){tick(50);assert.ok(view.dungeonWalkable(pos(g)));}
  assert.ok(distance(pos(g),goal)<.001,`${width} click endpoint ${goal}: ${pos(g)}`);destroy();
 }
 const g=game(),destroy=view.mountDungeonView({append(){}},g);tick();const before=pos(g);
 root.main.handlers.keydown({key:'d',preventDefault(){}});for(let i=0;i<10;i++)tick();windowHandlers.keyup({key:'d'});assert.ok(pos(g)[0]>before[0]);
 const after=pos(g);root.main.handlers.pointerdown({pointerId:1,clientX:100,clientY:100});root.main.handlers.pointermove({pointerId:1,clientX:140,clientY:130});for(let i=0;i<10;i++)tick();root.main.handlers.pointerup({pointerId:1});assert.ok(distance(after,pos(g))>.001);assert.ok(view.dungeonWalkable(pos(g)));destroy();
});
test('F12 input: held directional keys can traverse all six branch paths',()=>{
 size=390;
 for(const goal of [[.357,.636],[.58,.247],[.889,.596],[.565,.946],[.424,.751],[.451,.471]]){
  const g=game(),destroy=view.mountDungeonView({append(){}},g),path=view.dungeonPath(view.dungeonPoint(0),goal);tick();
  let previous=[];
  for(const waypoint of path){
   for(let guard=0;guard<7000;guard++){
    const at=pos(g),dx=waypoint[0]-at[0],dy=waypoint[1]-at[1];if(Math.hypot(dx*1.79,dy)<.0007)break;
    const keys=[];if(Math.abs(dx)>.00015)keys.push(dx<0?'a':'d');if(Math.abs(dy)>.00015)keys.push(dy<0?'w':'s');
    for(const key of previous)if(!keys.includes(key))windowHandlers.keyup({key});
    for(const key of keys)if(!previous.includes(key))root.main.handlers.keydown({key,preventDefault(){}});
    previous=keys;tick(2);assert.ok(view.dungeonWalkable(pos(g)));
   }
   assert.ok(distance(pos(g),waypoint)<.001,`key waypoint ${waypoint}: ${pos(g)}`);
  }
  for(const key of previous)windowHandlers.keyup({key});assert.ok(distance(pos(g),goal)<.001);destroy();
 }
});
test('F12 input: mount migrates old save to allowed cell; click and held key cannot bypass first checkpoint',()=>{
 const g=game(false);g.zoneTravel.active.position={x:.79,y:.51};const destroy=view.mountDungeonView({append(){}},g),limit=view.dungeonCheckpointProgress('th:asia')[0]-.018;
 assert.ok(view.dungeonCellProgress(pos(g))<=limit);tick();click(g,[.565,.946]);for(let i=0;i<50;i++)tick();
 root.main.handlers.keydown({key:'d',preventDefault(){}});for(let i=0;i<300;i++){tick();assert.ok(view.dungeonCellProgress(pos(g))<=limit);}windowHandlers.keyup({key:'d'});destroy();
});
test('F12 rendering: trees and Yama share root-y draw ordering at an occlusion position',async()=>{
 const {ROUTE_GEOMETRY}=await import('../src/route-geometry.js');
 const tree=ROUTE_GEOMETRY['th:asia'].ambient.trees.find(t=>view.dungeonWalkable([t.x,t.y-.018]));assert.ok(tree);
 const g=game();g.zoneTravel.active.position={x:tree.x,y:tree.y-.018};const destroy=view.mountDungeonView({append(){}},g);drawn.length=0;captureDraw=true;tick();captureDraw=false;
 const cam=frontierCameraTarget(size,800,pos(g)),ty=cam.y+tree.y*941*cam.scale;
 const treeDraw=drawn.findIndex(a=>a[0]?.src?.includes(`town-tree-${{red:'red-th',green:'asia',lightgreen:'c-asia'}[tree.kind]}-v1`)&&Math.abs(a[2]+a[4]-ty)<.01);
 const heroDraw=drawn.findIndex(a=>/hero-yama|yama.*walk|hero.*walk/.test(a[0]?.src||''));
 assert.ok(treeDraw>=0,'overlapping tree was drawn');assert.ok(heroDraw>=0,'Yama was drawn');assert.ok(heroDraw<treeDraw,'tree crown drawn over Yama behind root');destroy();
});
