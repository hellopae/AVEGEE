import {INTENSITY_NAME as INTENSITY} from './data.js';
import {bossJusticeCase,bossJusticeStations,bossJusticeCrew,bossJusticeAnswer,interrogateBoss,mirrorBoss,sentenceBoss} from './boss-justice.js';

export const FINAL_BOUND_SPRITE='img/boss-justice/final-bound-sprite-v1.webp';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const image=(src,alt='')=>`<img src="${esc(src)}" alt="${esc(alt)}">`;

/** The final docket uses the ordinary trial arena and command styles, not an ordinary soul queue. */
export function finalCourtModel(g) {
  const c=bossJusticeCase(g);if(!c?.final)return null;
  const stations=bossJusticeStations(g),crew=bossJusticeCrew(g),answer=bossJusticeAnswer(g),p=c.pick;
  const ready=c.phase==='trial'&&c.asked&&c.mirror&&p.station===answer.station&&p.crew===answer.crew&&p.intensity===5;
  return {c,stations,crew,answer,ready};
}

export function finalCourtMarkup(g,{panel=null,prompt=false,assets}) {
  const m=finalCourtModel(g);if(!m)return '';
  const {c,stations,crew,answer,ready}=m,p=c.pick,shown=c.mirror;
  const station=stations.find(s=>s.def.k===p.station),keeper=crew.find(v=>v.k===p.crew);
  const answerStation=stations.find(s=>s.def.k===answer.station),answerKeeper=crew.find(v=>v.k===answer.crew);
  const choice=({kind,key,label,src,revealed=false,selected=false})=>`<button type="button" class="orb-choice${revealed?' is-revealed':''}" data-justice-choice="${kind}" data-value="${esc(key)}" aria-pressed="${selected}" aria-label="${esc(label+(revealed?' · กระจกเฉลย':''))}">${image(src)}<b>${esc(label)}</b>${revealed?'<span class="reveal-mark" aria-hidden="true">✓</span>':''}</button>`;
  const groups=[
    {id:'power',label:'พลัง',picked:shown?'กระจกวิเศษ ✓':'',choices:`<button type="button" class="orb-choice${shown?' is-revealed':''}" data-justice-mirror ${shown?'disabled':''}>${image('img/item-mirror.png')}<b>กระจกวิเศษ</b><i>${shown?'ใช้แล้ว':'จำเป็น'}</i></button>`},
    {id:'where',label:'ที่ไหน',picked:station?.def.name,choices:stations.map(s=>choice({kind:'station',key:s.def.k,label:s.def.name,src:assets.station(s.def.k),revealed:shown&&s.def.k===answer.station,selected:p.station===s.def.k})).join('')},
    {id:'keeper',label:'ใครคุม',picked:keeper?.name,choices:crew.map(v=>choice({kind:'crew',key:v.k,label:v.name,src:assets.crew(v.k),revealed:shown&&v.k===answer.crew,selected:p.crew===v.k})).join('')},
    {id:'force',label:'ความแรง',picked:INTENSITY[p.intensity],choices:[1,2,3,4,5].map(n=>choice({kind:'intensity',key:n,label:INTENSITY[n],src:`img/icon-force-${n}.png`,revealed:shown&&n===5,selected:p.intensity===n})).join('')},
  ];
  const guidance=!shown?'เลือก พลัง → กระจกวิเศษ เพื่อเปิดเผยคำตัดสินคดีสุดท้าย':ready?'เลือกครบตามกระจกแล้ว · ออกหมายได้':'เลือก ที่ไหน ใครคุม และความแรง ตามตัวเลือกที่มีเครื่องหมาย ✓';
  const hp=Math.round(g.hp),max=g.hpMax,mp=Math.round(g.mp),mpMax=g.mpMax;
  return `<div class="hud trial-hud trial-comment8 final-boss-court" data-justice-phase="${esc(c.phase)}" style="background-image:url('${esc(assets.background)}')">
    <div class="cam-world" style="background-image:url('${esc(assets.background)}')"><div class="hud-stage cam-stage-box">
      <div class="fig you" data-cam="you">${image(assets.hero,'ยามา')}<span class="nm">ยามา</span></div>
      <div class="fig foe bound-boss" data-cam="suspect">${image(FINAL_BOUND_SPRITE,`${c.name} แพ้แล้วและถูกจับมัด`)}<span class="nm">${esc(c.name)} · ถูกพันธนาการ</span></div>
    </div></div><div class="hud-scrim"></div>
    <span class="corner-tick tl"></span><span class="corner-tick tr"></span><span class="corner-tick bl"></span><span class="corner-tick br"></span>
    <div class="top-left-icons"><button class="trial-pause" data-justice-pause aria-label="หยุด">${image('img/ui/icon-pause.png')}</button><button class="icon-settings-mini" data-arena-settings aria-label="ตั้งค่า">${image('img/ui/icon-setting2.png')}</button></div>
    <button class="trial-close" data-close aria-label="ปิด · บันทึกคดีไว้">${image('img/ui/icon-close.png')}</button>
    <div class="hud-body"><div class="hud-stage"><span class="trial-case-no">สำนวน · บอสโซน 4</span>
      <section class="comment8-menu" aria-label="คำสั่งออกหมาย"><div class="comment8-commands">
        ${groups.map((v,i)=>`<button type="button" class="court-command${v.picked?' has-selection':''}" data-court-panel="${v.id}" aria-expanded="${panel===v.id}" style="--command-index:${i}" ${!shown&&v.id!=='power'?'disabled':''}><span>${v.label}</span>${v.picked?`<span class="court-picked"><b>${esc(v.picked)}</b></span>`:''}</button>`).join('')}
        <button type="button" id="justice-sentence" class="court-command court-issue${ready?' ready':''}" style="--command-index:4" ${ready?'':'disabled'}>ออกหมาย</button></div>
        ${groups.map(v=>`<div class="court-options${panel===v.id?' is-open':''}" data-court-options="${v.id}" aria-label="${v.label}" ${panel===v.id?'':'inert'}>${v.choices}</div>`).join('')}
        <small class="court-missing" role="status">${guidance}</small>
      </section></div>
      <div class="hud-right"><div class="trial-top-actions"><button type="button" data-justice-ask>สอบสวน<br>ข้อกล่าวหา</button><button type="button" data-justice-guide><img class="tab-ico" src="img/ui/icon-book.png" alt="">คำแนะนำ</button></div>
        <div class="hud-card hud-rec"><h4>สำนวนที่นิราอ่านให้ฟัง</h4><div class="deed allegation">${esc(c.name)} ใช้อำนาจข่มเหงวิญญาณ ปิดกั้นเส้นทางชายแดน และก่อความเดือดร้อน</div><p>บอสพ่ายแพ้แล้ว ถูกพันธนาการและนำมาต่อหน้าศาล</p></div>
        <div class="hud-card hud-opt"><h4>${shown?'กระจกวิเศษเปิดเผยคำตัดสิน':'คดีสุดท้าย · ต้องใช้กระจกวิเศษ'}</h4>${shown?`<p data-justice-answer>✓ สถานที่: <b>${esc(answerStation?.def.name)}</b><br>✓ ผู้คุม: <b>${esc(answerKeeper?.name)}</b><br>✓ ความแรงสูงสุด: <b>${INTENSITY[5]}</b></p><p>เปิดเมนูแต่ละหัวข้อ แล้วเลือกตัวเลือกที่มี ✓</p>`:'<p>นิรา: ขอให้ท่านเลือกพลังกระจกวิเศษ เพื่อเปิดเผยสถานที่ลงทัณฑ์ ผู้คุม และความแรงสูงสุดก่อนออกหมายค่ะ</p><button type="button" data-justice-open-power>เปิดเมนูพลัง</button>'}</div>
        <div class="hud-card"><h4>บันทึกการสอบสวน</h4><div class="hud-log">${shown?'กระจกวิเศษเปิดเผยความจริงครบแล้ว · รอคำตัดสินจากยามา':'นิราอ่านข้อกล่าวหาต่อหน้าศาลแล้ว · รอใช้พลังกระจกวิเศษ'}</div><p>${esc(guidance)}</p></div>
      </div></div>
    <div class="hud-bottom"><div class="port you">${image(assets.portrait,'ยามา')}<span class="who2"><b>ยามา</b><small>ตำแหน่ง · ยมบาทน้อย</small><small>บารมี ${hp}/${max}</small><small>พลังเวท ${mp}/${mpMax}</small><span class="trial-mpbar"><i style="width:${Math.max(0,Math.min(100,100*mp/mpMax))}%"></i></span><span class="trial-hpbar"><i style="width:${Math.max(0,Math.min(100,100*hp/max))}%"></i></span></span></div></div>
    ${prompt?`<section class="final-court-prompt" role="dialog" aria-modal="true" aria-label="เลือกพลังกระจกวิเศษ"><h3>เลือกพลังกระจกวิเศษ</h3><p>นิรา: คดีนี้ต้องใช้กระจกวิเศษค่ะ<br>เลือก พลัง → กระจกวิเศษ แล้วเลือกสถานที่ ผู้คุม และความแรงตามคำเฉลย</p><button class="gold" type="button" data-justice-open-power>เปิดเมนูพลัง</button></section>`:''}
  </div>`;
}

