import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const manifest=JSON.parse(readFileSync('img/manifest.json'));
globalThis.fetch=async()=>({ok:true,json:async()=>manifest});
globalThis.Image=class {set src(value){this.srcValue=value;}};
const {artUrl,bindZone}=await import('../src/art.js');
await new Promise(resolve=>setImmediate(resolve));
const ui=readFileSync('src/ui.js','utf8'),source=ui.slice(ui.indexOf('const crewArt ='),ui.indexOf('\n/** L2:'));
for(const homeZone of ['th','asia','west','cyberhell'])test(`${homeZone}: Guard timeline resolves an existing image, including when visiting another zone`,()=>{
 bindZone(()=>homeZone==='cyberhell'?'th':'cyberhell');
 const actor={id:`${homeZone}:guard`,k:'guard',homeZone};
 const unit={id:actor.id,k:'guard',side:'ally',name:'ยักษ์ทวารบาล'};
 const context={g:{zone:'cyberhell',battleActors:()=>[actor],battleTimeline:()=>[unit,unit]},artUrl,esc:String,bossProfileOverride:()=>null,storyFoeArt:()=>null};
 vm.createContext(context);vm.runInContext(source,context);
 const html=context.battleTurnOrderHtml({turnQueue:{round:1}}),urls=[...html.matchAll(/<img src="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(urls.length,2);for(const url of urls){assert.ok(existsSync(url),url);assert.notEqual(url,'null');if(homeZone!=='th')assert.ok(url.toLowerCase().includes(homeZone));}
 assert.equal(context.battleTurnOrderHtml({turnQueue:{round:1},over:'win'}),'');
});
