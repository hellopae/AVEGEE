// FLUID-SHADER (pilot, 11 Nov 2026): lava that flows by a WebGL shader instead of drawn frames.  Opt in with ?fluid=shader (the default stays the drawn frames).
//
// How it works - nothing is drawn, recoloured or filtered outside a liquid mask:
//  1. The ground the player sees (graded chunks, drawn once per piece into a small power-of-two texture; no per-frame copy of the map canvas) is the paint.
//  2. A fragment shader re-samples that copy along a FLOW MAP (direction * speed per pixel, baked from the mask by
//     Output/Toby/fluid-shader-1111/build_pilot_assets.py) with two phases half a cycle apart (the usual flow-map trick), so the painted lava cells / streaks
//     slide along the liquid.  A sample is only taken from a pixel that is liquid too (the mask is looked up at the moved position), so rock, bridge or leaves
//     can never be dragged into the lava.  Noise bends the direction and speed so it is not a conveyor belt.
//  3. The glow of the ground's own hot pixels pulses gently (no new hue) and a few small sparks drift with the flow.
//  4. The result goes back onto the map canvas with the feathered mask as alpha.  Everywhere else the canvas is untouched.
//  5. While a piece is drawn this way, the old frame layers are cut out of its mask (destination-out) so the two never stack.
// No WebGL / shader compile error / lost context / failed file => status 'failed' and the drawn frames play exactly as before.
import { graphicsProfile } from './graphics-setting.js';   // same Performance-mode throttle as the drawn layers
import { drawTownGroundRectIfReady } from './town-terrain.js?v=k1d';   // the graded ground, cut once per piece

