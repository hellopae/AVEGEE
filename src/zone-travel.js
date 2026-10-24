/** Persisted travel rules; rendering and combat remain owned by the game. */
import { ROUTE_GEOMETRY, routeRow, isWildernessRoute, routeBossCave } from './route-geometry.js';
export const TRAVEL_VERSION = 1;
export const TRAVEL_ZONES = Object.freeze(['th', 'asia', 'west', 'cyberhell']);
const route = (from, to, name, checkpoints, foes) => Object.freeze({
  id:`${from}:${to}`, from, to, name,
  checkpoints:Object.freeze(checkpoints.map((name,i) => Object.freeze({ id:`${from}:${to}:${i}`, name, foe:foes[i] }))),
});
export const DUNGEON_ROUTES = Object.freeze([
  route('th','asia','ทางชายแดนสุวรรณภูมิ–บูรพา',['ป่าริมชายแดนและน้ำตก','หุบเขาและสะพานข้ามเหว','ถ้ำบอสโซน 1'],[2,3,5]),
  route('asia','west','ทางชายแดนบูรพา–ปัจฉิม',['ช่องเขาตรวน','ซากป้อมชายแดน','ประตูปัจฉิม'],[6,7,9]),
  route('west','cyberhell','ทางชายแดนปัจฉิม–ไซเบอร์',['ป่าหมอก','เส้นทางเครื่องจักร','ประตูไซเบอร์'],[10,11,12]),
]);
// Optional patrols live between the three story checkpoints. Their victories never unlock a gate.
// M2 R1: patrol progress / foes are columns of ROUTE_GEOMETRY; only routes using the trail system (enabled rows) have patrols.
const patrolsOf = routeId => Object.freeze(routeRow(routeId).patrolProgress.map((progress,i)=>Object.freeze({
  id:`${routeId}:patrol:${i}`,progress,foe:routeRow(routeId).patrolFoe[i],name:'ปีศาจลาดตระเวน',level:1+Math.floor(i/2),
})));
const PATROLS = Object.fromEntries(Object.keys(ROUTE_GEOMETRY).map(id => [id, patrolsOf(id)]));
export const DUNGEON_PATROLS = PATROLS['th:asia'];
export const dungeonPatrols = routeId => isWildernessRoute(routeId)?PATROLS[routeId]:[];
const known = k => TRAVEL_ZONES.includes(k);
const definition = id => DUNGEON_ROUTES.find(r => r.id === id);
// A route with a boss cave opens early once that zone's breach is cleared or its cave boss is waiting (Zone 1-2 only).
const routeAvailable = (g,r) => { const cave = routeBossCave(r.id); return !!g.bossCleared?.[r.from] || !!cave && (g.zoneEvents?.[cave.zone]?.[cave.breachKey]==='cleared' || ['pending','active'].includes(g.zoneEvents?.[cave.zone]?.[cave.eventKey])); };
const busy = g => !!(g.battle || g.over || g.pendingRecovery || g.mapTravel&&!g.mapTravel.committing);
const state = g => g.zoneTravel || initializeZoneTravel(g);

