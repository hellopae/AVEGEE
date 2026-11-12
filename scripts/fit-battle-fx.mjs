// BATTLE-FX: for every boss row find (a) how much longer the boss must live (bossHp, with addsHp taking the same HP away from the attendants) so the
// cutscene move (BOSS_ULTIMATE_RHYTHM) is seen twice in >= 80 % of fights (bossHp capped at 1.8x), and (b) the ATK correction (atkMul) that keeps the win rate where it was.
// usage: node scripts/fit-battle-fx.mjs <before.json> [seeds=120]   (calibration seeds 50000+, disjoint from the 30000+ check seeds)
// Needs the ORIGINAL src/encounter-balance.js (without the BATTLE_FX_BOSS table); writes output/coordination/2026-11-10-battle-fx/fit-boss.json
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { simulate, scenarios } from './sim-balance2.mjs';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
const dir = fileURLToPath(new URL('../output/coordination/2026-11-10-battle-fx/', import.meta.url));
const before = JSON.parse(readFileSync(dir + process.argv[2] + '.json')).rows, seeds = Number(process.argv[3] || 120);
const keyOf = s => `${s.zone}:${s.encounter || s.kind}`;
const target = s => { const rows = before.filter(r => r.zone === s.zone && r.size === s.size && r.kind === s.kind && r.encounter === s.encounter); return rows.reduce((a, r) => a + r.winRate, 0) / rows.length; };
const run = s => [false, true].map(moves => Array.from({ length: seeds }, (_, i) => simulate({ ...s, moves, seed: 50000 + i })));
const patch = {};
const only = process.env.ROWS?.split(','), betas = process.env.BETAS ? process.env.BETAS.split(',').map(Number) : [1, 1.2, 1.4, 1.6, 1.8];
for (const s of scenarios().filter(x => (x.kind === 'boss' || x.encounter === 'boss') && (!only || only.includes(`${x.zone}:${x.size}`)))) {
  const row = ENCOUNTER_BALANCE[keyOf(s)][s.size], base = { atk: row.atk, atkLow: row.atkLow, atkHigh: row.atkHigh };
  const set = (m, bossHp, addsHp) => { row.atk = base.atk * m; if (base.atkLow != null) row.atkLow = base.atkLow * m; if (base.atkHigh != null) row.atkHigh = base.atkHigh * m; row.bossHp = bossHp; row.addsHp = addsHp; };
  set(1, 1, 1);
  const first = simulate({ ...s, moves: false, seed: 50000 }).initial, hb = first.find(f => f.boss).hp, ha = first.filter(f => !f.boss).reduce((a, f) => a + f.hp, 0);
  const want = target(s); let chosen = null;
  for (const beta of betas) {
    const adds = ha > 0 ? Math.max(.5, (hb + ha - beta * hb) / ha) : 1;
    let lo = .3, hi = 1.8, best = { err: 1e9 };
    for (let step = 0; step < 6; step++) {
      const m = (lo + hi) / 2; set(m, beta, adds);
      const res = run(s), r = res.reduce((a, rs) => a + 100 * rs.filter(x => x.result === 'win').length / seeds, 0) / 2, err = Math.abs(r - want);
      const two = Math.min(...res.map(rs => 100 * rs.filter(x => x.ultimates >= 2).length / seeds));
      if (err < best.err) best = { m, err, r, two, beta, adds };
      if (r > want) lo = m; else hi = m;
    }
    chosen = best; if (best.two >= 80 && best.err <= 4) break;
  }
  set(1, 1, 1);
  (patch[keyOf(s)] ||= {})[s.size] = [+chosen.beta.toFixed(2), +chosen.adds.toFixed(2), +chosen.m.toFixed(2)];
  console.log(JSON.stringify({ key: keyOf(s), size: s.size, want: +want.toFixed(1), got: +chosen.r.toFixed(1), twoPlus: chosen.two, bossHp: chosen.beta, addsHp: +chosen.adds.toFixed(2), atkMul: +chosen.m.toFixed(2) }));
}
writeFileSync(dir + (only ? 'fit-boss-part.json' : 'fit-boss.json'), JSON.stringify(patch, null, 2) + '\n');
