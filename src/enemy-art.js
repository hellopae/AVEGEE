// Enemy standees also supply portraits and turn icons. Resolve them before the
// async manifest arrives; never request a non-existent enemy profile pose.
const MOB_HOME = {
  'mob-gaki': 'Asia/mob-gaki-asia.webp',
  'mob-kasha': 'Asia/mob-kasha-asia.webp',
  'mob-nukekubi': 'Asia/mob-nukekubi-asia.webp',
  'mob-hitodama': 'Asia/mob-hitodama-asia.webp',
};
const MOB_REGIONAL = {
  west: ['skeleton'],
  cyberhell: ['bot', 'bug', 'worm', 'cyber-guard', 'cyber-lancer', 'cyber-brute'],
};
const FOLDER = { asia:'Asia', west:'West', cyberhell:'CyberHell' };

/** undefined = another asset family; null = use the enemy's standing pose. */
export function enemyArt(key, zone) {
  if (!/^(mob-|boss-frontier(?:-|$)|boss-tester(?:-|$)|zone-boss(?:-|$)|leader-(?:th|asia|west|cyberhell)-possessed)/.test(key)) return undefined;
  if (/-profile$/.test(key)) return null;
  if (key.startsWith('mob-')) {
    if (MOB_HOME[key]) return `img/${MOB_HOME[key]}`;
    if (MOB_REGIONAL[zone]?.includes(key.slice(4))) return `img/${FOLDER[zone]}/${key}-${zone}.webp`;
    return `img/${key}.webp`;
  }
  if (key.startsWith('leader-')) return `img/${key}.webp`;
  const explicit = key.match(/-(th|asia|west|cyberhell)$/);
  const home = explicit?.[1] || zone;
  const stem = explicit ? key.slice(0, -explicit[0].length) : key;
  if (home === 'th') return `img/${stem}${stem === 'zone-boss' ? '' : '-th'}.webp`;
  return `img/${FOLDER[home]}/${stem}-${home}.webp`;
}
