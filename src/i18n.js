// i18n.js — ชั้นแปล UI (ข้อ C ชุด 15) — สลับ TH/ENG ได้ทันทีไม่ต้องรีโหลด
// ขอบเขต C2: รอบนี้แปลเฉพาะ "กรอบ UI" (ปุ่ม/เมนู/HUD/แท็บ/ป้าย/กล่องยืนยัน/ข้อความระบบ)
//   ไม่แปลเนื้อเรื่อง (สำนวนคดี บทพูด บทนำ ชื่อวิญญาณ) — ที่ที่ยังไม่มีคำแปล ให้ตกไทยไปก่อน
//   (ดูตาราง key ที่ยังไม่มีอังกฤษใน Output/Toby/2026-09-28-avegee-batch15/i18n-en-keys.md)
const KEY = 'avegee.lang';
export const SUPPORTED = ['th', 'en'];

let lang = 'th';
try { const saved = localStorage.getItem(KEY); if (SUPPORTED.includes(saved)) lang = saved; } catch {}
if (typeof document !== 'undefined') document.documentElement.lang = lang === 'en' ? 'en' : 'th';

const listeners = new Set();
export function getLang() { return lang; }
export function setLang(next) {
  if (!SUPPORTED.includes(next) || next === lang) return;
  lang = next;
  try { localStorage.setItem(KEY, lang); } catch {}
  document.documentElement.lang = lang === 'en' ? 'en' : 'th';
  listeners.forEach(fn => { try { fn(lang); } catch (e) { console.error(e); } });
}
/** สมัครรับรู้เวลาเปลี่ยนภาษา — คืนฟังก์ชันยกเลิกการสมัคร */
export function onLangChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

