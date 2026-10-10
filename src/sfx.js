// sfx.js — เสียงทั้งเกม
//
// กติกาที่ตัดสินไว้ใน AUDIO.md:
//   · เสียง action = สังเคราะห์ด้วย WebAudio ในโค้ด → 0 ไฟล์ 0 ไบต์ ไม่มีดีเลย์
//   · เพลง = ไฟล์จริงจาก Suno ที่ audio/<key>.ogg → ไม่มีไฟล์ก็เงียบ ไม่พัง ไม่ error
// เบราว์เซอร์ห้ามเล่นเสียงก่อนผู้ใช้แตะจอ — ทุกอย่างจึงเริ่มที่ unlock() ตอนกดปุ่มแรก

import { fetchWithTimeout } from './asset-preload.js';
const LS = 'avegee.audio';
// bgm 0.22 ตั้งแต่ 8 ก.ย. 2569 — เดิม 0.40 เจ้าของบอกว่าดังเกิน
// เพลงเป็นฉากหลังของการอ่านสำนวน ต้องเบากว่าที่คิดไว้มาก · ปรับเพิ่มได้ที่หน้าตั้งค่า
export const AUDIO = { sfx: 0.55, bgm: 0.22, on: true,
  sfxOn: true, bgmOn: true };   // F2 ข้อ 7: ปิดเสียงเอฟเฟกต์/เพลงแยกกันได้ (หน้าตั้งค่า) · เซฟเก่าไม่มีคีย์นี้ = เปิด
try { Object.assign(AUDIO, JSON.parse(localStorage.getItem(LS) || '{}')); } catch {}
// el.volume ขว้าง RangeError ถ้าเกิน 0..1 — ค่าใน localStorage แก้มือ/พังได้ จึงบีบเข้าช่วงก่อนใช้ทุกครั้ง
/** เสียงเอฟเฟกต์/เพลง เปิดอยู่ไหม — ต้องเปิดทั้งสวิตช์รวม (on) และสวิตช์ของตัวเอง */
const sfxEnabled = () => AUDIO.on && AUDIO.sfxOn !== false;
const bgmEnabled = () => AUDIO.on && AUDIO.bgmOn !== false;
const clamp01 = v => Math.min(1, Math.max(0, Number.isFinite(+v) ? +v : 0));
export function saveAudio() { try { localStorage.setItem(LS, JSON.stringify(AUDIO)); } catch {} }

let AC = null, unlocked = false;
export function unlock() {
  if (unlocked) return;
  try { AC = new (window.AudioContext || window.webkitAudioContext)(); unlocked = true; } catch {}
  if (AC && AC.state === 'suspended') AC.resume();
  if (pendingBgm) bgm(pendingBgm);
}

/** เสียงพื้นฐานหนึ่งชั้น — ใช้ประกอบกันเป็นเสียงจริงข้างล่าง */
function tone({ f = 220, f2, t = 0.18, type = 'sine', vol = 0.5, delay = 0, attack = 0.008 }) {
  if (!AC || !sfxEnabled() || AUDIO.sfx <= 0) return;
  const t0 = AC.currentTime + delay;
  const o = AC.createOscillator(), g = AC.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + t);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * AUDIO.sfx), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
  o.connect(g).connect(AC.destination);
  o.start(t0); o.stop(t0 + t + 0.02);
}

