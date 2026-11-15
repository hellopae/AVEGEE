// BOSS-SKILLS set A: scan hp x atk multipliers of one boss fight and print win % / length (no source edit).
// usage: node scripts/fit-boss-skills.mjs <scenario> <hpMuls,..> <atkMuls,..> [size=3] [mode=locked] [seeds=100]
//   the multipliers are applied to the boss entry in data.js (hp, atk) - for the zone bosses of Asia / West (built in game.js) to the ENCOUNTER_BALANCE row of that size.
import { SCENARIOS, entryOf, measure } from './sim-boss-skills.mjs';
import { ENCOUNTER_BALANCE } from '../src/encounter-balance.js';
const [key, hl = '1', al = '1', sz = '3', mode = 'locked', n = '100'] = process.argv.slice(2);
const size = Number(sz), enc = { asiaBoss:'asia:boss', westBoss:'west:boss', thBoss:null }[key];
const target = enc ? ENCOUNTER_BALANCE[enc][size] : null;
const entry = entryOf[key]?.();
const base = target ? { hp:target.hp, atk:target.atk, atkLow:target.atkLow, atkHigh:target.atkHigh } : entry ? { hp:entry.hp, atk:structuredClone(entry.atk) } : null;
if (!base) throw Error('no entry for ' + key);
for (const hm of hl.split(',').map(Number)) for (const am of al.split(',').map(Number)) {
  if (target) { target.hp = +(base.hp * hm).toFixed(3); target.atk = +(base.atk * am).toFixed(3); if (base.atkLow != null) { target.atkLow = base.atkLow * am; target.atkHigh = base.atkHigh * am; } }
  else { entry.hp = Math.round(base.hp * hm); entry.atk = base.atk.map(v => Math.round(v * am)); }
  const [r] = measure(key, { count:Number(n), sizes:[size], modes:[mode] });
  console.log(`${key} hp x${hm} atk x${am} -> hp ${target ? target.hp : entry.hp} atk ${target ? target.atk : entry.atk} | win ${r.winPct}% rounds ${r.rounds} (win ${r.winRounds}) skills ${r.skillUses} err ${r.errors}`);
}
