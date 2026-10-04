import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Load the same manifest, scene masks and building alpha footprints as the browser.
const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
globalThis.fetch = async () => ({ ok:true, json:async () => manifest });
globalThis.Image = class {
  set src(src) {
    this._src = src;
    const key = src.split('/').at(-1).replace(/\.png$/, '');
    [this.naturalWidth, this.naturalHeight] = manifest.stationSizes[key] || [1678,937];
    if (existsSync(new URL(`../${src}`, import.meta.url))) this.onload?.();
  }
  get src() { return this._src; }
};
const pixels = new Map();
globalThis.document = { documentElement:{}, createElement: () => ({ getContext: () => {
  let source, width, height;
  return new Proxy({
    drawImage(im, x, y, w, h) { source = im.src; width = w; height = h; },
    createImageData(w, h) { return { data:new Uint8ClampedArray(w * h * 4) }; },
    putImageData() {},
    getImageData() {
      const key = `${source}:${width}:${height}`;
      if (!pixels.has(key)) pixels.set(key, execFileSync('python3', ['-c',
        'from PIL import Image; import sys; im=Image.open(sys.argv[1]).convert("RGBA"); sys.stdout.buffer.write(im.resize((int(sys.argv[2]),int(sys.argv[3])), Image.Resampling.BILINEAR).tobytes())',
        fileURLToPath(new URL(`../${source}`, import.meta.url)), `${width}`, `${height}`], { maxBuffer:7_000_000 }));
      return { data:pixels.get(key) };
    },
  }, { get: (target, key) => key in target ? target[key] : () => {} });
} }) };
const { createGame } = await import('../src/game.js');
const { STATIONS, ZONES, BUILD_TIME, REPAIR_TIME, syncSceneZone } = await import('../src/data.js');
const { render } = await import('../src/scene.js');
const { bindZone, hiddenAt } = await import('../src/art.js');
const { buildWalk, canWalk, findPath, nearestWalk, resetWalk, setBlocks } = await import('../src/walk.js');
await new Promise(resolve => setImmediate(resolve));

function setup(zone = 'th') {
  const g = createGame();
  g.zone = zone; syncSceneZone(zone); bindZone(() => g.zone); resetWalk(); setBlocks([], []);
  g.coin = 100000; g.level = 5;
  // Satisfy story gates so this fixture exercises construction, not progression.
  g.zoneEventStatus = () => 'cleared';
  assert.equal(g.hire('dam'), true);
  const image = src => ({ src:`img/${src}.png`, naturalWidth:1678, naturalHeight:937 });
  const bg = image(ZONES.find(z => z.k === zone).scene);
  assert.equal(buildWalk(bg, zone === 'west' ? image('scene-v2-opt') : bg), true);
  return g;
}
function allBuildings(g) {
  g.stations = [];
  for (const def of STATIONS) {
    assert.equal(g.build(def.k), true, def.k);
    const st = g.stations.at(-1);
    st.build = 0; st.buildWait = false;
    g.crewOf('taan').buildK = null;
  }
  g.syncBlocks(true);
}
function startJob(g, key, mode, owner = 'taan') {
  g.crewOf(owner === 'taan' ? 'dam' : 'taan').at = 'krata';
  if (mode === 'build') {
    g.stations = g.stations.filter(st => st.def.k !== key);
    assert.equal(g.build(key), true);
  } else {
    g.stations.find(st => st.def.k === key).fire = 100;
    assert.equal(g.repairStation(key), true);
  }
  return g.stations.find(st => st.def.k === key);
}
function arrive(g, st, mode, dt = 16) {
  let frames = 0;
  while (st[`${mode}Wait`] && frames++ < Math.ceil(30000 / dt) + 2) g.stepWorld(dt);
  assert.equal(st[`${mode}Wait`], false, `${g.zone}/${st.def.k}/${mode}`);
  const c = g.crew.find(c => c.buildK === st.def.k);
  assert.ok(c, 'ownership remains until work finishes');
  assert.equal(canWalk(c.x, c.y), true, 'work position is walkable');
  assert.equal(c.path, null, 'worker stays at the work position');
  assert.ok(st[mode] >= Date.now() + (mode === 'build' ? BUILD_TIME : REPAIR_TIME) - 1000);
  return c;
}

test('all stations in all four zones: both builders arrive for build and repair among other buildings', () => {
  let natural = 0, recovered = 0;
  for (const zone of ZONES) for (const key of STATIONS.map(s => s.k))
    for (const mode of ['build','repair']) for (const owner of ['taan','dam']) {
      const g = setup(zone.k); allBuildings(g);
      const st = startJob(g, key, mode, owner);
      const c = g.crewOf(owner);
      [c.x,c.y] = nearestWalk(880,455); c.path = null;
      arrive(g, st, mode);
      assert.equal(g.stations.some(s => !s.build && hiddenAt(s.def, c.x, c.y)), false,
        `${zone.k}/${key}: worker visible`);
      if (st.arrivalElapsed < 30000) natural++; else { recovered++; console.log(`Recovered: ${zone.k}/${key}/${mode}/${owner}`); }
    }
  console.log(`Arrival matrix: ${natural} walked, ${recovered} recovered at timeout`);
});

