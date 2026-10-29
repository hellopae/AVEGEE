// Foreground already painted into the route raster. Reuse its pixels, never its walk mask.
// Coordinates are fractions of zone3-4-v1.webp (1672 x 941), at the lower plaza lip.
export const ROUTE_FOREGROUND = Object.freeze({
  'west:cyberhell': Object.freeze([
    Object.freeze({depth:790/941, polygon:Object.freeze([
      [730/1672,759/941],[744/1672,742/941],[750/1672,718/941],
      [760/1672,749/941],[771/1672,731/941],[783/1672,765/941],
      [808/1672,779/941],[796/1672,790/941],[745/1672,784/941],
    ].map(Object.freeze))}),
  ]),
});
export function drawRouteForeground(ctx,image,foreground,{x,y,w,h}) {
  if(!image?.complete||!image.naturalWidth)return;
  ctx.save();ctx.beginPath();
  foreground.polygon.forEach(([px,py],i)=>ctx[i?'lineTo':'moveTo'](x+px*w,y+py*h));
  ctx.closePath();ctx.clip();ctx.drawImage(image,x,y,w,h);ctx.restore();
}
