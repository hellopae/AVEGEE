// One occupied cushion per person; the minute starts on arrival, not on request.
export const STAFF_TEA_REST_MS = 60000;
export const TEA_SEAT_COUNT = 15;
export const teaSeatPoint = seat => [.36 + (seat % 6) * .09, .61 + Math.floor(seat / 6) * .105];
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
  // Existing saves used 120 seconds for Guard. Preserve elapsed time under the new minute rule.
  if(rest.phase==='rest')rest.until=rest.startedAt+STAFF_TEA_REST_MS;
  if(rest.phase==='travel'){
    const speed=rest.speed||.075;let distance=Math.max(0,now-rest.movedAt)*speed;rest.movedAt=now;
    while(rest.path.length){
      const [x,y]=rest.path[0],d=Math.hypot(x-c.x,y-c.y);
      if(d>distance){c.x+=(x-c.x)*distance/d;c.y+=(y-c.y)*distance/d;break;}
      c.x=x;c.y=y;distance-=d;rest.path.shift();
    }
    if(!rest.path.length){rest.phase='rest';rest.startedAt=now-distance/speed;rest.until=rest.startedAt+STAFF_TEA_REST_MS;changed=true;}
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
export function teaRestSprite(c,zone){
  return c.id.startsWith('worker:')?`img/workers/worker-${c.homeZone}-rest-v1.webp`:`img/tea-rest/crew-${c.k}-${c.homeZone==='global'?zone:c.homeZone}-sit-v1.webp`;
}
