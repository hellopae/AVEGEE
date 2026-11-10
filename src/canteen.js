import {SPOTS} from './data.js';
import {nearestWalk,findPath,stepTo} from './walk.js?v=k1d';
import {actorStanding} from './actor-recovery.js';
export const CANTEEN_CAPACITY=6;
export const canteenActive=g=>!!g.stations?.some(s=>s.def.k==='canteen'&&!s.build&&!s.repair&&!s.fire);
export const canteenBuilt=g=>!!g.stations?.some(s=>s.def.k==='canteen'&&!s.build);
export function canteenSite(g){const d=SPOTS;const st=g.stations?.find(s=>s.def.k==='canteen');return st?{x:st.def.bx,y:st.def.by,w:st.def.bw}:{x:d.bench.x+130,y:d.bench.y+80,w:140};}
export function canteenPoint(g){const s=g.stations?.find(s=>s.def.k==='canteen')?.def;return s?(nearestWalk(s.x,s.y)||[s.x,s.y]):nearestWalk(SPOTS.bench.x,SPOTS.bench.y);}
export function canteenState(g){g.canteenState||={};return g.canteenState[g.zone]||= {meals:0,served:0,orders:[]};}
export function mealRecipients(g){return [...g.crew.filter(c=>!c.reader&&!c.self),g.guard,...(g.workerState?.workers||[]).filter(w=>w.homeZone===g.zone)].filter(Boolean);}
export const needsMeal=c=>!!c&&!c.teaRest&&!c.eatOrder&&(c.stamina!=null?((c.hunger??100)<80||c.stamina<65||(c.morale??100)<55):actorStanding(c)&&((c.hunger??100)<80||(c.morale??100)<55));
export const mealRecipient=(g,id)=>mealRecipients(g).find(c=>c.id===id);
const hungry=c=>!!c&&(c.stamina!=null||actorStanding(c))&&!c.teaRest&&((c.hunger??100)<100||(c.morale??100)<100||c.stamina<100||c.supplyRest);
export function restoreMeal(c){
 c.hunger=Math.min(100,(c.hunger??100)+40);c.morale=Math.min(100,(c.morale??100)+(c.stamina!=null?35:20));
 if(c.stamina!=null){c.stamina=Math.min(100,c.stamina+35);c.supplyRest=false;c.reason='';}
}
export const foodAvailable=g=>canteenBuilt(g)?(canteenActive(g)?canteenState(g).meals:0):(g.food||0);
export const canFeedActor=(g,id)=>!g.battle&&!g.over&&hungry(mealRecipient(g,id))&&foodAvailable(g)>=1;
export function feedActor(g,id){
 if(!canFeedActor(g,id))return false;
 if(canteenBuilt(g)){canteenState(g).meals--;canteenState(g).served++;}else g.food--;
 restoreMeal(mealRecipient(g,id));return true;
}
// Old crew cooking API is deliberately closed; unfinished paid queues are refunded on load.
export const orderRice=()=>false;
export const cancelRice=()=>false;
export function prepareCooks(g){for(const c of g.crew){if(c.cook){c.path=null;c.wait=0;}c.cook=false;delete c.cookX;delete c.cookY;}}
export function canOrderCanteenMeal(g,id){
 const c=mealRecipient(g,id);return !!(canteenActive(g)&&hungry(c)&&!g.battle&&!g.over&&!c.eatOrder&&!c.escort&&!c.buildK&&c.job?.kind!=='escort'&&!g.stations.some(s=>s.crewK===c.k&&s.slots?.length));
}
export function orderCanteenMeal(g,id){
 if(!canOrderCanteenMeal(g,id))return false;
 const c=mealRecipient(g,id);
 const dest=canteenPoint(g),x=c.x??c.hx,y=c.y??c.hy,path=findPath(x,y,...dest);
 if(!path?.length&&Math.hypot(x-dest[0],y-dest[1])>24)return false;
 if(path?.length&&Math.hypot(path.at(-1)[0]-dest[0],path.at(-1)[1]-dest[1])>35)return false;
 c.x=x;c.y=y;c.path=null;c.eatOrder={zone:g.zone,dest,path:path||[]};
 if(c.stamina!=null){c.job=null;c.target=null;c.arrived=false;}return true;
}
export function advanceCanteenDiner(g,c,dt){
 const order=c.eatOrder;if(!order)return false;
 if(g.paused||g.over||g.battle||!Number.isFinite(dt)||dt<=0)return true;
 if(order.zone!==g.zone||!canteenActive(g)||!hungry(c)){c.eatOrder=null;c.moving=false;return false;}
 const [x,y]=order.dest;c.moving=false;
 if(Math.hypot(c.x-x,c.y-y)<24){if(canteenState(g).meals>0)feedActor(g,c.id)&&(c.eatOrder=null);return true;}
 order.retry=Math.max(0,(order.retry||0)-Math.min(dt,120));
 if(!order.path?.length&&!order.retry){order.path=findPath(c.x,c.y,x,y);order.retry=600;}
 const next=order.path?.[0];if(next){const dx=next[0]-c.x,dy=next[1]-c.y,d=Math.hypot(dx,dy);if(d<2)order.path.shift();else {const speed=Math.min(d,Math.min(dt,120)*.11);c.moving=stepTo(c,dx/d*speed,dy/d*speed);c.face=dx<0?-1:1;if(!c.moving)order.path=null;}}
 return true;
}
export function stepCanteen(g,dt){
 if(g.paused||g.over||g.battle||!Number.isFinite(dt)||dt<=0)return;
 if(g.guard)advanceCanteenDiner(g,g.guard,dt);
 if(!canteenActive(g))return;
 const s=canteenState(g),at=canteenPoint(g);
 for(const w of (g.workerState?.workers||[]).filter(w=>w.homeZone===g.zone&&w.mode==='cook')){
  if(w.job?.kind!=='cook'||!w.funded||w.teaRest||w.eatOrder||Math.hypot(w.x-at[0],w.y-at[1])>=24)continue;
  if(s.meals>=CANTEEN_CAPACITY||g.food<1)continue;
  w.job.ms=(w.job.ms||0)+Math.min(120,dt);
  if(w.job.ms>=3000){w.job.ms-=3000;g.food--;s.meals++;}
 }
}
export function serveMeal(g,w){
 const c=mealRecipient(g,w.job?.recipient);if(!c||!w.meal||!needsMeal(c))return false;
 restoreMeal(c);w.meal=false;canteenState(g).served++;return true;
}
export function canteenCookPose(g,c){
 if(c?.homeZone!==g.zone||c?.job?.kind!=='cook'||!c.arrived||!canteenActive(g))return null;
 return {point:[.61,.59],moving:false,distance:0,face:-1};
}