/** เสียงซ่า — ใช้ทำเสียงฟาด เสียงตรา เสียงกระจกร้าว */
function noise({ t = 0.12, vol = 0.4, hp = 800, delay = 0 }) {
  if (!AC || !sfxEnabled() || AUDIO.sfx <= 0) return;
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
  item: () => { [784,1047,1568].forEach((f,i) => tone({f,t:.28,type:'sine',vol:.25,delay:i*.10})); },
  levelup: () => { [523,659,784,1047,1319].forEach((f,i) => tone({f,t:.42,type:'triangle',vol:.27,delay:i*.12})); },
  star:   () => { [880, 1108, 1318].forEach((f, i) =>
                    tone({ f, t:0.5, type:'sine', vol:0.28, delay:i * 0.09 })); },
  hurt:   () => { tone({ f:200, f2:52, t:0.5, type:'sawtooth', vol:0.34 });
                  noise({ t:0.16, vol:0.2, hp:300 }); },
  // H4: original WebAudio sine tones, no sampled or licensed audio files.
  gateScan: () => [1568,2093].forEach((f,i)=>tone({f,t:.45,vol:.10,delay:i*.13})),
  gateReborn: () => [784,1046,1568].forEach((f,i)=>tone({f,f2:f*.5,t:.75,vol:.12,delay:i*.12})),
  gateSky: () => [1046,1318,1568,2093].forEach((f,i)=>tone({f,t:.9,vol:.10,delay:i*.12,attack:.06})),
  heaven: () => { [1046, 1568].forEach((f, i) =>
                    tone({ f, t:1.5, type:'sine', vol:0.26, delay:i * 0.16 })); },
  win:    () => { [523, 659, 784, 1046].forEach((f, i) =>
                    tone({ f, t:0.4, type:'triangle', vol:0.26, delay:i * 0.08 })); },
  lose:   () => { tone({ f:160, f2:44, t:1.2, type:'sawtooth', vol:0.36 }); },

  // ---- ท่าไม้ตาย / พลังพิเศษ (28C, 2 ต.ค. 2569) ----
  // สังเคราะห์ในโค้ดเหมือนเสียงอื่น 0 ไฟล์ · แต่ละเสียงสั้น (<= ~0.9 วิ) ผลรวม vol ของชั้นที่ดังพร้อมกัน <= ~0.75
  // (คูณ AUDIO.sfx อีกชั้น) เพื่อไม่ให้กลบเพลงและไม่ล้น 1.0 แม้เลื่อนสไลเดอร์เสียงสุด
  bigfire: () => { tone({ f:96,  f2:42,  t:0.55, type:'sawtooth', vol:0.30 });          // ตูมต่ำ
                   tone({ f:520, f2:90,  t:0.50, type:'sawtooth', vol:0.20 });          // ลมพุ่ง
                   noise({ t:0.45, vol:0.22, hp:350 }); },
  charge: () => { tone({ f:120, f2:540, t:0.42, type:'sawtooth', vol:0.24 });           // พุ่งขึ้น
                  noise({ t:0.40, vol:0.18, hp:450 });
                  noise({ t:0.08, vol:0.32, hp:700,  delay:0.44 });                     // กระแทก
                  tone({ f:150, f2:55, t:0.2, type:'square', vol:0.28, delay:0.44 }); },
  wind:   () => { noise({ t:0.62, vol:0.26, hp:1200 });
                  noise({ t:0.50, vol:0.18, hp:2400, delay:0.10 });
                  tone({ f:420, f2:1250, t:0.5, type:'triangle', vol:0.10 }); },
  rage:   () => { tone({ f:72,  f2:48,  t:0.75, type:'sawtooth', vol:0.28 });           // คำราม
                  tone({ f:140, f2:96,  t:0.55, type:'square',   vol:0.12 });
                  tone({ f:110, f2:240, t:0.50, type:'sawtooth', vol:0.14, delay:0.05 });
                  noise({ t:0.5, vol:0.18, hp:220 }); },
  spear:  () => { tone({ f:1800, f2:520, t:0.22, type:'triangle', vol:0.20 });          // ปา
                  noise({ t:0.10, vol:0.22, hp:3500 });
                  tone({ f:210, f2:80, t:0.18, type:'square', vol:0.28, delay:0.24 }); // ปัก
                  noise({ t:0.07, vol:0.30, hp:1200, delay:0.24 }); },
  clock:  () => { [1600, 1200, 1600, 1200].forEach((f, i) =>                            // ติ๊กต่อก ย้อนกลับ
                    tone({ f: f - i * 120, t:0.06, type:'sine', vol:0.20, delay:i * 0.11 }));
                  tone({ f:1046, t:0.55, type:'sine', vol:0.18, delay:0.48 });
                  tone({ f:1568, t:0.45, type:'sine', vol:0.12, delay:0.52 }); },
  ice:    () => { noise({ t:0.10, vol:0.28, hp:4500 });
                  tone({ f:2400, f2:1800, t:0.35, type:'sine', vol:0.14 });
                  tone({ f:3000, f2:2200, t:0.30, type:'sine', vol:0.11, delay:0.07 });
                  tone({ f:1800, t:0.40, type:'triangle', vol:0.10, delay:0.14 }); },
  hypno:  () => { tone({ f:440, f2:330, t:0.9, type:'sine',     vol:0.20 });           // สองโน้ตเหลื่อมกันเป็นคลื่นหวือ
                  tone({ f:447, f2:337, t:0.9, type:'sine',     vol:0.18 });
                  tone({ f:660, f2:220, t:0.8, type:'triangle', vol:0.10, delay:0.10 }); },
  roar:   () => { tone({ f:120, f2:60, t:0.55, type:'sawtooth', vol:0.28 });            // ตวาดข่มขู่ (ไต่สวน)
                  noise({ t:0.40, vol:0.18, hp:250 }); },
  mirror: () => { [1568, 2093, 2637].forEach((f, i) =>                                  // กระจกวิเศษ แวววับ
                    tone({ f, t:0.35, type:'sine', vol:0.14, delay:0.05 + i * 0.07 }));
                  noise({ t:0.06, vol:0.14, hp:5000 }); },
};

