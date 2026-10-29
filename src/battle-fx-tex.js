// M2: texture manager for battle effects.
// Real art lives in img/fx/<key>.webp (spec: Output/Toby/2026-10-16-avegee-m2-art-spec.md). Until a file exists (or if it fails to
// load) the SAME key resolves to a texture drawn here with plain gradients/paths — so Kittanate/Codex dropping a file over the name
// swaps it in with no code change. Real art is never recolored or filtered: colour variants are separate keys.
// BLK = black-background image used with 'lighter'; ALPHA = transparent image used with 'source-over'.

export const FX_DIR = 'img/fx/';
const TAU = Math.PI * 2;

/** key -> { w, h, cells, blend } — dimensions mirror the art spec; blend is the compositing mode every caller must use. */
export const TEX = {
  'fx-common-flash-star-white': { w:512, h:512, blend:'lighter' },
  'fx-common-ray-burst-gold': { w:768, h:768, blend:'lighter' },
  'fx-common-ring-gold': { w:512, h:512, blend:'lighter' },
  'fx-common-ring-green': { w:512, h:512, blend:'lighter' },
  'fx-common-ring-blue': { w:512, h:512, blend:'lighter' },
  'fx-common-ring-violet': { w:512, h:512, blend:'lighter' },
  'fx-common-sparks-gold': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-common-sparks-green': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-common-sparks-blue': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-common-sparks-violet': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-common-sparks-orange': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-common-smoke-dark': { w:256, h:256, blend:'source-over' },
  'fx-slash-arc-white': { w:512, h:128, blend:'lighter' },
  'fx-slash-arc-ember': { w:512, h:128, blend:'lighter' },
  'fx-slash-arc-crimson': { w:512, h:128, blend:'lighter' },
  'fx-slash-arc-cyan': { w:512, h:128, blend:'lighter' },
  'fx-slash-impact-white': { w:384, h:384, blend:'lighter' },
  'fx-slash-impact-ember': { w:384, h:384, blend:'lighter' },
  'fx-fire-orb': { w:256, h:256, blend:'lighter' },
  'fx-fire-comet-trail': { w:512, h:128, blend:'lighter' },
  'fx-fire-flame-a': { w:128, h:256, blend:'lighter' },
  'fx-fire-flame-b': { w:128, h:256, blend:'lighter' },
  'fx-fire-flame-c': { w:128, h:256, blend:'lighter' },
  'fx-fire-explosion': { w:768, h:768, blend:'lighter' },
  'fx-fire-ground-glow': { w:512, h:160, blend:'lighter' },
  'fx-fire-embers': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-ice-crystal-a': { w:192, h:384, blend:'source-over' },
  'fx-ice-crystal-b': { w:192, h:384, blend:'source-over' },
  'fx-ice-crystal-c': { w:192, h:384, blend:'source-over' },
  'fx-ice-crystal-cluster': { w:640, h:448, blend:'source-over' },
  'fx-ice-glow-core': { w:512, h:512, blend:'lighter' },
  'fx-ice-frost-ground': { w:512, h:160, blend:'lighter' },
  'fx-ice-shards': { w:256, h:64, cells:4, blend:'source-over' },
  'fx-wind-blade': { w:512, h:128, blend:'lighter' },
  'fx-wind-vortex': { w:512, h:512, blend:'lighter' },
  'fx-wind-column': { w:256, h:512, blend:'lighter' },
  'fx-wind-streaks': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-wind-leaves': { w:256, h:64, cells:4, blend:'source-over' },
  'fx-hypno-circle': { w:512, h:512, blend:'lighter' },
  'fx-hypno-spiral': { w:512, h:512, blend:'lighter' },
  'fx-hypno-ribbons': { w:256, h:512, blend:'lighter' },
  'fx-hypno-eye': { w:256, h:256, blend:'lighter' },
  'fx-spear-lance': { w:768, h:96, blend:'lighter' },
  'fx-spear-pierce-cone': { w:384, h:384, blend:'lighter' },
  'fx-spear-feathers': { w:256, h:128, cells:4, blend:'source-over' },
  'fx-club-shockwave': { w:512, h:160, blend:'lighter' },
  'fx-club-dust': { w:256, h:256, blend:'source-over' },
  'fx-club-rocks': { w:512, h:64, cells:8, blend:'source-over' },
  'fx-club-crack': { w:512, h:160, blend:'lighter' },
  'fx-club-impact': { w:384, h:384, blend:'lighter' },
  'fx-heal-aura-green': { w:512, h:512, blend:'lighter' },
  'fx-heal-aura-blue': { w:512, h:512, blend:'lighter' },
  'fx-heal-ring-floor': { w:512, h:160, blend:'lighter' },
  'fx-heal-ring-floor-blue': { w:512, h:160, blend:'lighter' },
  'fx-heal-petals': { w:256, h:64, cells:4, blend:'lighter' },
  'fx-heal-flower': { w:256, h:256, blend:'lighter' },
  // procOnly: no img/fx file exists for these keys yet, so skip the request (it 404'd on every battle) and draw the gradient stand-in.
  // Remove procOnly from a key once its .webp is added to img/fx/.
  'fx-foe-claw-triple': { w:384, h:384, procOnly:true, blend:'lighter' },
  'fx-foe-impact-red': { w:384, h:384, procOnly:true, blend:'lighter' },
  'fx-foe-dark-orb': { w:256, h:256, procOnly:true, blend:'lighter' },
  'fx-aura-rage': { w:384, h:512, procOnly:true, blend:'lighter' },
  'fx-clock-ring': { w:512, h:512, procOnly:true, blend:'lighter' },
  'fx-mirror-glint': { w:512, h:128, procOnly:true, blend:'lighter' },
};
export const TEX_KEYS = Object.freeze(Object.keys(TEX));
export const blendOf = key => TEX[key]?.blend || 'lighter';
export const cellsOf = key => TEX[key]?.cells || 1;

