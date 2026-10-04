import { TRAINING_GAMES, createTrainingGame } from './index.js';

// Own every listener/frame. Pausing and hidden tabs freeze both clock and input.
export function runTraining(host, { station, session, paused, alive, onResult, onAbandon,
  raf = requestAnimationFrame, caf = cancelAnimationFrame }) {
  const engine = createTrainingGame(station, session.seed);
  let stopped = false, frame = 0, previous = null;
  const controller = new AbortController();
  const text = document.createElement('p'); text.setAttribute('aria-live', 'polite');
  const gauge = document.createElement('progress'); gauge.max = 100; gauge.setAttribute('aria-label', 'พลัง / Power');
  const action = document.createElement('button'); action.type = 'button';
  action.className = 'gold training-action'; action.style.touchAction = 'none';
  action.style.minHeight = '100px'; action.style.fontSize = '1.2rem';
  gauge.style.width = '100%'; gauge.style.height = '24px';
  const cool = document.createElement('button'); cool.type = 'button'; cool.textContent = '− ลดไฟ / Cool'; cool.style.minHeight = '48px';
  host.replaceChildren(text, gauge, action);
  if (TRAINING_GAMES[station].kind === 'fire') host.append(cool);
  const frozen = () => paused() || document.hidden;
  const input = a => { if (!stopped && !frozen()) engine.input(a); };
  const listen = (el, name, fn) => el.addEventListener(name, fn, { signal:controller.signal });
  listen(document, 'visibilitychange', () => { previous = null; if (document.hidden) engine.input('cancel'); });
  if (TRAINING_GAMES[station].kind === 'stone') {
    listen(action, 'pointerdown', e => { e.preventDefault(); action.setPointerCapture(e.pointerId); input('hold'); });
    listen(action, 'pointerup', () => { if (frozen()) engine.input('cancel'); else input('release'); });
    listen(action, 'pointercancel', () => engine.input('cancel'));
    listen(action, 'lostpointercapture', () => engine.input('cancel'));
    listen(action, 'blur', () => engine.input('cancel'));
    listen(action, 'keydown', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); input('hold'); } });
    listen(action, 'keyup', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); input('release'); } });
  } else listen(action, 'click', () => input('hit'));
  listen(cool, 'click', () => input('cool'));
  const stop = () => { if (stopped) return; stopped = true; caf(frame); controller.abort(); };
  const loop = now => {
    if (stopped) return;
    if (!alive()) { stop(); onAbandon(); return; }
    const dt = previous == null ? 0 : Math.max(0, Math.min(.1, (now - previous) / 1000));
    previous = now;
    const pause = frozen();
    if (pause) engine.input('cancel');
    else engine.step(dt);
    const v = engine.view();
    action.disabled = cool.disabled = pause;
    gauge.value = v.kind === 'fire' ? v.heat : v.kind === 'stone' ? v.lift : v.green ? 100 : 0;
    text.textContent = pause ? 'หยุดพัก / Paused' : `${Math.ceil(30 - v.time)}s · ${v.kind === 'fire' ? `🔥 ${Math.round(v.heat)} / 40–60` : `${v.round}/${v.rounds} · ✓ ${v.successes}${v.kind === 'stone' ? ` · ${Math.round(v.lift)} / 55–75` : ''}`}`;
    action.textContent = v.kind === 'fire' ? '+ พัดไฟ / Fan' : v.kind === 'stone' ? '🪨 กดค้าง / Hold' : v.decoy ? '× เป้าหลอก / Decoy' : '⚔️ แตะเพื่อฟัน / Strike';
    action.style.background = v.green && !v.decoy ? '#247747' : '#674b38';
    if (v.done) {
      const score = engine.score();
      const completed = v.kind === 'fire' ? score >= 60 : v.successes >= (v.kind === 'sword' ? 8 : 6);
      stop(); onResult({ sessionId:session.id, score, completed }); return;
    }
    frame = raf(loop);
  };
  frame = raf(loop);
  return stop;
}
