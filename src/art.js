// art.js — ชั้นวาดภาพทั้งหมด
// กฎ: โค้ดวาด placeholder เองได้ครบทุกชิ้น ถ้ามีไฟล์ img/<key>.png ให้ใช้ไฟล์แทนอัตโนมัติ
// => ดรอปรูปจริงลงโฟลเดอร์ img/ แล้วเกมเปลี่ยนหน้าตาทันที โดยไม่ต้องแตะโค้ดสักบรรทัด

import { TILE } from './data.js';

const CACHE = new Map();

/** ขอรูปจริง คืน null ถ้ายังไม่มีไฟล์ (แล้วผู้เรียกวาด placeholder เอง) */
export function img(key) {
  if (CACHE.has(key)) { const im = CACHE.get(key); return im && im.ok ? im.el : null; }
  const el = new Image();
  const rec = { el, ok: false };
  el.onload = () => { rec.ok = true; };
  el.onerror = () => { rec.ok = false; };
  el.src = `img/${key}.png`;
  CACHE.set(key, rec);
  return null;
}

// ---------- สุ่มแบบคงที่ (tile เดิมได้หน้าตาเดิมทุกเฟรม) ----------
export const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

/** พื้นหินออบซิเดียน — เข้ม มีรอยแตกเรืองแดงจาง ๆ และเศษหินอุ่น */
function tileRock(ctx, px, py, tx, ty) {
  const r = hash(tx, ty), r2 = hash(tx + 101, ty + 7);
  const base = ['#1c0f16', '#22131b', '#180d13', '#261620'][Math.floor(r * 4)];
  ctx.fillStyle = base;
  ctx.fillRect(px, py, TILE, TILE);

  // ผิวหินเป็นเหลี่ยม ๆ ให้ไม่เรียบเป็นแผ่นเดียว
  ctx.fillStyle = 'rgba(255,190,150,.035)';
  ctx.fillRect(px + 2 + r * 6, py + 3 + r2 * 5, 12 + r * 10, 9 + r2 * 8);
  ctx.fillStyle = 'rgba(0,0,0,.22)';
  ctx.fillRect(px + 16 + r2 * 8, py + 17 + r * 7, 10, 8);

  if (r > 0.80) { // รอยแตกเรืองแดง
    ctx.strokeStyle = `rgba(214,74,40,${0.18 + r * 0.22})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 3 + r * 8, py + 2);
    ctx.lineTo(px + 12 + r2 * 8, py + 15);
    ctx.lineTo(px + TILE - 4, py + TILE - 5);
    ctx.stroke();
  }
  if (r2 > 0.90) { // เศษหินก้อนเล็ก
    ctx.fillStyle = '#3a222c'; ctx.fillRect(px + 9, py + 19, 7, 5);
    ctx.fillStyle = '#4d2d38'; ctx.fillRect(px + 9, py + 19, 7, 2);
  }
  if (r < 0.05) { // ปล่องไอร้อน
    ctx.fillStyle = 'rgba(255,120,50,.30)';
    ctx.beginPath(); ctx.ellipse(px + 16, py + 20, 5, 2.5, 0, 0, 7); ctx.fill();
  }
}

/** ทางเดิน — แผ่นหินปูเรียง ขอบเข้ม อ่านออกว่าเป็นถนน */
function tilePath(ctx, px, py, tx, ty) {
  const r = hash(tx + 91, ty + 13);
  ctx.fillStyle = '#3a2b30';
  ctx.fillRect(px, py, TILE, TILE);
  // แผ่นหินปู 2×2 ต่อ tile
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
    const q = hash(tx * 2 + i, ty * 2 + j);
    ctx.fillStyle = ['#463337', '#4d383c', '#402e33'][Math.floor(q * 3)];
    ctx.fillRect(px + i * 16 + 1, py + j * 16 + 1, 14, 14);
    if (q > 0.85) { ctx.fillStyle = 'rgba(255,210,160,.10)'; ctx.fillRect(px + i * 16 + 1, py + j * 16 + 1, 14, 3); }
  }
  if (r > 0.88) { ctx.fillStyle = 'rgba(255,200,150,.09)'; ctx.fillRect(px + 6 + r * 12, py + 10, 4, 3); }
}

/** ธารลาวา — เปลือกดำแตกเป็นแพ มีร่องส้มสว่างไหลอยู่ข้างใต้ */
function tileLava(ctx, px, py, tx, ty, t) {
  const r = hash(tx, ty), r2 = hash(tx + 55, ty + 31);
  const puls = 0.5 + 0.5 * Math.sin(t / 900 + tx * 1.7 + ty * 2.3);
  // ร่องลาวาสว่าง
  ctx.fillStyle = `rgb(${226 + puls * 26},${96 + puls * 52},${24 + puls * 16})`;
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = `rgba(255,236,170,${0.20 + puls * 0.30})`;
  ctx.fillRect(px + 4 + r * 8, py + 6 + r2 * 6, 14 + r * 8, 5);
  // เปลือกดำลอยเป็นแพ ตำแหน่งคงที่ต่อ tile
  ctx.fillStyle = '#1a0c10';
  if (r > 0.30) ctx.fillRect(px + 1 + r * 5, py + 1, 13 + r2 * 8, 11 + r * 6);
  if (r2 > 0.42) ctx.fillRect(px + 14 + r2 * 6, py + 16 + r * 6, 12 + r * 6, 12);
  if (r2 < 0.28) ctx.fillRect(px, py + 20 + r * 4, 10 + r2 * 10, 10);
  ctx.fillStyle = `rgba(255,150,60,${0.10 + puls * 0.10})`;   // ไอความร้อน
  ctx.fillRect(px, py, TILE, TILE);
}

export function drawTile(ctx, type, tx, ty, t) {
  const px = tx * TILE, py = ty * TILE;
  // รูปจริง: ไฟล์เดี่ยว img/tile-<type>.png (texture ต่อขอบได้) — gen ง่ายกว่า atlas
  const single = img('tile-' + type);
  if (single) { ctx.drawImage(single, px, py, TILE, TILE); return; }
  const sheet = img('tileset');   // หรือ atlas เรียงแนวนอน rock|path|lava ช่องละ TILE
  if (sheet) {
    const idx = { rock: 0, path: 1, lava: 2 }[type] ?? 0;
    ctx.drawImage(sheet, idx * TILE, 0, TILE, TILE, px, py, TILE, TILE);
    return;
  }
  if (type === 'lava') tileLava(ctx, px, py, tx, ty, t);
  else if (type === 'path') tilePath(ctx, px, py, tx, ty);
  else tileRock(ctx, px, py, tx, ty);
}

/** เงาขอบระหว่างพื้นต่างชนิด — ตัวที่ทำให้แผนที่ดูมีความลึก ไม่แบน */
export function drawEdges(ctx, map, W, H) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = map[y][x], px = x * TILE, py = y * TILE;
    const up = y > 0 ? map[y - 1][x] : c;
    if (c !== 'rock' && up === 'rock') {           // ขอบบนของถนน/ลาวา = เงาหินทับลงมา
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(px, py, TILE, 5);
    }
    if (c === 'rock' && up !== 'rock') {           // ขอบล่าง = แสงสะท้อนขึ้นหิน
      ctx.fillStyle = up === 'lava' ? 'rgba(255,120,40,.22)' : 'rgba(255,220,180,.05)';
      ctx.fillRect(px, py, TILE, 4);
    }
    const lf = x > 0 ? map[y][x - 1] : c;
    if (c !== lf) { ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(px, py, 3, TILE); }
  }
}

/** แสงลาวาสาดขึ้นพื้นรอบ ๆ */
export function drawLavaGlow(ctx, map, W, H, t) {
  const p = 0.5 + 0.5 * Math.sin(t / 1400);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (map[y][x] !== 'lava') continue;
    const g = ctx.createRadialGradient(x * TILE + 16, y * TILE + 16, 4, x * TILE + 16, y * TILE + 16, TILE * 2.4);
    g.addColorStop(0, `rgba(255,120,40,${0.16 + p * 0.06})`);
    g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x * TILE - TILE * 2, y * TILE - TILE * 2, TILE * 5, TILE * 5);
  }
}

// ---------- ของประดับพื้น ----------
/** วาดของประดับหนึ่งชิ้น — ทับด้วย img/prop-<kind>.png ได้ */
export function drawProp(ctx, kind, px, py, t) {
  const im = img('prop-' + kind);
  if (im) { ctx.drawImage(im, px, py - TILE, TILE * 1.2, TILE * 1.6); return; }
  const cx = px + TILE / 2, by = py + TILE - 4;
  const shadow = (w) => { ctx.fillStyle = 'rgba(0,0,0,.42)'; ctx.beginPath(); ctx.ellipse(cx, by, w, w * .34, 0, 0, 7); ctx.fill(); };

  if (kind === 'rock') {
    shadow(9);
    ctx.fillStyle = '#33202a'; ctx.beginPath();
    ctx.moveTo(cx - 9, by); ctx.lineTo(cx - 5, by - 11); ctx.lineTo(cx + 4, by - 13); ctx.lineTo(cx + 9, by - 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3040'; ctx.beginPath();
    ctx.moveTo(cx - 5, by - 11); ctx.lineTo(cx + 4, by - 13); ctx.lineTo(cx + 2, by - 7); ctx.closePath(); ctx.fill();

  } else if (kind === 'thorn') {           // ต้นงิ้วเล็ก
    shadow(7);
    ctx.strokeStyle = '#2b1a22'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx - 1, by - 20); ctx.stroke();
    ctx.strokeStyle = '#3d2530'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      const yy = by - 5 - i * 4, d = i % 2 ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(cx, yy); ctx.lineTo(cx + d * 6, yy - 4); ctx.stroke();
    }

  } else if (kind === 'bones') {
    shadow(8);
    ctx.fillStyle = '#c9bdb0';
    ctx.fillRect(cx - 8, by - 4, 14, 3); ctx.fillRect(cx - 3, by - 8, 12, 3);
    ctx.beginPath(); ctx.arc(cx + 5, by - 10, 4, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1a1e'; ctx.fillRect(cx + 3, by - 11, 2, 2); ctx.fillRect(cx + 6, by - 11, 2, 2);

  } else if (kind === 'lantern') {
    const p = 0.5 + 0.5 * Math.sin(t / 500 + px);
    shadow(6);
    ctx.fillStyle = `rgba(255,140,60,${0.10 + p * 0.10})`;
    ctx.beginPath(); ctx.arc(cx, by - 26, 20, 0, 7); ctx.fill();
    ctx.strokeStyle = '#2a1a20'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, by); ctx.lineTo(cx, by - 20); ctx.stroke();
    ctx.fillStyle = `rgb(${200 + p * 40},${70 + p * 40},50)`;
    rr(ctx, cx - 6, by - 32, 12, 13, 3); ctx.fill();
    ctx.fillStyle = '#c9973f'; ctx.fillRect(cx - 7, by - 33, 14, 3);

  } else if (kind === 'urn') {
    shadow(8);
    ctx.fillStyle = '#4a3128';
    ctx.beginPath(); ctx.ellipse(cx, by - 8, 8, 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#5d3f33'; ctx.beginPath(); ctx.ellipse(cx - 2, by - 11, 4, 5, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#2a1a1e'; ctx.fillRect(cx - 5, by - 18, 10, 4);
  }
}

// ---------- สถานี ----------
/** ฐานสถานี + สัญลักษณ์ · ถ้ามี img/st-<k>.png จะใช้รูปนั้นเต็มช่อง */
export function drawStation(ctx, def, px, py, size, opt = {}) {
  const im = img('st-' + def.k);
  if (im) { ctx.drawImage(im, px, py, size, size); }
  else {
    const cx = px + size / 2, by = py + size - 6;
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath(); ctx.ellipse(cx, by, size * 0.40, size * 0.14, 0, 0, 7); ctx.fill();
    // ลานหินรองอาคาร
    ctx.fillStyle = '#2e1c24';
    rr(ctx, px + size * .06, py + size * .52, size * .88, size * .42, 5); ctx.fill();
    ctx.strokeStyle = '#472a34'; ctx.lineWidth = 1; ctx.stroke();
    // ตัวอาคาร
    const g = ctx.createLinearGradient(px, py + size * .4, px, by);
    g.addColorStop(0, '#63303a'); g.addColorStop(1, '#2a1219');
    ctx.fillStyle = g;
    rr(ctx, px + size * .16, py + size * .36, size * .68, size * .48, 5); ctx.fill();
    ctx.strokeStyle = '#8a444a'; ctx.lineWidth = 1.5; ctx.stroke();
    // หลังคาไทยสองชั้น
    const roof = (yTop, yBot, w) => {
      ctx.beginPath();
      ctx.moveTo(cx, py + yTop);
      ctx.lineTo(cx - w, py + yBot); ctx.lineTo(cx + w, py + yBot);
      ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = opt.active ? '#b03a22' : '#7a2a1c';
    roof(size * .02, size * .30, size * .40);
    ctx.fillStyle = opt.active ? '#8f2d1a' : '#601f14';
    roof(size * .20, size * .44, size * .48);
    ctx.fillStyle = '#c9973f';
    ctx.fillRect(px + size * .02, py + size * .42, size * .96, 3);
    // ช่อฟ้า
    ctx.strokeStyle = '#d4a355'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, py + size * .04); ctx.lineTo(cx - 4, py - size * .04); ctx.stroke();
    // สัญลักษณ์
    ctx.font = `${Math.round(size * .28)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, cx, py + size * .64);
  }
  if (opt.active) {
    const p = 0.5 + 0.5 * Math.sin((opt.t || 0) / 300);
    ctx.fillStyle = `rgba(255,130,40,${0.10 + p * 0.16})`;
    ctx.beginPath(); ctx.arc(px + size / 2, py + size * .6, size * .62, 0, 7); ctx.fill();
  }
}

