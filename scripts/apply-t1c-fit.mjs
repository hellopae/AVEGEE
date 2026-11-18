// T1c: merge the result of scripts/fit-t1b-harder.mjs (<dir>/*.json, FLOOR=50) for a FEW fights into src/foe-turn-fit.js and leave every other row as it is.
// (apply-t1b-fit.mjs rewrites the whole table from the dirs it is given; this one only replaces the fights found in the json.)  Same rules: fitted sizes kept, in between interpolated in log,
// above the biggest fitted size = its value.   usage: node scripts/apply-t1c-fit.mjs <dir> [<dir> ...]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { FOE_TURN_FIT, FOE_HP_FIT } from '../src/foe-turn-fit.js';
const file = new URL('../src/foe-turn-fit.js', import.meta.url);
let src = readFileSync(file, 'utf8');
const fitted = {};
for (const dir of process.argv.slice(2)) for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
  const t = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).table;
  for (const [k, sizes] of Object.entries(t)) fitted[k] = { ...(fitted[k] || {}), ...sizes };
}
const mult = structuredClone(FOE_TURN_FIT), hp = structuredClone(FOE_HP_FIT);
for (const [k, sizes] of Object.entries(fitted)) {
  const have = Object.keys(sizes).map(Number).sort((a, b) => a - b), lo = have[0], hi = have.at(-1);
  const at = (size, field) => {
    if (sizes[size]) return sizes[size][field];
    if (size > hi) return sizes[hi][field];
    if (size < lo) return sizes[lo][field];
    const a = have.filter(s => s < size).at(-1), b = have.find(s => s > size), u = (size - a) / (b - a);
    return Math.exp(Math.log(sizes[a][field]) * (1 - u) + Math.log(sizes[b][field]) * u);
  };
  mult[k] = {}; delete hp[k];
  for (let s = 3; s <= 7; s++) { mult[k][s] = +at(s, 'mult').toFixed(3); const h = +at(s, 'hp').toFixed(3); if (h !== 1) (hp[k] ||= {})[s] = h; }
}
const fmt = o => '{\n' + Object.keys(o).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(o[k]).replace(/"(\d)":/g, '$1:')},`).join('\n') + '\n}';
src = src.replace(/export const FOE_TURN_FIT = \{[\s\S]*?\n\};/, `export const FOE_TURN_FIT = ${fmt(mult)};`);
src = src.replace(/export const FOE_HP_FIT = \{[\s\S]*?\n\};/, `export const FOE_HP_FIT = ${fmt(hp)};`);
writeFileSync(file, src);
console.log('replaced:', Object.keys(fitted).join(', '));
