import {drawFrontierAmbient} from './frontier-ambient.js';
import {bossGuideWaiting,bossGuideFollowing,bossGuideFollowPoint} from './boss-guides.js';
import { dungeonStatus } from './zone-travel.js';
import { themeBackground } from './theme-assets.js';
import { dungeonBackground } from './dungeon-art.js';
import { drawHeroWalk, drawCrewWalk, drawStandee } from './art.js';
import { MOB } from './data.js';
import { CHASE, newChase, stepChase, chaseAlerted, chaseInReach } from './dungeon-chase.js?v=l5';

// A continuous trail aligned to the authored zone 1–2 map. Other routes keep
// their original vertical corridors and backgrounds.
export const DUNGEON_CORRIDOR = Object.freeze([[.12,.22],[.19,.25],[.21,.28],[.20,.31],[.26,.33],[.32,.38],[.37,.43],[.42,.43],[.47,.40],[.48,.36],[.54,.35],[.59,.34],[.63,.39],[.69,.43],[.74,.47],[.79,.51],[.77,.55],[.74,.58],[.72,.62],[.67,.63],[.63,.64],[.60,.68],[.58,.72],[.53,.75],[.62,.77],[.67,.80],[.72,.85],[.78,.87],[.84,.85],[.88,.80],[.91,.79]].map(Object.freeze));
const LEGACY_CORRIDOR = [[.5,.925],[.5,.78],[.43,.65],[.53,.49],[.48,.35],[.5,.19]];
const geometryCache=new Map();
const geometry = (routeId='th:asia') => {
  const key=routeId==='th:asia'?'th:asia':'legacy';
  if(geometryCache.has(key))return geometryCache.get(key);
  const corridor=routeId==='th:asia'?DUNGEON_CORRIDOR:LEGACY_CORRIDOR;
  const lengths=corridor.slice(1).map((p,i)=>Math.hypot(p[0]-corridor[i][0],p[1]-corridor[i][1]));
  const result={corridor,lengths,total:lengths.reduce((a,b)=>a+b,0)};geometryCache.set(key,result);return result;
};
const {lengths,total}=geometry();
export const DUNGEON_TOTAL=total;
export const dungeonRouteTotal=routeId=>geometry(routeId).total;
export const DUNGEON_PROGRESS = Object.freeze([7,15,23].map(i=>lengths.slice(0,i).reduce((a,b)=>a+b,0)/total));
export const dungeonCheckpointProgress = routeId => routeId==='th:asia'?DUNGEON_PROGRESS:[.25,.52,.79];
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
// to the centerline during movement; the line only guides click pathfinding.
export function dungeonWalkable(p,routeId='th:asia') {
  if(!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p.some(v=>v<.02||v>.98))return false;
  if(dungeonProjection(p,1,routeId).distance<=.026)return true;
  if(routeId!=='th:asia')return false;
  return [[.12,.22,.052,.036],[.26,.33,.062,.035],[.42,.43,.042,.028],[.53,.75,.085,.042],[.91,.79,.042,.033]].some(([x,y,rx,ry])=>((p[0]-x)/rx)**2+((p[1]-y)/ry)**2<=1);
}
export function dungeonSegmentClear(a,b,routeId='th:asia') {
  const steps=Math.max(1,Math.ceil(Math.hypot(b[0]-a[0],b[1]-a[1])/.004));
  for(let i=0;i<=steps;i++)if(!dungeonWalkable([a[0]+(b[0]-a[0])*i/steps,a[1]+(b[1]-a[1])*i/steps],routeId))return false;
  return true;
}
export function dungeonMove(from,to,routeId='th:asia') {
  if(dungeonSegmentClear(from,to,routeId))return to;
  const x=[to[0],from[1]],y=[from[0],to[1]];
  if(dungeonSegmentClear(from,x,routeId))return x;
  if(dungeonSegmentClear(from,y,routeId))return y;
  return from;
}
export function dungeonPath(from,to,routeId='th:asia') {
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
  const s=dungeonStatus(g);if(!s||s.ready)return [];
  return s.route.checkpoints.flatMap((location,index)=>{
    if(s.defeated.includes(location.id))return [];
    const anchor=dungeonPoint(dungeonCheckpointProgress(s.route.id)[index],s.route.id),phase=(Number.isFinite(time)?time:0)/1700+index*2;
    const p=[anchor[0]+Math.sin(phase)*.009,anchor[1]+Math.cos(phase*.8)*.006];
    const boss=s.route.id==='th:asia'&&index===2&&!g.bossCleared?.th;
    const locked=s.route.id==='th:asia'&&index===2&&(s.checkpoint<2||boss&&g.zoneEvents?.th?.thBorderBoss!=='pending');
    return [{id:location.id,checkpoint:index,kindIdx:location.foe,boss,locked,position:dungeonWalkable(p,s.route.id)?p:anchor}];
  });
}
export function dungeonAutoEncounter(g,position,time=0) {
  const s=dungeonStatus(g);
  if(!s||s.ready||s.pending||g.battle||g.pendingRecovery)return null;
  return dungeonEnemyPositions(g,time).find(enemy=>!enemy.locked&&Math.hypot(position[0]-enemy.position[0],position[1]-enemy.position[1])<=.032&&Math.hypot(position[0]-dungeonPoint(dungeonCheckpointProgress(s.route.id)[enemy.checkpoint],s.route.id)[0],position[1]-dungeonPoint(dungeonCheckpointProgress(s.route.id)[enemy.checkpoint],s.route.id)[1])<=.045)||null;
}

