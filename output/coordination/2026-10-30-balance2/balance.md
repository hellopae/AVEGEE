# BALANCE-2 — 30 October 2026

Simulation evidence, not browser QA or human-player win probabilities.

## Method and boundaries

- Both revisions: 200 paired seeds (30000–30199) per case. Before is C1 as checked out for this task; after applies only the enemy table. Both contain separate locked/unlocked personal moves and team ultimate states. The before mode disables only ENCOUNTER_BALANCE; it does not copy any combat formula.
- Calls production createGame, effective ally stats, encounter construction, beginBattleTurns, confirmBattleCommand, runEnemyTurn and finishBattleCommand. Real HP/MP, morale, shields, death/absence, cooldowns and enemy targeting remain enabled. No damage-only shortcut or zeroed enemy ATK.
- Levels 2/3/4/5 by zone, training level 1 (the two 60/80 sessions award 50 EXP, below the level-2 threshold 60), full initial HP/MP and morale 100, no equipment/fire-control/stat upgrades. Each encounter starts with ceil(team size/2) medkits and holy waters. One active second passes per command; wall clock is frozen, so map recovery cannot silently revive allies.
- Policy: medkit at >=45 missing HP; Nira/Boon heal at >=20; MP refill below 24; available new move, one fire per encounter, then basic attacks. Boss first. This conservative policy intentionally matches the C1 comparison; it does not represent optimal play, waiting out cooldowns or every older Yama ability.
- Teams 3 = Yama/Nira/Taan; 4 adds Guard only after the Thai breach. Teams 5/6/7 provisionally add Dam/Plerng/Boon, using HIRE_PLAN after the mandatory Guard. BACKLOG.md in this checkout has 25 lines and no PARTY-01. This order is an explicit unresolved assumption, not a confirmed design decision. No party-cap override is used. Early-zone unlocked personal-move variants are counterfactual sensitivity checks; they do not claim the required training buildings are available at those early milestones. Smaller teams remain selected after later zones unlock more slots.
- Frontier samples use ordinary border wave 1. Breach samples run the complete production sequence, retaining HP/MP, items, morale and cooldowns across waves, including Western hypnosis and the game's between-wave heal. Boss rounds are the last wave only. Ten-wave weapon challenges and higher ordinary frontier levels are outside these tables. Final minions/rulers/boss are separate fresh-resource encounters; a continuous nine-encounter run is outside these tables.
- Calibration uses disjoint seeds 50000 onward, with 12/24-sample coarse/refinement searches. The final fit then evaluates the requested 200 seeds (30000–30199) and the report repeats those same seeds with the selected parameters. These are calibration results, not an independent holdout test. Observing 0% or 100% in a finite sample does not prove mathematical impossibility/certainty.

## Results

160 cases / 32000 trials per revision. After: 0 sampled extremes, 0 ordinary rows outside 70–90%, 0 boss rows outside 4–7 winning rounds.

Rounds = total mean of all outcomes; W boss rounds = last-wave mean among wins only (whole encounter for non-breaches). Each row has 200 trials in each revision.

