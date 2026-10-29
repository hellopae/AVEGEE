// BALANCE-2 enemy HP/ATK multipliers by whole party size; measured scope: balance.md.
// atkLow/atkHigh override the endpoint multipliers when the ordinary fight needs wider variance.
// Applied once to new waves; basic damage formulas and saved ongoing waves remain unchanged.
export const ENCOUNTER_BALANCE = {
  "west:hypnosis": {"3":{"hp":0.25,"atk":0.25},"4":{"hp":0.25,"atk":0.25},"5":{"hp":0.25,"atk":0.25},"6":{"hp":0.25,"atk":0.25}},
  "th:frontier": {"3":{"hp":3.6,"atk":2.91}},
  "th:breach": {"3":{"hp":1.5,"atk":1.8}},
  "th:boss": {"3":{"hp":0.55,"atk":1.11},"4":{"hp":1,"atk":1.04}},
  "asia:frontier": {"3":{"hp":2,"atk":4.59},"4":{"hp":2,"atk":4.53},"5":{"hp":3.4,"atk":2.45}},
  "asia:breach": {"3":{"hp":2,"atk":1.89},"4":{"hp":3,"atk":1.71},"5":{"hp":2,"atk":1.52}},
  "asia:boss": {"3":{"hp":1.5,"atk":0.87},"4":{"hp":1.5,"atk":1.05},"5":{"hp":1.65,"atk":0.96}},
  "west:frontier": {"3":{"hp":2,"atk":4.53},"4":{"hp":2,"atk":4.53},"5":{"hp":2.5,"atk":2.15,"atkLow":0.32,"atkHigh":3.87},"6":{"hp":2.5,"atk":3.83}},
  "west:breach": {"3":{"hp":1.5,"atk":1.98},"4":{"hp":2,"atk":1.98},"5":{"hp":2,"atk":1.43},"6":{"hp":2,"atk":1.71}},
  "west:boss": {"3":{"hp":0.65,"atk":1.17},"4":{"hp":1,"atk":1.05},"5":{"hp":1,"atk":0.93},"6":{"hp":1.27,"atk":0.84}},
  "cyberhell:frontier": {"3":{"hp":2,"atk":4.53},"4":{"hp":2,"atk":4.53},"5":{"hp":2.5,"atk":2.15,"atkLow":0.32,"atkHigh":3.87},"6":{"hp":1.53,"atk":4.34},"7":{"hp":2.5,"atk":2.64}},
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
};
export function encounterBalanceKey(battle, profile) {
  const phase = battle.eventKey === 'westVampireBreach' && battle.wave === 3 ? 'hypnosis'
    : profile.kind === 'breach' && !battle.foes.some(foe => foe.boss) ? 'breachApproach'
    : battle.encounter || profile.kind;
  return `${battle.zone}:${phase}`;
}
