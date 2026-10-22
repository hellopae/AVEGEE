// talk.js — กดคุยตัวละครบนแผนที่ (P4 §4) · ตรรกะล้วน ไม่แตะ DOM — ui.js เป็นคนวางบับเบิล/ปุ่ม
// หลักการ (คุณเป้ D8): คุยเป็นบรรยากาศล้วน — ไม่ให้ทรัพยากร ไม่ให้เบาะแส ไม่เปลี่ยนผลตัดสิน
//   ฟังก์ชันในไฟล์นี้ "อ่าน" สถานะของเกมอย่างเดียว · ที่เดียวที่เขียนคือ g.talk.seen (ธงว่าเคยคุยครั้งแรกแล้ว) กับ g.talk.recent (กันบทซ้ำ ไม่เซฟ)
import { TALK_LINES } from './talk-lines.js';
import { voice, QUEUE_LINE, BAL, INTENSITY_NAME } from './data.js';
import { actorStanding } from './actor-recovery.js';
import { zoneWorkers } from './workers.js';

export const TALK_REACH = 70;          // ระยะที่ปุ่ม 💬 / ปุ่ม E โผล่ (เล็กกว่า INTERACTION_REACH เพื่อให้สถานี/นิรา/พ่อค้าชนะเสมอ)
export const TALK_DISMISS = 140;       // เดินห่างเกินนี้บับเบิลหาย
export const TALK_MS = 6000;           // บับเบิลหายเองใน 6 วินาที
export const TALK_MAX_LINES = 3;       // กด "ถัดไป" ได้อีก 2 ครั้ง (รวม 3 บท) แล้วปิด
const RECENT_CAP = 30;

/** ตัวละครที่ "คุยได้" บนแผนที่ — เปรต/ผี/บอส/เทวดา/ผู้ตรวจการไม่รวม (มีฉากของตัวเองอยู่แล้ว) · วิญญาณที่ไต่สวนอยู่ (หัวคิว) ไม่รวม
 *  @param {object} helpers  { walkPosition(walk) → [x,y] } ฉีดมาจาก ui.js (scene.js ลาก canvas เข้ามาในเทสต์ไม่ได้) */
export function talkTargets(g, helpers = {}) {
  const out = [];
  for (const c of g.crew || [])
    if (c.k !== 'nira' && actorStanding(c) && c.x != null) out.push({ id: `crew:${c.k}`, kind: 'crew', key: c.k, x: c.x, y: c.y, top: 1, name: c.name });
  const gd = g.guard;
  if (gd && actorStanding(gd) && gd.x != null) out.push({ id: 'guard:0', kind: 'guard', key: 0, x: gd.x, y: gd.y, top: 1.15, name: gd.name });
  for (const w of zoneWorkers(g))
    if (Number.isFinite(w.x)) out.push({ id: `worker:${w.id}`, kind: 'worker', key: w.id, x: w.x, y: w.y, top: .8, name: w.name });
  (g.queue || []).forEach((s, i) => {
    const p = QUEUE_LINE[i];
    if (i >= 1 && p) out.push({ id: `soul:${s.id}`, kind: 'soul', key: s.id, x: p[0], y: p[1], top: .85, name: s.name || s.who, mode: 'queue', rank: i + 1 });
  });
  for (const walk of g.afterlifeWalks || []) {
    if (walk.zone !== g.zone || walk.destination === 'exit' || !helpers.walkPosition) continue;
    const [x, y] = helpers.walkPosition(walk);
    out.push({ id: `soul:${walk.soul.id}`, kind: 'soul', key: walk.soul.id, x, y, top: .85, name: walk.soul.name || walk.soul.who, mode: 'walk', walk });
  }
  return out;
}
export const findTalkTarget = (g, id, helpers) => talkTargets(g, helpers).find(t => t.id === id) || null;
export const talkDistance = (g, t) => Math.hypot(g.player.x - t.x, g.player.y - t.y);

