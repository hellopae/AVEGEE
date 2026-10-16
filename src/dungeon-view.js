import { dungeonStatus } from './zone-travel.js';
import { themeBackground } from './theme-assets.js';
import { dungeonBackground } from './dungeon-art.js';
import { drawHeroWalk, drawCrewWalk, drawStandee } from './art.js';
import { MOB } from './data.js';
import { CHASE, newChase, stepChase, chaseAlerted, chaseInReach } from './dungeon-chase.js?v=l5';

// Explicit connected corridor through the existing frontier illustration.
export const DUNGEON_CORRIDOR = Object.freeze([[.5,.925],[.5,.78],[.43,.65],[.53,.49],[.48,.35],[.5,.19]].map(Object.freeze));
export const DUNGEON_PROGRESS = Object.freeze([.25,.52,.79]);
const lengths=DUNGEON_CORRIDOR.slice(1).map((p,i)=>Math.hypot(p[0]-DUNGEON_CORRIDOR[i][0],p[1]-DUNGEON_CORRIDOR[i][1]));
const total=lengths.reduce((a,b)=>a+b,0);
export const DUNGEON_TOTAL=total;
const clamp=(n,a,b)=>Math.min(b,Math.max(a,n));
export function dungeonPoint(progress) {
  let d=clamp(Number.isFinite(progress)?progress:0,0,1)*total;
  for(let i=0;i<lengths.length;i++) {
    if(d<=lengths[i] || i===lengths.length-1) {
      const a=DUNGEON_CORRIDOR[i],b=DUNGEON_CORRIDOR[i+1],u=clamp(d/lengths[i],0,1);
      return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];
    }
    d-=lengths[i];
  }
}
export function dungeonProjection(point,maxProgress=1) {
  if(!Array.isArray(point)||!point.every(Number.isFinite)) return { progress:0,point:dungeonPoint(0),distance:Infinity };
  let best={progress:0,point:dungeonPoint(0),distance:Infinity},offset=0;
  for(let i=0;i<lengths.length;i++) {
    const a=DUNGEON_CORRIDOR[i],b=DUNGEON_CORRIDOR[i+1];
    const u=clamp(((point[0]-a[0])*(b[0]-a[0])+(point[1]-a[1])*(b[1]-a[1]))/(lengths[i]**2),0,1);
    const progress=clamp((offset+lengths[i]*u)/total,0,clamp(maxProgress,0,1));
    const p=dungeonPoint(progress),distance=Math.hypot(point[0]-p[0],point[1]-p[1]);
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
export function dungeonAtCheckpoint(g) {
  const s=dungeonStatus(g),p=activePosition(g),at=DUNGEON_CHECKPOINTS[s?.checkpoint];
  return !!(s&&!s.ready&&p&&at&&Math.hypot(p[0]-at[0],p[1]-at[1])<=.045);
}
/** L5: true when the hero stands where this checkpoint's enemy could legitimately have chased them (guards a chased encounter). */
export function dungeonChaseReach(g) {
  const s=dungeonStatus(g),p=activePosition(g);
  if(!s||s.ready||!p)return false;
  return chaseInReach(DUNGEON_PROGRESS[s.checkpoint]*total,dungeonProjection(p).progress*total);
}
export function dungeonAtExit(g) {
  const s=dungeonStatus(g),p=activePosition(g);
  return !!(s?.ready&&p&&Math.hypot(p[0]-DUNGEON_EXIT[0],p[1]-DUNGEON_EXIT[1])<=.026);
}

// Give Nira a lateral lane even at the entry, where follow progress is clamped to zero.
export function dungeonCompanionPoint(progress) {
  const p=dungeonPoint(Math.max(0,progress-.055));
  return [p[0]-.038,Math.min(.96,p[1]+.007)];
}

/** Mount inside a dialog/panel. All city player coordinates remain untouched. */
export function mountDungeonView(container,g,{onEncounter=()=>{},onArrival=()=>{},onLeave=()=>{},onMenu=()=>{}}={}) {
  if(!dungeonStatus(g)) throw new Error('An unlocked active dungeon route is required');
  const root=document.createElement('section'); root.className='dungeon-view';
  root.innerHTML='<header class="dungeon-toolbar"><button type="button" data-action="leave">← กลับเมือง</button><strong></strong><button type="button" data-action="overview" aria-pressed="false">ดูทั้งเส้นทาง</button><button type="button" data-action="menu">เมนู</button></header><div class="dungeon-stage"><canvas tabindex="0" aria-label="เส้นทางดันเจี้ยน เดินด้วย WASD หรือปุ่มลูกศร หรือคลิกจุดหมาย"></canvas><canvas class="dungeon-minimap" aria-label="แผนที่ย่อเส้นทาง"></canvas><p class="dungeon-load" role="status">กำลังโหลดฉากชายแดน…</p></div><footer><p class="dungeon-status" aria-live="polite"></p><button type="button" class="dungeon-interact" disabled>เดินไปหาศัตรู</button><small>คลิก/แตะเพื่อเดิน · WASD / ลูกศร · ต้องเข้าใกล้ศัตรูและประตู</small></footer>';
  container.append(root);
  const canvas=root.querySelector('.dungeon-stage > canvas'),mini=root.querySelector('.dungeon-minimap');
  const ctx=canvas.getContext('2d'),mc=mini.getContext('2d'),info=root.querySelector('.dungeon-status'),action=root.querySelector('.dungeon-interact'),loading=root.querySelector('.dungeon-load');
  const heading=root.querySelector('strong'),overviewButton=root.querySelector('[data-action="overview"]');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let image=new Image(),backgroundSrc=null;
  const backgrounds=new Map();
  const alertArt=new Image();alertArt.src='img/ui/alert-mark.png';
  let cooldown=g.dungeonChaseCooldown?CHASE.cooldownMs:0,chase=null,chaseCheckpoint=-1,cut=0,cutFired=false,alertAt=-1;g.dungeonChaseCooldown=false;
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
    const near=status.ready?dungeonAtExit(g):dungeonAtCheckpoint(g);
    action.disabled=!near||!!(g.battle||g.pendingRecovery||status.pending);
    action.textContent=status.ready?'เข้าเมืองถัดไป':status.pending?'กำลังต่อสู้…':near?'เริ่มต่อสู้':'เดินไปหาศัตรู';
    const text=status.ready?'ผ่านดันเจี้ยนแล้ว — เดินไปประตูเมือง':`จุดที่ ${status.checkpoint+1}/3 · ${status.location.name}`;
    if(info.textContent!==text)info.textContent=text;
  }
  function render(t) {
    ctx.clearRect(0,0,width,height);const w=world();
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
    if(!status.ready){const at=dungeonPoint(chase?chase.s/total:DUNGEON_PROGRESS[status.checkpoint]);actors.push({p:[at[0]-.028,at[1]],kind:'enemy'});}
    actors.sort((a,b)=>a.p[1]-b.p[1]).forEach(a=>{
      const p=screenPoint(a.p),h=w.h*cam.scale*.092,animationTime=reduced.matches?0:t;
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
  listen(canvas,'keydown',e=>{const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();if(!cut)keys.add(k);}});
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
