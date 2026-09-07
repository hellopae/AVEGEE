// sfx.js — เสียงทั้งเกม
//
// กติกาที่ตัดสินไว้ใน AUDIO.md:
//   · เสียง action = สังเคราะห์ด้วย WebAudio ในโค้ด → 0 ไฟล์ 0 ไบต์ ไม่มีดีเลย์
//   · เพลง = ไฟล์จริงจาก Suno ที่ audio/<key>.ogg → ไม่มีไฟล์ก็เงียบ ไม่พัง ไม่ error
// เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้แตะจอ — ทุกอย่างจึงเริ่มที่ unlock() ตอนกดปุ่มแรก

const LS = 'avegee.audio';
export const AUDIO = { sfx: 0.55, bgm: 0.40, on: true };
try { Object.assign(AUDIO, JSON.parse(localStorage.getItem(LS) || '{}')); } catch {}
export function saveAudio() { try { localStorage.setItem(LS, JSON.stringify(AUDIO)); } catch {} }

let AC = null, unlocked = false;
export function unlock() {
  if (unlocked) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); unlocked = true; } catch {}
  if (AC && AC.state === 'suspended') AC.resume();
  if (pendingBgm) bgm(pendingBgm);
}

/** เสียงพื้นฐานหนึ่งชั้น — ใช้ประกอบกันเป็นเสียงจริงข้างล่าง */
function tone({ f = 220, f2, t = 0.18, type = 'sine', vol = 0.5, delay = 0 }) {
  if (!AC || !AUDIO.on) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * AUDIO.sfx), t0 + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(g).connect(AC.destination);
  o.start(t0); o.stop(t0 + t + 0.02);
}

