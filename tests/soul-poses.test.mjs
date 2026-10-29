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
test('no substitution for a solid line, exhausted press, return, random case, necessity or another regional image',()=>{
 const g=createGame(),s=soulFor('pol');
 assert.equal(soulPoseForPress(g,s,s.lines.find(l=>l.kind==='solid'),base),null);
 for(const change of [{presses:0},{back:{}},{case:undefined},{case:'nurse'},{case:'sergeant'}])assert.equal(soulPoseForPress(g,{...s,...change},s.lines[0],base),null);
 assert.equal(soulPoseForPress(g,s,s.lines[0],'img/Asia/spirit-officer-asia.png'),null);
 const recruit=soulFor('recruit');
 assert.equal(soulPoseForPress(g,recruit,recruit.lines[0],'img/Thai/spirit-recruit-th-v3.png'),null,'missing necessity art retains existing effects');
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
