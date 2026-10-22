// pot-souls.js — กระทะทองแดง: วิญญาณที่กำลังรับทัณฑ์ยืนอยู่ "ในกระทะ" มีไฟลุกใต้ตัว (F2 ข้อ 5, คุณเป้ 9 ต.ค. 2569)
//
// ใช้ภาพฉากเดิม img/rooms-wide/<zone>-krata.webp ไม่แตะไฟล์ภาพ — ไฟเป็นโค้ดวาด (canvas) ล้วน
// พิกัดทั้งหมดเป็นสัดส่วน 0-1 ของภาพฉาก วัดจากภาพจริงของแต่ละโซน (วัดปากกระทะทั้งสามใบ)
//   cx      = กึ่งกลางปากกระทะ 3 ใบ (ซ้าย/กลาง/ขวา)       mouthY = กึ่งกลางวงรีปากกระทะ
//   frontY  = ขอบหน้าของปากกระทะ (ส่วนล่างของตัวจมหายหลังขอบนี้)  rx = รัศมีแนวนอนของปาก
//   fireY   = กองไฟใต้ท้องกระทะที่ภาพวาดไว้ — ใช้วางแสงไฟกะพริบซ้อน
// ภาพกระทะวาดใหม่เมื่อไหร่ → วัดแถวของโซนนั้นใหม่ที่นี่ที่เดียว
export const POTS = {
  th:        { cx:[0.369, 0.505, 0.635], mouthY:0.243, frontY:0.268, rx:0.040, fireY:0.335 },
  asia:      { cx:[0.375, 0.500, 0.626], mouthY:0.160, frontY:0.192, rx:0.043, fireY:0.285 },
  west:      { cx:[0.364, 0.500, 0.640], mouthY:0.172, frontY:0.197, rx:0.045, fireY:0.285 },
  cyberhell: { cx:[0.370, 0.500, 0.626], mouthY:0.213, frontY:0.242, rx:0.050, fireY:0.350 },
};

/** ฉากนี้เป็นกระทะของโซนไหน (ดูจากชื่อไฟล์ภาพฉาก) — ไม่ใช่ฉากกระทะ → null (วิญญาณยืนที่แท่นเดิม) */
export function potLayout(bgSrc) {
  const m = /rooms-wide\/(th|asia|west|cyberhell)-krata/.exec(String(bgSrc || ''));
  return m ? POTS[m[1]] : null;
}

/** กึ่งกลางปากกระทะใบที่ i (สัดส่วนภาพฉาก) — วิญญาณยืนตรงนี้ ใช้ในเทสต์ด้วย */
export const potSoulX = (pot, i) => pot.cx[Math.min(i, pot.cx.length - 1)];
/** เท้าของวิญญาณจมต่ำกว่าขอบหน้าปากกระทะ (soulH = ความสูงตัววิญญาณหน่วยพิกเซล) — ท่อนล่างถูกตัดทิ้งหลังขอบกระทะ เห็นแค่ครึ่งบน */
export const SINK = 0.3;

const flick = (t, i, k) => 0.5 + 0.5 * Math.sin(t / (170 + k * 37) + i * 2.3 + k * 1.7);

