import {characterScale} from './character-scale.js';
import {ferryBerth,withFerryOcclusion} from './ferry-geometry.js';
import {harbourDestinations,dungeonStatus,canTravelZone} from './zone-travel.js';
import {findPath,nearestWalk} from './walk.js?v=k1d';
import {drawBoat,drawStandee,drawCrewWalk,img} from './art.js';
export const KAN_HANDOFF='ข้าจะดูแลโซนนี้ให้ ไม่ต้องห่วง';
export const TRAVEL_WALK_SPEED=0.11;
const lerp=(a,b,p)=>a+(b-a)*p;
const duration={approach:1800,handoff:3600,board:1000,depart:2400,arrive:2400,land:1000};
const clampProgress=p=>Math.max(0,Math.min(1,p));
function pathTo(c,p){const start=nearestWalk(c?.x??c?.hx??p.x,c?.y??c?.hy??p.y)||[p.x,p.y],end=nearestWalk(p.x,p.y)||[p.x,p.y];return [start,...(findPath(...start,...end)||[end])];}
function length(path){return path.slice(1).reduce((v,p,i)=>v+Math.hypot(p[0]-path[i][0],p[1]-path[i][1]),0);}
function along(path,p){let d=length(path)*p;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],n=Math.hypot(b[0]-a[0],b[1]-a[1]);if(d<=n)return {x:lerp(a[0],b[0],n?d/n:0),y:lerp(a[1],b[1],n?d/n:0)};d-=n;}const q=path.at(-1);return {x:q[0],y:q[1]};}
export function beginMapTravel(g,to,{mode='boat',reduced=false,load=null}={}){
 if(g.mapTravel||g.battle||g.over)return false;
 if(mode==='boat'?(!g.atHarbour()||!harbourDestinations(g).includes(to)):mode==='walk'?(!g.walkBackReady(to)||!canTravelZone(g,to)):(!dungeonStatus(g)?.ready||dungeonStatus(g)?.route.to!==to))return false;   // T8c: 'walk' = the way back through a frontier while the world is seized
 const pier=mode==='boat'?g.harbourPoint():{x:g.player.x,y:g.player.y};
 const nira=mode==='boat'?pathTo(g.crewOf('nira'),pier):[];
 g.mapTravel={from:g.zone,to,mode,reduced,phase:mode==='boat'?'approach':'depart',elapsed:0,pier,waterY:ferryBerth(g.zone,pier).y,niraPath:nira,boardingHop:ferryBerth(g.zone,pier).hop,approachMs:Math.max(1800,Math.ceil(length(nira)/TRAVEL_WALK_SPEED)),committed:false,focus:{...pier},load,loaded:!load,loadPromise:null,loadError:null};
 return true;
}
export function cancelMapTravel(g){const a=g.mapTravel;if(!a||a.committed)return false;g.mapTravel=null;return true;}
/** F14 (owner 15 Nov): the destination's pictures are fetched only after the boat has floated off to the right; if they are not cached yet the
 *  game's own loading page (preloadZone) shows right there, then the destination map follows. Resolves true when the zone may be entered. */
