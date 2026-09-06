// scene.js — ฉากเป็นภาพวาดใบเดียว โค้ดวางตัวละคร/คิว/เอฟเฟกต์ทับตามพิกัด
// แทนระบบ tile grid เดิมทั้งหมด (6 ก.ย. 2569) เหตุผลอยู่ใน CONCEPT.md §เทคนิค
// ระบบพิกัดเดียวกับที่เป้วาดฉากมา (SCENE.w x SCENE.h) — โค้ดย่อให้พอดี canvas ตอนวาด

import { SCENE, STATIONS, SPOTS, QUEUE_LINE, ITEMS, MOB, GUARD } from './data.js';
import { img, drawFallbackGround, drawStandee, drawBuilding, drawSoul, drawBoat,
         drawEmbers, drawVignette, rr } from './art.js';
import { buildWalk } from './walk.js';

const CREW_H = 82;       // ความสูงตัวละครในพิกัดฉาก (ฉาก 1527px กว้าง)
const HERO_H = 92;
const SOUL_H = 64;

/** ใช้รูปท่าพิเศษถ้ามีไฟล์จริง ไม่มีก็ใช้ท่ายืนปกติ
 *  => ดรอป img/hero-yama-atk.png หรือ img/crew-<k>-work.png ลงไปแล้วเห็นผลทันที ไม่ต้องแก้โค้ด */
const poseOr = (alt, base) => img(alt) ? alt : base;

/** ย่อฉากให้พอดีความกว้าง canvas — คืนอัตราส่วนไว้ใช้แปลงพิกัดเมาส์ */
export const scaleFor = cv => cv.width / SCENE.w;

/** วงแหวนใต้เท้าตัวที่เลือกอยู่ในแผงข้อมูล */
function ring(ctx, x, y, t, w = 30) {
  const q = 0.5 + 0.5 * Math.sin(t / 260);
  ctx.strokeStyle = `rgba(255,210,140,${0.5 + q * 0.4})`; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.34, 0, 0, 7); ctx.stroke();
}

