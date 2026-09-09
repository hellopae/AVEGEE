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
// ลาวาจริงเป็นส้ม-แดงจัด: แดงสูง เขียวต่ำกว่าแดงมาก น้ำเงินแทบไม่มี
// เงื่อนไขเดิม (แดง-น้ำเงิน > 90) ไปกินไม้สะพานสีน้ำตาลอ่อน (219,162,121) ด้วย
// ผลคือราวสะพานไม้เหนือลาวากลายเป็นกำแพงขวางทางทั้งเส้น เดินข้ามไม่ได้ (เจอ 7 ก.ย. 2569)
// เกณฑ์เขียวคือตัวแยก: ลาวา g/r ราว 0.3-0.4 · ไม้ g/r ราว 0.7
const isLava = (d, x, y) => {
  const i = ((y | 0) * SCENE.w + (x | 0)) * 4;
  const r = d[i], g = d[i + 1], b = d[i + 2];
  return r > 150 && r - b > 90 && g < r * 0.62;
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
  okGrid = null;                                  // ตารางหาเส้นทางต้องสร้างใหม่
  sealIslands();
}

/** อุดเกาะเล็ก ๆ ที่เดินไปไม่ถึง — ก้อนหินกลางธารลาวาอ่านสีแล้วเป็น "เดินได้"
 *  ปล่อยไว้ของที่ตก/เปรตจะไปโผล่บนนั้นแล้วเอาไม่ได้ตลอดเกม
 *  เก็บไว้เฉพาะผืนใหญ่ที่สุดผืนเดียว ที่เหลือถือว่าห้ามเข้า */
function sealIslands() {
  const G = grid();
  const comp = new Int32Array(COLS * ROWS).fill(-1);
  let bestId = -1, bestN = 0, id = 0;
  for (let s = 0; s < G.length; s++) {
    if (!G[s] || comp[s] >= 0) continue;
    const q = [s]; comp[s] = id;
    for (let h = 0; h < q.length; h++) {
      const cur = q[h], cx = cur % COLS, cy = cur / COLS | 0;
      for (const [dx, dy] of DIRS) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        const nk = ny * COLS + nx;
        if (!G[nk] || comp[nk] >= 0) continue;
        comp[nk] = id; q.push(nk);
      }
    }
    if (q.length > bestN) { bestN = q.length; bestId = id; }
    id++;
  }
  for (let i = 0; i < G.length; i++) if (G[i] && comp[i] !== bestId) mask[i] = 1;
  okGrid = null;
}

// ---------- หาเส้นทาง ----------
let okGrid = null;
const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

/** ตารางเดินได้แบบแบน — cache ไว้เพราะ BFS ถามช่องเดิมซ้ำหลายรอบ */
function grid() {
  if (okGrid) return okGrid;
  okGrid = new Uint8Array(COLS * ROWS);
  for (let cy = 0; cy < ROWS; cy++)
    for (let cx = 0; cx < COLS; cx++)
      okGrid[cy * COLS + cx] = canWalk(cx * CELL + CELL / 2, cy * CELL + CELL / 2) ? 1 : 0;
  return okGrid;
}

/** เดินเส้นตรงจาก a ไป b ได้ตลอดสายไหม — ใช้ดัดเส้นทางให้ไม่หักซิกแซก */
function clearLine(a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const n = Math.ceil(Math.hypot(dx, dy) / (CELL / 2));
  for (let i = 1; i <= n; i++)
    if (!canWalk(a[0] + dx * i / n, a[1] + dy * i / n)) return false;
  return true;
}

/** เส้นทางเดินจาก (fx,fy) ไป (tx,ty) — BFS บนตารางเดียวกับ canWalk
 *  คืนลิสต์จุดแวะ (ไม่รวมจุดเริ่ม) · null ถ้าขยับไม่ได้เลย
 *  ไปไม่ถึงจริง ๆ จะพาไปช่องที่เดินถึงและใกล้ปลายทางที่สุดแทน — ดีกว่ายืนนิ่งเฉย
 *  ใช้ BFS เพราะแผนที่แค่ 191×88 ช่อง ไม่ต้องถึง A* */
