import { drawH3Lanterns, drawH3Surfaces, h3SurfaceContains, prepareH3SurfaceTracks } from './map-fx-h3.js?v=mapfx';
import { zoneStyle } from './scene-style.js';
import { TOWN_SIZE, TOWN_RIVER_Y, townContains } from './town-layout.js?v=k1d';
// Decorative motion over painted map art. Never changes collision or gameplay state.
const cache = new WeakMap();
const frac = n => n - Math.floor(n);
const seed = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const mod = (n, d) => ((n % d) + d) % d;

export function ambientPixelKind(r, g, b, y, zone, x = .5) {
  if (zone==='town-th') {
    if(townContains(x*TOWN_SIZE.w,y*TOWN_SIZE.h)) return null;
    if((y>TOWN_RIVER_Y/TOWN_SIZE.h || x>.58) && b>65 && b>r*1.18 && b>=g*.92) return 'water';
    if(x<.39 && r>180 && g>25 && g<r*.65 && r>b*1.5) return 'lava';
    return null;
  }
  if ((zone === 'th' || zone === 'asia') && !h3SurfaceContains(zone, x, y)) return null;
  const frozenChannel = (x > .312 && x < .522 && y > .153 && y < .282) ||
    (x > .308 && x < .397 && y > .25 && y < .7) ||
    (x > .37 && x < .657 && y > .60 && y < .697) ||
    (x > .626 && x < .708 && y > .648 && y < .765);
  if ((zone==='th'||zone==='asia') && y<.77 && r>180 && g>25 && r>g*.94 && r>b*1.5 && b<190)return 'lava';
  if (zone !== 'west' && r > 190 && g > 65 && g < 225 && b < 100 && y < .77) return 'lava';
  if ((y > ((zone === 'th' || zone === 'asia') ? .735 : .745) || zone === 'west' && frozenChannel) && b > 65 && b > r * 1.18 && b >= g * .92 &&
      (zone !== 'west' || r < 150 && g > r * 1.5)) return 'water';
  if (zone === 'cyberhell' && y < .74 && b > 160 && r > 75 && b > r * 1.3 && g < r * .8) return 'electric';
  return null;
}

export function strictSurfaceCells(data,sw,sh,width,height,zone) {
  const result=new Array(width*height).fill(null);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    let kind,valid=true;
    for(let sy=Math.floor(y*sh/height);sy<Math.ceil((y+1)*sh/height)&&valid;sy++)
      for(let sx=Math.floor(x*sw/width);sx<Math.ceil((x+1)*sw/width);sx++){
        const i=(sy*sw+sx)*4;
        const current=data[i+3]?ambientPixelKind(data[i],data[i+1],data[i+2],sy/sh,zone,sx/sw):null;
        if(!current || kind&&current!==kind){valid=false;break;}
        kind=current;
      }
    if(valid)result[y*width+x]=kind;
  }
  return result;
}

let lanternSprite;
/** One shared warm radial sprite, built lazily on the first H3 frame (after the allocation-free reduced-motion check). */
function lanternGlow() {
  if (lanternSprite !== undefined) return lanternSprite;
  lanternSprite = null;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d'), g = c?.createRadialGradient?.(32,32,0,32,32,32);
  if (typeof g?.addColorStop !== 'function') return lanternSprite;
  g.addColorStop(0,'rgba(255,214,110,.95)'); g.addColorStop(.3,'rgba(255,140,40,.55)'); g.addColorStop(1,'rgba(255,60,0,0)');
  c.fillStyle = g; c.fillRect(0,0,64,64);
  return lanternSprite = cv;
}

