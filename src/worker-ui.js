import {canteenState,mealRecipients} from './canteen.js';
import {WORKER_RULES,WORKER_MODES,zoneWorkers,workerHireCost,workerHireWhy,workerSheet,workerFrameRect} from './workers.js';
import {hireRank,recommendedHire} from './unlocks.js';
import {t} from './i18n.js';
import {BAL} from './data.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const workerSupplyBlocked=game=>zoneWorkers(game).some(w=>w.supplyRest||w.mode!=='rest'&&(game.food||0)<WORKER_RULES.food);
export function workerSuppliesHtml(game,{hire=false}={}){
 const why=workerHireWhy(game);
 return `<div class="worker-supplies"><b>เสบียงกลาง ${Math.floor(game.food||0)} ห่อ</b><p>ซื้อเสบียงได้ที่พ่อค้า · จัดหน้าที่และให้ข้าวที่จัดทีม · พ่อครัวและคนเสิร์ฟดูแลอาหารอัตโนมัติที่โรงอาหาร</p>${hire?`<button class="gold" data-hire-worker ${why?'disabled':''}>จ้างผู้ช่วย ${workerHireCost(game)} เบี้ยกรรม</button><p>${esc(why)}</p>`:''}</div>`;
}
export function workersPanelHtml(game,{allowHire=true}={}){
 const rank=zoneWorkers(game).length?0:hireRank('worker'),next=recommendedHire(game)==='worker';
 return `<section class="worker-office"><h3>${rank?`<small class="hire-rank">${esc(t('hire.rank',{n:rank}))}${next?' · ★ '+esc(t('hire.recommend')):''}</small>`:''}จ้างคนงาน ${zoneWorkers(game).length}/${WORKER_RULES.capacity}</h3>${workerSuppliesHtml(game,{hire:allowHire})}<p>ค่าจ้าง ${WORKER_RULES.wage} เบี้ยกรรม / ${WORKER_RULES.wageEvery} วาระทำงาน · เสบียง ${WORKER_RULES.food} ห่อ / วาระ</p><div class="market-grid">${zoneWorkers(game).map(w=>{const r=workerFrameRect(w.homeZone,0,1);return `<article class="worker-service-card"><span class="team-face worker-face" style="background-image:url('${workerSheet(w.homeZone)}');clip-path:inset(${r.top*100}% ${r.right*100}% ${r.bottom*100}% ${r.left*100}%)"></span><b>${esc(w.name)}</b><small>จ้างแล้ว · ${esc(WORKER_MODES[w.mode])}</small></article>`;}).join('')}</div></section>`;
}
export function bindWorkersPanel(root,game,onChange){
 root.querySelector('[data-hire-worker]')?.addEventListener('click',()=>{if(game.hireWorker())onChange();});
 root.querySelectorAll('[data-worker-mode]').forEach(input=>input.onchange=()=>{if(game.setWorkerMode(input.dataset.workerMode,input.value))onChange();});
 root.querySelectorAll('[data-worker-target]').forEach(input=>input.onchange=()=>{if(game.setWorkerServeTarget(input.dataset.workerTarget,input.value))onChange();});
}
export function canteenPanelHtml(game,inside=true){
 const state=canteenState(game),recipients=mealRecipients(game).filter(c=>c.stamina==null);
 return `<div class="canteen-panel"><p class="canteen-status">พร้อมเสิร์ฟ ${state.meals}/6 · เสบียงกลาง ${Math.floor(game.food)} ห่อ</p><p>พ่อครัวปั้นข้าวอัตโนมัติทุก 3 วินาที ใช้เสบียง 1 ห่อ/ชุด · เมื่อเสบียงใกล้หมด ซื้อเพิ่มอัตโนมัติ 10 ห่อ (${BAL.foodPrice*10} เบี้ยกรรม) · คนเสิร์ฟเดินรับและส่งถึงตัว ยิ่งหลายคนยิ่งส่งได้เร็ว · ดำและเพลิงกลับไปทำหน้าที่เดิม</p>
 ${zoneWorkers(game).map(w=>`<article class="worker-service-card"><b>${esc(w.name)}</b><label>หน้าที่ <select data-worker-mode="${esc(w.id)}" ${inside?'':'disabled'}>${Object.entries(WORKER_MODES).map(([k,v])=>`<option value="${k}" ${w.mode===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>ส่งให้ <select data-worker-target="${esc(w.id)}" ${inside?'':'disabled'}><option value="auto" ${!w.serveTarget||w.serveTarget==='auto'?'selected':''}>อัตโนมัติ: ส่งให้คนที่หิวที่สุดก่อน</option>${recipients.map(c=>`<option value="${esc(c.id)}" ${w.serveTarget===c.id?'selected':''}>${esc(c.name)}</option>`).join('')}</select></label></article>`).join('')||'<p>ยังไม่มีคนงาน · จ้างได้ที่นิรา</p>'}</div>`;
}
