import {readReleaseFile,assertModuleRelease} from './helpers/release-imports.mjs';
// N2 — (1) no neighbour-frame bleed left in the drawn combat atlases, (2) Yama stands still in the interrogation room.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync} from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {TRIAL_IDLE_TIMING} from '../src/yama-trial-idle.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const read=readReleaseFile;
const haveScipy=spawnSync('python3',['-c','import PIL,numpy,scipy']).status===0;

test('N2: every drawn combat frame is free of neighbour bleed (edge pieces, stray tops, specks)',{skip:!haveScipy&&'python3 PIL/numpy/scipy missing'},()=>{
  const log=join(mkdtempSync(join(tmpdir(),'n2-')),'pieces.json');
  const out=execFileSync('python3',[join(root,'scripts/art/clean-combat-atlas-bleed.py'),'--root',root,'--log',log],{encoding:'utf8'});
  const pieces=JSON.parse(readFileSync(log,'utf8'));
  assert.deepEqual(pieces,[],'remaining bleed pieces: '+JSON.stringify(pieces.slice(0,5))+' — run scripts/art/clean-combat-atlas-bleed.py --apply');
  assert.match(out,/pieces 0/);
});

test('N2: the atlases still match the manifest geometry (cleaning never resizes a sheet)',{skip:!haveScipy&&'python3 PIL missing'},()=>{
  const man=JSON.parse(read('img/combat-animation-v1/manifest.json')).sprites,seen=new Map();
  for(const r of Object.values(man))seen.set(r.src,r);
  const args=[...seen.entries()].map(([s,r])=>`${join(root,s)}|${r.frameWidth*r.cols}|${r.frameHeight*r.rows}`);
  const bad=JSON.parse(execFileSync('python3',['-c','import sys,json\nfrom PIL import Image\nbad=[]\nfor a in sys.argv[1:]:\n p,w,h=a.split("|");im=Image.open(p)\n if im.size!=(int(w),int(h)) or im.mode!="RGBA": bad.append([p,im.size,im.mode])\nprint(json.dumps(bad))',...args],{encoding:'utf8'}));
  assert.deepEqual(bad,[]);
});

test('N2: interrogation Yama no longer bobs; the suspect still floats',()=>{
  for(const f of ['index.html','output/game-review/index.html']){
    const h=read(f);
    assert.match(h,/\.arena\.combat-arena \.fig\.you,\.arena\.combat-arena \.fig\.foe,\.trial-hud \.hud-stage \.fig\.foe\{\s*animation:battleBreath/,f);
    assert.doesNotMatch(h,/\.trial-hud \.hud-stage \.fig\{\s*animation:battleBreath/,f);
    assertModuleRelease('src/ui.js',h,null,{entry:true});
  }
});

test('N2: trial render mounts the map idle pose with the same timing as yama-animation.js',()=>{
  assert.match(read('src/ui.js'),/mountYamaTrialIdle\(dlg\.querySelector\('\.trial-hud \.hud-stage \.fig\.you img'\),\s*g\.outfit \|\| g\.zone\)/);
  const src=read('src/yama-animation.js').match(/book:\[([\d,]+)\]/)[1].split(',').map(Number);
  assert.deepEqual([...TRIAL_IDLE_TIMING],src);
  const m=read('src/yama-trial-idle.js');
  assert.match(m,/yamaAnimationSrc\(style, 'book-idle'\)/);
  assert.match(m,/prefers-reduced-motion/);
  assert.doesNotMatch(m,/ctx\.filter|translateY|rotate\(/,'idle must never move or tint the art');
  for(const z of ['th','asia','west','cyberhell'])assert.ok(existsSync(new URL(`../img/yama-animation-v1/${z}/book-idle.webp`,import.meta.url)),z);
});