function masksFor(bg, zone) {
  let zones = cache.get(bg);
  if (!zones) { zones=new Map();cache.set(bg,zones); }
  if (zones.has(zone)) return zones.get(zone);
  if (!bg.naturalWidth || !bg.naturalHeight) return null;
  // Build quarter-resolution layers once; no pixel readback in the animation loop.
  const width=Math.ceil(bg.naturalWidth/4), height=Math.ceil(bg.naturalHeight/4);
  const h3=zone==='th'||zone==='asia';
  const sample=document.createElement('canvas');
  sample.width=h3?bg.naturalWidth:width;sample.height=h3?bg.naturalHeight:height;
  const sc=sample.getContext('2d',{willReadFrequently:true});sc.imageSmoothingEnabled=false;
  sc.drawImage(bg,0,0,sample.width,sample.height);
  let data;
  try { data=sc.getImageData(0,0,sample.width,sample.height).data; }
  catch { zones.set(zone,null); return null; }
  // H3 requires every original pixel covered by a coarse cell to be the same
  // surface. Small painted rocks and railings cannot disappear in downsampling.
  const cells=h3?strictSurfaceCells(data,sample.width,sample.height,width,height,zone):null;
  const layers={}, layerPixels={};
  for (const kind of ['water','lava','electric']) {
    const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
    const c=canvas.getContext('2d'), pixels=c.createImageData(width,height);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const i=(y*width+x)*4;
      if(cells ? cells[y*width+x]===kind : data[i+3] && ambientPixelKind(data[i],data[i+1],data[i+2],y/height,zone,x/width)===kind){
        pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=pixels.data[i+3]=255;
      }
    }
    c.putImageData(pixels,0,0);layers[kind]=canvas;layerPixels[kind]=pixels.data;
  }
  const fx=document.createElement('canvas');fx.width=width;fx.height=height;
  const points={water:[],lava:[]}, edges=[], tracks={};
  if(zone==='th'||zone==='asia')for(const kind of ['water','lava']) {
    const pixels=layerPixels[kind];
    // Strict source-pixel coverage already keeps each cell inside painted banks.
    const c=layers[kind].getContext('2d'), safe=c.createImageData(width,height);
    for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
      if(pixels[(y*width+x)*4+3]){const i=(y*width+x)*4;safe.data[i]=safe.data[i+1]=safe.data[i+2]=safe.data[i+3]=255;
        points[kind].push([x/width,y/height]);
        if(kind==='lava' && (x<3||y<3||x>=width-3||y>=height-3 ||
          !pixels[((y-3)*width+x)*4+3]||!pixels[((y+3)*width+x)*4+3]||
          !pixels[(y*width+x-3)*4+3]||!pixels[(y*width+x+3)*4+3]))edges.push([x/width,y/height]);}
    }
    c.putImageData(safe,0,0);
    tracks[kind]=prepareH3SurfaceTracks(zone,kind,points[kind],edges);
  }
  const result={...layers,fx,width,height,tracks};zones.set(zone,result);return result;
}

function masked(ctx, masks, kind, W, H, draw) {
  const c=masks.fx.getContext('2d');
  c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,masks.width,masks.height);
  c.save();c.scale(masks.width/W,masks.height/H);draw(c);c.restore();
  c.globalCompositeOperation='destination-in';c.drawImage(masks[kind],0,0);
  c.globalCompositeOperation='source-over';ctx.drawImage(masks.fx,0,0,W,H);
}

/** Paint before actors and buildings, so glints never cover a character or pier. */
export function drawMapAmbientGround(ctx, bg, zone, time, W, H, reduced = false) {
  if (reduced || !weatherEnabled()) return;
  const masks=masksFor(bg,zone);if(!masks)return;
  if(zone==='th'||zone==='asia'){
    ctx.save();
    for(const kind of ['water','lava'])masked(ctx,masks,kind,W,H,c=>drawH3Surfaces(c,zone,kind,time,W,H,masks.tracks[kind]));
    drawH3Lanterns(ctx,zone,time,W,H,lanternGlow());
    ctx.restore();return;
  }
  const t=time/1000;
  ctx.save();
  masked(ctx,masks,'water',W,H,c=>{
    c.lineWidth=5;c.lineCap='round';
    for(let i=0;i<100;i++){
      const x=mod(seed(i+9)*W+t*(18+seed(i+60)*16),W+70)-35;
      const y=(zone==='west'?.15:.745)*H+seed(i+40)*(zone==='west'?.85:.25)*H+Math.sin(t*1.5+i)*3;
      const size=12+seed(i+80)*26;
      c.strokeStyle=`rgba(${zone==='th'?'202,185,233':'139,241,255'},${.10+seed(i+5)*.10})`;
      c.beginPath();c.ellipse(x,y,size*.5,3,0,0,Math.PI*1.6);c.stroke();
    }
    if(zone==='west'){
      // Waterfall at the frozen upper channel and its lower drop.
      c.strokeStyle='rgba(220,255,255,.38)';
      for(let i=0;i<12;i++){
        const x=(i<6?.334:.655)*W+(i%6)*5;
        const y=(i<6?.153:.690)*H+mod(t*38+i*12,40);
        c.beginPath();c.moveTo(x,y);c.lineTo(x+2,y+15);c.stroke();
      }
    }
  });
  masked(ctx,masks,'lava',W,H,c=>{
    c.fillStyle=`rgba(255,210,58,${.08+(1+Math.sin(t*2.4))*.055})`;c.fillRect(0,0,W,H);
    for(let i=0;i<65;i++){
      const x=seed(i+211)*W,y=seed(i+307)*H;
      const age=mod(t*.32+seed(i+41),1),r=2+age*9;
      c.strokeStyle=`rgba(255,245,123,${(1-age)*.58})`;c.lineWidth=1.6;
      c.beginPath();c.ellipse(x,y,r,r*.45,0,0,Math.PI*2);c.stroke();
    }
    c.strokeStyle='rgba(255,235,99,.44)';c.lineWidth=2;
    for(let i=0;i<44;i++){
      const x=seed(i+19)*W,y=mod(seed(i+27)*H+t*11,H);
      c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+10,y-3,x+26,y);c.stroke();
    }
  });
  if(zone==='cyberhell')masked(ctx,masks,'electric',W,H,c=>{
    c.fillStyle=`rgba(221,171,255,${.20+.15*Math.sin(t*2.3)})`;c.fillRect(0,0,W,H);
    for(let i=0;i<8;i++){
      c.fillStyle='rgba(255,226,255,.75)';
      c.fillRect(mod(t*55+i*W/8,W),0,6,H);
    }
  });
  if(zone==='asia'){
    for(const [x,y] of [[.10,.386],[.194,.386],[.068,.615],[.126,.615],[.863,.182],[.931,.182],[.81,.792],[.86,.792],[.262,.795],[.321,.795],[.456,.580],[.540,.580]]){
      const glow=.10+.07*(.5+.5*Math.sin(t*5+x*80))+.03*Math.sin(t*9+y*90);
      const gr=ctx.createRadialGradient(x*W,y*H,1,x*W,y*H,22);
      gr.addColorStop(0,`rgba(255,190,67,${glow})`);gr.addColorStop(1,'rgba(255,127,35,0)');
      ctx.fillStyle=gr;ctx.fillRect(x*W-22,y*H-22,44,44);
    }
  }
  ctx.restore();
}