// ---------------------------------------------------------------- tiny drawing helpers (init-time only, never per frame)
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const WHITE = [255, 255, 255];
const COLORS = {
  gold: [255, 208, 100], green: [120, 255, 170], blue: [140, 210, 255], violet: [215, 130, 255], orange: [255, 140, 50],
  ember: [255, 150, 50], crimson: [255, 70, 90], cyan: [90, 235, 255], white: [200, 225, 255], red: [230, 40, 50], mint: [190, 255, 225],
};
function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const radial = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); for (const [o, col] of stops) g.addColorStop(o, col); return g; };
function glow(c, x, y, r, stops) { c.fillStyle = radial(c, x, y, 0, r, stops); c.fillRect(x - r, y - r, r * 2, r * 2); }
/** thin elongated glow (a light streak) centred at x,y, `len` half-length along angle `ang`, `wid` half-width */
function streak(c, x, y, len, wid, ang, stops) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(len, wid);
  c.fillStyle = radial(c, 0, 0, 0, 1, stops); c.beginPath(); c.arc(0, 0, 1, 0, TAU); c.fill(); c.restore();
}
const soft = (col, a = 1) => [[0, rgba(WHITE, a)], [.3, rgba(col, a * .75)], [1, rgba(col, 0)]];
function cells(W, H, n, fn) { const s = W / n; for (let i = 0; i < n; i++) { const cx = i * s + s / 2, cy = H / 2; fn(i, cx, cy, Math.min(s, H)); } }
function poly(c, pts) { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); }

