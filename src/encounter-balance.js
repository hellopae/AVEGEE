// T1b (16 Nov 2026): the :frontier rows' atk refitted again (scripts/fit-t1b-frontier.mjs) for the harder rule: the first try drops ~10 points but never below 70 %; a row already under 70 % keeps its first-try win %.
// (th:frontier is stored before the BATTLE_FX_FRONTIER_ATK x0.95 below: 2.79 x 0.95 = the 2.65 that gives ~72 %.)
// F3 (15 Nov 2026): the :frontier rows' atk was refitted (first try, locked: x0.9-1.9 of the old numbers) for the new turn rule (battle-turns.js: the enemy side acts as often as the team, each blow lighter) - same first-try win % as before.
// BALANCE-2 enemy HP/ATK multipliers by whole party size; measured scope: balance.md.
// atkLow/atkHigh override the endpoint multipliers when the ordinary fight needs wider variance.
// Applied once to new waves; basic damage formulas and saved ongoing waves remain unchanged.
export const ENCOUNTER_BALANCE = {
  "west:hypnosis": {"3":{"hp":0.25,"atk":0.25},"4":{"hp":0.25,"atk":0.25},"5":{"hp":0.25,"atk":0.25},"6":{"hp":0.25,"atk":0.25}},
  "th:frontier": {"3":{"hp":3.6,"atk":2.79}},
  "th:breach": {"3":{"hp":1.5,"atk":1.8}},
  "th:boss": {"3":{"hp":0.55,"atk":1.11},"4":{"hp":1,"atk":1.04}},
  "asia:frontier": {"3":{"hp":2,"atk":4.445},"4":{"hp":2,"atk":7.115},"5":{"hp":3.4,"atk":2.384}},
  "asia:breach": {"3":{"hp":2,"atk":1.89},"4":{"hp":3,"atk":1.71},"5":{"hp":2,"atk":1.52}},
  "asia:boss": {"3":{"hp":1.5,"atk":0.87},"4":{"hp":1.5,"atk":1.05},"5":{"hp":1.65,"atk":0.96}},
  "west:frontier": {"3":{"hp":2,"atk":4.452},"4":{"hp":2,"atk":6.011},"5":{"hp":2.5,"atk":2.477,"atkLow":0.369,"atkHigh":4.458},"6":{"hp":2.5,"atk":4.049}},
  "west:breach": {"3":{"hp":1.5,"atk":1.98},"4":{"hp":2,"atk":1.98},"5":{"hp":2,"atk":1.43},"6":{"hp":2,"atk":1.71}},
  "west:boss": {"3":{"hp":0.65,"atk":1.17},"4":{"hp":1,"atk":1.05},"5":{"hp":1,"atk":0.93},"6":{"hp":1.27,"atk":0.84}},
  "cyberhell:frontier": {"3":{"hp":2,"atk":4.424},"4":{"hp":2,"atk":5.807},"5":{"hp":2.5,"atk":2.299,"atkLow":0.342,"atkHigh":4.138},"6":{"hp":1.53,"atk":5.283},"7":{"hp":2.5,"atk":2.622}},
  "cyberhell:breach": {"3":{"hp":1.5,"atk":0.14},"4":{"hp":1.5,"atk":0.6},"5":{"hp":1.5,"atk":0.79},"6":{"hp":2,"atk":0.79},"7":{"hp":1.5,"atk":0.88}},
  "cyberhell:minion:1": {"3":{"hp":1.8,"atk":1.51},"4":{"hp":1.53,"atk":1.91},"5":{"hp":2,"atk":1.91},"6":{"hp":3,"atk":1.63},"7":{"hp":3,"atk":1.66}},
  "cyberhell:minion:2": {"3":{"hp":2,"atk":1.02,"atkLow":0.15,"atkHigh":1.83},"4":{"hp":2,"atk":1.06,"atkLow":0.16,"atkHigh":1.9},"5":{"hp":2,"atk":1.91},"6":{"hp":2,"atk":1.75},"7":{"hp":2,"atk":1.75}},
  "cyberhell:minion:3": {"3":{"hp":1.2,"atk":0.86,"atkLow":0.01,"atkHigh":2.31},"4":{"hp":2,"atk":1.08},"5":{"hp":2,"atk":1.6},"6":{"hp":2,"atk":1.6},"7":{"hp":2,"atk":1.67}},
  "cyberhell:minion:4": {"3":{"hp":3.95,"atk":0.42,"atkLow":0.06,"atkHigh":0.78},"4":{"hp":2,"atk":0.86,"atkLow":0.13,"atkHigh":1.55},"5":{"hp":2,"atk":1.29},"6":{"hp":4,"atk":0.89},"7":{"hp":3,"atk":1.29}},
  "cyberhell:ruler:th": {"3":{"hp":1.7,"atk":1.23},"4":{"hp":2,"atk":1.35},"5":{"hp":2.75,"atk":1.11},"6":{"hp":3.16,"atk":1.08},"7":{"hp":2.75,"atk":1.23}},
  "cyberhell:ruler:asia": {"3":{"hp":1.5,"atk":1.04},"4":{"hp":2,"atk":1.24},"5":{"hp":2,"atk":1.35},"6":{"hp":2.75,"atk":1.24},"7":{"hp":3.16,"atk":1.4}},
  "cyberhell:ruler:west": {"3":{"hp":1,"atk":1.17},"4":{"hp":1.5,"atk":1.11},"5":{"hp":1.5,"atk":1.11},"6":{"hp":2,"atk":1.11},"7":{"hp":2,"atk":1.35}},
  "cyberhell:ruler:cyberhell": {"3":{"hp":1,"atk":1.11},"4":{"hp":1,"atk":1.11},"5":{"hp":1.5,"atk":1.11},"6":{"hp":2,"atk":0.99},"7":{"hp":2,"atk":1.11}},
  "cyberhell:boss": {"3":{"hp":0.65,"atk":0.81},"4":{"hp":1,"atk":0.75},"5":{"hp":1.03,"atk":0.73},"6":{"hp":1.5,"atk":0.63},"7":{"hp":1.5,"atk":0.69}},
  // T1b (owner 16 Nov): the wandering ghosts (kind 'mob') and the resisting spirits (kind 'soul') - fitted by scripts/fit-t1b-crowd.mjs so the first try wins ~89 % (inside the owner's 85-95 band) and a fight lasts about 5 (mob) / 6 (soul) rounds
  // T1c (owner 18 Nov): zones 1-3 (th / asia / west) refitted to 3-4 rounds a fight (cyberhell, zone 4, keeps its longer 5 / 6 rounds) - same ~89 % first-try win, scripts/fit-t1b-crowd.mjs with ROUNDS=3.5
  // (team sizes a zone really has; any other size takes the nearest row, see party-balance.js).  hp / atk are multipliers of the foe's own numbers.
  "th:mob": {"1":{"hp":1.21,"atk":6.21},"2":{"hp":2.61,"atk":4.14},"3":{"hp":3.2,"atk":4.05},"4":{"hp":5.54,"atk":3.56}},
  "asia:mob": {"2":{"hp":2.94,"atk":3.92},"3":{"hp":3.37,"atk":4.27},"4":{"hp":5.93,"atk":3.45},"5":{"hp":7.54,"atk":3.76}},
  "west:mob": {"3":{"hp":3.31,"atk":3.96},"4":{"hp":5.93,"atk":3.34},"5":{"hp":7.67,"atk":3.34},"6":{"hp":9.42,"atk":3.64}},
  "cyberhell:mob": {"4":{"hp":8.64,"atk":2.06},"5":{"hp":10.62,"atk":2.18},"6":{"hp":13.04,"atk":2.27},"7":{"hp":13.26,"atk":2.56}},
  "th:soul": {"1":{"hp":0.84,"atk":3.92},"2":{"hp":1.85,"atk":1.98},"3":{"hp":2.16,"atk":2.18},"4":{"hp":3.74,"atk":2.35}},
  "asia:soul": {"2":{"hp":2.09,"atk":1.85},"3":{"hp":2.39,"atk":2.06},"4":{"hp":4,"atk":2.15},"5":{"hp":5.08,"atk":2.27}},
  "west:soul": {"3":{"hp":2.35,"atk":2.06},"4":{"hp":4,"atk":2.2},"5":{"hp":5,"atk":2.47},"6":{"hp":6.35,"atk":2.47}},
  "cyberhell:soul": {"4":{"hp":7.8,"atk":1.07},"5":{"hp":9.42,"atk":1.27},"6":{"hp":11.56,"atk":1.27},"7":{"hp":11.37,"atk":1.58}},
};
export function encounterBalanceKey(battle, profile) {
  const phase = battle.eventKey === 'westVampireBreach' && battle.wave === 3 ? 'hypnosis'
    : profile.kind === 'breach' && !battle.foes.some(foe => foe.boss) ? 'breachApproach'
    : battle.encounter || profile.kind;
  return `${battle.zone}:${phase}`;
}

