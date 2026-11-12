// Contract tests written for the v5 ground (1024 px chunks, repairs on) import this FIRST: they keep testing that set while the branch plays another one
// (ZONE1_GROUND_SET in src/zone-skin.js; the game plays 'v7r').  Per-process: node --test runs every file in its own process.
import { ZONE_SKIN, ZONE1_GROUND } from '../../src/zone-skin.js';
ZONE_SKIN.th.terrain = ZONE1_GROUND.v5;
