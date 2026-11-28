import { BOSS_SKILLS } from './boss-skills-data.js';   // BOSS-SKILLS set A: the hypnotised border lords use the same moves as at their own border
import { Z4G_KEYS } from './seized-keys.js';   // T8c
// SIG victims return to their posts; these keys deliberately are NOT frontier-justice events.
export const SIGNAL_KEYS = { cyberhell:'cyberSignal', th:'signalTh', asia:'signalAsia', west:'signalWest' };
export const signalStory = (key, phase) => key === 'cyberSignal' ? `cyber-signal-${phase}` : `signal-${{signalTh:'th',signalAsia:'asia',signalWest:'west'}[key]}-${phase}`;
// party-size curve of the hypnotised lord (team of 3 / 5 / 7): fitted by scripts/solve-boss-skills.mjs (first try, team of 3, ~67 %; the real teams of the zone about the same)
const SIGNAL_SCALE = { th:{ hp:[1,1,1], atk:[1,1,1] }, asia:{ hp:[1,2.29,2.5], atk:[1,1.3,1.3] }, west:{ hp:[1,1,2.87], atk:[1,1.3,1.5] }, cyberhell:{ hp:[1,1,2.06], atk:[1,1.3,1.5] } };
const SIGNAL_SKILLS = { th:'tanthasura', asia:'akura', west:'valdric', cyberhell:'trojan9' };
const SIGNAL_NAMES_EN = { th:'Tanthasura', asia:'Akura', west:'Valdric', cyberhell:'Trojan-9' };
// F3 (15 Nov): boss atk x0.66-0.85 (was 32-49 / 25-39 / 15-24 / 30-46): the enemy side now acts as often as the team (battle-turns.js); fitted back to the same first-try win %
const configs = [
  ['cyberhell','โทรจัน-9',340,[23,36],11,150,{holyWater:2},0],   // BOSS-SKILLS set A: boss hp / atk were 170 / 18-28, 140 / 13-20, 175 / 13-20, 190 / 14-21 (all won 100 %)
  ['th','ทัณฑสูร',160,[12,20],0,120,{bladeShard:2,lotus:1},8],
  ['asia','อากุระ',226,[10,16],6,140,{health:2},8],
  ['west','วาลดริก',215,[18,29],10,160,{holyWater:1,lotus:1},8],
];
// T8c (Rae R2 D 7 / owner D6): the order of the way back is fixed - Trojan-9 (Zone 4, after the record hall of case 10), then Valdric (Zone 3), Akura (Zone 2), Tanthasura (Zone 1); a zone's lord can be reached only once the one above is freed
// (the frontier gate is shut with green light). Was: Trojan-9 at 7 cases right after his fight, the three others in any order.
const SIGNAL_CHAIN = { west:{ cyberhell:['cyberSignal'] }, asia:{ cyberhell:['cyberSignal'], west:['signalWest'] }, th:{ cyberhell:['cyberSignal'], asia:['signalAsia'] } };
const RETURN_REAPERS = ['taan','plerng','kan','boon','dam'];
const RETURN_REAPER_EN = {
  west:['Poena','Ognion','Sybil','Grace','Noir'],
  asia:['Goku','Homura','Satori','Megumi','Kuro'],
  th:['Taan','Pleng','Kan','Boon','Dam'],
};
export const RETURN_GUARD_NAMES = {
  west:{ th:'แวน เฮลซิง', en:'Van Helsing' },
  asia:{ th:'กวนอู', en:'Guan Yu' },
  th:{ th:'กุมภัณฑ์', en:'Kumphan' },
};
const GUARD_STATS = { west:[122,[10,15]], asia:[116,[9,14]], th:[110,[9,14]] };
// Cerberus uses his existing controlled-reaper encounter stats for the return gate.
const CONTROLLED_CERBERUS = {name:'เซอร์เบอรัส',nameEn:'Cerberus',sp:'boss-cerberus-gate-west',hp:85,atk:[12,18],hypno:true};
const CONTROLLED_JORMUNGANDR = {name:'ยอร์มุนกันดร์',nameEn:'Jörmungandr',sp:'boss-jormungandr-west',hp:330,atk:[19,30],boss:true,hypno:true,
  skills:BOSS_SKILLS.jormungandr,partyScale:{hp:[1,1.6,2.2],atk:[1,1.1,1.4]}};
// Lian Gang uses the base health, attack and skills from his original Eastern boss fight.
const CONTROLLED_LIAN_GANG = {name:'เหลียนกัง',nameEn:'Lian Gang',sp:'zone-boss',hp:294,atk:[16,25],boss:true,hypno:true,
  skills:BOSS_SKILLS.lianGang};