| Zone | Team | Encounter | New moves | Before wins % | Before rounds / W boss rounds | After wins % | After rounds / W boss rounds |
|---|---:|---|---|---:|---|---:|---|
| th | 3 | frontier | locked | 100 | 1.00 / 1.00 | 76 | 5.73 / 5.98 |
| th | 3 | frontier | unlocked | 100 | 1.00 / 1.00 | 85 | 5.32 / 5.38 |
| th | 3 | breach | locked | 100 | 4.92 / 3.92 | 58.5 | 6.14 / 5.71 |
| th | 3 | breach | unlocked | 100 | 4.33 / 3.33 | 89 | 6.07 / 5.16 |
| th | 3 | boss | locked | 0 | 6.51 / — | 66 | 5.25 / 5.42 |
| th | 3 | boss | unlocked | 6.5 | 6.57 / 7.92 | 83.5 | 4.07 / 4.09 |
| th | 4 | boss | locked | 25 | 6.32 / 6.68 | 19 | 6.28 / 6.66 |
| th | 4 | boss | unlocked | 90 | 5.55 / 5.64 | 87 | 5.60 / 5.70 |
| asia | 3 | frontier | locked | 100 | 1.00 / 1.00 | 70 | 3.21 / 3.86 |
| asia | 3 | frontier | unlocked | 100 | 1.00 / 1.00 | 86.5 | 2.08 / 2.23 |
| asia | 3 | breach | locked | 100 | 7.25 / 3.15 | 42 | 9.63 / 6.13 |
| asia | 3 | breach | unlocked | 100 | 6.04 / 2.83 | 85.5 | 8.45 / 5.33 |
| asia | 3 | boss | locked | 77 | 4.71 / 4.86 | 16 | 6.07 / 6.81 |
| asia | 3 | boss | unlocked | 99.5 | 3.04 / 3.05 | 74 | 5.25 / 5.36 |
| asia | 4 | frontier | locked | 100 | 1.00 / 1.00 | 78 | 1.94 / 2.12 |
| asia | 4 | frontier | unlocked | 100 | 1.00 / 1.00 | 87 | 1.00 / 1.00 |
| asia | 4 | breach | locked | 100 | 5.24 / 2.41 | 51 | 9.15 / 6.68 |
| asia | 4 | breach | unlocked | 100 | 4.39 / 2.31 | 82 | 7.93 / 5.88 |
| asia | 4 | boss | locked | 98 | 3.12 / 3.11 | 43 | 5.04 / 5.26 |
| asia | 4 | boss | unlocked | 100 | 2.48 / 2.48 | 98.5 | 4.04 / 4.05 |
| asia | 5 | frontier | locked | 100 | 1.00 / 1.00 | 71 | 5.08 / 5.73 |
| asia | 5 | frontier | unlocked | 100 | 1.00 / 1.00 | 88 | 4.68 / 5.09 |
| asia | 5 | breach | locked | 100 | 5.11 / 3.02 | 50 | 7.48 / 5.79 |
| asia | 5 | breach | unlocked | 100 | 4.08 / 2.08 | 86 | 6.57 / 4.67 |
| asia | 5 | boss | locked | 92 | 3.35 / 3.36 | 33 | 5.11 / 5.24 |
| asia | 5 | boss | unlocked | 100 | 2.12 / 2.12 | 80 | 4.09 / 4.15 |
| west | 3 | frontier | locked | 100 | 1.00 / 1.00 | 71.5 | 3.41 / 4.06 |
| west | 3 | frontier | unlocked | 100 | 1.00 / 1.00 | 88.5 | 2.09 / 2.21 |
| west | 3 | breach | locked | 37 | 14.90 / 2.97 | 62.5 | 12.54 / 4.90 |
| west | 3 | breach | unlocked | 100 | 14.38 / 2.94 | 82.5 | 10.66 / 4.77 |
| west | 3 | boss | locked | 0 | 4.91 / — | 35.5 | 4.67 / 5.48 |
| west | 3 | boss | unlocked | 58 | 5.69 / 6.24 | 83.5 | 4.07 / 4.19 |
| west | 4 | frontier | locked | 100 | 1.00 / 1.00 | 78 | 2.00 / 2.19 |
| west | 4 | frontier | unlocked | 100 | 1.00 / 1.00 | 87.5 | 1.41 / 1.47 |
| west | 4 | breach | locked | 0 | 8.36 / — | 65.5 | 11.74 / 4.88 |
| west | 4 | breach | unlocked | 0 | 8.84 / — | 85.5 | 10.54 / 4.70 |
| west | 4 | boss | locked | 57.5 | 5.52 / 5.86 | 35 | 5.32 / 6.06 |
| west | 4 | boss | unlocked | 90 | 4.42 / 4.44 | 81.5 | 4.52 / 4.61 |
| west | 5 | frontier | locked | 100 | 1.00 / 1.00 | 77.5 | 4.29 / 4.85 |
| west | 5 | frontier | unlocked | 100 | 1.00 / 1.00 | 85 | 3.23 / 3.51 |
| west | 5 | breach | locked | 0 | 8.13 / — | 30.5 | 13.14 / 5.93 |
| west | 5 | breach | unlocked | 0 | 8.00 / — | 82 | 12.63 / 4.92 |
| west | 5 | boss | locked | 10 | 4.36 / 6.35 | 18 | 4.75 / 6.17 |
| west | 5 | boss | unlocked | 75 | 4.50 / 4.46 | 91.5 | 4.34 / 4.36 |
| west | 6 | frontier | locked | 100 | 1.00 / 1.00 | 79.5 | 3.85 / 4.29 |
| west | 6 | frontier | unlocked | 100 | 1.00 / 1.00 | 83.5 | 2.63 / 2.90 |
| west | 6 | breach | locked | 0 | 6.79 / — | 16.5 | 13.77 / 5.79 |
| west | 6 | breach | unlocked | 0 | 7.18 / — | 80.5 | 14.29 / 4.35 |
| west | 6 | boss | locked | 12 | 4.33 / 5.50 | 55.5 | 5.46 / 5.87 |
| west | 6 | boss | unlocked | 98 | 3.44 / 3.45 | 89.5 | 4.96 / 5.06 |
| cyberhell | 3 | frontier | locked | 100 | 1.00 / 1.00 | 70.5 | 3.38 / 4.06 |
| cyberhell | 3 | frontier | unlocked | 100 | 1.00 / 1.00 | 86 | 2.01 / 2.14 |
| cyberhell | 3 | breach | locked | 0.5 | 10.00 / 5.00 | 44.5 | 11.80 / 6.28 |
| cyberhell | 3 | breach | unlocked | 38 | 10.16 / 3.36 | 78 | 11.19 / 4.01 |
| cyberhell | 3 | minion:1 | locked | 100 | 2.33 / 2.33 | 79.5 | 4.93 / 5.36 |
| cyberhell | 3 | minion:1 | unlocked | 100 | 1.32 / 1.32 | 85.5 | 4.18 / 4.41 |
| cyberhell | 3 | minion:2 | locked | 100 | 3.13 / 3.13 | 71.5 | 5.39 / 6.06 |
| cyberhell | 3 | minion:2 | unlocked | 100 | 2.25 / 2.25 | 90 | 4.34 / 4.56 |
| cyberhell | 3 | minion:3 | locked | 100 | 3.23 / 3.23 | 79 | 3.90 / 4.44 |
| cyberhell | 3 | minion:3 | unlocked | 100 | 2.40 / 2.40 | 89.5 | 3.25 / 3.49 |
| cyberhell | 3 | minion:4 | locked | 100 | 3.54 / 3.54 | 71.5 | 11.06 / 11.64 |
| cyberhell | 3 | minion:4 | unlocked | 100 | 2.63 / 2.63 | 88.5 | 9.61 / 9.79 |
| cyberhell | 3 | ruler:th | locked | 100 | 4.14 / 4.14 | 38 | 6.01 / 6.59 |
| cyberhell | 3 | ruler:th | unlocked | 100 | 3.00 / 3.00 | 93.5 | 5.25 / 5.30 |
| cyberhell | 3 | ruler:asia | locked | 100 | 4.41 / 4.41 | 75.5 | 6.11 / 6.32 |
| cyberhell | 3 | ruler:asia | unlocked | 100 | 3.20 / 3.20 | 99.5 | 5.01 / 5.02 |
| cyberhell | 3 | ruler:west | locked | 64 | 5.92 / 6.54 | 14.5 | 5.04 / 6.55 |
| cyberhell | 3 | ruler:west | unlocked | 95 | 4.75 / 4.79 | 79.5 | 4.83 / 5.03 |
| cyberhell | 3 | ruler:cyberhell | locked | 36 | 5.67 / 6.88 | 13.5 | 5.07 / 6.93 |
| cyberhell | 3 | ruler:cyberhell | unlocked | 83 | 5.05 / 5.14 | 71 | 4.99 / 5.31 |
| cyberhell | 3 | boss | locked | 0 | 3.53 / — | 18.5 | 4.74 / 5.86 |
| cyberhell | 3 | boss | unlocked | 7 | 4.39 / 6.93 | 77.5 | 4.28 / 4.46 |
| cyberhell | 4 | frontier | locked | 100 | 1.00 / 1.00 | 77.5 | 2.00 / 2.19 |
| cyberhell | 4 | frontier | unlocked | 100 | 1.00 / 1.00 | 87.5 | 1.43 / 1.49 |
| cyberhell | 4 | breach | locked | 32.5 | 9.49 / 4.18 | 60 | 10.98 / 5.44 |
| cyberhell | 4 | breach | unlocked | 51 | 9.00 / 3.75 | 81.5 | 10.15 / 4.68 |
| cyberhell | 4 | minion:1 | locked | 100 | 1.00 / 1.00 | 73.5 | 3.83 / 4.54 |
| cyberhell | 4 | minion:1 | unlocked | 100 | 1.00 / 1.00 | 84.5 | 3.05 / 3.40 |
| cyberhell | 4 | minion:2 | locked | 95 | 2.19 / 2.25 | 72.5 | 4.21 / 4.83 |
| cyberhell | 4 | minion:2 | unlocked | 100 | 1.00 / 1.00 | 86.5 | 3.05 / 3.33 |
| cyberhell | 4 | minion:3 | locked | 93 | 2.17 / 2.26 | 71 | 4.45 / 5.27 |
| cyberhell | 4 | minion:3 | unlocked | 100 | 1.00 / 1.00 | 89.5 | 3.24 / 3.44 |
| cyberhell | 4 | minion:4 | locked | 91.5 | 2.27 / 2.39 | 70 | 4.92 / 5.70 |
| cyberhell | 4 | minion:4 | unlocked | 100 | 1.00 / 1.00 | 88 | 3.81 / 4.11 |
| cyberhell | 4 | ruler:th | locked | 100 | 2.62 / 2.62 | 14.5 | 4.80 / 6.52 |
| cyberhell | 4 | ruler:th | unlocked | 100 | 2.07 / 2.07 | 75.5 | 4.77 / 5.24 |
| cyberhell | 4 | ruler:asia | locked | 100 | 2.63 / 2.63 | 14.5 | 4.96 / 6.93 |
| cyberhell | 4 | ruler:asia | unlocked | 100 | 2.10 / 2.10 | 75.5 | 4.82 / 5.28 |
| cyberhell | 4 | ruler:west | locked | 91.5 | 4.55 / 4.63 | 29 | 5.13 / 6.24 |
| cyberhell | 4 | ruler:west | unlocked | 97.5 | 3.90 / 3.92 | 75.5 | 5.38 / 5.66 |
| cyberhell | 4 | ruler:cyberhell | locked | 74.5 | 4.97 / 5.30 | 45 | 4.96 / 5.83 |
| cyberhell | 4 | ruler:cyberhell | unlocked | 93 | 4.24 / 4.30 | 81 | 4.47 / 4.77 |
| cyberhell | 4 | boss | locked | 1 | 3.62 / 8.00 | 22.5 | 4.91 / 6.40 |
| cyberhell | 4 | boss | unlocked | 7.5 | 4.18 / 6.20 | 79 | 5.69 / 5.83 |
| cyberhell | 5 | frontier | locked | 100 | 1.01 / 1.01 | 71.5 | 4.32 / 4.97 |
| cyberhell | 5 | frontier | unlocked | 100 | 1.00 / 1.00 | 84 | 3.24 / 3.56 |
| cyberhell | 5 | breach | locked | 20.5 | 8.29 / 3.51 | 9.5 | 8.98 / 4.58 |
| cyberhell | 5 | breach | unlocked | 91 | 6.77 / 2.55 | 82 | 8.12 / 4.18 |
| cyberhell | 5 | minion:1 | locked | 100 | 1.00 / 1.00 | 73 | 3.52 / 4.44 |
| cyberhell | 5 | minion:1 | unlocked | 100 | 1.00 / 1.00 | 84 | 1.63 / 1.75 |
| cyberhell | 5 | minion:2 | locked | 100 | 1.00 / 1.00 | 71 | 3.74 / 4.83 |
| cyberhell | 5 | minion:2 | unlocked | 100 | 1.00 / 1.00 | 78 | 1.57 / 1.73 |
| cyberhell | 5 | minion:3 | locked | 100 | 1.04 / 1.04 | 76.5 | 4.20 / 5.09 |
| cyberhell | 5 | minion:3 | unlocked | 100 | 1.00 / 1.00 | 87.5 | 2.22 / 2.39 |
| cyberhell | 5 | minion:4 | locked | 100 | 1.10 / 1.10 | 85 | 4.45 / 4.88 |
| cyberhell | 5 | minion:4 | unlocked | 100 | 1.00 / 1.00 | 88.5 | 3.63 / 3.97 |
| cyberhell | 5 | ruler:th | locked | 100 | 2.28 / 2.28 | 72 | 5.92 / 6.54 |
| cyberhell | 5 | ruler:th | unlocked | 100 | 1.00 / 1.00 | 92 | 4.71 / 4.86 |
| cyberhell | 5 | ruler:asia | locked | 99.5 | 2.38 / 2.38 | 43.5 | 4.82 / 5.97 |
| cyberhell | 5 | ruler:asia | unlocked | 100 | 1.00 / 1.00 | 75 | 3.85 / 4.27 |
| cyberhell | 5 | ruler:west | locked | 93 | 3.65 / 3.73 | 74.5 | 5.46 / 5.90 |
| cyberhell | 5 | ruler:west | unlocked | 100 | 2.06 / 2.06 | 88 | 4.32 / 4.53 |
| cyberhell | 5 | ruler:cyberhell | locked | 87.5 | 3.87 / 4.03 | 45 | 5.29 / 6.29 |
| cyberhell | 5 | ruler:cyberhell | unlocked | 100 | 2.02 / 2.02 | 75.5 | 4.71 / 5.11 |
| cyberhell | 5 | boss | locked | 5 | 3.79 / 6.00 | 41.5 | 5.63 / 6.16 |
| cyberhell | 5 | boss | unlocked | 4 | 3.58 / 5.50 | 83 | 5.21 / 5.22 |
| cyberhell | 6 | frontier | locked | 100 | 1.00 / 1.00 | 71 | 2.08 / 2.41 |
| cyberhell | 6 | frontier | unlocked | 100 | 1.00 / 1.00 | 89.5 | 1.01 / 1.01 |
| cyberhell | 6 | breach | locked | 67.5 | 8.08 / 3.36 | 16.5 | 9.42 / 5.45 |
| cyberhell | 6 | breach | unlocked | 100 | 6.22 / 2.23 | 71.5 | 8.57 / 4.78 |
| cyberhell | 6 | minion:1 | locked | 100 | 1.00 / 1.00 | 75.5 | 3.95 / 4.75 |
| cyberhell | 6 | minion:1 | unlocked | 100 | 1.00 / 1.00 | 85.5 | 2.98 / 3.29 |
| cyberhell | 6 | minion:2 | locked | 100 | 1.00 / 1.00 | 72 | 2.57 / 3.12 |
| cyberhell | 6 | minion:2 | unlocked | 100 | 1.00 / 1.00 | 86 | 1.36 / 1.42 |
| cyberhell | 6 | minion:3 | locked | 100 | 1.00 / 1.00 | 74.5 | 3.23 / 3.93 |
| cyberhell | 6 | minion:3 | unlocked | 100 | 1.00 / 1.00 | 89.5 | 1.72 / 1.80 |
| cyberhell | 6 | minion:4 | locked | 100 | 1.00 / 1.00 | 82.5 | 5.22 / 5.73 |
| cyberhell | 6 | minion:4 | unlocked | 100 | 1.00 / 1.00 | 86.5 | 4.08 / 4.39 |
| cyberhell | 6 | ruler:th | locked | 100 | 1.71 / 1.71 | 78 | 5.42 / 5.79 |
| cyberhell | 6 | ruler:th | unlocked | 100 | 1.00 / 1.00 | 93.5 | 4.00 / 4.17 |
| cyberhell | 6 | ruler:asia | locked | 100 | 1.88 / 1.88 | 42 | 5.13 / 6.14 |
| cyberhell | 6 | ruler:asia | unlocked | 100 | 1.00 / 1.00 | 83.5 | 3.92 / 4.20 |
| cyberhell | 6 | ruler:west | locked | 96.5 | 3.00 / 3.04 | 57 | 5.27 / 6.13 |
| cyberhell | 6 | ruler:west | unlocked | 100 | 1.52 / 1.52 | 80 | 4.66 / 5.04 |
| cyberhell | 6 | ruler:cyberhell | locked | 94.5 | 3.23 / 3.30 | 53 | 5.36 / 6.42 |
| cyberhell | 6 | ruler:cyberhell | unlocked | 100 | 1.99 / 1.99 | 82 | 4.79 / 5.10 |
| cyberhell | 6 | boss | locked | 30 | 4.13 / 4.83 | 50.5 | 6.18 / 6.92 |
| cyberhell | 6 | boss | unlocked | 14 | 3.71 / 5.43 | 94.5 | 5.42 / 5.49 |
| cyberhell | 7 | frontier | locked | 100 | 2.00 / 2.00 | 74.5 | 5.10 / 5.64 |
| cyberhell | 7 | frontier | unlocked | 100 | 1.00 / 1.00 | 89 | 4.13 / 4.41 |
| cyberhell | 7 | breach | locked | 37.5 | 8.10 / 4.11 | 14.5 | 8.60 / 6.21 |
| cyberhell | 7 | breach | unlocked | 91 | 6.37 / 3.35 | 74 | 7.63 / 4.75 |
| cyberhell | 7 | minion:1 | locked | 100 | 1.00 / 1.00 | 79 | 3.46 / 4.01 |
| cyberhell | 7 | minion:1 | unlocked | 100 | 1.00 / 1.00 | 87 | 2.58 / 2.80 |
| cyberhell | 7 | minion:2 | locked | 100 | 1.00 / 1.00 | 71 | 2.22 / 2.62 |
| cyberhell | 7 | minion:2 | unlocked | 100 | 1.00 / 1.00 | 87 | 1.00 / 1.00 |
| cyberhell | 7 | minion:3 | locked | 100 | 1.00 / 1.00 | 70.5 | 2.54 / 3.05 |
| cyberhell | 7 | minion:3 | unlocked | 100 | 1.00 / 1.00 | 88 | 1.34 / 1.39 |
| cyberhell | 7 | minion:4 | locked | 100 | 1.00 / 1.00 | 83 | 4.77 / 5.41 |
| cyberhell | 7 | minion:4 | unlocked | 100 | 1.00 / 1.00 | 89.5 | 3.48 / 3.75 |
| cyberhell | 7 | ruler:th | locked | 100 | 1.57 / 1.57 | 87 | 4.47 / 4.77 |
| cyberhell | 7 | ruler:th | unlocked | 100 | 1.00 / 1.00 | 91.5 | 3.84 / 4.05 |
| cyberhell | 7 | ruler:asia | locked | 99.5 | 1.74 / 1.73 | 11 | 5.00 / 6.14 |
| cyberhell | 7 | ruler:asia | unlocked | 100 | 1.00 / 1.00 | 74.5 | 4.25 / 4.81 |
| cyberhell | 7 | ruler:west | locked | 97.5 | 2.93 / 2.97 | 35.5 | 5.31 / 6.96 |
| cyberhell | 7 | ruler:west | unlocked | 100 | 1.08 / 1.08 | 60.5 | 4.42 / 5.45 |
| cyberhell | 7 | ruler:cyberhell | locked | 97.5 | 3.10 / 3.14 | 65.5 | 5.47 / 6.38 |
| cyberhell | 7 | ruler:cyberhell | unlocked | 100 | 1.81 / 1.81 | 86.5 | 4.76 / 5.11 |
| cyberhell | 7 | boss | locked | 33 | 4.32 / 4.83 | 48 | 6.06 / 6.68 |
| cyberhell | 7 | boss | unlocked | 97 | 3.46 / 3.50 | 95 | 5.37 / 5.38 |

