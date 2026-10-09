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

// ---------- รอบ 2: บอสได้ EXP ไม่ได้ winLoot · ชายแดนได้ winLoot ต่อศึก · พญายมไม่ทับยมบาท ----------
import { ZONE_EVENTS, FRONTIER } from '../src/data.js';

const total = g => Object.values(g.inventory).reduce((a, b) => a + b, 0);
/** ชนะฉากสู้ให้จบ: ข้ามระลอก ลดเลือดศัตรูทุกตัวเหลือ 1 แล้วฟาด */
function winBattle(g) {
  for (let i = 0; i < 80; i++) {
    if (!g.battle && g.devaVisits?.asia?.phase === 'descending') {
      g.finishDevaDescent(); g.completeStory(); return;
    }
    const B = g.battle;
    if (B.over) return;
    if (B.storyInterlude === 'west-hypnosis') { g.completeBattleInterlude(); continue; }
    if (B.pendingWave) { B.kind === 'frontierBreach' ? g.advanceFrontierBreachWave() : g.advanceZoneEventWave(g.zoneEventRestReady()); continue; }
    B.foes.forEach(f => { f.hp = Math.min(f.hp, 1); });
    if (!B.foes.find(f => f.id === B.selectedFoeId && f.hp > 0)) B.selectedFoeId = B.foes.find(f => f.hp > 0)?.id;
    B.youHp = 9999; B.youMax = 9999;
    g.battleAct('atk');
  }
}
const freshIn = zone => {
  const g = createGame();
  g.level = 5; g.hpMax = 9999; g.hp = 9999;
  g.inventory = {};
  if (zone !== 'th') { for (const z of ZONES) g.bossCleared[z.k] = true; g.moveZone(zone); g.inventory = {}; g.paused = false; }
  return g;
};

test('ศึกบอส/เทวดา/อีเวนต์ทุกตัวในเกม ให้ EXP จริงและไม่ได้ winLoot', () => {
  const seen = [];
  for (const zone of Object.keys(ZONE_EVENTS)) {
    for (const ev of ZONE_EVENTS[zone]) {
      if (!ev.foe && !ev.foes && !ev.waves) continue;
      if (ev.challenge) continue;   // G3b — ประลองชายแดน/อาวุธมีเทสต์ของตัวเอง (tests/g3b-frontier-challenge.test.mjs)
      const g = freshIn(zone);
      g.setFrontierTeam?.('taan');
      g.zoneEvents[zone] = g.zoneEvents[zone] || {};
      g.zoneEvents[zone][ev.k] = 'pending';
      let b;
      if (ev.k === 'prisonBreak') b = g.startPrisonBreak();
      else if (ev.k === 'devaTest') b = (g.zoneEvents.th.prisonBreak = 'cleared', g.startDevaTest());
      else if (ev.k === 'frontierBreach') b = (g.zoneEvents.th.devaTest = 'cleared', g.startFrontierBreach());
      else b = g.startZoneEvent(ev.k);
      assert.ok(b, `${zone}/${ev.k} starts`);
      const exp0 = g.exp, lvl0 = g.level;
      const itemsBefore = total(g);
      winBattle(g);
      assert.equal(b.over, 'win', `${zone}/${ev.k} won`);
      assert.ok(g.exp > exp0 || g.level > lvl0, `${zone}/${ev.k} gives EXP`);
      const frontierWave = ev.team === 'frontier';
      if (!frontierWave) assert.ok(!b.loot, `${zone}/${ev.k}: no winLoot`);
      seen.push(`${zone}/${ev.k}`);
    }
  }
  assert.ok(seen.length === 13, seen.join());
});

test('บอสโซน (zoneBoss) ได้ EXP 100 ไม่ได้ winLoot', () => {
  const g = freshIn('asia');
  g.zoneCases.asia = 10;
  g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'cleared' };
  g.bossCleared.asia = false;
  assert.ok(g.startZoneBoss());
  const exp0 = g.exp, lvl0 = g.level;
  winBattle(g);
  assert.equal(g.battle.over, 'win');
  assert.ok(g.exp > exp0 || g.level > lvl0);
  assert.equal(total(g), 0);
  assert.ok(!g.battle.loot);
});

test('ชายแดน: ชนะกิจกรรมอิสระได้ winLoot เพิ่ม 1 ชิ้นจากตาราง 6 อย่าง', () => {
  const allowed = new Set(MOB.winLoot);
  const g = freshIn('th');
  g.setFrontierTeam('taan');
  assert.ok(g.startFrontierBattle());
  winBattle(g);
  assert.equal(g.battle.over, 'win');
  const reward = g.battle.reward.item;
  assert.ok(FRONTIER.drops.includes(reward));
  assert.equal(total(g), 2);                       // รางวัลชายแดนเดิม 1 + winLoot 1
  assert.ok(g.battle.loot.includes(' · '));
  const names = Object.keys(g.inventory);
  assert.ok(names.every(k => allowed.has(k) || k === reward));
});

