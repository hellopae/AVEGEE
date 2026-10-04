import test from 'node:test';
import assert from 'node:assert/strict';
import {ambientPixelKind,ambientParticles,drawMapAmbientSky,drawMapAmbientGround} from '../src/map-ambient.js';
test('map masks select lava and water, avoiding snow, bridges and red ground',()=>{
 assert.equal(ambientPixelKind(255,120,20,.4,'th',.34),'lava');
 assert.equal(ambientPixelKind(74,65,105,.83,'th',.2),'water');
 assert.equal(ambientPixelKind(35,150,200,.83,'cyberhell',.2),'water');
 assert.equal(ambientPixelKind(40,145,170,.2,'west',.34),'water');
 assert.equal(ambientPixelKind(180,220,240,.2,'west',.34),null,'white snow is excluded');
 assert.equal(ambientPixelKind(95,165,200,.3,'west',.2),null,'blue snow shadows outside channel stay still');
 assert.equal(ambientPixelKind(120,75,40,.83,'asia',.3),null,'wooden pier');
 assert.equal(ambientPixelKind(110,40,50,.5,'th',.8),null,'ground');
 assert.equal(ambientPixelKind(170,65,245,.3,'cyberhell',.2),'electric');
});
test('all four zone effects move deterministically, stay bounded, and use small particle budgets',()=>{
 for(const z of ['th','asia','west','cyberhell']){
  const a=ambientParticles(z,1000,1678,937),b=ambientParticles(z,2500,1678,937);
  assert.deepEqual(a,ambientParticles(z,1000,1678,937));assert.notDeepEqual(a,b);
  assert.ok(a.length<=90 && a.length>=20);
  for(const p of [...a,...b])assert.ok(p.x>=0&&p.x<1678&&p.y>=0&&p.y<937&&p.alpha<=.5);
 }
});
test('sky renders different frames and reduced motion avoids all drawing and mask work',()=>{
 const calls=[];const ctx=new Proxy({}, {get:(o,k)=>o[k]||((...v)=>calls.push([k,...v])),set:(o,k,v)=>{calls.push(['set',k,v]);o[k]=v;return true;}});
 drawMapAmbientSky(ctx,'west',1000,1678,937);const a=JSON.stringify(calls);calls.length=0;
 drawMapAmbientSky(ctx,'west',1500,1678,937);assert.notEqual(JSON.stringify(calls),a);calls.length=0;
 drawMapAmbientSky(ctx,'west',2000,1678,937,true);drawMapAmbientGround(ctx,{},'west',2000,1678,937,true);
 assert.equal(calls.length,0);
});
