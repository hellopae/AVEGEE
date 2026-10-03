# Semantic soul portraits — final revision

Changed src/game.js; added src/soul-portraits.js and tests/soul-portraits.test.mjs.

All four zones now use neutral semantic spirit-* image keys, selected from canonical named-case identity or profession/sex/age description. Legacy numeric and soul-* image keys are replaced, because their meaning conflicts with the new Thai art aliases. Case narrative, named identity, sex and guilt remain unchanged.

Explicit A1–A20 role assignments correct misleading old IDs: A2 bandit is worker, A4 male ruler executive, A6 researcher executive, A13 regulator officer. Female adults never use the male business sprite; teenage girl/boy remain distinct. Young investors/heirs retain executive appearance. Established merchant/property/large business archetypes use spirit-business. Elderly women use spirit-elder-woman in all zones. A caregiver's elderly father/patient does not change her own age.

Normalization runs at spawn, named-case selection, soul battle start, returned-case creation, zone switch and save restoration. Restored queue, held souls, station slots, jail sentences, closed cases, afterlife walkers, delayed returns and saved branches are covered. Returned named cases retain case key. Closed cases remember their zone.

Root art aliases required in EVERY zone: spirit-worker/executive/officer/cleric/woman/clerk/boy/girl/business/elder-woman.

Final targeted validation: seven portrait tests plus afterlife and batch19 regression suites, 21/21 passed. Thai regression includes old spirit10 schoolgirl, spirit4 female sister, sprite1 taxi/scapegoat, deva worker, A7 cult leader, A3/A13 officers. No commits/push.
