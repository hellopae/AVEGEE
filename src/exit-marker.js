// P5 — จุดออกที่เดินถึงแล้วออกเลย (ไม่มีปุ่ม)
//
// สองส่วนในไฟล์เดียว ใช้ร่วมกันทุกฉาก (ห้องสถานี · แผนที่ชายแดน · เส้นทางนอกชายแดน):
//  1) exitStep  — ตัวล็อก (latch) แบบฟังก์ชันล้วน: เข้าฉากใหม่ตรงจุดออกพอดีแล้วไม่ออกทันที
//                 ต้องเดินออกจากระยะก่อน แล้วค่อยเดินกลับถึงจะออก · ไม่ออกขณะ blocked (คัตซีน/สู้/มินิเกม/dialog)
//                 รูปแบบเดียวกับ dungeonExitArrival ของ O1 (ที่ประตูโซนชายแดน)
//  2) drawExitMarker — ลูกศร/วงจางๆ บนพื้นบอกผู้เล่นว่าเดินไปทางไหนถึงจะออก
//                 วาดด้วยโค้ด ชั่วคราว — ถ้า Kittanate วาดลูกศรเอง ให้ดูสเปกในรายงาน P5

/** @param {{at:boolean, latched:boolean, blocked?:boolean}} s
 *  @returns {{latched:boolean, fire:boolean}} */
export function exitStep({ at, latched, blocked = false }) {
  if (!at) return { latched: false, fire: false };
  const fire = !latched && !blocked;
  return { latched: latched || fire, fire };
}

/** ลูกศรชี้ทางออกบนพื้น: วงรีเรืองทองตามระยะที่ออกได้จริง + เครื่องหมาย chevron 3 ชั้นไหลไปทางออก + ป้ายเล็ก (ถ้ามี)
 *  x,y = จุดออก (พิกเซล canvas) · rx,ry = ครึ่งแกนของวงรีระยะออก (พิกเซล) · dir = [dx,dy] ทิศที่ออกไป
 *  u = หน่วยความยาวฉาก (พิกเซล) กำหนดขนาดลูกศร · alpha 0-1 (0.55 เบา ๆ เป็นค่าตั้งต้น) */
export function drawExitMarker(ctx, x, y, { rx, ry, dir = [0, 1], u = 100, t = 0, label = '', alpha = 1, reduced = false } = {}) {
  const pulse = reduced ? 0.5 : 0.5 + 0.5 * Math.sin(t / 520);
  const len = Math.hypot(dir[0], dir[1]) || 1, dx = dir[0] / len, dy = dir[1] / len;
  ctx.save();
  // วงเรืองพื้น — ขอบนอก = ระยะที่เดินถึงแล้วออกจริง
  ctx.translate(x, y); ctx.scale(1, ry / rx);
  const glow = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
  glow.addColorStop(0, `rgba(255,214,128,${(0.30 + pulse * 0.12) * alpha})`);
  glow.addColorStop(0.7, `rgba(255,190,90,${0.12 * alpha})`);
  glow.addColorStop(1, 'rgba(255,190,90,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // chevron 3 ชั้น ชี้ไปทางออก — ชั้นที่ใกล้ทางออกสว่างกว่า (ไหลตามเวลา)
  const s = u * 0.022, step = u * 0.03, nx = -dy, ny = dx;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i++) {
    const fall = reduced ? 1 : 0.55 + 0.45 * Math.max(0, Math.sin(t / 380 - i * 0.9));
    const a = (0.30 + 0.45 * (i / 2)) * fall * alpha;
    const cx = x + dx * (i - 2) * step, cy = y + dy * (i - 2) * step;   // the trail runs from the room toward the exit point
    const tip = [cx + dx * s, cy + dy * s], l = [cx - dx * s + nx * s * 1.6, cy - dy * s + ny * s * 1.6], r = [cx - dx * s - nx * s * 1.6, cy - dy * s - ny * s * 1.6];
    for (const [w, col] of [[Math.max(4, u * 0.0085), `rgba(30,14,8,${a * 0.8})`], [Math.max(2, u * 0.0042), `rgba(255,226,150,${a})`]]) {
      ctx.strokeStyle = col; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(r[0], r[1]); ctx.stroke();
    }
  }
  if (label) {
    ctx.font = `600 ${Math.round(Math.max(10, u * 0.021))}px "IBM Plex Sans Thai", system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const ly = y + (dy >= 0 ? -u * 0.115 : u * 0.115);   // ป้ายอยู่ฝั่งด้านในของฉาก ตรงข้ามทางออก
    ctx.lineWidth = 4; ctx.strokeStyle = `rgba(0,0,0,${0.75 * alpha})`; ctx.strokeText(label, x, ly);
    ctx.fillStyle = `rgba(255,226,170,${0.85 * alpha})`; ctx.fillText(label, x, ly);
  }
  ctx.restore();
}
