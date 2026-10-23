import {createFrontierNavigation} from './dungeon-navigation.js';
import {drawFrontierAmbient,drawFrontierTree} from './frontier-ambient.js';
import {FRONTIER_WORLD,frontierActorHeight,frontierCameraTarget} from './frontier-view-metrics.js';
import {bossGuideWaiting,bossGuideFollowing,bossGuideFollowPoint,bossGuideDismissed} from './boss-guides.js';
import { dungeonStatus, dungeonPatrols } from './zone-travel.js';
import { LEGACY_CORRIDOR, LEGACY_CHECKPOINT_PROGRESS, routeRow, isWildernessRoute, routeBossCave } from './route-geometry.js';
import { themeBackground } from './theme-assets.js';
import { dungeonBackground } from './dungeon-art.js';
import { drawHeroWalk, drawCrewWalk, drawStandee } from './art.js';
import { exitStep, drawExitMarker } from './exit-marker.js';
import { MOB } from './data.js';
import { CHASE, newChase, stepChase, chaseAlerted, chaseInReach } from './dungeon-chase.js?v=l5';

// M2 R1: trails, checkpoint vertices, pads and boss caves are rows of ROUTE_GEOMETRY (route-geometry.js); a route whose row is
// not enabled keeps the original vertical corridor.
export const DUNGEON_CORRIDOR=routeRow('th:asia').corridor;
const navigationCache=new Map();
export function dungeonNavigation(routeId='th:asia'){
  if(!isWildernessRoute(routeId))return null;
  if(!navigationCache.has(routeId)){const row=routeRow(routeId);navigationCache.set(routeId,createFrontierNavigation(row.walkMask,row.corridor));}
  return navigationCache.get(routeId);
}
export const dungeonCellProgress=(p,routeId='th:asia')=>dungeonNavigation(routeId)?.progress(p)??dungeonProjection(p,1,routeId).progress;
export const dungeonSnap=(p,routeId='th:asia',limit=1)=>dungeonNavigation(routeId)?.snap(p,limit)??dungeonProjection(p,limit,routeId).point;
const geometryCache=new Map();
const geometry = (routeId='th:asia') => {
  const row=routeRow(routeId),wild=isWildernessRoute(routeId),key=wild?routeId:'legacy';
  if(geometryCache.has(key))return geometryCache.get(key);
  const corridor=wild?row.corridor:LEGACY_CORRIDOR;
  const lengths=corridor.slice(1).map((p,i)=>Math.hypot(p[0]-corridor[i][0],p[1]-corridor[i][1]));
  const total=lengths.reduce((a,b)=>a+b,0);
  const progress=wild?Object.freeze(row.checkpointVertex.map(i=>lengths.slice(0,i).reduce((a,b)=>a+b,0)/total)):LEGACY_CHECKPOINT_PROGRESS;
  const result={corridor,lengths,total,progress};geometryCache.set(key,result);return result;
};
const {lengths,total,progress:REF_PROGRESS}=geometry();
export const DUNGEON_TOTAL=total;
export const dungeonRouteTotal=routeId=>geometry(routeId).total;
export const DUNGEON_PROGRESS = REF_PROGRESS;
export const dungeonCheckpointProgress = routeId => geometry(routeId).progress;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function dungeonPoint(progress,routeId='th:asia') {
  const {corridor,lengths,total}=geometry(routeId);
  let d=clamp(Number.isFinite(progress)?progress:0,0,1)*total;
  for(let i=0;i<lengths.length;i++) {
    if(d<=lengths[i] || i===lengths.length-1) {
      const a=corridor[i],b=corridor[i+1],u=clamp(d/lengths[i],0,1);
      return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
    }
    d-=lengths[i];
  }
}
export function dungeonProjection(point,maxProgress=1,routeId='th:asia') {
  const {corridor,lengths,total}=geometry(routeId);
  const at=v=>dungeonPoint(v,routeId);
  if(!Array.isArray(point)||!point.every(Number.isFinite)) return { progress:0,point:at(0),distance:Infinity };
  let best={progress:0,point:at(0),distance:Infinity},offset=0;
  for(let i=0;i<lengths.length;i++) {
    const a=corridor[i],b=corridor[i+1];
    const u=clamp(((point[0]-a[0])*(b[0]-a[0])+(point[1]-a[1])*(b[1]-a[1]))/(lengths[i]**2),0,1);
    const raw=(offset+lengths[i]*u)/total,progress=clamp(raw,0,clamp(maxProgress,0,1));
    const p=progress===raw?[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]:at(progress),distance=Math.hypot(point[0]-p[0],point[1]-p[1]);
    if(distance<best.distance) best={progress,point:p,distance};
    offset+=lengths[i];
  }
  return best;
}
export function dungeonCanInteract(progress,checkpoint,ready=false) {
  return Number.isFinite(progress) && (ready ? progress>=.965 : Number.isInteger(checkpoint) && checkpoint>=0 && checkpoint<3 && Math.abs(progress-DUNGEON_PROGRESS[checkpoint])*total<=.045);
}

export const DUNGEON_CHECKPOINTS = Object.freeze(DUNGEON_PROGRESS.map(v=>Object.freeze(dungeonPoint(v))));
export const DUNGEON_EXIT = Object.freeze(dungeonPoint(1));
const activePosition = g => {const p=g.zoneTravel?.active?.position;return p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?[p.x,p.y]:null;};
export function dungeonAtCheckpoint(g,checkpoint=null) {
  const s=dungeonStatus(g),p=activePosition(g),at=s&&!s.ready?dungeonPoint(dungeonCheckpointProgress(s.route.id)[checkpoint??s.checkpoint],s.route.id):null;
  return !!(s&&!s.ready&&p&&at&&Math.hypot(p[0]-at[0],p[1]-at[1])<=.045);
}
export function dungeonAtExit(g) {
  const s=dungeonStatus(g),p=activePosition(g);
  return !!(s?.ready&&p&&Math.hypot(p[0]-dungeonPoint(1,s.route.id)[0],p[1]-dungeonPoint(1,s.route.id)[1])<=.026);
}

