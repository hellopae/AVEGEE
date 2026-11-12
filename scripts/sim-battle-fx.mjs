// BATTLE-FX (10 Nov): win-rate check for the boss-ultimate rhythm and the 1-3 frontier foes.
// usage: node scripts/sim-battle-fx.mjs <label> [seeds] [kinds=frontier,boss]
// Same production battle loop as sim-balance2.mjs; writes output/coordination/2026-11-10-battle-fx/<label>.json
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { scenarios, simulate } from './sim-balance2.mjs';
const [label = 'run', seeds = '100', kinds = 'frontier,boss'] = process.argv.slice(2);
const want = kinds.split(','), count = Number(seeds);
const outDir = fileURLToPath(new URL('../output/coordination/2026-11-10-battle-fx/', import.meta.url));
mkdirSync(outDir, { recursive: true });
const rows = [];
for (const scenario of scenarios().filter(s => want.includes(s.kind) || want.includes('all') || (want.includes('boss') && s.encounter === 'boss')))
  for (const moves of [false, true]) {
    const samples = Array.from({ length: count }, (_, i) => simulate({ ...scenario, moves, seed: 30000 + i }));
    const wins = samples.filter(r => r.result === 'win').length;
    const mean = key => Number((samples.reduce((s, r) => s + r[key], 0) / count).toFixed(2));
    const row = { ...scenario, moves, samples: count, wins, winRate: +(100 * wins / count).toFixed(1), rounds: mean('rounds'), bossRounds: mean('bossRounds'), timeouts: samples.filter(r => r.result === 'timeout').length, foes: +(samples.reduce((a, r) => a + r.initial.length, 0) / count).toFixed(2),
      ult: mean('ultimates'), bossActs: mean('bossActs'), ult2plus: +(100 * samples.filter(r => r.ultimates >= 2).length / count).toFixed(1),
      firstUltAct: +(samples.filter(r => r.firstUltAct).reduce((a, r) => a + r.firstUltAct, 0) / Math.max(1, samples.filter(r => r.firstUltAct).length)).toFixed(2),
      foeSplit: [1, 2, 3].map(n => samples.filter(r => r.initial.length === n).length) };
    rows.push(row); console.log(JSON.stringify(row));
  }
writeFileSync(outDir + label + '.json', JSON.stringify({ label, count, rows }, null, 2) + '\n');
