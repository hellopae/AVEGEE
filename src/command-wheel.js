// Shared illustrated command wheel. Source artwork keeps its original 900 × 1100 canvas.
import { CREW_POWER } from './data.js';
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
export function commandWheel({battle=false, ready=true, busy=false, groups=[], selected=''}) {
  const labels = battle ? ['โจมตี','พลัง','ยมทูต','ไอเท็ม'] : ['พลัง','ที่ไหน','ใครคุม','ความแรง'];
  const first = battle ? 7 : 2;
  return `<div class="command-wheel ${battle?'combat-wheel':'court-wheel'} ${busy?'busy':''}" aria-label="${battle?'คำสั่งต่อสู้':'คำสั่งออกหมาย'}">
    ${groups.map((g,i)=>`<button class="command-segment segment-${i}" style="clip-path:${sector(...slices[i])}"
      ${g.action?`data-act="${g.action}"`:`data-command="${i}" aria-expanded="false"`} ${g.disabled||busy?'disabled':''}
      aria-label="${labels[i]}"><img src="img/ui/Button${first+i}.png" alt=""><b>${labels[i]}</b></button>`).join('')}
    ${battle?`<div class="command-center"><img src="img/ui/Button6.png" alt=""><b>ยมน้อย</b></div>`:
      `<button class="command-center ${ready?'ready':''}" id="t-go" ${ready?'':'disabled'} title="${ready?'ออกหมาย':'เลือกสถานที่ ผู้คุม และความแรงให้ครบ'}"><img src="img/ui/Button1.png" alt=""><b>ออกหมาย</b></button>`}
    ${groups.map((g,i)=>g.choices?`<div class="command-options options-${i}" data-options="${i}" inert aria-label="${labels[i]}">${g.choices}</div>`:'').join('')}
    ${selected}
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
export const crewAbility = k => {
  const p = CREW_POWER[k];
  if (!p) return 'โจมตีช่วย';
  if (p.heal != null) return `${p.desc} ${p.heal}`;
  if (p.confuse != null) return p.desc;   // "สะกดจิต — มึน 1 ตา" — มีตัวเลขอยู่ใน desc แล้ว
  if (p.dmg != null) return `${p.desc} ${p.dmg}`;
  return p.desc || 'โจมตีช่วย';
};
export const cooldownText = seconds => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export function crewCooldown(c, remaining, duration) {
  return `<span class="crew-cooldown" data-cooldown="${esc(c.k)}" role="progressbar" aria-label="ความพร้อม ${esc(c.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(100*(1-remaining/duration))}"><i style="width:${100*(1-remaining/duration)}%"></i></span><small data-cooldown-label="${esc(c.k)}">${remaining?cooldownText(remaining):'พร้อม'}</small>`;
}
