// remorse.js — ความสำนึกของวิญญาณ (P4 · Vera §5.2)
// ย้ายการสุ่ม "เข็ด/ไม่เข็ด" จากตอนนิราตรวจ มาสุ่มครั้งเดียวตอนจบทัณฑ์ แล้วเก็บเป็นตัวเลข 0–100
// ความน่าจะเป็นของผลลัพธ์ "เท่าเดิมทุกกรณี" (ห้ามเปลี่ยนสมดุล):
//   short <= 0          → เข็ดเสมอ                 (เดิม: short<=0 → repentant)
//   short  > 0          → เข็ด 30% (1 − RETURN.chance) · ไม่เข็ด 70%  (เดิม: Math.random() > RETURN.chance)
// ผลพลอยได้: โหลดเซฟแล้วตรวจซ้ำเพื่อสุ่มใหม่ไม่ได้อีก
import { RETURN, REMORSE_PASS } from './data.js';

const between = (lo, hi, rng) => lo + Math.floor(rng() * (hi - lo + 1));

/** @param {number} short ทัณฑ์ที่ให้ "เบาไป" กี่หน่วย (verdict.short) · @param {() => number} rng สุ่ม [0,1) */
export function rollRemorse(short, rng = Math.random) {
  if (!(short > 0)) return between(65, 100, rng);
  return rng() > RETURN.chance ? between(REMORSE_PASS, 85, rng) : between(25, 54, rng);
}

/** เซฟเก่าที่ไม่มี remorse → undefined (ผู้เรียกใช้การสุ่มแบบเดิมต่อไป) */
export const remorseOf = entry => Number.isFinite(entry?.remorse) ? entry.remorse : undefined;
export const isRepentant = remorse => remorse >= REMORSE_PASS;
