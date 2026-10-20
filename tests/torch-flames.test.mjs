import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {drawTorchFlame} from '../src/town-scenery.js';
let created=0;globalThis.Image=class{constructor(){created++;this.complete=true;this.naturalWidth=128;}};
const canvas=()=>{let op='source-over',alpha=1,stack=[];const draws=[];return {draws,ctx:{save(){stack.push([op,alpha]);},restore(){[op,alpha]=stack.pop();},set globalCompositeOperation(v){op=v;},get globalCompositeOperation(){return op;},set globalAlpha(v){alpha=v;},get globalAlpha(){return alpha;},drawImage(im,...rect){draws.push({src:im.src,rect,op,alpha});}}};};
test('painted torch flames use additive blending so opaque black FX never cover the map',()=>{const {ctx,draws}=canvas();drawTorchFlame(ctx,470,500,1000,false);assert.equal(draws.length,2);for(const d of draws){assert.equal(d.op,'lighter');assert.ok(existsSync(d.src));assert.ok(d.alpha>=0&&d.alpha<=1);}assert.equal(ctx.globalCompositeOperation,'source-over');assert.equal(ctx.globalAlpha,1);});
test('torch motion reuses three assets with bounded drawing and remains static in reduced motion',()=>{const a=canvas(),b=canvas();drawTorchFlame(a.ctx,470,500,1000,true);drawTorchFlame(b.ctx,470,500,9000,true);assert.deepEqual(a.draws,b.draws);for(let t=0;t<10000;t+=20){const c=canvas();drawTorchFlame(c.ctx,470,500,t,false);assert.equal(c.draws.length,2);}assert.equal(created,3);const m=canvas(),n=canvas();drawTorchFlame(m.ctx,470,500,1000,false);drawTorchFlame(n.ctx,470,500,1600,false);assert.notDeepEqual(m.draws,n.draws);});
