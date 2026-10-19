import {WORKER_RULES,WORKER_MODES,zoneWorkers,workerHireCost,workerHireWhy,workerSheet,workerFrameRect} from './workers.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function workersPanelHtml(game) {
  const list=zoneWorkers(game),why=workerHireWhy(game);
  return `<section class="worker-office"><h3>อสูรผู้ช่วยประจำโซน ${list.length}/${WORKER_RULES.capacity}</h3>
    <p class="hint">จ้างได้หลายคน · ช่วยผู้คุมทำงานเร็วขึ้นคนละ 20% (สูงสุด 2 คนต่อสถานี) · ช่วยทัณฑ์/ดำซ่อมหลังถึงไซต์ · นำวิญญาณที่รับทัณฑ์แล้วไปส่ง</p>
    <p class="hint">ค่าจ้าง ${WORKER_RULES.wage} เบี้ยกรรม / ${WORKER_RULES.wageEvery} วาระที่ทำงาน · ใช้เสบียง ${WORKER_RULES.food} / วาระ · เหนื่อยแล้วพักอัตโนมัติ · อยู่ประจำโซนเดิม</p>
    <button class="gold" data-hire-worker ${why?'disabled':''} title="${esc(why)}">จ้างผู้ช่วย ${workerHireCost(game)} เบี้ยกรรม</button>
    ${why?`<small>${esc(why)}</small>`:''}<div class="market-grid">${list.map(w=>{
      const station=game.stations.find(st=>st.def.k===w.job?.station);
      const thumb=workerFrameRect(w.homeZone,0,1);
      const thumbClip=`${thumb.top*100}% ${thumb.right*100}% ${thumb.bottom*100}% ${thumb.left*100}%`;
      const workLabel=w.job?.kind==='repair'?'ช่วยซ่อม':w.job?.kind==='build'?'ช่วยสร้าง':w.job?.kind==='gather'?(w.job.phase==='sell'?'นำวัสดุไปขายพ่อค้านรก':w.job.material==='dabShards'?'เก็บเศษดาบ':'ตัดไม้ดงงิ้ว'):'ช่วยคุม';
      const status=w.mode==='rest'?'พักงาน':w.recovering?'พักฟื้นกำลัง':w.reason||(!w.job?'รอรับงาน':w.job.kind==='escort'?'กำลังนำส่งวิญญาณ':`${w.arrived?'กำลัง':'เดินไป'}${workLabel}${station?.def.name?' '+station.def.name:''}`);
      return `<article class="shop-card worker-card" style="grid-template-columns:72px minmax(0,1fr) auto;gap:12px"><span role="img" aria-label="${esc(w.name)}" style="display:block;width:72px;height:72px;flex-shrink:0;background-image:url('${workerSheet(w.homeZone)}');background-size:400% 400%;background-position:33.333333% 0;clip-path:inset(${thumbClip})"></span><span><b>${esc(w.name)}</b><small>${esc(status)}</small><small>กำลัง ${Math.round(w.stamina)}/100</small><label>หน้าที่ <select style="display:block;width:100%;max-width:220px;margin-top:4px;background:#281d22;color:inherit;border:1px solid #715638;border-radius:6px;padding:5px" data-worker-mode="${esc(w.id)}">${Object.entries(WORKER_MODES).map(([mode,label])=>`<option value="${mode}" ${w.mode===mode?'selected':''}>${label}</option>`).join('')}</select></label></span><button class="sm" data-dismiss-worker="${esc(w.id)}">เลิกจ้าง</button></article>`;
  }).join('')}</div><small>รายได้จากวัสดุ ${game.workerState?.ledger?.income||0} เบี้ยกรรม · ส่งวิญญาณ ${game.workerState?.ledger?.escortsDone||0} ครั้ง</small></section>`;
}
export function bindWorkersPanel(root,game,onChange) {
  root.querySelector('[data-hire-worker]')?.addEventListener('click',()=>{if(game.hireWorker())onChange();});
  root.querySelectorAll('[data-worker-mode]').forEach(input=>input.onchange=()=>{if(game.setWorkerMode(input.dataset.workerMode,input.value))onChange();});
  root.querySelectorAll('[data-dismiss-worker]').forEach(button=>button.onclick=()=>{if(game.dismissWorker(button.dataset.dismissWorker))onChange();});
}