/** ชื่อเสียงทั้งหมดที่มีในตาราง — ให้เทสต์ตรวจว่าท่าทุกท่าชี้ไปหาเสียงที่มีจริง */
export const SFX_NAMES = Object.keys(BANK);

/** ท่าไม้ตาย/ไอเท็มในฉากต่อสู้และวงไต่สวน → ชื่อเสียงใน BANK
 *  k = คีย์ที่ปุ่มส่งมา (data-act / data-pw) · abilities = g.abilities (ใช้แยกลูกไฟธรรมดา/ลูกไฟใหญ่)
 *  ท่าที่ไม่รู้จัก (โจมตีธรรมดา, ยมทูตช่วย, ยักษ์) = 'hit' เหมือนเดิม */
export function powerSfx(k, abilities = {}) {
  switch (k) {
    case 'fire':          return abilities?.bigFire ? 'bigfire' : 'fire';
    case 'flameCharge':   return 'charge';
    case 'windFan':       return 'wind';
    case 'rage':          return 'rage';
    case 'valkyrieSpear': return 'spear';
    case 'cooldownClock': return 'clock';
    case 'ice':           return 'ice';
    case 'hypno':         return 'hypno';
    case 'roar':          return 'roar';
    case 'mirror':        return 'mirror';
    case 'health': case 'tea': case 'holyWater': return 'star';
    default:              return 'hit';
  }
}

// ---------- เสียงท่าไม้ตาย (F2 ข้อ 6, คุณเป้ 9 ต.ค. 2569) ----------
// ชาร์จพลังสั้น ๆ → ระเบิด/กระแทกหนัก → ก้องหาย รวม ~1.3 วิ ตรงกับคัตซีน ACTION_CUT_MS (ui.js)
// สังเคราะห์ในโค้ดเหมือนเสียงอื่น (0 ไฟล์) · ผลรวม vol ตอนกระแทก ≈ 0.76 (คูณ AUDIO.sfx อีกชั้น) · ปิดเสียง = เงียบหมด (tone/noise เช็ก sfxEnabled เอง)
// pitch ต่างกันตามท่า: ไฟ/ลมกลาง · น้ำแข็งแหลม · คำรามต่ำ — โครงเสียงเดียวกัน
export const ULTIMATE_POWERS = Object.freeze({
  flameCharge:1, windFan:1.25, rage:0.7, valkyrieSpear:1.15, ice:1.6, hypno:1.1,
});
export const isUltimatePower = k => Object.prototype.hasOwnProperty.call(ULTIMATE_POWERS, k);
/** เสียงพากย์ ("ย๊าก"/ชื่อท่า) — เพิ่มทีหลังได้โดยไม่แตะโค้ดอื่น: วางไฟล์ในโฟลเดอร์ audio/voice/ แล้วเติมหนึ่งบรรทัดที่นี่
 *  เช่น  flameCharge: 'audio/voice/flame-charge.mp3'  · ไม่มีรายการ = ไม่เล่นอะไร (ไม่ยิงขอไฟล์ จึงไม่มี 404) */
