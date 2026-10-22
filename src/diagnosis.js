// diagnosis.js — โมเดลข้อมูลของ "ใบวินิจฉัยวิญญาณ" (P4 เฟส 1 · Vera spec §2) — ฟังก์ชันล้วน ไม่แตะ DOM/i18n
// เปิดจากห้องตะราง (tarang) และประตูสวรรค์ (sawan) เท่านั้น (D3)
// กฎกันสปอยล์ (D2/D4/D5):
//   · ดวงที่ยังขังรอวาระ (g.held) เปิดใบได้ แต่เห็นเฉพาะข้อมูลสาธารณะ และตัวชี้วัดทั้งหมดล็อก "ยังไม่ตัดสิน"
//   · ดวงที่รับทัณฑ์ครบแล้ว เผยความจริงทั้งหมด (ปิดคดีแล้ว เหมือนแฟ้มปิดคดี)
//   · ความสำนึกล็อก "ยังไม่ตรวจ" จนกว่านิราจะตรวจ — หลังตรวจจึงเห็นตัวเลข + breakdown 3 ส่วน (ผู้คุม / ความแรงทัณฑ์ / นิสัย)
import { SINS, STATIONS, INTENSITY_NAME, CREW, REMORSE, crewName } from './data.js';
import { gateKarma } from './h4-location-ui.js';
import { remorseOf } from './remorse.js';

export const DIAG_ROOMS = Object.freeze({ tarang: 'prison', sawan: 'gate' });

/** รายชื่อทุกดวงที่เปิดใบได้ในห้องนี้ (ลำดับเดียวกับแผงรายชื่อ: ดวงที่รับทัณฑ์แล้วก่อน แล้วค่อยดวงที่ขังรอ) */
export function diagnosisSubjects(g, roomK) {
  const stage = DIAG_ROOMS[roomK];
  if (!stage) return [];
  const entries = (g.sentences || []).filter(x => x.zone === g.zone && x.stage === stage).map(entry => ({ kind: stage, entry, soul: entry.soul }));
  const held = roomK === 'tarang' ? (g.held || []).map(soul => ({ kind: 'held', soul })) : [];
  return [...entries, ...held];
}
export const subjectKey = s => `${s.kind}:${s.soul.id}`;

const keeperNameOf = (g, entry) => entry.keeperName
  || (entry.keeperK ? (g.crewOf?.(entry.keeperK)?.name || CREW.find(c => c.k === entry.keeperK)?.name || null) : null);

/** บรรทัดสรุปคดี: face ของสำนวนที่มีชื่อ · ไม่มี face (สุ่ม) ใช้กรรมข้อแรกที่เปิดเผยแล้ว */
function faceOf(soul, deeds) {
  if (typeof soul.face === 'string' && soul.face.trim()) return soul.face;
  return deeds[0]?.t || '';
}