// ---------------------------------------------------------------- generators: (ctx, W, H) -> draws the whole image
const GEN = {};
const ringGen = col => (c, W, H) => {
  c.save(); c.translate(W / 2, H / 2); c.scale(1, H / W);
  c.fillStyle = radial(c, 0, 0, 0, W / 2 - 1, [[0, rgba(col, 0)], [.7, rgba(col, 0)], [.84, rgba(col, .16)], [.92, rgba(col, .7)], [.955, rgba(WHITE, .95)], [.985, rgba(col, .2)], [1, rgba(col, 0)]]);
  c.fillRect(-W / 2, -W / 2, W, W); c.restore();
};
const sparksGen = col => (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  glow(c, x, y, s * .46, soft(col, .55));
  if (i === 0) { streak(c, x, y, s * .48, s * .05, 0, soft(col)); streak(c, x, y, s * .48, s * .05, Math.PI / 2, soft(col)); }
  else if (i === 1) { glow(c, x, y, s * .26, [[0, rgba(WHITE, 1)], [.4, rgba(col, .85)], [1, rgba(col, 0)]]); }
  else if (i === 2) { poly(c, [[x, y - s * .4], [x + s * .17, y], [x, y + s * .4], [x - s * .17, y]]); c.fillStyle = rgba(col, .95); c.fill(); glow(c, x, y, s * .2, soft(WHITE, 1)); }
  else { streak(c, x, y, s * .5, s * .035, -.35, soft(col)); streak(c, x, y, s * .26, s * .035, 1.2, soft(col)); glow(c, x, y, s * .14, soft(WHITE, 1)); }
  glow(c, x, y, s * .09, [[0, rgba(WHITE, 1)], [1, rgba(WHITE, 0)]]);
});
function crescent(c, W, H, edge, core, ink = 1) {
  const L = [W * .02, H * .6], R = [W * .985, H * .36];
  const path = (a, b, k1, k2) => { c.beginPath(); c.moveTo(a[0], a[1]); c.quadraticCurveTo(W * .5, H * k1, b[0], b[1]); c.quadraticCurveTo(W * .5, H * k2, a[0], a[1]); c.closePath(); };
  c.lineJoin = 'round';
  path(L, R, 1.05, .6); c.strokeStyle = rgba(edge, .16 * ink); c.lineWidth = H * .2; c.stroke();
  let g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, rgba(edge, 0)); g.addColorStop(.2, rgba(edge, .55 * ink)); g.addColorStop(.55, rgba(edge, .95 * ink)); g.addColorStop(1, rgba(edge, .6 * ink));
  c.fillStyle = g; path(L, R, 1.05, .6); c.fill();
  g = c.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, rgba(core, 0)); g.addColorStop(.25, rgba(core, .75)); g.addColorStop(.6, rgba(core, 1)); g.addColorStop(1, rgba(core, .85));
  c.fillStyle = g; path([L[0] + W * .1, L[1] - H * .02], [R[0] - W * .02, R[1] + H * .0], .93, .72); c.fill();
}
const slashGen = (edge, core = WHITE) => (c, W, H) => crescent(c, W, H, edge, core);
function jagged(c, W, H, n, outer, inner, seed, hot, rim) {
  const r = rng(seed), x = W / 2, y = H / 2; const R = Math.min(W, H) / 2;
  glow(c, x, y, R * .8, soft(rim, .5));
  const pts = []; for (let i = 0; i < n * 2; i++) {
    const a = i / (n * 2) * TAU + (r() - .5) * .25, rr = i % 2 ? R * inner * (.7 + r() * .6) : R * outer * (.5 + r() * .5);
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  poly(c, pts); c.fillStyle = radial(c, x, y, 0, R * outer, [[0, rgba(WHITE, 1)], [.3, rgba(hot, .95)], [.75, rgba(rim, .75)], [1, rgba(rim, 0)]]); c.fill();
  glow(c, x, y, R * .3, soft(WHITE, 1));
}
function flame(c, W, H, seed, lean) {
  const draw = (scale, hot, mid, cold, ln) => {
    const N = 30, h = H * .97 * scale, base = H * .99, L = [], Rr = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, y = base - t * h;
      const prof = (1 - t) ** .85 * Math.sin(Math.min(1, t * 5 + .12) * Math.PI / 2) ** .7 * (1 + .22 * Math.sin(t * 9 + seed * 1.7));
      const hw = W * .47 * scale * prof, cx = W / 2 + (ln * W * t ** 1.7 + Math.sin(t * 5.5 + seed) * W * .07 * t) * scale;
      L.push([cx - hw, y]); Rr.push([cx + hw, y]);
    }
    c.beginPath(); c.moveTo(L[0][0], L[0][1]);
    for (const q of L) c.lineTo(q[0], q[1]);
    for (let i = N; i >= 0; i--) c.lineTo(Rr[i][0], Rr[i][1]);
    c.closePath();
    const g = c.createLinearGradient(0, base - h, 0, base);
    g.addColorStop(0, rgba(cold, 0)); g.addColorStop(.25, rgba(cold, .65)); g.addColorStop(.58, rgba(mid, .92)); g.addColorStop(.84, rgba(hot, 1)); g.addColorStop(1, rgba(hot, 0));   // base fades out: no hard edge on the ground line
    c.fillStyle = g; c.fill();
  };
  draw(1, [255, 190, 70], [255, 100, 25], [190, 25, 15], lean);
  draw(.62, [255, 255, 225], [255, 215, 110], [255, 140, 40], lean * .7);
}
function crystal(c, cx, by, w, h, lean, shade = 1) {
  const tip = [cx + lean * w, by - h], bl = [cx - w * .5, by], br = [cx + w * .5, by];
  const ls = [cx - w * .46 + lean * w * .35, by - h * .64], rs = [cx + w * .5 + lean * w * .3, by - h * .56], mid = [cx + w * .05, by - h * .06];
  const face = (pts, top, bot) => { poly(c, pts); const g = c.createLinearGradient(0, tip[1], 0, by); g.addColorStop(0, top); g.addColorStop(1, bot); c.fillStyle = g; c.fill(); };
  face([tip, ls, bl, mid], `rgba(238,252,255,${.94 * shade})`, `rgba(140,200,250,${.88 * shade})`);
  face([tip, mid, br, rs], `rgba(160,212,248,${.92 * shade})`, `rgba(60,120,215,${.9 * shade})`);
  c.strokeStyle = 'rgba(235,250,255,.95)'; c.lineWidth = Math.max(1.5, w * .02); c.lineJoin = 'round';
  poly(c, [tip, ls, bl, br, rs]); c.stroke();
  c.beginPath(); c.moveTo(tip[0], tip[1]); c.lineTo(mid[0], mid[1]); c.strokeStyle = 'rgba(255,255,255,.75)'; c.stroke();
  c.beginPath(); c.moveTo(ls[0], ls[1]); c.lineTo(mid[0], mid[1]); c.strokeStyle = 'rgba(210,240,255,.45)'; c.stroke();
}
function ticks(c, x, y, r0, r1, n, lw, col) { c.strokeStyle = col; c.lineWidth = lw; for (let i = 0; i < n; i++) { const a = i / n * TAU; c.beginPath(); c.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); c.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); c.stroke(); } }
/** stroke with a soft halo (wide faint pass first) — replaces shadowBlur */
function haloStroke(c, draw, col, lw, a = 1) {
  c.lineCap = 'round'; c.lineJoin = 'round';
  c.strokeStyle = rgba(col, .12 * a); c.lineWidth = lw * 5; draw(); c.stroke();
  c.strokeStyle = rgba(col, .28 * a); c.lineWidth = lw * 2.4; draw(); c.stroke();
  c.strokeStyle = rgba(WHITE, .95 * a); c.lineWidth = lw; draw(); c.stroke();
}
function spiralArms(c, x, y, R, arms, turns, wMax, col, hot) {
  const N = 60;
  for (let a = 0; a < arms; a++) {
    for (let i = 1; i < N; i++) {
      const t0 = (i - 1) / N, t1 = i / N, ph = a / arms * TAU;
      const p = t => [x + Math.cos(ph + t * turns * TAU) * R * t, y + Math.sin(ph + t * turns * TAU) * R * t];
      const [x0, y0] = p(t0), [x1, y1] = p(t1), env = Math.sin(Math.PI * Math.min(1, t1 * 1.05)) ** .6;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineCap = 'round';
      c.strokeStyle = rgba(col, .35 * env); c.lineWidth = wMax * (1 - t1 * .6) * 2.6; c.stroke();
      c.strokeStyle = rgba(hot, .95 * env); c.lineWidth = wMax * (1 - t1 * .6) * .8; c.stroke();
    }
  }
}

