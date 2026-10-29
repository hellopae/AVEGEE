# BALANCE-2 — 30 October 2026

Simulation evidence, not browser QA or human-player win probabilities.

## Method and boundaries

- Both revisions: 200 paired seeds (30000–30199) per case. Before is C1 as checked out for this task; after applies only the enemy table. Both contain separate locked/unlocked personal moves and team ultimate states. The before mode disables only ENCOUNTER_BALANCE; it does not copy any combat formula.
- Calls production createGame, effective ally stats, encounter construction, beginBattleTurns, confirmBattleCommand, runEnemyTurn and finishBattleCommand. Real HP/MP, morale, shields, death/absence, cooldowns and enemy targeting remain enabled. No damage-only shortcut or zeroed enemy ATK.
- Levels 2/3/4/5 by zone, training level 1, full initial HP/MP and morale 100, no equipment/fire-control/stat upgrades. Each encounter starts with ceil(team size/2) medkits and holy waters. One active second passes per command; wall clock is frozen, so map recovery cannot silently revive allies.
- Policy: medkit at >=45 missing HP; Nira/Boon heal at >=20; MP refill below 24; available new move, one fire per encounter, then basic attacks. Boss first. This conservative policy intentionally matches the C1 comparison; it does not represent optimal play, waiting out cooldowns or every older Yama ability.
- Teams 3 = Yama/Nira/Taan; 4 adds Guard only after the Thai breach. Teams 5/6/7 provisionally add Dam/Plerng/Boon, using HIRE_PLAN after the mandatory Guard. BACKLOG.md in this checkout has 25 lines and no PARTY-01. This order is an explicit unresolved assumption, not a confirmed design decision. No party-cap override is used. Smaller teams remain selected after later zones unlock more slots.
- Frontier samples use ordinary border wave 1. Breach samples isolate the border lord's last wave with fresh resources; preceding waves, Western hypnosis attrition, ten-wave weapon challenges and higher ordinary frontier levels are outside these tables. Final minions/rulers/boss are separate fresh-resource encounters; a continuous nine-encounter run is outside these tables. These boundaries must not be interpreted as full-route acceptance.
- Calibration uses disjoint seeds 50000 onward, with 12/24-sample coarse/refinement searches. The report uses the separate 200-sample set. Observing 0% or 100% in a finite sample does not prove mathematical impossibility/certainty.

## Results

160 cases / 32000 trials per revision. After: 0 sampled extremes, 39 ordinary rows outside 70–90%, 5 boss rows outside 4–7 winning rounds.

Rounds = mean of all outcomes; W rounds = mean among wins only. Each row has 200 trials in each revision.

