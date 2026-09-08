// preload.js — หน้าโหลดภาพก่อนเข้าเกม
//
// ปัญหาที่แก้ (8 ก.ย. 2569 เจ้าของเปิดบนมือถือกับ iPad): เข้าเกมแล้วฉากว่างเปล่าอยู่หลายวินาที
// เพราะภาพทั้งเกมรวมกัน 16 MB และ art.js ตั้งใจให้โหลด "ตอนจะวาด" — บนเน็ตบ้านไม่รู้สึก
// แต่บนเน็ตมือถือกว่าภาพจะมาถึงก็วาดผ่านไปหลายสิบเฟรมแล้ว ผู้เล่นเห็นแค่พื้นหินเปล่า
//
// วิธี: อ่านรายชื่อจาก img/manifest.json (สร้างด้วย scripts/make-manifest.py)
//   · กอง critical — หน้าปก พื้น ฉากโซนแรก ทีมงาน · กั้นจอไว้จนครบ
//   · กอง rest     — วิญญาณ เอฟเฟกต์ ไอเทม มอนสเตอร์ · โหลดต่อเงียบ ๆ หลังเข้าเกมแล้ว
//
// ไม่มี manifest หรือเน็ตช้าเกิน MAX_WAIT ก็ปล่อยเข้าเกมไปเลย ไม่ขังผู้เล่นไว้ที่หน้าโหลด
// (โหลดไม่ครบก็ยังเล่นได้ — art.js มี placeholder ของทุกชิ้นอยู่แล้ว)

const MAX_WAIT = 15000;   // ms — เกินนี้ถือว่าเน็ตช้าเกินจะรอ ปล่อยเข้าเกม
const LANES = 4;          // ไฟล์ที่ดึงพร้อมกันในกอง rest — มากกว่านี้ไปแย่งแบนด์วิดท์กับเกม

const el = document.getElementById('boot');

/** คำโปรยสลับไปเรื่อย ๆ — จอที่นิ่งสนิทดูเหมือนค้าง ทั้งที่มันกำลังโหลดอยู่ */
const NOTES = [
  'กำลังเปิดประตูโซนสุวรรณภูมิ…',
  'เรือจ้างกำลังพาคนข้ามมา…',
  'นิรากำลังเรียงสำนวนที่ค้างอยู่…',
  'ก่อไฟใต้กระทะทองแดง…',
  'ทัณฑ์ที่เกินกรรม มันไม่ได้หายไปไหน — มันมาอยู่ที่ผู้ตัดสิน',
];

function load(name) {
  return new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => res();     // ไฟล์หายก็ข้ามไป ไม่ให้ค้างทั้งกอง
    im.src = 'img/' + name;
  });
}

/** ดึงทีละ LANES ไฟล์จนหมดคิว */
async function drain(list, onEach) {
  let i = 0;
  const lane = async () => { while (i < list.length) await load(list[i++]).then(onEach); };
  await Promise.all(Array.from({ length: LANES }, lane));
}

function finish() {
  if (!el || el.classList.contains('gone')) return;
  el.classList.add('gone');
  setTimeout(() => el.remove(), 600);
}

(async () => {
  if (!el) return;
  const bar = el.querySelector('.bar i');
  const pct = el.querySelector('.pct');
  const note = el.querySelector('.note');

  let ni = 0;
  const spin = setInterval(() => {
    ni = (ni + 1) % NOTES.length;
    note.style.opacity = 0;
    setTimeout(() => { note.textContent = NOTES[ni]; note.style.opacity = 1; }, 400);
  }, 2600);

  const escape = setTimeout(finish, MAX_WAIT);
  const stop = () => { clearTimeout(escape); clearInterval(spin); finish(); };

  let man = null;
  try {
    const r = await fetch('img/manifest.json', { cache: 'force-cache' });
    if (r.ok) man = await r.json();
  } catch { /* ออฟไลน์หรือยังไม่ได้รัน make-manifest — เข้าเกมไปตามปกติ */ }

  if (!man || !man.critical || !man.critical.length) return stop();

  let n = 0;
  const total = man.critical.length;
  await drain(man.critical, () => {
    const p = ++n / total;
    bar.style.width = (p * 100).toFixed(0) + '%';
    pct.textContent = Math.round(p * 100) + '%';
  });

  stop();
  drain(man.rest || [], () => {});           // ที่เหลือตามมาระหว่างเล่น ไม่ต้องรอ
})();
