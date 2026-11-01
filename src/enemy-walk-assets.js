// ART-MOB-WALK: Zone 1 uses four-frame walk/glide strips. Keys without a strip retain the standing fallback.
// When a real walk strip is drawn, drop it in img/ and add its standing-sprite key here; no other code change is needed.
//   file : img/<key>-walk.png   (key = the MOB.kinds[].img value, e.g. mob-pret -> img/mob-pret-walk.png)
//   sheet: 4 frames side by side, equal cells, same cell height as the standing sprite, transparent background, feet on the bottom edge
//          of the cell and horizontally centred, enemy facing RIGHT (the game mirrors it when it walks left).
export const ENEMY_WALK_ART = new Set([
  'mob-pret',
  'mob-pret2',
  'mob-werewolf',
  'mob-krahang',
  'mob-pop',
  'mob-tanee',
]);
export const enemyWalkReady = key => ENEMY_WALK_ART.has(key);