// ------------------------------------------------------------------------------------------------ pure helpers (unit tested)
/** ?fluid=shader (or the value `shader` of a `fluid` query key).  Anything else = the drawn frames. */
export function fluidShaderRequested(search) {
  try { return new URLSearchParams(search ?? globalThis.location?.search ?? '').get('fluid') === 'shader'; } catch { return false; }
}
/** The two flow phases (half a cycle apart) and their blend weights at time `sec`; weights sum to 1 and a phase has weight 0 at its jump. */
export function fluidFlowPhases(sec, speed) {
  const t = Math.max(0, sec) * speed, p0 = t - Math.floor(t), q = t + .5, p1 = q - Math.floor(q);
  const w0 = 1 - Math.abs(2 * p0 - 1);
  return { p0, p1, w0, w1: 1 - w0 };
}
/** World rectangle [x, y, w, h] of a pilot piece (master px -> world units). */
export function fluidShaderRect(piece, pilot) {
  const ux = pilot.worldSize[0] / pilot.masterSize[0], uy = pilot.worldSize[1] / pilot.masterSize[1], [x, y, w, h] = piece.maskRectPx;
  return [x * ux, y * uy, w * ux, h * uy];
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
uniform sampler2D uFlow;     // rg = flow direction * speed, b = mask (feathered)
uniform vec2  uSize;         // size of the area drawn, layer px
uniform vec2  uView;         // where this piece sits in the shared GL canvas (px from the left)
uniform vec2  uCapSize;      // size of the ground texture, px
uniform vec2  uOrigin;       // world position of layer pixel (0,0)
uniform vec2  uCapOrigin;    // world position of ground texture pixel (0,0)
uniform vec2  uGScale;       // ground texture px per world unit
uniform vec2  uScale;        // layer px per world unit
uniform vec4  uRect;         // piece rectangle, world
uniform float uTime;         // seconds (stops with the game clock)
uniform float uSpeed;        // flow phases per second
uniform float uCycle;        // world units one phase slides at full speed
uniform float uWarp;         // direction / speed bend by noise, 0..1
uniform float uPulse;        // glow pulse of the hot pixels, 0..1
uniform vec3  uSpark;        // spark colour
uniform float uCell;         // spark grid cell, world units
uniform float uDensity;      // fraction of cells that hold a spark
uniform float uSparkR;       // spark radius, world units
uniform vec2  uDrift;        // sparks drift, world units / s
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
vec4 flowAt(vec2 world){ vec2 uv = (world - uRect.xy) / uRect.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec4(.5, .5, 0., 0.);
  return texture2D(uFlow, uv); }
vec3 groundAt(vec2 world){ return texture2D(uGround, (world - uCapOrigin) * uGScale / uCapSize).rgb; }
void main(){
  vec2 px = vec2(gl_FragCoord.x - uView.x, uSize.y - gl_FragCoord.y);
  vec2 world = uOrigin + px / uScale;
  vec4 fl = flowAt(world);
  float mask = fl.b;
  if (mask < .004) { gl_FragColor = vec4(0.); return; }
  vec3 base = groundAt(world);
  vec2 dir = (fl.rg - .5) * 2.;
  // the direction and the speed wander slowly in space and time
  float n1 = vnoise(world * .045 + vec2(uTime * .05, -uTime * .035)), n2 = vnoise(world * .09 + vec2(7.3, uTime * .06));
  float ang = (n1 - .5) * 1.1 * uWarp, cs = cos(ang), sn = sin(ang);
  dir = vec2(cs * dir.x - sn * dir.y, sn * dir.x + cs * dir.y) * (1. + (n2 - .5) * .7 * uWarp);
  float t = uTime * uSpeed, p0 = fract(t), p1 = fract(t + .5), w0 = 1. - abs(2. * p0 - 1.);
  // two phases: the sample point slides AGAINST the flow so the painted pattern moves WITH it; liquid pixels only
  vec2 o0 = -dir * uCycle * (p0 - .5), o1 = -dir * uCycle * (p1 - .5);
  vec2 w0p = world + o0, w1p = world + o1;
  vec3 c0 = mix(base, groundAt(w0p), smoothstep(.45, .85, flowAt(w0p).b));
  vec3 c1 = mix(base, groundAt(w1p), smoothstep(.45, .85, flowAt(w1p).b));
  vec3 col = mix(c1, c0, w0);
  // hot pixels breathe (their own colour, brighter - no tint)
  float lum = dot(col, vec3(.299, .587, .114));
  float hot = smoothstep(.5, .92, lum);
  float pulse = .5 + .5 * sin(uTime * 1.3 + n1 * 6.28 + world.y * .02);
  col *= 1. + uPulse * hot * (pulse - .35) * .5;
  // small sparks / bubbles riding the flow
  vec2 gp = (world - uDrift * uTime) / uCell, id = floor(gp), fr = fract(gp);
  float h = hash(id), h2 = hash(id + 7.3);
  if (h < uDensity && lum > .35) {
    float life = fract(uTime * (.22 + .2 * h2) + h * 3.7);
    vec2 c = vec2(.3 + .4 * h2, .3 + .4 * hash(id + 3.1));
    float d = length((fr - c) * uCell), r = uSparkR * (.6 + .6 * h);
    float a = smoothstep(r, r * .25, d) * pow(sin(3.14159 * life), 2.);
    col += uSpark * a * .85;
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
  if (!st) { st = { dir, status: 'idle', pilot: null, pieces: [], gl: null, glCanvas: null, prog: null, loc: null, last: new Map(), layers: new Map(),
    drawn: 0, ms: 0, error: null, composites: 0 }; stores.set(dir, st); }
  return st;
}
/** True when the shader owns the pilot pieces on screen duty (the drawn frames are cut out of their masks). */
export const fluidShaderActive = st => !!st && st.status === 'ready';

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
  const loc = {}; for (const n of ['uGround', 'uFlow', 'uSize', 'uView', 'uCapSize', 'uOrigin', 'uCapOrigin', 'uGScale', 'uScale', 'uRect', 'uTime', 'uSpeed', 'uCycle', 'uWarp', 'uPulse', 'uSpark', 'uCell', 'uDensity', 'uSparkR', 'uDrift']) loc[n] = gl.getUniformLocation(prog, n);
  gl.disable(gl.BLEND); gl.disable(gl.DEPTH_TEST);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.uniform1i(loc.uGround, 0); gl.uniform1i(loc.uFlow, 1);
  cv.addEventListener('webglcontextlost', e => { e.preventDefault(); st.status = 'failed'; st.error = 'context lost'; });
  st.glCanvas = cv; st.gl = gl; st.prog = prog; st.loc = loc;
}
function texParams(gl) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}
/** Start loading (once).  Never throws: any failure leaves status 'failed' and the drawn frames in charge. */
export function ensureFluidShader(dir) {
  const st = shaderStoreOf(dir);
  if (st.status !== 'idle' || typeof fetch !== 'function' || typeof document === 'undefined') return st;
  st.status = 'loading';
  (async () => {
    initGL(st);
    const base = dir + 'shader/';
    const pilot = await fetch(base + 'pilot.json').then(r => { if (!r.ok) throw new Error('pilot.json ' + r.status); return r.json(); });
    const pieces = await Promise.all(pilot.pieces.map(async p => {
      const [flow, mask] = await Promise.all([loadImage(base + p.flow), loadImage(base + p.mask)]);
      const gl = st.gl, tex = gl.createTexture();
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, tex); texParams(gl);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, flow);
      return { p, rect: fluidShaderRect(p, pilot), tex, mask, ground: null, groundTry: -1e9 };
    }));
    st.pilot = pilot; st.pieces = pieces; st.status = 'ready';
  })().catch(e => { st.status = 'failed'; st.error = String(e && e.message || e); });
  return st;
}

