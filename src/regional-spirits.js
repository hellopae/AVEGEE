// Regional courtroom spirits share semantic portrait keys with the cases.
// Each region owns its artwork; changing Yama's outfit never changes the souls.
export const SPIRIT_ARCHETYPES = ['worker', 'executive', 'officer', 'cleric', 'woman', 'clerk', 'boy', 'girl', 'business', 'elder-woman'];
const numbered = ['worker', 'business', 'officer', 'clerk', 'executive', 'clerk', 'woman', 'worker', 'elder-woman', 'girl'];
const named = {
  pol: 'officer', gen: 'officer', nun: 'woman', recruit: 'officer',
  star: 'worker', lord: 'business', girl: 'girl', boy: 'boy',
  deva: 'worker', nurse: 'woman', monk: 'cleric',
};
export function regionalSpiritAliases(zone) {
  const folder = { th: 'Thai', asia: 'Asia', west: 'West', cyberhell: 'CyberHell' }[zone];
  if (!folder) return {};
  const path = type => `${folder}/spirit-${type}-${zone}-v2.png`;
  return Object.fromEntries([
    ...SPIRIT_ARCHETYPES.map(type => [`spirit-${type}-${zone}`, path(type)]),
    ...numbered.map((type, i) => [`spirit${i + 1}-${zone}`, path(type)]),
    ...Object.entries(named).map(([key, type]) => [`soul-${key}-${zone}`, path(type)]),
  ]);
}
