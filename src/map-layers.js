// Normalized art coordinates; gameplay/collision always stays in world space.
export function layerRect(layer, camera, viewport) {
  const [x,y,w,h]=layer.rect||[0,0,1,1];
  const p=layer.parallax??1;
  if(layer.space==='world'&&p!==1)throw new Error('World geometry cannot use parallax');
  return {x:camera.x*p+x*viewport.w,y:camera.y*p+y*viewport.h,w:w*viewport.w,h:h*viewport.h};
}
export function createMapLayers(layers,{loadImage=url=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=url;})}={}) {
  const ids=new Set();
  for(const l of layers){
    if(!l.id||ids.has(l.id))throw new Error('Layer IDs must be unique');
    ids.add(l.id);
    if(l.space==='world'&&(l.parallax??1)!==1)throw new Error('World geometry cannot use parallax');
    if(l.motion&&!l.clip)throw new Error('Moving textures require a fixed material clip');
  }
  const images=new Map(),errors=[];let destroyed=false,elapsed=0,last=null;
  // Sequential loading bounds decode pressure and avoids loading the complete map atlas at once.
  const ready=(async()=>{for(const l of layers){if(destroyed)break;try{const im=await loadImage(l.src);if(!destroyed)images.set(l.id,im);}catch{errors.push(l.id);}}})();
  return {
    ready,errors,
    tick(time,{paused=false,reduced=false}={}){if(last!==null&&!paused&&!reduced)elapsed+=Math.max(0,Math.min(50,time-last));last=time;},
    draw(ctx,{camera,viewport,phase='back',visible=()=>true,reduced=false}){
      if(destroyed)return;
      for(const l of layers){
        if((l.phase||'back')!==phase||!visible(l.id))continue;
        const im=images.get(l.id);if(!im)continue;
        const r=layerRect(l,camera,viewport);
        ctx.save();
        try{
          ctx.globalAlpha=l.opacity??1;
          if(l.clip){ctx.beginPath();l.clip.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](camera.x+x*viewport.w,camera.y+y*viewport.h));ctx.closePath();ctx.clip();}
          const blit=(x,y,w,h)=>{
            if(l.source){const [sx,sy,sw,sh]=l.source;ctx.drawImage(im,sx*im.naturalWidth,sy*im.naturalHeight,sw*im.naturalWidth,sh*im.naturalHeight,x,y,w,h);}
            else ctx.drawImage(im,x,y,w,h);
          };
          if(l.motion&&!reduced){
            const dx=((elapsed/1000*(l.motion[0]||0))%r.w+r.w)%r.w;
            const dy=((elapsed/1000*(l.motion[1]||0))%r.h+r.h)%r.h;
            // Repeat under a fixed bank mask. The bank and walkable floor never move.
            for(let x=-1;x<=0;x++)for(let y=-1;y<=0;y++)blit(r.x+dx+x*r.w,r.y+dy+y*r.h,r.w,r.h);
          }else blit(r.x,r.y,r.w,r.h);
        }finally{ctx.restore();}
      }
    },
    destroy(){destroyed=true;images.clear();},
  };
}
