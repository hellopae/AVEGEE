// scene.js — ฉากเป็นภาพวาดใบเดียว โค้ดวางตัวละคร/คิว/เอฟเฟกต์ทับตามพิกัด
// แทนระบบ tile grid เดิมทั้งหมด (6 ก.ย. 2569) เหตุผลอยู่ใน CONCEPT.md §เทคนิค
// ระบบพิกัดเดียวกับที่เป้วาดฉากมา (SCENE.w x SCENE.h) — โค้ดย่อให้พอดี canvas ตอนวาด

import { SCENE, STATIONS, SPOTS, QUEUE_LINE, ITEMS, MOB, GUARD, BUILD_TIME } from './data.js';
import { img, zoneImg, drawFallbackGround, drawStandee, drawBuilding, drawSoul, drawBoat,
         drawFire, drawEmbers, drawVignette, rr, topOf, soulKey } from './art.js';
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
/** ป้ายลอยเหนือหัว — พื้นทึบ + ขอบสี อ่านออกบนฉากมืด ๆ ได้ทุกจุด
 *  ใช้กับเปรตเป็นหลัก แต่เขียนให้ทั่วไปไว้ เผื่อของอย่างอื่นต้องบอกว่า "กดได้" */
function tag(ctx, x, y, t, [text, color]) {
  const bob = Math.sin(t / 420) * 2;
  ctx.save();
  ctx.font = '600 13px "IBM Plex Sans Thai", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width + 16, h = 21, yy = y + bob;
  ctx.fillStyle = 'rgba(20,10,14,.88)';
  rr(ctx, x - w / 2, yy - h / 2, w, h, 7); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = color; ctx.fillText(text, x, yy + 0.5);
  ctx.restore();
}

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

  // ฉากตามโซนที่กำลังคุมอยู่ — ยังไม่มีไฟล์ของโซนนั้นก็ถอยไปใช้ฉากไทย
  // หมายเหตุ: buildWalk อ่านลาวาจากภาพ "ใบแรกที่โหลดได้" แล้วจำไว้ตลอดเกม
  //   ตั้งใจให้เป็นแบบนั้น — ฉากทุกโซนต้องวางผังตรงกัน พิกัดใน data.js จึงใช้ร่วมกันได้
  //   ฉากโซนแบบโฟลเดอร์ (img/Asia/scene-asia.png) มาก่อน · ไม่มีค่อยใช้ img/<scene>.png เดิม (11 ก.ย. 2569)
  const zk = g.zoneDef ? g.zoneDef().scene : 'scene';
  const bg = zoneImg('scene') || img(zk) || img('scene');
  if (bg) { ctx.drawImage(bg, 0, 0, SCENE.w, SCENE.h); buildWalk(bg); }
  else drawFallbackGround(ctx, SCENE.w, SCENE.h, STATIONS, g);

  // ---- จุดที่สร้างสถานีได้ ----
  // เดิมเป็นกรอบประ + ป้ายชื่อ-ราคา ลอยค้างเต็มแผนที่ตลอดเวลา เจ้าของบอกว่ารก (6 ก.ย. 2569)
  // ตอนนี้เงียบสนิทจนกว่ายมบาทจะเดินเข้าไปในเขตนั้น แล้วป้าย "กดเพื่อสร้าง" ค่อยโผล่
  const spot = nearBuild(g, g.player.x, g.player.y);

  // ---- ชั้นของที่ "ยืนอยู่บนพื้น" ----
  // อาคารกับตัวละครอยู่ชั้นเดียวกัน เรียงตามพิกัด y ของฐาน แล้ววาดจากหลังมาหน้า
  // (เจ้าของสั่ง 9 ก.ย. 2569: เดินไปหลังอาคารแล้วอาคารต้องบังตัวเรา ไม่ใช่เดินทับ)
  const layer = [];
  const at = (y, fn) => layer.push({ y, fn });
  for (const st of g.stations) at(st.def.by ?? st.def.y, () => drawStation(ctx, g, st, t));

  // ---- ไฮไลต์สถานีที่เมาส์ชี้ ----
  if (hover) {
    const def = STATIONS.find(d => d.k === hover);
    const shown = def && (g.stations.some(x => x.def.k === def.k) || spot?.k === def.k);
    if (shown) {
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
             s.waited > 40 ? '#ffb0b0' : '#bfe9ff', s.sp || 7);
  });

  // ---- ของที่ตกอยู่บนพื้น ----
  for (const it of g.items) at(it.y, () => {
    const def = ITEMS[it.k];
    const p = 0.5 + 0.5 * Math.sin(t / 480 + it.x);
    ctx.fillStyle = `rgba(255,210,120,${0.10 + p * 0.14})`;
    ctx.beginPath(); ctx.arc(it.x, it.y - def.h * 0.35, def.h * 0.75, 0, 7); ctx.fill();
    drawStandee(ctx, def.img, it.x, it.y + Math.sin(t / 480 + it.x) * 3, def.h, t, def.glyph || '🎁');
  });

  // ---- เปรตที่มาก่อกวน ----
  // เจ้าของยืนติดตัวเปรตแล้วไม่รู้ว่ากดฟาดได้ (7 ก.ย. 2569) — ต้องมีป้ายบอกเสมอ
  //   ประชิดแล้ว  → วงแดงใต้ตีน + ป้าย "⚔ กดเว้นวรรค"  (ฟาดฟรี)
  //   ยังไกลอยู่   → ป้าย "🔥 ขว้างได้" ถ้ามีลูกไฟ · ไม่มีก็บอกให้เดินเข้าไป
  const PA = g.powerOf('roar').ammo;
  // ผีวาดทับอาคารเสมอ (แต่ยังอยู่ใต้ตัวเรา) — เจ้าของเจอ 10 ก.ย. 2569 ว่ามันไปยืนหลังอาคาร
  // แล้วหายไปทั้งตัว ทั้งที่เป็นสิ่งเดียวที่ต้องรีบหาให้เจอ
  g.mobs.forEach((m, i) => at(1e6 + m.y, () => {
    if (sel && sel.kind === 'mob' && sel.key === i) ring(ctx, m.x, m.y, t, 28);
    const d = Math.hypot(m.x - g.player.x, m.y - g.player.y);
    const near = d <= MOB.reach, canThrow = !near && d <= MOB.throw && PA > 0;
    if (near) {                                       // วงแดงเต้น ๆ บอกว่าเอื้อมถึงแล้ว
      const q = 0.5 + 0.5 * Math.sin(t / 170);
      ctx.strokeStyle = `rgba(224,74,47,${0.55 + q * 0.45})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(m.x, m.y, 34, 12, 0, 0, 7); ctx.stroke();
    }
    drawStandee(ctx, (MOB.kinds[m.kind ?? 0] || MOB).img, m.x, m.y, MOB.h, t, '👹');
    tag(ctx, m.x, m.y - MOB.h - 8, t,
        near      ? ['⚔️ กดเพื่อเข้าต่อสู้', '#ff6a4a']
      : canThrow  ? [`🔥 กดขว้างลูกไฟ ×${PA}`, '#d4a355']
                  : ['👹 เดินเข้าไปหยุดมัน', '#c8b0a8']);
  }));

  // ---- ยักษ์ทวารบาล (ถ้าจ้างไว้) ----
  if (g.guard) at(g.guard.y, () => {
    if (sel && sel.kind === 'guard') ring(ctx, g.guard.x, g.guard.y, t, 34);
    drawStandee(ctx, GUARD.img, g.guard.x, g.guard.y, GUARD.h, t, '🛡️');
  });

  // ---- ยมทูตในสังกัด — ยืนประจำจุด/เดินเตร็ดเตร่ (เพิ่ม 6 ก.ย. 2569)
  // เดิมโค้ดขยับ c.x/c.y อยู่ใน stepWorld แต่ไม่มีใครวาด ทีมเลยหายไปทั้งโซน
  const now0 = Date.now();
  for (const c of g.crew) {
    if (c.x == null) continue;
    at(c.y, () => {
      const base = 'crew-' + c.k;
      if (sel && sel.kind === 'crew' && sel.key === c.k) ring(ctx, c.x, c.y, t);
      drawStandee(ctx, c.at ? poseOr(base + '-work', base) : base, c.x, c.y, CREW_H, t, c.glyph, c.face ?? 1);
      label(ctx, c.name, c.x, c.y + 13, 13, 'rgba(255,225,195,.72)');
      if (c.morale < 35) label(ctx, '💤', c.x + CREW_H * 0.32, c.y - CREW_H + 6, 16);
    });
  }
  // ---- ตัวเรา — เดินไปไหนก็ได้ ----
  const P = g.player;
  if (P.tx != null) {                          // จุดหมายที่คลิกไว้
    const q = 0.5 + 0.5 * Math.sin(t / 200);
    ctx.strokeStyle = `rgba(255,210,140,${0.35 + q * 0.35})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(P.tx, P.ty, 10 + q * 5, 0, 7); ctx.stroke();
  }
  // ตัวเราวาดท้ายสุดเสมอ — เจ้าของสั่ง 10 ก.ย. 2569 ว่าเดินไปตรงไหนก็ต้องเห็นตัวเอง
  // (บันไดกับพญานาคของหอทะเบียนกินพื้นที่ลงมาเยอะ ยืนตรงนั้นแล้วหายไปทั้งตัว)
  // ตัวละครอื่นกับอาคารยังเรียงตามพิกัด y กันเองเหมือนเดิม
  at(Infinity, () => {
    if (sel && sel.kind === 'me') ring(ctx, P.x, P.y, t, 32);
    const swinging = g.swingUntil && Date.now() < g.swingUntil;
    drawStandee(ctx, swinging ? poseOr('hero-yama-atk', 'hero-yama') : 'hero-yama',
                P.x, P.y, HERO_H, t, '👑', P.face);
  });

  // วาดทั้งชั้นเรียงจากหลังมาหน้า — ฐานอยู่สูงกว่า (y น้อยกว่า) คืออยู่ไกลกว่า วาดก่อน
  layer.sort((a, b) => a.y - b.y).forEach(o => o.fn());

  // บทพูดวาดทีหลังทั้งหมด จะได้ไม่โดนตัวละครตัวอื่นทับ
  // ยกสูงกว่าหัวพอสมควร เพราะช่วง y-CH-8 เป็นที่ของหมุด 📜 (ชั้น HTML ใน ui.js)
  for (const c of g.crew)
    if (c.x != null && c.say && now0 < c.sayUntil) bubble(ctx, `${c.name}: ${c.say}`, c.x, c.y - CREW_H - 34);


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

  // ---- ป้ายวงกลมบอกว่าสถานีไหนมีวิญญาณอยู่กี่ดวง ----
  // เจ้าของสั่ง 9 ก.ย. 2569: บนแผนที่ไม่ต้องเห็นตัววิญญาณแล้ว เห็นแค่ไอคอนกับจำนวน
  // อยากดูของจริงให้กดเข้าไปในสถานี (ป๊อปอัปมีฉากของหลังนั้นเอง)
  for (const st of g.stations) {
    if (st.build || !st.slots.length) continue;
    soulBadge(ctx, g, st, t, sel);
  }

  if (spot) buildPrompt(ctx, spot, t, g.coin >= spot.cost);

  drawEmbers(ctx, SCENE.w, SCENE.h, t);
  drawVignette(ctx, SCENE.w, SCENE.h);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/** อาคารหนึ่งหลังบนแผนที่ — รวมนั่งร้านตอนกำลังสร้าง และไฟไหม้ตอนผีมาเผา */
function drawStation(ctx, g, st, t) {
  const d = st.def;
  if (st.build) {                                   // กำลังก่อสร้าง — นั่งร้าน + แถบเวลา
    const left = Math.max(0, st.build - Date.now());
    const p = 1 - left / BUILD_TIME;
    const bw = d.bw || 200, im = img('st-building');
    if (im) ctx.drawImage(im, d.bx - bw / 2, d.by - bw, bw, bw);
    else drawBuilding(ctx, d, t);
    const W = 120, bx = d.bx - W / 2, by = d.by + 10;
    ctx.fillStyle = 'rgba(0,0,0,.74)'; rr(ctx, bx, by, W, 12, 6); ctx.fill();
    ctx.fillStyle = '#d4a355';        rr(ctx, bx, by, W * Math.max(0.02, p), 12, 6); ctx.fill();
    label(ctx, `🏗️ กำลังก่อสร้าง ${Math.round(p * 100)}%`, d.bx, by - 12, 14, '#ffe7c4');
    return;
  }
  drawBuilding(ctx, d, t);
  if (st.fire > 0) {                                // ผีกำลังเผาอยู่ — ไฟไต่ขึ้นตามความเสียหาย
    const bw = d.bw || 180;
    const n = 1 + Math.round(st.fire / 34);
    for (let i = 0; i < n; i++)
      drawFire(ctx, d.bx - bw * 0.28 + i * (bw * 0.28), d.by - 6, 34 + st.fire * 0.22, t + i * 400, 3);
    const q = 0.5 + 0.5 * Math.sin(t / 150);
    ctx.save(); ctx.globalAlpha = 0.55 + q * 0.45;
    label(ctx, '⚠️', d.bx, d.by - (d.bw || 180) * 0.62, 34, '#ff6a4a');
    ctx.restore();
    const W = 110, bx = d.bx - W / 2, by = d.by + 24;
    ctx.fillStyle = 'rgba(0,0,0,.7)'; rr(ctx, bx, by, W, 8, 4); ctx.fill();
    ctx.fillStyle = '#ff6a4a';        rr(ctx, bx, by, W * (st.fire / 100), 8, 4); ctx.fill();
  }
}

/** ป้ายวงกลม "มีวิญญาณอยู่กี่ดวง" เหนือสถานี — กดแล้วเปิดป๊อปอัปของสถานีนั้น
 *  วงแหวนรอบนอกคือความคืบหน้าของดวงที่ใกล้ครบวาระที่สุด */
export const BADGE_R = 27;
/** จุดที่ป้ายวงกลมลอยอยู่ — ทั้งตอนวาดและตอนเช็คคลิกต้องใช้ตัวนี้ตัวเดียวกัน */
export function badgePos(def) {
  const top = topOf(def);
  const y = top != null ? top - BADGE_R - 6 : (def.by ?? def.y) - (def.bw || 180) * 0.5 - 30;
  return [def.bx ?? def.x, Math.max(BADGE_R + 4, y)];
}
function soulBadge(ctx, g, st, t, sel) {
  const d = st.def;
  const [x, y] = badgePos(d);
  const front = st.slots.reduce((a, b) => (a && a.progress / a.need > b.progress / b.need ? a : b), null);
  const p = front ? Math.min(1, front.progress / front.need) : 0;
  const im = img(soulKey(st.slots[0].soul.sp || 7)) || img('spirit7');
  const bob = Math.sin(t / 620) * 2.5;
  const cy = y + bob;

  ctx.save();
  ctx.beginPath(); ctx.arc(x, cy, BADGE_R, 0, 7);
  ctx.fillStyle = 'rgba(18,8,13,.92)'; ctx.fill();
  ctx.save(); ctx.clip();
  if (im) ctx.drawImage(im, x - BADGE_R, cy - BADGE_R - 4, BADGE_R * 2, BADGE_R * 2 + 8);
  else { ctx.fillStyle = '#bfe9ff'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('👻', x, cy + 9); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(212,163,85,.9)'; ctx.lineWidth = 2.5; ctx.stroke();

  // วงแหวนคืบหน้า
  ctx.beginPath(); ctx.arc(x, cy, BADGE_R + 4, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2);
  ctx.strokeStyle = d.fx === 'fx-ice' ? '#8fd8ff' : '#ff9d3a'; ctx.lineWidth = 4; ctx.stroke();

  // จำนวนดวง
  const n = st.slots.length;
  ctx.beginPath(); ctx.arc(x + BADGE_R - 2, cy + BADGE_R - 6, 13, 0, 7);
  ctx.fillStyle = '#7d2f2a'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,225,195,.85)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
  label(ctx, `${n}`, x + BADGE_R - 2, cy + BADGE_R - 5, 15, '#ffe7c4');
  if (sel && sel.kind === 'station' && sel.key === d.k) ring(ctx, x, cy + BADGE_R + 8, t, 30);
}

/** สถานีที่ยังไม่ได้สร้าง ซึ่งยมบาทยืนอยู่ใกล้พอจะสร้างได้
 *  วัดจาก "จุดยืนของผู้คุม" (def.x,def.y) ไม่ใช่กรอบ hit — เพราะบางกรอบ (ลานตรากตรำ)
 *  พื้นข้างในเป็นหลุมลาวาที่เหยียบไม่ได้ ถ้าใช้กรอบจะเข้าไปยืนสร้างไม่ได้เลย
 *  ใกล้หลายอันพร้อมกันก็เอาอันที่ใกล้ที่สุด */
export const BUILD_REACH = 150;
export function nearBuild(g, x, y) {
  let best = null, bd = BUILD_REACH;
  for (const d of STATIONS) {
    if (g.stations.some(s => s.def.k === d.k)) continue;
    const dist = Math.hypot(d.x - x, d.y - y);
    if (dist < bd) { bd = dist; best = d; }
  }
  return best;
}

/** ป้าย "กดเพื่อสร้าง" ที่โผล่เฉพาะตอนยมบาทยืนอยู่ในเขตนั้น */
function buildPrompt(ctx, def, t, afford) {
  const [x1, y1, x2, y2] = def.hit;
  const cx = def.x, cy = Math.max(46, def.y - 122);   // ลอยเหนือหัวตัวเรา ไม่บังตัวละคร
  const q = 0.5 + 0.5 * Math.sin(t / 420);

  // เส้นประวิ่งรอบเขต บอกว่าอาคารจะลงตรงไหน
  ctx.save();
  ctx.strokeStyle = `rgba(255,205,120,${0.28 + q * 0.30})`;
  ctx.lineWidth = 2.5; ctx.setLineDash([11, 9]); ctx.lineDashOffset = -t / 55;
  rr(ctx, x1 + 6, y1 + 6, x2 - x1 - 12, y2 - y1 - 12, 10); ctx.stroke();
  ctx.restore();

  const l1 = `${def.glyph} ${def.name}`;
  const l2 = afford ? `⚒ กดตรงนี้เพื่อสร้าง — ${def.cost} เบี้ยกรรม` : `🔒 ต้องมี ${def.cost} เบี้ยกรรม`;
  ctx.font = '700 20px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif';
  const w1 = ctx.measureText(l1).width;
  ctx.font = '600 15px "IBM Plex Sans Thai","Apple Color Emoji",sans-serif';
  const w2 = ctx.measureText(l2).width;
  const w = Math.max(w1, w2) + 30, h = 58;
  const bx = Math.max(6, Math.min(SCENE.w - w - 6, cx - w / 2)), by = cy - h / 2;

  ctx.fillStyle = 'rgba(18,8,13,.93)'; rr(ctx, bx, by, w, h, 10); ctx.fill();
  ctx.strokeStyle = afford ? `rgba(212,163,85,${0.60 + q * 0.40})` : 'rgba(150,116,96,.65)';
  ctx.lineWidth = 2; ctx.stroke();
  label(ctx, l1, bx + w / 2, by + 19, 20, '#ffe7c4');
  label(ctx, l2, bx + w / 2, by + 41, 15, afford ? '#d4a355' : '#b09a92');
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
  // ป้ายวงกลมเหนือสถานี — กดแล้วเปิดหน้าสถานีนั้น
  for (const st of g.stations) {
    if (st.build || !st.slots.length) continue;
    const [bx, by] = badgePos(st.def);
    if (Math.hypot(bx - sx, by - sy) < BADGE_R + 8) return { kind: 'station', key: st.def.k };
  }
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
