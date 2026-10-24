import {SPOTS} from './data.js';
import {TOWN_HOUSE_SITES} from './town-layout.js?v=k1d';
import {isTownZone} from './zone-skin.js';
import {nearestWalk} from './walk.js?v=k1d';
import {actorStanding} from './actor-recovery.js';
export const canteenActive=g=>!!(g.zoneEvents?.th?.frontierBreach==='cleared'||g.bossCleared?.th||(g.workerState?.workers||[]).length);
export function canteenSite(g){return isTownZone(g.zone)?{...TOWN_HOUSE_SITES[2],w:150}:{x:SPOTS.bench.x+130,y:SPOTS.bench.y+80,w:140};}
export function canteenPoint(g){const s=canteenSite(g);return nearestWalk(s.x,s.y+38)||[s.x,s.y+38];}
export function canteenState(g){g.canteenState||={};return g.canteenState[g.zone]||= {meals:0,cookedMs:0,served:0};}
export function mealRecipients(g){return [...g.crew.filter(c=>!c.reader&&!c.self),g.guard,...(g.workerState?.workers||[]).filter(w=>w.homeZone===g.zone)].filter(Boolean);}
export const needsMeal=c=>!c.supplyRest&&(c.stamina!=null?((c.hunger??100)<80||c.stamina<65||(c.morale??100)<55):actorStanding(c)&&((c.hunger??100)<80||(c.morale??100)<55||(c.hp!=null&&c.hp<c.hpMax*.8)));
export const mealRecipient=(g,id)=>mealRecipients(g).find(c=>c.id===id);
export function prepareCooks(g){
 const staff=g.crew.filter(c=>['dam','plerng'].includes(c.k));if(!staff.length)return;
 const active=canteenActive(g),at=active?canteenPoint(g):[0,0];
 for(const c of staff){
  c.cook=active&&actorStanding(c)&&!c.at&&!c.escort&&!c.buildK&&!c.teaRest;
  if(c.cook){c.cookX=at[0]+(c.k==='dam'?-22:22);c.cookY=at[1];}
 }
}
export function stepCanteen(g,dt){
 if(!g.crew.some(c=>c.cook)||!canteenActive(g)||g.paused||g.over||g.battle||!Number.isFinite(dt)||dt<=0)return;
 const s=canteenState(g),at=canteenPoint(g),cooks=g.crew.filter(c=>c.cook&&actorStanding(c)&&Math.hypot((c.x??c.hx)-at[0],(c.y??c.hy)-at[1])<65);
 if(!cooks.length)return;
 s.cookedMs=Math.min(3000,(s.cookedMs||0)+Math.min(120,dt)*cooks.length);
 if(s.cookedMs>=3000){s.cookedMs=0;s.meals=Math.min(6,(s.meals||0)+1);g.food=Math.min(Math.max(100,g.food||0),(g.food||0)+2);}
}
export function serveMeal(g,w){
 const c=mealRecipient(g,w.job?.recipient);if(!c||!w.meal)return false;
 if(c.stamina!=null){c.stamina=Math.min(100,c.stamina+35);c.morale=Math.min(100,(c.morale??100)+35);c.hunger=Math.min(100,(c.hunger??100)+40);}
 else {c.hunger=Math.min(100,(c.hunger??100)+40);c.morale=Math.min(100,(c.morale??100)+20);if(c.hp!=null&&c.hpMax)c.hp=Math.min(c.hpMax,c.hp+Math.ceil(c.hpMax*.2));}
 w.meal=false;canteenState(g).served++;return true;
}
const pictures=new Map();
export function drawCanteen(ctx,g,t){
 if(!canteenActive(g))return;
 const s=canteenSite(g),url='img/workers/canteen-v1.webp';let im=pictures.get(url);
 if(!im&&typeof Image!=='undefined'){im=new Image();im.src=url;pictures.set(url,im);}
 if(im?.complete&&im.naturalWidth){const h=s.w*im.naturalHeight/im.naturalWidth;ctx.drawImage(im,s.x-s.w/2,s.y-h,s.w,h);}
}
