import {drawBiomeWeather,drawMapWeather,weatherBudget,weatherEnabled,weatherViewport} from './map-ambient.js?v=mapfx-k1d';
import {BORDER12_TREES} from './frontier-walkmask-th-asia-b12.js';
// Small world-space props and animation over the painted frontier road.
// M2 R1: the Zone 1-2 trees / waterfalls are the ambient column of its ROUTE_GEOMETRY row; kept exported for tests and as the defaults.
export const FRONTIER_TREES=BORDER12_TREES;
export const FRONTIER_WATERFALLS=Object.freeze([[.435,.215,.08],[.423,.34,.045],[.37,.46,.065],[.35,.565,.07],[.32,.69,.065],[.94,.86,.10]]);
export function drawFrontierAmbient(ctx,{time=0,reduced=false,x=0,y=0,w,h,tree=null,trees=FRONTIER_TREES,waterfalls=FRONTIER_WATERFALLS,leafArea=[0,0,1,1],snowArea=null,rainArea=null}) {
  const budget=weatherBudget({...weatherViewport(ctx),reduced});
  ctx.save();ctx.translate(x,y);ctx.scale(w,h);
  for(const item of trees){
    const [tx,ty]=Array.isArray(item)?item:[item.x,item.y];
    const size=item.big?1.4:1;
    // Quiet ground shadow follows the map's upper-left light. Contact stays at the
    // authored root: the old offset ellipse left a visible gap under small trees.
    ctx.fillStyle='rgba(24,31,33,.10)';ctx.beginPath();ctx.ellipse(tx+.005*size,ty+.003*size,.011*size,.003*size,.3,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(18,26,27,.18)';ctx.beginPath();ctx.ellipse(tx,ty,.0048*size,.0018*size,0,0,Math.PI*2);ctx.fill();
    if(tree?.complete&&tree.naturalWidth){const th=.052,tw=th*tree.naturalWidth/tree.naturalHeight*h/w;ctx.drawImage(tree,tx-tw/2,ty-th,tw,th);}
  }
  if(!reduced && weatherEnabled()){
    for(const [wx,wy,length] of waterfalls){
      ctx.fillStyle='rgba(157,212,229,.12)';ctx.fillRect(wx-.003,wy,.006,length);
      for(let i=0;i<6;i++){
        const u=(time/1400+i/6)%1;
        ctx.fillStyle=`rgba(217,242,245,${.08+.08*Math.sin(u*Math.PI)})`;
        ctx.fillRect(wx-.0025,wy+u*length,.005,Math.min(.012,(1-u)*length));
      }
      for(let i=0;i<3;i++){
        const u=(time/1800+i/3)%1;
        ctx.strokeStyle=`rgba(215,242,246,${.25*(1-u)})`;ctx.lineWidth=.001;
        ctx.beginPath();ctx.ellipse(wx,wy+length,.002+u*.006,.001+u*.002,0,0,Math.PI*2);ctx.stroke();
      }
    }
    if(leafArea)for(let i=0;i<Math.min(26,budget);i++){
      const [x0,y0,x1,y1]=leafArea,px=x0+((i*.173+time*.000009)%1)*(x1-x0),py=y0+((i*.109+time*.000021)%1)*(y1-y0);
      ctx.save();ctx.translate(px,py);ctx.rotate(time/900+i);ctx.fillStyle=i%2?'rgba(223,153,58,.65)':'rgba(135,176,100,.55)';ctx.beginPath();ctx.moveTo(-.002,0);ctx.quadraticCurveTo(0,-.003,.003,0);ctx.quadraticCurveTo(0,.002,-.002,0);ctx.fill();ctx.restore();
    }

  }
  ctx.restore();
  if(reduced || !weatherEnabled() || !(snowArea || rainArea))return;
  ctx.save();ctx.translate(x,y);
  if(snowArea)drawBiomeWeather(ctx,'west',time,w,h,reduced,snowArea);
  if(rainArea)drawBiomeWeather(ctx,'cyberhell',time,w,h,reduced,rainArea);
  ctx.restore();
}

/** Tree roots share the actor depth sort; size is measured against background height. */
export function drawFrontierTree(ctx,tree,{x,y,height,image,anchor=[.5,1]}) {
  if(!image?.complete||!image.naturalWidth)return;
  const h=height*.052*(tree.big?1.4:1),w=h*image.naturalWidth/image.naturalHeight;
  ctx.drawImage(image,x-w*anchor[0],y-h*anchor[1],w,h);
}

/** Post-actor weather uses the same camera as the existing frontier scenery. */
export function drawFrontierWeather(ctx,{routeId,time,reduced,x,y,w,h,viewport,enabled,paused=false}) {
  const regions=routeId==='th:asia'?[{zone:'th',from:0,to:.48},{zone:'asia',from:.48,to:1}]:
    routeId==='asia:west'?[{zone:'asia',from:0,to:.44},{zone:'west',from:.48,to:1}]:null;
  if(!regions)return;
  // Frontier 1–2 has no authored flame anchors; never invent fires on its road.
  drawMapWeather(ctx,{time,paused,reduced,x,y,W:w,H:h,viewport,regions,enabled});
}
