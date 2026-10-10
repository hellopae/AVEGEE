import { t } from './i18n.js';
// Optical reflection in image coordinates: the mirror angle is its surface line.
export const MIRROR_LAYOUT = { source:[.85,.61], pivot:[.735,.52], target:[.50,.27] };
export const MIRROR_HOLD_MS = 1800;
const rad = deg => deg * Math.PI / 180;
export function mirrorBeam(angle, aspect = 16/9, layout = MIRROR_LAYOUT) {
  const [sx,sy] = layout.source, [px,py] = layout.pivot, [tx,ty] = layout.target;
  const incoming = Math.atan2(py-sy,(px-sx)*aspect);
  const outgoing = 2*rad(angle)-incoming;
  const dx = Math.cos(outgoing), dy = Math.sin(outgoing);
  const vx = (tx-px)*aspect, vy = ty-py;
  const along = vx*dx+vy*dy, distance = Math.abs(vx*dy-vy*dx);
  const hit = along > 0 && distance < .025;
  let length = Infinity;
  if(dx > 1e-8) length=Math.min(length,(1-px)*aspect/dx);
  if(dx < -1e-8) length=Math.min(length,-px*aspect/dx);
  if(dy > 1e-8) length=Math.min(length,(1-py)/dy);
  if(dy < -1e-8) length=Math.min(length,-py/dy);
  if(hit) length=Math.min(length,along);
  return {hit, end:[px+dx*length/aspect,py+dy*length], incoming, outgoing};
}
export function mirrorSolution(aspect = 16/9, layout = MIRROR_LAYOUT) {
  const [sx,sy]=layout.source,[px,py]=layout.pivot,[tx,ty]=layout.target;
  return ((Math.atan2(py-sy,(px-sx)*aspect)+Math.atan2(ty-py,(tx-px)*aspect))*90/Math.PI+360)%180;
}
// These centres follow the newly painted optical apparatus. The room preview
// keeps its existing anchors; the illustrated board has its own measured layout.
export const MIRROR_ART_LAYOUT = { source:[.89,.553], pivot:[.71,.477], target:[.532,.189] };
export function mirrorChargeAngle(angle, aspect) {
  const delta=((angle-mirrorSolution(aspect,MIRROR_ART_LAYOUT)+270)%180)-90;
  const length = (layout,a) => Math.hypot((layout.target[0]-layout.pivot[0])*a,layout.target[1]-layout.pivot[1]);
  const distanceRatio=length(MIRROR_ART_LAYOUT,aspect)/length(MIRROR_LAYOUT,16/9);
  const mapped=Math.asin(Math.max(-1,Math.min(1,Math.sin(2*rad(delta))*distanceRatio)))*90/Math.PI;
  return ((mirrorSolution()+mapped)%180+180)%180;
}
// H4 anchors are measured on the real wide room, not the F3 painted board.
export const MIRROR_ROOM_LAYOUT = { source:[.86,.55], pivot:[.735,.56], target:[.50,.24] };
export const MIRROR_FOOT = [.735,.615];
// I1-A: เส้นพื้นของฐานกระจก = ก้นรีของพื้นที่กันเดิน (รัศมี y .032) — ยมบาทที่เท้าอยู่ต่ำกว่านี้ยืน "หน้า" แท่น วาดทับฐาน; สูงกว่านี้ยืน "หลัง" แท่น ถูกฐานบัง
export const MIRROR_SORT_Y = MIRROR_FOOT[1] + .032;
/** คีย์เรียงลึกของยมบาท (ตามแกน y ของเท้า) เมื่อมีแท่นกระจกในห้อง — ครึ่งหน้าของแท่น (เท้าต่ำกว่าจุดวางแท่นภายในความกว้างฐาน) ถือว่าอยู่หน้าแท่นเสมอ
 *  ไม่ให้มีช่วงเฉียงขอบวงรีที่ยมบาทอยู่หน้าฐานแต่ถูกวาดไว้ข้างหลัง */
