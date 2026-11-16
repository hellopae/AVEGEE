// T1b: write the result of scripts/fit-t1b-harder.mjs (<dir>/*.json) into src/foe-turn-fit.js.  A fight is fitted at team size 3 and at the biggest team of its zone;
// the sizes in between are interpolated (in log) and the sizes above the biggest keep its value.  usage: node scripts/apply-t1b-fit.mjs <dir> [<dir> ...]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
const file = new URL('../src/foe-turn-fit.js', import.meta.url);
let src = readFileSync(file, 'utf8');
const fitted = {};   // fitKey -> {size: {mult, hp}}
for (const dir of process.argv.slice(2)) for (const f of readdirSync(dir).filter(x => x.endsWith('.json'))) {
  const t = JSON.parse(readFileSync(`${dir}/${f}`, 'utf8')).table;
  for (const [k, sizes] of Object.entries(t)) fitted[k] = { ...(fitted[k] || {}), ...sizes };
}
const mult = {}, hp = {};
for (const [k, sizes] of Object.entries(fitted)) {
  const have = Object.keys(sizes).map(Number).sort((a, b) => a - b), lo = have[0], hi = have.at(-1);
  const at = (size, field) => {
    if (sizes[size]) return sizes[size][field];
    if (size > hi) return sizes[hi][field];
    if (size < lo) return sizes[lo][field];
    const a = have.filter(s => s < size).at(-1), b = have.find(s => s > size), u = (size - a) / (b - a);
    return Math.exp(Math.log(sizes[a][field]) * (1 - u) + Math.log(sizes[b][field]) * u);
  };
  for (let s = 3; s <= 7; s++) { (mult[k] ||= {})[s] = +at(s, 'mult').toFixed(3); const h = +at(s, 'hp').toFixed(3); if (h !== 1) (hp[k] ||= {})[s] = h; }
}
const fmt = o => '{\n' + Object.keys(o).sort().map(k => `  ${JSON.stringify(k)}: ${JSON.stringify(o[k]).replace(/"(\d)":/g, '$1:')},`).join('\n') + '\n}';
src = src.replace(/export const FOE_TURN_FIT = \{[\s\S]*?\n\};/, `export const FOE_TURN_FIT = ${fmt(mult)};`);
src = src.replace(/export const FOE_HP_FIT = \{[\s\S]*?\n\};/, `export const FOE_HP_FIT = ${fmt(hp)};`);
writeFileSync(file, src);
console.log('fights:', Object.keys(mult).length, 'with HP correction:', Object.keys(hp).join(', '));
