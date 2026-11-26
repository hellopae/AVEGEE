// city-fire.js - FB3-L4 / FB3-L5 (owner 26 Nov): what a seized city looks like on the map, drawn in CODE over the painted ground (no new map art).
//  1. the burning city of Zones 1-3 while the world is seized (flames on the buildings and houses, a soft orange glow, a little smoke) - gone the moment the zone's lord is freed (seized.js zoneSeized)
//  2. the "controlled" look of the Gate Guard and of Cerberus: green eyes + the green scan lines the game already uses for a controlled foe (breach-approach `hypno`, `.signal-controlled`) - until the Guard is freed
// Display only: no collision, no state. Budgeted: at most MAX_FIRES burning spots in view (fewer on a small canvas), no smoke on a phone, one frozen frame for reduced motion.
import { zoneSeized } from './seized.js';
import { Z4G_KEYS } from './seized-keys.js';
import { STATIONS } from './data.js';
import { TOWN_HOUSE_SITES } from './town-layout.js';
import { viewMetrics } from './map-ambient.js';
import { gpuLossEpoch } from './gpu-budget.js';   // the two baked sprites below are rebuilt after a GPU loss (T1c audit)

/** is this map a burning city right now? (Zones 1-3 while the lord is still controlled) */
export const cityFireOn = g => !!g && g.zone !== 'cyberhell' && zoneSeized(g);
/** the Gate Guard and Cerberus are controlled from the seizure until Nira frees the Guard (the duel at the gate is won) */
export const gateControlled = g => !!g && g.zone !== 'cyberhell' && zoneSeized(g) && g.zoneEvents?.[g.zone]?.[Z4G_KEYS.guardEvent] !== 'cleared';

