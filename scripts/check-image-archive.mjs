import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root=process.cwd();
const load=rel=>import('file://'+root+'/'+rel);
const zones=['th','asia','west','cyberhell'];
const manifest=JSON.parse(fs.readFileSync('img/manifest.json'));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {set src(s){this.value=s;}};
globalThis.document={querySelector:()=>true};
const art=await load('src/art.js');await new Promise(r=>setImmediate(r));
const {themeArt,themeBackground,THEME_STATIONS}=await load('src/theme-assets.js');
const {swordSheet}=await load('src/yama-sword.js');
const {powerCutsceneImage}=await load('src/power-cutscene-assets.js');
const ui=fs.readFileSync('src/ui.js','utf8');
const action=ui.slice(ui.indexOf('function actionCutsceneSrc('),ui.indexOf('/** Crew and Guard',ui.indexOf('function actionCutsceneSrc(')));
const cases=[];
const add=(label,value)=>cases.push({label,value});
for(const z of zones){
 art.bindZone(()=>z);art.bindHeroStyle(()=>z);
 for(const k of THEME_STATIONS)add(`${z}:station:${k}`,themeArt('st-'+k,z));
 for(const k of ['map','arena','frontier'])add(`${z}:background:${k}`,themeBackground(z,k));
 for(const k of ['crew-guard','crew-guard-profile','hero-boss','hero-boss-profile','hero-yama-walk','hero-yama-walk-4dir'])add(`${z}:art:${k}`,art.artUrl(k));
 add(`${z}:sword`,swordSheet(z).src);
 for(const bigFire of [true,false]){
  const c={g:{outfit:z,zone:z,abilities:{bigFire,flameCharge:true,windFan:true,rage:true,valkyrieSpear:true,cooldownClock:true}},powerCutsceneImage};
  vm.createContext(c);vm.runInContext(action,c);
  for(const k of ['roar','hypno','mirror','fire','ice','flameCharge','windFan','rage','valkyrieSpear','cooldownClock'])add(`${z}:${bigFire}:action:${k}`,c.actionCutsceneSrc(k));
 }
}
const reachable=new Set();
function visit(f){if(reachable.has(f)||!fs.existsSync(f))return;reachable.add(f);const s=fs.readFileSync(f,'utf8');for(const m of s.matchAll(/(?:from\s*|import\s*\(\s*|import\s*)['"]([^'"]+\.js)['"]/g)){if(m[1].startsWith('.'))visit(path.normalize(path.join(path.dirname(f),m[1])));}}
visit('src/ui.js');visit('src/preload.js');
const audit=JSON.parse(fs.readFileSync('docs/image-archive-2026-10-07.json'));
const archived=new Set(audit.images.map(x=>x.original));
assert.deepEqual(cases,audit.verifiedSelections,'Active asset selections changed: review archive before updating the baseline');
for(const c of cases){if(c.value && (!fs.existsSync(c.value)||archived.has(c.value)))throw Error(`Invalid selected asset: ${c.label}: ${c.value}`);}
const listed=[...manifest.critical,...manifest.rest,...Object.values(manifest.zones).flat()].map(x=>'img/'+x);
const catalog=JSON.parse(fs.readFileSync('img/preload-catalog.json'));
listed.push(...catalog.shared,...Object.values(catalog.zones).flat());
for(const file of listed){if(!fs.existsSync(file)||archived.has(file))throw Error(`Invalid loading-list asset: ${file}`);}
for(const entry of audit.images){
  if(fs.existsSync(entry.original))throw Error(`Archived file still shipped: ${entry.original}`);
  if(fs.existsSync(entry.backup))assert.equal(createHash('sha256').update(fs.readFileSync(entry.backup)).digest('hex'),entry.sha256,`Backup checksum: ${entry.backup}`);
}
if(reachable.has('src/yama-sword-assets.js'))throw Error('Legacy sword module became reachable; review archive');
console.log(`Verified ${cases.length} asset selections and ${listed.length} loading-list entries; no archive references.`);
