// src/walk-motion.js — กติกาเดินของยมบาทน้อยในห้อง (room.js) และชายแดน (frontier.js) ที่เดียว
//
// เดิมสองไฟล์มีสูตรของตัวเอง (ห้อง 1.3 ความสูงตัว/วินาที · ชายแดน 3.8) และทั้งคู่ "ตัด dt ที่ 50ms"
// ทำให้ความเร็วจริงตกตามเฟรมเรต (เฟรมช้า 12fps = เดินได้ 60% ของที่ควร) — ดูรายงาน output/Toby/2026-10-09-avegee-f1.md
// ที่นี่: ความเร็วนับเป็น "ความสูงตัวละครต่อวินาที" (เท่ากันทุกจอ/ทุกฉาก) · เวลาที่เกิดจริงถูกหั่นเป็นก้อนเล็ก
// เดินทีละก้อน จึงไม่ว่าเฟรมเรตเท่าไรก็ได้ระยะเท่าเดิม · เฟรมท่าเดินผูกกับระยะที่เดินจริง

/** ความเร็วเดิน — ความสูงตัวละคร/วินาที (แผนที่โซน: 190 หน่วย/วิ ÷ ตัวสูง 73.6 = 2.58) */
export const WALK_SPEED_H = 2.5;
/** ระยะเดินต่อ 1 เฟรมของท่าเดิน — สัดส่วนความสูงตัวละคร (แผนที่โซน: 14 ÷ 73.6 = 0.19) */
export const WALK_STRIDE_H = 0.2;
/** ก้อนเวลาสูงสุดต่อการเดินหนึ่งก้อน (ms) — เล็กพอไม่ให้ทะลุกำแพง/ข้ามจุดหมาย */
export const WALK_SLICE_MS = 20;
/** เวลาจริงสูงสุดที่ยอมไล่ตามต่อเฟรม (ms) — เกินนี้ถือว่าแท็บหลับ/ค้าง ไม่วาร์ปตัวละคร */
export const WALK_MAX_CATCHUP_MS = 250;
/** ยังนับว่า "กำลังเดิน" ต่ออีกกี่ ms (เวลาในเกม ไม่ใช่เวลานาฬิกา) หลังก้าวล่าสุด */
export const WALK_GRACE_MS = 120;

/** ระยะก้าว (พิกเซล) ของเวลา dt ms สำหรับตัวละครสูง heroPx พิกเซล */
export const walkStridePx = (heroPx, dt) => WALK_SPEED_H * heroPx * dt / 1000;

/** เฟรมท่าเดิน (0-3) จากระยะที่เดินจริงเป็นพิกเซล */
export const walkPhase = (distPx, heroPx) => Math.floor(Math.max(0, distPx) / (heroPx * WALK_STRIDE_H)) % 4;

/** หั่น dt ที่เกิดจริงเป็นก้อนเล็ก ๆ — คืนรายการ ms ของแต่ละก้อน (ผลรวม = min(dt, เพดาน)) */
export function walkSlices(dt, maxMs = WALK_MAX_CATCHUP_MS, slice = WALK_SLICE_MS) {
  const out = [];
  let rest = Math.max(0, Math.min(dt, maxMs));
  while (rest > 1e-6) { const s = Math.min(rest, slice); out.push(s); rest -= s; }
  return out;
}

/** art.js drawHeroWalk นับเฟรมละ 14 หน่วย — แปลงระยะพิกเซลให้ได้เฟรมตรงกับ walkPhase */
export const WALK_ART_STRIDE = 14;
export const walkDrawDistance = (distPx, heroPx) => distPx / (heroPx * WALK_STRIDE_H) * WALK_ART_STRIDE;
