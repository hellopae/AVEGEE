import {canWalk,nearestWalk,findPath,stepTo} from './walk.js?v=k1d';
import {SPOTS,MOB} from './data.js';
import {actorStanding} from './actor-recovery.js';
import {escortCrewPosition,pathLength,ESCORT_PICKUP_SPEED} from './escort.js';

export const WORKER_RULES=Object.freeze({capacity:6,hireBase:180,hireExtra:60,wage:2,wageEvery:30,food:.03,supervise:.2,repair:.2,perStation:2});
export const WORKER_MODES=Object.freeze({auto:'ช่วยงานอัตโนมัติ',supervise:'ช่วยคุมวิญญาณ',repair:'ช่วยซ่อมอาคาร',escort:'นำส่งวิญญาณ',rest:'พักงาน'});
const zones=['th','asia','west','cyberhell'];
const names={th:'อสูรผู้ช่วย',asia:'โอนิผู้ช่วย',west:'อิมป์ผู้ช่วย',cyberhell:'ไซเบอร์อสูร'};
const number=(v,fallback=0)=>Number.isFinite(v)?v:fallback;
const emptyLedger=()=>({hired:0,hireSpent:0,wagesPaid:0,supervisionTicks:0,repairMs:0,escortsDone:0});
export function normalizeWorkers(value) {
  const out={version:1,nextId:1,workers:[],ledger:emptyLedger()},seen=new Set();
  for(const raw of Array.isArray(value?.workers)?value.workers:[]) {
    if(!zones.includes(raw?.homeZone)||typeof raw.id!=='string'||seen.has(raw.id)||out.workers.filter(w=>w.homeZone===raw.homeZone).length>=WORKER_RULES.capacity)continue;
    seen.add(raw.id);
    const serial=Number(raw.id.split(':').at(-1));if(Number.isSafeInteger(serial))out.nextId=Math.max(out.nextId,serial+1);
    out.workers.push({id:raw.id,homeZone:raw.homeZone,name:String(raw.name||names[raw.homeZone]).slice(0,60),
      mode:Object.hasOwn(WORKER_MODES,raw.mode)?raw.mode:'auto',x:number(raw.x,SPOTS.bench.x),y:number(raw.y,SPOTS.bench.y),face:raw.face===-1?-1:1,
      stamina:Math.max(0,Math.min(100,number(raw.stamina,100))),recovering:!!raw.recovering,
      workTicks:Math.max(0,Math.min(WORKER_RULES.wageEvery,Math.floor(number(raw.workTicks)))),funded:false,
      job:raw.job?.kind==='escort'&&raw.job.soulId!=null?{kind:'escort',soulId:raw.job.soulId}:raw.job&&['supervise','repair'].includes(raw.job.kind)&&typeof raw.job.station==='string'?{kind:raw.job.kind,station:raw.job.station}:null});
  }
  out.nextId=Math.max(out.nextId,Math.max(1,Math.floor(number(value?.nextId,1))));
  for(const key of Object.keys(out.ledger))out.ledger[key]=Math.max(0,number(value?.ledger?.[key]));
  return out;
}
const state=g=>g.workerState ||= normalizeWorkers();
export const zoneWorkers=g=>state(g).workers.filter(w=>w.homeZone===g.zone);
export const workerHireCost=g=>WORKER_RULES.hireBase+zoneWorkers(g).length*WORKER_RULES.hireExtra;
export function workerHireWhy(g) {
  if(g.over||g.battle)return 'รอให้จบการต่อสู้ก่อน';
  if(!actorStanding(g.crewOf('nira'))||g.niraRest)return 'นิรายังไม่พร้อมรับสมัคร';
  if(zoneWorkers(g).length>=WORKER_RULES.capacity)return 'ผู้ช่วยในโซนนี้ครบ 6 คนแล้ว';
  return g.coin<workerHireCost(g)?'เบี้ยกรรมไม่พอ':'';
}
export function hireWorker(g) {
  if(workerHireWhy(g))return false;
  const s=state(g),price=workerHireCost(g),id=`worker:${s.nextId++}`,i=zoneWorkers(g).length;
  const home=nearestWalk(SPOTS.bench.x-100+(i%3)*38,SPOTS.bench.y+80+Math.floor(i/3)*35)||[SPOTS.bench.x,SPOTS.bench.y];
  const worker={id,homeZone:g.zone,name:`${names[g.zone]} ${id.split(':').at(-1)}`,mode:'auto',x:home[0],y:home[1],face:1,stamina:100,workTicks:0,funded:true,job:null};
  s.workers.push(worker);g.coin-=price;s.ledger.hired++;s.ledger.hireSpent+=price;
  g.log?.(`นิราจ้าง${worker.name} · ${price} เบี้ยกรรม`,'act');return worker;
}
function cancelJob(g,w) {
  for(const walk of g.afterlifeWalks||[])if(walk.escort?.workerId===w.id)walk.escort=null;
  w.job=null;w.path=null;w.moving=false;w.arrived=false;w.target=null;w.reason='';
}
export function setWorkerMode(g,id,mode) {
  const w=zoneWorkers(g).find(w=>w.id===id);
  if(!w||!Object.hasOwn(WORKER_MODES,mode))return false;
  cancelJob(g,w);w.mode=mode;return true;
}
export function dismissWorker(g,id) {
  const w=zoneWorkers(g).find(w=>w.id===id);if(!w)return false;
  cancelJob(g,w);state(g).workers=state(g).workers.filter(x=>x.id!==id);return true;
}
const stationOf=(g,w)=>g.stations.find(st=>st.def.k===w.job?.station);
const keeper=(g,st)=>g.crewOf(st?.crewK);
function repairReady(g,st) {
  return !!st?.repair&&g.crew.some(c=>actorStanding(c)&&['taan','dam'].includes(c.k)&&c.buildK===st.def.k);
}
function superviseReady(g,st) {
  const c=keeper(g,st);
  return !!st&&!st.build&&!st.repair&&st.fire<MOB.burnMax&&st.slots.some(slot=>!slot.pendingUntil||Date.now()>=slot.pendingUntil)&&actorStanding(c)&&!c.self&&!c.escort;
}
function jobValid(g,w) {
  if(!w.job)return false;
  if(w.job.kind==='escort')return (g.afterlifeWalks||[]).some(walk=>walk.escort?.workerId===w.id);
  const st=stationOf(g,w);return w.job.kind==='repair'?repairReady(g,st):superviseReady(g,st);
}
function assignJob(g,w) {
  for(const kind of w.mode==='auto'?['repair','supervise']:[w.mode]) {
    if(!['repair','supervise'].includes(kind))continue;
    for(const st of g.stations.slice().sort((a,b)=>a.def.k.localeCompare(b.def.k))) {
      const occupied=zoneWorkers(g).filter(x=>x.job?.kind===kind&&x.job.station===st.def.k).length;
      if(occupied>=WORKER_RULES.perStation||!(kind==='repair'?repairReady(g,st):superviseReady(g,st)))continue;
      w.job={kind,station:st.def.k};w.path=null;return;
    }
  }
}
export function stepWorkers(g) {
  if(g.paused||g.over||g.battle||g.zoneTravel?.active)return;
  for(const w of zoneWorkers(g)) {
    w.funded=false;
    if(w.mode==='rest'||w.recovering||w.stamina<=0) {
      if(w.job)cancelJob(g,w);
      w.recovering=w.mode!=='rest'&&(w.recovering||w.stamina<=0);
      w.stamina=Math.min(100,w.stamina+4);if(w.stamina>=40)w.recovering=false;continue;
    }
    if(!jobValid(g,w))cancelJob(g,w);
    if(!w.job)assignJob(g,w);
    if(!w.job){w.stamina=Math.min(100,w.stamina+1);continue;}
    if(w.workTicks>=WORKER_RULES.wageEvery) {
      if(g.coin<WORKER_RULES.wage){if(w.job.kind==='escort')cancelJob(g,w);w.reason='รอค่าจ้าง';continue;}
      g.coin-=WORKER_RULES.wage;state(g).ledger.wagesPaid+=WORKER_RULES.wage;w.workTicks=0;
    }
    if(g.food<WORKER_RULES.food){if(w.job.kind==='escort')cancelJob(g,w);w.reason='รอเสบียง';continue;}
    g.food-=WORKER_RULES.food;w.workTicks++;w.stamina=Math.max(0,w.stamina-.15);w.funded=true;w.reason='';
    if(w.job.kind==='supervise'&&w.arrived)state(g).ledger.supervisionTicks++;
  }
}
export function workerSupervisionMultiplier(g,st) {
  const count=zoneWorkers(g).filter(w=>w.funded&&w.arrived&&w.job?.kind==='supervise'&&w.job.station===st.def.k).length;
  return 1+Math.min(WORKER_RULES.perStation,count)*WORKER_RULES.supervise;
}
function target(g,w) {
  const st=stationOf(g,w);if(!st)return null;
  const peers=zoneWorkers(g).filter(x=>x.job?.station===st.def.k).sort((a,b)=>a.id.localeCompare(b.id));
  const offset=peers.indexOf(w)%2===0?-34:34;
  return nearestWalk(st.def.x+offset,st.def.y+36);
}
export function advanceWorkers(g,dt,now=Date.now()) {
  if(g.paused||g.over||g.battle||g.finalEventOnMap?.()||g.zoneTravel?.active||!Number.isFinite(dt)||dt<=0)return;
  for(const w of zoneWorkers(g)) {
    w.moving=false;
    if(!canWalk(w.x,w.y)){const safe=nearestWalk(w.x,w.y);if(safe){[w.x,w.y]=safe;w.path=null;}}
    if(!w.funded||!w.job||w.job.kind==='escort')continue;
    const goal=target(g,w);if(!goal)continue;
    w.arrived=Math.hypot(w.x-goal[0],w.y-goal[1])<24;
    if(!w.arrived) {
      if(!w.path?.length||w.target?.[0]!==goal[0]||w.target?.[1]!==goal[1]){w.path=findPath(w.x,w.y,...goal);w.target=goal;}
      if(w.path?.length) {
        const next=w.path[0],dx=next[0]-w.x,dy=next[1]-w.y,d=Math.hypot(dx,dy);
        if(d<2)w.path.shift();else {const speed=Math.min(d,Math.min(dt,120)*.11);w.moving=stepTo(w,dx/d*speed,dy/d*speed);w.face=dx<0?-1:1;if(!w.moving)w.path=null;}
      }
    } else if(w.job.kind==='repair') {
      const st=stationOf(g,w);
      if(repairReady(g,st)&&!st.repairWait&&st.repair>now){const gain=Math.min(Math.min(dt,120)*WORKER_RULES.repair,st.repair-now);st.repair-=gain;state(g).ledger.repairMs+=gain;}
    }
  }
}
export function assignWorkerEscort(g,walk) {
  if(!walk?.path?.length||walk.escort||walk.courier||g.food<WORKER_RULES.food)return false;
  const start=walk.path[0];
  const candidates=zoneWorkers(g).filter(w=>['auto','escort'].includes(w.mode)&&(!w.job||w.mode==='auto'&&w.job.kind==='supervise')&&!w.recovering&&w.stamina>0&&(w.workTicks<WORKER_RULES.wageEvery||g.coin>=WORKER_RULES.wage))
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
  const end=walk.path.at(-1);if(end)[w.x,w.y]=end;
  w.job=null;w.path=null;w.moving=false;w.arrived=false;w.target=null;w.reason='';
  if(walk.elapsed>=walk.duration)state(g).ledger.escortsDone++;
  return true;
}
export const workerDiscs=g=>zoneWorkers(g).filter(w=>!w.moving&&w.mode!=='rest').map(w=>[w.x,w.y]);
// Frame-local atlas guards measured against all 64 shipped cells. Insets only
// remove disconnected neighbouring-cell fragments; the character/tool component
// has at least 3 source pixels of clearance. Never shift the original foot anchor.
export const WORKER_FRAME_INSETS=Object.freeze({"th":[[0,0,0,0],[5,0,0,0],[0,0,0,0],[0,0,0,0],[0,14,0,0],[17,11,0,0],[21,12,0,0],[0,13,0,0],[0,11,0,0],[42,11,0,0],[21,12,0,0],[0,12,0,0],[0,0,0,0],[21,0,0,0],[29,0,0,0],[6,0,0,0]],"asia":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,4,0,0],[5,5,0,0],[0,4,0,0],[0,4,0,0],[0,0,0,0],[16,5,0,0],[0,5,0,0],[0,6,0,0],[0,0,0,0],[0,0,0,0],[5,0,0,0],[0,0,0,0]],"west":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,7,0,0],[6,7,0,0],[5,7,0,0],[0,7,0,0],[0,14,0,0],[0,16,0,0],[21,18,0,0],[23,16,0,0],[0,0,0,0],[0,0,0,0],[30,0,0,0],[25,0,0,0]],"cyberhell":[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0],[8,0,0,0],[0,0,0,0],[0,7,0,0],[0,9,0,0],[0,10,0,0],[0,8,0,0],[0,0,0,0],[28,0,0,0],[25,0,0,0],[6,0,0,0]]});
export function workerFrameRect(zone,row=0,column=0) {
  const table=WORKER_FRAME_INSETS[zone]||WORKER_FRAME_INSETS.th;
  const [l,t,r,b]=table[row*4+column]||[0,0,0,0];
  return {left:l/320,top:t/320,right:r/320,bottom:b/320,
    x:column+l/320,y:row+t/320,w:1-(l+r)/320,h:1-(t+b)/320};
}
export const workerSheet=zone=>`img/workers/worker-${zones.includes(zone)?zone:'th'}-sheet-v1.webp`;
const sheets=new Map();
export function drawWorker(ctx,w,time,height=48) {
  const source=workerSheet(w.homeZone);let image=sheets.get(source);
  if(!image&&typeof Image!=='undefined'){image=new Image();image.src=source;sheets.set(source,image);}
  ctx.save();
  ctx.fillStyle='rgba(14,8,18,.28)';ctx.beginPath();ctx.ellipse(w.x,w.y-2,height*.22,height*.065,0,0,Math.PI*2);ctx.fill();
  if(image?.complete&&image.naturalWidth) {
    const fw=image.naturalWidth/4,fh=image.naturalHeight/4;
    const row=w.job?.kind==='escort'?3:w.moving?1:w.arrived&&w.job?.kind==='repair'?2:0,col=Math.floor(time/160)%4,width=height*fw/fh;
    ctx.translate(w.x,w.y);if(w.face===-1)ctx.scale(-1,1);
    const frame=workerFrameRect(w.homeZone,row,col);
    ctx.drawImage(image,frame.x*fw,frame.y*fh,frame.w*fw,frame.h*fh,
      -width/2+frame.left*width,-height+frame.top*height,width*frame.w,height*frame.h);
  } else {
    ctx.fillStyle={th:'#7b9d55',asia:'#a74a64',west:'#8061a3',cyberhell:'#479dba'}[w.homeZone]||'#7b9d55';
    ctx.fillRect(w.x-height*.16,w.y-height*.65,height*.32,height*.6);
    ctx.beginPath();ctx.arc(w.x,w.y-height*.76,height*.17,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#eac48c';ctx.beginPath();ctx.moveTo(w.x-height*.16,w.y-height*.82);ctx.lineTo(w.x-height*.13,w.y-height);ctx.lineTo(w.x-height*.04,w.y-height*.85);ctx.fill();
  }
  ctx.restore();
}
