import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { heroWalkSheet } from '../src/hero-walk-assets.js';
import { walkDirection } from '../src/walk-direction.js';

globalThis.fetch = async () => ({ok:false});
globalThis.Image = class {
  naturalWidth = 1280; naturalHeight = 1280;
  set src(value) { this.path = value; queueMicrotask(() => this.onload?.()); }
};
const {bindZone,bindHeroStyle,artUrl,img,drawHeroWalk} = await import('../src/art.js');
let zone = 'th', outfit = 'th';
bindZone(() => zone); bindHeroStyle(() => outfit);

test('four directions follow actual displacement and retain facing when stopped', () => {
  assert.equal(walkDirection(0,-8), 'up');
  assert.equal(walkDirection(0,8), 'down');
  assert.equal(walkDirection(-8,1), 'left');
  assert.equal(walkDirection(8,1), 'right');
  assert.equal(walkDirection(.01,.01,'up'), 'up');
  assert.equal(walkDirection(4,4,'left'), 'left');
});

test('all 64 frames exist inside RGBA PNG sheets registered in the manifest', () => {
  const m = JSON.parse(fs.readFileSync(new URL('../img/manifest.json',import.meta.url)));
  for (const z of ['th','asia','west','cyberhell']) {
    const s = heroWalkSheet(z), png = fs.readFileSync(new URL('../'+s.src,import.meta.url));
    assert.equal(png.subarray(1,4).toString(),'PNG');
    assert.equal(png[25],6); // Native RGBA, including transparent background.
    assert.equal(m.heroWalks[z],s.src.slice(4));
    for (const dir of ['down','left','right','up']) {
      assert.equal(s.directions[dir].length,4);
      for (const b of s.directions[dir]) {
        assert.ok(b.x >= 0 && b.y >= 0 && b.w > 0 && b.h > 0);
        assert.ok(b.x+b.w <= png.readUInt32BE(16) && b.y+b.h <= png.readUInt32BE(20));
      }
    }
  }
});

test('outfit overrides branch and every direction selects its own row without mirroring', async () => {
  zone = 'cyberhell'; outfit = 'asia';
  assert.equal(artUrl('hero-yama-walk-4dir'),heroWalkSheet('asia').src);
  img('hero-yama-walk-4dir'); await Promise.resolve();
  const calls = [], ctx = {save(){},restore(){},beginPath(){},ellipse(){},fill(){},drawImage(...a){calls.push(a);}};
  const s = heroWalkSheet(outfit);
  for (const direction of ['down','left','right','up']) for (let i=0;i<4;i++) {
    calls.length=0;
    assert.equal(drawHeroWalk(ctx,40,80,60,i*14,-1,direction),true);
    const b=s.directions[direction][i];
    assert.deepEqual(calls[0].slice(1,5),[b.x,b.y,b.w,b.h]);
    assert.ok(calls[0][7]>0 && calls[0][8]>0);
  }
});
