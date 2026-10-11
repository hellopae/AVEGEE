import test from 'node:test';
import assert from 'node:assert/strict';
import { MIRROR_ART_LAYOUT, mirrorBeam, mirrorSolution, mirrorChargeAngle, mirrorObstacle, mirrorClearPosition } from '../src/mirror-charge.js';

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

// A newly placed stand must push out a hero already standing in its footprint.
test('mirror reserves sprite clearance and ejects existing overlapping positions', () => {
 for(const pos of [[.735,.615],[.70,.69],[.76,.50],[.735,.77]]) {
  assert.equal(mirrorObstacle(...pos),true);
  const clear=mirrorClearPosition(...pos);
  assert.equal(mirrorObstacle(...clear),false);
 }
 for(const pos of [[.64,.615],[.83,.615],[.735,.79]]) {
  assert.deepEqual(mirrorClearPosition(...pos),pos);
 }
});
