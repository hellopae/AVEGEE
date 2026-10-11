import { drawYamaSword, SWORD_DURATION_MS } from '../../yama-sword.js';
import { sfx, unlock, AUDIO } from '../../sfx.js';
const COLORS=['#42c77c','#ee625a','#f4d65c','#4fb9e4','#e6a248'];
const KEYS=['KeyD','KeyF','Space','KeyJ','KeyK'];
const LABELS=['D','F','SPACE','J','K'];
export function mount(host,engine,ctx) {
  let audio=null;
  try { if(engine.view().kind==='rhythm') audio=new (window.AudioContext||window.webkitAudioContext)(); } catch {}
  const swordBeat=beat=>{
    if(!audio||audio.state!=='running'||!AUDIO.on||AUDIO.sfxOn===false||AUDIO.sfx<=0)return;
    const osc=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
    osc.type='triangle';osc.frequency.value=beat===0?660:440;
    gain.gain.setValueAtTime(Math.min(1,AUDIO.sfx)*.16,now);gain.gain.exponentialRampToValueAtTime(.0001,now+.065);
    osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+.07);
  };
  const slicing=engine.view().kind==='slicing';
  host.classList.add('sword-practice');
  const hud=document.createElement('div');hud.className='sword-score';hud.setAttribute('aria-live','polite');
  const board=document.createElement('div');board.className='sword-board';
  const zone=['th','asia','west','cyberhell'].includes(ctx.zone)?ctx.zone:'th';
  const backdrop=new Image();backdrop.src=new URL(`../../../img/rooms-wide/${zone}-${slicing?'ngiw':'dab'}.webp`,import.meta.url).href;
  board.style.backgroundImage=`linear-gradient(#190d1670,#190d1640),url("img/rooms-wide/${zone}-${slicing?'ngiw':'dab'}.webp")`;
  const canvas=document.createElement('canvas');canvas.width=1000;canvas.height=560;canvas.setAttribute('aria-label',slicing?'ลากฟันท่อนไม้':'โน้ตดาบ 5 ช่อง');board.append(canvas);
  const controls=document.createElement('div');controls.className='sword-keys';
  const status=document.createElement('div');status.className='sword-feedback';status.setAttribute('role','status');
  host.append(hud,board,controls,status);
  const c=canvas.getContext('2d'),log=new Image();log.src='img/minigames/sword-log-v1.png';
  let point=null,pointer=null,arcs=[],slashAt=-10,beat=-1,lastMessage='',held=new Set();
  const swing=()=>{if(ctx.frozen())return;slashAt=engine.view().time;ctx.onSword?.();sfx('hit');};
  function note(lane){if(ctx.frozen())return;ctx.input({type:'note',lane});swing();}
  if(!slicing)for(let lane=0;lane<5;lane++) {
    const b=document.createElement('button');b.type='button';b.style.setProperty('--lane',COLORS[lane]);b.textContent=LABELS[lane];b.setAttribute('aria-label',`ฟันช่อง ${lane+1} ${LABELS[lane]}`);controls.append(b);
    ctx.listen(b,'pointerdown',e=>{if(e.button!==0)return;e.preventDefault();unlock();note(lane);});
    ctx.listen(b,'click',e=>{if(e.detail===0)note(lane);});
  }
  else {controls.textContent='กดค้างแล้วลากเมาส์ / ลากนิ้วผ่านท่อนไม้ · ฟันให้ครบ 10 ชิ้น';}
  const xy=e=>{const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
  ctx.listen(canvas,'pointerdown',e=>{if(ctx.frozen()||e.button!==0||pointer!==null)return;
    if(!slicing){e.preventDefault();unlock();const p=xy(e),y=Math.max(30,Math.min(500,p.y*560));for(let lane=0;lane<5;lane++)if(p.x*1000>=laneX(lane,y)&&p.x*1000<laneX(lane+1,y)){note(lane);break;}return;}e.preventDefault();unlock();canvas.setPointerCapture(e.pointerId);pointer=e.pointerId;point=xy(e);});
  ctx.listen(canvas,'pointermove',e=>{if(pointer!==e.pointerId||!point||ctx.frozen())return;const p=xy(e),now=engine.view().time;
    ctx.input({type:'slice',from:point,to:p});if(Math.hypot(p.x-point.x,p.y-point.y)>.014)arcs.push({a:point,b:p,time:now});if(now-slashAt>.14&&Math.hypot(p.x-point.x,p.y-point.y)>.006)swing();point=p;
  });
  const release=()=>{point=null;pointer=null;held.clear();};
  for(const ev of ['pointerup','pointercancel','lostpointercapture'])ctx.listen(canvas,ev,release);
  ctx.listen(window,'blur',release);
  ctx.listen(document,'keydown',e=>{if(slicing||e.repeat||ctx.frozen()||/SELECT|INPUT|TEXTAREA/.test(e.target.tagName))return;const lane=KEYS.indexOf(e.code);if(lane<0)return;e.preventDefault();if(held.has(e.code))return;held.add(e.code);unlock();note(lane);});
  ctx.listen(document,'keyup',e=>held.delete(e.code));
  function line(points,stroke,width=3){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
  function laneX(edge,y){const depth=(y-30)/470;return 280+edge*88+(edge-2.5)*65*depth;}
  return {
    update(v,paused){
      if(paused)release();
      hud.textContent=`⚔ ${v.hits}/10   ·   พลาด ${v.misses}/10   ·   ${Math.ceil((slicing?30:34)-v.time)} วิ`;
      const msg=paused?'พักอยู่':v.feedback;if(msg!==lastMessage){status.textContent=msg;lastMessage=msg;}
      for(const b of controls.querySelectorAll('button'))b.disabled=paused;
      c.clearRect(0,0,1000,560);
      if(backdrop.complete&&backdrop.naturalWidth){
        const bw=backdrop.naturalWidth,bh=backdrop.naturalHeight,scale=Math.max(1000/bw,560/bh);
        c.drawImage(backdrop,(1000-bw*scale)/2,(560-bh*scale)/2,bw*scale,bh*scale);
      }
      c.fillStyle='#190d1640';c.fillRect(0,0,1000,560);
      const rect=canvas.getBoundingClientRect(), aspect=rect.width?1000*rect.height/(560*rect.width):1;
      if(!slicing){
        c.fillStyle='#150e2060';c.beginPath();c.moveTo(laneX(0,30),30);c.lineTo(laneX(5,30),30);c.lineTo(laneX(5,500),500);c.lineTo(laneX(0,500),500);c.closePath();c.fill();
        for(let i=0;i<=5;i++)line([[laneX(i,30),30],[laneX(i,500),500]],'#d5ae65aa',2);
        c.fillStyle='#ffe29a35';c.fillRect(laneX(0,470),421,laneX(5,470)-laneX(0,470),98);
        line([[laneX(0,470),470],[laneX(5,470),470]],'#fff3be',5);
        for(const n of v.notes){const progress=1-(n.at-v.time)/3.4;if(n.state!=='waiting'||progress<0||progress>1.15)continue;const y=30+progress*440,w=laneX(n.lane+1,y)-laneX(n.lane,y)-12;
          c.fillStyle=COLORS[n.lane];c.shadowBlur=16;c.shadowColor=COLORS[n.lane];c.fillRect(laneX(n.lane,y)+6,y-22,w,44);c.shadowBlur=0;
          c.fillStyle='#160d15';c.font='bold 18px sans-serif';c.textAlign='center';c.fillText(LABELS[n.lane],laneX(n.lane,y)+6+w/2,y+5);
        }
        const nextBeat=Math.floor(Math.max(0,v.time-.55)/1.05);if(!paused&&nextBeat!==beat){beat=nextBeat;swordBeat(beat%4);}
      }
      const elapsed=(v.time-slashAt)*1000;
      c.save();c.translate(slicing?190:500,slicing?530:370);c.scale(aspect,1);if(!slicing)c.globalAlpha=.85;
      drawYamaSword(c,ctx.heroStyle||zone,0,0,slicing?230:185,elapsed<SWORD_DURATION_MS?elapsed:0,1,ctx.weapon?.());c.restore();
      if(slicing)for(const p of v.logs){c.save();c.translate(p.x*1000,p.y*560);c.scale(aspect,1);c.rotate(p.angle+p.age*.55);const split=p.state==='hit',off=split?(v.time-p.hitAt)*160:0;c.globalAlpha=split?Math.max(0,1-(v.time-p.hitAt)/.4):1;
        if(log.complete&&log.naturalWidth){if(split){c.drawImage(log,0,0,log.width/2,log.height,-85-off,-50,85,100);c.drawImage(log,log.width/2,0,log.width/2,log.height,off,-50,85,100);}else c.drawImage(log,-85,-50,170,100);}
        else {c.fillStyle='#76482b';c.fillRect(-55,-24,110,48);c.fillStyle='#d5a96a';c.beginPath();c.ellipse(-55,0,12,24,0,0,Math.PI*2);c.fill();}c.restore();
      }
      // Each gesture leaves a tapered curved blade of light, rather than a straight bar.
      arcs=arcs.filter(a=>v.time-a.time<.28).slice(-9);
      for(const a of arcs){const ax=a.a.x*1000,ay=a.a.y*560,bx=a.b.x*1000,by=a.b.y*560,dx=bx-ax,dy=by-ay,len=Math.hypot(dx,dy)||1;
        const nx=-dy/len,ny=dx/len,bend=Math.min(65,Math.max(24,len*.38)),mx=(ax+bx)/2,my=(ay+by)/2;
        c.save();c.globalAlpha=Math.max(0,1-(v.time-a.time)/.28);c.shadowColor='#ffb538';c.shadowBlur=20;
        c.beginPath();c.moveTo(ax,ay);c.quadraticCurveTo(mx+nx*bend,my+ny*bend,bx,by);c.quadraticCurveTo(mx+nx*(bend-18),my+ny*(bend-18),ax,ay);c.closePath();c.fillStyle='#fff5c4';c.fill();
        c.strokeStyle='#ffc365';c.lineWidth=2;c.stroke();c.restore();
      }
      if(paused){c.fillStyle='#100b18aa';c.fillRect(0,0,1000,560);c.fillStyle='#ffe7a1';c.font='bold 36px sans-serif';c.textAlign='center';c.fillText('พัก',500,280);}
    },
    destroy(){release();audio?.close().catch(()=>{});host.classList.remove('sword-practice');}
  };
}
