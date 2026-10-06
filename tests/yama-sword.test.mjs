import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { swordSheet, swordFrame, SWORD_DURATION_MS, isYamaSwordAttack, drawYamaSword } from '../src/yama-sword.js';
import { createTrainingGame } from '../src/minigames/training/index.js';

test('all four outfits have shipped transparent atlases and consistent frame anchors', () => {
  for (const style of ['th','asia','west','cyberhell']) {
    const s = swordSheet(style);
    assert.ok(fs.statSync(s.src).size > 1000);
    assert.equal(s.frames, 8); assert.equal(s.size, 640);
    assert.deepEqual(s.anchor, {x:240,y:570}); assert.ok(s.bodyHeight > 300);
  }
  assert.equal(swordSheet('unknown'), swordSheet('th'));
});
test('slash follows the lunge and stops on recovery, never wraps back into another strike', () => {
  assert.equal(SWORD_DURATION_MS,580);
  assert.equal(swordFrame(-1),0); assert.equal(swordFrame(84),0); assert.equal(swordFrame(85),1);
  assert.equal(swordFrame(165),2); assert.equal(swordFrame(225),3); assert.equal(swordFrame(260),4);
  assert.equal(swordFrame(579),7); assert.equal(swordFrame(2000),7);
});
test('only Yama ordinary attack uses sword, including while rage is active', () => {
  assert.ok(isYamaSwordAttack({action:'atk',key:'atk',crew:null}));
  for (const fx of [{action:'fire',key:'atk'}, {action:'rage'}, {action:'atk',crew:'taan'}, {key:'foe'}, null])
    assert.equal(isYamaSwordAttack(fx),false);
});
test('canvas crops the selected frame and keeps the feet fixed when facing either way', () => {
  globalThis.Image = class { complete=true; naturalWidth=5120; };
  const calls=[],ctx={save(){},restore(){},translate(...a){calls.push(['translate',...a]);},scale(...a){calls.push(['scale',...a]);},drawImage(...a){calls.push(['draw',...a.slice(1)]);}};
  assert.equal(drawYamaSword(ctx,'west',100,200,swordSheet('west').bodyHeight,260,-1),true);
  assert.deepEqual(calls[0],['translate',100,200]); assert.deepEqual(calls[1],['scale',-1,1]);
  assert.deepEqual(calls[2],['draw',2560,0,640,640,-240,-570,640,640]);
});
test('sword training marks each accepted attempt once, resets on the next target', () => {
  const e=createTrainingGame('dab',1);e.step(1);assert.equal(e.view().used,false);
  e.input('hit');assert.equal(e.view().used,true);assert.equal(e.view().successes,1);
  e.input('hit');assert.equal(e.view().successes,1);
  e.step(1.6);assert.equal(e.view().used,false);
});
