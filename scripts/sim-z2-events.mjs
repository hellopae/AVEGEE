// Z2-FIXUP (14 Nov 2026): win rate / length of the new Zone 2 story fights against the fights Zone 2 already had.
// usage: node scripts/sim-z2-events.mjs [seeds=200]
// Same production loop as sim-balance2.mjs (turn queue, runEnemyTurn, confirmBattleCommand); `locked` = first attempt, no trained moves; `unlocked` = trained moves + team move.
//   reference rows : asiaDevaTest (single deva fight, 130/11-18) and the zone boss (asia:boss) / full frontier breach (asia:breach) as measured by BALANCE-2
//   new rows       : asiaWukong (case 7) · asiaGuardTest (hire test) · asiaRageBreach (case 11, the whole 3 waves + Akura; wave 3 is the new one)
import { simulate } from './sim-balance2.mjs';
const count = Number(process.argv[2] || 200);
const rows = [];
const jobs = [
  ...['asiaDevaTest', 'asiaWukong', 'asiaGuardTest'].map(eventKey => ({ kind:'event', eventKey })),
  { kind:'breach' }, { kind:'boss' },
];
for (const job of jobs) for (const size of [3, 4, 5]) for (const moves of [false, true]) {
  const samples = Array.from({ length:count }, (_, i) => { try { return simulate({ zone:'asia', size, moves, seed:30000 + i, ...job }); } catch (e) { return { result:'error', msg:e.message, rounds:0, bossRounds:0 }; } });
  const wins = samples.filter(r => r.result === 'win'), err = samples.filter(r => r.result === 'error');
  const mean = (set, key) => set.length ? +(set.reduce((a, r) => a + r[key], 0) / set.length).toFixed(2) : null;
  const row = { what:job.eventKey || job.kind, size, moves:moves ? 'unlocked' : 'locked', winPct:+(100 * wins.length / count).toFixed(1), winRounds:mean(wins, 'rounds'), heroHpLeft:mean(wins, 'heroHp'), healing:mean(samples, 'healing'), errors:err.length, firstError:err[0]?.msg };
  rows.push(row); console.log(JSON.stringify(row));
}