| Zone | Team | Encounter | New moves | Before wins % | Before rounds / W rounds | After wins % | After rounds / W rounds |
|---|---:|---|---|---:|---|---:|---|
| th | 3 | frontier | locked | 100 | 1 / 1 | 61.5 | 6.01 / 6.41 |
| th | 3 | frontier | unlocked | 100 | 1 / 1 | 82 | 5.86 / 6.04 |
| th | 3 | breach | locked | 100 | 3.5 / 3.5 | 91 | 6.29 / 6.37 |
| th | 3 | breach | unlocked | 100 | 3.12 / 3.12 | 91 | 5.96 / 6.06 |
| th | 3 | boss | locked | 0 | 6.51 / — | 66 | 5.25 / 5.42 |
| th | 3 | boss | unlocked | 6.5 | 6.57 / 7.92 | 83.5 | 4.07 / 4.09 |
| th | 4 | boss | locked | 25 | 6.32 / 6.68 | 19 | 6.28 / 6.66 |
| th | 4 | boss | unlocked | 90 | 5.55 / 5.64 | 87 | 5.6 / 5.7 |
| asia | 3 | frontier | locked | 100 | 1 / 1 | 70 | 3.21 / 3.86 |
| asia | 3 | frontier | unlocked | 100 | 1 / 1 | 86.5 | 2.08 / 2.23 |
| asia | 3 | breach | locked | 100 | 2.6 / 2.6 | 27.5 | 4.88 / 5.87 |
| asia | 3 | breach | unlocked | 100 | 1 / 1 | 94.5 | 4.05 / 4.08 |
| asia | 3 | boss | locked | 77 | 4.71 / 4.86 | 16 | 6.07 / 6.81 |
| asia | 3 | boss | unlocked | 99.5 | 3.04 / 3.05 | 74 | 5.25 / 5.36 |
| asia | 4 | frontier | locked | 100 | 1 / 1 | 81 | 6.86 / 7.06 |
| asia | 4 | frontier | unlocked | 100 | 1 / 1 | 95 | 5.86 / 5.91 |
| asia | 4 | breach | locked | 100 | 1 / 1 | 22 | 4.46 / 4.57 |
| asia | 4 | breach | unlocked | 100 | 1 / 1 | 65.5 | 3.92 / 3.88 |
| asia | 4 | boss | locked | 98 | 3.12 / 3.11 | 43 | 5.04 / 5.26 |
| asia | 4 | boss | unlocked | 100 | 2.48 / 2.48 | 98.5 | 4.04 / 4.05 |
| asia | 5 | frontier | locked | 100 | 1 / 1 | 71 | 5.08 / 5.73 |
| asia | 5 | frontier | unlocked | 100 | 1 / 1 | 88 | 4.68 / 5.09 |
| asia | 5 | breach | locked | 100 | 2 / 2 | 47.5 | 4.83 / 5.31 |
| asia | 5 | breach | unlocked | 100 | 1.99 / 1.99 | 80 | 4.08 / 4.28 |
| asia | 5 | boss | locked | 92 | 3.35 / 3.36 | 39 | 4.78 / 4.92 |
| asia | 5 | boss | unlocked | 100 | 2.12 / 2.12 | 72 | 3.9 / 3.9 |
| west | 3 | frontier | locked | 100 | 1 / 1 | 62 | 3.81 / 4.72 |
| west | 3 | frontier | unlocked | 100 | 1 / 1 | 84.5 | 2.48 / 2.7 |
| west | 3 | breach | locked | 100 | 2 / 2 | 41.5 | 5.31 / 5.98 |
| west | 3 | breach | unlocked | 100 | 1 / 1 | 85.5 | 4.26 / 4.3 |
| west | 3 | boss | locked | 0 | 4.91 / — | 35.5 | 4.67 / 5.48 |
| west | 3 | boss | unlocked | 58 | 5.69 / 6.24 | 83.5 | 4.07 / 4.19 |
| west | 4 | frontier | locked | 100 | 1 / 1 | 81 | 6.82 / 7.04 |
| west | 4 | frontier | unlocked | 100 | 1 / 1 | 92 | 5.66 / 5.73 |
| west | 4 | breach | locked | 100 | 1.01 / 1.01 | 40.5 | 5.43 / 6.15 |
| west | 4 | breach | unlocked | 100 | 1 / 1 | 73.5 | 4.3 / 4.53 |
| west | 4 | boss | locked | 57.5 | 5.52 / 5.86 | 35 | 5.32 / 6.06 |
| west | 4 | boss | unlocked | 90 | 4.42 / 4.44 | 81.5 | 4.52 / 4.61 |
| west | 5 | frontier | locked | 100 | 1 / 1 | 89.5 | 7.54 / 7.72 |
| west | 5 | frontier | unlocked | 100 | 1 / 1 | 98 | 6.14 / 6.17 |
| west | 5 | breach | locked | 100 | 2.41 / 2.41 | 32.5 | 5.12 / 5.68 |
| west | 5 | breach | unlocked | 100 | 2 / 2 | 57.5 | 4.7 / 4.88 |
| west | 5 | boss | locked | 10 | 4.36 / 6.35 | 18 | 4.75 / 6.17 |
| west | 5 | boss | unlocked | 75 | 4.5 / 4.46 | 91.5 | 4.34 / 4.36 |
| west | 6 | frontier | locked | 100 | 1 / 1 | 57 | 4.84 / 5.6 |
| west | 6 | frontier | unlocked | 100 | 1 / 1 | 77 | 3.62 / 4.14 |
| west | 6 | breach | locked | 100 | 2 / 2 | 71 | 5.83 / 6.1 |
| west | 6 | breach | unlocked | 100 | 1 / 1 | 95 | 4.77 / 4.82 |
| west | 6 | boss | locked | 12 | 4.33 / 5.5 | 55.5 | 5.46 / 5.87 |
| west | 6 | boss | unlocked | 98 | 3.44 / 3.45 | 89.5 | 4.96 / 5.06 |
| cyberhell | 3 | frontier | locked | 100 | 1 / 1 | 68.5 | 3.35 / 4.12 |
| cyberhell | 3 | frontier | unlocked | 100 | 1 / 1 | 86 | 2.02 / 2.16 |
| cyberhell | 3 | breach | locked | 100 | 2.98 / 2.98 | 36.5 | 4.83 / 5.12 |
| cyberhell | 3 | breach | unlocked | 100 | 2.96 / 2.96 | 82.5 | 3.96 / 3.85 |
| cyberhell | 3 | minion:1 | locked | 100 | 2.33 / 2.33 | 59.5 | 5.52 / 5.88 |
| cyberhell | 3 | minion:1 | unlocked | 100 | 1.32 / 1.32 | 87.5 | 4.33 / 4.46 |
| cyberhell | 3 | minion:2 | locked | 100 | 3.13 / 3.13 | 63.5 | 8.64 / 9.3 |
| cyberhell | 3 | minion:2 | unlocked | 100 | 2.25 / 2.25 | 97 | 7.1 / 7.1 |
| cyberhell | 3 | minion:3 | locked | 100 | 3.23 / 3.23 | 62.5 | 6.54 / 7.06 |
| cyberhell | 3 | minion:3 | unlocked | 100 | 2.4 / 2.4 | 93.5 | 5.66 / 5.71 |
| cyberhell | 3 | minion:4 | locked | 100 | 3.54 / 3.54 | 67.5 | 16.19 / 17.07 |
| cyberhell | 3 | minion:4 | unlocked | 100 | 2.63 / 2.63 | 98.5 | 14.04 / 14.07 |
| cyberhell | 3 | ruler:th | locked | 100 | 4.14 / 4.14 | 38 | 6.01 / 6.59 |
| cyberhell | 3 | ruler:th | unlocked | 100 | 3 / 3 | 93.5 | 5.25 / 5.3 |
| cyberhell | 3 | ruler:asia | locked | 100 | 4.41 / 4.41 | 13 | 6.4 / 8.08 |
| cyberhell | 3 | ruler:asia | unlocked | 100 | 3.2 / 3.2 | 88 | 6.15 / 6.25 |
| cyberhell | 3 | ruler:west | locked | 64 | 5.92 / 6.54 | 14.5 | 5.04 / 6.55 |
| cyberhell | 3 | ruler:west | unlocked | 95 | 4.75 / 4.79 | 79.5 | 4.83 / 5.03 |
| cyberhell | 3 | ruler:cyberhell | locked | 36 | 5.67 / 6.88 | 13.5 | 5.07 / 6.93 |
| cyberhell | 3 | ruler:cyberhell | unlocked | 83 | 5.05 / 5.14 | 71 | 4.99 / 5.31 |
| cyberhell | 3 | boss | locked | 0 | 3.53 / — | 18.5 | 4.74 / 5.86 |
| cyberhell | 3 | boss | unlocked | 7 | 4.39 / 6.93 | 77.5 | 4.28 / 4.46 |
| cyberhell | 4 | frontier | locked | 100 | 1 / 1 | 72.5 | 6.89 / 7.11 |
| cyberhell | 4 | frontier | unlocked | 100 | 1 / 1 | 91.5 | 5.66 / 5.73 |
| cyberhell | 4 | breach | locked | 100 | 2 / 2 | 22 | 5.81 / 6.7 |
| cyberhell | 4 | breach | unlocked | 100 | 2 / 2 | 73 | 4.91 / 4.97 |
| cyberhell | 4 | minion:1 | locked | 100 | 1 / 1 | 80 | 3.92 / 4.36 |
| cyberhell | 4 | minion:1 | unlocked | 100 | 1 / 1 | 93 | 2.83 / 2.96 |
| cyberhell | 4 | minion:2 | locked | 95 | 2.19 / 2.25 | 79.5 | 3.69 / 4.14 |
| cyberhell | 4 | minion:2 | unlocked | 100 | 1 / 1 | 93 | 2.63 / 2.75 |
| cyberhell | 4 | minion:3 | locked | 93 | 2.17 / 2.26 | 71 | 4.45 / 5.27 |
| cyberhell | 4 | minion:3 | unlocked | 100 | 1 / 1 | 89.5 | 3.24 / 3.44 |
| cyberhell | 4 | minion:4 | locked | 91.5 | 2.27 / 2.39 | 83 | 12.67 / 13.11 |
| cyberhell | 4 | minion:4 | unlocked | 100 | 1 / 1 | 96 | 10.54 / 10.58 |
| cyberhell | 4 | ruler:th | locked | 100 | 2.62 / 2.62 | 14.5 | 4.8 / 6.52 |
| cyberhell | 4 | ruler:th | unlocked | 100 | 2.07 / 2.07 | 75.5 | 4.77 / 5.24 |
| cyberhell | 4 | ruler:asia | locked | 100 | 2.63 / 2.63 | 14.5 | 4.96 / 6.93 |
| cyberhell | 4 | ruler:asia | unlocked | 100 | 2.1 / 2.1 | 75.5 | 4.82 / 5.28 |
| cyberhell | 4 | ruler:west | locked | 91.5 | 4.55 / 4.63 | 29 | 5.13 / 6.24 |
| cyberhell | 4 | ruler:west | unlocked | 97.5 | 3.9 / 3.92 | 75.5 | 5.38 / 5.66 |
| cyberhell | 4 | ruler:cyberhell | locked | 74.5 | 4.97 / 5.3 | 45 | 4.96 / 5.83 |
| cyberhell | 4 | ruler:cyberhell | unlocked | 93 | 4.24 / 4.3 | 81 | 4.47 / 4.77 |
| cyberhell | 4 | boss | locked | 1 | 3.62 / 8 | 22.5 | 4.91 / 6.4 |
| cyberhell | 4 | boss | unlocked | 7.5 | 4.18 / 6.2 | 79 | 5.69 / 5.83 |
| cyberhell | 5 | frontier | locked | 100 | 1.01 / 1.01 | 79.5 | 8.72 / 8.97 |
| cyberhell | 5 | frontier | unlocked | 100 | 1 / 1 | 96 | 6.84 / 6.88 |
| cyberhell | 5 | breach | locked | 87.5 | 3.75 / 3.86 | 44.5 | 5.59 / 5.88 |
| cyberhell | 5 | breach | unlocked | 99.5 | 2.6 / 2.61 | 80 | 4.62 / 4.63 |
| cyberhell | 5 | minion:1 | locked | 100 | 1 / 1 | 56 | 8.06 / 9.2 |
| cyberhell | 5 | minion:1 | unlocked | 100 | 1 / 1 | 79 | 6.5 / 7.13 |
| cyberhell | 5 | minion:2 | locked | 100 | 1 / 1 | 90.5 | 4.04 / 4.28 |
| cyberhell | 5 | minion:2 | unlocked | 100 | 1 / 1 | 94.5 | 3 / 3.11 |
| cyberhell | 5 | minion:3 | locked | 100 | 1.04 / 1.04 | 86.5 | 4.12 / 4.42 |
| cyberhell | 5 | minion:3 | unlocked | 100 | 1 / 1 | 93.5 | 3.04 / 3.18 |
| cyberhell | 5 | minion:4 | locked | 100 | 1.1 / 1.1 | 93.5 | 3.37 / 3.49 |
| cyberhell | 5 | minion:4 | unlocked | 100 | 1 / 1 | 94.5 | 2.92 / 3.03 |
| cyberhell | 5 | ruler:th | locked | 100 | 2.28 / 2.28 | 72 | 5.92 / 6.54 |
| cyberhell | 5 | ruler:th | unlocked | 100 | 1 / 1 | 92 | 4.71 / 4.86 |
| cyberhell | 5 | ruler:asia | locked | 99.5 | 2.38 / 2.38 | 43.5 | 4.82 / 5.97 |
| cyberhell | 5 | ruler:asia | unlocked | 100 | 1 / 1 | 75 | 3.85 / 4.27 |
| cyberhell | 5 | ruler:west | locked | 93 | 3.65 / 3.73 | 74.5 | 5.46 / 5.9 |
| cyberhell | 5 | ruler:west | unlocked | 100 | 2.06 / 2.06 | 88 | 4.32 / 4.53 |
| cyberhell | 5 | ruler:cyberhell | locked | 87.5 | 3.87 / 4.03 | 45 | 5.29 / 6.29 |
| cyberhell | 5 | ruler:cyberhell | unlocked | 100 | 2.02 / 2.02 | 75.5 | 4.71 / 5.11 |
| cyberhell | 5 | boss | locked | 5 | 3.79 / 6 | 47.5 | 6.13 / 7.06 |
| cyberhell | 5 | boss | unlocked | 4 | 3.58 / 5.5 | 82 | 5.24 / 5.24 |
| cyberhell | 6 | frontier | locked | 100 | 1 / 1 | 83.5 | 2.42 / 2.65 |
| cyberhell | 6 | frontier | unlocked | 100 | 1 / 1 | 93.5 | 1.02 / 1.02 |
| cyberhell | 6 | breach | locked | 100 | 2.5 / 2.5 | 56 | 6.05 / 6.38 |
| cyberhell | 6 | breach | unlocked | 100 | 2.31 / 2.31 | 89 | 5.17 / 5.22 |
| cyberhell | 6 | minion:1 | locked | 100 | 1 / 1 | 75.5 | 3.95 / 4.75 |
| cyberhell | 6 | minion:1 | unlocked | 100 | 1 / 1 | 85.5 | 2.98 / 3.29 |
| cyberhell | 6 | minion:2 | locked | 100 | 1 / 1 | 96 | 3.21 / 3.29 |
| cyberhell | 6 | minion:2 | unlocked | 100 | 1 / 1 | 95 | 2.8 / 2.89 |
| cyberhell | 6 | minion:3 | locked | 100 | 1 / 1 | 91 | 3.6 / 3.8 |
| cyberhell | 6 | minion:3 | unlocked | 100 | 1 / 1 | 94.5 | 2.86 / 2.97 |
| cyberhell | 6 | minion:4 | locked | 100 | 1 / 1 | 82.5 | 5.22 / 5.73 |
| cyberhell | 6 | minion:4 | unlocked | 100 | 1 / 1 | 86.5 | 4.08 / 4.39 |
| cyberhell | 6 | ruler:th | locked | 100 | 1.71 / 1.71 | 78 | 5.42 / 5.79 |
| cyberhell | 6 | ruler:th | unlocked | 100 | 1 / 1 | 93.5 | 4 / 4.17 |
| cyberhell | 6 | ruler:asia | locked | 100 | 1.88 / 1.88 | 42 | 5.13 / 6.14 |
| cyberhell | 6 | ruler:asia | unlocked | 100 | 1 / 1 | 83.5 | 3.92 / 4.2 |
| cyberhell | 6 | ruler:west | locked | 96.5 | 3 / 3.04 | 57 | 5.27 / 6.13 |
| cyberhell | 6 | ruler:west | unlocked | 100 | 1.52 / 1.52 | 80 | 4.66 / 5.04 |
| cyberhell | 6 | ruler:cyberhell | locked | 94.5 | 3.23 / 3.3 | 53 | 5.36 / 6.42 |
| cyberhell | 6 | ruler:cyberhell | unlocked | 100 | 1.99 / 1.99 | 82 | 4.79 / 5.1 |
| cyberhell | 6 | boss | locked | 30 | 4.13 / 4.83 | 50.5 | 6.18 / 6.92 |
| cyberhell | 6 | boss | unlocked | 14 | 3.71 / 5.43 | 94.5 | 5.42 / 5.49 |
| cyberhell | 7 | frontier | locked | 100 | 2 / 2 | 80.5 | 9.72 / 10.15 |
| cyberhell | 7 | frontier | unlocked | 100 | 1 / 1 | 99.5 | 8.26 / 8.27 |
| cyberhell | 7 | breach | locked | 93 | 3.5 / 3.59 | 59.5 | 4.33 / 4.78 |
| cyberhell | 7 | breach | unlocked | 96.5 | 3.13 / 3.16 | 70.5 | 4.08 / 4.4 |
| cyberhell | 7 | minion:1 | locked | 100 | 1 / 1 | 96 | 3.21 / 3.3 |
| cyberhell | 7 | minion:1 | unlocked | 100 | 1 / 1 | 94.5 | 2.29 / 2.37 |
| cyberhell | 7 | minion:2 | locked | 100 | 1 / 1 | 97 | 3 / 3.06 |
| cyberhell | 7 | minion:2 | unlocked | 100 | 1 / 1 | 96 | 2.06 / 2.1 |
| cyberhell | 7 | minion:3 | locked | 100 | 1 / 1 | 97 | 3.02 / 3.08 |
| cyberhell | 7 | minion:3 | unlocked | 100 | 1 / 1 | 95.5 | 2.05 / 2.1 |
| cyberhell | 7 | minion:4 | locked | 100 | 1 / 1 | 97 | 3.19 / 3.26 |
| cyberhell | 7 | minion:4 | unlocked | 100 | 1 / 1 | 95 | 2.88 / 2.98 |
| cyberhell | 7 | ruler:th | locked | 100 | 1.57 / 1.57 | 87 | 4.47 / 4.77 |
| cyberhell | 7 | ruler:th | unlocked | 100 | 1 / 1 | 91.5 | 3.84 / 4.05 |
| cyberhell | 7 | ruler:asia | locked | 99.5 | 1.74 / 1.73 | 11 | 5 / 6.14 |
| cyberhell | 7 | ruler:asia | unlocked | 100 | 1 / 1 | 74.5 | 4.25 / 4.81 |
| cyberhell | 7 | ruler:west | locked | 97.5 | 2.93 / 2.97 | 35.5 | 5.31 / 6.96 |
| cyberhell | 7 | ruler:west | unlocked | 100 | 1.08 / 1.08 | 60.5 | 4.42 / 5.45 |
| cyberhell | 7 | ruler:cyberhell | locked | 97.5 | 3.1 / 3.14 | 65.5 | 5.47 / 6.38 |
| cyberhell | 7 | ruler:cyberhell | unlocked | 100 | 1.81 / 1.81 | 86.5 | 4.76 / 5.11 |
| cyberhell | 7 | boss | locked | 33 | 4.32 / 4.83 | 48 | 6.06 / 6.68 |
| cyberhell | 7 | boss | unlocked | 97 | 3.46 / 3.5 | 95 | 5.37 / 5.38 |

