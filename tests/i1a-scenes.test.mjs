import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { MIRROR_FOOT, MIRROR_SORT_Y, mirrorHeroSortY, mirrorObstacle } from '../src/mirror-charge.js';
import { teaRoom, sleepSpriteWidth } from '../src/tea-recovery.js';
import { ragePoseSrc } from '../src/battle-facing.js';
const manifest=JSON.parse(readFileSync(new URL('../img/manifest.json',import.meta.url)));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {naturalWidth=512;naturalHeight=512;set src(v){this.url=v;queueMicrotask(()=>this.onload?.());}};
globalThis.devicePixelRatio=1;
globalThis.addEventListener=globalThis.removeEventListener=()=>{};
globalThis.requestAnimationFrame=()=>1;globalThis.cancelAnimationFrame=()=>{};
const {makeRoom}=await import('../src/room.js');
const {STATIONS}=await import('../src/data.js');
const {wideStationRoom}=await import('../src/room-art-assets.js');
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

// ---------- ข้อ 1: หอส่องกรรม — ลำดับความลึกของฐานกระจก + ท่า atk ----------
async function krajok(heroAt,state){
  const draws=[];
  const ctx=new Proxy({measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:k==='drawImage'?(im,...a)=>draws.push(im.url):()=>{},set:()=>true});
  const canvas={width:844,height:450,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:844,height:450}),addEventListener(){},removeEventListener(){}};
  const config=wideStationRoom('th','krajok');config.me=heroAt;
  const room=makeRoom(canvas,{zone:'th',items:[],sentences:[],teaBeds:{}},STATIONS.find(s=>s.k==='krajok'),config,config.image,null);
  room.mirrorPlaced=()=>state.placed;room.mirrorState=()=>state;
  room.start();await new Promise(r=>setImmediate(r));room.tick(0);await new Promise(r=>setImmediate(r));
  draws.length=0;room.tick(0);room.destroy();
  return draws;
}
const idx=(d,re)=>d.findIndex(u=>re.test(u));
const lastIdx=(d,re)=>d.reduce((n,u,i)=>re.test(u)?i:n,-1);
test('I1-A mirror stand is drawn in the room canvas, depth-sorted against Yama by feet y',async()=>{
 const state={placed:true,angle:20,adjusting:false};
 const behind=await krajok([MIRROR_FOOT[0],MIRROR_FOOT[1]-.07],state);
 assert.ok(idx(behind,/mirror-charge-base/)>=0&&idx(behind,/mirror-charge-pane/)>=0,'base and pane are drawn on canvas');
 assert.ok(idx(behind,/hero-yama/)<idx(behind,/mirror-charge-base/),'Yama behind the stand is drawn first (stand covers him)');
 const front=await krajok([MIRROR_FOOT[0],MIRROR_FOOT[1]+.09],state);
 assert.ok(idx(front,/hero-yama/)>lastIdx(front,/mirror-charge-pane/),'Yama in front of the stand is drawn on top of base and pane — never covered');
 const none=await krajok([MIRROR_FOOT[0],MIRROR_FOOT[1]+.09],{placed:false,angle:0,adjusting:false});
 assert.equal(idx(none,/mirror-charge/),-1,'no stand drawn until placed');
});
test('I1-A depth key: every spot in front of the stand foot is drawn over it, every spot behind is drawn under it',()=>{
 let front=0,behind=0;
 for(let x=.6;x<=.87;x+=.002)for(let y=.5;y<=.9;y+=.002){
  if(mirrorObstacle(x,y))continue;
  const k=mirrorHeroSortY(x,y);
  if(y>MIRROR_FOOT[1]&&Math.abs(x-MIRROR_FOOT[0])<.0375){assert.ok(k>MIRROR_SORT_Y,`front spot ${x.toFixed(3)},${y.toFixed(3)} must sort after the stand`);front++;}
  if(y<=MIRROR_FOOT[1]){assert.ok(k<MIRROR_SORT_Y,`back spot ${x.toFixed(3)},${y.toFixed(3)} must sort before the stand`);behind++;}
 }
 assert.ok(front>50&&behind>50);
});
test('I1-A adjusting panel switches Yama to the atk pose facing the mirror; closing returns the standing pose',async()=>{
 const open=await krajok([.66,.66],{placed:true,angle:0,adjusting:true});
 assert.ok(open.includes(ragePoseSrc('th')),'atk pose file of the worn outfit is drawn');
 assert.ok(!open.some(u=>/hero-yama\.png|hero-yama-th\.png/.test(u)),'standing pose not drawn while adjusting');
 const closed=await krajok([.66,.66],{placed:true,angle:0,adjusting:false});
 assert.ok(!closed.includes(ragePoseSrc('th')));assert.ok(closed.some(u=>/hero-yama/.test(u)));
 for(const style of ['th','asia','west','cyberhell'])assert.match(ragePoseSrc(style),/atk/,style+' has an atk pose');
});
test('I1-A mirror DOM: stand no longer painted in DOM (only drag area), close button no longer closes the whole room',()=>{
 const css=read('src/compact-ui.css'),mc=read('src/mirror-charge.js'),ui=read('src/ui.js');
 assert.match(css,/\.mirror-room-layer \.mirror-charge-base\{visibility:hidden\}/);assert.match(css,/\.mirror-room-layer \.mirror-charge-pane\{opacity:0;pointer-events:auto/);
 assert.ok(mc.includes('data-mirror-close')&&!/data-close>/.test(mc));
 assert.ok(ui.includes("R.mirrorState=()=>({placed:")&&ui.includes('adjusting:!!mirrorCharge?.panelOpen()'));
});

// ---------- ข้อ 2-3: ศาลาน้ำชา — สเกลท่านอน + จุดตื่น ----------
const png=(path)=>JSON.parse(execFileSync('python3',['-c',`
from PIL import Image;import numpy as np,json,sys
im=Image.open(sys.argv[1]).convert('RGBA');w,h=im.size;k=min(1,256/max(w,h));im=im.resize((max(1,round(w*k)),max(1,round(h*k))),Image.BILINEAR)
a=np.array(im)[...,3];print(json.dumps({'frac':float((a>200).mean()),'aspect':h/w}))`,fileURLToPath(new URL('../'+path,import.meta.url))],{encoding:'utf8'}));
const STAND={th:'img/hero-yama.png',asia:'img/Asia/hero-yama-asia.png',west:'img/West/hero-yama-west.png',cyberhell:'img/CyberHell/hero-yama-cyberhell.png'};
const HERO_H=.15;
test('I1-A lying sprite is scaled so its silhouette area equals the standing one, measured from real pixels, all four outfits',()=>{
 const report=[];
 for(const z of ['th','asia','west','cyberhell']){
  const s=png(STAND[z]),l=png(`img/hero-yama-${z}-unconscious.png`),w=sleepSpriteWidth(s.frac,l.frac,l.aspect,HERO_H);
  const standArea=s.frac*HERO_H*HERO_H,lieBefore=l.frac*.24*.24*l.aspect,lieAfter=l.frac*w*w*l.aspect;
  report.push(`${z}: width ${.24} -> ${w.toFixed(4)} (x${(w/.24).toFixed(3)}), linear size lying/standing ${Math.sqrt(lieBefore/standArea).toFixed(2)} -> ${Math.sqrt(lieAfter/standArea).toFixed(2)}`);
  assert.ok(Math.sqrt(lieBefore/standArea)>1.15,z+': the old fixed 0.24U width really was >15% bigger than the standing body');
  assert.ok(Math.abs(lieAfter/standArea-1)<1e-9,z+': silhouette areas match after scaling');
  assert.ok(w<.24);
 }
 console.log(report.join('\n'));
 assert.equal(sleepSpriteWidth(0,1,1),null);
});
test('I1-A room.js sizes the lying sprite from pixels and wakes Yama on the floor (room.wake), not on the bed',()=>{
 const room=read('src/room.js');
 assert.ok(room.includes('lyingWidth(down, img(\'hero-yama\'))'));assert.ok(!room.includes('U * 0.24, height'));
 assert.ok(room.includes('snap(...wakePoint())')&&room.includes('room.wake ||'));assert.ok(!room.includes('wakeY'));
});
// ขอบหน้าเตียง (ล่างสุดของฐานเตียง) อ่านจากภาพ tea-<zone>-recovery.png — สัดส่วนความสูงภาพ
const BED_FRONT_EDGE={th:.50,asia:.49,west:.53,cyberhell:.50};
test('I1-A wake point is on the floor in front of the bed, inside the walkable area and within bed reach, every zone',()=>{
 for(const z of ['th','asia','west','cyberhell']){
  const r=teaRoom(z),[x,y]=r.wake,[x0,y0,x1,y1]=r.walk;
  assert.ok(Array.isArray(r.wake),z);
  assert.ok(x>=x0&&x<=x1&&y>=y0&&y<=y1,z+': inside walk area');
  assert.ok(y>=BED_FRONT_EDGE[z]+.03,`${z}: feet (${y}) are below the bed front edge (${BED_FRONT_EDGE[z]})`);
  assert.ok(Math.hypot(x-r.bed[0],(y-r.bed[1])*.7)<=.17,z+': can lie down again from the wake point (bed reach)');
  assert.ok(y>r.bed[1]+.1,z+': well in front of the bed centre');
 }
});
test('I1-A after waking, Yama stands at the wake point and can walk immediately',async()=>{
 const ctx=new Proxy({measureText:()=>({width:20})},{get:(o,k)=>k in o?o[k]:()=>{},set:()=>true});
 const canvas={width:844,height:450,getContext:()=>ctx,getBoundingClientRect:()=>({left:0,top:0,width:844,height:450}),addEventListener(){},removeEventListener(){}};
 const tea=STATIONS.find(s=>s.k==='tea');
 for(const z of ['th','asia','west','cyberhell']){
  const cfg=teaRoom(z),g={zone:z,items:[],sentences:[],roster:{},hp:30,hpMax:100,mp:50,mpMax:100,teaBeds:{[z]:true},save(){},onChange(){}};
  cfg.me=[...cfg.wake];
  const room=makeRoom(canvas,g,tea,cfg,cfg.image||'img/x.png',null);
  room.start();await new Promise(r=>setImmediate(r));room.tick(0);
  assert.equal(room.setSleep(),true,z+': can sleep from the wake point');
  for(let i=0;i<70;i++)room.tick(100);
  assert.equal(room.sleeping(),false,z+': awake');
  const [px,py,tx,ty]=room.pos();
  assert.ok(Math.hypot(px-cfg.wake[0],py-cfg.wake[1])<1e-6&&tx==null&&ty==null,z+': standing on the floor at the wake point '+[px,py]);
  assert.equal(g.hp,100);
  room.walkTo(cfg.wake[0]-.1,cfg.wake[1]+.05);for(let i=0;i<6;i++)room.tick(50);
  const [qx,qy]=room.pos();assert.ok(Math.hypot(qx-px,qy-py)>.005,z+': walks on right away');
  room.destroy();
 }
});

test('I1-A cache-bust: -i1a is appended (existing suffixes kept) on every changed file that carries a version query',()=>{
 const html=read('index.html'),ui=read('src/ui.js');
 assert.match(html,/src\/compact-ui\.css\?v=20261009-f2-merge-f3-f4-sala-books-mirror-art-book-art-g5-h4-i1a"/);
 assert.match(html,/src\/ui\.js\?v=20261009-f2-merge-[^"]*-h4-h2-zoom-intro-v3-i1a"/);
 assert.ok(ui.includes("./mirror-charge.js?v=20261009-f2-merge-f3-f4-sala-books-h4-i1a'"));
});
