// Q4-3: slot for strolling-enemy walk art. Route enemies now walk around their post with the current standing sprite.
// When a real walk strip is drawn, drop it in img/ and add its standing-sprite key here; no other code change is needed.
//   file : img/<key>-walk.png   (key = the MOB.kinds[].img value, e.g. mob-pret -> img/mob-pret-walk.png)
//   sheet: 4 frames side by side, equal cells, same cell height as the standing sprite, transparent background, feet on the bottom edge
//          of the cell and horizontally centred, enemy facing RIGHT (the game mirrors it when it walks left).
export const ENEMY_WALK_ART = new Set([
  // 'mob-pret',
]);
export const enemyWalkReady = key => ENEMY_WALK_ART.has(key);
