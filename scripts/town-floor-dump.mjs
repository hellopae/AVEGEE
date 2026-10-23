// M2: dump the walkable floor of a zone's town as a 1536x1024 bitmap (1 byte per preview px: 255 = walkable, 0 = blocked).
// Same floor the game walks on (mask + patches + station pads + pier rule), WITHOUT houses / props (those are objects).
//   node scripts/town-floor-dump.mjs <zone> <out.raw>
import { writeFileSync } from 'node:fs';
import { townFloorAt, applyTownZoneLayout } from '../src/town-layout.js';
const [zone = 'th', out] = process.argv.slice(2);
if (!out) { console.error('usage: node scripts/town-floor-dump.mjs <zone> <out.raw>'); process.exit(2); }
applyTownZoneLayout(zone, undefined, true);
const W = 1536, H = 1024, k = 3840 / W, buf = Buffer.alloc(W * H);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buf[y * W + x] = townFloorAt((x + .5) * k, (y + .5) * k) ? 255 : 0;
writeFileSync(out, buf);
console.log(`${zone}: ${buf.filter(v => v).length} of ${W * H} px walkable`);
