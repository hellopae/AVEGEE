// T3/13: the last picture stays over the canvas while the ground is baked again after a GPU loss (no black screen); read-backs happen every 2.5 s only
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createFrameHold, HOLD_EVERY_MS, HOLD_FADE_MS } from '../src/gpu-hold.js';
import { watchGraphicsLoss } from '../src/gpu-recovery.js';
const fakeDoc = () => {
  const made = [];
  const el = tag => { const e = { tag, style: {}, hidden: false, width: 0, height: 0, setAttribute() {}, remove() { this.removed = true; }, getContext: () => ({ drawImage() { draws++; } }), toBlob(cb) { cb({ size: 1 }); }, insertAdjacentElement(_, n) { this.after = n; } }; made.push(e); return e; };
  let draws = 0;
  return { doc: { createElement: el, hidden: false }, made, draws: () => draws };
};
test('T3/13: nothing to show before the first snapshot; after it show() covers the canvas at once and hideWhen() fades out when the ground is back', () => {
  globalThis.URL ??= {}; URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {};
  globalThis.Image = class { decode() { return Promise.resolve(); } };
  const { doc, draws } = fakeDoc(); const timers = []; let every;
  const cv = { width: 390, height: 844, offsetLeft: 8, offsetTop: 8, clientWidth: 374, clientHeight: 828, insertAdjacentElement() {} };
  const hold = createFrameHold(cv, { doc, setTimer: (f, ms) => timers.push([f, ms]), setEvery: f => { every = f; return 1; }, clearEvery() {}, now: () => 0 });
  assert.equal(hold.show(), false, 'no picture yet: shows nothing (and nothing breaks)');
  every();   // the 2.5 s tick
  assert.equal(draws(), 1, 'one small copy per tick');
  return Promise.resolve().then(() => Promise.resolve()).then(() => {
    assert.equal(hold.state.snapshots, 1);
  });
});
test('T3/13: the frame hold is wired: shown on context loss, faded out when the ground is painted, read-back only on a 2.5 s timer', () => {
  assert.equal(HOLD_EVERY_MS, 2500); assert.equal(HOLD_FADE_MS, 200);
  const ui = readFileSync(new URL('../src/ui.js', import.meta.url), 'utf8');
  assert.match(ui, /createFrameHold\(cv\)/);
  assert.match(ui, /onLost: \(\) => gpuHold\.show\(\), onRebuilt: \(\) => gpuHold\.hideWhen\(groundPainted\)/);
  assert.match(ui, /m === 'detail' \|\| \(m === 'overview' && !!townTerrainImage\(\)\)/);
  const hold = readFileSync(new URL('../src/gpu-hold.js', import.meta.url), 'utf8');
  assert.doesNotMatch(hold, /requestAnimationFrame/, 'no per-frame work');
  assert.doesNotMatch(hold, /getImageData/, 'no pixel read');
});
test('T3/13: gpu-recovery calls the hooks (lost, rebuilt) around the rebuild', () => {
  const calls = []; const handlers = {};
  const canvas = { addEventListener: (k, f) => { handlers[k] = f; }, removeEventListener() {} };
  watchGraphicsLoss(canvas, { onLost: () => calls.push('lost'), rebuild: () => ({ failed: [] }), onRebuilt: () => calls.push('rebuilt'), recover: () => calls.push('reload'), storage: { getItem: () => null, setItem() {} }, setTimer: () => {} });
  handlers.contextlost(); handlers.contextrestored();
  assert.deepEqual(calls, ['lost', 'rebuilt']);
});
