import { BOSS_SKILLS } from './boss-skills-data.js';   // BOSS-SKILLS set A: the hypnotised border lords use the same moves as at their own border
// SIG victims return to their posts; these keys deliberately are NOT frontier-justice events.
export const SIGNAL_KEYS = { cyberhell:'cyberSignal', th:'signalTh', asia:'signalAsia', west:'signalWest' };
export const signalStory = (key, phase) => key === 'cyberSignal' ? `cyber-signal-${phase}` : `signal-${{signalTh:'th',signalAsia:'asia',signalWest:'west'}[key]}-${phase}`;
// party-size curve of the hypnotised lord (team of 3 / 5 / 7): fitted by scripts/solve-boss-skills.mjs (first try, team of 3, ~67 %; the real teams of the zone about the same)
const SIGNAL_SCALE = { th:{ hp:[1,1,1], atk:[1,1,1] }, asia:{ hp:[1,2.29,2.5], atk:[1,1.3,1.3] }, west:{ hp:[1,1,2.87], atk:[1,1.3,1.5] }, cyberhell:{ hp:[1,1,2.06], atk:[1,1.3,1.5] } };
const SIGNAL_SKILLS = { th:'tanthasura', asia:'akura', west:'valdric', cyberhell:'trojan9' };
// F3 (15 Nov): boss atk x0.66-0.85 (was 32-49 / 25-39 / 15-24 / 30-46): the enemy side now acts as often as the team (battle-turns.js); fitted back to the same first-try win %
const configs = [
  ['cyberhell','โทรจัน-9',340,[23,36],11,150,{holyWater:2},0],   // BOSS-SKILLS set A: boss hp / atk were 170 / 18-28, 140 / 13-20, 175 / 13-20, 190 / 14-21 (all won 100 %)
  ['th','ทัณฑสูร',210,[16,26],0,120,{bladeShard:2,lotus:1},8],
  ['asia','อากุระ',263,[12,19],6,140,{health:2},8],
  ['west','วาลดริก',285,[25,39],10,160,{holyWater:1,lotus:1},8],
];
export const SIGNAL_EVENTS = Object.fromEntries(configs.map(([zone,name,hp,atk,kind,coin,items,order]) => [zone,{
  k:SIGNAL_KEYS[zone], signal:true, atCases:zone==='cyberhell'?7:0,
  ...(zone==='cyberhell'?{requires:['cyberBreach']}:{requiresZone:{cyberhell:['cyberSignal']}}),
  mode:'waves',team:'frontier',title:{th:`สัญญาณครอบงำ · ${name}`},
  alert:{th:`${name} ถูกคำสั่งจากระบบครอบงำ ไปที่ชายแดนเพื่อช่วยเขา`},
  waves:[[{kind,count:2,hp:50,atk:[8,12]}],[{name,sp:`boss-frontier-${zone}${zone==='cyberhell'?'':'-signal'}`,boss:true,hp,atk,hypno:true,skills:BOSS_SKILLS[SIGNAL_SKILLS[zone]],partyScale:SIGNAL_SCALE[zone]},
    ...(zone==='asia'?[{kind:7,count:1,hp:50,atk:[8,12]}]:[])]],
  reward:{coin,items,order,exp:20},lose:{hp:8},
}]));
export const SIGNAL_CLOSE = {k:'signalClose',signal:true,atCases:0,mode:'story',
  requires:['cyberSignal'],requiresZone:{th:['signalTh'],asia:['signalAsia'],west:['signalWest']},
  title:{th:'ปลายสายของสัญญาณ'},alert:{th:'กลับมาปิดประตูหลังจากข้างใน'},reward:{items:{spareHeart:1},exp:30}};
export const signalReady = g => g.zoneEvents?.cyberhell?.signalClose === 'cleared';
export function signalRequirements(g,ev,zone=g.zone) {
  return (ev.requires || []).every(key=>g.zoneEvents?.[zone]?.[key]==='cleared') &&
    Object.entries(ev.requiresZone || {}).every(([zone,keys]) =>
    (Array.isArray(keys)?keys:[keys]).every(key=>g.zoneEvents?.[zone]?.[key]==='cleared'));
}
export function refreshSignalClose(g) {
  if(g.zone!=='cyberhell'||g.battle||g.over||g.zoneEvents?.cyberhell?.signalClose!=='pending')return;
  g.queueStory('cyber-signal-close');
}
export function finishSignalStory(g,key) {
  if(key!=='cyber-signal-close'||g.zone!=='cyberhell'||g.zoneEvents?.cyberhell?.signalClose!=='pending'||!signalRequirements(g,SIGNAL_CLOSE))return false;
  g.zoneEvents.cyberhell.signalClose='cleared';
  g.inventory.spareHeart=(g.inventory.spareHeart||0)+1;g.gainExp(30,'ปิดสัญญาณ');
  g.refreshZoneEvents('cyberhell');g.save();return true;
}
export function migrateSignal(g,saved) {
  const final=g.zoneEvents.cyberhell ||= {};
  if(g.gameCompleted && g.finalEvent){g.finalEvent.phase='completed';g.finalEvent.activeEncounter=null;final.cyberFinal='cleared';}
  // Preserve a finale already fought in an older build, without retroactively paying SIG rewards.
  const underway=saved.finalBattle?.eventKey==='cyberFinal' || saved.battle?.eventKey==='cyberFinal' ||
    saved.finalEvent?.minionsCleared>0 || saved.finalEvent?.rulersCleared?.length>0 ||
    Object.values(saved.bossJustice?.ledger||{}).some(docket=>docket.final) ||
    saved.gameCompleted || final.cyberFinal==='cleared';
  if(!saved.e1Version && underway) {
    for(const [zone,key] of Object.entries(SIGNAL_KEYS))(g.zoneEvents[zone] ||= {})[key]='cleared';
    final.signalClose='cleared';
    if(g.finalEvent?.phase==='locked')g.finalEvent.phase='ready';
  } else if(!signalReady(g) && !underway) {
    delete final.cyberFinal;
    if(g.finalEvent){g.finalEvent.phase='locked';g.finalEvent.presentation=null;}
    // A pending legacy finale has not been fought; remove only its unacknowledged introduction.
    g.storyQueue=g.storyQueue.filter(s=>s.key!=='cyber-approach');
    delete g.storySeen['cyber-approach'];
  }
  // Non-final event encounters aren't serialized: retry the same choice after reload.
  for(const [zone,key] of Object.entries(SIGNAL_KEYS))if(g.zoneEvents[zone]?.[key]==='active')g.zoneEvents[zone][key]='pending';
}
