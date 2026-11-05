// FX5 (owner 23:45): a teammate whose health / morale is gone lies down instead of standing at 0.
//  * Real picture: the sprite key `<key>:ko` of img/combat-animation-v1/manifest.json (e.g. `yama:th:ko`, `crew:th:taan:ko`, modes.ko = fall frames then the lying frame,
//    held on the last one by combat-sprites.js). It is picked up as soon as the Codex pose exists - no code change.
//  * Until then: a TEMPORARY fall - the figure tilts ~84 deg backwards (away from the foe, they all face right) about its feet in 300 ms and dims a little;
//    revived = it rises again in 300 ms. No picture is drawn or altered.
import { loadPoseCatalog } from './battle-fx.js';
export const KO = Object.freeze({ tiltDeg: -84, fallMs: 300, riseMs: 300, dim: .8 });
const tracks = new WeakMap();      // battle object -> Map(actor id -> {ko, since})

/** Does the pose catalog hold a drawn KO animation for this sprite key? */
export function hasKoPose(key, catalog = loadPoseCatalog()) {
  const rec = catalog && (catalog[key + ':ko'] || catalog[key]);
  return !!rec?.modes?.ko;
}
/** Phase of one figure at `now`: 'up' | 'fall' | 'down' | 'rise'. A figure that is already down when the scene opens is simply 'down' (no fall played). */
export function koPhase(track, id, isKo, now) {
  const prev = track.get(id);
  if (!prev) { track.set(id, { ko: isKo, since: isKo ? now - 1e6 : now, rose: false }); return isKo ? 'down' : 'up'; }
  if (isKo && !prev.ko) { prev.ko = true; prev.since = now; prev.rose = false; }
  else if (!isKo && prev.ko) { prev.ko = false; prev.since = now; prev.rose = true; }
  if (prev.ko) return now - prev.since < KO.fallMs ? 'fall' : 'down';
  return prev.rose && now - prev.since < KO.riseMs ? 'rise' : 'up';
}
export const koClass = phase => phase === 'fall' ? 'ko-fall' : phase === 'down' ? 'ko-down' : phase === 'rise' ? 'ko-rise' : '';
export const koTrackOf = battle => { let t = tracks.get(battle); if (!t) { t = new Map(); tracks.set(battle, t); } return t; };
export const koSince = (battle, id) => koTrackOf(battle).get(id)?.since ?? 0;
