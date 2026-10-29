// Narrative review: output/coordination/2026-10-28-s1-soul-poses/case-review.md.
// Explicit selection, never infer necessity from a verdict, weight or trait colour.
const caught = ['pol','gen','nun','star','lord','monk','orchard','trader','sister','novice','inspector','hunter','gadget','accountant','prophet','heir',
  'A1','A2','A3','A4','A6','A7','A8','A9','A10','A12','A14','A15','A16','A17','A18','A20'];
const necessity = ['recruit','girl','boy','sergeant','hammer','healer'];
const other = ['nurse','devaMonk','scapegoat','A5','A11','A13','A19'];
export const CASE_POSE_TYPES = Object.freeze(Object.fromEntries([
  ...caught.map(k => [k, 'caught_lie']), ...necessity.map(k => [k, 'necessity']), ...other.map(k => [k, 'other']),
]));
// Reuse once per original image. No cross-region costume substitution.
export const SOUL_POSE_ASSETS = Object.freeze({
  'img/Thai/spirit-officer-th-v2.png': Object.freeze({ caught_lie:'img/soul-poses/officer-th-caught-lie-v1.png', necessity:'img/soul-poses/officer-th-necessity-v1.png' }),
  'img/Thai/spirit-recruit-th-v3.png': Object.freeze({ necessity:'img/soul-poses/recruit-th-necessity-v1.png' }),
  'img/Thai/spirit-girl-th-v2.png': Object.freeze({ necessity:'img/soul-poses/girl-th-necessity-v1.png' }),
  'img/Thai/spirit-boy-th-v2.png': Object.freeze({ necessity:'img/soul-poses/boy-th-necessity-v1.png' }),
  'img/Thai/spirit-elder-woman-th-v2.png': Object.freeze({ necessity:'img/soul-poses/elder-woman-th-necessity-v1.png' }),
  'img/Thai/spirit-worker-th-v2.png': Object.freeze({ necessity:'img/soul-poses/worker-th-necessity-v1.png' }),
});
export function soulPoseForPress(game, soul, line, baseSrc) {
  if (!soul || !line || line.used || soul.presses <= 0 || soul.back) return null;
  const type = CASE_POSE_TYPES[soul.case];
  const src = SOUL_POSE_ASSETS[baseSrc]?.[type];
  if (!src) return null;
  if (type === 'caught_lie' && (line.kind === 'deny' ||
      line.kind === 'boast' && soul.merits?.some(m => m.t === line.merit && m.fake && !m.exposed))) return src;
  if (type === 'necessity' && line.kind === 'plea' &&
      game.pressDeeds(soul, line).some(d => !d.known && d.w < 0)) return src;
  return null;
}
export const soulPoseAssets = baseSrc => Object.values(SOUL_POSE_ASSETS[baseSrc] || {});