// ---------- พจนานุกรม UI ----------
// รูปแบบ key: 'จอ.ส่วน.ชื่อ' — ให้ Rae ตรวจสำนวนอังกฤษได้จากลิสต์เดียว (ดู C3)
const TH = {
  'title.resume': 'เล่นต่อ',
  'title.newGame': 'เริ่มเกมใหม่',
  'title.newGame.short': 'เริ่มเกมใหม่',
  'title.intro': 'ดูบทนำอีกครั้ง',
  'title.intro.hint': 'อ่านการ์ตูนเปิดเรื่อง 5 หน้า · ไม่กระทบเกมที่บันทึกไว้',
  'title.settings': 'ตั้งค่า',
  'title.tapEnter': 'แตะเพื่อเข้าสู่อเวจี',
  'title.confirmNewGame.title': 'เริ่มเกมใหม่',
  'title.confirmNewGame.body': 'มีเกมที่บันทึกไว้อยู่ — เริ่มใหม่แล้วความคืบหน้าทั้งหมดจะหายไป',
  'title.confirmNewGame.cancel': 'ยกเลิก',
  'title.confirmNewGame.ok': 'เริ่มใหม่',

  'settings.title': 'ตั้งค่า',
  'settings.music': 'เสียงเพลง',
  'settings.sounds': 'เสียงเอฟเฟกต์',
  'settings.language': 'ภาษา',
  'settings.save': 'บันทึก',
  'settings.home': 'กลับเมนูแรก',
  'settings.restart': 'เริ่มใหม่',
  'settings.restart.confirmTitle': 'เริ่มเกมใหม่?',
  'settings.restart.confirmBody': 'ความคืบหน้าทั้งหมดของเกมนี้จะหายไป จะเริ่มจากวาระแรกใหม่ทั้งหมด',
  'settings.restart.confirmCancel': 'ยกเลิก',
  'settings.restart.confirmOk': 'ยืนยันเริ่มใหม่',
  'settings.close': 'ปิด',
  'settings.saved': 'บันทึกแล้ว',
  'settings.audioHint': 'เสียงเอฟเฟกต์สังเคราะห์ในโค้ด ไม่ต้องโหลดไฟล์ · เพลงอ่านจาก audio/ ไม่มีไฟล์ก็เล่นได้ตามปกติ เงียบเฉยๆ',

  'hud.pause': 'หยุด',
  'hud.settings': 'ตั้งค่า',
  'hud.book': 'คู่มือ',
  'hud.bag': 'กระเป๋า',
  'hud.openCourt': 'เปิดศาล',
  'hud.closeCourt': 'ปิดศาล',
  'hud.trialBegins': 'เริ่มพิจารณาคดี',
  'hud.trialRecess': 'พักพิจารณาคดี',
  'hud.noCourt': 'ยังไม่มีวิญญาณในแถว',
  'hud.courtClosedTrial': 'ศาลปิดอยู่ — เปิดศาลเพื่อพิจารณาคดีใหม่',
  'station.gamePaused': '⏸ เกมหยุดพักอยู่ — ปิดหน้าต่างพักเพื่อให้งานเดินต่อ',
  'station.closeToResume': 'ปิดหน้าต่างเพื่อเดินเกมต่อ',
  'mob.fromRiver': 'บุกมาจากชายฝั่งแม่น้ำ',
  'mob.spawnRiver': 'บุกมาจากชายฝั่งแม่น้ำ — มันจะเดินไปเผาอาคาร ถ้าไม่ไปหยุด',
  'mob.spawnRiverGuard': 'บุกมาจากชายฝั่งแม่น้ำ — ยักษ์ทวารบาลกำลังไปปราบ',
  'hud.noCourtShort': 'ยังไม่มีวิญญาณรอ',
  'hud.bookTip': 'เกมจะค่อย ๆ สอนทีละเรื่องผ่านกระดิ่งแจ้งเตือน — หน้านี้ไว้เปิดย้อนดูตอนลืม',
  'pause.title': 'หยุดเกม',
  'pause.home': 'กลับหน้าแรก',
  'pause.resume': 'เล่นต่อ',
  'pause.settings': 'ตั้งค่า',
  'coach.notice': 'ข้อความควรรู้',
  'coach.chapter': 'บทที่',
  'coach.previous': 'ก่อนหน้า',
  'coach.next': 'ถัดไป',
  'trial.missing': 'ออกหมายไม่ได้ — ยังไม่ได้เลือก',
  'trial.stationMissing': 'ไม่พบสถานีนี้',
  'trial.soulMissing': 'วิญญาณไม่อยู่ในคิวแล้ว',
  'trial.stationFull': 'สถานีเต็ม',
  'trial.crewMissing': 'ไม่มีผู้คุมที่รับหมายได้',
  'trial.crewEscort': 'ผู้คุมกำลังพาดวงก่อนหน้า',
  'trial.crewBuilding': 'ผู้คุมกำลังก่อสร้าง',
  'trial.crewAt': 'ผู้คุมประจำอยู่ที่ ',
  'trial.failed': 'ออกหมายไม่สำเร็จ กรุณาเลือกใหม่',
  'trial.hp': 'บารมี',
  'hud.moreMenu': 'เมนูเพิ่มเติม',
  'hud.queue': 'คิววิญญาณ',
  'hud.crew': 'ยมทูต',
  'hud.build': 'ก่อสร้าง',
  'hud.info': 'ข้อมูล',
  'hud.log': 'บันทึก',
  'hud.zone': 'ย้ายโซน',
  'hud.rank': 'ยศ',

  'trial.caseNo': 'สำนวน',
  'trial.pause': 'หยุด',
  'trial.settings': 'ตั้งค่า',
  'trial.close': 'ปิด',
  'trial.power': 'พลัง',
  'trial.where': 'ที่ไหน',
  'trial.who': 'ใครคุม',
  'trial.force': 'ความแรง',
  'trial.warrant': 'ออกหมาย',
  'trial.center': 'บ้านกลาง',
  'trial.interrogateLeft': 'ไต่สวนจี้ได้อีก',
  'trial.times': 'ครั้ง',
  'trial.guideBook': 'คู่มือ',
  'trial.lockCase': 'ขังไว้ก่อน',
  'trial.skipCase': 'พักคดีนี้',
  'trial.readAloud': 'สำนวนที่นิราอ่านให้ฟัง',
  'trial.chooseIssue': 'เลือกประเด็นที่จะสอบสวน',
  'trial.saveRecord': 'บันทึกการสอบสวน',

  'battle.bossOfZone': 'บอสโซน',
  'battle.pause': 'หยุด',
  'battle.settings': 'ตั้งค่า',
  'battle.attack': 'โจมตี',
  'battle.power': 'พลัง',
  'battle.crew': 'ยมทูต',
  'battle.item': 'ไอเทม',

  'common.close': 'ปิด',
  'common.confirm': 'ยืนยัน',
  'common.cancel': 'ยกเลิก',
  'common.back': 'ย้อนกลับ',
};

