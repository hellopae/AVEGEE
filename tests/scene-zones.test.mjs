import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { CREW, FRONTIER, GUARD_POST, MERCHANT, MOB, NO_WALK, QUEUE_LINE, SCENE,
         SPOTS, STATIONS, ZONES, syncSceneZone } from '../src/data.js';
import { buildWalk, canWalk, findPath, resetWalk, setBlocks, walkGridSize } from '../src/walk.js';

globalThis.Image = class {};

const size = () => [SCENE.w, SCENE.h];
const grid = () => [walkGridSize().cols, walkGridSize().rows];
const names = { th:'scene-v2-opt', asia:'scene-asia-v3', west:'scene-west-v2', cyberhell:'scene-cyberhell-v2' };
const image = name => ({ naturalWidth:1678, naturalHeight:937,
  path:fileURLToPath(new URL(`../img/${name}.png`, import.meta.url)) });
const pixels = new Map();
function imagePixels(im) {
  if (!pixels.has(im.path)) {
    const raw = execFileSync('python3', ['-c',
      'from PIL import Image; import sys; sys.stdout.buffer.write(Image.open(sys.argv[1]).convert("RGBA").tobytes())',
      im.path], { maxBuffer:7_000_000 });
    assert.equal(raw.length, 1678 * 937 * 4);
    pixels.set(im.path, raw);
  }
  return pixels.get(im.path);
}
function withImageCanvas(run) {
  const old = globalThis.document;
  globalThis.document = { createElement: () => {
    let source;
    return { width:0, height:0, getContext: () => ({
      drawImage(im) { source = im; },
      getImageData() { return { data:imagePixels(source) }; },
    }) };
  } };
  try { run(); } finally { globalThis.document = old; }
}

test('ทุกโซนใช้ผังและพิกัดเดียวกัน และประตูย้ายโซนทำงาน', () => {
  const g = createGame();
  g.level = 5;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  const sceneRef = SCENE;
  // 30F verifies CyberHell's four local relocations and restoration in its own regression file.
  const fixedSite = s => !['tea','lokan','krajok','dab','krata'].includes(s.k);
  const stationPos = STATIONS.filter(fixedSite).map(s => [s.bx, s.by, s.bw, ...s.hit]);
  const servicePos = STATIONS.filter(s => fixedSite(s) && s.k !== 'lan').map(s => [s.x, s.y]);
  const manifest = JSON.parse(readFileSync(new URL('../img/manifest.json', import.meta.url)));
  for (const z of ZONES) {
    if (g.zone !== z.k) assert.equal(g.moveZone(z.k), true);
    assert.equal(SCENE, sceneRef);
    assert.equal(z.scene, names[z.k]);
    assert.ok(manifest.rest.includes(`${z.scene}.png`));
    assert.deepEqual(size(), [1678, 937]);
    assert.deepEqual(grid(), [210, 118]);
    assert.deepEqual(STATIONS.filter(fixedSite).map(s => [s.bx, s.by, s.bw, ...s.hit]), stationPos);
    assert.deepEqual(STATIONS.filter(s => fixedSite(s) && s.k !== 'lan').map(s => [s.x, s.y]), servicePos);
    assert.deepEqual([STATIONS.find(s => s.k === 'lan').x, STATIONS.find(s => s.k === 'lan').y],
      z.k === 'th' ? [585,615] : [500,615]);
    assert.deepEqual([STATIONS.find(s => s.k === 'tea').x, STATIONS.find(s => s.k === 'tea').y],
      z.k === 'asia' ? [365,650] : [218,653]);
    assert.deepEqual([SPOTS.bench.x, SPOTS.bench.y], [820, 455]);
    assert.deepEqual(GUARD_POST, [720, 890]);
    assert.deepEqual([FRONTIER.x, FRONTIER.y], [835, 840]);
    assert.equal(NO_WALK[3][1], 695);
    assert.ok(QUEUE_LINE.slice(1).every(([x]) => x === 835));
    assert.equal(canWalk(100, 700), false);
  }
  const fresh = createGame();
  assert.deepEqual([fresh.player.x, fresh.player.y], [880, 455]);
});