export function findPath(fx, fy, tx, ty) {
  const G = grid();
  const cell = (x, lim) => Math.max(0, Math.min(lim - 1, x / CELL | 0));
  const sx = cell(fx, COLS), sy = cell(fy, ROWS);
  const gx = cell(tx, COLS), gy = cell(ty, ROWS);
  const start = sy * COLS + sx, goal = gy * COLS + gx;
  if (start === goal) return [[tx, ty]];

  const prev = new Int32Array(COLS * ROWS).fill(-2);
  prev[start] = -1;
  const q = [start];
  let best = start, bestD = (sx - gx) ** 2 + (sy - gy) ** 2, found = -1;

  for (let h = 0; h < q.length; h++) {
    const cur = q[h], cx = cur % COLS, cy = cur / COLS | 0;
    if (cur === goal) { found = cur; break; }
    const d = (cx - gx) ** 2 + (cy - gy) ** 2;
    if (d < bestD) { bestD = d; best = cur; }
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      const nk = ny * COLS + nx;
      if (prev[nk] !== -2 || !G[nk]) continue;
      // ห้ามตัดมุมทะแยงลอดกำแพง
      if (dx && dy && (!G[cy * COLS + nx] || !G[ny * COLS + cx])) continue;
      prev[nk] = cur; q.push(nk);
    }
  }

  let node = found >= 0 ? found : best;
  if (node === start) return null;
  const cells = [];
  while (node !== start && node >= 0) { cells.push(node); node = prev[node]; }
  cells.reverse();
  const pts = cells.map(k => [(k % COLS) * CELL + CELL / 2, (k / COLS | 0) * CELL + CELL / 2]);
  if (found >= 0) pts[pts.length - 1] = [tx, ty];        // ปลายทางใช้พิกัดที่คลิกจริง

  // ดัดเส้นทาง: มองข้ามจุดแวะที่เดินตรงข้ามไปได้เลย (มองไกลสุด 40 ช่อง กันช้า)
  const all = [[fx, fy], ...pts], out = [];
  let i = 0;
  while (i < all.length - 1) {
    let j = Math.min(all.length - 1, i + 40);
    while (j > i + 1 && !clearLine(all[i], all[j])) j--;
    out.push(all[j]); i = j;
  }
  return out;
}

/** ฐานอาคารที่สร้างแล้ว — เดินทับไม่ได้ (9 ก.ย. 2569)
 *  game.js เป็นคนส่งเข้ามาทุกครั้งที่รายการสถานีเปลี่ยน (สร้างเสร็จ · ถูกเผาพัง · ย้ายโซน) */
let blocks = [], holes = [];
export function setBlocks(rects, keepOpen) {
  blocks = (rects || []).filter(Boolean);
  // holes = จุดที่ต้องเหยียบได้เสมอถึงกรอบอาคารจะทับ — จุดยืนของผู้คุมประจำหลังนั้น
  // (หอทะเบียนกรรมวางจุดยืนไว้ "ใต้ชายคา" พอปิดฐานอาคารแล้วยมทูตเข้าประจำที่ไม่ได้เลย)
  holes = (keepOpen || []).filter(Boolean);
  okGrid = null;                                  // ตารางหาเส้นทางต้องสร้างใหม่
}

/** จุดนี้เหยียบได้ไหม */
export function canWalk(x, y) {
  if (x < 0 || y < 0 || x > SCENE.w || y > SCENE.h) return false;
  for (const r of WALK_OK) if (inRect(x, y, r)) return true;   // สะพาน/ท่าเรือ ทับกรอบห้ามได้
  // NO_WALK (แม่น้ำวิญญาณ · ผาหิน) ต้องมาก่อน holes เสมอ
  // ไม่งั้นทางเดินที่เจาะให้ผู้คุมจะทะลุลงแม่น้ำ แล้วตัวละครเดินลงไปติดอยู่ในนั้น
  // (เจ้าของเจอ 10 ก.ย. 2569: ยืนค้างอยู่ใต้ศาลาน้ำชา ขยับไปไหนไม่ได้เลย)
  for (const r of NO_WALK) if (inRect(x, y, r)) return false;
  for (const h of holes) if (inRect(x, y, h)) return true;     // จุดยืนของผู้คุม (ทะลุตัวอาคารได้อย่างเดียว)
  for (const r of blocks) if (inRect(x, y, r)) return false;   // ตัวอาคาร
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
