// F3 (15 Nov 2026): fine-tuning of the foe's blow for the new turn rule (battle-turns.js: the enemy side acts as often as the team, each ordinary blow 1/n of before).
// The rule keeps a foe's damage PER ROUND, but a fight is not only that: the blows spread over more of the team, a boss reaches its moves at other HP, a bigger team gets more
// turns in between.  scripts/fit-foe-turns.mjs measured every boss / event / breach / final fight of BOSS-SKILLS set A at every team size (3-7) and found, per fight and team size,
// the multiplier of the foe's blow that gives back the first-try + trained win % the fight had before the rule (the mean of the two).  1 = nothing to correct.
// Team size 3 is NOT in this table: the plan measures the first try at 3 (L3) and those rows are fitted through the boss's own atk in data.js / signal-arc.js.
// key = `boss:<zone>` for a zone boss, else the event key (+ `:<encounter>` of the final waves); inner key = allies standing (Yama counts), clamped to 3..7.
// Ordinary border fights ('frontier') are fitted in encounter-balance.js instead; a fight that is not listed is not corrected.
export const FOE_TURN_FIT = {
  "asiaGuardTest": {4:0.774,5:0.767},
  "asiaRageBreach": {4:1.138,5:1.227},
  "asiaWukong": {4:0.848,5:0.877},
  "boss:asia": {4:0.841,5:0.892},
  "boss:west": {4:0.87,5:0.93,6:0.877},
  "cyberBreach": {5:1.082,6:0.841,7:0.793},
  "cyberFinal:boss": {5:0.995,6:0.856,7:0.814},
  "cyberFinal:ruler:asia": {4:0.923,5:0.93,6:0.885,7:0.814},
  "cyberFinal:ruler:cyberhell": {4:1.046,6:0.978},
  "cyberFinal:ruler:th": {4:1.038,5:0.8,6:0.946,7:0.915},
  "cyberFinal:ruler:west": {4:0.9,5:1.073},
  "cyberRescue": {4:1.369},
  "cyberSignal": {6:1.187,7:0.834},
  "signalAsia": {4:1.129,5:0.923},
  "signalWest": {6:1.177},
  "thBorderBoss": {4:0.863},
  "westDevaTest": {6:1.238},
  "westVampireBreach": {4:1.082,5:1.064},
};
export const fightFitKey = b => !b ? null : b.kind === 'zoneBoss' ? `boss:${b.zone}` : (b.kind === 'zoneEvent' || b.kind === 'frontierBreach') && b.eventKey ? `${b.eventKey}${b.encounter ? ':' + b.encounter : ''}` : null;
export const foeFit = (b, allies) => FOE_TURN_FIT[fightFitKey(b)]?.[Math.max(3, Math.min(7, allies || 3))] ?? 1;
