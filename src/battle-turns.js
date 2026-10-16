// Deterministic round queue shared by the combat rules and visible timeline.
const ALLY_SPEED = {yama:12,nira:10,kan:11,dam:10,boon:8,plerng:8,taan:7,guard:6};
export function combatUnits(game) {
  const b=game.battle;if(!b)return [];
  return [...game.battleActors().filter(a=>a.id!=='you'||b.youHp>0)
    .map(a=>({id:a.id,side:'ally',name:a.name || (a.kind==='guard'?'ยักษ์ทวารบาล':'ยมทูต'),k:a.k||a.kind,speed:Number.isFinite(a.speed)?a.speed:ALLY_SPEED[a.k||a.kind]||8})),
    ...b.foes.filter(f=>f.hp>0).map(f=>({id:f.id,side:'foe',name:f.who,k:f.sp,
      speed:Number.isFinite(f.speed)?f.speed:9}))];
}
const ordered=units=>units.slice().sort((a,b)=>b.speed-a.speed||a.side.localeCompare(b.side)||String(a.id).localeCompare(String(b.id)))
  .map(({id,side})=>({id,side}));
export function ensureTurnQueue(game) {
  const b=game.battle;
  if(!b||b.over||['dad','yama'].includes(b.kind)||b.pendingWave)return null;
  const units=combatUnits(game);
  if(!b.turnQueue||b.turnQueue.version!==1||!Array.isArray(b.turnQueue.remaining)||!Number.isInteger(b.turnQueue.round)||b.turnQueue.round<1||b.turnQueue.wave!==(b.wave||0))b.turnQueue={version:1,wave:b.wave||0,round:1,remaining:ordered(units)};
  const q=b.turnQueue;
  q.remaining=q.remaining.filter(t=>units.some(u=>u.id===t.id&&u.side===t.side));
  if(!q.remaining.length&&units.some(u=>u.side==='ally')&&units.some(u=>u.side==='foe')){
    q.round++;q.remaining=ordered(units);
  }
  return q;
}
export function activeCombatUnit(game) {
  const q=ensureTurnQueue(game),turn=q?.remaining[0];
  return turn?combatUnits(game).find(u=>u.id===turn.id&&u.side===turn.side):null;
}
export function completeCombatTurn(game,turn) {
  const q=game.battle?.turnQueue;
  if(!q||!turn)return false;
  const i=q.remaining.findIndex(u=>u.id===turn.id&&u.side===turn.side);
  if(i<0)return false;
  q.remaining.splice(i,1);ensureTurnQueue(game);return true;
}
export function combatTimeline(game) {
  const q=ensureTurnQueue(game);if(!q)return [];
  const units=combatUnits(game),resolve=(t,round)=>({...units.find(u=>u.id===t.id&&u.side===t.side),round});
  return [...q.remaining.map(t=>resolve(t,q.round)),...ordered(units).map(t=>resolve(t,q.round+1))];
}
