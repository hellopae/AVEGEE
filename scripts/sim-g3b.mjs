// G3b — จำลองสมดุล: (1) ประลองปีศาจชายแดน 10 wave ต่อโซน (2) อาวุธทำให้ศึกเนื้อเรื่องโซนถัดไปง่ายขึ้นกี่จุด%
// บอทและสมมติฐานเดียวกับ tests/balance28b.test.mjs (ลูกไฟตอนมี MP · ยมทูตพิเศษ · น้ำมนต์ · กินยาเมื่อบารมี <45% · ยมทูตรีคูลดาวน์ทุก 15 ตา)
// ใช้: node scripts/sim-g3b.mjs challenge [runs] | weapons [runs] | all [runs]
//   env G3B_BOT=melee  → บอทที่ใช้แต่ "ฟาดปกติ" (ขอบบนของผลอาวุธ ไม่ใช่ผู้เล่นจริง)
//   env G3B_BOT=mixed G3B_P=0.5  → ผู้เล่นที่ประหยัด MP: สัดส่วน G3B_P ของตา (สุ่มด้วย PRNG แยก ไม่รบกวนลำดับสุ่มของศึก) เลือกฟาดปกติแทนลูกไฟ/ท่ายมทูต
import { createGame } from '../src/game.js';
import { BATTLE, LEVELS, ZONE_EVENTS, WEAPONS, CHALLENGE_STORY_KEY, WEAPON_OF_ZONE } from '../src/data.js';
import { merchantStock } from '../src/progression.js';

globalThis.Image ??= class {};
// ทดลองค่าอาวุธ: G3B_W='{"cane":{"atk":.22,"effect":{"cap":3}}}' (ผสมทับ WEAPONS ใน data.js เฉพาะรอบรันนี้)
if (process.env.G3B_W) for (const [id, o] of Object.entries(JSON.parse(process.env.G3B_W))) { Object.assign(WEAPONS[id], { atk:o.atk ?? WEAPONS[id].atk }); Object.assign(WEAPONS[id].effect, o.effect || {}); }
const seeded = seed => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const realRandom = Math.random;
const ABIL = ['bigFire', 'flameCharge', 'windFan', 'rage', 'ice', 'hypno', 'valkyrieSpear', 'cooldownClock'];
const MELEE = process.env.G3B_BOT === 'melee', MIXED = process.env.G3B_BOT === 'mixed';
const MIX_P = +(process.env.G3B_P || 0.5);
let botRnd = seeded(1);

/** สถานะผู้เล่น ณ ตอนที่ถึงจุดนั้นในเนื้อเรื่อง (ระดับ/พลัง/ยา ตรงกับ balance28b) */
export const STATE = {
  th:        { level:2, abilities:['bigFire'], chests:2 },
  asia:      { level:3, abilities:['bigFire', 'flameCharge', 'windFan'], chests:3 },
  west:      { level:4, abilities:['bigFire', 'flameCharge', 'windFan', 'rage', 'hypno'], chests:3 },
  cyberhell: { level:5, abilities:ABIL, chests:3 },
};
export function setup(zone, { level, abilities, chests }, weapon = null) {
  const g = createGame();
  g.level = level; const L = LEVELS[level - 1];
  g.hpMax = g.hp = L.hpMax; g.mpMax = g.mp = L.mpMax;
  abilities.forEach(k => { g.abilities[k] = true; });
  g.zone = zone; g.inventory.health = chests; g.inventory.holyWater = 3; g.coin = 400;
  for (const k of ['taan', 'plerng']) if (!g.crew.some(c => c.k === k)) g.hire(k);
  for (const c of g.crew) if (!c.reader) { c.homeZone = zone; c.id = `${zone}:${c.k}`; }
  g.party.members = ['taan', 'plerng'];
  if (weapon) { g.weapons.owned[weapon] = true; g.weapons.equipped = weapon; }
  return g;
}
let turnNo = 0;
function botTurn(g) {
  const b = g.battle; turnNo++;
  const low = b.youHp <= b.youMax * 0.45;
  if (turnNo % 15 === 1) for (const c of g.crewHelpers()) c.helpReadyAt = 0;
  if (low && g.battleAct('crew:boon')) return true;
  if (low && (g.inventory.health || 0) > 0) return g.battleAct('health');
  if (MELEE || (MIXED && botRnd() < MIX_P)) return g.battleAct('atk');
  if (g.mp < BATTLE.mpCost.fire && (g.inventory.holyWater || 0) > 0 && g.battleAct('holyWater')) return true;
  if (g.mp >= BATTLE.mpCost.fire) return g.battleAct('fire');
  for (const c of g.crewHelpers()) if (['taan', 'plerng', 'dam'].includes(c.k) && !g.crewHelpWhy(c) && g.battleAct('crew:' + c.k)) return true;
  return g.battleAct('atk');
}
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
/** เล่นศึกจนจบ — คืน { win, wave (ระลอกสุดท้ายที่ถึง), actions } */
export function fight(g) {
  let actions = 0;
  for (let guard = 0; g.battle && !g.battle.over && guard < 2500; guard++) {
    if (g.battle.storyInterlude === 'west-hypnosis') { g.completeBattleInterlude(); continue; }
    if (g.battle.pendingWave) {
      if (g.zoneEventRestReady()) { rest(g); if (!g.advanceZoneEventWave(true)) break; }
      else if (!g.advanceZoneEventWave()) break;
      continue;
    }
    if (!botTurn(g) && !g.battleAct('atk')) break;
    actions++;
  }
  return { win:g.battle?.over === 'win', wave:g.battle?.wave || 0, actions };
}
const withSeed = (seed, fn) => { Math.random = seeded(seed); botRnd = seeded(seed ^ 0x9e3779b9); try { return fn(); } finally { Math.random = realRandom; } };
const pct = (n, d) => +(100 * n / d).toFixed(1);

