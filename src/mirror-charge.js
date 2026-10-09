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
export function mountMirrorCharge(roomEl, { anchor, canPlace, canCharge, onCharge, onState = () => {}, alive, paused = () => false }) {
  const preview=document.createElement('img');preview.className='placed-mirror';preview.src='img/item-mirror.png';preview.alt=t('mirror.item');roomEl.append(preview);
  const panel=document.createElement('section');panel.className='mirror-puzzle';panel.setAttribute('aria-label',t('room.krajok.adjust'));roomEl.append(panel);
  panel.innerHTML=`<div class="mirror-puzzle-head"><div><b>${t('room.krajok.adjust')}</b><small>${t('mirror.rule')}</small></div><button type="button" data-close>${t('room.close')}</button></div>
   <div class="mirror-puzzle-stage"><img class="mirror-puzzle-art" src="img/minigames/mirror-room-v1.png" alt="">
    <svg class="mirror-light" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path data-ray-glow fill="none" stroke="#eeb743" stroke-width=".8" opacity=".45"/><path data-ray fill="none" stroke="#fff1b6" stroke-width=".22"/><circle data-source r=".9" fill="#ffe9a7"/><circle data-target r="3.1" fill="none" stroke-width=".18"/></svg>
    <img class="mirror-plate" src="img/minigames/mirror-plate-v1.png" alt="${t('mirror.reflector')}"><img class="mirror-receiver" src="img/item-mirror.png" alt="${t('mirror.item')}">
   </div><div class="mirror-puzzle-footer"><label>${t('mirror.angle')} <output>0°</output><input aria-label="${t('room.krajok.adjust')}" type="range" min="0" max="179" step="1" value="0"></label>
    <div class="mirror-charge-stepper"><button type="button" data-turn="-1">↶ −1°</button><button type="button" data-turn="1">↷ +1°</button><button type="button" data-remove>${t('mirror.remove')}</button></div>
    <progress max="1800" value="0" aria-label="${t('mirror.progress')}"></progress><small class="mirror-status" role="status"></small></div>`;
  const stage=panel.querySelector('.mirror-puzzle-stage'), ray=panel.querySelector('[data-ray]'), glow=panel.querySelector('[data-ray-glow]'), source=panel.querySelector('[data-source]'), target=panel.querySelector('[data-target]');
  const plate=panel.querySelector('.mirror-plate'), item=panel.querySelector('.mirror-receiver'), range=panel.querySelector('input'), output=panel.querySelector('output'), progress=panel.querySelector('progress'), status=panel.querySelector('.mirror-status');
  let placed=false, turning=false, angle=0, held=0, charged=false, frame=0, last=performance.now(), stopped=false;
  const turn = v => {if(paused() || charged)return;angle=((Number(v)%180)+180)%180;range.value=angle;output.value=`${angle}°`;held=0;};
  range.oninput=()=>turn(range.value);
  panel.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>turn(angle+Number(b.dataset.turn)));
  const close=()=>{turning=false;held=0;panel.hidden=true;roomEl.classList.remove('mirror-puzzle-open');preview.hidden=!placed;onState();};
  const remove=()=>{placed=false;charged=false;close();};
  panel.querySelector('[data-close]').onclick=close;
  panel.querySelector('[data-remove]').onclick=remove;
  const xy=p=>p.map(v=>v*100).join(',');
  for(const [el,point] of [[plate,MIRROR_ART_LAYOUT.pivot],[item,MIRROR_ART_LAYOUT.target]]) {
    el.style.left=`${point[0]*100}%`;el.style.top=`${point[1]*100}%`;
  }
  source.setAttribute('cx',MIRROR_ART_LAYOUT.source[0]*100);source.setAttribute('cy',MIRROR_ART_LAYOUT.source[1]*100);
  target.setAttribute('cx',MIRROR_ART_LAYOUT.target[0]*100);target.setAttribute('cy',MIRROR_ART_LAYOUT.target[1]*100);
  const draw=now=>{
    if(stopped || !alive()) {destroy();return;}
    const dt=Math.min(100,Math.max(0,now-last));last=now;
    if(placed && !turning) {const p=anchor(...MIRROR_LAYOUT.target);preview.style.left=`${p[0]}%`;preview.style.top=`${p[1]}%`;}
    if(turning) {
      const available=panel.clientHeight-panel.querySelector('.mirror-puzzle-head').offsetHeight-panel.querySelector('.mirror-puzzle-footer').offsetHeight-48;
      const boardWidth=Math.min(panel.clientWidth-30,Math.max(140,available)*16/9);
      if(stage.style.width!==`${boardWidth}px`) stage.style.width=`${boardWidth}px`;
      const aspect=stage.clientWidth/Math.max(1,stage.clientHeight), beam=mirrorBeam(angle,aspect,MIRROR_ART_LAYOUT);
      if(!charged && !paused() && beam.hit && canCharge()) held+=dt;else if(!charged && !paused()) held=0;
      // Adapt the painted board's calibration to the existing game reward model.
      if(held>=MIRROR_HOLD_MS && !charged) {charged=!!onCharge(mirrorChargeAngle(angle,aspect),16/9);held=charged?MIRROR_HOLD_MS:0;}
      ray.setAttribute('d',`M${xy(MIRROR_ART_LAYOUT.source)} L${xy(MIRROR_ART_LAYOUT.pivot)} L${xy(beam.end)}`);
      glow.setAttribute('d',ray.getAttribute('d'));ray.setAttribute('stroke',beam.hit?'#fff1b6':'#ffe39b');target.setAttribute('stroke',beam.hit?'#fff1b6':'#dca452');
      plate.style.transform=`translate(-50%,-50%) rotate(${angle}deg)`;
      item.classList.toggle('charged',charged);panel.classList.toggle('mirror-hit',beam.hit);
      progress.value=held;range.disabled=charged || paused();
      panel.querySelectorAll('[data-turn]').forEach(b=>b.disabled=charged || paused());
      status.textContent=charged?t('mirror.success'):paused()?t('mirror.paused'):!canCharge()?t('mirror.wait'):beam.hit?t('mirror.hold'):t('mirror.aim');
    }
    frame=requestAnimationFrame(draw);
  };
  const destroy=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);preview.remove();panel.remove();roomEl.classList.remove('mirror-puzzle-open');onState();};
  preview.hidden=true;panel.hidden=true;frame=requestAnimationFrame(draw);
  return { place(){if(stopped || !canPlace())return false;placed=true;preview.hidden=false;onState();return true;},
    adjust(){if(stopped || !placed)return false;turning=true;held=0;charged=false;panel.hidden=false;preview.hidden=true;roomEl.classList.add('mirror-puzzle-open');last=performance.now();onState();return true;},
    placed:()=>placed, playing:()=>turning && !stopped, destroy };
}