// Shared town/frontier weather. Stored independently of game saves, like audio preferences.
let weatherOn = true;
const weatherStore = () => globalThis.window?.localStorage ?? globalThis.localStorage;
try { weatherOn = weatherStore()?.getItem('avegee.weather') !== 'off'; } catch {}
export const weatherEnabled = () => weatherOn;
export function setWeatherEnabled(on) {
  weatherOn = !!on;
  try { weatherStore()?.setItem('avegee.weather', on ? 'on' : 'off'); } catch {}
}
export function biomeBudget(ctx, W, H, maximum = 160) {
  const canvas = ctx?.canvas;
  const dpr = Math.max(1, globalThis.devicePixelRatio || 1);
  const width = canvas?.clientWidth || (canvas?.width ? canvas.width / dpr : W);
  const height = canvas?.clientHeight || (canvas?.height ? canvas.height / dpr : H);
  return Math.max(24, Math.round(maximum * Math.min(1, width * height / (1100 * 700)) / Math.sqrt(dpr)));
}
// A single monotonic 100 ms pulse per 9 seconds; no independent overlapping flashes.
export function stormFlash(time, reduced = false) {
  if (reduced || !weatherOn) return 0;
  const phase = mod(time, 9000);
  return phase < 100 ? .055 * (1 - phase / 100) : 0;
}
export function ambientParticles(zone, time, W, H, limit = null) {
  const base = zone === 'west' ? 160 : zone === 'cyberhell' ? 200 : zone === 'asia' ? 20 : 30;
  // `limit` is a particle count, or a CSS viewport {width,height,dpr} (WEATHER-A) that caps the count by screen size.
  const count = typeof limit === 'number' ? limit : limit ? Math.min(base, weatherBudget(limit) * 2) : base;
  const t=time/1000;
  return Array.from({length:count},(_,i)=>{
    const rain=zone==='cyberhell';
    const speed=rain?360+seed(i+4)*160:zone==='west'?24+seed(i+4)*32:zone==='asia'?9+seed(i+4)*13:-10-seed(i+4)*18;
    return {x:mod(seed(i+4)*W+t*(rain?-75:zone==='west'?19:11),W),
      y:mod(seed(i+80)*H+t*speed,H),size:zone==='west'?1+seed(i+16)*2.4:1.5+seed(i+16)*2,
      alpha:rain?.45+seed(i+30)*.3:.18+seed(i+30)*.32,angle:t*.7+i};
  });
}
/** World layer only: caller paints actors, signs and UI afterwards. Areas are biome bounds. */
export function drawBiomeWeather(ctx, zone, time, W, H, reduced = false, area = [0,0,1,1]) {
  if(reduced || !weatherOn)return;
  const [x0,y0,x1,y1]=area, aw=(x1-x0)*W, ah=(y1-y0)*H;
  ctx.save();ctx.beginPath();ctx.rect(x0*W,y0*H,aw,ah);ctx.clip();ctx.translate(x0*W,y0*H);
  const count=biomeBudget(ctx,W,H,zone==='west'?160:zone==='cyberhell'?200:zone==='asia'?20:30);
  for(const p of ambientParticles(zone,time,aw,ah,count)){
    ctx.globalAlpha=p.alpha;ctx.fillStyle=zoneStyle(zone).particle;
    if(zone==='cyberhell'){
      ctx.strokeStyle='rgba(190,222,248,.8)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x-4,p.y+17);ctx.stroke();
    }else ctx.fillRect(p.x,p.y,p.size*1.5,p.size*1.5);
  }
  ctx.globalAlpha=1;
  if(zone==='west'){
    // Broad, feathered low fog; cached sprite rather than per-frame blur/filter.
    const fog=fogSprite();
    if(fog)for(let i=0;i<5;i++){
      const x=mod(time*.009+i*aw/4,aw+aw*.5)-aw*.25,y=ah*(.48+i*.095);
      ctx.globalAlpha=.17;ctx.drawImage(fog,x-aw*.22,y-ah*.035,aw*.44,ah*.07);
    }
  }
  if(zone==='cyberhell'){
    const flash=stormFlash(time);
    if(flash){
      ctx.globalAlpha=flash;ctx.fillStyle='#d7eaff';ctx.fillRect(0,0,aw,ah);
      ctx.globalAlpha=flash*7;ctx.strokeStyle='#d3edff';ctx.lineWidth=2;
      const x=aw*(.2+seed(Math.floor(time/9000))*.6);
      ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x-12,ah*.09);ctx.lineTo(x+4,ah*.08);ctx.lineTo(x-18,ah*.2);ctx.stroke();
    }
  }
  ctx.restore();
}

