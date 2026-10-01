// ชุด 27D — สะพานเดินข้ามได้ทุกโซน · พญายมนั่งตรงเก้าอี้ · ตะรางมีฟรี · ของได้จากการปราบ ไม่ตกบนแผนที่
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createGame } from '../src/game.js';
import { MOB, ITEMS, SPOTS, STATIONS, ZONES, syncSceneZone } from '../src/data.js';
import { buildWalk, canWalk, resetWalk, setBlocks, stepTo } from '../src/walk.js';

globalThis.Image = class {};

const image = name => ({ naturalWidth:1678, naturalHeight:937,
  path:fileURLToPath(new URL(`../img/${name}.png`, import.meta.url)) });
const pixels = new Map();
function imagePixels(im) {
  if (!pixels.has(im.path)) {
    pixels.set(im.path, execFileSync('python3', ['-c',
      'from PIL import Image; import sys; sys.stdout.buffer.write(Image.open(sys.argv[1]).convert("RGBA").tobytes())',
      im.path], { maxBuffer:7_000_000 }));
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
const loadZone = z => {
  syncSceneZone(z.k); resetWalk(); setBlocks([], []);
  const bg = image(z.scene);
  assert.equal(buildWalk(bg, z.k === 'west' ? image('scene-v2-opt') : bg), true, z.k);
};

/** เดินด้วย stepTo ก้าวละ step พิกัด จากจุดเริ่มไปจุดสิ้นสุด (เหมือน stepWorld ในเกม) — true ถ้าถึงปลายทาง */
function walkLine(a, b, step = 2.4) {
  const p = { x:a[0], y:a[1] };
  const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step);
  const dx = (b[0] - a[0]) / n, dy = (b[1] - a[1]) / n;
  for (let i = 0; i < n; i++) if (!stepTo(p, dx, dy)) return false;
  return Math.hypot(p.x - b[0], p.y - b[1]) < 1;
}

test('เดินข้ามสะพานใหญ่หน้าแท่นได้ตลอดความกว้างพื้นไม้ ทุกโซน', () => withImageCanvas(() => {
  for (const z of ZONES) {
    loadZone(z);
    // ทุกพิกเซลบนแนวเดินตั้งแต่บันไดแท่นถึงฝั่งใต้ต้องเหยียบได้ (เดิมมีเส้นลาวาลอดไม้ขวางที่ y≈608-613)
    for (let x = 812; x <= 860; x += 4)
      for (let y = 520; y <= 700; y++) assert.equal(canWalk(x, y), true, `${z.k}: main bridge ${x},${y}`);
    for (const x of [815, 835, 855]) {
      assert.equal(walkLine([x, 520], [x, 700]), true, `${z.k}: walk south x=${x}`);
      assert.equal(walkLine([x, 700], [x, 520]), true, `${z.k}: walk north x=${x}`);
    }
    // ลาวาสองข้างสะพานยังห้ามเดิน
    for (const [x, y] of [[760, 615], [790, 600], [900, 615], [1000, 615]])
      assert.equal(canWalk(x, y), false, `${z.k}: lava beside main bridge ${x},${y}`);
  }
}));

test('เดินข้ามสะพานเล็กซ้ายแท่นได้ตลอดความกว้างพื้นไม้ ทุกโซน', () => withImageCanvas(() => {
  for (const z of ZONES) {
    loadZone(z);
    for (let y = 436; y <= 476; y += 2)
      for (let x = 590; x <= 690; x++) assert.equal(canWalk(x, y), true, `${z.k}: small bridge ${x},${y}`);
    for (const y of [440, 455, 470]) {
      assert.equal(walkLine([584, y], [690, y]), true, `${z.k}: walk east y=${y}`);
      assert.equal(walkLine([690, y], [584, y]), true, `${z.k}: walk west y=${y}`);
    }
    for (const [x, y] of [[630, 410], [630, 500], [620, 560], [630, 380]])
      assert.equal(canWalk(x, y), false, `${z.k}: lava beside small bridge ${x},${y}`);
  }
}));

test('พญายมนั่งตรงเก้าอี้บนแท่น (กึ่งกลาง x≈836 ปลายขา y≈447) และไม่ใช่ตำแหน่งเดิม', () => {
  assert.deepEqual([SPOTS.throne.x, SPOTS.throne.y], [836, 447]);
  // กรอบเก้าอี้ที่วัดจากภาพฉากทั้ง 4 โซน: x 807–865 · y 347–447
  assert.ok(SPOTS.throne.x >= 807 && SPOTS.throne.x <= 865);
  assert.ok(SPOTS.throne.y >= 347 && SPOTS.throne.y <= 450);
});

test('ตะรางรอวาระมีตั้งแต่เกมใหม่ทุกโซน ไม่ต้องซื้อ และสร้างซ้ำไม่ได้', () => {
  const tarang = STATIONS.find(s => s.k === 'tarang');
  assert.equal(tarang.cost, 0);                       // cost 0 = ไม่ขึ้นในเมนูก่อสร้าง
  assert.equal(tarang.visit, undefined);              // ไม่วางลูกไฟบนพื้นอีก
  const g = createGame();
  const mine = () => g.stations.filter(st => st.def.k === 'tarang');
  assert.equal(mine().length, 1);
  assert.equal(mine()[0].build, 0);
  assert.equal(g.has('tarang'), true);
  g.coin = 9999;
  assert.equal(g.build('tarang'), false);
  assert.equal(g.coin, 9999);
  g.level = 5;
  for (const z of ZONES) g.bossCleared[z.k] = true;
  for (const z of ZONES.slice(1)) {
    assert.equal(g.moveZone(z.k), true, z.k);
    assert.equal(mine().length, 1, `${z.k}: new zone has the prison`);
    assert.equal(mine()[0].build, 0);
  }
  // กลับสาขาเดิมที่เซฟไว้ก่อนมีตะราง → ได้ตะราง
  g.zoneSave.asia.stations = g.zoneSave.asia.stations.filter(sv => sv.k !== 'tarang');
  assert.equal(g.moveZone('asia'), true);
  assert.equal(mine().length, 1);
});

test('เซฟเก่าที่ไม่มีตะรางและมีของวางบนแผนที่ → ได้ตะราง + ของเข้ากระเป๋า', () => {
  const saved = JSON.parse(JSON.stringify(createGame().snapshot()));
  saved.stations = saved.stations.filter(sv => sv.k !== 'tarang');
  saved.items = [{ k:'health', x:300, y:180 }, { k:'lotus', x:420, y:300 },
                 { k:'fire', x:600, y:300 }, { k:'tea', x:1007, y:347, from:'tarang' }];
  saved.mp = 3; saved.inventory = { food:2 };
  const g = createGame();
  assert.equal(g.restore(saved), true);
  assert.equal(g.stations.filter(st => st.def.k === 'tarang').length, 1);
  assert.deepEqual(g.items, []);
  assert.equal(g.inventory.health, 1);
  assert.equal(g.inventory.lotus, 1);
  assert.equal(g.inventory.tea, 1);
  assert.equal(g.inventory.food, 2);
  assert.ok(g.mp > 3);                                // ลูกไฟที่ค้างกลายเป็น MP ตามระบบ collectItem เดิม
  const again = createGame();                         // เซฟซ้ำไม่งอกของ/ตะรางเพิ่ม
  assert.equal(again.restore(JSON.parse(JSON.stringify(g.snapshot()))), true);
  assert.equal(again.stations.filter(st => st.def.k === 'tarang').length, 1);
  assert.deepEqual(again.items, []);
});

test('ไม่มีของโผล่บนแผนที่ แม้ MP หมดและมีเปรตบุก', () => {
  const g = createGame();
  g.mp = 0;
  g.mobs.push({ id:900, x:700, y:675, hp:MOB.hp, kind:0 });
  for (let i = 0; i < 120; i++) g.step();             // 120 วาระ (ผ่านรอบ tick%18 หลายครั้ง)
  g.spawnMob(); g.spawnMob();
  assert.deepEqual(g.items, []);
});

test('ปราบเปรตบนแผนที่ → ได้ของ 1 ชิ้นจากรายการ เข้ากระเป๋าตรง ๆ พร้อมแจ้งชื่อ', () => {
  const allowed = new Set(MOB.winLoot);
  assert.deepEqual([...allowed].sort(), ['ashStone', 'bladeShard', 'food', 'health', 'lotus', 'tea']);
  for (const k of allowed) assert.ok(ITEMS[k], `${k} exists in ITEMS`);   // ไม่สร้างไอเทมใหม่
  const seen = new Set();
  for (let i = 0; i < 80; i++) {
    const g = createGame();
    g.inventory = {};
    g.mobs.push({ id:900, x:700, y:675, hp:1, kind:0 });
    assert.equal(g.strike(0, 'ยักษ์ทวารบาล'), true);
    const got = Object.entries(g.inventory);
    assert.equal(got.length, 1);
    assert.equal(got[0][1], 1);
    assert.ok(allowed.has(got[0][0]));
    assert.deepEqual(g.items, []);
    assert.ok(g.logs.some(l => String(l.text).includes(ITEMS[got[0][0]].name)), 'log names the item');
    seen.add(got[0][0]);
  }
  assert.ok(seen.size >= 4, `random pool is used (${[...seen]})`);
});

test('ชนะฉากต่อสู้กับเปรต/วิญญาณขัดขืน → ได้ของ 1 ชิ้น · แพ้ไม่ได้', () => {
  const allowed = new Set(MOB.winLoot);
  const total = g => Object.values(g.inventory).reduce((a, b) => a + b, 0);
  // เปรต
  let g = createGame(); g.inventory = {};
  g.mobs.push({ id:900, x:700, y:675, hp:1, kind:0 });
  g.startMobBattle(0);
  g.battle.foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'win');
  assert.equal(total(g), 1);
  assert.ok(allowed.has(Object.keys(g.inventory)[0]));
  assert.ok(g.battle.log.at(-1).includes(ITEMS[Object.keys(g.inventory)[0]].name));
  // วิญญาณขัดขืน
  g = createGame(); g.inventory = {};
  const soul = { id:901, name:'วิญญาณทดสอบ', who:'วิญญาณทดสอบ', sp:1, deserved:3 };
  g.queue.push(soul); g.startBattle(soul);
  g.battle.foes[0].hp = 1;
  g.battleAct('atk');
  assert.equal(g.battle.over, 'win');
  assert.equal(total(g), 1);
  assert.ok(allowed.has(Object.keys(g.inventory)[0]));
  // แพ้
  g = createGame(); g.inventory = {};
  g.queue.push({ ...soul, id:902 }); g.startBattle(g.queue.at(-1));
  g.battle.youHp = 1;
  for (let i = 0; i < 40 && !g.battle.over; i++) g.battleAct('atk');
  if (g.battle.over === 'lose') assert.equal(total(g), 0);
});
