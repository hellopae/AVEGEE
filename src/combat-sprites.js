// Drawn pose atlases share fixed feet and isotropic scale. Existing sprites remain measurable fallbacks.
import {battleSpriteRect} from './battle-scale.js?v=battle-anchor-20261012-k2-l2';
let catalog=null,catalogRequest=null,catalogFailedAt=0;
const images=new Map();
function metadata(){
 if(!catalogRequest&&Date.now()-catalogFailedAt>10000&&typeof fetch==='function')catalogRequest=fetch('img/combat-animation-v1/manifest.json?v=night-v1').then(r=>{if(!r.ok)throw Error(r.status);return r.json();}).then(j=>{catalog=j.sprites;}).catch(()=>{catalogRequest=null;catalogFailedAt=Date.now();});
 return catalog;
}
function imageFor(src){
 let r=images.get(src);if(!r||r.failed&&Date.now()-r.failed>10000){
  const image=new Image();r={image,ready:false};images.set(src,r);
  image.onload=()=>{r.ready=true;};image.onerror=()=>{r.failed=Date.now();};image.src=src;
 }
 return r.ready?r.image:null;
}
export function poseFrame(elapsed,frames,durations,loop=false){
 const total=durations.reduce((a,b)=>a+b,0);let t=Math.max(0,elapsed);
 if(loop)t%=total;else if(t>=total)return frames.at(-1);
 for(let i=0;i<frames.length;i++){if(t<durations[i])return frames[i];t-=durations[i];}
 return frames.at(-1);
}
function recordFor(key,mode){const c=metadata();return c&&(c[key+':'+mode]||c[key]);}
export function drawAnimatedSprite(ctx,key,mode,x,y,h,elapsed,face=1){
 const rec=recordFor(key,mode),anim=rec?.modes?.[mode];if(!anim)return false;
 const image=imageFor(rec.src);if(!image)return false;
 const frame=poseFrame(elapsed,anim.frames,anim.durations,!!anim.loop),s=h/rec.bodyHeight;
 ctx.save();ctx.translate(x,y);ctx.scale(face<0?-1:1,1);
 ctx.drawImage(image,(frame%rec.cols)*rec.frameWidth,Math.floor(frame/rec.cols)*rec.frameHeight,rec.frameWidth,rec.frameHeight,
  -rec.anchor[0]*s,-rec.anchor[1]*s,rec.frameWidth*s,rec.frameHeight*s);ctx.restore();return true;
}
export function bossSpriteKey(src,zone){
 const base=src.split(/[?#]/)[0].split('/').at(-1).replace(/\.(png|webp)$/,'');
 const leader=base.match(/^leader-(th|asia|west|cyberhell)-possessed$/);if(leader)return `boss:${leader[1]}:leader-possessed`;
 const m=base.match(/^(hero-boss|zone-boss|boss-frontier|boss-tester)(?:-(th|asia|west|cyberhell))?(?:-v\d+)?$/);
 return m?`boss:${m[2]||zone}:${m[1]}`:null;
}
/** entries: {root, key, mode, startedAt}. One RAF per arena, stopped as soon as the arena is replaced. */
export async function mountCombatSprites(stage,entries){
 if(!stage?.isConnected||stage.dataset.combatAtlasMounted)return;
 stage.dataset.combatAtlasMounted='true';metadata();
 const actors=(await Promise.all(entries.filter(e=>e.key&&e.root).map(async e=>{
  const image=e.root.querySelector(':scope > img:not(.fx)');if(!image)return null;
  if(image.complete&&!image.naturalWidth)return null;
  const bounds=await battleSpriteRect(image).catch(()=>null);if(!bounds||!stage.isConnected)return null;
  const rr=e.root.getBoundingClientRect(),canvas=document.createElement('canvas');canvas.className='combat-pose-atlas';
  Object.assign(canvas.style,{position:'absolute',pointerEvents:'none',zIndex:'3',maxWidth:'none',maxHeight:'none',transform:'none'});
  e.root.appendChild(canvas);
  return {...e,image,canvas,opacity:image.style.opacity,foot:{x:(bounds.l+bounds.r)/2-rr.left,y:bounds.b-rr.top,h:bounds.b-bounds.t}};
 }))).filter(Boolean);
 stage._combatResize=async()=>{
  await Promise.all(actors.map(async a=>{
   const bounds=await battleSpriteRect(a.image).catch(()=>null);if(!bounds||!stage.isConnected)return;
   const rr=a.root.getBoundingClientRect();a.foot={x:(bounds.l+bounds.r)/2-rr.left,y:bounds.b-rr.top,h:bounds.b-bounds.t};
  }));
 };
 const tick=()=>{
  if(!stage.isConnected)return;
  const now=Date.now();
  for(const a of actors){
   const rec=recordFor(a.key,a.mode),anim=rec?.modes?.[a.mode];if(!rec||!anim)continue;
   const im=imageFor(rec.src);if(!im)continue;
   const s=a.foot.h/rec.bodyHeight,w=rec.frameWidth*s,h=rec.frameHeight*s;
   const frame=poseFrame(now-(a.startedAt||0),anim.frames,anim.durations,!!anim.loop);
   if(a.canvas.width!==rec.frameWidth||a.canvas.height!==rec.frameHeight){a.canvas.width=rec.frameWidth;a.canvas.height=rec.frameHeight;}
   Object.assign(a.canvas.style,{left:`${a.foot.x-rec.anchor[0]*s}px`,top:`${a.foot.y-rec.anchor[1]*s}px`,width:`${w}px`,height:`${h}px`});
   const c=a.canvas.getContext('2d');c.clearRect(0,0,rec.frameWidth,rec.frameHeight);
   c.drawImage(im,frame%rec.cols*rec.frameWidth,Math.floor(frame/rec.cols)*rec.frameHeight,rec.frameWidth,rec.frameHeight,0,0,rec.frameWidth,rec.frameHeight);
   a.image.style.opacity='0';for(const old of a.root.querySelectorAll('canvas:not(.combat-pose-atlas)'))old.style.opacity='0';a.root.dataset.poseMode=a.mode;a.root.dataset.poseFrame=String(frame);a.root.dataset.poseKey=a.key;
  }
  requestAnimationFrame(tick);
 };
 tick();
}
