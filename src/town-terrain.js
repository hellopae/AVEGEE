import {repairTownTerrain} from './town-terrain-repair.js';
// Zone 1 ground = the painted map img/map-zone1/v5 (4915x3277 px for the 3840x2560 world, 1.28 px per unit),
// cut into 20 webp chunks (1024 px; last column 819, last row 205) plus a 1536x1024 preview.
// Only chunks that touch the camera are fetched and decoded; the preview stands in for chunks that are
// not ready yet and serves the overview (<0.7 device px per unit) and the minimap on its own.
import {TOWN_SIZE} from './town-layout.js?v=k1d';
import {drawHellTerrain,prepareTownLighting} from './town-lighting.js?v=fire-v2';
import {activeTownSkin,activeTownZone,townSkinOf,ZONE_SKIN} from './zone-skin.js';

// Zone 1 constants stay exported (preload, tests); every function below reads the ACTIVE zone skin (zone-skin.js)
// so a zone with its own painted ground reuses the same chunk loader.
export const TOWN_TERRAIN_DIR = ZONE_SKIN.th.terrain.dir;
export const TOWN_TERRAIN_PREVIEW = ZONE_SKIN.th.terrain.preview;
export const TOWN_TERRAIN_FULL_PX = ZONE_SKIN.th.terrain.fullPx;
export const TOWN_TERRAIN_CHUNK_PX = 1024;
export const TOWN_TERRAIN_COLS = 5, TOWN_TERRAIN_ROWS = 4;
const grid = (t=activeTownSkin().terrain) => {
  const c = t.chunk || TOWN_TERRAIN_CHUNK_PX;
  return {chunk:c, cols:Math.ceil(t.fullPx.w/c), rows:Math.ceil(t.fullPx.h/c), full:t.fullPx,
    unitX:TOWN_SIZE.w/t.fullPx.w, unitY:TOWN_SIZE.h/t.fullPx.h};
};
export const townTerrainGrid = zone => grid((townSkinOf(zone)||ZONE_SKIN.th).terrain);
// World rectangle of chunk (row,col), 1-based like the file names r{row}-c{col}.webp.
export function townChunkRect(row,col,zone=activeTownZone()) {
  const G = townTerrainGrid(zone), x0 = (col-1)*G.chunk, y0 = (row-1)*G.chunk;
  const x1 = Math.min(G.full.w, x0+G.chunk), y1 = Math.min(G.full.h, y0+G.chunk);
  return {x:x0*G.unitX, y:y0*G.unitY, w:(x1-x0)*G.unitX, h:(y1-y0)*G.unitY};
}
export const townChunkUrl = (row,col,zone=activeTownZone()) => `${(townSkinOf(zone)||ZONE_SKIN.th).terrain.dir}r${row}-c${col}.webp`;
const DETAIL_FROM = 0.7;          // device px per world unit; below this the preview is as sharp as the chunks
const MAX_LOADING = 3;
const CHUNK_TIMEOUT_MS = 15000, RETRY_BASE_MS = 1000, RETRY_MAX_MS = 30000;
export const townTerrainImage = () => store().preview?.ready ? store().preview.image : null;

