// mp-regen.js — เติม MP ตามเวลาแบบจำนวนเต็ม (ชุด 30B ข้อ 5)
// ต้นเหตุของ "6.4219999999995/72": ห้องน้ำชานั่งพักบวกทศนิยม (5 × dt/1000) ลง g.mp ตรง ๆ ทุกเฟรม
// จึงเก็บเศษไว้ใน acc.frac แล้วเติมเข้า mp เฉพาะส่วนที่ครบหน่วย · mp ที่รับมาเป็นทศนิยมก็ปัดก่อน
export function regenMp(g, acc, dtMs, perSecond = 5) {
  g.mp = Math.round(g.mp);
  acc.frac = (acc.frac || 0) + perSecond * dtMs / 1000;
  const whole = Math.floor(acc.frac);
  if (whole > 0) {
    acc.frac -= whole;
    g.mp = Math.min(g.mpMax, g.mp + whole);
  }
  return g.mp;
}
