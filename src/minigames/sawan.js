// src/minigames/sawan.js — ประตูสวรรค์: "นับลมหายใจ" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 10A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
// โทนสงบ — วงแสงทองขยาย/หด ไม่มีเอฟเฟกต์กระแทก/สั่นจอ พลาดแค่ไม่ได้จังหวะ ไม่มีลงโทษพิเศษ
import { el, lerpByLevel, rafLoop } from './util.js';

const NEED = 3;

export default {
  name: 'นับลมหายใจ',
  icon: '🕊️',
  tip: 'วงแสงทองขยายและหดช้า ๆ — วงจะเรืองเขียวเองตอนถึงจังหวะขยายสุด ให้แตะ "แตะจังหวะ" ตอนนั้น ให้ตรงจังหวะ 3 ครั้ง',
  run(host, { level, alive, onWin, onLose }) {
    const total = lerpByLevel(level, 20000, 17000);
    const period = lerpByLevel(level, 3400, 2200);   // ขั้นสูงรอบเร็วขึ้น จับจังหวะยากขึ้น
    const window_ = lerpByLevel(level, 0.16, 0.09);  // สัดส่วนของรอบที่นับเป็น "ขยายสุด" ได้
    let hit = 0, phase = 0, done = false;

    const wrap = el('div', 'mg-sawan');
    const stage = el('div', 'mg-sawan-stage');
    const ring = el('div', 'mg-sawan-ring');
    stage.appendChild(ring);
    const count = el('div', 'mg-sawan-count', `นับได้ 0/${NEED}`);
    const bar = el('div', 'mg-bar'); const fill = el('div', 'mg-bar-fill'); bar.appendChild(fill);
    const tapBtn = el('button', 'gold mg-sawan-tap', '🙏 แตะจังหวะ');
    wrap.append(stage, count, bar, tapBtn);
    host.appendChild(wrap);

    function finish(won) { if (done) return; done = true; stop(); won ? onWin() : onLose(); }

    tapBtn.onclick = () => {
      if (done) return;
      const dist = Math.abs(phase - 0.5);
      if (dist <= window_ / 2) {
        hit++; count.textContent = `✅ โดน! นับได้ ${hit}/${NEED}`;
        ring.classList.add('good'); setTimeout(() => ring.classList.remove('good'), 240);
        if (hit >= NEED) finish(true);
      } else {
        count.textContent = `❌ พลาด — นับได้ ${hit}/${NEED}`;
        ring.classList.add('miss'); setTimeout(() => ring.classList.remove('miss'), 240);
      }
    };

    const start = performance.now();
    const stop = rafLoop(now => {
      const t = now - start;
      phase = (t % period) / period;
      const scale = 0.62 + 0.38 * Math.sin(phase * Math.PI);
      ring.style.transform = `scale(${scale.toFixed(3)})`;
      ring.dataset.phase = phase.toFixed(3);   // ไว้ให้ QA/ทดสอบอ่านจังหวะจริงได้ตรง ๆ
      // ข้อ B ชุด 14 — เกณฑ์เดียวกับ "คุมไฟ": วงเรืองทองเองตอนถึงจังหวะขยายสุด ไม่ต้องกดก่อนถึงจะรู้
      ring.classList.toggle('in', Math.abs(phase - 0.5) <= window_ / 2);
      const p = Math.min(1, t / total);
      fill.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
