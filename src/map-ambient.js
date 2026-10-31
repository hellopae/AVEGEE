import { drawH3Lanterns, drawH3Surfaces, h3SurfaceContains, prepareH3SurfaceTracks } from './map-fx-h3.js?v=mapfx';
import { zoneStyle } from './scene-style.js';
import { TOWN_SIZE, TOWN_RIVER_Y, townContains } from './town-layout.js?v=k1d';
// Decorative motion over painted map art. Never changes collision or gameplay state.
const cache = new WeakMap();
const frac = n => n - Math.floor(n);
const seed = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const mod = (n, d) => ((n % d) + d) % d;

/** Q5 FX: every tunable of the cloud shadow / snow / fog / rain / lightning layers lives here.
 *  Sizes of shadow patches and fog banks are fractions of the VISIBLE map area, so they read the same
 *  at any zoom, window or phone width. Particle maxima go through `biomeBudget` (screen area / DPR). */
export const MAP_FX = Object.freeze({
  cloud: Object.freeze({
    peak: .5,                       // shadow darkening at the core of a patch (brief: 35-45% darker ground, measured in the evidence)
    cell: [1.0, .7],                  // lattice cell, fraction of visible width / height
    size: [1.25, .9],                // patch size, fraction of visible width / height
    spread: [.85, 1.15],            // per-patch size factor range
    jitter: .2,                     // per-patch placement jitter, fraction of a cell
    oddFill: .12,                   // chance an off-checker cell also holds a patch
    drift: [.034, .008],            // cells per second (x, y): one pass takes ~45 s
    breathe: .06,                   // slow size/opacity breathing
    tint: Object.freeze({ th:'34,14,18', asia:'12,20,30', west:'10,20,44', cyberhell:'18,8,40' }),
    fallbackTint: '12,16,34',
  }),
  snow: Object.freeze({
    max: 1100,                      // particle ceiling before biomeBudget scales it by screen area and DPR (old ceiling: 160)
    speed: [45, 110], drift: 18,    // CSS px per second
    size: [2.2, 6],                 // CSS px
    alpha: [.6, 1], color: '#f4faff',
  }),
  fog: Object.freeze({
    peak: .58, cell: [.8, .42], size: [1.05, .4], spread: [.8, 1.25], jitter: .18, oddFill: .5,
    drift: [.045, .004], breathe: .1, tint: '214,230,244',
  }),
  rain: Object.freeze({
    max: 1000,   // ceiling before biomeBudget scales it by screen area and DPR (old ceiling: 160)
    speed: [560, 820], slant: -110, length: [14, 24], width: 1.4,
    alpha: [.4, .75], color: 'rgba(204,230,252,1)',
  }),
  storm: Object.freeze({
    period: 4000, jitter: 1200,     // one strike per slot, started somewhere in the first `jitter` ms
    flash: .22,                     // hard ceiling of the whole-screen flash opacity (brief: <= .25)
    pulses: Object.freeze([[0, 90, 1], [150, 260, .55]]),   // [start ms, end ms, share of flash]; at most 2 flashes per strike
    boltMs: 320,
  }),
  shadowEdge: Object.freeze([[0,1],[.66,1],[.8,.8],[.92,.34],[1,0]]),   // radial profile of one shadow blob: flat core, soft shoulder
  // th / asia embers and dust keep their original world-space behaviour (not part of Q5)
  legacyBase: Object.freeze({ th: 30, asia: 20 }),
});

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
/** One lightning strike per slot of `storm.period` ms, started somewhere in the first `storm.jitter` ms of the slot.
 *  A strike has at most two flash pulses, so the screen never flashes more than twice in a row, and strikes are
 *  always >= period-jitter apart (2.8 s): far below the 3 flashes per second photosensitivity limit. */
