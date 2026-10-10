import { t } from '../i18n.js';
import { stokePosition, stokeHit, trainingRadius, trainingHit } from '../krata-control.js';

// One room-owned overlay. All input and animation are removed by stop().
export function runKrataQte(host, {g, st, room, training=false, alive, onClose}) {
  let stopped=false, raf=0, session=null, elapsed=0, last=performance.now(), result=false;
  const stop = () => { stopped=true; cancelAnimationFrame(raf); if (session) g.cancelKrata(session); };
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
    body.innerHTML=training ? `<div class="g5-count" aria-live="polite">🔥 0/5 · ${t('g5.misses')} 0/3</div><div class="g5-closeup"><img class="g5-portrait" src="img/krata-minigame/${actor==='yama'?'yama':'plerng'}-cutscene.jpeg" alt=""><div class="g5-orb" style="left:${actor === 'yama' ? 39 : 31}%;top:${actor === 'yama' ? 49 : 54}%"><img src="img/krata-minigame/fireball.png" alt=""><i class="g5-green"></i><i class="g5-white"></i></div></div><button class="btn-gold" data-fire type="button">${t('g5.fire')}</button>`
      : `<p>${t('g5.approach')}</p><div class="g5-bar"><i class="g5-zone"></i><i class="g5-needle"></i></div><button class="btn-gold" data-fire type="button" disabled>${t('g5.fire')}</button>`;
    if (!training) room.walkTo(...stApproach());
    let ready=training;
    const button=body.querySelector('[data-fire]');
    const attempt = hit => {
      if (training) {
        const state=g.attemptFireTraining(session,hit);
        if (!state) { close(); return; }
        body.querySelector('.g5-count').textContent=`🔥 ${state.hits}/5 · ${t('g5.misses')} ${state.misses}/3`;
        body.querySelector('.g5-orb img').style.transform=`scale(${1+state.hits*.12})`;
        elapsed=0;
        if (state.done) finish(state.won);
      } else {
        g.finishStoke(session,hit); room.stokeEffect(hit); finish(hit);
      }
    };
    button.onclick=() => {
      if (stopped || result || !ready || g.paused) return;
      attempt(training?trainingHit(trainingRadius(elapsed)):stokeHit(stokePosition(elapsed)));
    };
    function frame(now) {
      if (stopped) return;
      if (!alive()) { close(); return; }
      const dt=Math.min(100,now-last); last=now;
      if (!g.paused && !result) {
        if (!ready) {
          const pos=room.pos(), target=stApproach();
          if (Math.hypot(pos[0]-target[0],pos[1]-target[1])<.012) {
            ready=true; button.disabled=false; body.querySelector('p').textContent=t('g5.stokeTip');
          }
        } else {
          elapsed+=dt;
          if (training) {
            const radius=trainingRadius(elapsed);
            body.querySelector('.g5-white').style.transform=`translate(-50%,-50%) scale(${radius})`;
            if (radius < .86 || elapsed >= 2200) attempt(false);
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
