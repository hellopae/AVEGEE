const $=id=>document.getElementById(id),canvas=$('scene'),ctx=canvas.getContext('2d');
const [m,layout,catalog]=await Promise.all(['manifest.json','layout.json','object-catalog.json'].map(async p=>{const r=await fetch(p);if(!r.ok)throw Error(p+': '+r.status);return r.json();}));
const [W,H]=m.world,assets=new Map(catalog.assets.map(x=>[x.id,x]));
const maxBytes=24*1048576,cache=new Map(),pending=new Set(),errors=[];
let desired=new Set(),active=0,bytes=0,peakBytes=0,closed=false;
const controller=new AbortController();
function prune(){for(const [key,e] of cache)if(!desired.has(key)){e.image.close();bytes-=e.bytes;cache.delete(key);}}
function pump(){
 if(closed)return;
 for(const src of desired){
  if(active>=2)break;
  if(cache.has(src)||pending.has(src)||errors.some(e=>e.src===src))continue;
  active++;pending.add(src);
  (async()=>{try{
   const r=await fetch(src,{signal:controller.signal});if(!r.ok)throw Error(`${src}: HTTP ${r.status}`);
   const image=await createImageBitmap(await r.blob());
   if(closed||!desired.has(src)){image.close();return;}
   const cost=image.width*image.height*4;
   prune();
   if(bytes+cost>maxBytes){image.close();throw Error('ภาพรอบกล้องเกินงบ 24 MiB');}
   cache.set(src,{image,bytes:cost});bytes+=cost;peakBytes=Math.max(peakBytes,bytes);
  }catch(e){if(!closed)errors.push({src,message:e.message});}
  finally{pending.delete(src);active--;pump();}})();
 }
}
function want(sources){desired=new Set(sources);prune();pump();}
function get(src){return cache.get(src)?.image;}
function ready(){return [...desired].every(src=>cache.has(src));}
let center=[1080,620],level=0,time=0,last=0,paused=true,overview=false,drag=null;
const zooms=[2.25,3.25];
const intersects=(a,b)=>a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];
function view(){const w=W/zooms[level],h=w*canvas.height/canvas.width;center[0]=Math.max(w/2,Math.min(W-w/2,center[0]));center[1]=Math.max(h/2,Math.min(H-h/2,center[1]));return [center[0]-w/2,center[1]-h/2,w,h];}
function visible(o){return $(o.category==='bridge'?'bridges':['tree','shrub','rock','lamp'].includes(o.category)?'scenery':'buildings').checked;}
const objects=[...layout.objects].sort((a,b)=>({back:0,mid:1,front:2}[a.layer]-{back:0,mid:1,front:2}[b.layer])||a.anchor[1]-b.anchor[1]||a.id.localeCompare(b.id));
function phase(f){const p=time/f.cycleSeconds*f.frames.length;return {a:Math.floor(p)%f.frames.length,b:(Math.floor(p)+1)%f.frames.length,mix:p%1};}
function requests(v){const b=[v[0]-40,v[1]-40,v[2]+80,v[3]+80],s=[];
 if($('sky').checked)s.push(m.sky.src);if($('mountains').checked)s.push(m.mountains.src);
 if($('fluid').checked)for(const f of m.liquids)if(intersects(f.rect,b)){const p=phase(f);s.push(f.frames[p.a].src,f.frames[p.b].src);}
 if($('terrain').checked)for(const t of m.tiles)if(intersects(t.rect,b))s.push(t.src);
 for(const o of objects)if(visible(o)&&intersects([o.x,o.y,o.w,o.h],b))s.push(o.preview);
 want(s);
}
function draw(im,r,v,alpha=1,crop=null,flip=false){if(!im)return;const sx=canvas.width/v[2],sy=canvas.height/v[3],x=Math.round((r[0]-v[0])*sx),y=Math.round((r[1]-v[1])*sy),w=Math.round((r[0]+r[2]-v[0])*sx)-x,h=Math.round((r[1]+r[3]-v[1])*sy)-y;
 ctx.save();ctx.globalAlpha=alpha;if(flip){ctx.translate(x+w,y);ctx.scale(-1,1);}else ctx.translate(x,y);
 if(crop)ctx.drawImage(im,...crop,0,0,w,h);else ctx.drawImage(im,0,0,w,h);ctx.restore();
}
function render(t){requestAnimationFrame(render);const dt=Math.min(.1,Math.max(0,(t-last)/1000));last=t;if(overview)return;const v=view();requests(v);const loaded=ready();if(!paused&&loaded&&!document.hidden)time+=dt;
 ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#5a4852';ctx.fillRect(0,0,canvas.width,canvas.height);
 if($('sky').checked)draw(get(m.sky.src),m.sky.rect,v);
 if($('mountains').checked){ctx.save();if($('blur').checked)ctx.filter='blur(3px)';draw(get(m.mountains.src),m.mountains.rect,v);ctx.restore();}
 if($('fluid').checked)for(const f of m.liquids)if(intersects(f.rect,v)){const p=phase(f);draw(get(f.frames[p.a].src),f.rect,v);if(p.mix)draw(get(f.frames[p.b].src),f.rect,v,p.mix);}
 if($('terrain').checked)for(const t of m.tiles)if(intersects(t.rect,v))draw(get(t.src),t.rect,v,1,t.crop);
 for(const o of objects)if(visible(o)&&intersects([o.x,o.y,o.w,o.h],v)){
  draw(get(o.preview),[o.x,o.y,o.w,o.h],v,1,null,o.flipX);
  if($('labels').checked){const x=(o.anchor[0]-v[0])*canvas.width/v[2],y=(o.anchor[1]-v[1])*canvas.height/v[3];ctx.fillStyle='#ffef83';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill();if(['station','judgment','gate','house'].includes(o.category)){ctx.font='13px system-ui';ctx.fillStyle='#201b20';const w=ctx.measureText(o.id).width;ctx.fillRect(x-w/2-4,y+6,w+8,19);ctx.fillStyle='#fff1cd';ctx.fillText(o.id,x-w/2,y+20);}}
 }
 $('status').textContent=errors.length?errors[0].message:loaded?`ลากเพื่อเลื่อน · ${(bytes/1048576).toFixed(1)} MiB`:'กำลังโหลดเฉพาะบริเวณรอบกล้อง…';
}
for(const [id,n]of [['near',0],['closer',1]])$(id).onclick=()=>{level=n;for(const [key,k]of [['near',0],['closer',1]])$(key).setAttribute('aria-pressed',String(n===k));};
const places={center:[1080,620],north:[1050,210],left:[300,570],right:[2040,420],south:[1120,1310],dock:[1400,930]};
$('location').onchange=()=>{center=[...places[$('location').value]];};
$('play').onclick=()=>{paused=!paused;$('play').setAttribute('aria-pressed',String(!paused));$('play').textContent=paused?'เล่นน้ำ / ลาวา':'หยุดน้ำ / ลาวา';};
$('overviewButton').onclick=()=>{overview=!overview;canvas.style.display=overview?'none':'block';$('overview').style.display=overview?'block':'none';$('status').style.display=overview?'none':'';if(overview){$('overview').src=m.preview;want([]);}else $('overview').removeAttribute('src');$('overviewButton').textContent=overview?'กลับตรวจใกล้':'ภาพรวมย่อ';$('overviewButton').setAttribute('aria-pressed',String(overview));};
canvas.onpointerdown=e=>{canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,center:[...center],view:view()};};
canvas.onpointermove=e=>{if(!drag)return;const b=canvas.getBoundingClientRect();center=[drag.center[0]-(e.clientX-drag.x)/b.width*drag.view[2],drag.center[1]-(e.clientY-drag.y)/b.height*drag.view[3]];};
canvas.onpointerup=canvas.onpointercancel=()=>drag=null;
function resize(){canvas.width=Math.min(1400,Math.max(280,Math.round(canvas.getBoundingClientRect().width*Math.min(2,devicePixelRatio||1))));canvas.height=Math.round(canvas.width*9/16);}
new ResizeObserver(resize).observe(canvas.parentElement);resize();
// Read-only diagnostics for local review; no gameplay/collision state.
window.zone2Review={get ready(){return ready();},get stats(){return {bytes,peakBytes,entries:cache.size,active,errors:[...errors],wanted:[...desired]};},get view(){return view();},get clock(){return time;},get paused(){return paused;},get level(){return level;},manifest:m,layout,assets};
window.addEventListener('pagehide',()=>{closed=true;controller.abort();desired.clear();prune();});requestAnimationFrame(render);
