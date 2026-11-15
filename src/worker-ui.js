import {canteenState,mealRecipients} from './canteen.js';
import {WORKER_RULES,WORKER_MODES,zoneWorkers,workerHireCost,workerHireWhy,workerSheet,workerFrameRect} from './workers.js';
import {hireRank,recommendedHire} from './unlocks.js';
import {t} from './i18n.js';
import {BAL} from './data.js';
import {foremanDesk} from './foreman.js';
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
 const state=canteenState(game),recipients=mealRecipients(game).filter(c=>c.stamina==null),why=workerHireWhy(game),cost=workerHireCost(game),workers=zoneWorkers(game),full=workers.length>=WORKER_RULES.capacity;
 // FB2-11: a worker face from the same sheet the team page uses (no recolour) - the "ready to serve" count is the serving staff, the pantry is the rice ball
 const face=zone=>`<span class="team-face worker-face canteen-face" style="background-image:url('${esc(workerSheet(zone))}')" aria-hidden="true"></span>`;
 // QUEST-DAM-B: every word of the panel goes through t() (Rae 15 Nov, TH + EN); Dam's sentence is added only while he stands at the kitchen desk (his name is the zone's own)
 const hire=(mode,label)=>`<button class="gold" data-hire-worker-as="${mode}" ${inside&&!why?'':'disabled'}>${esc(t('canteen.hire',{role:label,cost}))}</button>`;
 const targets=w=>{const picked=w.serveTargets||[];return `<fieldset class="serve-targets"><legend>${esc(t('canteen.serveTo'))}</legend><label class="serve-queue"><input type="checkbox" data-worker-queue="${esc(w.id)}" ${picked.length?'':'checked'} ${inside?'':'disabled'}> ${esc(t('canteen.serveQueue'))}</label>${recipients.map(c=>`<label><input type="checkbox" data-worker-target="${esc(w.id)}" value="${esc(c.id)}" ${picked.includes(c.id)?'checked':''} ${inside?'':'disabled'}> ${esc(c.name)}</label>`).join('')}</fieldset>`;};
 const card=w=>`<article class="worker-service-card canteen-worker">${face(w.homeZone)}<div class="canteen-worker-body"><b>${esc(w.name)}</b><label class="canteen-duty">${esc(t('canteen.duty'))} <select data-worker-mode="${esc(w.id)}" ${inside?'':'disabled'}>${Object.entries(WORKER_MODES).map(([k,v])=>`<option value="${k}" ${w.mode===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label>${w.mode==='serve'?targets(w):''}</div></article>`;
 const desk=foremanDesk(game),help=t('canteen.help',{price:BAL.foodPrice*10})+(desk?' · '+t('canteen.help.foreman',{name:desk.crew.name}):'');
 return `<div class="canteen-panel"><div class="canteen-stats"><span class="canteen-stat" title="${esc(t('canteen.ready'))}">${face(game.zone)}<span>${esc(t('canteen.ready'))} <b>${state.meals}/6</b></span></span><span class="canteen-stat" title="${esc(t('canteen.pantry',{n:''}).replace(/\s+/g,' ').trim())}"><img class="canteen-food-icon" src="img/item-food.webp" alt=""><span>${esc(t('canteen.pantry',{n:'\u0001'})).replace('\u0001',`<b>${Math.floor(game.food)}</b>`)}</span></span></div><p class="canteen-help">${esc(help)}</p>
 ${full?'':`<div class="canteen-hire">${hire('cook',t('canteen.role.cook'))}${hire('serve',t('canteen.role.serve'))}<small>${esc(why||t('canteen.hire.note',{n:workers.length,max:WORKER_RULES.capacity}))}</small></div>`}
 <div class="canteen-workers">${workers.map(card).join('')||`<p>${esc(t('canteen.empty'))}</p>`}</div></div>`;
}
