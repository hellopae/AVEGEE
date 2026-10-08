import { MERCHANT } from './data.js';
export const WEST_RESCUE = { x:380, y:460 };
export function westRescuePending(g) {
  return g.zone === 'west' && ['pending','active'].includes(g.zoneEventStatus('westHypnotized'));
}
export function westRescueActors(g) {
  if (!westRescuePending(g)) return [];
  return [
    { id:'rescue:taan', art:'crew-taan', x:310, y:460 },
    { id:'rescue:merchant', art:MERCHANT.img, x:230, y:500 },
    { id:'rescue:skeleton:1', art:'mob-skeleton', x:375, y:380 },
    { id:'rescue:skeleton:2', art:'mob-skeleton', x:460, y:450 },
    { id:'rescue:werewolf', art:'mob-werewolf', x:440, y:555 },
  ];
}
export function westSpiritsFrozen(g) {
  return g.zone === 'west' && ['pending','active'].includes(g.zoneEventStatus('westVampireBreach'));
}
export const WEST_DEVA_RUN_MS = 2600;
export const WEST_DEVA_EXIT_MS = 1800;
export function westDevaPosition(visit) {
  const p = Math.min(1, (visit.elapsed || 0) / (visit.arrived ? WEST_DEVA_EXIT_MS : WEST_DEVA_RUN_MS));
  return visit.arrived ? { x:870 + (1160-870)*p, y:480 + (400-480)*p }
    : { x:870, y:850 + (480-850)*p };
}
