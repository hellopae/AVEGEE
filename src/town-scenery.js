// Every scenery object has its own sprite, ground shadow and collision root.
// Ground painting contains no object silhouettes; foot depth governs occlusion.
import { TOWN_HOUSE_SITES, TOWN_PROP_SITES, onTownLayoutChange } from './town-layout.js?v=k1d';
import { activeTownSkin, activeTownZone, ZONE1_TOWN_ART } from './zone-skin.js';
import { drawLocalLight } from './scene-style.js';
import { drawContactAO, visibleBase } from './town-shade.js?v=l1';

const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
export const TOWN_TREES = TOWN_PROP_SITES.filter(p=>p.kind==='tree');
onTownLayoutChange(()=>TOWN_TREES.splice(0,TOWN_TREES.length,...TOWN_PROP_SITES.filter(p=>p.kind==='tree')));
export const TOWN_WATERFALL = null; // the waterfalls are painted into the ground now
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
// K1e: lava (red) and ice (snow) trees now have their own art, so only the shared green tree is tinted
// (city = infernal dark red, heaven = pale gold).
const TREE_TINT = {
  city:'brightness(.78) saturate(1.08)',
  heaven:'saturate(.7) brightness(1.12)',
};
const tinted = new WeakMap();
function tintedArt(image,biome) {
  const filter=activeTownSkin().treeTint?TREE_TINT[biome]:null;   // M2: a zone with its own tree art is not darkened in code
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
  const w=p.w,h=art?w*(art.naturalHeight||art.height)/(art.naturalWidth||art.width):(p.h||w),pad=60;
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
const flameSets=new Map();   // flame url template -> [Image a,b,c]; a zone may light its torches with another colour (zone-skin light.flame)
const flameFor=template=>{
  let set=flameSets.get(template);
  if(!set&&typeof Image!=='undefined'){set=['a','b','c'].map(key=>{const im=new Image();im.src=template.replace('{k}',key);return im;});flameSets.set(template,set);}
  return set;
};
// These painted FX have black RGB backgrounds; additive compositing keeps them invisible.
export function drawTorchFlame(ctx,x,base,time,reduced){
  const frames=(flameFor(activeTownSkin().light.flame)||[]).filter(im=>im.complete&&im.naturalWidth);if(!frames.length)return;
  const phase=reduced?0:time/180+x*.021,index=Math.floor(phase)%frames.length,blend=phase-Math.floor(phase);
  const h=reduced?37:37+Math.sin(time/150+x)*3,w=h*.57,sway=reduced?0:Math.sin(time/210+x)*1.6;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [offset,alpha]of [[0,1-blend],[1,blend]]){ctx.globalAlpha=alpha*.95;ctx.drawImage(frames[(index+offset)%frames.length],x-w/2+sway,base-h,w,h);}
  ctx.restore();
}
const torchArts = new Map();   // url -> Image (one per zone skin)
function torchSprite() {
  const url = activeTownSkin().art['town-prop-torch-pillar'] || ZONE1_TOWN_ART['town-prop-torch-pillar'];
  let art = torchArts.get(url);
  if (!art && typeof Image !== 'undefined') {
    art = new Image(); art.src = url; torchArts.set(url, art);
  }
  return art?.complete && art.naturalWidth ? art : null;
}
// K1e: dedicated art per kind/biome. Torches stay on the Codex Thai fire pillar (torch-pillar-v1).
export function townPropArtKey(p) {
  if(p.kind==='tree'&&p.biome==='lava')return 'town-tree-red-th';
  if(p.kind==='tree'&&p.biome==='ice')return 'town-tree-snow-th';
  return ({palm:'town-prop-palm',lamp:'town-prop-lamp-gold'})[p.kind]||p.key;
}
const propArt = (p,tree,waterfall,resolveArt) => {
  if(p.kind==='torch')return torchSprite();
  const key=townPropArtKey(p);
  return key?(resolveArt?.(key)||(p.fallbackKey?resolveArt?.(p.fallbackKey):null)||(key==='town-tree-th'?tree:null)):null;
};
// L1: town-shade.js casts shadows from exactly the art the scenery draws (incl. K1e sprites).
export const townPropArt = (p,tree,waterfall,resolveArt) =>
  propArt(p,tree,waterfall,resolveArt);
