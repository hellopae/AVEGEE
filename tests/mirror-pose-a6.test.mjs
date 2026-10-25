import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {walkDirection} from '../src/walk-direction.js';
import {MIRROR_ROOM_LAYOUT} from '../src/mirror-charge.js';
const src=readFileSync(new URL('../src/room.js',import.meta.url),'utf8');
const start=src.indexOf("    acts.push({ y: def.k === 'krajok' ? mirrorHeroSortY");
const body=src.slice(start,src.indexOf('\n    for(const [id,fx] of prisonEscorts)',start));
function draw({outfit='asia',room='krajok',adjusting=true,moving=false,loaded=true,pos=[.65,.65]}={}){
 const calls=[],g={zone:'asia',outfit,swingUntil:Date.now()+5000};
 const c=vm.createContext({acts:[],def:{k:room},P:{x:pos[0],y:pos[1],face:-1},g,api:{mirrorState:()=>({adjusting})},simClock:1000,movedSim:moving?1000:0,WALK_GRACE_MS:120,
  direction:'down',walkDirection,MIRROR_ROOM_LAYOUT,mirrorHeroSortY:(x,y)=>y,U:500,HERO_H:.15,t:1000,walkDist:20,sitting:false,lying:false,ctx:{},px:x=>x*1000,py:y=>y*500,
  img:()=>({}),walkDrawDistance:d=>d,drawHeroWalk:(...args)=>{calls.push({kind:'normal',args});return loaded;},drawStandee:(...args)=>calls.push({kind:args[1],args}),
  drawYamaSword:()=>{calls.push({kind:'sword'});return true;},SWORD_DURATION_MS:580});
 vm.runInContext(body,c);c.acts[0].fn();return {calls,context:c,g};
}
for(const outfit of ['th','asia','west','cyberhell'])test(`A6 ${outfit}: mirror idle faces the apparatus with no combat pose, including unloaded idle art`,()=>{
 for(const [pos,face,heading] of [[[.65,.65],1,'right'],[[.85,.65],-1,'left']])for(const loaded of [true,false]){
  const {calls,context,g}=draw({outfit,pos,loaded});assert.equal(calls[0].kind,'normal');assert.equal(calls[0].args[7],false,'stationary uses idle');assert.equal(calls[0].args[6],heading);assert.equal(context.P.face,face);
  assert.deepEqual(calls.map(c=>c.kind),loaded?['normal']:['normal','hero-yama']);assert.ok(g.swingUntil>Date.now(),'room presentation does not erase a combat timer');
 }
});
test('A6 walking while panel is open keeps movement direction; closed panel ignores a residual swing',()=>{
 const moving=draw({moving:true});assert.equal(moving.context.direction,'down');assert.equal(moving.context.P.face,-1);assert.equal(moving.calls[0].args[7],true);
 const closed=draw({adjusting:false});assert.deepEqual(closed.calls.map(c=>c.kind),['normal']);assert.equal(closed.context.direction,'down');
});
test('A6 ordinary combat poses and sword strokes outside the mirror room are unchanged',()=>{
 assert.deepEqual(draw({room:'krata',adjusting:false}).calls.map(c=>c.kind),['hero-yama-atk']);
 assert.deepEqual(draw({room:'dab',adjusting:false}).calls.map(c=>c.kind),['sword']);
 assert.deepEqual(draw({room:'ngiw',adjusting:false}).calls.map(c=>c.kind),['sword']);
});