// WEATHER-A extends the shared map pass. Sprites are baked once, never filtered or
// read back per frame. This pass belongs after actors and before canvas/DOM HUD.
export const WEATHER_ZONES = Object.freeze({
  th:{shade:.085,speed:5}, asia:{shade:.065,speed:3.4},
  west:{shade:.075,speed:2.4}, cyberhell:{shade:.10,speed:6},
});
export function weatherBudget({width=1440,height=900,dpr=1,reduced=false}={}) {
  if(reduced)return 0;
  // CSS viewport area, with a further high-DPR reduction. World size/zoom must
  // never multiply this budget. One budget is shared by both frontier halves.
  return Math.max(6,Math.min(36,Math.floor(36*Math.min(1,width*height/(1440*900))/Math.max(1,dpr/1.5))));
}
let weatherSprites;
const weatherClocks=new WeakMap();
function weatherArt(){
  if(weatherSprites)return weatherSprites;
  if(typeof document==='undefined')return null;
  const make=rgb=>{
    const c=document.createElement('canvas');c.width=c.height=128;
    const p=c.getContext('2d'),g=p?.createRadialGradient?.(64,64,0,64,64,64);
    if(typeof g?.addColorStop!=='function')return null;
    g.addColorStop(0,`rgba(${rgb},1)`);g.addColorStop(.45,`rgba(${rgb},.6)`);g.addColorStop(1,`rgba(${rgb},0)`);
    p.fillStyle=g;p.fillRect(0,0,128,128);return c;
  };
  const cloud=make('16,22,32'),smoke=make('135,125,120');
  return cloud&&smoke ? (weatherSprites={cloud,smoke}) : null;
}
export function weatherViewport(ctx){
  const dpr=globalThis.devicePixelRatio||1;
  return {width:ctx.canvas?.clientWidth||ctx.canvas?.width/dpr||1440,
    height:ctx.canvas?.clientHeight||ctx.canvas?.height/dpr||900,dpr};
}
/** Rectangular exclusions are unioned so overlapping labels cannot punch back
 * through an even-odd clip. All coordinates are in the caller's world space. */
