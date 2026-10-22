import { t } from '../i18n.js';
import { stokePosition, stokeHit, trainingRadius, trainingHit } from '../krata-control.js';

// One room-owned overlay. All input and animation are removed by stop().
export function runKrataQte(host, {g, st, room, training=false, alive, onClose}) {
  const events=new AbortController();
  const frozen=()=>g.paused || document.hidden;
  let stopped=false, raf=0, session=null, elapsed=0, last=performance.now(), result=false, frameAt=0, keyAt=-1e9;
  const timers=new Set(), seen=new WeakSet();
  const setText=(el,text)=>{ if(el && el._s!==text){ el._s=text; el.textContent=text; } };   // P6: เขียน DOM เฉพาะตอนข้อความเปลี่ยนจริง ไม่ทุกเฟรม
  const flash=(el,cls)=>{ if(!el) return; el.classList.toggle(cls,true); const id=setTimeout(()=>{ timers.delete(id); el.classList.toggle(cls,false); },260); timers.add(id); };
  const stop = () => { stopped=true; events.abort(); cancelAnimationFrame(raf); timers.forEach(clearTimeout); timers.clear(); if (session) g.cancelKrata(session); };
  const close = () => { stop(); onClose(); };
  host.innerHTML=`<div class="mg-head"><b>${t(training?'g5.train':'g5.stoke')}</b><button class="mg-x" type="button">${t('g5.close')}</button></div><div class="g5-content"></div>`;
  host.querySelector('.mg-x').onclick=close;
  const body=host.querySelector('.g5-content');
  const finish = won => {
    result=true;
    body.querySelector('[data-fire]')?.setAttribute('disabled','');
    const msg=document.createElement('p'); msg.className='g5-result';
    msg.textContent=t(won ? training?'g5.trained':'g5.stoked' : 'g5.miss'); body.append(msg);
  };
  function play(actor) {
    session=training?g.beginFireTraining(actor):g.beginStoke(st);
    if (!session) { close(); return; }
    elapsed=0; last=performance.now();
    const zone=['th','asia','west','cyberhell'].includes(g.zone)?g.zone:'th';
    const portrait=actor==='yama'?(zone==='th'?'img/krata-minigame/yama-cutscene.jpeg':`img/hero-yama-${zone}-fire-cutscene-v3.png`):(zone==='th'?'img/krata-minigame/plerng-cutscene.jpeg':`img/krata-minigame/plerng-${zone}-training-v2.png`);
    body.innerHTML=training ? `<div class="g5-count" aria-live="polite">🔥 0/5 · ${t('g5.misses')} 0/3</div><div class="g5-closeup"><img class="g5-portrait" src="${portrait}" alt=""><div class="g5-orb" style="left:${actor === 'yama' ? 39 : 31}%;top:${actor === 'yama' ? 49 : 54}%"><img src="img/krata-minigame/fireball.png" alt=""><i class="g5-green"></i><i class="g5-white"></i></div></div><button class="btn-gold" data-fire type="button">${t('g5.fire')}</button><small class="g5-round-message" role="status">${t('g5.hintIdle')}</small>`
      : `<p>${t('g5.approach')}</p><div class="g5-bar"><i class="g5-zone"></i><i class="g5-needle"></i></div><button class="btn-gold" data-fire type="button" disabled>${t('g5.fire')}</button>`;
    if (!training) room.walkTo(...stApproach());
    let ready=training;
    const button=body.querySelector('[data-fire]');
    const attempt = (hit, radius=1) => {
      if (training) {
        const state=g.attemptFireTraining(session,hit);
        if (!state) { close(); return; }
        body.querySelector('.g5-count').textContent=`🔥 ${state.hits}/5 · ${t('g5.misses')} ${state.misses}/3`;
        body.querySelector('.g5-orb img').style.transform=`scale(${1+state.hits*.12})`;
        elapsed=-650;
        // P6: ปุ่มไม่ถูก disable ระหว่างรอวงถัดไป (ปุ่มที่ disabled กลืนการกดเงียบๆ) — แค่ดูจางและกดแล้วขึ้นข้อความรอ
        button.classList.toggle('fire-wait',true); button.classList.remove('fire-ready');
        setText(body.querySelector('.g5-round-message'),t((hit?'g5.hit':radius>1?'g5.missEarly':'g5.missLate')+(state.done?'Last':'')));
        body.querySelector('.g5-green').classList.remove('fire-ready');
        body.querySelector('.g5-white').style.transform=`translate(-50%,-50%) scale(${trainingRadius(0)})`;
        flash(body.querySelector('.g5-closeup'),hit?'g5-hit':'g5-miss');
        if (state.done) finish(state.won);
      } else {
        g.finishStoke(session,hit); room.stokeEffect(hit); finish(hit);
      }
    };
    // P6: ตัดสินที่เวลาของ "ตอนกดจริง" (e.timeStamp) ไม่ใช่เฟรมสุดท้ายที่วาด — ไม่ให้เสียเวลาที่ค้างระหว่างเฟรม
    const press=ev => {
      if (stopped || result || !ready || frozen()) return;
      if (training && elapsed<0) { setText(body.querySelector('.g5-round-message'),t('g5.wait')); flash(body.querySelector('.g5-closeup'),'g5-wait'); return; }
      const lag=ev && Number.isFinite(ev.timeStamp) && frameAt ? Math.min(100,Math.max(0,ev.timeStamp-frameAt)) : 0;
      const at=Math.min(training?2199:7999,elapsed+lag);
      if (training) { const radius=trainingRadius(at); attempt(trainingHit(radius),radius); }
      else attempt(stokeHit(stokePosition(at)));
    };
    // ต้นเหตุ "กดไม่ติด" (P6): การกดจริงนับถูกเสมอ แต่ (1) ช่วงรอวงถัดไป 650 ms ปุ่มถูก disable → กดแล้วเงียบ
    // (2) คีย์บอร์ดต้อง focus ปุ่มก่อนถึงจะติด (คลิกเมาส์ preventDefault ไว้ จึงไม่เคย focus) (3) แตะได้แค่ตัวปุ่ม/รูป
    // → รับ pointerdown ทั้งจอ (นอกหัวข้อ/ปุ่มเลือกคน) + Space/Enter ทั้งหน้า · กดอะไรก็ได้ผลตอบกลับเสมอ
    const onPointer=e => {
      if (seen.has(e)) return; seen.add(e);
      if (e.pointerType!=='touch' && e.button!==0) return;
      if (e.target?.closest?.('.mg-head,.g5-choices')) return;
      e.preventDefault(); press(e);
    };
    button.addEventListener('pointerdown',onPointer,{signal:events.signal});
    if(training) { body.querySelector('.g5-closeup')?.addEventListener('pointerdown',onPointer,{signal:events.signal}); host.addEventListener('pointerdown',onPointer,{signal:events.signal}); }
    document.addEventListener('keydown',e=>{
      if(![' ','Enter'].includes(e.key) || e.target?.closest?.('.mg-head,.g5-choices,dialog')) return;
      e.preventDefault(); if(!e.repeat) { keyAt=performance.now(); press(e); }
    },{signal:events.signal});
    // คลิกที่เบราว์เซอร์สร้างจาก keyup ของ Space (detail 0) ซ้ำกับ keydown ที่นับไปแล้ว → ข้าม · คลิกจากโปรแกรมอ่านจอ/เทสต์ยังนับ
    button.onclick=e=>{if(!e || e.detail===0){ if(performance.now()-keyAt<700) return; press(e); }};
    document.addEventListener('visibilitychange',()=>{last=performance.now();},{signal:events.signal});
    function frame(now) {
      if (stopped) return;
      if (!alive()) { close(); return; }
      const dt=Math.min(100,now-last); last=now; frameAt=now;
      if (!frozen() && !result) {
        if (!ready) {
          const pos=room.pos(), target=stApproach();
          if (Math.hypot(pos[0]-target[0],pos[1]-target[1])<.012) {
            ready=true; button.disabled=false; body.querySelector('p').textContent=t('g5.stokeTip');
          }
        } else {
          elapsed+=dt;
          if (training) {
            button.classList.toggle('fire-wait',elapsed<0);
            if(elapsed<0){setText(button,t('g5.btnWait'));raf=requestAnimationFrame(frame);return;}
            const radius=trainingRadius(elapsed);
            body.querySelector('.g5-white').style.transform=`translate(-50%,-50%) scale(${radius})`;
            const green=trainingHit(radius);
            setText(button,green?t('g5.btnGo'):t('g5.fire'));
            button.classList.toggle('fire-ready',green);
            body.querySelector('.g5-green').classList.toggle('fire-ready',green);
            if (radius < .86 || elapsed >= 2200) {
              // An untouched circle is a retry, not an extra wrong click.
              elapsed=-650;button.classList.toggle('fire-wait',true);button.classList.remove('fire-ready');
              body.querySelector('.g5-green').classList.remove('fire-ready');
              body.querySelector('.g5-white').style.transform=`translate(-50%,-50%) scale(${trainingRadius(0)})`;
              setText(body.querySelector('.g5-round-message'),t('g5.passed'));
            }
          } else {
            body.querySelector('.g5-needle').style.left=`${stokePosition(elapsed)*100}%`;
            if (elapsed >= 8000) attempt(false);
          }
        }
      }
      raf=requestAnimationFrame(frame);
    }
    raf=requestAnimationFrame(frame);
  }
  const stApproach=() => room.krataApproach;
  if (training) {
    const plerng=g.crew.find(c=>c.k==='plerng');
    body.innerHTML=`<p>${t('g5.choose')}</p><div class="g5-choices"></div><p>${t('g5.trainTip')}</p>`;
    const choices=body.querySelector('.g5-choices');
    for (const actor of ['yama',plerng].filter(Boolean)) {
      const why=g.fireTrainingWhy(actor), state=g.fireControlState(actor);
      const b=document.createElement('button'); b.className='btn-gold'; b.type='button'; b.disabled=!!why;
      b.textContent=`${t(actor==='yama'?'g5.yama':'g5.plerng')} · ${t('g5.level')} ${state.level}/3${why?' · '+t(why):''}`;
      b.onclick=()=>play(actor); choices.append(b);
    }
  } else play('yama');
  return stop;
}

export default { get name() { return t('g5.stoke'); }, get tip() { return t('g5.stokeTip'); }, icon:'', run:runKrataQte };
