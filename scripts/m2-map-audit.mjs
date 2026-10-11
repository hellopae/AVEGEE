import {writeFileSync,mkdirSync} from 'node:fs';
import {setup,geometry,STATIONS,ZONES,FRONTIER,walk,ZONE_ENTRY} from '../tests/helpers/m2-map.mjs';
import {reviewStationBox} from '../src/map-art-v5.js';
import {stationButtonPos} from '../src/proximity.js';
const result=[];
for(const zone of ZONES){
 const {spawn}=setup(zone.k);
 const stations=[...STATIONS,FRONTIER].map(d=>{
   const a=geometry(d);const box=a.src.includes('/map-v5/')?reviewStationBox(d,{naturalWidth:a.size[0],naturalHeight:a.size[1]},zone.k):null;
   return {...a,box:box?{x:box.x,y:box.y,w:box.w,h:box.h,flip:box.flip}:null,button:stationButtonPos(d),routes:[spawn,ZONE_ENTRY.gate].map(start=>({start,path:walk.findPath(...start,d.x,d.y)}))};
 });
 const clear=[];
 for(let y=150;y<695;y++)for(let x=85;x<1590;x++)if(walk.canWalk(x,y))clear.push(y*1678+x);
 result.push({zone:zone.k,scene:'img/'+zone.scene+'.png',spawn,stations,clear});
}
mkdirSync('output/Codex/m2-20261011',{recursive:true});
writeFileSync('output/Codex/m2-20261011/'+(process.argv[2]||'after')+'.json',JSON.stringify(result));
