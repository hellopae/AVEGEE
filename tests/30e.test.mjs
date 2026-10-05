import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ROOMS, STATIONS } from '../src/data.js';
import { fitSoulName, soulNameplateWidth } from '../src/soul-nameplate.js';
import { punishmentScene } from '../src/punishment-scene.js';
import { roomImageBox } from '../src/tea-recovery.js';
import { roomExit, nearRoomExit } from '../src/proximity.js';
import { setLang, t } from '../src/i18n.js';

function inside([x,y], walk) {
  return walk.some(({poly}) => {
    let hit=false;
    for(let i=0,j=poly.length-1;i<poly.length;j=i++) {
      const a=poly[i],b=poly[j];
      if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]) hit=!hit;
    }
    return hit;
  });
}

test('30E: regional prison row stays on the landing, separated from Nira and the guard at both requested sizes', () => {
  for(const zone of ['asia','west','cyberhell']) {
    const r=ROOMS.tarang.zones[zone];
    assert.ok(r.souls.every(p=>p[1]===r.souls[0][1]));
    assert.ok(r.souls.every((p,i)=>!i || p[0]>r.souls[i-1][0]));
    for(const p of [...r.souls,r.crew,r.guard,r.me,r.act,r.item]) assert.ok(inside(p,r.walk),`${zone}: ${p} on walkable floor`);
    assert.equal(nearRoomExit(r.me,roomExit('tarang',zone,r)),false,zone+': spawn does not immediately exit');
    for(const [W,H] of [[1248,1248*1025/1913],[1408,1408*1025/1913]]) {
      const imageH=zone==='asia'?549:925*.6;
      const box=roomImageBox(W,H,1024,imageH),U=Math.min(box.w,box.h);
      const plates=r.souls.map((p,i)=>({x:p[0]*box.w,width:soulNameplateWidth(r.souls,i,box.w,U)}));
      for(let i=1;i<plates.length;i++) assert.ok(plates[i].x-plates[i].width/2>plates[i-1].x+plates[i-1].width/2);
      for(const p of r.souls) for(const actor of [r.crew,r.guard,r.me]) {
        // Actor bodies must have horizontal clearance or stand behind/in front with a full body height gap.
        assert.ok(Math.abs(p[0]-actor[0])*box.w>U*.055 || Math.abs(p[1]-actor[1])*box.h>U*.16,zone+': actor clearance');
      }
    }
  }
});

test('30E: long Thai/English names fit without splitting combining marks; short names stay intact', () => {
  const measure=s=>[...s].length*6;
  for(const name of ['เจ้าหน้าที่ตรวจสอบสินค้ายา','เจ้าของโรงงานซอสปรุงรสที่ปลอมแปลงส่วนผสม','Quality control inspector']) {
    const fit=fitSoulName(name,72,measure);
    assert.ok(fit.endsWith('…'));
    assert.ok(measure(fit)<=72);
    const segments=[...new Intl.Segmenter('th',{granularity:'grapheme'}).segment(name)];
    assert.ok(segments.some(x=>name.slice(0,x.index+x.segment.length)===fit.slice(0,-1)));
  }
  assert.equal(fitSoulName('บุญ',72,measure),'บุญ');
  assert.equal(fitSoulName('Long name',0,measure),'');
});

test('30E: real manifest resolves every popup to its own zone image and anchors, including fallback', async () => {
  const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
  const oldFetch=globalThis.fetch,oldImage=globalThis.Image;
  globalThis.fetch=async()=>({ok:true,json:async()=>manifest}); globalThis.Image=class {};
  try {
    const art=await import('../src/art.js?30e-popup');
    await new Promise(resolve=>setImmediate(resolve));
    const seen=new Set();
    for(const zone of ['th','asia','west','cyberhell']) {
      art.bindZone(()=>zone);
      const bg=art.artUrl('BG-Krata','webp');
      assert.ok(existsSync(new URL('../'+bg,import.meta.url)),bg);
      if(zone!=='th') assert.ok(bg.includes(`-krata-${zone}`.replace('krata','Krata')));
      const scene=punishmentScene(zone,bg);
      seen.add(scene.background);
      assert.ok(scene.x>0 && scene.x<1 && scene.rim>scene.height && scene.rim<1);
      assert.ok(scene.width>0 && scene.width<.2);
      assert.equal(scene.effect,zone==='west'?'mist':zone==='cyberhell'?'electric':'fire');
    }
    assert.equal(seen.size,4);
    assert.deepEqual(punishmentScene('west','img/BG-Krata.webp'),punishmentScene('th','img/BG-Krata.webp'));
  } finally {globalThis.fetch=oldFetch;globalThis.Image=oldImage;}
});

