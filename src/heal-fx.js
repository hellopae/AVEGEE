// L2: "someone just got healed" effect for the battle scene — pure helpers (no DOM reads), drawn by CSS only (transform/opacity, no filters).
// vitalsOf() before and after a command -> vitalGains() -> one entry per healed actor (several at once are all shown).

/** HP-like and MP numbers of everyone on our side of the battle: Yama = youHp / mp, crew+guard = morale / 0. */
export function vitalsOf(g) {
  const b = g.battle, out = {};
  if (!b) return out;
  out.you = { hp: b.youHp, mp: g.mp };
  for (const a of g.battleActors()) if (a.id !== 'you') out[a.id] = { hp: a.morale, mp: 0 };
  return out;
}

/** Positive changes only (a heal). Unknown ids in `before` (someone who joined mid-way) count as no change. */
export function vitalGains(before, after) {
  const out = [];
  for (const id of Object.keys(after)) {
    const a = after[id], b = before[id] || a;
    const hp = Math.round(a.hp - b.hp), mp = Math.round(a.mp - b.mp);
    if (hp > 0 || mp > 0) out.push({ id, hp: Math.max(0, hp), mp: Math.max(0, mp) });
  }
  return out;
}

export const HEAL_FX_MS = 1000;
const SPARKS = [[-5, 40], [4, 0], [-2, 120], [6, 80], [-6, 190], [2, 150], [0, 230]];   // [x offset step, start delay ms]

/** Markup placed inside the healed actor's sprite root. elapsed = ms since the effect began (so a repaint resumes it, not restarts it).
 *  Never contains an <img>: fitBattleSprites() would mistake it for a sprite. */
export function healFxHtml(entry, elapsed = 0, mpLabel = 'MP') {
  const both = entry.hp > 0 && entry.mp > 0;
  const theme = entry.hp > 0 ? 'hp' : 'mp';
  const sparks = SPARKS.map(([x, d], i) => `<i class="hf-sp ${both && i % 2 ? 'mp' : theme}" style="--sx:${x};--d:${d}ms"></i>`).join('');
  return `<span class="heal-fx ${theme}${both ? ' both' : ''}" style="--fx-el:${-Math.round(elapsed)}ms" aria-hidden="true">`
    + `<i class="hf-glow"></i><i class="hf-ring"></i><i class="hf-ring r2"></i>${sparks}`
    + (entry.hp > 0 ? `<i class="hf-num hp">+${entry.hp}</i>` : '')
    + (entry.mp > 0 ? `<i class="hf-num mp${both ? ' second' : ''}">+${entry.mp} ${mpLabel}</i>` : '')
    + `</span>`;
}