test('ชายแดน: ศึก event หลายระลอกได้ winLoot ครั้งเดียวต่อศึก (th breach + โซน 2–4)', () => {
  const allowed = new Set(MOB.winLoot);
  // th frontierBreach: รางวัลเดิม FRONTIER.drops ×1 + winLoot 1
  let g = freshIn('th');
  g.setFrontierTeam('taan');
  g.zoneEvents.th = { frontierBreach:'pending', devaTest:'cleared' };
  assert.ok(g.startFrontierBreach());
  winBattle(g);
  assert.equal(g.battle.over, 'win');
  assert.equal(total(g), 1 + 1);
  assert.ok(g.battle.loot);
  // zoneEvent team:'frontier' โซน 2–4 ไม่มีรางวัลเป็นของ → ได้ winLoot 1 ชิ้นพอดี แม้มี 3–4 ระลอก
  for (const [zone, key] of [['asia', 'asiaRageBreach'], ['west', 'westVampireBreach'], ['cyberhell', 'cyberBreach']]) {
    g = freshIn(zone);
    g.setFrontierTeam('taan');
    g.zoneEvents[zone][key] = 'pending';
    const ev = ZONE_EVENTS[zone].find(e => e.k === key);
    assert.ok(g.startZoneEvent(key), key);
    winBattle(g);
    assert.equal(g.battle.over, 'win', key);
    const extra = ev.reward.item ? 1 : 0;           // cyberBreach ให้ spareHeart เป็นรางวัลของมัน
    assert.equal(total(g), 1 + extra, `${key}: one winLoot for the whole battle`);
    const loot = Object.keys(g.inventory).filter(k => k !== ev.reward.item);
    assert.ok(loot.length === 1 || (loot.length === 0 && allowed.has(ev.reward.item)), key);
  }
});

test('ดอกบัวมีขายที่พ่อค้านรกอยู่แล้ว (65 เบี้ย) และซื้อได้', async () => {
  const { MERCHANT } = await import('../src/data.js');
  const row = MERCHANT.stock.find(x => x.k === 'lotus');
  assert.ok(row && row.cost === 65 && row.lv === 1);
  const g = createGame(); g.coin = 100; g.inventory = {};
  assert.equal(g.buyMerchant('lotus'), true);
  assert.equal(g.inventory.lotus, 1);
  assert.equal(g.coin, 35);
});

test('พญายมโผล่บนเก้าอี้ — ยมบาทที่ยืนทับถอยไปข้างแท่น ไม่ทับกัน และถอยครั้งเดียวต่อการปรากฏ', () => withImageCanvas(() => {
  for (const z of ZONES) {
    const g = createGame();
    g.zone = z.k; syncSceneZone(z.k); resetWalk(); g.syncBlocks(true);
    const bg = image(z.scene);
    assert.equal(buildWalk(bg, z.k === 'west' ? image('scene-v2-opt') : bg), true);
    g.mobs = [];
    const T = SPOTS.throne;
    for (const start of [[880, 455], [820, 455], [836, 470]]) {
      g.player.x = start[0]; g.player.y = start[1]; g.player.path = null; g.player.tx = null;
      g.bossUntil = performance.now() + 7000; g.bossDodged = null;
      for (let i = 0; i < 400; i++) g.stepWorld(16);
      const d = Math.hypot(g.player.x - T.x, (g.player.y - T.y) * 1.6);
      assert.ok(d >= 90, `${z.k}: from ${start} stands clear of the throne (d=${d.toFixed(0)})`);
      assert.equal(canWalk(g.player.x, g.player.y), true);
    }
    // ยืนไกลอยู่แล้ว → ไม่ถูกลากไปไหน
    g.player.x = 400; g.player.y = 600; g.player.path = null;
    g.bossUntil = performance.now() + 7000; g.bossDodged = null;
    g.stepWorld(16);
    assert.deepEqual([g.player.x, g.player.y, g.player.path], [400, 600, null]);
    // เดินกลับมาทับเองระหว่างพญายมยังอยู่ → ไม่ถูกฉุดซ้ำ
    g.player.x = T.x; g.player.y = T.y; g.player.path = null;
    g.stepWorld(16);
    assert.equal(g.player.path, null);
  }
}));
