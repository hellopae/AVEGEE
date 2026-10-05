// B8 loop for training games that draw their own panel (def.ui). Same contract as the B4 host:
// owns every listener/frame, freezes clock + input while paused/hidden, abandons when the room is gone.
export function runPanel(host, def, engine, { session, paused, alive, onResult, onAbandon,
  raf = requestAnimationFrame, caf = cancelAnimationFrame }) {
  let stopped = false, frame = 0, previous = null, ui = null;
  const controller = new AbortController();
  const frozen = () => paused() || document.hidden;
  const ctx = {
    seconds: def.seconds, frozen,
    input: a => { if (!stopped && !frozen()) engine.input(a); },
    listen: (target, name, fn) => target.addEventListener(name, fn, { signal: controller.signal }),
  };
  document.addEventListener('visibilitychange', () => { previous = null; if (document.hidden) engine.input('cancel'); }, { signal: controller.signal });
  host.replaceChildren();
  ui = def.ui(host, engine, ctx);
  const stop = () => { if (stopped) return; stopped = true; caf(frame); controller.abort(); ui?.destroy?.(); };
  const loop = now => {
    if (stopped) return;
    if (!alive()) { stop(); onAbandon(); return; }
    const dt = previous == null ? 0 : Math.max(0, Math.min(.1, (now - previous) / 1000));
    previous = now;
    const pause = frozen();
    if (pause) engine.input('cancel'); else engine.step(dt);
    const v = engine.view();
    ui.update(v, pause);
    if (v.done) {
      const score = engine.score(), completed = engine.completed();
      stop(); onResult({ sessionId: session.id, score, completed }); return;
    }
    frame = raf(loop);
  };
  frame = raf(loop);
  return stop;
}