/** วิญญาณ — จุดเรืองแสงลอย (ทำด้วยโค้ด 0 เฟรม) */
export function drawSoul(ctx, x, y, r, t, tint = '#bfe9ff') {
  const bob = Math.sin(t / 400 + x) * 2;
  ctx.fillStyle = 'rgba(140,200,255,.16)';
  ctx.beginPath(); ctx.arc(x, y + bob, r * 2.1, 0, 7); ctx.fill();
  ctx.fillStyle = tint;
  ctx.beginPath(); ctx.arc(x, y + bob, r, 0, 7); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x - r * .45, y + bob - r * .25, 2, 2);
  ctx.fillRect(x + r * .25, y + bob - r * .25, 2, 2);
}

/** ยมทูต — ยืนเฝ้าสถานี */
export function drawCrew(ctx, c, x, y, h, t) {
  const im = img('crew-' + c.k);
  if (im) { ctx.drawImage(im, x - h / 2, y - h, h, h); return; }
  ctx.fillStyle = 'rgba(0,0,0,.4)';
  ctx.beginPath(); ctx.ellipse(x, y, h * .28, h * .09, 0, 0, 7); ctx.fill();
  ctx.font = `${Math.round(h * .8)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(c.glyph, x, y - 2 + Math.sin(t / 700 + h) * 1.2);
}

/** ขี้เถ้าลอย — บรรยากาศฟรี ไม่ใช้ไฟล์รูป */
export function drawEmbers(ctx, w, h, t) {
  for (let i = 0; i < 34; i++) {
    const sp = 0.4 + hash(i, 3) * 0.9;
    const x = (hash(i, 1) * w + Math.sin(t / 2200 + i) * 18) % w;
    const y = h - ((t * 0.014 * sp + hash(i, 2) * h) % (h + 40));
    const a = 0.20 + 0.35 * hash(i, 5) * (0.5 + 0.5 * Math.sin(t / 700 + i));
    ctx.fillStyle = `rgba(255,${150 + hash(i, 9) * 70 | 0},80,${a})`;
    ctx.fillRect(x, y, 2, 2);
  }
}

/** ขอบจอมืดลง ให้สายตาอยู่กลางแผนที่ */
export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.32, w / 2, h / 2, h * 0.92);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,3,6,.55)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
