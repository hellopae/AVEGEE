// Read current game anchors/art paths without applying a zone or changing game data.
import fs from 'node:fs';
import {TOWN_ZONE_LAYOUT,TOWN_PROP_SITES,TOWN_HOUSE_SITES,TOWN_STATION_SITES,TOWN_FRONTIER,TOWN_DAIS} from '../src/town-layout.js';
import {townSkinOf} from '../src/zone-skin.js';
import {themeArt} from '../src/theme-assets.js';
import {STATION_FLIP} from '../src/data.js';
const maps={};
for(const [id,zone] of Object.entries({zone1:'th',zone2:'asia',zone3:'west',zone4:'cyberhell'})){
 const layout=TOWN_ZONE_LAYOUT[zone],skin=townSkinOf(zone),objects=[],houses=layout.houses||TOWN_HOUSE_SITES;
 for(const p of layout.props||TOWN_PROP_SITES){
  if(!['tree','palm','rock'].includes(p.kind))continue;
  const key=p.kind==='tree'&&p.biome==='lava'?'town-tree-red-th':p.kind==='tree'&&p.biome==='ice'?'town-tree-snow-th':p.kind==='palm'?'town-prop-palm':p.key;
  const src=themeArt(key,zone)||themeArt(p.fallbackKey,zone);if(!src)throw Error('Missing art '+p.id);
  objects.push({id:p.id,kind:p.kind,src,x:p.x,y:p.y,w:p.w,anchor:skin.rootAnchors?.[src.split('/').at(-1)]||[.5,1],collider:{kind:'ellipse',x:p.x,y:p.y,rx:p.rx,ry:p.ry}});
 }
 for(const [i,p]of houses.entries()){
  if(i===3)continue; // Runtime uses this plot for the canteen.
  const band=Math.min(46,p.h*.34);
  objects.push({id:'house-'+i,kind:'house',src:themeArt('town-residence-'+p.key,zone),x:p.x,y:p.y,w:p.w,flip:!!p.flip,collider:{kind:'rect',rect:[p.x-p.w*.44,p.y-band,p.x+p.w*.44,p.y]}});
 }
 const sites=structuredClone(TOWN_STATION_SITES);
 for(const [key,patch]of Object.entries(layout.stations||{}))sites[key]={...sites[key],...patch};
 const food=houses[3];if(!sites.canteen&&food)sites.canteen={bx:food.x,by:food.y,bw:food.w};
 sites.frontier={...TOWN_FRONTIER,...layout.frontier};
 for(const [k,p]of Object.entries(sites))objects.push({id:'station-'+k,kind:'station',key:k,src:k==='canteen'?`img/food-art/canteen-${zone}.webp`:themeArt('st-'+k,zone),site:{...p,k,flip:(skin.stationFlip||STATION_FLIP[zone]).includes(k)},boxMode:k==='canteen'?'canteen':k==='frontier'?'frontier':'station',collider:{kind:'sprite-foot'}});
 const dais={...TOWN_DAIS,...layout.dais};objects.push({id:'judgment-dais',kind:'dais',src:themeArt('town-judgment-th',zone),...dais,collider:{kind:'dais',zone,dais}});
 maps[id]={zone,world:[3840,2560],objects};
}
fs.writeFileSync(new URL('../docs/art-reviews/2026-11-03-layered-map/town-object-plan.json',import.meta.url),JSON.stringify({basis:'Current game layout/skin; read only. Houses, trees, rocks, stations and dais, excluding lamps/torch FX and Cyber electric poles.',maps},null,2)+'\n');
console.log(Object.fromEntries(Object.entries(maps).map(([k,v])=>[k,v.objects.length])));
