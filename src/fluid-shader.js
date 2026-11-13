// FLUID-SHADER (11-12 Nov 2026): lava, water, ice and the spirit river flow by a WebGL shader instead of drawn frames.  This is the default; ?fluid=frames
// turns it off (the drawn frames of town-fluid-fx.js play as before), and so does a missing WebGL.
//
// How it works - nothing is drawn, recoloured or filtered outside a liquid mask:
//  1. The ground the player sees (graded chunks, or the far-overview painting; drawn once per piece into a small power-of-two texture, never copied per frame) is the paint.
//  2. A fragment shader re-samples that copy along a FLOW MAP (direction * speed per pixel, baked from the liquid mask by Output/Toby/fluid-full-1112/build_fluids.py)
//     with two phases half a cycle apart (the usual flow-map trick), so the painted lava cells / water streaks slide along the liquid.  A sample is only taken from
//     a pixel that is liquid too (the mask is looked up at the moved position), so rock, bridge or leaves can never be dragged into the liquid.  Noise bends the
//     direction and speed so it is not a conveyor belt.
//  3. The glow of the ground's own bright pixels breathes gently (no new hue) and a few small sparks / glints drift with the flow.
//  4. The result goes back onto the map canvas with the feathered mask as alpha.  Everywhere else the canvas is untouched.
//  One flow field per liquid is cut into cells (pieces); a cell only paints inside its own core rectangle, but looks at its neighbours' liquid through the padding,
//  so the flow carries on across the seams.
// No WebGL / shader compile error / lost context / failed file => status 'failed' and the drawn frames play exactly as before.
import { graphicsProfile } from './graphics-setting.js';   // same Performance-mode throttle as the drawn layers
import { drawTownGroundRectAny, requestTownGroundRect } from './town-terrain.js?v=k1d';   // the graded ground, cut once per piece
import { cloudsMode, codexCloudsApply, codexCloudsState, paintCodexClouds, codexCloudWeight } from './town-clouds-codex.js';   // CLOUDS-MIX: Codex's drawn clouds are the paint of the cloud pieces

// ------------------------------------------------------------------------------------------------ pure helpers (unit tested)
/** The shader is the default.  `?fluid=frames` (or `fluid=off`) gives the drawn frames back; anything else = shader. */
export function fluidShaderRequested(search) {
  try { const v = new URLSearchParams(search ?? globalThis.location?.search ?? '').get('fluid'); return v !== 'frames' && v !== 'off' && v !== 'none'; } catch { return true; }
}
/** Runtime mode: 'shader' (default) | 'frames' (the drawn frames) | 'none' (neither: the painted ground alone - a diagnostic for A/B captures, ?fluid=none). */
let mode = null;
export function fluidMode() {
  if (mode) return mode;
  try { const v = new URLSearchParams(globalThis.location?.search ?? '').get('fluid'); mode = v === 'none' ? 'none' : fluidShaderRequested() ? 'shader' : 'frames'; } catch { mode = 'shader'; }
  return mode;
}
export function setFluidMode(m) { if (['shader', 'frames', 'none'].includes(m)) mode = m; return fluidMode(); }
/** The two flow phases (half a cycle apart) and their blend weights at time `sec`; weights sum to 1 and a phase has weight 0 at its jump. */
export function fluidFlowPhases(sec, speed) {
  const t = Math.max(0, sec) * speed, p0 = t - Math.floor(t), q = t + .5, p1 = q - Math.floor(q);
  const w0 = 1 - Math.abs(2 * p0 - 1);
  return { p0, p1, w0, w1: 1 - w0 };
}
/** World rectangle [x, y, w, h] of a master-px rectangle. */
export function fluidShaderRect(rectPx, layout) {
  const ux = layout.worldSize[0] / layout.masterSize[0], uy = layout.worldSize[1] / layout.masterSize[1], [x, y, w, h] = rectPx;
  return [x * ux, y * uy, w * ux, h * uy];
}
/** Which ground-texture density (px per world unit) a camera scale needs: 0.64 / 1.28 / 2.56.  The texture is only ever rebuilt UPWARDS (a zoom-out keeps the sharper one). */
export const GROUND_LEVELS = Object.freeze([.64, 1.28, 2.56]);
export function groundLevelFor(scale) { return scale <= .7 ? 0 : scale <= 1.4 ? 1 : 2; }
/** Pack job sizes into rows of a GL canvas no wider than `maxW`.  Returns { slots: [{x, y}], w, h }; jobs that would not fit under `maxH` get null. */
export function packJobs(sizes, maxW = 4096, maxH = 4096) {
  const slots = []; let x = 0, y = 0, rowH = 0, w = 0;
  for (const [jw, jh] of sizes) {
    if (jw > maxW) { slots.push(null); continue; }
    if (x + jw > maxW) { y += rowH; x = 0; rowH = 0; }
    if (y + jh > maxH) { slots.push(null); continue; }
    slots.push({ x, y }); x += jw; rowH = Math.max(rowH, jh); w = Math.max(w, x);
  }
  return { slots, w, h: y + rowH };
}