// Navigation is a two-dimensional road surface. Coordinates are never snapped
// to the centerline during movement; the line seeds story progress on the mask.
export function dungeonWalkable(p,routeId='th:asia',limit=1) {
  if(isWildernessRoute(routeId))return dungeonNavigation(routeId).walkable(p,limit);
  if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p.some(v=>v<.02||v>.98))return false;
  return dungeonProjection(p,1,routeId).distance<=.026;
}
export function dungeonSegmentClear(a,b,routeId='th:asia',limit=1) {
  if(isWildernessRoute(routeId))return dungeonNavigation(routeId).clear(a,b,limit);
  const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.004));
  for(let i=0;i<=steps;i++)if(!dungeonWalkable([a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps],routeId))return false;
  return true;
}
export function dungeonMove(from,to,routeId='th:asia',limit=1) {
  if(isWildernessRoute(routeId))return dungeonNavigation(routeId).move(from,to,limit);
  if(dungeonSegmentClear(from,to,routeId))return to;
  const x=[to[0],from[1]],y=[from[0],to[1]];
  if(dungeonSegmentClear(from,x,routeId))return x;
  if(dungeonSegmentClear(from,y,routeId))return y;
  return from;
}
export function dungeonPath(from,to,routeId='th:asia',limit=1) {
  if(isWildernessRoute(routeId))return dungeonNavigation(routeId).path(from,to,limit);
  if(!dungeonWalkable(from,routeId))return [];
  const end=dungeonProjection(to,1,routeId);
  const goal=dungeonWalkable(to,routeId)?to:end.distance<=.08?end.point:null;
  if(!goal)return [];
  if(dungeonSegmentClear(from,goal,routeId))return [goal];
  const start=dungeonProjection(from,1,routeId),finish=dungeonProjection(goal,1,routeId),{corridor,lengths,total}=geometry(routeId);
  let sum=0;const vertices=corridor.map((p,i)=>{if(i)sum+=lengths[i-1];return {p,progress:sum/total};});
  const middle=vertices.filter(v=>v.progress>Math.min(start.progress,finish.progress)&&v.progress<Math.max(start.progress,finish.progress)).map(v=>v.p);
  if(start.progress>finish.progress)middle.reverse();
  const raw=[start.point,...middle,finish.point,goal],path=[];let at=from;
  for(let i=0;i<raw.length;){let j=i;while(j+1<raw.length&&dungeonSegmentClear(at,raw[j+1],routeId))j++;if(!dungeonSegmentClear(at,raw[j],routeId))return [];path.push(raw[j]);at=raw[j];i=j+1;}
  return path;
}
export function dungeonEnemyPositions(g,time=0) {
  const s=dungeonStatus(g);if(!s)return [];
  const checkpoints=s.ready?[]:s.route.checkpoints.flatMap((location,index)=>{
    if(s.defeated.includes(location.id))return [];
    const progress=dungeonCheckpointProgress(s.route.id)[index],phase=(Number.isFinite(time)?time:0)/6500+index*2;
    const anchor=dungeonPoint(progress,s.route.id),p=dungeonPoint(progress+Math.sin(phase)*.008,s.route.id);
    const cave=routeBossCave(s.route.id),atCave=!!cave&&index===cave.checkpoint;
    const boss=atCave&&!g.bossCleared?.[cave.zone];
    const locked=atCave&&(s.checkpoint<cave.checkpoint||boss&&g.zoneEvents?.[cave.zone]?.[cave.eventKey]!=='pending');
    return [{id:location.id,checkpoint:index,kindIdx:location.foe,boss,locked,position:dungeonWalkable(p,s.route.id)?p:anchor}];
  });
  const patrols=dungeonPatrols(s.route.id).filter(p=>!(g.zoneTravel.active.patrolDefeated||[]).includes(p.id)).map((p,i)=>({
    id:p.id,patrol:p.id,kindIdx:p.foe,boss:false,locked:false,
    position:dungeonPoint(p.progress+Math.sin((Number.isFinite(time)?time:0)/8000+i*1.7)*.007,s.route.id),
  }));
  return [...checkpoints,...patrols];
}
export function dungeonAtPatrol(g,id,position=null){
  const s=dungeonStatus(g),p=position||activePosition(g),patrol=s&&dungeonPatrols(s.route.id).find(a=>a.id===id);
  if(!p||!patrol||(g.zoneTravel.active.patrolDefeated||[]).includes(id))return false;
  // Match the entire short roaming lane, not an untrusted supplied enemy position.
  const projected=dungeonProjection(p,1,s.route.id);
  return projected.distance<=.026&&Math.abs(dungeonCellProgress(p,s.route.id)-patrol.progress)*geometry(s.route.id).total<=.045;
}
export function dungeonAutoEncounter(g,position,time=0) {
  const s=dungeonStatus(g);
  if(!s||s.pending||g.battle||g.pendingRecovery||g.dungeonChaseCooldown)return null;
  return dungeonEnemyPositions(g,time).find(enemy=>!enemy.locked&&Math.hypot(position[0]-enemy.position[0],position[1]-enemy.position[1])<=.032&&(enemy.patrol?dungeonAtPatrol(g,enemy.patrol,position):Math.hypot(position[0]-dungeonPoint(dungeonCheckpointProgress(s.route.id)[enemy.checkpoint],s.route.id)[0],position[1]-dungeonPoint(dungeonCheckpointProgress(s.route.id)[enemy.checkpoint],s.route.id)[1])<=.045))||null;
}

// Give Nira a lateral lane even at the entry, where follow progress is clamped to zero.
export function dungeonCompanionPoint(progress,routeId='th:asia') {
  const p=dungeonPoint(Math.max(0,progress-.055),routeId);
  return [p[0]-.038,Math.min(.96,p[1]+.007)];
}

export function dungeonChaseReach(g) {
  const s=dungeonStatus(g),p=activePosition(g);if(!s||s.ready||!p)return false;
  const t=geometry(s.route.id).total;
  return chaseInReach(dungeonCheckpointProgress(s.route.id)[s.checkpoint]*t,dungeonCellProgress(p,s.route.id)*t);
}
/** O1/P5: the route is one full-bleed map. Only floating controls remain: bag, minimap, status chip and the two talk buttons.
 *  Going back to the frontier post is done by walking back onto the route start (arrow on the ground), not by a button. */
