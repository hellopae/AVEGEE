// ชุด 28B คุณเป้ 2 ต.ค. 2569 — ศัตรูเก่งขึ้นตามโซน · บอสอึดขึ้น · น้ำมนต์เติม MP · สรุปรางวัลหลังชนะ
import test from 'node:test';
import assert from 'node:assert/strict';
import { merchantStock } from '../src/progression.js';
import { createGame } from '../src/game.js';
import { BATTLE, FOE_SCALE, ITEMS, LEVELS, MERCHANT, MOB, ZONE_EVENTS, scaleFoeAtk, scaleFoeHp } from '../src/data.js';

globalThis.Image ??= class {};

// ---------------------------------------------------------------- ค่าเดิมก่อน 28B (f075d79) — ใช้เทียบ "ก่อน/หลัง"
const BEFORE = {
  boss: { // ชื่อ → HP เดิม
    'th breach boss': 90, 'th deva': 100, 'th border boss': 155,
    'asia deva': 130, 'asia rage boss': 125, 'west vampire': 150, 'west deva': 165,
    'cyber guard (x2 each)': 105, 'cyber general': 180,
    'final: father': 145, 'final: asia head': 160, 'final: west head': 175, 'final: cyber head': 190, 'final: cyber inspector': 220,
  },
};

const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function withSeed(seed, fn) {
  const real = Math.random;
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = real; }
}

// ---------------------------------------------------------------- 1. ตัวคูณอยู่ที่เดียว และเรียงโซน 2 < 3 < 4
test('FOE_SCALE: โซน 1 = ค่าเดิม · โซน 2 < 3 < 4 ทั้ง HP และ ATK ของศัตรูทั่วไป (ชุด 28E: อีเวนต์คูณ HP แล้ว)', () => {
  const Z = ['th', 'asia', 'west', 'cyberhell'];
  for (const kind of ['roam', 'event']) {
    assert.equal(FOE_SCALE[kind].th.atk, 1, `${kind} th atk`);
    assert.equal(FOE_SCALE[kind].th.hp, 1, `${kind} th hp`);
    for (let i = 1; i < Z.length; i++) assert.ok(FOE_SCALE[kind][Z[i]].hp > FOE_SCALE[kind][Z[i - 1]].hp, `${kind} hp ${Z[i]}`);
    for (let i = 1; i < Z.length; i++)
      assert.ok(FOE_SCALE[kind][Z[i]].atk > FOE_SCALE[kind][Z[i - 1]].atk, `${kind} atk ${Z[i]}`);
  }
  assert.equal(FOE_SCALE.roam.th.hp, 1);
  for (let i = 1; i < Z.length; i++) assert.ok(FOE_SCALE.roam[Z[i]].hp > FOE_SCALE.roam[Z[i - 1]].hp, `roam hp ${Z[i]}`);
  // ค่า HP ของอีเวนต์ตั้งโดยอิงอัตราชนะจำลองด้านล่าง (28E) — เปลี่ยนเมื่อไหร่ต้องดูผลจำลองด้วย
  assert.equal(scaleFoeHp('th', 60, 'event'), 60);
  for (let i = 1; i < Z.length; i++) assert.ok(scaleFoeHp(Z[i], 60, 'event') > scaleFoeHp(Z[i - 1], 60, 'event'), `event hp ${Z[i]}`);
  assert.equal(FOE_SCALE.boss.hp > 1, true);
  assert.deepEqual(scaleFoeAtk('cyberhell', [10, 16], 'boss'), [10, 16], 'ATK บอสคงเดิม');
});

test('ศัตรูที่สร้างจริงใช้ตัวคูณโซน: ผีบนแผนที่ · ชายแดน · วิญญาณขัดขืน โซน 2 < 3 < 4', () => {
  const mob = z => { const g = createGame(); g.zone = z; g.mobs.push({ id:1, kind:0 }); const b = g.startMobBattle(0); return b.foes[0]; };
  const soul = z => { const g = createGame(); g.zone = z; const b = g.startBattle({ id:9, who:'x', deserved:4, resist:true }); return b.foes[0]; };
  const front = z => { const g = createGame(); g.zone = z; g.setFrontierTeam('taan'); const b = g.startFrontierBattle({ kindIdx:0, id:1, level:3 }); return b.foes[0]; };
  for (const [name, f] of [['mob', mob], ['soul', soul], ['frontier', front]]) {
    const r = ['th', 'asia', 'west', 'cyberhell'].map(f);
    for (let i = 1; i < r.length; i++) {
      assert.ok(r[i].hp > r[i - 1].hp, `${name} hp โซน ${i + 1}`);
      assert.ok(r[i].atk[1] > r[i - 1].atk[1], `${name} atk โซน ${i + 1}`);
    }
  }
  // โซน 1 เท่าเดิมเป๊ะ
  assert.equal(mob('th').hp, MOB.fightHp);
  assert.deepEqual(mob('th').atk, MOB.fightAtk);
  assert.deepEqual(soul('th').atk, BATTLE.foeAtk);
});

