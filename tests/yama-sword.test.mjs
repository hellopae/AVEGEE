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
test('corrected v4 outfits are registered in both manifest and regional preload catalog', () => {
  const manifest = JSON.parse(fs.readFileSync('img/manifest.json', 'utf8'));
  const catalog = JSON.parse(fs.readFileSync('img/preload-catalog.json', 'utf8'));
  for (const [style, height] of Object.entries({asia:352, west:346, cyberhell:320})) {
    const sheet = swordSheet(style);
    assert.equal(sheet.src, `img/yama-sword-v4/hero-yama-${style}-sword.webp`);
    assert.equal(sheet.bodyHeight, height);
    assert.ok(manifest.zones[style].includes(sheet.src.slice(4)), style);
    assert.equal(catalog.zones[style].filter(url => url === sheet.src).length, 1, style);
    assert.ok(!catalog.zones[style].includes(`img/yama-sword-v2/hero-yama-${style}-sword.webp`));
  }
  assert.equal(swordSheet('th').src, 'img/yama-sword-v3/hero-yama-th-sword.webp');
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
test('sword training accepts each note once and exposes the next note', () => {
  const e=createTrainingGame('dab',1),notes=e.view().notes;
  e.step(notes[0].at);e.input({type:'note',lane:notes[0].lane});assert.equal(e.view().hits,1);
  e.input({type:'note',lane:notes[0].lane});assert.equal(e.view().hits,1);
  e.step(notes[1].at-e.view().time);e.input({type:'note',lane:notes[1].lane});assert.equal(e.view().hits,2);
});
