import {FRONTIER_OWNER_TREES} from './frontier-walkmask-th-asia.js';
// Small world-space props and animation over the painted frontier road.
// M2 R1: the Zone 1-2 trees / waterfalls are the ambient column of its ROUTE_GEOMETRY row; kept exported for tests and as the defaults.
export const FRONTIER_TREES=FRONTIER_OWNER_TREES;
export const FRONTIER_WATERFALLS=Object.freeze([[.435,.215,.08],[.423,.34,.045],[.37,.43,.075],[.35,.565,.07],[.32,.69,.065],[.94,.86,.10]]);
export function drawFrontierAmbient(ctx,{time=0,reduced=false,x=0,y=0,w,h,tree=null,trees=FRONTIER_TREES,waterfalls=FRONTIER_WATERFALLS}) {
  ctx.save();ctx.translate(x,y);ctx.scale(w,h);
  for(const item of trees){
    const [tx,ty]=Array.isArray(item)?item:[item.x,item.y];
    ctx.fillStyle='rgba(10,16,17,.24)';ctx.beginPath();ctx.ellipse(tx+.009,ty+.006,.014,.004,-.3,0,Math.PI*2);ctx.fill();
    if(tree?.complete&&tree.naturalWidth){const th=.052,tw=th*tree.naturalWidth/tree.naturalHeight*h/w;ctx.drawImage(tree,tx-tw/2,ty-th,tw,th);}
  }
  if(!reduced){
    // Narrow translucent strokes follow the waterfall channels; banks stay visible.
    ctx.lineCap='round';ctx.lineWidth=.0011;
    if(waterfalls.length)for(let i=0;i<18;i++){const u=((time/900+i*.137)%1),[wx,wy,length]=waterfalls[i%waterfalls.length],rx=wx+(i%3-1)*.003,ry=wy+u*length;ctx.strokeStyle=`rgba(205,250,255,${.12+.12*Math.sin(u*Math.PI)})`;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+.001,ry+.009);ctx.stroke();}
    for(let i=0;i<26;i++){const px=(i*.173+time*.000009)%1,py=(i*.109+time*.000021)%1;ctx.save();ctx.translate(px,py);ctx.rotate(time/900+i);ctx.fillStyle=i%2?'rgba(223,153,58,.65)':'rgba(135,176,100,.55)';ctx.beginPath();ctx.moveTo(-.002,0);ctx.quadraticCurveTo(0,-.003,.003,0);ctx.quadraticCurveTo(0,.002,-.002,0);ctx.fill();ctx.restore();}
  }
  ctx.restore();
}

/** Tree roots share the actor depth sort; size is measured against background height. */
export function drawFrontierTree(ctx,tree,{x,y,height,image}) {
  if(!image?.complete||!image.naturalWidth)return;
  const h=height*.052*(tree.big?1.4:1),w=h*image.naturalWidth/image.naturalHeight;
  ctx.drawImage(image,x-w/2,y-h,w,h);
}
