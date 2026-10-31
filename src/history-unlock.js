// Q2 — คู่มือประวัติตัวละครปลดล็อกตามการพบตัว (ใบงาน 2026-10-31-avegee-q2-hist)
// ไฟล์นี้เป็นตรรกะล้วน ไม่แตะ DOM: ui.js เรียก syncHistory(g) แล้วอ่านผลจาก g.historySeen
//
// หลักการ: g.historySeen = { [id การ์ด]: true } เก็บใน save และ "ไม่ถอยกลับ"
// เปิดได้สองทาง
//   1) คำนวณจากสถานะเกมที่มีอยู่แล้ว (derivedUnlocks) — ธงเดิม met: / roster / storySeen / bossArriveSeen ฯลฯ
//   2) g.markHistory(id) จากจุดที่ผู้เล่นเห็นตัวละครจริง (ฉากคำตัดสิน, ฉากเปิดสาขา, ร้านพ่อค้า) และ noteBattleHistory ตอนต่อสู้
// เซฟเก่า (ไม่มี historyV) ถูก migrate ครั้งเดียวด้วย legacy=true: ผ่อนเกณฑ์ให้ตัวที่อยู่ใน roster นับว่าเจอแล้ว
import { CREW } from './data.js';
import { CHARACTER_HISTORY, KIN_HISTORY } from './e1-content.js';

export const HISTORY_VERSION = 1;
export const HISTORY_ZONES = Object.freeze(['th', 'asia', 'west', 'cyberhell']);
const CREW_KEYS = Object.freeze(['taan', 'plerng', 'kan', 'boon', 'dam']);
const HIRE0 = new Set(CREW.filter(c => c.hire === 0).map(c => c.k));   // ทัณฑ์ นิรา: ไม่ต้องจ้าง จึงนับเมื่อ "คุย" เท่านั้น

/** การ์ดที่แสดงเสมอ — กรอบเรื่องแต่ง ยามา นิรา */
export const ALWAYS_OPEN = Object.freeze(['frame', 'yama', 'nira']);

export const headId = zone => zone === 'th' ? 'dad' : `head:${zone}`;

/** ชนิดศัตรูในฉากต่อสู้ (sp) → การ์ดที่เปิด · zone ของฉากใช้เมื่อ sp ไม่บอกโซน */
export function cardsFromFoeSprite(sp, zone) {
  if (!sp) return [];
  let m;
  if ((m = /^boss-frontier-(.+)$/.exec(sp))) return [`frontier:${m[1]}`];
  if ((m = /^boss-tester-(.+)$/.exec(sp))) return [`deva:${m[1]}`];
  if ((m = /^leader-(.+?)(?:-possessed)?$/.exec(sp))) return [headId(m[1])];
  if ((m = /^zone-boss-(.+)$/.exec(sp))) return [`boss:${m[1]}`];
  if (sp === 'zone-boss' && zone) return [`boss:${zone}`];
  return [];
}

const FRONTIER_EVENT = { th: 'frontierBreach', asia: 'asiaRageBreach', west: 'westVampireBreach', cyberhell: 'cyberBreach' };
const DEVA_EVENT = { th: 'devaTest', asia: 'asiaDevaTest', west: 'westDevaTest', cyberhell: 'cyberRescue' };
const DEVA_STORY = { th: ['deva-th-praise', 'deva-th-warning'], asia: ['deva-asia'], west: ['deva-west'], cyberhell: ['deva-cyberhell'] };
const startedOrDone = s => s === 'active' || s === 'cleared';