// One store per zone skin: its 1536x1024 preview and its chunks (a zone switch never mixes ground).
const stores = new Map();
const store = (zone=activeTownZone()) => {
  let st = stores.get(zone);
  if (!st) { st = {chunks:new Map(), preview:null, previewWait:null}; stores.set(zone,st); }
  return st;
};
let loading = 0, frame = 0;
export function preloadTownTerrainPreview(timeoutMs=30000,zone=activeTownZone()) {
  const st = store(zone), url = (townSkinOf(zone)||ZONE_SKIN.th).terrain.preview, repairs = !!(townSkinOf(zone)||ZONE_SKIN.th).terrain.repairs;
  if(st.preview?.ready)return Promise.resolve(st.preview.image);
  if(st.previewWait)return st.previewWait;
  st.previewWait=new Promise((resolve,reject)=>{
    let ended=false,active;
    const timer=setTimeout(()=>finish(new Error('town preview timeout')),timeoutMs);
    function finish(error,image){if(ended)return;ended=true;clearTimeout(timer);if(active)active.onload=active.onerror=null;if(error){st.preview=null;reject(error);}else{st.preview={image,ready:true};resolve(image);}}
    function attempt(fresh){
      const image=new Image();active=image;st.preview={image,ready:false};image.decoding='async';
      image.onload=async()=>{try{if(image.decode)await image.decode();const ready=repairs?await repairTownTerrain(image):image;await prepareTownLighting(ready,[0,0,TOWN_SIZE.w,TOWN_SIZE.h]);finish(null,ready);}catch(error){if(!fresh)attempt(true);else finish(error);}};
      image.onerror=()=>{if(!fresh)attempt(true);else finish(new Error('town preview unavailable'));};
      image.src=url+(fresh?'?recover='+Date.now():'');
    }
    attempt(false);
  }).finally(()=>{st.previewWait=null;});
  return st.previewWait;
}
function ensurePreview(){if(!store().preview&&typeof Image!=='undefined')preloadTownTerrainPreview().catch(()=>{});}
function request(row,col) {
  const key = row+','+col, zone = activeTownZone(), chunks = store(zone).chunks;
  let c = chunks.get(key);
  if (!c) { c = {image:null, state:'idle', at:0, failures:0, retryAt:0, generation:0}; chunks.set(key,c); }
  if (c.state === 'error' && Date.now() >= c.retryAt) c.state = 'idle';
  if (c.state !== 'idle' || loading >= MAX_LOADING || typeof Image === 'undefined') return c;
  c.state = 'loading'; loading++;
  const generation=++c.generation;
  const image = new Image(); c.image = image; image.decoding = 'async';
  let settled=false;
  const timer=setTimeout(()=>done(false),CHUNK_TIMEOUT_MS);
  const current=()=>!settled&&c.generation===generation;
  const done = (ok,ready=null) => {
    if(!current())return;
    settled=true;clearTimeout(timer);image.onload=image.onerror=null;loading--;
    c.state=ok?'ready':'error';c.image=ok?ready:null;
    if(ok){c.failures=0;c.retryAt=0;}
    else {c.failures++;c.retryAt=Date.now()+Math.min(RETRY_MAX_MS,RETRY_BASE_MS*2**Math.min(5,c.failures-1));}
  };
  image.onload = async () => {
    if(!current())return;
    try {
      if(image.decode)await image.decode();
      if(!current())return;
      const ready=(townSkinOf(zone)||ZONE_SKIN.th).terrain.repairs?await repairTownTerrain(image,{row,col}):image;
      // LOAD-01b: grade the chunk in small slices before it counts as ready, so the first drawn frame never pays for it.
      const r=townChunkRect(row,col,zone);
      await prepareTownLighting(ready,[r.x,r.y,r.w,r.h]);
      if(!current())return;
      done(true,ready);
    } catch {done(false);}
  };
  image.onerror = () => done(false);
  image.src = townChunkUrl(row,col,zone)+(c.failures?`?recover=${Date.now()}`:'');
  return c;
}
/** Test / tool hook: how many chunks are decoded or on their way. */
export const townTerrainStats = () => {
  const s = {idle:0, loading:0, ready:0, error:0};
  for (const c of store().chunks.values()) s[c.state]++;
  return {...s, preview:!!store().preview?.ready};
};

/** Draw the visible part of the painted ground. `resolve` and `time` are accepted for the old call sites. */
export function drawTownTerrain(ctx,resolve,time=0,reduced=true) {
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
  const pv = store().preview?.ready ? store().preview.image : null;
  const G = grid();
  if (scale < DETAIL_FROM) {
    if (pv) drawHellTerrain(ctx,pv,time,reduced,0,0,TOWN_SIZE.w,TOWN_SIZE.h);
    ctx.restore();
    return;
  }
  frame++;
  const visible=[];
  for (let row = 1; row <= G.rows; row++) for (let col = 1; col <= G.cols; col++) {
    const r=townChunkRect(row,col);
    if (r.x > vx1 || r.x + r.w < vx0 || r.y > vy1 || r.y + r.h < vy0) continue;
    visible.push({row,col,r,c:request(row,col)});
  }
  // Never mix preview pixels and sharp chunks in one camera frame.  Their different source
  // resolutions used to expose 1024px rectangles under buildings and trees while streaming.
  // The preview is a complete clean painting, so keep it until every visible chunk is ready,
  // then switch the whole camera footprint to sharp art at once.
  if(!visible.every(v=>v.c.state==='ready')) {
    if(pv)drawHellTerrain(ctx,pv,time,reduced,0,0,TOWN_SIZE.w,TOWN_SIZE.h);
    ctx.restore();
    return;
  }
  // 1 device px of overlap hides hairline seams between neighbouring chunks at fractional scales.
  const eps = 1/scale;
  for (const {row,col,r,c} of visible) {
    c.at = frame;
    drawHellTerrain(ctx,c.image,time,reduced, r.x, r.y, r.w + (col < G.cols ? eps : 0), r.h + (row < G.rows ? eps : 0));
  }
  // Prefetch the ring around the camera so walking never reveals a blurry patch.
  const padX = 400, padY = 300;
  for (let row = 1; row <= G.rows; row++) for (let col = 1; col <= G.cols; col++) {
    const r = townChunkRect(row,col);
    if (r.x > vx1+padX || r.x + r.w < vx0-padX || r.y > vy1+padY || r.y + r.h < vy0-padY) continue;
    if (loading >= MAX_LOADING) break;
    request(row,col);
  }
  ctx.restore();
}
