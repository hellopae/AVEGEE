import {SPOTS} from './data.js';
import {nearestWalk} from './walk.js?v=k1d';
import {actorStanding} from './actor-recovery.js';
// FOOD-A: only a completed, usable station opens the kitchen.
export const canteenActive=g=>!!g.stations?.some(s=>s.def.k==='canteen'&&!s.build&&!s.repair&&!s.fire);
export function canteenSite(g){const d=SPOTS;const st=g.stations?.find(s=>s.def.k==='canteen');return st?{x:st.def.bx,y:st.def.by,w:st.def.bw}:{x:d.bench.x+130,y:d.bench.y+80,w:140};}
export function canteenPoint(g){const s=g.stations?.find(s=>s.def.k==='canteen')?.def;return s?(nearestWalk(s.x,s.y)||[s.x,s.y]):nearestWalk(SPOTS.bench.x,SPOTS.bench.y);}
export function canteenState(g){g.canteenState||={};return g.canteenState[g.zone]||= {meals:0,served:0,orders:[]};}
export function mealRecipients(g){return [...g.crew.filter(c=>!c.reader&&!c.self),g.guard,...(g.workerState?.workers||[]).filter(w=>w.homeZone===g.zone)].filter(Boolean);}
export const needsMeal=c=>!c.supplyRest&&(c.stamina!=null?((c.hunger??100)<80||c.stamina<65||(c.morale??100)<55):actorStanding(c)&&((c.hunger??100)<80||(c.morale??100)<55||(c.hp!=null&&c.hp<c.hpMax*.8)));
export const mealRecipient=(g,id)=>mealRecipients(g).find(c=>c.id===id);
export const cookBusy=(g,c)=>!c||!actorStanding(c)||c.escort||c.buildK||c.teaRest||g.stations.some(s=>s.crewK===c.k&&s.slots?.length)||g.afterlifeWalks?.some(w=>w.escort?.k===c.k);
export function orderRice(g,key,quantity){
 const n=Number(quantity),c=g.crew.find(c=>c.k===key),s=canteenState(g);
 if(!canteenActive(g)||!['dam','plerng'].includes(key)||cookBusy(g,c)||!Number.isInteger(n)||n<1||n>6||s.meals+s.orders.reduce((a,o)=>a+o.remaining,0)+n>6||s.orders.some(o=>o.cook===key)||g.coin<n*2||g.over||g.battle)return false;
 g.coin-=n*2;s.orders.push({cook:key,remaining:n,ms:0,phase:'accepted'});g.save();return true;
}
export function cancelRice(g,key){
 const s=canteenState(g),i=s.orders.findIndex(o=>o.cook===key);if(i<0)return false;
 g.coin+=s.orders[i].remaining*2;s.orders.splice(i,1);prepareCooks(g);g.save();return true;
}
export function prepareCooks(g){
 const s=canteenState(g),head=s.orders[0],at=canteenPoint(g);
 for(const c of g.crew.filter(c=>['dam','plerng'].includes(c.k))){
  const was=c.cook;c.cook=!!(canteenActive(g)&&head?.cook===c.k&&!cookBusy(g,c));
  if(c.cook){c.cookX=at[0];c.cookY=at[1];if(!was){c.path=null;c.wait=0;}}
  else if(was){c.path=null;c.wait=0;}
 }
}
export function stepCanteen(g,dt){
 if(!canteenActive(g)||g.paused||g.over||g.battle||!Number.isFinite(dt)||dt<=0)return;
 const s=canteenState(g),o=s.orders[0];if(!o)return;
 const c=g.crew.find(c=>c.k===o.cook);if(cookBusy(g,c))return;
 o.phase='walking';const at=canteenPoint(g);if(!c.cook||Math.hypot((c.x??c.hx)-at[0],(c.y??c.hy)-at[1])>35)return;
 o.phase='cooking';o.ms+=Math.min(120,dt);
 if(o.ms>=3000){o.ms-=3000;o.remaining--;s.meals++;if(!o.remaining){s.orders.shift();prepareCooks(g);}g.save();}
}
export function serveMeal(g,w){
 const c=mealRecipient(g,w.job?.recipient);if(!c||!w.meal)return false;
 if(c.stamina!=null){c.stamina=Math.min(100,c.stamina+35);c.morale=Math.min(100,(c.morale??100)+35);c.hunger=Math.min(100,(c.hunger??100)+40);}
 else {c.hunger=Math.min(100,(c.hunger??100)+40);c.morale=Math.min(100,(c.morale??100)+20);if(c.hp!=null&&c.hpMax)c.hp=Math.min(c.hpMax,c.hp+Math.ceil(c.hpMax*.2));}
 w.meal=false;canteenState(g).served++;return true;
}
