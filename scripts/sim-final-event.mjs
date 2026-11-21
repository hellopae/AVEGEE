// Run paired, seeded trials of the current CyberHell finale one encounter at a time.
import { writeFileSync } from 'node:fs';
import { MINION_WAVES, RULER_ORDER } from '../src/final-event.js';
import { simulate } from './sim-balance2.mjs';

const encounters = [
  ...Array.from({ length:MINION_WAVES }, (_, index) => `minion:${index + 1}`),
  ...RULER_ORDER.map(zone => `ruler:${zone}`),
  'boss',
];
const seeds = Array.from({ length:100 }, (_, index) => 2800 + index);
const mean = (trials, key) => Number(
  (trials.reduce((total, trial) => total + trial[key], 0) / trials.length).toFixed(2),
);

const rows = [];
for (const encounter of encounters) {
  for (const size of [3, 5, 7]) {
    for (const moves of [false, true]) {
      const scenario = { zone:'cyberhell', kind:'final', encounter, size, moves };
      const trials = seeds.map(seed => simulate({ ...scenario, seed }));
      const outcomes = { win:0, lose:0, timeout:0 };
      for (const trial of trials) outcomes[trial.result]++;
      rows.push({
        encounter,
        partySize:size,
        trainedSkills:moves,
        samples:trials.length,
        ...outcomes,
        meanRounds:mean(trials, 'rounds'),
        meanHeroHp:mean(trials, 'heroHp'),
        meanFallen:mean(trials, 'fallen'),
      });
    }
  }
}

const result = {
  method:'Seeds 2800–2899 are identical across configurations. Level 5 and the BALANCE-2 party order and item policy. Each encounter starts with fresh HP, MP, morale and items. Trained-skill trials include Team Judgment. Live foe composition and battle rules are used in both configurations.',
  rows,
};
const output = JSON.stringify(result, null, 2) + '\n';
if (process.argv[2]) writeFileSync(process.argv[2], output);
process.stdout.write(output);
