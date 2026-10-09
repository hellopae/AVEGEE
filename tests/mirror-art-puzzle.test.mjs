import test from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR_ART_LAYOUT, mirrorBeam, mirrorSolution, mirrorChargeAngle } from '../src/mirror-charge.js';

test('painted apparatus aligns at the measured centres and its integer angle is playable', () => {
 for (const aspect of [1,16/9,1.872,2.1]) {
  const solution=mirrorSolution(aspect,MIRROR_ART_LAYOUT);
  assert.equal(mirrorBeam(Math.round(solution),aspect,MIRROR_ART_LAYOUT).hit,true);
  assert.equal(mirrorBeam(solution+10,aspect,MIRROR_ART_LAYOUT).hit,false);
  assert.equal(mirrorBeam(0,aspect,MIRROR_ART_LAYOUT).hit,false);
 }
});
test('every successful painted-board aim calibrates to the existing reward model', () => {
 for (const aspect of [1,16/9,1.872,2.1]) {
  let successes=0;
  for(let angle=0;angle<180;angle+=.1) {
   if(!mirrorBeam(angle,aspect,MIRROR_ART_LAYOUT).hit) continue;
   successes++;
   const calibrated=mirrorChargeAngle(angle,aspect);
   assert.ok(calibrated>=0 && calibrated<180);
   assert.equal(mirrorBeam(calibrated,16/9).hit,true,`${aspect}: ${angle}`);
  }
  assert.ok(successes>10);
 }
});