/** การ์ดที่ควรเปิดตามสถานะเกมตอนนี้ (ไม่แก้ g) */
export function derivedUnlocks(g, legacy = false) {
  const open = new Set(ALWAYS_OPEN);
  const seen = g.talk?.seen || {};
  const story = g.storySeen || {};
  const ev = g.zoneEvents || {};
  const roster = g.roster || {};
  const finalSeen = !!(story.ending || story['ending-capture'] || story['cyber-control'] || story['cyber-duel'] || g.gameCompleted);

  // ยมทูต: คุยแล้ว (met:) หรือจ้างแล้ว (อยู่ใน roster และไม่ใช่ตัวที่มีให้ตั้งแต่เริ่ม) · เซฟเก่า: อยู่ใน roster ก็พอ
  for (const k of CREW_KEYS) for (const z of HISTORY_ZONES) {
    const met = !!seen[`met:${k}@${z}`];
    const hired = !!roster[`${z}:${k}`] && (legacy || !HIRE0.has(k));
    if (met || hired) open.add(`crew:${k}@${z}`);
  }
  // ยักษ์: คุยแล้วหรือจ้างแล้ว
  for (const z of HISTORY_ZONES) if (seen[`met:guard@${z}`] || roster[`${z}:guard`]) open.add(`guard@${z}`);

  // พ่อ / หัวหน้าโซน: เจอในเนื้อเรื่อง (ฉากเปิดสาขา ฉากคำตัดสิน คำเตือนแดง ฉากช่วยหัวหน้า)
  if (legacy && (g.casesDone > 0 || g.ledger?.length > 0)) open.add('dad');
  for (const z of HISTORY_ZONES.slice(1)) {
    if (g.zoneIntroSeen?.[z] || finalSeen) open.add(headId(z));
    if (legacy && (g.zone === z || g.zoneCases?.[z] > 0 || g.zoneSave?.[z])) open.add(headId(z));
  }
  if (finalSeen) HISTORY_ZONES.forEach(z => open.add(headId(z)));

  // บอสโซน: เจอฉากมาถึง ต่อสู้ หรือชนะแล้ว
  for (const z of HISTORY_ZONES) {
    if (g.bossArriveSeen?.[z] || g.bossCleared?.[z] || g.bossGuarding?.[z]) open.add(`boss:${z}`);
    if (z === 'cyberhell' && finalSeen) open.add('boss:cyberhell');
  }
  // บอสชายแดน: ชนะศึกชายแดนของโซนนั้น (หรือเห็นฉากสะกดจิตของวาลดริก)
  for (const z of HISTORY_ZONES) if (ev[z]?.[FRONTIER_EVENT[z]] === 'cleared') open.add(`frontier:${z}`);
  if (story['west-hypnosis']) open.add('frontier:west');
  // เทวดา: เห็นฉากเผยกาย หรือเริ่มการทดสอบแล้ว (อรุณเดชเปิดหลังเฉลยตัวเท่านั้น)
  for (const z of HISTORY_ZONES) {
    if (DEVA_STORY[z].some(k => story[k]) || startedOrDone(ev[z]?.[DEVA_EVENT[z]])) open.add(`deva:${z}`);
  }
  // พ่อค้า: เปิดร้านหรือคุยแล้ว หรือเห็นฉากวิ่งตามมา
  if (HISTORY_ZONES.some(z => seen[`met:merchant@${z}`] || g.merchantJourney?.[z]?.arrived) || Object.keys(story).some(k => k.startsWith('mrun-')))
    open.add('merchant');
  if (legacy && (g.casesDone > 0 || g.zone !== 'th')) open.add('merchant');
  return open;
}

/** รวมสถานะที่คำนวณได้เข้า g.historySeen (ไม่ถอยกลับ) แล้วคืน g.historySeen */
export function syncHistory(g, { legacy = false } = {}) {
  const seen = g.historySeen ||= {};
  for (const id of derivedUnlocks(g, legacy)) seen[id] = true;
  return seen;
}

/** เรียกระหว่างอยู่ในฉากต่อสู้: ศัตรูที่เห็นอยู่ตอนนี้เปิดการ์ดของเขา */
export function noteBattleHistory(g) {
  const b = g.battle;
  if (!b) return;
  const seen = g.historySeen ||= {};
  if (b.kind === 'zoneBoss') seen[`boss:${b.zone}`] = true;
  for (const f of b.foes || [b]) for (const id of cardsFromFoeSprite(f.sp, b.zone)) seen[id] = true;
  if (b.kind === 'dad') seen[headId(b.zone || g.zone)] = true;
}

/** ข้อความการ์ด = ข้อความหลัก + ประโยคญาติ (บอกชื่อถ้าเจอญาติแล้ว ไม่บอกถ้ายังไม่เจอ) */
export function historyCardText(card, seen) {
  const kin = KIN_HISTORY[card.id];
  if (!kin) return card.text;
  const n = kin.needs.reduce((acc, id, i) => acc | (seen[id] ? 1 << i : 0), 0);
  return `${card.text} ${kin.text[n]}`;
}

/** การ์ดที่เปิดแล้ว พร้อมข้อความสำเร็จรูป — เรียงตามลำดับเดิมของ CHARACTER_HISTORY */
export function openHistoryCards(g, cards = CHARACTER_HISTORY) {
  const seen = syncHistory(g);
  return cards.filter(c => seen[c.id]).map(c => ({ id: c.id, title: c.title, text: historyCardText(c, seen) }));
}

/** หัวข้อ "วงศ์เดียวกัน…" โชว์เมื่อมีตัวละครนอกโซน 1 หรือพ่อค้าเปิดแล้ว (กันสปอยล์ตั้งแต่เกมใหม่) */
export function showFamilyNote(g) {
  const seen = syncHistory(g);
  return Object.keys(seen).some(id => seen[id] && (id === 'merchant' || /@(asia|west|cyberhell)$/.test(id)));
}