const dungeonShell=guideLabel=>'<div class="dungeon-stage"><canvas tabindex="0" aria-label="เส้นทางดันเจี้ยน เดินด้วย WASD หรือปุ่มลูกศร หรือคลิกจุดหมาย"></canvas><canvas class="dungeon-minimap" aria-label="แผนที่ย่อเส้นทาง"></canvas><p class="dungeon-load" role="status">กำลังโหลดฉากชายแดน…</p><button type="button" class="dungeon-icon dungeon-menu" data-action="menu" aria-label="เมนู · กระเป๋า">☰</button><p class="dungeon-status" aria-live="polite"></p><div class="dungeon-actions"><button type="button" class="dungeon-guide" hidden>'+guideLabel+'</button><button type="button" class="dungeon-challenge" hidden>ประลองบอสชายแดนในถ้ำ</button></div></div>';
/** Reaching the gate enters the next land by itself; the latch needs a step away before it can fire again. */
export function dungeonExitArrival(g,latched,{cut=0,destroyed=false}={}) {
  const s=dungeonStatus(g),at=!!(s?.ready&&dungeonAtExit(g));
  if(!at)return {latched:false,enter:false};
  const idle=!latched&&!destroyed&&cut<=0&&!g.battle&&!g.pendingRecovery&&!s.pending;
  return {latched:latched||idle,enter:idle};
}
/** P5: the route start (the frontier-post side) is an exit like the far gate: walking back onto it returns to the post, no button.
 *  Same latch as the gate — arriving at the start (the route always begins there) does not bounce out; step away first. */
