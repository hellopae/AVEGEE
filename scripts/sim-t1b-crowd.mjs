// T1b: win % / length of the wandering ghosts (mob) and resisting spirits (soul) per zone and team size, first try (L) and trained (T).  Seeds 30000+ (the fit uses 50000+).
// usage: node scripts/sim-t1b-crowd.mjs [seeds=500] [mob,soul]    (BEFORE: run the same file against the commit before T1b - the foes had no moves and no rows)
import { simulate } from './sim-balance2.mjs';
const N = Number(process.argv[2] || 500), kinds = (process.argv[3] || 'mob,soul').split(',');
const ZS = [['th', [1, 2, 3, 4]], ['asia', [2, 3, 4, 5]], ['west', [3, 4, 5, 6]], ['cyberhell', [4, 5, 6, 7]]];
for (const kind of kinds) for (const [zone, sizes] of ZS) for (const size of sizes) {
  const cell = moves => { const rs = Array.from({ length:N }, (_, i) => { try { return simulate({ zone, size, kind, moves, seed:30000 + i }); } catch (e) { return { result:'error', msg:e.message }; } });
    const w = rs.filter(r => r.result === 'win'); return { win:+(100 * w.length / N).toFixed(1), rounds:+(rs.reduce((a, r) => a + (r.rounds || 0), 0) / N).toFixed(2), skills:+(rs.reduce((a, r) => a + (r.skillUses || 0), 0) / N).toFixed(2), err:rs.find(r => r.result === 'error')?.msg }; };
  const L = cell(false), T = cell(true);
  console.log(JSON.stringify({ kind, zone, size, L:L.win, T:T.win, rounds:L.rounds, skills:L.skills, ...(L.err ? { err:L.err } : {}) }));
}