/** Cut every shader mask that touches `rect` (world) out of the layer being built (call with the world transform set, after the layer is clipped). */
export function cutShaderHoles(g, st, rect) {
  if (!fluidShaderActive(st)) return;
  g.globalCompositeOperation = 'destination-out';
  for (const sp of st.pieces) {
    const r = sp.rect;
    if (!sp.ground) continue;   // not drawn by the shader yet (its ground is still being cut): the drawn frame keeps playing there
    if (r[0] > rect[0] + rect[2] || r[0] + r[2] < rect[0] || r[1] > rect[1] + rect[3] || r[1] + r[3] < rect[1]) continue;
    g.drawImage(sp.mask, r[0], r[1], r[2], r[3]);
  }
  g.globalCompositeOperation = 'source-over';
}

const rawDraw = typeof CanvasRenderingContext2D !== 'undefined' ? CanvasRenderingContext2D.prototype.drawImage : null;
const GROUND_PPU = 2.56;   // ground texture density cap, px per world unit (the same as the drawn layers' sharpest level)
const pow2 = n => 2 ** Math.ceil(Math.log2(Math.max(2, n)));
/** Cut the graded ground around a piece ONCE into a power-of-two texture (mip-mapped, so it never shimmers when zoomed out).  False until its chunks are decoded. */
function buildGround(st, sp, now) {
  if (now - sp.groundTry < 400) return false;
  sp.groundTry = now;
  const pad = sp.p.cycle + 4, x0 = Math.max(0, sp.rect[0] - pad), y0 = Math.max(0, sp.rect[1] - pad);
  const x1 = Math.min(3840, sp.rect[0] + sp.rect[2] + pad), y1 = Math.min(2560, sp.rect[1] + sp.rect[3] + pad);
  const want = n => { const hi = pow2(n * GROUND_PPU); return hi <= n * GROUND_PPU * 1.4 ? hi : hi / 2; };
  const w = want(x1 - x0), h = want(y1 - y0), c = mk(w, h), g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  g.setTransform(w / (x1 - x0), 0, 0, h / (y1 - y0), -x0 * w / (x1 - x0), -y0 * h / (y1 - y0));
  if (!drawTownGroundRectIfReady(g, [x0, y0, x1 - x0, y1 - y0])) { c.width = c.height = 1; return false; }
  const gl = st.gl, tex = gl.createTexture();
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  sp.ground = { tex, origin: [x0, y0], size: [w, h], ppu: [w / (x1 - x0), h / (y1 - y0)] };
  c.width = c.height = 1;
  return true;
}

/** Draw all pilot pieces that are on screen.  Call once per frame BEFORE the drawn frame layers.
 *  `h` = { m, view, cv, sec, time, geometry(m, vis, cw, ch), intersect(a, b) } from town-fluid-fx.js. Returns how many pieces were drawn. */