export const mirrorHeroSortY = (x,y) => y > MIRROR_FOOT[1] && Math.abs(x-MIRROR_FOOT[0]) < .0375 + .01 ? Math.max(y, MIRROR_SORT_Y + 1e-4) : y;
export const mirrorObstacle = (x,y) => Math.hypot((x-MIRROR_FOOT[0])/.045,(y-MIRROR_FOOT[1])/.032) < 1;
export const nearMirror = ([x,y]) => Math.hypot(x-MIRROR_FOOT[0],(y-MIRROR_FOOT[1])*.7) <= .105;
export function mountMirrorCharge(roomEl, { anchor, canPlace, canCharge, canAdjust = () => true, onCharge, onState = () => {}, alive, paused = () => false }) {
  const layer=document.createElement('div');layer.className='mirror-room-layer';roomEl.append(layer);
  layer.innerHTML=`<svg class="mirror-light" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path data-ray-glow fill="none" stroke="#eeb743" stroke-width=".8" opacity=".45"/><path data-ray fill="none" stroke="#fff1b6" stroke-width=".22"/><circle data-source r=".9" fill="#ffe9a7"/><circle data-target r="3.1" fill="none" stroke="#dca452" stroke-width=".18"/></svg><img class="mirror-charge-base" src="img/mirror-charge-base.png" alt=""><img class="mirror-charge-pane" src="img/mirror-charge-pane.png" alt="${t('mirror.reflector')}" draggable="false">`;
  const panel=document.createElement('section');panel.className='mirror-room-controls';panel.setAttribute('aria-label',t('room.krajok.adjust'));roomEl.append(panel);
  panel.innerHTML=`<div class="mirror-puzzle-footer"><label>${t('mirror.angle')} <output>0°</output><input aria-label="${t('room.krajok.adjust')}" type="range" min="0" max="179" step="1" value="0"></label><div class="mirror-charge-stepper"><button type="button" data-turn="-1">↶ −1°</button><button type="button" data-turn="1">↷ +1°</button><button type="button" data-remove>${t('mirror.remove')}</button><button type="button" data-mirror-close>${t('room.close')}</button></div><progress max="1800" value="0" aria-label="${t('mirror.progress')}"></progress><small class="mirror-status" role="status"></small></div>`;
  const ray=layer.querySelector('[data-ray]'),glow=layer.querySelector('[data-ray-glow]'),source=layer.querySelector('[data-source]'),target=layer.querySelector('[data-target]');
  const base=layer.querySelector('.mirror-charge-base'),pane=layer.querySelector('.mirror-charge-pane'),range=panel.querySelector('input'),output=panel.querySelector('output'),progress=panel.querySelector('progress'),status=panel.querySelector('.mirror-status');
  let placed=false,angle=0,held=0,charged=false,frame=0,last=performance.now(),stopped=false,drag=null;
  const turn=v=>{if(paused() || charged || !canAdjust())return;angle=((Number(v)%180)+180)%180;range.value=angle;output.value=`${angle}°`;held=0;};
  range.oninput=()=>turn(range.value);
  panel.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>turn(angle+Number(b.dataset.turn)));
  const close=()=>{drag=null;panel.hidden=true;onState();};
  panel.querySelector('[data-mirror-close]').onclick=close;   // I1-A: เดิมใช้ data-close ซึ่งตัวจับกลางใน ui.js ปิดทั้งห้องไปด้วย — ปิดแผงต้องปิดแค่แผง
  panel.querySelector('[data-remove]').onclick=()=>{placed=false;charged=false;held=0;layer.hidden=true;close();};
  const pointerAngle=e=>{const rect=pane.getBoundingClientRect();return Math.atan2(e.clientY-rect.top-rect.height/2,e.clientX-rect.left-rect.width/2)*180/Math.PI;};
  pane.onpointerdown=e=>{if(!placed || !canAdjust() || paused() || charged)return;e.preventDefault();drag={id:e.pointerId,start:pointerAngle(e),angle};pane.setPointerCapture(e.pointerId);panel.hidden=false;onState();};
  pane.onpointermove=e=>{if(drag?.id===e.pointerId)turn(drag.angle+pointerAngle(e)-drag.start);};
  pane.onpointerup=pane.onpointercancel=e=>{if(drag?.id===e.pointerId)drag=null;};
  const point=(el,p)=>{el.style.left=`${p[0]}%`;el.style.top=`${p[1]}%`;};
  const xy=p=>p.join(',');
  const draw=now=>{
    if(stopped || !alive()){destroy();return;}
    const dt=Math.min(100,Math.max(0,now-last));last=now;
    if(placed){
      const layout=MIRROR_ROOM_LAYOUT,sp=anchor(...layout.source),pp=anchor(...layout.pivot),tp=anchor(...layout.target);
      // Recover the image aspect from its projected axes, including cover/contain.
      const origin=anchor(0,0),xaxis=anchor(1,0),yaxis=anchor(0,1);
      const aspect=(xaxis[0]-origin[0])*roomEl.clientWidth/Math.max(1,(yaxis[1]-origin[1])*roomEl.clientHeight);
      const beam=mirrorBeam(angle,aspect,layout),end=anchor(...beam.end);
      if(!charged && !paused() && beam.hit && canCharge())held+=dt;else if(!charged && !paused())held=0;
      if(held>=MIRROR_HOLD_MS && !charged){
        // Existing reward validation remains calibrated in its original coordinates.
        const delta=((angle-mirrorSolution(aspect,layout)+270)%180)-90;
        const distance=Math.hypot((layout.target[0]-layout.pivot[0])*aspect,layout.target[1]-layout.pivot[1]);
        const oldDistance=Math.hypot((MIRROR_LAYOUT.target[0]-MIRROR_LAYOUT.pivot[0])*16/9,MIRROR_LAYOUT.target[1]-MIRROR_LAYOUT.pivot[1]);
        const mapped=Math.asin(Math.max(-1,Math.min(1,Math.sin(2*rad(delta))*distance/oldDistance)))*90/Math.PI;
        charged=!!onCharge((mirrorSolution()+mapped+180)%180,16/9);held=charged?MIRROR_HOLD_MS:0;
      }
      point(base,anchor(...MIRROR_FOOT));point(pane,pp);
      const width=Math.abs(xaxis[0]-origin[0])*.075; base.style.width=pane.style.width=`${width}%`;
      pane.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
      ray.setAttribute('d',`M${xy(sp)} L${xy(pp)} L${xy(end)}`);glow.setAttribute('d',ray.getAttribute('d'));
      for(const [el,p] of [[source,sp],[target,tp]]){el.setAttribute('cx',p[0]);el.setAttribute('cy',p[1]);}
      target.setAttribute('stroke',beam.hit?'#fff1b6':'#dca452');layer.classList.toggle('mirror-hit',beam.hit);
      progress.value=held;range.disabled=charged || paused() || !canAdjust();
      panel.querySelectorAll('[data-turn]').forEach(b=>b.disabled=range.disabled);
      status.textContent=charged?t('mirror.success'):paused()?t('mirror.paused'):!canAdjust()?t('h4.mirrorNear'):!canCharge()?t('mirror.wait'):beam.hit?t('mirror.hold'):t('mirror.aim');
    }
    frame=requestAnimationFrame(draw);
  };
  const destroy=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);layer.remove();panel.remove();onState();};
  layer.hidden=true;panel.hidden=true;frame=requestAnimationFrame(draw);
  return {angle:()=>angle,panelOpen:()=>placed && !panel.hidden,place(){if(stopped || !canPlace())return false;placed=true;layer.hidden=false;onState();return true;},adjust(){if(stopped || !placed || !canAdjust())return false;panel.hidden=false;charged=false;held=0;last=performance.now();onState();return true;},placed:()=>placed,playing:()=>false,destroy};
}
