// Animate only the cover's hot environment; characters stay exactly as illustrated.
export function coverPlacement(width, height, imageWidth, imageHeight) {
  const scale = Math.max(width / imageWidth, height / imageHeight);
  return { scale, x:(width-imageWidth*scale)/2, y:(height-imageHeight*scale)/2 };
}
export function createCoverAtmosphere(canvas) {
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let image, lava, running = false, frame = 0, last = 0;
  const fires = [[.018,.32,.030],[.192,.265,.022],[.431,.277,.019],[.594,.404,.023],[.635,.42,.035],[.958,.342,.025]];
  function setImage(source) {
    image = source;
    lava = document.createElement('canvas');
    lava.width = 1280; lava.height = Math.round(1280 * source.naturalHeight/source.naturalWidth);
    const lc = lava.getContext('2d', {willReadFrequently:true});
    lc.drawImage(source,0,0,lava.width,lava.height);
    const pixels = lc.getImageData(0,0,lava.width,lava.height);
    for (let i=0; i<pixels.data.length; i+=4) {
      const x = (i/4 % lava.width)/lava.width, y = Math.floor(i/4/lava.width)/lava.height;
      const environment = (x<.32 && y>.64) || (x>.68 && y>.43) || (x>.65 && x<.79 && y<.4);
      const [r,g,b] = pixels.data.subarray(i,i+3);
      // Fire and molten orange only, never ghost blues, rocks or central characters.
      pixels.data[i+3] = environment && r>195 && g>65 && g<245 && b<115 && r>g*1.12 ? 190 : 0;
    }
    lc.putImageData(pixels,0,0);
  }
  function draw(now) {
    if (!running) return;
    frame = requestAnimationFrame(draw);
    if (!image || document.hidden || now-last<33) return;
    last=now;
    const w=canvas.clientWidth, h=canvas.clientHeight, dpr=Math.min(devicePixelRatio || 1,1.5);
    if (canvas.width!==Math.round(w*dpr) || canvas.height!==Math.round(h*dpr)) {
      canvas.width=Math.round(w*dpr); canvas.height=Math.round(h*dpr);
    }
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,w,h);
    const p=coverPlacement(w,h,image.naturalWidth,image.naturalHeight);
    ctx.translate(p.x,p.y); ctx.scale(p.scale,p.scale);
    const iw=image.naturalWidth, ih=image.naturalHeight, t=now/1000;
    ctx.globalCompositeOperation='screen';
    ctx.globalAlpha=.30+.08*Math.sin(t*1.7);
    const unit=iw/lava.width;
    for(let row=0;row<lava.height;row+=10) {
      const dy=Math.min(10,lava.height-row), drift=Math.sin(row*.07-t*2.1)*2.8;
      ctx.drawImage(lava,0,row,lava.width,dy,drift,row*unit,iw,dy*unit);
    }
    for (let i=0;i<fires.length;i++) {
      const [x,y,size]=fires[i], radius=size*iw, sway=Math.sin(t*3+i)*radius*.12;
      const baseX=x*iw, baseY=y*ih, tall=radius*(1.65+.22*Math.sin(t*4.2+i));
      const glow=ctx.createRadialGradient(baseX,baseY,0,baseX,baseY,radius*1.8);
      glow.addColorStop(0,'rgba(255,105,8,.26)');glow.addColorStop(1,'rgba(255,50,0,0)');
      ctx.globalAlpha=.6;ctx.fillStyle=glow;ctx.fillRect(baseX-radius*2,baseY-radius*2,radius*4,radius*4);
      const color=ctx.createLinearGradient(0,baseY,0,baseY-tall);
      color.addColorStop(0,'rgba(255,205,40,.75)'); color.addColorStop(.55,'rgba(255,96,0,.42)'); color.addColorStop(1,'rgba(255,45,0,0)');
      ctx.globalAlpha=.65;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(baseX-radius*.35,baseY);
      ctx.bezierCurveTo(baseX-radius*.7,baseY-tall*.4,baseX+sway,baseY-tall*.65,baseX+sway+radius*.16,baseY-tall);
      ctx.bezierCurveTo(baseX+radius*.3,baseY-tall*.45,baseX+radius*.5,baseY-tall*.3,baseX+radius*.35,baseY);ctx.fill();
    }
    // Gentle rising sparks, limited to the lava banks and torch area.
    ctx.globalAlpha=.7;ctx.fillStyle='#ffc34c';
    for(let i=0;i<32;i++) {
      const life=(t*(.07+(i%5)*.009)+i*.618)%1;
      const x=(i%2 ? .72+(i%9)*.028 : .04+(i%9)*.026)*iw + Math.sin(t+i)*6;
      const y=(.95-life*.35)*ih;
      ctx.globalAlpha=Math.sin(life*Math.PI)*.65;ctx.fillRect(x,y,1.5+(i%3),2+(i%3));
    }
    ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
  }
  function pause() { running=false;cancelAnimationFrame(frame); }
  function play() { if (!ctx || motion.matches || running) return Promise.resolve(); running=true;frame=requestAnimationFrame(draw);return Promise.resolve(); }
  motion.addEventListener('change',()=>{ if(motion.matches){pause();ctx?.clearRect(0,0,canvas.width,canvas.height);} });
  return {setImage,play,pause};
}
