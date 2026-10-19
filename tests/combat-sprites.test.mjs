import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {poseFrame,bossSpriteKey} from '../src/combat-sprites.js';
import {townContains} from '../src/town-layout.js?v=k1d';
const records=JSON.parse(readFileSync(new URL('../img/combat-animation-v1/manifest.json',import.meta.url))).sprites;
test('each fighting crew/guard has attack and hurt art; Nira is non-combat',()=>{
 for(const z of ['th','asia','west','cyberhell']){
  for(const id of ['dam','taan','plerng','boon','kan','guard']){
   const r=records[`crew:${z}:${id}`];assert.ok(r,z+id);assert.equal(r.modes.attack.frames.length,6);assert.equal(r.modes.hurt.frames.length,2);assert.equal(records[`crew:${z}:${id}:idle`].modes.idle.frames.length,4);
  }
  for(const kind of ['hero-boss','zone-boss','boss-frontier','boss-tester','leader-possessed']){const b=records[`boss:${z}:${kind}`];for(const mode of ['idle','attack','hurt'])assert.ok(b.modes[mode].frames.length>1);}
  assert.equal(records[`crew:${z}:nira`],undefined);assert.ok(records['nira:'+z].modes.idle);
  assert.equal(records['yama:'+z].modes.hurt.frames.length,4);
 }
});
test('frame timing holds recovery at end of hit/attack and loops idle naturally',()=>{
 assert.equal(poseFrame(0,[6,7],[160,260]),6);
 assert.equal(poseFrame(200,[6,7],[160,260]),7);
 assert.equal(poseFrame(9999,[6,7],[160,260]),7);
 assert.equal(poseFrame(450,[0,1],[200,200],true),0);
});
test('every crop fits the declared atlas and source ships with fixed feet geometry',()=>{
 for(const [key,r]of Object.entries(records)){
  assert.ok(existsSync(new URL('../'+r.src,import.meta.url)),key);
  assert.ok(r.bodyHeight>0&&r.anchor[0]>0&&r.anchor[1]<r.frameHeight,key);
  for(const a of Object.values(r.modes)){
   assert.equal(a.frames.length,a.durations.length,key);
   for(const f of a.frames)assert.ok(f>=0&&f<r.cols*r.rows,key+':'+f);
  }
 }
});
test('boss lookup keeps home identity including possessed rulers and excludes minions',()=>{
 assert.equal(bossSpriteKey('img/West/hero-boss-west-v2.png','th'),'boss:west:hero-boss');
 assert.equal(bossSpriteKey('img/leader-asia-possessed.png','cyberhell'),'boss:asia:leader-possessed');
 assert.equal(bossSpriteKey('img/zone-boss.png','asia'),'boss:asia:zone-boss');
 assert.equal(bossSpriteKey('img/mob-vampire.png','west'),null);
});
test('the cliff stays solid outside the new painted stairs',()=>{
 for(const [x,y]of [[1400,980],[1400,1100],[1200,1140]])assert.equal(townContains(x,y),false,`${x},${y}`);
});

test('new lava stairs and lower landing are continuously walkable, without walking through an overlay tree',()=>{
 for(const [a,b] of [[[1060,1000],[1110,1090]],[[1110,1090],[1460,1000]]])for(let i=0;i<=24;i++){const t=i/24,x=a[0]*(1-t)+b[0]*t,y=a[1]*(1-t)+b[1]*t;assert.equal(townContains(x,y),true,`${x},${y}`);}
});
