// src/minigames/krata.js — กระทะทองแดง: "คุมไฟ" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 2A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
import { el, lerpByLevel, rafLoop } from './util.js';

const NEED = 5;

export default {
  name: 'คุมไฟ',
  icon: '🔥',
  tip: 'หัวไฟแกว่งซ้าย-ขวาตลอดเวลา — แตะ "พัดไฟ" ตอนหัวไฟอยู่ในโซนทอง ให้ติดกัน 5 ครั้งก่อนหมดเวลา',
  run(host, { level, alive, onWin, onLose }) {
    const total = 20000;
    const period = lerpByLevel(level, 1500, 850);   // ขั้นสูงแกว่งเร็วขึ้น
    const zoneHalf = lerpByLevel(level, 0.16, 0.085); // ขั้นสูงโซนทองแคบลง
    let streak = 0, pos = 0.5, done = false;

    const wrap = el('div', 'mg-krata');
    const track = el('div', 'mg-krata-track');
    const zone = el('div', 'mg-krata-zone');
    zone.style.left = `${(0.5 - zoneHalf) * 100}%`;
    zone.style.width = `${zoneHalf * 2 * 100}%`;
    const marker = el('div', 'mg-krata-marker', '🔥');
    track.append(zone, marker);
    const totalBar = el('div', 'mg-bar'); const totalFill = el('div', 'mg-bar-fill'); totalBar.appendChild(totalFill);
    const hint = el('div', 'mg-krata-hint', `ติดต่อกัน 0/${NEED}`);
    const hit = el('button', 'gold mg-krata-hit', '🪭 พัดไฟ');
    wrap.append(track, totalBar, hint, hit);
    host.appendChild(wrap);

    function finish(won) { if (done) return; done = true; stop(); won ? onWin() : onLose(); }

    hit.onclick = () => {
      if (done) return;
      const dist = Math.abs(pos - 0.5);
      if (dist <= zoneHalf) {
        streak++; hint.textContent = `ติดต่อกัน ${streak}/${NEED}`;
        marker.classList.add('good'); setTimeout(() => marker.classList.remove('good'), 160);
        if (streak >= NEED) { finish(true); return; }
      } else {
        streak = 0; hint.textContent = `พลาด — ติดต่อกัน 0/${NEED}`;
        marker.classList.add('bad'); setTimeout(() => marker.classList.remove('bad'), 160);
      }
    };

    const start = performance.now();
    const stop = rafLoop(now => {
      const t = now - start;
      pos = 0.5 + 0.44 * Math.sin((2 * Math.PI * t) / period);
      marker.style.left = `${pos * 100}%`;
      marker.dataset.pos = pos.toFixed(3);   // ไว้ให้ QA/ทดสอบอ่านตำแหน่งจริงได้ตรง ๆ
      const p = Math.min(1, t / total);
      totalFill.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
