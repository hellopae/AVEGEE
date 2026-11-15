// F3: fit src/foe-turn-fit.js - for one boss / event / breach / final fight of BOSS-SKILLS set A, find per team size (3-7) the multiplier of the foe's blow that gives back
// the win % the fight had under the OLD turn rule (mean of the first-try = locked and the trained = unlocked runs).
// usage: node scripts/fit-foe-turns.mjs <scenario> <before.jsonl> [seeds=100] [sizes=3,4,5,6,7]
//   before.jsonl = output lines of `node scripts/sim-boss-skills.mjs all N 3,4,5,6,7 both` run on the tree WITHOUT the new rule (FOE_TURN_RATIO=0 gives the same numbers).
//   Fit seeds 50000+ (the before numbers and the check run use 30000+).  Prints  FIT <scenario> {"3":m,...}  and one JSON line per size.
import { readFileSync } from 'node:fs';
import { simulate } from './sim-balance2.mjs';
import { SCENARIOS } from './sim-boss-skills.mjs';
import { FOE_TURN_FIT, fightFitKey } from '../src/foe-turn-fit.js';
const [key, beforeFile, n = '100', sz = '3,4,5,6,7'] = process.argv.slice(2), N = Number(n), sizes = sz.split(',').map(Number);
const sc = SCENARIOS[key]; if (!sc) throw Error('unknown scenario ' + key);
const before = {}; for (const l of readFileSync(beforeFile, 'utf8').split('\n')) if (l.startsWith('{')) { const r = JSON.parse(l); before[`${r.key}/${r.size}/${r.mode}`] = r.winPct; }
const { target, label, ...opt } = sc;
const run = (size, moves, seed) => { try { return opt.kind === 'signal' ? simulate({ ...opt, kind:'event', fullBreach:true, size, moves, seed }) : simulate({ ...opt, size, moves, seed }); } catch (e) { return { result:'error' }; } };
// FIT_MODES=locked fits the first try alone (default: the mean of locked and unlocked)
const MODES = (process.env.FIT_MODES || 'locked,unlocked').split(',');
const rate = size => MODES.reduce((a, m) => a + 100 * Array.from({ length:N }, (_, i) => run(size, m === 'unlocked', 50000 + i)).filter(r => r.result === 'win').length / N, 0) / MODES.length;
const out = {};
for (const size of sizes) {
  const want = MODES.reduce((a, m) => a + before[`${key}/${size}/${m}`], 0) / MODES.length;
  const fitKey = SCENARIO_KEY(key);
  const set = m => { (FOE_TURN_FIT[fitKey] ||= {})[size] = +m.toFixed(3); };
  set(1); const untuned = rate(size);
  let m = 1;
  if (want > 2 && want < 98 && Math.abs(untuned - want) > 3) {
    let lo = .35, hi = 3;     // more blow = fewer wins
    for (let i = 0; i < 8; i++) { const mid = Math.sqrt(lo * hi); set(mid); if (rate(size) > want) lo = mid; else hi = mid; }
    m = Math.sqrt(lo * hi);
  }
  set(m); const got = rate(size); out[size] = +m.toFixed(3);
  console.log(JSON.stringify({ key, size, want:+want.toFixed(1), untuned:+untuned.toFixed(1), mult:out[size], got:+got.toFixed(1) }));
}
console.log('FIT ' + key + ' ' + JSON.stringify({ fitKey:SCENARIO_KEY(key), sizes:out }));
function SCENARIO_KEY(k) {
  const s = SCENARIOS[k];
  if (s.kind === 'boss') return s.zone === 'th' ? 'thBorderBoss' : `boss:${s.zone}`;   // the Thai zone boss is the elder brother's event fight, the others are zoneBoss battles
  if (s.kind === 'final') return `cyberFinal:${s.encounter}`;
  if (s.kind === 'breach') return { thBreach:'frontierBreach', asiaBreach:'asiaRageBreach', westBreach:'westVampireBreach', cyberBreach:'cyberBreach' }[k];
  return s.eventKey;
}
