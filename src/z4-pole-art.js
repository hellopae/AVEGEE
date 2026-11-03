// Painted pole with measured foot/crossbar anchors in the 512x768 sprite.
export const Z4_POLE_ART='img/theme-v4/town-pole-cyberhell-v1.webp';
export function z4PoleArtRect(pole){
 const sx=pole.arm/144,sy=pole.h*.88/(759-142);
 return {x:pole.x-256*sx,y:pole.y-759*sy,w:512*sx,h:768*sy};
}
