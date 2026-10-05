// B8 sawan → บุญ — Breathing training. Hold while the circle breathes in, release when it breathes out; 8 breaths, 32 s.
// A round counts when BOTH the press (near the start of the inhale) and the release (near the start of the exhale)
// land within TOLERANCE seconds of the cue. Score rewards accuracy; 6 of 8 rounds must count.
import { el, clockText } from './kit.js';

export const SECONDS = 32, ROUNDS = 8, LEAD = 1.6, PERIOD = 3.8, INHALE = 1.9, TOLERANCE = .6, CAPTURE = 1.2, NEED = 6;
const EPS = 1e-6;   // frame-step float error must not flip a boundary press
const cueStart = r => LEAD + r * PERIOD;

export function create() {
  let time = 0, holdFrom = null, stray = 0;
  const rounds = Array.from({ length: ROUNDS }, () => null);   // null | { ok, error }
  const phaseAt = t => t < LEAD ? 'ready' : ((t - LEAD) % PERIOD) < INHALE ? 'in' : 'out';
  return {
    step(dt) {
      if (time >= SECONDS || !Number.isFinite(dt) || dt <= 0) return;
      time = Math.min(SECONDS, time + dt);
      if (time >= SECONDS) holdFrom = null;
    },
    input(action) {
      if (time >= SECONDS) return;
      if (action === 'hold') { if (holdFrom == null) holdFrom = time; return; }
      if (action === 'cancel') { holdFrom = null; return; }          // pause / tab hidden / pointer lost: discard the breath
      if (action !== 'release' || holdFrom == null) return;
      const press = holdFrom, release = time; holdFrom = null;
      const r = Math.round((press - LEAD) / PERIOD);
      // a press more than CAPTURE s from any cue is just a stray touch: it neither scores nor uses up a round
      if (r < 0 || r >= ROUNDS || rounds[r] || Math.abs(press - cueStart(r)) > CAPTURE) { stray++; return; }
      const early = Math.abs(press - cueStart(r)), late = Math.abs(release - (cueStart(r) + INHALE));
      rounds[r] = early <= TOLERANCE + EPS && late <= TOLERANCE + EPS ? { ok: true, error: (early + late) / 2 } : { ok: false, error: Math.max(early, late) };
    },
    view() {
      const phase = phaseAt(time), local = time < LEAD ? 0 : (time - LEAD) % PERIOD;
      const round = Math.min(ROUNDS - 1, Math.max(0, Math.floor((time - LEAD) / PERIOD)));
      const progress = phase === 'in' ? local / INHALE : phase === 'out' ? 1 - (local - INHALE) / (PERIOD - INHALE) : 0;
      return { kind: 'breath', time, seconds: SECONDS, phase, round: round + 1, rounds: ROUNDS, progress,
        holding: holdFrom != null, results: rounds.map(x => x == null ? null : x.ok), stray, successes: rounds.filter(x => x?.ok).length,
        done: time >= SECONDS };
    },
    score() { return Math.round(rounds.reduce((sum, x) => sum + (x?.ok ? 70 + 30 * (1 - x.error / TOLERANCE) : 0), 0) / ROUNDS); },
    completed() { return rounds.filter(x => x?.ok).length >= NEED; },
  };
}

export function mount(host, engine, ctx) {
  const info = el('p', { cls: 'tr-info' });
  const cue = el('p', { cls: 'tr-cue' });
  const ring = el('div', { cls: 'tr-breath-ring' });
  const orb = el('div', { cls: 'tr-breath-orb' });
  ring.append(orb);
  const dots = Array.from({ length: ROUNDS }, () => el('span', { cls: 'tr-dot', text: '○' }));
  const row = el('div', { cls: 'tr-dots', attrs: { 'aria-hidden': 'true' } }, ...dots);
  const hold = el('button', { type: 'button', cls: 'tr-hold', text: '🫁 กดค้าง / Hold' });
  hold.style.touchAction = 'none';
  host.replaceChildren(info, cue, ring, row, hold);
  ctx.listen(hold, 'pointerdown', e => { e.preventDefault(); hold.setPointerCapture?.(e.pointerId); ctx.input('hold'); });
  ctx.listen(hold, 'pointerup', () => { if (ctx.frozen()) engine.input('cancel'); else ctx.input('release'); });
  for (const name of ['pointercancel', 'lostpointercapture', 'blur']) ctx.listen(hold, name, () => engine.input('cancel'));
  ctx.listen(hold, 'keydown', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); if (!e.repeat) ctx.input('hold'); } });
  ctx.listen(hold, 'keyup', e => { if ([' ', 'Enter'].includes(e.key)) { e.preventDefault(); ctx.input('release'); } });
  return {
    update(v, pause) {
      const scale = .3 + .7 * v.progress;
      orb.style.transform = `scale(${scale.toFixed(3)})`;
      ring.setAttribute('class', `tr-breath-ring ${v.phase}${v.holding ? ' holding' : ''}`);
      cue.textContent = pause ? 'หยุดพัก / Paused'
        : v.phase === 'ready' ? 'เตรียมหายใจ / Get ready'
        : v.phase === 'in' ? 'หายใจเข้า — กดค้าง / Breathe in — hold' : 'หายใจออก — ปล่อย / Breathe out — release';
      info.textContent = clockText(`${v.round}/${v.rounds} · ✓ ${v.successes}/${NEED}`, v.seconds, v.time);
      v.results.forEach((r, i) => {
        const missed = r == null && v.time > cueStart(i) + INHALE + TOLERANCE;
        const state = r === true ? 'ok' : r === false || missed ? 'bad' : '';
        dots[i].textContent = state === 'ok' ? '✓' : state === 'bad' ? '✗' : '○';
        dots[i].setAttribute('class', `tr-dot${state ? ` ${state}` : ''}`);
      });
      hold.disabled = pause;
      hold.setAttribute('aria-pressed', String(v.holding));
    },
  };
}
