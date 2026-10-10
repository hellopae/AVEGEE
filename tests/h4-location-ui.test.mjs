import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { assetTier } from '../src/asset-preload.js';
import { gateKarma, gateTotalKarma, archiveRecord, archiveCard, gateEffectPose, drawGateEffect } from '../src/h4-location-ui.js';
import { mountMirrorCharge, MIRROR_ROOM_LAYOUT, MIRROR_FOOT, mirrorSolution, mirrorBeam, nearMirror, mirrorObstacle } from '../src/mirror-charge.js';
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {naturalWidth=1717;naturalHeight=916;set src(v){this.url=v;queueMicrotask(()=>this.onload?.());}};
globalThis.devicePixelRatio=1;
globalThis.addEventListener=globalThis.removeEventListener=()=>{};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const {createGame}=await import('../src/game.js');
const {makeRoom}=await import('../src/room.js');
const {STATIONS}=await import('../src/data.js');
const {wideStationRoom}=await import('../src/room-art-assets.js');
const game=()=>{const g=createGame();g.save=()=>true;g.onChange=()=>{};return g;};
const entry=(id,w,checked=false,zone='th')=>({zone,stage:'gate',intensity:1,checked,...(checked?{karmaLeft:w-1}:{}),soul:{id,who:'Soul '+id,sp:7,pure:false,deeds:[{t:'A deed',w}],merits:[]}});

test('lotus removes exactly 8 total from checked and unchecked gate souls and never resets on inspection',()=>{
 const g=game();g.stations.push({def:STATIONS.find(s=>s.k==='sawan'),build:0,slots:[]});
 g.sentences=[entry(1,4,true),entry(2,9),entry(3,20,true,'asia')];g.karma=0;g.inventory.lotus=3;
 assert.equal(gateTotalKarma(g),11);assert.equal(g.offerLotusBoon(),true);
 assert.equal(gateKarma(g.sentences[0]),0);assert.equal(gateKarma(g.sentences[1]),3);assert.equal(gateTotalKarma(g),3);
 assert.equal(gateKarma(g.sentences[2]),19);assert.equal(g.inventory.lotus,2);
 assert.equal(g.inspectGate(2),true);assert.equal(g.inspectGate(2),true);assert.equal(gateKarma(g.sentences[1]),3);
 const copy=game();copy.restore(g.snapshot());assert.equal(gateTotalKarma(copy),3);
 assert.equal(copy.offerLotusBoon(),true);assert.equal(gateTotalKarma(copy),0);assert.equal(copy.inventory.lotus,1);
 assert.equal(copy.offerLotusBoon(),false);assert.equal(copy.inventory.lotus,1);
 assert.equal(copy.resolveGate(2),true);assert.equal(copy.ascended,1);
});
test('pure souls, real/fake merit and decimal karma are accounted for, with old player relief preserved',()=>{
 const g=game();g.stations.push({def:STATIONS.find(s=>s.k==='sawan'),build:0,slots:[]});
 const x=entry(1,4.4);x.soul.merits=[{v:1.2},{v:20,fake:true}];g.sentences=[x];
 assert.equal(gateKarma(x),2.2);g.karma=18;g.inventory.lotus=1;
 assert.equal(g.offerLotusBoon(),true);assert.equal(g.karma,10);assert.equal(gateKarma(x),0);
 x.soul.pure=true;assert.equal(gateKarma(x),0);
});
test('archive cards expose portrait, name, stars, score, deserved/given, verdict and escaped deed summary',()=>{
 const soul={name:'Soul <A>',sp:'spirit-worker',deeds:[{t:'Fraud <script>'},{t:'Second deed'}]};
 for(const [over,short,verdict] of [[0,0,'correct'],[2,0,'heavy'],[0,2,'light']]){
  const record=archiveRecord({id:8,who:'worker',stars:4,score:83,deserved:5,over,short,tham:40,tick:9},soul);
  assert.equal(record.verdict,verdict);assert.equal(record.given,5+over-short);
  const html=archiveCard(record,0,'img/spirit-worker.png');
  for(const text of ['img/spirit-worker.png','Soul &lt;A&gt;','★★★★☆','83','5','Fraud &lt;script&gt;','data-archive-card="0"'])assert.ok(html.includes(text));
  assert.ok(!html.includes('<script>'));assert.ok(html.includes(`class="arch-soul-card ${verdict}"`));
 }
 assert.equal(archiveRecord({who:'old',deserved:3,tham:10},null).verdict,'wrong');
 const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
 for(const text of ['gate-total-karma keep','aria-modal','archive-open','BOSS_LINE[dadGrade(x)]','data-archive-back','covered.forEach(el=>el.inert=on)'])assert.ok(ui.includes(text));
});

