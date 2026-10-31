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
// Only the piece's bounding box of the route image is repainted (clip keeps it to the polygon), so a piece
// costs a few hundred pixels per frame instead of a full-map blit. Pieces fully off screen are skipped.
export function drawRouteForeground(ctx,image,foreground,{x,y,w,h}) {
  if(!image?.complete||!image.naturalWidth)return;
  const xs=foreground.polygon.map(p=>p[0]),ys=foreground.polygon.map(p=>p[1]);
  const pad=2/image.naturalWidth,fx0=Math.max(0,Math.min(...xs)-pad),fy0=Math.max(0,Math.min(...ys)-pad),fx1=Math.min(1,Math.max(...xs)+pad),fy1=Math.min(1,Math.max(...ys)+pad);
  const dx=x+fx0*w,dy=y+fy0*h,dw=(fx1-fx0)*w,dh=(fy1-fy0)*h,view=ctx.canvas;
  if(view&&(dx>view.width||dy>view.height||dx+dw<0||dy+dh<0))return;
  ctx.save();ctx.beginPath();
  foreground.polygon.forEach(([px,py],i)=>ctx[i?'lineTo':'moveTo'](x+px*w,y+py*h));
  ctx.closePath();ctx.clip();
  const nw=image.naturalWidth,nh=image.naturalHeight||nw*h/w;
  ctx.drawImage(image,fx0*nw,fy0*nh,(fx1-fx0)*nw,(fy1-fy0)*nh,dx,dy,dw,dh);ctx.restore();
}
