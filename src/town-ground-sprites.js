// Z1-V5-FX2: sprites for the objects that were painted OUT of the HD ground chunks (trees, flower beds, rocks, the central bridge rails, the pier, stair posts).
// The pictures are the originals cut from v5 by the Codex pilot run (img/map-zone1/<ground set>/sprites/*.webp); this file only places them.
//  layer 'sort'  = depth-sorted with the characters by its foot (walk behind a tree, in front of it when below its foot)
//  layer 'back'  = under every character · layer 'front' = over every character (the rail on the near side of the bridge deck)
// List = sprites.json of the active ground set (terrain.sprites); a ground set without one (v5) adds nothing.
import { activeTownSkin } from './zone-skin.js';

const stores = new Map();          // json url -> {status, list, images: Map(id -> {el, ok})}
const FRONT = 1e7, BACK = -1e7;
export function groundSpriteLayerDepth(s) { return s.layer === 'back' ? BACK : s.layer === 'front' ? FRONT : s.footWorld[1]; }
/** Is `s` (world rect) touching the camera view [x,y,w,h] (+pad)? */
export function groundSpriteVisible(s, view, pad = 80) {
  const [x, y, w, h] = groundSpriteDrawRect(s);
  return !(x + w < view[0] - pad || x > view[0] + view[2] + pad || y + h < view[1] - pad || y > view[1] + view[3] + pad);
}
// FX5 (owner 5-6 Nov): the 51 pilot sprites of trees / beds / rocks / lamp posts were placed wrongly and at the wrong size; the owner will place them himself.
// Hidden by flag (sprites.json and the pictures stay). 'rails' = the bridge rails / pier posts (layers back / front), shown unless an id is listed in hideIds.
export const GROUND_SPRITE_SHOW = { sort: false, rails: true, hideIds: new Set(['lava-lower-back', 'lava-lower-front']) };   // the left lava bridge rails floated off the deck (owner 23:36): removed; the central bridge + pier rails sit on their decks (checked)
export const setGroundSpriteShow = v => Object.assign(GROUND_SPRITE_SHOW, v);
// FB2-5 (owner 13 Nov: "the bridge posts look squeezed narrow"): the two central-bridge rail sprites were exported with their width squeezed.  Measured against the
// painted end posts of the same bridge in the v7r ground (same height per post segment, 207 vs 220 px): the sprite's stone block is 21 px wide where the painted one is 75 px
// (x3.6), its ring 21 vs 55 (x2.6), its rod 4-5 vs 8-9 (x2).  The sprite is drawn x3.5 wider around the centre of its opaque part (xPivot = that centre as a fraction of the width),
// so the posts match the painted end posts.  Nothing is recoloured or filtered.  When Kittanate / Codex re-export these two at the true proportion (see the FB2-A note), delete the entries.
export const GROUND_SPRITE_X_FIX = Object.freeze({
  'river-back':  Object.freeze({ k: 3.5, pivot: .358 }),
  'river-front': Object.freeze({ k: 3.5, pivot: .594 }),
});
/** World rect [x, y, w, h] a sprite is drawn into: its own rectWorld, widened around its pivot when it has an entry in GROUND_SPRITE_X_FIX. */
export function groundSpriteDrawRect(s) {
  const [x, y, w, h] = s.rectWorld, fix = GROUND_SPRITE_X_FIX[s.id];
  if (!fix) return [x, y, w, h];
  const pv = x + fix.pivot * w;
  return [pv - (pv - x) * fix.k, y, w * fix.k, h];
}
// `off` in sprites.json (a reason string) = this ground set already has the object painted in at that spot (e.g. a v5 fallback patch), so drawing the sprite would double it.
export const groundSpriteShown = s => !s.off && (s.layer === 'sort' ? GROUND_SPRITE_SHOW.sort : GROUND_SPRITE_SHOW.rails) && !GROUND_SPRITE_SHOW.hideIds.has(s.id);
const urlOf = () => activeTownSkin()?.terrain?.sprites || null;
function storeOf(url) {
  let st = stores.get(url);
  if (!st) {
    st = { status: 'loading', list: [], images: new Map(), base: url.slice(0, url.lastIndexOf('/') + 1) };
    stores.set(url, st);
    fetch(url).then(r => { if (!r.ok) throw new Error('sprites ' + r.status); return r.json(); })
      .then(list => { st.list = list; st.status = 'ready'; }).catch(() => { st.status = 'failed'; });
  }
  return st;
}
function imageOf(st, s) {
  let rec = st.images.get(s.id);
  if (!rec) {
    const el = new Image(); rec = { el, ok: false }; el.decoding = 'async';
    el.onload = () => { rec.ok = true; }; el.onerror = () => { rec.failed = true; };
    el.src = st.base + s.src; st.images.set(s.id, rec);
  }
  return rec.ok ? rec.el : null;
}
export const groundSpriteStats = () => { const u = urlOf(); const st = u && stores.get(u); return st ? { status: st.status, count: st.list.length, ready: [...st.images.values()].filter(r => r.ok).length } : null; };

/** `at(y, fn)` is the scene's depth-sorted layer list; only sprites that touch the camera (read from the canvas transform) are queued. */
export function addGroundSpriteLayers(at, ctx) {
  const url = urlOf();
  if (!url) return;
  const st = storeOf(url);
  if (st.status !== 'ready') return;
  const m = ctx.getTransform?.();
  const view = m && !m.b && !m.c && m.a > 0 && m.d > 0 ? [-m.e / m.a, -m.f / m.d, ctx.canvas.width / m.a, ctx.canvas.height / m.d] : null;
  for (const s of st.list) {
    if (!groundSpriteShown(s)) continue;
    if (view && !groundSpriteVisible(s, view)) continue;
    at(groundSpriteLayerDepth(s), () => {
      const el = imageOf(st, s);
      if (!el) return;
      const [x, y, w, h] = groundSpriteDrawRect(s);
      ctx.save(); ctx.imageSmoothingEnabled = true; ctx.drawImage(el, x, y, w, h); ctx.restore();
    });
  }
}