test('บอสทุกตัว HP มากกว่าเดิม · ศัตรูธรรมดาในอีเวนต์ HP ตามตัวคูณโซน', () => {
  const g = createGame();
  g.zone = 'cyberhell'; g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared' };
  g.refreshZoneEvents();
  g.startZoneEvent('cyberFinal');
  const ev = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal');
  const seen = [];
  for (let wave = 1; wave <= 8; wave++) {
    g.battle.foes.forEach((f, i) => {
      const base = ev.waves[wave - 1][0].hp;
      if (f.boss) { assert.ok(f.maxHp > base, `${f.who} บอสต้องอึดขึ้น`); assert.equal(f.maxHp, scaleFoeHp('cyberhell', base, 'boss')); }
      else { assert.equal(f.maxHp, scaleFoeHp('cyberhell', base, 'event'), `${f.who} ศัตรูธรรมดา`); assert.ok(f.maxHp > base); }
      seen.push(f.boss);
    });
    g.battle.foes.forEach(f => { f.hp = 0; });
    if (wave < 8) { g.battle.pendingWave = wave + 1; g.advanceZoneEventWave(true); }
  }
  assert.equal(seen.filter(Boolean).length, 5, 'ศึกสุดท้ายมีบอส 5 ตัว');
  // บอสโซน (ชนะแล้วเปิดโซนถัดไป) และเทวดา/บอสชายแดน/พี่ใหญ่โซน 1
  for (const [zone, n] of [['asia', 1], ['west', 2]]) {
    const gg = createGame(); gg.zone = zone; gg.zoneCases[zone] = 10;
    gg.zoneEvents[zone] = Object.fromEntries(ZONE_EVENTS[zone].map(e => [e.k, 'cleared']));
    const b = gg.startZoneBoss();
    assert.equal(b.foes[0].maxHp, scaleFoeHp(zone, 200 + n * 35, 'boss'));
    assert.ok(b.foes[0].maxHp > 200 + n * 35);
    assert.equal(b.foes[1].maxHp, 48 + n * 8, 'ลูกน้องบอสโซนคงเดิม (ไม่ผ่าน zoneEventFoes)');
    assert.ok(b.foes[1].atk[1] > 12 + n, 'ลูกน้องบอสคูณ ATK ตามโซน');
  }
  const th = createGame();
  th.zoneCases.th = 10; th.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'pending' };
  assert.equal(th.startZoneEvent('thBorderBoss').foes[0].maxHp, scaleFoeHp('th', 155, 'boss'));
  assert.ok(scaleFoeHp('th', 155, 'boss') > 155);
  for (const [name, hp] of Object.entries(BEFORE.boss)) assert.ok(scaleFoeHp('th', hp, 'boss') > hp, name);
});

