import test from 'node:test';
import assert from 'node:assert/strict';
import {drawFrontierAmbient} from '../src/frontier-ambient.js';
import {ROUTE_GEOMETRY} from '../src/route-geometry.js';
import {drawTownNightEffects} from '../src/town-night-effects.js';
import {setActiveTownZone} from '../src/zone-skin.js';
import {applyTownZoneLayout} from '../src/town-layout.js';

function recorder(){
 const calls=[];const values={canvas:{width:3840,height:2560},getTransform:()=>({a:1,d:1,e:0,f:0})};
 const ctx=new Proxy(values,{get:(o,k)=>k in o?o[k]:(...a)=>calls.push([k,...a]),set:(o,k,v)=>(o[k]=v,true)});
 return{ctx,calls};
}
test('border23 weather respects the warm/cold boundary and reduced motion',()=>{
 const ambient=ROUTE_GEOMETRY['asia:west'].ambient;
 assert.equal(ROUTE_GEOMETRY['west:cyberhell'].enabled,false);
 assert.equal(ambient.waterfalls.length,8);
 const r=recorder();drawFrontierAmbient(r.ctx,{w:1672,h:941,time:1000,...ambient});
 const leaves=r.calls.filter(x=>x[0]==='translate').slice(1),snow=r.calls.filter(x=>x[0]==='arc');
 assert.equal(leaves.length,26);assert.equal(snow.length,48);
 for(const [,x,y]of leaves)assert.ok(x>=0&&x<.44&&y>=0&&y<1,'leaves stay west');
 for(const [,x,y]of snow)assert.ok(x>=.48&&x<1&&y>=0&&y<1,'snow stays east');
 const still=recorder();drawFrontierAmbient(still.ctx,{w:1672,h:941,time:1000,...ambient,reduced:true});
 assert.equal(still.calls.filter(x=>['arc','quadraticCurveTo','stroke'].includes(x[0])).length,0);
 const later=recorder();drawFrontierAmbient(later.ctx,{w:1672,h:941,time:3000,...ambient});
 assert.notDeepEqual(later.calls,r.calls);
});
test('frozen town keeps its existing snow sky and no longer sheds warm canopy leaves',()=>{
 const oldDoc=globalThis.document;
 globalThis.document={createElement:()=>({getContext:()=>({createRadialGradient:()=>({addColorStop(){}}),fillRect(){}})})};
 try{
  applyTownZoneLayout('west');setActiveTownZone('west');const cold=recorder();drawTownNightEffects(cold.ctx,1000);
  assert.equal(cold.calls.filter(x=>x[0]==='bezierCurveTo').length,0,'no autumn leaves in snow-covered trees');
  assert.equal(cold.calls.filter(x=>x[0]==='arc').length,0,'no duplicate hardcoded east-plateau snow pass');
  applyTownZoneLayout('th');setActiveTownZone('th');const warm=recorder();drawTownNightEffects(warm.ctx,1000);
  assert.ok(warm.calls.some(x=>x[0]==='bezierCurveTo'),'original warm town keeps leaves');
  assert.ok(warm.calls.some(x=>x[0]==='arc'),'original ice plateau keeps snow');
 }finally{applyTownZoneLayout('th');setActiveTownZone('th');globalThis.document=oldDoc;}
});
