// Yama's outfit determines ability art, independently of the current zone.
const STYLES = new Set(['th', 'asia', 'west', 'cyberhell']);
const POWERS = new Set(['hypno', 'mirror', 'roar', 'fire']);

export function powerCutsceneImage(power, outfit, abilities = {}) {
  if (!POWERS.has(power)) return null;
  const style = STYLES.has(outfit) ? outfit : 'th';
  const level = power === 'fire' && abilities.bigFire ? 'atk' : power;
  const version = power === 'roar' ? 'v4' : 'v3';
  return `img/hero-yama-${style}-${level}-cutscene-${version}.png`;
}
