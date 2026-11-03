import test from 'node:test';
import assert from 'node:assert/strict';
import {dischargePath,dischargeBranches,drawDischarge} from '../src/electric-fx.js';
test('discharges pin both attachment points and keep stable finite branches while fading',()=>{
 for(let seed=0;seed<80;seed++){
  const a=[seed,32],b=[seed+20,160],p=dischargePath(a,b,seed);
  assert.deepEqual(p[0],a);assert.deepEqual(p.at(-1),b);assert.deepEqual(p,dischargePath(a,b,seed));
  const branches=dischargeBranches(p,seed);
  assert.equal(branches.length,3);
  for(const branch of branches){assert.ok(p.includes(branch[0])||p.some(v=>v[0]===branch[0][0]&&v[1]===branch[0][1]));assert.ok(branch.flat().every(Number.isFinite));}
 }
});
test('discharge strokes taper and restore blend/opacity; expired strikes draw nothing',()=>{
 const widths=[],state=[],ctx={globalAlpha:.4,globalCompositeOperation:'source-over',save(){state.push([this.globalAlpha,this.globalCompositeOperation]);},restore(){[this.globalAlpha,this.globalCompositeOperation]=state.pop();},beginPath(){},moveTo(){},lineTo(){},stroke(){widths.push(this.lineWidth);}};
 const p=dischargePath([0,0],[40,70],4);drawDischarge(ctx,p,dischargeBranches(p,4),.2);
 assert.ok(widths[0]>widths[15]);assert.equal(ctx.globalAlpha,.4);assert.equal(ctx.globalCompositeOperation,'source-over');
 const count=widths.length;drawDischarge(ctx,p,[],1);assert.equal(widths.length,count);
});
