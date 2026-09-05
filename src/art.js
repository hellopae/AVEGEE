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
const hash = (x, y) => {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
};

export const PAL = {
  rock:   ['#241017', '#2c141c', '#1e0d14'],
  rockHi: '#3a1d26',
  ash:    ['#3b2b2f', '#443034'],
  lava:   ['#ff7b21', '#ff9d3a'],
  ember:  '#ffb457',
  edge:   '#12070b',
  glow:   'rgba(255,120,40,',
};

/** พื้นหิน — ออบซิเดียนแตกลาย */
function tileRock(ctx, px, py, tx, ty) {
  const r = hash(tx, ty);
  ctx.fillStyle = PAL.rock[Math.floor(r * 3)];
  ctx.fillRect(px, py, TILE, TILE);
  if (r > 0.72) {
    ctx.strokeStyle = PAL.rockHi; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 4 + r * 8, py + 4);
    ctx.lineTo(px + TILE - 6, py + 10 + r * 12);
    ctx.stroke();
  }
  if (r < 0.08) { // เศษหินเล็ก
    ctx.fillStyle = PAL.rockHi;
    ctx.fillRect(px + 10, py + 18, 6, 4);
  }
}

/** ทางเดินขี้เถ้า */
function tilePath(ctx, px, py, tx, ty) {
  const r = hash(tx + 91, ty);
  ctx.fillStyle = PAL.ash[r > .5 ? 0 : 1];
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = 'rgba(255,200,150,.07)';
  for (let i = 0; i < 3; i++) {
    const q = hash(tx * 7 + i, ty * 3 + i);
    ctx.fillRect(px + q * 26, py + hash(i, tx + ty) * 26, 3, 2);
  }
}

/** ธารลาวา — เรืองแสงด้วยโค้ด ไม่ใช้เฟรมอนิเมชัน */
function tileLava(ctx, px, py, tx, ty, t) {
  const r = hash(tx, ty);
  const puls = 0.5 + 0.5 * Math.sin(t / 620 + (tx + ty) * 0.7);
  const g = ctx.createLinearGradient(px, py, px, py + TILE);
  g.addColorStop(0, `rgb(${200 + puls * 55},${60 + puls * 50},20)`);
  g.addColorStop(1, `rgb(${150 + puls * 40},${30 + puls * 30},14)`);
  ctx.fillStyle = g;
  ctx.fillRect(px, py, TILE, TILE);
  if (r > 0.6) {
    ctx.fillStyle = `rgba(255,220,140,${0.25 + puls * 0.35})`;
    ctx.beginPath();
    ctx.ellipse(px + 8 + r * 14, py + 12 + r * 8, 5, 2.5, 0, 0, 7);
    ctx.fill();
  }
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

// ---------- สถานี ----------
/** ฐานสถานี + สัญลักษณ์ · ถ้ามี img/st-<k>.png จะใช้รูปนั้นเต็มช่อง */
export function drawStation(ctx, def, px, py, size, opt = {}) {
  const im = img('st-' + def.k);
  if (im) { ctx.drawImage(im, px, py, size, size); }
  else {
    const cx = px + size / 2, by = py + size - 6;
    // เงา
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.beginPath(); ctx.ellipse(cx, by, size * 0.38, size * 0.13, 0, 0, 7); ctx.fill();
    // แท่นหิน
    const g = ctx.createLinearGradient(px, py + size * .4, px, by);
    g.addColorStop(0, '#5a2a30'); g.addColorStop(1, '#2a1219');
    ctx.fillStyle = g;
    rr(ctx, px + size * .12, py + size * .38, size * .76, size * .5, 6); ctx.fill();
    ctx.strokeStyle = '#7d3a3f'; ctx.lineWidth = 1.5; ctx.stroke();
    // หลังคาไทย
    ctx.fillStyle = opt.active ? '#a8331f' : '#6b2419';
    ctx.beginPath();
    ctx.moveTo(cx, py + size * .06);
    ctx.lineTo(px + size * .06, py + size * .42);
    ctx.lineTo(px + size * .94, py + size * .42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9973f';
    ctx.fillRect(px + size * .04, py + size * .4, size * .92, 3);
    // สัญลักษณ์
    ctx.font = `${Math.round(size * .34)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(def.glyph, cx, py + size * .66);
  }
  if (opt.active) { // แสงตอนทำงาน — โค้ดล้วน
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

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