export function drawFluidShader(ctx, st, h) {
  if (!fluidShaderActive(st)) return 0;
  const gl = st.gl, L = st.loc, { m, view, cv, sec, time } = h;
  const fluidMs = graphicsProfile().fluidIntervalMs;
  let drawn = 0;
  // pass 1: which pieces need the shader this frame (the others re-blit their last result in Performance graphics)
  const jobs = []; let totalW = 0, maxH = 0;
  for (const sp of st.pieces) {
    const vis = h.intersect(sp.rect, view);
    if (!vis) continue;
    if (!sp.ground && !buildGround(st, sp, time)) continue;
    const id = 'shader:' + sp.p.id;
    if (fluidMs) {   // Performance graphics: re-run the shader at most every fluidMs; in between the last result is blitted again at the camera's new place
      const prev = st.last.get(id), layer = st.layers.get(id);
      if (prev && layer && time >= prev.at && time - prev.at < fluidMs && Math.abs(m.a - prev.a) < 1e-6 && Math.abs(m.d - prev.d) < 1e-6) {
        blit(ctx, layer.canvas, 0, 0, prev.geo, prev.geo.dx0 + (m.e - prev.e), prev.geo.dy0 + (m.f - prev.f)); drawn++; continue;
      }
    }
    const geo = h.geometry(m, vis, cv.width, cv.height);
    if (!geo) continue;
    jobs.push({ sp, id, geo, x: totalW }); totalW += geo.lw; maxH = Math.max(maxH, geo.lh);
  }
  if (jobs.length) {
    // pass 2: ONE GL submission for every piece (side by side in one canvas), then the blits.  One GL -> 2D hand-over per frame instead of one per piece.
    const gc = st.glCanvas, needW = Math.ceil(totalW / 64) * 64, needH = Math.ceil(maxH / 64) * 64;
    if (gc.width < needW || gc.height < needH) { gc.width = Math.max(gc.width, needW); gc.height = Math.max(gc.height, needH); }
    gl.disable(gl.SCISSOR_TEST); gl.viewport(0, 0, gc.width, gc.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    for (const { sp, geo, x } of jobs) {
      gl.viewport(x, 0, geo.lw, geo.lh);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sp.ground.tex);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, sp.tex);
      const p = sp.p, gr = sp.ground;
      gl.uniform2f(L.uSize, geo.lw, geo.lh); gl.uniform2f(L.uView, x, 0); gl.uniform2f(L.uCapSize, gr.size[0], gr.size[1]);
      gl.uniform2f(L.uOrigin, geo.wx0, geo.wy0); gl.uniform2f(L.uCapOrigin, gr.origin[0], gr.origin[1]); gl.uniform2f(L.uGScale, gr.ppu[0], gr.ppu[1]); gl.uniform2f(L.uScale, geo.sx, geo.sy);
      gl.uniform4f(L.uRect, sp.rect[0], sp.rect[1], sp.rect[2], sp.rect[3]);
      gl.uniform1f(L.uTime, sec); gl.uniform1f(L.uSpeed, p.speed); gl.uniform1f(L.uCycle, p.cycle); gl.uniform1f(L.uWarp, p.warp); gl.uniform1f(L.uPulse, p.pulse);
      gl.uniform3f(L.uSpark, p.spark[0], p.spark[1], p.spark[2]); gl.uniform1f(L.uCell, p.sparkCell); gl.uniform1f(L.uDensity, p.sparkDensity); gl.uniform1f(L.uSparkR, p.sparkSize);
      gl.uniform2f(L.uDrift, p.drift[0], p.drift[1]);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    for (const { sp, id, geo, x } of jobs) {
      const srcY = gc.height - geo.lh;
      if (fluidMs) {
        let layer = st.layers.get(id);
        if (!layer) { const canvas = mk(geo.lw, geo.lh); layer = { canvas, ctx: canvas.getContext('2d') }; st.layers.set(id, layer); }
        if (layer.canvas.width < geo.lw || layer.canvas.height < geo.lh) { layer.canvas.width = Math.max(layer.canvas.width, geo.lw); layer.canvas.height = Math.max(layer.canvas.height, geo.lh); }
        layer.ctx.globalCompositeOperation = 'copy'; layer.ctx.drawImage(gc, x, srcY, geo.lw, geo.lh, 0, 0, geo.lw, geo.lh); layer.ctx.globalCompositeOperation = 'source-over';
        st.last.set(id, { geo, at: time, e: m.e, f: m.f, a: m.a, d: m.d });
        blit(ctx, layer.canvas, 0, 0, geo, geo.dx0, geo.dy0);
      } else blit(ctx, gc, x, srcY, geo, geo.dx0, geo.dy0);
      drawn++;
    }
  }
  st.composites += drawn;
  return drawn;
}
function blit(ctx, source, sx, sy, geo, dx, dy) {
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.imageSmoothingQuality = 'low';
  if (rawDraw) rawDraw.call(ctx, source, sx, sy, geo.lw, geo.lh, dx, dy, geo.dw, geo.dh); else ctx.drawImage(source, sx, sy, geo.lw, geo.lh, dx, dy, geo.dw, geo.dh);
  ctx.restore();
}