test('ภาพจริงกันธารโซน 2–4 และให้เดินข้ามสะพานถึงจุดงาน', () => withImageCanvas(() => {
  const g = createGame();
  g.level = 5;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  for (const z of ZONES.slice(1)) {
    if (g.zone !== z.k) assert.equal(g.moveZone(z.k), true);
    resetWalk(); setBlocks([], []);
    const bg = image(z.scene);
    const source = z.k === 'west' ? image('scene-v2-opt') : bg;
    assert.equal(buildWalk(bg, source), true, z.k);
    for (const [x, y] of [[580,250],[665,610],[1150,670]])
      assert.equal(canWalk(x, y), false, `${z.k}: stream ${x},${y}`);
    const blocked = [];
    for (const [x,y] of [
      [SPOTS.bench.x, SPOTS.bench.y], [SPOTS.bossPier.x, SPOTS.bossPier.y],
      [MERCHANT.x, MERCHANT.y], GUARD_POST, [FRONTIER.x, FRONTIER.y],
      ...QUEUE_LINE, ...STATIONS.map(s => [s.x, s.y]),
      ...STATIONS.map(s => [s.sx ?? s.x, s.sy ?? s.y]), ...CREW.map(c => [c.hx, c.hy]),
    ]) if (!canWalk(x, y)) blocked.push([x,y]);
    assert.deepEqual(blocked, [], `${z.k}: blocked work points`);
    const path = findPath(SPOTS.bench.x, SPOTS.bench.y, GUARD_POST[0], GUARD_POST[1]);
    assert.deepEqual(path?.at(-1), GUARD_POST, `${z.k}: bridge reaches border`);
    for (const [label, x, y] of [
      ...STATIONS.map(st => [st.k, st.x, st.y]),
      ...CREW.map(c => [c.k, c.hx, c.hy]),
      ['merchant', MERCHANT.x, MERCHANT.y], ['boss', SPOTS.bossPier.x, SPOTS.bossPier.y],
      ...QUEUE_LINE.map(([x,y], i) => [`queue ${i}`, x, y]),
    ]) {
      const route = findPath(SPOTS.bench.x, SPOTS.bench.y, x, y);
      assert.deepEqual(route?.at(-1), [x, y], `${z.k}: ${label} reachable`);
    }
  }
}));

test('ยักษ์เดินกลับจุดเฝ้าจากท่าเรือและขอบล่างในทุกโซน แล้วหยุดนิ่ง', () => withImageCanvas(() => {
  const g = createGame();
  const starts = [[1380,682], [470,682], [150,675], [800,675], [1000,675], [1500,675]];
  for (const z of ZONES) {
    g.zone = z.k;
    syncSceneZone(z.k);
    resetWalk();
    g.syncBlocks(true);
    const bg = image(z.scene);
    assert.equal(buildWalk(bg, z.k === 'west' ? image('scene-v2-opt') : bg), true, z.k);
    for (const [x, y] of starts) {
      assert.equal(canWalk(x, y), true, `${z.k}: start ${x},${y}`);
      g.guard = { x, y };
      g.mobs = [];
      let frames = 0;
      while (frames++ < 400 && (g.guard.x !== GUARD_POST[0] || g.guard.y !== GUARD_POST[1]))
        g.stepWorld(120);
      assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST, `${z.k}: return from ${x},${y} in ${frames} frames`);
      for (let i = 0; i < 10; i++) g.stepWorld(120);
      assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST, `${z.k}: stands still`);
      // เฟรมเล็กแบบเบราว์เซอร์ (~16ms) — เคยค้างเฉียดกำแพงบางหนึ่งช่องกลางทาง
      g.guard = { x, y };
      frames = 0;
      while (frames++ < 6000 && (g.guard.x !== GUARD_POST[0] || g.guard.y !== GUARD_POST[1]))
        g.stepWorld(16);
      assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST, `${z.k}: small-frame return from ${x},${y} in ${frames} frames`);
    }
  }
}));

test('spawnMob เลือกเฉพาะจุดขอบล่างที่ findPath เชื่อมถึงจุดเฝ้า ทุกโซน', () => withImageCanvas(() => {
  const g = createGame();
  for (const z of ZONES) {
    g.zone = z.k;
    syncSceneZone(z.k);
    resetWalk();
    g.syncBlocks(true);
    const bg = image(z.scene);
    assert.equal(buildWalk(bg, z.k === 'west' ? image('scene-v2-opt') : bg), true, z.k);
    g.mobs = [];
    for (let i = 0; i < 300; i++) g.spawnMob();
    // x=150 (ขอบล่างซ้าย) เดินได้แต่ใน CyberHell findPath ไปไม่ถึงจุดเฝ้า — ล็อกสุ่มให้ตกจุดนี้ตรง ๆ
    const rnd = Math.random;
    Math.random = () => (150 - 110) / (SCENE.w - 220);
    try { for (let i = 0; i < 5; i++) g.spawnMob(); } finally { Math.random = rnd; }
    assert.ok(g.mobs.length > 0, `${z.k}: spawns`);
    for (const m of g.mobs) {
      const path = findPath(m.x, m.y, GUARD_POST[0], GUARD_POST[1]);
      assert.deepEqual(path?.at(-1), GUARD_POST, `${z.k}: mob at ${m.x},${m.y} reaches guard post`);
    }
  }
}));