export function render(ctx, g, t, hover, sel) {
  const cv = ctx.canvas, sc = scaleFor(cv);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  ctx.setTransform(sc, 0, 0, sc, 0, 0);   // ตั้งแต่บรรทัดนี้ วาดด้วยพิกัดฉากได้เลย
  ctx.imageSmoothingEnabled = false;

  const bg = img('scene');
  if (bg) { ctx.drawImage(bg, 0, 0, SCENE.w, SCENE.h); buildWalk(bg); }
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

  // ---- อาคารที่สร้างแล้ว (วาดก่อนตัวละคร ตัวละครจะได้ยืนหน้าอาคาร) ----
  // ฉากฐานเป็นที่โล่ง สถานีทุกหลังเป็นไฟล์แยก โผล่ขึ้นมาตอนสร้างเสร็จ
  [...g.stations].sort((a, b) => a.def.by - b.def.by)
    .forEach(st => drawBuilding(ctx, st.def, t));

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
    if (sel && sel.kind === 'soul' && sel.key === s.id) ring(ctx, p[0], p[1], t, 24);
    drawSoul(ctx, p[0], p[1], i === 0 ? SOUL_H * 1.12 : SOUL_H, t + s.id * 300,
             s.waited > 40 ? '#ffb0b0' : '#bfe9ff', s.id);
  });

  // ---- ของที่ตกอยู่บนพื้น ----
  for (const it of g.items) {
    const def = ITEMS[it.k];
    const p = 0.5 + 0.5 * Math.sin(t / 480 + it.x);
    ctx.fillStyle = `rgba(255,210,120,${0.10 + p * 0.14})`;
    ctx.beginPath(); ctx.arc(it.x, it.y - def.h * 0.35, def.h * 0.75, 0, 7); ctx.fill();
    drawStandee(ctx, def.img, it.x, it.y + Math.sin(t / 480 + it.x) * 3, def.h, t, '🎁');
  }

  // ---- เปรตที่มาก่อกวน ----
  g.mobs.forEach((m, i) => {
    if (sel && sel.kind === 'mob' && sel.key === i) ring(ctx, m.x, m.y, t, 28);
    drawStandee(ctx, MOB.img, m.x, m.y, MOB.h, t, '👹');
  });

  // ---- ยักษ์ทวารบาล (ถ้าจ้างไว้) ----
  if (g.guard) {
    if (sel && sel.kind === 'guard') ring(ctx, g.guard.x, g.guard.y, t, 34);
    drawStandee(ctx, GUARD.img, g.guard.x, g.guard.y, GUARD.h, t, '🛡️');
  }

  // ---- ยมทูตในสังกัด — ยืนประจำจุด/เดินเตร็ดเตร่ (เพิ่ม 6 ก.ย. 2569)
  // เดิมโค้ดขยับ c.x/c.y อยู่ใน stepWorld แต่ไม่มีใครวาด ทีมเลยหายไปทั้งโซน
  const now0 = Date.now();
  for (const c of g.crew) {
    if (c.x == null) continue;
    const base = 'crew-' + c.k;
    if (sel && sel.kind === 'crew' && sel.key === c.k) ring(ctx, c.x, c.y, t);
    drawStandee(ctx, c.at ? poseOr(base + '-work', base) : base, c.x, c.y, CREW_H, t, c.glyph, c.face ?? 1);
    label(ctx, c.name, c.x, c.y + 13, 13, 'rgba(255,225,195,.72)');
    if (c.morale < 35) label(ctx, '💤', c.x + CREW_H * 0.32, c.y - CREW_H + 6, 16);
  }
  // บทพูดวาดทีหลังทั้งหมด จะได้ไม่โดนตัวละครตัวอื่นทับ
  // ยกสูงกว่าหัวพอสมควร เพราะช่วง y-CH-8 เป็นที่ของหมุด 📜 (ชั้น HTML ใน ui.js)
  for (const c of g.crew)
    if (c.x != null && c.say && now0 < c.sayUntil) bubble(ctx, `${c.name}: ${c.say}`, c.x, c.y - CREW_H - 34);

  // ---- ตัวเรา — เดินไปไหนก็ได้ ----
  const P = g.player;
  if (P.tx != null) {                          // จุดหมายที่คลิกไว้
    const q = 0.5 + 0.5 * Math.sin(t / 200);
    ctx.strokeStyle = `rgba(255,210,140,${0.35 + q * 0.35})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.tx, P.ty, 10 + q * 5, 0, 7); ctx.stroke();
  }
  if (sel && sel.kind === 'me') ring(ctx, P.x, P.y, t, 32);
  const swinging = g.swingUntil && Date.now() < g.swingUntil;
  drawStandee(ctx, swinging ? poseOr('hero-yama-atk', 'hero-yama') : 'hero-yama',
              P.x, P.y, HERO_H, t, '👑', P.face);

  // ---- พญายมมาปรากฏบนบัลลังก์ตอนออกความเห็น ----
  if (g.bossUntil && t < g.bossUntil)
    drawStandee(ctx, 'hero-boss', SPOTS.throne.x, SPOTS.throne.y, HERO_H * 1.2, t, '👹');

  // ---- ลูกไฟที่เพิ่งฟาด ----
  const now = Date.now();
  g.fxHits = g.fxHits.filter(f => now - f.t < 620);
  for (const f of g.fxHits) {
    const k = (now - f.t) / 620;
    ctx.save(); ctx.globalAlpha = 1 - k;
    drawStandee(ctx, 'fx-fireball', f.x, f.y - 30 - k * 26, 54 + k * 40, t, '🔥');
    ctx.restore();
  }

  // ---- สถานีที่กำลังลงทัณฑ์: วิญญาณ + หลอดคืบหน้า + ระดับวาระ ----
  for (const st of g.stations) {
    if (!st.soul) continue;
    const d = st.def;
    if (sel && sel.kind === 'soul' && sel.key === st.soul.id) ring(ctx, d.x - 40, d.y - 4, t, 24);
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

/** บทพูดสั้น ๆ ลอยเหนือหัว — แบบเดียวกับ ofcSay ในผังออฟฟิศ */
function bubble(ctx, text, x, y) {
  ctx.font = '600 15px "IBM Plex Sans Thai",sans-serif';
  const w = Math.min(300, ctx.measureText(text).width + 20), h = 26;
  const bx = Math.max(6, Math.min(SCENE.w - w - 6, x - w / 2));
  ctx.fillStyle = 'rgba(20,9,14,.92)'; rr(ctx, bx, y - h, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(212,163,85,.55)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - 5, y); ctx.lineTo(x + 5, y); ctx.lineTo(x, y + 7);
  ctx.fillStyle = 'rgba(20,9,14,.92)'; ctx.fill();
  ctx.fillStyle = '#f2e6dd'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, bx + w / 2, y - h / 2 + 1);
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

/** คลิกโดนตัวไหนบนฉาก — คืน {kind,key} ที่แผงข้อมูลเอาไปแสดงต่อ
 *  ไล่จากตัวที่ผู้เล่นตั้งใจกดมากที่สุดไปหาน้อยที่สุด (เปรต > วิญญาณ > ยมทูต > ตัวเรา) */
export function hitActor(g, sx, sy) {
  const near = (x, y, r = 44) => Math.hypot(x - sx, y - sy) < r && sy < y + 16;
  for (let i = 0; i < g.mobs.length; i++)
    if (near(g.mobs[i].x, g.mobs[i].y)) return { kind: 'mob', key: i };
  for (const st of g.stations)
    if (st.soul && near(st.def.x - 40, st.def.y - 4, 34)) return { kind: 'soul', key: st.soul.id };
  for (let i = 0; i < g.queue.length; i++) {
    const p = QUEUE_LINE[i];
    if (p && near(p[0], p[1], 34)) return { kind: 'soul', key: g.queue[i].id };
  }
  for (const c of g.crew)
    if (c.x != null && near(c.x, c.y)) return { kind: 'crew', key: c.k };
  if (g.guard && near(g.guard.x, g.guard.y)) return { kind: 'guard', key: 0 };
  if (near(g.player.x, g.player.y)) return { kind: 'me', key: 0 };
  return null;
}
