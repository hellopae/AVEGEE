// Every scenery object has its own sprite, ground shadow and collision root.
// Ground painting contains no object silhouettes; foot depth governs occlusion.
import { TOWN_HOUSES, TOWN_PROP_SITES } from './town-layout.js';
import { drawLocalLight } from './scene-style.js';

const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const TOWN_TREES = TOWN_PROP_SITES.filter(p=>p.kind==='tree');
export const TOWN_WATERFALL = TOWN_PROP_SITES.find(p=>p.kind==='waterfall');
export const TOWN_EDGE_HOMES = [];
const variants = new WeakMap();
function cachedSprite(image,kind) {
  let cache=variants.get(image);if(!cache){cache=new Map();variants.set(image,cache);}
  if(cache.has(kind))return cache.get(kind);
  const c=document.createElement('canvas'),scale=512/Math.max(image.naturalWidth,image.naturalHeight);
  c.width=Math.max(1,Math.ceil(image.naturalWidth*scale));
  c.height=Math.max(1,Math.ceil(image.naturalHeight*scale));
  const p=c.getContext('2d');p.imageSmoothingEnabled=true;
  if(kind==='far')p.filter='blur(3px)';
  p.drawImage(image,0,0,c.width,c.height);
  if(kind==='shadow'){p.globalCompositeOperation='source-in';p.fillStyle='#130d1c';p.fillRect(0,0,c.width,c.height);}
  cache.set(kind,c);return c;
}
// K3: ctx.filter (hue-rotate / saturate) re-ran a full filter layer for every tinted tree on every
// frame, on-screen or not (~90 ms per frame on Intel iGPU at DPR 2). The very same filter is now
// baked once per (image, biome) into a canvas; pixels are identical, the per-frame cost is a blit.
const TREE_TINT = {
  lava:'hue-rotate(305deg) saturate(1.15)',
  ice:'saturate(.25) brightness(1.4)',
  heaven:'saturate(.7) brightness(1.12)',
};
const tinted = new WeakMap();
function tintedArt(image,biome) {
  const filter=TREE_TINT[biome];
  if(!filter||!image||!image.naturalWidth)return image;
  let per=tinted.get(image);if(!per){per=new Map();tinted.set(image,per);}
  let c=per.get(biome);
  if(!c){
    c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
    const p=c.getContext('2d');p.filter=filter;p.drawImage(image,0,0);
    c.__sprite=true; // scene.js downscale cache may treat this canvas like an image
    per.set(biome,c);
  }
  return c;
}
// Off-screen props cost real GPU work even when clipped; skip them from the camera rectangle.
function onScreen(ctx,p,art) {
  const m=ctx.getTransform?.();if(!m||m.b||m.c||!m.a||!m.d)return true;
  const w=p.w,h=art?w*(art.naturalHeight||art.height)/(art.naturalWidth||art.width):w,pad=60;
  const x0=-m.e/m.a,y0=-m.f/m.d,x1=x0+ctx.canvas.width/m.a,y1=y0+ctx.canvas.height/m.d;
  return !(p.x+w/2+pad<x0||p.x-w/2-pad>x1||p.y+pad<y0||p.y-h-pad>y1);
}
// Rooted props stay anchored to their collider, even at close zoom. This helper
// remains available for future noncolliding distant scenery and old consumers.
export function sceneryPoint(x,y,view,rate=0,reduced=false) {
  if(!view||view.zoom<=1.02||reduced)return {x,y};
  return {x:x+clamp((x-view.cx)*rate,-42,42),y:y+clamp((y-view.cy)*rate,-22,22)};
}
function sprite(ctx,image,x,y,w) {
  if(!image)return;
  const h=w*(image.naturalHeight||image.height)/(image.naturalWidth||image.width);
  ctx.save();ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,x-w/2,y-h,w,h);ctx.restore();
}
export function drawTownCastShadow(ctx,image,x,y,w) {
  if(!image)return;
  const h=w*image.naturalHeight/image.naturalWidth;
  ctx.save();ctx.globalAlpha=.15;
  // A low upper-left sun projects the object's actual alpha silhouette.
  ctx.transform(1,0,-.45,-.15,x+5,y+2);
  ctx.drawImage(cachedSprite(image,'shadow'),-w/2,-h,w,h);
  ctx.restore();
}
const propArt = (p,tree,waterfall,resolveArt) =>
  resolveArt?.(p.key)||(p.kind==='tree'?tree:p.kind==='waterfall'?waterfall:null);
