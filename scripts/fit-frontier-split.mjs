// BATTLE-FX: grid-search FRONTIER_SPLIT {hpExp, atkExp} so border fights with a rolled 1-3 demons keep the old win rates (mean |delta| over every frontier row).
// usage: node scripts/fit-frontier-split.mjs <before.json> [seeds=150]   (seeds 50000+; the check run uses 30000+)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simulate, scenarios } from './sim-balance2.mjs';
import { FRONTIER_SPLIT } from '../src/encounter-balance.js';
const dir = fileURLToPath(new URL('../output/coordination/2026-11-10-battle-fx/', import.meta.url));
const before = JSON.parse(readFileSync(dir + process.argv[2] + '.json')).rows, seeds = Number(process.argv[3] || 150);
const rows = scenarios().filter(s => s.kind === 'frontier');
const want = s => before.filter(r => r.zone === s.zone && r.size === s.size && r.kind === 'frontier').reduce((a, r) => a + r.winRate, 0) / 2;
const rate = s => [false, true].reduce((a, moves) => a + 100 * Array.from({ length: seeds }, (_, i) => simulate({ ...s, moves, seed: 50000 + i })).filter(r => r.result === 'win').length / seeds, 0) / 2;
const out = [];
for (const hpExp of (process.env.HP || '0.8,1,1.2').split(',').map(Number)) for (const atkExp of (process.env.ATK || '0.2,0.4,0.5,0.6,0.8').split(',').map(Number)) {
  Object.assign(FRONTIER_SPLIT, { hpExp, atkExp });
  const d = rows.map(s => rate(s) - want(s)), mean = d.reduce((a, x) => a + x, 0) / d.length, abs = d.reduce((a, x) => a + Math.abs(x), 0) / d.length;
  console.log(JSON.stringify({ hpExp, atkExp, meanDelta: +mean.toFixed(1), meanAbs: +abs.toFixed(1), worst: +Math.max(...d.map(Math.abs)).toFixed(1), over10: d.filter(x => Math.abs(x) > 10).length }));
}
