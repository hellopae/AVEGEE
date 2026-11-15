// BOSS-SKILLS set A: for a fixed hp multiplier find the atk multiplier that gives a wanted win % (bisection on the production sim).  No source edit.
// usage: node scripts/solve-boss-skills.mjs <scenario> <hpMul> <winTarget> [size=3] [mode=locked] [seeds=120]
import { entryOf, measure } from './sim-boss-skills.mjs';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
const [key, hm = '1', want = '70', sz = '3', mode = 'locked', n = '120'] = process.argv.slice(2);
// PS=atk|hp : solve the party-size curve instead (entry.partyScale.<atk|hp>[0] for size 3, [1] for size 4-5, [2] for size 6-7; for hp the bisection runs on the multiplier too; the size-3 numbers of the entry stay as they are)
const PS_ON = !!process.env.PS, PS = Number(sz) <= 3 ? 0 : Number(sz) <= 5 ? 1 : 2;
const size = Number(sz), enc = { asiaBoss:'asia:boss', westBoss:'west:boss' }[key];
const target = enc ? ENCOUNTER_BALANCE[enc][size] : null, entry = entryOf[key]?.();
const base = target ? { hp:target.hp, atk:target.atk, atkLow:target.atkLow, atkHigh:target.atkHigh } : { hp:entry.hp, atk:structuredClone(entry.atk) };
const set = (h, a) => { if (PS_ON) { const e = entry; e.partyScale = { hp:[...(e.partyScale?.hp || [1, 1, 1])], atk:[...(e.partyScale?.atk || [1, 1, 1])] }; e.partyScale[process.env.PS === 'hp' ? 'hp' : 'atk'][PS] = +a.toFixed(3); return; } if (target) { target.hp = +(base.hp * h).toFixed(3); target.atk = +(base.atk * a).toFixed(3); if (base.atkLow != null) { target.atkLow = base.atkLow * a; target.atkHigh = base.atkHigh * a; } }
  else { entry.hp = Math.round(base.hp * h); entry.atk = base.atk.map(v => Math.max(1, Math.round(v * a))); } };
const run = a => { set(Number(hm), a); return measure(key, { count:Number(n), sizes:[size], modes:[mode] })[0]; };
let lo = .2, hi = 6, best = null;
for (let i = 0; i < 9; i++) { const mid = Math.sqrt(lo * hi), r = run(mid); best = { a:mid, r }; if (r.winPct > Number(want)) lo = mid; else hi = mid; }
const r = run(best.a);
console.log(PS_ON ? `${key} partyScale.${process.env.PS === 'hp' ? 'hp' : 'atk'}[${PS}] = ${best.a.toFixed(2)} | ${mode} size ${size}: win ${r.winPct}% rounds ${r.rounds} skills ${r.skillUses}` : `${key} hp x${hm} -> atk x${best.a.toFixed(2)} | hp ${target ? target.hp : entry.hp} atk ${target ? target.atk : entry.atk} | ${mode} size ${size}: win ${r.winPct}% rounds ${r.rounds} (win ${r.winRounds}) boss-rounds ${r.bossRounds} skills ${r.skillUses}`);
