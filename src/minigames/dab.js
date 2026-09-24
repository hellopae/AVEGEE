// src/minigames/dab.js — ป่าดาบอสิปัตตะ: "หลบใบดาบ" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 3A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
import { el, lerpByLevel, rafLoop } from './util.js';

const LANES = 3;
const DURATION = 19000;
const MAX_HITS = 2; // โดนได้ไม่เกินนี้ — โดนครั้งที่ 3 ถึงแพ้ (ตามสเปก Minnie)

export default {
  name: 'หลบใบดาบ',
  icon: '🗡️',
  tip: 'แตะช่องซ้าย/กลาง/ขวา เพื่อย้ายตัวเองหลบใบดาบที่ร่วงลงมา — โดนได้ไม่เกิน 2 ครั้ง',
  run(host, { level, alive, onWin, onLose }) {
    const spawnEvery = lerpByLevel(level, 1450, 820);
    const fallMs = lerpByLevel(level, 1500, 1000);
    let lane = 1, hits = 0, done = false, nextSpawn = 700, blades = [];

    const wrap = el('div', 'mg-dab');
    const stage = el('div', 'mg-dab-stage');
    const player = el('div', 'mg-dab-player', '👑');
    stage.appendChild(player);
    const ctrl = el('div', 'mg-dab-ctrl');
    ['⬅ ซ้าย', '⏺ กลาง', 'ขวา ➡'].forEach((label, i) => {
      const b = el('button', 'mg-dab-btn', label);
      b.onclick = () => { lane = i; player.style.left = `${((i + 0.5) / LANES) * 100}%`; player.dataset.lane = String(i); };
      ctrl.appendChild(b);
    });
    const hitsEl = el('div', 'mg-dab-hits', `โดนแล้ว 0/${MAX_HITS + 1}`);
    const bar = el('div', 'mg-bar'); const fill = el('div', 'mg-bar-fill'); bar.appendChild(fill);
    wrap.append(stage, ctrl, hitsEl, bar);
    host.appendChild(wrap);
    player.style.left = `${((lane + 0.5) / LANES) * 100}%`;
    player.dataset.lane = String(lane);   // ไว้ให้ QA/ทดสอบอ่านเลนปัจจุบันได้ตรง ๆ

    function finish(won) {
      if (done) return; done = true; stop();
      blades.forEach(b => b.el.remove());
      won ? onWin() : onLose();
    }

    function spawnBlade() {
      const bladeLane = Math.floor(Math.random() * LANES);
      const bEl = el('div', 'mg-dab-blade', '🗡️');
      bEl.style.left = `${((bladeLane + 0.5) / LANES) * 100}%`;
      bEl.dataset.lane = String(bladeLane);   // ไว้ให้ QA/ทดสอบอ่านเลนได้ตรง ๆ
      stage.appendChild(bEl);
      blades.push({ el: bEl, lane: bladeLane, born: performance.now(), resolved: false });
    }

    const start = performance.now();
    const stop = rafLoop(now => {
      const t = now - start;
      if (t >= nextSpawn) { spawnBlade(); nextSpawn = t + spawnEvery; }
      for (let i = blades.length - 1; i >= 0; i--) {
        const b = blades[i];
        const p = (now - b.born) / fallMs;
        if (p >= 1) { b.el.remove(); blades.splice(i, 1); continue; }
        b.el.style.top = `${p * 88}%`;
        if (!b.resolved && p >= 0.82) {
          b.resolved = true;
          if (b.lane === lane) {
            hits++;
            hitsEl.textContent = `โดนแล้ว ${hits}/${MAX_HITS + 1}`;
            stage.classList.add('hit'); setTimeout(() => stage.classList.remove('hit'), 150);
            if (hits > MAX_HITS) { finish(false); return; }
          }
        }
      }
      const p2 = Math.min(1, t / DURATION);
      fill.style.width = `${100 * (1 - p2)}%`;
      if (p2 >= 1) finish(true);
    }, alive);

    return () => { done = true; stop(); };
  },
};