// ------------------------------------------------------------------------------------------------ GLSL
const VERT = `attribute vec2 aPos; void main(){ gl_Position = vec4(aPos, 0., 1.); }`;
const FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uGround;   // graded ground around the piece (mip-mapped)
uniform sampler2D uGroundB;  // CLOUDS-MIX: the same ground with Codex's cloud layer B painted on it (A is in uGround); only read when uMixB > 0
uniform float uMixB;         // CLOUDS-MIX: weight of uGroundB (Codex's A/B cross-fade); 0 for every piece that is not a mixed cloud piece
uniform sampler2D uFlow;     // rg = flow direction * speed, b = liquid mask (feathered)
uniform sampler2D uNoise;    // 128x128 random RGBA, repeating, bilinear: the smooth value noise of the direction wander and the light streaks (one fetch instead of 4 hashes)
uniform vec2  uSize;         // size of the area drawn, layer px
uniform vec2  uView;         // where this piece sits in the shared GL canvas (px from the left / bottom)
uniform vec2  uCapSize;      // size of the ground texture, px
uniform vec2  uOrigin;       // world position of layer pixel (0,0)
uniform vec2  uCapOrigin;    // world position of ground texture pixel (0,0)
uniform vec2  uGScale;       // ground texture px per world unit
uniform vec2  uScale;        // layer px per world unit
uniform vec4  uRect;         // flow-file rectangle (core + padding), world
uniform vec4  uCore;         // the part this piece paints, world
uniform float uTime;         // seconds (stops with the game clock)
uniform float uSpeed;        // flow phases per second
uniform float uCycle;        // world units one phase slides at full speed
uniform float uWarp;         // direction / speed bend by noise, 0..1
uniform float uPulse;        // glow pulse of the bright pixels, 0..1
uniform vec2  uHot;          // luminance range that counts as "bright"
uniform float uSparkLum;     // sparks only sit on pixels at least this bright
uniform float uShimmer;      // brightness streaks that ride the flow (so flat-coloured liquid still visibly moves), 0..1
uniform vec3  uSpark;        // spark colour
uniform float uCell;         // spark grid cell, world units
uniform float uDensity;      // fraction of cells that hold a spark
uniform float uSparkR;       // spark radius, world units
uniform vec2  uDrift;        // sparks drift, world units / s
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ return texture2D(uNoise, p / 128.).r; }
float vnoiseG(vec2 p){ return texture2D(uNoise, p / 128.).g; }
vec4 flowAt(vec2 world){ vec2 uv = (world - uRect.xy) / uRect.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec4(.5, .5, 0., 0.);
  return texture2D(uFlow, uv); }
vec3 groundAt(vec2 world){ vec2 gu = (world - uCapOrigin) * uGScale / uCapSize; vec3 a = texture2D(uGround, gu).rgb;
  if (uMixB > .002) a = mix(a, texture2D(uGroundB, gu).rgb, uMixB);
  return a; }
