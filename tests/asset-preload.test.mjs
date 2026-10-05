import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createAssetQueue, zoneAssets, loadImage } from '../src/asset-preload.js';

test('zone bundle covers rooms, intro and chosen outfit without downloading every branch', () => {
  const catalog = JSON.parse(readFileSync('img/preload-catalog.json'));
  for (const zone of ['th','asia','west','cyberhell']) {
    const files = zoneAssets(catalog, zone, 'th');
    assert(files.some(p => p === `img/rooms-wide/${zone}-sala.webp`));
    assert(files.includes('img/hero-yama-th-fire-cutscene-v3.png'));
    assert(files.every(p => existsSync(p)), zone);
    if (zone !== 'th') {
      assert(files.some(p => p.includes(`intro-head-${zone}-v2`)));
      assert(!files.some(p => p.includes(`rooms-wide/${zone === 'west' ? 'asia' : 'west'}-`)));
    }
    assert(!files.some(p => p.includes('/raw/') || p.startsWith('output/')));
  }
});

test('bounded concurrency, retries, failed URLs retried on next run, successes reused', async () => {
  let running = 0, peak = 0;
  const calls = new Map(); let offline = true;
  const q = createAssetQueue(async url => {
    running++; peak = Math.max(peak, running);
    calls.set(url, (calls.get(url) || 0) + 1);
    await new Promise(r => setTimeout(r, 2)); running--;
    if (url === 'bad' && offline) throw new Error();
    if (url === 'flaky' && calls.get(url) === 1) throw new Error();
  }, 2);
  const progress = [];
  assert.deepEqual(await q.run(['a','b','bad','flaky','a'], p => progress.push(p)), ['bad']);
  assert(peak <= 2); assert.equal(calls.get('flaky'), 2);
  assert.equal(progress.at(-1).total, 4); assert.equal(progress.at(-1).done, 4);
  offline = false;
  assert.deepEqual(await q.run(['a','bad','flaky']), []);
  assert.equal(calls.get('a'), 1); assert.equal(calls.get('bad'), 3);
});

test('image gate waits for decoding and rejects missing/stalled images', async () => {
  let finishDecode;
  globalThis.Image = class {
    set src(value) { if (value === 'ok') queueMicrotask(() => this.onload?.()); if (value === 'bad') queueMicrotask(() => this.onerror?.()); }
    decode() { return new Promise(r => { finishDecode = r; }); }
  };
  let ready = false;
  const pending = loadImage('ok', 1000).then(() => { ready = true; });
  await new Promise(r => setTimeout(r, 0)); assert.equal(ready, false);
  finishDecode(); await pending; assert.equal(ready, true);
  await assert.rejects(loadImage('bad', 50));
  await assert.rejects(loadImage('stalled', 5));
});

test('zone transition pauses before opening arrival and repeated change events do not duplicate loading', async () => {
  const { default:vm } = await import('node:vm');
  const ui = readFileSync('src/ui.js', 'utf8');
  const start = ui.indexOf('g.onChange = () => {');
  const end = ui.indexOf("dlg.addEventListener('close', () => setTimeout(drawCoach", start);
  let finish; const calls = [];
  const g = { pendingZone:{k:'asia',name:'บูรพา'},outfit:'th',paused:false,zoneIntroSeen:{} };
  const ctx = { g, preloadZone:(...args) => { calls.push(args); return new Promise(r => { finish = r; }); },
    refresh:()=>calls.push('refresh'), openZoneArrival:z => calls.push(z.k), zoneIntroduction:()=>true,
    bossModal:()=>calls.push('return'), setTimeout(){} };
  vm.createContext(ctx); vm.runInContext(ui.slice(start,end), ctx);
  g.onChange(); g.onChange();
  assert.equal(g.paused, true); assert.equal(g.assetsLoading, true);
  assert.deepEqual(calls, [['asia','th']]); assert(g.pendingZone);
  finish(); await new Promise(r => setTimeout(r, 0));
  assert.equal(g.assetsLoading, false); assert.equal(g.pendingZone, null);
  assert.deepEqual(calls, [['asia','th'],'refresh','asia']);
  g.pendingZone = {k:'asia',back:true,name:'บูรพา'}; g.zoneIntroSeen.asia = true;
  g.onChange(); finish(); await new Promise(r => setTimeout(r, 0));
  assert.equal(calls.at(-1), 'return');
});