/** @returns {object} โมเดลล้วนสำหรับวาดใบ — ไม่มี HTML */
export function diagnosisModel(g, subject) {
  const { kind: mode, soul } = subject;
  const entry = subject.entry || null;
  const held = mode === 'held';
  const closed = !held;                                   // รับทัณฑ์ครบแล้ว = ปิดคดี เผยความจริงทั้งหมด

  const deedsAll = Array.isArray(soul.deeds) ? soul.deeds : [];
  const deedsShown = closed ? deedsAll : deedsAll.filter(d => d.known && d.visible !== false);
  const deeds = deedsShown.map(d => ({
    t: d.t, w: d.w, sin: d.s, sinName: SINS[d.s]?.name || '', color: SINS[d.s]?.color || '#999',
    relief: d.w < 0, hidden: d.known === false,           // hidden = เรื่องที่สำนวนไม่ได้เขียนไว้ (เผยเฉพาะหลังปิดคดี)
  }));
  const meritsAll = Array.isArray(soul.merits) ? soul.merits : [];
  const meritsShown = closed ? meritsAll : meritsAll.filter(m => (!m.fake || m.exposed) && !m.hiddenMerit);
  const merits = meritsShown.map(m => ({ t: m.t, v: m.v, fake: !!m.fake, exposed: !!m.exposed }));

  const lastSaid = [...(soul.said || [])].reverse().find(x => x && (closed ? ['confess', 'truth'].includes(x.kind) : x.kind));
  const said = lastSaid?.text || '';

  // ---- คำตัดสินที่ให้ไป ----
  const v = entry?.verdict;
  const stK = entry?.stationK || null;
  const order = !entry ? null : {
    stationK: stK, stationName: stK ? STATIONS.find(d => d.k === stK)?.name || null : null,
    keeperK: entry.keeperK || null, keeperName: keeperNameOf(g, entry),
    intensity: entry.intensity, intensityName: INTENSITY_NAME[entry.intensity] || '',
    deserved: soul.deserved ?? null, diff: Number.isFinite(soul.deserved) ? entry.intensity - soul.deserved : null,
    need: entry.need ?? null, stars: v?.stars ?? null, score: v?.score ?? null,
    boss: v?.boss ?? null, legacy: !stK,
    // ส่งตรงประตูสวรรค์ (ผู้บริสุทธิ์ที่ตัดสินถูก) = ไม่มีทัณฑ์จริง — entry.intensity ถูก clamp ≥ 1 จึงห้ามเอาไปเทียบ "หนักเกิน"
    direct: stK === 'sawan' || v?.heaven === true,
  };
  if (order?.direct) { order.diff = null; }

  // ---- ตัวชี้วัด ----
  const ked = { locked: held, value: held ? null : Number.isFinite(v?.ked) ? v.ked : null, fear: !!soul.fear };
  let remorse;
  if (held) remorse = { state: 'locked', why: 'held', value: null, parts: null, pass: REMORSE.pass };
  else if (mode === 'prison' && !entry.inspected) remorse = { state: 'locked', why: 'uninspected', value: null, parts: null, pass: REMORSE.pass };
  else {
    const total = remorseOf(entry);
    remorse = total === undefined
      ? { state: entry.repentant === true ? 'pass' : entry.repentant === false ? 'fail' : 'na', value: null, parts: null, pass: REMORSE.pass }
      : { state: total >= REMORSE.pass ? 'pass' : 'fail', value: total, parts: entry.remorse?.parts || null, detail: entry.remorse?.detail || null, pass: REMORSE.pass };
  }

  // ---- กรรมคงเหลือ (น้ำตก) ----
  let karma = { locked: true };
  if (entry) {
    const sinPos = deedsAll.filter(d => d.w > 0).reduce((n, d) => n + d.w, 0);
    const relief = -deedsAll.filter(d => d.w < 0).reduce((n, d) => n + d.w, 0);
    const merit = meritsAll.filter(m => !m.fake).reduce((n, m) => n + (m.v || 0), 0);
    const left = gateKarma(entry);
    const direct = !!order?.direct;
    karma = { locked: false, mode, direct, hideDest: mode === 'prison' && entry.inspected === true && entry.repentant === false,
      expected: !(mode === 'gate' && entry.checked), sin: sinPos, relief, merit, intensity: direct ? 0 : entry.intensity || 0,
      lotus: entry.lotusRelief || 0, left, pure: !!soul.pure,
      paid: Math.max(0, sinPos - left) };
  }

  // ---- แบนเนอร์ + ปุ่มหลัก (Vera §2.5 เรียงลำดับตรวจ) ----
  const needSawan = mode === 'prison' && entry.repentant && !g.stations.some(s => s.def.k === 'sawan' && !s.build);
  const wait = mode === 'prison' ? Math.max(0, (entry.readyAt ?? entry.until ?? 0) - g.tick) : 0;
  let banner, action;
  if (held) {
    banner = { id: 'held', tone: 'neutral' };
    action = { kind: 'release', label: 'diag.act.release' };
  } else if (mode === 'prison') {
    if (wait > 0) {
      banner = { id: 'prisonWait', tone: 'neutral', n: wait };
      action = { kind: 'none', disabled: true, label: 'diag.act.waiting', reason: 'diag.reason.wait', n: wait };
    } else if (!entry.inspected) {
      banner = { id: 'prisonInspect', tone: 'neutral' };
      action = { kind: 'inspectPrison', label: 'room.niraCheck' };
    } else if (entry.repentant) {
      banner = { id: 'prisonKed', tone: 'good' };
      action = { kind: 'moveFromPrison', label: 'room.toGate', disabled: needSawan, reason: needSawan ? 'room.needSawan' : '' };
    } else {
      banner = { id: 'prisonNotKed', tone: 'bad' };
      action = { kind: 'moveFromPrison', label: 'room.toQueue' };
    }
  } else if (!entry.checked) {
    banner = { id: 'gateWait', tone: 'neutral', n: karma.left, name: crewName(CREW.find(c => c.k === 'boon'), g.zone) };   // บุญ เปลี่ยนชื่อตามโซน
    action = { kind: 'inspectGate', label: 'room.gateCheck' };
  } else if (entry.karmaLeft > 0) {
    banner = { id: 'gateReborn', tone: 'info', n: entry.karmaLeft };
    action = { kind: 'resolveGate', label: 'room.toReborn' };
  } else {
    banner = { id: 'gateHeaven', tone: 'good', reward: entry.rewardEligible !== false };
    action = { kind: 'resolveGate', label: 'room.toSky' };
  }

  action.disabled = !!action.disabled;

  // ---- ถ้อยคำท้ายใบ (Rae: TALK_LINES.diagnosisClosing) ----
  let closing = null;
  if (soul.pure && !held) closing = 'pure';
  else if (mode === 'prison') closing = !entry.inspected ? 'tarangPending' : entry.repentant ? 'ked' : 'notKed';
  else if (mode === 'gate' && entry.checked) closing = entry.karmaLeft > 0 ? 'reborn' : 'heaven';

  return {
    key: subjectKey(subject), mode, id: soul.id, name: soul.name || soul.who, who: soul.who, sex: soul.sex || 'm', sp: soul.sp,
    soul, entry, pure: !!soul.pure, face: faceOf(soul, deeds), deeds, merits, said, order, ked, remorse, karma, banner, action, closing,
    noDeeds: !deeds.length,
  };
}

/** ดวงถัดไปในห้องที่ "ต้องทำอะไรต่อ" (ปุ่มหลักกดได้) — ใช้เปิดอัตโนมัติหลังกดปุ่มหลัก (§2.6) */
export function nextTodo(g, roomK, exceptKey, escorting = () => false) {
  for (const s of diagnosisSubjects(g, roomK)) {
    if (subjectKey(s) === exceptKey || escorting(s.soul.id)) continue;
    const m = diagnosisModel(g, s);
    if (m.action.kind !== 'none' && !m.action.disabled) return s;
  }
  return null;
}