## Enemy changes and rationale

Only HP/ATK multipliers in encounter-balance.js change combat strength. The old C1 encounter profile still sets boss HP and adds first; approach waves retain their existing enemy stats, while Western hypnosis has a separate reduced enemy group for solo Yama; the new table multiplies the resulting enemy HP and ATK once at wave creation, frozen to the initial team size. Saved ongoing waves retain their stats. Basic damage formulas, TEAM_PRESSURE (including final boss cap 2.25), move coefficients, rewards, unlocks and party composition are unchanged. Each entry below replaces identity multipliers HP=1/ATK=1.

| Encounter | Team | HP × | ATK low × / high × | Purpose |
|---|---:|---:|---:|---|
| west:hypnosis | 3 | 0.25 | 0.25 / 0.25 | Make the solo-Yama fight against 2–5 companions survivable |
| west:hypnosis | 4 | 0.25 | 0.25 / 0.25 | Make the solo-Yama fight against 2–5 companions survivable |
| west:hypnosis | 5 | 0.25 | 0.25 / 0.25 | Make the solo-Yama fight against 2–5 companions survivable |
| west:hypnosis | 6 | 0.25 | 0.25 / 0.25 | Make the solo-Yama fight against 2–5 companions survivable |
| th:frontier | 3 | 3.6 | 2.91 / 2.91 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| th:breach | 3 | 1.5 | 1.8 / 1.8 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| th:boss | 3 | 0.55 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| th:boss | 4 | 1 | 1.04 / 1.04 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:frontier | 3 | 2 | 4.59 / 4.59 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| asia:frontier | 4 | 2 | 4.53 / 4.53 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| asia:frontier | 5 | 3.4 | 2.45 / 2.45 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| asia:breach | 3 | 2 | 1.89 / 1.89 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:breach | 4 | 3 | 1.71 / 1.71 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:breach | 5 | 2 | 1.52 / 1.52 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:boss | 3 | 1.5 | 0.87 / 0.87 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:boss | 4 | 1.5 | 1.05 / 1.05 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:boss | 5 | 1.65 | 0.96 / 0.96 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:frontier | 3 | 2 | 4.53 / 4.53 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:frontier | 4 | 2 | 4.53 / 4.53 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:frontier | 5 | 2.5 | 0.32 / 3.87 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:frontier | 6 | 2.5 | 3.83 / 3.83 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:breach | 3 | 1.5 | 1.98 / 1.98 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:breach | 4 | 2 | 1.98 / 1.98 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:breach | 5 | 2 | 1.43 / 1.43 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:breach | 6 | 2 | 1.71 / 1.71 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 3 | 0.65 | 1.17 / 1.17 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 4 | 1 | 1.05 / 1.05 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 5 | 1 | 0.93 / 0.93 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 6 | 1.27 | 0.84 / 0.84 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:frontier | 3 | 2 | 4.53 / 4.53 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 4 | 2 | 4.53 / 4.53 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 5 | 2.5 | 0.32 / 3.87 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 6 | 1.53 | 4.34 / 4.34 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 7 | 2.5 | 2.64 / 2.64 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:breach | 3 | 1.5 | 0.14 / 0.14 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 4 | 1.5 | 0.6 / 0.6 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 5 | 1.5 | 0.79 / 0.79 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 6 | 2 | 0.79 / 0.79 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 7 | 1.5 | 0.88 / 0.88 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:minion:1 | 3 | 1.8 | 1.51 / 1.51 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 4 | 1.53 | 1.91 / 1.91 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 5 | 2 | 1.91 / 1.91 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 6 | 3 | 1.63 / 1.63 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 7 | 3 | 1.66 / 1.66 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 3 | 2 | 0.15 / 1.83 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 4 | 2 | 0.16 / 1.9 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 5 | 2 | 1.91 / 1.91 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 6 | 2 | 1.75 / 1.75 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 7 | 2 | 1.75 / 1.75 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 3 | 1.2 | 0.01 / 2.31 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 4 | 2 | 1.08 / 1.08 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 5 | 2 | 1.6 / 1.6 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 6 | 2 | 1.6 / 1.6 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 7 | 2 | 1.67 / 1.67 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 3 | 3.95 | 0.06 / 0.78 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 4 | 2 | 0.13 / 1.55 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 5 | 2 | 1.29 / 1.29 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 6 | 4 | 0.89 / 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 7 | 3 | 1.29 / 1.29 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:ruler:th | 3 | 1.7 | 1.23 / 1.23 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 4 | 2 | 1.35 / 1.35 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 5 | 2.75 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 6 | 3.16 | 1.08 / 1.08 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 7 | 2.75 | 1.23 / 1.23 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 3 | 1.5 | 1.04 / 1.04 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 4 | 2 | 1.24 / 1.24 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 5 | 2 | 1.35 / 1.35 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 6 | 2.75 | 1.24 / 1.24 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 7 | 3.16 | 1.4 / 1.4 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 3 | 1 | 1.17 / 1.17 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 4 | 1.5 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 5 | 1.5 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 6 | 2 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 7 | 2 | 1.35 / 1.35 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 3 | 1 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 4 | 1 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 5 | 1.5 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 6 | 2 | 0.99 / 0.99 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 7 | 2 | 1.11 / 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 3 | 0.65 | 0.81 / 0.81 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 4 | 1 | 0.75 / 0.75 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 5 | 1.03 | 0.73 / 0.73 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 6 | 1.5 | 0.63 / 0.63 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 7 | 1.5 | 0.69 / 0.69 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |

## Outstanding target rows

Sampled extremes: none.

Ordinary outside 70–90%: none.

Boss winning rounds outside 4–7: none.

## Copy and layout evidence

The exact approved TUTOR read sentence adds only the support clause. The new-game third caption and Help team introduction state “นิราจะอ่านสำนวนให้ท่าน และแค่คอยช่วยอยู่ด้านหลัง”. No matching English variant of these hardcoded strings exists in i18n.js; story.js, narrative-cutscenes.js and talk-lines.js have no additional early father introduction to change. Station-duty comments and later stories remain unchanged.

All five img/intro-panel-01-v2.webp through img/intro-panel-05-v2.webp were visually inspected: no embedded introduction text needs redrawing.

teamJudgment uses “ประสานพิพากษา” on its chip, with the full name in its tooltip and the existing ability guide. Every new move gets explicit word-boundary wrap opportunities and a growing row with no ellipsis, including the <=700px style used at 390px. Source/VM tests cover all eight moves, real new-game office click handlers, approved copy, release import identities and frozen scaling. Browser rendering at 1280/390 is unavailable in this sandbox and remains unverified; source-contract checks are not visual acceptance.
