import {SPOTS} from './data.js';
import {nearestWalk,findPath,stepTo} from './walk.js?v=k1d';
import {actorStanding} from './actor-recovery.js';
export const CANTEEN_CAPACITY=6;
/** FB3-MP10 (owner map13): the kitchen feeds itself. A cook on duty at an active canteen MAKES rice balls into the shared pantry (g.food) on his own - no trip to the merchant.
 *  Every number of the kitchen is here (T11 simulates them): one batch takes `cookMs`, gives `batch` rice balls and costs `coinPerBatch` coins of ingredients (the merchant sells 1 ball for 1 coin, so a cook
 *  is a little cheaper and automatic; the merchant is still there to hurry things up), he stops while the pantry holds `pantryCap` or more (no hoarding) and while the purse cannot pay a batch.
 *  `mealMs` / CANTEEN_CAPACITY (the ready-to-serve shelf) are the old numbers.  `inside` = where Dam / idle workers stand INSIDE the stall (owner MN5), in world units for a 118-wide stall, scaled by its width. */
export const KITCHEN=Object.freeze({cookMs:6000,batch:4,coinPerBatch:3,pantryCap:40,mealMs:3000,
  inside:Object.freeze([[-34,4],[34,4],[0,18],[-56,16],[56,16],[0,-14]])});
