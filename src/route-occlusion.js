// Foreground already painted into the route raster. Reuse its pixels, never its walk mask.
// Each map lists its pieces (polygon + baseline) in src/route-occlusion-data/<map>.js; this file
// turns them into fractions of the route image so the renderer is size-independent.
import thAsia from './route-occlusion-data/th-asia.js';
import westCyberhell from './route-occlusion-data/west-cyberhell.js';

const frozen=v=>Object.freeze(v.map(Object.freeze));
export function routeForegroundFrom(map) {
  const [W,H]=map.size;
  return Object.freeze(map.pieces.map(p=>Object.freeze({id:p.id,depth:p.baseline/H,polygon:frozen(p.polygon.map(([x,y])=>[x/W,y/H]))})));
}
export const ROUTE_FOREGROUND = Object.freeze(Object.fromEntries([thAsia,westCyberhell].map(m=>[m.routeId,routeForegroundFrom(m)])));
export function drawRouteForeground(ctx,image,foreground,{x,y,w,h}) {
  if(!image?.complete||!image.naturalWidth)return;
  ctx.save();ctx.beginPath();
  foreground.polygon.forEach(([px,py],i)=>ctx[i?'lineTo':'moveTo'](x+px*w,y+py*h));
  ctx.closePath();ctx.clip();ctx.drawImage(image,x,y,w,h);ctx.restore();
}
