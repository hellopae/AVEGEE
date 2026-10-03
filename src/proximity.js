// 29B: map distances are scene pixels; room distances are normalized image coordinates.
export const INTERACTION_REACH = 100;
export const ROOM_EXIT_REACH = 0.10;
// Configure a scene here, e.g. ngiw: { asia: { x: .28, y: .93 } }.
// Every existing scene defaults to its own bottom entrance (room.me), including ui4.
export const ROOM_EXITS = {
  // 29M: ทางออก = บันไดในภาพใหม่ของ 29D (พิกัดหลัง crop ของแบบ UI4 สำหรับโซนไทย)
  tea:   { th:   { x:.83, y:.854, reach:.07 }, asia: { x:.50, y:.906, reach:.08 } },
  ngiw:  { th:   { x:.50, y:.916, reach:.08 } },
  lokan: { asia: { x:.50, y:.916, reach:.08 } },
};
export function roomExit(key, zone, room) {
  return ROOM_EXITS[key]?.[zone] || room.exit || { x: room.me[0], y: room.me[1] };
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
export function mapInteractions(g, merchant) {
  const targets = [];
  const nira = g.crewOf('nira');
  if (nira && nira.x != null) targets.push({ id:'nira', kind:'nira', x:nira.x, y:nira.y,
    bx:nira.x, by:nira.y - 96, label:'จัดทีมยมทูต' });
  if (g.zoneCaptivesFree()) targets.push({ id:'merchant', kind:'merchant', x:merchant.x, y:merchant.y,
    bx:merchant.x, by:merchant.y - 96, label:'ซื้อขาย' });
  for (const st of g.stations) {
    if (st.build) continue;
    const def = st.def;
    const repair = !['tarang', 'sawan'].includes(def.k) && st.fire > 0 && !st.repair;
    targets.push({ id:def.k, key:def.k, kind:repair ? 'repair' : 'station',
      x:def.x, y:def.y, bx:def.bx, by:def.by - def.bw - 24,
      label:repair ? `เรียก${g.availableBuilder()?.name || 'ทัณฑ์'}มาซ่อม` : 'เข้าไป' });
  }
  return targets;
}
