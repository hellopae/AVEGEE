import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {coverFit, coverTracks, coverFxActive, installCoverFx, COVER_FX_SIZE, COVER_FX_BUDGET} from '../src/cover-fx-h5b.js';
import {zoneTiers} from '../src/asset-preload.js';
const html=readFileSync('index.html','utf8');
test('fx layer stays between the still art and scrim, crops with the art, cannot intercept buttons (no cover video layer any more)',()=>{
  assert.ok(html.indexOf('id="cover-art"')<html.indexOf('id="cover-fx-h5b"'));
  assert.ok(!html.includes('id="cover-vfx"'));
  assert.ok(html.indexOf('id="splash"')<html.indexOf('id="title"'));
  assert.ok(html.indexOf('id="cover-fx-h5b"')<html.indexOf('<div class="scrim">'));
  assert.match(html,/#cover-fx-h5b\{[^}]*object-fit:cover;object-position:center;pointer-events:none/);
  assert.match(html,/@media\(prefers-reduced-motion:reduce\)\{#cover-fx-h5b\{display:none\}\}/);
  const fit=coverFit(390,844);
  assert.equal(fit.y,0); assert.ok(fit.x<0);
  assert.equal(fit.x+1376*fit.scale/2,195);
  assert.deepEqual(coverFit(1376,768),{scale:1,x:0,y:0});
});
test('masks are background assets, manually registered in both manifests',()=>{
  const catalog=JSON.parse(readFileSync('img/preload-catalog.json'));
  const manifest=JSON.parse(readFileSync('img/manifest.json'));
  const tiers=zoneTiers(catalog,'th','th');
  for(const kind of ['lava','fire','volcano','soul']) {
    const path=`img/cover-fx/${kind}-v4-mask.png`;
    assert.ok(!catalog.shared.includes(`img/cover-fx/${kind}-mask.png`)&&!manifest.rest.includes(`cover-fx/${kind}-mask.png`),'old v5 masks are no longer registered');
    assert.ok(catalog.shared.includes(path)); assert.ok(manifest.rest.includes(path.slice(4)));
    assert.ok(tiers.background.includes(path)); assert.ok(!tiers.critical.includes(path));
  }
});
test('bounded anchor cache samples only nonzero mask pixels',()=>{
  const [w,h]=COVER_FX_SIZE, data=new Uint8ClampedArray(w*h*4);
  data[(12*w+9)*4+3]=255;
  assert.deepEqual(coverTracks(data,'lava'),Array.from({length:COVER_FX_BUDGET.lava},()=>[9,12]));
  assert.deepEqual(coverTracks(new Uint8ClampedArray(w*h*4),'fire'),[]);
});
function harness({fail=false}={}) {
  const listeners=new Map(), classes=new Set(), pending=new Map(); let next=0, loadCount=0, draws=0, changes;
  const context=()=>({clearRect(){},drawImage(){draws++;},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){},ellipse(){},fill(){},getImageData(){return {data:new Uint8ClampedArray(688*384*4)}}});
  const canvas=()=>{const value={getContext(){return c}}; const c=context(); c.canvas=value;return value;};
  const title={classList:{contains:k=>classes.has(k)},style:{},hidden:false};
  const target=canvas(), motion={matches:false,addEventListener(k,v){changes=v},removeEventListener(){}};
  const doc={hidden:false,getElementById:id=>id==='title'?title:target,createElement:canvas,
    addEventListener(k,v){listeners.set(k,v)},removeEventListener(k){listeners.delete(k)}};
  let observe;
  const win={matchMedia:()=>motion,performance:{now:()=>0},requestAnimationFrame:f=>{pending.set(++next,f);return next},cancelAnimationFrame:id=>pending.delete(id),
    MutationObserver:class{constructor(f){observe=f}observe(){}disconnect(){}},
    Image:class{set src(v){loadCount++;queueMicrotask(()=>fail?this.onerror(new Error('missing')):this.onload())}}};
  const dispose=installCoverFx(doc,win);
  return {doc,title,motion,classes,pending,dispose,get loads(){return loadCount},get draws(){return draws},sync:()=>observe(),change:()=>changes(),tick(t){const [id,fn]=pending.entries().next().value;pending.delete(id);fn(t)}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('settle starts once, exits cancel RAF, resume fades again, reduced motion and hidden tab stop',async()=>{
  const h=harness(); assert.equal(h.loads,0); assert.equal(h.pending.size,0);
  h.classes.add('cover-settled');h.sync(); await flush();
  assert.equal(h.loads,4);assert.equal(h.pending.size,1);
  h.sync();assert.equal(h.pending.size,1);h.tick(250);assert.ok(h.draws>4);
  h.classes.add('gone');h.sync();assert.equal(h.pending.size,0);
  h.classes.delete('gone');h.sync();assert.equal(h.pending.size,1);assert.equal(h.loads,4);
  h.motion.matches=true;h.change();assert.equal(h.pending.size,0);
  h.motion.matches=false;h.change();assert.equal(h.pending.size,1);
  h.doc.hidden=true;h.sync();assert.equal(h.pending.size,0);
  h.doc.hidden=false;h.sync();assert.equal(h.pending.size,1);
  h.dispose();assert.equal(h.pending.size,0);h.sync();assert.equal(h.pending.size,0);
});
test('exit during async mask load and mask failure cannot start a background loop',async()=>{
  for(const fail of [false,true]) {
    const h=harness({fail});h.classes.add('cover-settled');h.sync();
    h.classes.add('gone');h.sync();await flush();assert.equal(h.pending.size,0);
    if(fail){h.classes.delete('gone');h.sync();assert.equal(h.pending.size,0);}
    h.dispose();
  }
});
test('hidden and unsettled covers are inactive',()=>{
  const h=harness(); assert.equal(coverFxActive(h.title,h.doc,h.motion),false);
  h.classes.add('cover-settled');h.title.hidden=true;assert.equal(coverFxActive(h.title,h.doc,h.motion),false);h.dispose();
});
test('fx loads the v4 masks and the h5b module cache-busts with the intro-v3 suffix',()=>{
  const js=readFileSync('src/cover-fx-h5b.js','utf8');
  assert.match(js,/img\/cover-fx\/\$\{kind\}-v4-mask\.png/);
  assert.doesNotMatch(js,/\$\{kind\}-mask\.png/);
  assert.match(html,/src\/cover-fx-h5b\.js\?v=h5b-intro-v3"/);
  assert.match(html,/src\/ui\.js\?v=20261009[^"]*-zoom-intro-v3[^"]*"/);
  assert.match(readFileSync('src/preload.js','utf8'),/CATALOG_VERSION = '20261008[^']*-zoom-intro-v3'/);
  assert.match(readFileSync('src/art.js','utf8'),/manifest\.json\?v=20261009[^']*-h4-zoom-intro-v3'/);
});
test('shipped v4 masks are 688x384 binary alpha, never cover the characters or throne',()=>{
  const result=execFileSync('python3',['-c',`
from PIL import Image, ImageChops
union=Image.new('L',(688,384))
for kind in ['lava','fire','volcano','soul']:
 m=Image.open(f'img/cover-fx/{kind}-v4-mask.png')
 assert m.size==(688,384)
 a=m.getchannel('A')
 assert set(a.tobytes())=={0,255}
 union=ImageChops.lighter(union,a)
# Main characters and throne remain untouched (cover-reference coordinates).
# + cover-v4's back-facing Yama (hair, crown, back, robe, boots) — the figure that differs from cover-v5
for x,y in [(530,225),(290,405),(560,450),(880,405),(1040,475),(1394,331),(545,330),(548,380),(545,430),(520,480),(580,480),(548,300)]:
 assert union.getpixel((round(x*688/1678),round(y*384/937)))==0
print('masks ok')
`],{encoding:'utf8'});
  assert.match(result,/masks ok/);
});
