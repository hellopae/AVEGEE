import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { mountMirrorCharge, mirrorSolution, mirrorBeam, MIRROR_LAYOUT } from '../src/mirror-charge.js';
import { createGame } from '../src/game.js';
import { STATIONS } from '../src/data.js';

// DOM simulation checks rendering state and real reward callback, not browser gameplay.
globalThis.requestAnimationFrame ??= () => 1;
globalThis.cancelAnimationFrame ??= () => {};
globalThis.document ??= {createElement:()=>{}};
class Element {
  style={}; attrs={}; nodes=new Map(); children=[]; dataset={}; value=0;
  classList={toggle:()=>{}};
  set innerHTML(v){this.html=v;}
  get innerHTML(){return this.html;}
  append(e){this.children.push(e);}
  querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}
  querySelectorAll(){return [-1,1].map(turn=>{const e=new Element();e.dataset.turn=turn;return e;});}
  setAttribute(k,v){this.attrs[k]=String(v);}
  remove(){this.removed=true;}
}
for(const [width,height] of [[1280,800],[844,390]]) test(`F3 overlay holds original aim, turns only pane and rewards +1 at ${width}x${height} (simulated DOM)`,t=>{
  let next;
  t.mock.method(globalThis,'requestAnimationFrame',fn=>{next=fn;return 1;});
  t.mock.method(globalThis,'cancelAnimationFrame',()=>{});
  t.mock.method(globalThis.document,'createElement',()=>new Element());
  const room=new Element();room.clientWidth=width;room.clientHeight=height;
  const imageAspect=1717/916,scale=Math.max(width/1717,height/916);
  const anchor=(u,v)=>[(.5+(u-.5)*1717*scale/width)*100,(.5+(v-.5)*916*scale/height)*100];
  const g=createGame();g.level=5;g.zoneEvents.th={devaTest:'cleared'};g.tick=100;
  g.stations.push({def:STATIONS.find(d=>d.k==='krajok'),build:0,slots:[]});
  const power=g.powerOf('mirror');power.ammo=0;power.max=3;
  let rewards=0;
  const controller=mountMirrorCharge(room,{anchor,canPlace:()=>true,canCharge:()=>power.ammo<power.max,
    onCharge:(angle,aspect)=>{assert.ok(Math.abs(aspect-imageAspect)<1e-10);rewards++;return g.chargeMirror(angle,aspect);},alive:()=>true});
  const [layer,controls]=room.children,base=layer.querySelector('.mirror-charge-base'),pane=layer.querySelector('.mirror-charge-pane'),input=controls.querySelector('input');
  assert.equal(controller.place(),true);assert.equal(controller.adjust(),true);
  let time=performance.now();const frame=()=>next(time+=100);frame();
  const baseBefore={...base.style},paneBefore=pane.style.transform;
  // A wrong angle must not charge, even after longer than the holding duration.
  input.value=80;input.oninput();for(let i=0;i<25;i++)frame();assert.equal(power.ammo,0);
  assert.notEqual(pane.style.transform,paneBefore);assert.deepEqual(base.style,baseBefore);
  const angle=Math.round(mirrorSolution(imageAspect));assert.equal(angle,26);
  input.value=angle;input.oninput();frame();
  const layout=Object.fromEntries(Object.entries(MIRROR_LAYOUT).map(([k,p])=>[k,anchor(...p).map(v=>v/100)]));
  const beam=mirrorBeam(angle,width/height,layout);assert.equal(beam.hit,true);
  const nums=layer.querySelector('[data-ray]').attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
  assert.deepEqual(nums.slice(0,4),[...layout.source,...layout.pivot].map(v=>v*100));
  assert.deepEqual(nums.slice(4),beam.end.map(v=>v*100));
  assert.equal(layer.querySelector('[data-ray-glow]').attrs.d,layer.querySelector('[data-ray]').attrs.d);
  assert.deepEqual(base.style,baseBefore);assert.ok(pane.style.transform.includes('rotate('));
  for(let i=0;i<20;i++)frame();assert.equal(power.ammo,1);assert.equal(rewards,1);
  for(let i=0;i<20;i++)frame();assert.equal(power.ammo,1);assert.equal(rewards,1);
  assert.equal(controls.querySelector('progress').value,1800);
  controls.querySelector('[data-remove]').onclick();assert.equal(layer.hidden,true);assert.equal(controls.hidden,true);
  controller.destroy();assert.equal(layer.removed,true);assert.equal(controls.removed,true);
});
test('F3 transparent sprite files are included in shared manifest/preload',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
 const catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 for(const part of ['base','pane']){
  const name=`mirror-charge-${part}.png`;
  assert.ok(manifest.critical.includes(name));assert.ok(catalog.shared.includes(`img/${name}`));
  assert.ok(existsSync(new URL('../img/'+name,import.meta.url)));
 }
 const css=readFileSync(new URL('../src/compact-ui.css',import.meta.url),'utf8');
 const src=readFileSync(new URL('../src/mirror-charge.js',import.meta.url),'utf8');
 assert.ok(src.includes('stroke="#fff1b6"'));assert.ok(src.includes('stroke="#eeb743"'));
 assert.ok(!src.includes('#aef9ff'));assert.ok(!css.includes('#8fffff'));
});
