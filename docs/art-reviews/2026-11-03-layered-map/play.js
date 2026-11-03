import {animationFrame} from '../../../src/yama-animation.js';
import {drawContactShadow} from '../../../src/scene-style.js';
import {createFollowCamera,screenToMap,mapToScreen,bufferedView,intersects,farScreenRect} from '../../../src/map-follow-camera.js';
import {createStreamCache} from '../../../src/map-stream-cache.js';
import {createDepthEffects} from '../../../src/map-depth-effects.js';
import {createFrontierNavigation} from '../../../src/dungeon-navigation.js';
import {drawMapWeather,drawBiomeWeather} from '../../../src/map-ambient.js';
const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d'),viewport=[canvas.width,canvas.height],effects=createDepthEffects();
let meta=null,camera=null,cache=null,nav=null,hero=null,path=[],paused=false,elapsed=0,weatherTime=0,token=0,readyOnce=false,wants=[],critical=[],zoomCritical=[],failure=null,walkDistance=0,direction='down',moving=false,actorTime=0;
let abortController=null;
const keys=new Set(),frames=new Map(),work=document.createElement('canvas');work.width=work.height=256;const wc=work.getContext('2d');
const weatherPlanes=[document.createElement('canvas'),document.createElement('canvas')];for(const c of weatherPlanes){c.width=canvas.width;c.height=canvas.height;}
const controls={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1],a:[-1,0],d:[1,0],w:[0,-1],s:[0,1]};
const absolute=src=>new URL(src,meta.url).href;
const image=id=>cache?.get(id);
function descriptor(src,priority=0){const id=absolute(src);return {id,src:id,priority};}
function viewRect(v){return [v.x,v.y,v.w,v.h];}
function union(a,b){const x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]);return [x,y,Math.max(a[0]+a[2],b[0]+b[2])-x,Math.max(a[1]+a[3],b[1]+b[3])-y];}
function collect(rect,essential=false){
 const items=[descriptor(meta.hero,-30),descriptor(meta.far,-40)];
 if(meta.actorAnimation){for(const mode of ['idle','walk'])items.push(descriptor(meta.actorAnimation[mode][direction].src,-25));if(!essential)for(const row of Object.values(meta.actorAnimation.walk))items.push(descriptor(row.src,30));}
 for(const t of meta.tiles){if(!intersects(t.rect,rect)||t.layer.startsWith('mask-')&&(!$('motion').checked||essential))continue;const p=t.layer==='floor'?-20:t.layer==='rails'?-18:t.layer==='liquid'?-12:t.layer==='nature'?-10:10;items.push(descriptor(t.src,p));if(t.layer.startsWith('mask-')&&!essential){const kind=t.layer==='mask-lava'?'lava':'water';items.push(descriptor(meta.materials[kind].src,15));}}
 for(const o of meta.objects)if(intersects(o.rect,rect))items.push(descriptor(o.src,-15));
 return [...new Map(items.map(i=>[i.id,i])).values()];
}
function updateRequests(){
 const current=camera.view,target=camera.targetView(hero),buffer=union(bufferedView(current,meta.artSize,96),bufferedView(target,meta.artSize,96));
 const visible=collect(bufferedView(current,meta.artSize,12),true),targetVisible=collect(bufferedView(target,meta.artSize,12),true),live=new Set([...visible,...targetVisible].map(i=>i.id));
 wants=collect(buffer);wants.sort((a,b)=>(live.has(a.id)?0:1000)+a.priority-((live.has(b.id)?0:1000)+b.priority));critical=visible.map(i=>i.id);zoomCritical=targetVisible.map(i=>i.id);cache.want(wants);
}
async function select(){
 const own=++token;abortController?.abort();const controller=new AbortController();abortController=controller;cache?.destroy();effects.destroy();for(const f of frames.values())f.canvas.width=f.canvas.height=1;frames.clear();meta=camera=nav=hero=null;path=[];keys.clear();readyOnce=false;failure=null;walkDistance=0;direction='down';moving=false;actorTime=0;$('map').disabled=true;$('retry').hidden=true;$('state').textContent='กำลังโหลดฉากรอบตัว…';
 try{
  const index=await fetch('stream-index.json',{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('ยังไม่มีข้อมูลชิ้นภาพ');return r.json();}),url=new URL(index.maps[$('map').value].src,location.href).href,row=await fetch(url,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('โหลดผังฉากไม่สำเร็จ');return r.json();});if(own!==token)return;
  meta={...row,url};nav=createFrontierNavigation(meta.mask,meta.corridor);hero=nav.snap(meta.start);camera=createFollowCamera({artSize:meta.artSize,viewport,levels:meta.levels,start:hero});
  cache=createStreamCache({maxBytes:48*1024*1024,concurrency:2,releaseOutside:true,onRelease:id=>effects.release(id),load:async src=>{const blob=await fetch(src,{signal:controller.signal}).then(r=>{if(!r.ok)throw Error('โหลดชิ้นภาพไม่สำเร็จ');return r.blob();});return createImageBitmap(blob);}});
  $('near').setAttribute('aria-pressed','true');$('closer').setAttribute('aria-pressed','false');updateRequests();
 }catch(error){if(own===token){failure=String(error.message||error);$('state').textContent=failure;$('retry').hidden=false;}}
 finally{if(own===token)$('map').disabled=false;}
}
$('map').onchange=select;$('retry').onclick=select;
for(const [id,level]of [['near',0],['closer',1]])$(id).onclick=()=>{if(!camera)return;camera.setLevel(level);$('near').setAttribute('aria-pressed',String(level===0));$('closer').setAttribute('aria-pressed',String(level===1));updateRequests();canvas.focus();};
$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'เล่น':'หยุด';};
canvas.onclick=e=>{if(!nav||!hero)return;const b=canvas.getBoundingClientRect(),p=screenToMap([(e.clientX-b.left)/b.width,(e.clientY-b.top)/b.height],camera.view);path=nav.path(hero,p);$('state').textContent=path.length?'กำลังเดิน…':'จุดนี้เดินไม่ได้';canvas.focus();};
window.addEventListener('keydown',e=>{if(!controls[e.key]||['INPUT','SELECT','BUTTON'].includes(e.target.tagName))return;e.preventDefault();keys.add(e.key);path=[];});window.addEventListener('keyup',e=>keys.delete(e.key));window.addEventListener('blur',()=>keys.clear());
function tileRect(t,v){const a=mapToScreen([t.rect[0],t.rect[1]],v,viewport),b=mapToScreen([t.rect[0]+t.rect[2],t.rect[1]+t.rect[3]],v,viewport);const x=Math.round(a[0]),y=Math.round(a[1]);return [x,y,Math.round(b[0])-x,Math.round(b[1])-y];}
function drawTiles(layer,v){for(const t of meta.tiles){if(t.layer!==layer||!intersects(t.rect,viewRect(v)))continue;const im=image(absolute(t.src));if(im)ctx.drawImage(im,...t.crop,...tileRect(t,v));}}
function materialFrame(kind){
 const sourceKind=kind==='purple'?'water':kind,sheet=meta.materials[sourceKind],im=image(absolute(sheet.src));if(!im)return null;
 const frame=Math.floor(elapsed/1000*sheet.fps)%8,key=sourceKind+'-'+kind;let f=frames.get(key);if(f?.frame===frame)return f.canvas;
 if(!f){const c=document.createElement('canvas');c.width=c.height=128;f={canvas:c,frame:-1};frames.set(key,f);}const p=f.canvas.getContext('2d');p.globalCompositeOperation='source-over';p.clearRect(0,0,128,128);p.drawImage(im,frame%4*128,Math.floor(frame/4)*128,128,128,0,0,128,128);if(kind==='purple'){p.globalCompositeOperation='color';p.fillStyle='#8e36d4';p.fillRect(0,0,128,128);}f.frame=frame;return f.canvas;
}
function drawMaterials(v){
 if(!$('motion').checked)return;
 for(const kind of ['water','lava','purple']){const frame=materialFrame(kind);if(!frame)continue;for(const t of meta.tiles){if(t.layer!=='mask-'+kind||!intersects(t.rect,viewRect(v)))continue;const mask=image(absolute(t.src));if(!mask)continue;const [, ,w,h]=t.pixels;wc.globalCompositeOperation='source-over';wc.clearRect(0,0,256,256);wc.fillStyle=wc.createPattern(frame,'repeat');wc.save();const ox=t.pixels[0]%128,oy=t.pixels[1]%128;wc.translate(-ox,-oy);wc.fillRect(ox,oy,w,h);wc.restore();wc.globalCompositeOperation='destination-in';wc.drawImage(mask,...t.crop,0,0,w,h);ctx.save();ctx.globalAlpha=kind==='lava'?.24:.28;ctx.drawImage(work,0,0,w,h,...tileRect(t,v));ctx.restore();}}
}
function railsBetween(after,through,v){
 const runs=meta.rails.runs,H=meta.rails.height,W=meta.rails.width;let lo=0,hi=runs.length;while(lo<hi){const m=(lo+hi)>>>1;if(runs[m][3]/H<=after)lo=m+1;else hi=m;}
 ctx.save();ctx.beginPath();let count=0;
 for(let i=lo;i<runs.length&&runs[i][3]/H<=through;i++){const [x,y,bottom]=runs[i],rect=[x/W,y/H,1/W,(bottom-y)/H];if(!intersects(rect,viewRect(v)))continue;const p=mapToScreen([rect[0],rect[1]],v,viewport),q=mapToScreen([rect[0]+rect[2],rect[1]+rect[3]],v,viewport);ctx.rect(p[0],p[1],q[0]-p[0]+.25,q[1]-p[1]);count++;}
 if(count){ctx.clip();drawTiles('rails',v);}ctx.restore();
}
function drawObject(o,v){
 const id=absolute(o.src),im=image(id);if(!im)return;const p=mapToScreen([o.rect[0],o.rect[1]],v,viewport),q=mapToScreen([o.rect[0]+o.rect[2],o.rect[1]+o.rect[3]],v,viewport);let x=p[0],y=p[1],w=q[0]-p[0],h=q[1]-p[1],source=im;
 const foot=mapToScreen([o.rect[0],o.depth],v,viewport)[1],heroFoot=mapToScreen(hero,v,viewport)[1];
 if($('dof').checked&&['tree','palm','rock','house','station','portal'].includes(o.kind)&&foot>viewport[1]*.7&&foot-heroFoot>viewport[1]*.14){const blur=effects.blurred(id,im,(camera.level?2.5:1.8)/(w/im.width));const px=blur.pad*w/im.width,py=blur.pad*h/im.height;source=blur.image;x-=px;y-=py;w+=px*2;h+=py*2;}
 ctx.save();if(o.flip){ctx.translate(x+w,y);ctx.scale(-1,1);ctx.drawImage(source,0,0,w,h);}else ctx.drawImage(source,x,y,w,h);ctx.restore();
}
function drawFar(v,reduced){const id=absolute(meta.far),im=image(id);if(!im)return;const r=farScreenRect(v,viewport,$('parallax').checked&&!reduced);if($('dof').checked){const b=effects.blurred(id,im,camera.level?3:2),px=b.pad*r.w/im.width,py=b.pad*r.h/im.height;ctx.drawImage(b.image,r.x-px,r.y-py,r.w+px*2,r.h+py*2);}else ctx.drawImage(im,r.x,r.y,r.w,r.h);}
function drawWeather(t,reduced){
 if(!$('weather').checked)return;const zones={zone1:['th'],zone2:['asia'],zone3:['west'],zone4:['cyberhell'],border12:['th','asia'],border23:['asia','west'],border34:['west','cyberhell']}[meta.id];let weight=zones.length===1?0:Math.max(0,Math.min(1,(hero[0]-.36)/.28));weight=weight*weight*(3-2*weight);
 zones.forEach((zone,i)=>{const alpha=zones.length===1?1:i?weight:1-weight;if(!alpha)return;const c=weatherPlanes[i],p=c.getContext('2d');p.clearRect(0,0,c.width,c.height);drawMapWeather(p,{zone,time:t,paused,reduced,W:c.width,H:c.height,enabled:true});drawBiomeWeather(p,zone,weatherTime,c.width,c.height,reduced,[0,0,1,1],100);ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(c,0,0);ctx.restore();});
}
function move(dt){
 const before=[...hero];
 let dx=0,dy=0;for(const k of keys){dx+=controls[k][0];dy+=controls[k][1];}
 if(dx||dy){const d=Math.hypot(dx,dy);hero=nav.move(hero,[hero[0]+dx/d*(meta.moveSpeed||160)*dt/meta.world[0],hero[1]+dy/d*(meta.moveSpeed||160)*dt/meta.world[1]]);}
 else if(path.length){const next=path[0],x=next[0]-hero[0],y=next[1]-hero[1],distance=Math.hypot(x*meta.world[0],y*meta.world[1]),step=(meta.moveSpeed||160)*dt;if(distance<=step){hero=nav.move(hero,next);path.shift();}else hero=nav.move(hero,[hero[0]+x*step/distance,hero[1]+y*step/distance]);}
 const sx=(hero[0]-before[0])*meta.world[0],sy=(hero[1]-before[1])*meta.world[1],distance=Math.hypot(sx,sy);moving=distance>.001;if(moving){walkDistance+=distance;direction=Math.abs(sx)>=Math.abs(sy)?sx<0?'left':'right':sy<0?'up':'down';}
}
function drawHero(v){const p=mapToScreen(hero,v,viewport),h=meta.heroHeight/(v.h*meta.artSize[1])*viewport[1];drawContactShadow(ctx,p[0],p[1],h);
 const mode=moving?'walk':'idle',row=meta.actorAnimation?.[mode][direction],im=row?image(absolute(row.src)):null;if(im){const [fw,fh]=meta.actorAnimation.frameSize,frame=moving?Math.floor(walkDistance/meta.actorAnimation.stride)%row.frames:animationFrame(actorTime,meta.actorAnimation.idleDurations),scale=h/row.height;ctx.drawImage(im,frame*fw,0,fw,fh,p[0]-row.footX*scale,p[1]-row.footY*scale,fw*scale,fh*scale);return;}
 const fallback=image(absolute(meta.hero));if(fallback){const fit=meta.actorAnimation?.standing;if(fit){const scale=h/fit.height;ctx.drawImage(fallback,p[0]-fit.footX*scale,p[1]-fit.footY*scale,fallback.width*scale,fallback.height*scale);}else{const w=h*fallback.width/fallback.height;ctx.drawImage(fallback,p[0]-w/2,p[1]-h,w,h);}}
}
let last=0,lastStats=0;
function render(t){
 requestAnimationFrame(render);const dt=Math.min(.05,Math.max(0,(t-last)/1000));last=t;if(!meta||!camera||!cache||!hero)return;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 if(!paused&&cache.ready(critical))move(dt);else if(!paused)moving=false;updateRequests();const ready=cache.ready(critical);if(ready)readyOnce=true;
 camera.tick(paused?camera.center:hero,dt,{snap:reduced,zoomReady:cache.ready(zoomCritical)});const v=camera.view;if(!paused){weatherTime+=dt*1000;if(!reduced)actorTime+=dt*1000;if(!reduced&&$('motion').checked)elapsed+=dt*1000;}
 ctx.clearRect(0,0,...viewport);ctx.fillStyle='#7e879a';ctx.fillRect(0,0,...viewport);drawFar(v,reduced);drawTiles('liquid',v);drawMaterials(v);drawTiles('floor',v);drawTiles('nature',v);
 const events=meta.objects.filter(o=>intersects(o.rect,viewRect(v))).map(o=>({depth:o.depth,draw:()=>drawObject(o,v)}));
 const actor=image(absolute(meta.hero));if(actor&&readyOnce)events.push({depth:hero[1],draw:()=>drawHero(v)});
 events.sort((a,b)=>a.depth-b.depth);let after=-Infinity;for(const e of events){railsBetween(after,e.depth,v);e.draw();after=e.depth;}railsBetween(after,Infinity,v);drawWeather(t,reduced);
 const errors=cache.stats.errors;if(errors.length){$('state').textContent='โหลดฉากบางส่วนไม่สำเร็จ';$('retry').hidden=false;}else if(!ready)$('state').textContent='กำลังโหลดฉากรอบตัว…';else $('state').textContent=paused?'หยุดภาพแล้ว':path.length?'กำลังเดิน…':'คลิกพื้นเพื่อเดิน · WASD/ลูกศร';
 if(t-lastStats>300&&$('debug').open){lastStats=t;const s=cache.stats;$('stats').textContent=`ภาพในหน่วยความจำ ${s.ready} ชิ้น · bitmap ${(s.bytes/1048576).toFixed(1)} MiB · แคชเบลอ ${(effects.bytes/1048576).toFixed(1)} MiB · โหลดสะสม ${s.loaded} · คืนภาพ ${s.evictions} · ระดับกล้อง ${camera.level+1}/2`;}
}
function resize(){const width=Math.max(280,Math.min(1200,Math.round(canvas.getBoundingClientRect().width*Math.min(2,devicePixelRatio||1)))),height=Math.round(width*9/16);if(width===viewport[0]&&height===viewport[1])return;viewport[0]=canvas.width=width;viewport[1]=canvas.height=height;for(const plane of weatherPlanes){plane.width=width;plane.height=height;}if(meta&&camera&&cache)updateRequests();}
new ResizeObserver(resize).observe(canvas.parentElement);resize();
window.layerStreamReview={get meta(){return meta;},get camera(){return camera;},get hero(){return hero?[...hero]:null;},get nav(){return nav;},get actorDirection(){return direction;},get actorMoving(){return moving;},get stats(){return cache?{...cache.stats,effectBytes:effects.bytes}:null;},get ready(){return !!cache&&cache.ready(critical);},get wants(){return wants.map(w=>w.id);},goTo(p){if(!nav)return false;path=nav.path(hero,p);return path.length>0;}};
window.addEventListener('pagehide',()=>{token++;abortController?.abort();cache?.destroy();effects.destroy();for(const c of weatherPlanes)c.width=c.height=1;});const requested=new URLSearchParams(location.search).get('map');if(requested&&[...$('map').options].some(o=>o.value===requested))$('map').value=requested;select();requestAnimationFrame(render);