// ---------------------------------------------------------------- 2. ยังชนะได้ — จำลองผู้เล่นด้วยบอทกลยุทธ์เดียว (ลูกไฟตอนมี MP · ยมทูต/ตีธรรมดาตอนหมด · กินยาเมื่อเลือดต่ำ)
const ABIL = ['bigFire', 'flameCharge', 'windFan', 'rage', 'ice', 'hypno', 'valkyrieSpear', 'cooldownClock'];
function setup(zone, level, abilityCount, chests) {
  const g = createGame();
  g.level = level; const L = LEVELS[level - 1];
  g.hpMax = g.hp = L.hpMax; g.mpMax = g.mp = L.mpMax;
  ABIL.slice(0, abilityCount).forEach(k => { g.abilities[k] = true; });
  g.zone = zone; g.inventory.health = chests; g.inventory.holyWater = 3; g.coin = 400;   // สมมติฐาน 28E: พกน้ำมนต์ 3 ขวด
  for (const k of ['taan', 'plerng']) if (!g.crew.some(c => c.k === k)) g.hire(k);
  for (const c of g.crew) if (!c.reader) { c.homeZone=zone; c.id=`${zone}:${c.k}`; }
  g.party.members = ['taan', 'plerng'];
  return g;
}
let turnNo = 0;
function botTurn(g) {
  const b = g.battle; turnNo++;
  const low = b.youHp <= b.youMax * 0.45;
  if (turnNo % 15 === 1) for (const c of g.crewHelpers()) c.helpReadyAt = 0;
  if (low && g.battleAct('crew:boon')) return true;
  if (low && (g.inventory.health || 0) > 0) return g.battleAct('health');
  // ชุด 28E: MP หมด + มีน้ำมนต์ → ดื่ม (เสียเทิร์น) แล้วลูกไฟต่อ
  if (g.mp < BATTLE.mpCost.fire && (g.inventory.holyWater || 0) > 0 && g.battleAct('holyWater')) return true;
  if (g.mp >= BATTLE.mpCost.fire) return g.battleAct('fire');
  for (const c of g.crewHelpers()) if (['taan', 'plerng', 'dam'].includes(c.k) && !g.crewHelpWhy(c) && g.battleAct('crew:' + c.k)) return true;
  return g.battleAct('atk');
}
/** จุดพักศึกสุดท้าย: ซื้อน้ำมนต์/หีบยาจากพ่อค้าด้วยเบี้ยกรรม 400 แล้วใช้ผ่าน useHolyWater/useBossMedicine จริง */
function rest(g) {
  g.coin = 400;
  const stock = merchantStock(g.zone);
  const water = stock.find(s => s.k.startsWith('holyWater'));
  const health = stock.find(s => s.k.startsWith('health'));
  for (let i = 0; i < 12; i++) {
    if (g.mpMax - g.mp >= 20 && g.coin >= water.cost && g.buyMerchant(water.k) && g.useHolyWater(water.k)) continue;
    if (g.battle.youMax - g.battle.youHp >= 30 && g.coin >= health.cost && g.buyMerchant(health.k) && g.useBossMedicine(health.k)) continue;
    break;
  }
}
function fight(g) {
  for (let guard = 0; g.battle && !g.battle.over && guard < 800; guard++) {
    if (g.battle.pendingWave) {
      if (g.zoneEventRestReady()) { rest(g); if (!g.advanceZoneEventWave(true)) return false; }
      else if (g.battle.kind === 'frontierBreach') { if (!g.advanceFrontierBreachWave()) return false; }
      else if (!g.advanceZoneEventWave()) return false;
      continue;
    }
    if (!botTurn(g) && !g.battleAct('atk')) return false;
  }
  return g.battle?.over === 'win';
}
const SCEN = [
  ['th prisonBreak', 'th', 1, 0, 2, g => { g.zoneCases.th = 3; g.zoneEvents.th = { prisonBreak:'pending' }; return g.startPrisonBreak(); }],
  ['th devaTest', 'th', 1, 0, 2, g => { g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'pending' }; return g.startDevaTest(); }],
  ['th frontierBreach', 'th', 2, 0, 2, g => { g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'pending' }; g.setFrontierTeam('taan'); return g.startFrontierBreach(); }],
  ['th borderBoss', 'th', 2, 1, 2, g => { g.zoneCases.th = 10; g.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'pending' }; return g.startZoneEvent('thBorderBoss'); }],
  ['asia rageBreach', 'asia', 3, 3, 3, g => { g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'pending' }; return g.startZoneEvent('asiaRageBreach'); }],
  ['asia zoneBoss', 'asia', 3, 3, 3, g => { g.zoneCases.asia = 10; g.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'cleared' }; const b = g.startZoneBoss(); g.startBossFight(); return b; }],
  ['west vampireBreach', 'west', 4, 4, 3, g => { g.zoneCases.west = 3; g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'pending' }; return g.startZoneEvent('westVampireBreach'); }],
  ['west devaTest', 'west', 4, 5, 3, g => { g.zoneCases.west = 7; g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'pending' }; return g.startZoneEvent('westDevaTest'); }],
  ['west zoneBoss', 'west', 4, 6, 3, g => { g.zoneCases.west = 10; g.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'cleared' }; const b = g.startZoneBoss(); g.startBossFight(); return b; }],
  ['cyber rescue', 'cyberhell', 5, 7, 3, g => { g.zoneEvents.cyberhell = { cyberRescue:'pending' }; return g.startZoneEvent('cyberRescue'); }],
  ['cyber breach', 'cyberhell', 5, 8, 3, g => { g.zoneCases.cyberhell = 5; g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'pending' }; return g.startZoneEvent('cyberBreach'); }],
];
function winRate([name, zone, level, ab, chests, start], runs, seed) {
  return withSeed(seed, () => {
    let wins = 0;
    for (let i = 0; i < runs; i++) {
      const g = setup(zone, level, ab, chests);
      assert.ok(start(g), `${name} start`);
      if (fight(g)) wins++;
    }
    return wins / runs;
  });
}

