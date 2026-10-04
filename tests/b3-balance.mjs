// Reproduce the balance28b bot and seed against a supplied checkout (read only).
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
const root = process.argv[2] || process.cwd();
const { createGame } = await import(pathToFileURL(root + '/src/game.js'));
const { BATTLE, LEVELS, ZONE_EVENTS, MERCHANT, MERCHANT_STOCK_BY_ZONE } = await import(pathToFileURL(root + '/src/data.js'));
globalThis.Image ??= class {};
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function withSeed(seed, fn) {
  const real = Math.random;
  Math.random = seeded(seed);
  try { return fn(); } finally { Math.random = real; }
}

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
  const stock = MERCHANT_STOCK_BY_ZONE?.[g.zone] || MERCHANT.stock;
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


SCEN.push(['cyber FINAL', 'cyberhell', 5, 8, 5, g => {
 g.zoneCases.cyberhell = 10;
 g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', cyberFinal:'pending' };
 return g.startZoneEvent('cyberFinal');
}]);
const results = SCEN.map(([name, zone, level, ab, chests, start]) => withSeed(28, () => {
 let wins = 0, turns = 0;
 for (let i=0; i<100; i++) {
  const g = setup(zone, level, ab, chests); assert.ok(start(g));
  const before = turnNo;
  if (fight(g)) { wins++; turns += turnNo - before; }
 }
 return { name, runs:100, wins, meanWinningTurns:wins ? +(turns/wins).toFixed(2) : null };
}));
console.log(JSON.stringify(results, null, 2));
