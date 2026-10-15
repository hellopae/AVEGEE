// Zone 1 ground = the painted map img/map-zone1/v2 (4915x3277 px for the 3840x2560 world, 1.28 px per unit),
// cut into 20 webp chunks (1024 px; last column 819, last row 205) plus a 1536x1024 preview.
// Only chunks that touch the camera are fetched and decoded; the preview stands in for chunks that are
// not ready yet and serves the overview (<0.7 device px per unit) and the minimap on its own.
import {TOWN_SIZE} from './town-layout.js?v=k1d';

export const TOWN_TERRAIN_DIR = 'img/map-zone1/v2/';
export const TOWN_TERRAIN_PREVIEW = TOWN_TERRAIN_DIR + 'zone1-terrain-v2-preview.webp';
export const TOWN_TERRAIN_FULL_PX = {w:4915,h:3277};
export const TOWN_TERRAIN_CHUNK_PX = 1024;
export const TOWN_TERRAIN_COLS = 5, TOWN_TERRAIN_ROWS = 4;
const UNIT_X = TOWN_SIZE.w / TOWN_TERRAIN_FULL_PX.w, UNIT_Y = TOWN_SIZE.h / TOWN_TERRAIN_FULL_PX.h;
// World rectangle of chunk (row,col), 1-based like the file names r{row}-c{col}.webp.
export function townChunkRect(row,col) {
  const x0 = (col-1)*TOWN_TERRAIN_CHUNK_PX, y0 = (row-1)*TOWN_TERRAIN_CHUNK_PX;
  const x1 = Math.min(TOWN_TERRAIN_FULL_PX.w, x0+TOWN_TERRAIN_CHUNK_PX), y1 = Math.min(TOWN_TERRAIN_FULL_PX.h, y0+TOWN_TERRAIN_CHUNK_PX);
  return {x:x0*UNIT_X, y:y0*UNIT_Y, w:(x1-x0)*UNIT_X, h:(y1-y0)*UNIT_Y};
}
export const townChunkUrl = (row,col) => `${TOWN_TERRAIN_DIR}r${row}-c${col}.webp`;
const DETAIL_FROM = 0.7;          // device px per world unit; below this the preview is as sharp as the chunks
const MAX_LOADING = 3;

// Cache the night lighting once per decoded tile, never filter the full viewport per frame.
const nightTiles = new WeakMap();
function nightTerrain(image) {
  if (typeof document === 'undefined') return image;
  let canvas = nightTiles.get(image);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const p = canvas.getContext('2d');
    p.filter = 'brightness(.60) saturate(.78) sepia(.28) hue-rotate(350deg) contrast(1.12)';
    p.drawImage(image,0,0); p.filter = 'none';
    p.globalCompositeOperation = 'multiply';
    p.fillStyle = 'rgba(120,57,70,.24)'; p.fillRect(0,0,canvas.width,canvas.height);
    nightTiles.set(image,canvas);
  }
  return canvas;
}
const chunks = new Map();         // "r,c" -> {image, state:'idle'|'loading'|'ready'|'error', at}
let preview = null, loading = 0, frame = 0;
function ensurePreview() {
  if (preview || typeof Image === 'undefined') return;
  preview = {image:new Image(), ready:false};
  preview.image.onload = () => { preview.ready = true; };
  preview.image.src = TOWN_TERRAIN_PREVIEW;
}
function request(row,col) {
  const key = row+','+col;
  let c = chunks.get(key);
  if (!c) { c = {image:null, state:'idle', at:0}; chunks.set(key,c); }
  if (c.state !== 'idle' || loading >= MAX_LOADING || typeof Image === 'undefined') return c;
  c.state = 'loading'; loading++;
  const image = new Image(); c.image = image; image.decoding = 'async';
  const done = ok => { c.state = ok ? 'ready' : 'error'; loading--; };
  image.onload = () => { (image.decode ? image.decode().catch(()=>{}) : Promise.resolve()).then(()=>done(true)); };
  image.onerror = () => done(false);
  image.src = townChunkUrl(row,col);
  return c;
}
/** Test / tool hook: how many chunks are decoded or on their way. */
export const townTerrainStats = () => {
  const s = {idle:0, loading:0, ready:0, error:0};
  for (const c of chunks.values()) s[c.state]++;
  return {...s, preview:!!preview?.ready};
};

/** Draw the visible part of the painted ground. `resolve` and `time` are accepted for the old call sites. */
export function drawTownTerrain(ctx) {
  ensurePreview();
  const m = ctx.getTransform ? ctx.getTransform() : null;
  const scale = m && Number.isFinite(m.a) && m.a > 0 ? m.a : 1;
  const plain = m && !m.b && !m.c;
  // Visible world rectangle (the whole world when the transform is unusual).
  let vx0 = 0, vy0 = 0, vx1 = TOWN_SIZE.w, vy1 = TOWN_SIZE.h;
  if (plain) {
    vx0 = Math.max(0, -m.e/m.a); vy0 = Math.max(0, -m.f/m.d);
    vx1 = Math.min(TOWN_SIZE.w, (ctx.canvas.width - m.e)/m.a); vy1 = Math.min(TOWN_SIZE.h, (ctx.canvas.height - m.f)/m.d);
  }
  ctx.save();
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'low';
  const pv = preview?.ready ? nightTerrain(preview.image) : null;
  if (scale < DETAIL_FROM) {
    if (pv) ctx.drawImage(pv, 0, 0, TOWN_SIZE.w, TOWN_SIZE.h);
    ctx.restore();
    return;
  }
  frame++;
  // 1 device px of overlap hides hairline seams between neighbouring chunks at fractional scales.
  const eps = 1/scale;
  for (let row = 1; row <= TOWN_TERRAIN_ROWS; row++) for (let col = 1; col <= TOWN_TERRAIN_COLS; col++) {
    const r = townChunkRect(row,col);
    if (r.x > vx1 || r.x + r.w < vx0 || r.y > vy1 || r.y + r.h < vy0) continue;
    const c = request(row,col);
    if (c.state === 'ready') {
      c.at = frame;
      ctx.drawImage(nightTerrain(c.image), r.x, r.y, r.w + (col < TOWN_TERRAIN_COLS ? eps : 0), r.h + (row < TOWN_TERRAIN_ROWS ? eps : 0));
    } else if (pv) {
      // Stand-in: the matching slice of the preview until the sharp chunk has decoded.
      const sx = r.x/TOWN_SIZE.w*pv.width, sy = r.y/TOWN_SIZE.h*pv.height;
      ctx.drawImage(pv, sx, sy, r.w/TOWN_SIZE.w*pv.width, r.h/TOWN_SIZE.h*pv.height, r.x, r.y, r.w, r.h);
    }
  }
  // Prefetch the ring around the camera so walking never reveals a blurry patch.
  const padX = 400, padY = 300;
  for (let row = 1; row <= TOWN_TERRAIN_ROWS; row++) for (let col = 1; col <= TOWN_TERRAIN_COLS; col++) {
    const r = townChunkRect(row,col);
    if (r.x > vx1+padX || r.x + r.w < vx0-padX || r.y > vy1+padY || r.y + r.h < vy0-padY) continue;
    if (loading >= MAX_LOADING) break;
    request(row,col);
  }
  ctx.restore();
}
