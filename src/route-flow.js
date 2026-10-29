import {decodeFlow,createFlowEngine} from './town-flow.js';
import {weatherEnabled,biomeBudget} from './map-ambient.js?v=mapfx-k1d';
// Route-local field/clock; no town engine, town floor or global zone mutation.
export function createRouteFlow(url) {
  let engine=null,last=null,dead=false;
  const image=new Image();
  image.onload=()=>{
    if(dead)return;
    const c=document.createElement('canvas');c.width=image.naturalWidth;c.height=image.naturalHeight;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
    const field=decodeFlow(ctx.getImageData(0,0,c.width,c.height).data,c.width,c.height);
    field.unitX=1672/c.width;field.unitY=941/c.height;
    engine=createFlowEngine(field,{maxParticles:180,floorAt:()=>false});
  };
  image.src=url;
  return {
    draw(ctx,{time,reduced,paused=false,x,y,w,h,width,height}){
      const dt=last===null?.016:Math.max(0,Math.min(.05,(time-last)/1000));last=time;
      if(dead||!engine||reduced||!weatherEnabled())return;
      const sx=w/1672,sy=h/941;
      const view={x0:Math.max(0,-x/sx),y0:Math.max(0,-y/sy),x1:Math.min(1672,(width-x)/sx),y1:Math.min(941,(height-y)/sy)};
      if(!paused)engine.update(dt,view,biomeBudget(ctx,w,h,180));
      ctx.save();ctx.translate(x,y);ctx.scale(sx,sy);engine.draw(ctx,sx,time);ctx.restore();
    },
    destroy(){dead=true;image.onload=image.onerror=null;engine=null;}
  };
}