/** เสียงซ่า — ใช้ทำเสียงฟาด เสียงตรา เสียงกระจกร้าว */
function noise({ t = 0.12, vol = 0.4, hp = 800, delay = 0 }) {
  if (!AC || !AUDIO.on) return;
  const t0 = AC.currentTime + delay;
  const n = Math.floor(AC.sampleRate * t);
  const buf = AC.createBuffer(1, n, AC.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = AC.createBufferSource(); src.buffer = buf;
  const f = AC.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
  const g = AC.createGain(); g.gain.value = vol * AUDIO.sfx;
  src.connect(f).connect(g).connect(AC.destination);
  src.start(t0);
}

/** ตารางเสียงทั้งหมด — ชื่อตรงกับ AUDIO.md */
const BANK = {
  gong:   () => { tone({ f:78,  f2:62,  t:2.4, type:'sine',     vol:0.55 });
                  tone({ f:156, f2:130, t:1.6, type:'triangle', vol:0.22 }); },
  stamp:  () => { noise({ t:0.06, vol:0.5, hp:1400 });
                  tone({ f:120, f2:60, t:0.16, type:'square', vol:0.35 }); },
  hit:    () => { noise({ t:0.09, vol:0.45, hp:900 });
                  tone({ f:180, f2:70, t:0.14, type:'sawtooth', vol:0.3 }); },
  fire:   () => { tone({ f:640, f2:110, t:0.34, type:'sawtooth', vol:0.32 });
                  noise({ t:0.24, vol:0.22, hp:500 }); },
  crack:  () => { noise({ t:0.07, vol:0.3, hp:3200 });
                  tone({ f:1400, f2:600, t:0.18, type:'triangle', vol:0.2 }); },
  deny:   () => tone({ f:150, f2:120, t:0.16, type:'square', vol:0.22 }),
  star:   () => { [880, 1108, 1318].forEach((f, i) =>
                    tone({ f, t:0.5, type:'sine', vol:0.28, delay:i * 0.09 })); },
  hurt:   () => { tone({ f:200, f2:52, t:0.5, type:'sawtooth', vol:0.34 });
                  noise({ t:0.16, vol:0.2, hp:300 }); },
  heaven: () => { [1046, 1568].forEach((f, i) =>
                    tone({ f, t:1.5, type:'sine', vol:0.26, delay:i * 0.16 })); },
  win:    () => { [523, 659, 784, 1046].forEach((f, i) =>
                    tone({ f, t:0.4, type:'triangle', vol:0.26, delay:i * 0.08 })); },
  lose:   () => { tone({ f:160, f2:44, t:1.2, type:'sawtooth', vol:0.36 }); },
};

export function sfx(name) {
  if (!AUDIO.on || !AC) return;
  const fn = BANK[name];
  if (fn) try { fn(); } catch {}
}

// ---------- เพลง ----------
// ไฟล์อยู่ที่ audio/<key>.<ext> — ยังไม่มีไฟล์ = เงียบเฉย ๆ ไม่ขึ้น error ให้ผู้เล่นเห็น
//
// รับได้ทั้ง mp3 และ ogg (แก้ 8 ก.ย. 2569) — เดิมบังคับ .ogg อย่างเดียว
// แล้วเจ้าของต้องไปแปลงไฟล์ที่ Suno ส่งมาเองทุกครั้ง ซึ่งไม่จำเป็น:
// mp3 เล่นได้ทุกเบราว์เซอร์ และไฟล์ใหญ่กว่า ogg ไม่กี่สิบเปอร์เซ็นต์เท่านั้น
// ลองไล่ทีละนามสกุล ตัวไหนเล่นได้ก็ใช้ตัวนั้น
const EXT = ['ogg', 'mp3', 'm4a'];
let el = null, cur = null, pendingBgm = null;
const srcCache = new Map();       // key → path ที่มีจริง (หรือ null ถ้าไม่มีสักนามสกุล)

/** หาไฟล์ที่มีอยู่จริง — ถามเซิร์ฟเวอร์ตรง ๆ ด้วย HEAD
 *  เดิมอาศัย el.onerror ของ <audio> ไล่ทีละนามสกุล ซึ่งพึ่งไม่ได้:
 *  เบราว์เซอร์เลื่อนการโหลดสื่อในแท็บที่ไม่ได้อยู่หน้าจอ error เลยไม่ยิงสักที
 *  แล้วเพลงก็ค้างอยู่ที่นามสกุลแรกที่ไม่มีไฟล์ (เจอ 8 ก.ย. 2569) */
async function findSrc(key) {
  if (srcCache.has(key)) return srcCache.get(key);
  let found = null;
  for (const ext of EXT) {
    const url = `audio/${key}.${ext}`;
    try {
      const r = await fetch(url, { method: 'HEAD', cache: 'force-cache' });
      if (r.ok) { found = url; break; }
    } catch { /* ออฟไลน์หรือ HEAD ไม่ผ่าน — ลองนามสกุลถัดไป */ }
  }
  srcCache.set(key, found);
  return found;
}

/** เพลงที่ใช้แทนได้ถ้าเพลงที่ขอยังไม่มีไฟล์
 *  ทำให้ "มีเพลงเดียวก็ฟังได้ทั้งเกม" แล้วพอเติมไฟล์ทีละเพลง เกมจะเปลี่ยนไปใช้ของจริงเอง
 *  โดยไม่ต้องแก้โค้ดสักบรรทัด — ตรงกับวิธีที่ทำกับรูปทั้งเกม */
const FALLBACK = ['bgm-zone', 'bgm-title'];

export function bgm(key) {
  if (!key) return stopBgm();
  if (!unlocked) { pendingBgm = key; return; }
  pendingBgm = null;
  if (cur === key && el && !el.paused) return;
  cur = key;
  if (!el) { el = new Audio(); el.loop = true; el.preload = 'auto'; }
  el.volume = AUDIO.on ? AUDIO.bgm : 0;

  (async () => {
    let url = null;
    for (const k of [key, ...FALLBACK]) {
      url = await findSrc(k);
      if (url) break;
    }
    if (cur !== key) return;                 // เปลี่ยนเพลงไปแล้วระหว่างรอ
    if (!url) return;                        // ยังไม่มีไฟล์เพลงสักไฟล์ — เงียบไว้ ไม่ต้องบอกใคร
    if (el.src.endsWith(url) && !el.paused) return;   // เพลงเดียวกันเล่นอยู่แล้ว อย่าตัดจังหวะ
    if (!el.src.endsWith(url)) el.src = url;
    el.play().catch(() => {});               // ถูกนโยบาย autoplay ห้ามไว้ก็ปล่อยไป ไม่ใช่ความผิดของไฟล์
  })();
}

export function stopBgm() { cur = null; if (el) { el.pause(); } }
export function syncBgm() { if (el) el.volume = AUDIO.on ? AUDIO.bgm : 0; }
