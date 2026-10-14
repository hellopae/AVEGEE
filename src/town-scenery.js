// Decorative scenery is independent of construction, collision and saved games.
import { TOWN_HOUSES, townContains } from './town-layout.js';
import { drawLocalLight } from './scene-style.js';

const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const TOWN_TREES = [
  [1320,1370,180],[2530,1650,190],[3080,1690,180],
].map(([x,y,w])=>({x,y,w,foreground:x>3550}));
// The background already contains biome trees and a waterfall. Extra waterfall
// sprites must not double the painted cascade; this anchor drives pool mist only.
export const TOWN_WATERFALL = {x:3230,y:1700,w:230};
export const TOWN_EDGE_HOMES = [];
const distantHomes = [];
const variants = new WeakMap();
function cachedSprite(image,kind) {
  let cache=variants.get(image);if(!cache){cache=new Map();variants.set(image,cache);}
  if(cache.has(kind))return cache.get(kind);
  const c=document.createElement('canvas');c.width=640;c.height=640;
  const p=c.getContext('2d');p.imageSmoothingEnabled=true;
  const h=560,w=h*image.naturalWidth/image.naturalHeight;
  if(kind==='far')p.filter='blur(5px)';
  p.drawImage(image,(640-w)/2,600-h,w,h);
  if(kind==='shadow'){p.globalCompositeOperation='source-in';p.fillStyle='#130d1c';p.fillRect(0,0,640,640);}
  cache.set(kind,c);return c;
}
// Actual camera center includes edge clamping. Overview and reduced motion stay fixed.
export function sceneryPoint(x,y,view,rate=0,reduced=false) {
  if(!view||view.zoom<=1.02||reduced)return {x,y};
  return {x:x+clamp((x-view.cx)*rate,-42,42),y:y+clamp((y-view.cy)*rate,-22,22)};
}
function sprite(ctx,image,x,y,w,far=false) {
  if(!image)return;
  ctx.save();ctx.imageSmoothingEnabled=true;
  if(far){const s=cachedSprite(image,'far');const h=w*image.naturalHeight/image.naturalWidth;
    const scale=h/560;ctx.drawImage(s,x-320*scale,y-600*scale,640*scale,640*scale);
  }else ctx.drawImage(image,x-w/2,y-w*image.naturalHeight/image.naturalWidth,w,w*image.naturalHeight/image.naturalWidth);
  ctx.restore();
}
export function drawTownCastShadow(ctx,image,x,y,w) {
  if(!image)return;
  const h=w*image.naturalHeight/image.naturalWidth,scale=h/560;
  ctx.save();ctx.globalAlpha=.19;
  // Upper-left light casts the roof/crown silhouette down and right across the floor.
  ctx.transform(1,0,-.65,-.20,x,y);
  ctx.drawImage(cachedSprite(image,'shadow'),-320*scale,-600*scale,640*scale,640*scale);
  ctx.restore();
}
export function drawTownDistantScenery(ctx,house,tree,view,reduced) {
  ctx.save();ctx.globalAlpha=.62;
  for(const [x,y,w]of distantHomes){const p=sceneryPoint(x,y,view,-.025,reduced);sprite(ctx,house,p.x,p.y,w,true);}
  for(const x of []){
    const p=sceneryPoint(x,230,view,-.025,reduced);sprite(ctx,tree,p.x,p.y,175,true);
  }
  ctx.restore();
}
export function drawTownSceneryShadows(ctx,house,tree,waterfall,view,reduced) {
  // Houses draw their own contact shadow. A shared archive silhouette would
  // cast a second roof shape that does not match the four residential variants.
  for(const [x,y,w]of TOWN_EDGE_HOMES){const p=sceneryPoint(x,y,view,.035,reduced);drawTownCastShadow(ctx,house,p.x,p.y,w);}
  for(const site of TOWN_TREES)if(!townContains(site.x,site.y)){
    const p=sceneryPoint(site.x,site.y,view,site.foreground?.045:0,reduced);drawTownCastShadow(ctx,tree,p.x,p.y,site.w);
  }

}
export function addTownSceneryLayers(at,ctx,house,tree,waterfall,g,time,view,reduced) {
  for(const [x,y,w]of TOWN_EDGE_HOMES){const p=sceneryPoint(x,y,view,.035,reduced);
    at(y,()=>sprite(ctx,house,p.x,p.y,w));
  }
  for(const treeSite of TOWN_TREES){
    if(townContains(treeSite.x,treeSite.y))continue;
    const p=sceneryPoint(treeSite.x,treeSite.y,view,treeSite.foreground?.045:0,reduced);
    at(treeSite.y,()=>{
      ctx.save();
      // Crowns yield to the player when a nearby avenue runs behind them.
      const h=tree?treeSite.w*tree.naturalHeight/tree.naturalWidth:0;
      if(Math.abs(g.player.x-p.x)<treeSite.w*.5&&g.player.y<p.y&&g.player.y>p.y-h)ctx.globalAlpha=.38;
      sprite(ctx,tree,p.x,p.y,treeSite.w);ctx.restore();
    });
  }
  if(waterfall){const p=TOWN_WATERFALL;
    at(p.y,()=>{
      ctx.save();
      if(Math.abs(g.player.x-p.x)<p.w*.5&&g.player.y<p.y&&g.player.y>p.y-p.w)ctx.globalAlpha=.38;
      // Cascade is already painted at this world anchor.
      // Ripples animate only in the pool; no new video or full-canvas filter.
      ctx.save();ctx.strokeStyle='rgba(181,237,222,.30)';ctx.lineWidth=1.5;
      for(let i=0;i<3;i++){const phase=reduced?.45:((time/1900+i/3)%1);
        ctx.globalAlpha=1-phase;ctx.beginPath();ctx.ellipse(p.x,p.y-p.w*.11,phase*p.w*.16+8,phase*p.w*.035+2,0,0,Math.PI*2);ctx.stroke();}
      if(!reduced)for(let i=0;i<8;i++){
        const phase=(time/1100+i/8)%1, lower=i%2;
        const x=p.x+12+Math.sin(i*17)*10,y=p.y-p.w*(lower?.49:.79)+phase*p.w*.22;
        ctx.globalAlpha=.25*(1-phase);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-1,y+7);ctx.stroke();
      }
      ctx.restore();ctx.restore();
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
