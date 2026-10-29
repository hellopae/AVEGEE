# C1 balance simulation — 2026-10-29

Deterministic model, not browser QA or a claim of final gameplay balance. Commands use confirmBattleCommand / finishBattleCommand and the actual per-actor queue.

## Assumptions

Astra §3 levels 2/3/4/5, training Lv1, no strength upgrades, fire control, equipment or added critical bonus. Teams 3 = Yama/Taan/Plerng; 5 adds Dam/Nira; 7 adds Boon/Guard. Team 4 adds Guard to team 3; team 6 adds Guard to team 5. The hypothetical cap is overridden equally in before/after to compare every size in every zone. Gameplay cap progression is tested separately. Before = original skills and unscaled foes; after = new skills plus encounter profile. Existing 25% story finales remain. Final boss pressure is 3.25 before and 2.25 after; other pressure entries are unchanged.

Damage-only table: enemy ATK zero, MP 10000, healers strike, no seconds advance (ally CD does not refresh), no deaths/items. This isolates elimination speed like Astra, and is not a survival prediction.

Survival samples: 10 seeds per zone/size, real HP/MP, enemies act normally, 1 active battle second per completed command, finite health/holyWater stocks each ceil(size/2). Policy prioritizes health items at 45 missing HP, support at 20 missing HP, MP restore below 24, then available ultimate/new special/basic attack. Boss selected first. No manual player tactics are inferred.

## Damage-only: remaining enemy HP at each round end (before → after)

| Zone | Team | Boss HP sequence before | After | Initial total HP before → after | Foes before → after |
|---|---:|---|---|---|---|
| th | 3 | 646→565→503→443→371→307→0 | 596→489→423→359→300→0 | 783 → 783 | 3 → 3 |
| th | 5 | 593→493→394→293→0 | 681→535→433→325→0 | 783 → 953 | 3 → 3 |
| th | 7 | 522→378→0 | 831→638→488→0 | 783 → 1208 | 3 → 4 |
| asia | 3 | 326→229→0 | 264→0 | 480 → 480 | 3 → 3 |
| asia | 5 | 262→0 | 346→0 | 480 → 665 | 3 → 4 |
| asia | 7 | 0 | 406→0 | 480 → 850 | 3 → 5 |
| west | 3 | 312→200→128→64→0 | 240→128→64→0 | 483 → 483 | 3 → 3 |
| west | 5 | 238→99→0 | 310→129→35→0 | 483 → 671 | 3 → 4 |
| west | 7 | 143→0 | 357→142→0 | 483 → 860 | 3 → 5 |
| cyberhell | 3 | 375→254→158→62→0 | 290→216→120→24→0 | 563 → 563 | 4 → 4 |
| cyberhell | 5 | 290→158→0 | 292→158→24→0 | 563 → 701 | 4 → 4 |
| cyberhell | 7 | 192→0 | 288→38→0 | 563 → 838 | 4 → 4 |

## Frontier and breach boss-only samples

| Zone | Team | Encounter | Before rounds / enemy actions | After rounds / enemy actions | HP before → after |
|---|---:|---|---|---|---|
| th | 3 | frontier | 1 / 1 | 1 / 0 | 78 → 78 |
| th | 3 | breach | 2 / 3 | 2 / 3 | 153 → 153 |
| th | 5 | frontier | 1 / 0 | 1 / 0 | 78 → 156 |
| th | 5 | breach | 2 / 2 | 2 / 3 | 153 → 233 |
| th | 7 | frontier | 1 / 0 | 1 / 1 | 78 → 234 |
| th | 7 | breach | 1 / 2 | 2 / 4 | 153 → 312 |
| asia | 3 | frontier | 1 / 1 | 1 / 1 | 90 → 90 |
| asia | 3 | breach | 2 / 1 | 1 / 1 | 156 → 156 |
| asia | 5 | frontier | 1 / 0 | 1 / 0 | 90 → 180 |
| asia | 5 | breach | 1 / 1 | 1 / 2 | 156 → 264 |
| asia | 7 | frontier | 1 / 0 | 1 / 1 | 90 → 270 |
| asia | 7 | breach | 1 / 1 | 2 / 3 | 156 → 397 |
| west | 3 | frontier | 1 / 1 | 1 / 1 | 101 → 101 |
| west | 3 | breach | 2 / 1 | 1 / 1 | 188 → 188 |
| west | 5 | frontier | 1 / 0 | 1 / 0 | 101 → 202 |
| west | 5 | breach | 1 / 1 | 1 / 2 | 188 → 318 |
| west | 7 | frontier | 1 / 0 | 1 / 1 | 101 → 303 |
| west | 7 | breach | 1 / 1 | 2 / 3 | 188 → 480 |
| cyberhell | 3 | frontier | 1 / 1 | 1 / 1 | 113 → 113 |
| cyberhell | 3 | breach | 2 / 1 | 1 / 1 | 225 → 225 |
| cyberhell | 5 | frontier | 1 / 0 | 1 / 0 | 113 → 226 |
| cyberhell | 5 | breach | 1 / 1 | 1 / 2 | 225 → 380 |
| cyberhell | 7 | frontier | 1 / 0 | 1 / 1 | 113 → 339 |
| cyberhell | 7 | breach | 1 / 1 | 2 / 3 | 225 → 575 |

