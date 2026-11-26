import { westRescuePending, westRescueActors } from './west-events.js';
import { actorStanding } from './actor-recovery.js';
import { devaMapActors, DEVA_MAP } from './deva-map.js';
import { finalEventActors } from './final-event.js';
// npc-stand.js — ตัวละครบนแผนที่ที่ยมบาทเดินทับไม่ได้ (30D)
// ยมบาทเดินทับตัวเขาไม่ได้ (src/walk.js วงรอบตัว) · พิกัดตรงกับที่ scene.js วาด จึงอยู่ที่เดียวไม่ให้คลาดกัน
import { SPOTS, MOB, MERCHANT, ZONE_EVENTS } from './data.js';
import { TOWN_SPOTS } from './town-layout.js';
import { bossGuideDismissed, bossPierRetired, bossGuideWaiting } from './boss-guides.js';
import { Z2_ART_KEY } from './z2-events.js';

/** FB3-T5 (owner EV11 / EV20): in Zone 1 the challengers who come to the judgement dais (Hanuman - Sita's scene is on the open-air dais, owner confirmed 26 Nov round 2 -, Khun Phaen, the elder brother)
 *  wait ON the dais floor, left of the throne (Nira stands on the right). Every other waiting challenger still waits at the pier.
 *  The three events come one after the other (data.js `requires`: Khun Phaen needs Hanuman cleared, the elder brother needs both), so they never stand on the spot together. */
export const DAIS_FOES = Object.freeze(['sitaHanuman', 'khunPhaen', 'thBorderBoss']);
export const daisFoeSpot = (spots = SPOTS) => {
  const p = spots.daisFoe || TOWN_SPOTS.daisFoe;
  return { x:p.x, y:p.y };
};
const onDais = (g, key) => g.zone === 'th' && DAIS_FOES.includes(key);

/** อีเวนต์ที่รออยู่ที่ท่าเรือ (ผู้ท้าทายยืนรอให้ยมบาทเดินไปหา) — scene.js วาด, game.js กันทาง
 *  หนุมาน / ขุนแผน / พี่ใหญ่ (โซน 1) รอบนแท่นตัดสิน นอกนั้นรอที่ท่าเรือ */
export const waitingEvents = g => {
  const events = (ZONE_EVENTS[g.zone] || []).filter(ev =>
    ev.k !== 'westHypnotized' && ev.k !== 'devaTest' && ev.k !== DEVA_MAP[g.zone]?.key && g.zoneEventStatus(ev.k) === 'pending' && g.eventMapClosed?.[`${g.zone}:${ev.k}`] &&
    ev.mode !== 'waves' && !/prison/i.test(ev.k) && ev.k !== 'frontierBreach' && !ev.guardTest && !ev.gate);
  if (g.zone === 'th' && g.devaTestStatus() === 'pending' && g.eventMapClosed?.['th:devaTest'])
    events.unshift({ k:'devaTest', foe:{ sp:'boss-tester-th' } });
  const dais = events.filter(ev => onDais(g, ev.k)), pier = events.filter(ev => !onDais(g, ev.k));
  const spot = (ev, i) => onDais(g, ev.k)
    ? { x:daisFoeSpot().x + i * 64, y:daisFoeSpot().y }           // two at once cannot happen (each of the three needs the one before cleared) - the offset only keeps them apart
    : { x:SPOTS.bossPier.x + (i % 3 - 1) * 86, y:SPOTS.bossPier.y - Math.floor(i / 3) * 80 };
  return events.map(ev => ({ key:ev.k, ...spot(ev, (onDais(g, ev.k) ? dais : pier).indexOf(ev)),
    art:ev.foe?.kind != null ? MOB.kinds[ev.foe.kind]?.img : (sp => Z2_ART_KEY.test(sp) ? sp : sp.replace(/-(asia|west|cyberhell)$/, ''))(ev.foe?.sp || ev.foes?.[0]?.sp || 'spirit7') }));
};

/** จุดเท้าของทุกตัวที่ยืนนิ่งอยู่ตอนนี้ [[x,y],...] — ยมทูตที่อยู่บนแผนที่ (ไม่ได้ถูกพาไปกับวิญญาณ — เดินอยู่ก็นับ ไม่งั้นไปหยุดทับตัวยมบาทตอนถึงจุดประจำ) · พ่อค้า · ยักษ์ · บอสที่ท่าเรือ · ผู้ท้าทายที่รอ */
export function standPoints(g) {
  if (westRescuePending(g)) return westRescueActors(g).map(a => [a.x,a.y]);
  const pts = [];
  for (const c of g.crew || []) {
    if (!actorStanding(c)) continue;
    if (c.x == null || c.escort) continue;
    pts.push([c.x, c.y]);
  }
  if (g.zoneCaptivesFree()) pts.push([MERCHANT.x, MERCHANT.y]);
  else pts.push([966, 350], [1038, 350]);        // ทัณฑ์กับพ่อค้าที่ถูกขังหน้าตะราง (โซน 4)
  if (actorStanding(g.guard)) pts.push([g.guard.x, g.guard.y]);
  if (!g.bossWalk && !bossGuideDismissed(g) && !bossPierRetired(g) && (g.bossGuarding?.[g.zone] || g.bossCleared?.[g.zone] && (g.zone !== 'th' || bossGuideWaiting(g)))) pts.push([SPOTS.bossPier.x, SPOTS.bossPier.y]);
  for (const ev of waitingEvents(g)) pts.push([ev.x, ev.y]);
  for (const a of devaMapActors(g)) if (a.enabled) pts.push([a.x,a.y]);
  for (const a of finalEventActors(g)) pts.push([a.x,a.y]);
  return pts;
}
