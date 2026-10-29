import {drawMapWeather,weatherBudget,weatherViewport} from './map-ambient.js?v=mapfx-k1d';
import {FRONTIER_OWNER_TREES} from './frontier-walkmask-th-asia.js';
// Small world-space props and animation over the painted frontier road.
// M2 R1: the Zone 1-2 trees / waterfalls are the ambient column of its ROUTE_GEOMETRY row; kept exported for tests and as the defaults.
export const FRONTIER_TREES=FRONTIER_OWNER_TREES;
export const FRONTIER_WATERFALLS=Object.freeze([[.435,.215,.08],[.423,.34,.045],[.37,.43,.075],[.35,.565,.07],[.32,.69,.065],[.94,.86,.10]]);
export function drawFrontierAmbient(ctx,{time=0,reduced=false,x=0,y=0,w,h,tree=null,trees=FRONTIER_TREES,waterfalls=FRONTIER_WATERFALLS,leafArea=[0,0,1,1],snowArea=null}) {
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
  if(!reduced){
    // Narrow translucent strokes follow the waterfall channels; banks stay visible.
    ctx.lineCap='round';ctx.lineWidth=.0011;
    if(waterfalls.length)for(let i=0;i<18;i++){const u=((time/900+i*.137)%1),[wx,wy,length]=waterfalls[i%waterfalls.length],rx=wx+(i%3-1)*.003,ry=wy+u*length;ctx.strokeStyle=`rgba(205,250,255,${.12+.12*Math.sin(u*Math.PI)})`;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+.001,ry+.009);ctx.stroke();}
    if(leafArea)for(let i=0;i<Math.min(26,budget);i++){
      const [x0,y0,x1,y1]=leafArea,px=x0+((i*.173+time*.000009)%1)*(x1-x0),py=y0+((i*.109+time*.000021)%1)*(y1-y0);
      ctx.save();ctx.translate(px,py);ctx.rotate(time/900+i);ctx.fillStyle=i%2?'rgba(223,153,58,.65)':'rgba(135,176,100,.55)';ctx.beginPath();ctx.moveTo(-.002,0);ctx.quadraticCurveTo(0,-.003,.003,0);ctx.quadraticCurveTo(0,.002,-.002,0);ctx.fill();ctx.restore();
    }
    if(snowArea){
      const [x0,y0,x1,y1]=snowArea;
      for(let i=0;i<Math.min(48,budget*2);i++){
        const px=x0+((i*.173+time*.000007)%1)*(x1-x0),py=y0+((i*.109+time*.000019)%1)*(y1-y0);
        ctx.fillStyle=`rgba(225,244,255,${.28+(i%4)*.08})`;
        ctx.beginPath();ctx.arc(px,py,.0008+(i%3)*.0003,0,Math.PI*2);ctx.fill();
      }
    }
  }
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