/** 0..1 progress of the rice-ball batch a cook is making (the bar over his head); null = he is not cooking now */
export function cookProgress(g,w){
 if(!w||w.mode!=='cook'||w.job?.kind!=='cook'||!w.arrived||!canteenActive(g))return null;
 return Math.max(0,Math.min(1,(w.job.prep||0)/KITCHEN.cookMs));
}
export const canteenActive=g=>!!g.stations?.some(s=>s.def.k==='canteen'&&!s.build&&!s.repair&&!s.fire);
export const canteenBuilt=g=>!!g.stations?.some(s=>s.def.k==='canteen'&&!s.build);
export function canteenSite(g){const d=SPOTS;const st=g.stations?.find(s=>s.def.k==='canteen');return st?{x:st.def.bx,y:st.def.by,w:st.def.bw}:{x:d.bench.x+130,y:d.bench.y+80,w:140};}
/** the kitchen's own spot: just INSIDE the stall at its front (owner MN5; it was the door step 38 units further down) */
export function canteenPoint(g){const s=g.stations?.find(s=>s.def.k==='canteen')?.def;return s?(nearestWalk(s.bx,s.by+.1*(s.bw||118))||nearestWalk(s.x,s.y)||[s.x,s.y]):nearestWalk(SPOTS.bench.x,SPOTS.bench.y);}
/** the i-th standing place inside the stall (0 = the foreman); the first walkable one near the wanted offset */
export function kitchenSpot(g,i){
 const s=g.stations?.find(s=>s.def.k==='canteen')?.def;if(!s)return null;
 const [cx,cy]=canteenPoint(g)||[s.bx,s.by],k=(s.bw||118)/118,list=KITCHEN.inside;
 for(let n=0;n<list.length;n++){const [dx,dy]=list[((i+n)%list.length+list.length)%list.length],p=nearestWalk(cx+dx*k,cy+dy*k);if(p&&Math.hypot(p[0]-(cx+dx*k),p[1]-(cy+dy*k))<22*k)return p;}
 return [cx,cy];
}
export function canteenState(g){g.canteenState||={};return g.canteenState[g.zone]||= {meals:0,served:0,orders:[]};}
export function mealRecipients(g){return [...g.crew.filter(c=>!c.reader&&!c.self),g.guard,...(g.workerState?.workers||[]).filter(w=>w.homeZone===g.zone)].filter(Boolean);}
export const needsMeal=c=>!!c&&!c.teaRest&&!c.eatOrder&&!c.mealSeq&&(c.stamina!=null?((c.hunger??100)<80||c.stamina<65||(c.morale??100)<55):actorStanding(c)&&((c.hunger??100)<80||(c.morale??100)<55));
export const mealRecipient=(g,id)=>mealRecipients(g).find(c=>c.id===id);
// F22 (owner 15 Nov, m2.png): Nira (the reader) is left out of the auto-served / walk-to-the-canteen list (she stays beside the player), but the team page's
// "give a rice ball" button must feed her too - she shows a hunger bar like everyone else.  Hand feeding looks in this wider list.
export const feedRecipient=(g,id)=>mealRecipient(g,id)||g.crew?.find(c=>c.reader&&!c.self&&c.id===id);
const hungry=c=>!!c&&!c.mealSeq&&(c.stamina!=null||actorStanding(c))&&!c.teaRest&&((c.hunger??100)<100||(c.morale??100)<100||c.stamina<100||c.supplyRest);
export function restoreMeal(c){
 c.hunger=Math.min(100,(c.hunger??100)+40);c.morale=Math.min(100,(c.morale??100)+(c.stamina!=null?35:20));
 if(c.stamina!=null){c.stamina=Math.min(100,c.stamina+35);c.supplyRest=false;c.reason='';}
}
// Khun Pae 11 Nov: the give button uses the kitchen's ready meals first, and falls back to the central stock (merchant rice) when the kitchen is empty.
const fromKitchen=g=>canteenActive(g)&&canteenState(g).meals>=1;
export const foodAvailable=g=>fromKitchen(g)?canteenState(g).meals:(g.food||0);
export const canFeedActor=(g,id)=>!g.battle&&!g.over&&hungry(feedRecipient(g,id))&&foodAvailable(g)>=1;
export function takeFood(g,n=1){
 if(fromKitchen(g)&&canteenState(g).meals>=n){canteenState(g).meals-=n;canteenState(g).served+=n;return true;}
 if((g.food||0)>=n){g.food-=n;return true;}return false;
}
export function feedActor(g,id){
 if(!canFeedActor(g,id)||!takeFood(g,1))return false;
 restoreMeal(feedRecipient(g,id));return true;
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
 if(Math.hypot(c.x-x,c.y-y)<24){if(canteenState(g).meals>0&&isMealActor(c)&&takeFood(g,1)){c.eatOrder=null;beginMeal(g,c,{receive:false})||restoreMeal(c);}else if(canteenState(g).meals>0&&!isMealActor(c))feedActor(g,c.id)&&(c.eatOrder=null);return true;}
 order.retry=Math.max(0,(order.retry||0)-Math.min(dt,120));
 if(!order.path?.length&&!order.retry){order.path=findPath(c.x,c.y,x,y);order.retry=600;}
 const next=order.path?.[0];if(next){const dx=next[0]-c.x,dy=next[1]-c.y,d=Math.hypot(dx,dy);if(d<2)order.path.shift();else {const speed=Math.min(d,Math.min(dt,120)*.11);c.moving=stepTo(c,dx/d*speed,dy/d*speed);c.face=dx<0?-1:1;if(!c.moving)order.path=null;}}
 return true;
}
export function stepCanteen(g,dt){
 if(g.paused||g.over||g.battle||!Number.isFinite(dt)||dt<=0)return;
 for(const c of g.crew||[])advanceMeal(g,c,dt);   // T3/12: the receive / eat sequence of every reaper runs here (stepWorld skips a reaper who has one)
 if(g.guard&&!advanceMeal(g,g.guard,dt))advanceCanteenDiner(g,g.guard,dt);
 if(!canteenActive(g))return;
 const s=canteenState(g),at=canteenPoint(g);
 for(const w of (g.workerState?.workers||[]).filter(w=>w.homeZone===g.zone&&w.mode==='cook')){
  if(w.job?.kind!=='cook'||!w.funded||w.teaRest||w.eatOrder||Math.hypot(w.x-at[0],w.y-at[1])>=24)continue;
  const step=Math.min(120,dt);
  // the ready-to-serve shelf is filled from the pantry (the old rule: 1 ball every mealMs)
  if(s.meals<CANTEEN_CAPACITY&&g.food>=1){w.job.ms=(w.job.ms||0)+step;if(w.job.ms>=KITCHEN.mealMs){w.job.ms-=KITCHEN.mealMs;g.food--;s.meals++;}}
  // FB3-MP10: and the pantry itself is refilled by the cook (bar over his head = w.job.prep / cookMs)
  if((g.food||0)>=KITCHEN.pantryCap){w.job.prep=0;w.reason='';continue;}
  w.job.prep=Math.min(KITCHEN.cookMs,(w.job.prep||0)+step);
  if(w.job.prep>=KITCHEN.cookMs){
   if(g.coin>=KITCHEN.coinPerBatch){g.coin-=KITCHEN.coinPerBatch;g.food=Math.min(KITCHEN.pantryCap,(g.food||0)+KITCHEN.batch);w.job.prep=0;w.reason='';if(g.workerState?.ledger)g.workerState.ledger.cooked=(g.workerState.ledger.cooked||0)+KITCHEN.batch;}
   else w.reason='เบี้ยไม่พอซื้อวัตถุดิบ';
  }
 }
}
export function serveMeal(g,w){
 const c=mealRecipient(g,w.job?.recipient);if(!c||!w.meal||!needsMeal(c))return false;
 if(isMealActor(c)){if(!beginMeal(g,c,{from:[w.x,w.y]}))return false;w.meal=false;canteenState(g).served++;return true;}   // T3/12: crew / Guard stop, receive and eat (restoreMeal runs when he has eaten)
 restoreMeal(c);w.meal=false;canteenState(g).served++;return true;
}
export function canteenCookPose(g,c){
 if(c?.homeZone!==g.zone||c?.job?.kind!=='cook'||!c.arrived||!canteenActive(g))return null;
 return {point:[.51,.55],moving:false,distance:0,face:-1};   // T3/6 (F17, owner b3.png): the cook stands ~10 % of the room width further left (was [.61,.59])
}