export function mountFinalBossCourt(dialog,g,hooks) {
  const docket=bossJusticeCase(g);if(!docket?.final||!['dais','trial'].includes(docket.phase))return;
  // Reading the dossier is the first step of the ordinary arena, and is persisted.
  if(docket.phase==='dais'){interrogateBoss(g);g.save();}
  let panel=null,prompt=!docket.mirror;
  const active=()=>dialog.open&&bossJusticeCase(g)===docket&&docket.phase==='trial';
  const paint=()=>{
    if(!active())return;
    const scroll=dialog.querySelector('.hud-right')?.scrollTop||0;
    dialog.innerHTML=finalCourtMarkup(g,{panel,prompt,assets:hooks.assets});
    dialog.querySelector('.hud-right').scrollTop=scroll;
    hooks.onPaint?.();
    const coach=dialog.querySelector('.final-court-prompt');
    if(coach){
      coach.querySelector('button').focus();
      coach.addEventListener('keydown',e=>{if(e.key==='Tab'){e.preventDefault();coach.querySelector('button').focus();}});
    }
    dialog.querySelectorAll('[data-court-panel]').forEach(el=>el.onclick=()=>{panel=panel===el.dataset.courtPanel?null:el.dataset.courtPanel;paint();});
    dialog.querySelectorAll('[data-justice-open-power]').forEach(el=>el.onclick=()=>{prompt=false;panel='power';paint();dialog.querySelector('[data-justice-mirror]')?.focus();});
    dialog.querySelector('[data-justice-mirror]')?.addEventListener('click',()=>{
      if(!active()||docket.mirror||!mirrorBoss(g))return;
      g.save();panel=null;prompt=false;paint();hooks.onMirror?.();
    });
    dialog.querySelectorAll('[data-justice-choice]').forEach(el=>el.onclick=()=>{
      if(!active()||!docket.mirror)return;
      docket.pick[el.dataset.justiceChoice]=el.dataset.justiceChoice==='intensity'?Number(el.dataset.value):el.dataset.value;
      g.save();panel=null;paint();
    });
    dialog.querySelector('[data-justice-ask]').onclick=()=>{if(active()){interrogateBoss(g);g.save();paint();}};
    dialog.querySelector('[data-justice-guide]').onclick=()=>{prompt=true;paint();};
    dialog.querySelector('[data-justice-pause]').onclick=()=>hooks.onPause?.();
    dialog.querySelector('#justice-sentence').onclick=()=>{
      if(!active()||!finalCourtModel(g).ready||!sentenceBoss(g,docket.pick))return;
      g.save();hooks.onSentence();
    };
    dialog.querySelector('.comment8-menu').addEventListener('keydown',e=>{if(e.key==='Escape'){panel=null;paint();}});
  };
  paint();
}
