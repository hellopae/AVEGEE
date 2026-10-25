import {startTeaRest,advanceTeaRest} from './tea-staff-rest.js';
import {canteenActive,canteenPoint,canteenState,mealRecipients,needsMeal,mealRecipient,serveMeal} from './canteen.js';
import {canWalk,nearestWalk,findPath,stepTo} from './walk.js?v=k1d';
import {SPOTS,MOB,MERCHANT,ITEMS} from './data.js';
import {actorStanding} from './actor-recovery.js';
import {escortCrewPosition,pathLength,ESCORT_PICKUP_SPEED} from './escort.js';

export const WORKER_RULES=Object.freeze({capacity:6,hireBase:180,hireExtra:60,wage:2,wageEvery:30,food:.03,supervise:.2,repair:.2,perStation:2});
export const WORKER_MODES=Object.freeze({auto:'ช่วยขนส่งและสร้าง/ซ่อม',gather:'เก็บวัสดุขาย',food:'รับอาหารไปแจก',rest:'นั่งพัก'});
const zones=['th','asia','west','cyberhell'];
const names={th:'อสูรผู้ช่วย',asia:'โอนิผู้ช่วย',west:'อิมป์ผู้ช่วย',cyberhell:'ไซเบอร์อสูร'};
const number=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const emptyLedger=()=>({hired:0,hireSpent:0,wagesPaid:0,supervisionTicks:0,buildMs:0,repairMs:0,escortsDone:0,ngiwWood:0,dabShards:0,sales:0,income:0,offlineIncome:0});
export function normalizeWorkers(value) {
  const out={version:3,nextId:1,lastAt:Math.max(0,number(value?.lastAt,Date.now())),workers:[],ledger:emptyLedger()},seen=new Set();
  for(const raw of Array.isArray(value?.workers)?value.workers:[]) {
    if(!zones.includes(raw?.homeZone)||typeof raw.id!=='string'||seen.has(raw.id)||out.workers.filter(w=>w.homeZone===raw.homeZone).length>=WORKER_RULES.capacity)continue;
    seen.add(raw.id);
    const serial=Number(raw.id.split(':').at(-1));if(Number.isSafeInteger(serial))out.nextId=Math.max(out.nextId,serial+1);
    out.workers.push({id:raw.id,homeZone:raw.homeZone,name:String(raw.name||names[raw.homeZone]).slice(0,60),
      mode:Object.hasOwn(WORKER_MODES,raw.mode)?raw.mode:'auto',morale:Math.max(0,Math.min(100,number(raw.morale,number(raw.stamina,100)))),meal:!!raw.meal,hunger:Math.max(0,Math.min(100,number(raw.hunger,100))),supplyRest:!!raw.supplyRest,teaRest:raw.teaRest && typeof raw.teaRest==='object'?structuredClone(raw.teaRest):!!raw.teaRest,resumeMode:raw.resumeMode==='gather'||raw.resumeMode==='food'?raw.resumeMode:'auto',x:number(raw.x,SPOTS.bench.x),y:number(raw.y,SPOTS.bench.y),face:raw.face===-1?-1:1,
      stamina:Math.max(0,Math.min(100,number(raw.stamina,100))),recovering:!!raw.recovering,
      workTicks:Math.max(0,Math.min(WORKER_RULES.wageEvery,Math.floor(number(raw.workTicks)))),funded:false,
      cargo:raw.cargo==='ngiwWood'||raw.cargo==='dabShards'?raw.cargo:null,
      job:raw.job?.kind==='escort'&&raw.job.soulId!=null?{kind:'escort',soulId:raw.job.soulId}:raw.job?.kind==='gather'?{kind:'gather',material:raw.job.material==='dabShards'?'dabShards':'ngiwWood',phase:raw.job.phase==='sell'?'sell':'collect',worked:Math.max(0,number(raw.job.worked))}:raw.job&&['build','repair'].includes(raw.job.kind)&&typeof raw.job.station==='string'?{kind:raw.job.kind,station:raw.job.station}:null});
  }
  out.nextId=Math.max(out.nextId,Math.max(1,Math.floor(number(value?.nextId,1))));
  for(const key of Object.keys(out.ledger))out.ledger[key]=Math.max(0,number(value?.ledger?.[key]));
  return out;
}
const state=g=>g.workerState ||= normalizeWorkers();
export const zoneWorkers=g=>state(g).workers.filter(w=>w.homeZone===g.zone);
export const workerHireCost=g=>WORKER_RULES.hireBase+zoneWorkers(g).length*WORKER_RULES.hireExtra;
export function workerHireWhy(g) {
  if(!(g.zoneEvents?.th?.frontierBreach==='cleared'||g.bossCleared?.th))return 'ชนะปีศาจที่บุกจากชายแดนก่อน จึงจ้างคนงานได้';
  if(g.over||g.battle)return 'รอให้จบการต่อสู้ก่อน';
  if(!actorStanding(g.crewOf('nira'))||g.niraRest)return 'นิรายังไม่พร้อมรับสมัคร';
  if(zoneWorkers(g).length>=WORKER_RULES.capacity)return 'ผู้ช่วยในโซนนี้ครบ 6 คนแล้ว';
  return g.coin<workerHireCost(g)?'เบี้ยกรรมไม่พอ':'';
}
export function hireWorker(g) {
  if(workerHireWhy(g))return false;
  const s=state(g),price=workerHireCost(g),id=`worker:${s.nextId++}`,i=zoneWorkers(g).length;
  const home=nearestWalk(SPOTS.bench.x-100+(i%3)*38,SPOTS.bench.y+80+Math.floor(i/3)*35)||[SPOTS.bench.x,SPOTS.bench.y];
  const worker={id,homeZone:g.zone,name:`${names[g.zone]} ${id.split(':').at(-1)}`,mode:'auto',x:home[0],y:home[1],face:1,stamina:100,morale:100,hunger:100,workTicks:0,funded:true,job:null};
  s.workers.push(worker);g.coin-=price;s.ledger.hired++;s.ledger.hireSpent+=price;
  g.log?.(`นิราจ้าง${worker.name} · ${price} เบี้ยกรรม`,'act');return worker;
}
function cancelJob(g,w) {
  for(const walk of g.afterlifeWalks||[])if(walk.escort?.workerId===w.id)walk.escort=null;
  w.job=null;w.path=null;w.moving=false;w.arrived=false;w.target=null;w.reason='';
}
export function setWorkerMode(g,id,mode) {
  if(['escort','build','repair','supervise'].includes(mode))mode='auto';
  const w=zoneWorkers(g).find(w=>w.id===id);
  if(!w||!Object.hasOwn(WORKER_MODES,mode))return false;
  cancelJob(g,w);w.teaRest=null;w.mode=mode;return true;
}
export function feedWorker(g,id){
 const w=zoneWorkers(g).find(w=>w.id===id);if(!w||g.battle||!(g.inventory?.food>0))return false;
 if(!w.supplyRest&&w.hunger>=100&&w.stamina>=100&&(w.morale??100)>=100)return false;
 if(--g.inventory.food<=0)delete g.inventory.food;
 w.hunger=Math.min(100,(w.hunger??0)+40);w.stamina=Math.min(100,w.stamina+35);w.morale=Math.min(100,(w.morale??0)+35);w.supplyRest=false;w.reason='';g.food+=ITEMS.food.food;return true;
}
export function restWorkerAtTea(g,id,now=Date.now()){
 const w=zoneWorkers(g).find(w=>w.id===id),tea=g.stations.find(s=>s.def.k==='tea'&&!s.build&&!s.repair);
 if(!w||!tea||g.battle||w.teaRest)return false;
 const dest=nearestWalk(tea.def.sx??tea.def.x,tea.def.sy??tea.def.y);if(!dest)return false;
 const path=findPath(w.x,w.y,...dest);
 if(!path?.length&&Math.hypot(w.x-dest[0],w.y-dest[1])>6)return false;
 if(path?.length&&Math.hypot(path.at(-1)[0]-dest[0],path.at(-1)[1]-dest[1])>100)return false;
 const rest=startTeaRest(g,w,g.zone,path?.at(-1)||dest,path,now);if(!rest)return false;
 const previous=w.mode;cancelJob(g,w);w.resumeMode=previous==='rest'?(w.resumeMode||'auto'):previous;w.mode='rest';w.teaRest=rest;w.path=null;return true;
}
export function dismissWorker(g,id) {
  const w=zoneWorkers(g).find(w=>w.id===id);if(!w)return false;
  cancelJob(g,w);state(g).workers=state(g).workers.filter(x=>x.id!==id);return true;
}
const stationOf=(g,w)=>g.stations.find(st=>st.def.k===w.job?.station);
const keeper=(g,st)=>g.crewOf(st?.crewK);
function repairReady(g,st) {return !!st?.repair&&(st.workerWork?!st.workerWork.ready:g.crew.some(c=>actorStanding(c)&&['taan','dam'].includes(c.k)&&c.buildK===st.def.k));}
function buildReady(g,st) { return !!st?.build&&(st.workerWork?!st.workerWork.ready:g.crew.some(c=>actorStanding(c)&&['taan','dam'].includes(c.k)&&c.buildK===st.def.k)); }
function superviseReady(g,st) {
  const c=keeper(g,st);
  return !!st&&!st.build&&!st.repair&&st.fire<MOB.burnMax&&st.slots.some(slot=>!slot.pendingUntil||Date.now()>=slot.pendingUntil)&&actorStanding(c)&&!c.self&&!c.escort;
}
function jobValid(g,w) {
  if(!w.job)return false;
  if(w.job.kind==='escort')return (g.afterlifeWalks||[]).some(walk=>walk.escort?.workerId===w.id);
  if(w.job.kind==='food')return !!mealRecipient(g,w.job.recipient)&&canteenActive(g);
  if(w.job.kind==='gather')return w.cargo||g.stations.some(st=>st.def.k===(w.job.material==='dabShards'?'dab':'ngiw')&&!st.build&&!st.repair);
  const st=stationOf(g,w);return w.job.kind==='repair'?repairReady(g,st):w.job.kind==='build'?buildReady(g,st):superviseReady(g,st);
}
function availableStationJob(g,kind) {
  if(!['build','repair','supervise'].includes(kind))return null;
  for(const st of g.stations.slice().sort((a,b)=>a.def.k.localeCompare(b.def.k))) {
    const occupied=zoneWorkers(g).filter(x=>x.job?.kind===kind&&x.job.station===st.def.k).length;
    if(occupied>=WORKER_RULES.perStation||!(kind==='repair'?repairReady(g,st):kind==='build'?buildReady(g,st):superviseReady(g,st)))continue;
    return {kind,station:st.def.k};
  }
  return null;
}
function gatherJob(g,w){
 const choices=[['ngiwWood','ngiw'],['dabShards','dab']].filter(([m,k])=>w.cargo===m||g.stations.some(st=>st.def.k===k&&!st.build&&!st.repair));
 if(!choices.length)return null;
 const material=w.cargo||choices[Number(w.id.split(':').at(-1))%choices.length][0];
 return {kind:'gather',material,phase:w.cargo?'sell':'collect',worked:0};
}
function assignJob(g,w) {
 if(['auto','food'].includes(w.mode)&&canteenActive(g)){
  const recipient=mealRecipients(g).find(c=>needsMeal(c)&&!zoneWorkers(g).some(o=>o.job?.kind==='food'&&o.job.recipient===c.id));
  if(recipient&&(w.meal||canteenState(g).meals>0)){w.job={kind:'food',recipient:recipient.id,phase:w.meal?'deliver':'pickup'};return;}
 }
 if(w.mode==='auto')for(const kind of ['build','repair']){const job=availableStationJob(g,kind);if(job){w.job=job;w.path=null;return;}}
 if(['auto','gather'].includes(w.mode)){w.job=gatherJob(g,w);w.path=null;}
}
export function stepWorkers(g) {
  if(g.paused||g.over||g.battle)return;
  const s=state(g),now=Date.now();
  // Gathering income is earned only by a physical collection and sale.
  s.lastAt=now;
  for(const w of zoneWorkers(g)) {
    w.funded=false;w.resting=false;
    if(w.teaRest){w.resting=true;continue;}
    if(g.food<WORKER_RULES.food&&!w.teaRest){w.supplyRest=true;w.hunger=0;}
    if(w.supplyRest&&!w.teaRest){if(w.job)cancelJob(g,w);w.resting=true;w.reason='เสบียงหมด · รอข้าวปั้นหรือพักที่ศาลาน้ำชา';continue;}
    if(w.mode==='rest'||w.recovering||w.stamina<=0||(w.morale??100)<=0) {
      if(w.job)cancelJob(g,w);
      w.recovering=w.mode!=='rest'&&(w.recovering||w.stamina<=0||(w.morale??100)<=0);
      w.stamina=Math.min(100,w.stamina+4);w.morale=Math.min(100,(w.morale??100)+4);if(w.stamina>=40&&w.morale>=40)w.recovering=false;w.resting=true;continue;
    }
    if(!jobValid(g,w))cancelJob(g,w);
    // Reconsider auto work between gathering trips. Finish collecting/selling
    // any current load first; a new construction must not strand its cargo.
    if(w.mode==='auto'&&w.job?.kind==='gather'&&!w.cargo&&w.job.phase==='collect'&&!w.job.worked) {
      w.job=null;assignJob(g,w);
    }
    if(!w.job)assignJob(g,w);
    if(!w.job){w.stamina=Math.min(100,w.stamina+1);continue;}
    if(w.workTicks>=WORKER_RULES.wageEvery) {
      if(g.coin<WORKER_RULES.wage){if(w.job.kind==='escort')cancelJob(g,w);w.reason='รอค่าจ้าง';continue;}
      g.coin-=WORKER_RULES.wage;state(g).ledger.wagesPaid+=WORKER_RULES.wage;w.workTicks=0;
    }
    if(g.food<WORKER_RULES.food){if(w.job.kind==='escort')cancelJob(g,w);w.reason='รอเสบียง';continue;}
    g.food-=WORKER_RULES.food;w.workTicks++;w.stamina=Math.max(0,w.stamina-.15);w.morale=Math.max(0,(w.morale??100)-.12);w.hunger=Math.max(0,(w.hunger??100)-.2);w.funded=true;w.reason='';
    if(w.job.kind==='supervise'&&w.arrived)state(g).ledger.supervisionTicks++;
  }
}
export function workerSupervisionMultiplier(){return 1;}
function target(g,w) {
  if(w.resting||w.mode==='rest') {const tea=w.teaRest&&g.stations.find(s=>s.def.k==='tea'&&!s.build&&!s.repair),at=tea?[tea.def.x,tea.def.y+60]:canteenPoint(g),i=zoneWorkers(g).indexOf(w);return nearestWalk(at[0]-80+(i%3)*64,at[1]+50+Math.floor(i/3)*34);}
  if(w.job?.kind==='food'){if(w.job.phase==='pickup')return canteenPoint(g);const c=mealRecipient(g,w.job.recipient);return c?nearestWalk(c.x??c.hx,c.y??c.hy):null;}
  if(w.job?.kind==='gather'){
    if(w.job.phase==='sell')return nearestWalk(MERCHANT.x,MERCHANT.y);
    const key=w.job.material==='dabShards'?'dab':'ngiw';
    const st=g.stations.find(st=>st.def.k===key&&!st.build);
    return nearestWalk(st?.def.x??(key==='dab'?520:610),st?.def.y??(key==='dab'?1080:1510));
  }
  const st=stationOf(g,w);if(!st)return null;
  const peers=zoneWorkers(g).filter(x=>x.job?.station===st.def.k).sort((a,b)=>a.id.localeCompare(b.id));
  const offset=peers.indexOf(w)%2===0?-34:34;
  return nearestWalk(st.def.x+offset,st.def.y+36);
}
export function advanceWorkers(g,dt,now=Date.now()) {
  if(g.paused||g.over||g.battle||g.finalEventOnMap?.()||!Number.isFinite(dt)||dt<=0)return;
  for(const w of zoneWorkers(g)) {
    w.moving=false;w.sitting=false;
    if(w.teaRest===true){w.teaRest=null;restWorkerAtTea(g,w.id,now);} // legacy boolean order: travel, then a full minute
    if(w.teaRest){advanceTeaRest(g,w,now);w.moving=w.teaRest?.phase==='travel';w.sitting=w.teaRest?.phase==='rest';continue;}
    if(!canWalk(w.x,w.y)){const safe=nearestWalk(w.x,w.y);if(safe){[w.x,w.y]=safe;w.path=null;}}
    if((!w.funded||!w.job||w.job.kind==='escort')&&!w.resting&&w.mode!=='rest')continue;
    const goal=target(g,w);if(!goal)continue;
    w.arrived=Math.hypot(w.x-goal[0],w.y-goal[1])<24;
    if(!w.arrived) {
      if(!w.path?.length||w.target?.[0]!==goal[0]||w.target?.[1]!==goal[1]){w.path=findPath(w.x,w.y,...goal);w.target=goal;}
      if(w.path?.length) {
        const next=w.path[0],dx=next[0]-w.x,dy=next[1]-w.y,d=Math.hypot(dx,dy);
        if(d<2)w.path.shift();else {const speed=Math.min(d,Math.min(dt,120)*.11);w.moving=stepTo(w,dx/d*speed,dy/d*speed);w.face=dx<0?-1:1;w.heading=workerHeading(dx,dy);if(!w.moving)w.path=null;}
      }
    } else if(w.resting||w.mode==='rest'){w.sitting=true;} else if(w.job.kind==='food'){
      if(w.job.phase==='pickup'){const kitchen=canteenState(g);if(kitchen.meals>0){kitchen.meals--;w.meal=true;w.job.phase='deliver';w.path=null;w.arrived=false;}else cancelJob(g,w);}
      else {serveMeal(g,w);cancelJob(g,w);}
    } else if(w.job.kind==='gather') {
      w.job.worked=(w.job.worked||0)+Math.min(dt,120);
      if(w.job.worked>=1800){
        if(w.job.phase==='collect'){
          w.cargo=w.job.material;w.job.phase='sell';w.job.worked=0;w.path=null;w.arrived=false;
          state(g).ledger[w.cargo]++;
        }else{
          const earned=w.cargo==='dabShards'?7:5;g.coin+=earned;state(g).ledger.sales++;state(g).ledger.income+=earned;
          w.cargo=null;w.job.phase='collect';w.job.worked=0;w.path=null;w.arrived=false;
        }
      }
    } else if(w.job.kind==='repair'||w.job.kind==='build') {
      const st=stationOf(g,w);
      const field=w.job.kind==='build'?'build':'repair',ready=w.job.kind==='build'?buildReady(g,st):repairReady(g,st);
      if(ready&&st.workerWork){const gain=Math.min(Math.min(dt,120),st.workerWork.remaining);st.workerWork.remaining-=gain;state(g).ledger[`${field}Ms`]+=gain;if(st.workerWork.remaining<=0)st.workerWork.ready=true;}
      else if(ready&&!st[`${field}Wait`]&&st[field]>now){const gain=Math.min(Math.min(dt,120)*WORKER_RULES.repair,st[field]-now);st[field]-=gain;state(g).ledger[`${field}Ms`]+=gain;}
    }
  }
}
export function assignWorkerEscort(g,walk) {
  if(walk?.destination==='station'||!walk?.path?.length||walk.escort||walk.courier||g.food<WORKER_RULES.food)return false;
  const start=walk.path[0];
  const candidates=zoneWorkers(g).filter(w=>w.mode==='auto'&&(!w.job||w.mode==='auto'&&['supervise','gather'].includes(w.job.kind))&&!w.recovering&&!w.supplyRest&&w.stamina>0&&(w.workTicks<WORKER_RULES.wageEvery||g.coin>=WORKER_RULES.wage))
    .sort((a,b)=>Math.hypot(a.x-start[0],a.y-start[1])-Math.hypot(b.x-start[0],b.y-start[1])||a.id.localeCompare(b.id));
  for(const w of candidates) {
    const route=findPath(w.x,w.y,...start);
    if(!route?.length||Math.hypot(route.at(-1)[0]-start[0],route.at(-1)[1]-start[1])>18)continue;
    cancelJob(g,w);
    const pickup=[[w.x,w.y],...route],delay=Math.round(pathLength(pickup)/ESCORT_PICKUP_SPEED);
    walk.delay=delay;walk.duration+=delay;walk.escort={k:w.id,workerId:w.id,pickup};
    w.job={kind:'escort',soulId:walk.soul.id};w.path=null;w.funded=true;return true;
  }
  return false;
}
export function advanceWorkerEscort(g,walk) {
  const w=zoneWorkers(g).find(w=>w.id===walk.escort?.workerId);if(!w)return;
  const pos=escortCrewPosition(walk);if(pos){w.x=pos.x;w.y=pos.y;w.face=pos.face;w.moving=true;}
}
export function releaseWorkerEscort(g,walk) {
  const w=state(g).workers.find(w=>w.id===walk.escort?.workerId);if(!w)return false;
  const completed=walk.elapsed>=walk.duration;
  // Starting a trial can cancel the harbour walk before the worker reaches it.
  // Release at the visible position so the next delivery begins there, rather
  // than teleporting the assistant to the judgment dais.
  if(completed){const end=walk.path.at(-1);if(end)[w.x,w.y]=end;}
  else {const pos=escortCrewPosition(walk);if(pos){w.x=pos.x;w.y=pos.y;w.face=pos.face;}}
  w.job=null;w.path=null;w.moving=false;w.arrived=false;w.target=null;w.reason='';
  if(completed)state(g).ledger.escortsDone++;
  return true;
}
export const workerDiscs=g=>zoneWorkers(g).filter(w=>!w.moving&&w.mode!=='rest').map(w=>[w.x,w.y]);
// Frame-local atlas guards measured against all 64 shipped cells. Insets only
// remove disconnected neighbouring-cell fragments; the character/tool component
// has at least 3 source pixels of clearance. Never shift the original foot anchor.
export const WORKER_FRAME_INSETS=Object.freeze({"th":[[0,0,0,0],[5,0,0,0],[0,0,0,0],[0,0,0,0],[0,14,0,0],[17,11,0,0],[21,12,0,0],[0,13,0,0],[0,11,0,0],[42,11,0,0],[21,12,0,0],[0,12,0,0],[0,0,0,0],[21,0,0,0],[29,0,0,0],[6,0,0,0]],"asia":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,4,0,0],[5,5,0,0],[0,4,0,0],[0,4,0,0],[0,0,0,0],[16,5,0,0],[0,5,0,0],[0,6,0,0],[0,0,0,0],[0,0,0,0],[5,0,0,0],[0,0,0,0]],"west":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,7,0,0],[6,7,0,0],[5,7,0,0],[0,7,0,0],[0,14,0,0],[0,16,0,0],[21,18,0,0],[23,16,0,0],[0,0,0,0],[0,0,0,0],[30,0,0,0],[25,0,0,0]],"cyberhell":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[8,0,0,0],[0,0,0,0],[0,7,0,0],[0,9,0,0],[0,10,0,0],[0,8,0,0],[0,0,0,0],[28,0,0,0],[25,0,0,0],[6,0,0,0]]});
export function workerFrameRect(zone,row=0,column=0,insets=null) {
  const table=insets||WORKER_FRAME_INSETS[zone]||WORKER_FRAME_INSETS.th;
  const [l,t,r,b]=table[row*4+column]||[0,0,0,0];
  return {left:l/320,top:t/320,right:r/320,bottom:b/320,
    x:column+l/320,y:row+t/320,w:1-(l+r)/320,h:1-(t+b)/320};
}
export const workerSheet=zone=>`img/workers/worker-${zones.includes(zone)?zone:'th'}-sheet-v1.webp`;
// P5b — v2 sheets (12 rows x 4 frames of 320px). A zone listed here draws from its v2 sheet; every other
// zone keeps the 4-row v1 sheet and the old pose logic. To switch another zone: drop worker-<zone>-sheet-v2.webp
// next to the others, add the zone here with its inset table (rows 0-2 are v1 copies and keep v1 insets).
// P5c — optional `fit` table per zone: row -> {scale,dx} that cancels the drawing drift of a v2 sheet without touching
// the image. scale = on-screen size multiplier about the foot baseline (the cell bottom stays put); dx = source px the
// art moves right so the feet land on the cell centre (x 160). A zone with no `fit`, or a row with no entry, is drawn
// as-is (scale 1, dx 0). Measured by scripts/measure-worker-sheet.py: standing height of v1 (308 px) / foot centre x 160.
export const WORKER_FIT_TH_V2=Object.freeze({
  3:{scale:1.109,dx:7},4:{scale:1.063,dx:27},5:{scale:1.122,dx:13},6:{scale:1.083,dx:58},7:{scale:1.129,dx:65},
  8:{scale:1.083,dx:68},9:{scale:1.12,dx:1},10:{scale:1.089,dx:-21},11:{scale:1.065,dx:2}
});
// P9 — the other three zones' v2 sheets (23 Oct Codex round). Rows 0-2 are byte copies of v1 (checked), so they keep the zone's v1 insets; rows 3-11
// were drawn with >= 6 px of clear margin (no insets needed). Only the upright rows that miss the zone's own v1 standing height by more than 2 % carry a
// scale (scripts/measure-worker-fit.py <zone>); crouch/lean rows (6-8) are left at 1.0 on purpose and no foot dx is applied (feet of rows 3-11 sit
// within ~15 px of the cell centre, the v1 rows 0-2 of west/cyberhell are the ones drawn right of it).
export const WORKER_FIT_ASIA_V2=Object.freeze({4:{scale:0.974},5:{scale:1.022},11:{scale:0.977}});
export const WORKER_FIT_WEST_V2=Object.freeze({});
export const WORKER_FIT_CYBERHELL_V2=Object.freeze({3:{scale:0.98},5:{scale:1.026},10:{scale:0.976},11:{scale:0.98}});
const v2Entry=(zone,fit)=>Object.freeze({rows:12,insets:Object.freeze([...WORKER_FRAME_INSETS[zone].slice(0,12),...Array.from({length:36},()=>[0,0,0,0])]),fit});
export const WORKER_SHEETS_V2=Object.freeze({th:v2Entry('th',WORKER_FIT_TH_V2),asia:v2Entry('asia',WORKER_FIT_ASIA_V2),west:v2Entry('west',WORKER_FIT_WEST_V2),cyberhell:v2Entry('cyberhell',WORKER_FIT_CYBERHELL_V2)});
/** Fit of one row of a v2 sheet. No table / no entry means no compensation. */
export const workerFit=(v2,row)=>{const f=v2?.fit?.[row];return {scale:f?.scale??1,dx:f?.dx??0};};
export const workerSheetV2=zone=>WORKER_SHEETS_V2[zone]?`img/workers/worker-${zone}-sheet-v2.webp`:null;
/** v2 row map (Mind spec section 4). Rows 12-16 (rest, vertical carry) are not drawn yet, so they are never used. */
export const WORKER_ROW_V2=Object.freeze({idle:0,walk:1,build:2,escort:3,down:4,up:5,chopThorns:6,collectShards:7,repair:8,supervise:9,carryThorns:10,carryShards:11});
/** Screen heading of a step: vertical only when clearly more vertical than horizontal, otherwise the side-view row (flipped by face). */
export const workerHeading=(dx,dy)=>Math.abs(dy)>Math.abs(dx)*1.2?(dy>0?'down':'up'):'side';
/** Which row of the sheet a worker draws. v1 sheets (4 rows) keep the original choice; v2 chooses by what the worker is really doing. */
export function workerRow(w,v2=false) {
  if(!v2)return w.job?.kind==='escort'?3:w.moving?1:w.arrived&&['build','repair','gather'].includes(w.job?.kind)?2:0;
  const R=WORKER_ROW_V2;
  if(w.job?.kind==='escort')return R.escort;
  if(w.moving) {
    if(w.cargo==='ngiwWood')return R.carryThorns;
    if(w.cargo==='dabShards')return R.carryShards;
    return w.heading==='down'?R.down:w.heading==='up'?R.up:R.walk;
  }
  if(w.arrived) {
    const kind=w.job?.kind;
    if(kind==='build')return R.build;
    if(kind==='repair')return R.repair;
    if(kind==='supervise')return R.supervise;
    if(kind==='gather'&&w.job.phase==='collect'&&!w.cargo)return w.job.material==='dabShards'?R.collectShards:R.chopThorns;
  }
  return R.idle;
}
const sheets=new Map();
export function drawWorker(ctx,w,time,height=48) {
  const v2=WORKER_SHEETS_V2[w.homeZone],source=v2?workerSheetV2(w.homeZone):workerSheet(w.homeZone);let image=sheets.get(source);
  if(!image&&typeof Image!=='undefined'){image=new Image();image.src=source;sheets.set(source,image);}
  if(w.sitting){let rest=sheets.get('rest:'+w.homeZone);if(!rest&&typeof Image!=='undefined'){rest=new Image();rest.src=`img/workers/worker-${w.homeZone}-rest-v1.webp`;sheets.set('rest:'+w.homeZone,rest);}if(rest?.complete&&rest.naturalWidth){ctx.drawImage(rest,w.x-height*.39,w.y-height*.78,height*.78,height*.78);return;}}
  ctx.save();
  ctx.fillStyle='rgba(14,8,18,.28)';ctx.beginPath();ctx.ellipse(w.x,w.y-2,height*.22,height*.065,0,0,Math.PI*2);ctx.fill();
  if(image?.complete&&image.naturalWidth) {
    const rows=v2?v2.rows:4,fw=image.naturalWidth/4,fh=image.naturalHeight/rows;
    const row=workerRow(w,!!v2),col=Math.floor(time/160)%4,width=height*fw/fh;
    ctx.translate(w.x,w.y);if(w.face===-1)ctx.scale(-1,1);
    const frame=workerFrameRect(w.homeZone,row,col,v2?.insets),fit=workerFit(v2,row);
    // scale about the foot baseline (cell bottom, x=0 after the shift); dx re-centres the feet on the cell middle
    const sx=width*fit.scale,sy=height*fit.scale,shift=fit.dx/320*sx;
    ctx.drawImage(image,frame.x*fw,frame.y*fh,frame.w*fw,frame.h*fh,
      -sx/2+shift+frame.left*sx,-sy+frame.top*sy,sx*frame.w,sy*frame.h);
  } else {
    ctx.fillStyle={th:'#7b9d55',asia:'#a74a64',west:'#8061a3',cyberhell:'#479dba'}[w.homeZone]||'#7b9d55';
    ctx.fillRect(w.x-height*.16,w.y-height*.65,height*.32,height*.6);
    ctx.beginPath();ctx.arc(w.x,w.y-height*.76,height*.17,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#eac48c';ctx.beginPath();ctx.moveTo(w.x-height*.16,w.y-height*.82);ctx.lineTo(w.x-height*.13,w.y-height);ctx.lineTo(w.x-height*.04,w.y-height*.85);ctx.fill();
  }
  ctx.restore();
}
