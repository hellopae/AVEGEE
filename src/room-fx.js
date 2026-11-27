// FB3-T10 / O3 (owner 21 and 26 Nov): the weather of the outside map, inside the rooms.
//   Zone 1 cloud shadows on the floor + leaves blown along the terrace + lava glints in the view · Zone 2 light shafts and shade on the floor (+ slim leaves) · Zone 3 snow · Zone 4 rain.
// It is the SAME engine as the dialog scenes and the map (map-ambient.js `drawMapWeather` / `drawBiomeWeather` / `drawSceneLava`, scene-atmosphere.js budgets), drawn once per frame into small
// off-screen canvases and then laid onto the room picture through the open-air polygons of room-open-areas.js - so nothing is ever drawn over a roof, a building or a button, and it sits UNDER the
// characters (room.js calls draw() right after the picture, before anything stands on it). The leaves blow in the same gusts as the front trees (room-tree-wind.js `roomWindAt`).
// Budget: the off-screen canvases are at most ROOM_FX.maxPixels, redrawn at ROOM_FX.frameMs (the blits in between are cheap), the particle caps are the scenes' own (scene-atmosphere.js sceneWeatherCap)
// limited again per room; reduced motion and the weather switch turn it all off; a lost GPU context rebuilds the canvases (gpuLossEpoch). The room's frame loop stops when the room closes, and so does this.
import { drawMapWeather, drawBiomeWeather, drawSceneLava, weatherEnabled } from './map-ambient.js';
import { sceneWeatherCap, atmosphereBudget } from './scene-atmosphere.js';
import { roomWindAt } from './room-tree-wind.js';
import { gpuLossEpoch } from './gpu-budget.js';
import { openAreasOf } from './room-open-areas.js';

export const ROOM_FX = Object.freeze({
  maxPixels:110000,            // each off-screen layer
  frameMs:55,                  // the weather refreshes at ~18 fps; the room still draws every frame
  maxParticles:Object.freeze({ west:200, cyberhell:220 }),
  leaves:Object.freeze({ count:14, fall:Object.freeze([14, 26]), size:Object.freeze([3, 5.5]) }),   // Zone 1 leaves (per room, before the area share)
  // Zone 2's map renderer paints both cloud shadows and sun shafts.
  effects:Object.freeze({ th:Object.freeze(['cloud', 'leaves', 'lava']), asia:Object.freeze(['cloud']), west:Object.freeze(['snow']), cyberhell:Object.freeze(['rain']) }),
});
const noise = n => { const f = Math.sin(n * 127.1 + 311.7) * 43758.5453; return f - Math.floor(f); };
const mod = (n, d) => ((n % d) + d) % d;

/** Which effects a zone's rooms have. */
export const roomEffectsOf = zone => ROOM_FX.effects[zone] || [];

/** One leaf of Zone 1: where it is at `timeMs` inside a box (0..1 of the picture), pure so a test can pin the wind. The gust that pushes it is the front trees' own (roomWindAt). */
export function roomLeafAt(i, timeMs, box) {
  const [x0, y0, x1, y1] = box, t = timeMs / 1000, F = ROOM_FX.leaves;
  const span = y1 - y0, fall = F.fall[0] + noise(i + 3) * (F.fall[1] - F.fall[0]);
  const v = mod(noise(i + 11) * span + t * fall * .004, span);                           // falls slowly through the box and starts again at the top
  const base = x0 + noise(i + 7) * (x1 - x0);
  const wind = roomWindAt(timeMs, base);
  const push = wind.strength * (.05 + .02 * wind.wave);                                      // the gust carries it along the room's wind direction (positive = right)
  const x = base + Math.sin(t * .9 + i * 1.7) * .006 + push;
  return { x:Math.min(x1, Math.max(x0, x)), y:y0 + v, angle:t * .7 + i, size:F.size[0] + noise(i + 21) * (F.size[1] - F.size[0]), shade:i % 3 };
}
const LEAF_FILL = ['#c2452a', '#d8742c', '#b8532f'];   // the maple palette of the trees in the room (particles; the pictures are never touched)

