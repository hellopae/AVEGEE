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
 root.querySelectorAll('[data-hire-worker-as]').forEach(button=>button.onclick=()=>{if(game.hireWorker(button.dataset.hireWorkerAs))onChange();});
 // who a server serves: the queue box clears the list; ticking yomtoot picks specific people (more than one allowed)
 root.querySelectorAll('[data-worker-queue]').forEach(input=>input.onchange=()=>{if(game.setWorkerServeTarget(input.dataset.workerQueue,'auto'))onChange();});
 root.querySelectorAll('[data-worker-target]').forEach(input=>input.onchange=()=>{
  const id=input.dataset.workerTarget,ids=[...root.querySelectorAll('[data-worker-target]')].filter(x=>x.dataset.workerTarget===id&&x.checked).map(x=>x.value);
  if(game.setWorkerServeTarget(id,ids.length?ids:'auto'))onChange();
 });
}
export function canteenPanelHtml(game,inside=true){
 const state=canteenState(game),recipients=mealRecipients(game).filter(c=>c.stamina==null),why=workerHireWhy(game),cost=workerHireCost(game);
 const hire=(mode,label)=>`<button class="gold" data-hire-worker-as="${mode}" ${inside&&!why?'':'disabled'}>จ้าง${label} ${cost} เบี้ยกรรม</button>`;
 const targets=w=>{const picked=w.serveTargets||[];return `<fieldset class="serve-targets"><legend>ส่งให้</legend><label><input type="checkbox" data-worker-queue="${esc(w.id)}" ${picked.length?'':'checked'} ${inside?'':'disabled'}> ตามคิว: ส่งให้คนที่หิวที่สุดก่อน</label>${recipients.map(c=>`<label><input type="checkbox" data-worker-target="${esc(w.id)}" value="${esc(c.id)}" ${picked.includes(c.id)?'checked':''} ${inside?'':'disabled'}> ${esc(c.name)}</label>`).join('')}</fieldset>`;};
 return `<div class="canteen-panel"><p class="canteen-status">พร้อมเสิร์ฟ ${state.meals}/6 · เสบียงกลาง ${Math.floor(game.food)} ห่อ</p><p>พ่อครัวปั้นข้าวอัตโนมัติทุก 3 วินาที ใช้เสบียง 1 ห่อ/ชุด · เมื่อเสบียงใกล้หมด ซื้อเพิ่มอัตโนมัติ 10 ห่อ (${BAL.foodPrice*10} เบี้ยกรรม) · คนเสิร์ฟเดินรับและส่งถึงตัว ยิ่งหลายคนยิ่งส่งได้เร็ว · ซื้อข้าวปั้นได้ที่พ่อค้าเท่านั้น · ดำและเพลิงกลับไปทำหน้าที่เดิม</p>
 <div class="canteen-hire">${hire('cook','พ่อครัว')}${hire('serve','คนเสิร์ฟ')}<small>${esc(why||`คนงาน ${zoneWorkers(game).length}/${WORKER_RULES.capacity} · ค่าจ้างเท่าที่โต๊ะนิรา`)}</small></div>
 ${zoneWorkers(game).map(w=>`<article class="worker-service-card"><b>${esc(w.name)}</b><label>หน้าที่ <select data-worker-mode="${esc(w.id)}" ${inside?'':'disabled'}>${Object.entries(WORKER_MODES).map(([k,v])=>`<option value="${k}" ${w.mode===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>${w.mode==='serve'?targets(w):''}</article>`).join('')||'<p>ยังไม่มีคนงาน · จ้างพ่อครัวหรือคนเสิร์ฟได้ที่นี่</p>'}</div>`;
}

