import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { sentenceColor } from '../src/sentence-colors.js';
import { MERITS, STATIONS } from '../src/data.js';
import { wideStationRoom } from '../src/room-art-assets.js';
import { mirrorObstacle, mirrorClearPosition, nearMirror, MIRROR_FOOT, mirrorHeroSortY, MIRROR_SORT_Y } from '../src/mirror-charge.js';
const ui=readFileSync(new URL('../src/ui.js',import.meta.url),'utf8');
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const context=vm.createContext({sentenceColor,esc:escape,SINS:{kong:{name:'ฉ้อโกง',color:'#ff0000'}}});
vm.runInContext(ui.slice(ui.indexOf('function deedLine('),ui.indexOf('function publicDossier(')),context);
test('J4 real dossier renderers use numeric colours for merits, karma and relief, including blood donation',()=>{
 const blood=MERITS.find(m=>m.t==='บริจาคเลือดครบ 40 ครั้ง');
 assert.equal(blood.v,1);
 assert.ok(context.publicMeritLine(blood).includes(`color:${sentenceColor(1).color}`));
 for(let value=0;value<=5;value++){
  assert.ok(context.publicMeritLine({t:'<บุญ>',v:value}).includes(`color:${sentenceColor(value).color}`));
  assert.ok(context.deedLine({s:'kong',t:'กรรม',w:value}).includes(`<span style="color:${sentenceColor(value).color}">`));
  assert.ok(context.deedLine({s:'kong',t:'บรรเทา',w:-value}).includes(`<span style="color:${sentenceColor(value).color}">`));
 }
 assert.ok(context.publicMeritLine({t:'<บุญ>',v:1}).includes('&lt;บุญ&gt;'));
 assert.ok(ui.includes("claimed.map(m => publicMeritLine(m, 'deed merit'))"),'trial uses the tested numeric renderer');
});
test('J4 mirror only blocks its foot, with reachable front and back depth ordering',()=>{
 const [x,y]=MIRROR_FOOT;
 assert.equal(mirrorObstacle(x,y),true);
 for(const point of [[x,y+.033],[x,y-.033],[x-.039,y]]){
  assert.equal(mirrorObstacle(...point),false);assert.equal(nearMirror(point),true);
 }
 assert.ok(mirrorHeroSortY(x,y+.033)>MIRROR_SORT_Y);
 assert.ok(mirrorHeroSortY(x,y-.033)<MIRROR_SORT_Y);
 for(const point of [[x,y],[x+.01,y+.01],[x-.02,y-.01]]) assert.equal(mirrorObstacle(...mirrorClearPosition(...point)),false);
});
test('J4 gate souls shift onto raised platforms (N1: and no room has a floor training spot)',()=>{
 for(const zone of ['th','asia','west','cyberhell']){
  const gate=wideStationRoom(zone,'sawan');assert.equal(gate.training,false);
  assert.ok(gate.souls.every(p=>p[1]>=.455 && p[1]<=.485));
  if(zone==='cyberhell') assert.deepEqual(gate.souls,[[.433,.485],[.53,.485],[.63,.485]]);
  assert.ok(!wideStationRoom(zone,'krajok').training,'N1: หอส่องกรรมไม่มีจุดฝึกบนพื้น (คุณเป้ 16 ต.ค.)');
 }
});
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {naturalWidth=1717;naturalHeight=916;set src(v){this.url=v;queueMicrotask(()=>this.onload?.());}};
globalThis.devicePixelRatio=1;
globalThis.addEventListener=globalThis.removeEventListener=()=>{};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const {makeRoom}=await import('../src/room.js');
test('J4 prison escort keeps soul until walking completes, rejects duplicate and transfers exactly once',async t=>{
 let clock=100; t.mock.method(performance,'now',()=>clock);
 const calls=[];
 const ctx=new Proxy({measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:(...args)=>calls.push([k,...args])});
 const cv={width:844,height:450,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:844,height:450}),addEventListener:()=>{},removeEventListener:()=>{}};
 const soul={id:42,who:'Soul',sp:7};const g={zone:'th',items:[],held:[],sentences:[{zone:'th',stage:'prison',soul}]};
 const config=wideStationRoom('th','tarang');const room=makeRoom(cv,g,STATIONS.find(s=>s.k==='tarang'),config,config.image,null);room.start();await new Promise(r=>setImmediate(r));
 let transfers=0;
 assert.equal(room.prisonEscort(42,()=>transfers++),true);
 assert.equal(room.prisonEscort(42,()=>transfers++),false);
 clock=1300;room.tick(0);await new Promise(r=>setImmediate(r));room.tick(0);
 assert.ok(calls.some(([op,im])=>op==='drawImage' && /crew-dam/.test(im?.url)),'Dam is actually painted on the room canvas');
 assert.equal(transfers,0);assert.equal(room.prisonEscorting(42),true);
 clock=2600;room.tick(0);assert.equal(transfers,1);assert.equal(room.prisonEscorting(42),false);
 room.destroy();assert.equal(transfers,1);
});
test('J4 prison controls have no proximity gate and handbook renders all chapters together',()=>{
 const prison=ui.slice(ui.indexOf("if (k === 'tarang') {",ui.indexOf('function openStation')),ui.indexOf("if (k === 'sawan') {",ui.indexOf('function openStation')));
 assert.ok(!prison.includes('inside &&'));assert.ok(!prison.includes("note(t('room.nearNira'))"));
 const help=ui.slice(ui.indexOf('function openHelp()'),ui.indexOf('// ---------- Phase 3'));
 assert.ok(help.includes('items.map((html, i)'));assert.ok(help.includes('guideCards('));assert.ok(!help.includes('data-help-next'));
});
const {createGame}=await import('../src/game.js');
const {escortCrewPosition,soulWalkPosition}=await import('../src/escort.js');
test('J4 both prison outcomes carry Dam along the map route, arriving only after the walk',()=>{
 for(const repentant of [true,false]){
  const g=createGame();g.save=()=>{};g.onChange=()=>{};
  for(const key of ['tarang','sawan']) g.stations.push({def:STATIONS.find(x=>x.k===key),build:0,slots:[]});
  const soul={id:987,who:'ทดสอบ',sp:7,sex:'m',deeds:[{s:'kong',t:'กรรม',w:3,known:true}],merits:[]};
  g.sentences.push({soul,zone:g.zone,stage:'prison',inspected:true,repentant,intensity:3,verdict:{short:0,right:true}});
  assert.equal(g.moveFromPrison(soul.id),true);
  const walk=g.afterlifeWalks.at(-1);assert.ok(walk);assert.equal(walk.courier,'dam');
  assert.equal(walk.destination,repentant?'gate':'queue');
  assert.equal(g.sentences.some(x=>x.stage==='gate'&&x.soul.id===soul.id),false);
  walk.elapsed=walk.duration/2;
  const dam=escortCrewPosition({...walk,escort:{k:walk.courier}}), position=soulWalkPosition(walk);
  assert.ok(Number.isFinite(dam.x)&&Number.isFinite(dam.y));assert.ok(Math.hypot(dam.x-position[0],dam.y-position[1])>0);
  g.advanceAfterlife(100000);
  assert.equal(g.afterlifeWalks.length,0);
  assert.ok(repentant ? g.sentences.some(x=>x.soul.id===soul.id&&x.stage==='gate') : g.queue.some(x=>x.back?.id===soul.id));
 }
});