export const DUNGEON_START_REACH=.026;
export function dungeonAtStart(g) {
  const s=dungeonStatus(g),p=activePosition(g);
  if(!s||!p)return false;
  const a=dungeonPoint(0,s.route.id);
  return Math.hypot(p[0]-a[0],p[1]-a[1])<=DUNGEON_START_REACH;
}
export function dungeonStartDeparture(g,latched,{cut=0,destroyed=false}={}) {
  const s=dungeonStatus(g);
  const r=exitStep({at:!!(s&&dungeonAtStart(g)),latched,blocked:destroyed||cut>0||!!g.battle||!!g.pendingRecovery||!!s?.pending});
  return {latched:r.latched,leave:r.fire};
}
/** Ground arrow at the route start (dir = backwards along the road). */
function drawStartMarker(ctx,routeId,screen,reach,w,cam,t,reduced){
  const {corridor}=geometry(routeId),a=corridor[0],b=corridor[1],p=screen(a);
  drawExitMarker(ctx,p[0],p[1],{rx:reach*w.w*cam.scale,ry:reach*w.h*cam.scale,dir:[a[0]-b[0],a[1]-b[1]],u:Math.min(w.w,w.h)*cam.scale,t,label:'กลับด่านชายแดน',alpha:.9,reduced});
}
/** Mount inside a dialog/panel. All city player coordinates remain untouched. */
function mountWildernessView(container,g,{onEncounter=()=>{},onArrival=()=>{},onLeave=()=>{},onMenu=()=>{},onChallenge=()=>{},onGuide=()=>{}}={}) {
  if(!dungeonStatus(g)) throw new Error('An unlocked active dungeon route is required');
  const routeId=dungeonStatus(g).route.id,points=dungeonCheckpointProgress(routeId);
  const point=v=>dungeonPoint(v,routeId);
  const root=document.createElement('section'); root.className='dungeon-view';
  root.innerHTML=dungeonShell('คุยกับผู้ตรวจการ · ออกเดินทาง');
  container.append(root);
  const canvas=root.querySelector('.dungeon-stage > canvas'),mini=root.querySelector('.dungeon-minimap');
  const ctx=canvas.getContext('2d'),mc=mini.getContext('2d'),info=root.querySelector('.dungeon-status'),loading=root.querySelector('.dungeon-load');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const treeImages={};
  for(const [kind,file] of Object.entries({red:'town-tree-red-th-v1',green:'town-tree-asia-v1',lightgreen:'town-tree-c-asia-v1'})){treeImages[kind]=new Image();treeImages[kind].src=`img/theme-v4/${file}.webp`;}
  const nav=dungeonNavigation(routeId);
  const miniMask=document.createElement('canvas');miniMask.width=nav.cols;miniMask.height=nav.rows;
  const maskCtx=miniMask.getContext('2d');maskCtx.fillStyle='#ffd27a88';
  for(let y=0;y<nav.rows;y++){for(let x=0;x<nav.cols;){if(!nav.cells[y*nav.cols+x]){x++;continue;}const start=x;while(x<nav.cols&&nav.cells[y*nav.cols+x])x++;maskCtx.fillRect(start,y,x-start,1);}}
  let image=new Image(),backgroundSrc=null;
  const backgrounds=new Map();
  let destroyed=false,frame=0,last=0,target=null,position=null,follower=null,trail=[],guidePosition=null,enemyTime=Number.isFinite(g.zoneTravel.active.roamTime)?g.zoneTravel.active.roamTime:0,encounterDispatch=false,width=800,height=460,face=1,direction='up',walkDistance=0,moving=false,wasMoving=false,dirty=false,cam={x:0,y:0,scale:1},saveClock=0;
  let encounterCooldown=g.dungeonChaseCooldown?CHASE.cooldownMs:0;g.dungeonChaseCooldown=false;
  const niraMotion={face:1,moving:false,distance:0},guideMotion={face:1,moving:false,distance:0};
  let joystick=null,pointerStart=null;
  const keys=new Set(),handlers=[];
  const listen=(node,name,fn,options)=>{node.addEventListener(name,fn,options);handlers.push(()=>node.removeEventListener(name,fn,options));};
  const limit=()=>{const s=dungeonStatus(g);return s?.ready?1:points[s?.checkpoint||0]-.018;};
  const saved=g.zoneTravel.active.position;
  position=dungeonSnap(saved?[saved.x,saved.y]:point(0),routeId,limit());
  follower=[...position];
  guidePosition=g.zoneTravel.active.guidePosition?[g.zoneTravel.active.guidePosition.x,g.zoneTravel.active.guidePosition.y]:[position[0]+.04,position[1]+.014];
  if(Math.hypot(guidePosition[0]-position[0],guidePosition[1]-position[1])>.12)guidePosition=[position[0]-.025,position[1]+.012];
  if(!dungeonWalkable(guidePosition,routeId,limit()))guidePosition=dungeonSnap(guidePosition,routeId,limit());
  const remember=()=>{
    if(!g.zoneTravel.active)return;
    g.zoneTravel.active.position={x:position[0],y:position[1]};g.zoneTravel.active.roamTime=enemyTime;
    if(bossGuideFollowing(g)&&guidePosition)g.zoneTravel.active.guidePosition={x:guidePosition[0],y:guidePosition[1]};
  };
  const save=()=>{remember();if(dirty){g.save?.();dirty=false;}};
  remember();
  let exitLatch=!!(dungeonStatus(g)?.ready&&dungeonAtExit(g));// standing at the gate on mount (reload / failed arrival) must step away first
  let startLatch=true;// the route begins on the start arrow: no bounce back to the post until Yama steps away and returns
  const syncBackground=status=>{
    const src=dungeonBackground(g.zone,status.route.id,status.checkpoint);
    if(src===backgroundSrc)return;
    backgroundSrc=src;loading.hidden=false;loading.textContent='กำลังโหลดฉากชายแดน…';
    if(!backgrounds.has(src)){
      const scene=new Image();backgrounds.set(src,scene);
      scene.onload=()=>{if(!destroyed&&image===scene)loading.hidden=true;};
      let fallback=false;
      scene.onerror=()=>{
        if(destroyed)return;
        if(!fallback){fallback=true;scene.src=themeBackground(g.zone,'frontier');}
        else if(image===scene)loading.textContent='โหลดภาพชายแดนไม่สำเร็จ — กลับเมืองแล้วลองใหม่';
      };
      scene.src=src;
    }
    image=backgrounds.get(src);
    if(image.complete&&image.naturalWidth)loading.hidden=true;
  };
  syncBackground(dungeonStatus(g));
  const resize=()=>{
    const rect=canvas.parentElement.getBoundingClientRect();width=Math.max(320,rect.width);height=Math.max(260,rect.height);
    const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);mini.width=180;mini.height=110;
  };
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  observer?.observe(canvas.parentElement);listen(window,'resize',resize);resize();
  const world=()=>FRONTIER_WORLD;
  function camera(dt) {
    const {x,y,scale}=frontierCameraTarget(width,height,position);
    const f=reduced.matches?1:1-Math.exp(-dt/110);cam.x+=(x-cam.x)*f;cam.y+=(y-cam.y)*f;cam.scale+=(scale-cam.scale)*f;
  }
  const screenPoint=p=>{const w=world();return [cam.x+p[0]*w.w*cam.scale,cam.y+p[1]*w.h*cam.scale];};
  // The cave talk button exists only while the boss is really drawn there (no invisible hit spot).
  const cave0=routeBossCave(routeId),challengeStandeeShown=()=>!!cave0&&!bossGuideWaiting(g)&&!bossGuideDismissed(g)&&!!g.challengeUnlocked?.()&&!g.bossCleared?.[cave0.zone];
  function update(dt) {
    const status=dungeonStatus(g);if(!status)return;
    syncBackground(status);
    enemyTime+=dt;
    const old=[...position],oldFollower=[...follower],oldGuide=[...guidePosition];
    if(g.battle||g.pendingRecovery||status.pending){target=null;keys.clear();joystick=null;pointerStart=null;}
    else if(keys.size||joystick){
      target=null;
      const dx=joystick?.[0]??((keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)),dy=joystick?.[1]??((keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0)),norm=Math.hypot(dx,dy)||1;
      position=dungeonMove(position,[position[0]+dx/norm*dt*.00012,position[1]+dy/norm*dt*.00019],routeId,limit());
    }else if(target?.length){
      const goal=target[0],dx=goal[0]-position[0],dy=goal[1]-position[1],d=Math.hypot(dx*1.79,dy),step=dt*.00019;
      if(d<=step){position=dungeonMove(position,goal,routeId,limit());target.shift();}
      else position=dungeonMove(position,[position[0]+dx/d*step,position[1]+dy/d*step],routeId,limit());
    }
    moving=Math.hypot(position[0]-old[0],position[1]-old[1])>1e-7;
    if(moving){
      const dx=position[0]-old[0],dy=position[1]-old[1];if(Math.abs(dx)>.00001)face=dx<0?-1:1;
      direction=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):(face<0?'left':'right');
      walkDistance+=Math.hypot(dx*1.79,dy)*world().h;dirty=true;remember();
      trail.push([...old]);
      // Keep a distance of history, independent of frame rate or pauses.
      let length=0,at=position;
      for(let i=trail.length-1;i>=0;i--){length+=Math.hypot(at[0]-trail[i][0],at[1]-trail[i][1]);at=trail[i];if(length>.12){trail.splice(0,i);break;}}
    }
    const follow=(from,distance,speed)=>{
      const wanted=bossGuideFollowPoint(trail,position,distance);
      const waypoint=dungeonSegmentClear(from,wanted,routeId,limit())?wanted:dungeonPath(from,wanted,routeId,limit())[0];
      if(!waypoint)return from;
      const dx=waypoint[0]-from[0],dy=waypoint[1]-from[1],d=Math.hypot(dx,dy),step=Math.min(d,dt*speed);
      return d>1e-7?dungeonMove(from,[from[0]+dx/d*step,from[1]+dy/d*step],routeId,limit()):from;
    };
    if(trail.length)follower=follow(follower,.025,.00024);
    if(bossGuideFollowing(g)&&trail.length)guidePosition=follow(guidePosition,.055,.0002);
    for(const [motion,from,to] of [[niraMotion,oldFollower,follower],[guideMotion,oldGuide,guidePosition]]){
      const dx=to[0]-from[0],dy=to[1]-from[1];motion.moving=Math.hypot(dx,dy)>1e-7;
      if(Math.abs(dx)>1e-7)motion.face=dx<0?-1:1;
      motion.distance+=Math.hypot(dx*1.79,dy)*world().h;
    }
    if(wasMoving&&!moving)save();wasMoving=moving;
    saveClock+=dt;if(dirty&&saveClock>2500){save();saveClock=0;}
    encounterCooldown=Math.max(0,encounterCooldown-dt);
    const nearby=encounterCooldown?null:dungeonAutoEncounter(g,position,enemyTime);
    if(!encounterDispatch&&nearby){
      encounterDispatch=true;target=null;keys.clear();save();queueMicrotask(()=>{if(!destroyed)onEncounter(nearby.patrol?{patrol:nearby.patrol}:{...status.route.checkpoints[nearby.checkpoint],checkpoint:nearby.checkpoint});});
    }
    root.querySelector('.dungeon-challenge').hidden=!challengeStandeeShown()||!g.challengeCanTalk?.();
    root.querySelector('.dungeon-guide').hidden=!bossGuideWaiting(g)||(cave0?Math.hypot(position[0]-point(points[cave0.checkpoint])[0],position[1]-point(points[cave0.checkpoint])[1])>.09:!dungeonCanTalkGuide(g,position));
    // O1: reaching the gate enters the land by itself (no button). Same reach the button used to need.
    const arrival=dungeonExitArrival(g,exitLatch,{destroyed});exitLatch=arrival.latched;
    if(arrival.enter){target=null;keys.clear();save();queueMicrotask(()=>{if(!destroyed)onArrival(status.route.to);});}
    // P5: walking back onto the route start returns to the frontier post (the old ← button is gone).
    const back=dungeonStartDeparture(g,startLatch,{destroyed:destroyed||arrival.enter||encounterDispatch});startLatch=back.latched;
    if(back.leave){target=null;keys.clear();save();queueMicrotask(()=>{if(!destroyed)onLeave();});}
    const text=status.ready?'ผ่านเส้นทางแล้ว — เดินไปประตูเมือง':`ผ่านด่าน ${status.defeated.length}/3 · ปีศาจลาดตระเวนที่ปราบ ${(g.zoneTravel.active.patrolDefeated||[]).length}/${dungeonPatrols(routeId).length}`;
    if(info.textContent!==text)info.textContent=text;
  }
  function render(t) {
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const w=world();
    if(image.complete&&image.naturalWidth) ctx.drawImage(image,cam.x,cam.y,w.w*cam.scale,w.h*cam.scale);
    if(isWildernessRoute(routeId)&&routeRow(routeId).ambient.trees.length+routeRow(routeId).ambient.waterfalls.length)drawFrontierAmbient(ctx,{time:t,reduced:reduced.matches,x:cam.x,y:cam.y,w:w.w*cam.scale,h:w.h*cam.scale,...routeRow(routeId).ambient,trees:[]});
    const status=dungeonStatus(g);if(!status)return;
    drawStartMarker(ctx,routeId,screenPoint,DUNGEON_START_REACH,w,cam,t,reduced.matches);
    ctx.font='bold 13px sans-serif';ctx.textAlign='center';
    // The painted road already communicates forest/waterfall/gorge/cave. Keep
    // the playfield clear of geographic captions and use the footer/minimap for progress.
    const hero=position,nira=follower;
    const actors=[{p:hero,kind:'yama'},{p:nira,kind:'nira'},...routeRow(routeId).ambient.trees.map(tree=>({p:[tree.x,tree.y],kind:'tree',tree}))];
    for(const enemy of dungeonEnemyPositions(g,enemyTime))actors.push({p:enemy.position,kind:'enemy',enemy});
    if(bossGuideWaiting(g)){actors.push({p:dungeonGuideAnchor(g),kind:'guide'});}
    else if(challengeStandeeShown()){actors.push({p:dungeonGuideAnchor(g),kind:'challenge'});}
    if(bossGuideFollowing(g))actors.push({p:guidePosition,kind:'guide',following:true});
    actors.sort((a,b)=>a.p[1]-b.p[1]).forEach(a=>{
      const p=screenPoint(a.p),h=frontierActorHeight(a.kind,cam.scale),animationTime=reduced.matches?0:t;
      if(a.kind==='tree'){drawFrontierTree(ctx,a.tree,{x:p[0],y:p[1],height:w.h*cam.scale,image:treeImages[a.tree.kind]});return;}
      ctx.fillStyle='rgba(10,8,14,.28)';ctx.beginPath();ctx.ellipse(p[0],p[1]-h*.025,h*.22,h*.065,0,0,Math.PI*2);ctx.fill();
      if(a.kind==='guide'){drawStandee(ctx,'zone-boss',p[0],p[1],h*1.15,animationTime,'👑',a.following?guideMotion.face:face,!!a.following&&guideMotion.moving,g.zone);return;}
      if(a.kind==='challenge'){drawStandee(ctx,'boss-frontier-th',p[0],p[1],h*1.15,animationTime,'👹',-1,false,g.zone);return;}
      if(a.kind==='enemy'){
        const foe=MOB.kinds[a.enemy.kindIdx]||MOB,boss=a.enemy.boss;
        const next=dungeonEnemyPositions(g,enemyTime+100).find(e=>e.id===a.enemy.id),facing=next&&next.position[0]<a.p[0]?-1:1;
        ctx.save();if(!reduced.matches&&!boss)ctx.translate(0,Math.sin(animationTime/180)*h*.012);
        drawStandee(ctx,boss?'zone-boss':foe.img,p[0],p[1],boss?h*1.75:h,animationTime,'👹',facing,false,g.zone);ctx.restore();return;
      }
      if(a.kind==='nira') {if(niraMotion.moving&&!reduced.matches&&drawCrewWalk(ctx,'crew-nira',p[0],p[1],h,niraMotion.distance,niraMotion.face))return;drawStandee(ctx,'crew-nira',p[0],p[1],h,animationTime,'📋',niraMotion.face,false,g.zone);return;}
      if(!reduced.matches&&drawHeroWalk(ctx,p[0],p[1],h,moving?walkDistance:0,face,direction))return;
      drawStandee(ctx,'hero-yama',p[0],p[1],h,animationTime,'👑',face,false,g.zone);
    });
    mc.clearRect(0,0,180,110);if(image.complete&&image.naturalWidth)mc.drawImage(image,0,0,180,110);
    mc.drawImage(miniMask,0,0,180,110);
    mc.fillStyle='#fff';mc.beginPath();mc.arc(hero[0]*180,hero[1]*110,3,0,Math.PI*2);mc.fill();
    points.forEach((v,i)=>{const p=point(v);mc.fillStyle=status.defeated.includes(status.route.checkpoints[i].id)?'#8cffad':'#ff7b71';mc.fillRect(p[0]*180-2,p[1]*110-2,4,4);});
    mc.strokeStyle='#fff9';mc.lineWidth=1;mc.strokeRect((-cam.x)/(w.w*cam.scale)*180,(-cam.y)/(w.h*cam.scale)*110,width/(w.w*cam.scale)*180,height/(w.h*cam.scale)*110);
  }
  const tick=t=>{if(destroyed)return;const dt=last?Math.min(50,t-last):16;last=t;update(dt);if(destroyed)return;camera(dt);render(t);frame=requestAnimationFrame(tick);};
  const pointerPoint=e=>{const r=canvas.getBoundingClientRect(),w=world();return [(e.clientX-r.left-cam.x)/(w.w*cam.scale),(e.clientY-r.top-cam.y)/(w.h*cam.scale)];};
  listen(canvas,'pointerdown',e=>{
    if(g.battle||g.pendingRecovery||dungeonStatus(g)?.pending)return;
    canvas.focus();canvas.setPointerCapture?.(e.pointerId);
    pointerStart={x:e.clientX,y:e.clientY,id:e.pointerId,dragged:false};
  });
  listen(canvas,'pointermove',e=>{
    if(!pointerStart||e.pointerId!==pointerStart.id)return;
    const dx=e.clientX-pointerStart.x,dy=e.clientY-pointerStart.y;
    if(Math.hypot(dx,dy)>8){pointerStart.dragged=true;target=null;joystick=[dx,dy];}
    else if(pointerStart.dragged)joystick=null;
  });
  listen(canvas,'pointerup',e=>{
    if(!pointerStart||e.pointerId!==pointerStart.id)return;
    if(!pointerStart.dragged)target=dungeonPath(position,pointerPoint(e),routeId,limit());
    pointerStart=null;joystick=null;
  });
  listen(canvas,'pointercancel',()=>{pointerStart=null;joystick=null;});
  listen(canvas,'keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);}});
  listen(window,'keyup',e=>keys.delete(e.key.toLowerCase()));
  listen(window,'blur',()=>{keys.clear();joystick=null;pointerStart=null;target=null;save();});listen(canvas,'blur',()=>{keys.clear();joystick=null;pointerStart=null;target=null;});
  listen(root.querySelector('.dungeon-guide'),'click',()=>{if(!bossGuideWaiting(g))return;target=null;keys.clear();save();onGuide();});
  listen(root.querySelector('.dungeon-challenge'),'click',()=>{if(!g.challengeCanTalk?.())return;target=null;keys.clear();save();onChallenge();});
  listen(root.querySelector('[data-action="menu"]'),'click',()=>{save();onMenu();});
  remember();frame=requestAnimationFrame(tick);canvas.focus();
  return function destroy(){if(destroyed)return;destroyed=true;save();cancelAnimationFrame(frame);observer?.disconnect();handlers.forEach(fn=>fn());backgrounds.forEach(scene=>{scene.onload=scene.onerror=null;});root.remove();};
}