export const VOICE_LINES = {};
function playVoice(k) {
  const url = VOICE_LINES[k];
  if (!url || !sfxEnabled() || AUDIO.sfx <= 0 || typeof Audio === 'undefined') return;
  try { const a = new Audio(url); a.volume = clamp01(AUDIO.sfx); a.play()?.catch?.(() => {}); } catch {}
}
export function playUltimate(k) {
  if (!isUltimatePower(k)) return;
  if (AC && sfxEnabled() && AUDIO.sfx > 0) {
    const p = ULTIMATE_POWERS[k];
    // 0.00–0.55 ชาร์จ: เสียงไต่ขึ้น + ลมซ่าไต่ขึ้น + ก้นหนักบวมขึ้น
    tone({ f:70*p,  f2:430*p, t:0.55, type:'sawtooth', vol:0.20, attack:0.35 });
    tone({ f:46,    f2:60,    t:0.58, type:'sine',     vol:0.22, attack:0.40 });
    noise({ t:0.55, vol:0.14, hp:Math.round(500*p) });
    // 0.55 ระเบิด/กระแทก
    noise({ t:0.40, vol:0.28, hp:Math.round(180*p), delay:0.55 });
    tone({ f:120*p, f2:34, t:0.75, type:'sine',   vol:0.30, delay:0.55 });
    tone({ f:210*p, f2:60, t:0.30, type:'square', vol:0.18, delay:0.55 });
    // 0.7–1.3 ก้องหาย
    noise({ t:0.60, vol:0.10, hp:Math.round(900*p), delay:0.70 });
  }
  setTimeout(() => playVoice(k), 560);        // เสียงพากย์ (ถ้ามี) ตามหลังจังหวะกระแทกนิดเดียว
}

export function sfx(name) {
  if (!sfxEnabled() || !AC) return;
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
let cur = null, pendingBgm = null;   // cur = key เพลงที่ขอล่าสุด
// เพลงทุกเพลงมี <audio> ของตัวเอง "สร้างครั้งเดียว ตั้ง src ครั้งเดียว" (url → track) แล้วสลับด้วยการ fade
// ไม่สลับ src บน element เดียวอีก — ดูสาเหตุเสียงแตกที่ 28C ในคอมเมนต์เหนือ switchTo()
const tracks = new Map();          // url → { el, lvl (0..1 ระดับ fade ตอนนี้), goal (0|1) }
let curUrl = null;                 // url ของเพลงที่ควรดังอยู่ตอนนี้
const srcCache = new Map();       // key → path ที่มีจริง (หรือ null ถ้าไม่มีสักนามสกุล)
const mediaSources = new Map();  // complete downloaded music, including on iOS which ignores preload=auto

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
      const { response:r, release } = await fetchWithTimeout(url, { method:'HEAD', cache:'force-cache' }, 15000);
      release();
      if (r.ok) { found = url; break; }
    } catch { /* ออฟไลน์หรือ HEAD ไม่ผ่าน — ลองนามสกุลถัดไป */ }
  }
  srcCache.set(key, found);
  return found;
}

/** ถามหาไฟล์ล่วงหน้าตั้งแต่หน้าเว็บโหลด — **นี่คือหัวใจที่ทำให้เพลงเล่นติด**
 *
 *  เบราว์เซอร์ยอมให้ play() ก็ต่อเมื่อมันถูกเรียก "ในจังหวะเดียวกับที่ผู้ใช้กด" เท่านั้น
 *  ของเดิมเรียก play() หลัง await fetch คือหลุดจังหวะไปแล้วหนึ่งรอบ
 *  Chrome ปล่อยผ่านเพราะนับ sticky activation แต่ **Brave ไม่ปล่อย** — เพลงเลยไม่มาเลย
 *  (เจ้าของเจอ 8 ก.ย. 2569: Chrome ได้ยินเพลงโซน แต่ Brave เงียบสนิท)
 *
 *  รู้ path ไว้ก่อนตั้งแต่ยังไม่มีใครกด → พอถึงจังหวะกดจริง bgm() สั่ง play() ได้ทันที ไม่ต้องรออะไร */
export function primeAudio(keys = ['bgm-title', 'bgm-zone', 'bgm-battle']) {
  return Promise.all(keys.map(findSrc));
}

/** Fetch the whole file before releasing the loading screen. No play() until a user gesture. */
export async function preloadBgm(key) {
  if (srcCache.get(key) === null) srcCache.delete(key);
  const url = await findSrc(key);
  if (!url) throw new Error('music unavailable');
  if (mediaSources.has(url)) return;
  const { response, release } = await fetchWithTimeout(url, { cache:'force-cache' }, 45000);
  let blob;
  try {
    if (!response.ok) throw new Error('music download failed');
    blob = await response.blob();
  } finally { release(); }
  if (!blob.size) throw new Error('empty music');
  const source = URL.createObjectURL(blob);
  mediaSources.set(url, source);
  // An idle warmer may have created the track already. Never interrupt a playing track.
  const existing = tracks.get(url);
  if (existing && existing.el.paused && existing.goal === 0) existing.el.src = source;
  getTrack(url);
}

