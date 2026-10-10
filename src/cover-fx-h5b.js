// H5b: registered 688×384 masks (img/cover-fx/*-v4-mask.png) traced from cover-v4-full.png by scripts/h5b-cover-masks-v4.py. No video ownership.
export const COVER_FX_SIZE = Object.freeze([688, 384]);
export const COVER_FX_KINDS = Object.freeze(['lava', 'fire', 'volcano', 'soul']);
export const COVER_FX_BUDGET = Object.freeze({lava:64, fire:40, volcano:24, soul:0});
const frac = n => n - Math.floor(n);
const seed = n => frac(Math.sin(n * 127.1 + 311.7) * 43758.5453);
export function coverFit(width, height) {
  const scale = Math.max(width / 1376, height / 768);
  return {scale, x:(width - 1376 * scale) / 2, y:(height - 768 * scale) / 2};
}
/** Cache anchors once; no pixel reads or allocations of canvases in the frame loop. */
export function coverTracks(data, kind) {
  const points = [];
  const [w,h] = COVER_FX_SIZE;
  for (let y=0; y<h; y+=3) for (let x=0; x<w; x+=3)
    if (data[(y*w+x)*4+3]) points.push([x,y]);
  return points.length ? Array.from({length:COVER_FX_BUDGET[kind]}, (_,i) =>
    points[Math.floor(seed(i+31)*points.length)]) : [];
}
export function drawCoverLayer(c, kind, seconds, tracks) {
  const [w,h] = COVER_FX_SIZE, t = seconds;
  c.lineCap = 'round';
  for (const [i,[x,y]] of tracks.entries()) {
    const age = frac(t*(kind==='lava'?.12:.28)+seed(i+77));
    c.strokeStyle = `rgba(255,225,121,${Math.sin(age*Math.PI)*.17})`;
    c.lineWidth = 1;
    c.beginPath();
    if (kind==='lava') {
      // Lower river moves horizontally; cliff curtains flow down.
      const fall = x>w*.70 && y<h*.80;
      const dx = fall ? 0 : (age-.5)*9, dy = fall ? age*10 : Math.sin(t+i)*.7;
      c.moveTo(x+dx,y+dy); c.lineTo(x+dx+(fall?0:7),y+dy+(fall?5:0));
    } else {
      // Subpixel sway and upward embers, all clipped back to the painted fire.
      const dx = Math.sin(t*2+i)*1.2, rise = age*(kind==='fire'?9:5);
      c.moveTo(x+dx,y-rise); c.lineTo(x+dx+.5,y-rise+2);
    }
    c.stroke();
    if (kind==='lava' && i%8===0) {
      c.strokeStyle = `rgba(255,240,157,${(1-age)*.12})`;
      c.beginPath(); c.ellipse(x,y,1+age*2.5,.5+age,0,0,Math.PI*2); c.stroke();
    }
    if (kind==='volcano' && i%4===0) {
      // A quiet warm smoke shimmer inside the traced crater/plume only.
      c.fillStyle = `rgba(239,135,98,${(1-age)*.035})`;
      c.beginPath(); c.ellipse(x+Math.sin(t+i),y-age*3,3+age*4,2+age*2,0,0,Math.PI*2); c.fill();
    }
  }
}
const unionCache = new WeakMap();
export function drawCoverFrame(c, scratch, layers, seconds, fade=1) {
  const [w,h] = COVER_FX_SIZE;
  if (unionCache.get(scratch) !== layers) {
    scratch.globalCompositeOperation='source-over';
    scratch.clearRect(0,0,w,h);
    for (const {kind,mask} of layers) if (kind!=='soul') scratch.drawImage(mask,0,0,w,h);
    unionCache.set(scratch,layers);
  }
  c.globalCompositeOperation='source-over';
  c.clearRect(0,0,w,h);
  const opacity = Math.max(0,Math.min(1,fade));
  c.globalAlpha=opacity;
  for (const {kind,tracks} of layers) drawCoverLayer(c,kind,seconds,tracks);
  // Clip moving marks once to fire/lava/crater only; never animate a soul's surface.
  c.globalAlpha=1;
  c.globalCompositeOperation='destination-in';
  c.imageSmoothingEnabled=false;
  c.drawImage(scratch.canvas,0,0);
  c.globalCompositeOperation='source-over';
  for (const {kind,mask} of layers) {
    // Reuse the painted shape for a very small luminance pulse. Soul stays fixed.
    const pulse=.5+.5*Math.sin(seconds*(kind==='soul'?.85:1.4));
    c.globalAlpha=opacity*(.012+.035*pulse);
    c.drawImage(mask,0,0,w,h);
  }
  c.globalAlpha=1;
  c.globalCompositeOperation='source-over';
}
export function coverFxActive(title, doc, motion) {
  return title.classList.contains('cover-settled') && !title.classList.contains('gone') &&
    !title.hidden && title.style.display !== 'none' && !doc.hidden && !motion.matches;
}
/** Own only the new canvas; observe H5a's event/class and the title's existing exit. */
export function installCoverFx(doc=document, win=window) {
  const title = doc.getElementById('title'), canvas = doc.getElementById('cover-fx-h5b');
  if (!title || !canvas) return () => {};
  const motion = win.matchMedia('(prefers-reduced-motion: reduce)');
  const c = canvas.getContext('2d');
  if (!c) return () => {};
  const scratchCanvas = doc.createElement('canvas');
  [canvas.width,canvas.height] = [scratchCanvas.width,scratchCanvas.height] = COVER_FX_SIZE;
  const scratch = scratchCanvas.getContext('2d');
  if (!scratch) return () => {};
  let raf=0, layers=null, loading=null, start=0, disposed=false, failed=false;
  const active = () => !disposed && coverFxActive(title,doc,motion);
  const clear = () => { win.cancelAnimationFrame(raf); raf=0; c.clearRect(0,0,...COVER_FX_SIZE); };
  const tick = now => {
    raf=0;
    if (!active()) { clear(); return; }
    drawCoverFrame(c,scratch,layers,(now-start)/1000,(now-start)/500);
    raf=win.requestAnimationFrame(tick);
  };
  const load = () => Promise.all(COVER_FX_KINDS.map(kind => new Promise((resolve,reject) => {
    const mask = new win.Image();
    mask.onload = () => {
      try {
        scratch.clearRect(0,0,...COVER_FX_SIZE);
        scratch.globalCompositeOperation='source-over'; scratch.drawImage(mask,0,0);
        const tracks = coverTracks(scratch.getImageData(0,0,...COVER_FX_SIZE).data,kind);
        resolve({kind,mask,tracks});
      } catch (e) { reject(e); }
    };
    mask.onerror=reject;
    mask.src=`img/cover-fx/${kind}-v4-mask.png`;
  })));
  const sync = () => {
    if (!active()) { clear(); return; }
    if (failed) return;
    if (!layers) {
      if (!loading) loading=load().then(value => { layers=value; sync(); }).catch(() => {
        failed=true; clear(); // The existing still remains usable if an optional mask fails.
      });
      return;
    }
    if (!raf) { start=win.performance.now(); raf=win.requestAnimationFrame(tick); }
  };
  const observer = new win.MutationObserver(sync);
  observer.observe(title,{attributes:true,attributeFilter:['class','hidden','style']});
  doc.addEventListener('avegee:cover-settled',sync);
  doc.addEventListener('visibilitychange',sync);
  motion.addEventListener('change',sync);
  sync();
  return () => {
    disposed=true; clear(); observer.disconnect();
    doc.removeEventListener('avegee:cover-settled',sync);
    doc.removeEventListener('visibilitychange',sync);
    motion.removeEventListener('change',sync);
  };
}
if (typeof document !== 'undefined') installCoverFx();