## Enemy changes and rationale

Only HP/ATK multipliers in encounter-balance.js change combat strength. The old C1 encounter profile still sets boss HP and adds first; the new table multiplies the resulting enemy HP and ATK once at wave creation, frozen to the initial team size. Saved ongoing waves retain their stats. Basic damage formulas, TEAM_PRESSURE (including final boss cap 2.25), move coefficients, rewards, unlocks and party composition are unchanged. Each entry below replaces identity multipliers HP=1/ATK=1.

| Encounter | Team | HP × | ATK × | Purpose |
|---|---:|---:|---:|---|
| west:hypnosis | 3 | 0.25 | 0.25 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:hypnosis | 4 | 0.25 | 0.25 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:hypnosis | 5 | 0.25 | 0.25 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:hypnosis | 6 | 0.25 | 0.25 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| th:frontier | 3 | 4 | 2.93 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| th:breach | 3 | 2 | 1.29 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| th:boss | 3 | 0.55 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| th:boss | 4 | 1 | 1.04 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:frontier | 3 | 2 | 4.59 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| asia:frontier | 4 | 8 | 2.37 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| asia:frontier | 5 | 3.4 | 2.45 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| asia:breach | 3 | 2 | 2.74 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:breach | 4 | 2 | 3.34 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:breach | 5 | 2 | 1.83 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:boss | 3 | 1.5 | 0.87 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:boss | 4 | 1.5 | 1.05 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| asia:boss | 5 | 1.5 | 1.05 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:frontier | 3 | 2.3 | 4.59 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:frontier | 4 | 8 | 2.37 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:frontier | 5 | 5.1 | 1.63 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:frontier | 6 | 3 | 3.85 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| west:breach | 3 | 2 | 2.44 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:breach | 4 | 2.75 | 2.4 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:breach | 5 | 2 | 1.83 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:breach | 6 | 2.75 | 1.47 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 3 | 0.65 | 1.17 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 4 | 1 | 1.05 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 5 | 1 | 0.93 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| west:boss | 6 | 1.27 | 0.84 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:frontier | 3 | 2 | 4.59 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 4 | 8 | 2.37 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 5 | 6 | 1.43 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 6 | 1.7 | 3.85 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:frontier | 7 | 6 | 1.26 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:breach | 3 | 1.5 | 1.77 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 4 | 2.75 | 1.47 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 5 | 2 | 0.93 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 6 | 2.75 | 0.87 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:breach | 7 | 1.27 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:minion:1 | 3 | 2 | 1.45 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 4 | 1.7 | 1.45 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 5 | 6 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 6 | 3 | 1.63 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:1 | 7 | 3 | 1.26 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 3 | 3.4 | 0.8 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 4 | 1.7 | 1.21 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 5 | 2.55 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 6 | 3 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:2 | 7 | 3 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 3 | 2.3 | 1 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 4 | 2 | 1.08 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 5 | 2.55 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 6 | 3 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:3 | 7 | 3 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 3 | 6 | 0.33 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 4 | 6.8 | 0.34 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 5 | 2 | 0.78 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 6 | 4 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:minion:4 | 7 | 3 | 0.89 | Prevent first-round guaranteed clears; calibrate ordinary risk |
| cyberhell:ruler:th | 3 | 1.7 | 1.23 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 4 | 2 | 1.35 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 5 | 2.75 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 6 | 3.16 | 1.08 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:th | 7 | 2.75 | 1.23 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 3 | 2 | 1.05 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 4 | 2 | 1.24 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 5 | 2 | 1.35 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 6 | 2.75 | 1.24 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:asia | 7 | 3.16 | 1.4 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 3 | 1 | 1.17 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 4 | 1.5 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 5 | 1.5 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 6 | 2 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:west | 7 | 2 | 1.35 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 3 | 1 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 4 | 1 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 5 | 1.5 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 6 | 2 | 0.99 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:ruler:cyberhell | 7 | 2 | 1.11 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 3 | 0.65 | 0.81 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 4 | 1 | 0.75 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 5 | 1.15 | 0.69 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 6 | 1.5 | 0.63 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |
| cyberhell:boss | 7 | 1.5 | 0.69 | Keep boss tempo near 4–7 rounds and support-team survival nonzero |

