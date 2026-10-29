// One occupied cushion per person; the two-minute rest starts on arrival, not on request.
export const STAFF_TEA_REST_MS = 120000;
export const TEA_SEAT_COUNT = 15;
export const teaSeatPoint = seat => [.36 + (seat % 6) * .09, .57 + Math.floor(seat / 6) * .11];
export const TEA_ENTRY = [.50,.86];
const ROOM_SPEED = .00012;
const seatWalkMs = seat => (Math.abs(teaSeatPoint(seat)[0]-TEA_ENTRY[0])+Math.abs(teaSeatPoint(seat)[1]-TEA_ENTRY[1]))/ROOM_SPEED;
/** Walk along the front aisle, then approach the reserved seat. */
export function teaEntryPose(rest, now) {
  const end=teaSeatPoint(rest.seat??0),elapsed=Math.max(0,now-rest.enteredAt);
  if(elapsed>=rest.entryMs-1e-8)return {point:end,face:end[0]<TEA_ENTRY[0]?-1:1,distance:rest.entryMs*ROOM_SPEED};
  const distance=elapsed*ROOM_SPEED;
  const across=Math.abs(end[0]-TEA_ENTRY[0]);
  const point=distance<across?[TEA_ENTRY[0]+Math.sign(end[0]-TEA_ENTRY[0])*distance,TEA_ENTRY[1]]
    :[end[0],TEA_ENTRY[1]-Math.min(distance-across,TEA_ENTRY[1]-end[1])];
  return {point,face:end[0]<TEA_ENTRY[0]?-1:1,distance:elapsed*ROOM_SPEED};
}
export const teaStaff = g => [...Object.values(g.roster || {}), ...(g.workerState?.workers || [])];
export function reserveTeaSeat(g, zone, except) {
  const occupied = new Set(teaStaff(g).filter(c => c !== except && c.teaRest?.zone === zone).map(c => c.teaRest.seat));
  for (let i=0;i<TEA_SEAT_COUNT;i++) if (!occupied.has(i)) return i;
  return null;
}
export function startTeaRest(g, c, zone, dest, path, now) {
  const seat=reserveTeaSeat(g,zone,c); if(seat==null)return null;
  return {phase:'travel',zone,seat,dest,path:path||[],movedAt:now,returnAt:[c.x,c.y],speed:c.id.startsWith('worker:')?.11:.075};
}
export function advanceTeaRest(g,c,now) {
  const rest=c.teaRest;if(!rest||typeof rest!=='object')return false;
  let changed=false;
  if(!Number.isInteger(rest.seat)||rest.seat<0||rest.seat>=TEA_SEAT_COUNT){rest.seat=reserveTeaSeat(g,rest.zone,c);changed=true;}
  // Recompute from the original arrival: saves made under the one-minute rule keep elapsed time.
  if(rest.phase==='rest')rest.until=rest.startedAt+STAFF_TEA_REST_MS;
  if(rest.phase==='travel'){
    const speed=rest.speed||.075;let distance=Math.max(0,now-rest.movedAt)*speed;rest.movedAt=now;
    while(rest.path.length){
      const [x,y]=rest.path[0],d=Math.hypot(x-c.x,y-c.y);
      if(d>distance+1e-8){c.x+=(x-c.x)*distance/d;c.y+=(y-c.y)*distance/d;break;}
      c.x=x;c.y=y;distance=Math.max(0,distance-d);rest.path.shift();
    }
    if(!rest.path.length){rest.phase='enter';rest.enteredAt=now-distance/speed;rest.entryMs=seatWalkMs(rest.seat);changed=true;}
  }
  if(rest.phase==='enter'&&now>=rest.enteredAt+rest.entryMs){
    rest.phase='rest';rest.startedAt=rest.enteredAt+rest.entryMs;rest.until=rest.startedAt+STAFF_TEA_REST_MS;changed=true;
  }
  if(rest.phase==='rest'&&now>=rest.until){
    c.morale=100;c.hunger=100;[c.x,c.y]=rest.returnAt;c.path=null;c.target=null;c.teaRest=null;
    if(c.id.startsWith('worker:')){c.stamina=100;c.supplyRest=false;c.recovering=false;c.resting=false;c.sitting=false;c.mode=c.resumeMode||'auto';c.reason='';}
    return true;
  }
  return changed;
}
export function teaRoomStaff(g){
  return teaStaff(g).filter(c=>c.teaRest?.zone===g.zone&&c.teaRest.phase==='rest').map(c=>({actor:c,seat:c.teaRest.seat,point:teaSeatPoint(c.teaRest.seat??0)}));
}
export function teaRoomArrivals(g,now=Date.now()){
  return teaStaff(g).filter(c=>c.teaRest?.zone===g.zone&&c.teaRest.phase==='enter')
    .map(c=>({actor:c,...teaEntryPose(c.teaRest,now)}));
}
export function teaRestSprite(c,zone){
  if (!c.id.startsWith('worker:') && c.k === 'boon' && (c.homeZone === 'global' ? zone : c.homeZone) === 'west') return 'img/tea-rest/crew-boon-west-sit-v1-f.webp';
  return c.id.startsWith('worker:')?`img/workers/worker-${c.homeZone}-rest-v1.webp`:`img/tea-rest/crew-${c.k}-${c.homeZone==='global'?zone:c.homeZone}-sit-v1.webp`;
}