class Element {
 style={};attrs={};nodes=new Map();children=[];dataset={};value=0;hidden=false;clientWidth=844;clientHeight=390;
 classList={toggle:()=>{},add:()=>{},remove:()=>{}};
 set innerHTML(v){this.html=v;}get innerHTML(){return this.html;}
 append(e){this.children.push(e);}remove(){this.removed=true;}
 querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Element());return this.nodes.get(s);}
 querySelectorAll(s){if(!this.nodes.has(s))this.nodes.set(s,[-1,1].map(turn=>{const e=new Element();e.dataset.turn=turn;return e;}));return this.nodes.get(s);}
 setAttribute(k,v){this.attrs[k]=String(v);}getAttribute(k){return this.attrs[k];}
 getBoundingClientRect(){return {left:100,top:100,width:80,height:40};}setPointerCapture(){}
}
for(const [viewportW,viewportH] of [[844,390],[390,844]])test(`real-room mirror beam, slider, drag and reward at viewport ${viewportW}x${viewportH} (simulated DOM)`,t=>{
 let next; t.mock.method(globalThis,'requestAnimationFrame',fn=>{next=fn;return 1;});
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()};t.after(()=>{globalThis.document=previous;});
 const room=new Element();room.clientWidth=viewportW-24;room.clientHeight=room.clientWidth*916/1717;
 const anchor=(u,v)=>[u*100,v*100],g=game();g.level=5;g.zoneEvents.th={devaTest:'cleared'};g.tick=100;
 g.stations.push({def:STATIONS.find(s=>s.k==='krajok'),build:0,slots:[]});const power=g.powerOf('mirror');power.ammo=0;power.max=3;
 let reachable=false,rewards=0,paused=false;
 const controller=mountMirrorCharge(room,{anchor,canPlace:()=>true,canAdjust:()=>reachable,canCharge:()=>power.ammo<power.max && g.tick>=(g.stations.at(-1).kanCd || 0),paused:()=>paused,alive:()=>true,onCharge:(angle,aspect)=>{rewards++;return g.chargeMirror(angle,aspect);}});
 const [layer,controls]=room.children,pane=layer.querySelector('.mirror-charge-pane'),base=layer.querySelector('.mirror-charge-base'),input=controls.querySelector('input');
 assert.ok(!layer.innerHTML.includes('mirror-room-v1'));assert.equal(controller.place(),true);assert.equal(controller.adjust(),false);
 reachable=true;assert.equal(controller.adjust(),true);assert.equal(layer.hidden,false);assert.equal(controller.playing(),false);
 let time=performance.now();const frame=()=>next(time+=100);frame();const stationary={...base.style};
 input.value=80;input.oninput();for(let i=0;i<25;i++)frame();assert.equal(power.ammo,0);
 const before=pane.style.transform;pane.onpointerdown({clientX:180,clientY:120,pointerId:1,preventDefault(){}});pane.onpointermove({clientX:140,clientY:160,pointerId:1});pane.onpointerup({pointerId:1});frame();assert.notEqual(pane.style.transform,before);
 const aspect=1717/916,angle=Math.round(mirrorSolution(aspect,MIRROR_ROOM_LAYOUT));assert.equal(mirrorBeam(angle,aspect,MIRROR_ROOM_LAYOUT).hit,true);
 input.value=angle;input.oninput();paused=true;for(let i=0;i<20;i++)frame();assert.equal(power.ammo,0);paused=false;
 for(let i=0;i<20;i++)frame();assert.equal(power.ammo,1);assert.equal(rewards,1);
 const nums=layer.querySelector('[data-ray]').attrs.d.match(/-?\d+(?:\.\d+)?/g).map(Number);
 assert.deepEqual(nums.slice(0,4),[...MIRROR_ROOM_LAYOUT.source,...MIRROR_ROOM_LAYOUT.pivot].map(v=>v*100));
 assert.deepEqual(nums.slice(4),mirrorBeam(angle,aspect,MIRROR_ROOM_LAYOUT).end.map(v=>v*100));assert.deepEqual(base.style,stationary);
 assert.equal(layer.querySelector('[data-ray-glow]').attrs.d,layer.querySelector('[data-ray]').attrs.d);
 for(let i=0;i<20;i++)frame();assert.equal(power.ammo,1);
 controls.querySelector('[data-close]').onclick();assert.equal(layer.hidden,false);assert.equal(controls.hidden,true);
 assert.equal(controller.adjust(),true);input.value=angle;input.oninput();for(let i=0;i<20;i++)frame();assert.equal(power.ammo,1,'cooldown rejects a second reward');
 controls.querySelector('[data-remove]').onclick();assert.equal(layer.hidden,true);controller.destroy();assert.equal(layer.removed,true);assert.equal(controls.removed,true);
});

