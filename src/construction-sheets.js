// Z1-V5-FX3: animated construction sheets for the station build-up (drawStation in scene.js).
//
// Art spec (what Codex / Kittanate draw, nothing else is needed):  img/construction/<zone>/   zone = th | asia | west | cyberhell
//   construction.json   { "frameW": 512, "frameH": 512, "foot": [256, 500], "widthK": 1,
//                         "stages": [ {"sheet":"stage-1.webp","frames":8,"fps":6}, {"sheet":"stage-2.webp",...}, {"sheet":"stage-3.webp",...} ],
//                         "worldWidth": 256   (optional: draw every station's frame exactly this wide in world units, instead of def.bw * widthK)
//                         "byStation": { "<station key>": { "foot":[x,y], "widthK":1.2 } }   (optional per-station tweaks) }
//   stage-1.webp  stage-2.webp  stage-3.webp   one horizontal strip per stage: `frames` frames of frameW x frameH, transparent background
// The sheets show NO building (owner 5 Nov): only the crane, the rising posts and the scaffold, in 3 stages (0-33 %, 33-66 %, 66-100 % of the build time),
// and the same three sheets are used for every station.  `foot` = the pixel of a frame that stands on the station's foot point (def.bx, def.by);
// the frame is drawn `def.bw * widthK` world units wide.  Frames of a stage loop with a linear cross-fade; around the 33 % and 66 % marks the two
// neighbouring stages cross-fade over XFADE of the progress.  Anything missing or broken (no json, a sheet that does not load) = this module reports
// "not drawn" and scene.js keeps drawing the old still picture img/st-building.webp with its bar and label, exactly as before.
import { activeTownZone } from './zone-skin.js';

export const CONSTRUCTION_DIR = 'img/construction/';
export const CONSTRUCTION_XFADE = 0.06;      // share of the whole build the stage cross-fade spans (centred on the 1/3 and 2/3 marks)
const RETRY_MS = 30000;
const stores = new Map();                    // zone -> { status, manifest, sheets: Map(url -> {el, state}), failedAt }

/** Which two stages to show at build progress `p` (0..1) and how much of the second: stages are 0-based, mix 0 = only `a`. */
export function constructionStage(p, xfade = CONSTRUCTION_XFADE) {
  const q = Math.min(1, Math.max(0, Number.isFinite(p) ? p : 0)), h = xfade / 2;
  for (const edge of [1 / 3, 2 / 3]) {
    if (q > edge - h && q < edge + h) { const a = edge < .5 ? 0 : 1; return { a, b: a + 1, mix: (q - (edge - h)) / xfade }; }
  }
  const s = q < 1 / 3 ? 0 : q < 2 / 3 ? 1 : 2; return { a: s, b: s, mix: 0 };
}
/** Frames to blend at scene time `t` ms: linear loop, wraps without a step. */
export function constructionFrame(frames, fps, t) {
  if (!(frames > 1)) return { i: 0, j: 0, mix: 0 };
  const phase = Math.max(0, t) / 1000 * (fps || 6), base = Math.floor(phase);
  return { i: base % frames, j: (base + 1) % frames, mix: phase - base };
}
/** Valid manifest = the three stages with sheet / frames, a frame size and a foot point inside the frame. */
export function validConstructionManifest(m) {
  if (!m || !(m.frameW > 0) || !(m.frameH > 0) || !Array.isArray(m.stages) || m.stages.length !== 3) return false;
  if (!Array.isArray(m.foot) || !(m.foot[0] >= 0 && m.foot[0] <= m.frameW && m.foot[1] >= 0 && m.foot[1] <= m.frameH)) return false;
  return m.stages.every(s => typeof s.sheet === 'string' && /^[\w.-]+$/.test(s.sheet) && s.frames >= 1);
}

function storeOf(zone) {
  let st = stores.get(zone);
  if (!st) { st = { status: 'idle', manifest: null, sheets: new Map(), failedAt: 0 }; stores.set(zone, st); }
  return st;
}
function ensureManifest(zone) {
  const st = storeOf(zone);
  if (st.status === 'failed' && Date.now() - st.failedAt > RETRY_MS) st.status = 'idle';
  if (st.status !== 'idle' || typeof fetch !== 'function') return st;
  st.status = 'loading';
  fetch(`${CONSTRUCTION_DIR}${zone}/construction.json`).then(r => { if (!r.ok) throw new Error('no construction.json'); return r.json(); })
    .then(m => { if (!validConstructionManifest(m)) throw new Error('bad construction.json'); st.manifest = m; st.status = 'ready'; })
    .catch(() => { st.status = 'failed'; st.failedAt = Date.now(); });
  return st;
}
function sheetOf(zone, st, stage) {
  const url = `${CONSTRUCTION_DIR}${zone}/${st.manifest.stages[stage].sheet}`;
  let rec = st.sheets.get(url);
  if (!rec) {
    rec = { el: null, state: 'loading' };
    if (typeof Image === 'undefined') { rec.state = 'error'; }
    else { const el = new Image(); rec.el = el; el.onload = () => { rec.state = 'ready'; }; el.onerror = () => { rec.state = 'error'; }; el.src = url; }
    st.sheets.set(url, rec);
  }
  return rec;
}
/** Test hook: install a manifest + decoded sheets without fetching. */
export function setConstructionForTest(zone, manifest, images) {
  const st = storeOf(zone); st.manifest = manifest; st.status = 'ready'; st.sheets.clear();
  manifest.stages.forEach((s, i) => st.sheets.set(`${CONSTRUCTION_DIR}${zone}/${s.sheet}`, { el: images[i], state: 'ready' }));
  return st;
}
export const resetConstructionForTest = () => stores.clear();
export const constructionState = (zone = activeTownZone()) => storeOf(zone).status;

/** Draw the construction animation of station `def` at progress p; returns true when it drew (the caller then skips the still picture). */
export function drawConstruction(ctx, def, p, t, zone = activeTownZone()) {
  if (def?.bx == null) return false;
  const st = ensureManifest(zone);
  if (st.status !== 'ready') return false;
  const m = st.manifest, over = m.byStation?.[def.k] || {}, foot = over.foot || m.foot, widthK = over.widthK || m.widthK || 1;
  const sg = constructionStage(p), stages = sg.a === sg.b ? [[sg.a, 1]] : [[sg.a, 1 - sg.mix], [sg.b, sg.mix]];
  const recs = stages.map(([s]) => sheetOf(zone, st, s));
  if (recs.some(r => r.state !== 'ready')) return false;               // a sheet still loading or broken: the still picture stays until all are there
  const w = !over.widthK && m.worldWidth > 0 ? m.worldWidth : (def.bw || 200) * widthK, k = w / m.frameW, h = m.frameH * k, x = def.bx - foot[0] * k, y = def.by - foot[1] * k;
  const prevAlpha = ctx.globalAlpha;
  stages.forEach(([s, weight], n) => {
    const cfg = m.stages[s], fr = constructionFrame(cfg.frames, cfg.fps || m.fps, t), el = recs[n].el;
    const blit = (f, a) => { if (a <= .003) return; ctx.globalAlpha = prevAlpha * a * weight; ctx.drawImage(el, f * m.frameW, 0, m.frameW, m.frameH, x, y, w, h); };
    if (fr.mix < .004 || fr.i === fr.j) blit(fr.i, 1); else { blit(fr.i, 1 - fr.mix); blit(fr.j, fr.mix); }
  });
  ctx.globalAlpha = prevAlpha;
  return true;
}
