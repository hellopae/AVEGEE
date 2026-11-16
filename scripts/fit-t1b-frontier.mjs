// T1b (owner 16 Nov): the ordinary border fights (1-3 demons, `<zone>:frontier` rows of encounter-balance.js) after the foe-turn change.
//   measure:  node scripts/fit-t1b-frontier.mjs measure [seeds=200] [seedStart=30000]          -> one JSON line per zone x team size x (L,T)
//   fit:      node scripts/fit-t1b-frontier.mjs fit <before.jsonl> [seeds=250]                  -> bisects the row's atk (x atkLow / atkHigh with it) to the target
// target: L drops by DROP (10) but never below the plan's 70 % lower bound (+1.5); a row already at / under it keeps its L (must not get harder - the blow is the only knob here, so its trained run T is left to fall where it falls).
import { readFileSync } from 'node:fs';
import { simulate } from './sim-balance2.mjs';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
const [mode, a2, a3, a4] = process.argv.slice(2);
const ROWS = [['th', 3], ['asia', 3], ['asia', 4], ['asia', 5], ['west', 3], ['west', 4], ['west', 5], ['west', 6], ['cyberhell', 3], ['cyberhell', 4], ['cyberhell', 5], ['cyberhell', 6], ['cyberhell', 7]];
const DROP = Number(process.env.DROP || 10), DROP_T = Number(process.env.DROP_T || 6.5), FLOOR = 70, MARGIN = Number(process.env.MARGIN || 1.5);
const rate = (zone, size, moves, n, start) => 100 * Array.from({ length:n }, (_, i) => simulate({ zone, size, kind:'frontier', moves, seed:start + i })).filter(r => r.result === 'win').length / n;
if (mode === 'measure') {
  const n = Number(a2 || 200), start = Number(a3 || 30000);
  for (const [zone, size] of ROWS) console.log(JSON.stringify({ zone, size, L:+rate(zone, size, false, n, start).toFixed(1), T:+rate(zone, size, true, n, start).toFixed(1) }));
} else {
  const before = {}; for (const l of readFileSync(a2, 'utf8').split('\n')) if (l.startsWith('{')) { const r = JSON.parse(l); before[`${r.zone}/${r.size}`] = r; }
  const n = Number(a3 || 250), out = {};
  const only = a4 ? a4.split(',') : null;
  for (const [zone, size] of ROWS) {
    if (only && !only.includes(`${zone}/${size}`)) continue;
    const row = ENCOUNTER_BALANCE[`${zone}:frontier`][size], base = { ...row }, b = before[`${zone}/${size}`];
    const md = 'L', want = b.L > FLOOR + 2 ? Math.max(b.L - DROP, FLOOR + MARGIN) : b.L;
    const apply = k => { row.atk = +(base.atk * k).toFixed(3); for (const f of ['atkLow', 'atkHigh']) if (base[f] != null) row[f] = +(base[f] * k).toFixed(3); };
    let lo = .3, hi = 3;
    for (let i = 0; i < 9; i++) { const mid = Math.sqrt(lo * hi); apply(mid); if (rate(zone, size, md === 'T', n, 50000) > want) lo = mid; else hi = mid; }
    const k = Math.sqrt(lo * hi); apply(k);
    out[`${zone}:frontier`] = { ...(out[`${zone}:frontier`] || {}), [size]: { ...row } };
    console.log(JSON.stringify({ zone, size, mode:md, beforeL:b.L, beforeT:b.T, want:+want.toFixed(1), k:+k.toFixed(3), row:{ ...row }, gotL:+rate(zone, size, false, n, 50000).toFixed(1), gotT:+rate(zone, size, true, n, 50000).toFixed(1) }));
  }
}
