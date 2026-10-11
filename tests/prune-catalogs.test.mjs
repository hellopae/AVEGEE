import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

test('prune-missing preserves curated tiers, zone names, walking metadata and order; repeated runs are stable', () => {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'avegee-prune-catalogs-'));
 try {
  fs.mkdirSync(path.join(root,'scripts'));fs.mkdirSync(path.join(root,'img'));
  for(const name of ['make-manifest.py','make-preload-catalog.mjs']) fs.copyFileSync(new URL('../scripts/'+name,import.meta.url),path.join(root,'scripts',name));
  fs.writeFileSync(path.join(root,'img','live.png'),'fixture');
  fs.writeFileSync(path.join(root,'img','excluded.png'),'fixture');
  const manifest={critical:['live.png','missing.png'],rest:[],zones:{th:['live.png','missing.png']},boxes:{live:[0,0,1,1],missing:[0,0,1,1]},stationSizes:{live:[2,2],missing:[2,2]},crewWalks:{th:['live.png']},heroWalks:{th:'live.png'}};
  const catalog={shared:['missing.png','img/live.png','img/missing.png'],zones:{th:['img/live.png','img/missing.png']}};
  fs.writeFileSync(path.join(root,'img','manifest.json'),JSON.stringify(manifest));
  fs.writeFileSync(path.join(root,'img','preload-catalog.json'),JSON.stringify(catalog));
  const run=()=>{
   execFileSync('python3',['scripts/make-manifest.py','--prune-missing'],{cwd:root});
   execFileSync(process.execPath,['scripts/make-preload-catalog.mjs','--prune-missing'],{cwd:root});
   return ['manifest.json','preload-catalog.json'].map(p=>fs.readFileSync(path.join(root,'img',p),'utf8'));
  };
  const first=run();assert.deepEqual(run(),first);
  const m=JSON.parse(first[0]);assert.deepEqual(m,{...manifest,critical:['live.png'],zones:{th:['live.png']},boxes:{live:[0,0,1,1]},stationSizes:{live:[2,2]}});
  assert.deepEqual(JSON.parse(first[1]),{shared:['img/live.png'],zones:{th:['img/live.png']}});
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
