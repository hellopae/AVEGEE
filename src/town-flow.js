import {weatherEnabled,weatherBudget} from './map-ambient.js?v=mapfx-k1d';
// N4: lava, rivers and waterfalls of the painted Zone 1 ground (img/map-zone1/v4) look like they flow.
//
// Where water/lava is and which way it runs comes from one baked file, img/map-zone1/v4/flow-v4.png
// (scripts/bake-town-flow.py; 1536x1024 = 2.5 world units per pixel):
//   R = kind*40 (1 purple river, 2 lava, 3 lava fall, 4 ice river, 5 ice fall), G/B = 128 + 127*(dx,dy) downstream.
// Only what the camera sees is touched: a few hundred particles (thin streaks, sparkles, lava glows, bubbles,
// fall spray) ride the baked flow field and are drawn as bare strokes/sprites over the painting. Particles die when
// they leave the painted surface, so banks, bridges, piers and boats are never covered. No ctx.filter, no
// shadowBlur, no per-frame pixel work. Reduced motion draws nothing (the painting stays still).
import { TOWN_SIZE, townFloorAt } from './town-layout.js?v=k1d';
import { ZONE_SKIN, activeTownSkin, activeTownZone } from './zone-skin.js';

export const TOWN_FLOW_URL = ZONE_SKIN.th.flowUrl;   // Zone 1; other zones: zone-skin.js flowUrl (null = no flowing surface)
export const FLOW_W = 1536, FLOW_H = 1024;
export const FLOW_KIND = { NONE: 0, PURPLE: 1, LAVA: 2, LAVA_FALL: 3, ICE: 4, ICE_FALL: 5 };
export const FLOW_MAX_PARTICLES = 420;
const FLOW_CELLS_PER_PARTICLE = 28;

/** RGBA bytes of the baked png -> typed grids. */
export function decodeFlow(rgba, w = FLOW_W, h = FLOW_H) {
  const n = w * h, kind = new Uint8Array(n), dx = new Int8Array(n), dy = new Int8Array(n);
  for (let i = 0; i < n; i++) {
    const k = Math.round(rgba[i * 4] / 40);
    if (k < 1 || k > 5) continue;
    kind[i] = k; dx[i] = rgba[i * 4 + 1] - 128; dy[i] = rgba[i * 4 + 2] - 128;
  }
  return { w, h, kind, dx, dy, unitX: TOWN_SIZE.w / w, unitY: TOWN_SIZE.h / h };
}

// ---- particle types ----
const T_STREAK = 0, T_SPARK = 1, T_GLOW = 2, T_BUBBLE = 3, T_SPRAY = 4, T_WAVE = 5;
// Colour of the streaks per surface kind: [r,g,b].
const COLOR = [null, [218, 196, 255], [255, 222, 112], [255, 238, 168], [214, 248, 255], [244, 255, 255]];
// Speed (world units / s) per surface kind: [min, spread].
const SPEED = [null, [13, 9], [16, 14], [105, 60], [30, 16], [110, 70]];
// [type, cumulative probability] per surface kind.
const MIX = [null,
  [[T_STREAK, .35], [T_WAVE, 1]],
  [[T_STREAK, .43], [T_GLOW, .69], [T_BUBBLE, 1]],
  [[T_STREAK, 1]],
  [[T_STREAK, .35], [T_WAVE, 1]],
  [[T_STREAK, 1]],
];

let seedState = 0x9e3779b9;
const rnd = () => { seedState ^= seedState << 13; seedState >>>= 0; seedState ^= seedState >>> 17; seedState ^= seedState << 5; seedState >>>= 0; return seedState / 4294967296; };
export const seedFlow = n => { seedState = (n >>> 0) || 0x9e3779b9; };

