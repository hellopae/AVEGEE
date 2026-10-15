/** L5 — enemy chase on the frontier dungeon route. Pure rules, no DOM: dungeon-view.js draws, game.js owns combat.
 *  Everything is measured along the corridor (the same path-length units the hero walks in), so the
 *  enemy can only ever stand on the walkable corridor and never cuts across ground the hero cannot cross. */
export const CHASE = Object.freeze({
  sight: .16,          // hero enters this corridor distance from the enemy's post -> it notices (❗)
  contact: .045,       // enemy this close to the hero -> battle starts by itself (same reach as the old button)
  speed: .00016,       // corridor units per ms; hero walks .00019, so the hero can always outrun it
  alertMs: 450,        // ❗ beat before the enemy starts moving
  leash: 1.2,          // hero farther than sight*leash -> enemy gives up and walks home
  cooldownMs: 4000,    // after a flee/defeat the enemy does not chase for this long
  retreat: .2,         // flee puts the hero this far back from the enemy's post (clamped to the route start)
  transitionMs: 450,   // short cut-in flash before the battle opens
});

/** home = the enemy's post in corridor units. */
export const newChase = home => ({ home, s:home, phase:'idle', t:0 });

/**
 * Advance one frame. heroS = hero position along the corridor. Returns 'alert' | 'contact' | null for
 * edge events (alert: ❗ just started, contact: battle should open now).
 * Phases: idle -> alert -> chase -> contact (terminal) ; chase -> return -> idle when the hero escapes.
 * opts.hold freezes the enemy completely (cooldown after fleeing, battle, locked input).
 */
export function stepChase(c, heroS, dt, { hold = false } = {}) {
  if (c.phase === 'contact') return null;
  const near = Math.abs(c.home - heroS) <= CHASE.sight;
  const far = Math.abs(c.home - heroS) > CHASE.sight * CHASE.leash;
  if (hold) {                                   // cooldown / locked: stand down and walk home
    if (c.phase === 'alert' || c.phase === 'chase') c.phase = 'return';
    if (c.phase === 'return') walkHome(c, dt);
    return null;
  }
  if (c.phase === 'idle' || c.phase === 'return') {
    if (near) { c.phase = 'alert'; c.t = 0; return 'alert'; }
    if (c.phase === 'return') walkHome(c, dt);
    return null;
  }
  if (far) { c.phase = 'return'; return null; }
  if (c.phase === 'alert') {
    c.t += dt;
    if (c.t < CHASE.alertMs) return null;
    c.phase = 'chase'; c.t = 0;
  }
  // chase: walk toward the hero along the corridor; never past the post, never through the hero.
  const stop = Math.min(c.home, heroS + CHASE.contact * .6);
  if (c.s > stop) c.s = Math.max(stop, c.s - CHASE.speed * dt);
  else if (c.s < stop) c.s = Math.min(stop, c.s + CHASE.speed * dt);
  if (c.s - heroS <= CHASE.contact) { c.phase = 'contact'; c.t = 0; return 'contact'; }
  return null;
}
function walkHome(c, dt) {
  const step = CHASE.speed * dt, d = c.home - c.s;
  if (Math.abs(d) <= step) { c.s = c.home; c.phase = 'idle'; } else c.s += Math.sign(d) * step;
}
export const chaseAlerted = c => c.phase === 'alert' || c.phase === 'chase' || c.phase === 'contact';

/** Where the hero stands after fleeing (corridor units): back from the enemy's post, never before the route start. */
export const retreatS = home => Math.max(0, home - CHASE.retreat);
/** The hero is inside the area where this enemy may legitimately have come for them (guards game.startDungeonEncounter). */
export const chaseInReach = (home, heroS) => Math.abs(home - heroS) <= CHASE.sight * CHASE.leash + 1e-6;
