import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { ALL_CASES } from '../src/cases.js';
import { createGame } from '../src/game.js';
import { CASE_POSE_TYPES, SOUL_POSE_ASSETS, soulPoseForPress, soulPoseForScare, soulPoseAssets, genericSoulPose, parseSoulBase } from '../src/soul-poses.js';
import { SOUL_POSE_FILES } from '../src/soul-pose-manifest.js';
import { pressReaction } from '../src/interrogation-ui.js';
import { readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { zoneAssets } from '../src/asset-preload.js';
import {imageMeta} from './helpers/image-meta.mjs';
const base = 'img/Thai/spirit-officer-th-v2.webp';
const pose = 'img/soul-poses/officer-th-caught-lie-v1.webp';
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
test('no substitution for a solid line, exhausted press, return, an `other` case or another regional image',()=>{
 const g=createGame(),s=soulFor('pol');
 assert.equal(soulPoseForPress(g,s,s.lines.find(l=>l.kind==='solid'),base),null);
 for(const change of [{presses:0},{back:{}},{case:'nurse'},{case:'sergeant'}])assert.equal(soulPoseForPress(g,{...s,...change},s.lines[0],base),null);
 assert.equal(soulPoseForPress(g,s,s.lines[0],'img/Asia/spirit-officer-asia.webp'),null);
 const recruit=soulFor('recruit');
 assert.equal(soulPoseForPress(g,recruit,recruit.lines[0],'img/CyberHell/spirit-clerk-cyberhell-v2.webp'),null,'no drawing for this slot yet; never another zone costume');
});
const ORIGINAL_DIR={th:'Thai',asia:'Asia',west:'West',cyberhell:'CyberHell'};
// every generic file (manifest) belongs to an original: <archetype>-<zone>-<scared|cry|caught-lie|necessity>-v1 -> img/<Dir>/spirit-<archetype>-<zone>-v*.webp
const originalOf=path=>{
 const m=/^img\/soul-poses\/([a-z-]+)-(th|asia|west|cyberhell)-(?:scared|cry|caught-lie|necessity)-v1\.webp$/.exec(path);
 assert.ok(m,`bad pose file name: ${path}`);
 const dir=`img/${ORIGINAL_DIR[m[2]]}`;
 const found=readdirSync(dir).filter(f=>new RegExp(`^spirit-${m[1]}-${m[2]}-v\\d+\\.webp$`).test(f));
 if(m[1]==='graduate')return 'img/West/spirit-graduate-west-v3.webp';
 assert.equal(found.length,1,`original of ${path}`);return `${dir}/${found[0]}`;
};
test('registered assets exist, preserve canvas size and transparent PNG format',()=>{
 const pairs=[...Object.entries(SOUL_POSE_ASSETS).flatMap(([o,v])=>Object.values(v).map(p=>[o,p])),...[...SOUL_POSE_FILES].map(p=>[originalOf(p),p])];
 for(const [original,path] of pairs){
  assert.ok(existsSync(path),path);
  const a=readFileSync(original),b=readFileSync(path);
  const ma=imageMeta(a),mb=imageMeta(b);
  assert.equal(mb.format,ma.format);
  assert.deepEqual([mb.width,mb.height],[ma.width,ma.height],'canvas dimensions');
  assert.ok(mb.hasAlpha,'RGBA');
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
const art2Pairs = [
 ['pol','officer'], ['gen','officer'], ['nun','woman'], ['novice','woman'],
 ['star','worker'], ['lord','business'], ['monk','cleric'], ['prophet','cleric'],
];
const art3Pairs = [
 ['orchard','woman'], ['trader','executive'], ['sister','clerk'],
 ['hunter','business'], ['gadget','business'], ['accountant','executive'], ['heir','executive'],
];
const art4Pairs = [
 ['A1','cleric'], ['A2','worker'], ['A3','officer'], ['A4','executive'],
 ['A6','executive'], ['A7','cleric'], ['A8','woman'], ['A9','business'],
];
const art5Pairs = [
 ['A10','business'], ['A12','woman'], ['A14','business'], ['A15','executive'],
 ['A16','clerk'], ['A17','business'], ['A18','business'], ['A20','business'],
];
test('ART4 and ART5 Asia cases select their regional drawing and preload it once without mutating evidence',()=>{
 for(const [key,name] of [...art4Pairs,...art5Pairs]){
  const g=createGame(),s=soulFor(key),l=s.lines.find(l=>l.kind==='deny');
  const original=`img/Asia/spirit-${name}-asia-v2.webp`;
  const expected=`img/soul-poses/${name}-asia-caught-lie-v1.webp`;
  const before=structuredClone(s);
  assert.ok(l,key);
  assert.equal(soulPoseForPress(g,s,l,original),expected,key);
  assert.deepEqual(s,before,'selection preserves evidence and justice');
  assert.equal(soulPoseForPress(g,s,{...l,used:true},original),null,key);
  assert.equal(soulPoseForPress(g,{...s,presses:0},l,original),null,key);
  assert.equal(soulPoseForPress(g,{...s,back:{}},l,original),null,key);
  assert.equal(soulPoseForPress(g,s,l,original.replace('/Asia/','/West/')),null,key);
  for(const catalog of [{shared:[original],zones:{asia:[]}},{shared:[],zones:{asia:[original,original]}},{shared:[],zones:{th:[original],asia:[]}}])
   assert.equal(zoneAssets(catalog,'asia').filter(src=>src===expected).length,1,key);
 }
 for(const key of ['A5','A11','A13','A19']){
  const s=soulFor(key),l=s.lines[0];
  for(const [,name] of [...art4Pairs,...art5Pairs])
   assert.equal(soulPoseForPress(createGame(),s,l,`img/Asia/spirit-${name}-asia-v2.webp`),null,key);
 }
});
test('ART2 and ART3 caught lie cases select their original-specific drawing without changing evidence',()=>{
 for(const [key,name] of [...art2Pairs,...art3Pairs]){
  const g=createGame(),s=soulFor(key),l=s.lines.find(l=>l.kind==='deny');
  const original=`img/Thai/spirit-${name}-th-v2.webp`;
  const expected=`img/soul-poses/${name}-th-caught-lie-v1.webp`;
  const before=structuredClone(s);
  assert.ok(l,key);
  assert.equal(soulPoseForPress(g,s,l,original),expected,key);
  assert.deepEqual(s,before,'selection preserves evidence and justice');
  assert.equal(soulPoseForPress(g,s,{...l,used:true},original),null,key);
  assert.equal(soulPoseForPress(g,s,l,original.replace('/Thai/','/Asia/')),null,key);
  for(const catalog of [{shared:[original],zones:{th:[]}},{shared:[],zones:{th:[original,original]}},{shared:[],zones:{th:[original],asia:[]}}])
   assert.equal(zoneAssets(catalog,'asia').filter(src=>src===expected).length,1,key);
 }
});
test('all six necessity cases select only an unused plea revealing unknown mitigation',()=>{
 for(const [key,name,version] of necessityPairs){
  const g=createGame(),s=soulFor(key),l=s.lines.find(l=>l.kind==='plea');
  const original=`img/Thai/spirit-${name}-th-${version}.webp`;
  const expected=`img/soul-poses/${name}-th-necessity-v1.webp`;
  const before=structuredClone(s);
  assert.equal(soulPoseForPress(g,s,l,original),expected,key);
  assert.deepEqual(s,before,'selection must not change evidence or justice');
  for(const change of [{presses:0},{back:{}},{case:'nurse'}])
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
  const original=`img/Thai/spirit-${name}-th-${version}.webp`;
  const expected=`img/soul-poses/${name}-th-necessity-v1.webp`;
  for(const catalog of [{shared:[original],zones:{th:[]}},{shared:[],zones:{th:[original,original]}},{shared:[],zones:{th:[original],asia:[]}}]){
   const list=zoneAssets(catalog,'asia');
   assert.equal(list.filter(x=>x===expected).length,1,expected);
  }
 }
});

test('the pose manifest matches the files on disk (run node scripts/soul-pose-manifest.mjs after adding a drawing)',()=>{
 execFileSync('node',['scripts/soul-pose-manifest.mjs','--check']);
 assert.deepEqual([...SOUL_POSE_FILES].sort(),readdirSync('img/soul-poses').filter(f=>f.endsWith('.webp')).sort().map(f=>`img/soul-poses/${f}`));
});
test('base path parsing needs the matching folder, zone and a version',()=>{
 assert.deepEqual(parseSoulBase('img/Thai/spirit-officer-th-v2.webp'),{archetype:'officer',zone:'th'});
 assert.deepEqual(parseSoulBase('img/West/spirit-elder-woman-west-v2.webp'),{archetype:'elder-woman',zone:'west'});
 assert.deepEqual(parseSoulBase('img/CyberHell/spirit-business-cyberhell-v2.webp'),{archetype:'business',zone:'cyberhell'});
 for(const bad of ['img/Asia/spirit-officer-th-v2.webp','img/Asia/spirit-officer-asia.webp','img/spirit7.webp','',null,undefined])assert.equal(parseSoulBase(bad),null,String(bad));
});
// A slot is filled by: the new -scared/-cry file, else the old caught-lie / necessity drawing (alias), else nothing (the CSS effect stays). Never another zone's costume.
const withFiles=(files,fn)=>{for(const f of files)SOUL_POSE_FILES.add(f);try{fn()}finally{for(const f of files)SOUL_POSE_FILES.delete(f)}};
test('alias then own file then nothing, per archetype and zone, never another zone',()=>{
 const th='img/Thai/spirit-officer-th-v2.webp', west='img/CyberHell/spirit-business-cyberhell-v2.webp', asia='img/Asia/spirit-worker-asia-v2.webp';
 assert.equal(genericSoulPose(th,'scared'),'img/soul-poses/officer-th-caught-lie-v1.webp','alias');
 assert.equal(genericSoulPose(th,'cry'),'img/soul-poses/officer-th-necessity-v1.webp','alias');
 assert.equal(genericSoulPose(asia,'scared'),'img/soul-poses/worker-asia-caught-lie-v1.webp');
 assert.equal(genericSoulPose(asia,'cry'),'img/soul-poses/worker-asia-cry-v1.webp','own cry file');
 assert.equal(genericSoulPose(west,'scared'),null);assert.equal(genericSoulPose(west,'cry'),null);
 const own='img/soul-poses/officer-th-scared-v1.webp',westOwn='img/soul-poses/business-cyberhell-scared-v1.webp';
 withFiles([own,westOwn],()=>{
  assert.equal(genericSoulPose(th,'scared'),own,'a new file wins over the alias');
  assert.equal(genericSoulPose(west,'scared'),westOwn);
  assert.equal(genericSoulPose('img/CyberHell/spirit-clerk-cyberhell-v2.webp','scared'),null,'a West clerk file never serves CyberHell');
  assert.ok(soulPoseAssets(west).includes(westOwn),'preloaded');
 });
 assert.equal(genericSoulPose(west,'scared'),null,'file gone -> back to nothing');
 assert.deepEqual(soulPoseAssets(west),[],'nothing to preload, nothing requested');
});
const randomSoul=(key,extra={})=>({...soulFor(key),case:undefined,...extra});
test('random souls: deny / fake boast -> scared, plea that opens mitigation -> cry, solid or spent -> nothing',()=>{
 const g=createGame(), th='img/Thai/spirit-officer-th-v2.webp';
 const s=randomSoul('pol');
 const deny=s.lines.find(l=>l.kind==='deny'), before=structuredClone(s);
 assert.equal(pressReaction(g,s,deny),'fear');
 assert.equal(soulPoseForPress(g,s,deny,th),'img/soul-poses/officer-th-caught-lie-v1.webp');
 assert.deepEqual(s,before,'selection does not touch evidence');
 assert.equal(soulPoseForPress(g,s,s.lines.find(l=>l.kind==='solid'),th),null);
 for(const change of [{presses:0},{back:{}}])assert.equal(soulPoseForPress(g,{...s,...change},deny,th),null);
 assert.equal(soulPoseForPress(g,s,{...deny,used:true},th),null);
 assert.equal(soulPoseForPress(g,s,deny,'img/Thai/spirit-officer-th.webp'),null,'unknown base');
 const hard=randomSoul('sergeant'), plea=hard.lines.find(l=>l.kind==='plea');
 assert.equal(pressReaction(g,hard,plea),'relief');
 assert.equal(soulPoseForPress(g,hard,plea,th),'img/soul-poses/officer-th-necessity-v1.webp');
 assert.equal(soulPoseForPress(g,hard,plea,'img/CyberHell/spirit-business-cyberhell-v2.webp'),null,'no Cyberhell business drawing yet: CSS effect');
 const gen=randomSoul('gen'), boast=gen.lines.find(l=>l.kind==='boast');
 assert.equal(soulPoseForPress(g,gen,boast,th),'img/soul-poses/officer-th-caught-lie-v1.webp');
 gen.merits[0].exposed=true;assert.equal(soulPoseForPress(g,gen,boast,th),null,'exposed boast');
});
test('named case without its own file takes the generic drawing; `other` never does',()=>{
 const g=createGame(), west='img/CyberHell/spirit-business-cyberhell-v2.webp', file='img/soul-poses/business-cyberhell-scared-v1.webp', cry='img/soul-poses/business-cyberhell-cry-v1.webp';
 const pol=soulFor('pol'), sergeant=soulFor('sergeant'), nurse=soulFor('nurse');
 assert.equal(soulPoseForPress(g,pol,pol.lines.find(l=>l.kind==='deny'),west),null);
 withFiles([file,cry],()=>{
  assert.equal(soulPoseForPress(g,pol,pol.lines.find(l=>l.kind==='deny'),west),file);
  assert.equal(soulPoseForPress(g,sergeant,sergeant.lines.find(l=>l.kind==='plea'),west),cry);
  assert.equal(soulPoseForPress(g,sergeant,sergeant.lines.find(l=>l.kind==='deny')||{kind:'deny',used:false},west),null,'necessity cases use cry on a plea only');
  assert.equal(soulPoseForPress(g,nurse,nurse.lines[0],west),null);
  assert.equal(soulPoseForScare(nurse,west),null);
 });
});
test('mirror / hypnosis and a beaten soul use the scared drawing; a returned soul does not',()=>{
 const th='img/Thai/spirit-officer-th-v2.webp', s=soulFor('pol');
 assert.equal(soulPoseForScare(s,th),'img/soul-poses/officer-th-caught-lie-v1.webp');
 assert.equal(soulPoseForScare(randomSoul('pol'),th),'img/soul-poses/officer-th-caught-lie-v1.webp');
 assert.equal(soulPoseForScare({...s,back:{}},th),null);
 assert.equal(soulPoseForScare(s,'img/CyberHell/spirit-business-cyberhell-v2.webp'),null);
 assert.equal(soulPoseForScare(null,th),null);
});
test('real random souls from spawnSoul get a pose slot decided by their reaction, with no throw',()=>{
 const g=createGame(); const rnd=Math.random; let n=0;
 try{
  Math.random=()=>[.05,.9,.5,.2,.7,.35,.6][n++%7];
  g.casesDone=2;for(let i=0;i<10;i++)g.spawnSoul();
 }finally{Math.random=rnd}
 const randoms=g.queue.filter(s=>!s.case);assert.ok(randoms.length>0);
 for(const s of randoms)for(const l of s.lines){
  const reaction=pressReaction(g,s,l), out=soulPoseForPress(g,s,l,'img/Thai/spirit-officer-th-v2.webp');
  if(l.kind==='solid')assert.equal(out,null);
  else if(reaction==='relief')assert.equal(out,'img/soul-poses/officer-th-necessity-v1.webp');
  else assert.ok(out===null||out==='img/soul-poses/officer-th-caught-lie-v1.webp');
 }
});