// Give Nira a lateral lane even at the entry, where follow progress is clamped to zero.
export function dungeonCompanionPoint(progress,routeId='th:asia') {
  const p=dungeonPoint(Math.max(0,progress-.055),routeId);
  return [p[0]-.038,Math.min(.96,p[1]+.007)];
}

export function dungeonChaseReach(g) {
  const s=dungeonStatus(g),p=activePosition(g);if(!s||s.ready||!p)return false;
  const t=geometry(s.route.id).total;
  return chaseInReach(dungeonCheckpointProgress(s.route.id)[s.checkpoint]*t,dungeonProjection(p,1,s.route.id).progress*t);
}
/** Mount inside a dialog/panel. All city player coordinates remain untouched. */
function mountWildernessView(container,g,{onEncounter=()=>{},onArrival=()=>{},onLeave=()=>{},onMenu=()=>{},onChallenge=()=>{},onGuide=()=>{}}={}) {
  if(!dungeonStatus(g)) throw new Error('An unlocked active dungeon route is required');
  const routeId=dungeonStatus(g).route.id,points=dungeonCheckpointProgress(routeId);
  const {total,corridor}=geometry(routeId);
  const point=v=>dungeonPoint(v,routeId);
  const root=document.createElement('section'); root.className='dungeon-view';
  root.innerHTML='<header class="dungeon-toolbar"><button type="button" data-action="leave">← กลับด่านชายแดน</button><strong></strong><button type="button" data-action="overview" aria-pressed="false">ดูทั้งเส้นทาง</button><button type="button" data-action="menu">เมนู</button></header><div class="dungeon-stage"><canvas tabindex="0" aria-label="เส้นทางดันเจี้ยน เดินด้วย WASD หรือปุ่มลูกศร หรือคลิกจุดหมาย"></canvas><canvas class="dungeon-minimap" aria-label="แผนที่ย่อเส้นทาง"></canvas><p class="dungeon-load" role="status">กำลังโหลดฉากชายแดน…</p></div><footer><button type="button" class="dungeon-guide" hidden>คุยกับผู้ตรวจการ · ออกเดินทาง</button><button type="button" class="dungeon-challenge" hidden>ประลองบอสชายแดนในถ้ำ</button><p class="dungeon-status" aria-live="polite"></p><button type="button" class="dungeon-interact" disabled>เดินไปหาศัตรู</button><small>คลิก/แตะเพื่อเดิน · WASD / ลูกศร · เข้าใกล้ปีศาจเพื่อเริ่มต่อสู้อัตโนมัติ · เดินเข้าประตูเมื่อผ่านถ้ำแล้ว</small></footer>';
  container.append(root);
  const canvas=root.querySelector('.dungeon-stage > canvas'),mini=root.querySelector('.dungeon-minimap');
  const ctx=canvas.getContext('2d'),mc=mini.getContext('2d'),info=root.querySelector('.dungeon-status'),action=root.querySelector('.dungeon-interact'),loading=root.querySelector('.dungeon-load');
  const heading=root.querySelector('strong'),overviewButton=root.querySelector('[data-action="overview"]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const frontierTree=new Image();frontierTree.src='img/theme-v4/town-tree-th-v1.webp';
  let image=new Image(),backgroundSrc=null;
  const backgrounds=new Map();
  let destroyed=false,frame=0,last=0,target=null,position=null,follower=null,trail=[],guideTrail=[],guidePosition=null,enemyTime=Number.isFinite(g.zoneTravel.active.roamTime)?g.zoneTravel.active.roamTime:0,encounterDispatch=false,overview=false,width=800,height=460,face=1,direction='up',walkDistance=0,moving=false,wasMoving=false,dirty=false,cam={x:0,y:0,scale:1},saveClock=0;
  const keys=new Set(),handlers=[];
  const listen=(node,name,fn,options)=>{node.addEventListener(name,fn,options);handlers.push(()=>node.removeEventListener(name,fn,options));};
  const saved=g.zoneTravel.active.position;
  position=saved&&dungeonWalkable([saved.x,saved.y],routeId)?[saved.x,saved.y]:point(0);
  follower=[position[0]-.018,position[1]+.008];
  guidePosition=g.zoneTravel.active.guidePosition?[g.zoneTravel.active.guidePosition.x,g.zoneTravel.active.guidePosition.y]:[position[0]+.04,position[1]+.014];
  if(Math.hypot(guidePosition[0]-position[0],guidePosition[1]-position[1])>.12)guidePosition=[position[0]-.025,position[1]+.012];
  if(!dungeonWalkable(guidePosition,routeId))guidePosition=dungeonProjection(guidePosition,1,routeId).point;
  const remember=()=>{
    if(!g.zoneTravel.active)return;
    g.zoneTravel.active.position={x:position[0],y:position[1]};g.zoneTravel.active.roamTime=enemyTime;
    if(bossGuideFollowing(g)&&guidePosition)g.zoneTravel.active.guidePosition={x:guidePosition[0],y:guidePosition[1]};
  };
  const save=()=>{remember();if(dirty){g.save?.();dirty=false;}};
  remember();
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
    const p=position,w=world(),scale=overview?Math.min(width/w.w,height/w.h):1.55;
    const x=overview?(width-w.w*scale)/2:clamp(width/2-p[0]*w.w*scale,width-w.w*scale,0);
    const y=overview?(height-w.h*scale)/2:clamp(height*.6-p[1]*w.h*scale,height-w.h*scale,0);
    const f=reduced.matches?1:1-Math.exp(-dt/110);cam.x+=(x-cam.x)*f;cam.y+=(y-cam.y)*f;cam.scale+=(scale-cam.scale)*f;
  }
  const screenPoint=p=>{const w=world();return [cam.x+p[0]*w.w*cam.scale,cam.y+p[1]*w.h*cam.scale];};
  function update(dt) {
    const status=dungeonStatus(g);if(!status)return;
    syncBackground(status);
    enemyTime+=dt;
    const old=[...position];
    if(g.battle||g.pendingRecovery||status.pending){target=null;keys.clear();}
    else if(keys.size){
      target=null;
      const dx=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0),dy=(keys.has('s')||keys.has('arrowdown')?1:0)-(keys.has('w')||keys.has('arrowup')?1:0),norm=Math.hypot(dx,dy)||1;
      position=dungeonMove(position,[position[0]+dx/norm*dt*.00012,position[1]+dy/norm*dt*.00019],routeId);
    }else if(target?.length){
      const goal=target[0],dx=goal[0]-position[0],dy=goal[1]-position[1],d=Math.hypot(dx*1.79,dy),step=dt*.00019;
      if(d<=step){position=dungeonMove(position,goal,routeId);target.shift();}
      else position=dungeonMove(position,[position[0]+dx/d*step,position[1]+dy/d*step],routeId);
    }
    moving=Math.hypot(position[0]-old[0],position[1]-old[1])>1e-7;
    if(moving){
      const dx=position[0]-old[0],dy=position[1]-old[1];if(Math.abs(dx)>.00001)face=dx<0?-1:1;
      direction=Math.abs(dy)>Math.abs(dx)?(dy<0?'up':'down'):(face<0?'left':'right');
      walkDistance+=Math.hypot(dx*1.79,dy)*world().h;dirty=true;remember();
      trail.push([...old]);if(trail.length>100)trail.shift();
      guideTrail.push([...old]);if(guideTrail.length>350)guideTrail.shift();
    }
    if(trail.length){const next=trail[0],distance=Math.hypot(position[0]-next[0],position[1]-next[1]);if(distance>.025){const dx=next[0]-follower[0],dy=next[1]-follower[1],d=Math.hypot(dx,dy),step=Math.min(d,dt*.00024);if(d>.001)follower=dungeonMove(follower,[follower[0]+dx/d*step,follower[1]+dy/d*step],routeId);if(d<.009)trail.shift();}}
    if(bossGuideFollowing(g)&&guideTrail.length){
      const wanted=bossGuideFollowPoint(guideTrail,position),dx=wanted[0]-guidePosition[0],dy=wanted[1]-guidePosition[1],d=Math.hypot(dx,dy);
      if(d>.004){
        const step=Math.min(d,dt*.0002),next=[guidePosition[0]+dx/d*step,guidePosition[1]+dy/d*step];
        if(dungeonSegmentClear(guidePosition,next,routeId))guidePosition=next;
        else{const route=dungeonPath(guidePosition,wanted,routeId),waypoint=route[0];if(waypoint){const wx=waypoint[0]-guidePosition[0],wy=waypoint[1]-guidePosition[1],wd=Math.hypot(wx,wy)||1;guidePosition=dungeonMove(guidePosition,[guidePosition[0]+wx/wd*Math.min(step,wd),guidePosition[1]+wy/wd*Math.min(step,wd)],routeId);}}
      }
    }
    if(wasMoving&&!moving)save();wasMoving=moving;
    saveClock+=dt;if(dirty&&saveClock>2500){save();saveClock=0;}
    const nearby=dungeonAutoEncounter(g,position,enemyTime);
    if(!encounterDispatch&&nearby){
      encounterDispatch=true;target=null;keys.clear();save();queueMicrotask(()=>{if(!destroyed)onEncounter({...status.route.checkpoints[nearby.checkpoint],checkpoint:nearby.checkpoint});});
    }
    heading.textContent=status.route.name;
    root.querySelector('.dungeon-challenge').hidden=routeId!=='th:asia'||bossGuideWaiting(g)||!g.challengeCanTalk?.();
    root.querySelector('.dungeon-guide').hidden=!bossGuideWaiting(g)||Math.hypot(position[0]-point(points[2])[0],position[1]-point(points[2])[1])>.09;
    const near=status.ready?dungeonAtExit(g):dungeonAtCheckpoint(g);
    action.hidden=!status.ready;
    action.disabled=!near||!!(g.battle||g.pendingRecovery||status.pending)||(routeId==='th:asia'&&status.checkpoint===2&&!g.bossCleared.th&&g.zoneEvents?.th?.thBorderBoss!=='pending');
    action.textContent=status.ready?(routeId==='th:asia'?'เข้าประตูโซน 2':'เข้าเมืองถัดไป'):status.pending?'กำลังต่อสู้…':routeId==='th:asia'&&status.checkpoint===2&&!g.bossCleared.th&&!['pending','active'].includes(g.zoneEvents?.th?.thBorderBoss)?'บอสโซน 1 · กลับไปผ่านคดีที่ 10 ก่อน':near?(routeId==='th:asia'&&status.checkpoint===2&&!g.bossCleared.th?'ท้าสู้บอสในถ้ำ':'เริ่มต่อสู้'):'เดินไปหาศัตรู';
    const text=status.ready?'ผ่านดันเจี้ยนแล้ว — เดินไปประตูเมือง':`กำจัดปีศาจ ${status.defeated.length}/3 · ${status.location.name}`;
    if(info.textContent!==text)info.textContent=text;
  }
  function render(t) {
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const w=world();
    if(image.complete&&image.naturalWidth) ctx.drawImage(image,cam.x,cam.y,w.w*cam.scale,w.h*cam.scale);
    if(routeId==='th:asia')drawFrontierAmbient(ctx,{time:t,reduced:reduced.matches,x:cam.x,y:cam.y,w:w.w*cam.scale,h:w.h*cam.scale,tree:frontierTree});
    const status=dungeonStatus(g);if(!status)return;
    ctx.font='bold 13px sans-serif';ctx.textAlign='center';
    // The painted road already communicates forest/waterfall/gorge/cave. Keep
    // the playfield clear of geographic captions and use the footer/minimap for progress.
    const hero=position,nira=follower;
    const actors=[{p:hero,kind:'yama'},{p:nira,kind:'nira'}];
    for(const enemy of dungeonEnemyPositions(g,enemyTime))actors.push({p:enemy.position,kind:'enemy',enemy});
    if(routeId==='th:asia'&&bossGuideWaiting(g)){const cave=point(points[2]);actors.push({p:[cave[0]+.055,cave[1]+.01],kind:'guide'});}
    else if(routeId==='th:asia'&&g.challengeUnlocked?.()&&!g.bossCleared?.th){const cave=point(points[2]);actors.push({p:[cave[0]+.055,cave[1]+.01],kind:'challenge'});}
    if(bossGuideFollowing(g))actors.push({p:guidePosition,kind:'guide',following:true});
    actors.sort((a,b)=>a.p[1]-b.p[1]).forEach(a=>{
      const p=screenPoint(a.p),h=w.h*cam.scale*.060,animationTime=reduced.matches?0:t;
      ctx.fillStyle='rgba(10,8,14,.28)';ctx.beginPath();ctx.ellipse(p[0],p[1]-h*.025,h*.22,h*.065,0,0,Math.PI*2);ctx.fill();
      if(a.kind==='guide'){drawStandee(ctx,'zone-boss',p[0],p[1],h*1.15,animationTime,'👑',face,!!a.following&&moving,g.zone);return;}
      if(a.kind==='challenge'){drawStandee(ctx,'boss-frontier-th',p[0],p[1],h*1.15,animationTime,'👹',-1,false,g.zone);return;}
      if(a.kind==='enemy'){const foe=MOB.kinds[a.enemy.kindIdx]||MOB;const boss=a.enemy.boss;drawStandee(ctx,boss?'zone-boss':foe.img,p[0],p[1],boss?h*1.75:h,animationTime,'👹',1,true,g.zone);return;}
      if(a.kind==='nira') {if(moving&&!reduced.matches&&drawCrewWalk(ctx,'crew-nira',p[0],p[1],h,walkDistance,face))return;drawStandee(ctx,'crew-nira',p[0],p[1],h,animationTime,'📋',face,false,g.zone);return;}
      if(!reduced.matches&&drawHeroWalk(ctx,p[0],p[1],h,moving?walkDistance:0,face,direction))return;
      drawStandee(ctx,'hero-yama',p[0],p[1],h,animationTime,'👑',face,false,g.zone);
    });
    mc.clearRect(0,0,180,110);if(image.complete&&image.naturalWidth)mc.drawImage(image,0,0,180,110);
    mc.strokeStyle='#ffd27a';mc.lineWidth=2;mc.beginPath();corridor.forEach((p,i)=>i?mc.lineTo(p[0]*180,p[1]*110):mc.moveTo(p[0]*180,p[1]*110));mc.stroke();
    mc.fillStyle='#fff';mc.beginPath();mc.arc(hero[0]*180,hero[1]*110,3,0,Math.PI*2);mc.fill();
    points.forEach((v,i)=>{const p=point(v);mc.fillStyle=status.defeated.includes(status.route.checkpoints[i].id)?'#8cffad':'#ff7b71';mc.fillRect(p[0]*180-2,p[1]*110-2,4,4);});
    mc.strokeStyle='#fff9';mc.lineWidth=1;mc.strokeRect((-cam.x)/(w.w*cam.scale)*180,(-cam.y)/(w.h*cam.scale)*110,width/(w.w*cam.scale)*180,height/(w.h*cam.scale)*110);
  }
  const tick=t=>{if(destroyed)return;const dt=last?Math.min(50,t-last):16;last=t;update(dt);if(destroyed)return;camera(dt);render(t);frame=requestAnimationFrame(tick);};
  listen(canvas,'pointerdown',e=>{
    if(g.battle||g.pendingRecovery||dungeonStatus(g)?.pending)return;
    canvas.focus();const r=canvas.getBoundingClientRect(),w=world();
    const p=[(e.clientX-r.left-cam.x)/(w.w*cam.scale),(e.clientY-r.top-cam.y)/(w.h*cam.scale)];
    target=dungeonPath(position,p,routeId);
  });
  listen(canvas,'keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k);}});
  listen(window,'keyup',e=>keys.delete(e.key.toLowerCase()));
  listen(window,'blur',()=>{keys.clear();target=null;save();});listen(canvas,'blur',()=>{keys.clear();target=null;});
  listen(root.querySelector('.dungeon-guide'),'click',()=>{if(!bossGuideWaiting(g))return;target=null;keys.clear();save();onGuide();});
  listen(root.querySelector('.dungeon-challenge'),'click',()=>{if(!g.challengeCanTalk?.())return;target=null;keys.clear();save();onChallenge();});
  listen(action,'click',()=>{
    const s=dungeonStatus(g);if(!s||g.battle||g.pendingRecovery||s.pending||!(s.ready?dungeonAtExit(g):dungeonAtCheckpoint(g)))return;
    target=null;keys.clear();save();if(s.ready)onArrival(s.route.to);else onEncounter(s.location);
  });
  listen(root.querySelector('[data-action="leave"]'),'click',()=>{if(g.battle||dungeonStatus(g)?.pending)return;save();onLeave();});
  listen(overviewButton,'click',()=>{overview=!overview;overviewButton.setAttribute('aria-pressed',String(overview));overviewButton.textContent=overview?'ตาม Yama':'ดูทั้งเส้นทาง';});
  listen(root.querySelector('[data-action="menu"]'),'click',()=>{save();onMenu();});
  remember();frame=requestAnimationFrame(tick);canvas.focus();
  return function destroy(){if(destroyed)return;destroyed=true;save();cancelAnimationFrame(frame);observer?.disconnect();handlers.forEach(fn=>fn());backgrounds.forEach(scene=>{scene.onload=scene.onerror=null;});root.remove();};
}