test('ยังชนะได้: อีเวนต์/บอสโซน โซน 1–3 ชนะ ≥ 90% · โซน 4 (ฝ่าชายแดน 4 ระลอก) อยู่ในช่วง 70–90% (เป้า 28E ≈ 75–85%)', () => {
  for (const sc of SCEN.filter(x => !x[0].startsWith('cyber breach'))) {
    const rate = winRate(sc, 20, 28);
    if (process.env.BAL_VERBOSE) console.log(sc[0].padEnd(20), rate);
    assert.ok(rate >= 0.9, `${sc[0]} win rate`);
  }
  const breach = winRate(SCEN.find(x => x[0] === 'cyber breach'), 100, 28);
  if (process.env.BAL_VERBOSE) console.log('cyber breach'.padEnd(20), breach);
  assert.ok(breach >= 0.7 && breach <= 0.9, `cyber breach win rate ${breach}`);
});

test('ศึกสุดท้าย 8 ระลอก: เลเวล 5 เตรียมหีบยา 5 + ซื้อน้ำมนต์/ยาที่จุดพัก ชนะ 70–90% (ก่อน 28B ≈ 98%)', () => {
  const sc = ['cyber FINAL', 'cyberhell', 5, 8, 5, g => {
    g.zoneCases.cyberhell = 10; g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', cyberFinal:'pending' };
    return g.startZoneEvent('cyberFinal');
  }];
  const rate = winRate(sc, 100, 28);
  if (process.env.BAL_VERBOSE) console.log('final gauntlet win rate', rate);
  assert.ok(rate >= 0.7 && rate <= 0.9, `final gauntlet win rate ${rate}`);   // เป้า 28E ≈ 70–85%
  // และต้องยังเป็นศึกที่ "ตอบสนองต่อการเตรียมตัว" — ไม่มีหีบยาเลยแพ้แน่ (กันตัวเลขหลวมจนเดินผ่านฟรี)
  const poor = ['cyber FINAL (no chests)', 'cyberhell', 5, 8, 0, sc[5]];
  assert.ok(winRate(poor, 30, 28) < rate, 'เตรียมตัวน้อยกว่าต้องชนะน้อยกว่า');
});

// ---------------------------------------------------------------- 3. น้ำมนต์
test('น้ำมนต์: พ่อค้านรกขาย · ราคา/ปริมาณสมเหตุสมผลเทียบหีบยา · ใช้เติม MP ได้จริงจากกระเป๋า', () => {
  const stock = MERCHANT.stock.find(s => s.k === 'holyWater');
  assert.ok(stock, 'อยู่ในสต็อกพ่อค้า');
  const health = MERCHANT.stock.find(s => s.k === 'health');
  assert.equal(ITEMS.holyWater.mp, 30);
  assert.ok(ITEMS.holyWater.mp < LEVELS[0].mpMax, 'ไม่เติมเต็มหลอด MP ขั้นแรกในขวดเดียว');
  assert.ok(stock.cost / ITEMS.holyWater.mp <= health.cost / ITEMS.health.hp * 1.25, 'ต่อหน่วยไม่แพงกว่ายาเกินสมควร');
  assert.equal(ITEMS.holyWater.glyph, '', 'ห้ามใช้อีโมจิแทนภาพ');
  assert.ok(ITEMS.holyWater.img && ITEMS.holyWater.placeholder);

  const g = createGame();
  g.coin = stock.cost - 1;
  assert.equal(g.buyMerchant('holyWater'), false, 'เงินไม่พอ');
  g.coin = stock.cost;
  assert.equal(g.buyMerchant('holyWater'), true);
  assert.equal(g.coin, 0);
  assert.equal(g.inventory.holyWater, 1);
  g.mp = g.mpMax;
  assert.equal(g.useBag('holyWater'), false, 'MP เต็มแล้วไม่กินของ');
  assert.equal(g.inventory.holyWater, 1);
  g.mp = 5;
  assert.equal(g.useBag('holyWater'), true);
  assert.equal(g.mp, 35);
  assert.equal(g.inventory.holyWater, undefined);
  g.mp = g.mpMax - 4; g.inventory.holyWater = 1;
  g.useBag('holyWater');
  assert.equal(g.mp, g.mpMax, 'ไม่ล้นหลอด');
});

