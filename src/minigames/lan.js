// src/minigames/lan.js — ลานตรากตรำ: "แบกหิน" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 6A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
import { el, lerpByLevel, rafLoop } from './util.js';

export default {
  name: 'แบกหิน',
  icon: '⛏️',
  tip: 'แตะรัว ๆ ที่ปุ่มเพื่อแบกหินไปให้ถึงธง — หยุดแตะแล้วแรงจะค่อย ๆ ลด',
  run(host, { level, alive, onWin, onLose }) {
    const total = lerpByLevel(level, 19000, 16000);
    const perTap = lerpByLevel(level, 5.6, 3.2);
    const decay = lerpByLevel(level, 0.010, 0.020);
    let prog = 0, done = false;

    const wrap = el('div', 'mg-lan');
    const track = el('div', 'mg-lan-track');
    const rock = el('div', 'mg-lan-rock', '🪨');
    const flag = el('div', 'mg-lan-flag', '🚩');
    track.append(rock, flag);
    const timeBar = el('div', 'mg-bar'); const timeFill = el('div', 'mg-bar-fill'); timeBar.appendChild(timeFill);
    const tapBtn = el('button', 'gold mg-lan-tap', '💪 แบกหิน');
    wrap.append(track, timeBar, tapBtn);
    host.appendChild(wrap);

    function finish(won) { if (done) return; done = true; stop(); won ? onWin() : onLose(); }

    tapBtn.onclick = () => {
      if (done) return;
      prog = Math.min(100, prog + perTap);
      rock.style.left = `${prog}%`;
      if (prog >= 100) finish(true);
    };

    const start = performance.now();
    let last = start;
    const stop = rafLoop(now => {
      const dt = now - last; last = now;
      if (prog > 0) { prog = Math.max(0, prog - decay * dt); rock.style.left = `${prog}%`; }
      const t = now - start;
      const p = Math.min(1, t / total);
      timeFill.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
