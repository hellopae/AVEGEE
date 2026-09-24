// src/minigames/ngiw.js — ดงต้นงิ้ว: "เก็บหนามที่เคยทิ่ม" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 5B (Output/Minnie/2026-09-18-avegee-station-minigames.md)
import { el, lerpByLevel, rafLoop } from './util.js';

const NEED = 6;

export default {
  name: 'เก็บหนามที่เคยทิ่ม',
  icon: '🌵',
  tip: 'หนามโผล่ขึ้นมาทีละต้นในตำแหน่งสุ่ม — แตะให้ทันก่อนมันจมหาย เก็บให้ครบ 6 ต้น',
  run(host, { level, alive, onWin, onLose }) {
    const total = lerpByLevel(level, 22000, 15000);
    const thornLife = lerpByLevel(level, 2200, 1300);
    const spawnEvery = lerpByLevel(level, 1500, 1050);
    let got = 0, done = false, nextSpawn = 500, thorns = [];

    const wrap = el('div', 'mg-ngiw');
    const stage = el('div', 'mg-ngiw-stage');
    const count = el('div', 'mg-ngiw-count', `เก็บแล้ว 0/${NEED}`);
    const bar = el('div', 'mg-bar'); const fill = el('div', 'mg-bar-fill'); bar.appendChild(fill);
    wrap.append(stage, count, bar);
    host.appendChild(wrap);

    function finish(won) {
      if (done) return; done = true; stop();
      thorns.forEach(t => t.el.remove());
      won ? onWin() : onLose();
    }

    function spawn() {
      const x = 10 + Math.random() * 80, y = 12 + Math.random() * 66;
      const b = el('button', 'mg-ngiw-thorn', '🌵');
      b.style.left = `${x}%`; b.style.top = `${y}%`;
      const rec = { el: b, born: performance.now() };
      b.onclick = () => {
        if (done) return;
        b.remove();
        thorns = thorns.filter(t => t !== rec);
        got++;
        count.textContent = `เก็บแล้ว ${got}/${NEED}`;
        if (got >= NEED) finish(true);
      };
      stage.appendChild(b);
      thorns.push(rec);
    }

    const start = performance.now();
    const stop = rafLoop(now => {
      const t = now - start;
      if (t >= nextSpawn) { spawn(); nextSpawn = t + spawnEvery; }
      for (let i = thorns.length - 1; i >= 0; i--) {
        const th = thorns[i];
        if (now - th.born >= thornLife) { th.el.remove(); thorns.splice(i, 1); }
      }
      const p = Math.min(1, t / total);
      fill.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