## Outstanding target rows

Sampled extremes: none.

Ordinary outside 70–90%: th/3/frontier//false (61.5%, 6.41 W rounds); asia/4/frontier//true (95%, 5.91 W rounds); west/3/frontier//false (62%, 4.72 W rounds); west/4/frontier//true (92%, 5.73 W rounds); west/5/frontier//true (98%, 6.17 W rounds); west/6/frontier//false (57%, 5.6 W rounds); cyberhell/3/frontier//false (68.5%, 4.12 W rounds); cyberhell/3/final/minion:1/false (59.5%, 5.88 W rounds); cyberhell/3/final/minion:2/false (63.5%, 9.3 W rounds); cyberhell/3/final/minion:2/true (97%, 7.1 W rounds); cyberhell/3/final/minion:3/false (62.5%, 7.06 W rounds); cyberhell/3/final/minion:3/true (93.5%, 5.71 W rounds); cyberhell/3/final/minion:4/false (67.5%, 17.07 W rounds); cyberhell/3/final/minion:4/true (98.5%, 14.07 W rounds); cyberhell/4/frontier//true (91.5%, 5.73 W rounds); cyberhell/4/final/minion:1/true (93%, 2.96 W rounds); cyberhell/4/final/minion:2/true (93%, 2.75 W rounds); cyberhell/4/final/minion:4/true (96%, 10.58 W rounds); cyberhell/5/frontier//true (96%, 6.88 W rounds); cyberhell/5/final/minion:1/false (56%, 9.2 W rounds); cyberhell/5/final/minion:2/false (90.5%, 4.28 W rounds); cyberhell/5/final/minion:2/true (94.5%, 3.11 W rounds); cyberhell/5/final/minion:3/true (93.5%, 3.18 W rounds); cyberhell/5/final/minion:4/false (93.5%, 3.49 W rounds); cyberhell/5/final/minion:4/true (94.5%, 3.03 W rounds); cyberhell/6/frontier//true (93.5%, 1.02 W rounds); cyberhell/6/final/minion:2/false (96%, 3.29 W rounds); cyberhell/6/final/minion:2/true (95%, 2.89 W rounds); cyberhell/6/final/minion:3/false (91%, 3.8 W rounds); cyberhell/6/final/minion:3/true (94.5%, 2.97 W rounds); cyberhell/7/frontier//true (99.5%, 8.27 W rounds); cyberhell/7/final/minion:1/false (96%, 3.3 W rounds); cyberhell/7/final/minion:1/true (94.5%, 2.37 W rounds); cyberhell/7/final/minion:2/false (97%, 3.06 W rounds); cyberhell/7/final/minion:2/true (96%, 2.1 W rounds); cyberhell/7/final/minion:3/false (97%, 3.08 W rounds); cyberhell/7/final/minion:3/true (95.5%, 2.1 W rounds); cyberhell/7/final/minion:4/false (97%, 3.26 W rounds); cyberhell/7/final/minion:4/true (95%, 2.98 W rounds).

