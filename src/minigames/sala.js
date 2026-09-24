// src/minigames/sala.js — หอทะเบียนกรรม: "เรียงสำนวน" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 1A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
// โทนสงบ — ไม่มีเอฟเฟกต์กระแทก/สั่นจอ แค่แถบเวลาไหลกับสีถูก-ผิดธรรมดา
//
// แก้ตาม FIX LIST ของ Dale (Output/Dale/2026-09-24-avegee-batch9-review.md, FIX-3):
// เดิมจบได้ใน <2 วิสำหรับผู้เล่นที่จำหมวด/สีได้แล้วตอบทันทีทุกรอบ (5 รอบ ไม่มีอะไรบังคับให้รอ)
// ต่ำกว่า 15 วิที่ใบงานกำหนดไว้มาก — เพิ่มจำนวนรอบเป็น 10 (จากเดิมเสนอ 8-10) และล็อกปุ่มไว้
// LOCK_MS แรกของทุกรอบ (กันตอบเดา/ตอบก่อนอ่านคำถามด้วย) คำนวณให้ NEED × LOCK_MS ≈ 16 วิ
// (มีระยะเผื่อเหนือ 15 วิ) ส่วน `per` (เพดานเวลาต่อรอบ) ยกพื้นขั้นสูงจาก 2000→2400ms ให้เหลือ
// หน้าต่างตัดสินใจหลังปลดล็อกอย่างน้อย ~800ms แม้ที่ขั้นยากสุด ไม่ใช่กดแทบไม่ทันเหมือนคิดจะลดเฉย ๆ
import { SINS } from '../data.js';
import { el, shuffle, lerpByLevel, rafLoop } from './util.js';

const CATS = Object.keys(SINS);
const NEED = 10;
const LOCK_MS = 1600;   // ปุ่มกดไม่ได้ในช่วงแรกของทุกรอบ — กันตอบเร็วเกินจนเกมจบไม่ถึง 15 วิ

export default {
  name: 'เรียงสำนวน',
  icon: '📜',
  tip: 'ม้วนสำนวนลอยขึ้นมาทีละชุด — รอครู่หนึ่งให้อ่านทัน แล้วแตะม้วนที่ตรงกับ "หมวดที่เรียกหา" ก่อนหมดเวลา ให้ครบ 10 ม้วน',
  run(host, { level, alive, onWin, onLose }) {
    const per = lerpByLevel(level, 3200, 2400); // ms ต่อรอบ (เพดานเวลา รวม LOCK_MS อยู่ในนี้) — ขั้นสูงสั้นลง
    let correct = 0, target = null, startAt = 0, done = false, lockTimer = 0;

    const wrap = el('div', 'mg-sala');
    const head = el('div', 'mg-sala-head');
    const barWrap = el('div', 'mg-bar'); const bar = el('div', 'mg-bar-fill'); barWrap.appendChild(bar);
    const row = el('div', 'mg-sala-row');
    const count = el('div', 'mg-sala-count');
    wrap.append(head, barWrap, row, count);
    host.appendChild(wrap);

    function newRound() {
      target = CATS[Math.floor(Math.random() * CATS.length)];
      head.innerHTML = `เรียกหา: <b style="color:${SINS[target].color}">${SINS[target].name}</b>`;
      head.dataset.target = target;   // ไว้ให้ QA/ทดสอบอ่านค่าปัจจุบันได้ตรง ๆ ไม่ต้องเทียบสี
      const others = shuffle(CATS.filter(c => c !== target)).slice(0, 3);
      const opts = shuffle([target, ...others]);
      row.innerHTML = '';
      const roundBtns = opts.map(c => {
        const b = el('button', 'mg-scroll', `📜<span>${SINS[c].name}</span>`);
        b.style.setProperty('--c', SINS[c].color);
        b.dataset.cat = c;
        b.disabled = true;             // ล็อกไว้ก่อน — ปลดล็อกหลัง LOCK_MS ด้านล่าง
        b.onclick = () => pick(c);
        row.appendChild(b);
        return b;
      });
      count.textContent = `เก็บแล้ว ${correct}/${NEED}`;
      startAt = performance.now();
      clearTimeout(lockTimer);
      lockTimer = setTimeout(() => {
        if (done) return;
        roundBtns.forEach(b => { b.disabled = false; });
      }, LOCK_MS);
    }

    function pick(c) {
      if (done) return;
      if (c === target) {
        correct++;
        if (correct >= NEED) { finish(true); return; }
        newRound();
      } else finish(false);
    }

    function finish(won) {
      if (done) return;
      done = true; stop(); clearTimeout(lockTimer);
      won ? onWin() : onLose();
    }

    newRound();
    const stop = rafLoop(now => {
      const p = Math.min(1, (now - startAt) / per);
      bar.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); clearTimeout(lockTimer); };
  },
};