// ---- P6: วิญญาณโดนไฟ — ไฟหลัง/ไฟหน้าจากภาพไฟวาดมือ (img/fx) · แดงกะพริบ · เหงื่อตก · ไอร้อน/ประกายลอย ----
// ภาพ fx เป็นพื้นดำ RGB → วาดแบบ 'lighter' (บวกแสง) พื้นดำจึงหายไปเอง · ไม่มี ctx.filter · ไม่สร้างของใหม่ทุกเฟรม
const FX = {};
const fxImg = name => {
  if (!FX[name] && typeof Image !== 'undefined') { const im = new Image(); im.src = `img/fx/${name}.webp`; FX[name] = im; }
  const im = FX[name]; return im && im.complete && im.naturalWidth ? im : null;
};
const FLAMES = ['fx-fire-flame-a', 'fx-fire-flame-b', 'fx-fire-flame-c'];
const SWEAT_CELLS = [0, 1, 3];      // แผ่นเหงื่อ 512×128 = 4 ช่อง 128×128: 0 หยดคู่ · 1 หยดใหญ่ · 2 กระเด็น · 3 หยดตก
let haze = null;                    // ไอร้อน: วงแสงนุ่มวาดครั้งเดียว ใช้ซ้ำ
const hazeSprite = () => {
  if (haze !== null) return haze;
  haze = false;
  try {
    const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(48, 48) : document.createElement('canvas');
    c.width = c.height = 48;
    const g = c.getContext('2d'), rg = g.createRadialGradient(24, 24, 0, 24, 24, 24);
    rg.addColorStop(0, 'rgba(255,214,160,.5)'); rg.addColorStop(1, 'rgba(255,150,70,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 48, 48); haze = c;
  } catch { haze = false; }
  return haze;
};
const bufs = [];                    // ผืนวาดตัววิญญาณชั่วคราวต่อกระทะ — ใช้เติมสีแดง (source-atop) โดยไม่แตะรูปวิญญาณ
const bufFor = (i, w, h) => {
  let b = bufs[i];
  if (!b || b.width !== w || b.height !== h) {
    try {
      b = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
      b.width = w; b.height = h; bufs[i] = b;
    } catch { return null; }
  }
  return b;
};

/** ลิ้นไฟวาดมือ n ลิ้นเรียงตามปากกระทะ ฐานอยู่ที่ (cx±spread, baseY) สูง soulH*hMul — ส่ายและยืดหด ไม่พร้อมกัน */
function flameRow(ctx, i, { cx, baseY, spread, n, hMul, soulH, t, alpha, reduced, salt }) {
  for (let k = 0; k < n; k++) {
    const im = fxImg(FLAMES[(k + i + salt) % 3]); if (!im) continue;
    const f = flick(t, i + salt, k + 1), ph = t / (210 + k * 29) + k * 1.9 + i * 1.3 + salt;
    const h = soulH * hMul * (reduced ? 0.78 : 0.62 + 0.5 * f) * (k === (n >> 1) ? 1.15 : 0.85 + 0.15 * (k % 2));
    const w = h * 0.5, x = cx + (n === 1 ? 0 : (k / (n - 1) - 0.5) * 2 * spread), sway = reduced ? 0 : Math.sin(ph) * w * 0.14;
    ctx.globalAlpha = alpha * (reduced ? 0.85 : 0.7 + 0.3 * f);
    ctx.save(); ctx.translate(x, baseY); ctx.transform(1, 0, sway / h, 1, 0, 0);
    ctx.drawImage(im, -w / 2, -h, w, h); ctx.restore();
  }
}

/** วาดวิญญาณลงกระทะใบที่ i พร้อมไฟ — drawSoulAt(x, y, target) คือฟังก์ชันวาดตัววิญญาณเดิมของห้อง (ไม่ดัดแปลงภาพ)
 *  ลำดับ: ไฟหลังตัว → ตัววิญญาณ (ตัดที่ขอบหน้าปากกระทะ · เติมแดงกะพริบ) → ไฟหน้าทับท่อนล่าง → แสงกองไฟใต้ท้อง
 *  → เหงื่อตก + ไอร้อน + ประกายลอย  (reduced = ไม่กะพริบ/ไม่ขยับ เหลือแดงคงที่กับไฟนิ่ง) */
export function drawPotSoul(ctx, pot, i, { px, py, U, t, reduced = false }, drawSoulAt) {
  const cx = px(potSoulX(pot, i)), x = cx;
  const mouthY = py(pot.mouthY), rxPx = Math.abs(px(pot.rx) - px(0)), ryPx = py(pot.frontY) - mouthY;
  const soulH = U * 0.085, y = py(pot.frontY) + soulH * SINK, frontPx = py(pot.frontY);
  const pulse = reduced ? 0 : Math.max(0, Math.sin(t / 190 + i * 2.1)) ** 2;       // จังหวะแดงกะพริบ ~1.2 วิ/รอบ เหลื่อมกันทีละใบ
  const redA = reduced ? 0.22 : 0.08 + 0.58 * pulse;

  // 1) ไฟหลังตัว: แสงกองไฟในปากกระทะ + ลิ้นไฟวาดมือสามแบบซ้อนกัน (เดิมเป็นลิ่มสามเหลี่ยมโค้ดวาด ดูแปะ) — ตัดไว้ในปากกระทะ
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - rxPx * 1.1, mouthY - soulH * 1.3, rxPx * 2.2, soulH * 1.3); ctx.ellipse(cx, mouthY, rxPx, ryPx, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(cx, mouthY + ryPx * 0.5, 1, cx, mouthY + ryPx * 0.2, rxPx * 1.05);
  glow.addColorStop(0, `rgba(255,125,30,${0.5 + 0.2 * flick(t, i, 0)})`); glow.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = glow; ctx.fillRect(cx - rxPx * 1.2, mouthY - soulH, rxPx * 2.4, soulH * 1.6 + ryPx);
  flameRow(ctx, i, { cx, baseY: mouthY + ryPx * 0.7, spread: rxPx * 0.62, n: 4, hMul: 1.15, soulH, t, alpha: 0.85, reduced, salt: 0 });
  ctx.restore();

  // 2) ตัววิญญาณ ตัดที่ขอบหน้าปากกระทะ (วงรี) ท่อนล่างจึงจมอยู่ในกระทะ · แดงกะพริบ = ทับสีแดงบนสำเนาตัววิญญาณ (source-atop) ไม่ใช้ ctx.filter
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - rxPx * 1.5, mouthY - soulH * 2, rxPx * 3, soulH * 2); ctx.ellipse(cx, mouthY, rxPx, ryPx, 0, 0, Math.PI * 2);
  ctx.clip();
  const m = ctx.getTransform?.(), k = (m && m.a) || 1, bw = Math.ceil(soulH * 1.4), bh = Math.ceil(soulH * 1.4);
  const buf = bufFor(i, Math.ceil(bw * k), Math.ceil(bh * k)), bctx = buf && buf.getContext('2d');
  const shake = reduced ? 0 : (pulse > 0.2 ? Math.sin(t / 23 + i * 5) * U * 0.0014 : 0);          // สั่นนิดตอนไฟลวก
  if (bctx) {
    const ox = bw / 2, oy = soulH * 1.18;
    bctx.setTransform(1, 0, 0, 1, 0, 0); bctx.clearRect(0, 0, buf.width, buf.height); bctx.setTransform(k, 0, 0, k, 0, 0);
    drawSoulAt(ox, oy, bctx);
    bctx.globalCompositeOperation = 'source-atop'; bctx.fillStyle = `rgba(255,32,20,${redA.toFixed(3)})`; bctx.fillRect(0, 0, bw, bh);
    bctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(buf, x - ox + shake, y - oy, bw, bh);
  } else drawSoulAt(x, y);          // ไม่มีผืนวาดชั่วคราว (เช่นในเทสต์) → วาดตรง ไม่เติมแดง
  ctx.restore();

  // 3) ไฟหน้า: ลิ้นไฟเตี้ยกว่าไฟหลัง ฐานที่ขอบหน้าปากกระทะ ลอยทับท่อนล่างของวิญญาณ (ตัดไว้ในปากกระทะ)
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - rxPx * 1.1, mouthY - soulH * 0.8, rxPx * 2.2, soulH * 0.8); ctx.ellipse(cx, mouthY, rxPx, ryPx, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  flameRow(ctx, i, { cx, baseY: frontPx - ryPx * 0.12, spread: rxPx * 0.8, n: 5, hMul: 0.42, soulH, t, alpha: 0.9, reduced, salt: 1 });
  ctx.restore();

  // 4) แสงกองไฟใต้ท้องกระทะกะพริบ (ทับภาพไฟเดิมแบบบวกแสง)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fyp = py(pot.fireY), fr = rxPx * 1.5;
  const bed = ctx.createRadialGradient(cx, fyp, 1, cx, fyp, fr);
  bed.addColorStop(0, `rgba(255,170,60,${0.38 + 0.3 * flick(t, i, 7)})`); bed.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = bed; ctx.beginPath(); ctx.ellipse(cx, fyp, fr, fr * 0.45, 0, 0, Math.PI * 2); ctx.fill();

  // 5) ไอร้อนลอยขึ้นจากปากกระทะ (วงนุ่มซีดๆ จางหายไปตามความสูง) + ประกายไฟจากแผ่น embers วาดมือ
  const hz = hazeSprite();
  if (hz && !reduced) for (let n = 0; n < 3; n++) {
    const life = (t / 2600 + n / 3 + i * 0.21) % 1, hx = cx + Math.sin(life * 5 + n * 2.4 + i) * rxPx * 0.45, hy = mouthY - soulH * 0.35 - life * soulH * 1.25;
    const hs = soulH * (0.5 + life * 0.5); ctx.globalAlpha = 0.5 * Math.sin(life * Math.PI);
    ctx.drawImage(hz, hx - hs / 2, hy - hs / 2, hs, hs);
  }
  ctx.globalAlpha = 1;
  const emb = fxImg('fx-fire-embers');
  for (let n = 0; n < 5; n++) {
    const life = reduced ? n * 0.2 + 0.15 : ((t / 1400 + n * 0.2 + i * 0.13) % 1), ex = cx + Math.sin(life * 6 + n * 2 + i) * rxPx * 0.7, ey = mouthY + ryPx * 0.3 - life * soulH * 1.3;
    const a = reduced ? 0.5 : 0.9 * (1 - life);
    if (emb) { const es = Math.max(5, U * 0.016); ctx.globalAlpha = a; ctx.drawImage(emb, (n % 4) * 64, 0, 64, 64, ex - es / 2, ey - es / 2, es, es); }
    else { ctx.fillStyle = `rgba(255,${180 + n * 15},80,${a})`; const s = Math.max(1.5, U * 0.004); ctx.fillRect(ex, ey, s, s); }
  }
  ctx.restore();

  // 6) เหงื่อตก: หยดออกจากหัว/ขมับ ตกลงและจาง (เหลื่อมกันสามหยด · reduced = หยดนิ่งหยดเดียว)
  const sw = fxImg('fx-soul-sweat-drops');
  if (sw) {
    ctx.save();
    const ds = Math.max(7, U * 0.018), headY = y - soulH * 0.82;
    for (let n = 0; n < (reduced ? 1 : 3); n++) {
      const life = reduced ? 0.35 : (t / 900 + n / 3 + i * 0.29) % 1, side = n % 2 ? 1 : -1;
      const dx = cx + side * soulH * (0.2 + 0.07 * n), dy = headY + life * life * soulH * 0.5;
      ctx.globalAlpha = reduced ? 0.9 : Math.min(1, life * 6) * (1 - life * life);
      ctx.drawImage(sw, SWEAT_CELLS[(n + i) % 3] * 128, 0, 128, 128, dx - ds / 2, dy - ds / 2, ds, ds);
    }
    ctx.restore();
  }
}