test('mirror stand blocks real pointer movement, becomes walkable when removed, and can be approached',async()=>{
 const context=new Proxy({measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:()=>{}}),handlers={};
 const canvas={width:844,height:450,getContext:()=>context,getBoundingClientRect:()=>({left:0,top:0,width:844,height:450}),addEventListener:(k,f)=>handlers[k]=f,removeEventListener:()=>{}};
 const config=wideStationRoom('th','krajok');config.walk=[[.17,.51,.81,1]];config.me=[.64,MIRROR_FOOT[1]];
 const room=makeRoom(canvas,{zone:'th',items:[],sentences:[]},STATIONS.find(s=>s.k==='krajok'),config,config.image,null);
 let placed=true;room.mirrorPlaced=()=>placed;room.start();await new Promise(r=>setImmediate(r));room.tick(0);
 const target=[.80,MIRROR_FOOT[1]],click=()=>{const [clientX,clientY]=room.project(target);handlers.pointerdown({clientX,clientY});};
 click();for(let i=0;i<300;i++){room.tick(16);assert.equal(mirrorObstacle(...room.pos()),false);}
 assert.ok(room.pos()[0]<MIRROR_FOOT[0]);assert.equal(nearMirror(room.pos()),true);
 placed=false;click();for(let i=0;i<300;i++)room.tick(16);assert.ok(Math.abs(room.pos()[0]-.8)<.01);room.destroy();
});

test('scan, rebirth, sky and floating −N draw on canvas; departures fade and sky rises',()=>{
 const calls=[];const ctx=new Proxy({createLinearGradient:()=>({addColorStop:()=>{}})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 for(const kind of ['scan','reborn','sky','relief']){const pose=gateEffectPose(kind,500);drawGateEffect(ctx,100,200,80,kind,pose,3);assert.ok(pose.p>0&&pose.p<1);assert.equal(gateEffectPose(kind,2000).done,true);}
 assert.ok(calls.some(c=>c[0]==='fillText'&&c[1]==='−3'));assert.ok(calls.some(c=>c[0]==='ellipse'));assert.ok(calls.some(c=>c[0]==='fillRect'));
 assert.ok(gateEffectPose('sky',700).rise>0);assert.ok(gateEffectPose('reborn',600).alpha<1);
});
test('new rainbow asset exists, is background-only, replaces every rendered gold book, and UI strings have TH+EN',()=>{
 const asset='minigames/sala-book-rainbow-h4-v1.png',catalog=JSON.parse(readFileSync(new URL('../img/preload-catalog.json',import.meta.url)));
 assert.ok(manifest.rest.includes(asset));assert.ok(!manifest.critical.includes(asset));assert.ok(catalog.shared.includes('img/'+asset));assert.equal(assetTier('img/'+asset).tier,1);assert.ok(existsSync(new URL('../img/'+asset,import.meta.url)));
 const puzzle=readFileSync(new URL('../src/minigames/sala.js',import.meta.url),'utf8');assert.ok(puzzle.includes(asset));assert.ok(!puzzle.includes('book-gold'));assert.equal((puzzle.match(/bookArt\('rainbow'\)/g)||[]).length,2);
 const strings=readFileSync(new URL('../src/i18n.js',import.meta.url),'utf8');for(const key of ['totalKarma','mirrorNear','archive','father','given','deserved','details'])assert.equal((strings.match(new RegExp("'h4\\."+key+"'",'g'))||[]).length,2);
});

test('gate sound companions create distinct soft WebAudio tones and obey mute',async()=>{
 const calls=[],param={setValueAtTime:()=>{},exponentialRampToValueAtTime:()=>{}};
 const previous=globalThis.window;
 globalThis.window={AudioContext:class {currentTime=0;state='running';destination={};
  createOscillator(){return {frequency:{...param,setValueAtTime:f=>calls.push(f)},connect:()=>({connect:()=>{}}),start:()=>{},stop:()=>{}};}
  createGain(){return {gain:param,connect:()=>{}};}
 }};
 const {unlock,sfx,AUDIO}=await import('../src/sfx.js');unlock();
 sfx('gateScan');assert.deepEqual(calls.splice(0),[1568,2093]);
 sfx('gateReborn');assert.deepEqual(calls.splice(0),[784,1046,1568]);
 sfx('gateSky');assert.deepEqual(calls.splice(0),[1046,1318,1568,2093]);
 AUDIO.sfxOn=false;sfx('gateScan');assert.deepEqual(calls,[]);AUDIO.sfxOn=true;
 globalThis.window=previous;
});

test('ledger keeps card identity and complete deeds after closed-case history rolls off and saving',()=>{
 const g=game(),soul={id:999,name:'Named soul',who:'Worker',sp:'spirit-worker',deserved:3,said:[],deeds:[{t:'Full first deed'},{t:'Full second deed'}]};
 g.applyVerdict({score:55,karma:0,tham:40,ked:20,rab:20,over:0,short:0},soul);
 g.closed=[];
 const saved=game();saved.restore(g.snapshot());
 const row=saved.ledger.find(x=>x.id===999);assert.ok(row.archiveSoul);
 const record=archiveRecord(row,row.archiveSoul);assert.equal(record.name,'Named soul');assert.equal(record.portrait,'spirit-worker');assert.equal(record.deeds,'Full first deed · Full second deed');
});
