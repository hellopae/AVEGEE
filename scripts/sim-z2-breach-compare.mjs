// Z2-FIXUP: case 11 (asiaRageBreach) - the old 3-wave line against the current 4-row line (3 waves + Akura), same seeds.
// usage: node scripts/sim-z2-breach-compare.mjs [seeds=200] [wave3 scale override e.g. 0.8]
import { simulate } from './sim-balance2.mjs';
import { ZONE_EVENTS } from '../src/data.js';
const count = Number(process.argv[2] || 200), scale = process.argv[3] ? Number(process.argv[3]) : null;
const ev = ZONE_EVENTS.asia.find(e => e.k === 'asiaRageBreach'), current = ev.waves.map(w => w.map(f => ({ ...f, atk:[...f.atk] })));
const old = [[{ kind:6, count:2, hp:48, atk:[8,13] }], [{ kind:7, count:2, hp:56, atk:[9,14] }], current.at(-1)];
const variants = { old3waves:old, current };
if (scale) variants[`wave3x${scale}`] = current.map((w, i) => i === 2 ? w.map(f => ({ ...f, hp:Math.round(f.hp * scale) })) : w);
for (const [name, waves] of Object.entries(variants)) {
  ev.waves = waves.map(w => w.map(f => ({ ...f, atk:[...f.atk] })));
  for (const size of [3, 4, 5]) for (const moves of [false, true]) {
    const samples = Array.from({ length:count }, (_, i) => simulate({ zone:'asia', size, moves, kind:'breach', seed:30000 + i }));
    const wins = samples.filter(r => r.result === 'win');
    const mean = (set, k) => set.length ? +(set.reduce((a, r) => a + r[k], 0) / set.length).toFixed(2) : null;
    console.log(JSON.stringify({ variant:name, size, moves:moves ? 'unlocked' : 'locked', winPct:+(100 * wins.length / count).toFixed(1), winRounds:mean(wins, 'rounds'), heroHpLeft:mean(wins, 'heroHp') }));
  }
}
