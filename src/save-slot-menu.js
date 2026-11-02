import {CREW,ZONES,crewName} from './data.js';
import {saveSlotSummary} from './save-slots.js';
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatPlayTime(ms) {
  const s=Math.floor(Math.max(0,Number(ms)||0)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
const labels = en => en?{title:'SELECT SLOT',back:'Back',time:'Play time',money:'Coins',order:'Order',karma:'Karma',zone:'Zone',crew:'Crew',continue:'Continue',partial:'Since update',invalid:'Save unavailable — data retained',none:'None',error:'Unable to save. Your existing data has been retained.'}:{title:'เลือกช่องบันทึก',back:'กลับ',time:'เวลาเล่น',money:'เบี้ยกรรม',order:'ระเบียบ',karma:'บาป',zone:'โซน',crew:'ยมทูต',continue:'เล่นต่อ',partial:'เริ่มนับหลังอัปเดต',invalid:'เปิดข้อมูลไม่ได้ — เก็บข้อมูลเดิมไว้',none:'ยังไม่มี',error:'บันทึกไม่ได้ ข้อมูลเดิมยังเก็บไว้ครบ'};
export function slotMenuError(lang='th'){return labels(lang==='en').error;}
export function saveSlotMenuHtml(slots,{lang='th',message=''}={}) {
  const en=lang==='en',l=labels(en),zoneName=k=>ZONES.find(z=>z.k===k)?.name||k;
  return `<header class="save-slot-head"><h2>${l.title}</h2><button type="button" data-slot-back aria-label="${l.back}">✕</button></header>
  <p class="save-slot-message" role="status" aria-live="polite">${esc(message)}</p><div class="save-slot-list">${slots.map(slot=>{
    const summary=saveSlotSummary(slot.data),disabled=!['empty','occupied'].includes(slot.status);
    if(!summary)return `<button type="button" class="save-slot-card is-empty" data-save-slot="${slot.id}" ${disabled?'disabled':''}><span class="save-slot-number">SLOT ${slot.id}</span><strong>${disabled?l.invalid:'New Game'}</strong>${disabled?'':`<span class="save-slot-arrow" aria-hidden="true">▶</span>`}</button>`;
    const crew=summary.actors.map(a=>{const def=CREW.find(c=>c.k===a.kind);const name=a.kind==='guard'?({th:'กุมภัณฑ์',asia:'เมซุ',west:'มูนิน',cyberhell:'ไฟร์วอลล์'}[a.zone]||'ยักษ์ทวารบาล'):def?crewName(def,a.zone==='global'?summary.zone:a.zone):a.kind;return name+(a.zone!=='global'&&a.zone!==summary.zone?` (${zoneName(a.zone)})`:'');});
    const field=(name,value)=>`<span class="save-slot-stat"><small>${name}</small><b>${esc(value)}</b></span>`;
    return `<button type="button" class="save-slot-card" data-save-slot="${slot.id}"><span class="save-slot-card-top"><span class="save-slot-number">SLOT ${slot.id}</span><strong>${l.continue}</strong><span class="save-slot-arrow" aria-hidden="true">▶</span></span>
      <span class="save-slot-stats">${field(l.time,formatPlayTime(summary.playTimeMs))}${field(l.money,Math.floor(summary.coin).toLocaleString(en?'en-US':'th-TH'))}${field(l.order,Math.round(summary.order))}${field(l.karma,Math.round(summary.karma))}${field(l.zone,zoneName(summary.zone))}</span>
      ${summary.playTimePartial?`<small class="save-slot-partial">${l.partial}</small>`:''}<span class="save-slot-crew"><small>${l.crew}</small><span>${esc(crew.join(' · ')||l.none)}</span></span></button>`;
  }).join('')}</div>`;
}
