import {CREW,ZONES,crewName} from './data.js';
import {saveSlotSummary} from './save-slots.js';
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function formatPlayTime(ms) {
  const s=Math.floor(Math.max(0,Number(ms)||0)/1000),h=Math.floor(s/3600),m=Math.floor(s%3600/60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
}
const labels = en => en?{title:'SELECT SLOT',back:'Back',time:'Play time',money:'Coins',order:'Order',karma:'Karma',zone:'Zone',crew:'Crew',continue:'Continue',partial:'Since update',invalid:'Save unavailable — data retained',none:'None',error:'Unable to save. Your existing data has been retained.',remove:'Delete save',removeTitle:'Delete this save?',removeWarn:'Deleted saves cannot be recovered.',cancel:'Cancel',removeDone:'deleted',savedAt:'Last saved'}:{title:'เลือกช่องบันทึก',back:'กลับ',time:'เวลาเล่น',money:'เบี้ยกรรม',order:'ระเบียบ',karma:'บาป',zone:'โซน',crew:'ยมทูต',continue:'เล่นต่อ',partial:'เริ่มนับหลังอัปเดต',invalid:'เปิดข้อมูลไม่ได้ — เก็บข้อมูลเดิมไว้',none:'ยังไม่มี',error:'บันทึกไม่ได้ ข้อมูลเดิมยังเก็บไว้ครบ',remove:'ลบบันทึก',removeTitle:'ลบบันทึกนี้?',removeWarn:'ลบแล้วกู้คืนไม่ได้',cancel:'ยกเลิก',removeDone:'ถูกลบแล้ว',savedAt:'บันทึกล่าสุด'};
export function slotMenuError(lang='th'){return labels(lang==='en').error;}
export const slotDeletedNote=(id,lang='th')=>`SLOT ${id} ${labels(lang==='en').removeDone}`;
/** FB2-17: confirmation shown over the slot list before a save is deleted - names the slot and what is in it; cancel is the default focus */
export function saveSlotConfirmHtml(slot,{lang='th'}={}) {
  const en=lang==='en',l=labels(en),summary=saveSlotSummary(slot.data),zoneName=k=>ZONES.find(z=>z.k===k)?.name||k;
  const when=summary?.savedAt?new Date(summary.savedAt).toLocaleString(en?'en-GB':'th-TH',{dateStyle:'medium',timeStyle:'short'}):'';
  const detail=summary?[`${l.time} ${formatPlayTime(summary.playTimeMs)}`,zoneName(summary.zone),`${l.money} ${Math.floor(summary.coin).toLocaleString(en?'en-US':'th-TH')}`,when?`${l.savedAt} ${when}`:''].filter(Boolean).join(' · '):'';
  return `<div class="save-slot-confirm" role="alertdialog" aria-modal="true" aria-labelledby="slot-confirm-title" aria-describedby="slot-confirm-desc"><div class="save-slot-confirm-box">
    <h3 id="slot-confirm-title">${l.removeTitle}</h3><p class="save-slot-confirm-slot"><b>SLOT ${slot.id}</b></p><p class="save-slot-confirm-detail">${esc(detail)}</p>
    <p class="save-slot-confirm-warn" id="slot-confirm-desc">${l.removeWarn}</p>
    <div class="save-slot-confirm-actions"><button type="button" class="save-slot-cancel" data-slot-cancel autofocus>${l.cancel}</button><button type="button" class="save-slot-danger" data-slot-confirm="${slot.id}">${l.remove}</button></div></div></div>`;
}
// Explicit existing assets keep menu portraits independent of the active game's art zone.
export function slotPortraitArt(kind,zone) {
  if(zone==='th')return {src:`img/crew-${kind}-profile.webp`,crop:false};
  const root={asia:'Asia',west:'West',cyberhell:'CyberHell'}[zone]||'Asia';
  if(kind==='guard'&&zone!=='asia')return {src:`img/${root}/crew-guard-${zone}-cutscene.webp`,crop:true};
  const fixed=kind==='boon'&&zone==='west'?'-f':'';
  return {src:`img/${root}/crew-${kind}-${zone}-profile${fixed}.webp`,crop:false};
}
export function saveSlotMenuHtml(slots,{lang='th',message=''}={}) {
  const en=lang==='en',l=labels(en),zoneName=k=>ZONES.find(z=>z.k===k)?.name||k;
  return `<header class="save-slot-head"><h2>${l.title}</h2><button type="button" data-slot-back aria-label="${l.back}">✕</button></header>
  <p class="save-slot-message" role="status" aria-live="polite">${esc(message)}</p><div class="save-slot-list">${slots.map(slot=>{
    const summary=saveSlotSummary(slot.data),disabled=!['empty','occupied'].includes(slot.status);
    if(!summary)return `<button type="button" class="save-slot-card is-empty" data-save-slot="${slot.id}" ${disabled?'disabled':''}><span class="save-slot-number">SLOT ${slot.id}</span><strong>${disabled?l.invalid:'New Game'}</strong>${disabled?'':`<span class="save-slot-arrow" aria-hidden="true">▶</span>`}</button>`;
    const crew=summary.actors.filter(a=>a.zone===summary.zone||a.kind==='nira'&&a.zone==='global').map(a=>{
      const zone=a.zone==='global'?summary.zone:a.zone,def=CREW.find(c=>c.k===a.kind);
      const name=a.kind==='guard'?({th:'กุมภัณฑ์',asia:'เมซุ',west:'มูนิน',cyberhell:'ไฟร์วอลล์'}[zone]||'ยักษ์ทวารบาล'):def?crewName(def,zone):a.kind;
      const art=slotPortraitArt(a.kind,zone);
      return `<span class="save-slot-portrait${art.crop?' is-scene-crop':''}" title="${esc(name)}"><img src="${esc(art.src)}" alt="${esc(name)}" data-crew-id="${esc(a.id)}" data-crew-zone="${esc(zone)}" decoding="sync"></span>`;
    });
    const icons={[l.money]:'coin',[l.order]:'justice',[l.karma]:'skull'};
    const field=(name,value)=>`<span class="save-slot-stat${icons[name]?' has-icon':''}"${icons[name]?` title="${esc(name)}"`:''}>${icons[name]?`<img src="img/ui/icon-${icons[name]}.webp" alt="${esc(name)}">`:`<small>${name}</small>`}<b>${esc(value)}</b></span>`;
    return `<div class="save-slot-item"><button type="button" class="save-slot-card" data-save-slot="${slot.id}"><span class="save-slot-card-top"><span class="save-slot-number">SLOT ${slot.id}</span><strong>${l.continue}</strong><span class="save-slot-arrow" aria-hidden="true">▶</span></span>
      <span class="save-slot-stats">${field(l.time,formatPlayTime(summary.playTimeMs))}${field(l.zone,zoneName(summary.zone))}${field(l.money,Math.floor(summary.coin).toLocaleString(en?'en-US':'th-TH'))}${field(l.order,Math.round(summary.order))}${field(l.karma,Math.round(summary.karma))}</span>
      ${summary.playTimePartial?`<small class="save-slot-partial">${l.partial}</small>`:''}<span class="save-slot-crew"><small>${l.crew}</small><span class="save-slot-portraits">${crew.join('')||`<span>${l.none}</span>`}</span></span></button><button type="button" class="save-slot-trash" data-slot-delete="${slot.id}" aria-label="${l.remove} SLOT ${slot.id}" title="${l.remove}"><img src="img/ui/icon-trash.webp" alt=""></button></div>`;
  }).join('')}</div>`;
}