// Yomathat uses his original Thai Border Boss base values and moves.
const CONTROLLED_YOMATHAT = {name:'ยมทัต',nameEn:'Yomathat',sp:'zone-boss',hp:543,atk:[14,22],boss:true,hypno:true,
  skills:BOSS_SKILLS.yomathat};
const SIGNAL_PARTNERS = { west:CONTROLLED_JORMUNGANDR, asia:CONTROLLED_LIAN_GANG, th:CONTROLLED_YOMATHAT };
const SIGNAL_PAIR_TEXT = {
  asia:{ th:'เหลียนกังกับอากุระ', en:'Lian Gang and Akura', city:'บูรพา', cityEn:'Eastern' },
  th:{ th:'ยมทัตกับทัณฑสูร', en:'Yomathat and Tanthasura', city:'สุวรรณภูมิ', cityEn:'Suvarnabhumi' },
};
const gateFoes = (zone, guard) => zone === 'west' ? [CONTROLLED_CERBERUS, guard] : [guard];
export const RETURN_GUARD_EVENTS = Object.fromEntries(Object.entries(RETURN_GUARD_NAMES).map(([zone,name]) => {
  const [hp,atk]=GUARD_STATS[zone];
  return [zone,{k:Z4G_KEYS.guardEvent, atCases:0, mode:'single', noAlert:true, returnGuard:true,
    title:zone === 'west' ? {th:'ปลดสะกดเซอร์เบอรัสและแวน เฮลซิง',en:'Free Cerberus and Van Helsing'} : {th:`ปลดสะกด ${name.th}`,en:`Free ${name.en}`},
    alert:zone === 'west' ? {th:'เซอร์เบอรัสกับแวน เฮลซิงขวางประตูอยู่ ต้องชนะทั้งคู่ก่อนปลดสะกด',en:'Cerberus and Van Helsing are blocking the gate. Defeat both to break the spell.'}
      : {th:`ยามากับนิราต้องช่วย${name.th}ให้หลุดจากคำสั่งก่อนเข้าประตู`,en:'Yama and Nira must break the spell on the gate guard before entering.'},
    foes:gateFoes(zone,{name:name.th,nameEn:name.en,sp:'crew-guard',boss:false,hypno:true,hp,atk}),
    winStories:[Z4G_KEYS.guardFreed[zone],Z4G_KEYS.fire[zone]],reward:{exp:10}}];   // FB3-L3: Nira frees him (own scene) -> the fire scene
}));
export const SIGNAL_EVENTS = Object.fromEntries(configs.map(([zone,name,hp,atk,kind,coin,items,order]) => {
  const pair = SIGNAL_PAIR_TEXT[zone], partner = SIGNAL_PARTNERS[zone];
  return [zone,{
    k:SIGNAL_KEYS[zone], signal:true, atCases:zone==='cyberhell'?10:0,
    ...(zone==='cyberhell'?{requires:['cyberSala']}:{requiresZone:SIGNAL_CHAIN[zone], winStories:[Z4G_KEYS.restored[zone]], winNotices:[Z4G_KEYS.harbourNotice[zone]]}),
    mode:'waves',team:'frontier',
    title:pair ? { th:`สัญญาณครอบงำ · ${pair.th}`, en:`Seized by the Signal · ${pair.en}` }
      : { th:`สัญญาณครอบงำ · ${name}` },
    alert:pair ? { th:`ช่วยยมทูต${pair.city} แล้วหยุด${pair.th}ก่อนใช้สร้อยปลดสะกด`,
      en:`Free the ${pair.cityEn} reapers, then stop ${pair.en} and break the spell with the pendant.` }
      : { th:`${name} ถูกคำสั่งจากระบบครอบงำ ไปที่ชายแดนเพื่อช่วยเขา` },
    waves:[zone==='cyberhell' ? [{kind,count:2,hp:50,atk:[8,12]}]
      : RETURN_REAPERS.map((k,i)=>({controlledCrew:k,nameEn:RETURN_REAPER_EN[zone][i],sp:`crew-${k}`,hp:28,atk:[4,7],hypno:true})),
      [{name,nameEn:SIGNAL_NAMES_EN[zone],sp:`boss-frontier-${zone}${zone==='cyberhell'?'':'-signal'}`,boss:true,hp,atk,hypno:true,skills:BOSS_SKILLS[SIGNAL_SKILLS[zone]],partyScale:SIGNAL_SCALE[zone]},
        ...(partner ? [partner] : [])]],
    reward:{coin,items,order,exp:20},lose:{hp:8},
  }];
}));
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
  for(const zone of Object.keys(RETURN_GUARD_EVENTS))if(g.zoneEvents[zone]?.[Z4G_KEYS.guardEvent]==='active')g.zoneEvents[zone][Z4G_KEYS.guardEvent]='pending';
}
