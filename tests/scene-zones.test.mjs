import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/game.js';
import { SCENE, ZONES, STATIONS, SPOTS, NO_WALK, GUARD_POST } from '../src/data.js';
import { buildWalk, canWalk, walkGridSize } from '../src/walk.js';

globalThis.Image = class {};

const size = () => [SCENE.w, SCENE.h];
const grid = () => [walkGridSize().cols, walkGridSize().rows];

test('ขนาดฉาก พิกัดเดิม และ walk grid สลับตามโซนและกลับไทย', () => {
  const g = createGame();
  g.level = 5;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  const sceneRef = SCENE;
  assert.deepEqual(size(), [1678, 937]);
  assert.deepEqual(grid(), [210, 118]);
  assert.equal(STATIONS.find(s => s.k === 'sala').bx, 1477);
  for (const zone of ['asia', 'west', 'cyberhell']) {
    assert.equal(g.moveZone(zone), true);
    assert.equal(SCENE, sceneRef);
    assert.deepEqual(size(), [1527, 704]);
    assert.deepEqual(grid(), [191, 88]);
    assert.equal(STATIONS.find(s => s.k === 'sala').bx, 1260);
    assert.deepEqual([SPOTS.bench.x, SPOTS.bench.y], [800, 396]);
    assert.deepEqual(GUARD_POST, [845, 672]);
    assert.equal(NO_WALK[3][1], 584);
    assert.equal(canWalk(100, 700), false);
  }
  assert.equal(g.moveZone('th'), true);
  assert.deepEqual(size(), [1678, 937]);
  assert.deepEqual(grid(), [210, 118]);
  assert.equal(STATIONS.find(s => s.k === 'sala').bx, 1477);
  assert.deepEqual([SPOTS.bench.x, SPOTS.bench.y], [820, 455]);
  assert.deepEqual(GUARD_POST, [895, 795]);
  assert.equal(NO_WALK[3][1], 695);
  g.moveZone('asia');
  const fresh = createGame();
  assert.deepEqual([fresh.player.x, fresh.player.y], [880, 455]);
  assert.deepEqual(size(), [1678, 937]);
});

test('โหลดเซฟโซน 2-4 ตั้งขนาดและตารางเดินก่อนใช้งาน', () => {
  for (const zone of ['asia', 'west', 'cyberhell']) {
    const g = createGame(), saved = g.snapshot();
    saved.zone = zone;
    saved.level = 5;
    saved.player = { ...saved.player, x:800, y:396, tx:null, ty:null, path:null };
    const loaded = createGame();
    assert.equal(loaded.restore(saved), true);
    assert.equal(loaded.zone, zone);
    assert.deepEqual(size(), [1527, 704]);
    assert.deepEqual(grid(), [191, 88]);
    assert.equal(canWalk(loaded.player.x, loaded.player.y), true);
  }
});

test('walk mask สร้างด้วยขนาดปัจจุบันอีกครั้งหลังย้ายโซน', () => {
  const oldDocument = globalThis.document, made = [];
  globalThis.document = { createElement: () => {
    const canvas = { width:0, height:0, getContext() { return {
      drawImage() {}, getImageData() { made.push([canvas.width, canvas.height]);
        return { data:new Uint8ClampedArray(canvas.width * canvas.height * 4) }; },
    }; } };
    return canvas;
  } };
  try {
    const g = createGame();
    assert.equal(buildWalk({ naturalWidth:1678 }), true);
    assert.equal(g.moveZone('asia'), false); // ยังไม่ปลดล็อก
    g.level = 5; g.bossCleared.th = true;
    assert.equal(g.moveZone('asia'), true);
    assert.equal(buildWalk({ naturalWidth:1527 }), true);
    assert.equal(buildWalk({ naturalWidth:1527 }), true); // ภาพโซนจริงมาแทนภาพสำรอง
    assert.deepEqual(made, [[1678,937],[1527,704],[1527,704]]);
  } finally { globalThis.document = oldDocument; }
});