/** Call on new game / restore. Only legacy saves inherit already visited ports. */
export function initializeZoneTravel(g, saved = g.zoneTravel) {
  const legacy = !saved || saved.version !== TRAVEL_VERSION;
  const visited = { th:true };
  if (legacy) {
    for (const k of [g.zone, ...Object.keys(g.zoneSave || {})]) if (known(k)) visited[k] = true;
  } else {
    for (const k of TRAVEL_ZONES) if (saved.visited?.[k] === true) visited[k] = true;
    // A loaded current city is arrival evidence even if a partial save lost its map.
    if (known(g.zone)) visited[g.zone] = true;
  }
  const ports = {};
  for (const k of TRAVEL_ZONES) if (visited[k] && (legacy || saved.ports?.[k] === true)) ports[k] = true;
  const result = { version:TRAVEL_VERSION, visited, ports, active:null };
  const a = saved?.active, r = definition(a?.route);
  if (r && r.from === g.zone && routeAvailable(g,r) &&
      Number.isInteger(a.checkpoint) && a.checkpoint >= 0 && a.checkpoint <= r.checkpoints.length &&
      Array.isArray(a.cleared) && a.cleared.length === a.checkpoint &&
      a.cleared.every((id,i) => id === r.checkpoints[i].id)) {
    result.active = { patrolDefeated:[...new Set((Array.isArray(a.patrolDefeated)?a.patrolDefeated:[]).filter(id=>dungeonPatrols(r.id).some(p=>p.id===id)))], route:r.id, checkpoint:a.checkpoint, cleared:[...a.cleared], defeated:[...new Set([...a.cleared,...(Array.isArray(a.defeated)?a.defeated.filter(id=>r.checkpoints.some(c=>c.id===id)):[])])],
      guidePosition:a.guidePosition&&Number.isFinite(a.guidePosition.x)&&Number.isFinite(a.guidePosition.y)?{x:a.guidePosition.x,y:a.guidePosition.y}:null,
      position:a.position&&Number.isFinite(a.position.x)&&Number.isFinite(a.position.y)?{x:a.position.x,y:a.position.y}:null,
      roamTime:Number.isFinite(a.roamTime)&&a.roamTime>=0?a.roamTime:0,
      attempt:Number.isSafeInteger(a.attempt) && a.attempt >= 0 ? a.attempt : 0, pending:null };
    // Do not resurrect a battle token: combat itself is not persisted by game.snapshot.
  }
  g.zoneTravel = result;
  return result;
}
export function openDungeonRoutes(g) {
  return DUNGEON_ROUTES.filter(r => r.from === g.zone && routeAvailable(g,r));
}
export function beginDungeon(g, to) {
  const s = state(g), r = openDungeonRoutes(g).find(r => r.to === to);
  if (!r || busy(g) || s.active) return false;
  const docket=Object.values(g.bossJustice?.ledger||{}).reverse().find(c=>c.phase==='released'&&!c.routeRestored&&c.suspendedRoute?.route===r.id);
  const saved=docket?.suspendedRoute;
  const valid=saved&&Number.isInteger(saved.checkpoint)&&saved.checkpoint>=0&&saved.checkpoint<=r.checkpoints.length&&Array.isArray(saved.cleared)&&saved.cleared.length===saved.checkpoint&&saved.cleared.every((id,i)=>r.checkpoints[i]?.id===id);
  s.active=valid?{...structuredClone(saved),position:null,guidePosition:null,pending:null,pendingIndex:null,pendingPatrol:null}:{route:r.id,checkpoint:0,cleared:[],defeated:[],patrolDefeated:[],attempt:0,pending:null};
  if(valid)docket.routeRestored=true;
  return true;
}
export function dungeonStatus(g) {
  const a = state(g).active, r = definition(a?.route);
  if (!r || r.from !== g.zone || !routeAvailable(g,r) ||
      !Number.isInteger(a.checkpoint) || a.checkpoint < 0 || a.checkpoint > r.checkpoints.length ||
      !Array.isArray(a.cleared) || a.cleared.length !== a.checkpoint ||
      !a.cleared.every((id,i) => id === r.checkpoints[i].id)) return null;
  return { route:r, checkpoint:a.checkpoint, location:r.checkpoints[a.checkpoint] || null,
    ready:a.checkpoint === r.checkpoints.length && !!g.bossCleared?.[r.from], pending:a.pending, defeated:a.defeated || a.cleared };
}
const routedBoss = (status,g) => { const cave = routeBossCave(status.route.id); return !!cave && status.checkpoint === cave.checkpoint && !g.bossCleared?.[cave.zone]; };
/** Request encounter only after the player reaches the current checkpoint. */
export function nextDungeonEncounter(g,checkpoint=null) {
  const status = dungeonStatus(g), a = state(g).active;
  if (!status || busy(g) || a.pending) return null;
  if(typeof checkpoint==='string'){
    const patrol=dungeonPatrols(a.route).find(p=>p.id===checkpoint);
    if(!patrol||(a.patrolDefeated||[]).includes(patrol.id))return null;
    const token=`${patrol.id}:${++a.attempt}`;a.pending=token;a.pendingPatrol=patrol.id;a.pendingIndex=null;
    return {token,patrol:patrol.id,name:patrol.name,kindIdx:patrol.foe,level:patrol.level,boss:false};
  }
  if(status.ready)return null;
  const index=checkpoint??status.checkpoint;
  if(!Number.isInteger(index)||!status.route.checkpoints[index]||(a.defeated||a.cleared).includes(status.route.checkpoints[index].id))return null;
  { const cave = routeBossCave(status.route.id); if(cave&&index===cave.checkpoint&&status.checkpoint<cave.checkpoint)return null; }
  const location = status.route.checkpoints[index];
  const token = `${a.route}:${index}:${++a.attempt}`;
  a.pendingPatrol=null;
  a.pendingIndex=index;
  a.pending = token;
  return { token, checkpoint:location.id, name:location.name, kindIdx:location.foe, level:index + 1, boss:routedBoss({...status,checkpoint:index},g) };
}
/** Only the battle carrying this token may resolve this checkpoint. */
export function resolveDungeonEncounter(g, token, won) {
  const status = dungeonStatus(g), a = state(g).active;
  if (!status || !a.pending || a.pending !== token || typeof won !== 'boolean') return false;
  if(a.pendingPatrol){
    const patrol=dungeonPatrols(a.route).find(p=>p.id===a.pendingPatrol);if(!patrol)return false;
    if(won)a.patrolDefeated=[...new Set([...(a.patrolDefeated||[]),patrol.id])];
    a.pending=null;a.pendingPatrol=null;a.pendingIndex=null;return true;
  }
  if(status.ready)return false;
  const index=a.pendingIndex??status.checkpoint,location=status.route.checkpoints[index];
  if(!location)return false;
  if (won && routedBoss({...status,checkpoint:index},g)) return false;
  a.pending = null;
  a.pendingIndex=null;
  if (won) {
    a.defeated=[...new Set([...(a.defeated||a.cleared),location.id])];
    while(a.checkpoint<status.route.checkpoints.length&&a.defeated.includes(status.route.checkpoints[a.checkpoint].id)){
      a.cleared.push(status.route.checkpoints[a.checkpoint].id);a.checkpoint++;
    }
  }
  return true;
}
export function leaveDungeon(g) {
  const s = state(g);
  if (!s.active || busy(g) || s.active.pending) return false;
  s.active = null;
  return true;
}
export function activateHarbour(g) {
  const s = state(g);
  if (!known(g.zone) || !s.visited[g.zone] || busy(g) || s.active) return false;
  s.ports[g.zone] = true;
  return true;
}
export function harbourDestinations(g) {
  const s = state(g);
  if (!s.ports[g.zone] || busy(g) || s.active) return [];
  return TRAVEL_ZONES.filter(k => k !== g.zone && s.visited[k] && s.ports[k]);
}
/** Put this guard in moveZone itself, not only its menu. */
export function canTravelZone(g, to) {
  if (!known(to) || to === g.zone || busy(g)) return false;
  const status = dungeonStatus(g);
  if (status) return status.ready && status.route.to === to && !status.pending;
  if (state(g).active) return false;
  return harbourDestinations(g).includes(to);
}
/** Call only after moveZone returned true. Use mode captured before moveZone. */
export function finishZoneArrival(g, from, to, mode) {
  const s = state(g), a = s.active, r = definition(a?.route);
  if (!known(from) || !known(to) || from === to || g.zone !== to) return false;
  if (mode === 'dungeon') {
    if (!r || r.from !== from || r.to !== to || !g.bossCleared?.[from] ||
        a.checkpoint !== r.checkpoints.length || a.pending ||
        a.cleared.length !== r.checkpoints.length || !a.cleared.every((id,i) => id === r.checkpoints[i].id)) return false;
  } else if (mode === 'boat') {
    if (a || !s.visited[from] || !s.visited[to] || !s.ports[from] || !s.ports[to]) return false;
  } else return false;
  s.visited[to] = true;
  s.active = null;
  // New destination port is deliberately inactive until interacted with.
  return true;
}