/** Old active journeys can meet the newly migrated guide without leaving the route. */
export function dungeonGuideAnchor(g){
  const s=dungeonStatus(g);if(!s)return null;
  const cave=routeBossCave(s.route.id);
  const p=dungeonPoint(cave?dungeonCheckpointProgress(s.route.id)[cave.checkpoint]:0,s.route.id);
  return cave?[p[0]+cave.guide[0],p[1]+cave.guide[1]]:[p[0]+.045,p[1]-.006];
}
export function dungeonCanTalkGuide(g,position=null){
  const anchor=dungeonGuideAnchor(g),p=position||activePosition(g);
  return !!(anchor&&p&&bossGuideWaiting(g)&&!g.battle&&!g.pendingRecovery&&!dungeonStatus(g)?.pending&&Math.hypot(p[0]-anchor[0],p[1]-anchor[1])<=.09);
}

const globalDungeonPoint=dungeonPoint,globalDungeonProjection=dungeonProjection;
function mountLegacyDungeonView(container,g,{onEncounter=()=>{},onArrival=()=>{},onLeave=()=>{},onMenu=()=>{},onGuide=()=>{}}={}) {
  const routeId=dungeonStatus(g)?.route.id;
  const {corridor:DUNGEON_CORRIDOR,lengths,total}=geometry(routeId);
  const DUNGEON_PROGRESS=dungeonCheckpointProgress(routeId);
  const dungeonPoint=v=>globalDungeonPoint(v,routeId);
  const dungeonProjection=(p,max=1)=>globalDungeonProjection(p,max,routeId);
  const DUNGEON_CHECKPOINTS=DUNGEON_PROGRESS.map(v=>dungeonPoint(v));
  const DUNGEON_EXIT=dungeonPoint(1);
  const dungeonCompanionPoint=progress=>{const p=dungeonPoint(Math.max(0,progress-.055));return [p[0]-.038,Math.min(.96,p[1]+.007)];};
  if(!dungeonStatus(g)) throw new Error('An unlocked active dungeon route is required');
  const root=document.createElement('section'); root.className='dungeon-view';
  root.innerHTML=dungeonShell('คุยกับผู้ตรวจการ · กด E');
  container.append(root);
  const canvas=root.querySelector('.dungeon-stage > canvas'),mini=root.querySelector('.dungeon-minimap');
  const ctx=canvas.getContext('2d'),mc=mini.getContext('2d'),info=root.querySelector('.dungeon-status'),loading=root.querySelector('.dungeon-load');
  const guideButton=root.querySelector('.dungeon-guide');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const frontierTree=new Image();frontierTree.src='img/theme-v4/town-tree-th-v1.webp';
  let image=new Image(),backgroundSrc=null;
  const backgrounds=new Map();
  const alertArt=new Image();alertArt.src='img/ui/alert-mark.png';
  let cooldown=g.dungeonChaseCooldown?CHASE.cooldownMs:0,chase=null,chaseCheckpoint=-1,cut=0,cutFired=false,alertAt=-1;g.dungeonChaseCooldown=false;
  let guideDispatched=false;
  let destroyed=false,frame=0,last=0,progress=0,target=null,width=800,height=460,face=1,direction='up',walkDistance=0,moving=false,wasMoving=false,dirty=false,cam={x:0,y:0,scale:1},saveClock=0;
  const keys=new Set(),handlers=[];
  const listen=(node,name,fn,options)=>{node.addEventListener(name,fn,options);handlers.push(()=>node.removeEventListener(name,fn,options));};
  const limit=()=>{const s=dungeonStatus(g);return s?.ready?1:DUNGEON_PROGRESS[s?.checkpoint||0]-.018;};
  const saved=g.zoneTravel.active.position;
  progress=dungeonProjection(saved&&[saved.x,saved.y],limit()).progress;
  const remember=()=>{
    if(!g.zoneTravel.active) return;
    const p=dungeonPoint(progress); g.zoneTravel.active.position={x:p[0],y:p[1]};
  };
  const save=()=>{remember();if(dirty){g.save?.();dirty=false;}};
  remember();
  let exitLatch=!!(dungeonStatus(g)?.ready&&dungeonAtExit(g));// standing at the gate on mount (reload / failed arrival) must step away first
  let startLatch=true;// the route begins on the start arrow: no bounce back to the post until Yama steps away and returns
  const syncBackground=status=>{
    const src=dungeonBackground(g.zone,status.route.id,status.checkpoint);
    if(src===backgroundSrc)return;
    backgroundSrc=src;loading.hidden=false;loading.textContent='กำลังโหลดฉากชายแดน…';
    if(!backgrounds.has(src)){
      const scene=new Image();backgrounds.set(src,scene);
      scene.onload=()=>{if(!destroyed&&image===scene)loading.hidden=true;};
      let fallback=false;
      scene.onerror=()=>{
        if(destroyed)return;
        if(!fallback){fallback=true;scene.src=themeBackground(g.zone,'frontier');}
        else if(image===scene)loading.textContent='โหลดภาพชายแดนไม่สำเร็จ — กลับเมืองแล้วลองใหม่';
      };
      scene.src=src;
    }
    image=backgrounds.get(src);
    if(image.complete&&image.naturalWidth)loading.hidden=true;
  };
  syncBackground(dungeonStatus(g));
  const resize=()=>{
    const rect=canvas.parentElement.getBoundingClientRect();width=Math.max(320,rect.width);height=Math.max(260,rect.height);
    const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
    ctx.setTransform(dpr,0,0,dpr,0,0);mini.width=180;mini.height=110;
  };
  const observer=typeof ResizeObserver!=='undefined'?new ResizeObserver(resize):null;
  observer?.observe(canvas.parentElement);listen(window,'resize',resize);resize();
  const world=()=>({w:Math.max(width,height*1.79),h:Math.max(height,width/1.79)});
  function camera(dt) {
    const p=dungeonPoint(progress),w=world(),scale=1.9;
    const x=clamp(width/2-p[0]*w.w*scale,width-w.w*scale,0);
    const y=clamp(height*.6-p[1]*w.h*scale,height-w.h*scale,0);
    const f=reduced.matches?1:1-Math.exp(-dt/110);cam.x+=(x-cam.x)*f;cam.y+=(y-cam.y)*f;cam.scale+=(scale-cam.scale)*f;
  }
  const screenPoint=p=>{const w=world();return [cam.x+p[0]*w.w*cam.scale,cam.y+p[1]*w.h*cam.scale];};
  function update(dt) {
    const status=dungeonStatus(g);if(!status)return;
    syncBackground(status);
    const old=progress; const max=limit();
    if(g.battle||g.pendingRecovery||status.pending||cut>0) {target=null;keys.clear();}
    else if(keys.size) {
      target=null;const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0);
      const dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0);
      const p=dungeonPoint(progress),norm=Math.hypot(dx,dy)||1;
      progress=dungeonProjection([p[0]+dx/norm*dt*.00019,p[1]+dy/norm*dt*.00019],max).progress;
    } else if(target!==null) {
      const step=dt*.00019/total,diff=target-progress;
      if(Math.abs(diff)<=step){progress=target;target=null;}else progress+=Math.sign(diff)*step;
    }
    progress=clamp(progress,0,max);moving=Math.abs(progress-old)>1e-7;
    if(moving){const a=dungeonPoint(old),b=dungeonPoint(progress);if(Math.abs(b[0]-a[0])>.00001)face=b[0]<a[0]?-1:1;direction=Math.abs(b[1]-a[1])>Math.abs(b[0]-a[0])?(b[1]<a[1]?'up':'down'):(face<0?'left':'right');walkDistance+=Math.abs(progress-old)*total*world().h;dirty=true;remember();}
    if(wasMoving&&!moving)save();wasMoving=moving;
    // L5: the checkpoint enemy notices Yama, walks the corridor toward them and starts the battle on contact.
    if(!status.ready){
      if(!chase||chaseCheckpoint!==status.checkpoint){chaseCheckpoint=status.checkpoint;chase=newChase(DUNGEON_PROGRESS[status.checkpoint]*total);}
      const locked=!!(g.battle||g.pendingRecovery||status.pending);
      const ev=stepChase(chase,progress*total,dt,{hold:locked||cooldown>0||cut>0});
      if(cooldown>0)cooldown=Math.max(0,cooldown-dt);
      if(ev==='alert')alertAt=performance.now();
      if(ev==='contact'){target=null;keys.clear();save();cut=.001;}
      else if(cut>0){cut+=dt;if(cut>=CHASE.transitionMs&&!cutFired){cutFired=true;onEncounter(status.location,{chased:true});return;}}
    }
    saveClock+=dt;if(dirty&&saveClock>2500){save();saveClock=0;}
    guideButton.hidden=!dungeonCanTalkGuide(g,dungeonPoint(progress));
    const arrival=dungeonExitArrival(g,exitLatch,{cut,destroyed});exitLatch=arrival.latched;
    if(arrival.enter){target=null;keys.clear();save();queueMicrotask(()=>{if(!destroyed)onArrival(status.route.to);});}
    const back=dungeonStartDeparture(g,startLatch,{cut,destroyed:destroyed||arrival.enter||guideDispatched});startLatch=back.latched;
    if(back.leave){target=null;keys.clear();save();queueMicrotask(()=>{if(!destroyed)onLeave();});}
    const text=bossGuideWaiting(g)?'ผู้ตรวจการรอที่ทางเข้าเส้นทางชายแดน · ย้อนกลับไปคุยเพื่อออกเดินทางด้วยกัน':status.ready?'ผ่านเส้นทางแล้ว — เดินไปประตูเมือง':`กำจัดปีศาจ ${status.checkpoint}/3`;
    if(info.textContent!==text)info.textContent=text;
  }
  function render(t) {
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const w=world();
    if(image.complete&&image.naturalWidth) ctx.drawImage(image,cam.x,cam.y,w.w*cam.scale,w.h*cam.scale);
    const status=dungeonStatus(g);if(!status)return;
    drawStartMarker(ctx,routeId,screenPoint,DUNGEON_START_REACH,w,cam,t,reduced.matches);
    // Labels identify actual route places; scenery comes from raster art.
    ctx.font='bold 13px sans-serif';ctx.textAlign='center';
    DUNGEON_PROGRESS.forEach((value,i)=>{
      const p=screenPoint(dungeonPoint(value));ctx.fillStyle=i<status.checkpoint?'#aeeab8':'#ffe2a0';
      ctx.fillText(`${i<status.checkpoint?'✓ ':''}${status.route.checkpoints[i].name}`,p[0],p[1]+23);
    });
    const hero=dungeonPoint(progress),nira=dungeonCompanionPoint(progress);
    const actors=[{p:hero,kind:'yama'},{p:nira,kind:'nira'}];
    if(bossGuideWaiting(g))actors.push({p:dungeonGuideAnchor(g),kind:'guide',following:false});
    if(bossGuideFollowing(g))actors.push({p:dungeonPoint(Math.max(0,progress-.09)),kind:'guide',following:true});
    if(!status.ready){const at=dungeonPoint(chase?chase.s/total:DUNGEON_PROGRESS[status.checkpoint]);actors.push({p:[at[0]-.028,at[1]],kind:'enemy'});}
    actors.sort((a,b)=>a.p[1]-b.p[1]).forEach(a=>{
      const p=screenPoint(a.p),h=w.h*cam.scale*.092,animationTime=reduced.matches?0:t;
      ctx.fillStyle='rgba(10,8,14,.28)';ctx.beginPath();ctx.ellipse(p[0],p[1]-h*.025,h*.22,h*.065,0,0,Math.PI*2);ctx.fill();
      if(a.kind==='guide'){drawStandee(ctx,'zone-boss',p[0],p[1],h*1.15,animationTime,'👑',face,!!a.following&&moving,g.zone);if(!a.following){ctx.fillStyle='#ffe2a0';ctx.fillText('ผู้ตรวจการ · คุยเพื่อออกเดินทาง',p[0],p[1]+21);}return;}
      if(a.kind==='enemy'){const foe=MOB.kinds[status.location.foe]||MOB;drawStandee(ctx,foe.img,p[0],p[1],h*1.15,animationTime,'👹',1,false,g.zone);
        if(chase&&chaseAlerted(chase)){const bob=reduced.matches?0:Math.sin((t-alertAt)/90)*3;ctx.save();if(alertArt.complete&&alertArt.naturalWidth){ctx.drawImage(alertArt,p[0]-17,p[1]-h*1.15-35+bob,34,34);ctx.restore();}else{ctx.font='bold 26px sans-serif';ctx.textAlign='center';ctx.lineWidth=4;ctx.strokeStyle='#2a0d10';ctx.fillStyle='#ff4a3d';ctx.strokeText('❗',p[0],p[1]-h*1.15-8+bob);ctx.fillText('❗',p[0],p[1]-h*1.15-8+bob);ctx.restore();}}
        return;}
      if(a.kind==='nira') {if(moving&&!reduced.matches&&drawCrewWalk(ctx,'crew-nira',p[0],p[1],h,walkDistance,face))return;drawStandee(ctx,'crew-nira',p[0],p[1],h,animationTime,'📋',face,false,g.zone);return;}
      if(!reduced.matches&&drawHeroWalk(ctx,p[0],p[1],h,moving?walkDistance:0,face,direction))return;
      drawStandee(ctx,'hero-yama',p[0],p[1],h,animationTime,'👑',face,false,g.zone);
    });
    const exit=screenPoint(dungeonPoint(1));ctx.fillStyle=status.ready?'#d8ffbc':'#d4b688';ctx.fillText(status.ready?'ประตูเมือง — เดินเข้ามาใกล้':'ประตูเมืองยังปิด',exit[0],exit[1]-14);
    if(cut>0){const k=Math.min(1,cut/CHASE.transitionMs);ctx.fillStyle=`rgba(20,6,10,${(k*.92).toFixed(3)})`;ctx.fillRect(0,0,width,height);if(!reduced.matches&&k<.35){ctx.fillStyle=`rgba(255,236,200,${((.35-k)*1.4).toFixed(3)})`;ctx.fillRect(0,0,width,height);}}
    mc.clearRect(0,0,180,110);if(image.complete&&image.naturalWidth)mc.drawImage(image,0,0,180,110);
    mc.strokeStyle='#ffd27a';mc.lineWidth=2;mc.beginPath();DUNGEON_CORRIDOR.forEach((p,i)=>i?mc.lineTo(p[0]*180,p[1]*110):mc.moveTo(p[0]*180,p[1]*110));mc.stroke();
    mc.fillStyle='#fff';mc.beginPath();mc.arc(hero[0]*180,hero[1]*110,3,0,Math.PI*2);mc.fill();
    DUNGEON_PROGRESS.forEach((v,i)=>{const p=dungeonPoint(v);mc.fillStyle=i<status.checkpoint?'#8cffad':'#ff7b71';mc.fillRect(p[0]*180-2,p[1]*110-2,4,4);});
    mc.strokeStyle='#fff9';mc.lineWidth=1;mc.strokeRect((-cam.x)/(w.w*cam.scale)*180,(-cam.y)/(w.h*cam.scale)*110,width/(w.w*cam.scale)*180,height/(w.h*cam.scale)*110);
  }
  const tick=t=>{if(destroyed)return;const dt=last?Math.min(50,t-last):16;last=t;update(dt);camera(dt);render(t);frame=requestAnimationFrame(tick);};
  listen(canvas,'pointerdown',e=>{
    if(g.battle||g.pendingRecovery||dungeonStatus(g)?.pending||cut>0)return;
    canvas.focus();const r=canvas.getBoundingClientRect(),w=world();
    const p=[(e.clientX-r.left-cam.x)/(w.w*cam.scale),(e.clientY-r.top-cam.y)/(w.h*cam.scale)];
    const projected=dungeonProjection(p,limit());if(projected.distance<=.12)target=projected.progress;
  });
  const talkGuide=()=>{if(guideDispatched||cut>0||!dungeonCanTalkGuide(g,dungeonPoint(progress)))return;guideDispatched=true;target=null;keys.clear();save();onGuide();};
  listen(guideButton,'click',talkGuide);
  listen(canvas,'keydown',e=>{const k=e.key.toLowerCase();if(k==='e'&&!e.repeat){e.preventDefault();talkGuide();return;}if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();if(!cut)keys.add(k);}});
  listen(window,'keyup',e=>keys.delete(e.key.toLowerCase()));
  listen(window,'blur',()=>{keys.clear();target=null;save();});listen(canvas,'blur',()=>{keys.clear();target=null;});
  listen(root.querySelector('[data-action="menu"]'),'click',()=>{if(cut>0)return;save();onMenu();});
  remember();frame=requestAnimationFrame(tick);canvas.focus();
  return function destroy(){if(destroyed)return;destroyed=true;save();cancelAnimationFrame(frame);observer?.disconnect();handlers.forEach(fn=>fn());backgrounds.forEach(scene=>{scene.onload=scene.onerror=null;});root.remove();};
}

export function mountDungeonView(container,g,options={}) {
  return isWildernessRoute(dungeonStatus(g)?.route.id)?mountWildernessView(container,g,options):mountLegacyDungeonView(container,g,options);
}
