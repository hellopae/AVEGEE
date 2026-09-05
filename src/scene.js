// scene.js — ฉากเป็นภาพวาดใบเดียว โค้ดวางตัวละคร/คิว/เอฟเฟกต์ทับตามพิกัด
// แทนระบบ tile grid เดิมทั้งหมด (6 ก.ย. 2569) เหตุผลอยู่ใน CONCEPT.md §เทคนิค
// ระบบพิกัดเดียวกับที่เป้วาดฉากมา (SCENE.w x SCENE.h) — โค้ดย่อให้พอดี canvas ตอนวาด

import { SCENE, STATIONS, SPOTS, QUEUE_LINE } from './data.js';
import { img, drawFallbackGround, drawStandee, drawSoul, drawBoat,
         drawEmbers, drawVignette, rr } from './art.js';

const CREW_H = 82;       // ความสูงตัวละครในพิกัดฉาก (ฉาก 1527px กว้าง)
const HERO_H = 92;
const SOUL_H = 64;

/** ย่อฉากให้พอดีความกว้าง canvas — คืนอัตราส่วนไว้ใช้แปลงพิกัดเมาส์ */
export const scaleFor = cv => cv.width / SCENE.w;

export function render(ctx, g, t, hover) {
  const cv = ctx.canvas, sc = scaleFor(cv);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);   // ตั้งแต่บรรทัดนี้ วาดด้วยพิกัดฉากได้เลย
  ctx.imageSmoothingEnabled = false;

  const bg = img('scene');
  if (bg) ctx.drawImage(bg, 0, 0, SCENE.w, SCENE.h);
  else drawFallbackGround(ctx, SCENE.w, SCENE.h, STATIONS, g);

  // ---- สถานีที่ยังไม่ได้สร้าง: กรอบประ ----
  for (const def of STATIONS) {
    if (g.stations.some(s => s.def.k === def.k)) continue;
    const [x1, y1, x2, y2] = def.hit;
    ctx.fillStyle = 'rgba(12,4,8,.50)';
    rr(ctx, x1, y1, x2 - x1, y2 - y1, 8); ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(240,190,120,.45)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.setLineDash([]);
    label(ctx, `${def.glyph} ${def.name} — ${def.cost}`, (x1 + x2) / 2, (y1 + y2) / 2, 17, 'rgba(255,220,180,.9)');
  }

  // ---- ไฮไลต์สถานีที่เมาส์ชี้ ----
  if (hover) {
    const def = STATIONS.find(d => d.k === hover);
    if (def) {
      const [x1, y1, x2, y2] = def.hit;
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.5;
      rr(ctx, x1, y1, x2 - x1, y2 - y1, 8); ctx.stroke();
    }
  }

  // ---- เรือข้ามธารลาวา (โค้ดล้วน ไม่ใช้ไฟล์รูป) ----
  const f = SPOTS.ferry;
  const ph = t / 5200;
  const trip = (Math.sin(ph) + 1) / 2;                       // ไป-กลับช้า ๆ
  const fx = f.from[0] + (f.to[0] - f.from[0]) * trip;
  // ขามาบรรทุกวิญญาณ ขากลับเรือเปล่า — อ่านออกว่ากำลังรับคนข้ามฟากอยู่
  const inbound = Math.cos(ph) > 0;
  drawBoat(ctx, fx, f.from[1], t, inbound ? Math.min(2, g.queue.length) : 0, inbound);

  // ---- คิววิญญาณ ยืนเรียงขึ้นสะพานมาที่แท่นพิพากษา ----
  g.queue.forEach((s, i) => {
    const p = QUEUE_LINE[i];
    if (!p) return;
    drawSoul(ctx, p[0], p[1], i === 0 ? SOUL_H * 1.12 : SOUL_H, t + s.id * 300,
             s.waited > 40 ? '#ffb0b0' : '#bfe9ff', s.id);
  });

  // ---- ตัวเรา ยืนที่แท่นพิพากษา ----
  drawStandee(ctx, 'hero-yama', SPOTS.bench.x, SPOTS.bench.y, HERO_H, t, '👑');

  // ---- ยมทูต: ถ้ามีเวรอยู่ยืนที่สถานี ไม่มีก็ยืนที่ประจำของตัวเอง ----
  for (const c of g.crew) {
    const st = c.at ? STATIONS.find(d => d.k === c.at) : null;
    const x = st ? st.x : c.hx, y = st ? st.y : c.hy;
    if (x == null) continue;
    drawStandee(ctx, 'crew-' + c.k, x, y, CREW_H, t + c.k.length * 400, c.glyph);
    if (c.morale < 35) label(ctx, '😩', x, y - CREW_H - 8, 20);
  }

  // ---- สถานีที่กำลังลงทัณฑ์: วิญญาณ + หลอดคืบหน้า + ระดับวาระ ----
  for (const st of g.stations) {
    if (!st.soul) continue;
    const d = st.def;
    drawSoul(ctx, d.x - 40, d.y - 4, SOUL_H * 0.85, t + st.soul.id * 200, '#ffd9c0', st.soul.id);
    const p = Math.min(1, st.progress / st.need), W = 96;
    ctx.fillStyle = 'rgba(0,0,0,.72)'; rr(ctx, d.x - W / 2, d.y + 8, W, 10, 5); ctx.fill();
    ctx.fillStyle = '#ff9d3a';        rr(ctx, d.x - W / 2, d.y + 8, W * p, 10, 5); ctx.fill();
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < st.intensity ? '#ff6a4a' : 'rgba(255,255,255,.22)';
      ctx.beginPath(); ctx.arc(d.x - 34 + i * 17, d.y + 27, 4.5, 0, 7); ctx.fill();
    }
    const glow = 0.5 + 0.5 * Math.sin(t / 300);
    ctx.fillStyle = `rgba(255,130,40,${0.06 + glow * 0.10})`;
    ctx.beginPath(); ctx.arc(d.x, d.y - 30, 96, 0, 7); ctx.fill();
  }

  drawEmbers(ctx, SCENE.w, SCENE.h, t);
  drawVignette(ctx, SCENE.w, SCENE.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function label(ctx, text, x, y, size, color = '#fff') {
  ctx.font = `600 ${size}px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.75)';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color; ctx.fillText(text, x, y);
}

/** แปลงพิกัดเมาส์ -> พิกัดฉาก */
export function toScene(cv, e) {
  const r = cv.getBoundingClientRect();
  return [(e.clientX - r.left) / r.width * SCENE.w, (e.clientY - r.top) / r.height * SCENE.h];
}

/** คลิกโดนสถานีไหน (คืน def — จะสร้างแล้วหรือยังไม่สร้างก็ได้) */
export function hitStation(sx, sy) {
  // ไล่จากกรอบเล็กไปใหญ่ เผื่อกรอบซ้อนกัน จะได้เลือกอันที่เจาะจงกว่า
  return [...STATIONS]
    .sort((a, b) => area(a.hit) - area(b.hit))
    .find(d => sx >= d.hit[0] && sx <= d.hit[2] && sy >= d.hit[1] && sy <= d.hit[3]) || null;
}
const area = h => (h[2] - h[0]) * (h[3] - h[1]);
