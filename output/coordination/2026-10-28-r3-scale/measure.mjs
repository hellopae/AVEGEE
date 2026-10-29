// Source-pixel diagnostics, NOT browser screenshots or measured viewport heights.
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {mapActorHeight,fitAllySizes} from '../../../src/character-scale.js';
import {planBattleFormation} from '../../../src/battle-formation.js';
import {crewWalkSheet} from '../../../src/crew-walk-assets.js';
const out='output/coordination/2026-10-28-r3-scale',manifest=JSON.parse(readFileSync('img/manifest.json'));
const rows=[];
for(const zone of ['th','asia','west','cyberhell'])for(const key of ['yama','nira','taan','plerng','kan','boon','dam','guard','worker']){
 const stem=key==='yama'?'hero-yama':`crew-${key}`;
 const files=manifest.zones[zone]||[];
 const file=zone==='th'?`img/${stem}${key==='guard'?'-v2':''}.png`:'img/'+files.find(f=>new RegExp(`/${stem}-${zone}(-v2)?\\.png$`).test(f));
 const path=key==='worker'?`img/workers/worker-${zone}-sheet-v2.webp`:file;
 const box=JSON.parse(execFileSync('python3',['-c',`from PIL import Image
import json,sys
im=Image.open(sys.argv[1]).convert('RGBA');walkH=None
if sys.argv[2]=='worker':
 b=im.crop((0,320,320,640)).getchannel('A').point(lambda x:255 if x>40 else 0).getbbox();walkH=(b[3]-b[1])/320
if sys.argv[2]=='worker':im=im.crop((0,0,320,320))
a=im.getchannel('A').point(lambda x:255 if x>40 else 0);b=a.getbbox();w,h=im.size
print(json.dumps(dict(l=b[0]/w,t=b[1]/h,w=(b[2]-b[0])/w,h=(b[3]-b[1])/h,aspect=w/h,walkH=walkH)))`,path,key],{encoding:'utf8'}));
 const before=key==='yama'?92:key==='guard'?104:key==='worker'?82*.85:82;
 const after=mapActorHeight(key),assetFit=zone==='cyberhell'&&key==='taan'?1.148:1;
 const actualFactor=key==='yama'?1:box.h*assetFit;
 const walk=key==='yama'?1:key==='worker'?box.walkH:(()=>{const s=crewWalkSheet(key,zone);return s.frames[0].h/s.frameSize.h*s.heightScale;})();
 rows.push({zone,key,path,box,reference:'town world units; scale=.8*.75; alpha>40; idle t=0/x=0',mapBefore:before*.6*actualFactor,mapAfter:after*.6*actualFactor,walkBefore:before*.6*walk,walkAfter:after*.6*walk});
}
const battles=[];
for(const zone of ['th','asia','west','cyberhell'])for(const [viewport,width,height,reference] of [['desktop',1440,900,215],['mobile',390,844,79]]){
 const actors=['guard','boon','kan','nira','taan','plerng','dam','yama'].map(key=>{const row=rows.find(r=>r.zone===zone&&r.key===key);return {key,box:row.box,aspect:row.box.aspect};});
 const slots=planBattleFormation(actors.length,width,height),sizes=fitAllySizes(reference,actors,slots,{width,height});
 battles.push(...actors.map((a,i)=>({zone,viewport,key:a.key,reference,stage:[width,height],before:reference*slots[i].scale*(a.key==='yama'?1:.96),after:sizes[i].h*a.box.h,foot:slots[i].y})));
}
writeFileSync(`${out}/source-measurements.json`,JSON.stringify({note:'Calculated from source alpha and pure layout functions; browser screen measurements remain pending.',rows,battles},null,2));
const table=['# R3 source-pixel diagnostics (not screen measurements)','',
 'All four towns use .8 × .75. Heights below are at native world scale, with no viewport/camera factor. Standing art uses its alpha box; Yama uses A7 body fit. Workers show upright row 0 standing and row 1 walking; crouching poses are intentionally shorter. Walking column is frame 0 only. Actual desktop/390×844 screenshots and screen heights remain blocked by browser access.','',
 '| Zone | Actor | Stand before → after | Walk before → after |','|---|---|---:|---:|',...rows.map(r=>`| ${r.zone} | ${r.key} | ${r.mapBefore.toFixed(2)} → ${r.mapAfter.toFixed(2)} | ${r.walkBefore.toFixed(2)} → ${r.walkAfter.toFixed(2)} |`),
 '', 'Battle diagnostic: isolated 8-member planner at the stated synthetic stage sizes and original Yama reference heights (215 / 79), not the live arena viewport. Feet are identical before/after.','',
 '| Zone | Synthetic stage | Actor | Height before → after | Foot y (both) |','|---|---|---|---:|---:|',...battles.map(r=>`| ${r.zone} | ${r.viewport} | ${r.key} | ${r.before.toFixed(2)} → ${r.after.toFixed(2)} | ${r.foot.toFixed(2)} |`)];
writeFileSync(`${out}/height-table.md`,table.join('\n')+'\n');
console.log('Measured source alpha:',rows.length,'map rows;',battles.length,'synthetic battle rows');
