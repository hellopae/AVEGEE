import { drawH3Surfaces, h3SurfaceContains, prepareH3SurfaceTracks } from './map-fx-h3.js';
import { zoneStyle } from './scene-style.js';
// Decorative motion over painted map art. Never changes collision or gameplay state.
const cache = new WeakMap();
const frac = n => n - Math.floor(n);
const seed = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
const mod = (n, d) => ((n % d) + d) % d;

export function ambientPixelKind(r, g, b, y, zone, x = .5) {
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
  if (reduced) return;
  const masks=masksFor(bg,zone);if(!masks)return;
  if(zone==='th'||zone==='asia'){
    ctx.save();
    for(const kind of ['water','lava'])masked(ctx,masks,kind,W,H,c=>drawH3Surfaces(c,zone,kind,time,W,H,masks.tracks[kind]));
    ctx.restore();return;
  }
  const t=time/1000;
  ctx.save();
  masked(ctx,masks,'water',W,H,c=>{
    c.lineWidth=2;c.lineCap='round';
    for(let i=0;i<100;i++){
      const x=mod(seed(i+9)*W+t*(18+seed(i+60)*16),W+70)-35;
      const y=(zone==='west'?.15:.745)*H+seed(i+40)*(zone==='west'?.85:.25)*H+Math.sin(t*1.5+i)*3;
      const size=12+seed(i+80)*26;
      c.strokeStyle=`rgba(${zone==='th'?'202,185,233':'139,241,255'},${.24+seed(i+5)*.22})`;
      c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+size*.5,y-4,x+size,y);c.stroke();
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

export function ambientParticles(zone, time, W, H) {
  const t=time/1000, count=zone==='west'?90:zone==='asia'?20:zone==='th'?30:26;
  return Array.from({length:count},(_,i)=>{
    const speed=zone==='west'?12+seed(i+4)*25:zone==='asia'?9+seed(i+4)*13:-10-seed(i+4)*18;
    const drift=zone==='west'?14:zone==='asia'?11:3;
    return {x:mod(seed(i+4)*W+t*drift+Math.sin(t*.5+i)*12,W),
      y:mod(seed(i+80)*H+t*speed,H),size:zone==='west'?1+seed(i+16)*2.4:1.5+seed(i+16)*2,
      alpha:.18+seed(i+30)*.32,angle:t*.7+i};
  });
}

/** Sparse snow, petals, ash and occasional server sparks; bounded work each frame. */
export function drawMapAmbientSky(ctx, zone, time, W, H, reduced = false) {
  if(reduced)return;
  ctx.save();
  for(const p of ambientParticles(zone,time,W,H)){
    ctx.globalAlpha=p.alpha;
    ctx.fillStyle=zoneStyle(zone).particle;
    ctx.fillRect(p.x,p.y,p.size*1.5,p.size*1.5);
  }
  ctx.globalAlpha=1;
  if(zone==='west'){
    ctx.fillStyle='rgba(161,191,211,.035)';
    for(let i=0;i<3;i++){
      const x=mod(time*.012+i*W/3,W),y=H*(.44+i*.13);
      ctx.beginPath();ctx.ellipse(x,y,W*.17,H*.025,0,0,Math.PI*2);ctx.fill();
    }
  }
  if(zone==='cyberhell'){
    const t=time/1000;
    for(const [i,point] of [[.09,.24],[.23,.19],[.72,.25],[.79,.31],[.86,.59],[.06,.51]].entries()){
      const phase=mod(t+i*.71,4.5);if(phase>.18)continue;
      const x=point[0]*W,y=point[1]*H;
      ctx.strokeStyle=`rgba(174,229,255,${.55*(1-phase/.18)})`;ctx.lineWidth=1.6;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+5,y-8);ctx.lineTo(x+9,y-3);ctx.lineTo(x+15,y-15);ctx.stroke();
    }
  }
  ctx.restore();
}
