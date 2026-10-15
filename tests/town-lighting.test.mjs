import test from 'node:test';
import assert from 'node:assert/strict';
import {fireStrength,hellColor} from '../src/town-lighting.js';
test('lava retains luminous orange while stone is dark and readable',()=>{
  const lava=hellColor(255,155,15),stone=hellColor(150,125,105);
  assert.ok(lava[0]>=250&&lava[1]>=150,'fire highlights survive the night grade');
  assert.ok(stone.every(v=>v>=55&&v<=100),'stone keeps midtone detail');
  assert.ok(fireStrength(255,155,15)>.9);
  assert.equal(fireStrength(150,125,105),0,'stone is not emissive');
  assert.equal(fireStrength(230,190,130),0,'sunlit sandstone must not become fire');
  assert.equal(fireStrength(60,160,240),0,'water and ice do not flicker like fire');
});
