import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {watchGraphicsLoss, shouldReloadAfterLoss, GPU_RESET_KEY, gpuLossStats} from '../src/gpu-recovery.js';

// F4 (15 Nov 2026): after a GPU loss every baked canvas is blank (ground + sprites vanished, owner video error.mov) -> save + reload once, never in a loop.
const fakeCanvas = () => { const h = {}; return {addEventListener:(n,f)=>{(h[n] ||= []).push(f);}, removeEventListener:(n,f)=>{h[n] = (h[n]||[]).filter(x=>x!==f);}, fire:n=>(h[n]||[]).forEach(f=>f({preventDefault(){throw new Error('must not cancel the loss');}})), count:n=>(h[n]||[]).length}; };
const fakeStore = () => { const m = new Map(); return {getItem:k=>m.has(k)?m.get(k):null, setItem:(k,v)=>m.set(k,String(v))}; };

test('the decision: a second recovery inside the guard window is skipped', () => {
  assert.equal(shouldReloadAfterLoss(1000, 0), true);
  assert.equal(shouldReloadAfterLoss(100000, 90000, 20000), false);
  assert.equal(shouldReloadAfterLoss(120000, 90000, 20000), true);
});

test('lost then restored -> recover() once; the next loss inside the guard does not reload again', () => {
  const cv = fakeCanvas(), store = fakeStore(); let n = 0, t = 50000;
  const before = {...gpuLossStats};
  watchGraphicsLoss(cv, {recover: () => n++, storage: store, now: () => t});
  cv.fire('contextlost'); assert.equal(n, 0, 'nothing happens while the context is still lost');
  cv.fire('contextrestored'); assert.equal(n, 1);
  assert.equal(store.getItem(GPU_RESET_KEY), '50000');
  t = 60000; cv.fire('contextlost'); cv.fire('contextrestored'); assert.equal(n, 1, 'guard');
  t = 80000; cv.fire('contextlost'); cv.fire('contextrestored'); assert.equal(n, 2, 'after the guard it recovers again');
  assert.equal(gpuLossStats.lost - before.lost, 3); assert.equal(gpuLossStats.skipped - before.skipped, 1);
});

test('stop function removes the listeners; a missing canvas is harmless', () => {
  const cv = fakeCanvas(); const stop = watchGraphicsLoss(cv, {recover(){}, storage: fakeStore()});
  assert.equal(cv.count('contextlost'), 1); stop(); assert.equal(cv.count('contextlost'), 0);
  assert.doesNotThrow(() => watchGraphicsLoss(null, {recover(){}})());
});

test('ui.js watches the map canvas and resumes through the saved slot', () => {
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /watchGraphicsLoss\(cv, \{recover: \(\) => \{\s*if \(started\) \{ g\.save\(\); saveAt = Infinity; sessionStorage\.setItem\('avegee\.fresh', '1'\); \}\s*location\.reload\(\);/);
});