export const MAX_FIRES = 12, MAX_FIRES_SMALL = 5, SMALL_CANVAS_CSS_W = 620;
/** burning spots in world units: every station building first (the registry hall - "the first hall Yama ever worked in" - is the one the fire scene shows), then the houses */
export function fireSpots(g = null) {
  const out = [];
  // FB3-L9 (Dale's review): a station that is not built is only an empty pad - it must not burn. `g` = the game (built stations = g.stations that are no longer scaffolding); without it every site is listed (tests of the geometry)
  const built = g ? new Set((g.stations || []).filter(s => !s.build).map(s => s.def.k)) : null;
  for (const d of STATIONS) if (d.bx != null && d.bw > 0 && (!built || built.has(d.k))) out.push({ x:d.bx, y:d.by - d.bw * .18, w:Math.min(120, d.bw * .5), key:d.k, big:d.k === 'sala' });
  for (const h of TOWN_HOUSE_SITES) out.push({ x:h.x, y:h.y - (h.h || h.w) * .3, w:Math.min(90, h.w * .55), key:`house:${h.x}`, big:false });
  return out;
}
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
let glowSprite = null, glowEpoch = -1;
function glow() {
  if (glowSprite && glowEpoch !== gpuLossEpoch()) glowSprite = null;
  if (glowSprite || typeof document === 'undefined') return glowSprite;
  glowEpoch = gpuLossEpoch();
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const p = c.getContext?.('2d'); if (!p || p.canvas !== c) return null;
  const g = p.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,170,70,.9)'); g.addColorStop(.35, 'rgba(255,110,40,.4)'); g.addColorStop(1, 'rgba(255,80,20,0)');
  p.fillStyle = g; p.fillRect(0, 0, 128, 128);
  return glowSprite = c;
}
let smokeSprite = null, smokeEpoch = -1;
function smoke() {
  if (smokeSprite && smokeEpoch !== gpuLossEpoch()) smokeSprite = null;
  if (smokeSprite || typeof document === 'undefined') return smokeSprite;
  smokeEpoch = gpuLossEpoch();
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const p = c.getContext?.('2d'); if (!p || p.canvas !== c) return null;
  const g = p.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(70,58,60,.55)'); g.addColorStop(1, 'rgba(70,58,60,0)');
  p.fillStyle = g; p.fillRect(0, 0, 64, 64);
  return smokeSprite = c;
}
/** a few flame tongues drawn in code (no picture): pointed teardrops, a yellow core, flickering and leaning with the time */
function flames(ctx, x, y, w, t, n, seed) {
  ctx.save();
  for (let i = 0; i < n; i++) {
    const ph = t / (210 + i * 47) + i * 2.3 + seed * 6, flick = .5 + .5 * Math.sin(ph * 1.9);
    const mid = Math.abs(i - (n - 1) / 2), fx = x + (i - (n - 1) / 2) * w * .26 + Math.sin(ph) * w * .03;
    const h = w * (.75 + .45 * flick) * (1 - mid * .18), fw = w * .095, lean = Math.sin(ph * .8 + i) * w * .08;
    const grad = ctx.createLinearGradient(fx, y, fx, y - h);
    grad.addColorStop(0, 'rgba(255,205,90,.95)'); grad.addColorStop(.5, 'rgba(255,115,30,.8)'); grad.addColorStop(1, 'rgba(200,45,10,0)');
    ctx.fillStyle = grad; ctx.globalAlpha = .9;
    ctx.beginPath(); ctx.moveTo(fx + lean, y - h);
    ctx.bezierCurveTo(fx + fw * 1.9 + lean * .3, y - h * .5, fx + fw * 1.3, y, fx, y);
    ctx.bezierCurveTo(fx - fw * 1.3, y, fx - fw * 1.9 + lean * .3, y - h * .5, fx + lean, y - h);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,238,160,.85)'; ctx.globalAlpha = .55 + .35 * flick;
    ctx.beginPath(); ctx.moveTo(fx + lean * .4, y - h * .5);
    ctx.bezierCurveTo(fx + fw * .9, y - h * .22, fx + fw * .7, y, fx, y); ctx.bezierCurveTo(fx - fw * .7, y, fx - fw * .9, y - h * .22, fx + lean * .4, y - h * .5);
    ctx.fill();
  }
  ctx.restore();
}
/** how many burning spots / whether smoke, for a canvas this wide (CSS px) - exported so the budget is testable */
export function fireBudget(cssWidth, reduced = false) {
  const small = cssWidth < SMALL_CANVAS_CSS_W;
  return { max:small ? MAX_FIRES_SMALL : MAX_FIRES, smoke:!small && !reduced, animate:!reduced };
}
export function drawCityFire(ctx, g, t, reduced = false, W, H) {
  if (!cityFireOn(g)) return 0;
  const view = viewMetrics(ctx, W, H); if (!view) return 0;
  const css = ctx.canvas?.clientWidth || (ctx.canvas?.width || 1000) / (globalThis.devicePixelRatio || 1);
  const bud = fireBudget(css, reduced), pad = 90;
  const spots = fireSpots(g).filter(s => s.x > view.x - pad && s.x < view.x + view.w + pad && s.y > view.y - pad && s.y < view.y + view.h + pad * 2);
  spots.sort((a, b) => (b.big - a.big) || (a.y - b.y)); spots.length = Math.min(spots.length, bud.max);
  const gl = glow(), sm = smoke(), tt = bud.animate ? t : 0;
  ctx.save();
  for (const [i, s] of spots.entries()) {
    const seed = hash(s.x + s.y);
    if (gl) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + (bud.animate ? .12 * Math.sin(tt / 230 + seed * 9) : 0); const r = s.w * 1.7; ctx.drawImage(gl, s.x - r, s.y - r * 1.1, r * 2, r * 2); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    flames(ctx, s.x, s.y, s.w * (s.big ? 1.25 : 1), tt + i * 413, s.big ? 4 : 3, seed);
    if (bud.smoke && sm) for (let k = 0; k < 2; k++) {
      const ph = ((tt / 5200 + seed + k * .5) % 1), a = Math.sin(ph * Math.PI) * .5;
      ctx.globalAlpha = a; const r = s.w * (.5 + ph * .9);
      ctx.drawImage(sm, s.x + Math.sin(ph * 5 + k * 3) * s.w * .4 - r / 2, s.y - s.w * .6 - ph * s.w * 2.1 - r / 2, r, r);
    }
  }
  ctx.restore();
  return spots.length;
}

/** the controlled look: two green eyes at the head and the green scan lines across the body (the same lines `.signal-controlled` / frontier.js draw), over a standing figure of height `h` whose feet are at (x, y) */
export function drawControlledMark(ctx, x, y, h, t, reduced = false) {
  h *= .8;   // the drawn body is shorter than the nominal height (standeeFit)
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const pulse = reduced ? .85 : .75 + .25 * Math.sin(t / 320 + x);
  const top = y - h, w = h * .46;
  ctx.strokeStyle = '#7dffd6'; ctx.lineWidth = Math.max(2, h * .02);
  ctx.globalAlpha = .8 * pulse;
  for (let k = 0; k < 7; k++) {
    const sy = top + ((k / 7) + (reduced ? 0 : (t % 700) / 4900)) % 1 * h;
    ctx.beginPath(); ctx.moveTo(x - w / 2, sy); ctx.lineTo(x + w / 2, sy); ctx.stroke();
  }
  // the green visor line across the eyes + two bright eyes
  const ey = top + h * .3;
  ctx.globalAlpha = pulse; ctx.lineWidth = Math.max(2.5, h * .03); ctx.strokeStyle = '#a1ffe1';
  ctx.beginPath(); ctx.moveTo(x - w * .42, ey); ctx.lineTo(x + w * .42, ey); ctx.stroke();
  ctx.fillStyle = '#e6fff6'; const er = Math.max(2.2, h * .035);
  for (const dx of [-.075, .075]) { ctx.beginPath(); ctx.arc(x + dx * h, ey, er, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}