Boss winning rounds outside 4–7: asia/4/breach//true (65.5%, 3.88 W rounds); asia/5/boss//true (72%, 3.9 W rounds); cyberhell/3/breach//true (82.5%, 3.85 W rounds); cyberhell/3/final/ruler:asia/false (13%, 8.08 W rounds); cyberhell/5/final/boss/false (47.5%, 7.06 W rounds).

## Copy and layout evidence

The exact approved TUTOR read sentence adds only the support clause. The new-game third caption and Help team introduction state “นิราจะอ่านสำนวนให้ท่าน และแค่คอยช่วยอยู่ด้านหลัง”. No matching English variant of these hardcoded strings exists in i18n.js; story.js, narrative-cutscenes.js and talk-lines.js have no additional early father introduction to change. Station-duty comments and later stories remain unchanged.

All five img/intro-panel-01-v2.webp through img/intro-panel-05-v2.webp were visually inspected: no embedded introduction text needs redrawing.

teamJudgment uses “ประสานพิพากษา” on its chip, with the full name in its tooltip and the existing ability guide. Every new move gets a growing row with normal Thai wrapping and no ellipsis, including the <=700px style used at 390px. Source/VM tests cover all eight moves, real new-game office click handlers, approved copy, release import identities and frozen scaling. Browser rendering at 1280/390 is unavailable in this sandbox and remains unverified; source-contract checks are not visual acceptance.
