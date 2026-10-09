import { westRescuePending, WEST_RESCUE } from './west-events.js';
import { t } from './i18n.js';
import { devaMapActors } from './deva-map.js';
import { finalEventActors, finalRestSpot } from './final-event.js';
import { topOf, bodyBoxOf } from './art.js';
// 29B: map distances are scene pixels; room distances are normalized image coordinates.
export const INTERACTION_REACH = 100;
export const ROOM_EXIT_REACH = 0.10;
// Configure a scene here, e.g. ngiw: { asia: { x: .28, y: .93 } }.
// Every existing scene defaults to its own bottom entrance (room.me), including ui4.
export const ROOM_EXITS = {
  // 29G: บันไดทางเข้าด้านล่างของภาพบูรพาใหม่ (ใช้ระยะเอื้อมออกเดิม)
  sala: { asia: { x:.50, y:.94 } },
  krata: { asia: { x:.50, y:.94 } },
  dab: { asia: { x:.50, y:.94 } },
  lan: { asia: { x:.50, y:.94 } },
  sawan: { asia: { x:.50, y:.94 } },
  krajok: { asia: { x:.50, y:.94 } },
  // 30E: smaller reach so the yama's start spot below the nameplate row is not already "at the exit"
  tarang: { asia: { x:.50, y:.99, reach:.07 }, west: { x:.50, y:.97, reach:.07 }, cyberhell: { x:.50, y:.97, reach:.07 } },

  // 29M: ทางออก = บันไดในภาพใหม่ของ 29D (พิกัดหลัง crop ของแบบ UI4 สำหรับโซนไทย)
  tea:   Object.fromEntries(['th','asia','west','cyberhell'].map(z => [z,{x:.50,y:.91,reach:.09}])),
  ngiw:  { th:   { x:.50, y:.916, reach:.08 }, asia: { x:.50, y:.94 } },
  lokan: { asia: { x:.50, y:.916, reach:.08 } },
};
export function roomExit(key, zone, room) {
  return room.exit || ROOM_EXITS[key]?.[zone] || { x: room.me[0], y: room.me[1] };
}
export function nearRoomExit([x, y], exit) {
  return Math.hypot(x - exit.x, y - exit.y) <= (exit.reach ?? ROOM_EXIT_REACH);
}
export function nearestInteraction(player, targets, reach = INTERACTION_REACH) {
  let nearest = null, distance = Infinity;
  for (const target of targets) {
    const d = Math.hypot(player.x - target.x, player.y - target.y);
    if (d <= reach && d < distance) { nearest = target; distance = d; }
  }
  return nearest;
}
/** ปุ่มลอยของอาคารวางกึ่งกลางที่ระดับนี้ของความสูงตัวอาคาร (0 = ยอดสุด · 1 = ฐาน) — F2 ข้อ 8 (คุณเป้ 9 ต.ค. 2569)
 *  30D เคยวางขอบล่างปุ่มชิดยอดอาคาร → ปุ่มลอยเหนือยอดแหลมสูงเกินไป คุณเป้ให้เลื่อนลงมาอยู่บนหลังคา (วงที่วาดไว้ในภาพ 9) */
export const BUTTON_ROOF_DROP = 0.27;
/** 30D — ตำแหน่งปุ่มลอยของอาคาร: วัดยอดเนื้อภาพจากพิกเซลสไปรท์จริง (art.topOf) แล้วเลื่อนลงมาบนหลังคา · x = กึ่งกลางตัวอาคาร (กรอบเนื้อภาพ)
 *  เดิม by = def.by - def.bw - 24 ใช้ "ความกว้างอ้างอิง" bw เป็นความสูง — อาคารเตี้ย (กระท่อมไม้โซน 3) ปุ่มเลยลอยเหนือหลังคาเป็นร้อยพิกเซล
 *  anchor 'roof' = ตำแหน่งนี้คือกึ่งกลางปุ่ม (ui.js ไม่ใส่ class anchor-top) · รูปยังโหลดไม่เสร็จ → ใช้สูตรเดิมไปก่อน (anchor 'center') รอบหน้าค่อยวัดใหม่ */
export function stationButtonPos(def, top = topOf(def), body = bodyBoxOf(def)) {
  if (top == null) return { bx: def.bx, by: def.by - def.bw - 24, anchor: 'center' };
  const height = body ? Math.max(0, body[3] - body[1]) : 0;
  return { bx: body ? (body[0] + body[2]) / 2 : def.bx, by: top + height * BUTTON_ROOF_DROP, anchor: 'roof' };
}

export function mapInteractions(g, merchant) {
  if (westRescuePending(g)) return [{ id:'west-rescue', kind:'zoneEvent', key:'westHypnotized', ...WEST_RESCUE,
    bx:WEST_RESCUE.x, by:WEST_RESCUE.y-100, label:t('west.rescue.approach') }];
  const targets = [];
  for (const a of devaMapActors(g)) if (a.enabled) targets.push({ ...a, kind:'devaEncounter', bx:a.x, by:a.y-110 });
  for (const a of finalEventActors(g)) if (a.enabled) targets.push({ id:a.id,key:a.id,kind:'finalEncounter',x:a.x,y:a.y,bx:a.x,by:a.y-85,label:'เริ่มศึก' });
  const rest = finalRestSpot(g);
  if (rest) targets.push({ id:'final-rest', kind:'finalRest', ...rest,bx:rest.x,by:rest.y-80,label:'นอนพักในค่าย' });
  const nira = g.crewOf('nira');
  if (nira && nira.x != null) targets.push({ id:'nira', kind:'nira', x:nira.x, y:nira.y,
    bx:nira.x, by:nira.y - 96, label:'จัดทีมยมทูต' });
  if (g.zoneCaptivesFree()) targets.push({ id:'merchant', kind:'merchant', x:merchant.x, y:merchant.y,
    bx:merchant.x, by:merchant.y - 96, label:'ซื้อขาย' });
  for (const st of g.stations) {
    if (st.build) continue;
    const def = st.def;
    const repair = st.fire > 0 && !st.repair;
    const pos = stationButtonPos(def);
    targets.push({ id:def.k, key:def.k, kind:repair ? 'repair' : 'station',
      x:def.x, y:def.y, bx:pos.bx, by:pos.by, anchor:pos.anchor,
      label:repair ? `เรียก${g.availableBuilder()?.name || 'ทัณฑ์'}มาซ่อม` : 'เข้าไป' });
  }
  return targets;
}
