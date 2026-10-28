import test from 'node:test';
import assert from 'node:assert/strict';
import {startTeaRest,advanceTeaRest,teaRoomStaff,teaRoomArrivals,teaSeatPoint,TEA_ENTRY,STAFF_TEA_REST_MS} from '../src/tea-staff-rest.js';
for(const id of ['th:guard','th:taan','worker:1'])test(`${id} walks inside before sitting; arrival and save/load preserve a full rest`,()=>{
 const c={id,x:10,y:10,morale:20,hunger:10},g={zone:'th',roster:{[id]:c}};
 c.teaRest=startTeaRest(g,c,'th',[20,10],[[20,10]],1000);
 const outsideAt=1000+10/c.teaRest.speed;
 advanceTeaRest(g,c,outsideAt);
 assert.equal(c.teaRest.phase,'enter');assert.equal(c.teaRest.startedAt,undefined);assert.equal(teaRoomStaff(g).length,0);
 assert.deepEqual(teaRoomArrivals(g,outsideAt)[0].point,TEA_ENTRY);
 const end=outsideAt+c.teaRest.entryMs;
 const halfway=teaRoomArrivals(g,(outsideAt+end)/2)[0].point;
 assert.notDeepEqual(halfway,TEA_ENTRY);assert.notDeepEqual(halfway,teaSeatPoint(c.teaRest.seat));
 const clone=structuredClone(g),d=clone.roster[id];
 assert.deepEqual(teaRoomArrivals(clone,end)[0].point,teaSeatPoint(d.teaRest.seat));
 advanceTeaRest(clone,d,end-1);assert.equal(d.teaRest.phase,'enter');
 advanceTeaRest(clone,d,end);assert.equal(d.teaRest.phase,'rest');
 assert.equal(d.teaRest.startedAt,end);assert.equal(d.teaRest.until,end+STAFF_TEA_REST_MS);
 assert.equal(teaRoomArrivals(clone,end).length,0);assert.equal(teaRoomStaff(clone).length,1);
 advanceTeaRest(clone,d,end+STAFF_TEA_REST_MS);assert.equal(d.teaRest,null);assert.equal(d.hunger,100);assert.deepEqual([d.x,d.y],[10,10]);
});
test('every seat has a continuous aisle route on the tea floor and delayed updates retain elapsed time',()=>{
 for(let seat=0;seat<15;seat++){
  const c={id:'th:guard',x:0,y:0,morale:10},g={zone:'th',roster:{c}};
  c.teaRest=startTeaRest(g,c,'th',[0,0],[],1000);c.teaRest.seat=seat;
  advanceTeaRest(g,c,1000);const end=1000+c.teaRest.entryMs;
  let prev=TEA_ENTRY;
  for(let i=0;i<=100;i++){
   const p=teaRoomArrivals(g,1000+c.teaRest.entryMs*i/100)[0].point;
   assert.ok(p[0]>=.21&&p[0]<=.83&&p[1]>=.49&&p[1]<=.91);
   assert.ok(Math.hypot(p[0]-prev[0],p[1]-prev[1])<.01);prev=p;
  }
  advanceTeaRest(g,c,end+STAFF_TEA_REST_MS+1);assert.equal(c.teaRest,null);
 }
});
