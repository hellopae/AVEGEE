import test from 'node:test';
import assert from 'node:assert/strict';
import {bestShift,TRIAL_IDLE_TIMING,TRIAL_IDLE_POSES} from '../src/yama-trial-idle.js';

// FB2-v1: poses are registered onto pose 0 by whole pixels
const W=64,H=64;
const draw=(ox,oy)=>{const d=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){const i=(y*W+x)*4;
    const inBody=x>=20+ox&&x<44+ox&&y>=10+oy&&y<54+oy,inHead=x>=26+ox&&x<38+ox&&y>=14+oy&&y<26+oy;
    if(inBody){d[i]=inHead?220:140;d[i+1]=inHead?90:30;d[i+2]=40;d[i+3]=255}}
  return d};
const box={x0:12,x1:52,y0:6,y1:58,headY:34};
test('bestShift finds the whole-pixel offset between two drawings',()=>{
  const ref=draw(0,0);
  assert.deepEqual(bestShift(ref,draw(0,0),W,H,box),{dx:0,dy:0});
  assert.deepEqual(bestShift(ref,draw(3,-2),W,H,box),{dx:-3,dy:2});
  assert.deepEqual(bestShift(ref,draw(-2,1),W,H,box),{dx:2,dy:-1});
});
test('trial idle cycle never jumps between two non-base poses',()=>{
  assert.equal(TRIAL_IDLE_TIMING.length,TRIAL_IDLE_POSES.length);
  for(let i=0;i<TRIAL_IDLE_POSES.length;i++){
    const a=TRIAL_IDLE_POSES[i],b=TRIAL_IDLE_POSES[(i+1)%TRIAL_IDLE_POSES.length];
    assert.ok(a===0||b===0,`pose ${a} -> ${b} must pass through pose 0`);
  }
  assert.ok(TRIAL_IDLE_TIMING[TRIAL_IDLE_POSES.indexOf(2)]>=100,'blink is still long enough to read');
});