// ---------------------------------------------------------------- (1) ประลอง 10 wave
export function runChallenge(zone, runs, { weapon = null, seed = 9100 } = {}) {
  let first = 0, within = 0, resumeTried = 0, resumeWon = 0;
  const failAt = Array(11).fill(0), actions = [];
  for (let i = 0; i < runs; i++) withSeed(seed + i, () => {
    let challenge = {};
    // แพ้แล้วกลับมาใหม่ (พักเต็ม บารมี/MP เต็ม ยาเท่าตอนเริ่ม) เริ่มที่ checkpoint ถ้าผ่านจุดพักแล้ว · สูงสุด 3 รอบ
    for (let attempt = 1; attempt <= 3; attempt++) {
      const g = setup(zone, STATE[zone], weapon);
      g.challenge = challenge; g.zoneEvents[zone] = { [CHALLENGE_STORY_KEY[zone]]: 'cleared' };
      g.startChallenge();
      const resumed = g.battle.startWave > 1;
      const r = fight(g); challenge = g.challenge;
      if (attempt === 1) actions.push(r.actions);
      if (resumed) { resumeTried++; if (r.win) resumeWon++; }
      if (r.win) { if (attempt === 1) first++; within++; return; }
      failAt[r.wave]++;
    }
  });
  return { zone, weapon, runs, firstAttemptWin:pct(first, runs), clearedWithin3Attempts:pct(within, runs),
    resumeFromCheckpointWin:resumeTried ? pct(resumeWon, resumeTried) : null,
    failAtWave:failAt.slice(1).map((n, k) => `${k + 1}:${n}`).join(' '),
    meanActionsFirstAttempt:+(actions.reduce((a, b) => a + b, 0) / actions.length).toFixed(1) };
}

