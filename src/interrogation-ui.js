// Public courtroom presentation only. Never inspect hidden case facts or judge a preview.
import { traitForKeeper } from './interrogation.js';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor=color=>/^#[\da-f]{3,8}$/i.test(color||'')?color:'#d4a355';

export function mountInterrogationStyles(){
  if(typeof document==='undefined'||document.getElementById('interrogation-role-styles'))return;
  const link=document.createElement('link');link.id='interrogation-role-styles';link.rel='stylesheet';
  link.href=new URL('./interrogation-ui.css?v=20261022-p2-team',import.meta.url).href;document.head.appendChild(link);
}

/** P2: the trait lives on the spirit's name tag — icon first (never colour alone), colour second. */
export function spiritNameHtml(trait,name){
  const label=trait?`ลักษณะ: ${trait.label}`:'';
  return `<span class="nm spirit-name"${trait?` data-spirit-trait="${esc(trait.key)}" style="--trait-color:${safeColor(trait.color)}" aria-label="${esc(`${name} · ${label}`)}" title="${esc(label)}"`:''}>${trait?`<span class="trait-symbol" aria-hidden="true">${esc(trait.icon)}</span>`:''}<span class="spirit-name-text">${esc(name)}</span></span>`;
}

export function keeperCurrentJob(game,keeper){
  if(!keeper)return '';
  if(keeper.morale<=0||keeper.teaRest)return 'พักฟื้น';
  if(keeper.escort)return 'กำลังนำส่งวิญญาณ';
  if(keeper.buildK){const station=game.stations?.find(st=>st.def.k===keeper.buildK);return `${station?.repair?'กำลังซ่อม':'กำลังสร้าง'} ${station?.def.name||'อาคาร'}`;}
  if(keeper.at){const station=game.stations?.find(st=>st.def.k===keeper.at);return `ประจำ ${station?.def.name||'สถานี'}`;}
  return 'ว่าง · รอรับเวร';
}

/** Compact keeper picker for the interrogation page (the long explanations live in the handbook: keeperTeamGuide). */
export function keeperBarHtml(game,soul,selected,stationKey,artOf=()=>''){
  const candidates=(game.crew||[]).filter(c=>!c.reader&&!c.self);
  const workers=game.workers?.()||[],busy=workers.filter(w=>w.job).length;
  const notes=[];
  const chips=candidates.map(c=>{
    const info=game.keeperTrialInfo?.(soul,c,stationKey)||{};
    const block=stationKey?game.assignBlock?.(soul.id,stationKey,c.k):null;
    const why=block?.text||info.why||(block?'ยังรับหมายนี้ไม่ได้':'');
    const ok=info.available!==false&&!block,on=c.k===selected?.k,match=!!info.matching,suit=traitForKeeper(c.k);
    if(why)notes.push(`${c.name}: ${why}`);
    const tip=[c.name,match?'เหมาะกับลักษณะนี้':'',info.benefit,info.cost?`ภาระ: ${info.cost}`:'',why].filter(Boolean).join(' · ');
    return `<button type="button" class="keeper-chip${match?' is-trait-match':''}${on?' is-selected':''}" data-keeper-role="${esc(c.k)}" data-pickkey="cr" data-k="${esc(c.k)}"
      ${suit?`style="--trait-color:${safeColor(suit.color)}"`:''} ${ok?'':'disabled'} aria-pressed="${on}" title="${esc(tip)}"
      aria-label="${esc(`${c.name}${match?' · เหมาะกับลักษณะนี้':''}${why?' · '+why:''}`)}">
      ${artOf(c)?`<img src="${esc(artOf(c))}" alt="">`:''}<b>${esc(c.name||c.k)}</b>${suit?`<span class="keeper-chip-suit" aria-hidden="true">${esc(suit.icon)}</span>`:''}</button>`;
  }).join('');
  return `<section class="hud-card keeper-bar" aria-label="เลือกผู้คุม"><h4>เลือกผู้คุม <small>ดูผลดีและต้นทุนในคู่มือ</small></h4>
    <div class="keeper-bar-row" role="group">${chips||'<p class="hint">ยังไม่มียมทูตในสังกัด</p>'}</div>
    <p class="worker-impact">อสูรผู้ช่วยในโซน ${workers.length} คน · มีงานแล้ว ${busy} คน · ว่าง ${workers.length-busy} คน</p>
    ${notes.length?`<small class="keeper-role-why">${esc(notes.join(' · '))}</small>`:''}</section>`;
}

