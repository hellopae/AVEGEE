import {GUARD} from './data.js';
import {actorStanding} from './actor-recovery.js';
import {WORKER_MODES,workerSheet} from './workers.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pct=v=>Math.max(0,Math.min(100,Math.round(v??100)));
export function teamStatus(g,a,worker=false){
 const hp=pct(a.morale),hunger=pct(worker&&a.supplyRest?0:a.hunger);
 let duty='ว่าง';
 if(worker){
  const j=a.job;
  duty=a.teaRest?'พักศาลาน้ำชา':a.supplyRest?'รอข้าวปั้น':a.mode==='rest'||a.resting||a.recovering?'นั่งพัก':j?.kind==='escort'?'รับส่งวิญญาณ':j?.kind==='food'?(j.phase==='pickup'?'รับอาหาร':'แจกอาหาร'):j?.kind==='gather'?(j.phase==='sell'?'นำของไปขาย':j.material==='dabShards'?'เก็บเศษดาบ':'เก็บกิ่งงิ้ว'):j?.kind==='build'?'ช่วยสร้างอาคาร':j?.kind==='repair'?'ช่วยซ่อมอาคาร':'รอรับงาน';
 }else{
  const st=g.stations.find(s=>s.def.k===(a.buildK||a.at));
  duty=a.teaRest?'พักศาลาน้ำชา':!actorStanding(a)?'พักฟื้น':a.escort?'รับส่งวิญญาณ':a.buildK?(st?.repair?'ซ่อม/ตรวจงาน':'สร้าง/ตรวจงาน'):a.at?'คุม '+(st?.def.name||'สถานี'):a.cook?'พ่อครัวโรงอาหาร':a.reader?'ดูแลสำนวน':a.k==='guard'?'เฝ้าประตู':'ว่าง';
 }
 return {hp,hunger,duty,starved:hunger===0,busy:worker?!!(a.job||a.resting||a.mode==='rest'||a.supplyRest||a.teaRest):!!(!actorStanding(a)||a.at||a.buildK||a.escort||a.cook)};
}
export function teamMembers(g){return [...(g.workers?.()||[]).map(a=>({a,worker:true})),...g.crew.filter(a=>!a.self).map(a=>({a,worker:false})),...(g.guard?[{a:{...g.guard,name:g.guard.name||GUARD.name},worker:false}]:[])];}
const portrait=(a,worker,art)=>worker?`<span class="team-face worker-face" style="background-image:url('${esc(workerSheet(a.homeZone))}')"></span>`:`<img class="team-face" src="${esc(art(a))}" alt="">`;
const bars=(s)=>`<span class="team-meter hp" role="meter" aria-label="HP" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.hp}"><i style="width:${s.hp}%"></i></span><span class="team-meter hunger" role="meter" aria-label="ความอิ่ม" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${s.hunger}"><i style="width:${s.hunger}%"></i></span>`;
export function teamHudHtml(g,art){
 const members=teamMembers(g),hungry=members.some(({a,worker})=>teamStatus(g,a,worker).starved);
 return `<div class="team-hud-tools"><button type="button" data-team-food aria-label="เสบียงกลาง ${Math.round(g.food)} ห่อ"><img src="img/item-food.png" alt=""><b>${Math.round(g.food)}</b></button><button type="button" data-team-manage>จัดทีม</button></div>${g.food<=0||hungry?'<button type="button" class="team-alert" data-team-manage>เสบียงหมด / หิว · ให้ข้าวปั้นหรือพักศาลาน้ำชา</button>':''}<div class="team-hud-roster" role="group" aria-label="ทีมประจำโซน">${members.map(({a,worker})=>{
 const s=teamStatus(g,a,worker);
 return `<button type="button" class="team-member${s.busy?' is-busy':''}${s.starved?' is-starved':''}" data-team-actor="${esc(a.id)}" aria-label="${esc(a.name)} · HP ${s.hp}/100 · ความอิ่ม ${s.hunger}/100 · ${esc(s.duty)}" title="${esc(a.name+' · '+s.duty)}">${portrait(a,worker,art)}<b>${esc(a.name)}</b>${bars(s)}<small>${esc(s.duty)}</small></button>`;
 }).join('')}</div>`;
}
export function teamManageHtml(g,art,selected=''){
 const members=teamMembers(g),tea=g.stations.some(s=>s.def.k==='tea'&&!s.build&&!s.repair),final=g.finalTeamSelection?.(),party=(final?g.party?.finalMembers:g.party?.members)||[],max=g.partyMax();
 return `<h2>จัดทีมประจำโซน</h2><p class="hint">ทีมต่อสู้ ${party.length}/${max} คน · จ้างบุคลากรเพิ่มได้ที่นิรา</p><div class="team-manage-grid">${members.map(({a,worker})=>{
 const s=teamStatus(g,a,worker),food=Object.keys(g.inventory).find(k=>/^food(Z[234])?$/.test(k)&&g.inventory[k]>0)||'food';
 const canFeed=worker?(g.inventory.food||0)>0&&(s.hunger<100||a.supplyRest||a.stamina<100||s.hp<100):!a.reader&&actorStanding(a)&&(g.inventory[food]||0)>0&&s.hunger<100;
 const canRest=worker?tea&&!a.teaRest:tea&&!a.reader&&actorStanding(a)&&(s.hp<100||s.hunger<100);
 return `<article class="team-manage-card${a.id===selected?' is-selected':''}" data-team-card="${esc(a.id)}">${portrait(a,worker,art)}<div><h3>${esc(a.name)}</h3><p>${esc(s.duty)}</p>${bars(s)}<small>HP ${s.hp}/100 · ความอิ่ม ${s.hunger}/100</small></div><div class="team-member-actions"><button data-team-feed="${esc(a.id)}" data-food="${worker?'food':food}" ${canFeed?'':'disabled'}>ให้ข้าวปั้น</button><button data-team-rest="${esc(a.id)}" ${canRest?'':'disabled'}>พักศาลาน้ำชา</button>${worker?`<label>หน้าที่ <select data-team-mode="${esc(a.id)}">${Object.entries(WORKER_MODES).map(([k,v])=>`<option value="${k}" ${k===a.mode?'selected':''}>${esc(v)}</option>`).join('')}</select></label>`:a.k!=='guard'?`<button data-team-party="${esc(final?a.id:a.k)}" aria-pressed="${party.includes(final?a.id:a.k)}">${party.includes(final?a.id:a.k)?'ออกจากทีมต่อสู้':'เข้าทีมต่อสู้'}</button>`:''}</div></article>`;
 }).join('')}</div><p class="hint">ให้ข้าวปั้นใช้ของในกระเป๋า · ความอิ่มเต็มจึงไม่ต้องให้อีก · ผู้ที่กำลังทำงานแสดงรูปจาง</p><button class="gold" data-close>เสร็จแล้ว</button>`;
}
