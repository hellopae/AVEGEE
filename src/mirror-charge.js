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
/** Transparent in-room overlay keeps the real background and character anchors. */
export function mountMirrorCharge(roomEl, { anchor, canPlace, canCharge, onCharge, onState = () => {}, alive }) {
  const layer=document.createElement('div');layer.className='mirror-charge-layer';roomEl.append(layer);
  layer.innerHTML='<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path data-mask fill="none" stroke="#312526" stroke-width="1.5"/><path data-ray fill="none" stroke-width=".32"/><circle data-pivot r="2.2" fill="#2a2135" stroke="#e6bd70" stroke-width=".3"/><path data-surface d="M-2,0 L2,0" stroke="#9eeaff" stroke-width=".5"/></svg><img class="placed-mirror" src="img/item-mirror.png" alt="กระจกวิเศษที่วางไว้">';
  const mask=layer.querySelector('[data-mask]'),ray=layer.querySelector('[data-ray]'),pivot=layer.querySelector('[data-pivot]'),surface=layer.querySelector('[data-surface]'),item=layer.querySelector('img');
  const controls=document.createElement('div');controls.className='mirror-charge-controls';roomEl.append(controls);
  controls.innerHTML='<label>องศากระจก <output>0°</output><input aria-label="ปรับองศากระจก" type="range" min="0" max="179" step="1" value="0"></label><div class="mirror-charge-stepper"><button type="button" data-turn="-1">↶ −1°</button><button type="button" data-turn="1">↷ +1°</button><button type="button" data-remove>เก็บกระจก</button></div><progress max="1800" value="0" aria-label="พลังแสง"></progress><small aria-live="polite"></small>';
  const range=controls.querySelector('input'), output=controls.querySelector('output'), progress=controls.querySelector('progress'), status=controls.querySelector('small');
  let placed=false, turning=false, angle=0, held=0, charged=false, frame=0, last=performance.now(), stopped=false;
  const turn = v => {angle=((Number(v)%180)+180)%180;range.value=angle;output.value=`${angle}°`;held=0;};
  range.oninput=()=>turn(range.value);
  controls.querySelectorAll('[data-turn]').forEach(b=>b.onclick=()=>turn(angle+Number(b.dataset.turn)));
  const remove=()=>{placed=false;turning=false;held=0;charged=false;layer.hidden=true;controls.hidden=true;onState();};
  controls.querySelector('[data-remove]').onclick=remove;
  const points=()=>Object.fromEntries(Object.entries(MIRROR_LAYOUT).map(([key,p])=>[key,anchor(...p).map(v=>v/100)]));
  const draw=now=>{
    if(stopped || !alive()) {destroy();return;}
    const dt=Math.min(100,Math.max(0,now-last));last=now;
    if(placed) {
      const p=points(), layout={source:p.source,pivot:p.pivot,target:p.target};
      const aspect=roomEl.clientWidth/Math.max(1,roomEl.clientHeight), beam=mirrorBeam(angle,aspect,layout);
      if(turning && !charged && beam.hit && canCharge()) held+=dt;else if(!charged) held=0;
      const imageAspect=aspect*((p.pivot[0]-p.source[0])/(MIRROR_LAYOUT.pivot[0]-MIRROR_LAYOUT.source[0]))/((p.pivot[1]-p.source[1])/(MIRROR_LAYOUT.pivot[1]-MIRROR_LAYOUT.source[1]));
      if(held>=MIRROR_HOLD_MS && !charged) {charged=!!onCharge(angle,imageAspect);held=charged?MIRROR_HOLD_MS:0;}
      const xy=p=>p.map(v=>v*100).join(',');
      mask.setAttribute('d',`M${xy(p.source)} L${xy(p.pivot)}`);
      ray.setAttribute('d',`M${xy(p.source)} L${xy(p.pivot)} L${xy(beam.end)}`);
      ray.setAttribute('stroke',beam.hit?'#aef9ff':'#ffe39b');
      pivot.setAttribute('cx',p.pivot[0]*100);pivot.setAttribute('cy',p.pivot[1]*100);
      surface.setAttribute('transform',`translate(${p.pivot[0]*100},${p.pivot[1]*100}) rotate(${Math.atan2(Math.sin(rad(angle)),Math.cos(rad(angle))/aspect)*180/Math.PI})`);
      item.style.left=`${p.target[0]*100}%`;item.style.top=`${p.target[1]*100}%`;item.classList.toggle('charged',charged);
      progress.value=held;
      status.textContent=charged?'เติมพลังกระจกวิเศษ +1 สำเร็จ':!canCharge()?'พลังเต็มหรือกำลังรอเติมครั้งถัดไป':beam.hit?'แสงถึงกระจกแล้ว… ค้างไว้เพื่อเติมพลัง':'หมุนให้ลำแสงสะท้อนไปถึงกระจกวิเศษบนแท่น';
    }
    frame=requestAnimationFrame(draw);
  };
  const destroy=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);layer.remove();controls.remove();};
  remove();frame=requestAnimationFrame(draw);
  return { place(){if(!canPlace())return false;placed=true;layer.hidden=false;return true;},
    adjust(){if(!placed)return false;turning=true;controls.hidden=false;return true;},
    placed:()=>placed, destroy };
}
