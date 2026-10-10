// G4 balance simulation — same bot as tests/balance28b.test.mjs, with Large medkit / Large holy water.
// Usage: node scripts/sim-g4.mjs [runs] ; env G4_LARGE=none|count|coin  G4_ATK=<multiplier on cyberBreach+cyberFinal atk>
//   none  = only normal medkits/holy water (G1 situation)
//   count = same number of medkits as the normal scenario, all Large (strongest supply)
//   coin  = same coin budget spent on Large (count x normal price / Large price, rounded)
import { createGame } from '../src/game.js';
import { merchantStock } from '../src/progression.js';
import { BATTLE, LEVELS, ZONE_EVENTS } from '../src/data.js';
globalThis.Image ??= class {};
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
function withSeed(seed, fn) { const real = Math.random; Math.random = seeded(seed); try { return fn(); } finally { Math.random = real; } }
const ABIL = ['bigFire', 'flameCharge', 'windFan', 'rage', 'ice', 'hypno', 'valkyrieSpear', 'cooldownClock'];
export function setup(zone, level, abilityCount, chests, mode = 'none') {
  const g = createGame();
  g.level = level; const L = LEVELS[level - 1];
  g.hpMax = g.hp = L.hpMax; g.mpMax = g.mp = L.mpMax;
  ABIL.slice(0, abilityCount).forEach(k => { g.abilities[k] = true; });
  g.zone = zone; g.coin = 400;
  const large = zone !== 'th' && mode !== 'none';
  if (large && mode === 'count') { g.inventory.healthLarge = chests; g.inventory.holyWaterLarge = 3; }
  else if (large && mode === 'coin') {
    const st = merchantStock(zone), p = k => st.find(s => s.k === k).cost;
    g.inventory.healthLarge = Math.round(chests * p('health') / p('healthLarge'));
    g.inventory.holyWaterLarge = Math.round(3 * p('holyWater') / p('holyWaterLarge'));
  } else { g.inventory.health = chests; g.inventory.holyWater = 3; }
  for (const k of ['taan', 'plerng']) if (!g.crew.some(c => c.k === k)) g.hire(k);
  for (const c of g.crew) if (!c.reader) { c.homeZone = zone; c.id = `${zone}:${c.k}`; }
  g.party.members = ['taan', 'plerng'];
  return g;
}
const have = (g, k) => (g.inventory[k] || 0) > 0;
let turnNo = 0;
function botTurn(g) {
  const b = g.battle; turnNo++;
  const low = b.youHp <= b.youMax * 0.45;
  if (turnNo % 15 === 1) for (const c of g.crewHelpers()) c.helpReadyAt = 0;
  if (low && g.battleAct('crew:boon')) return true;
  if (low && have(g, 'healthLarge')) return g.battleAct('healthLarge');
  if (low && have(g, 'health')) return g.battleAct('health');
  if (g.mp < BATTLE.mpCost.fire && have(g, 'holyWaterLarge') && g.battleAct('holyWaterLarge')) return true;
  if (g.mp < BATTLE.mpCost.fire && have(g, 'holyWater') && g.battleAct('holyWater')) return true;
  if (g.mp >= BATTLE.mpCost.fire) return g.battleAct('fire');
  for (const c of g.crewHelpers()) if (['taan', 'plerng', 'dam'].includes(c.k) && !g.crewHelpWhy(c) && g.battleAct('crew:' + c.k)) return true;
  return g.battleAct('atk');
}
function rest(g, mode) {
  g.coin = 400;
  const stock = merchantStock(g.zone), find = k => stock.find(s => s.k === k);
  const useLarge = mode !== 'none' && find('healthLarge');
  for (let i = 0; i < 12; i++) {
    const mpGap = g.mpMax - g.mp, hpGap = g.battle.youMax - g.battle.youHp;
    if (useLarge && mpGap >= g.mpMax * .65 && g.coin >= find('holyWaterLarge').cost && g.buyMerchant('holyWaterLarge') && g.useHolyWater('holyWaterLarge')) continue;
    if (mpGap >= 20 && g.coin >= find('holyWater').cost && g.buyMerchant('holyWater') && g.useHolyWater('holyWater')) continue;
    if (useLarge && hpGap >= g.battle.youMax * .65 && g.coin >= find('healthLarge').cost && g.buyMerchant('healthLarge') && g.useBossMedicine('healthLarge')) continue;
    if (hpGap >= 30 && g.coin >= find('health').cost && g.buyMerchant('health') && g.useBossMedicine('health')) continue;
    break;
  }
}
export function fight(g, mode) {
  for (let guard = 0; g.battle && !g.battle.over && guard < 800; guard++) {
    if (g.battle.storyInterlude === 'west-hypnosis') { g.completeBattleInterlude(); continue; }
    if (g.battle.pendingWave) {
      if (g.zoneEventRestReady()) { rest(g, mode); if (!g.advanceZoneEventWave(true)) return false; }
      else if (g.battle.kind === 'frontierBreach') { if (!g.advanceFrontierBreachWave()) return false; }
      else if (!g.advanceZoneEventWave()) return false;
      continue;
    }
    if (!botTurn(g) && !g.battleAct('atk')) return false;
  }
  return g.battle?.over === 'win';
}
export const SCEN = {
  breach: ['cyber breach', 'cyberhell', 5, 8, 3, g => { g.zoneCases.cyberhell = 5; g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'pending' }; return g.startZoneEvent('cyberBreach'); }],
  legacy: ['legacy cyber FINAL', 'cyberhell', 5, 8, 5, g => {
    g.zoneCases.cyberhell = 10; g.zoneEvents.cyberhell = { cyberRescue:'cleared', cyberBreach:'cleared', legacyFinalBenchmark:'pending' };
    return g.startZoneEvent('legacyFinalBenchmark');
  }],
};
export function winRate([name, zone, level, ab, chests, start], runs, seed, mode) {
  return withSeed(seed, () => {
    let wins = 0;
    for (let i = 0; i < runs; i++) {
      const g = setup(zone, level, ab, chests, mode);
      if (!start(g)) throw Error(name + ' start');
      if (fight(g, mode)) wins++;
    }
    return wins / runs;
  });
}
export function withLegacy(fn) {
  const source = ZONE_EVENTS.cyberhell.find(e => e.k === 'cyberFinal');
  const legacy = { ...source, k:'legacyFinalBenchmark', restBeforeWaves:[4, 8], waves:source.waves.filter((_, i) => i !== 3) };
  ZONE_EVENTS.cyberhell.push(legacy);
  try { return fn(); } finally { ZONE_EVENTS.cyberhell.pop(); }
}
if (process.argv[1].endsWith('sim-g4.mjs')) {
  const runs = Number(process.argv[2] || 200);
  const mult = Number(process.env.G4_ATK || 1);
  const mults = { cyberBreach:Number(process.env.G4_ATK_B || mult), cyberFinal:Number(process.env.G4_ATK_F || mult) };
  for (const [key, m] of Object.entries(mults)) if (m !== 1) {
    const ev = ZONE_EVENTS.cyberhell.find(e => e.k === key);
    for (const wave of ev.waves) for (const f of wave) f.atk = f.atk.map(v => Math.round(v * m));
  }
  for (const mode of (process.env.G4_LARGE || 'none,count,coin').split(',')) {
    const breach = winRate(SCEN.breach, runs, 28, mode);
    const legacy = withLegacy(() => winRate(SCEN.legacy, runs, 28, mode));
    console.log(`atk breach x${mults.cyberBreach} final x${mults.cyberFinal} large=${mode}: cyber breach ${(breach * 100).toFixed(1)}%  legacy final ${(legacy * 100).toFixed(1)}%`);
  }
}
