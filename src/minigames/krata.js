// src/minigames/krata.js — กระทะทองแดง: "คุมไฟ" (ชุดที่ 9 คุณเป้ 24 ก.ย. 2569)
// ที่มา: Minnie 2A (Output/Minnie/2026-09-18-avegee-station-minigames.md)
//
// แก้ตาม FIX LIST ของ Dale (Output/Dale/2026-09-24-avegee-batch9-review.md, FIX-1):
// เดิมลดทั้ง zoneHalf กับ period พร้อมกันแบบเส้นตรง ทำให้ "เวลาที่เข็มอยู่ในโซนจริง" (dwell)
// หดตัวแบบทวีคูณ (ไม่ใช่เชิงเส้น) — ขั้น 2→3 ขึ้นไปเหลือ dwell แค่ ~50-100ms ต่ำกว่า latency
// การแตะจริงของคนทั่วไป (~100-150ms) ทำให้ไปไม่ถึงขั้น 5 ได้จริงแม้กลไกจะอนุญาต
//
// ตอนนี้คำนวณ zoneHalf "จาก period ปัจจุบัน" ตรง ๆ ให้ dwell คงที่ ~MIN_DWELL_MS ทุกขั้นเสมอ
// (สูตรตรงจาก pos(t)=0.5+0.44·sin(2π t/period): ช่วงเวลาที่ |pos-0.5|<=zoneHalf ต่อการแกว่งผ่าน
// จุดศูนย์กลางหนึ่งรอบ = asin(zoneHalf/0.44)·period/π เมื่อแก้สมการกลับหา zoneHalf ที่ทำให้
// dwell ตรง MIN_DWELL_MS พอดี — ไม่ต้องประมาณเชิงเส้นแบบเดิม แม่นตรงทุกขั้น) ความยากไล่ระดับ
// ผ่าน NEED (ต้องแตะติดกันกี่ครั้ง) แทน ไม่ใช่ผ่านเรขาคณิตที่กระทบความเป็นไปได้จริง
import { el, lerpByLevel, rafLoop } from './util.js';

const NEED_BY_LEVEL = [4, 5, 6, 7, 8];
const MIN_DWELL_MS = 220;   // เพดานปลอดภัยเหนือ latency ทดสอบจริงสูงสุดของ Dale (150ms) ~70ms

export default {
  name: 'คุมไฟ',
  icon: '🔥',
  tip: 'หัวไฟแกว่งซ้าย-ขวาตลอดเวลา — โซนจะเรืองเขียวเองตอนหัวไฟแกว่งเข้ามาพอดี ให้แตะ "พัดไฟ" ตอนนั้น ติดกันให้ครบตามจำนวนก่อนหมดเวลา',
  run(host, { level, alive, onWin, onLose }) {
    const NEED = NEED_BY_LEVEL[Math.max(0, Math.min(4, level))];
    const total = 20000;
    const period = lerpByLevel(level, 1900, 1500);   // ขั้นสูงแกว่งเร็วขึ้น (เดิม 1500→850 เร็วเกินจนคุมโซนไม่พอ)
    const zoneHalf = 0.44 * Math.sin((Math.PI * MIN_DWELL_MS) / period);  // dwell คงที่ ~220ms ทุกขั้น
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

    // ข้อ B ชุด 14 คุณเป้ 26 ก.ย. 2569 — คุณเป้เล่นแล้วไม่เข้าใจว่าต้องกดตอนไหน
    // เดิมรู้ผลได้ก็ต่อเมื่อกดไปแล้วเท่านั้น (ไม่มีสัญญาณ "อยู่ในโซนแล้วนะ" ระหว่างที่ยังไม่กด)
    // เพิ่มไฟเขียวที่ตัวโซนเองตอนหัวไฟแกว่งเข้ามาอยู่ในนั้นจริง (ไม่ต้องกดก่อนถึงจะรู้) —
    // ผู้เล่นเห็นแล้วค่อยตัดสินใจกดได้ทัน ไม่ใช่กดสุ่มแล้วดูผลย้อนหลัง
    hit.onclick = () => {
      if (done) return;
      const dist = Math.abs(pos - 0.5);
      if (dist <= zoneHalf) {
        streak++; hint.textContent = `✅ โดน! ติดต่อกัน ${streak}/${NEED}`;
        marker.classList.add('good'); setTimeout(() => marker.classList.remove('good'), 160);
        if (streak >= NEED) { finish(true); return; }
      } else {
        streak = 0; hint.textContent = `❌ พลาด — ติดต่อกัน 0/${NEED}`;
        marker.classList.add('bad'); setTimeout(() => marker.classList.remove('bad'), 160);
      }
    };

    const start = performance.now();
    const stop = rafLoop(now => {
      const t = now - start;
      pos = 0.5 + 0.44 * Math.sin((2 * Math.PI * t) / period);
      marker.style.left = `${pos * 100}%`;
      marker.dataset.pos = pos.toFixed(3);   // ไว้ให้ QA/ทดสอบอ่านตำแหน่งจริงได้ตรง ๆ
      const inZone = Math.abs(pos - 0.5) <= zoneHalf;
      zone.classList.toggle('in', inZone);
      marker.classList.toggle('in', inZone);
      const p = Math.min(1, t / total);
      totalFill.style.width = `${100 * (1 - p)}%`;
      if (p >= 1) finish(false);
    }, alive);

    return () => { done = true; stop(); };
  },
};
