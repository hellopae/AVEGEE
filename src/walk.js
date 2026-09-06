// walk.js — พื้นที่ที่เดินได้ (6 ก.ย. 2569)
// เดิมยมบาทเดินทะลุลาวากับแม่น้ำวิญญาณได้ ทำให้ฉากเสียความหมาย
//
// วิธีคิด: ธารลาวาเป็นรูปทรงงูเลื้อย วัดเป็นกรอบสี่เหลี่ยมด้วยมือไม่สวย
// เลย **อ่านสีจาก img/scene.png เอง** — ลาวาเป็นสีเดียวในฉากที่ R สูงกว่า B มาก
// ข้อดีคือถ้าเป้วาดฉากใหม่แล้วลาวาย้ายที่ ทางเดินขยับตามเองโดยไม่ต้องแก้โค้ด
// ส่วนแม่น้ำ/ผาหินรอบโซนเป็นเส้นตรง เลยกำหนดเป็นกรอบใน data.js ตรง ๆ (NO_WALK / WALK_OK)

import { SCENE, NO_WALK, WALK_OK } from './data.js';

const CELL = 8;                                   // ความละเอียดตาราง (พิกัดฉาก)
const COLS = Math.ceil(SCENE.w / CELL);
const ROWS = Math.ceil(SCENE.h / CELL);
let mask = null;                                  // null = ยังไม่สร้าง · 'off' = อ่านพิกเซลไม่ได้

const inRect = (x, y, r) => x >= r[0] && y >= r[1] && x <= r[2] && y <= r[3];
const isLava = (d, x, y) => {
  const i = ((y | 0) * SCENE.w + (x | 0)) * 4;
  return d[i] - d[i + 2] > 90 && d[i] > 150;
};

/** สร้างตารางครั้งเดียวตอนภาพฉากโหลดเสร็จ — เรียกซ้ำได้ ไม่ทำงานรอบสอง */
export function buildWalk(im) {
  if (mask || !im || !im.naturalWidth) return;
  const c = document.createElement('canvas');
  c.width = SCENE.w; c.height = SCENE.h;
  const cx = c.getContext('2d', { willReadFrequently: true });
  cx.drawImage(im, 0, 0, SCENE.w, SCENE.h);
  let d;
  try { d = cx.getImageData(0, 0, SCENE.w, SCENE.h).data; }
  catch { mask = 'off'; return; }                 // เปิดจาก file:// จะโดน canvas taint → ปล่อยเดินได้เหมือนเดิม
  mask = new Uint8Array(COLS * ROWS);
  for (let ry = 0; ry < ROWS; ry++) {
    for (let rx = 0; rx < COLS; rx++) {
      const x0 = rx * CELL, y0 = ry * CELL;
      let hit = 0;
      // สุ่ม 4 มุมของช่อง — ติดลาวาแม้แต่มุมเดียวก็ถือว่าห้ามเข้า
      // (ให้ลาวา "อ้วน" กว่าจริงนิดหน่อย ดีกว่าปล่อยให้เหยียบขอบไฟ)
      for (const [dx, dy] of [[2, 2], [CELL - 2, 2], [2, CELL - 2], [CELL - 2, CELL - 2]]) {
        const x = Math.min(SCENE.w - 1, x0 + dx), y = Math.min(SCENE.h - 1, y0 + dy);
        if (isLava(d, x, y)) { hit = 1; break; }
      }
      mask[ry * COLS + rx] = hit;
    }
  }
}

/** จุดนี้เหยียบได้ไหม */
export function canWalk(x, y) {
  if (x < 0 || y < 0 || x > SCENE.w || y > SCENE.h) return false;
  for (const r of WALK_OK) if (inRect(x, y, r)) return true;   // สะพาน/ท่าเรือ ทับกรอบห้ามได้
  for (const r of NO_WALK) if (inRect(x, y, r)) return false;
  if (!mask || mask === 'off') return true;
  const rx = Math.min(COLS - 1, x / CELL | 0), ry = Math.min(ROWS - 1, y / CELL | 0);
  return !mask[ry * COLS + rx];
}

/** ขยับตัวละครไปทาง (dx,dy) เท่าที่พื้นให้เดิน — ชนแล้วไถลไปตามขอบ ไม่ติดหนึบ
 *  คืน false เมื่อไปต่อไม่ได้เลย (ผู้เรียกใช้ยกเลิกจุดหมายที่ตั้งไว้) */
export function stepTo(p, dx, dy) {
  if (canWalk(p.x + dx, p.y + dy)) { p.x += dx; p.y += dy; return true; }
  if (dx && canWalk(p.x + dx, p.y)) { p.x += dx; return true; }
  if (dy && canWalk(p.x, p.y + dy)) { p.y += dy; return true; }
  return false;
}

/** จุดที่เดินได้ที่ใกล้ (x,y) ที่สุด — ใช้ตอนคลิกสั่งเดินลงลาวา/ลงน้ำ */
export function nearestWalk(x, y) {
  if (canWalk(x, y)) return [x, y];
  for (let r = CELL * 2; r <= 260; r += CELL * 2) {
    for (let a = 0; a < 20; a++) {
      const th = a / 20 * Math.PI * 2;
      const nx = x + Math.cos(th) * r, ny = y + Math.sin(th) * r;
      if (canWalk(nx, ny)) return [nx, ny];
    }
  }
  return null;
}