test('30E: renderer uses bounded nameplates for both occupied and waiting prison slots', async () => {
  const previous={Image:globalThis.Image,document:globalThis.document,requestAnimationFrame:globalThis.requestAnimationFrame,
    cancelAnimationFrame:globalThis.cancelAnimationFrame,devicePixelRatio:globalThis.devicePixelRatio,
    addEventListener:globalThis.addEventListener,removeEventListener:globalThis.removeEventListener};
  const names=[],handlers={};
  const context=new Proxy({
    measureText:s=>({width:[...s].length*8}),
    fillText:s=>names.push(s),
  },{get:(o,k)=>k in o?o[k]:()=>{}});
  globalThis.Image=class{set src(v){this.naturalWidth=1024;this.naturalHeight=v.includes('/Asia/BG-')?549:925;queueMicrotask(()=>this.onload?.());}};
  globalThis.document={createElement:()=>({getContext:()=>context})};
  globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
  globalThis.devicePixelRatio=1;globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
  const cv={width:0,height:0,clientWidth:1248,clientHeight:669,getContext:()=>context,
    getBoundingClientRect:()=>({width:1248,height:669,left:0,top:0}),addEventListener:(name,fn)=>{handlers[name]=fn;},removeEventListener:()=>{}};
  let room;
  try {
    const {makeRoom}=await import('../src/room.js');
    for(const [zone,folder] of [['asia','Asia'],['west','West'],['cyberhell','CyberHell']]) {
      const config={...ROOMS.tarang,...ROOMS.tarang.zones[zone]};
      const soul=id=>({id,who:'เจ้าหน้าที่ตรวจสอบสินค้ายาที่มีชื่อยาวมาก',sp:7});
      room=makeRoom(cv,{zone,items:[],held:[soul(2)],sentences:[{zone,stage:'prison',soul:soul(3)}],crewOf:()=>null},
        STATIONS.find(x=>x.k==='tarang'),config,`img/${folder}/BG-Tarang-${zone}.webp`,null,()=>true);
      room.st={slots:[{soul:soul(1),progress:0,need:10}]};
      room.start();await new Promise(resolve=>setImmediate(resolve));names.length=0;room.tick(0);
      const plates=names.filter(s=>s.endsWith('…'));
      assert.equal(plates.length,3,zone+': all three prison slots use truncated plates');
      assert.ok(plates.every(s=>context.measureText(s).width<=669*.16));
      assert.ok(!names.includes(soul(1).who),'full names belong in roster only');
      const walkTo=target=>{
        const [clientX,clientY]=room.project(target);
        handlers.pointerdown({clientX,clientY,button:0,preventDefault:()=>{}});
        for(let i=0;i<1200 && Math.hypot(room.pos()[0]-target[0],room.pos()[1]-target[1])>.009;i++) room.tick(16);
        assert.ok(Math.hypot(room.pos()[0]-target[0],room.pos()[1]-target[1])<=.009,zone+': reached '+target+'; position '+room.pos());
      };
      walkTo(config.act);assert.equal(room.inReach(),true,zone+': can inspect');
      walkTo(config.me);
      const exit=roomExit('tarang',zone,config);walkTo([exit.x,exit.y]);
      assert.ok(nearRoomExit(room.pos(),exit),zone+': can exit');
      room.destroy();room=null;
    }
  } finally {room?.destroy();Object.assign(globalThis,previous);}
});

test('30E: all new popup strings are present in Thai and English', () => {
  const oldDocument=globalThis.document;globalThis.document={documentElement:{}};
  try {
    for(const key of ['heading','title','heroAlt','quote','explanation','recover','serving','return']) {
      setLang('th');const th=t('punish.'+key);setLang('en');const en=t('punish.'+key);
      assert.notEqual(th,'punish.'+key);assert.notEqual(en,'punish.'+key);assert.notEqual(th,en);
    }
  } finally {setLang('th');globalThis.document=oldDocument;}
});
