import { t } from './i18n.js';
import { ZONE_EVENTS, MOB, CHALLENGE_STAND, BOSS_NAMES } from './data.js';
// Display actors only: the existing event remains responsible for combat stats/rewards.
export function breachApproachActors(zone, key) {
  if (!['frontierBreach','asiaRageBreach','westVampireBreach','cyberBreach','cyberSignal','signalTh','signalAsia','signalWest'].includes(key)) return [];
  const ev = ZONE_EVENTS[zone]?.find(ev => ev.k === key);
  const boss = ev?.waves.flat().find(foe => foe.boss);
  if (!boss) return [];
  // artUrl() appends the zone suffix itself, so non-th keys must not carry it (else 404 -> emoji fallback)
  const mob = ev.waves[0][0];
  const addArt = mob.sp || MOB.kinds[mob.kind].img;
  return [
    { id:'breach:boss', ...CHALLENGE_STAND[zone], art:boss.sp.replace(/-(asia|west|cyberhell)$/, ''), name:BOSS_NAMES[zone].frontier, boss:true, hypno:!!ev.signal, arrived:true },
    { id:'breach:add:1', x:.72, y:.53, art:addArt, name:t('event.frontierBreach.marker'), arrived:true, sway:{ ax:.022, ay:.004, period:6200, phase:0 } },
    { id:'breach:add:2', x:.63, y:.70, art:ev.waves[0][1]?.sp || addArt, name:t('event.frontierBreach.marker'), arrived:true, sway:{ ax:.026, ay:.004, period:7400, phase:2.1 } },
  ];
}

/** FB3-T5 (owner EV17): the border-boss event looked like three figures standing still. This is the rest of the army - DISPLAY ONLY, never a fight target and not counted
 *  in the "enemies n/3" line (the fight is still the boss's waves; combat, rewards and balance are untouched). Up to three figures on each side of the middle lane, every one
 *  walking a short beat to and fro. Points are [x, y, beat, period ms, phase] in picture units (0-1) like CHALLENGE_STAND. Each side lists its first choices and spares; the first
 *  three that fall on floor the zone's picture lets Yama walk on (and keep their distance from each other and from the old figures) are used.
 *  The middle lane (x .40-.60) stays open for Yama, the gate and the exit. */
export const BREACH_CROWD_POINTS = {
  left:[[.21,.43,.026,6800,.4], [.29,.56,.022,5900,1.7], [.17,.62,.020,7600,3.0], [.23,.52,.020,6300,4.4], [.30,.41,.022,7000,2.6], [.26,.66,.020,6600,5.0]],
  right:[[.80,.43,.026,6400,2.2], [.74,.37,.020,7200,4.1], [.83,.62,.022,5600,5.3], [.80,.52,.024,6100,0.9], [.84,.56,.020,6900,3.6], [.78,.60,.020,7300,1.3], [.86,.50,.020,6000,5.8], [.70,.46,.020,6500,0.2], [.82,.47,.020,7100,4.8]],
};
const CROWD_APART = [.06, .05];   // [x, y] distance kept between two figures
export function breachCrowdActors(zone, key, walkable = () => true) {
  const old = breachApproachActors(zone, key);
  if (!old.length) return [];
  const ev = ZONE_EVENTS[zone]?.find(ev => ev.k === key);
  const arts = [...new Set(ev.waves.flat().filter(f => !f.boss && (f.sp || f.kind != null)).map(f => f.sp || MOB.kinds[f.kind]?.img).filter(Boolean))];
  if (!arts.length) return [];
  const placed = old.map(a => [a.x, a.y]), out = [];
  for (const side of ['left', 'right']) {
    let n = 0;
    for (const [x, y, ax, period, phase] of BREACH_CROWD_POINTS[side]) {
      if (n >= 3) break;
      if (!walkable(x, y) || placed.some(([px, py]) => Math.abs(px - x) < CROWD_APART[0] && Math.abs(py - y) < CROWD_APART[1])) continue;
      placed.push([x, y]); n++;
      out.push({ id:`breach:crowd:${out.length}`, x, y, art:arts[out.length % arts.length], name:t('event.frontierBreach.marker'), arrived:true, crowd:true, sway:{ ax, ay:.004, period, phase } });
    }
  }
  return out;
}

/** Where a swaying figure is at time t (ms): a slow back-and-forth along x with a small wobble in y.
 *  `moving` is true while it is really going somewhere (the walk bob), false for the beat at either end (it stands and breathes). face = +1 right / -1 left. Reduced motion: it stands still. */
export function swayPose(en, t, reduced = false) {
  const s = en.sway;
  if (!s || reduced) return { x:en.x, y:en.y, face:null, moving:false };
  const w = t / s.period * Math.PI * 2 + s.phase, c = Math.cos(w);
  return { x:en.x + Math.sin(w) * s.ax, y:en.y + Math.sin(w * .5) * s.ay, face:c >= 0 ? 1 : -1, moving:Math.abs(c) > .3 };
}