/** Old active journeys can meet the newly migrated guide without leaving the route. */
export function dungeonGuideAnchor(g){
  const s=dungeonStatus(g);if(!s)return null;
  const p=dungeonPoint(s.route.id==='th:asia'?dungeonCheckpointProgress(s.route.id)[2]:0,s.route.id);
  return s.route.id==='th:asia'?[p[0]+.055,p[1]+.01]:[p[0]+.045,p[1]-.006];
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
  root.innerHTML='<header class="dungeon-toolbar"><button type="button" data-action="leave">← กลับเมือง</button><strong></strong><button type="button" data-action="overview" aria-pressed="false">ดูทั้งเส้นทาง</button><button type="button" data-action="menu">เมนู</button></header><div class="dungeon-stage"><canvas tabindex="0" aria-label="เส้นทางดันเจี้ยน เดินด้วย WASD หรือปุ่มลูกศร หรือคลิกจุดหมาย"></canvas><canvas class="dungeon-minimap" aria-label="แผนที่ย่อเส้นทาง"></canvas><p class="dungeon-load" role="status">กำลังโหลดฉากชายแดน…</p></div><footer><button type="button" class="dungeon-guide" hidden>คุยกับผู้ตรวจการ · กด E</button><p class="dungeon-status" aria-live="polite"></p><button type="button" class="dungeon-interact" disabled>เดินไปหาศัตรู</button><small>คลิก/แตะเพื่อเดิน · WASD / ลูกศร · ต้องเข้าใกล้ศัตรูและประตู</small></footer>';
  container.append(root);
  const canvas=root.querySelector('.dungeon-stage > canvas'),mini=root.querySelector('.dungeon-minimap');
  const ctx=canvas.getContext('2d'),mc=mini.getContext('2d'),info=root.querySelector('.dungeon-status'),action=root.querySelector('.dungeon-interact'),loading=root.querySelector('.dungeon-load');
  const guideButton=root.querySelector('.dungeon-guide');
  const heading=root.querySelector('strong'),overviewButton=root.querySelector('[data-action="overview"]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const frontierTree=new Image();frontierTree.src='img/theme-v4/town-tree-th-v1.webp';
  let image=new Image(),backgroundSrc=null;
  const backgrounds=new Map();
  const alertArt=new Image();alertArt.src='img/ui/alert-mark.png';
  let cooldown=g.dungeonChaseCooldown?CHASE.cooldownMs:0,chase=null,chaseCheckpoint=-1,cut=0,cutFired=false,alertAt=-1;g.dungeonChaseCooldown=false;
  let guideDispatched=false;
  let destroyed=false,frame=0,last=0,progress=0,target=null,overview=false,width=800,height=460,face=1,direction='up',walkDistance=0,moving=false,wasMoving=false,dirty=false,cam={x:0,y:0,scale:1},saveClock=0;
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
    const p=dungeonPoint(progress),w=world(),scale=overview?Math.min(width/w.w,height/w.h):1.9;
    const x=overview?(width-w.w*scale)/2:clamp(width/2-p[0]*w.w*scale,width-w.w*scale,0);
    const y=overview?(height-w.h*scale)/2:clamp(height*.6-p[1]*w.h*scale,height-w.h*scale,0);
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
    heading.textContent=status.route.name;
    guideButton.hidden=!dungeonCanTalkGuide(g,dungeonPoint(progress));
    const near=status.ready?dungeonAtExit(g):dungeonAtCheckpoint(g);
    action.disabled=!near||!!(g.battle||g.pendingRecovery||status.pending);
    action.textContent=status.ready?'เข้าเมืองถัดไป':status.pending?'กำลังต่อสู้…':near?'เริ่มต่อสู้':'เดินไปหาศัตรู';
    const text=bossGuideWaiting(g)?'ผู้ตรวจการรอที่ทางเข้าเส้นทางชายแดน · ย้อนกลับไปคุยเพื่อออกเดินทางด้วยกัน':status.ready?'ผ่านดันเจี้ยนแล้ว — เดินไปประตูเมือง':`จุดที่ ${status.checkpoint+1}/3 · ${status.location.name}`;
    if(info.textContent!==text)info.textContent=text;
  }
  function render(t) {
    ctx.clearRect(0,0,width,height);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';const w=world();
    if(image.complete&&image.naturalWidth) ctx.drawImage(image,cam.x,cam.y,w.w*cam.scale,w.h*cam.scale);
    const status=dungeonStatus(g);if(!status)return;
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
  listen(action,'click',()=>{
    const s=dungeonStatus(g);if(!s||cut>0||g.battle||g.pendingRecovery||s.pending||!(s.ready?dungeonAtExit(g):dungeonAtCheckpoint(g)))return;
    target=null;keys.clear();save();if(s.ready)onArrival(s.route.to);else onEncounter(s.location);
  });
  listen(root.querySelector('[data-action="leave"]'),'click',()=>{if(cut>0||g.battle||dungeonStatus(g)?.pending)return;save();onLeave();});
  listen(overviewButton,'click',()=>{overview=!overview;overviewButton.setAttribute('aria-pressed',String(overview));overviewButton.textContent=overview?'ตาม Yama':'ดูทั้งเส้นทาง';});
  listen(root.querySelector('[data-action="menu"]'),'click',()=>{if(cut>0)return;save();onMenu();});
  remember();frame=requestAnimationFrame(tick);canvas.focus();
  return function destroy(){if(destroyed)return;destroyed=true;save();cancelAnimationFrame(frame);observer?.disconnect();handlers.forEach(fn=>fn());backgrounds.forEach(scene=>{scene.onload=scene.onerror=null;});root.remove();};
}

export function mountDungeonView(container,g,options={}) {
  return dungeonStatus(g)?.route.id==='th:asia'?mountWildernessView(container,g,options):mountLegacyDungeonView(container,g,options);
}
