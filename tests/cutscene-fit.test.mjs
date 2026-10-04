import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {planCutscene} from '../src/battle-scale.js';
// Read the shipped images directly; this test does not depend on temporary output artifacts.
const audit=JSON.parse(execFileSync('python3',['-c',`
from pathlib import Path
from PIL import Image
import json
rows=[]
for p in sorted(Path('img').rglob('*')):
 if p.suffix.lower() not in ['.png','.jpeg','.jpg','.webp'] or ('cutscene' not in p.name.lower() and not p.name.startswith('story-')) or 'raw' in p.parts: continue
 with Image.open(p) as im:
  w,h=im.size; b=im.convert('RGBA').getchannel('A').getbbox()
  rows.append({'src':str(p),'width':w,'height':h,'box':{'l':b[0]/w,'t':b[1]/h,'w':(b[2]-b[0])/w,'h':(b[3]-b[1])/h}})
print(json.dumps(rows))
`],{cwd:new URL('..',import.meta.url),encoding:'utf8'}));
test('all cutscene and story assets preserve proportions and keep visible content inside varied viewports',()=>{
 assert.ok(audit.length>50);
 for(const asset of audit)for(const [cw,ch] of [[1866,1000],[900,620],[844,390],[390,844]]){
  const p=planCutscene({cw,ch},{nw:asset.width,nh:asset.height},asset.box),b=asset.box;
  assert.ok(Math.abs(p.width/p.height-asset.width/asset.height)<1e-8,asset.src);
  assert.ok(p.left+b.l*p.width>=-1e-6 && p.top+b.t*p.height>=-1e-6,asset.src);
  assert.ok(p.left+(b.l+b.w)*p.width<=cw+1e-6 && p.top+(b.t+b.h)*p.height<=ch+1e-6,asset.src);
 }
});
test('cutscene CSS cannot crop or zoom beyond the frame; every battle cutscene uses fitted layout',()=>{
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 assert.match(html,/\.action-cutscene img\{[^}]*object-fit:contain/);
 const animations=html.match(/@keyframes actionRush[\s\S]*?(?=@keyframes speedLines)/)[0];
 for(const [,n]of animations.matchAll(/scale\(([.\d]+)\)/g))assert.ok(Number(n)<=1);
 assert.doesNotMatch(animations,/translateX/);
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 assert.match(ui,/\n  fitCutsceneImage\(cut, img\)/);
});