/** อุ่นเพลงล่วงหน้าแบบ priority ต่ำ — คนละเรื่องกับ primeAudio ข้างบน
 *  primeAudio รู้แค่ "path ไหนมีไฟล์จริง" (ยิง HEAD) ส่วนฟังก์ชันนี้สร้าง <audio> ของเพลงนั้นไว้ (preload='auto')
 *  ให้เบราว์เซอร์โหลดเนื้อไฟล์ไว้ก่อน จะได้ไม่ต้องโหลด 2.6MB กลางจังหวะเข้าฉากต่อสู้ครั้งแรก (คุณเป้เจอ 29 ก.ย. 2569:
 *  เพลงต่อสู้มาช้า/ไม่มาเลยบน Brave เพราะ knownSrc() ยังไม่รู้จัก ต้อง await findSrc() หลุดจังหวะ
 *  user-gesture ไปแล้ว) ใช้ requestIdleCallback รอจังหวะที่ว่างจริง ๆ จะได้ไม่แย่ง bandwidth กับของที่ต้องมาก่อน
 *  (28C: เดิมใช้ fetch อุ่น HTTP cache แต่เซิร์ฟเวอร์ dev สั่ง no-store จึงไม่เคยช่วย และ <audio> ตัวเดียวสลับ src
 *  ก็ต้องโหลดใหม่อยู่ดี — ตอนนี้ element ของเพลงนั้นถูกใช้เล่นจริง ที่โหลดไว้จึงเป็นของที่เล่นต่อได้เลย) */
export function warmBgmFile(key) {
  const ric = (typeof window !== 'undefined' && window.requestIdleCallback) || (fn => setTimeout(fn, 1200));
  ric(async () => {
    const url = await findSrc(key);
    if (!url) return;
    // สร้าง <audio> ของเพลงนี้ไว้ล่วงหน้า (preload='auto') — พอผู้เล่นเข้าฉากต่อสู้ เพลงโหลด/ถอดรหัสไว้แล้ว
    // สั่ง play() ได้เลยโดยไม่ต้องโหลดไฟล์ 2.6MB ทับจังหวะที่หน้าจอกำลังวาดฉากต่อสู้
    try { getTrack(url); } catch { /* ไม่มี Audio (เทสต์/เบราว์เซอร์แปลก) ก็ข้าม */ }
  });
}

/** เพลงที่ใช้แทนได้ถ้าเพลงที่ขอยังไม่มีไฟล์
 *  ทำให้ "มีเพลงเดียวก็ฟังได้ทั้งเกม" แล้วพอเติมไฟล์ทีละเพลง เกมจะเปลี่ยนไปใช้ของจริงเอง
 *  โดยไม่ต้องแก้โค้ดสักบรรทัด — ตรงกับวิธีที่ทำกับรูปทั้งเกม */
const FALLBACK = ['bgm-zone', 'bgm-title'];

/** path ที่รู้แล้วโดยไม่ต้อง await — คืน undefined ถ้ายังไม่เคยถาม */
function knownSrc(key) {
  for (const k of [key, ...FALLBACK]) {
    if (!srcCache.has(k)) return undefined;      // ยังไม่รู้ ต้องไปถามก่อน
    const u = srcCache.get(k);
    if (u) return u;
  }
  return null;                                   // ถามครบแล้ว ไม่มีไฟล์สักไฟล์
}

/** ถูกเบราว์เซอร์ปฏิเสธ — รอกดครั้งถัดไปแล้วลองใหม่ ไม่ปล่อยให้เงียบไปตลอดกาล */
let retryArmed = false;
function armRetry() {
  if (retryArmed) return;
  retryArmed = true;
  const again = () => {
    document.removeEventListener('pointerdown', again, true);
    document.removeEventListener('keydown', again, true);
    retryArmed = false;
    const t = curUrl && tracks.get(curUrl);
    if (t && t.el.paused && AUDIO.on) t.el.play().catch(onPlayFail);
  };
  document.addEventListener('pointerdown', again, true);
  document.addEventListener('keydown', again, true);
}
/** play() ล้มเพราะนโยบายเบราว์เซอร์ = รอกดแล้วลองใหม่ · ล้มเพราะเราเองสั่ง pause() ทับ (AbortError) = ปกติ ไม่ต้องทำอะไร */
function onPlayFail(e) { if (!e || e.name !== 'AbortError') armRetry(); return false; }

