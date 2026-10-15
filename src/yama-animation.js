import { drawContactShadow } from './scene-style.js';
// Production exports of the reviewed ear-v6 / zone outfit animation library.
const DIRECTIONS = ['down', 'left', 'right', 'up'];
const records = new Map();
const durations = Object.freeze({ book:[1000,320,100,480], sword:[1000,240,420,100,100,260] });
export const yamaAnimationStyle = style => ['th','asia','west','cyberhell'].includes(style) ? style : 'th';
export const yamaAnimationSrc = (style, mode) => `img/yama-animation-v1/${yamaAnimationStyle(style)}/${mode}.webp`;
export function animationFrame(elapsed, timing) {
  let t = Math.max(0,elapsed) % timing.reduce((a,b)=>a+b,0);
  for (let i=0;i<timing.length;i++) { if (t<timing[i]) return i; t-=timing[i]; }
  return 0;
}
function loaded(src) {
  let rec=records.get(src);
  if (!rec || rec.failed && Date.now()-rec.failed>10000) {
    const im=new Image();rec={im,ready:false,failed:0};records.set(src,rec);
    im.onload=()=>{rec.ready=true};im.onerror=()=>{rec.failed=Date.now()};im.src=src;
  }
  return rec.ready && rec.im.naturalWidth ? rec.im : null;
}
/** Advance eight walking poses over the old 56-unit full stride; movement speed is unchanged. */
export function drawYamaBook(ctx,style,x,y,h,distance,direction,moving,now=performance.now()) {
  const mode=moving?'book-walk':'book-idle',im=loaded(yamaAnimationSrc(style,mode));
  if (!im) return false;
  const frame=moving?Math.floor(Math.max(0,distance)/7)%8:animationFrame(now,durations.book);
  const row=Math.max(0,DIRECTIONS.indexOf(direction)),scale=h/320;
  drawContactShadow(ctx,x,y,h);
  ctx.drawImage(im,frame*320,row*480,320,480,x-160*scale,y-440*scale,320*scale,480*scale);
  if(ctx.canvas?.dataset)Object.assign(ctx.canvas.dataset,{yamaAnimation:mode,yamaFrame:String(frame+1),yamaDirection:DIRECTIONS[row],yamaStyle:yamaAnimationStyle(style)});
  return true;
}
/** Frames are redrawn poses; keep one scale and foot anchor, with no breathing deformation. */
export function drawYamaSwordIdle(ctx,style,x,y,h,elapsed=performance.now(),face=1) {
  style=yamaAnimationStyle(style);
  const im=loaded(yamaAnimationSrc(style,'sword-idle'));if(!im)return false;
  const scale=h/(style==='th'?354:420),frame=animationFrame(elapsed,durations.sword);
  ctx.save();ctx.translate(x,y);ctx.scale(face<0?-1:1,1);
  ctx.drawImage(im,frame*640,0,640,640,-240*scale,-570*scale,640*scale,640*scale);ctx.restore();
  return true;
}
