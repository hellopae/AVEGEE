import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {bindMapZoom} from '../src/map-zoom-controls.js';
import {frontierCameraTarget,FRONTIER_WORLD} from '../src/frontier-view-metrics.js';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
const node=()=>new EventTarget();
const fire=(target,type,props={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,props);target.dispatchEvent(e);return e;};
test('B12 shared town control: buttons clamp, overview, wheel, pinch cancel and cleanup',async()=>{
 const less=node(),more=node(),overview=node(),surface=node();let started=0,ended=0;const changes=[];
 const zoom=bindMapZoom({less,more,overview,surface,levels:[0,1,1.5,2],level:1,gestures:true,onChange:n=>changes.push(n),onGesture:()=>started++,onGestureEnd:()=>ended++});
 for(let i=0;i<6;i++)fire(more,'click');assert.equal(zoom.level,3);assert.equal(more.disabled,true);
 fire(overview,'click');assert.equal(zoom.level,0);assert.equal(less.disabled,true);
 assert.equal(fire(surface,'wheel',{deltaY:-30}).defaultPrevented,true);assert.equal(zoom.level,1);
 fire(surface,'pointerdown',{pointerId:1,clientX:0,clientY:0});fire(surface,'pointerdown',{pointerId:2,clientX:100,clientY:0});
 assert.equal(started,1);fire(surface,'pointermove',{pointerId:2,clientX:160,clientY:0});assert.equal(zoom.level,2);
 fire(surface,'pointercancel',{pointerId:2});fire(surface,'pointerup',{pointerId:1});await Promise.resolve();assert.equal(ended,1);
 const count=changes.length;zoom.destroy();fire(more,'click');fire(surface,'wheel',{deltaY:-1});assert.equal(changes.length,count);
});
test('B12 zoom fits complete image at desktop/390 and max camera keeps hero in view',()=>{
 for(const [w,h] of [[1440,900],[390,844]]){
  const c=frontierCameraTarget(w,h,[.53,.75],true);assert.ok(c.x>=0&&c.y>=0);assert.ok(c.x+1672*c.scale<=w+1e-8&&c.y+941*c.scale<=h+1e-8);
  const max=frontierCameraTarget(w,h,[.53,.75]);const scale=max.scale*2;
  const x=Math.max(w-FRONTIER_WORLD.w*scale,Math.min(0,w/2-.53*1672*scale));assert.ok(.53*1672*scale+x>=0&&.53*1672*scale+x<=w);
 }
});
test('B12 removes overlay trees/falls and pins new flow to v6 without changing other route FX',()=>{
 const a=ROUTE_GEOMETRY['th:asia'].ambient;assert.deepEqual(a.trees,[]);assert.deepEqual(a.waterfalls,[]);assert.equal(a.leafArea,null);
 assert.equal(a.flowUrl,'img/frontier-route/zone1-2-v6-flow.png');
 const trace=JSON.parse(readFileSync('output/coordination/2026-10-30-b12-fx/flow-trace.json'));
 assert.equal(trace.sha256,createHash('sha256').update(readFileSync(trace.source)).digest('hex'),'flow trace belongs to the shipped painting');
 for(const k of [2,3,4,5])assert.ok(trace.kindCells[k]>100,`surface ${k} exists`);
 assert.equal(ROUTE_GEOMETRY['asia:west'].ambient.waterfalls.length,4);assert.ok(ROUTE_GEOMETRY['west:cyberhell'].ambient.trees.length);
});

test('B12 pause settings/manual destroy the old renderer and return to the border on close',()=>{
 const ui=readFileSync('src/ui.js','utf8');
 const start=ui.indexOf('onHud:function borderHud(action){')+'onHud:'.length;
 const source=ui.slice(start,ui.indexOf(',\n      onMenu:',start));
 for(const [button,window] of [['#pause-settings','settings'],['#pause-more','manual']]){
  const calls=[],dlg=new EventTarget(),buttons=new Map();dlg.open=true;
  dlg.removeEventListener=dlg.removeEventListener.bind(dlg);
  const context=vm.createContext({
   dlg,g:{},destroy:()=>calls.push('destroy'),
   pauseDlg:{querySelector:id=>{if(!buttons.has(id))buttons.set(id,{});return buttons.get(id);}},
   openPause:()=>calls.push('pause'),finishPause:()=>calls.push('resume'),
   openSettings:()=>calls.push('settings'),openHelp:()=>calls.push('manual'),openBag:()=>calls.push('bag'),
   dungeonStatus:()=>true,openDungeon:()=>calls.push('border'),
  });
  const hud=vm.runInContext(`(${source})`,context);
  hud('pause');assert.deepEqual(calls,['pause']);
  buttons.get(button).onclick();assert.deepEqual(calls,['pause','resume','destroy',window]);
  dlg.dispatchEvent(new Event('close'));assert.equal(calls.at(-1),window,'queued replacement close must not reopen the border');
  dlg.open=false;dlg.dispatchEvent(new Event('close'));assert.equal(calls.at(-1),'border');
  const n=calls.length;dlg.dispatchEvent(new Event('close'));assert.equal(calls.length,n,'return listener removed');
 }
});

test('shared town zoom follows zone-dependent levels after switching cities',()=>{
 const less=node(),more=node(),overview=node();let levels=[1,2,3,4];
 const zoom=bindMapZoom({less,more,overview,levels:()=>levels,level:3});
 levels=[1,2];zoom.set(3);assert.equal(zoom.level,1);assert.equal(more.disabled,true);
 fire(less,'click');assert.equal(zoom.level,0);assert.equal(less.disabled,true);zoom.destroy();
});