// BATTLE-FX (10 Nov): the boss's cutscene move now fires on its 2nd, 4th, 6th ... attack (BOSS_ULTIMATE_RHYTHM, data.js).  That needs a boss that lives for at
// least four of its own turns, so these rows lengthen the boss's life and take the same fight length back from its attendants and its attack:
//   size: [bossHp x, addsHp x, atkMul x]  — multiplied on top of the BALANCE-2 numbers above (missing row = unchanged, the fit was within 0.05 of 1).
// Fitted by scripts/fit-battle-fx.mjs (seeds 50000+, goal: the previous win rate and the move seen twice in >= 80 % of fights; bossHp capped at 1.8).
// Cyberhell with 3-5 members is a what-if team (the real final boss is met with 7) so it keeps the milder 1.4.
export const BATTLE_FX_BOSS = {
  'th:boss': { 4: [1.2, 0.5, 0.82] },
  'asia:boss': { 4: [1.2, 0.5, 0.84], 5: [1.2, 0.5, 0.89] },
  'west:boss': { 3: [1.8, 0.5, 0.7], 4: [1.6, 0.5, 0.75], 5: [1.6, 0.5, 0.84], 6: [1.4, 0.5, 0.89] },
  'cyberhell:boss': { 3: [1.4, 0.62, 1.1], 4: [1.4, 0.52, 0.96], 5: [1.4, 0.5, 1.1], 6: [1.4, 0.5, 0.93], 7: [1.4, 0.5, 0.98] },
};
for (const [key, sizes] of Object.entries(BATTLE_FX_BOSS)) for (const [size, [bossHp, addsHp, atkMul]] of Object.entries(sizes)) {
  const row = ENCOUNTER_BALANCE[key][size];
  row.bossHp = bossHp; row.addsHp = addsHp;
  for (const field of ['atk', 'atkLow', 'atkHigh']) if (row[field] != null) row[field] = +(row[field] * atkMul).toFixed(2);
}

