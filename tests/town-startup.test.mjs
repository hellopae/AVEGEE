import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {townStartupAssets,withTownStartupAssets,startupImage,retainStartupImage} from '../src/town-startup.js';
import {loadImage,zoneTiers} from '../src/asset-preload.js';
import {ZONE_SKIN} from '../src/zone-skin.js';
import {themeArt,THEME_STATIONS} from '../src/theme-assets.js';

test('first painted frame gates the exact current facades, trees, houses and canteen even with an empty catalog',()=>{
 for(const zone of ['th','asia','west']){
  const urls=townStartupAssets(zone),t=withTownStartupAssets({critical:[],background:[],late:[]},zone);
  assert(urls.length<40,'only exterior bundle, not full cast');
  for(const url of [...Object.values(ZONE_SKIN[zone].art),...THEME_STATIONS.map(k=>themeArt(`st-${k}`,zone)),'img/workers/canteen-v1.webp'])assert(t.critical.includes(url),`${zone}: ${url}`);
  assert(urls.every(p=>existsSync(p)),zone);
  assert(!urls.some(p=>/cutscene|rooms-wide|\/r\d+-c\d+/.test(p)));
 }
 assert.deepEqual(townStartupAssets('cyberhell'),[],'unfinished skin remains disabled');
});
test('startup promotion partitions tiers without duplication or dropping old assets',()=>{
 const catalog=JSON.parse(readFileSync('img/preload-catalog.json'));
 for(const zone of ['th','asia','west']){
  const old=zoneTiers(catalog,zone),t=withTownStartupAssets(old,zone),all=Object.values(t).flat();
  assert.equal(all.length,new Set(all).size);
  assert.deepEqual(new Set(all),new Set([...Object.values(old).flat(),...townStartupAssets(zone)]));
 }
});
test('decoded first-frame image stays usable by its renderer after the gate resolves',async()=>{
 const oldImage=globalThis.Image;let finish;
 try{
  globalThis.Image=class{
   naturalWidth=64;naturalHeight=64;complete=true;
   set src(value){this.url=value;queueMicrotask(()=>this.onload?.());}
   decode(){return new Promise(r=>{finish=r;});}
  };
  const url='img/workers/canteen-v1.webp';let ready=false;
  const p=loadImage(url,1000).then(im=>{retainStartupImage(url,im);ready=true;return im;});
  await new Promise(r=>setTimeout(r,0));assert.equal(ready,false);assert.equal(startupImage(url),null);
  finish();const im=await p;assert.equal(startupImage(url),im);assert.equal(im.naturalWidth,64);
 }finally{globalThis.Image=oldImage;}
});
