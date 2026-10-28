import {SPOTS} from './data.js';
import {harbourDestinations,dungeonStatus} from './zone-travel.js';
import {findPath,nearestWalk} from './walk.js?v=k1d';
import {drawBoat,drawStandee,drawCrewWalk} from './art.js';
export const KAN_HANDOFF='ข้าจะดูแลโซนนี้ให้ ไม่ต้องห่วง';
export const TRAVEL_WALK_SPEED=0.11;
const lerp=(a,b,p)=>a+(b-a)*p;
const duration={approach:1800,handoff:3600,board:1000,depart:2400,arrive:2400,land:1000};
function pathTo(c,p){const start=nearestWalk(c?.x??c?.hx??p.x,c?.y??c?.hy??p.y)||[p.x,p.y],end=nearestWalk(p.x,p.y)||[p.x,p.y];return [start,...(findPath(...start,...end)||[end])];}
function length(path){return path.slice(1).reduce((v,p,i)=>v+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);}
function along(path,p){let d=length(path)*p;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=n)return {x:lerp(a[0],b[0],n?d/n:0),y:lerp(a[1],b[1],n?d/n:0)};d-=n;}const q=path.at(-1);return {x:q[0],y:q[1]};}
export function beginMapTravel(g,to,{mode='boat',reduced=false}={}){
 if(g.mapTravel||g.battle||g.over)return false;
 if(mode==='boat'?(!g.atHarbour()||!harbourDestinations(g).includes(to)):(!dungeonStatus(g)?.ready||dungeonStatus(g)?.route.to!==to))return false;
 const pier=mode==='boat'?g.harbourPoint():{x:g.player.x,y:g.player.y};
 const nira=mode==='boat'?pathTo(g.crewOf('nira'),pier):[];
 g.mapTravel={from:g.zone,to,mode,reduced,phase:mode==='boat'?'approach':'depart',elapsed:0,pier,waterY:pier.y+120,niraPath:nira,approachMs:Math.max(1800,length(nira)/TRAVEL_WALK_SPEED),committed:false,focus:{...pier}};
 return true;
}
export function cancelMapTravel(g){const a=g.mapTravel;if(!a||a.committed)return false;g.mapTravel=null;return true;}
function commit(g,a){
 if(a.committed)return true;
 a.committing=true;const ok=g.moveZone(a.to);a.committing=false;
 if(!ok){g.mapTravel=null;return false;}
 a.committed=true;a.pier=g.harbourPoint();a.waterY=a.pier.y+120;return true;
}
export function finishMapTravel(g){const a=g.mapTravel;if(!a)return false;if(!commit(g,a))return false;g.mapTravel=null;g.save?.();return true;}
export function advanceMapTravel(g,dt){
 const a=g.mapTravel;if(!a)return false;
 a.elapsed+=Math.max(0,Math.min(120,Number(dt)||0));
 const ms=a.reduced?(a.phase==='handoff'?1600:1):(a.phase==='approach'?a.approachMs:duration[a.phase]);
 a.progress=Math.min(1,a.elapsed/ms);
 a.focus={x:a.pier.x,y:a.pier.y+60};
 if(a.progress<1)return true;
 const next={approach:'handoff',handoff:a.mode==='boat'?'board':'depart',board:'depart',depart:'arrive',arrive:'land'}[a.phase];
 if(a.phase==='depart'){
  if(!commit(g,a))return false;
  if(a.mode!=='boat'){finishMapTravel(g);return false;}
 }
 if(!next){finishMapTravel(g);return false;}
 a.phase=next;a.elapsed=0;a.progress=0;return true;
}
export function drawMapTravel(ctx,g,t,height=48){
 const a=g.mapTravel;if(!a||a.mode!=='boat')return;
 const p=a.progress||0,at=a.pier,boatY=a.waterY;
 const moving=['approach','handoff'].includes(a.phase),onboard=['depart','arrive'].includes(a.phase);
 let boatX=at.x;if(a.phase==='approach')boatX=lerp(at.x-650,at.x,p);
 if(a.phase==='depart')boatX=lerp(at.x,at.x+900,p);
 if(a.phase==='arrive')boatX=lerp(at.x-900,at.x,p);
 if(a.mode==='boat')drawBoat(ctx,boatX,boatY,a.reduced?0:t,0,true);
 const nira=moving?along(a.niraPath,a.phase==='approach'?p:1):{x:at.x+26,y:at.y};
 let hero={x:at.x-14,y:at.y},reader=nira;
 if(a.mode==='boat'&&onboard){const bob=a.reduced?0:Math.sin(t/620)*5;hero={x:boatX-8,y:boatY+4+bob};reader={x:boatX+24,y:boatY-4+bob};}
 if(a.mode==='boat'&&['board','land'].includes(a.phase)){
  const q=a.phase==='board'?p:1-p,jump=a.reduced?0:Math.sin(q*Math.PI)*40;
  hero={x:lerp(at.x-14,at.x-8,q),y:lerp(at.y,boatY+4,q)-jump};reader={x:lerp(at.x+22,at.x+24,q),y:lerp(at.y,boatY-4,q)-jump};
 }
 drawStandee(ctx,'hero-yama',hero.x,hero.y,height,t,'👑',1);
 if(!(moving&&a.phase==='approach'&&drawCrewWalk(ctx,'crew-nira',reader.x,reader.y,height,t*.1,1)))drawStandee(ctx,'crew-nira',reader.x,reader.y,height,t,'📜',1);

}