const NOOP = Object.freeze({ draw() {}, active:false, effects:[], destroy() {} });

/** `edge` = the polygon this layer may show in (0..1 of the box); its soft-edged mask is baked once so the weather fades out at the border instead of being cut by a straight line. */
const layerFor = (w, h, edge, blurPx = 7) => {
  const s = Math.min(1, Math.sqrt(ROOM_FX.maxPixels / Math.max(1, w * h)));
  const cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(w * s)); cv.height = Math.max(1, Math.round(h * s));
  const mask = document.createElement('canvas'); mask.width = cv.width; mask.height = cv.height;
  const m = mask.getContext('2d');
  m.fillStyle = '#fff'; m.beginPath();
  for (const poly of edge) { poly.forEach(([u, v], i) => (i ? m.lineTo : m.moveTo).call(m, u * mask.width, v * mask.height)); m.closePath(); }
  m.clip();
  if (typeof m.filter === 'string') m.filter = `blur(${Math.max(1, blurPx * s).toFixed(1)}px)`;
  m.fill();
  return { cv, ctx:cv.getContext('2d'), scale:s, mask };
};
/** Keep only what is inside the soft mask. */
const maskLayer = L => { const c = L.ctx; c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'destination-in'; c.drawImage(L.mask, 0, 0); c.globalCompositeOperation = 'source-over'; };