export function weatherLabelBounds(rects){
  const out=[];
  for(const input of rects){
    let r=[...input],changed=true;
    while(changed){changed=false;
      for(let i=out.length-1;i>=0;i--){const b=out[i];
        if(r[0]<=b[0]+b[2]&&r[0]+r[2]>=b[0]&&r[1]<=b[1]+b[3]&&r[1]+r[3]>=b[1]){
          const x=Math.min(r[0],b[0]),y=Math.min(r[1],b[1]);
          r=[x,y,Math.max(r[0]+r[2],b[0]+b[2])-x,Math.max(r[1]+r[3],b[1]+b[3])-y];out.splice(i,1);changed=true;
        }
      }
    }out.push(r);
  }return out;
}
export function drawMapWeather(ctx,{zone='th',time=0,W,H,x=0,y=0,reduced=false,
  viewport=weatherViewport(ctx),sources=[],regions=null,labels=[],paused=false,enabled=weatherEnabled()}={}) {
  if(!enabled||!(W>0&&H>0))return;
  const art=weatherArt();if(!art)return;
  let clock=weatherClocks.get(ctx);
  if(!clock){clock={raw:time,elapsed:time};weatherClocks.set(ctx,clock);}
  if(!paused)clock.elapsed+=Math.max(0,time-clock.raw);
  clock.raw=time;
  const t=reduced?0:clock.elapsed/1000,budget=weatherBudget({...viewport,reduced});
  ctx.save();
  ctx.beginPath();ctx.rect(x,y,W,H);
  for(const r of weatherLabelBounds(labels))ctx.rect(...r);
  ctx.clip('evenodd');ctx.translate(x,y);
  const halves=regions||[{zone,from:0,to:1}];
  for(const region of halves){
    const style=WEATHER_ZONES[region.zone];if(!style)continue;
    const left=region.from*W,rw=(region.to-region.from)*W;
    ctx.save();ctx.beginPath();ctx.rect(left,0,rw,H);ctx.clip();
    // Three broad feathered shadows, max combined opacity under 20%. Shared
    // world coordinates shade the painted floor and actor pixels together.
    for(let i=0;i<3;i++){
      const cw=W*.56,ch=H*.42,cx=mod(W*(i*.37+.13)+t*style.speed,W+cw)-cw/2;
      const cy=H*(.23+i*.27)+Math.sin(t*.025+i)*H*.025;
      ctx.globalAlpha=style.shade*.66;ctx.drawImage(art.cloud,cx-cw/2,cy-ch/2,cw,ch);
    }
    if(region.zone==='asia'){
      ctx.globalAlpha=1;
      // Soft graded wedges; no full-screen flash or bright opaque beam core.
      for(let i=0;i<3;i++){
        const bx=left+rw*(.12+i*.31),by=H*.07,bw=rw*.15;
        const g=ctx.createLinearGradient(bx,by,bx+bw,H*.88);
        g.addColorStop(0,'rgba(255,241,190,0)');g.addColorStop(.3,'rgba(255,241,190,.045)');g.addColorStop(1,'rgba(255,241,190,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+bw*2,H*.88);ctx.lineTo(bx+bw*.6,H*.88);ctx.closePath();ctx.fill();
      }
      for(let i=0;i<Math.floor(budget/halves.length);i++){
        const px=left+mod(seed(i+51)*rw+t*3,rw),py=mod(seed(i+91)*H-t*5,H);
        ctx.globalAlpha=.12+seed(i+18)*.13;ctx.fillStyle='#fff1bd';ctx.beginPath();ctx.arc(px,py,1+seed(i+3),0,Math.PI*2);ctx.fill();
      }
    }
    if(region.zone==='th'&&budget&&sources.length){
      for(let i=0;i<Math.floor(budget/halves.length);i++){
        const p=sources[i%sources.length],age=mod(t*.16+seed(i+12),1);
        const sx=p[0]+Math.sin(age*3+i)*W*.003+age*W*.008,sy=p[1]-age*H*.065,r=W*(.004+age*.009);
        ctx.globalAlpha=Math.sin(age*Math.PI)*.12;
        ctx.drawImage(art.smoke,sx-r,sy-r*1.4,r*2,r*2.8);
      }
    }
    ctx.restore();
  }
  ctx.restore();
}
let fogCache;
function fogSprite() {
  if(fogCache!==undefined)return fogCache;
  fogCache=null;
  if(typeof document==='undefined')return null;
  const cv=document.createElement('canvas');cv.width=128;cv.height=32;
  const c=cv.getContext('2d'),g=c?.createRadialGradient?.(64,64,0,64,64,64);
  if(typeof g?.addColorStop!=='function')return null;
  g.addColorStop(0,'rgba(201,226,241,.8)');g.addColorStop(1,'rgba(201,226,241,0)');
  c.scale(1,.25);c.fillStyle=g;c.fillRect(0,0,128,128);return fogCache=cv;
}
export function drawMapAmbientSky(ctx, zone, time, W, H, reduced = false) {
  drawBiomeWeather(ctx,zone,time,W,H,reduced);
}
