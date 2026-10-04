// Coordinates are fractions of the background. Zone 1 follows UI2-frontier-w.jpg;
// the other zones retain their own portals, water, buildings and server barriers.
const TH = [[.47,.09],[.535,.09],[.54,.16],[.555,.20],[.563,.269],[.583,.269],[.593,.249],[.795,.239],[.841,.222],[.84,.264],[.870,.273],[.884,.337],[.87,.394],[.89,.467],[.922,.500],[.915,.538],[.886,.578],[.844,.585],[.844,.604],[.94,.623],[.94,.676],[.906,.684],[.886,.713],[.861,.734],[.83,.736],[.813,.766],[.81,.806],[.799,.85],[.783,.830],[.775,.866],[.737,.86],[.64,.855],[.64,.814],[.61,.833],[.591,.857],[.576,.99],[.432,.99],[.405,.847],[.351,.842],[.324,.904],[.302,.932],[.292,.817],[.276,.821],[.259,.837],[.258,.928],[.217,.928],[.218,.853],[.193,.837],[.191,.745],[.145,.744],[.132,.716],[.094,.696],[.077,.675],[.061,.675],[.061,.612],[.121,.61],[.142,.59],[.163,.578],[.168,.514],[.211,.514],[.211,.43],[.23,.405],[.215,.293],[.180,.283],[.168,.314],[.163,.361],[.119,.353],[.119,.319],[.105,.259],[.125,.251],[.141,.218],[.403,.226],[.413,.265],[.450,.265],[.450,.229],[.459,.176]];
const SIMPLE = [[.47,.10],[.53,.10],[.55,.24],[.83,.24],[.88,.34],[.86,.49],[.93,.61],[.92,.71],[.83,.76],[.78,.86],[.62,.83],[.58,.98],[.43,.98],[.40,.83],[.22,.84],[.15,.73],[.07,.70],[.07,.61],[.16,.57],[.17,.48],[.24,.40],[.20,.27],[.16,.28],[.14,.36],[.10,.35],[.10,.27],[.14,.23],[.44,.24]];
export const FRONTIER_NAV = {
 th:{outer:TH,holes:[[[.731,.449],[.774,.449],[.774,.517],[.745,.505],[.742,.538],[.724,.53]],[[.682,.744],[.755,.744],[.755,.791],[.681,.791]]]},
 asia:{outer:SIMPLE,holes:[[[.16,.30],[.22,.30],[.22,.50],[.16,.50]],[[.77,.28],[.85,.28],[.85,.51],[.77,.51]],[[.685,.74],[.755,.74],[.755,.80],[.685,.80]]]},
 west:{outer:SIMPLE,holes:[[[.07,.76],[.35,.76],[.35,.87],[.07,.87]],[[.67,.76],[.93,.76],[.93,.89],[.67,.89]],[[.17,.29],[.24,.29],[.24,.44],[.17,.44]],[[.73,.42],[.78,.42],[.78,.52],[.73,.52]]]},
 cyberhell:{outer:SIMPLE,holes:[[[.24,.23],[.43,.23],[.43,.35],[.24,.35]],[[.57,.23],[.63,.23],[.63,.35],[.57,.35]],[[.65,.28],[.76,.28],[.76,.47],[.65,.47]],[[.79,.32],[.85,.32],[.85,.50],[.79,.50]],[[.17,.30],[.24,.30],[.24,.43],[.17,.43]],[[.70,.73],[.78,.73],[.78,.81],[.70,.81]]]}
};
function inPolygon(x,y,points) {
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++) {
  const [a,b]=points[i], [c,d]=points[j];
  if((b>y)!==(d>y) && x<(c-a)*(y-b)/(d-b)+a) inside=!inside;
 }
 return inside;
}
// 30D — วงรอบตัวละครที่ยืนอยู่ (ศัตรู/นิรา/ยักษ์) blk = [[x,y,rx,ry],...] ในพิกัด 0–1 ของฉาก
// ไม่ส่ง blk = พฤติกรรมเดิมทุกอย่าง · วงที่ยมบาทยืนอยู่ข้างในตอนเริ่มเดิน ผู้เรียกต้องกรองออกก่อน (ดู liveBlockers)
export const inBlocker=(x,y,b)=>((x-b[0])/b[2])**2+((y-b[1])/b[3])**2<1;
export const liveBlockers=(blk,from)=>(blk||[]).filter(b=>!inBlocker(from[0],from[1],b));
export function frontierWalkable(zone,x,y,blk) {
 const nav=FRONTIER_NAV[zone] || FRONTIER_NAV.th;
 if(blk?.length && blk.some(b=>inBlocker(x,y,b))) return false;
 return inPolygon(x,y,nav.outer) && !nav.holes.some(p=>inPolygon(x,y,p));
}
const SIZE=100;
const caches=new Map();
function grid(zone,blk) {
 if(blk?.length) return Array.from({length:SIZE*SIZE},(_,i)=>frontierWalkable(zone,(i%SIZE+.5)/SIZE,(Math.floor(i/SIZE)+.5)/SIZE,blk));
 if(!caches.has(zone)) caches.set(zone,Array.from({length:SIZE*SIZE},(_,i)=>frontierWalkable(zone,(i%SIZE+.5)/SIZE,(Math.floor(i/SIZE)+.5)/SIZE)));
 return caches.get(zone);
}
function nearest(zone,x,y,cells) {
 let best=-1,d=Infinity;
 for(let i=0;i<cells.length;i++) if(cells[i]) {
  const dd=((i%SIZE+.5)/SIZE-x)**2+((Math.floor(i/SIZE)+.5)/SIZE-y)**2;
  if(dd<d){best=i;d=dd;}
 }
 return best;
}
export function frontierSegmentClear(zone,a,b,blk) {
 const n=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])*SIZE*3));
 for(let i=0;i<=n;i++) if(!frontierWalkable(zone,a[0]+(b[0]-a[0])*i/n,a[1]+(b[1]-a[1])*i/n,blk)) return false;
 return true;
}
export function frontierPath(zone,from,to,blockers) {
 const blk=liveBlockers(blockers,from);
 const cells=grid(zone,blk),start=nearest(zone,...from,cells),end=nearest(zone,...to,cells);
 const xy=i=>[(i%SIZE+.5)/SIZE,(Math.floor(i/SIZE)+.5)/SIZE];
 if(start<0 || end<0) return [];
 const target=frontierWalkable(zone,...to,blk)?to:xy(end);
 if(frontierSegmentClear(zone,from,target,blk)) return [target];
 const costs=new Float64Array(cells.length).fill(Infinity),prev=new Int32Array(cells.length).fill(-1),open=new Set([start]);
 costs[start]=0;
 const heuristic=i=>Math.hypot(i%SIZE-end%SIZE,Math.floor(i/SIZE)-Math.floor(end/SIZE));
 while(open.size) {
  let current=-1,score=Infinity;
  for(const i of open){const s=costs[i]+heuristic(i);if(s<score){current=i;score=s;}}
  if(current===end) break;
  open.delete(current);
  const x=current%SIZE,y=Math.floor(current/SIZE);
  for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]) {
   const nx=x+dx,ny=y+dy,next=ny*SIZE+nx;
   if(nx<0 || nx>=SIZE || ny<0 || ny>=SIZE || !cells[next]) continue;
   if(dx&&dy&&(!cells[y*SIZE+nx]||!cells[ny*SIZE+x])) continue;
   if(!frontierSegmentClear(zone,xy(current),xy(next),blk)) continue;
   const cost=costs[current]+Math.hypot(dx,dy);
   if(cost<costs[next]){costs[next]=cost;prev[next]=current;open.add(next);}
  }
 }
 if(start!==end&&prev[end]<0) return [];
 const points=[];
 for(let i=end;i!==start;i=prev[i]) points.unshift(xy(i));
 points.push(target);
 const smooth=[];let at=from,i=0;
 while(i<points.length){let j=i;while(j+1<points.length&&frontierSegmentClear(zone,at,points[j+1],blk))j++;smooth.push(points[j]);at=points[j];i=j+1;}
 return smooth;
}
