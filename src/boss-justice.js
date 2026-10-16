/** Captured bosses have a separate docket: ordinary spirit queues and rewards are untouched. */
import { STATIONS, SPOTS, FRONTIER, CREW, ZONE_EVENTS, isFrontierBreachEvent } from './data.js';
import { findPath, nearestWalk } from './walk.js?v=k1d';
import { pointAtDistance, pathLength } from './escort.js';
export const JUSTICE_PHASES = ['capture','dais','trial','escort','punishment','sentenceScene','return','released'];
export function initializeBossJustice(g, saved = g.bossJustice) {
  const state = saved?.version === 1 ? structuredClone(saved) : {version:1, active:null, ledger:{}};
  state.ledger ||= {};
  if (!state.ledger[state.active] || !JUSTICE_PHASES.includes(state.ledger[state.active].phase)) state.active=null;
  g.bossJustice=state;
  return state;
}
export function bossJusticeCase(g) { return g.bossJustice?.ledger?.[g.bossJustice.active] || null; }
export function bossJusticeActive(g) { const c=bossJusticeCase(g);return !!c && c.phase!=='released'; }
export function bossJusticePending(g,zone) { return Object.values(g.bossJustice?.ledger||{}).some(c=>c.zone===zone&&c.phase!=='released'); }
export function queueBossJustice(g,b,{final=false}={}) {
  const zone=b.zone||g.zone, challenge=b.kind==='zoneEvent'&&b.challenge&&(ZONE_EVENTS[zone]||[]).some(ev=>ev.k===b.eventKey&&ev.challenge),
    frontier=b.kind==='frontierBreach'||b.kind==='zoneEvent'&&isFrontierBreachEvent(zone,b.eventKey)||challenge;
  if(b.over!=='win'||(!final&&b.kind!=='zoneBoss'&&b.eventKey!=='thBorderBoss'&&!frontier))return false;
  const state=g.bossJustice||initializeBossJustice(g), base=final?'final:cyberhell':`${zone}:${b.eventKey==='thBorderBoss'?'frontier':b.kind==='zoneBoss'?'ruler':b.eventKey||'frontierBreach'}`;
  if(state.active || b.justiceDocket || final&&state.ledger[base])return false;
  let id=base,attempt=1;while(state.ledger[id])id=`${base}:${++attempt}`;
  b.justiceDocket=id;
  const boss=b.foes?.find(f=>f.boss)||b.foes?.find(f=>String(f.sp).includes('boss-frontier'));
  if(!bossJusticeStations(g).length){
    const def=STATIONS.find(d=>d.k==='krata'&&!g.stations.some(st=>st.def.k===d.k))||STATIONS.find(d=>!d.heaven&&!['tea','sala','krajok','tarang'].includes(d.k)&&!g.stations.some(st=>st.def.k===d.k));
    if(def)g.stations.push({def,slots:[],crewK:null,intensity:3,build:0,repair:0,fire:0,bossCourtTemporary:true});
    else {
      const held=g.stations.find(st=>!st.def.heaven&&!['tea','sala','krajok','tarang'].includes(st.def.k));
      if(held){held.bossCourtConstruction={build:held.build,buildWait:held.buildWait};held.build=0;held.buildWait=false;}
    }
  }
  const throne=SPOTS.throne;
  const c={id, frontierBoss:!!frontier, zone:b.zone||g.zone, name:boss?.who||boss?.name||b.who, art:boss?.sp||b.sp||'zone-boss', final, phase:final?'capture':'dais', elapsed:0,
    asked:false, mirror:false, pick:{station:null,crew:null,intensity:null},
    dais:[throne.x,throne.y+55], suspendedRoute:g.zoneTravel?.active?structuredClone(g.zoneTravel.active):null};
  state.ledger[id]=c;state.active=id;
  if(g.zoneTravel)g.zoneTravel.active=null;
  Object.assign(g.player,{x:throne.x-45,y:throne.y+20,path:null,tx:null,ty:null});
  g.huntMob=false;g.bossPending=false;
  return true;
}
export function bossJusticeCrew(g) { const owned=(g.crew||[]).filter(c=>!c.reader&&!c.self&&c.k!=='nira');return owned.length?owned:[{...CREW.find(c=>c.k==='taan'),name:'ผู้คุมศาล · ทัณฑ์ (รับหมายชั่วคราว)'}]; }
export function bossJusticeStations(g) {
  // Court temporarily requisitions an existing chamber, including its busy keeper.
  return (g.stations||[]).filter(s=>!s.build&&!s.def.heaven&&!['tea','sala','krajok','tarang'].includes(s.def.k));
}
export function bossJusticeAnswer(g) {
  const dest=bossJusticeStations(g), crew=bossJusticeCrew(g);
  return {station:(dest.find(s=>s.def.k==='krata')||dest[0])?.def.k,
    crew:(crew.find(c=>c.k==='taan')||crew[0])?.k,intensity:5};
}
export function interrogateBoss(g) {
  const c=bossJusticeCase(g);if(!c||!['dais','trial'].includes(c.phase))return false;
  c.phase='trial';c.asked=true;return true;
}
export function mirrorBoss(g) {
  const c=bossJusticeCase(g);if(!c||c.phase!=='trial'||!c.asked)return false;
  // Final boss mirror is court evidence; inventory exhaustion cannot block the ending.
  c.mirror=true;c.answer=bossJusticeAnswer(g);return true;
}
export function sentenceBoss(g,pick) {
  const c=bossJusticeCase(g);if(!c||c.phase!=='trial'||!c.asked)return false;
  const st=bossJusticeStations(g).find(s=>s.def.k===pick.station),crew=bossJusticeCrew(g).find(a=>a.k===pick.crew);
  if(!st||!crew||!Number.isInteger(pick.intensity)||pick.intensity<1||pick.intensity>5)return false;
  const a=bossJusticeAnswer(g);
  if(c.final&&(!c.mirror||pick.station!==a.station||pick.crew!==a.crew||pick.intensity!==5))return false;
  c.pick={...pick};c.phase='escort';c.elapsed=0;
  c.destination=[st.def.x,st.def.y];
  const end=nearestWalk(...c.destination)||c.destination;
  c.path=findPath(...c.dais,...end)||[c.dais,end];
  c.escortDuration=Math.max(3000,pathLength(c.path)/.14);
  c.punishmentDuration=3000+pick.intensity*1000;
  g.log(`⚖️ ออกหมาย ${c.name} → ${st.def.name} · ผู้คุม ${crew.name} · ความแรง ${pick.intensity}`,'event');
  return true;
}
export function advanceBossJustice(g,dt) {
  const c=bossJusticeCase(g);if(!c||!['escort','punishment','return'].includes(c.phase)||g.paused||g.battle)return false;
  c.elapsed+=Math.max(0,Math.min(100,dt));
  if(c.phase==='escort'&&c.elapsed>=c.escortDuration){c.phase='punishment';c.elapsed=0;}
  else if(c.phase==='punishment'&&c.elapsed>=c.punishmentDuration){
    c.phase=c.final?'sentenceScene':'return';c.elapsed=0;
    const start=c.path.at(-1),end=nearestWalk(FRONTIER.x,FRONTIER.y)||[FRONTIER.x,FRONTIER.y];
    c.returnPath=findPath(...start,...end)||[start,end];c.returnDuration=Math.max(3000,pathLength(c.returnPath)/.16);
  } else if(c.phase==='return'&&c.elapsed>=c.returnDuration)releaseBoss(g);
  else return true;
  g.save();g.onChange();return true;
}
export function releaseBoss(g) {
  const c=bossJusticeCase(g);if(!c||!['return','sentenceScene'].includes(c.phase))return false;
  c.phase='released';c.elapsed=0;g.bossJustice.active=null;
  g.stations=g.stations.filter(st=>!st.bossCourtTemporary);
  for(const st of g.stations)if(st.bossCourtConstruction){Object.assign(st,st.bossCourtConstruction);delete st.bossCourtConstruction;}
  // City return is intentional. The saved route remains on the docket for the next expedition.
  if(c.final){
    g.finalEvent.phase='completed';g.gameCompleted=true;
    g.zoneEvents.cyberhell.cyberFinal='cleared';g.bossCleared.cyberhell=true;g.bossGuarding.cyberhell=false;
    g.queueStory('ending');
    g.over={k:'finalWin',title:'ยมบาทน้อยพิชิตนรกทั้งสี่สาขา',text:'บอสโซน 4 รับคำตัดสินแล้ว ทั้งสี่โซนกลับคืนสู่ความสงบ'};
  } else g.log(`✓ ${c.name} รับทัณฑ์ครบแล้ว ผู้คุมปล่อยกลับไปประจำชายแดน`,'good');
  return true;
}
export function completeBossJusticeStory(g,key) {
  const c=bossJusticeCase(g);
  if(c?.final&&key==='ending-capture')c.phase='dais';
}
export function bossJusticeActors(g) {
  const c=bossJusticeCase(g);if(!c||c.zone!==g.zone||['capture','released'].includes(c.phase))return [];
  let p=c.dais,moving=false;
  if(c.phase==='escort'){p=pointAtDistance(c.path,pathLength(c.path)*Math.min(1,c.elapsed/c.escortDuration));moving=true;}
  if(['punishment','sentenceScene'].includes(c.phase))p=c.path.at(-1);
  if(c.phase==='return'){p=pointAtDistance(c.returnPath,pathLength(c.returnPath)*Math.min(1,c.elapsed/c.returnDuration));moving=true;}
  const actors=[{id:'justice-boss',x:p[0],y:p[1],art:c.art,sourceZone:c.zone,name:`${c.name} · ถูกพันธนาการ`,bound:true,moving}];
  if(c.pick.crew)actors.push({id:'justice-keeper',x:p[0]+38,y:p[1]-15,art:`crew-${c.pick.crew}`,name:g.crewOf(c.pick.crew)?.name||'ผู้คุม',moving,sourceZone:c.zone});
  if(['dais','trial'].includes(c.phase))actors.push({id:'justice-nira',x:c.dais[0]+75,y:c.dais[1]-20,art:'crew-nira',name:'นิรา · บันทึกคำตัดสิน',sourceZone:c.zone});
  return actors;
}
