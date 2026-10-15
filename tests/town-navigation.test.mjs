import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// City streets are declarative; building collisions use real sprite silhouettes.
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ ok:true, json:async () => ({ ...manifest, zones:{} }) });
const assetPath = src => fileURLToPath(new URL('../' + src, import.meta.url));
const sizes = new Map();
globalThis.Image = class {
  set src(src) {
    this._src = src;
    if (!existsSync(assetPath(src))) return this.onerror?.();
    if (!sizes.has(src)) sizes.set(src, JSON.parse(execFileSync('python3', ['-c',
      'from PIL import Image; import json,sys; print(json.dumps(Image.open(sys.argv[1]).size))',
      assetPath(src)], { encoding:'utf8' })));
    [this.naturalWidth, this.naturalHeight] = sizes.get(src);
    this.onload?.();
  }
  get src() { return this._src; }
};
const pixels = new Map();
globalThis.document = { documentElement:{}, createElement:() => ({ getContext:() => {
  let source, width, height;
  return {
    drawImage(im, x, y, w, h) { source = im.src; width = w; height = h; },
    getImageData() {
      const key = `${source}:${width}:${height}`;
      if (!pixels.has(key)) pixels.set(key, execFileSync('python3', ['-c',
        'from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert("RGBA"); sys.stdout.buffer.write(im.resize((int(sys.argv[2]),int(sys.argv[3])),Image.Resampling.BILINEAR).tobytes())',
        assetPath(source), String(width), String(height)], { maxBuffer:7_000_000 }));
      return { data:pixels.get(key) };
    },
  };
} }) };

const { createGame } = await import('../src/game.js');
const { SCENE, SPOTS, STATIONS, MERCHANT, FRONTIER } = await import('../src/data.js');
const { bindZone, blockRectsOf } = await import('../src/art.js');
const { canWalk, findPath, resetWalk, setBlocks, setNpcDiscs } = await import('../src/walk.js?v=k1d');
const { INTERACTION_REACH } = await import('../src/proximity.js');
const { BUILD_REACH } = await import('../src/scene.js');
await new Promise(resolve => setImmediate(resolve));

for (const allBuilt of [false, true]) {
  test(`zone1 town plaza reaches every entrance with ${allBuilt ? 'all buildings built' : 'initial buildings'}`, () => {
    const g = createGame();
    bindZone(() => g.zone);
    if (allBuilt) g.stations = STATIONS.map(def => ({ def, slots:[], build:0, fire:0, intensity:3 }));
    resetWalk(); setBlocks([], []); setNpcDiscs([]);
    assert.deepEqual([SCENE.w,SCENE.h],[3840,2560],'large city world uses declarative streets');
    g.syncBlocks(true);
    // A missing sprite must not quietly turn this into a terrain-only test.
    for (const st of g.stations) assert.ok(blockRectsOf(st.def)?.length, `${st.def.k}: real building collision loaded`);
    const start = [SPOTS.bench.x, SPOTS.bench.y];
    assert.equal(canWalk(...start), true, 'town plaza remains walkable');
    const targets = [
      ...STATIONS.map(def => ({ key:def.k, x:def.x, y:def.y,
        built:g.stations.some(st => st.def.k === def.k),
        reach:g.stations.some(st => st.def.k === def.k) ? INTERACTION_REACH : BUILD_REACH })),
      { key:'merchant', ...MERCHANT, reach:INTERACTION_REACH },
      { key:'frontier', ...FRONTIER },
    ];
    for (const target of targets) {
      assert.equal(canWalk(target.x,target.y),true,`${target.key}: courtyard door remains walkable`);
      const route = findPath(...start, target.x, target.y);
      assert.ok(route?.length, `${target.key}: route from plaza exists`);
      const end = route.at(-1);
      assert.ok(Math.hypot(end[0] - target.x, end[1] - target.y) <= target.reach,
        `${target.key}: route reaches interaction range, ended at ${end}`);
      // Validate the complete route, including smoothed segments across the terrain.
      let from = start;
      for (const to of route) {
        const steps = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 4));
        for (let i = 1; i <= steps; i++) assert.equal(canWalk(
          from[0] + (to[0] - from[0]) * i / steps,
          from[1] + (to[1] - from[1]) * i / steps), true, `${target.key}: route stays on walkable ground`);
        from = to;
      }
    }
  });
}