export function ensureTravelLoaded(a){
 if(!a||a.loaded)return Promise.resolve(true);
 a.loadPromise??=Promise.resolve().then(()=>a.load()).then(()=>{a.loaded=true;return true;},e=>{a.loadError=e||new Error('load failed');return false;});
 return a.loadPromise;
}
/** Skip button: still waits for the destination pictures before the zone changes. */
export async function skipMapTravel(g){
 const a=g.mapTravel;if(!a)return false;
 if(!await ensureTravelLoaded(a)){if(g.mapTravel===a)g.mapTravel=null;return false;}
 if(g.mapTravel!==a)return false;
 return finishMapTravel(g);
}
function commit(g,a){
 if(a.committed)return true;
 a.committing=true;const ok=g.moveZone(a.to);a.committing=false;
 if(!ok){g.mapTravel=null;return false;}
 a.committed=true;a.pier=g.harbourPoint();a.waterY=ferryBerth(g.zone,a.pier).y;a.boardingHop=ferryBerth(g.zone,a.pier).hop;return true;
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
  // The boat is at the far right: hold it there until the destination is loaded (loading page shows on top), then change zone.
  if(!a.loaded){
   ensureTravelLoaded(a);a.progress=1;a.elapsed=ms;
   if(a.loadError){g.mapTravel=null;g.log?.('โหลดภาพปลายทางไม่สำเร็จ กรุณาลองใหม่','bad');return false;}
   return true;
  }
  if(!commit(g,a))return false;
  if(a.mode!=='boat'){finishMapTravel(g);return false;}
 }
 if(!next){finishMapTravel(g);return false;}
 a.phase=next;a.elapsed=0;a.progress=0;return true;
}
/** Shared geometry keeps boarding/landing continuous with the deck and bob. */
export function mapTravelPose(a,t=0){
 if(!a||a.mode!=='boat')return null;
 const p=a.progress||0,at=a.pier,boatY=a.waterY;
 const moving=['approach','handoff'].includes(a.phase),onboard=['depart','arrive'].includes(a.phase);
 let boatX=at.x;if(a.phase==='approach')boatX=lerp(at.x-650,at.x,p);
 if(a.phase==='depart')boatX=lerp(at.x,at.x+900,p);
 if(a.phase==='arrive')boatX=lerp(at.x-900,at.x,p);
 const bob=a.reduced?0:Math.sin(t/620)*5;
 const nira=moving||a.phase==='board'?along(a.niraPath,a.phase==='approach'?p:1):{x:at.x+22,y:at.y};
 let hero={x:at.x-14,y:at.y},reader=nira;
 let heroState=onboard?'sit':'stand',readerState=heroState;
 // Feet follow the painted deck, below the square texture midpoint. The
 // old anchors placed both riders above the far gunwale in transparent space.
 const deckHero={x:boatX-8,y:boatY+5+bob},deckReader={x:boatX+17,y:boatY-2+bob};
 if(onboard){hero=deckHero;reader=deckReader;}
 if(['board','land'].includes(a.phase)){
  // The riders leave the quay one at a time and sit as soon as they touch the deck.
  const boardProgress=a.phase==='board'?p:1-p;
  const heroProgress=clampProgress(boardProgress/.76);
  const readerProgress=clampProgress((boardProgress-.22)/.78);
  const arc=(start,end,q)=>{
   const lift=a.reduced?0:Math.max(36,a.boardingHop??0);
   return {x:lerp(start.x,end.x,q),y:lerp(start.y,end.y,q)-4*lift*q*(1-q)};
  };
  const state=q=>q===1?'sit':q>0&&!a.reduced?'jump':'stand';
  hero=arc({x:at.x-14,y:at.y},deckHero,heroProgress);
  reader=arc(nira,deckReader,readerProgress);
  heroState=state(heroProgress);readerState=state(readerProgress);
 }
 return {boat:{x:boatX,y:boatY},hero,reader,heroState,readerState,onboard,walking:a.phase==='approach'};
}
export function drawMapTravel(ctx,g,t,height=48){
 const a=g.mapTravel,pose=mapTravelPose(a,t);if(!pose)return;
 const {boat,hero,reader,heroState,readerState,onboard,walking}=pose;
 const actors=[
  {name:'yama',base:'hero-yama',glyph:'👑',point:hero,state:heroState},
  {name:'nira',base:'crew-nira',glyph:'📜',point:reader,state:readerState},
 ];
 const drawActor=({name,base,glyph,point:{x,y},state})=>{
  const h=height*characterScale(name);
  const sourceZone=name==='yama'?(g.outfit||g.zone):g.zone;
  const jumpKey=`ferry-${name}-jump`,sitKey=`ferry-${name}-sit`;
  const jump=img(jumpKey,sourceZone),sit=img(sitKey,sourceZone);
  const poseKey=state==='jump'&&jump?jumpKey:state==='sit'&&sit?sitKey:null;
  if(poseKey){
   const poseHeight=h*(state==='sit' ? .68 : .9);
   drawStandee(ctx,poseKey,x,y,poseHeight,0,glyph,1,false,sourceZone);
   return;
  }
  if(!(name==='nira'&&walking&&drawCrewWalk(ctx,base,x,y,h,t*.1,1)))drawStandee(ctx,base,x,y,h,t,glyph,1);
 };
 withFerryOcclusion(ctx,g.zone,()=>{
  drawBoat(ctx,boat.x,boat.y,a.reduced?0:t,0,true,!a.reduced&&(onboard||a.phase==='approach'));
  for(const actor of actors)if(actor.state==='sit')drawActor(actor);
 });
 // Feet on the quay are in front of its rail; only waterborne actors go under
 // the bridge with the vessel.
 for(const actor of actors)if(actor.state!=='sit')drawActor(actor);
}