GEN['fx-common-flash-star-white'] = (c, W, H) => {
  const x = W / 2, y = H / 2;
  glow(c, x, y, W * .3, [[0, 'rgba(255,255,255,1)'], [.22, 'rgba(255,250,225,.85)'], [1, 'rgba(255,230,170,0)']]);
  for (const a of [0, Math.PI / 2]) streak(c, x, y, W * .5, W * .02, a, soft([255, 235, 190], 1));
  for (const a of [.785, 2.356]) streak(c, x, y, W * .27, W * .012, a, soft([255, 235, 190], .9));
  glow(c, x, y, W * .08, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]);
};
GEN['fx-common-ray-burst-gold'] = (c, W, H) => {
  const r = rng(11), x = W / 2, y = H / 2, R = W / 2;
  c.fillStyle = radial(c, x, y, 0, R, [[0, 'rgba(255,250,225,.9)'], [.25, 'rgba(255,215,120,.6)'], [.6, 'rgba(255,160,60,.2)'], [.9, 'rgba(255,140,40,0)']]);
  for (let i = 0; i < 38; i++) {
    const a = i / 38 * TAU + (r() - .5) * .12, w = .012 + r() * .028, len = R * (.5 + r() * .5);
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a - w) * len, y + Math.sin(a - w) * len); c.lineTo(x + Math.cos(a + w) * len, y + Math.sin(a + w) * len); c.closePath(); c.fill();
  }
  glow(c, x, y, R * .22, soft(WHITE, 1));
};
GEN['fx-common-ring-gold'] = ringGen(COLORS.gold);
GEN['fx-common-ring-green'] = ringGen(COLORS.green);
GEN['fx-common-ring-blue'] = ringGen(COLORS.blue);
GEN['fx-common-ring-violet'] = ringGen(COLORS.violet);
GEN['fx-common-sparks-gold'] = sparksGen(COLORS.gold);
GEN['fx-common-sparks-green'] = sparksGen(COLORS.green);
GEN['fx-common-sparks-blue'] = sparksGen(COLORS.blue);
GEN['fx-common-sparks-violet'] = sparksGen(COLORS.violet);
GEN['fx-common-sparks-orange'] = sparksGen(COLORS.orange);
GEN['fx-common-smoke-dark'] = (c, W, H) => {
  const r = rng(5);
  for (let i = 0; i < 12; i++) { const x = W * (.25 + r() * .5), y = H * (.25 + r() * .5), s = W * (.14 + r() * .16); glow(c, x, y, s, [[0, 'rgba(60,40,34,.45)'], [.6, 'rgba(44,30,28,.2)'], [1, 'rgba(36,26,24,0)']]); }
};
GEN['fx-slash-arc-white'] = slashGen([170, 210, 255]);
GEN['fx-slash-arc-ember'] = slashGen([255, 130, 40], [255, 245, 200]);
GEN['fx-slash-arc-crimson'] = slashGen([235, 50, 80], [255, 225, 235]);
GEN['fx-slash-arc-cyan'] = slashGen([60, 220, 255], [240, 255, 255]);
GEN['fx-slash-impact-white'] = (c, W, H) => jagged(c, W, H, 9, 1, .22, 3, [255, 245, 200], [255, 200, 110]);
GEN['fx-slash-impact-ember'] = (c, W, H) => jagged(c, W, H, 9, 1, .22, 4, [255, 220, 120], [255, 110, 30]);
GEN['fx-fire-orb'] = (c, W, H) => {
  const x = W * .6, y = H / 2;
  for (let i = 0; i < 6; i++) { const a = Math.PI + (i - 2.5) * .22; streak(c, x + Math.cos(a) * W * .12, y + Math.sin(a) * W * .12, W * (.26 + (i % 3) * .05), W * .06, a, [[0, 'rgba(255,170,60,.85)'], [.6, 'rgba(230,70,20,.5)'], [1, 'rgba(200,30,10,0)']]); }
  glow(c, x, y, W * .38, [[0, 'rgba(255,230,150,.9)'], [.35, 'rgba(255,120,30,.7)'], [.75, 'rgba(210,40,15,.3)'], [1, 'rgba(180,20,10,0)']]);
  glow(c, x, y, W * .2, [[0, 'rgba(255,255,240,1)'], [.55, 'rgba(255,225,120,.95)'], [1, 'rgba(255,170,60,0)']]);
};
GEN['fx-fire-comet-trail'] = (c, W, H) => {
  const r = rng(8);
  for (let i = 0; i < 9; i++) {
    const len = W * (.28 + r() * .26), cy = H / 2 + (r() - .5) * H * .34, x1 = W * .97 - r() * W * .05, ry = H * (.1 + r() * .16);
    c.save(); c.translate(x1 - len, cy); c.scale(len, ry);
    const g = c.createLinearGradient(0, 0, 2, 0); g.addColorStop(0, 'rgba(200,30,10,0)'); g.addColorStop(.45, 'rgba(240,80,20,.55)'); g.addColorStop(.85, 'rgba(255,170,60,.85)'); g.addColorStop(1, 'rgba(255,240,170,.95)');
    c.fillStyle = g; c.beginPath(); c.arc(1, 0, 1, 0, TAU); c.fill(); c.restore();
  }
  glow(c, W * .93, H / 2, H * .5, soft([255, 220, 130], .9));
};
GEN['fx-fire-flame-a'] = (c, W, H) => flame(c, W, H, 1, .12);
GEN['fx-fire-flame-b'] = (c, W, H) => flame(c, W, H, 2, -.2);
GEN['fx-fire-flame-c'] = (c, W, H) => flame(c, W, H, 3, .3);
GEN['fx-fire-explosion'] = (c, W, H) => {
  const r = rng(21), x = W / 2, y = H / 2, R = W / 2;
  glow(c, x, y, R, [[0, 'rgba(255,200,100,.5)'], [.5, 'rgba(230,70,20,.35)'], [1, 'rgba(160,20,10,0)']]);
  for (let i = 0; i < 18; i++) {
    const a = r() * TAU, d = R * (.18 + r() * .38), s = R * (.2 + r() * .22), hot = i % 3 === 0;
    glow(c, x + Math.cos(a) * d, y + Math.sin(a) * d, s, hot ? [[0, 'rgba(255,245,200,.95)'], [.5, 'rgba(255,170,50,.8)'], [1, 'rgba(255,120,30,0)']]
      : [[0, 'rgba(255,190,70,.9)'], [.5, 'rgba(235,85,25,.7)'], [1, 'rgba(180,30,10,0)']]);
  }
  glow(c, x, y, R * .34, [[0, 'rgba(255,255,245,1)'], [.5, 'rgba(255,240,170,.95)'], [1, 'rgba(255,190,80,0)']]);
};
GEN['fx-fire-ground-glow'] = (c, W, H) => { c.save(); c.translate(W / 2, H / 2); c.scale(1, H / W); glow(c, 0, 0, W / 2, [[0, 'rgba(255,225,130,.95)'], [.4, 'rgba(255,130,40,.6)'], [1, 'rgba(200,50,10,0)']]); c.restore(); };
GEN['fx-fire-embers'] = (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  if (i === 0) glow(c, x, y, s * .14, [[0, 'rgba(255,235,170,1)'], [.5, 'rgba(255,140,40,.85)'], [1, 'rgba(255,80,20,0)']]);
  else if (i === 1) for (const [dx, dy] of [[-.22, .1], [.05, -.2], [.24, .15]]) glow(c, x + dx * s, y + dy * s, s * .1, [[0, 'rgba(255,230,150,1)'], [.5, 'rgba(255,120,30,.8)'], [1, 'rgba(255,60,20,0)']]);
  else if (i === 2) streak(c, x, y, s * .45, s * .05, -.7, [[0, 'rgba(255,240,180,1)'], [.5, 'rgba(255,140,40,.7)'], [1, 'rgba(255,60,20,0)']]);
  else { glow(c, x, y, s * .22, [[0, 'rgba(255,150,60,.9)'], [.5, 'rgba(210,50,20,.7)'], [1, 'rgba(120,20,10,0)']]); glow(c, x, y, s * .08, [[0, 'rgba(255,230,160,1)'], [1, 'rgba(255,230,160,0)']]); }
});
GEN['fx-ice-crystal-a'] = (c, W, H) => crystal(c, W * .5, H, W * .6, H * .98, .06);
GEN['fx-ice-crystal-b'] = (c, W, H) => crystal(c, W * .46, H, W * .85, H * .8, -.14);
GEN['fx-ice-crystal-c'] = (c, W, H) => { crystal(c, W * .66, H, W * .38, H * .5, .2, .9); crystal(c, W * .4, H, W * .62, H * .96, -.05); };
GEN['fx-ice-crystal-cluster'] = (c, W, H) => {
  const parts = [[.14, .5, .24, -.16], [.88, .46, .22, .16], [.3, .66, .26, -.1], [.72, .6, .26, .1], [.5, .98, .3, .02], [.58, .55, .2, .12]];
  for (const [x, h, w, l] of parts) crystal(c, W * x, H, W * w, H * h, l, .96);
};
GEN['fx-ice-glow-core'] = (c, W, H) => glow(c, W / 2, H / 2, W / 2, [[0, 'rgba(255,255,255,.95)'], [.3, 'rgba(190,230,255,.7)'], [.7, 'rgba(90,160,255,.25)'], [1, 'rgba(60,120,255,0)']]);
GEN['fx-ice-frost-ground'] = (c, W, H) => {
  c.save(); c.translate(W / 2, H / 2); c.scale(1, H / W); glow(c, 0, 0, W / 2, [[0, 'rgba(210,240,255,.85)'], [.5, 'rgba(120,190,255,.5)'], [1, 'rgba(60,120,255,0)']]); c.restore();
  const r = rng(9); c.strokeStyle = 'rgba(235,250,255,.8)'; c.lineWidth = 1.5;
  for (let i = 0; i < 14; i++) { const a = r() * TAU, d = W * (.06 + r() * .3); c.beginPath(); c.moveTo(W / 2, H / 2); c.lineTo(W / 2 + Math.cos(a) * d, H / 2 + Math.sin(a) * d * (H / W)); c.stroke(); }
};
GEN['fx-ice-shards'] = (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  const r = rng(30 + i), pts = []; const n = 4 + (i % 2);
  for (let k = 0; k < n; k++) { const a = k / n * TAU + r() * .5, rr = s * (.2 + r() * .22) * (k % 2 ? .6 : 1.1); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); }
  poly(c, pts); const g = c.createLinearGradient(x - s * .3, y - s * .3, x + s * .3, y + s * .3);
  g.addColorStop(0, 'rgba(240,252,255,.95)'); g.addColorStop(1, 'rgba(90,160,235,.9)'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.2; c.stroke();
});
GEN['fx-wind-blade'] = (c, W, H) => {
  const r = rng(2);
  for (let i = 0; i < 5; i++) {
    const y0 = H * (.38 + r() * .35), len = W * (.3 + r() * .3), x0 = W * (.08 + r() * .25);
    c.beginPath(); c.moveTo(x0, y0 + H * .06); c.quadraticCurveTo(x0 + len * .5, y0 + H * .22, x0 + len, y0 - H * .02);
    const g = c.createLinearGradient(x0, 0, x0 + len, 0); g.addColorStop(0, 'rgba(190,255,225,0)'); g.addColorStop(1, 'rgba(230,255,245,.7)');
    c.strokeStyle = g; c.lineWidth = 1.5 + r() * 2; c.stroke();
  }
  crescent(c, W * .85, H, [120, 235, 200], [245, 255, 250], .75);
};
GEN['fx-wind-vortex'] = (c, W, H) => { glow(c, W / 2, H / 2, W * .3, soft([170, 255, 215], .25)); spiralArms(c, W / 2, H / 2, W * .47, 4, .9, W * .016, [150, 245, 210], [245, 255, 250]); };
GEN['fx-wind-column'] = (c, W, H) => {
  for (let i = 0; i < 16; i++) {
    const t = i / 15, y = H * (.96 - t * .9), rx = W * (.12 + t * .34), ry = H * .02 * (1 + t);
    c.beginPath(); c.ellipse(W / 2, y, rx, ry, 0, Math.PI * (.1 + (i % 3) * .2), Math.PI * (1 + .1 + (i % 3) * .2));
    c.strokeStyle = `rgba(215,255,238,${.15 + .6 * Math.sin(Math.PI * t) ** .7})`; c.lineWidth = 2.5 - t; c.stroke();
  }
};
GEN['fx-wind-streaks'] = (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  const g = c.createLinearGradient(x - s * .45, 0, x + s * .45, 0); g.addColorStop(0, 'rgba(210,255,235,0)'); g.addColorStop(.7, 'rgba(230,255,245,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.strokeStyle = g; c.lineWidth = 2; c.lineCap = 'round';
  const line = dy => { c.beginPath(); c.moveTo(x - s * .45, y + dy); c.quadraticCurveTo(x, y + dy + (i === 1 ? -s * .15 : i === 3 ? s * .2 : 0), x + s * .45, y + dy + (i === 3 ? -s * .08 : 0)); c.stroke(); };
  line(0); if (i === 2) { line(-s * .12); line(s * .12); }
});
GEN['fx-wind-leaves'] = (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  c.save(); c.translate(x, y); c.rotate(-.6 + i * .7); c.beginPath(); c.moveTo(-s * .32, 0); c.quadraticCurveTo(0, -s * .3, s * .32, 0); c.quadraticCurveTo(0, s * .26, -s * .32, 0);
  const g = c.createLinearGradient(-s * .3, 0, s * .3, 0); g.addColorStop(0, i % 2 ? '#8fcf5a' : '#d9d25a'); g.addColorStop(1, i % 2 ? '#3f8f3a' : '#9aa63a'); c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(30,70,30,.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-s * .3, 0); c.lineTo(s * .3, 0); c.stroke(); c.restore();
});
GEN['fx-hypno-circle'] = (c, W, H) => {
  const x = W / 2, y = H / 2, R = W / 2 - 4, pink = [255, 120, 210], vio = [170, 90, 255];
  glow(c, x, y, R, [[0, rgba(vio, .22)], [.8, rgba(pink, .12)], [1, rgba(pink, 0)]]);
  const circ = r => () => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
  haloStroke(c, circ(R * .98), pink, 2); haloStroke(c, circ(R * .84), vio, 1.5); haloStroke(c, circ(R * .56), pink, 1.5); haloStroke(c, circ(R * .2), vio, 1.5);
  ticks(c, x, y, R * .86, R * .96, 48, 1.5, rgba(pink, .9));
  for (const rot of [-Math.PI / 2, Math.PI / 2]) haloStroke(c, () => { c.beginPath(); for (let i = 0; i < 3; i++) { const a = rot + i / 3 * TAU; c.lineTo(x + Math.cos(a) * R * .56, y + Math.sin(a) * R * .56); } c.closePath(); }, i2c(rot), 1.5, .9);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; glow(c, x + Math.cos(a) * R * .7, y + Math.sin(a) * R * .7, R * .035, soft(pink, 1)); }
};
const i2c = rot => rot < 0 ? [255, 120, 210] : [170, 90, 255];
GEN['fx-hypno-spiral'] = (c, W, H) => { glow(c, W / 2, H / 2, W * .3, soft([200, 100, 255], .3)); spiralArms(c, W / 2, H / 2, W * .47, 3, 1.1, W * .02, [190, 90, 255], [255, 190, 240]); };
GEN['fx-hypno-ribbons'] = (c, W, H) => {
  for (let k = 0; k < 4; k++) {
    const ph = k / 4 * TAU, path = () => { c.beginPath(); for (let i = 0; i <= 40; i++) { const t = i / 40, y = H * (.97 - t * .94), amp = W * (.08 + t * .34); const x = W / 2 + Math.sin(t * 7 + ph) * amp * (.5 + .5 * Math.sin(t * 3 + ph)); i ? c.lineTo(x, y) : c.moveTo(x, y); } };
    haloStroke(c, path, k % 2 ? [255, 130, 215] : [185, 100, 255], 2.2, .9);
  }
};
GEN['fx-hypno-eye'] = (c, W, H) => {
  const x = W / 2, y = H / 2, pink = [255, 120, 210]; glow(c, x, y, W * .5, soft([180, 90, 255], .35));
  haloStroke(c, () => { c.beginPath(); c.moveTo(W * .08, y); c.quadraticCurveTo(x, y - H * .38, W * .92, y); c.quadraticCurveTo(x, y + H * .38, W * .08, y); }, pink, 2);
  haloStroke(c, () => { c.beginPath(); c.arc(x, y, W * .17, 0, TAU); }, [190, 110, 255], 2);
  spiralArms(c, x, y, W * .15, 2, 1.2, 2.2, [190, 110, 255], [255, 210, 245]);
};
GEN['fx-spear-lance'] = (c, W, H) => {
  const y = H / 2, body = (k, a) => { c.beginPath(); c.moveTo(0, y); c.lineTo(W * .62, y - H * .18 * k); c.lineTo(W * .93, y - H * .06 * k); c.lineTo(W, y); c.lineTo(W * .93, y + H * .06 * k); c.lineTo(W * .62, y + H * .18 * k); c.closePath(); const g = c.createLinearGradient(0, 0, W, 0); g.addColorStop(0, rgba([255, 210, 110], 0)); g.addColorStop(.5, rgba([255, 215, 120], a * .7)); g.addColorStop(1, rgba([255, 255, 240], a)); c.fillStyle = g; c.fill(); };
  body(2.6, .22); body(1.6, .45); body(.9, .95);
  glow(c, W * .93, y, H * .6, soft([255, 240, 180], .9));
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(W * .08, y); c.quadraticCurveTo(W * .12, y + s * H * .42, W * .26, y + s * H * .3); c.quadraticCurveTo(W * .17, y + s * H * .12, W * .08, y); c.fillStyle = 'rgba(255,240,190,.55)'; c.fill(); }
};
GEN['fx-spear-pierce-cone'] = (c, W, H) => {
  const y = H / 2; c.beginPath(); c.moveTo(W * .98, y); c.lineTo(W * .3, y - H * .38); c.lineTo(W * .3, y + H * .38); c.closePath();
  const g = c.createLinearGradient(W * .3, 0, W, 0); g.addColorStop(0, 'rgba(255,200,90,0)'); g.addColorStop(.7, 'rgba(255,225,140,.5)'); g.addColorStop(1, 'rgba(255,255,240,.95)'); c.fillStyle = g; c.fill();
  c.save(); c.translate(W * .28, y); c.scale(.28, 1); c.fillStyle = radial(c, 0, 0, 0, H * .4, [[0, 'rgba(255,255,255,0)'], [.72, 'rgba(255,230,150,.1)'], [.88, 'rgba(255,235,160,.9)'], [.95, 'rgba(255,255,240,1)'], [1, 'rgba(255,200,90,0)']]); c.fillRect(-H * .4, -H * .4, H * .8, H * .8); c.restore();
};
GEN['fx-spear-feathers'] = (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  c.save(); c.translate(x, y); c.rotate((i - 1.5) * .3);
  c.beginPath(); c.moveTo(0, -H * .42); c.quadraticCurveTo(s * .4, -H * .1, 0, H * .42); c.quadraticCurveTo(-s * .4, -H * .1, 0, -H * .42);
  const g = c.createLinearGradient(0, -H * .4, 0, H * .4); g.addColorStop(0, 'rgba(255,248,215,.98)'); g.addColorStop(1, 'rgba(255,215,130,.6)'); c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -H * .4); c.lineTo(0, H * .42); c.stroke(); c.restore();
});
GEN['fx-club-shockwave'] = (c, W, H) => ringGen([255, 235, 170])(c, W, H);
GEN['fx-club-dust'] = (c, W, H) => { const r = rng(14); for (let i = 0; i < 10; i++) glow(c, W * (.25 + r() * .5), H * (.3 + r() * .4), W * (.12 + r() * .14), [[0, 'rgba(190,165,130,.55)'], [.6, 'rgba(160,140,115,.28)'], [1, 'rgba(150,130,110,0)']]); };
GEN['fx-club-rocks'] = (c, W, H) => cells(W, H, 8, (i, x, y, s) => {
  const r = rng(40 + i), n = 6 + (i % 3), pts = []; for (let k = 0; k < n; k++) { const a = k / n * TAU, rr = s * (.2 + r() * .17); pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * .85]); }
  poly(c, pts); const g = c.createLinearGradient(0, y - s * .35, 0, y + s * .35); g.addColorStop(0, '#b3a796'); g.addColorStop(1, '#4b4038'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(30,22,18,.7)'; c.lineWidth = 1.2; c.stroke();
});
GEN['fx-club-crack'] = (c, W, H) => {
  const r = rng(6), x = W / 2, y = H / 2; c.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    let px = x, py = y, a = i / 9 * TAU + (r() - .5) * .4; const len = W * (.2 + r() * .26);
    for (let s = 0; s < 6; s++) { const nx = px + Math.cos(a) * len / 6, ny = py + Math.sin(a) * len / 6 * (H / W); c.beginPath(); c.moveTo(px, py); c.lineTo(nx, ny); c.strokeStyle = 'rgba(255,170,80,.35)'; c.lineWidth = 6; c.stroke(); c.strokeStyle = 'rgba(255,245,215,.95)'; c.lineWidth = 1.5; c.stroke(); px = nx; py = ny; a += (r() - .5) * .6; }
  }
  c.save(); c.translate(x, y); c.scale(1, H / W); glow(c, 0, 0, W * .14, soft([255, 220, 150], .9)); c.restore();
};
GEN['fx-club-impact'] = (c, W, H) => jagged(c, W, H, 12, 1, .38, 5, [255, 245, 210], [255, 200, 120]);
GEN['fx-heal-aura-green'] = (c, W, H) => { glow(c, W / 2, H / 2, W / 2, [[0, 'rgba(235,255,240,.85)'], [.2, 'rgba(110,240,160,.6)'], [.6, 'rgba(60,200,120,.22)'], [1, 'rgba(40,180,100,0)']]); };
GEN['fx-heal-aura-blue'] = (c, W, H) => { glow(c, W / 2, H / 2, W / 2, [[0, 'rgba(235,248,255,.85)'], [.2, 'rgba(110,190,255,.6)'], [.6, 'rgba(60,130,230,.22)'], [1, 'rgba(40,100,220,0)']]); };
GEN['fx-heal-ring-floor'] = ringGen(COLORS.green);
GEN['fx-heal-ring-floor-blue'] = ringGen(COLORS.blue);
GEN['fx-heal-petals'] = (c, W, H) => cells(W, H, 4, (i, x, y, s) => {
  glow(c, x, y, s * .45, soft(COLORS.green, .35));
  c.save(); c.translate(x, y); c.rotate(-.9 + i * .6); c.beginPath(); c.moveTo(-s * .3, 0); c.quadraticCurveTo(0, -s * .25, s * .3, 0); c.quadraticCurveTo(0, s * .2, -s * .3, 0);
  c.fillStyle = radial(c, 0, 0, 0, s * .32, [[0, 'rgba(255,255,255,1)'], [1, 'rgba(150,255,190,.8)']]); c.fill(); c.restore();
});
GEN['fx-heal-flower'] = (c, W, H) => {
  const x = W / 2, y = H / 2; glow(c, x, y, W * .5, soft(COLORS.green, .4));
  for (let i = 0; i < 8; i++) { c.save(); c.translate(x, y); c.rotate(i / 8 * TAU); c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(W * .1, -W * .18, 0, -W * .36); c.quadraticCurveTo(-W * .1, -W * .18, 0, 0); c.fillStyle = radial(c, 0, -W * .18, 0, W * .2, [[0, 'rgba(255,255,255,.95)'], [1, 'rgba(120,245,170,.55)']]); c.fill(); c.restore(); }
  glow(c, x, y, W * .09, soft(WHITE, 1));
};
GEN['fx-foe-claw-triple'] = (c, W, H) => {
  for (let i = -1; i <= 1; i++) { c.save(); c.translate(W / 2 + i * W * .17, H / 2 + i * H * .05); c.rotate(.9); c.scale(.8, .8); const tmp = mk(W, H / 3); crescent(tmp.getContext('2d'), W, H / 3, [235, 40, 70], [255, 225, 235]); c.drawImage(tmp, -W / 2, -H / 6); c.restore(); }
};
GEN['fx-foe-impact-red'] = (c, W, H) => jagged(c, W, H, 9, 1, .2, 12, [255, 150, 160], [200, 20, 50]);
GEN['fx-foe-dark-orb'] = (c, W, H) => { glow(c, W / 2, H / 2, W / 2, [[0, 'rgba(60,10,90,.95)'], [.5, 'rgba(110,30,150,.7)'], [.8, 'rgba(220,50,120,.5)'], [1, 'rgba(255,60,120,0)']]); glow(c, W / 2, H / 2, W * .18, [[0, 'rgba(255,200,255,.8)'], [1, 'rgba(255,100,200,0)']]); };
GEN['fx-aura-rage'] = (c, W, H) => {
  const r = rng(3); glow(c, W / 2, H * .6, W * .5, [[0, 'rgba(255,120,40,.35)'], [1, 'rgba(255,60,20,0)']]);
  for (let i = 0; i < 9; i++) { const t = document.createElement('canvas'); t.width = 96; t.height = 192; flame(t.getContext('2d'), 96, 192, 20 + i, (i % 3 - 1) * .2); const s = .8 + r() * .8, x = W * (.2 + .6 * i / 8); c.drawImage(t, x - 48 * s, H * (.98) - 192 * s * (1.2 + r() * .4) * .75, 96 * s, 192 * s * (1.2 + r() * .4) * .75); }
  c.globalCompositeOperation = 'destination-out'; const g = c.createLinearGradient(0, H * .78, 0, H); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(0, H * .78, W, H * .22); c.globalCompositeOperation = 'source-over';   // soft base, no hard edge on the ground line
};
GEN['fx-clock-ring'] = (c, W, H) => {
  const x = W / 2, y = H / 2, R = W / 2 - 6, g = [255, 205, 100]; glow(c, x, y, R, soft(g, .18));
  haloStroke(c, () => { c.beginPath(); c.arc(x, y, R * .96, 0, TAU); }, g, 2); haloStroke(c, () => { c.beginPath(); c.arc(x, y, R * .7, 0, TAU); }, g, 1.5);
  ticks(c, x, y, R * .78, R * .92, 12, 3, rgba(g, .95));
  haloStroke(c, () => { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y - R * .56); }, g, 3); haloStroke(c, () => { c.beginPath(); c.moveTo(x, y); c.lineTo(x + R * .38, y + R * .18); }, g, 3);
  glow(c, x, y, R * .07, soft(WHITE, 1));
};
GEN['fx-mirror-glint'] = (c, W, H) => {
  const g = c.createLinearGradient(0, H, W, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(235,248,255,.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.save(); c.translate(W / 2, H / 2); c.rotate(-.12); c.scale(1, .22); c.fillStyle = radial(c, 0, 0, 0, W / 2, [[0, 'rgba(255,255,255,.95)'], [.5, 'rgba(200,230,255,.5)'], [1, 'rgba(180,220,255,0)']]); c.fillRect(-W / 2, -W / 2, W, W); c.restore();
  glow(c, W * .82, H * .4, H * .5, soft([255, 255, 255], .9));
};

// ---------------------------------------------------------------- loading + lookup
const records = new Map();
let suffix = '';
/** optional cache-bust query, e.g. '?v=m2' */
export const setTexSuffix = s => { suffix = s || ''; };

function proc(key) {
  const d = TEX[key]; if (!d || !GEN[key] || typeof document === 'undefined') return null;
  const k = Math.min(1, 384 / Math.max(d.w, d.h)), c = mk(d.w * k, d.h * k); GEN[key](c.getContext('2d'), c.width, c.height); return c;
}
function transparentLightTexture(image,key){
  if(TEX[key]?.blend!=='lighter')return image;
  try{
    const c=mk(image.naturalWidth,image.naturalHeight),x=c.getContext('2d',{willReadFrequently:true});
    x.drawImage(image,0,0);const frame=x.getImageData(0,0,c.width,c.height),d=frame.data;
    // The supplied glow/slash textures use an opaque black matte. Canvas
    // "lighter" keeps that matte's alpha, so it becomes a black rectangle
    // when the effect canvas is composited over the arena. Turn luminance into
    // coverage while retaining the painted colour.
    for(let i=0;i<d.length;i+=4){const light=Math.max(d[i],d[i+1],d[i+2]);d[i+3]=Math.round(d[i+3]*light/255);}
    x.putImageData(frame,0,0);return c;
  }catch{return image;}
}
function record(key) {
  let r = records.get(key);
  if (r) return r;
  r = { key, im:null, ok:false, failed:false, procCanvas:null };
  records.set(key, r);
  if (typeof Image === 'function' && !TEX[key]?.procOnly) {
    r.im = new Image();
    r.im.onload = () => { if (r.im.naturalWidth > 0) {r.realCanvas=transparentLightTexture(r.im,key);r.ok = true;} };
    r.im.onerror = () => { r.failed = true; };
    r.im.src = `${FX_DIR}${key}.webp${suffix}`;
  }
  return r;
}
/** Resolve a texture: the real file when loaded, otherwise the gradient stand-in. Returns { src, sx, sy, sw, sh, real, blend } for the given cell. */
export function texCell(key, cell = 0) {
  const d = TEX[key], r = record(key);
  let src = r.ok ? (r.realCanvas||r.im) : (r.procCanvas ||= proc(key));
  if (!src) return null;
  const W = src.naturalWidth || src.width, H = src.naturalHeight || src.height, n = d?.cells || 1, cw = W / n;
  return { src, sx:Math.floor(cell % n) * cw, sy:0, sw:cw, sh:H, real:r.ok, blend:d?.blend || 'lighter' };
}
/** Start loading a set of keys ahead of time (non-blocking). */
export function preloadTex(keys) { for (const k of keys) record(k); }
export const texStatus = () => [...records.values()].map(r => ({ key:r.key, real:r.ok, failed:r.failed }));