// L1: soft contact shade (AO) under the base so nothing floats; the cast shadow itself comes from town-shade.js.
function contactShadow(ctx,p,art) {
  if(art){
    const b=visibleBase(art,p.x,p.y,p.w,p.w*(art.naturalHeight||art.height)/(art.naturalWidth||art.width));
    const rx=Math.max(b.w*.7,p.rx*1.4);
    drawContactAO(ctx,b.x+3,b.y-1,rx,Math.max(p.ry,rx*.38),1);
  }else drawContactAO(ctx,p.x+3,p.y-1,p.kind==='palm'?p.w*.16:p.rx*1.6,p.ry*1.1,.9);
}
// Loading/error fallbacks only; K1e resolves palm and gold lantern to dedicated sprites, torches use the fire pillar.
function fallbackProp(ctx,p,time=0,reduced=true) {
  ctx.save();ctx.translate(p.x,p.y);
  const w=p.w,flick=reduced?0:Math.sin(time/170+p.x*.07);
  if(p.kind==='lamp'||p.kind==='torch'){
    const gold=p.kind==='lamp',top=-(p.h||70);
    ctx.fillStyle=gold?'#9a9ea6':'#2a211d';ctx.fillRect(-3,top+10,6,-top-10);
    ctx.fillStyle=gold?'#c9ced6':'#4a3a30';ctx.fillRect(-3,top+10,2,-top-10);
    ctx.globalAlpha=.28+.05*flick;ctx.fillStyle=gold?'#ffe27a':'#ff7a3a';
    ctx.beginPath();ctx.ellipse(0,top+2,17,22,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    ctx.fillStyle=gold?'#ffd21f':'#ff4a22';
    ctx.beginPath();ctx.ellipse(0,top+2,7+.6*flick,11+1.2*flick,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=gold?'#fff3a6':'#ffd36a';
    ctx.beginPath();ctx.ellipse(0,top+5,3.2,6,0,0,Math.PI*2);ctx.fill();
  }else if(p.kind==='palm'){
    const h=p.h||171,cx=-12,cy=-h*.66;
    ctx.strokeStyle='#6d5136';ctx.lineCap='round';ctx.lineWidth=9;
    ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-6,cy*.55,cx,cy);ctx.stroke();
    ctx.lineWidth=5;ctx.strokeStyle='#8b6b46';ctx.beginPath();ctx.moveTo(2,0);ctx.quadraticCurveTo(-2,cy*.55,cx+2,cy);ctx.stroke();
    for(let i=0;i<8;i++){
      const a=-Math.PI+(i+.5)*Math.PI/8,len=w*.52;
      const ex=cx+Math.cos(a)*len,ey=cy+Math.sin(a)*len*.55+len*.32;
      ctx.fillStyle=i%2?'#2f7a3a':'#3f9446';
      ctx.beginPath();ctx.moveTo(cx,cy);
      ctx.quadraticCurveTo(cx+Math.cos(a)*len*.55,cy+Math.sin(a)*len*.9-8,ex,ey);
      ctx.quadraticCurveTo(cx+Math.cos(a)*len*.5,cy+Math.sin(a)*len*.7+2,cx,cy);ctx.fill();
    }
  }else if(p.kind==='rock'){
    ctx.fillStyle=p.biome==='ice'?'#899da7':'#38333b';ctx.strokeStyle='#211d26';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(-w*.46,-w*.08);ctx.lineTo(-w*.27,-w*.38);
    ctx.lineTo(w*.1,-w*.43);ctx.lineTo(w*.41,-w*.25);ctx.lineTo(w*.46,-w*.05);
    ctx.lineTo(w*.06,w*.03);ctx.closePath();ctx.fill();ctx.stroke();
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
    contactShadow(ctx,p,art);
  }
}
export function addTownSceneryLayers(at,ctx,house,tree,waterfall,g,time,view,reduced,resolveArt) {
  for(const p of TOWN_PROP_SITES){
    const art=propArt(p,tree,waterfall,resolveArt);
    if(!onScreen(ctx,p,art))continue;
    at(p.y,()=>{
      ctx.save();
      const h=art?p.w*art.naturalHeight/art.naturalWidth:(p.h||p.w);
      // Fade only the crown/roof when the player's feet are behind this prop.
      if(Math.abs(g.player.x-p.x)<p.w*.45&&g.player.y<p.y&&g.player.y>p.y-h)ctx.globalAlpha=.4;
      if(art){
        sprite(ctx,p.kind==='tree'&&townPropArtKey(p)==='town-tree-th'?tintedArt(art,p.biome):art,p.x,p.y,p.w);
      }else fallbackProp(ctx,p,time,reduced);
      if(p.kind==='torch') {
        const fy=p.y-h*.85;
        drawTorchFlame(ctx,p.x,fy+9,time,reduced);
        ctx.save();ctx.globalCompositeOperation='screen';
        drawLocalLight(ctx,activeTownZone(),p.x,fy,85,time,reduced);
        drawLocalLight(ctx,activeTownZone(),p.x,p.y-4,48,time,reduced);
        if(!reduced)for(let i=0;i<4;i++){
          const age=((time/1800+i*.25+p.x*.001)%1+1)%1;
          const x=p.x+Math.sin(age*5+i+p.x)*9,y=fy-age*40;
          const alpha=Math.sin(age*Math.PI)*(.55+.25*Math.sin(time/110+i));
          ctx.globalAlpha=alpha;ctx.fillStyle=i%2?'#fff0a0':'#ff9b38';
          ctx.fillRect(x-1,y-2,2,4);
        }
        ctx.restore();
      }
      ctx.restore();
    });
  }
}
export function drawTownHouseLights(ctx,time,reduced) {
  for(const {x,y,w} of TOWN_HOUSE_SITES){
    drawLocalLight(ctx,activeTownZone(),x-w*.14,y-w*.36,w*.14,time,reduced);
    drawLocalLight(ctx,activeTownZone(),x+w*.14,y-w*.36,w*.14,time,reduced);
  }
}