const EN = {
  'title.resume': 'RESUME',
  'title.newGame': 'NEW GAME',
  'title.newGame.short': 'NEW GAME',
  'title.intro': 'Watch intro again',
  'title.intro.hint': 'Read the 5-page opening comic · does not affect your saved game',
  'title.settings': 'SETTING',
  'title.tapEnter': 'TAP TO ENTER',
  'title.confirmNewGame.title': 'New Game',
  'title.confirmNewGame.body': 'You have a saved game — starting new will erase all progress.',
  'title.confirmNewGame.cancel': 'Cancel',
  'title.confirmNewGame.ok': 'Start New',

  'settings.title': 'SETTING',
  'settings.music': 'MUSIC',
  'settings.sounds': 'SOUNDS',
  'settings.language': 'LANGUAGE',
  'settings.save': 'SAVE',
  'settings.home': 'Home',
  'settings.restart': 'Restart',
  'settings.restart.confirmTitle': 'Restart game?',
  'settings.restart.confirmBody': 'All progress in this run will be lost — you will start again from the first term.',
  'settings.restart.confirmCancel': 'Cancel',
  'settings.restart.confirmOk': 'Confirm restart',
  'settings.close': 'Close',
  'settings.saved': 'Saved',
  'settings.audioHint': 'Sound effects are synthesized in code, nothing to load · music streams from audio/ — no file yet plays fine, just silent.',

  'hud.pause': 'Pause',
  'hud.settings': 'Settings',
  'hud.book': 'Guide',
  'hud.bag': 'Bag',
  'hud.openCourt': 'OPEN COURT',
  'hud.closeCourt': 'CLOSE COURT',
  'hud.trialBegins': 'TRIAL BEGINS',
  'hud.trialRecess': 'TRIAL RECESS',
  'hud.noCourt': 'No souls in line',
  'hud.courtClosedTrial': 'Court closed — open it to hear a new case',
  'station.gamePaused': '⏸ Game paused — close this window to resume work',
  'station.closeToResume': 'Close window to resume',
  'mob.fromRiver': 'Invading from the riverbank',
  'mob.spawnRiver': ' invaded from the riverbank — it will head for the buildings unless stopped',
  'mob.spawnRiverGuard': ' invaded from the riverbank — the gate guard is moving to stop it',
  'hud.noCourtShort': 'No soul waiting',
  'hud.bookTip': 'The notification bell teaches each topic as it becomes relevant. Reopen this guide any time.',
  'pause.title': 'PAUSE',
  'pause.home': 'Home',
  'pause.resume': 'Resume',
  'pause.settings': 'Settings',
  'coach.notice': 'Things to know',
  'coach.chapter': 'Chapter',
  'coach.previous': 'Previous',
  'coach.next': 'Next',
  'trial.missing': 'Cannot issue warrant — still choose',
  'trial.stationMissing': 'Station unavailable',
  'trial.soulMissing': 'Soul is no longer in the queue',
  'trial.stationFull': 'Station is full',
  'trial.crewMissing': 'No available keeper',
  'trial.crewEscort': 'Keeper is escorting the previous soul',
  'trial.crewBuilding': 'Keeper is constructing a station',
  'trial.crewAt': 'Keeper is assigned to ',
  'trial.failed': 'Warrant could not be issued. Please choose again',
  'trial.hp': 'Authority',
  'hud.moreMenu': 'More',
  'hud.queue': 'Soul queue',
  'hud.crew': 'Yamatoot',
  'hud.build': 'Build',
  'hud.info': 'Info',
  'hud.log': 'Log',
  'hud.zone': 'Change zone',
  'hud.rank': 'Rank',

  'trial.caseNo': 'Case',
  'trial.pause': 'Pause',
  'trial.settings': 'Settings',
  'trial.close': 'Close',
  'trial.power': 'Power',
  'trial.where': 'Where',
  'trial.who': 'Who handles',
  'trial.force': 'Intensity',
  'trial.warrant': 'Issue warrant',
  'trial.center': 'Home base',
  'trial.interrogateLeft': 'Interrogations left:',
  'trial.times': '',
  'trial.guideBook': 'Guide book',
  'trial.lockCase': 'Hold case',
  'trial.skipCase': 'Skip case',
  'trial.readAloud': "Nira's case brief",
  'trial.chooseIssue': 'Choose the issue to investigate',
  'trial.saveRecord': 'Save investigation record',

  'battle.bossOfZone': 'Zone Boss:',
  'battle.pause': 'Pause',
  'battle.settings': 'Settings',
  'battle.attack': 'Attack',
  'battle.power': 'Power',
  'battle.crew': 'Yamatoot',
  'battle.item': 'Item',

  'common.close': 'Close',
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.back': 'Back',
};

const DICT = { th: TH, en: EN };

/** t('key') — คืนคำแปลของภาษาปัจจุบัน · ไม่มีคำอังกฤษ → ตกไปใช้ไทย (ตามข้อ C2/C3)
 *  ไม่มี key เลยในดิกชันนารีทั้งคู่ → คืน key ตรง ๆ (กันพัง) พร้อม warn ครั้งเดียวใน console */
const warned = new Set();
export function t(key) {
  const row = DICT[lang] || TH;
  if (key in row) return row[key];
  if (key in TH) return TH[key];
  if (!warned.has(key)) { warned.add(key); console.warn('[i18n] missing key:', key); }
  return key;
}

/** รายชื่อ key ทั้งหมดที่ "มีคำอังกฤษจริง" ไว้ให้ Rae ตรวจสำนวน (ข้อ C3) */
export function englishKeys() { return Object.keys(EN); }

/** เติมคำแปลให้ทุก element ที่มี data-t="key" ใน root (ค่าเริ่มต้น = ทั้งเอกสาร)
 *  เรียกครั้งแรกตอนบูต + ทุกครั้งที่ onLangChange ยิง — ใช้ได้กับ DOM ที่วาดซ้ำ (โมดัล) เพราะ query ใหม่ทุกครั้ง */
export function applyI18n(root = document) {
  root.querySelectorAll('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
  root.querySelectorAll('[data-t-title]').forEach(el => { el.title = t(el.dataset.tTitle); });
  root.querySelectorAll('[data-t-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.tAria)); });
}
