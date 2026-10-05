// Shared illustrated command wheel. Source artwork keeps its original 900 × 1100 canvas.
import { effectiveAllyStats } from './progression.js';
import { t, getLang } from './i18n.js';   // ข้อ C1/E.3/F.2 ชุด 15 — ป้ายวงคำสั่งแปล TH/ENG ได้ทันที
const esc = text => String(text ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slices = [[-125,-73],[-73,-21],[-21,57],[57,120]];
function sector(from, to) {
  const pts = [];
  const point = (deg, r) => `${(366 + Math.cos(deg*Math.PI/180)*r)/9}% ${(555 + Math.sin(deg*Math.PI/180)*r)/11}%`;
  for(let d=from;d<to;d+=3) pts.push(point(d,490));
  pts.push(point(to,490));
  for(let d=to;d>from;d-=3) pts.push(point(d,218));
  pts.push(point(from,218));
  return `polygon(${pts.join(',')})`;
}
// B7: cropped alpha artwork, positioned in its original 900 × 1100 canvas.
const petals = {
  "b1": {
    "box": [
      85,
      64,
      696,
      388
    ],
    "clip": "polygon(9.556% 13.455%,23.778% 32.455%,28.667% 30.091%,33.333% 28.727%,37.889% 28.091%,42.778% 28.091%,48.111% 28.909%,52.000% 30.091%,56.889% 32.455%,60.444% 35.091%,61.000% 34.818%,77.111% 17.364%,74.222% 15.273%,69.778% 12.727%,61.111% 9.091%,52.556% 6.909%,44.333% 5.909%,35.000% 6.000%,26.667% 7.182%,21.889% 8.364%,17.222% 9.909%)"
  },
  "b2": {
    "box": [
      531,
      190,
      857,
      933
    ],
    "clip": "polygon(77.111% 17.364%,60.667% 35.091%,63.889% 38.455%,66.444% 42.636%,68.000% 47.909%,68.111% 52.273%,67.111% 56.818%,65.667% 60.000%,63.000% 63.727%,59.111% 67.273%,75.667% 84.636%,80.444% 81.091%,83.667% 78.000%,86.778% 74.364%,90.000% 69.545%,91.889% 65.818%,93.778% 60.545%,94.556% 57.182%,95.111% 52.091%,95.000% 47.273%,94.222% 42.364%,92.556% 36.909%,90.778% 33.000%,88.333% 28.909%,84.556% 24.091%,81.222% 20.727%)"
  },
  "b3": {
    "box": [
      127,
      740,
      682,
      1048
    ],
    "clip": "polygon(75.667% 84.727%,59.111% 67.364%,56.667% 69.000%,52.333% 71.091%,47.778% 72.455%,43.667% 73.091%,38.778% 73.182%,35.333% 72.818%,30.444% 71.636%,26.778% 70.182%,14.222% 89.545%,21.444% 92.364%,29.000% 94.182%,36.778% 95.091%,45.778% 95.000%,54.556% 93.727%,62.000% 91.636%,69.444% 88.455%)"
  },
  "b4": {
    "box": [
      545,
      190,
      857,
      850
    ],
    "clip": "polygon(76.889% 17.364%,60.556% 35.091%,63.000% 37.455%,65.778% 41.455%,67.000% 44.182%,67.889% 47.727%,68.111% 50.636%,67.667% 54.545%,66.444% 58.273%,64.556% 61.727%,84.444% 77.091%,87.667% 73.091%,89.889% 69.636%,91.778% 66.000%,93.222% 62.273%,94.889% 54.636%,94.889% 46.364%,94.222% 42.455%,92.778% 37.545%,90.667% 32.818%,88.444% 29.091%,83.111% 22.545%,79.111% 18.909%)"
  }
};
export function commandWheel({battle=false, ready=true, busy=false, groups=[], selected='', missing='', segments=null, actorName='ยมบาทน้อย', portrait='img/ui/Button6.png'}) {
  if (segments) {
    // A two-command actor uses the right item petal; Yama keeps the bottom item petal.
    const slotById = {attack:0, power:1, item:segments.length === 2 ? 1 : 3};
    const slotOf = (g, i) => slotById[g.id] ?? (segments.length === 2 ? [0,3] : [0,1,3])[i] ?? i;
    const petalOf = g => g.id === 'attack' ? 'b1' : g.id === 'power' ? 'b2' : segments.length === 2 ? 'b4' : 'b3';
    const shortName = String(actorName).split(' / ')[0];
    return `<div class="command-wheel combat-wheel actor-wheel petals-${segments.length} ${busy?'busy':''}" aria-label="${esc(actorName)}">
      ${segments.map((g,i)=>{const s=slotOf(g,i), key=petalOf(g), {box,clip}=petals[key];return `<button class="actor-segment command-segment segment-${s}" style="clip-path:${clip}" data-command="${esc(g.id)}" aria-expanded="false" aria-label="${esc(g.label)}" ${busy||g.disabled?'disabled':''}><img src="img/ui/${key}.webp" style="position:absolute;left:${box[0]/9}%;top:${box[1]/11}%;width:${(box[2]-box[0])/9}%;height:${(box[3]-box[1])/11}%" alt=""></button>`;}).join('')}
      ${segments.map((g,i)=>`<span class="command-label label-${slotOf(g,i)}" aria-hidden="true">${esc(String(g.label).split(' / ')[0])}</span>`).join('')}
      <div class="command-center"><img src="${esc(portrait)}" alt="${esc(actorName)}"></div>
      <span class="command-center-label" aria-hidden="true">${esc(shortName)}</span>
      ${segments.map((g,i)=>`<div class="command-options options-${slotOf(g,i)}" data-options="${esc(g.id)}" inert aria-label="${esc(g.label)}">${g.choices || ''}</div>`).join('')}
      ${selected}
    </div>`;
  }
  const labels = battle ? [t('battle.attack'),t('battle.power'),t('battle.crew'),t('battle.item')]
                        : [t('trial.power'),t('trial.where'),t('trial.who'),t('trial.force')];
  const first = battle ? 7 : 2;
  return `<div class="command-wheel ${battle?'combat-wheel':'court-wheel'} ${busy?'busy':''}" aria-label="${battle?'คำสั่งต่อสู้':'คำสั่งออกหมาย'}">
    ${groups.map((g,i)=>`<button class="command-segment segment-${i}" style="clip-path:${sector(...slices[i])}"
      ${g.action?`data-act="${g.action}"`:`data-command="${i}" aria-expanded="false"`} ${g.disabled||busy?'disabled':''}
      aria-label="${esc(labels[i])}"><img src="img/ui/Button${first+i}.png" alt=""></button>`).join('')}
    ${groups.map((g,i)=>`<span class="command-label label-${i}" aria-hidden="true">${esc(labels[i])}</span>`).join('')}
    ${battle?`<div class="command-center"><img src="img/ui/Button6.png" alt=""></div>`:
      `<button class="command-center ${ready?'ready':''}" id="t-go" ${ready?'':'disabled'} title="${ready?esc(t('trial.warrant')):'เลือกสถานที่ ผู้คุม และความแรงให้ครบ'}" aria-label="${esc(t('trial.warrant'))}"><img src="img/ui/Button1.png" alt=""></button>`}
    <span class="command-center-label" aria-hidden="true">${battle?'ยมบาทน้อย':esc(t('trial.warrant'))}</span>
    ${groups.map((g,i)=>g.choices?`<div class="command-options options-${i}" data-options="${i}" inert aria-label="${labels[i]}">${g.choices}</div>`:'').join('')}
    ${selected}
    ${missing ? `<small class="command-missing" role="status">${esc(missing)}</small>` : ''}
  </div>`;
}
export function bindCommandWheel(root) {
  root.querySelectorAll('.command-wheel').forEach(wheel=>{
    const set = index => {
      wheel.querySelectorAll('[data-command]').forEach(b=>b.setAttribute('aria-expanded',String(b.dataset.command===index)));
      wheel.querySelectorAll('[data-options]').forEach(p=>{
        const open=p.dataset.options===index;
        p.classList.toggle('is-open',open); p.inert=!open;
        p.querySelectorAll('.orb-choice').forEach((b,i)=>b.style.setProperty('--choice-index',i));
      });
      wheel.classList.toggle('has-options',index!==null);
    };
    // จอที่มีเมาส์จริง (hover ได้) — pointerenter เปิดวงให้ก่อนคลิกเสมอ ถ้าคลิกยัง "สลับปิด/เปิด"
    // ตามค่า aria-expanded ปัจจุบัน จะเจอ race: hover เปิดไปแล้ว คลิกอ่านค่าที่เพิ่งเปิดนั้นแล้วตีความว่า
    // "ผู้ใช้ต้องการปิด" ทันที วงเลยกะพริบเปิดแล้วปิดในคลิกเดียว ตัวเลือกที่กดไม่ทันติด (ข้อ A/B 24 ก.ย. 2569)
    // แก้โดยแยกพฤติกรรม: มีเมาส์ → คลิกแค่ "ตรึงให้เปิดอยู่" (ปิดด้วยการย้ายไปวงอื่น/Esc/ปิดกล่อง)
    //                     ไม่มี hover (ทัช/คีย์บอร์ด) → คลิกสลับเปิด-ปิดเหมือนเดิม เพราะไม่มี hover เปิดล่วงหน้า
    const hasHover = typeof matchMedia === 'function' && matchMedia('(hover:hover) and (pointer:fine)').matches;
    wheel.querySelectorAll('[data-command]').forEach(b=>{
      b.onclick=()=>set(hasHover ? b.dataset.command : (b.getAttribute('aria-expanded')==='true'?null:b.dataset.command));
      b.onpointerenter=e=>{if(e.pointerType==='mouse'&&!b.disabled)set(b.dataset.command);};
    });
    wheel.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();set(null);}});
  });
}