export function stormStrike(time) {
  const S = MAP_FX.storm, n = Math.floor(time / S.period), start = n * S.period + seed(n + .5) * S.jitter, age = time - start;
  return age >= 0 ? { n, start, age, x: .15 + .7 * seed(n + 9.3) } : null;
}
/** Whole-screen flash opacity at `time`: never above MAP_FX.storm.flash (.22 <= the brief's .25). */
export function stormFlash(time, reduced = false) {
  if (reduced || !weatherOn) return 0;
  const strike = stormStrike(time), S = MAP_FX.storm;
  if (!strike) return 0;
  let flash = 0;
  for (const [from, to, share] of S.pulses) if (strike.age >= from && strike.age < to) flash = Math.max(flash, S.flash * share * (1 - (strike.age - from) / (to - from)));
  return flash;
}
export function ambientParticles(zone, time, W, H, limit = null) {
  const base = zone === 'west' ? MAP_FX.snow.max : zone === 'cyberhell' ? MAP_FX.rain.max : MAP_FX.legacyBase[zone] ?? MAP_FX.legacyBase.th;
  // `limit` is a particle count, or a CSS viewport {width,height,dpr} (WEATHER-A) that caps the count by screen size.
  const count = typeof limit === 'number' ? limit : limit ? Math.min(base, weatherBudget(limit) * 2) : base;
  const t=time/1000, snow=MAP_FX.snow, lerp=(range,k)=>range[0]+k*(range[1]-range[0]);
  return Array.from({length:count},(_,i)=>{
    if(zone==='west')return {
      x:mod(seed(i+4)*W+t*snow.drift*(.5+seed(i+9))+Math.sin(t*.8+i*1.7)*10,W),
      y:mod(seed(i+80)*H+t*lerp(snow.speed,seed(i+4)),H),
      size:lerp(snow.size,seed(i+16)),alpha:lerp(snow.alpha,seed(i+30)),angle:t*.7+i};
    if(zone==='cyberhell'){
      const R=MAP_FX.rain,speed=lerp(R.speed,seed(i+4));
      return {x:mod(seed(i+4)*W+t*R.slant,W),y:mod(seed(i+80)*H+t*speed,H),size:lerp(R.length,seed(i+16)),
        dx:R.slant/speed,alpha:lerp(R.alpha,seed(i+30)),angle:0};
    }
    const speed=zone==='asia'?9+seed(i+4)*13:-10-seed(i+4)*18;
    return {x:mod(seed(i+4)*W+t*11,W),
      y:mod(seed(i+80)*H+t*speed,H),size:1.5+seed(i+16)*2,
      alpha:.18+seed(i+30)*.32,angle:t*.7+i};
  });
}
/** World layer only: caller paints actors, signs and UI afterwards. Areas are biome bounds.
 *  Snow (zone 3) is laid out over the VISIBLE part of the area in CSS pixels, so its density and flake size are the
 *  same at any zoom; the embers and dust of zones 1-2 keep their original world-space layout. */