## Survival samples: wins, rounds, attrition and resource use

| Zone | Team | Before wins/10 | After wins/10 | After mean rounds | After mean fallen | After mean medicines | After mean MP spent | After mean healing / shield absorbed |
|---|---:|---|---|---:|---:|---:|---:|---|
| th | 3 | 0 | 4 | 5.8 | 0.7 | 3.1 | 48.8 | 0.0 / 0.0 |
| th | 4 | 6 | 8 | 5.1 | 0.6 | 3.0 | 36.8 | 0.0 / 0.0 |
| th | 5 | 10 | 10 | 5.9 | 0.3 | 4.0 | 53.6 | 35.2 / 14.4 |
| th | 6 | 10 | 10 | 4.5 | 0.0 | 4.0 | 32.0 | 35.2 / 18.0 |
| th | 7 | 10 | 10 | 5.0 | 0.1 | 5.0 | 32.0 | 68.2 / 32.4 |
| asia | 3 | 7 | 9 | 2.8 | 0.0 | 1.6 | 32.0 | 0.0 / 0.0 |
| asia | 4 | 10 | 10 | 2.0 | 0.0 | 1.6 | 32.0 | 0.0 / 0.0 |
| asia | 5 | 10 | 10 | 2.8 | 0.0 | 2.6 | 32.0 | 29.2 / 17.6 |
| asia | 6 | 10 | 10 | 1.9 | 0.0 | 1.9 | 29.6 | 3.0 / 2.2 |
| asia | 7 | 10 | 10 | 2.0 | 0.0 | 3.0 | 32.0 | 38.5 / 24.1 |
| west | 3 | 0 | 3 | 4.9 | 0.6 | 2.1 | 34.4 | 0.0 / 0.0 |
| west | 4 | 7 | 9 | 3.7 | 0.5 | 2.0 | 34.4 | 0.0 / 0.0 |
| west | 5 | 10 | 5 | 5.0 | 2.2 | 3.0 | 41.6 | 39.0 / 25.0 |
| west | 6 | 10 | 10 | 3.6 | 0.5 | 3.0 | 32.0 | 44.0 / 22.5 |
| west | 7 | 10 | 10 | 4.1 | 0.4 | 4.0 | 32.0 | 108.6 / 45.2 |
| cyberhell | 3 | 0 | 0 | 4.3 | 1.3 | 1.9 | 36.8 | 0.0 / 0.0 |
| cyberhell | 4 | 0 | 8 | 4.8 | 1.3 | 2.0 | 39.2 | 0.0 / 0.0 |
| cyberhell | 5 | 0 | 1 | 3.8 | 2.5 | 3.0 | 34.4 | 44.0 / 26.1 |
| cyberhell | 6 | 0 | 4 | 4.1 | 3.2 | 3.0 | 36.8 | 45.6 / 26.1 |
| cyberhell | 7 | 2 | 10 | 3.5 | 0.2 | 3.7 | 32.0 | 84.3 / 18.3 |

## Story-cap teams, including Guard (after)

Thai/West/Cyber teams use the compositions above. Asia 5 uses Yama/Taan/Plerng/Nira/Guard. Ten seeds per phase, same finite resources and policy.

| Zone | Team | Wins/10 | Mean rounds | Mean medicines | Mean MP spent |
|---|---:|---:|---:|---:|---:|
| th | 4 | 8 | 5.1 | 3.0 | 36.8 |
| asia | 5 | 10 | 2.2 | 2.6 | 32.0 |
| west | 6 | 10 | 3.6 | 3.0 | 32.0 |
| cyberhell | 7 | 10 | 3.5 | 3.7 | 32.0 |

Limitations: no browser/layout/facing observation; the requested visual review remains with Dale. No player reaction-time model, map downtime or complete nine-encounter finale run. Results measure this fixed policy, not a probability of a human winning. Raw per-seed results and HP histories are in balance.json.
