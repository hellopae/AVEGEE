// BOSS-SKILLS set A (15 Nov 2026): win rate / length of every boss fight that carries moves, through the production battle loop (same as sim-balance2.mjs).
// usage: node scripts/sim-boss-skills.mjs [scenario,scenario|all] [seeds=100] [sizes=3] [moves=locked|unlocked|both]
//   locked   = first attempt (no trained moves);  unlocked = trained moves + team move.   The targets of the plan are for the FIRST try (locked), size 3.
//   a scenario is a whole fight as the player meets it: `breach` ones run every wave (3 waves + the border boss), single ones are just the one fight.
import { simulate } from './sim-balance2.mjs';
import { ZONE_EVENTS, BOSS_BALANCE } from '../src/data.js';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
export const SCENARIOS = {
  // zone 1
  thDeva:      { zone:'th',        kind:'event',  eventKey:'devaTest',       target:[75, 85], label:'อรุณเดช (เทวดาทดสอบ)' },
  thBreach:    { zone:'th',        kind:'breach',                              target:[60, 75], label:'ทัณฑสูร (ชายแดน · ทั้ง 4 ระลอก)' },
  thHanuman:   { zone:'th',        kind:'event',  eventKey:'sitaHanuman',    target:[65, 80], label:'หนุมาน (event)' },
  thBoss:      { zone:'th',        kind:'boss',                                target:[55, 70], label:'ยมทัต (บอสโซน)' },
  // zone 2
  asiaDeva:    { zone:'asia',      kind:'event',  eventKey:'asiaDevaTest',   target:[75, 85], label:'คุโรฮะ (เทวดาทดสอบ)' },
  asiaWukong:  { zone:'asia',      kind:'event',  eventKey:'asiaWukong',     target:[65, 80], label:'หงอคง (event)' },
  asiaGuard:   { zone:'asia',      kind:'event',  eventKey:'asiaGuardTest',  target:[70, 85], label:'ยักษ์ทวารบาลทดสอบ' },
  asiaBreach:  { zone:'asia',      kind:'breach',                              target:[60, 75], label:'อากุระ (ชายแดน · ทั้ง 4 ระลอก)' },
  asiaBoss:    { zone:'asia',      kind:'boss',                                target:[55, 70], label:'เหลียนกัง (บอสโซน)' },
  // zone 3
  westDeva:    { zone:'west',      kind:'event',  eventKey:'westDevaTest',   target:[75, 85], label:'เอียร์ลิน (เทวดาทดสอบ)' },
  westBreach:  { zone:'west',      kind:'breach',                              target:[60, 75], label:'วาลดริก (ชายแดน · ทั้ง 3 ระลอก)' },
  westBoss:    { zone:'west',      kind:'boss',                                target:[55, 70], label:'เซเวอริน (บอสโซน)' },
  // zone 4
  cyberRescue: { zone:'cyberhell', kind:'event',  eventKey:'cyberRescue',    target:[75, 85], label:'ลูเมน-01/02 (เทวดาผู้คุม)' },
  cyberBreach: { zone:'cyberhell', kind:'breach',                              target:[60, 75], label:'โทรจัน-9 (ชายแดน · ทั้ง 4 ระลอก)' },
  finalTh:     { zone:'cyberhell', kind:'final',  encounter:'ruler:th',       target:[45, 65], label:'พญายมบาท (ถูกสิง)' },
  finalAsia:   { zone:'cyberhell', kind:'final',  encounter:'ruler:asia',     target:[45, 65], label:'จ้าวเหวิน (ถูกสิง)' },
  finalWest:   { zone:'cyberhell', kind:'final',  encounter:'ruler:west',     target:[45, 65], label:'ฮาลวาร์ (ถูกสิง)' },
  finalCyber:  { zone:'cyberhell', kind:'final',  encounter:'ruler:cyberhell',target:[45, 65], label:'เน็กซาร (ถูกสิง)' },
  finalBoss:   { zone:'cyberhell', kind:'final',  encounter:'boss',           target:[55, 70], label:'อาร์คอน-ศูนย์ (บอสโซน)' },
  // the same border bosses met again as "hypnotised" in the signal arc (SIGNAL_EVENTS)
  sigTh:       { zone:'th',        kind:'signal', eventKey:'signalTh',        target:[60, 75], label:'ทัณฑสูร (สัญญาณครอบงำ)' },
  sigAsia:     { zone:'asia',      kind:'signal', eventKey:'signalAsia',      target:[60, 75], label:'อากุระ (สัญญาณครอบงำ)' },
  sigWest:     { zone:'west',      kind:'signal', eventKey:'signalWest',      target:[60, 75], label:'วาลดริก (สัญญาณครอบงำ)' },
  sigCyber:    { zone:'cyberhell', kind:'signal', eventKey:'cyberSignal',     target:[60, 75], label:'โทรจัน-9 (สัญญาณครอบงำ)' },
};
// The boss's own entry (hp / atk / skills / partyScale) of a scenario, to tune it without editing data.js:  BOSS_TUNE='{"thDeva":{"hp":300,"atk":[20,30],"skills":{"karmaMirror":{"power":.7}}},"enc":{"asia:boss":{"3":{"hp":1.2,"atk":.9}}}}'
const ev = (zone, k) => ZONE_EVENTS[zone].find(e => e.k === k);
const final = i => ev('cyberhell', 'cyberFinal').waves[i][0];
export const entryOf = {
  thDeva:() => ev('th', 'devaTest').foe, thBreach:() => ev('th', 'frontierBreach').waves[3][0], thHanuman:() => ev('th', 'sitaHanuman').foe, thBoss:() => ev('th', 'thBorderBoss').foes[0],
  asiaDeva:() => ev('asia', 'asiaDevaTest').foe, asiaWukong:() => ev('asia', 'asiaWukong').foe, asiaGuard:() => ev('asia', 'asiaGuardTest').foe, asiaBreach:() => ev('asia', 'asiaRageBreach').waves[3][0],
  westDeva:() => ev('west', 'westDevaTest').foe, westBreach:() => ev('west', 'westVampireBreach').waves[3][0],
  cyberRescue:() => ev('cyberhell', 'cyberRescue').foes[0], cyberBreach:() => ev('cyberhell', 'cyberBreach').waves[3][0],
  finalTh:() => final(3), finalAsia:() => final(4), finalWest:() => final(5), finalCyber:() => final(6), finalBoss:() => final(7),   // T8d: three minion waves, so the rulers are waves[3..6] and the boss waves[7]
  sigTh:() => ev('th', 'signalTh').waves[1][0], sigAsia:() => ev('asia', 'signalAsia').waves[1][0], sigWest:() => ev('west', 'signalWest').waves[1][0], sigCyber:() => ev('cyberhell', 'cyberSignal').waves[1][0],
};
export function applyTune(raw = process.env.BOSS_TUNE) {
  if (!raw) return;
  const o = JSON.parse(raw);
  for (const [key, patch] of Object.entries(o)) {
    if (key === 'enc') { for (const [row, sizes] of Object.entries(patch)) for (const [size, v] of Object.entries(sizes)) Object.assign(ENCOUNTER_BALANCE[row][size], v); continue; }
    if (key === 'bossBalance') { Object.assign(BOSS_BALANCE, patch); continue; }
    const entry = entryOf[key]?.(); if (!entry) { console.log('no entry for', key); continue; }
    for (const [k, v] of Object.entries(patch)) {
      if (k === 'skills') for (const sk of (entry.skillsEach ? entry.skillsEach.flat() : entry.skills) || []) { const q = v[sk.id]; if (q) { for (const [a, b] of Object.entries(q)) sk[a] = (b && typeof b === 'object' && !Array.isArray(b)) ? { ...sk[a], ...b } : b; } }
      else entry[k] = v;
    }
  }
}
applyTune();
const run = (sc, size, moves, seed) => {
  const { target, label, ...opt } = sc;
  try {
    if (opt.kind === 'signal') return simulate({ ...opt, kind:'event', fullBreach:true, size, moves, seed,
      ...(opt.zone!=='cyberhell'?{team:['nira']}:{}) });
    return simulate({ ...opt, size, moves, seed });
  } catch (e) { return { result:'error', msg:e.message, rounds:0, bossRounds:0 }; }
};
export function measure(key, { count = 100, sizes = [3], modes = ['locked'] } = {}) {
  const sc = SCENARIOS[key], rows = [];
  if (sc.kind === 'signal' && sc.zone !== 'cyberhell') sizes=[2];
  for (const size of sizes) for (const mode of modes) {
    const samples = Array.from({ length:count }, (_, i) => run(sc, size, mode === 'unlocked', Number(process.env.SEED0 || 30000) + i));
    const wins = samples.filter(r => r.result === 'win'), err = samples.filter(r => r.result === 'error');
    const mean = (set, k) => set.length ? +(set.reduce((a, r) => a + r[k], 0) / set.length).toFixed(2) : null;
    rows.push({ key, size, mode, winPct:+(100 * wins.length / count).toFixed(1), target:sc.target, rounds:mean(samples, 'rounds'), winRounds:mean(wins, 'rounds'), bossRounds:mean(samples, 'bossRounds'), skillUses:mean(samples, 'skillUses'),
      ultimates:mean(samples, 'ultimates'), errors:err.length, firstError:err[0]?.msg, timeouts:samples.filter(r => r.result === 'timeout').length });
  }
  return rows;
}
if (process.argv[1] && process.argv[1].endsWith('sim-boss-skills.mjs')) {
  const [which = 'all', n = '100', sz = '3', md = 'locked'] = process.argv.slice(2);
  const keys = which === 'all' ? Object.keys(SCENARIOS) : which.split(',');
  const sizes = sz.split(',').map(Number), modes = md === 'both' ? ['locked', 'unlocked'] : [md];
  for (const k of keys) { if (!SCENARIOS[k]) { console.log('unknown', k); continue; } for (const r of measure(k, { count:Number(n), sizes, modes })) console.log(JSON.stringify(r)); }
}
