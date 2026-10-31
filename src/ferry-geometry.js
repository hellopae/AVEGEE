import {townSkinOf} from './zone-skin.js';
// World-space silhouettes of the painted central river bridge, including its
// parapets/front face. These hide vessels only; they never alter walk masks.
// Q4-4 (owner 31 Oct): the old rectangles stood 10-20 units off the painted rails (zone 2 boat chopped before the pillar, zone 4 boat
// drawn over the right rail). These outlines follow the rails and end bulbs measured on the zone terrain at the river rows (y 1740-1910),
// (see output/coordination/2026-10-31-q4/q4-4-*); above/below that band the rails run straight and the stairs flare out as before.
const TOWN_BRIDGES={
 cyberhell:[[1845,1460],[2009,1460],[2009,1830],[2017,1850],[2021,1870],[2021,1910],[2035,2000],[1805,2000],[1831,1910],[1831,1870],[1837,1850],[1846,1830]],
 th:[[1847,1460],[2006,1460],[2006,1850],[2017,1860],[2018,1900],[2040,1980],[1805,1980],[1832,1900],[1832,1860],[1844,1850]],
 asia:[[1846,1432],[2003,1432],[2003,1780],[2008,1790],[2003,1800],[2003,1820],[2009,1830],[2009,1850],[2015,1860],[2023,1870],[2027,1890],[2036,1900],[2030,2010],[1810,2010],[1808,1900],[1820,1890],[1825,1870],[1829,1860],[1840,1850],[1840,1820],[1843,1790]],
 west:[[1850,1432],[2004,1432],[2004,1830],[2010,1850],[2012,1900],[2030,2010],[1810,2010],[1836,1900],[1838,1850],[1850,1830]],
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
