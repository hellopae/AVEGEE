// Contract tests written for the v5 ground (1024 px chunks, repairs on) import this FIRST: they keep testing the loader against that set while the branch plays another one
// (ZONE1_GROUND_SET in src/zone-skin.js; the game plays 'v7r').  Per-process: node --test runs every file in its own process.
// FB3-CLEAN2 (26 Nov 2026): the v5 files (img/map-zone1/v5, img/map-zone1/repairs) and their registry entries were removed from the repo (git 6e752785).  This helper is now the only place that
// still describes them, so the tests (which use mocked images, never the files) keep running the same loader code with the same numbers.
import { ZONE_SKIN } from '../../src/zone-skin.js';
import { TOWN_TERRAIN_REPAIRS } from '../../src/town-terrain-repair.js';
export const ZONE1_V5 = Object.freeze({ dir:'img/map-zone1/v5/', preview:'img/map-zone1/v5/zone1-terrain-v5-preview.webp',
                                        fullPx:Object.freeze({ w:4915, h:3277 }), chunk:1024, repairs:true });
ZONE_SKIN.th.terrain = ZONE1_V5;
if (!TOWN_TERRAIN_REPAIRS.length) TOWN_TERRAIN_REPAIRS.push(...[
  {row:2,col:3,url:'img/map-zone1/repairs/r2-c3-v1.webp',border:80,fade:48,boxes:[[590,115,975,345],[365,515,1024,870],[110,710,365,940]]},
  {row:3,col:3,url:'img/map-zone1/repairs/r3-c3-pier-v1.webp',border:16,fade:16,boxes:[[630,40,1000,360]]},
  {row:1,col:3,url:'img/map-zone1/repairs/r1-c3-v1.webp',border:16,fade:16,boxes:[[290,775,850,1024]]},
].map(d => Object.freeze({ ...d, boxes:Object.freeze(d.boxes.map(Object.freeze)) })));
