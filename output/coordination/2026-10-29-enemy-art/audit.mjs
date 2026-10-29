// Run from the repository root. Read-only asset scan; report goes to stdout.
import {readFileSync, existsSync} from 'node:fs';
import * as data from '../../../src/data.js';
import {enemyArt} from '../../../src/enemy-art.js';
import {ZONE_SKIN} from '../../../src/zone-skin.js';
import * as regional from '../../../src/regional-spirits.js';
const keys = new Map(data.MOB.kinds.map(k => [k.img,k.name]));
function collect(value) {
  if (!value || typeof value !== 'object') return;
  for (const [field,child] of Object.entries(value)) {
    if (['img','sp','art'].includes(field) && typeof child === 'string' && /^(mob-|boss-|zone-boss|leader-.*-possessed$)/.test(child)) keys.set(child, keys.get(child) || value.name || child);
    collect(child);
  }
}
collect(data); collect(ZONE_SKIN); collect(regional);
const manifest=JSON.parse(readFileSync('img/manifest.json'));
const listed=new Set([...manifest.critical,...manifest.rest,...Object.values(manifest.zones).flat()].map(p=>'img/'+p));
console.log('| Enemy key / name | Zone | Resolved file (map / battle / turn; portrait uses standee) | Exists / listed |');
console.log('|---|---|---|---|');
let missing=0;
for(const [key,name] of keys) for(const {k:zone} of data.ZONES) {
  const path=enemyArt(key,zone), ok=existsSync(path)&&listed.has(path);
  if(!ok) missing++;
  console.log(`| ${key} / ${name} | ${zone} | ${path} | ${ok?'yes / yes':'MISSING'} |`);
}
console.log(`\n${keys.size} data enemy keys × ${data.ZONES.length} zones; missing or unregistered: ${missing}.`);
process.exitCode=missing?1:0;