test('ยักษ์ปราบปีศาจจากท่าเรือขวาแล้วกลับจุดเฝ้าในโซนไทยและบูรพา', () => withImageCanvas(() => {
  const g = createGame();
  for (const zone of ['th', 'asia']) {
    g.zone = zone;
    syncSceneZone(zone);
    resetWalk();
    g.syncBlocks(true);
    const bg = image(ZONES.find(z => z.k === zone).scene);
    assert.equal(buildWalk(bg), true, zone);
    g.guard = { x:GUARD_POST[0], y:GUARD_POST[1] };
    g.mobs = [{ id:1900, x:1380, y:682, hp:MOB.hp, kind:0 }];
    let frames = 0;
    while (frames++ < 900 && g.mobs.length) g.stepWorld(120);
    assert.equal(g.mobs.length, 0, `${zone}: defeats pier mob in ${frames} frames`);
    frames = 0;
    while (frames++ < 400 && (g.guard.x !== GUARD_POST[0] || g.guard.y !== GUARD_POST[1]))
      g.stepWorld(120);
    assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST, `${zone}: returns in ${frames} frames`);
  }
}));

test('ยักษ์ snap จุดแวะขณะไล่ปีศาจที่เฟรม 16ms แล้วเดินถึงเป้าหมาย', () => withImageCanvas(() => {
  const g = createGame();
  resetWalk();
  g.syncBlocks(true);
  const bg = image(ZONES.find(z => z.k === 'th').scene);
  assert.equal(buildWalk(bg), true);
  g.guard = { x:GUARD_POST[0], y:GUARD_POST[1] - 5,
    path:[[...GUARD_POST]], target:[1380, 682] };
  g.mobs = [{ id:1900, x:1380, y:682, hp:MOB.hp, kind:0 }];
  g.stepWorld(16);
  assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST);
  let frames = 0;
  while (frames++ < 6000 && g.mobs.length) g.stepWorld(16);
  assert.equal(g.mobs.length, 0, `defeats pier mob in ${frames} small frames`);
}));

test('เซฟผังเก่าโซน 2–4 ย้ายผู้เล่น ของตก ยมทูต และยักษ์ครั้งเดียว', () => {
  for (const zone of ['asia', 'west', 'cyberhell']) {
    const saved = createGame().snapshot();
    saved.zone = zone; saved.level = 5;
    delete saved.mapV3FixBranches;
    saved.player = { ...saved.player, x:1700, y:390, tx:400, ty:400, path:[[400,400]] };
    saved.items = [{ k:'food', x:600, y:300 }];
    saved.crew = [{ ...saved.crew[0], x:600, y:300, hx:400, hy:352 }];
    saved.guard = { x:600, y:300 };
    saved.zoneSave = { asia:{ items:[{ k:'food', x:600, y:300 }], guard:{x:600,y:300} } };
    const g = createGame();
    assert.equal(g.restore(saved), true);
    assert.equal(g.zone, zone);
    assert.deepEqual(size(), [1678,937]);
    assert.deepEqual(grid(), [210,118]);
    assert.deepEqual([g.player.x,g.player.y], [880,455]);
    assert.equal(g.player.path, null);
    // ชุด 27D — ของที่ค้างบนแผนที่ในเซฟเก่าเข้ากระเป๋าตอนโหลด (ไม่มีของตกบนแผนที่อีก)
    assert.deepEqual(g.items, []);
    assert.equal(g.inventory.food, 1);
    assert.deepEqual([g.crew[0].hx,g.crew[0].hy], [463,443]);
    assert.equal(g.crew[0].x, null);
    assert.deepEqual([g.guard.x,g.guard.y], GUARD_POST);
    assert.deepEqual([g.zoneSave.asia.items[0].x,g.zoneSave.asia.items[0].y], [880,455]);
    const again = createGame();
    assert.equal(again.restore(g.snapshot()), true);
    assert.deepEqual([again.player.x,again.player.y], [880,455]);
  }
});

test('เซฟที่ยักษ์ยืนจุดเฝ้าเก่าย้ายมาจุดใหม่ทุกโซน', () => {
  const saved = createGame().snapshot();
  saved.guard = { x:895, y:795 };
  saved.zoneSave = { asia:{ guard:{ x:895, y:795 } } };
  const g = createGame();
  assert.equal(g.restore(saved), true);
  assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST);
  assert.deepEqual([g.zoneSave.asia.guard.x, g.zoneSave.asia.guard.y], GUARD_POST);
  saved.guard = { x:700, y:795 };
  assert.equal(g.restore(saved), true);
  assert.deepEqual([g.guard.x, g.guard.y], GUARD_POST);
});
