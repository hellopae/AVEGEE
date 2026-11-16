// T1b (owner 16 Nov): fit the `<zone>:mob` and `<zone>:soul` rows of encounter-balance.js (hp / atk by team size) for the wandering ghosts and the resisting spirits.
//   goal: the first try (L, no trained moves) wins WANT_L % (default 88, inside the owner's 85-95 band) and the fight lasts about ROUNDS rounds (default 5 mob / 6 soul) so the
//   group move / heavy blow of CROWD_SKILLS are really met.  HP is bisected on the length of the won fights, ATK on the win %, twice (they depend on each other).
// usage: node scripts/fit-t1b-crowd.mjs <mob|soul> <zone> [seeds=300] [sizes]   -> one JSON line per size + the rows to paste
import { simulate } from './sim-balance2.mjs';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
const [kind, zone, n = '300', sz] = process.argv.slice(2), N = Number(n);
const SIZES = { th:[1, 2, 3, 4], asia:[2, 3, 4, 5], west:[3, 4, 5, 6], cyberhell:[4, 5, 6, 7] };
const WANT = Number(process.env.WANT_L || 88), ROUNDS = Number(process.env.ROUNDS || (kind === 'mob' ? 5 : 6));
const sizes = sz ? sz.split(',').map(Number) : SIZES[zone], key = `${zone}:${kind}`;
const row = (ENCOUNTER_BALANCE[key] ||= {});
const run = (size, moves, i) => { try { return simulate({ zone, size, kind, moves, seed:50000 + i }); } catch (e) { return { result:'error', msg:e.message }; } };
const stats = (size, moves) => { const rs = Array.from({ length:N }, (_, i) => run(size, moves, i)), w = rs.filter(r => r.result === 'win'), err = rs.find(r => r.result === 'error');
  if (err) throw Error(`${key}/${size}: ${err.msg}`);
  return { win:100 * w.length / N, rounds:w.length ? w.reduce((a, r) => a + r.rounds, 0) / w.length : 99, skills:rs.reduce((a, r) => a + (r.skillUses || 0), 0) / N }; };
const bis = (f, target, lo, hi, it = 9) => { for (let i = 0; i < it; i++) { const mid = Math.sqrt(lo * hi); if (f(mid) > target) lo = mid; else hi = mid; } return Math.sqrt(lo * hi); };   // f falls as the argument rises
const out = {};
for (const size of sizes) {
  const r = row[size] = { hp:1, atk:1 };
  for (let pass = 0; pass < 2; pass++) {
    r.hp = bis(h => { r.hp = h; return -stats(size, false).rounds; }, -ROUNDS, .5, 40, 8);   // rounds RISE with hp: negate so f falls as hp rises
    r.atk = bis(a => { r.atk = a; return stats(size, false).win; }, WANT, .05, 12, 9);
  }
  r.hp = +r.hp.toFixed(2); r.atk = +r.atk.toFixed(2);
  const L = stats(size, false), T = stats(size, true);
  out[size] = { hp:r.hp, atk:r.atk };
  console.log(JSON.stringify({ kind, zone, size, hp:r.hp, atk:r.atk, L:+L.win.toFixed(1), T:+T.win.toFixed(1), rounds:+L.rounds.toFixed(1), skillUses:+L.skills.toFixed(2) }));
}
console.log('ROW ' + JSON.stringify({ [key]: out }));
