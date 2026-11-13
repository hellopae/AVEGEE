import {QUESTS,questState,questTarget,questUnlocked,questsForActor} from './side-quests.js';
import {activeQuestEntries} from './quest-journal.js';
import {ZONES,ITEMS} from './data.js';
import {questRewardPreview} from './quest-rewards.js';
import {COMBAT_SKILLS} from './combat-skills.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const zoneName=z=>ZONES.find(x=>x.k===z)?.name||z;
// QUEST-REWARDS: one line for the journal — the tier bonus is known in advance, a move not yet learned shows as ???
export function questRewardText(g,q){
 const p=questRewardPreview(g,q);if(!p)return '';
 const parts=[`เบี้ยกรรม +${p.coin}`,...p.items.map(i=>`${i.name} ×${i.n}`)];
 if(p.skill)parts.push(`ท่าไม้ตายใหม่ ${p.skill.known?p.skill.name:'???'}`);
 return `ระดับ${p.label}${p.fight?' · ต้องสู้ก่อนปิดภารกิจ':''} · โบนัส ${parts.join(' · ')} · ยังได้ของตามทางที่เลือกอีก`;
}
// what the closing paid, as plain text (journal of a finished quest)
export function questReceiptText(q,s){
 const r=s?.reward;if(!r)return '';
 const parts=[];if(r.coin)parts.push(`เบี้ยกรรม ${r.coin>0?'+':''}${r.coin}`);if(r.exp)parts.push(`EXP +${r.exp}`);
 for(const[k,n]of Object.entries(r.items||{}))if(n>0)parts.push(`${ITEMS[k]?.name||k} ×${n}`);
 if(r.skill)parts.push(`ท่าไม้ตายใหม่ ${COMBAT_SKILLS[r.skill]?.name||''}`);
 return parts.join(' · ');
}
export function questOwnerButtonHtml(g,npc){
 const quests=questsForActor(g,npc);if(!quests.length)return '';
 return `<button type="button" class="quest-owner-button" data-quest-owner="${esc(npc)}">${quests.length===1?'ภารกิจ · '+esc(quests[0].title):'ภารกิจ ('+quests.length+')'}</button>`;
}
export function questTrackerHtml(g,selectedId=''){
 const entries=activeQuestEntries(g);if(!entries.length)return '';
 const entry=entries.find(e=>e.id===selectedId)||entries[0];
 return `<div class="quest-tracker-heading"><b>ภารกิจที่กำลังทำ</b><span>${entries.length}</span></div><button type="button" data-tracker-entry="${esc(entry.id)}"><strong>${esc(entry.title)}</strong><span>${entry.paused?'ดำเนินต่อได้หลังเหตุการณ์หลักจบ':esc(entry.objective)}</span><small>${esc(zoneName(entry.zone))} · ${esc(entry.name)}</small></button><button type="button" data-tracker-journal>ดูภารกิจทั้งหมด</button>`;
}
export function questJournalHtml(g,selectedId=''){
 const active=activeQuestEntries(g),available=QUESTS.filter(q=>questUnlocked(g,q)&&questState(g,q.id).step===0&&!questState(g,q.id).done),done=QUESTS.filter(q=>questState(g,q.id).done);
 const effectiveId=active.some(e=>e.id===selectedId)?selectedId:active[0]?.id;
 const questRewardLine=(g,q,status)=>{const text=status==='เสร็จแล้ว'?(questReceiptText(q,questState(g,q.id))?'ได้รับแล้ว: '+questReceiptText(q,questState(g,q.id)):''):questRewardText(g,q);return text?`<p class="quest-reward-line">${esc(text)}</p>`:'';};
 const card=(q,status,objective,track=false)=>{const target=questTarget(g,q);return `<article class="quest-journal-card" data-journal-id="${esc(q.id)}"><h3>${esc(q.title)}</h3><p>${esc(status)} · ${esc(zoneName(target.zone))} · ${esc(target.name)}</p><p>${esc(objective)}</p>${questRewardLine(g,q,status)}<div class="row"><button type="button" data-journal-quest="${esc(q.id)}">${status==='เสร็จแล้ว'?'อ่านบันทึก':'ดูรายละเอียด'}</button>${track?`<button type="button" data-track-quest="${esc(q.id)}" aria-pressed="${q.id===effectiveId}">${q.id===effectiveId?'กำลังติดตาม':'ติดตาม'}</button>`:''}</div></article>`;};
 return `<section class="quest-book"><h2>ภารกิจ</h2><p>รับเรื่องจากเจ้าของภารกิจเมื่อเดินไปคุยด้วย งานที่รับแล้วบันทึกต่อในช่องเซฟเดิม</p><section data-quest-group="active"><h3>กำลังทำ (${active.length})</h3>${active.length?active.map(e=>card(QUESTS.find(q=>q.id===e.id),e.paused?'พักระหว่างเหตุการณ์หลัก':'รับแล้ว',e.objective,true)).join(''):'<p>ยังไม่มีภารกิจที่รับไว้</p>'}</section><section data-quest-group="available"><h3>พร้อมให้ไปคุย (${available.length})</h3>${available.length?available.map(q=>card(q,'ยังไม่ได้รับ','เดินไปคุยกับเจ้าของภารกิจเพื่อรับเรื่อง')).join(''):'<p>ยังไม่มีเรื่องใหม่ที่พร้อมให้รับ</p>'}</section><section data-quest-group="done"><h3>เสร็จแล้ว (${done.length})</h3>${done.length?done.map(q=>card(q,'เสร็จแล้ว','ปิดเรื่องและรับรางวัลแล้ว')).join(''):'<p>ยังไม่มีภารกิจที่ปิดแล้ว</p>'}</section></section>`;
}

// A rendered conversation can advance exactly one quest step, even if its old callback fires again.
export function createQuestAction(g,id,expectedStep){
 let busy=false,finished=false;
 return choice=>{
  if(busy||finished||questState(g,id).step!==expectedStep)return false;busy=true;
  try{const ok=g.advanceQuest(id,choice);if(ok)finished=true;return ok;}finally{busy=false;}
 };
}