// ---------- สลับเพลงด้วย fade (28C, 2 ต.ค. 2569) ----------
const FADE_MS = 700;
// เพลงพวกนี้เล่นต่อจากจุดเดิมตอนกลับมา (เพลงโซนไม่เด้งกลับไปต้นเพลงทุกครั้งที่สู้จบ) · เพลงอื่นเริ่มใหม่จากต้นทุกครั้ง
const KEEP_POSITION = /\/bgm-zone\./;
const clock = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

function getTrack(url) {
  let t = tracks.get(url);
  if (!t) {
    const el = new Audio();
    el.loop = true; el.preload = 'auto'; el.volume = 0;
    el.src = mediaSources.get(url) || url;
    t = { el, lvl: 0, goal: 0 };
    tracks.set(url, t);
  }
  return t;
}

/** ตั้งความดังจริงของทุก element จากระดับ fade — ผลรวมความดังของเพลงที่ซ้อนกันอยู่ไม่เกิน AUDIO.bgm (ไม่เกิน 1.0)
 *  ตอน crossfade ปกติ lvl ขาออก + lvl ขาเข้า = 1 อยู่แล้ว · ถ้าสลับรัว ๆ จนซ้อนเกินสองเพลง หารลงให้ผลรวมยังเป็น 1 */
function applyVolumes() {
  let sum = 0;
  for (const t of tracks.values()) sum += t.lvl;
  const k = Math.max(1, sum);
  for (const t of tracks.values())
    t.el.volume = bgmEnabled() ? clamp01(clamp01(AUDIO.bgm) * t.lvl / k) : 0;
}

let ticker = 0, lastT = 0;
function step() {
  const now = clock(), dt = Math.max(0, now - lastT); lastT = now;
  let moving = false;
  for (const [url, t] of tracks) {
    if (t.lvl < t.goal) t.lvl = Math.min(t.goal, t.lvl + dt / FADE_MS);
    else if (t.lvl > t.goal) t.lvl = Math.max(t.goal, t.lvl - dt / FADE_MS);
    if (t.lvl !== t.goal) moving = true;
    else if (t.goal === 0 && !t.el.paused) {         // จางหมดแล้ว → หยุดจริง (ไม่กินเครื่องเงียบ ๆ เบื้องหลัง)
      t.el.pause();
      if (!KEEP_POSITION.test(url)) { try { t.el.currentTime = 0; } catch {} }
    }
  }
  applyVolumes();
  if (!moving) { clearInterval(ticker); ticker = 0; }
}
function ensureTicker() {
  if (ticker) return;
  lastT = clock();
  ticker = setInterval(step, 40);
}

/** สลับไปเพลง url ด้วย crossfade — สั่ง play() ทันที (อยู่ในจังหวะที่ผู้ใช้กด) แล้วค่อย ๆ ดันความดังขึ้น
 *
 *  สาเหตุที่เสียงแตกตอนเข้า/ออกฉากต่อสู้ (วัดจริงด้วย Chromium + ดัก event ของ <audio> ตอนสลับ 10 รอบ):
 *  โค้ดเดิมใช้ <audio> ตัวเดียว แล้วเปลี่ยน `el.src` ทุกครั้งที่เปลี่ยนเพลง ผลคือทุกครั้ง
 *    1) เบราว์เซอร์รื้อ pipeline เดิมทิ้ง (abort → emptied) แล้วโหลดไฟล์ใหม่ทั้งไฟล์ (loadstart → waiting → canplay)
 *       ตรง ๆ ในจังหวะเดียวกับที่หน้าจอกำลังวาดฉากต่อสู้ (รูปใหญ่ + คัตซีน) · เซิร์ฟเวอร์ dev ไม่รองรับ Range และสั่ง no-store
 *       ด้วย จึงดึง 2.6 MB ใหม่ทุกรอบ ("อุ่นไฟล์" ด้วย fetch ไม่ช่วย) → เล่นสะดุด/ขาดช่วง = เสียงแตก
 *    2) ตัดเพลงเก่าทิ้งกลางคลื่นแล้วเริ่มเพลงใหม่ที่ความดังเต็มทันที ไม่มี fade → คลิก/ป๊อปที่รอยต่อ
 *    3) เพลงโซนเด้งกลับไปเริ่มจาก 0:00 ทุกครั้งที่สู้จบ
 *  ไม่ใช่เสียงซ้อนหรือ AudioContext ซ้ำ (เช็คแล้ว: มี <audio> 1 ตัว + AudioContext 1 ตัวตลอด) · ไฟล์เพลงเองไม่แตก
 *  (peak −2.9 dB ไม่มี flat/clip ทั้ง 3 ไฟล์) · ผลรวมความดังเพลง+เอฟเฟกต์สูงสุด ~0.6 ไม่ถึง clipping
 *  แก้: <audio> ต่อเพลง สร้างครั้งเดียว src ตั้งครั้งเดียว สลับด้วย fade ขาออก/ขาเข้า (FADE_MS) ผลรวมไม่เกิน AUDIO.bgm */
