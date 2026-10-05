import { actorStanding } from './actor-recovery.js';
import { finalEventActors } from './final-event.js';
// npc-stand.js — ตัวละครบนแผนที่ที่ยมบาทเดินทับไม่ได้ (30D)
// ยมบาทเดินทับตัวเขาไม่ได้ (src/walk.js วงรอบตัว) · พิกัดตรงกับที่ scene.js วาด จึงอยู่ที่เดียวไม่ให้คลาดกัน
import { SPOTS, MOB, MERCHANT, ZONE_EVENTS } from './data.js';

/** อีเวนต์ที่รออยู่ที่ท่าเรือ (ผู้ท้าทายยืนรอให้ยมบาทเดินไปหา) — scene.js วาด, game.js กันทาง */
export const waitingEvents = g => {
  const events = (ZONE_EVENTS[g.zone] || []).filter(ev =>
    ev.k !== 'devaTest' && g.zoneEventStatus(ev.k) === 'pending' && g.eventMapClosed?.[`${g.zone}:${ev.k}`] &&
    ev.mode !== 'waves' && !/prison/i.test(ev.k) && ev.k !== 'frontierBreach');
  if (g.zone === 'th' && g.devaTestStatus() === 'pending' && g.eventMapClosed?.['th:devaTest'])
    events.unshift({ k:'devaTest', foe:{ sp:'boss-tester-th' } });
  return events.map((ev, i) => ({ key:ev.k, x:SPOTS.bossPier.x + (i % 3 - 1) * 86,
    y:SPOTS.bossPier.y - Math.floor(i / 3) * 80,
    art:ev.foe?.kind != null ? MOB.kinds[ev.foe.kind]?.img : (ev.foe?.sp || ev.foes?.[0]?.sp || 'spirit7').replace(/-(asia|west|cyberhell)$/, '') }));
};

/** จุดเท้าของทุกตัวที่ยืนนิ่งอยู่ตอนนี้ [[x,y],...] — ยมทูตที่อยู่บนแผนที่ (ไม่ได้ถูกพาไปกับวิญญาณ — เดินอยู่ก็นับ ไม่งั้นไปหยุดทับตัวยมบาทตอนถึงจุดประจำ) · พ่อค้า · ยักษ์ · บอสที่ท่าเรือ · ผู้ท้าทายที่รอ */
export function standPoints(g) {
  const pts = [];
  for (const c of g.crew || []) {
    if (!actorStanding(c)) continue;
    if (c.x == null || c.escort) continue;
    pts.push([c.x, c.y]);
  }
  if (g.zoneCaptivesFree()) pts.push([MERCHANT.x, MERCHANT.y]);
  else pts.push([966, 350], [1038, 350]);        // ทัณฑ์กับพ่อค้าที่ถูกขังหน้าตะราง (โซน 4)
  if (actorStanding(g.guard)) pts.push([g.guard.x, g.guard.y]);
  if (!g.bossWalk && (g.bossGuarding?.[g.zone] || g.bossCleared?.[g.zone])) pts.push([SPOTS.bossPier.x, SPOTS.bossPier.y]);
  for (const ev of waitingEvents(g)) pts.push([ev.x, ev.y]);
  for (const a of finalEventActors(g)) pts.push([a.x,a.y]);
  return pts;
}