export function drawBiomeWeather(ctx, zone, time, W, H, reduced = false, area = [0,0,1,1]) {
  if(reduced || !weatherOn)return;
  const [x0,y0,x1,y1]=area, aw=(x1-x0)*W, ah=(y1-y0)*H;
  ctx.save();ctx.beginPath();ctx.rect(x0*W,y0*H,aw,ah);ctx.clip();ctx.translate(x0*W,y0*H);
  const viewZone=zone==='west'||zone==='cyberhell',view=viewZone?viewMetrics(ctx,aw,ah):null;
  if(viewZone){
    if(view&&zone==='west')drawSnowAndFog(ctx,view,time,W,H);
    else if(view)drawRainAndStorm(ctx,view,time,W,H);
  }else{
    const count=biomeBudget(ctx,W,H,MAP_FX.legacyBase[zone]??MAP_FX.legacyBase.th);
    for(const p of ambientParticles(zone,time,aw,ah,count)){
      ctx.globalAlpha=p.alpha;ctx.fillStyle=zoneStyle(zone).particle;
      ctx.fillRect(p.x,p.y,p.size*1.5,p.size*1.5);
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();
}
/** Zone 3: drifting low fog banks, then a dense snowfall. Both are sized from the visible area. */
function drawSnowAndFog(ctx,view,time,W,H){
  const fog=MAP_FX.fog,bank=blobSprites(fog.tint,'fog');
  if(bank){
    const off=driftOffset(ctx,'fog',time,[fog.drift[0]*view.w*fog.cell[0],fog.drift[1]*view.h*fog.cell[1]],true);
    drawPatchField(ctx,view,fog,off,time/1000,()=>bank);
  }
  const snow=MAP_FX.snow,list=ambientParticles('west',time,view.w/view.u,view.h/view.u,biomeBudget(ctx,W,H,snow.max));
  const lo=snow.alpha[0],span=snow.alpha[1]-lo,BINS=4;
  ctx.fillStyle=snow.color;
  for(let b=0;b<BINS;b++){
    ctx.globalAlpha=lo+span*(b+.5)/BINS;ctx.beginPath();
    for(const p of list){
      if(Math.min(BINS-1,Math.floor((p.alpha-lo)/span*BINS))!==b)continue;
      const r=p.size*.5*view.u,px=view.x+p.x*view.u,py=view.y+p.y*view.u;
      ctx.moveTo(px+r,py);ctx.arc(px,py,r,0,Math.PI*2);
    }
    ctx.fill();
  }
  ctx.globalAlpha=1;
}

/** Zone 4: heavy slanted rain over the visible area, plus lightning: a jagged bolt and a faint whole-screen flash. */
function drawRainAndStorm(ctx,view,time,W,H){
  const R=MAP_FX.rain,u=view.u,list=ambientParticles('cyberhell',time,view.w/u,view.h/u,biomeBudget(ctx,W,H,R.max));
  const lo=R.alpha[0],span=R.alpha[1]-lo,BINS=4;
  ctx.strokeStyle=R.color;ctx.lineWidth=R.width*u;ctx.lineCap='round';
  for(let b=0;b<BINS;b++){
    ctx.globalAlpha=lo+span*(b+.5)/BINS;ctx.beginPath();
    for(const p of list){
      if(Math.min(BINS-1,Math.floor((p.alpha-lo)/span*BINS))!==b)continue;
      const px=view.x+p.x*u,py=view.y+p.y*u;
      ctx.moveTo(px,py);ctx.lineTo(px+p.dx*p.size*u,py+p.size*u);
    }
    ctx.stroke();
  }
  ctx.globalAlpha=1;
  const strike=stormStrike(time),flash=stormFlash(time);
  if(flash){ctx.globalAlpha=flash;ctx.fillStyle='#d7eaff';ctx.fillRect(view.x,view.y,view.w,view.h);}
  if(strike&&strike.age<MAP_FX.storm.boltMs){
    const fade=1-strike.age/MAP_FX.storm.boltMs,bx=view.x+view.w*strike.x,steps=9,bottom=view.y+view.h*(.5+.25*seed(strike.n+3.1));
    const pts=[[bx,view.y]];
    for(let i=1;i<=steps;i++)pts.push([bx+(seed(strike.n*13+i)-.5)*view.w*.16*(i<steps?1:.5),view.y+(bottom-view.y)*i/steps]);
    const branchAt=3+Math.floor(seed(strike.n+7.7)*3),branch=[pts[branchAt]];
    for(let i=1;i<=4;i++)branch.push([branch[0][0]+(seed(strike.n*17+i)+.15)*view.w*.05*i*(seed(strike.n+1.9)<.5?-1:1),branch[0][1]+(bottom-view.y)*.07*i]);
    ctx.lineJoin='round';
    for(const [path,widthScale] of [[pts,1],[branch,.55]]){
      ctx.beginPath();ctx.moveTo(...path[0]);for(const p of path.slice(1))ctx.lineTo(...p);
      ctx.globalAlpha=.3*fade;ctx.strokeStyle='#8fbfff';ctx.lineWidth=10*u*widthScale;ctx.stroke();
      ctx.globalAlpha=fade;ctx.strokeStyle='#f4f9ff';ctx.lineWidth=2.6*u*widthScale;ctx.stroke();
    }
  }
  ctx.globalAlpha=1;
}

// WEATHER-A extends the shared map pass. Sprites are baked once, never filtered or
// read back per frame. This pass belongs after actors and before canvas/DOM HUD.
export const WEATHER_ZONES = Object.freeze(Object.fromEntries(Object.keys(MAP_FX.cloud.tint).map(zone=>[zone,Object.freeze({tint:MAP_FX.cloud.tint[zone]})])));
export function weatherBudget({width=1440,height=900,dpr=1,reduced=false}={}) {
  if(reduced)return 0;
  // CSS viewport area, with a further high-DPR reduction. World size/zoom must
  // never multiply this budget. One budget is shared by both frontier halves.
  return Math.max(6,Math.min(36,Math.floor(36*Math.min(1,width*height/(1440*900))/Math.max(1,dpr/1.5))));
}
let weatherSprites;
const weatherClocks=new WeakMap();
const driftClocks=new WeakMap();
/** Soft "cloud" blobs, baked once per tint: unions of feathered ellipses, opaque in the core and fading to nothing
 *  well inside the canvas edge. Normalised [cx,cy,rx,ry]; three shapes so neighbouring patches differ. */
const SHADOW_SHAPES=[
  [[.50,.50,.50,.50],[.30,.56,.34,.42],[.72,.48,.34,.44],[.52,.30,.36,.34],[.46,.74,.36,.30]],
  [[.48,.52,.50,.48],[.72,.58,.34,.40],[.26,.46,.34,.42],[.60,.30,.34,.32],[.38,.74,.34,.30]],
  [[.52,.50,.48,.50],[.28,.52,.34,.40],[.76,.56,.32,.42],[.42,.28,.34,.32],[.62,.74,.34,.30]],
];
const sprites=new Map();
function blobSprites(rgb,kind='shadow'){
  const key=kind+'|'+rgb;
  if(sprites.has(key))return sprites.get(key);
  sprites.set(key,null);
  if(typeof document==='undefined')return null;
  const out=[];
  for(const shape of SHADOW_SHAPES){
    const c=document.createElement('canvas');c.width=256;c.height=160;
    const p=c.getContext('2d');if(!p||typeof p.createRadialGradient!=='function')return null;
    for(const [cx,cy,rx0,ry0] of shape){
      // Keep every feathered ellipse strictly inside the sprite so no blob is ever cut into a hard rectangular edge.
      const rx=Math.min(rx0,cx,1-cx),ry=Math.min(ry0,cy,1-cy),r=rx*256,g=p.createRadialGradient(0,0,0,0,0,r);
      if(typeof g?.addColorStop!=='function')return null;
      for(const [at,a] of MAP_FX.shadowEdge)g.addColorStop(at,`rgba(${rgb},${a})`);
      p.save();p.translate(cx*256,cy*160);p.scale(1,ry*160/r);p.fillStyle=g;p.fillRect(-r,-r,r*2,r*2);p.restore();
    }
    out.push(c);
  }
  sprites.set(key,out);return out;
}
function weatherArt(){
  if(weatherSprites)return weatherSprites;
  if(typeof document==='undefined')return null;
  const c=document.createElement('canvas');c.width=c.height=128;
  const p=c.getContext('2d'),g=p?.createRadialGradient?.(64,64,0,64,64,64);
  if(typeof g?.addColorStop!=='function')return null;
  g.addColorStop(0,'rgba(135,125,120,1)');g.addColorStop(.45,'rgba(135,125,120,.6)');g.addColorStop(1,'rgba(135,125,120,0)');
  p.fillStyle=g;p.fillRect(0,0,128,128);
  return weatherSprites={smoke:c};
}
/** Visible part of the current drawing space [0,aw]x[0,ah], in that space's units, plus `u` = units per CSS pixel.
 *  Falls back to the whole area when the canvas gives no usable transform (tests, headless stubs). */
export function viewMetrics(ctx,aw,ah){
  const m=typeof ctx.getTransform==='function'?ctx.getTransform():null,cv=ctx.canvas;
  if(!m||typeof m!=='object'||!(m.a>0)||!(m.d>0)||!(cv?.width>0)||!(cv?.height>0))return {x:0,y:0,w:aw,h:ah,u:1};
  const x0=Math.max(0,-m.e/m.a),y0=Math.max(0,-m.f/m.d),x1=Math.min(aw,(cv.width-m.e)/m.a),y1=Math.min(ah,(cv.height-m.f)/m.d);
  if(!(x1>x0&&y1>y0))return null;
  const css=cv.clientWidth||cv.width/(globalThis.devicePixelRatio||1);
  return {x:x0,y:y0,w:x1-x0,h:y1-y0,u:(cv.width/css)/m.a};
}
/** Wind offset of a drifting field, integrated per canvas so pausing holds it and zooming never makes it jump. */
function driftOffset(ctx,key,time,rate,advance){
  let all=driftClocks.get(ctx);if(!all){all=Object.create(null);driftClocks.set(ctx,all);}
  const c=all[key]||(all[key]={last:time,x:0,y:0});
  const dt=Math.min(250,Math.max(0,time-c.last));c.last=time;
  if(advance){c.x+=rate[0]*dt/1000;c.y+=rate[1]*dt/1000;}
  return c;
}
const cellHash=(i,j,k)=>seed(i*73.13+j*191.7+k*17.31+.5);
/** A drifting lattice of soft patches: a checkerboard of cells (so some patch is always in view) plus rare extras,
 *  each jittered and sized per cell. World-anchored: patches stay on the ground when the camera pans. */
function drawPatchField(ctx,view,spec,off,t,bankAt){
  const cw=view.w*spec.cell[0],ch=view.h*spec.cell[1];
  const i0=Math.floor((view.x-off.x)/cw)-1,i1=Math.ceil((view.x+view.w-off.x)/cw)+1;
  const j0=Math.floor((view.y-off.y)/ch)-1,j1=Math.ceil((view.y+view.h-off.y)/ch)+1;
  for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){
    if(mod(i+j,2)&&cellHash(i,j,1)>spec.oddFill)continue;
    const bank=bankAt((i+.5)*cw+off.x),sprite=bank?.[Math.floor(cellHash(i,j,2)*3)%3];
    if(!sprite)continue;
    const cx=off.x+(i+.5+(cellHash(i,j,3)-.5)*2*spec.jitter)*cw,cy=off.y+(j+.5+(cellHash(i,j,4)-.5)*2*spec.jitter)*ch;
    const f=spec.spread[0]+cellHash(i,j,5)*(spec.spread[1]-spec.spread[0]),breath=1+spec.breathe*Math.sin(t*.07+cellHash(i,j,6)*6.28);
    const pw=view.w*spec.size[0]*f*breath,ph=view.h*spec.size[1]*(spec.spread[0]+cellHash(i,j,7)*(spec.spread[1]-spec.spread[0]))*breath;
    if(cx+pw/2<view.x||cx-pw/2>view.x+view.w||cy+ph/2<view.y||cy-ph/2>view.y+view.h)continue;
    ctx.globalAlpha=spec.peak*(.88+.12*cellHash(i,j,8));
    ctx.drawImage(sprite,cx-pw/2,cy-ph/2,pw,ph);
  }
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
  // Cloud shadows come last in the actor pass, so floor, buildings and characters darken together;
  // labels are clipped out above and HUD buttons are DOM layers on top of this canvas.
  const view=viewMetrics(ctx,W,H),cloud=MAP_FX.cloud;
  if(view){
    const off=driftOffset(ctx,'cloud',time,[cloud.drift[0]*view.w*cloud.cell[0],cloud.drift[1]*view.h*cloud.cell[1]],!reduced&&!paused);
    const bankAt=cx=>blobSprites((WEATHER_ZONES[(halves.find(r=>cx>=r.from*W&&cx<r.to*W)||halves[0]).zone]||{tint:cloud.fallbackTint}).tint);
    drawPatchField(ctx,view,cloud,off,t,bankAt);
    ctx.globalAlpha=1;
  }
  for(const region of halves){
    const style=WEATHER_ZONES[region.zone];if(!style)continue;
    const left=region.from*W,rw=(region.to-region.from)*W;
    ctx.save();ctx.beginPath();ctx.rect(left,0,rw,H);ctx.clip();
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
