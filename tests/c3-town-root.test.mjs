import test from 'node:test';
import assert from 'node:assert/strict';
import {syncSceneZone} from '../src/data.js';
import {ZONE_SKIN,townArtFoot,setActiveTownZone} from '../src/zone-skin.js';
import {TOWN_PROP_SITES} from '../src/town-layout.js?v=k1d';
import {addTownSceneryLayers,townPropArt} from '../src/town-scenery.js';
import {listCasters} from '../src/town-shade.js';
const noop=()=>{};
globalThis.document={createElement:()=>({getContext:()=>({drawImage:noop,getImageData(){throw Error('no pixel surface');}})})};
const pine={src:'https://example.test/img/frontier-route/tree-pine-v2.png',naturalWidth:1199,naturalHeight:1312};
const maple={...pine,src:'img/frontier-route/tree-maple-v2.png?v=test'};
const resolve=k=>k==='town-tree-th'?pine:k==='town-tree-red-th'?maple:null;
test('C3 actual scenery and shadow caster use the same drawn box and keep visible roots at owner feet',()=>{
 syncSceneZone('asia');const draws=[];const ctx=new Proxy({drawImage(...args){draws.push(args)}},{get:(o,k)=>o[k]||noop,set:(o,k,v)=>{o[k]=v;return true}});
 const queue=[];addTownSceneryLayers((y,draw)=>queue.push(draw),ctx,null,null,null,{player:{x:-9999,y:-9999}},0,null,true,resolve);for(const draw of queue)draw();
 const painted=draws.filter(d=>[pine,maple].includes(d[0]));assert.ok(painted.length>10);
 const casters=listCasters(resolve,()=>null,[],p=>townPropArt(p,null,null,resolve));
 for(const [art,x,y,w,h]of painted){const a=ZONE_SKIN.asia.rootAnchors[art===pine?'tree-pine-v2.png':'tree-maple-v2.png'];const root=[x+w*a[0],y+h*a[1]];assert.ok(TOWN_PROP_SITES.some(p=>Math.hypot(p.x-root[0],p.y-root[1])<1e-7),'visible root preserves approved logical foot '+JSON.stringify({root,nearest:TOWN_PROP_SITES.reduce((best,p)=>Math.min(best,Math.hypot(p.x-root[0],p.y-root[1])),Infinity),a,src:art.src}));assert.ok(casters.some(c=>c.art===art&&Math.hypot(c.x+c.left-x,c.y+c.top-y)<1e-7),'shadow source box equals actual sprite box '+JSON.stringify({draw:[x,y,w,h],nearest:casters.filter(c=>c.art===art).map(c=>({dist:Math.hypot(c.x+c.left-x,c.y+c.top-y),box:[c.x+c.left,c.y+c.top,c.w,c.h]})).sort((a,b)=>a.dist-b.dist).slice(0,1)}));}
 syncSceneZone('th');
});
test('C3 anchor compensation stays local to Asia and preserves legacy art elsewhere',()=>{
 for(const zone of ['th','west']){setActiveTownZone(zone);assert.deepEqual(townArtFoot(pine,100,200,160,180),{x:100,y:200});}
 setActiveTownZone('asia');assert.deepEqual(townArtFoot({src:'legacy.webp'},100,200,160,180),{x:100,y:200});setActiveTownZone('th');
});
