import {ZONES} from './data.js';
export const BOSS_GUIDE_ZONES=Object.freeze(['th','asia','west']);
export const BOSS_GUIDE_GRANTS=Object.freeze({th:500,asia:800,west:1200});
const nextZone={th:'asia',asia:'west',west:'cyberhell'};
const blank=()=>({won:false,praised:false,welcomed:false,following:false,farewell:false,grantPaid:false,grantNotice:false,grantAmount:0,outfitGranted:false});
export function initializeBossGuides(g,saved){
  if(arguments.length<2)saved=g.bossGuides;
  const valid=saved?.version===1||saved?.version===2,state={version:2,zones:{}};
  for(const zone of BOSS_GUIDE_ZONES){
    const entry=blank(),old=valid?saved.zones?.[zone]:null;
    if(old){for(const key of Object.keys(entry))entry[key]=key==='grantAmount'?(Number.isSafeInteger(old[key])&&old[key]>=0?old[key]:0):old[key]===true;}
    else if(g.bossCleared?.[zone]){
      entry.won=true;entry.praised=true;
      // Old saves must not replay praise or re-escort already discovered lands.
      if(g.zoneTravel?.visited?.[nextZone[zone]]||g.zoneSave?.[nextZone[zone]]||g.zone===nextZone[zone])Object.assign(entry,{welcomed:true,farewell:true});
    }
    // Scene acknowledgments are independent persisted evidence. Recover a
    // partially saved guide record without replaying a scene that queueStory skips.
    if(g.storySeen?.[`boss-guide-${zone}-praise`])Object.assign(entry,{won:true,praised:true});
    if(g.storySeen?.[`boss-guide-${zone}-welcome`])Object.assign(entry,{won:true,welcomed:true,following:true});
    if(g.storySeen?.[`boss-guide-${zone}-farewell`])Object.assign(entry,{won:true,welcomed:true,farewell:true});
    if(entry.farewell){
      entry.following=false;
      // Farewells acknowledged before grants existed are already settled.
      // A new pending receipt survives reload, but old players get no retroactive money.
      if(!entry.grantPaid){entry.grantPaid=true;entry.grantNotice=false;}
      // Outfit rewards were introduced after the first guide release. Give an
      // already-earned outfit to old saves once, without replaying the money.
      const outfit=nextZone[zone];
      if(!entry.outfitGranted){
        g.outfitsOwned=[...new Set(['th',...(g.outfitsOwned||[]),outfit])];
        entry.outfitGranted=true;
      }
    }
    if(old?.combat)entry.combat={morale:Number.isFinite(old.combat.morale)?Math.max(0,Math.min(100,old.combat.morale)):100,
      helpRemainingMs:Number.isFinite(old.combat.helpRemainingMs)?Math.max(0,Math.min(120000,old.combat.helpRemainingMs)):0,
      recoverUntil:Number.isFinite(old.combat.recoverUntil)?Math.max(0,old.combat.recoverUntil):0};
    state.zones[zone]=entry;
  }
  g.bossGuides=state;
  if(!g.pendingReward)g.pendingReward=pendingBossGuideGrant(g);
  return state;
}
export function bossGuideState(g,zone=g.zone){
  if(!BOSS_GUIDE_ZONES.includes(zone))return null;
  if(!g.bossGuides||![1,2].includes(g.bossGuides.version))initializeBossGuides(g);
  return g.bossGuides.zones[zone] ||= blank();
}
export function recordBossGuideWin(g,battle){
  const zone=battle?.zone||g.zone;
  if(battle?.over!=='win'||!BOSS_GUIDE_ZONES.includes(zone)||!(battle.kind==='zoneBoss'||battle.kind==='zoneEvent'&&battle.eventKey==='thBorderBoss'))return false;
  const state=bossGuideState(g,zone);if(state.won)return false;
  state.won=true;g.queueStory?.(`boss-guide-${zone}-praise`);return true;
}
const justiceHolding=(g,zone)=>Object.values(g.bossJustice?.ledger||{}).some(entry=>entry.zone===zone&&entry.phase!=='released');
export function bossGuideWaiting(g,zone=g.zone){const s=bossGuideState(g,zone);return !!(s?.won&&!s.following&&!s.farewell&&!justiceHolding(g,zone));}
export function bossGuideFollowing(g,zone=g.zone){const s=bossGuideState(g,zone);return !!(s?.won&&s.following&&!s.farewell&&!justiceHolding(g,zone));}
/** A guest combatant belongs to the journey, never to the hireable office roster. */
export function bossGuideCombatant(g) {
  if(!bossGuideFollowing(g))return null;
  const state=bossGuideState(g),actor=state.combat ||= {morale:100,helpRemainingMs:0,recoverUntil:0};
  if(actor.recoverUntil&&Date.now()>=actor.recoverUntil){actor.recoverUntil=0;actor.morale=50;}
  return Object.assign(actor,{id:`guide:${g.zone}`,k:'guide',kind:'guide',guestGuide:true,homeZone:g.zone,
    name:ZONES.find(z=>z.k===g.zone)?.bossName || 'ผู้ตรวจการนำทาง',speed:9});
}
export function queueBossGuideStory(g,beat,zone=g.zone){
  const state=bossGuideState(g,zone);if(!state?.won||justiceHolding(g,zone))return false;
  if(beat==='welcome'&&(state.welcomed||state.farewell)||beat==='farewell'&&(!state.following||state.farewell))return false;
  if(!['welcome','farewell'].includes(beat))return false;
  g.queueStory?.(`boss-guide-${zone}-${beat}`);return true;
}
export function completeBossGuideStory(g,key){
  const match=/^boss-guide-(th|asia|west)-(praise|welcome|farewell)$/.exec(key||'');if(!match)return false;
  const state=bossGuideState(g,match[1]);if(state.farewell&&match[2]!=='praise')return false;state.won=true;
  if(match[2]==='praise')state.praised=true;
  if(match[2]==='welcome')Object.assign(state,{welcomed:true,following:true});
  if(match[2]==='farewell'){
    Object.assign(state,{farewell:true,following:false});
    const outfit=nextZone[match[1]];
    if(!state.outfitGranted){
      g.outfitsOwned=[...new Set(['th',...(g.outfitsOwned||[]),outfit])];
      state.outfitGranted=true;
    }
    if(!state.grantPaid){
      const amount=BOSS_GUIDE_GRANTS[match[1]],name=ZONES.find(z=>z.k===match[1]).bossName;
      Object.assign(state,{grantPaid:true,grantNotice:true,grantAmount:amount});
      g.coin=(Number.isFinite(g.coin)?g.coin:0)+amount;
      g.log?.(`💰 ${name} มอบเงิน ${amount} เบี้ยกรรม ให้ดูแลดินแดนใหม่`,'good');
      if(!g.pendingReward)g.pendingReward=pendingBossGuideGrant(g);
    }
  }
  return true;
}
export function bossGuideStory(key){
  const match=/^boss-guide-(th|asia|west)-(praise|welcome|farewell)$/.exec(key||'');if(!match)return null;
  const [,zone,beat]=match,name=ZONES.find(z=>z.k===zone).bossName;
  const line=beat==='praise'?'มีฝีมือเก่งมาก เจ้าน่าจะดูแลโซนนี้ได้':beat==='welcome'?'ข้ายอมรับฝีมือเจ้าแล้ว ดินแดนข้างหน้ายังรอเจ้าอยู่ มาเถอะ ข้าจะเดินไปส่งเจ้ากับนิราถึงประตูดินแดนใหม่':'พามาส่งถึงที่แล้ว ที่เหลือฝากดินแดนนี้ด้วย';
  const image=`img/boss-guide/${zone}-${beat==='farewell'?'farewell':'welcome'}-v${beat==='farewell'&&zone!=='th'?2:1}.webp`;
  const pages=[{title:name,line:`${name}: “${line}”`,image}];
  if(beat==='farewell')pages.push({title:'ของฝากสำหรับดินแดนใหม่',line:`${name}มอบเงิน ${BOSS_GUIDE_GRANTS[zone]} เบี้ยกรรม และชุดประจำดินแดนใหม่ให้ยามา`,image:`img/boss-guide/${zone}-gift-v1.webp`});
  return {title:beat==='praise'?'ผู้ตรวจการยอมรับฝีมือ':beat==='welcome'?'ออกเดินทางสู่ดินแดนใหม่':'คำฝากฝังหน้าประตู',pages};
}
/** Follow recorded player footsteps rather than cutting across scenery. */
export function bossGuideFollowPoint(history,hero,distance=.055){
  let left=distance,at=hero;
  for(let i=history.length-1;i>=0;i--){const p=history[i],d=Math.hypot(at[0]-p[0],at[1]-p[1]);if(d>=left&&d)return [at[0]+(p[0]-at[0])*left/d,at[1]+(p[1]-at[1])*left/d];left-=d;at=p;}
  return at;
}

/** Receipt only: the money was granted atomically when farewell was acknowledged. */
export function pendingBossGuideGrant(g){
  for(const zone of BOSS_GUIDE_ZONES){
    const state=bossGuideState(g,zone);if(!state?.grantPaid||!state.grantNotice||state.grantAmount<=0)continue;
    const name=ZONES.find(z=>z.k===zone).bossName;
    return {guideZone:zone,title:'ทุนและชุดสำหรับดินแดนใหม่',who:`${name} มอบเงินและชุดประจำดินแดนใหม่`,description:`ได้รับ ${state.grantAmount} เบี้ยกรรมและชุดประจำดินแดนใหม่แล้ว`,coin:state.grantAmount,outfit:nextZone[zone],exp:0,items:[],abilities:[],weapons:[]};
  }
  return null;
}
export function acknowledgeBossGuideGrant(g,zone){
  const state=bossGuideState(g,zone);if(!state?.grantNotice)return false;
  state.grantNotice=false;return true;
}