test('blocked definition point plus mob: build and repair reach a walkable visible work point', () => {
  for (const mode of ['build','repair']) {
    const g = setup(); allBuildings(g);
    const st = startJob(g, 'lan', mode);
    const { x,y } = st.def;
    // Simulate a neighboring footprint covering the old definition point.
    const sync = g.syncBlocks.bind(g);
    g.syncBlocks = () => { sync(true); setBlocks([[x-24,y-24,x+24,y+24]], []); };
    g.syncBlocks();
    assert.equal(canWalk(x,y), false);
    const c = g.crewOf('taan'); c.x = 584; c.y = 660; c.path = null; c.wait = 3000;
    // Repair is requested before the mob appears, as canRepair intentionally requires a clear map.
    g.mobs = [{ id:1900, x:710, y:674, hp:100, kind:0 }];
    arrive(g, st, mode);
    assert.ok(Math.hypot(c.x-x,c.y-y) >= 24);
  }
});

test('disconnected route recovers after 30 active seconds, preserving elapsed time on reload and pause', () => {
  for (const mode of ['build','repair']) {
    let g = setup(); allBuildings(g);
    let st = startJob(g, 'lan', mode);
    const trap = game => {
      game.syncBlocks = () => setBlocks([
        [850,430,870,490], [910,430,930,490], [850,430,930,450], [850,470,930,490],
      ], []);
      game.syncBlocks();
    };
    const c = g.crewOf('taan'); c.x = 890; c.y = 460; c.path = null;
    trap(g);
    assert.equal(canWalk(c.x,c.y), true, `trap start ${mode}`);
    for (let i = 0; i < 100; i++) g.stepWorld(120);
    assert.equal(st[`${mode}Wait`], true);
    assert.equal(st.arrivalElapsed, 12000);
    const saved = JSON.parse(JSON.stringify(g.snapshot()));
    g = setup(); assert.equal(g.restore(saved), true); trap(g);
    st = g.stations.find(st => st.def.k === 'lan');
    assert.equal(st.arrivalElapsed, 12000);
    g.paused = true;
    const before = [g.crewOf('taan').x,g.crewOf('taan').y];
    g.stepWorld(180000);
    assert.deepEqual([g.crewOf('taan').x,g.crewOf('taan').y], before);
    assert.equal(st.arrivalElapsed, 12000);
    g.paused = false;
    // A delayed frame after a tab switch contributes at most one normal frame.
    g.stepWorld(180000);
    assert.equal(st.arrivalElapsed, 12120);
    arrive(g, st, mode, 120);
    assert.equal(st.arrivalElapsed, 30000);
  }
});

test('escort suspends arrival, then releases the worker; battle help keeps the job owner', () => {
  for (const mode of ['build','repair']) {
    const g = setup(); allBuildings(g);
    const st = startJob(g, 'lan', mode);
    const c = g.crewOf('taan'); c.x = 880; c.y = 455;
    g.party.members = ['taan'];
    g.startBattle({ id:701, name:'คู่ซ้อม', who:'คู่ซ้อม', sp:1, deserved:20 });
    g.battle.foeHp = 10000;
    assert.equal(g.battleAct('crew:taan'), true);
    assert.equal(c.buildK, st.def.k);
    assert.equal(st[`${mode}Wait`], true);
    g.battle = null; g.paused = false;
    c.escort = 123;
    g.transits = [{ id:123, crew:c.k, arriveAt:Date.now()+10000 }];
    g.stepWorld(16);
    assert.equal(st[`${mode}Wait`], true);
    assert.equal(st.arrivalElapsed, 0);
    g.transits[0].arriveAt = Date.now()-1;
    arrive(g, st, mode);
    assert.equal(c.escort, null);
  }
});

test('two builds approach concurrently and retain each owner and build-work render state', () => {
  const g = setup();
  assert.equal(g.build('lan'), true); assert.equal(g.build('krajok'), true);
  for (const c of g.builders()) { c.x = 880; c.y = 455; }
  const sites = ['lan','krajok'].map(k => g.stations.find(st => st.def.k === k));
  for (let i = 0; i < 1877 && sites.some(st => st.buildWait); i++) g.stepWorld(16);
  for (const [i,st] of sites.entries()) {
    assert.equal(st.buildWait, false);
    assert.equal(g.crewOf(i === 0 ? 'taan' : 'dam').buildK, st.def.k);
  }
  const drawn = [];
  const ctx = new Proxy({ canvas:{ width:1678, height:937 },
    drawImage(im) { drawn.push(im.src); },
    measureText() { return { width:10 }; },
    createRadialGradient() { return { addColorStop() {} }; },
    createLinearGradient() { return { addColorStop() {} }; },
  }, { get(target, key) { return key in target ? target[key] : () => {}; } });
  render(ctx, g, 0, null, null);
  for (const owner of ['taan','dam']) assert.ok(drawn.includes(`img/crew-${owner}-build-work.png`), owner);
});

test('Thai lan route reproduction records the reachable endpoint before bounded recovery', () => {
  const g = setup(); allBuildings(g);
  const st = startJob(g, 'lan', 'build');
  const c = g.crewOf('taan'); c.x = 880; c.y = 455;
  for (let i = 0; i < 1800 && st.buildWait; i++) g.stepWorld(16);
  assert.equal(st.buildWait, true, 'nearest walkable site is still unreachable');
  assert.equal(canWalk(...c.workTarget), true, 'local walkability does not imply connectivity');
  assert.equal(findPath(c.x,c.y,...c.workTarget), null, 'no further route from the reachable endpoint');
  assert.ok(Math.hypot(c.x-c.workTarget[0],c.y-c.workTarget[1]) > 42);
  console.log('Lan route evidence:', JSON.stringify({ worker:[c.x,c.y], target:c.workTarget,
    pending:st.buildWait, elapsed:st.arrivalElapsed,
    pathEnd:findPath(c.x,c.y,...c.workTarget)?.at(-1) }));
  arrive(g,st,'build');
});
