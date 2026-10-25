import {canteenActive,canteenState} from './canteen.js';
import {WORKER_RULES,WORKER_MODES,zoneWorkers,workerHireCost,workerHireWhy,workerSheet,workerFrameRect} from './workers.js';
import {BAL,ITEMS} from './data.js';
import {hireRank,recommendedHire} from './unlocks.js';
import {t} from './i18n.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const workerSupplyBlocked=game=>zoneWorkers(game).some(w=>w.supplyRest||w.mode!=='rest'&&(game.food||0)<WORKER_RULES.food);
export function workerSuppliesHtml(game,{hire=false}={}) {
  const why=hire?workerHireWhy(game):'',rice=game.inventory?.food||0;
  return `<div class="worker-supplies"><div class="worker-supply-total"><b>เสบียงกลาง ${Math.round((game.food||0)*100)/100} ห่อ</b><small>ใช้ร่วมกันในการทำงาน</small></div>
    ${(game.food||0)<WORKER_RULES.food?'<p class="worker-supply-alert" role="status">เสบียงกลางหมด · คนงานรอเสบียง ให้ข้าวปั้นหรือสั่งพักศาลาน้ำชา</p>':''}
    <div class="worker-service-grid">
      <article class="worker-service-card"><span class="worker-service-icon" aria-hidden="true">🍙</span><h4>ซื้อเสบียง</h4><p>เพิ่มเสบียงกลาง 10 ห่อ</p><b class="worker-service-price">${BAL.foodPrice*10} เบี้ยกรรม</b><button class="gold" data-worker-buy-food ${(game.coin||0)<BAL.foodPrice*10?'disabled':''}>ซื้อ 10 ห่อ</button></article>
      <article class="worker-service-card"><span class="worker-service-icon" aria-hidden="true">📦</span><h4>ให้นิราแจกข้าว</h4><p>ข้าวปั้น 1 ชิ้น → เสบียง +${ITEMS.food.food}</p><b class="worker-service-price">ในกระเป๋า ${rice} ชิ้น</b><button data-worker-share-food ${rice>0?'':'disabled'}>แจกข้าวปั้น 1 ชิ้น</button></article>
      ${hire?`<article class="worker-service-card"><span class="worker-service-icon" aria-hidden="true">👷</span><h4>จ้างผู้ช่วย</h4><p>เพิ่มคนงานประจำโซน 1 คน</p><b class="worker-service-price">${workerHireCost(game)} เบี้ยกรรม</b><button class="gold" data-hire-worker ${why?'disabled':''} title="${esc(why)}">จ้างผู้ช่วย</button>${why?`<small class="worker-service-why">${esc(why)}</small>`:''}</article>`:''}
    </div></div>`;
}
export function workersPanelHtml(game,{allowHire=true}={}) {
  const list=zoneWorkers(game);
  // P1: คนงานคนแรกอยู่ในลำดับแนะนำจ้าง (ลำดับ 2) — คนถัดไปเป็นของเสริมตามใจผู้เล่น ไม่ติดป้าย
  const rank=list.length?0:hireRank('worker'),next=recommendedHire(game)==='worker';
  const badge=rank?` <small class="hire-rank">${esc(t('hire.rank',{n:rank}))}${next?` · <b>★ ${esc(t('hire.recommend'))}</b>`:''}</small>`:'';
  return `<section class="worker-office${next?' hire-recommended':''}"><h3>อสูรผู้ช่วยประจำโซน ${list.length}/${WORKER_RULES.capacity}${badge}</h3>
    <p class="worker-office-jobs">ช่วยยมทูต: ขนส่งวิญญาณ สร้าง/ซ่อม และแจกอาหาร<br>เก็บขาย: กิ่งงิ้วและเศษดาบ</p>
    <p class="worker-office-cost">ค่าจ้าง ${WORKER_RULES.wage} เบี้ยกรรม / ${WORKER_RULES.wageEvery} วาระทำงาน · เสบียง ${WORKER_RULES.food} ห่อ / วาระ</p>
    ${workerSuppliesHtml(game,{hire:allowHire})}
    ${canteenActive(game)?`<div class="worker-canteen-summary"><b>🍲 โรงอาหาร</b><span>ดำและเพลิงทำอาหารเมื่อว่าง · พร้อมแจก ${canteenState(game).meals}/6 ชุด</span></div>`:''}
    <div class="market-grid">${list.map(w=>{
      const station=game.stations.find(st=>st.def.k===w.job?.station);
      const thumb=workerFrameRect(w.homeZone,0,1);
      const thumbClip=`${thumb.top*100}% ${thumb.right*100}% ${thumb.bottom*100}% ${thumb.left*100}%`;
      const workLabel=w.job?.kind==='food'?(w.job.phase==='pickup'?'รับอาหารที่โรงอาหาร':'นำอาหารไปแจก'):w.job?.kind==='repair'?'ช่วยซ่อม':w.job?.kind==='build'?'ช่วยสร้าง':w.job?.kind==='gather'?(w.job.phase==='sell'?'นำวัสดุไปขายพ่อค้านรก':w.job.material==='dabShards'?'เก็บเศษดาบ':'ตัดไม้ดงงิ้ว'):'ช่วยคุม';
      const status=w.supplyRest&&!w.teaRest?'🔴 เสบียงหมด · นั่งรอข้าวปั้นหรือสั่งพักศาลาน้ำชา':w.teaRest?'ไปนั่งพักที่ศาลาน้ำชา':w.mode==='rest'?'นั่งพัก':w.recovering?'ไปนั่งพักฟื้นกำลังใจ':(w.reason==='รอเสบียง'&&(game.food||0)>=WORKER_RULES.food?'':w.reason)||((game.food||0)<WORKER_RULES.food?'รอเสบียง':!w.job?({food:'รออาหารหรือผู้ที่ต้องการอาหาร',gather:'รอสร้างดงงิ้วหรือป่าดาบ'}[w.mode]||'รอวิญญาณหรืองานสร้าง/ซ่อม'):w.job.kind==='escort'?'กำลังนำส่งวิญญาณ':`${w.arrived?'กำลัง':'เดินไป'}${workLabel}${station?.def.name?' '+station.def.name:''}`);
      return `<article class="shop-card worker-card" style="grid-template-columns:72px minmax(0,1fr) auto;gap:12px"><span role="img" aria-label="${esc(w.name)}" style="display:block;width:72px;height:72px;flex-shrink:0;background-image:url('${workerSheet(w.homeZone)}');background-size:400% 400%;background-position:33.333333% 0;clip-path:inset(${thumbClip})"></span><span><b>${esc(w.name)}</b><small>${esc(status)}</small><small>ความหิว ${Math.round(w.hunger??100)}/100 · กำลัง ${Math.round(w.stamina)}/100 · กำลังใจ ${Math.round(w.morale??100)}/100</small><label>หน้าที่ <select style="display:block;width:100%;max-width:220px;margin-top:4px;background:#281d22;color:inherit;border:1px solid #715638;border-radius:6px;padding:5px" data-worker-mode="${esc(w.id)}">${Object.entries(WORKER_MODES).map(([mode,label])=>`<option value="${mode}" ${w.mode===mode?'selected':''}>${label}</option>`).join('')}</select></label></span><span class="worker-actions"><button class="sm" data-feed-worker="${esc(w.id)}" ${(game.inventory?.food||0)>0?'':'disabled'}>🍙 ให้ข้าวปั้น</button><button class="sm" data-rest-worker="${esc(w.id)}" ${game.stations.some(s=>s.def.k==='tea'&&!s.build&&!s.repair)?'':'disabled'}>พักศาลาน้ำชา</button><button class="sm" data-dismiss-worker="${esc(w.id)}">เลิกจ้าง</button></span></article>`;
  }).join('')}</div></section>`;
}
export function bindWorkersPanel(root,game,onChange) {
  root.querySelector('[data-worker-buy-food]')?.addEventListener('click',()=>{if(game.buy('food',1)){game.save();onChange();}});
  root.querySelector('[data-worker-share-food]')?.addEventListener('click',()=>{if(game.giveOnigiriNira())onChange();});
  root.querySelector('[data-hire-worker]')?.addEventListener('click',()=>{if(game.hireWorker())onChange();});
  root.querySelectorAll('[data-worker-mode]').forEach(input=>input.onchange=()=>{if(game.setWorkerMode(input.dataset.workerMode,input.value))onChange();});
  root.querySelectorAll('[data-feed-worker]').forEach(b=>b.onclick=()=>{if(game.feedWorker(b.dataset.feedWorker))onChange();});
  root.querySelectorAll('[data-rest-worker]').forEach(b=>b.onclick=()=>{if(game.restWorkerAtTea(b.dataset.restWorker))onChange();});
  root.querySelectorAll('[data-dismiss-worker]').forEach(button=>button.onclick=()=>{if(game.dismissWorker(button.dataset.dismissWorker))onChange();});
}