// ---------------------------------------------------------------- เลือกบท
const CLAMP = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
function memo(g) { return (g.talk ||= { seen: {} }); }
const recentOf = (g, id) => {
  const m = memo(g); m.recent ||= new Map();              // Map ไม่ลงเซฟ (snapshot เก็บเฉพาะ seen)
  if (!m.recent.has(id)) { m.recent.set(id, []); if (m.recent.size > 60) m.recent.delete(m.recent.keys().next().value); }
  return m.recent.get(id);
};
function pickFresh(list, recent, rng) {
  if (!list?.length) return null;
  const fresh = list.filter(t => !recent.includes(t));
  const pool = fresh.length ? fresh : list;
  const chosen = pool[Math.floor(rng() * pool.length)];
  recent.push(chosen); if (recent.length > RECENT_CAP) recent.shift();
  return chosen;
}
/** เติมตัวแปรของ Rae (§4.4) แล้วผ่าน voice() เติมสรรพนามวิญญาณ/คนงาน — ตัวแปรที่ไม่รู้จักถูกตัดทิ้ง ไม่โผล่ "{…}" บนจอ */
export function fillTalk(text, vars, sex = 'm') {
  const filled = String(text).replace(/\{(name|me|title|zone|soul|station|sentence|sentenceN|progress|queueRank|queueLen|wait|back|hunger|morale|food)\}/g,
    (_, k) => vars[k] ?? '');
  return voice(filled, sex).replace(/\{[a-zA-Z]+\}/g, '');
}

const stationOfCrew = (g, c) => c.at ? g.stations.find(s => s.def.k === c.at) : null;

/** สถานะของยมทูต → ชื่อชุดบท (ลำดับ: ครั้งแรก · หิว · ล้า · นำส่ง · สร้าง/ซ่อม · คุมวิญญาณ · ว่าง) */
export function crewTalkState(g, c) {
  if (!memo(g).seen[`crew:${c.k}`]) return 'first';
  if ((c.hunger ?? 100) < 25) return 'hungry';
  if ((c.morale ?? 100) < 35) return 'tired';
  if (c.escort) return 'escort';
  if (c.buildK) return 'build';
  const st = stationOfCrew(g, c);
  if (st?.slots?.length) return 'supervise';
  return 'idle';
}
const workerTalkGroup = (g, w) => {
  if (w.recovering || w.stamina <= 0) return 'exhausted';
  if (w.mode === 'rest') return 'rest';
  if (w.reason === 'รอค่าจ้าง') return 'waitingWage';
  if (w.reason === 'รอเสบียง') return 'waitingFood';
  const k = w.job?.kind;
  if (k === 'gather') return 'gather';
  if (k === 'supervise') return 'supervise';
  if (k === 'build' || k === 'repair') return 'buildRepair';
  if (k === 'escort') return 'escort';
  return 'rest';
};
const walkTalkGroup = walk => walk.destination === 'prison' ? 'toTarang' : walk.destination === 'gate' ? 'toGate'
  : walk.destination === 'queue' ? 'returnQueue' : walk.destination === 'station' ? 'toStation' : 'disembark';
const isMonk = soul => soul?.sex === 'monk';
/** วิญญาณพระ (N7): ข้ามบทที่ฟังเหมือนไม่ยอมรับผิด/ถูกส่งกลับ */
const MONK_SKIP = new Set(['queueSoul.returned', 'walkingSoul.returnQueue', 'diagnosisClosing.notKed']);

/**
 * เลือก 1 บทให้ตัวละครนี้ ตามสถานะจริงตอนนี้
 * @returns {{who:string,text:string,group:string,first:boolean}|null}
 */
