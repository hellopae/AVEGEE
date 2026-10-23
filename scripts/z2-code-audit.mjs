// Export actual game layout, pixel-derived building bases and navigation for the PIL evidence renderer.
// Run: node scripts/z2-code-audit.mjs
import {mkdirSync,writeFileSync} from 'node:fs';
import {setup,geometry,walk,STATIONS,FRONTIER,art} from '../tests/helpers/m2-map.mjs';
import * as L from '../src/town-layout.js?v=k1d';
import {townPropArtKey} from '../src/town-scenery.js?v=k1d';
import {townSkinArt,ZONE_SKIN} from '../src/zone-skin.js';
import {themeArt} from '../src/theme-assets.js';
import {TOWN_OWNER_MASK_META} from '../src/town-owner-walkmask-asia.js';
const {g,spawn}=setup('asia');
const anchors=[['spawn',...spawn],...Object.entries(L.TOWN_ENTRY).map(([k,p])=>['entry:'+k,...p]),
  ...Object.entries(L.TOWN_CREW).map(([k,p])=>['npc:'+k,...p]),
  ['guard',...L.TOWN_GUARD_POST],['challenge',...L.TOWN_CHALLENGE],['merchant',L.TOWN_MERCHANT.x,L.TOWN_MERCHANT.y],
  ['harbour',...L.TOWN_SPOTS.ferry.from],['frontier',FRONTIER.x,FRONTIER.y],
  ...STATIONS.map(p=>['station/sign:'+p.k,p.x,p.y])].map(([key,x,y])=>{
    const path=walk.findPath(...spawn,x,y);
    return {key,x,y,floor:L.townFloorAt(x,y),walk:walk.canWalk(x,y),reachable:path?.at(-1)?.[0]===x&&path?.at(-1)?.[1]===y,path};
  });
const stations=[...STATIONS,FRONTIER].map(d=>({...geometry(d),base:art.footOf(d),box:art.stationBox(d)}))
  .map(({box,...s})=>({...s,box:{x:box.x,y:box.y,w:box.w,h:box.h,flip:box.flip}}));
const houses=L.TOWN_HOUSE_SITES.map((h,i)=>({...h,id:'house-'+(i+1),base:L.TOWN_HOUSES[i],src:themeArt('town-residence-'+h.key,'asia')}));
const props=L.TOWN_PROP_SITES.map(p=>({...p,src:townSkinArt('asia',p.kind==='torch'?'town-prop-torch-pillar':townPropArtKey(p)),fallback:p.fallbackKey?townSkinArt('asia',p.fallbackKey):null}));
const folder='output/z2-code';mkdirSync(folder,{recursive:true});
writeFileSync(folder+'/layout.json',JSON.stringify({meta:TOWN_OWNER_MASK_META,size:L.TOWN_SIZE,terrain:ZONE_SKIN.asia.terrain.preview,
  pathCell:L.townPathCell(),spawn,anchors,stations,houses,props,dais:{...L.TOWN_DAIS,src:themeArt('town-judgment-th','asia')}},null,2)+'\n');
const floor=Buffer.alloc(1536*1024),mask=Buffer.alloc(480*320);
for(let y=0;y<1024;y++)for(let x=0;x<1536;x++)floor[y*1536+x]=L.townFloorAt((x+.5)*2.5,(y+.5)*2.5)?255:0;
mask.set(L.TOWN_WALK_MASK.data.map(x=>x*255));
writeFileSync(folder+'/floor.raw',floor);writeFileSync(folder+'/mask.raw',mask);
console.log(JSON.stringify({anchors:anchors.length,unreachable:anchors.filter(p=>!p.reachable).map(p=>p.key),trees:props.filter(p=>p.kind==='tree').length}));
