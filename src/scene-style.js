// Shared 2.5D art contract: feet are anchors; light falls from upper left.
export const ZONE_STYLE = Object.freeze({
  th: { light: '255,173,79', particle: '#ffc674', weather: 'embers', fog: false },
  asia: { light: '255,192,105', particle: '#ecf4ff', weather: 'snow', fog: false },
  west: { light: '154,211,244', particle: '#c1dce8', weather: 'mist', fog: true },
  cyberhell: { light: '152,133,255', particle: '#a4eaff', weather: 'signal', fog: false },
});
export const zoneStyle = zone => ZONE_STYLE[zone] || ZONE_STYLE.th;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/** Camera only pans when cover scaling makes the painted world exceed the viewport. */
export function followCamera(previous, viewport, world, player, dt = 16, reduced = false) {
  const target = {
    ox: clamp(viewport.w / 2 - player.x * world.w, Math.min(0, viewport.w - world.w), 0),
    oy: clamp(viewport.h / 2 - player.y * world.h, Math.min(0, viewport.h - world.h), 0),
    w: world.w, h: world.h,
  };
  if (!previous || previous.w !== world.w || previous.h !== world.h || reduced) return target;
  const blend = 1 - Math.exp(-clamp(dt, 0, 250) / 130);
  return { ...target,
    ox: clamp(previous.ox + (target.ox - previous.ox) * blend, Math.min(0, viewport.w - world.w), 0),
    oy: clamp(previous.oy + (target.oy - previous.oy) * blend, Math.min(0, viewport.h - world.h), 0) };
}

/** Small nested ellipses avoid shadowBlur/filter work on large canvases. */
export function drawContactShadow(ctx, x, y, h) {
  ctx.save();
  for (const [scale, alpha] of [[1.15,.09],[.9,.14],[.6,.20]]) {
    ctx.fillStyle = `rgba(9,5,13,${alpha})`;
    ctx.beginPath(); ctx.ellipse(x+h*.018,y+h*.012,h*.24*scale,h*.075*scale,0,0,Math.PI*2); ctx.fill();
  }
  ctx.restore();
}

const glows = new Map();
export function drawLocalLight(ctx, zone, x, y, radius, time = 0, reduced = false) {
  if (!(radius > 0)) return;
  const style = zoneStyle(zone);
  let sprite = glows.get(style.light);
  if (!sprite) {
    sprite = document.createElement('canvas'); sprite.width = sprite.height = 96;
    const c = sprite.getContext('2d'), gradient = c?.createRadialGradient?.(48,48,0,48,48,48);
    if (!gradient) return;
    gradient.addColorStop(0,`rgba(${style.light},.22)`);
    gradient.addColorStop(.35,`rgba(${style.light},.09)`);
    gradient.addColorStop(1,`rgba(${style.light},0)`);
    c.fillStyle = gradient; c.fillRect(0,0,96,96); glows.set(style.light,sprite);
  }
  ctx.save(); ctx.globalAlpha = reduced ? .8 : .8 + .12*Math.sin(time/650+x);
  ctx.drawImage(sprite,x-radius,y-radius,radius*2,radius*2); ctx.restore();
}

const frac = n => n - Math.floor(n);
const seed = n => frac(Math.sin(n*127.1+311.7)*43758.5453);
const mod = (n,d) => ((n%d)+d)%d;
/** Two atmospheric layers per frontier: a gate light and sparse zone weather. */
export function drawFrontierAtmosphere(ctx, zone, box, time, reduced = false) {
  drawLocalLight(ctx,zone,box.ox+box.w*.5,box.oy+box.h*.19,Math.min(box.w,box.h)*.13,time,reduced);
  if (reduced) return;
  const style = zoneStyle(zone), t = time/1000, U = Math.min(box.w,box.h);
  ctx.save();
  if (style.fog) {
    ctx.fillStyle = 'rgba(168,193,211,.035)';
    for(let i=0;i<3;i++) {
      const x=box.ox+mod(seed(i+2)*box.w+t*U*.018,box.w),y=box.oy+box.h*(.44+i*.15);
      ctx.beginPath();ctx.ellipse(x,y,U*.25,U*.035,0,0,Math.PI*2);ctx.fill();
    }
  } else {
    for(let i=0;i<24;i++) {
      const x=box.ox+mod(seed(i+9)*box.w+t*U*.012,box.w);
      const y=box.oy+mod(seed(i+44)*box.h+t*U*(style.weather==='snow'?.025:-.018),box.h);
      ctx.globalAlpha=.15+seed(i+13)*.25;ctx.fillStyle=style.particle;
      const size=U*(.0015+seed(i+27)*.0015);
      ctx.fillRect(x,y,size,style.weather==='signal'?size*3:size);
    }
    if (zone==='th') {
      // Low smoke rising from the painted entrance, kept behind the actors.
      ctx.fillStyle='rgba(132,111,101,.05)';ctx.globalAlpha=1;
      for(let i=0;i<5;i++) {
        const age=mod(t*.16+i/5,1),x=box.ox+box.w*(.5+Math.sin(t+i)*.012);
        ctx.beginPath();ctx.ellipse(x,box.oy+box.h*(.19-age*.08),U*(.01+age*.02),U*.012,0,0,Math.PI*2);ctx.fill();
      }
    }
  }
  ctx.restore();
}