/** The room's weather. `room.crop` / `mirror` as the room draws its picture; returns { draw(ctx, box, t, { bg }), active, effects, destroy }. */
export function makeRoomFx({ zone, bgSrc, room = {}, mirror = false, reduced = () => false, enabled = () => weatherEnabled() }) {
  const areas = openAreasOf(bgSrc), effects = roomEffectsOf(zone);
  if (!areas || !effects.length || typeof document === 'undefined') return NOOP;
  const crop = room.crop || [0, 0, 1, 1];
  // full-picture u,v -> 0..1 of the drawn box (cropped / mirrored)
  const toBox = ([u, v]) => [((mirror ? 1 - u : u) - (mirror ? 1 - crop[0] - crop[2] : crop[0])) / crop[2], (v - crop[1]) / crop[3]];
  const polyBox = poly => poly.map(toBox);
  const floor = areas.floor ? [polyBox(areas.floor)] : [];
  const airAreas = [...floor, ...areas.outside.map(polyBox)];
  const lavaAreas = (areas.lava || areas.outside).map(polyBox);
  const leafBoxes = areas.leaves.map(([a, b, c, d]) => { const p = toBox([a, b]), q = toBox([c, d]); return [Math.min(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[0], q[0]), Math.max(p[1], q[1])]; });
  let sky = null, air = null, lava = null, composed = null, composeCtx = null, epoch = -1, sizeKey = '', drawnAt = -1e9, clock = 0, last = null;
  const rebuild = box => {
    const key = `${Math.round(box.w)}x${Math.round(box.h)}`;
    if (epoch === gpuLossEpoch() && key === sizeKey && composed) return;
    epoch = gpuLossEpoch(); sizeKey = key; drawnAt = -1e9;
    sky = effects.includes('cloud') && floor.length ? layerFor(box.w, box.h, floor, 34) : null;
    air = effects.some(e => ['leaves', 'snow', 'rain'].includes(e)) ? layerFor(box.w, box.h, airAreas, 14) : null;
    lava = effects.includes('lava') ? layerFor(box.w, box.h, lavaAreas, 8) : null;
    const layers = [sky, air, lava].filter(Boolean);
    composed = layers[0].cv;
    composeCtx = null;
    if (layers.length > 1) {
      // Compose at the layer resolution and upscale only once when drawing to the room.
      const target = document.createElement('canvas');
      target.width = composed.width;
      target.height = composed.height;
      composed = target;
      composeCtx = target.getContext('2d');
    }
  };
  const paintLayers = (box, t, bg) => {
    const dt = last === null ? 0 : Math.max(0, Math.min(100, t - last)); last = t; clock += dt;   // a long stall does not make the weather jump
    if (sky && effects.includes('cloud')) {
      const { ctx: c, cv } = sky; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      drawMapWeather(c, { zone, time:clock, W:cv.width, H:cv.height, reduced:false, paused:false, enabled:true, clouds:true, sceneClouds:true, townShadows:zone !== 'th', viewport:{ width:cv.width, height:cv.height, dpr:1 } });
      maskLayer(sky);
    }
    if (air) {
      const { ctx: c, cv, scale } = air; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      if (effects.includes('snow') || effects.includes('rain')) {
        const cap = Math.min(ROOM_FX.maxParticles[zone] || 160, sceneWeatherCap(zone, cv.width, cv.height, 1) ?? atmosphereBudget(cv.width, cv.height, 1));
        drawBiomeWeather(c, zone, clock, cv.width, cv.height, false, [0, 0, 1, 1], cap, { quiet:true, layer:zone === 'west' ? 'sky' : 'all' });   // quiet: no lightning flash inside a room
      }
      if (effects.includes('leaves')) {
        c.save();
        leafBoxes.forEach((lb, b) => {
          const share = Math.max(2, Math.round(ROOM_FX.leaves.count * ((lb[2] - lb[0]) * (lb[3] - lb[1])) / 0.35));
          for (let i = 0; i < Math.min(share, 8); i++) {
            const L = roomLeafAt(b * 31 + i, clock, lb), x = L.x * cv.width, y = L.y * cv.height, s = L.size * scale * (cv.width / 520 > 1 ? 1.3 : 1);
            c.save(); c.translate(x, y); c.rotate(L.angle); c.globalAlpha = .62; c.fillStyle = LEAF_FILL[L.shade];
            c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * .7, s, 0); c.quadraticCurveTo(0, s * .5, -s, 0); c.fill(); c.restore();
          }
        });
        c.restore();
      }
      maskLayer(air);
    }
    if (lava && bg) {
      const { ctx: c, cv } = lava; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, cv.width, cv.height);
      // the lava mask belongs to the FULL picture: lay the picture's frame over the layer the way the room does (crop, mirror) and let the scene's own lava painter work in it
      const fw = cv.width / crop[2], fh = cv.height / crop[3];
      c.save(); if (mirror) { c.translate(cv.width, 0); c.scale(-1, 1); }
      c.translate(-crop[0] * fw, -crop[1] * fh);
      drawSceneLava(c, bg, zone, clock, fw, fh, false);
      c.restore();
      maskLayer(lava);
    }
    if (composeCtx) {
      composeCtx.clearRect(0, 0, composed.width, composed.height);
      for (const layer of [sky, air, lava]) if (layer) composeCtx.drawImage(layer.cv, 0, 0);
    }
  };
  return {
    active:true, effects,
    layers: () => ({ sky, air, lava }),   // (tests, evidence)
    destroy() { sky = air = lava = composed = composeCtx = null; },
    /** Lay the weather over the picture, under everything that stands on it. */
    draw(ctx, box, t, { bg, paused = false } = {}) {
      if (reduced() || !enabled() || paused || !box || !(box.w > 8 && box.h > 8)) { last = null; return; }
      rebuild(box);
      if (t - drawnAt >= ROOM_FX.frameMs) { drawnAt = t; paintLayers(box, t, bg); } else if (last === null) last = t;
      ctx.save();
      ctx.imageSmoothingEnabled = true;
      // the layers are already cut to their soft-edged areas; the box clip keeps them inside the picture
      ctx.beginPath(); ctx.rect(box.ox, box.oy, box.w, box.h); ctx.clip();
      ctx.drawImage(composed, box.ox, box.oy, box.w, box.h);
      ctx.restore();
    },
  };
}