export function pickTalk(g, target, { rng = Math.random, heroName = 'ยามา', heroTitle = 'ยมบาทน้อย', merchant = null } = {}) {
  const L = TALK_LINES, vars = { me: heroName, title: heroTitle, zone: g.zoneDef?.().name || '', hunger: '', morale: '', food: Math.round(g.food ?? 0) };
  let group = null, list = null, who = target.name || '', sex = 'm', first = false, id = target.id;

  if (target.kind === 'crew') {
    const c = g.crewOf(target.key); if (!c) return null;
    const state = crewTalkState(g, c);
    const own = L.crew[c.k]; if (!own) return null;
    list = own[state]?.length ? own[state] : own.idle; group = `crew.${c.k}.${state}`;
    first = state === 'first'; who = c.name; vars.name = c.name; vars.morale = Math.round(c.morale ?? 0); vars.hunger = Math.round(c.hunger ?? 0);   // N8
    const st = stationOfCrew(g, c), slot = st?.slots?.[0];
    if (slot) Object.assign(vars, { soul: slot.soul.name || slot.soul.who, station: st.def.name, sentence: INTENSITY_NAME[slot.intensity] || '',
      sentenceN: slot.intensity, progress: Math.round(100 * (slot.progress || 0) / (slot.need || 1)) });
  } else if (target.kind === 'guard') {
    const gd = g.guard; if (!gd) return null;
    const hungryTired = (gd.hunger ?? 100) < 25 || (gd.morale ?? 100) < 35;      // N6: ยักษ์มีทั้งหิวและกำลังใจจริง (roster actor)
    const state = hungryTired ? 'hungryTired' : (g.mobs?.length && g.guardActive?.()) ? 'chase' : g.mobs?.length ? 'idle' : Math.random() < .5 ? 'noGhost' : 'idle';
    list = L.guard[state]; group = `guard.${state}`; who = gd.name; vars.name = gd.name; vars.morale = Math.round(gd.morale ?? 0);
  } else if (target.kind === 'worker') {
    const w = zoneWorkers(g).find(x => x.id === target.key); if (!w) return null;
    let key = workerTalkGroup(g, w);
    if (key !== 'exhausted' && rng() < .2 && L.worker.zone[g.zone]) { list = L.worker.zone[g.zone]; group = `worker.zone.${g.zone}`; }
    else if (key === 'gather') {                    // N2: เลือกตามวัสดุ/ช่วงขาย — [ไม้, เศษดาบ, พ่อค้า]
      const pool = L.worker.gather, i = w.job.phase === 'sell' ? 2 : w.job.material === 'dabShards' ? 1 : 0;
      list = [pool[i]]; group = `worker.gather.${i}`;
    } else { list = L.worker[key]; group = `worker.${key}`; }
    who = w.name; vars.name = w.name;
    const st = g.stations.find(s => s.def.k === w.job?.station); if (st) vars.station = st.def.name;
  } else if (target.kind === 'soul') {
    const soul = (g.queue || []).find(s => s.id === target.key) || target.walk?.soul;
    if (!soul) return null;
    sex = soul.sex || 'm'; who = soul.name || soul.who; vars.soul = who;
    if (target.mode === 'queue') {
      Object.assign(vars, { queueRank: target.rank, queueLen: g.queue.length, wait: soul.waited || 0, back: INTENSITY_NAME[soul.back?.gave] || '' });
      const key = soul.back && !isMonk(soul) ? 'returned' : g.queue.length > BAL.queueMax ? 'overflow' : (soul.waited || 0) > 40 ? 'waitLong' : 'waitShort';
      list = L.queueSoul[key]; group = `queueSoul.${key}`;
    } else {
      const key = walkTalkGroup(target.walk);
      if (isMonk(soul) && MONK_SKIP.has(`walkingSoul.${key}`)) { list = L.walkingSoul.toStation; group = 'walkingSoul.toStation'; }
      else { list = L.walkingSoul[key]; group = `walkingSoul.${key}`; }
      const info = target.walk.entry;
      if (key === 'toStation') Object.assign(vars, { station: info?.name || '', sentence: INTENSITY_NAME[info?.intensity] || '' });
      if (key === 'toStation' && !info?.name) { list = L.walkingSoul.disembark; group = 'walkingSoul.disembark'; }   // ไม่รู้ชื่อสถานี ไม่เดาเอา
    }
  } else if (target.kind === 'nira') {
    const orderTier = g.orderTier?.(), karmaTier = g.karmaTier?.();
    const len = g.queue?.length || 0;
    const key = len === 0 ? 'queueEmpty' : len > Math.floor(BAL.queueMax * .75) ? 'queueLong'
      : ['warn', 'bad'].includes(karmaTier?.tone) ? 'karmaHigh' : ['warn', 'bad'].includes(orderTier?.tone) ? 'orderLow' : null;
    if (!key) return null;
    list = L.nira[key]; group = `nira.${key}`; who = target.name || 'นิรา'; vars.queueLen = len;
  } else if (target.kind === 'merchant') {
    const m = merchant || {};
    const key = m.poor ? 'poor' : m.anyLocked && rng() < .35 ? 'locked' : rng() < .5 ? 'greet' : 'stock';
    list = L.merchant[key]; group = `merchant.${key}`; who = target.name || 'พ่อค้า';
  } else return null;

  if (!list?.length) return null;
  let pool = list;
  if (isMonk({ sex }) && MONK_SKIP.has(group)) pool = [];
  const text = first ? list[0] : pickFresh(pool, recentOf(g, id), rng);
  if (!text) return null;
  if (first) memo(g).seen[id] = true;               // บทครั้งแรก ใช้ครั้งเดียว (เซฟ)
  return { who, text: fillTalk(text, vars, sex), group, first };
}