function switchTo(url) {
  const t = getTrack(url);
  curUrl = url;
  for (const o of tracks.values()) if (o !== t) o.goal = 0;
  t.goal = 1;
  ensureTicker();
  if (!t.el.paused) { applyVolumes(); return Promise.resolve(true); }
  applyVolumes();                                   // เริ่มที่ volume ปัจจุบัน (ปกติ 0) แล้วให้ ticker ดันขึ้น
  return t.el.play().then(() => true, onPlayFail);
}

export function bgm(key) {
  if (!key) return stopBgm();
  if (!unlocked) { pendingBgm = key; return Promise.resolve(false); }
  pendingBgm = null;
  const playing = curUrl && tracks.get(curUrl);
  if (cur === key && playing && !playing.el.paused) return Promise.resolve(true);
  cur = key;

  const known = knownSrc(key);
  if (known !== undefined) {                     // รู้อยู่แล้ว → สั่งเล่นทันทีในจังหวะที่ผู้ใช้กด
    return known ? switchTo(known) : Promise.resolve(false);
  }
  // ยังไม่เคยถามไฟล์ชุดนี้ — ต้องรอ แล้วค่อยเล่น (จังหวะอาจหลุด จึงมี armRetry รองรับ)
  return (async () => {
    let url = null;
    for (const k of [key, ...FALLBACK]) { url = await findSrc(k); if (url) break; }
    if (cur !== key || !url) return false;
    return switchTo(url);
  })();
}

export function stopBgm() {
  cur = null; curUrl = null;
  for (const t of tracks.values()) t.goal = 0;     // จางออกแล้วหยุดเอง (step)
  if (tracks.size) ensureTicker();
}
export function syncBgm() { applyVolumes(); }

// ---------- ออกจากเกม = เงียบ ----------
// บนมือถือกับ iPad ปิดแท็บหรือสลับไปแอปอื่นแล้วเพลงยังเล่นต่อ (เจ้าของเจอ 8 ก.ย. 2569)
// <audio> ไม่หยุดเองเวลาหน้าเว็บถูกพักไว้เบื้องหลัง — iOS ยิ่งเลี้ยงไว้เป็นเสียงพื้นหลังให้ด้วย
// ต้องสั่ง pause() เองตอนหน้าเว็บซ่อน แล้วค่อยเล่นต่อตอนกลับมา (เฉพาะเพลงที่กำลังเล่นค้างไว้)
let resumeOnReturn = false;
function pauseAll() {
  for (const t of tracks.values()) if (!t.el.paused) t.el.pause();
}
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    const t = curUrl && tracks.get(curUrl);
    resumeOnReturn = !!(t && !t.el.paused);
    pauseAll();
    for (const o of tracks.values()) if (o.goal === 0) o.lvl = 0;   // เพลงที่กำลังจางออก ไม่ต้องกลับมา
    if (AC && AC.state === 'running') AC.suspend();      // เสียงเอฟเฟกต์ที่ค้างอยู่ก็หยุดตาม
  } else {
    if (AC && AC.state === 'suspended') AC.resume();
    const t = curUrl && tracks.get(curUrl);
    if (resumeOnReturn && AUDIO.on && t) { t.el.play().catch(onPlayFail); ensureTicker(); }
    resumeOnReturn = false;
  }
});

// ปิดแท็บ/กดย้อนกลับ — visibilitychange ไม่ยิงเสมอบน Safari มือถือ ต้องดัก pagehide ด้วย
if (typeof addEventListener === 'function') addEventListener('pagehide', pauseAll);