test('น้ำมนต์: ดื่มได้ที่จุดพักศึกสุดท้ายและเตรียมศึกบอส แต่ไม่ใช่กลางศึก', () => {
  const g = createGame();
  g.zone = 'cyberhell'; g.zoneCases.cyberhell = 10;
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared' };
  g.refreshZoneEvents(); g.startZoneEvent('cyberFinal');
  g.inventory.holyWater = 2; g.mp = 10;
  assert.equal(g.useHolyWater(), false, 'กลางศึก (ไม่ใช่จุดพัก) ใช้ไม่ได้');
  for (let wave = 1; wave <= 3; wave++) {
    g.battle.foes.forEach(f => { f.hp = 0; });
    if (wave < 3) { g.battle.pendingWave = wave + 1; g.advanceZoneEventWave(); }
  }
  g.battle.pendingWave = 4;
  assert.equal(g.zoneEventRestReady(), true);
  assert.equal(g.useHolyWater(), true);
  assert.equal(g.mp, 40);
  assert.equal(g.inventory.holyWater, 1);
  g.mp = g.mpMax;
  assert.equal(g.useHolyWater(), false, 'MP เต็มแล้ว');

  const b = createGame(); b.zone = 'asia'; b.zoneCases.asia = 10;
  b.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'cleared' };
  b.startZoneBoss(); b.inventory.holyWater = 1; b.mp = 0;
  assert.equal(b.useHolyWater(), true, 'เตรียมศึกบอสโซน');
  assert.equal(b.mp, 30);
  b.startBossFight();
  b.inventory.holyWater = 1; b.mp = 0;
  assert.equal(b.useHolyWater(), false, 'เริ่มสู้แล้วใช้ไม่ได้');
});

// ---------------------------------------------------------------- 4. สรุปรางวัลหลังชนะ
const finish = g => { for (let i = 0; i < 60 && g.battle && !g.battle.over; i++) { g.battle.foes.forEach(f => { f.hp = 1; }); g.battleAct('atk'); g.battle.foes.forEach(f => { if (f.hp > 0) f.hp = 1; }); } };

test('สรุปรางวัล: ชนะผีบนแผนที่ → เบี้ยกรรม · EXP · ของที่ตก ตรงกับที่ได้จริง', () => {
  const g = createGame();
  g.mobs.push({ id:5, kind:0 });
  g.startMobBattle(0);
  const coin = g.coin, exp = g.exp;
  const inv = { ...g.inventory };
  g.battle.foes.forEach(f => { f.hp = 1; });
  assert.equal(g.battleAct('atk'), true);
  assert.equal(g.battle.over, 'win');
  const s = g.battle.summary;
  assert.equal(s.coin, g.coin - coin);
  assert.equal(s.coin, Math.round(MOB.bounty * MOB.fightWin));
  assert.equal(s.exp, 20);
  assert.equal(g.exp - exp, 20);
  const got = Object.keys(g.inventory).filter(k => g.inventory[k] > (inv[k] || 0));
  assert.deepEqual(s.items.map(i => i.k), got);
  assert.equal(s.items.length, 1);
  assert.equal(g.pendingReward, null, 'ยังไม่ปิดฉาก — ยังไม่เด้ง');
  g.endBattle();
  assert.deepEqual(g.pendingReward, s);
});

