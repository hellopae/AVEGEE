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

/** อาคารสถานี — ไฟล์ img/st-<k>.png วางกึ่งกลาง-ฐานที่ (bx,by) กว้าง bw
 *  ไม่มีไฟล์ก็ไม่วาดอะไร (ฉากรุ่นเก่ามีอาคารวาดติดมาอยู่แล้ว) */
export function drawBuilding(ctx, def, t) {
  if (def.bx == null) return;
  const im = img('st-' + def.k);
  if (im) { ctx.drawImage(im, def.bx - def.bw / 2, def.by - def.bw, def.bw, def.bw); return; }

  // ยังไม่มีไฟล์ img/st-<k>.png — วาดกล่องหินแทนไว้ก่อน
  // 7 ก.ย. 2569: ดงต้นงิ้วชื่อไฟล์ผิดกติกาแล้ว "สร้างเสร็จแต่จอว่างเปล่า" อยู่หลายวัน
  // โดยไม่มีอะไรบอกเลย — ต่อจากนี้อย่างน้อยต้องเห็นว่ามันมีอยู่ตรงนั้น
  const w = def.bw * 0.72, h = def.bw * 0.52;
  const x = def.bx - w / 2, y = def.by - h;
  ctx.save();
  ctx.fillStyle = 'rgba(42,24,32,.94)';
  rr(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(212,163,85,.85)'; ctx.lineWidth = 2;
  ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
  ctx.textAlign = 'center';
  ctx.font = `${Math.round(h * 0.34)}px system-ui, sans-serif`;
  ctx.fillStyle = '#ffd9b0';
  ctx.fillText(def.glyph, def.bx, y + h * 0.46);
  ctx.font = '600 12px "IBM Plex Sans Thai", system-ui, sans-serif';
  ctx.fillStyle = '#d4a355';
  ctx.fillText(def.name, def.bx, y + h * 0.78);
  ctx.restore();
}

// ---------- ตัวละคร ----------
/** วางตัวละครแบบ standee: เท้าอยู่ที่ (x,y) สูง h ในพิกัดฉาก
 *  ยังไม่มีรูปก็วาดเงา + สัญลักษณ์แทน เกมเล่นได้เหมือนกัน */
export function drawStandee(ctx, key, x, y, h, t, glyph = '❓', face = 1) {
  const bob = Math.sin(t / 700 + x) * (h * 0.012);
  ctx.fillStyle = 'rgba(0,0,0,.42)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.24, h * 0.075, 0, 0, 7); ctx.fill();
  const im = img(key);
  if (im) {
    if (face < 0) {                       // เดินไปทางซ้าย — พลิกกระจก
      ctx.save(); ctx.translate(x, 0); ctx.scale(-1, 1);
      ctx.drawImage(im, -h / 2, y - h + bob, h, h);
      ctx.restore();
    } else ctx.drawImage(im, x - h / 2, y - h + bob, h, h);
    return;
  }
  ctx.font = `${Math.round(h * 0.62)}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
  ctx.fillText(glyph, x, y - h * 0.1 + bob);
}

/** วิญญาณ — ใช้สไปรท์ spirit1..3 ถ้ามี ไม่มีก็วาดดวงเรืองแสงเอง
 *  h = ความสูงบนฉาก · เท้า(ปลายหาง)อยู่ที่ y */
/** จำนวนแบบวิญญาณที่มีไฟล์อยู่ — เพิ่มไฟล์ img/spiritN.png แล้วบวกเลขนี้ */
export const SPIRIT_KINDS = 10;

/** sp = เลขรูปวิญญาณ 1..SPIRIT_KINDS (มาจาก SPIRIT_OF ตามสำนวน) */
export function drawSoul(ctx, x, y, h, t, tint = '#bfe9ff', sp = 7) {
  const bob = Math.sin(t / 520 + x) * (h * 0.05);
  // sp เป็นเลข = วิญญาณสุ่ม (spirit1-7) · เป็นข้อความ = สำนวนที่มีชื่อ (img/soul-<k>.png)
  // ยังไม่มีไฟล์ของสำนวนที่มีชื่อ ก็ถอยไปใช้ผีสามัญ ไม่ปล่อยให้เป็นช่องว่าง
  const im = typeof sp === 'string'
    ? (img(sp) || img('spirit7'))
    : img('spirit' + ((sp - 1) % SPIRIT_KINDS + 1));
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.ellipse(x, y, h * 0.20, h * 0.055, 0, 0, 7); ctx.fill();
  if (im) {
    ctx.save();
    ctx.globalAlpha = 0.93;
    ctx.drawImage(im, x - h / 2, y - h + bob, h, h);
    ctx.restore();
    if (tint !== '#bfe9ff') {          // รอนานแล้ว — ย้อมแดงเตือน
      ctx.save(); ctx.globalAlpha = 0.28; ctx.globalCompositeOperation = 'source-atop';
      ctx.restore();
    }
    return;
  }
  const r = h * 0.24;
  ctx.fillStyle = 'rgba(140,200,255,.14)';
  ctx.beginPath(); ctx.arc(x, y + bob - r, r * 2.0, 0, 7); ctx.fill();
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

/** ไฟลุกรอบตัว — ใช้สไปรท์ลูกไฟซ้อนกันหลายใบ ไม่มีไฟล์ก็วาดเปลวด้วยโค้ดแทน */
export function drawFire(ctx, x, y, w, t, n = 3) {
  const im = img('fx-fireball');
  for (let i = 0; i < n; i++) {
    const ph = t / (300 + i * 70) + i * 2.1;
    const dx = (i - (n - 1) / 2) * w * 0.42 + Math.sin(ph) * w * 0.06;
    const h = w * (0.55 + 0.22 * (0.5 + 0.5 * Math.sin(ph * 1.7)));
    ctx.save();
    ctx.globalAlpha = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(ph * 2.3));
    if (im) ctx.drawImage(im, x + dx - h / 2, y - h, h, h);
    else {
      ctx.fillStyle = '#ff8a2a';
      ctx.beginPath();
      ctx.moveTo(x + dx, y - h);
      ctx.quadraticCurveTo(x + dx + h * 0.36, y - h * 0.35, x + dx, y);
      ctx.quadraticCurveTo(x + dx - h * 0.36, y - h * 0.35, x + dx, y - h);
      ctx.fill();
    }
    ctx.restore();
  }
}

/** เรือข้ามธารลาวา — วิญญาณที่มาไม่ทันคิวนั่งมากับลำนี้ */
export function drawBoat(ctx, x, y, t, riders = 0, inbound = true) {
  const bob = Math.sin(t / 620) * 5;
  const W = 132;
  const im = img('prop-boat');
  if (im) {                                  // รูปจริงหัวนาคอยู่ซ้าย = หันซ้าย · ขามาให้พลิกกระจก
    ctx.save();
    ctx.translate(x, y - W * 0.78 + bob);
    if (inbound) ctx.scale(-1, 1);
    ctx.drawImage(im, -W / 2, 0, W, W);
    ctx.restore();
  }
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
    drawSoul(ctx, x - 22 + i * 30, y - 14 + bob, 38, t + i * 500, '#bfe9ff', i + 1);
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