/** Texts by Rae. Prices come from game.kanClueCost(); disabled reasons come from game.kanClueWhy() (the fuller original set). */
export const KAN_BUTTON_COPY=Object.freeze({
  label:'ช่วยเปิดความจริง',
  ariaLabel:'ช่วยเปิดความจริง · กานต์เปิดข้อเท็จจริง 1 ประเด็น',
  tipLine1:'กานต์ช่วยเปิดข้อเท็จจริงที่ยังซ่อนอยู่ 1 ประเด็น อาจเป็นข้อกล่าวหา เหตุบรรเทาโทษ บุญที่แต่งขึ้น หรือความลับของคดี',
  tipPriceMp:'ใช้พลังเวท {mp} · กำลังใจกานต์ {morale} · พักพลัง {cooldownSeconds} วินาที',
  tipPriceInsight:'ใช้เบาะแสที่สะสม 1 ประเด็น · กำลังใจกานต์ {morale} · พักพลัง {cooldownSeconds} วินาที',
});
const fill=(text,v)=>text.replace(/\{(\w+)\}/g,(_,k)=>v[k]);
/** Round Kan icon beside Yama; only exists once Kan is hired. Pressing it does exactly what the old box button did. */
export function kanOrbHtml(game,soul,src='',result=''){
  if(!game.kanClueWhy)return '';
  if(game.crewOf&&!game.crewOf('kan'))return '';
  const why=game.kanClueWhy(soul),cost=game.kanClueCost?.()||{mp:4,morale:4,cooldownSeconds:30};
  const price=fill(cost.insight?KAN_BUTTON_COPY.tipPriceInsight:KAN_BUTTON_COPY.tipPriceMp,cost);
  return `<div class="kan-orb${why?' is-off':''}" data-kan-orb>
    <button type="button" class="kan-orb-btn" data-kan-clue ${why?'disabled':''} aria-label="${esc(KAN_BUTTON_COPY.ariaLabel+(why?' · '+why:''))}" aria-describedby="kan-orb-tip" title="${esc(KAN_BUTTON_COPY.tipLine1+'\n'+price+(why?'\n'+why:''))}">${src?`<img src="${esc(src)}" alt="" onerror="this.remove()">`:'🧿'}</button>
    <b class="kan-orb-label">${esc(KAN_BUTTON_COPY.label)}</b>
    <small class="keeper-role-why kan-orb-why" data-kan-clue-why ${why?'':'hidden'}>${esc(why)}</small>
    <span class="kan-orb-tip" id="kan-orb-tip" role="tooltip">${esc(KAN_BUTTON_COPY.tipLine1)}<br>${esc(price)}${why?`<br>${esc(why)}`:''}</span>
    ${result?`<span class="sr-only" role="status">${esc(result)}</span>`:''}</div>`;
}

export function bindKanClue(root,game,soul,onReveal){
  const button=root.querySelector('[data-kan-clue]');if(!button)return;
  button.onclick=()=>{
    if(game.kanClueWhy(soul))return;
    const clue=game.kanRevealClue(soul);if(clue)onReveal(clue);
  };
}

export function teamReportsHtml(game,limit=5){
  const reports=(game.teamReports||[]).filter(r=>!r.zone||r.zone===game.zone).slice(0,limit);
  if(!reports.length)return '';
  const unread=reports.filter(r=>!r.seen).length;
  return `<details class="team-reports" ${unread?'open':''}><summary>รายงานผลงานทีม${unread?` · ใหม่ ${unread}`:''}</summary>
    <p class="team-report-note">ผลหลังงานเสร็จ ไม่ตัดสินคดีหรือลงโทษซ้ำ</p>${reports.map(r=>`<article data-team-report="${esc(r.id)}" class="team-report${r.seen?' is-seen':''}">
      <b>${esc(r.keeperName)} · ${esc(r.soulName)}</b><p>${esc(r.summary)}</p>
      ${r.benefits?.length?`<ul>${r.benefits.map(line=>`<li>${esc(line)}</li>`).join('')}</ul>`:'<small>ไม่มีโบนัสเพิ่มเติมจากทีม</small>'}
      ${r.seen?'':`<button type="button" data-team-report-ack="${esc(r.id)}">อ่านแล้ว</button>`}</article>`).join('')}</details>`;
}

export function bindTeamReports(root,game,onChange){
  root.querySelectorAll('[data-team-report-ack]').forEach(button=>button.onclick=()=>{
    const report=game.teamReports?.find(r=>String(r.id)===button.dataset.teamReportAck);
    if(report&&game.acknowledgeTeamReport(report.id))onChange?.();
  });
}

/** UI dismissal is deliberately separate from judgment, payment and sanctions. */
export function onceFeedbackDismiss(onDismiss){
  let done=false;
  return ()=>{if(done)return false;done=true;onDismiss();return true;};
}

export function pressReaction(game,soul,line){
 if(!line||line.used||line.kind==='solid'||soul.presses<=0)return null;
 const revealed=(game.pressDeeds(soul,line)||[]).filter(d=>!d.known);
 return revealed.some(d=>d.w<0)&&!revealed.some(d=>d.w>0)?'relief':'fear';
}