// ข้อ G คุณเป้เจอ 25 ก.ย. 2569 — เพิ่ม guard ให้การ์ดยักษ์ทวารบาลที่โต๊ะนิราเรียกใช้ข้อความเดียวกับ
// ปุ่มในวงคำสั่งต่อสู้
// ข้อ B ชุด 13 คุณเป้ 26 ก.ย. 2569 — เลิกเขียนตัวเลขตายตัวไว้ในนี้ (36/2 ตา เพี้ยนไปจากค่าจริงแล้ว)
// อ่านจาก CREW_POWER (data.js) ที่เดียวกับ game.js battleAct() — การ์ดทีม/วงคำสั่ง/แท็บข้อมูล
// จะไม่มีวันเห็นตัวเลขไม่ตรงกันอีก เพราะทุกที่เรียกฟังก์ชันนี้ตัวเดียวกัน
export const crewAbility = (actor, zone = 'th', training) => {
  const p = effectiveAllyStats(actor, zone, training);
  const kind = typeof actor === 'string' ? actor : actor.kind || actor.k;
  const en = getLang() === 'en';
  if (kind === 'nira') return en ? `Order ${p.order} · recovery ×${p.orderRegenMultiplier.toFixed(2)}` : `ระเบียบ ${p.order} · ฟื้นระเบียบ ×${p.orderRegenMultiplier.toFixed(2)}`;
  if (p.heal != null) return `${en ? 'Restore HP' : p.desc} ${p.heal}`;
  if (p.confuse != null) return en ? `Confuse ${p.confuse} turn · self damage ×${p.confuseMultiplier.toFixed(2)}` : `${p.desc} · ตีตัวเอง ×${p.confuseMultiplier.toFixed(2)}`;
  if (p.dmg != null) return `${en ? ({taan:'Club strike',plerng:'Fire attack',dam:'Assist attack',guard:'Guard strike'}[kind] || 'Attack') : p.desc} ${p.dmg}`;
  return en ? 'Assist attack' : 'โจมตีช่วย';
};
export const cooldownText = seconds => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export function crewCooldown(c, remaining, duration) {
  return `<span class="crew-cooldown" data-cooldown="${esc(c.k)}" role="progressbar" aria-label="ความพร้อม ${esc(c.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(100*(1-remaining/duration))}"><i style="width:${100*(1-remaining/duration)}%"></i></span><small data-cooldown-label="${esc(c.k)}">${remaining?cooldownText(remaining):'พร้อม'}</small>`;
}
