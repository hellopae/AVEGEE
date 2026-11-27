import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {storyWalkSheet} from '../src/crew-walk-assets.js';
import {archonArrivalPending, migrateFinalEvent} from '../src/final-event.js';
import {imageMeta} from './helpers/image-meta.mjs';

const actors = [
  ['zone-boss', 'th'], ['zone-boss', 'asia'], ['zone-boss', 'west'],
  ['zone-boss', 'cyberhell'], ['char-musashi-asia', 'west'], ['char-home67', 'cyberhell'],
];

test('six story sheets retain four full transparent frames and fixed foot anchors', () => {
  const paths = new Set();
  for (const [key, zone] of actors) {
    const sheet = storyWalkSheet(key, zone);
    paths.add(sheet.src);
    const {width,height,hasAlpha} = imageMeta(readFileSync(new URL('../' + sheet.src, import.meta.url)));
    assert.deepEqual([width,height,hasAlpha],[2760,700,true]);
    assert.equal(sheet.rightFacing,true);
    assert.deepEqual(sheet.frames.map(f=>[f.x,f.y,f.w,f.h,f.ox,f.oy]),[0,690,1380,2070].map(x=>[x,0,690,700,0,0]));
    assert.equal(sheet.footOffset,0);
  }
  assert.equal(paths.size,6);
});

test('story standee draws the standing image if the walk sheet fails and uses the registered strip when it loads', async () => {
  const loads = new Map();
  globalThis.fetch = async () => ({ok:false});
  globalThis.Image = class {
    naturalWidth = 2760;
    naturalHeight = 700;
    set src(path) { this.path=path; loads.set(path,this); }
  };
  const {artUrl,img,drawStandee} = await import('../src/art.js');
  const calls = [];
  const ctx = {save(){},restore(){},translate(){},rotate(){},scale(){},drawImage(...args){calls.push(args);}};
  for (const [key, zone] of actors) {
    const src = storyWalkSheet(key,zone).src;
    assert.equal(artUrl(key+'-walk','png',zone),src);
    img(key,zone);
    loads.get(artUrl(key,'png',zone)).onload();
    drawStandee(ctx,key,12,92,50,125,'👑',-1,true,zone,false);
    loads.get(src).onerror();
    assert.notEqual(calls.at(-1)[0].path,src);
    assert.equal(calls.at(-1).length,5);
    loads.get(src).onload();
    drawStandee(ctx,key,12,92,50,125,'👑',-1,true,zone,false);
    assert.equal(calls.at(-1)[0].path,src);
    assert.deepEqual(calls.at(-1).slice(1,5),[690,0,690,700]);
    assert.equal(calls.at(-1)[6]+calls.at(-1)[8],0,'feet stay at the origin in the drawing transform');
  }
});

test('the final walk is pending only for a new finale and survives save migration once complete', () => {
  const s = migrateFinalEvent({zoneEvents:{cyberhell:{cyberFinal:'pending'}}});
  assert.equal(archonArrivalPending(s),true);
  for (const flag of ['archonWalkSeen','warpDone','openSeen','minionsCleared','presentation']) {
    assert.equal(archonArrivalPending({...s,[flag]:true}),false,flag);
  }
  for (const key of ['z4-final-open','cyber-approach','cyber-duel']) {
    assert.equal(archonArrivalPending(s,{[key]:true}),false,key);
  }
  assert.equal(archonArrivalPending(migrateFinalEvent({finalEvent:{...s,archonWalkSeen:true}})),false);
});
