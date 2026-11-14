// BOSS-SKILLS tuning helper: run one Zone 2 single-foe fight (asiaWukong | asiaGuardTest) with number overrides, no source edit.
// usage: node scripts/sim-z2-boss-tune.mjs <eventKey> '<json overrides>' [seeds=100]
//   overrides: { hp, atk:[lo,hi], partyScale:{ hp:[x3,x5,x7], atk:[x3,x5,x7] }, skills:{ <skillId>:{ power, when:{...}, summon:{ hp, atk, count, max } , warn } } }
import { simulate } from './sim-balance2.mjs';
import { ZONE_EVENTS } from '../src/data.js';
const [key, raw = '{}', n = '100'] = process.argv.slice(2), o = JSON.parse(raw), count = Number(n);
const ev = ZONE_EVENTS.asia.find(e => e.k === key), foe = ev.foe;
const base = structuredClone({ hp:foe.hp, atk:foe.atk, skills:foe.skills });
if (o.hp) foe.hp = o.hp; if (o.atk) foe.atk = o.atk; if (o.partyScale) foe.partyScale = o.partyScale;
foe.skills = structuredClone(base.skills);
for (const [id, patch] of Object.entries(o.skills || {})) { const sk = foe.skills.find(s => s.id === id); if (!sk) continue;
  for (const [k, v] of Object.entries(patch)) sk[k] = (v && typeof v === 'object' && !Array.isArray(v)) ? { ...sk[k], ...v } : v; }
if (o.noSkills) delete foe.skills;
for (const size of [3, 4, 5]) for (const moves of [false, true]) {
  const samples = Array.from({ length:count }, (_, i) => { try { return simulate({ zone:'asia', size, moves, kind:'event', eventKey:key, seed:30000 + i }); } catch (e) { return { result:'error', msg:e.message, rounds:0 }; } });
  const wins = samples.filter(r => r.result === 'win'), err = samples.filter(r => r.result === 'error');
  const mean = (set, k) => set.length ? +(set.reduce((a, r) => a + r[k], 0) / set.length).toFixed(2) : null;
  console.log(JSON.stringify({ size, moves:moves ? 'unlocked' : 'locked', winPct:+(100 * wins.length / count).toFixed(1), winRounds:mean(wins, 'rounds'), allRounds:mean(samples, 'rounds'), ultimates:mean(samples, 'ultimates'), heroHpLeft:mean(wins, 'heroHp'), errors:err.length, err:err[0]?.msg, timeouts:samples.filter(r => r.result === 'timeout').length }));
}
