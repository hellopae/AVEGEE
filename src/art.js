// art.js — ชั้นวาดภาพทั้งหมด
// กฎ: ทุกชิ้นต้องมี placeholder ที่โค้ดวาดเองได้ ถ้ามีไฟล์ img/<key>.png ให้ใช้ไฟล์แทนอัตโนมัติ
// => ดรอปรูปจริงลง img/ แล้วเกมเปลี่ยนหน้าตาทันที โดยไม่ต้องแตะโค้ดสักบรรทัด

const CACHE = new Map();

/** ขอรูปจริง คืน null ถ้ายังไม่มีไฟล์ (แล้วผู้เรียกวาด placeholder เอง) */
export function img(key) {
  if (CACHE.has(key)) { const r = CACHE.get(key); return r.ok ? r.el : null; }
  const el = new Image();
  const rec = { el, ok: false };
  el.onload = () => { rec.ok = true; };
  el.onerror = () => { rec.ok = false; };
  el.src = `img/${key}.png`;
  CACHE.set(key, rec);
  return null;
}

export const hash = (x, y) => {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// ---------- พื้นสำรอง (ใช้ตอนยังไม่มี img/scene.png) ----------
export const PAT = 256;
const PATS = new Map();

function patternFor(ctx, type) {
  if (PATS.has(type)) return PATS.get(type);
  const im = img('tile-' + type);
  if (!im) return null;
  const off = document.createElement('canvas');
  off.width = off.height = PAT;
  const oc = off.getContext('2d');
  oc.imageSmoothingEnabled = false;
  oc.drawImage(im, 0, 0, PAT, PAT);
  const pat = ctx.createPattern(off, 'repeat');
  PATS.set(type, pat);
  return pat;
}

/** ฉากยังไม่มา — ปูพื้นหินแล้ววางแท่นสถานีให้พอเล่นได้ */
export function drawFallbackGround(ctx, w, h, stations, g) {
  const rock = patternFor(ctx, 'rock');
  ctx.fillStyle = rock || '#1c0f16';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(18,7,13,.30)';
  ctx.fillRect(0, 0, w, h);
  for (const def of stations) {
    if (!g.stations.some(s => s.def.k === def.k)) continue;
    const [x1, y1, x2, y2] = def.hit;
    ctx.fillStyle = 'rgba(46,28,36,.92)';
    rr(ctx, x1, y1, x2 - x1, y2 - y1, 14); ctx.fill();
    ctx.strokeStyle = '#7d3a3f'; ctx.lineWidth = 4; ctx.stroke();
  }
}

// ---------- ตัวละคร ----------
/** วางตัวละครแบบ standee: เท้าอยู่ที่ (x,y) สูง h ในพิกัดฉาก
 *  ยังไม่มีรูปก็วาดเงา + สัญลักษณ์แทน เกมเล่นได้เหมือนกัน */
export function drawStandee(ctx, key, x, y, h, t, glyph = '❓') {
  const bob = Math.sin(t / 700 + x) * (h * 0.012);
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.075, 0, 0, 7); ctx.fill();
  const im = img(key);
  if (im) { ctx.drawImage(im, x - h / 2, y - h + bob, h, h); return; }
  ctx.font = `${Math.round(h * 0.62)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(glyph, x, y - h * 0.1 + bob);
}

/** วิญญาณ — ดวงเรืองแสงลอย (โค้ดล้วน 0 เฟรม) */
export function drawSoul(ctx, x, y, r, t, tint = '#bfe9ff') {
  const bob = Math.sin(t / 400 + x) * (r * 0.32);
  ctx.fillStyle = 'rgba(140,200,255,.14)';
  ctx.beginPath(); ctx.arc(x, y + bob - r, r * 2.0, 0, 7); ctx.fill();
  // ตัวเป็นหยดน้ำ หัวกลม หางเรียว
  ctx.fillStyle = tint;
  ctx.beginPath();
  ctx.moveTo(x, y + bob);
  ctx.quadraticCurveTo(x - r, y + bob - r * 1.1, x - r * 0.72, y + bob - r * 1.75);
  ctx.arc(x, y + bob - r * 2.0, r * 0.78, Math.PI * 0.86, Math.PI * 0.14);
  ctx.quadraticCurveTo(x + r, y + bob - r * 1.1, x, y + bob);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,10,26,.65)';
  ctx.beginPath(); ctx.arc(x - r * 0.30, y + bob - r * 2.05, r * 0.13, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x + r * 0.30, y + bob - r * 2.05, r * 0.13, 0, 7); ctx.fill();
}

/** เรือข้ามธารลาวา — วิญญาณที่มาไม่ทันคิวนั่งมากับลำนี้ */
export function drawBoat(ctx, x, y, t, riders = 0) {
  const bob = Math.sin(t / 620) * 5;
  const im = img('prop-boat');
  if (im) ctx.drawImage(im, x - 90, y - 120 + bob, 180, 180);
  else {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 14 + bob, 86, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a2118';                       // ตัวเรือ
    ctx.beginPath();
    ctx.moveTo(x - 84, y - 16 + bob);
    ctx.quadraticCurveTo(x, y + 26 + bob, x + 84, y - 16 + bob);
    ctx.quadraticCurveTo(x, y + 4 + bob, x - 84, y - 16 + bob);
    ctx.fill();
    ctx.strokeStyle = '#6b3d2a'; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#2a1a20'; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath();                                  // คนแจว + ถ่อ
    ctx.moveTo(x + 44, y - 22 + bob); ctx.lineTo(x + 78, y + 30 + bob); ctx.stroke();
    ctx.fillStyle = '#2f1b26';
    ctx.beginPath(); ctx.ellipse(x + 40, y - 44 + bob, 15, 26, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x + 40, y - 74 + bob, 13, 0, 7); ctx.fill();
  }
  for (let i = 0; i < riders; i++)
    drawSoul(ctx, x - 46 + i * 30, y - 18 + bob, 15, t + i * 500);
}

// ---------- บรรยากาศ ----------
export function drawEmbers(ctx, w, h, t) {
  for (let i = 0; i < 46; i++) {
    const sp = 0.4 + hash(i, 3) * 0.9;
    const x = (hash(i, 1) * w + Math.sin(t / 2200 + i) * 60) % w;
    const y = h - ((t * 0.05 * sp + hash(i, 2) * h) % (h + 120));
    const a = 0.18 + 0.34 * hash(i, 5) * (0.5 + 0.5 * Math.sin(t / 700 + i));
    ctx.fillStyle = `rgba(255,${150 + hash(i, 9) * 70 | 0},80,${a})`;
    ctx.fillRect(x, y, 6, 6);
  }
}

export function drawVignette(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.34, w / 2, h / 2, h * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(8,3,6,.52)');
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
