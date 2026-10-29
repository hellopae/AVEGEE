import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ALL_CASES } from '../src/cases.js';
import { createGame } from '../src/game.js';
import { CASE_POSE_TYPES, SOUL_POSE_ASSETS, soulPoseForPress, soulPoseAssets } from '../src/soul-poses.js';
import { zoneAssets } from '../src/asset-preload.js';
const base = 'img/Thai/spirit-officer-th-v2.png';
const pose = 'img/soul-poses/officer-th-caught-lie-v1.png';
const soulFor = key => {
 const c = ALL_CASES.find(c=>c.k===key);
 return {case:key, presses:2, said:[], deeds:[...c.seen.map(d=>({...d,known:true})),...c.hidden.map(d=>({...d,known:false}))], merits:structuredClone(c.merits), lines:c.claims.map((l,i)=>({...l,i,used:false}))};
};
test('every named case has an explicit reviewed classification',()=>{
 assert.deepEqual(Object.keys(CASE_POSE_TYPES).sort(),ALL_CASES.map(c=>c.k).sort());
 for(const key of ['recruit','girl','boy','sergeant','hammer','healer'])assert.equal(CASE_POSE_TYPES[key],'necessity');
 for(const key of ['nurse','devaMonk','scapegoat','A5','A11','A13','A19'])assert.equal(CASE_POSE_TYPES[key],'other');
 assert.equal(CASE_POSE_TYPES.A1,'caught_lie','a denial still matters when mitigation exists');
});
test('caught lie selects a drawing before the existing press, without mutating justice or evidence',()=>{
 const g=createGame(), s=soulFor('pol'), before=structuredClone(s);
 assert.equal(soulPoseForPress(g,s,s.lines[0],base),pose);
 assert.deepEqual(s,before);
 const out=g.press(s,0);
 assert.ok(out.some(x=>x.kind==='truth'));
 assert.equal(soulPoseForPress(g,s,s.lines[0],base),null,'used line never triggers again');
 assert.equal(s.presses,1);
});
test('only unexposed fake boasts use the caught lie drawing',()=>{
 const g=createGame(),s=soulFor('gen'), l=s.lines.find(l=>l.kind==='boast');
 assert.equal(soulPoseForPress(g,s,l,base),pose);
 s.merits[0].exposed=true;assert.equal(soulPoseForPress(g,s,l,base),null);
 s.merits[0].exposed=false;s.merits[0].fake=false;assert.equal(soulPoseForPress(g,s,l,base),null);
});
test('no substitution for a solid line, exhausted press, return, random case or another regional image',()=>{
 const g=createGame(),s=soulFor('pol');
 assert.equal(soulPoseForPress(g,s,s.lines.find(l=>l.kind==='solid'),base),null);
 for(const change of [{presses:0},{back:{}},{case:undefined},{case:'nurse'},{case:'sergeant'}])assert.equal(soulPoseForPress(g,{...s,...change},s.lines[0],base),null);
 assert.equal(soulPoseForPress(g,s,s.lines[0],'img/Asia/spirit-officer-asia.png'),null);
 const recruit=soulFor('recruit');
 assert.equal(soulPoseForPress(g,recruit,recruit.lines[0],'img/Asia/spirit-worker-asia-v2.png'),null,'regional costume must match');
});
test('registered assets exist, preserve canvas size and transparent PNG format',()=>{
 for(const [original, variants] of Object.entries(SOUL_POSE_ASSETS)) for(const path of Object.values(variants)){
  assert.ok(existsSync(path),path);
  const a=readFileSync(original),b=readFileSync(path);
  assert.deepEqual(b.subarray(0,8),a.subarray(0,8));
  assert.deepEqual(b.subarray(16,24),a.subarray(16,24),'PNG canvas dimensions');
  assert.equal(b[25],6,'RGBA PNG');
 }
});
test('preloading includes the pose alongside its original, including shared and fallback assets, once',()=>{
 for(const catalog of [{shared:[],zones:{th:[base]}},{shared:[base],zones:{th:[]}},{shared:[],zones:{th:[base],asia:[]}}]){
  const list=zoneAssets(catalog,'asia');
  assert.ok(list.includes(base));assert.equal(list.filter(x=>x===pose).length,1);
 }
 assert.deepEqual(soulPoseAssets('unknown'),[]);
});

const necessityPairs = [
 ['recruit','recruit','v3'], ['girl','girl','v2'], ['boy','boy','v2'],
 ['sergeant','officer','v2'], ['hammer','elder-woman','v2'], ['healer','worker','v2'],
];
test('all six necessity cases select only an unused plea revealing unknown mitigation',()=>{
 for(const [key,name,version] of necessityPairs){
  const g=createGame(),s=soulFor(key),l=s.lines.find(l=>l.kind==='plea');
  const original=`img/Thai/spirit-${name}-th-${version}.png`;
  const expected=`img/soul-poses/${name}-th-necessity-v1.png`;
  const before=structuredClone(s);
  assert.equal(soulPoseForPress(g,s,l,original),expected,key);
  assert.deepEqual(s,before,'selection must not change evidence or justice');
  for(const change of [{presses:0},{back:{}},{case:'nurse'},{case:undefined}])
   assert.equal(soulPoseForPress(g,{...s,...change},l,original),null,key);
  assert.equal(soulPoseForPress(g,s,{...l,used:true},original),null,key);
  assert.equal(soulPoseForPress(g,s,{...l,kind:'deny'},original),null,key);
  const out=g.press(s,l.i);
  assert.ok(out.some(x=>x.kind==='truth'||x.kind==='confession'),key);
  assert.equal(soulPoseForPress(g,s,l,original),null,'used plea');
  const known=soulFor(key); known.deeds.forEach(d=>{d.known=true;});
  assert.equal(soulPoseForPress(g,known,known.lines.find(l=>l.kind==='plea'),original),null,'already known mitigation');
 }
});
test('every necessity drawing preloads exactly once for shared, own and regional fallback catalogs',()=>{
 for(const [,name,version] of necessityPairs){
  const original=`img/Thai/spirit-${name}-th-${version}.png`;
  const expected=`img/soul-poses/${name}-th-necessity-v1.png`;
  for(const catalog of [{shared:[original],zones:{th:[]}},{shared:[],zones:{th:[original,original]}},{shared:[],zones:{th:[original],asia:[]}}]){
   const list=zoneAssets(catalog,'asia');
   assert.equal(list.filter(x=>x===expected).length,1,expected);
  }
 }
});
