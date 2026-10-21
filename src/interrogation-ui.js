// Public courtroom presentation only. Never inspect hidden case facts or judge a preview.
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeColor=color=>/^#[\da-f]{3,8}$/i.test(color||'')?color:'#d4a355';

export function mountInterrogationStyles(){
  if(typeof document==='undefined'||document.getElementById('interrogation-role-styles'))return;
  const link=document.createElement('link');link.id='interrogation-role-styles';link.rel='stylesheet';
  link.href=new URL('./interrogation-ui.css?v=20261021-interrogation-roles',import.meta.url).href;document.head.appendChild(link);
}

export function spiritTraitHtml(trait){
  if(!trait)return '';
  return `<div class="spirit-trait" data-spirit-trait="${esc(trait.key)}" style="--trait-color:${safeColor(trait.color)}" role="status" aria-live="polite">
    <span class="trait-symbol" aria-hidden="true">${esc(trait.icon)}</span><span><small>ลักษณะวิญญาณ</small><b>${esc(trait.label)}</b></span></div>
    <p class="trait-explanation">ลักษณะนี้บอกพฤติกรรม ไม่ได้บอกน้ำหนักกรรมหรือระดับทัณฑ์</p>`;
}

export function keeperCurrentJob(game,keeper){
  if(!keeper)return '';
  if(keeper.morale<=0||keeper.teaRest)return 'พักฟื้น';
  if(keeper.escort)return 'กำลังนำส่งวิญญาณ';
  if(keeper.buildK){const station=game.stations?.find(st=>st.def.k===keeper.buildK);return `${station?.repair?'กำลังซ่อม':'กำลังสร้าง'} ${station?.def.name||'อาคาร'}`;}
  if(keeper.at){const station=game.stations?.find(st=>st.def.k===keeper.at);return `ประจำ ${station?.def.name||'สถานี'}`;}
  return 'ว่าง · รอรับเวร';
}

export function keeperRoleHtml(game,soul,keeper,stationKey,{selected=false,choose=false}={}){
  const info=game.keeperTrialInfo?.(soul,keeper,stationKey);if(!info)return '';
  const trait=game.spiritTrait?.(soul),matching=!!info.matching;
  const block=stationKey?game.assignBlock?.(soul.id,stationKey,keeper.k):null;
  const why=block?.text||info.why||(block?'ยังรับหมายนี้ไม่ได้':'');
  const available=info.available!==false&&!block;
  return `<article class="keeper-role-card${matching?' is-trait-match':''}${selected?' is-selected':''}" data-keeper-role="${esc(keeper.k)}" style="--trait-color:${safeColor(trait?.color)}">
    <div class="keeper-role-heading"><b>${esc(keeper.name||keeper.k)}</b><span>${matching?'เหมาะกับลักษณะนี้':'คุมได้ตามปกติ'}</span></div>
    <p class="keeper-role-benefit">${esc(info.benefit)}</p><p class="keeper-role-cost"><b>ภาระและต้นทุน:</b> ${esc(info.cost)}</p>
    <small>งานปัจจุบัน: ${esc(keeperCurrentJob(game,keeper))}</small>${why?`<small class="keeper-role-why">${esc(why)}</small>`:''}
    ${choose?`<button type="button" data-pickkey="cr" data-k="${esc(keeper.k)}" ${available?'':'disabled'} aria-pressed="${selected}">${selected?'✓ เลือกแล้ว':`เลือก ${esc(keeper.name||keeper.k)}`}</button>`:''}</article>`;
}

export function keeperImpactHtml(game,soul,keeper,stationKey){
  const workers=game.workers?.()||[],busy=workers.filter(w=>w.job).length;
  const candidates=(game.crew||[]).filter(c=>!c.reader&&!c.self);
  return `<section class="hud-card keeper-impact"><h4>ผลของทีมดูแลคดี</h4>
    <p class="keeper-impact-rule">สถานที่และระดับทัณฑ์ตัดสินความยุติธรรม · ผู้คุมช่วยให้งานดำเนินต่างกัน</p>
    ${keeper?keeperRoleHtml(game,soul,keeper,stationKey,{selected:true}):'<p class="hint">เลือกผู้คุมเพื่อดูประโยชน์ ต้นทุน และภาระก่อนออกหมาย</p>'}
    <p class="worker-impact">อสูรผู้ช่วยในโซน ${workers.length} คน · มีงานแล้ว ${busy} คน · ว่าง ${workers.length-busy} คน<br>คนงานหนึ่งคนทำได้ทีละงาน เมื่อย้ายมาช่วยสถานีจะหยุดงานเดิม</p>
    <details class="keeper-role-roster"><summary>หน้าที่และต้นทุนของผู้คุมทั้งหมด</summary>
      <div>${candidates.map(c=>keeperRoleHtml(game,soul,c,stationKey,{selected:c.k===keeper?.k,choose:true})).join('')||'<p>ยังไม่มียมทูตในสังกัด</p>'}</div></details></section>`;
}

export function kanClueHtml(game,soul,result=''){
  if(!game.kanClueWhy)return '';
  const why=game.kanClueWhy(soul),cost=game.kanClueCost?.()||{mp:4,morale:4,cooldownSeconds:30};
  const price=`${cost.insight?'ใช้เบาะแสที่สะสม 1 ประเด็น':`ใช้ MP ${cost.mp}`} · กำลังใจ ${cost.morale} · พักพลัง ${cost.cooldownSeconds} วินาที`;
  return `<section class="hud-card kan-clue"><h4>กานต์ · เปิดความจริงทีละประเด็น</h4>
    <p>ช่วยเปิดข้อเท็จจริงที่ยังไม่เปิดเผย 1 ประเด็น อาจเป็นทั้งข้อกล่าวหาหรือเหตุบรรเทาโทษ</p>
    <button type="button" data-kan-clue ${why?'disabled':''}>ขอเบาะแส 1 ประเด็น</button><small class="kan-clue-cost">${esc(price)}</small>
    <small class="keeper-role-why" data-kan-clue-why ${why?'':'hidden'}>${esc(why)}</small>${result?`<p class="kan-clue-result" role="status">${esc(result)}</p>`:''}</section>`;
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
