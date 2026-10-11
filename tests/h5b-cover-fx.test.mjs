import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {coverFit, coverFxActive, coverFxSize, installCoverFx, createCoverEngine, COVER_FX_SIZE, COVER_FX_LEVEL, COVER_IMAGE, isFall, splitLava, dilateAlpha, labelBlobs, scatterPoints, flicker, pulse, flowPhases} from '../src/cover-fx-h5b.js';
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
const W=688,H=384;
const block=(x0,y0,x1,y1,w=W,h=H)=>{const a=new Uint8Array(w*h);for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)a[y*w+x]=255;return a;};
test('mask helpers: lava is split into river and falls, dilation grows, blobs are labelled, anchors skip the keep-out box',()=>{
  assert.ok(isFall(W*.8,H*.3)&&!isFall(W*.5,H*.9)&&!isFall(W*.5,H*.3));
  const lava=block(500,60,540,200); const {river,fall}=splitLava(lava);
  assert.ok(fall.some(Boolean)&&!river.some(Boolean),'vertical strip on the right shelf is a fall');
  const low=splitLava(block(100,330,300,380)); assert.ok(low.river.some(Boolean)&&!low.fall.some(Boolean));
  const d=dilateAlpha(block(50,50,52,52),W,H,3,3,9,1); assert.equal(d[(50-9)*W+50],255); assert.equal(d[(50-10)*W+50],0); assert.equal(d[52*W+50],255); assert.equal(d[54*W+50],0);
  const two=new Uint8Array(W*H); two.set(block(10,10,30,40),0); for(let y=100;y<130;y++)for(let x=200;x<230;x++)two[y*W+x]=255;
  const blobs=labelBlobs(two,W,H,10); assert.equal(blobs.length,2); assert.ok(blobs[0].cx<blobs[1].cx);
  assert.ok(scatterPoints(block(100,100,200,200),W,H,3,[100,100,200,200]).length===0);
  assert.ok(scatterPoints(block(100,100,200,200),W,H,3).length>0);
});
test('timing helpers: flow cross-fade is seamless, flicker and pulse stay irregular and in range, canvas size is capped',()=>{
  for(const t of [0,.37,1.1,2.9]){ const [p0,p1,w0,w1]=flowPhases(t,3.4); assert.ok(Math.abs(w0+w1-1)<1e-9); assert.ok(p0>=0&&p0<1&&p1>=0&&p1<1); }
  const f=Array.from({length:600},(_,k)=>flicker(k/60,2)); assert.ok(Math.min(...f)>=0&&Math.max(...f)<=1);
  assert.ok(Math.max(...f)-Math.min(...f)>.6,'flame flicker swings widely');
  const p=Array.from({length:600},(_,k)=>pulse(k/30)); assert.ok(Math.max(...p)-Math.min(...p)>.6,'volcano pulse swings widely');
  const [w,h]=coverFxSize(1600,900,1); assert.deepEqual([w,h],[1600,900]);
  const [bw,bh]=coverFxSize(3840,2160,2); assert.ok(bw*bh<=2.62e6&&bw>=1600);
  const [mw,mh]=coverFxSize(390,844,3); assert.deepEqual([mw,mh],[585,1266]);
});
test('visibility floors: nobody tones the effect back down to the H5b-v1 whisper (alpha<=.17, pulse<=.047)',()=>{
  const L=COVER_FX_LEVEL;
  assert.ok(L.sheen>=.5); assert.ok(L.fireTint[1]>=.6&&L.fireTint[1]-L.fireTint[0]>=.35); assert.ok(L.halo[1]>=.6&&L.halo[1]-L.halo[0]>=.35);
  assert.ok(L.volcano[1]>=.6&&L.volcano[1]-L.volcano[0]>=.35); assert.ok(L.warp.river>=2&&L.warp.fall>=1&&L.warp.fire>=3);
  assert.ok(L.flow.river[0]>=24&&L.flow.river[1]<=4&&L.flow.fall[1]<=2); assert.ok(L.stretch>=.12);
  assert.ok(L.sparks.mobile>=3&&L.embers.mobile>=15&&L.bubbles.mobile>=5&&L.smoke>=5);
  assert.ok(L.sparks.mobile<=L.sparks.desktop&&L.embers.mobile<=L.embers.desktop,'mobile may use fewer particles, never more');
});
/** Recording 2D context: remembers composite op + alpha with every draw so we can assert what a frame actually does. */
function fakeContext(log){
  const state={globalAlpha:1,globalCompositeOperation:'source-over'};
  const ctx=new Proxy(state,{get(t,k){
    if(k in t) return t[k];
    if(k==='createImageData') return (w,h)=>({data:new Uint8ClampedArray(w*h*4)});
    if(k==='createRadialGradient'||k==='createLinearGradient') return ()=>({addColorStop(){}});
    if(k==='createPattern') return ()=>({});
    if(k==='getImageData') return (x,y,w,h)=>{const data=new Uint8ClampedArray(w*h*4);for(let j=100;j<140;j++)for(let i=100;i<180;i++)data[(j*w+i)*4+3]=255;return {data};};
    return (...args)=>{ log.push({op:k,gco:t.globalCompositeOperation,ga:t.globalAlpha,args,ctx:ctx}); };
  },set(t,k,v){t[k]=v;return true;}});
  return ctx;
}
function engineHarness(mobile=false,cw=1600,ch=900){
  const logs=[]; const canvases=[];
  const doc={createElement:()=>{const log=[];const cv={width:0,height:0,log,getContext(){return cv.c||(cv.c=fakeContext(log))}};canvases.push(cv);return cv;}};
  const alphas={lava:block(300,200,560,380),fire:block(20,100,60,130),volcano:block(420,10,440,110),soul:block(240,230,280,290)};
  const dais=block(120,195,200,220); for(let i=0;i<dais.length;i++) if(dais[i]) alphas.fire[i]=255; // wide dais glow
  const eng=createCoverEngine({doc,cw,ch,cssW:cw,image:{},alphas,mobile});
  const out=fakeContext([]); const log=[]; const target=fakeContext(log);
  return {eng,target,log,canvases};
}
test('engine builds river, falls, flames, volcano and soul cut-out from the masks, and a frame uses additive light at visible strength',()=>{
  const {eng,target,log,canvases}=engineHarness();
  assert.deepEqual(eng.layers,{river:true,fall:true,flames:2,volcano:true,soul:true});
  eng.draw(target,1.0,1); const lighter=log.filter(e=>e.op==='drawImage'&&e.gco==='lighter');
  assert.ok(lighter.length>40,'sheen, tint, halos, sparks, embers all add light');
  assert.ok(Math.max(...lighter.map(e=>e.ga))>=.5,'peak additive alpha is clearly visible');
  const warped=log.filter(e=>e.op==='drawImage'&&e.gco==='source-over'&&e.ga===1);
  assert.ok(warped.length>=4,'river, falls and each flame paste their warped pixels back over the still');
  const strips=canvases.flatMap(c=>c.log).filter(e=>e.op==='drawImage'&&e.args.length===9).length;
  assert.ok(strips>150,'heat warp re-samples the cover in many thin strips, not a static copy');
});
test('torch warp samples a masked flame texture; the wide dais keeps its original cover source',()=>{
  const {eng,target,canvases}=engineHarness();
  const base=canvases[0];
  const textures=canvases.filter(cv=>cv.log.some(e=>e.op==='drawImage'&&e.args[0]===base&&e.args.length===3)
    &&cv.log.some(e=>e.op==='drawImage'&&e.gco==='destination-in'));
  assert.equal(textures.length,1,'one torch gets an isolated texture; the wide dais does not');
  const built=canvases.length;
  eng.draw(target,1,1);
  const strips=canvases.flatMap(cv=>cv.log).filter(e=>e.op==='drawImage'&&e.args.length===9);
  assert.ok(strips.some(e=>e.args[0]===textures[0]),'torch samples its masked source');
  assert.ok(strips.some(e=>e.args[0]===base),'dais and lava retain their original animation');
  assert.equal(canvases.length,built,'no new canvas allocation in a frame');
});
test('frames 0.5s apart differ (the scene really moves) and nothing is added after the soul cut-out',()=>{
  const a=engineHarness(),b=engineHarness();
  a.eng.draw(a.target,1.0,1); b.eng.draw(b.target,1.5,1);
  const sig=h=>h.log.filter(e=>e.op==='drawImage').map(e=>[e.ga.toFixed(3),...e.args.slice(1).filter(x=>typeof x==='number').map(x=>x.toFixed(1))].join(',')).join('|');
  assert.notEqual(sig(a),sig(b));
  const ops=a.log; const cut=ops.map((e,i)=>e.op==='drawImage'&&e.gco==='destination-out'?i:-1).filter(i=>i>=0);
  assert.equal(cut.length,1); assert.equal(cut[0],ops.map((e,i)=>e.op==='drawImage'?i:-1).filter(i=>i>=0).at(-1),'soul cut-out is the last draw of the frame');
  assert.equal(a.target.globalCompositeOperation,'source-over'); assert.equal(a.target.globalAlpha,1);
});
test('mobile uses fewer particles than desktop but keeps the same layers; off-screen layers are culled in portrait',()=>{
  const d=engineHarness(false),m=engineHarness(true);
  d.eng.draw(d.target,2,1); m.eng.draw(m.target,2,1);
  assert.ok(m.log.length<d.log.length); assert.deepEqual(m.eng.layers,d.eng.layers);
  const portrait=engineHarness(true,390,844);   // phone crop: flames outside the visible strip are culled, nothing is built for them
  assert.ok(portrait.eng.layers.flames<d.eng.layers.flames);
});
test('empty or off-screen masks build no layers and draw nothing without throwing',()=>{
  const doc={createElement:()=>({width:0,height:0,getContext(){return fakeContext([])}})};
  const none=new Uint8Array(W*H);
  const eng=createCoverEngine({doc,cw:390,ch:844,cssW:390,image:{},alphas:{lava:none,fire:none,volcano:none,soul:none},mobile:true});
  assert.deepEqual(eng.layers,{river:false,fall:false,flames:0,volcano:false,soul:false});
  eng.draw(fakeContext([]),3,1);
});
function harness({fail=false}={}) {
  const listeners=new Map(), classes=new Set(), pending=new Map(); let next=0, loadCount=0, draws=0, changes;
  const context=()=>{const log=[];const c=fakeContext(log);return new Proxy(c,{get(t,k){if(k==='drawImage')return (...a)=>{draws++;t.drawImage(...a)};return t[k]}});};
  const canvas=()=>{const value={width:0,height:0,getContext(){return c}}; const c=context(); c.canvas=value;return value;};
  const title={classList:{contains:k=>classes.has(k)},style:{},hidden:false};
  const target=canvas(), motion={matches:false,addEventListener(k,v){changes=v},removeEventListener(){}};
  const doc={hidden:false,getElementById:id=>id==='title'?title:target,createElement:canvas,
    addEventListener(k,v){listeners.set(k,v)},removeEventListener(k){listeners.delete(k)}};
  let observe;
  const win={matchMedia:()=>motion,innerWidth:1600,innerHeight:900,devicePixelRatio:1,performance:{now:()=>0},requestAnimationFrame:f=>{pending.set(++next,f);return next},cancelAnimationFrame:id=>pending.delete(id),
    MutationObserver:class{constructor(f){observe=f}observe(){}disconnect(){}},
    Image:class{set src(v){loadCount++;queueMicrotask(()=>fail?this.onerror(new Error('missing')):this.onload())}}};
  const dispose=installCoverFx(doc,win);
  return {doc,title,motion,classes,pending,dispose,get loads(){return loadCount},get draws(){return draws},sync:()=>observe(),change:()=>changes(),tick(t){const [id,fn]=pending.entries().next().value;pending.delete(id);fn(t)}};
}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
test('settle starts once, exits cancel RAF, resume fades again, reduced motion and hidden tab stop',async()=>{
  const h=harness(); assert.equal(h.loads,0); assert.equal(h.pending.size,0);
  h.classes.add('cover-settled');h.sync(); await flush();
  assert.equal(h.loads,5);assert.equal(h.pending.size,1);
  h.sync();assert.equal(h.pending.size,1);h.tick(250);assert.ok(h.draws>20,'a real frame was drawn');assert.equal(h.pending.size,1,'frame loop continues');
  h.classes.add('gone');h.sync();assert.equal(h.pending.size,0);
  h.classes.delete('gone');h.sync();assert.equal(h.pending.size,1);assert.equal(h.loads,5);
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
test('fx loads the v4 masks and the h5b module cache-busts with the intro-v3-coverfx suffix',()=>{
  const js=readFileSync('src/cover-fx-h5b.js','utf8');
  assert.match(js,/img\/cover-fx\/\$\{kind\}-v4-mask\.png/);
  assert.doesNotMatch(js,/\$\{kind\}-mask\.png/);
  assert.match(js,/v4-mask\.png\?v=h5b-i2a/);
  assert.match(html,/src\/cover-fx-h5b\.js\?v=h5b-intro-v3-coverfx-i2a"/);
  assert.match(html,/src\/ui\.js\?v=20261009[^"]*-zoom-intro-v3(-[a-z0-9]+)*"/);   // I1-A: suffix ต่อท้ายได้ (-i1a)
  assert.match(readFileSync('src/preload.js','utf8'),/CATALOG_VERSION = '20261008[^']*-zoom-intro-v3(-[a-z0-9]+)*'/);
  assert.match(readFileSync('src/art.js','utf8'),/manifest\.json\?v=20261009[^']*-h4-zoom-intro-v3(-[a-z0-9]+)*'/);
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
# Orange reflections on the foreground cliff must stay still (I2-A).
lava=Image.open('img/cover-fx/lava-v4-mask.png').getchannel('A')
for p in [(473,235),(459,256),(455,262),(446,265),(447,275)]:
 assert lava.getpixel(p)==0
assert lava.getpixel((480,280))==255, 'river behind the cliff must remain alive'
fire=Image.open('img/cover-fx/fire-v4-mask.png').getchannel('A')
assert any(fire.getpixel((x,y)) for y in range(62,96) for x in range(287,308)), 'throne torch must not be erased by the character envelope'
print('masks ok')
`],{encoding:'utf8'});
  assert.match(result,/masks ok/);
});