// Everything is drawn with drawImage of tiny pre-painted sprites (one textured quad each). Stroked paths whose
// bounds span the whole screen were the slow part: the GPU rasteriser pays for the path's bounding box per stroke().
function paint(w, h, fn) {
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext?.('2d');
  if (!c) return null;
  fn(c); return cv;
}
function radial(inner, mid) {
  return paint(48, 48, c => {
    const g = c.createRadialGradient?.(24, 24, 0, 24, 24, 24);
    if (typeof g?.addColorStop !== 'function') return;
    g.addColorStop(0, inner); g.addColorStop(.35, mid); g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, 48, 48);
  });
}
/** Sprites are built lazily on the first drawn frame (after the reduced-motion check). */
export function buildFlowSprites() {
  const streak = rgb => paint(64, 4, c => {
    const g = c.createLinearGradient?.(0, 0, 64, 0);
    if (typeof g?.addColorStop !== 'function') return;
    g.addColorStop(0, `rgba(${rgb},0)`); g.addColorStop(.7, `rgba(${rgb},.6)`); g.addColorStop(1, `rgba(${rgb},1)`);
    c.fillStyle = g; c.fillRect(0, 1, 64, 2); c.globalAlpha = .45; c.fillRect(0, 0, 64, 1); c.fillRect(0, 3, 64, 1);
  });
  return {
    streak: COLOR.map(c => c ? streak(c.join(',')) : null),
    water: paint(64, 32, c => {
      // A broad trough and one broken foam crest; no additive glint or comb of bright lines.
      c.fillStyle='rgba(29,103,136,.12)';c.beginPath();c.ellipse(32,17,26,11,-.1,0,Math.PI*2);c.fill();
      c.strokeStyle='rgba(206,236,239,.36)';c.lineWidth=3;
      c.beginPath();c.ellipse(30,15,16,10,-.1,-1.3,1.2);c.stroke();
      c.fillStyle='rgba(222,243,243,.32)';
      for(const [x,y,r] of [[33,7,1.8],[42,17,2.4],[35,25,1.5]]){
        c.beginPath();c.ellipse(x,y,r*1.5,r,0,0,Math.PI*2);c.fill();
      }
    }),
    spark: paint(16, 16, c => { c.strokeStyle = '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(1, 8); c.lineTo(15, 8); c.moveTo(8, 1); c.lineTo(8, 15); c.stroke(); }),
    ring: paint(40, 24, c => {
      c.strokeStyle = '#ffec96'; c.lineWidth = 2.2;c.beginPath();c.ellipse(20,13,15,6.5,-.08,.15,5.9);c.stroke();
      c.globalAlpha=.55;c.strokeStyle='#fff2bd';c.beginPath();c.ellipse(18,11,8.5,3.5,.12,3.25,5.9);c.stroke();
    }),
    glow: radial('rgba(255,214,110,.95)', 'rgba(255,120,30,.45)'),
    mist: radial('rgba(255,255,255,.9)', 'rgba(190,235,255,.4)'),
  };
}

/** One flow engine per decoded field; the game uses a singleton, tests build their own. */
export function createFlowEngine(field, { maxParticles = FLOW_MAX_PARTICLES, floorAt = townFloorAt, sprites = null } = {}) {
  const N = maxParticles;
  const px = new Float32Array(N), py = new Float32Array(N), age = new Float32Array(N), life = new Float32Array(N),
    spd = new Float32Array(N), size = new Float32Array(N), ph = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const kind = new Uint8Array(N), type = new Uint8Array(N), alive = new Uint8Array(N), bucket = new Uint8Array(N);
  const CAND = 12000;
  const cand = new Int32Array(CAND), bases = new Int32Array(256);
  let nCand = 0, nBase = 0, step = 1, surfaceCells = 0, active = 0;
  const { w: FW, h: FH, unitX, unitY } = field;
  const cellAt = (x, y) => {
    const cx = (x / unitX) | 0, cy = (y / unitY) | 0;
    return cx < 0 || cy < 0 || cx >= FW || cy >= FH ? -1 : cy * FW + cx;
  };
  const kindAt = (x, y) => { const c = cellAt(x, y); return c < 0 ? 0 : field.kind[c]; };
  // Surfaces of one family are interchangeable for "am I still on water": purple / ice stay river, lava stays lava.
  const family = k => k === 2 || k === 3 ? 2 : k === 4 || k === 5 ? 4 : k;
  const onFloor = (x, y) => floorAt(x, y);

  /** Candidate surface cells of the visible rectangle (a strided sample when the view is large). */
  function scan(view, pad) {
    const x0 = Math.max(0, ((view.x0 - pad) / unitX) | 0), x1 = Math.min(FW - 1, ((view.x1 + pad) / unitX) | 0);
    const y0 = Math.max(0, ((view.y0 - pad) / unitY) | 0), y1 = Math.min(FH - 1, ((view.y1 + pad) / unitY) | 0);
    nCand = 0; nBase = 0; surfaceCells = 0;
    if (x1 < x0 || y1 < y0) return;
    const area = (x1 - x0 + 1) * (y1 - y0 + 1);
    step = Math.max(1, Math.ceil(Math.sqrt(area / 9000)));
    const kinds = field.kind;
    for (let y = y0; y <= y1; y += step) {
      const row = y * FW;
      for (let x = x0; x <= x1; x += step) {
        const k = kinds[row + x];
        if (!k) continue;
        surfaceCells++;
        if (nCand < CAND) cand[nCand++] = row + x;
        // Foot of a fall: the surface a few cells lower is no longer a fall.
        if ((k === 3 || k === 5) && step <= 2 && nBase < bases.length && y + 3 < FH) {
          const below = kinds[row + 3 * FW + x];
          if (below !== 3 && below !== 5 && (x & 1) === 0) bases[nBase++] = row + x;
        }
      }
    }
    surfaceCells *= step * step;
  }

  function spawn(i) {
    alive[i] = 0;
    if (!nCand) return false;
    for (let tries = 0; tries < 6; tries++) {
      const c = cand[(rnd() * nCand) | 0];
      const cx = c % FW, cy = (c / FW) | 0;
      const x = (cx + rnd() * step) * unitX, y = (cy + rnd() * step) * unitY;
      const k = kindAt(x, y);
      if (!k || onFloor(x, y)) continue;
      let t = T_STREAK;
      const mix = MIX[k], roll = rnd();
      for (let m = 0; m < mix.length; m++) if (roll <= mix[m][1]) { t = mix[m][0]; break; }
      px[i] = x; py[i] = y; kind[i] = k; type[i] = t; age[i] = 0; ph[i] = rnd() * 6.2832;
      const s = SPEED[k];
      spd[i] = s[0] + rnd() * s[1];
      switch (t) {
        case T_STREAK: life[i] = k === 3 || k === 5 ? .35 + rnd() * .5 : 1.6 + rnd() * 2.2; size[i] = 8 + rnd() * 12; if (k === 3 || k === 5) size[i] = 14 + rnd() * 22; break;
        case T_WAVE: life[i] = 3 + rnd() * 3; size[i] = 26 + rnd() * 30; break;
        case T_SPARK: life[i] = 1.4 + rnd() * 2.4; size[i] = .8 + rnd() * .9; spd[i] *= .25; break;
        case T_GLOW: life[i] = 1.8 + rnd() * 2.2; size[i] = 20 + rnd() * 22; spd[i] *= .3; break;
        case T_BUBBLE: life[i] = .9 + rnd() * 1.1; size[i] = 2.4 + rnd() * 2.2; spd[i] *= .2; break;
      }
      bucket[i] = Math.min(2, (rnd() * 3) | 0);
      alive[i] = 1;
      return true;
    }
    return false;
  }
  function spawnSpray(i) {
    if (!nBase) return false;
    const c = bases[(rnd() * nBase) | 0], k = field.kind[c];
    const x = ((c % FW) + rnd()) * unitX, y = (((c / FW) | 0) + 1 + rnd() * 1.5) * unitY;
    px[i] = x; py[i] = y; kind[i] = k; type[i] = T_SPRAY; age[i] = 0; life[i] = .6 + rnd() * .7;
    vx[i] = (rnd() - .5) * 26; vy[i] = -(10 + rnd() * 20); size[i] = 2.2 + rnd() * 2.6; ph[i] = rnd() * 6.28; bucket[i] = 0;
    alive[i] = 1;
    return true;
  }

  /** Advance particles by dt seconds inside `view` (world rectangle). */
  function update(dt, view, budget = N) {
    const pad = 40;
    scan(view, pad);
    // Target population: a particle per ~28 surface cells in view, never more than the pool.
    const target = Math.min(N, budget, Math.round(surfaceCells / FLOW_CELLS_PER_PARTICLE));
    // Mist is an accent at the foot of a fall, never the whole population in a
    // small camera view.
    const sprayMax = nBase ? Math.min(40, target >> 3) : 0;
    let on = 0;
    for (let i = 0; i < N; i++) {
      if (i >= target) { alive[i] = 0; continue; }
      const isSpray = i >= target - sprayMax && nBase > 0 && i < target;
      if (!alive[i] || (isSpray ? type[i] !== T_SPRAY : type[i] === T_SPRAY)) {
        if (!(isSpray ? spawnSpray(i) : spawn(i))) continue;
        age[i] = rnd() * life[i] * .9;     // stagger so the field does not pulse in unison
      } else {
        age[i] += dt;
      }
      if (age[i] >= life[i]) { age[i] = 0; alive[i] = 0; if (!(isSpray ? spawnSpray(i) : spawn(i))) continue; }
      const t = type[i];
      let x = px[i], y = py[i];
      if (t === T_SPRAY) {
        vy[i] += 46 * dt; x += vx[i] * dt; y += vy[i] * dt;
      } else {
        const c = cellAt(x, y);
        const k = c < 0 ? 0 : field.kind[c];
        if (!k || family(k) !== family(kind[i])) { alive[i] = 0; continue; }
        if (t !== T_BUBBLE) {
          x += field.dx[c] / 127 * spd[i] * dt; y += field.dy[c] / 127 * spd[i] * dt;
        }
        // A narrow painted channel can end inside this step. Reject the new
        // position immediately, before a streak is drawn on the bank for one frame.
        // Match the Float32 position buffers: rounding can otherwise put a
        // checked double just across the next cell boundary when it is stored.
        x = Math.fround(x); y = Math.fround(y);
        const nextKind = kindAt(x, y);
        if (!nextKind || family(nextKind) !== family(kind[i])) { alive[i] = 0; continue; }
        if (onFloor(x, y)) { alive[i] = 0; continue; }
      }
      // Left the (padded) camera: come back somewhere visible instead of drifting on unseen.
      if (x < view.x0 - pad || x > view.x1 + pad || y < view.y0 - pad || y > view.y1 + pad) { alive[i] = 0; continue; }
      px[i] = x; py[i] = y; on++;
    }
    active = on;
    return on;
  }

  function safeWater(x,y,rx,ry,k) {
    const x0=Math.floor((x-rx)/unitX),x1=Math.ceil((x+rx)/unitX);
    const y0=Math.floor((y-ry)/unitY),y1=Math.ceil((y+ry)/unitY);
    if(x0<0||y0<0||x1>=FW||y1>=FH)return false;
    for(let yy=y0;yy<=y1;yy++)for(let xx=x0;xx<=x1;xx++){
      if(family(field.kind[yy*FW+xx])!==family(k)||onFloor((xx+.5)*unitX,(yy+.5)*unitY))return false;
    }
    return true;
  }

  const rawDraw = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype.drawImage : null;
  /** Draw the visible particles. `scale` = device px per world unit, `t` = ms. */
  function draw(ctx, scale, t) {
    if (!active) return;
    const sp = sprites || (sprites = buildFlowSprites());
    const m = ctx.getTransform ? ctx.getTransform() : null;
    const ma = m ? m.a : scale, md = m ? m.d : scale, me = m ? m.e : 0, mf = m ? m.f : 0;
    const pxw = 1 / Math.max(.2, scale);                    // one device pixel in world units
    const lw = Math.max(1.3, 1.6 * pxw), minLen = 9 * pxw;
    const time = t / 1000;
    // The scene wraps ctx.drawImage with a resampling cache; these 4-6 px sprites never need it.
    const put = rawDraw ? (img, x, y, w, h) => rawDraw.call(ctx, img, x, y, w, h) : (img, x, y, w, h) => ctx.drawImage(img, x, y, w, h);
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < N; i++) {
      if (!alive[i]) continue;
      const ty = type[i], k = kind[i], water = k === 1 || k === 4 || k === 5;
      ctx.globalCompositeOperation = water ? 'source-over' : 'lighter';
      const f = age[i] / life[i], env = Math.sin(Math.PI * f);
      if (ty === T_STREAK || ty === T_WAVE) {
        if (env < .1 || !sp.streak[k]) continue;
        const c = cellAt(px[i], py[i]);
        const ux = field.dx[c] / 127, uy = field.dy[c] / 127, fall = k === 3 || k === 5;
        const len = water ? (fall ? 26 : 18) : Math.max(ty === T_WAVE ? size[i] : size[i] * (.55 + .45 * env), minLen * (fall ? 2 : 1));
        const width = water ? (fall ? 8 : 14) : fall ? lw * 1.2 : ty === T_WAVE ? lw * 1.6 : lw;
        // Check the complete rotated footprint, including intermediate cells: no bank/bridge overshoot.
        const rx=Math.abs(ux)*len/2+Math.abs(uy)*width/2, ry=Math.abs(uy)*len/2+Math.abs(ux)*width/2;
        if(water && !safeWater(px[i],py[i],rx,ry,k))continue;
        const kk = kindAt(px[i] - ux * len, py[i] - uy * len);
        if (!water && (!kk || family(kk) !== family(k))) continue;
        const sx=len/64, sy=width/(water?32:4);
        ctx.globalAlpha = (water ? (fall ? .42 : .46) : .55) * env;
        ctx.setTransform(ma * ux * sx, md * uy * sx, -ma * uy * sy, md * ux * sy, ma * px[i] + me, md * py[i] + mf);
        put(water ? sp.water || sp.streak[k] : sp.streak[k], water ? -32 : -64, water ? -16 : -2, 64, water ? 32 : 4);
      } else if (ty === T_SPARK) {
        const tw = Math.sin(time * 3.1 + ph[i]), q = tw * tw;
        if (q < .2 || !sp.spark) continue;
        const sz = size[i] * (.7 + .7 * q) * Math.max(1, pxw * .9) * 2;
        ctx.globalAlpha = .4 + .5 * q;
        ctx.setTransform(ma, 0, 0, md, me, mf);
        put(sp.spark, px[i] - sz / 2, py[i] - sz / 2, sz, sz);
      } else if (ty === T_GLOW) {
        if (!sp.glow) continue;
        const pulse = .5 + .5 * Math.sin(time * 2.3 + ph[i]);
        const sz = size[i] * (.85 + .3 * pulse);
        ctx.globalAlpha = (.1 + .2 * pulse) * env;
        ctx.setTransform(ma, 0, 0, md, me, mf);
        put(sp.glow, px[i] - sz / 2, py[i] - sz / 2, sz, sz);
      } else if (ty === T_BUBBLE) {
        if (!sp.ring) continue;
        const r = size[i] * (.35 + f) * 2;
        ctx.globalAlpha = (1 - f) * .7;
        ctx.setTransform(ma, 0, 0, md, me, mf);
        put(sp.ring, px[i] - r, py[i] - r * .45, r * 2.15, r * .9);
      } else if (ty === T_SPRAY) {
        const img = k === 3 ? sp.glow : sp.mist;
        if (!img) continue;
        const sz = size[i] * (1.2 + 3 * f) * 2.4;
        if(water && !safeWater(px[i],py[i],sz/2,sz/2,k))continue;
        ctx.globalAlpha = (1 - f) * (k === 3 ? .5 : .42);
        ctx.setTransform(ma, 0, 0, md, me, mf);
        put(img, px[i] - sz / 2, py[i] - sz / 2, sz, sz);
      }
    }
    ctx.restore();
  }

  return { update, draw, stats: () => ({ active, surfaceCells, step, nCand, nBase }),
    particles: () => { const out = []; for (let i = 0; i < N; i++) if (alive[i]) out.push({ x: px[i], y: py[i], kind: kind[i], type: type[i] }); return out; },
    kindAt };
}

// ---- wiring for the game: one flow engine per zone skin ----
const engines = new Map();   // zone -> {engine, loading, failed}
let lastT = 0;
const slot = zone => { let e = engines.get(zone); if (!e) { e = { engine:null, loading:false, failed:false }; engines.set(zone, e); } return e; };
function load(zone, url) {
  const e = slot(zone);
  if (e.loading || e.engine || e.failed || typeof Image === 'undefined' || typeof document === 'undefined') return;
  e.loading = true;
  const img = new Image();
  img.onload = () => {
    try {
      const cv = document.createElement('canvas'); cv.width = img.naturalWidth; cv.height = img.naturalHeight;
      const c = cv.getContext('2d', { willReadFrequently: true });
      c.drawImage(img, 0, 0);
      e.engine = createFlowEngine(decodeFlow(c.getImageData(0, 0, cv.width, cv.height).data, cv.width, cv.height));
    } catch { e.failed = true; }
    e.loading = false;
  };
  img.onerror = () => { e.failed = true; e.loading = false; };
  img.src = url;
}
export const townFlowEngine = () => slot(activeTownZone()).engine;

/** Call once per frame with the world transform active (after the terrain, before characters). */
export function drawTownFlow(ctx, time, reduced = false) {
  if (reduced || !weatherEnabled()) return;
  const url = activeTownSkin().flowUrl;
  if (!url) return;
  load(activeTownZone(), url);
  const engine = townFlowEngine();
  if (!engine) return;
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const scale = m && Number.isFinite(m.a) && m.a > 0 ? m.a : 1;
  let view = { x0: 0, y0: 0, x1: TOWN_SIZE.w, y1: TOWN_SIZE.h };
  if (m && !m.b && !m.c) {
    view = { x0: Math.max(0, -m.e / m.a), y0: Math.max(0, -m.f / m.d),
      x1: Math.min(TOWN_SIZE.w, (ctx.canvas.width - m.e) / m.a), y1: Math.min(TOWN_SIZE.h, (ctx.canvas.height - m.f) / m.d) };
  }
  const dt = lastT ? Math.max(0, Math.min(.05, (time - lastT) / 1000)) : .016;
  lastT = time;
  engine.update(dt, view, weatherBudget(ctx,TOWN_SIZE.w,TOWN_SIZE.h,FLOW_MAX_PARTICLES));
  engine.draw(ctx, scale, time);
}