test('สรุปรางวัล: แพ้ไม่มี · วิญญาณขัดขืนในห้องไต่สวนไม่เด้ง · บอสที่ปลดพลังใหม่มีพลังในสรุป และคิวเรื่องราวพลังเดิมยังอยู่ (ui เรียงต่อกัน)', () => {
  const lose = createGame();
  lose.mobs.push({ id:1, kind:0 }); lose.startMobBattle(0);
  lose.battle.youHp = 1;
  while (!lose.battle.over) lose.battleAct('atk');
  assert.equal(lose.battle.over, 'lose');
  assert.equal(lose.battle.summary, undefined);
  lose.endBattle();
  assert.equal(lose.pendingReward, null);

  const soul = createGame();
  soul.startBattle({ id:3, who:'x', deserved:3, resist:true });
  soul.battle.foes.forEach(f => { f.hp = 1; });
  soul.battleAct('atk');
  assert.equal(soul.battle.over, 'win');
  soul.endBattle();
  assert.equal(soul.pendingReward, null);

  const boss = createGame();
  boss.zoneCases.th = 10;
  boss.zoneEvents.th = { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'pending' };
  boss.startZoneEvent('thBorderBoss');
  finish(boss);
  assert.equal(boss.battle.over, 'win');
  boss.endBattle();
  const r = boss.pendingReward;
  assert.ok(r.coin >= 160, 'เบี้ยกรรมรางวัลอีเวนต์');
  assert.deepEqual(r.abilities, ['flameCharge']);
  assert.equal(r.exp, 60);
  assert.ok(boss.storyQueue.some(p => p.key === 'th' && p.reward === 'flameCharge'), 'คิวเรื่องราว+พลังเดิมของ 28-0 ไม่ถูกแทนที่');
});

test('สรุปรางวัล: ศึกหลายระลอกสรุปครั้งเดียวตอนจบศึก · ของจากรางวัลอีเวนต์ (หัวใจสำรอง) อยู่ในสรุป', () => {
  const g = createGame();
  g.zone = 'cyberhell'; g.zoneCases.cyberhell = 5;
  g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'pending' };
  g.startZoneEvent('cyberBreach');
  for (let w = 1; w <= 4; w++) {
    assert.equal(g.battle.summary, undefined, `ระลอก ${w} ยังไม่สรุป`);
    g.battle.foes.forEach(f => { f.hp = 1; });
    while (g.battle.foes.some(f => f.hp > 0)) { g.battle.selectedFoeId = g.battle.foes.find(f => f.hp > 0).id; g.battleAct('atk'); }
    if (w < 4) assert.equal(g.advanceZoneEventWave(), true);
  }
  assert.equal(g.battle.over, 'win');
  const items = Object.fromEntries(g.battle.summary.items.map(i => [i.k, i.n]));
  assert.equal(items.spareHeart, 1);
  assert.equal(g.battle.summary.coin, 200);
});

// ---------------------------------------------------------------- 5. ข้อความใหม่ผ่าน i18n มีไทย+อังกฤษคู่
globalThis.document ??= { documentElement:{} };
const { t, setLang, englishKeys } = await import('../src/i18n.js');
test('ข้อความหน้าต่างรางวัล/น้ำมนต์/ชื่อพลังมีทั้งไทยและอังกฤษ', () => {
  const keys = ['item.holyWater', 'item.mpGain', 'bag.mpFull', 'prep.water', 'prep.water.none',
    'reward.title', 'reward.coin', 'reward.exp', 'reward.power', 'reward.noDrop', 'reward.claim',
    ...ABIL.map(k => 'power.' + k)];
  const en = new Set(englishKeys());
  for (const k of keys) assert.ok(en.has(k), `ไม่มีอังกฤษ: ${k}`);
  for (const lang of ['th', 'en']) {
    setLang(lang);
    for (const k of keys) assert.notEqual(t(k), k, `${lang}:${k}`);
  }
  setLang('th');
  assert.notEqual(t('item.holyWater'), (setLang('en'), t('item.holyWater')));
  setLang('th');
  assert.equal(ITEMS.holyWater.nameKey, 'item.holyWater');
});

