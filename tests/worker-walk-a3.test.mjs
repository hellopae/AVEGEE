import test from 'node:test';
import assert from 'node:assert/strict';
import {advanceWorkerEscort,workerRow,drawWorker,WORKER_ROW_V2} from '../src/workers.js';
import {escortCrewPosition} from '../src/escort.js';
for(const zone of ['th','asia','west','cyberhell'])test(`A3 ${zone}: real escort positions choose walk direction and stop on an unchanged frame`,()=>{
 for(const [end,heading,row] of [[[300,100],'side',1],[[0,100],'side',1],[[100,300],'down',4],[[100,0],'up',5]]){
  const w={id:'worker:1',homeZone:zone,x:100,y:100,job:{kind:'escort',soulId:77},cargo:null,moving:false};
  const g={zone,workerState:{workers:[w]}},walk={path:[[100,100],end],delay:0,duration:2000,elapsed:400,escort:{workerId:w.id}};
  const expected=escortCrewPosition(walk),before=JSON.stringify(walk);advanceWorkerEscort(g,walk);
  assert.equal(w.moving,true);assert.equal(w.heading,heading);assert.equal(workerRow(w,true),row);assert.notEqual(workerRow(w,true),WORKER_ROW_V2.escort);
  assert.deepEqual([w.x,w.y],[expected.x,expected.y]);assert.equal(w.face,expected.face);assert.equal(JSON.stringify(walk),before,'animation does not modify route or timing');
  advanceWorkerEscort(g,walk);assert.equal(w.moving,false);assert.equal(workerRow(w,true),0);assert.equal(w.job.soulId,77);
  walk.elapsed=2000;advanceWorkerEscort(g,walk);advanceWorkerEscort(g,walk);assert.equal(w.moving,false);assert.equal(workerRow(w,true),0);
 }
});
test('A3 pickup direction, cargo/work priority and v1 fallback retain their meaning',()=>{
 const w={id:'worker:1',homeZone:'asia',x:100,y:0,job:{kind:'escort'},moving:false},g={zone:'asia',workerState:{workers:[w]}};
 const walk={path:[[100,100],[100,300]],delay:1000,duration:3000,elapsed:400,escort:{workerId:w.id,pickup:[[100,0],[100,100]]}};
 advanceWorkerEscort(g,walk);assert.equal(w.heading,'down');assert.equal(workerRow(w,true),4);assert.equal(workerRow(w),1);
 w.cargo='ngiwWood';assert.equal(workerRow(w,true),10);w.cargo='dabShards';assert.equal(workerRow(w,true),11);
 w.moving=false;w.arrived=true;w.job={kind:'repair'};assert.equal(workerRow(w,true),8);w.job={kind:'build'};assert.equal(workerRow(w,true),2);
 w.job={kind:'escort'};assert.equal(workerRow(w),0);
});
test('A3 drawWorker crops normal walking rows for all four zones and columns without changing foot fit',()=>{
 const previous=globalThis.Image;
 globalThis.Image=class{constructor(){this.complete=true;this.naturalWidth=1280;this.naturalHeight=3840;}set src(v){this.source=v;}};
 const calls=[],ctx=new Proxy({},{get:(_,k)=>k==='drawImage'?(...a)=>calls.push(a):()=>{},set:()=>true});
 try{for(const homeZone of ['th','asia','west','cyberhell'])for(const [heading,row] of [['side',1],['down',4],['up',5]])for(let col=0;col<4;col++){
  drawWorker(ctx,{id:'worker:1',homeZone,x:100,y:100,face:1,job:{kind:'escort'},moving:true,heading},col*160,48);
  const draw=calls.at(-1);assert.equal(Math.floor(draw[2]/320),row);assert.equal(Math.floor(draw[1]/320),col);assert.ok(draw[7]>0&&draw[8]>0);
  assert.ok(Math.abs(draw[6]+draw[8])<1e-9,'foot baseline stays fixed');
 }}finally{globalThis.Image=previous;}
});
