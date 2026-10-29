import { SIDE_CONTENT, KIN_CONTENT, CROSS_ZONE_LINES } from './e1-content.js';
import { CREW, MERCHANT, GUARD_POST, STATIONS, ZONE_ENTRY, crewName } from './data.js';
import { nearestWalk, findPath } from './walk.js?v=k1d';
const sideRules = [
 ['sqNira','th','nira','swapdoc','cyberBreach'],['sqTaan','asia','taan','chainhand','cyberBreach'],
 ['sqPlerng','west','plerng','hirefire','cyberBreach'],['sqKan','asia','kan','silentman','cyberBreach'],
 ['sqBoon','west','boon','hospice','cyberBreach'],['sqDam','th','dam','campelder','cyberRescue'],
 ['sqMerchant','asia','merchant','smokeheir','cyberRescue'],['sqGuard','th','guard','feudgran','cyberRescue'],
];
const kinRules = [
 ['kinTaan','cyberhell','th','taan','health'],['kinPlerng','cyberhell','th','plerng','holyWater'],
 ['kinKan','cyberhell','th','kan','lotus'],['kinBoonCousin','th','cyberhell','boon','lotus'],
 ['kinBoonGrand','asia','th','boon','lotus'],['kinDamBro','cyberhell','th','dam','food'],
 ['kinDamCousin','th','west','dam','tea'],['kinGuard','cyberhell','th','guard','lotus'],
];
export const SIDE_QUESTS=sideRules.map(([id,zone,npc,caseId,requires])=>({...SIDE_CONTENT.find(c=>c.id===id),id,zone,npc,caseId,requires}));
export const KIN_QUESTS=kinRules.map(([id,from,to,npc,item])=>({...KIN_CONTENT.find(c=>c.id===id),id,from,to,npc,item,kin:true}));
export const QUESTS=[...SIDE_QUESTS,...KIN_QUESTS];
export function initializeQuests(g,saved={}) {
  g.sideQuests={};
  for(const q of QUESTS){const s=saved.sideQuests?.[q.id];if(s&&typeof s==='object')g.sideQuests[q.id]={
    step:Math.max(0,Math.min(q.kin?3:5,Math.trunc(s.step)||0)),choice:[0,1].includes(s.choice)?s.choice:null,
    done:!!s.done,caseId:s.caseId||null,verdict:s.verdict?structuredClone(s.verdict):null};}
  g.merchantJourney=structuredClone(saved.merchantJourney||{asia:{elapsed:0,arrived:false}});
  // Existing saves already showed the shop. Do not revoke it from a legacy visit.
  if(!saved.e1Version && saved.zone && g.zoneTravel?.visited?.asia)g.merchantJourney.asia={elapsed:90000,arrived:true};
  if(!saved.e1Version && saved.zone)for(const [zone,key]of [['west','westHypnotized'],['cyberhell','cyberRescue']]) {
    if(g.zoneEvents?.[zone]?.[key]==='cleared')g.merchantJourney[zone]={elapsed:0,arrived:true};
  }
  g.questPortsOpened=!!saved.questPortsOpened;
  g.signalChoices={...saved.signalChoices};
  unlockQuestPorts(g);
}
export function unlockQuestPorts(g){
  if(g.questPortsOpened||!(g.gameCompleted||g.zoneEvents?.cyberhell?.cyberRescue==='cleared')||!g.zoneTravel)return;
  for(const [zone,visited]of Object.entries(g.zoneTravel.visited))if(visited)g.zoneTravel.ports[zone]=true;
  g.questPortsOpened=true;
}
export const questState=(g,id)=>g.sideQuests?.[id]||{step:0,choice:null,done:false};
// Show the current conversation and the chosen reply, never both mutually exclusive replies.
export function questDialogue(g,q){
  const s=questState(g,q.id);
  if(!q.kin){
    if(q.id==='sqDam'&&s.step>=3&&s.verdict&&!s.verdict.right)return ['ดำ: "ผมไม่ได้โทษท่านครับ ... บอกเฉย ๆ"'];
    const lines=[...(q.dialogue[String(Math.min(s.step+1,5))]||[])];
    if(q.id==='sqKan'&&s.step===3&&s.verdict?.privateOpened)lines.unshift('ซาโตริ: "เรื่องนี้เขายังไม่ได้อนุญาตให้ใครรู้"');
    const reply=q.id==='sqBoon'?(s.choice===0&&s.step===2||s.choice===1&&s.step===3):s.step>=4;
    return reply?[...(q.responses?.[s.choice]||[]),...lines]:lines;
  }
  const choiceAt=q.id==='kinGuard'?2:1;
  const filter=lines=>(lines||[]).flatMap(line=>{
    const branch=line.match(/^\*\*\[(.*?)\]\*\*\s*→\s*(.*)$/);
    if(branch)return q.choices.indexOf(branch[1])===s.choice?[branch[2]]:[];
    if(q.id==='kinBoonGrand'&&/^\((ตามตรง|ขอบคุณ)\)/.test(line))return line.startsWith(s.choice===0?'(ตามตรง)':'(ขอบคุณ)')?[line.replace(/^\([^)]*\)\s*/,'')]:[];
    if(q.id==='kinDamBro'&&/^\((เขียน|ไม่เขียน)\)/.test(line))return line.startsWith(s.choice===0?'(เขียน)':'(ไม่เขียน)')?[line.replace(/^\([^)]*\)\s*/,'')]:[];
    return [line];
  });
  const lines=filter(q.dialogue[Math.min(s.step,2)]);
  if(choiceAt===1&&s.step>=2){
    const branch=q.dialogue[1].filter(line=>line.startsWith('**['));
    return [...filter(branch),...lines];
  }
  return lines;
}
export function questUnlocked(g,q){
  if(!q)return false;
  if(q.kin)return (g.gameCompleted||g.zoneEvents?.cyberhell?.cyberBreach==='cleared')&&[q.from,q.to].every(z=>g.zoneTravel?.visited?.[z]&&g.zoneTravel?.ports?.[z]);
  return g.gameCompleted||g.zoneEvents?.cyberhell?.[q.requires]==='cleared';
}
export function questsPaused(g){
  const phase=g.finalEvent?.phase;
  return !g.gameCompleted && ((phase&&!['locked','completed'].includes(phase))||['pending','active'].includes(g.zoneEvents?.cyberhell?.cyberFinal));
}
export function questTarget(g,q){
  const s=questState(g,q.id),zone=q.kin?(s.step===1?q.to:q.from):(s.step===0?'cyberhell':s.step>=4&&['sqPlerng','sqBoon'].includes(q.id)?'th':q.zone);
  const npc=!q.kin&&s.step===0?(q.id==='sqNira'?'nira':'merchant'):q.npc;
  const actor=npc==='guard'?g.guard:(g.crew||[]).find(c=>c.k===npc);
  const def=CREW.find(c=>c.k===npc);
  let point=npc==='merchant'?[MERCHANT.x,MERCHANT.y]:npc==='guard'?GUARD_POST:
    npc==='nira'?[STATIONS.find(st=>st.k==='sala').x,STATIONS.find(st=>st.k==='sala').y]:[def?.hx||300,def?.hy||380];
  if(zone===g.zone&&actor&&npc!=='nira')point=[actor.x??actor.hx??point[0],actor.y??actor.hy??point[1]];
  if(zone===g.zone)point=nearestWalk(...point)||point;
  return {zone,npc,x:point[0],y:point[1],name:npc==='merchant'?'พ่อค้าควันทอง':npc==='guard'?'ยักษ์ทวารบาล':npc==='nira'?'นิรา':crewName(def,zone),art:npc==='merchant'?'img/merchant.png':null};
}
export const questNear=(g,q)=>{const p=questTarget(g,q);return g.zone===p.zone&&(p.npc!=='merchant'||merchantAvailable(g))&&Math.hypot(g.player.x-p.x,g.player.y-p.y)<=150;};
export function questMarkers(g){return QUESTS.filter(q=>questUnlocked(g,q)&&!questState(g,q.id).done&&!(q.caseId&&questState(g,q.id).step===2)).map(q=>({...questTarget(g,q),id:q.id,title:q.title})).filter(p=>p.zone===g.zone);}
const addItems=(g,items)=>{for(const[k,n]of Object.entries(items||{}))g.inventory[k]=(g.inventory[k]||0)+n;};
function award(g,q,s){
  // Claim latch is written before granting anything. Reload and repeated clicks cannot pay twice.
  if(s.done)return false;s.done=true;
  let coin=0,order=0,items={};const a=s.choice===0;
  if(q.kin){
    coin=q.id==='kinDamCousin'?70:a?100:60;order=q.id!=='kinDamCousin'&&a?8:0;
    items=q.id==='kinDamCousin'?{food:1,tea:1}:a?{}:{[q.item]:q.item==='food'?2:1};
  }else switch(q.id){
    case 'sqNira':coin=a?90:60;order=a?10:0;items=a?{}:{lotus:2};break;
    case 'sqMerchant':coin=a?60:0;items={lotus:a?1:2};break;
    case 'sqDam':
      if(!s.verdict?.right){coin=30;break;}
      coin=a?60:80;items=a?{food:2}:{};
      if(a){const actor=g.roster?.['th:dam'];if(actor){actor.hunger=100;actor.morale=100;}}
      break;
    case 'sqGuard':coin=a?60:80;items=a?{lotus:1}:{};break;
    default:coin=a?100:60;order=a?8:0;items=a?{}:{[q.id==='sqPlerng'?'holyWater':'lotus']:1};
  }
  // W2 §8.10 permitted fallback for the unavailable direct helper EXP grant.
  const helperExp=q.kin || ['sqTaan','sqPlerng','sqKan','sqBoon'].includes(q.id) ||
    (q.id==='sqDam'&&s.verdict?.right&&a) || (q.id==='sqGuard'&&a);
  if(helperExp)addItems(g,{food:2});
  g.coin+=coin;g.order=Math.min(100,g.order+order);addItems(g,items);g.gainExp(30,'ภารกิจ');
  g.log(`✓ ${q.title} · ${coin} เบี้ยกรรม · EXP 30`,'good');return true;
}
export function advanceQuest(g,id,choice=null){
  const q=QUESTS.find(q=>q.id===id);if(!questUnlocked(g,q)||(!q.kin&&questsPaused(g))||g.battle||g.over||!questNear(g,q))return false;
  const s=g.sideQuests[id] ||= {step:0,choice:null,done:false};if(s.done)return false;
  const validChoice=[0,1].includes(choice);
  if(q.kin){
    const needsChoice=q.choices.length>0&&s.step===(id==='kinGuard'?2:1);
    if(needsChoice&&!validChoice)return false;
    if(needsChoice)s.choice=choice;
    s.step++;if(s.step===3)award(g,q,s);
  }else if(s.step===0)s.step=1;
  else if(s.step===1){
    if(q.id==='sqBoon'&&!validChoice)return false;
    if(q.id==='sqBoon')s.choice=choice;
    if(!g.enqueueQuestCase(q.caseId))return false;
    s.caseId=q.caseId;s.step=2;
  }else if(s.step===2)return false;
  else if(s.step===3){
    if(q.id==='sqDam'&&!s.verdict?.right){s.step=5;award(g,q,s);}
    else{
      if(q.id!=='sqBoon'&&!validChoice)return false;
      if(q.id!=='sqBoon')s.choice=choice;
      if(q.id==='sqMerchant'&&choice===1){if(g.coin<60)return false;g.coin-=60;}
      s.step=4;
    }
  }else if(s.step===4){s.step=5;award(g,q,s);}
  g.save();g.onChange();return true;
}
export function recordQuestVerdict(g,soul,r){
  const q=SIDE_QUESTS.find(q=>q.caseId===soul.case),s=q&&g.sideQuests[q.id];
  if(!s||s.step!==2||s.done)return;
  s.verdict={right:!!r.right,heaven:!!r.heaven,privateOpened:!!soul.privateOpened};s.step=3;
}
export function merchantAvailable(g){
  if(g.zone==='asia')return !!g.merchantJourney?.asia?.arrived;
  return g.zone==='west'?g.zoneEvents?.west?.westHypnotized==='cleared':g.zone==='cyberhell'?g.zoneEvents?.cyberhell?.cyberRescue==='cleared':true;
}
export function merchantRun(g){
  const s=g.merchantJourney?.[g.zone];if(!s?.running)return null;
  const start=g.zone==='asia'?ZONE_ENTRY.gate:g.zone==='west'?[230,500]:[1038,350];
  const from=nearestWalk(...start)||start,to=nearestWalk(MERCHANT.x,MERCHANT.y)||[MERCHANT.x,MERCHANT.y];
  const path=s.path ||= [from,...(findPath(...from,...to)||[]),to];
  const lengths=path.slice(1).map((v,i)=>Math.hypot(v[0]-path[i][0],v[1]-path[i][1]));
  let left=lengths.reduce((sum,n)=>sum+n,0)*Math.min(1,s.runMs/6000);
  for(let i=0;i<lengths.length;i++){
    if(left<=lengths[i]&&lengths[i]>0){const t=left/lengths[i];return {x:path[i][0]+(path[i+1][0]-path[i][0])*t,y:path[i][1]+(path[i+1][1]-path[i][1])*t};}
    left-=lengths[i];
  }
  return {x:to[0],y:to[1]};
}
export function advanceMerchant(g,dt){
  if(g.paused||g.over||g.battle||g.pendingZone||g.storyQueue?.length||!(dt>0))return;
  const s=(g.merchantJourney ||= {})[g.zone] ||= {elapsed:0,arrived:false};
  if(s.arrived)return;
  if(g.zone==='asia'){s.elapsed=Math.min(90000,s.elapsed+dt);if(s.elapsed>=84000){s.running=true;s.runMs=s.elapsed-84000;}if(s.elapsed<90000)return;}
  const ready=g.zone==='asia'?s.elapsed>=90000:g.zone==='west'?g.zoneEvents?.west?.westHypnotized==='cleared':g.zone==='cyberhell'?g.zoneEvents?.cyberhell?.cyberRescue==='cleared':false;
  if(!ready)return;
  if(!s.running){s.running=true;s.runMs=0;}
  if(g.zone!=='asia')s.runMs+=dt;
  if(s.runMs>=6000){s.running=false;s.arrived=true;g.queueStory(`mrun-${g.zone==='cyberhell'?'cyber':g.zone}`);g.save();}
}
export function crossZoneTalk(g,npc){
  if(!['taan','plerng','kan','boon','dam','guard','merchant'].includes(npc))return null;
  const r=(g.talk ||= {seen:{}}).seen;r[`met:${npc}@${g.zone}`]=true;
  const z={th:'th',as:'asia',we:'west',cy:'cyberhell'};
  for(const c of CROSS_ZONE_LINES){
    if(r[`xz:${c.id}`])continue;
    const parts=c.id.split('-');let ok=false;
    if(parts[1]==='mer'&&npc==='merchant'){
      const role=parts[2],second=role==='boon'?'asia':'cyberhell';ok=!!r[`met:${role}@th`]&&!!r[`met:${role}@${second}`];
    }else if(parts[1]===npc){const a=z[parts[2]],b=z[parts[3]],forward=parts[4]==='f';ok=g.zone===(forward?b:a)&&!!r[`met:${npc}@${forward?a:b}`];}
    if(c.id==='xz-guard-as-we-f'&&g.zoneEvents?.west?.westVampireBreach!=='cleared')ok=false;
    if(ok){r[`xz:${c.id}`]=true;g.save();return c.line;}
  }
  g.save();return null;
}