// ---------------------------------------------------------------- 6. ชุด 28E — น้ำมนต์กลางศึก + วิญญาณขัดขืนไม่มีหน้าต่างรางวัล
function drinkChecks(g, label) {
  const b = g.battle;
  assert.ok(b && !b.over, `${label}: ต้องอยู่ในศึก`);
  // ไม่มีของ → กดไม่ได้ ไม่เสียเทิร์น
  g.inventory.holyWater = 0; g.mp = 5;
  const turn = b.turn;
  assert.equal(g.battleAct('holyWater'), false, `${label}: ไม่มีน้ำมนต์`);
  assert.equal(b.turn, turn);
  // MP เต็ม → กดไม่ได้ ไม่กินของ
  g.inventory.holyWater = 2; g.mp = g.mpMax;
  assert.equal(g.battleAct('holyWater'), false, `${label}: MP เต็ม`);
  assert.equal(g.inventory.holyWater, 2);
  assert.equal(b.turn, turn);
  // ดื่มได้ MP +30 ของลด 1 และ "เสียเทิร์น" (ศัตรูสวนกลับ) เหมือนน้ำชา/หีบยา
  g.mp = 5; const hp = b.youHp;
  assert.equal(g.battleAct('holyWater'), true, `${label}: ดื่ม`);
  assert.equal(g.mp, 5 + ITEMS.holyWater.mp, `${label}: MP`);
  assert.equal(g.inventory.holyWater, 1, `${label}: ของลด`);
  assert.equal(b.turn, turn + 1, `${label}: เสียเทิร์น`);
  assert.ok(b.youHp < hp || b.dmg.you === 0, `${label}: ศัตรูสวนกลับ`);
  assert.equal(b.dmg.foe, 0, `${label}: ไม่ทำดาเมจใส่ศัตรู`);
  // ไม่ล้นหลอด MP
  g.mp = g.mpMax - 4;
  assert.equal(g.battleAct('holyWater'), true);
  assert.equal(g.mp, g.mpMax, `${label}: ไม่ล้นหลอด`);
  assert.equal(g.inventory.holyWater, undefined);
}
test('น้ำมนต์ดื่มได้กลางศึกทุกประเภท: ผีบนแผนที่ · ชายแดน · อีเวนต์หลายระลอก · บอสโซน · ศึกสุดท้าย · วิญญาณขัดขืน', () => {
  const huge = g => { g.battle.foes.forEach(f => { f.hp = f.maxHp = 9999; }); g.battle.youHp = g.battle.youMax = 9999; };
  const mob = createGame(); mob.mobs.push({ id:1, kind:0 }); mob.startMobBattle(0); huge(mob);
  drinkChecks(mob, 'mob');
  const fr = createGame(); fr.setFrontierTeam('taan'); fr.startFrontierBattle({ kindIdx:0, id:1, level:1 }); huge(fr);
  drinkChecks(fr, 'frontier');
  const ev = createGame(); ev.zone = 'asia'; ev.zoneEvents.asia = { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'pending' }; ev.zoneCases.asia = 6;
  ev.startZoneEvent('asiaRageBreach'); huge(ev);
  drinkChecks(ev, 'zoneEvent wave 1');
  const bs = createGame(); bs.zone = 'west'; bs.zoneCases.west = 10;
  bs.zoneEvents.west = { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'cleared' };
  bs.startZoneBoss(); bs.startBossFight(); huge(bs);
  drinkChecks(bs, 'zoneBoss');
  const fin = createGame(); fin.zone = 'cyberhell'; fin.zoneCases.cyberhell = 10;
  fin.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', cyberFinal:'pending' };
  fin.startZoneEvent('cyberFinal'); huge(fin);
  drinkChecks(fin, 'cyberFinal');
  const soul = createGame(); soul.startBattle({ id:3, who:'x', deserved:3, resist:true }); huge(soul);
  drinkChecks(soul, 'soul');
});

test('น้ำมนต์ในวงคำสั่งต่อสู้: มีใน BATTLE.items · ไม่มีอีโมจิ · ค่า MP อ่านจาก ITEMS ที่เดียว', () => {
  const it = BATTLE.items.find(x => x.k === 'holyWater');
  assert.ok(it);
  assert.equal(it.glyph, '');
  assert.equal(it.nameKey, ITEMS.holyWater.nameKey);
  assert.equal(it.heal, undefined);
  assert.equal(it.dmg, undefined);
});

test('วิญญาณขัดขืนบนแท่นไต่สวน: ชนะแล้วไม่มีสรุปรางวัล และไม่เด้งหน้าต่างรางวัล (คงเดิมตามคุณเป้ 28E)', () => {
  const g = createGame();
  g.startBattle({ id:3, who:'x', deserved:3, resist:true });
  g.battle.foes.forEach(f => { f.hp = 1; });
  g.battleAct('atk');
  assert.equal(g.battle.over, 'win');
  assert.equal(g.battle.summary, undefined);
  g.endBattle();
  assert.equal(g.pendingReward, null);
});
