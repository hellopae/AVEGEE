import {canWalk,clearLine,findPath} from './walk.js?v=k1d';
import {QUEUE_LINE} from './data.js';
import {pathLength,pointAtDistance} from './escort.js';
export const WORKER_PICKUP_GAP=40;
export const WORKER_HANDOFF_GAP=72;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
// Validate the entire pickup route, not only its endpoint. Legacy coincident
// starts may move out, but once clear must never cross the waiting soul again.
function pickupClear(path,soul){
 let escaped=distance(path[0],soul)>=WORKER_PICKUP_GAP;
 for(let i=1;i<path.length;i++){
  const a=path[i-1],b=path[i],n=Math.max(1,Math.ceil(distance(a,b)/6));
  for(let j=1;j<=n;j++){const d=distance([a[0]+(b[0]-a[0])*j/n,a[1]+(b[1]-a[1])*j/n],soul);if(escaped&&d<WORKER_PICKUP_GAP-.5)return false;if(d>=WORKER_PICKUP_GAP)escaped=true;}
 }
 return escaped;
}
const route=(a,b)=>clearLine(a,b)?[a,b]:(()=>{const path=findPath(...a,...b);return path?.length&&distance(path.at(-1),b)<=18?[a,...path]:null;})();
function pickupRoute(from,to,soul){
 const direct=route(from,to);if(direct&&pickupClear(direct,soul))return direct;
 const angle=Math.atan2(to[1]-soul[1],to[0]-soul[0]);
 for(const radius of [80,112])for(const side of [-1,1]){
  const via=[soul[0]+Math.cos(angle+side*Math.PI/2)*radius,soul[1]+Math.sin(angle+side*Math.PI/2)*radius];
  if(!canWalk(...via))continue;const first=route(from,via),last=route(via,to);if(!first||!last)continue;
  const path=[...first,...last.slice(1)];if(pickupClear(path,soul))return path;
 }
 return null;
}
function transitClear(workerPath,leadAt,soulPath){
 const workerLength=pathLength(workerPath),soulLength=pathLength(soulPath);
 for(let i=0;i<=128;i++){const p=i/128;
  if(distance(pointAtDistance(workerPath,leadAt+(workerLength-leadAt)*p),pointAtDistance(soulPath,soulLength*p))<40)return false;
 }
 return true;
}
function slicePath(path,from,to){
 const out=[pointAtDistance(path,from)];let d=0;
 for(let i=1;i<path.length;i++){d+=distance(path[i-1],path[i]);if(d>from&&d<to)out.push(path[i]);}
 out.push(pointAtDistance(path,to));return out;
}
export function planWorkerEscort(g,w,walk){
 const path=walk.path;if(!path?.length)return null;
 const start=path[0],end=path.at(-1),prev=[...path].reverse().find(p=>distance(p,end)>1)||[end[0]-1,end[1]],angle=Math.atan2(end[1]-prev[1],end[0]-prev[0]);
 const peers=[...(g.workerState?.workers||[]).filter(c=>c!==w&&c.teaRest?.phase!=='rest').map(c=>[c.x,c.y]),
  ...(g.afterlifeWalks||[]).filter(a=>a!==walk&&a.escort?.dropoff).map(a=>a.escort.dropoff),
  ...(g.queue||[]).slice(0,QUEUE_LINE.length).map((s,i)=>QUEUE_LINE[i])];
 const free=at=>canWalk(...at)&&distance(at,end)>=WORKER_HANDOFF_GAP&&distance(at,start)>=WORKER_PICKUP_GAP&&peers.every(p=>distance(at,p)>=48);
 for(const radius of [80,104,136])for(const offset of [0,Math.PI/4,-Math.PI/4,Math.PI/2,-Math.PI/2,3*Math.PI/4,-3*Math.PI/4,Math.PI]){
  const at=[end[0]+Math.cos(angle+offset)*radius,end[1]+Math.sin(angle+offset)*radius];if(!free(at))continue;
  const exit=route(end,at);if(!exit||pathLength(exit)>radius*2+32||!free(exit.at(-1)))continue;
  const workerPath=[...path,...exit.slice(1)],length=pathLength(workerPath);
  let leadAt=72;while(leadAt<length&&distance(pointAtDistance(workerPath,leadAt),start)<48)leadAt+=8;
  leadAt=Math.min(leadAt,length);const pickup=pickupRoute([w.x,w.y],pointAtDistance(workerPath,leadAt),start);
  if(pickup&&transitClear(workerPath,leadAt,path))return {workerPath,leadAt,dropoff:workerPath.at(-1),pickup,formation:'lead'};
 }
 // A single-width corridor may offer no route past a waiting soul. In that
 // case collect from behind and follow it; never squeeze through its feet.
 const approach=route([w.x,w.y],start);
 if(approach){const length=pathLength(approach);
  for(const back of [64,80,104,136,168]){
   if(back>length)continue;const at=length-back,behind=pointAtDistance(approach,at);
   if(distance(behind,start)<48)continue;
   const pickup=slicePath(approach,0,at);if(!pickupClear(pickup,start))continue;
   const full=[...slicePath(approach,at,length),...path.slice(1)],total=pathLength(full);
   for(const tail of [80,104,136,168,200]){const cut=Math.max(0,total-tail),dropoff=pointAtDistance(full,cut);if(!free(dropoff))continue;
    const workerPath=slicePath(full,0,cut);if(transitClear(workerPath,0,path))return {workerPath,leadAt:0,dropoff,pickup,formation:'follow'};
   }
  }
 }
 return null;
}
/** Old saves have no workerPath. Settle beside the soul on valid floor, or
 * keep a valid earlier route point instead of placing both feet at its end. */
export function workerDropoff(g,w,walk){
 if(walk.escort?.dropoff&&canWalk(...walk.escort.dropoff))return walk.escort.dropoff;
 const plan=planWorkerEscort(g,w,walk);if(plan)return plan.dropoff;
 const end=walk.path?.at(-1);return end?[...walk.path].reverse().find(p=>canWalk(...p)&&distance(p,end)>=WORKER_HANDOFF_GAP)||null:null;
}
