// QUEST-REWARDS: fit HP_PER_PARTY (src/quest-fights.js) so the first attempt (no quest ultimate, no trained moves) wins about TARGET of the time at every party size 4-7.
// usage: node scripts/fit-quest-fights.mjs [seeds=120] — prints the two tables to paste into quest-fights.js. Seeds 50000+ (same as sim-quest-fights.mjs).
import { HP_PER_PARTY, ATK_PER_PARTY } from '../src/quest-fights.js';
import { simulate } from './sim-quest-fights.mjs';
const count = Number(process.argv[2] || 120);
const TARGET = { sqGuard:92, sqKan:85, sqBoon:75 };
const rate = (id, size, hp, atk) => {
  HP_PER_PARTY[id][size] = hp; ATK_PER_PARTY[id][size] = atk;
  let wins = 0; for (let i = 0; i < count; i++) wins += simulate({ id, size, level:5, variant:'first', seed:50000 + i, privateOpened:i % 5 === 0 }).result === 'win';
  return 100 * wins / count;
};
const HP0 = JSON.parse(JSON.stringify(HP_PER_PARTY));   // the HP shape in quest-fights.js is kept as it is
const out = { hp:{}, atk:{} };
for (const id of Object.keys(TARGET)) { out.hp[id] = {}; out.atk[id] = {};
  for (const size of [4, 5, 6, 7]) {
    // HP follows the party (more allies = more damage dealt, so more HP) at the shape fitted before; ATK is what is bisected here (win rate falls as ATK rises)
    const hp = HP0[id][size];
    let lo = 0.3, hi = 4;
    for (let k = 0; k < 13; k++) { const mid = (lo + hi) / 2; if (rate(id, size, hp, mid) > TARGET[id]) lo = mid; else hi = mid; }
    const atk = +((lo + hi) / 2).toFixed(2); out.hp[id][size] = hp; out.atk[id][size] = atk;
    console.error(id, size, 'hp x', hp, 'atk x', atk, 'win', rate(id, size, hp, atk).toFixed(1));
  } }
console.log('export const HP_PER_PARTY =', JSON.stringify(out.hp), ';');
console.log('export const ATK_PER_PARTY =', JSON.stringify(out.atk), ';');
