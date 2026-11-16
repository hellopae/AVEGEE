// T1b (owner 16 Nov): make the story fights harder after F3.  For every boss / event / breach / final fight of BOSS-SKILLS set A and every team size it finds the multiplier of the
// foe's blow (src/foe-turn-fit.js) that gives a target win %, reading the "before" numbers from a sweep (jsonl of `sim-boss-skills.mjs <key> N <sizes> both`).
//   * a fight whose first try (L = no trained moves) is above the plan's lower bound by more than 2 points: L drops by DROP (10), but never below  bound + 1.5
//   * a fight that is already at / under the lower bound: L must NOT get harder; the fully trained run (T) drops by DROP_T (6.5) instead  (L stays where it was, give or take the sim noise)
// usage: node scripts/fit-t1b-harder.mjs <before.jsonl> <scenario,scenario|all> [seeds=300] [out.json]   (seeds 50000+; the checks use 30000+)
import { readFileSync, writeFileSync } from 'node:fs';
import { simulate, setup } from './sim-balance2.mjs';
import { SCENARIOS } from './sim-boss-skills.mjs';
import { FOE_TURN_FIT, FOE_HP_FIT } from '../src/foe-turn-fit.js';
const [beforeFile, which = 'all', n = '300', outFile] = process.argv.slice(2), N = Number(n);
const DROP = Number(process.env.DROP || 10), DROP_T = Number(process.env.DROP_T || 6.5), MARGIN = Number(process.env.MARGIN || 1.5);
const before = {}; for (const l of readFileSync(beforeFile, 'utf8').split('\n')) if (l.startsWith('{')) { const r = JSON.parse(l); before[`${r.key}/${r.size}/${r.mode}`] = r.winPct; }
const keys = which === 'all' ? Object.keys(SCENARIOS) : which.split(',');
function fitKeyOf(k) {
  const s = SCENARIOS[k];
  if (s.kind === 'boss') return s.zone === 'th' ? 'thBorderBoss' : `boss:${s.zone}`;
  if (s.kind === 'final') return `cyberFinal:${s.encounter}`;
  if (s.kind === 'breach') return { thBreach:'frontierBreach', asiaBreach:'asiaRageBreach', westBreach:'westVampireBreach', cyberBreach:'cyberBreach' }[k];
  return s.eventKey;
}
const run = (opt, size, moves, seed) => { try { return opt.kind === 'signal' ? simulate({ ...opt, kind:'event', fullBreach:true, size, moves, seed }) : simulate({ ...opt, size, moves, seed }); } catch (e) { return { result:'error' }; } };
const out = {}, report = [];
const interp = (known, size, field) => { const have = Object.keys(known).map(Number).sort((a, b) => a - b), a = have.filter(x => x <= size).at(-1), b = have.find(x => x >= size); if (a == null) return known[b][field]; if (b == null || a === b) return known[a][field]; const u = (size - a) / (b - a); return Math.exp(Math.log(known[a][field]) * (1 - u) + Math.log(known[b][field]) * u); };
for (const key of keys) {
  const sc = SCENARIOS[key]; if (!sc) continue;
  const { target, label, ...opt } = sc, fitKey = fitKeyOf(key), sizes = [...new Set(Object.keys(before).filter(k => k.startsWith(key + '/')).map(k => +k.split('/')[1]))].sort();
  const done = {}; delete FOE_TURN_FIT[fitKey]; delete FOE_HP_FIT[fitKey];   // start this fight from a clean row
  for (const size of sizes) {
    let probe; try { probe = setup(opt.kind === 'signal' ? { ...opt, kind:'event', fullBreach:true, size, moves:false, seed:1 } : { ...opt, size, moves:false, seed:1 }); } catch (e) { continue; }   // a size the team cannot have in this zone
    const actors = Math.max(3, Math.min(7, probe.battleActors().length));
    const bl = before[`${key}/${size}/locked`], bt = before[`${key}/${size}/unlocked`], floor = target[0];
    // th breach / signal: the gate keeper joins the team mid-fight, so the fight is met at `actors` and `actors + 1`
    const keys = opt.zone === 'th' && (opt.kind === 'breach' || opt.kind === 'signal') ? [actors, Math.min(7, actors + 1)] : [actors];
    // locked  = the first try is inside the plan's band: it drops by DROP (not below the band + margin), the trained run falls where it falls
    // two     = the first try is below the band but not hopeless (> 8 %): it must NOT get harder (hold it with the blow), the trained run drops DROP_T (with the foe's HP)
    // unlocked = the first try is hopeless anyway (<= 8 %): only the trained run is fitted (blow)
    const mode = bl >= floor ? 'locked' : bl > 8 ? 'two' : 'unlocked';
    const wantL = mode === 'locked' ? Math.max(bl - DROP, floor + MARGIN) : bl, wantT = Math.max(0, bt - DROP_T), want = mode === 'unlocked' ? wantT : wantL;
    // the team can shrink during the fight (allies fall), so every key from the smallest fitted size up to this one is set: the ones in between are interpolated the way apply-t1b-fit.mjs will write them
    let curM = 1, curH = 1;
    const put = () => { const kn = { ...done, [size]:{ mult:curM, hp:curH } }; for (let k = Math.min(...keys, ...Object.keys(kn).map(Number)); k <= Math.max(...keys); k++) { (FOE_TURN_FIT[fitKey] ||= {})[Math.min(7, k)] = interp(kn, k, 'mult'); (FOE_HP_FIT[fitKey] ||= {})[Math.min(7, k)] = interp(kn, k, 'hp'); } };
    const setM = m => { curM = m; put(); };
    const setH = h => { curH = h; put(); };
    const rate = (md) => 100 * Array.from({ length:N }, (_, i) => run(opt, size, md === 'unlocked', 50000 + i)).filter(r => r.result === 'win').length / N;
    const bisect = (f, target, lo0, hi0, it) => { let lo = lo0, hi = hi0; for (let i = 0; i < it; i++) { const mid = Math.sqrt(lo * hi); if (f(mid) > target) lo = mid; else hi = mid; } return Math.sqrt(lo * hi); };   // f falls as the argument rises
    let mult = 1, hpm = 1;
    const fitM = (md, t, it = 9) => bisect(m => { setM(m); return rate(md); }, t, .3, 3.5, it);
    if (mode === 'locked') { if (want > 1 && want < 99) mult = fitM('locked', wantL); }
    else if (mode === 'unlocked') { if (want > 1 && want < 99) mult = fitM('unlocked', wantT); }
    else {   // two knobs: for each HP step the blow that holds the first try, then the HP step whose trained rate is nearest to the target (the surface is jagged - a grid, not a bisection)
      let best = null;
      for (const h of [1, 1.05, 1.1, 1.15, 1.2, 1.3, 1.45]) {
        setH(h); const m = fitM('locked', wantL, 9); setM(m); const t = rate('unlocked'), l = rate('locked');
        const cost = Math.abs(t - wantT) + 0.5 * Math.max(0, wantL - l - 3);
        if (!best || cost < best.cost) best = { h, m, cost };
      }
      hpm = best.h; mult = best.m;
    }
    mult = +mult.toFixed(3); hpm = +hpm.toFixed(3); setM(mult); setH(hpm);
    done[size] = { mult, hp:hpm };
    (out[fitKey] ||= {}); for (const k of keys) out[fitKey][k] = { mult, hp:hpm };
    const row = { key, size, actors, keys, fitKey, mode, bl, bt, want:+want.toFixed(1), wantT:+wantT.toFixed(1), mult, hp:hpm, gotL:+rate('locked').toFixed(1), gotT:+rate('unlocked').toFixed(1) };
    report.push(row); console.log(JSON.stringify(row));
  }
}
if (outFile) writeFileSync(outFile, JSON.stringify({ table:out, report }, null, 1));
