import {z3FogDensity} from './z3-fog-density.js';
import {getGraphicsMode} from './graphics-setting.js';
import {registerGpuLossReset} from './gpu-budget.js';
// Z3-FOG (owner 15 Nov): drifting fog banks of the frozen zone.
//  - Every bank is a handful of soft puffs that slide against each other, so a bank rolls and billows instead of sliding as one flat strip.
//  - A bank is placed in the SAME depth-sorted list as buildings, trees and characters (addZ3FogLayers, scene.js): whatever stands behind a bank
//    is veiled by it, whatever stands in front is not. The ground itself is never tinted or filtered; this is a drawn overlay only.
//  - Density follows the map: thick over the frozen water, falls and gorges, thin on the plazas and roads (z3-fog-density.js, built from the ground art).
//  - The colour is a cool grey-blue, not white, and the peak is low: the whole screen must not get paler (checked: mean luminance within 6 points of "fog off").
export const FOG_FX = Object.freeze({
  tint: '122,152,188',
  peak: .9,                 // opacity of the thickest puff layer before the density map scales it
  cell: [.78, .36],          // lattice cell, fraction of the visible width / height (same idea as the cloud shadows)
  fit: .92,                  // bank width = fit x sqrt(visible w x h) x spread
  tall: .5,                  // bank height = width x tall x tallness
  spread: [.8, 1.3], tallness: [.8, 1.25], jitter: .22, oddFill: .7,
  drift: [.05, .006],        // cells per second (x, y)
  roll: [.07, .06],          // each puff layer slides this much of the bank size, slowly, in its own phase
  minDensity: .06,           // banks thinner than this (after the density map) are not drawn
  layers: Object.freeze({high: 3, performance: 2}),
});
const frac = n => n - Math.floor(n);
const hash = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const cellHash = (i, j, k) => hash(i * 73.13 + j * 191.7 + k * 17.31 + .5);
const smooth = x => x * x * (3 - 2 * x);