void main(){
  vec2 px = vec2(gl_FragCoord.x - uView.x, uSize.y - (gl_FragCoord.y - uView.y));
  vec2 world = uOrigin + px / uScale;
  vec4 fl = flowAt(world);
  vec2 inCore = step(uCore.xy, world) * step(world, uCore.xy + uCore.zw);
  float mask = fl.b * inCore.x * inCore.y;
  if (mask < .004) { gl_FragColor = vec4(0.); return; }
  vec3 base = groundAt(world);
  vec2 dir = (fl.rg - .5) * 2.;
  // the direction and the speed wander slowly in space and time
  float n1 = vnoise(world * .045 + vec2(uTime * .05, -uTime * .035)), n2 = vnoiseG(world * .09 + vec2(7.3, uTime * .06));
  float ang = (n1 - .5) * 1.1 * uWarp, cs = cos(ang), sn = sin(ang);
  dir = vec2(cs * dir.x - sn * dir.y, sn * dir.x + cs * dir.y) * (1. + (n2 - .5) * .7 * uWarp);
  float t = uTime * uSpeed, p0 = fract(t), p1 = fract(t + .5), w0 = 1. - abs(2. * p0 - 1.);
  // two phases: the sample point slides AGAINST the flow so the painted pattern moves WITH it; liquid pixels only
  vec2 o0 = -dir * uCycle * (p0 - .5), o1 = -dir * uCycle * (p1 - .5);
  vec2 w0p = world + o0, w1p = world + o1;
  vec3 c0 = mix(base, groundAt(w0p), smoothstep(.45, .85, flowAt(w0p).b));
  vec3 c1 = mix(base, groundAt(w1p), smoothstep(.45, .85, flowAt(w1p).b));
  vec3 col = mix(c1, c0, w0);
  // streaks of light and shade carried by the same two phases, stretched along the flow: even a smooth-coloured stretch of liquid visibly runs
  vec2 dn = normalize(dir + vec2(1e-4)), pn = vec2(-dn.y, dn.x);
  float s0 = vnoise(vec2(dot(w0p, dn) / 9., dot(w0p, pn) / 3.2) + 11.7), s1 = vnoiseG(vec2(dot(w1p, dn) / 9., dot(w1p, pn) / 3.2) + 5.3);
  col *= 1. + uShimmer * (mix(s1, s0, w0) - .5) * 2.;
  // bright pixels breathe (their own colour, brighter - no tint)
  float lum = dot(col, vec3(.299, .587, .114));
  float hot = smoothstep(uHot.x, uHot.y, lum);
  float pulse = .5 + .5 * sin(uTime * 1.3 + n1 * 6.28 + world.y * .02);
  col *= 1. + uPulse * hot * (pulse - .35) * .5;
  // small sparks / glints riding the flow
  vec2 gp = (world - uDrift * uTime) / uCell, id = floor(gp), fr = fract(gp);
  if (uDensity > 0.) {
  float h = hash(id), h2 = hash(id + 7.3);
  if (h < uDensity && lum > uSparkLum) {
    float life = fract(uTime * (.22 + .2 * h2) + h * 3.7);
    vec2 c = vec2(.3 + .4 * h2, .3 + .4 * hash(id + 3.1));
    float d = length((fr - c) * uCell), r = uSparkR * (.6 + .6 * h);
    float a = smoothstep(r, r * .25, d) * pow(sin(3.14159 * life), 2.);
    col += uSpark * a * .85;
  }
  }
  gl_FragColor = vec4(col * mask, mask);
}`;

// ------------------------------------------------------------------------------------------------ state
const stores = new Map();
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
function loadImage(url) {
  return new Promise((resolve, reject) => {
    const im = new Image(); im.decoding = 'async';
    im.onload = async () => { try { if (im.decode) await im.decode(); } catch {} resolve(im); };
    im.onerror = () => reject(new Error('fluid shader art unavailable: ' + url));
    im.src = url;
  });
}
export function shaderStoreOf(dir) {
  let st = stores.get(dir);
  if (!st) { st = { dir, status: 'idle', layout: null, pieces: [], gl: null, glCanvas: null, prog: null, loc: null, last: new Map(), layers: new Map(),
    loading: 0, drawn: 0, ms: 0, error: null, composites: 0, frame: 0 }; stores.set(dir, st); }
  return st;
}
/** True while the shader owns the liquids (ready); the drawn frames of those liquids are not even fetched then. */
export const fluidShaderActive = st => !!st && st.status === 'ready';
/** True until the shader has either taken over or given up: the drawn frames wait (a painted ground is under them anyway). */
export const fluidShaderPending = st => !!st && (st.status === 'idle' || st.status === 'loading');

function compile(gl, type, src) {
  const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
  return s;
}
function initGL(st) {
  const cv = mk(256, 256);
  const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });   // default power preference ON PURPOSE: 'high-performance' picks the discrete GPU on dual-GPU laptops, and every frame then crosses GPUs to reach the 2D map canvas
  if (!gl) throw new Error('no WebGL');
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('link: ' + gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'aPos'); gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);
  const loc = {}; for (const n of ['uGround', 'uGroundB', 'uMixB', 'uFlow', 'uNoise', 'uSize', 'uView', 'uCapSize', 'uOrigin', 'uCapOrigin', 'uGScale', 'uScale', 'uRect', 'uCore', 'uTime', 'uSpeed', 'uCycle', 'uWarp', 'uPulse', 'uHot', 'uSparkLum', 'uShimmer', 'uSpark', 'uCell', 'uDensity', 'uSparkR', 'uDrift']) loc[n] = gl.getUniformLocation(prog, n);
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.uniform1i(loc.uGround, 0); gl.uniform1i(loc.uFlow, 1); gl.uniform1i(loc.uNoise, 2); gl.uniform1i(loc.uGroundB, 3); gl.uniform1f(loc.uMixB, 0);
  // the noise texture: deterministic (a tiny LCG), 128 x 128, 4 channels
  const nz = new Uint8Array(128 * 128 * 4); let seed = 20261112; for (let i = 0; i < nz.length; i++) { seed = (seed * 1664525 + 1013904223) >>> 0; nz[i] = seed >>> 24; }
  const nt = gl.createTexture(); gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, nt);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 128, 128, 0, gl.RGBA, gl.UNSIGNED_BYTE, nz);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.activeTexture(gl.TEXTURE0);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); st.status = 'failed'; st.error = 'context lost'; });
  st.glCanvas = cv; st.gl = gl; st.prog = prog; st.loc = loc;
}
function texParams(gl) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
/** Start loading (once): the GL program and the list of pieces.  Each piece's flow file is fetched when the piece first nears the camera.
 *  Never throws: any failure leaves status 'failed' and the drawn frames in charge. */
export function ensureFluidShader(dir) {
  const st = shaderStoreOf(dir);
  if (st.status !== 'idle' || typeof fetch !== 'function' || typeof document === 'undefined') return st;
  st.status = 'loading';
  (async () => {
    initGL(st);
    const base = dir + 'shader/';
    const layout = await fetch(base + 'fluids.json').then(r => { if (!r.ok) throw new Error('fluids.json ' + r.status); return r.json(); });
    st.base = base; st.layout = layout;
    st.pieces = layout.pieces.map(p => ({ p, rect: fluidShaderRect(p.rectPx, layout), core: fluidShaderRect(p.corePx, layout), tex: null, state: 'idle', ground: null, groundTry: -1e9, seen: 0 }));
    st.status = 'ready';
  })().catch(e => { st.status = 'failed'; st.error = String(e && e.message || e); });
  return st;
}
/** Flow file of a piece -> GL texture (async, at most a few at a time). */
function ensurePieceTexture(st, sp) {
  if (sp.state !== 'idle' || st.loading >= 6) return;
  sp.state = 'loading'; st.loading++;
  loadImage(st.base + sp.p.flow).then(flow => {
    const gl = st.gl, tex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex); texParams(gl);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, flow);
    sp.tex = tex; sp.state = 'ready';
  }).catch(() => { sp.state = 'error'; sp.failedAt = performance.now(); }).finally(() => { st.loading--; });
}

/** The shader layer is rendered at no more than this many px per world unit and then stretched (bilinear) onto the map: liquid is smooth paint, and it halves the fragments at the sharpest zoom.
 *  (The drawn-frames layer used 2.56.)  Measured: fps in the river / pan scenes. */
export const SHADER_MAX_SCALE = 1.7;
export const SHADER_MAX_SCALE_PERFORMANCE = 1.28;   // Performance graphics: lower again
const rawDraw = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype.drawImage : null;
const pow2 = n => 2 ** Math.ceil(Math.log2(Math.max(2, n)));
/** Cut the graded ground around a piece into a power-of-two texture (mip-mapped, so it never shimmers when zoomed out).  `level` = GROUND_LEVELS index.
 *  Chunks that are not decoded yet fall back to the far-overview painting (a blurrier texture, replaced by the sharp one as soon as the chunks are ready) - the
 *  liquid never goes back to the drawn frames while we wait.  Returns true when sp.ground was (re)built. */
function buildGround(st, sp, now, level, wantDetail) {
  if (now - sp.groundTry < 300) return false;
  sp.groundTry = now;
  const g0 = sp.ground;
  const wantMix = sp.p.group === 'clouds' && cloudsMode() === 'mix' && codexCloudsApply();   // CLOUDS-MIX: this piece's paint = ground + Codex layer A / B
  if (g0 && g0.level >= level && (g0.src === 'detail' || !wantDetail) && (g0.mixed || g0.mixFailed || !wantMix)) return false;
  const ppu = GROUND_LEVELS[level], pad = 4, x0 = Math.max(0, sp.rect[0] - pad), y0 = Math.max(0, sp.rect[1] - pad);
  const x1 = Math.min(3840, sp.rect[0] + sp.rect[2] + pad), y1 = Math.min(2560, sp.rect[1] + sp.rect[3] + pad);
  const mixState = wantMix ? codexCloudsState([x0, y0, x1 - x0, y1 - y0]) : 'off';   // asks for the chunk files; 'wait' = not decoded yet: the piece waits (the painted ground holds the cloud sea meanwhile)
  if (mixState === 'wait') return false;
  const want = n => { const hi = pow2(n * ppu); return hi <= n * ppu * 1.4 ? hi : hi / 2; };
  const w = Math.max(16, want(x1 - x0)), h = Math.max(16, want(y1 - y0));
  const c = mk(w, h), g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.setTransform(w / (x1 - x0), 0, 0, h / (y1 - y0), -x0 * w / (x1 - x0), -y0 * h / (y1 - y0));
  const src = drawTownGroundRectAny(g, [x0, y0, x1 - x0, y1 - y0], 0, !wantDetail ? 'preview' : g0 ? 'detail' : 'any');
  if (!src) { c.width = c.height = 1; return false; }
  if (g0 && g0.src === 'detail' && src === 'preview') { c.width = c.height = 1; return false; }   // never swap a sharp texture for the blurry one
  const gl = st.gl;
  let c2 = null;   // CLOUDS-MIX: the ground with layer B; c gets layer A.  Drawn files only, no filter, no recolour.
  if (mixState === 'ready') {
    c2 = mk(w, h); const g2 = c2.getContext('2d'); g2.drawImage(c, 0, 0);
    g2.setTransform(w / (x1 - x0), 0, 0, h / (y1 - y0), -x0 * w / (x1 - x0), -y0 * h / (y1 - y0));
    const rect = [x0, y0, x1 - x0, y1 - y0];
    paintCodexClouds(g, 'A', rect); paintCodexClouds(g2, 'B', rect);
  }
  const upload = canvas => {
    const tx = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tx);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return tx;
  };
  const tex = upload(c), texB = c2 ? upload(c2) : null;
  if (g0) { gl.deleteTexture(g0.tex); if (g0.texB) gl.deleteTexture(g0.texB); }
  sp.ground = { tex, texB, mixed: !!texB, mixFailed: mixState === 'failed', level, src, origin: [x0, y0], size: [w, h], ppu: [w / (x1 - x0), h / (y1 - y0)] };
  c.width = c.height = 1; if (c2) c2.width = c2.height = 1;
  return true;
}
/** Free the ground texture of pieces that have not been on screen for a while (GPU memory on phones). */
function sweep(st, time) {
  if (st.frame % 120) return;
  for (const sp of st.pieces) if (sp.ground && time - sp.seen > 15000) { st.gl.deleteTexture(sp.ground.tex); if (sp.ground.texB) st.gl.deleteTexture(sp.ground.texB); sp.ground = null; }
}

/** Draw all pieces that are on screen.  Call once per frame BEFORE the drawn frame layers.
 *  `h` = { m, view, cv, sec, time, geometry(m, vis, cw, ch), intersect(a, b) } from town-fluid-fx.js. Returns how many pieces were drawn. */
export function drawFluidShader(ctx, st, h) {
  if (!fluidShaderActive(st)) return 0;
  const gl = st.gl, L = st.loc, { m, view, cv, sec, time } = h;
  const fluidMs = graphicsProfile().fluidIntervalMs;
  const mixB = codexCloudWeight(sec * 1000);   // CLOUDS-MIX: same clock as the direct layer under the shader
  const scale = Math.max(m.a, m.d), level = groundLevelFor(scale), wantDetail = scale >= .38;   // .38 = where town-terrain.js leaves the overview painting
  let drawn = 0; st.frame++;
  // pass 1: which pieces need the shader this frame (the others re-blit their last result in Performance graphics)
  const jobs = [], sizes = [];
  for (const sp of st.pieces) {
    const vis = h.intersect(sp.core, view);
    const near = vis || h.intersect(sp.rect, [view[0] - 520, view[1] - 520, view[2] + 1040, view[3] + 1040]);
    if (!near) continue;
    if (sp.state === 'idle' || (sp.state === 'error' && time - sp.failedAt > 8000)) { if (sp.state === 'error') sp.state = 'idle'; ensurePieceTexture(st, sp); }
    if (!vis) continue;
    sp.seen = time;
    if (wantDetail) requestTownGroundRect(sp.rect);
    if (sp.state !== 'ready') continue;
    buildGround(st, sp, time, level, wantDetail);
    if (!sp.ground) continue;
    const id = 'shader:' + sp.p.id;
    if (fluidMs) {   // Performance graphics: re-run the shader at most every fluidMs; in between the last result is blitted again at the camera's new place
      const prev = st.last.get(id);
      if (prev && st.shared && prev.shot === st.shot && time >= prev.at && time - prev.at < fluidMs && Math.abs(m.a - prev.a) < 1e-6 && Math.abs(m.d - prev.d) < 1e-6) {
        blit(ctx, st.shared.canvas, prev.sx, prev.sy, prev.geo, prev.geo.dx0 + (m.e - prev.e), prev.geo.dy0 + (m.f - prev.f)); drawn++; continue;
      }
    }
    const geo = h.geometry(m, vis, cv.width, cv.height, fluidMs ? SHADER_MAX_SCALE_PERFORMANCE : SHADER_MAX_SCALE);
    if (!geo) continue;
    jobs.push({ sp, id, geo }); sizes.push([geo.lw, geo.lh]);
  }
  if (jobs.length) {
    // pass 2: ONE GL submission for every piece (packed in rows of one canvas), then the blits.  One GL -> 2D hand-over per frame instead of one per piece.
    const pack = packJobs(sizes), gc = st.glCanvas, needW = Math.ceil(pack.w / 64) * 64, needH = Math.ceil(pack.h / 64) * 64;
    if (gc.width < needW || gc.height < needH) { gc.width = Math.max(gc.width, needW); gc.height = Math.max(gc.height, needH); }
    gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, gc.width, gc.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    jobs.forEach((job, i) => {
      const slot = pack.slots[i]; if (!slot) return; job.slot = slot;
      const { sp, geo } = job, p = sp.p, gr = sp.ground;
      gl.viewport(slot.x, slot.y, geo.lw, geo.lh);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, gr.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sp.tex);
      gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, gr.texB || gr.tex); gl.uniform1f(L.uMixB, gr.texB ? mixB : 0);   // CLOUDS-MIX
      gl.uniform2f(L.uSize, geo.lw, geo.lh); gl.uniform2f(L.uView, slot.x, slot.y); gl.uniform2f(L.uCapSize, gr.size[0], gr.size[1]);
      gl.uniform2f(L.uOrigin, geo.wx0, geo.wy0); gl.uniform2f(L.uCapOrigin, gr.origin[0], gr.origin[1]); gl.uniform2f(L.uGScale, gr.ppu[0], gr.ppu[1]); gl.uniform2f(L.uScale, geo.sx, geo.sy);
      gl.uniform4f(L.uRect, sp.rect[0], sp.rect[1], sp.rect[2], sp.rect[3]);
      gl.uniform4f(L.uCore, sp.core[0] - 1.2, sp.core[1] - 1.2, sp.core[2] + 2.4, sp.core[3] + 2.4);   // a hair of overlap with the neighbouring cell: no seam
      gl.uniform1f(L.uTime, sec); gl.uniform1f(L.uSpeed, p.speed); gl.uniform1f(L.uCycle, p.cycle); gl.uniform1f(L.uWarp, p.warp); gl.uniform1f(L.uPulse, p.pulse);
      gl.uniform2f(L.uHot, p.hot[0], p.hot[1]); gl.uniform1f(L.uSparkLum, p.sparkLum); gl.uniform1f(L.uShimmer, p.shimmer);
      gl.uniform3f(L.uSpark, p.spark[0], p.spark[1], p.spark[2]); gl.uniform1f(L.uCell, p.sparkCell); gl.uniform1f(L.uDensity, p.sparkDensity); gl.uniform1f(L.uSparkR, p.sparkSize);
      gl.uniform2f(L.uDrift, p.drift[0], p.drift[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    });
    // Performance graphics: ONE copy of the packed GL canvas serves every piece until the next shader run (N copies were measured slower than the drawn frames in the overview / pan scenes)
    let shared = null;
    if (fluidMs) {
      st.shot = (st.shot || 0) + 1;
      shared = st.shared || (st.shared = { canvas: mk(gc.width, gc.height) });
      if (shared.canvas.width < gc.width || shared.canvas.height < gc.height) { shared.canvas.width = Math.max(shared.canvas.width, gc.width); shared.canvas.height = Math.max(shared.canvas.height, gc.height); }
      const sg = shared.ctx || (shared.ctx = shared.canvas.getContext('2d'));
      sg.globalCompositeOperation = 'copy'; sg.drawImage(gc, 0, 0); sg.globalCompositeOperation = 'source-over';
      shared.gh = gc.height;
    }
    for (const { sp, id, geo, slot } of jobs) {
      if (!slot) continue;
      const srcY = gc.height - slot.y - geo.lh;
      if (fluidMs) {
        st.last.set(id, { geo, at: time, e: m.e, f: m.f, a: m.a, d: m.d, sx: slot.x, sy: srcY, shot: st.shot });
        blit(ctx, shared.canvas, slot.x, srcY, geo, geo.dx0, geo.dy0);
      } else blit(ctx, gc, slot.x, srcY, geo, geo.dx0, geo.dy0);
      drawn++;
    }
  }
  if (!fluidMs && st.last.size) { st.last.clear(); }
  sweep(st, time);
  st.composites += drawn;
  return drawn;
}
function blit(ctx, source, sx, sy, geo, dx, dy) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingQuality = 'low';
  if (rawDraw) rawDraw.call(ctx, source, sx, sy, geo.lw, geo.lh, dx, dy, geo.dw, geo.dh); else ctx.drawImage(source, sx, sy, geo.lw, geo.lh, dx, dy, geo.dw, geo.dh);
  ctx.restore();
}
