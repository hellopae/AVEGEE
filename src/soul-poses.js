import { pressReaction } from './interrogation-ui.js';
import { SOUL_POSE_FILES } from './soul-pose-manifest.js';
// Narrative review: output/coordination/2026-10-28-s1-soul-poses/case-review.md.
// Explicit selection, never infer necessity from a verdict, weight or trait colour.
const caught = ['pol','gen','nun','star','lord','monk','orchard','trader','sister','novice','inspector','hunter','gadget','accountant','prophet','heir',
  'A1','A2','A3','A4','A6','A7','A8','A9','A10','A12','A14','A15','A16','A17','A18','A20'];
const necessity = ['recruit','girl','boy','sergeant','hammer','healer'];
const other = ['nurse','devaMonk','scapegoat','A5','A11','A13','A19','campelder','silentman'];
// W2 quest cases: denial/fake boast, plea with mitigation, or a truthful/innocent account.
caught.push('swapdoc','chainhand','hospice','smokeheir');
necessity.push('feudgran','hirefire');
export const CASE_POSE_TYPES = Object.freeze(Object.fromEntries([
  ...caught.map(k => [k, 'caught_lie']), ...necessity.map(k => [k, 'necessity']), ...other.map(k => [k, 'other']),
]));
// Reuse once per original image. No cross-region costume substitution.
export const SOUL_POSE_ASSETS = Object.freeze({
  'img/Asia/spirit-clerk-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/clerk-asia-caught-lie-v1.webp' }),
  'img/Asia/spirit-cleric-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/cleric-asia-caught-lie-v1.webp' }),
  'img/Asia/spirit-worker-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/worker-asia-caught-lie-v1.webp' }),
  'img/Asia/spirit-officer-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/officer-asia-caught-lie-v1.webp' }),
  'img/Asia/spirit-executive-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/executive-asia-caught-lie-v1.webp' }),
  'img/Asia/spirit-woman-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/woman-asia-caught-lie-v1.webp' }),
  'img/Asia/spirit-business-asia-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/business-asia-caught-lie-v1.webp' }),
  'img/Thai/spirit-officer-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/officer-th-caught-lie-v1.webp', necessity:'img/soul-poses/officer-th-necessity-v1.webp' }),
  'img/Thai/spirit-recruit-th-v3.webp': Object.freeze({ necessity:'img/soul-poses/recruit-th-necessity-v1.webp' }),
  'img/Thai/spirit-girl-th-v2.webp': Object.freeze({ necessity:'img/soul-poses/girl-th-necessity-v1.webp' }),
  'img/Thai/spirit-boy-th-v2.webp': Object.freeze({ necessity:'img/soul-poses/boy-th-necessity-v1.webp' }),
  'img/Thai/spirit-elder-woman-th-v2.webp': Object.freeze({ necessity:'img/soul-poses/elder-woman-th-necessity-v1.webp' }),
  'img/Thai/spirit-worker-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/worker-th-caught-lie-v1.webp', necessity:'img/soul-poses/worker-th-necessity-v1.webp' }),
  'img/Thai/spirit-woman-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/woman-th-caught-lie-v1.webp' }),
  'img/Thai/spirit-business-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/business-th-caught-lie-v1.webp' }),
  'img/Thai/spirit-cleric-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/cleric-th-caught-lie-v1.webp' }),
  'img/Thai/spirit-executive-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/executive-th-caught-lie-v1.webp' }),
  'img/Thai/spirit-clerk-th-v2.webp': Object.freeze({ caught_lie:'img/soul-poses/clerk-th-caught-lie-v1.webp' }),
});
// Generic poses: img/soul-poses/<archetype>-<zone>-{scared,cry}-v1.webp, found from the base image path.
// Lookup per slot: own file -> alias (the old caught-lie / necessity drawing, same archetype + same zone) -> nothing.
// "Nothing" = the caller keeps the CSS effect (shake / sweat / tears). A file that is not in SOUL_POSE_FILES is never requested (no 404).
// No cross-zone fallback: a Thai drawing must never stand in for an Asia/West/CyberHell costume.
const ZONE_OF_DIR = Object.freeze({ Thai:'th', Asia:'asia', West:'west', CyberHell:'cyberhell' });
export const POSE_FILE_NAMES = Object.freeze({ scared:Object.freeze(['scared', 'caught-lie']), cry:Object.freeze(['cry', 'necessity']) });
export function parseSoulBase(baseSrc) {
  const m = /^img\/(Thai|Asia|West|CyberHell)\/spirit-([a-z-]+)-(th|asia|west|cyberhell)-v\d+\.webp$/.exec(baseSrc || '');
  return m && ZONE_OF_DIR[m[1]] === m[3] ? { archetype:m[2], zone:m[3] } : null;
}
export function genericSoulPose(baseSrc, pose) {
  const id = parseSoulBase(baseSrc);
  if (!id) return null;
  for (const name of POSE_FILE_NAMES[pose] || []) {
    const path = `img/soul-poses/${id.archetype}-${id.zone}-${name}-v1.webp`;
    if (SOUL_POSE_FILES.has(path)) return path;
  }
  return null;
}
const scaredLine = (soul, line) => line.kind === 'deny' ||
  line.kind === 'boast' && !!soul.merits?.some(m => m.t === line.merit && m.fake && !m.exposed);
const cryLine = (game, soul, line) => line.kind === 'plea' && game.pressDeeds(soul, line).some(d => !d.known && d.w < 0);
export function soulPoseForPress(game, soul, line, baseSrc) {
  if (!soul || !line || line.used || soul.presses <= 0 || soul.back) return null;
  if (!soul.case) {   // random / hard random souls: the existing reaction decides (fear -> scared, relief -> cry); a "solid" line is never a reaction
    const reaction = pressReaction(game, soul, line);
    if (reaction === 'relief') return genericSoulPose(baseSrc, 'cry');
    return reaction === 'fear' && (line.kind === 'plea' || scaredLine(soul, line)) ? genericSoulPose(baseSrc, 'scared') : null;
  }
  const type = CASE_POSE_TYPES[soul.case];
  if (type === 'caught_lie' && scaredLine(soul, line)) return SOUL_POSE_ASSETS[baseSrc]?.caught_lie || genericSoulPose(baseSrc, 'scared');
  if (type === 'necessity' && cryLine(game, soul, line)) return SOUL_POSE_ASSETS[baseSrc]?.necessity || genericSoulPose(baseSrc, 'cry');
  return null;
}
// Mirror / hypnosis in the interrogation room and a beaten soul in a fight: the "scared" drawing, never for an `other` case.
export function soulPoseForScare(soul, baseSrc) {
  if (!soul || soul.back || CASE_POSE_TYPES[soul.case] === 'other') return null;
  return genericSoulPose(baseSrc, 'scared');
}
export const soulPoseAssets = baseSrc => [...new Set([...Object.values(SOUL_POSE_ASSETS[baseSrc] || {}),
  ...['scared', 'cry'].map(p => genericSoulPose(baseSrc, p)).filter(Boolean)])];
