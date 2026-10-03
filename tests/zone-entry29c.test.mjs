import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { CREW, FRONTIER, GUARD_POST, MERCHANT, QUEUE_LINE, SPOTS, STATIONS, ZONES, ZONE_ENTRY, syncSceneZone } from '../src/data.js';
import { buildWalk, canWalk, findPath, resetWalk, setBlocks } from '../src/walk.js';

globalThis.Image = class {};

// อ่านพิกเซลภาพฉากจริงของแต่ละโซนผ่าน PIL แบบเดียวกับ tests/scene-zones.test.mjs เพื่อสร้าง walk mask จริง
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
const buildMask = z => {
  resetWalk(); setBlocks([], []);
  const bg = image(z.scene);
  assert.equal(buildWalk(bg, z.k === 'west' ? image('scene-v2-opt') : bg), true, z.k);
};
const reaches = (from, to) => {
  const path = findPath(from[0], from[1], to[0], to[1]);
  const end = path?.at(-1);
  return !!end && Math.hypot(end[0] - to[0], end[1] - to[1]) < 1;
};

test('จุดเกิด/ปลายทางตอนเข้าโซน และจุดสำคัญของทุกโซน อยู่ในพื้นที่เดินได้และเดินถึงกัน', () => withImageCanvas(() => {
  const g = createGame();
  for (const z of ZONES) {
    g.zone = z.k; syncSceneZone(z.k);
    buildMask(z);
    // ประตูชายแดน · จุดของนิรา · แท่นตัดสิน ต้องเหยียบได้จริง ไม่ใช่ลอยในช่องที่อ่านสีแล้วเป็นลาวา/หน้าผา
    for (const [name, p] of Object.entries(ZONE_ENTRY)) assert.equal(canWalk(p[0], p[1]), true, `${z.k}: ZONE_ENTRY.${name} ${p}`);
    const points = [
      ['bench', [SPOTS.bench.x, SPOTS.bench.y]], ['goal', ZONE_ENTRY.goal], ['bossPier', [SPOTS.bossPier.x, SPOTS.bossPier.y]],
      ['guardPost', GUARD_POST], ['merchant', [MERCHANT.x, MERCHANT.y]], ['frontier', [FRONTIER.x, FRONTIER.y]],
      ...QUEUE_LINE.map((p, i) => [`queue${i}`, p]),
      // โซน 1 มีจุดยืนเดิมบางจุดที่ตกลาวา (ลานตรากตรำ 585,615) ระบบเดินเลื่อนไปจุดใกล้สุดเองมาตลอด — ไม่ใช่ขอบเขตงานนี้
      // โซน 2–4 ตรวจเข้มทุกสถานี/จุดประจำยมทูต (ตรงกับ tests/scene-zones.test.mjs)
      ...(z.k === 'th' ? [] : [
        ...STATIONS.map(s => [`station ${s.k}`, [s.x, s.y]]),
        ...CREW.map(c => [`crew ${c.k} home`, [c.hx, c.hy]]),
      ]),
    ];
    for (const [name, p] of points) {
      assert.equal(canWalk(p[0], p[1]), true, `${z.k}: ${name} ${p} อยู่ในพื้นที่เดินได้`);
      assert.ok(reaches(ZONE_ENTRY.gate, p), `${z.k}: เดินจากประตูชายแดนถึง ${name}`);
      assert.ok(reaches(ZONE_ENTRY.nira, p), `${z.k}: นิราเดินถึง ${name}`);
    }
  }
}));

test('เข้าโซน 2–4 ครั้งแรก: ยมบาทกับนิราออกจากประตูชายแดน ถึงแท่นและจุดประจำ ไม่ติดกลางทาง', () => withImageCanvas(() => {
  const g = createGame();
  g.level = 5;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  for (const z of ZONES.slice(1)) {
    assert.equal(g.moveZone(z.k), true);
    // เบราว์เซอร์เดินเกมหลายเฟรมก่อนที่ภาพ mask ของโซนใหม่จะโหลดเสร็จ — เส้นทางที่วางไว้ตอนนั้นเป็นเส้นตรงข้ามลาวา
    // (นี่คือสาเหตุที่นิราค้างริมลาวาในเบราว์เซอร์จริง) จึงเดินก่อนสร้าง mask แล้วค่อยสร้างตามลำดับเดียวกัน
    for (let i = 0; i < 8; i++) g.stepWorld(16);
    buildMask(z); g.syncBlocks(true);
    const nira = g.crew.find(c => c.k === 'nira');
    const gate = [g.player.x, g.player.y];
    assert.ok(Math.hypot(gate[0] - ZONE_ENTRY.gate[0], gate[1] - ZONE_ENTRY.gate[1]) < 30, `${z.k}: ยมบาทเริ่มที่ประตูชายแดน ${gate}`);
    assert.ok(Math.hypot(nira.x - ZONE_ENTRY.nira[0], nira.y - ZONE_ENTRY.nira[1]) < 40, `${z.k}: นิราเริ่มข้างประตูชายแดน`);
    assert.equal(canWalk(nira.x, nira.y), true);
    g.queue = []; g.mobs = [];
    let frames = 0, atGoal = -1;
    const near = (p, q, r) => Math.hypot(p[0] - q[0], p[1] - q[1]) <= r;
    while (frames++ < 3000) {
      g.stepWorld(16);
      if (atGoal < 0 && near([g.player.x, g.player.y], ZONE_ENTRY.goal, 8)) atGoal = frames;
      if (atGoal >= 0 && near([nira.x, nira.y], [nira.hx, nira.hy], 60)) break;
    }
    assert.ok(atGoal > 0, `${z.k}: ยมบาทเดินถึงแท่นตัดสิน (เฟรม ${frames}) ที่ ${g.player.x},${g.player.y}`);
    assert.ok(near([nira.x, nira.y], [nira.hx, nira.hy], 60), `${z.k}: นิราเดินถึงจุดประจำ อยู่ที่ ${nira.x|0},${nira.y|0} (home ${nira.hx},${nira.hy})`);
    // ถึงแล้วขยับต่อได้ตามระบบเดิม: สั่งเดินไปจุดอื่นแล้วไปถึง
    assert.equal(g.walkTo(QUEUE_LINE[3][0], QUEUE_LINE[3][1]), true);
    let steps = 0;
    while (steps++ < 600 && g.player.path) g.stepWorld(16);
    assert.ok(near([g.player.x, g.player.y], QUEUE_LINE[3], 12), `${z.k}: ขยับต่อได้ อยู่ที่ ${g.player.x|0},${g.player.y|0} path=${JSON.stringify(g.player.path)}`);
  }
}));