/** Four baked puff clusters (320 x 160): ~18 overlapping soft discs of uneven size, a few wisps carved out, no hard edge anywhere. */
let puffs = null, puffsBroken = false;
registerGpuLossReset('zone3-fog', () => { puffs = null; puffsBroken = false; });
function puffSprites() {
  if (puffs) return puffs;
  if (puffsBroken) return null;
  if (typeof document === 'undefined') return null;   // not cached: a later call with a usable document builds them
  const out = [];
  for (let s = 0; s < 4; s++) {
    const c = document.createElement('canvas'); c.width = 320; c.height = 160;
    const p = c.getContext('2d'); if (!p || typeof p.createRadialGradient !== 'function') { puffsBroken = true; return null; }
    const discs = 27 + (s % 2) * 4;
    for (let d = 0; d < discs; d++) {
      const h = k => hash(s * 211 + d * 17 + k);
      const u = (d + h(1) * .8) / discs, cx = .15 + .7 * u, cy = .5 + (h(2) - .5) * .36 * Math.sin(u * Math.PI + .2);
      let rr = (.06 + .15 * h(3) * (1 - Math.abs(u - .5) * .9)) * 320;       // horizontal radius, px
      rr = Math.min(rr, cx * 320, (1 - cx) * 320);
      const vr = Math.min(rr * (.5 + .4 * h(4)), cy * 160, (1 - cy) * 160);   // vertical radius, px: kept inside the sprite, so no disc is ever cut flat
      const g = p.createRadialGradient(0, 0, 0, 0, 0, rr);
      const a = .27 + .25 * h(5);
      for (const [at, f] of [[0, 1], [.2, .9], [.4, .66], [.6, .4], [.8, .15], [1, 0]]) g.addColorStop(at, `rgba(255,255,255,${a * f})`);
      p.save(); p.translate(cx * 320, cy * 160); p.scale(1, vr / rr); p.fillStyle = g; p.fillRect(-rr, -rr, rr * 2, rr * 2); p.restore();
    }
    // carve a few wisps so the bank has gaps and a shape
    p.globalCompositeOperation = 'destination-out';
    for (let d = 0; d < 5; d++) {
      const h = k => hash(s * 389 + d * 29 + k), cx = (.2 + .6 * h(1)) * 320, cy = (.3 + .4 * h(2)) * 160, rr = (.05 + .07 * h(3)) * 320;
      const g = p.createRadialGradient(0, 0, 0, 0, 0, rr);
      g.addColorStop(0, 'rgba(0,0,0,.42)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      p.save(); p.translate(cx, cy); p.scale(1.6, .6 + .3 * h(4)); p.fillStyle = g; p.fillRect(-rr, -rr, rr * 2, rr * 2); p.restore();
    }
    p.globalCompositeOperation = 'source-in'; p.fillStyle = `rgb(${FOG_FX.tint})`; p.fillRect(0, 0, 320, 160);
    out.push(c);
  }
  return puffs = out;
}
// Wind offset per canvas: pausing holds it, zooming never makes it jump.
const clocks = new WeakMap();
function wind(ctx, time, rate) {
  let c = clocks.get(ctx); if (!c) clocks.set(ctx, c = {last: time, x: 0, y: 0});
  const dt = Math.min(250, Math.max(0, time - c.last)); c.last = time;
  c.x += rate[0] * dt / 1000; c.y += rate[1] * dt / 1000;
  return c;
}
/** Visible banks as plain data, back to front. `view` = visible rect in world units. `densityAt(x,y)` 0..1 (world units). Pure apart from the wind clock. */
export function fogBanks(ctx, view, time, {densityAt = () => .5, fx = FOG_FX} = {}) {
  const sprites = puffSprites(); if (!sprites) return [];
  const off = wind(ctx, time, [fx.drift[0] * view.w * fx.cell[0], fx.drift[1] * view.h * fx.cell[1]]);
  const cw = view.w * fx.cell[0], ch = view.h * fx.cell[1], t = time / 1000;
  const i0 = Math.floor((view.x - off.x) / cw) - 1, i1 = Math.ceil((view.x + view.w - off.x) / cw) + 1;
  const j0 = Math.floor((view.y - off.y) / ch) - 1, j1 = Math.ceil((view.y + view.h - off.y) / ch) + 1;
  const unit = Math.sqrt(view.w * view.h), out = [];
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    if (((i + j) % 2 + 2) % 2 && cellHash(i, j, 1) > fx.oddFill) continue;
    const cx = off.x + (i + .5 + (cellHash(i, j, 3) - .5) * 2 * fx.jitter) * cw, cy = off.y + (j + .5 + (cellHash(i, j, 4) - .5) * 2 * fx.jitter) * ch;
    const f = fx.spread[0] + cellHash(i, j, 5) * (fx.spread[1] - fx.spread[0]);
    const dens = densityAt(cx, cy);
    if (dens < fx.minDensity) continue;
    const size = (.62 + .55 * dens) * f, pw = unit * fx.fit * size, ph = pw * fx.tall * (fx.tallness[0] + cellHash(i, j, 7) * (fx.tallness[1] - fx.tallness[0]));
    if (cx + pw * .65 < view.x || cx - pw * .65 > view.x + view.w || cy + ph * .65 < view.y || cy - ph * .65 > view.y + view.h) continue;
    out.push({i, j, cx, cy, pw, ph, dens, t, depth: cy + ph * .22});
  }
  return out.sort((a, b) => a.depth - b.depth);
}
/** Draw one bank: 2-3 puff layers that slide, swell and fade out of step with each other. */
export function drawFogBank(ctx, b, fx = FOG_FX) {
  const sprites = puffSprites(); if (!sprites) return;
  const n = fx.layers[getGraphicsMode()] ?? fx.layers.high, t = b.t, ph0 = cellHash(b.i, b.j, 6) * 6.283;
  const base = fx.peak * (.04 + .96 * Math.pow(smooth(Math.min(1, b.dens / .85)), 1.5));
  for (let k = 0; k < n; k++) {
    const sp = sprites[(Math.floor(cellHash(b.i, b.j, 2) * 4) + k * 3 + 1) % sprites.length];
    const sp1 = .09 + .035 * k, w = Math.sin(t * sp1 + ph0 + k * 2.1), w2 = Math.cos(t * sp1 * .8 + ph0 * 1.3 + k * 1.3);
    const sx = 1 + .11 * Math.sin(t * .07 + ph0 + k) + (k - 1) * .06, sy = 1 + .14 * w2;
    const pw = b.pw * sx * (1 - k * .06), ph = b.ph * sy;
    const x = b.cx + w * b.pw * fx.roll[0] * (k % 2 ? -1 : 1) + (k - 1) * b.pw * .05, y = b.cy + w2 * b.ph * fx.roll[1] * (k ? 1 : -1);
    ctx.globalAlpha = Math.min(1, base * (.72 + .28 * Math.sin(t * .11 + ph0 * 2 + k * 1.7)) * (k === 0 ? 1 : .85));
    ctx.drawImage(sp, x - pw / 2, y - ph / 2, pw, ph);
  }
  ctx.globalAlpha = 1;
}
/** Immediate-mode fog (frontier map, dialog scenes): same banks, drawn in one pass, no depth sorting. */
export function drawFogField(ctx, view, time, opts = {}) {
  const fx = opts.peak ? {...FOG_FX, peak: opts.peak} : FOG_FX;
  for (const b of fogBanks(ctx, view, time, {...opts, fx})) drawFogBank(ctx, b, fx);
}
/** Zone 3 town: add this frame's fog banks to the depth-sorted layer list `at(y, fn)`. `world` = {w,h} of the map (the density map covers it all). */
export function addZ3FogLayers(at, ctx, view, time, world = {w: 3840, h: 2560}) {
  if (!view) return 0;
  const banks = fogBanks(ctx, view, time, {densityAt: (x, y) => z3FogDensity(x / world.w, y / world.h)});
  for (const b of banks) at(b.depth, () => drawFogBank(ctx, b));
  return banks.length;
}