function contactShadow(ctx,p) {
  ctx.save();ctx.fillStyle='rgba(10,6,15,.22)';ctx.beginPath();
  ctx.ellipse(p.x+4,p.y+2,p.rx*1.2,p.ry*.8,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
function fallbackProp(ctx,p) {
  // Small fallback props remain individual objects while authored cutouts load.
  if(p.kind!=='bush'&&p.kind!=='rock')return;
  ctx.save();ctx.translate(p.x,p.y);
  const w=p.w;
  if(p.kind==='rock'){
    ctx.fillStyle=p.biome==='ice'?'#899da7':'#38333b';ctx.strokeStyle='#211d26';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-w*.46,-w*.08);ctx.lineTo(-w*.27,-w*.38);
    ctx.lineTo(w*.1,-w*.43);ctx.lineTo(w*.41,-w*.25);ctx.lineTo(w*.46,-w*.05);
    ctx.lineTo(w*.06,w*.03);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.strokeStyle='#ffffff22';ctx.beginPath();ctx.moveTo(-w*.27,-w*.38);ctx.lineTo(w*.04,-w*.22);ctx.lineTo(w*.41,-w*.25);ctx.stroke();
  }else{
    ctx.fillStyle=p.biome==='lava'?'#672f34':p.biome==='ice'?'#859da0':'#3c5540';
    for(const [x,y,r]of [[-.25,-.17,.23],[0,-.28,.27],[.25,-.15,.24]]){
      ctx.beginPath();ctx.ellipse(x*w,y*w,r*w,r*w*.73,0,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();
}
export function drawTownDistantScenery(ctx,house,tree,view,reduced) {
  // Mountain props belong to the shared depth queue, not a baked far image.
}
export function drawTownSceneryShadows(ctx,house,tree,waterfall,view,reduced,resolveArt) {
  for(const p of TOWN_PROP_SITES){
    const art=propArt(p,tree,waterfall,resolveArt);
    if(!onScreen(ctx,p,art))continue;
    contactShadow(ctx,p);
    drawTownCastShadow(ctx,art,p.x,p.y,p.w);
  }
}
export function addTownSceneryLayers(at,ctx,house,tree,waterfall,g,time,view,reduced,resolveArt) {
  for(const p of TOWN_PROP_SITES){
    const art=propArt(p,tree,waterfall,resolveArt);
    if(!onScreen(ctx,p,art))continue;
    at(p.y,()=>{
      ctx.save();
      const h=art?p.w*art.naturalHeight/art.naturalWidth:p.w;
      // Fade only the crown/roof when the player's feet are behind this prop.
      if(Math.abs(g.player.x-p.x)<p.w*.45&&g.player.y<p.y&&g.player.y>p.y-h)ctx.globalAlpha=.4;
      if(art){
        sprite(ctx,p.kind==='tree'?tintedArt(art,p.biome):art,p.x,p.y,p.w);
      }else fallbackProp(ctx,p);
      ctx.restore();
      if(p.kind==='waterfall'){
        ctx.save();ctx.strokeStyle='rgba(181,237,222,.32)';ctx.lineWidth=1.5;
        for(let i=0;i<3;i++){
          const phase=reduced?.45:((time/1900+i/3)%1);
          ctx.globalAlpha=(1-phase)*.35;ctx.beginPath();
          ctx.ellipse(p.x,p.y,phase*p.w*.17+8,phase*p.w*.04+2,0,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();
      }
    });
  }
}
export function drawTownHouseLights(ctx,time,reduced) {
  for(const [l,,r,b]of TOWN_HOUSES){
    const w=r-l;
    drawLocalLight(ctx,'th',l+w*.36,b-w*.39,w*.14,time,reduced);
    drawLocalLight(ctx,'th',l+w*.64,b-w*.39,w*.14,time,reduced);
  }
}
