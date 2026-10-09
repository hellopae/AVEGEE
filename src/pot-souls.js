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

/** วาดวิญญาณลงกระทะใบที่ i พร้อมไฟ — drawSoulAt(x, y) คือฟังก์ชันวาดตัววิญญาณเดิมของห้อง (ไม่ดัดแปลงภาพ)
 *  ลำดับ: ไฟหลังตัว → ตัววิญญาณ (ตัดที่ขอบหน้าปากกระทะ ให้ท่อนล่างจมอยู่ในกระทะ) → แสงกองไฟใต้ท้อง + ประกายไฟลอย */
export function drawPotSoul(ctx, pot, i, { px, py, U, t }, drawSoulAt) {
  const cx = px(potSoulX(pot, i)), x = cx;
  const mouthY = py(pot.mouthY), rxPx = Math.abs(px(pot.rx) - px(0)), ryPx = py(pot.frontY) - mouthY;
  const soulH = U * 0.085, y = py(pot.frontY) + soulH * SINK;

  // 1) ลิ้นไฟหลังตัววิญญาณ ไล่สูงต่ำไม่พร้อมกัน — ตัดไว้ในปากกระทะ
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - rxPx * 1.1, mouthY - soulH * 0.8, rxPx * 2.2, soulH * 0.8); ctx.ellipse(cx, mouthY, rxPx, ryPx, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(cx, mouthY + ryPx * 0.5, 1, cx, mouthY + ryPx * 0.2, rxPx * 1.05);
  glow.addColorStop(0, `rgba(255,125,30,${0.5 + 0.2 * flick(t, i, 0)})`); glow.addColorStop(1, 'rgba(255,80,20,0)');
  ctx.fillStyle = glow; ctx.fillRect(cx - rxPx * 1.2, mouthY - soulH, rxPx * 2.4, soulH * 1.6 + ryPx);
  const tongues = 7;
  for (let k = 0; k < tongues; k++) {
    const bx = cx + (k - (tongues - 1) / 2) * rxPx * 0.28 + Math.sin(t / 260 + k * 1.9 + i) * rxPx * 0.05;
    const h = soulH * (0.3 + 0.4 * flick(t, i, k + 1)), w = rxPx * 0.32;
    const by = mouthY + ryPx * 0.75, sway = Math.sin(t / 210 + k * 2.1 + i * 1.3) * w * 0.5;
    const grad = ctx.createLinearGradient(0, by, 0, by - h);
    grad.addColorStop(0, 'rgba(255,100,15,.8)'); grad.addColorStop(0.5, 'rgba(255,150,40,.55)'); grad.addColorStop(1, 'rgba(255,200,90,0)');
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(bx - w, by);
    ctx.quadraticCurveTo(bx - w * 0.9, by - h * 0.55, bx + sway, by - h);
    ctx.quadraticCurveTo(bx + w * 0.9, by - h * 0.55, bx + w, by); ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // 2) ตัววิญญาณ ตัดที่ขอบหน้าปากกระทะ (วงรี) ท่อนล่างจึงจมอยู่ในกระทะ
  ctx.save();
  ctx.beginPath(); ctx.rect(cx - rxPx * 1.5, mouthY - soulH * 2, rxPx * 3, soulH * 2); ctx.ellipse(cx, mouthY, rxPx, ryPx, 0, 0, Math.PI * 2);
  ctx.clip();
  drawSoulAt(x, y);
  ctx.restore();

  // 3) แสงกองไฟใต้ท้องกระทะกะพริบ (ทับภาพไฟเดิมแบบบวกแสง) + ประกายไฟลอยขึ้นจากปากกระทะ
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fyp = py(pot.fireY), fr = rxPx * 1.5;
  const bed = ctx.createRadialGradient(cx, fyp, 1, cx, fyp, fr);
  bed.addColorStop(0, `rgba(255,170,60,${0.38 + 0.3 * flick(t, i, 7)})`); bed.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = bed; ctx.beginPath(); ctx.ellipse(cx, fyp, fr, fr * 0.45, 0, 0, Math.PI * 2); ctx.fill();
  for (let k = 0; k < 4; k++) {
    const life = ((t / 1400 + k * 0.25 + i * 0.13) % 1);
    const ex = cx + Math.sin(life * 6 + k * 2 + i) * rxPx * 0.55, ey = mouthY - life * soulH * 1.1;
    ctx.fillStyle = `rgba(255,${180 + k * 15},80,${0.85 * (1 - life)})`;
    const s = Math.max(1.5, U * 0.004); ctx.fillRect(ex, ey, s, s);
  }
  ctx.restore();
}
