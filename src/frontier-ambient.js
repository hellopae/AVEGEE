// Small world-space props and animation over the painted frontier road.
export const FRONTIER_TREES=Object.freeze([[.16,.20],[.24,.28],[.30,.34],[.39,.39],[.50,.32],[.57,.32],[.66,.40],[.76,.49],[.71,.57],[.64,.61],[.57,.70],[.66,.76],[.81,.83]]);
export function drawFrontierAmbient(ctx,{time=0,reduced=false,x=0,y=0,w,h,tree=null}) {
  ctx.save();ctx.translate(x,y);ctx.scale(w,h);
  for(const [tx,ty] of FRONTIER_TREES){
    ctx.fillStyle='rgba(10,16,17,.24)';ctx.beginPath();ctx.ellipse(tx+.009,ty+.006,.014,.004,-.3,0,Math.PI*2);ctx.fill();
    if(tree?.complete&&tree.naturalWidth){const th=.052,tw=th*tree.naturalWidth/tree.naturalHeight*h/w;ctx.drawImage(tree,tx-tw/2,ty-th,tw,th);}
  }
  if(!reduced){
    // Narrow translucent strokes follow the waterfall channels; banks stay visible.
    ctx.lineCap='round';ctx.lineWidth=.0011;
    for(let i=0;i<18;i++){const u=((time/900+i*.137)%1),rx=.46+(i%5)*.052,ry=.37+u*.34;ctx.strokeStyle=`rgba(205,250,255,${.12+.12*Math.sin(u*Math.PI)})`;ctx.beginPath();ctx.moveTo(rx,ry);ctx.lineTo(rx+.001,ry+.009);ctx.stroke();}
    for(let i=0;i<26;i++){const px=(i*.173+time*.000009)%1,py=(i*.109+time*.000021)%1;ctx.save();ctx.translate(px,py);ctx.rotate(time/900+i);ctx.fillStyle=i%2?'rgba(223,153,58,.65)':'rgba(135,176,100,.55)';ctx.beginPath();ctx.moveTo(-.002,0);ctx.quadraticCurveTo(0,-.003,.003,0);ctx.quadraticCurveTo(0,.002,-.002,0);ctx.fill();ctx.restore();}
  }
  ctx.restore();
}
