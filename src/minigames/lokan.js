// src/minigames/lokan.js — โลกันตนรก: "ไอเย็นแห่งความเนรคุณ" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 4B (Output/Minnie/2026-09-18-avegee-station-minigames.md)
import { el, lerpByLevel, rafLoop } from './util.js';

export default {
  name: 'ไอเย็นแห่งความเนรคุณ',
  icon: '🧊',
  tip: 'หมอกเย็นบังหน้าเขาไว้อยู่ — แตะรัว ๆ ที่ปุ่มเพื่อไล่หมอกให้เห็นหน้าก่อนหมดเวลา',
  run(host, { level, alive, onWin, onLose }) {
    const total = lerpByLevel(level, 16000, 14000);
    const perTap = lerpByLevel(level, 6.5, 3.6);     // % ต่อการแตะ 1 ครั้ง — ขั้นสูงได้น้อยลง
    const decay = lerpByLevel(level, 0.012, 0.028);  // % ต่อ ms ที่มันไหลกลับมาเอง
    let gauge = 0, done = false;

    const wrap = el('div', 'mg-lokan');
    const stage = el('div', 'mg-lokan-stage');
    const face = el('div', 'mg-lokan-face', '🧑');
    const fog = el('div', 'mg-lokan-fog');
    stage.append(face, fog);
    const bar = el('div', 'mg-bar'); const fill = el('div', 'mg-bar-fill'); bar.appendChild(fill);
    const timeBar = el('div', 'mg-bar mg-bar-time'); const timeFill = el('div', 'mg-bar-fill'); timeBar.appendChild(timeFill);
    const tapBtn = el('button', 'gold mg-lokan-tap', '💨 ไล่หมอก');
    wrap.append(stage, bar, timeBar, tapBtn);
    host.appendChild(wrap);

    function finish(won) { if (done) return; done = true; stop(); won ? onWin() : onLose(); }

    tapBtn.onclick = () => {
      if (done) return;
      gauge = Math.min(100, gauge + perTap);
      fog.style.opacity = String(1 - gauge / 100);
      fill.style.width = `${gauge}%`;
      if (gauge >= 100) finish(true);
    };

    const start = performance.now();
    let last = start;
    const stop = rafLoop(now => {
      const dt = now - last; last = now;
      if (gauge > 0) {
        gauge = Math.max(0, gauge - decay * dt);
        fog.style.opacity = String(1 - gauge / 100);
        fill.style.width = `${gauge}%`;
      }
      const t = now - start;
      const p = Math.min(1, t / total);
      timeFill.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