// BATTLE-FX (10 Nov): every border fight (kind 'frontier', all four zones) now has 1-3 demons, rolled when the fight starts.  Boss and story fights keep their own foes.
export const FRONTIER_FOE_COUNT = Object.freeze([[1, 0.30], [2, 0.45], [3, 0.25]]);   // [count, probability]; sums to 1
export function rollFrontierFoeCount(rand = Math.random) {
  let r = rand();
  for (const [count, p] of FRONTIER_FOE_COUNT) { if (r < p) return count; r -= p; }
  return FRONTIER_FOE_COUNT.at(-1)[0];
}
/** reward multiplier by number of demons (coin and EXP of the win) — more demons, more reward, but less than proportionally */
export const FRONTIER_REWARD_SCALE = Object.freeze({ 1: 1, 2: 1.25, 3: 1.5 });
/** The table above was fitted for the old foe count, which grew with the party: 1 + floor((size - 3) / 2).  With a rolled count the same total strength is
 *  shared out: r = old / rolled, HP per demon x r^hpExp, ATK per demon x r^atkExp (hpExp 1 = same total HP; atkExp < 1 = few big demons hit a bit softer
 *  than the old total, many small ones a bit harder, because a swarm loses damage as demons fall).  Fitted by scripts/sim-battle-fx.mjs. */
export const FRONTIER_SPLIT = { hpExp: 1, atkExp: 0.5 };   // plain object so scripts/fit-frontier-split.mjs can try values; nothing else writes to it
export const legacyFrontierFoes = size => 1 + Math.floor((Math.max(3, Math.min(7, size)) - 3) / 2);
export function frontierSplit(size, count) {
  const r = legacyFrontierFoes(size) / Math.max(1, count);
  return { hp: r ** FRONTIER_SPLIT.hpExp, atk: r ** FRONTIER_SPLIT.atkExp };
}
// The Thai border (party of 3 only) came out ~10 points harder with 1-3 demons than with the old single one: ATK x0.95 brings it back (fit: seeds 50000+, 300 per state).
export const BATTLE_FX_FRONTIER_ATK = { 'th:frontier': { 3: 0.95 } };
for (const [key, sizes] of Object.entries(BATTLE_FX_FRONTIER_ATK)) for (const [size, m] of Object.entries(sizes)) {
  const row = ENCOUNTER_BALANCE[key][size];
  for (const field of ['atk', 'atkLow', 'atkHigh']) if (row[field] != null) row[field] = +(row[field] * m).toFixed(2);
}

// BOSS-SKILLS set A (15 Nov): the zone bosses of Asia and West (Lian Gang / Severin, built in game.js startZoneBoss) got warned moves that replace the old unwarned cutscene rhythm;
// the owner wants them harder.  Final rows per team size (hp / atk multipliers incl. the BATTLE-FX split above), fitted one size at a time by scripts/solve-boss-skills.mjs on the
// production sim: the trained team (all moves unlocked) wins ~70-82 %, the fight lasts 6-7 rounds.  (Before: 86-96 % trained, 2-4 rounds of the old rhythm.)
export const BOSS_SKILLS_ROWS = Object.freeze({
  'asia:boss': { 3:{ hp:1.95, atk:.739 }, 4:{ hp:1.95, atk:.889 }, 5:{ hp:2.145, atk:.825 } },
  'west:boss': { 3:{ hp:.845, atk:.737 }, 4:{ hp:1.3, atk:.745 }, 5:{ hp:1.3, atk:.739 }, 6:{ hp:1.651, atk:.769 } },
});
for (const [key, sizes] of Object.entries(BOSS_SKILLS_ROWS)) for (const [size, v] of Object.entries(sizes)) Object.assign(ENCOUNTER_BALANCE[key][size], v);
