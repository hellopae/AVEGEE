// ART-MOB-WALK: all approved zone strips; other keys retain their standing fallback.
// Four equal square frames, transparent background, bottom-center pivot, facing RIGHT.
export const ENEMY_WALK_ART = new Set([
  'mob-pret',
  'mob-pret2',
  'mob-werewolf',
  'mob-krahang',
  'mob-pop',
  'mob-tanee',
  'mob-gaki',
  'mob-kasha',
  'mob-nukekubi',
  'mob-hitodama',
]);
export const enemyWalkReady = key => ENEMY_WALK_ART.has(key);
