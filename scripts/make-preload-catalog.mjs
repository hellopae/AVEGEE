// Only shipped images: never include raw art, experiments or untracked references.
import { execFileSync } from 'node:child_process';
import { writeFileSync, statSync } from 'node:fs';
const zones = ['th', 'asia', 'west', 'cyberhell'];
const catalog = { shared: [], zones: Object.fromEntries(zones.map(z => [z, []])) };
const files = execFileSync('git', ['ls-files', '-z', 'img'], { encoding:'utf8' }).split('\0');
for (const path of files) {
  // Keep the original sword artwork for comparison, but only preload the corrected animation.
  if (path.startsWith('img/yama-sword-v1/') || path === 'img/yama-sword-v2/hero-yama-th-sword.webp') continue;
  if (!/\.(png|jpe?g|webp)$/i.test(path) || path.startsWith('img/raw/')) continue;
  const name = path.split('/').at(-1);
  const folder = path.split('/')[1].toLowerCase();
  let zone = ({ thai:'th', asia:'asia', west:'west', cyberhell:'cyberhell' })[folder];
  zone ||= zones.find(z => new RegExp(`(?:^|-)${z}(?:-|\\.)`).test(name));
  // Original hero/crew portraits and Thai station backgrounds are still fallback assets.
  if (!zone && /^(hero-|crew-|BG-|intro-|st-)/.test(name)) zone = 'th';
  (zone ? catalog.zones[zone] : catalog.shared).push(path);
}
writeFileSync('img/preload-catalog.json', JSON.stringify(catalog, null, 2) + '\n');
for (const [key, list] of Object.entries({ shared:catalog.shared, ...catalog.zones }))
  console.log(`${key}: ${list.length} images, ${(list.reduce((s,p) => s + statSync(p).size, 0)/1048576).toFixed(1)} MB`);
