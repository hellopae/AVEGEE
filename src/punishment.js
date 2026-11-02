import {actorStanding} from './actor-recovery.js';
import {MOB} from './data.js';
export const PUNISHMENT_LEVELS = Object.freeze([
 null,
 Object.freeze({name:'ว่ากล่าว',seconds:10,color:'#69caff'}),
 Object.freeze({name:'เบา',seconds:30,color:'#69d990'}),
 Object.freeze({name:'ปานกลาง',seconds:60,color:'#ffe16a'}),
 Object.freeze({name:'หนัก',seconds:120,color:'#ff9b50'}),
 Object.freeze({name:'มหันต์',seconds:240,color:'#ff626a'}),
]);
export const punishmentLevel = n => PUNISHMENT_LEVELS[Math.max(1,Math.min(5,Math.round(Number(n)||3)))];
export const punishmentTimeLabel = n => {const s=punishmentLevel(n).seconds;return s<60?`${s} วินาที`:`${s/60} นาที`;};
export function normalizePunishment(slot) {
 slot.intensity=Math.max(1,Math.min(5,Math.round(Number(slot.intensity)||3)));
 const duration=punishmentLevel(slot.intensity).seconds*1000;
 if(slot.sentenceClock!==1){
  const ratio=Number.isFinite(slot.progress)&&Number.isFinite(slot.need)&&slot.need>0?Math.max(0,Math.min(1,slot.progress/slot.need)):0;
  slot.elapsedMs=ratio*duration;slot.sentenceClock=1;
 }
 slot.durationMs=duration;
 slot.elapsedMs=Math.max(0,Math.min(duration,Math.max(Number(slot.elapsedMs)||0,slot.sentenceClock===1&&slot.need===duration?Number(slot.progress)||0:0)));
 slot.need=duration;slot.progress=slot.elapsedMs;return slot;
}
export const punishmentRemaining = slot => Math.max(0,Math.ceil((punishmentLevel(slot.intensity).seconds*1000-(slot.elapsedMs??0))/1000));
export function advancePunishments(g,dt) {
 if(!Number.isFinite(dt)||dt<=0||g.paused||g.over||g.mapTravel)return;
 const now=Date.now();
 for(const st of g.stations){
  if(st.def.heaven||st.build||st.repair||st.fire>=MOB.burnMax||!st.slots.length)continue;
  const c=g.crewOf(st.crewK);if(!actorStanding(c)||!c.self&&c.escort)continue;
  if(c.self&&Math.hypot((st.def.sx??st.def.x)-g.player.x,(st.def.sy??st.def.y)-g.player.y)>140)continue;
  for(const slot of [...st.slots]){
   normalizePunishment(slot);
   if(slot.pendingUntil&&now<slot.pendingUntil)continue;
   if(g.afterlifeWalks?.some(w=>w.destination==='station'&&w.soul.id===slot.soul.id))continue;
   slot.elapsedMs=Math.min(slot.durationMs,slot.elapsedMs+dt);slot.progress=slot.elapsedMs;
   if(slot.elapsedMs>=slot.durationMs)g.finish(st,slot);
  }
 }
}
