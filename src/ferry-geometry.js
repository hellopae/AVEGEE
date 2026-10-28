import {townSkinOf} from './zone-skin.js';
// World-space silhouettes of the painted central river bridge, including its
// parapets/front face. These hide vessels only; they never alter walk masks.
const TOWN_BRIDGES={
 th:[[1842,1460],[2012,1460],[2012,1870],[2040,1980],[1805,1980],[1835,1880]],
 asia:[[1830,1432],[2014,1432],[2014,1915],[2030,2010],[1810,2010],[1830,1915]],
 west:[[1830,1432],[2014,1432],[2014,1915],[2030,2010],[1810,2010],[1830,1915]],
};
// Same foreground silhouette previously repainted over the legacy ferry.
const LEGACY_BRIDGE=[[770,620],[904,620],[904,757],[943,790],[943,880],[988,937],[676,937],[704,872],[704,790],[770,755]];
export const ferryBridge=zone=>townSkinOf(zone)?(TOWN_BRIDGES[zone]||null):LEGACY_BRIDGE;
export function ferryBerth(zone,pier){
 const reviewed=!!townSkinOf(zone)&&!!TOWN_BRIDGES[zone];
 return {x:pier.x,y:pier.y+(reviewed?60:120),hop:reviewed?8:40};
}
export function withFerryOcclusion(ctx,zone,draw){
 const bridge=ferryBridge(zone);
 if(!bridge)return draw();
 ctx.save();
 try{
  ctx.beginPath();ctx.rect(-4096,-4096,16384,16384);
  bridge.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();
  ctx.clip('evenodd');draw();
 }finally{ctx.restore();}
}