// ---------------------------------------------------------------- (2) อาวุธต่อศึกเนื้อเรื่องที่ตามมา
const set = (g, zone, events, cases = 10) => { g.zoneCases[zone] = cases; g.zoneEvents[zone] = events; };
export const STORY_SCEN = {
  // [ชื่อ, โซน, สถานะผู้เล่น, เริ่มศึก]
  'th borderBoss':      ['th', STATE.th, g => { set(g, 'th', { prisonBreak:'cleared', devaTest:'cleared', frontierBreach:'cleared', thBorderBoss:'pending' }); return g.startZoneEvent('thBorderBoss'); }],
  'asia rageBreach':    ['asia', STATE.asia, g => { set(g, 'asia', { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'pending' }, 6); return g.startZoneEvent('asiaRageBreach'); }],
  'asia zoneBoss':      ['asia', { ...STATE.asia, abilities:[...STATE.asia.abilities, 'rage'] }, g => { set(g, 'asia', { asiaPrisonFire:'cleared', asiaDevaTest:'cleared', asiaRageBreach:'cleared' }); const b = g.startZoneBoss(); g.startBossFight(); return b; }],
  'west vampireBreach': ['west', STATE.west, g => { set(g, 'west', { westHypnotized:'cleared', westVampireBreach:'pending' }, 3); return g.startZoneEvent('westVampireBreach'); }],
  'west devaTest':      ['west', STATE.west, g => { set(g, 'west', { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'pending' }, 7); return g.startZoneEvent('westDevaTest'); }],
  'west zoneBoss':      ['west', STATE.west, g => { set(g, 'west', { westHypnotized:'cleared', westVampireBreach:'cleared', westDevaTest:'cleared' }); const b = g.startZoneBoss(); g.startBossFight(); return b; }],
  'cyber rescue':       ['cyberhell', STATE.cyberhell, g => { set(g, 'cyberhell', { cyberRescue:'pending' }, 0); return g.startZoneEvent('cyberRescue'); }],
  'cyber breach':       ['cyberhell', STATE.cyberhell, g => { set(g, 'cyberhell', { cyberRescue:'cleared', cyberBreach:'pending' }, 5); return g.startZoneEvent('cyberBreach'); }],
  'cyber final minion:1': ['cyberhell', STATE.cyberhell, g => finalStart(g, 'minion:1')],
  'cyber final boss':   ['cyberhell', STATE.cyberhell, g => finalStart(g, 'boss')],
};
function finalStart(g, id) {
  set(g, 'cyberhell', { cyberRescue:'cleared', cyberBreach:'cleared' }); g.refreshZoneEvents();
  g.finalEvent = { version:1, migrationVersion:1, phase:'staging', minionsCleared:id.startsWith('minion:') ? +id.split(':')[1] - 1 : 4,
    rulersCleared:id === 'boss' ? ['th', 'asia', 'west', 'cyberhell'] : [], rewardLedger:{}, pendingReward:null, activeEncounter:null, reinforcementsSeen:true };
  return g.startFinalEncounter(id);
}
/** ศึกเนื้อเรื่อง → ชนะกี่ % (ไม่มี/มีอาวุธ) */
export function runStory(name, runs, weapon, seed = 7700) {
  const [zone, state, start] = STORY_SCEN[name];
  let wins = 0;
  for (let i = 0; i < runs; i++) withSeed(seed + i, () => {
    const g = setup(zone, state, weapon);
    if (!start(g)) throw Error('cannot start ' + name);
    if (fight(g).win) wins++;
  });
  return pct(wins, runs);
}
/** ผู้เล่นได้อาวุธ w แล้วเจอศึกที่ตามมา — เทียบอัตราชนะก่อน/หลัง */
export const WEAPON_NEXT = {
  fang:   ['th borderBoss', 'asia rageBreach', 'asia zoneBoss'],
  chain:  ['asia zoneBoss', 'west vampireBreach', 'west devaTest', 'west zoneBoss'],
  cane:   ['west zoneBoss', 'cyber rescue', 'cyber breach'],
  trojan: ['cyber final minion:1', 'cyber final boss'],
};
export function runWeapons(runs) {
  const rows = [];
  for (const [w, names] of Object.entries(WEAPON_NEXT)) for (const name of names) {
    const none = runStory(name, runs, null), withW = runStory(name, runs, w);
    rows.push({ weapon:w, encounter:name, noWeapon:none, withWeapon:withW, delta:+(withW - none).toFixed(1) });
  }
  return rows;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const mode = process.argv[2] || 'all', runs = +process.argv[3] || 200;
  const out = { bot:MELEE ? 'melee-only' : MIXED ? `mixed (${100 * MIX_P}% plain attack)` : 'standard', runs };
  if (mode === 'challenge' || mode === 'all') {
    const prev = { th:null, asia:'fang', west:'chain', cyberhell:'cane' };
    out.challenge = Object.keys(CHALLENGE_STORY_KEY).map(z => runChallenge(z, runs, { weapon:prev[z] }));
    out.challengeNoWeapon = Object.keys(CHALLENGE_STORY_KEY).filter(z => prev[z]).map(z => runChallenge(z, runs));
  }
  if (mode === 'weapons' || mode === 'all') out.weapons = runWeapons(runs);
  console.log(JSON.stringify(out, null, 1));
}
