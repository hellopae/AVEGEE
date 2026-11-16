// F3 (15 Nov 2026): fine-tuning of the foe's blow for the new turn rule (battle-turns.js: the enemy side acts as often as the team, each ordinary blow 1/n of before).
// The rule keeps a foe's damage PER ROUND, but a fight is not only that: the blows spread over more of the team, a boss reaches its moves at other HP, a bigger team gets more
// turns in between.  scripts/fit-foe-turns.mjs measured every boss / event / breach / final fight of BOSS-SKILLS set A at every team size (3-7) and found, per fight and team size,
// the multiplier of the foe's blow that gives back the first-try + trained win % the fight had before the rule (the mean of the two).  1 = nothing to correct.
// T1b (16 Nov): the table was re-fitted for the harder rule (damageExp 0.8, owner's decision) - team size 3 IS in it now (it is fitted here, not through the boss's atk in data.js), every fight is fitted at 3 and at
// the biggest team of its zone, the sizes in between are interpolated by scripts/apply-t1b-fit.mjs.
// key = `boss:<zone>` for a zone boss, else the event key (+ `:<encounter>` of the final waves); inner key = allies standing (Yama counts), clamped to 3..7.
// Ordinary border fights ('frontier') are fitted in encounter-balance.js instead; a fight that is not listed is not corrected.
export const FOE_TURN_FIT = {
  "asiaDevaTest": {3:0.836,4:0.814,5:0.793,6:0.793,7:0.793},
  "asiaGuardTest": {3:0.902,4:0.844,5:0.789,6:0.789,7:0.789},
  "asiaRageBreach": {3:0.648,4:0.844,5:1.099,6:1.099,7:1.099},
  "asiaWukong": {3:0.96,4:0.913,5:0.868,6:0.868,7:0.868},
  "boss:asia": {3:1.042,4:0.949,5:0.864,6:0.864,7:0.864},
  "boss:west": {3:1.012,4:0.956,5:0.902,6:0.852,7:0.852},
  "cyberBreach": {3:0.58,4:0.594,5:0.609,6:0.624,7:0.639},
  "cyberFinal:boss": {3:1.032,4:0.955,5:0.883,6:0.817,7:0.756},
  "cyberFinal:ruler:asia": {3:1.032,4:0.922,5:0.823,6:0.736,7:0.657},
  "cyberFinal:ruler:cyberhell": {3:1.003,4:0.967,5:0.933,6:0.9,7:0.868},
  "cyberFinal:ruler:th": {3:0.974,4:0.92,5:0.868,6:0.82,7:0.774},
  "cyberFinal:ruler:west": {3:1.037,4:0.99,5:0.944,6:0.901,7:0.86},
  "cyberRescue": {3:0.929,4:0.908,5:0.888,6:0.868,7:0.848},
  "cyberSignal": {3:0.965,4:0.918,5:0.873,6:0.83,7:0.789},
  "devaTest": {3:0.832,4:0.832,5:0.832,6:0.832,7:0.832},
  "frontierBreach": {3:0.812,4:0.812,5:0.812,6:0.812,7:0.812},
  "signalAsia": {3:0.998,4:0.926,5:0.86,6:0.86,7:0.86},
  "signalTh": {3:0.933,4:0.933,5:0.933,6:0.933,7:0.933},
  "signalWest": {3:0.864,4:0.874,5:0.884,6:0.894,7:0.894},
  "sitaHanuman": {3:0.942,4:0.942,5:0.942,6:0.942,7:0.942},
  "thBorderBoss": {3:1.012,4:0.54,5:0.54,6:0.54,7:0.54},
  "westDevaTest": {3:0.907,4:0.939,5:0.973,6:1.008,7:1.008},
  "westVampireBreach": {3:0.881,4:0.881,5:0.881,6:0.881,7:0.881},
};
// T1b: the Thai border breach (kind 'frontierBreach') carries no eventKey of its own - it is the fight 'frontierBreach'
export const fightFitKey = b => !b ? null : b.kind === 'zoneBoss' ? `boss:${b.zone}` : (b.kind === 'zoneEvent' || b.kind === 'frontierBreach') && (b.eventKey || b.kind === 'frontierBreach') ? `${b.eventKey || 'frontierBreach'}${b.encounter ? ':' + b.encounter : ''}` : null;
export const foeFit = (b, allies) => FOE_TURN_FIT[fightFitKey(b)]?.[Math.max(3, Math.min(7, allies || 3))] ?? 1;

// T1b (16 Nov 2026): a SECOND correction for the few fights where the multiplier of the blow alone cannot give both the first-try and the trained win % the owner asked for
// (first try must not get harder, trained gets 5-8 points harder): the foe's HP.  key = same fight key, inner key = team size without the guide (what scaleEncounter counts),
// value = multiplier of the HP of every foe of the wave.  Fitted by scripts/fit-t1b-harder.mjs.
export const FOE_HP_FIT = {
  "asiaRageBreach": {3:1.45,4:1.204},
  "cyberBreach": {3:1.45,4:1.368,5:1.291,6:1.219,7:1.15},
  "thBorderBoss": {4:1.45,5:1.45,6:1.45,7:1.45},
};
export const foeHpFit = (b, allies) => FOE_HP_FIT[fightFitKey(b)]?.[Math.max(3, Math.min(7, allies || 3))] ?? 1;