// T3/12 (F1, owner 15 Nov: "ท่ารับข้าวปั้นจากดำ/คนงานแล้วหยิบกิน"): a reaper / the Guard who is handed a rice ball STOPS, takes it (receive), then eats it (eat) before the meal counts -
// the rice leaves the stock at the hand-over, the hunger / morale come back when he has eaten.  Placeholder look: the standing pose + a rice ball floating over him (scene.js) until Codex draws
// img/crew-<k>-receive-v1.webp / crew-<k>-eat-v1.webp (spec in Output/Toby/2026-11-19-avegee-t3.md).  Workers keep the instant hand-over (they are not in the owner's list).
export const MEAL_SEQ=Object.freeze({receiveMs:800,eatMs:1800});
export const isMealActor=c=>!!c&&c.stamina==null;   // crew + Guard (workers carry stamina)
/** start the receive -> eat sequence; `from` = where the deliverer stands (the receiver turns to him) ; receive:false = he fetched it himself at the canteen (eat only) */
export function beginMeal(g,c,{from=null,receive=true}={}){
 if(!isMealActor(c)||c.mealSeq||!actorStanding(c))return false;
 c.mealSeq={phase:receive?'receive':'eat',ms:0,from:from?[...from]:null};c.path=null;c.moving=false;
 if(from&&Number.isFinite(from[0])&&c.x!=null&&Math.abs(from[0]-c.x)>1)c.face=from[0]<c.x?-1:1;
 return true;
}
/** one frame of the sequence; true = the actor is busy with it (the caller must not move him) */
export function advanceMeal(g,c,dt){
 const m=c?.mealSeq;if(!m)return false;
 if(!actorStanding(c)){c.mealSeq=null;return false;}
 if(g.paused||g.over||g.battle||!Number.isFinite(dt)||dt<=0)return true;
 m.ms+=Math.min(dt,120);
 if(m.phase==='receive'&&m.ms>=MEAL_SEQ.receiveMs){m.phase='eat';m.ms=0;}
 else if(m.phase==='eat'&&m.ms>=MEAL_SEQ.eatMs){restoreMeal(c);c.mealSeq=null;return false;}
 return true;
}
/** a deliverer (Dam / a server) hands a rice ball to `r`: crew / Guard get the sequence (food leaves the stock now), workers are fed at once */
export function deliverMeal(g,r,from=null,{viaKitchen=false}={}){
 if(!isMealActor(r))return viaKitchen?false:feedActor(g,r.id);
 if(r.mealSeq||!needsMeal(r)||g.battle||g.over||!takeFood(g,1))return false;
 if(!beginMeal(g,r,{from}))restoreMeal(r);
 return true;
}
