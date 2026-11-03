// Deterministic, endpoint-pinned discharge geometry, shared by cables and storm weather.
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
export function dischargePath(from,to,seed,spread=8,steps=16){
 const dx=to[0]-from[0],dy=to[1]-from[1],len=Math.hypot(dx,dy)||1;
 return Array.from({length:steps+1},(_,i)=>{
  const t=i/steps,j=i===0||i===steps?0:(hash(seed+i*7.13)-.5)*2*spread*Math.sin(Math.PI*t);
  return [from[0]+dx*t-dy/len*j,from[1]+dy*t+dx/len*j];
 });
}
export function dischargeBranches(path,seed,spread=5){
 return [0,1,2].map(i=>{
  const at=Math.floor(path.length*(.28+i*.19)),a=path[at],next=path[Math.min(path.length-1,at+3)],side=hash(seed+i)>.5?1:-1;
  const dx=next[0]-a[0],dy=next[1]-a[1],length=Math.hypot(dx,dy)||1;
  return dischargePath(a,[a[0]+dx*.8+side*dy/length*spread*3,a[1]+dy*.8-side*dx/length*spread*3],seed+i*31,spread*.45,7);
 });
}
export function drawDischarge(ctx,path,branches,age,unit=1){
 if(age<0||age>=1)return;
 // Fast ignition, bright return stroke, then a long cooling tail, without geometry jitter.
 const power=Math.min(1,age/.055)*Math.pow(1-age,1.65);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';
 const stroke=(pts,width,alpha,color)=>{
  ctx.strokeStyle=color;ctx.globalAlpha=power*alpha;
  // Taper towards the tips instead of a constant-width zigzag.
  for(let i=1;i<pts.length;i++){
   ctx.beginPath();ctx.moveTo(...pts[i-1]);ctx.lineTo(...pts[i]);
   ctx.lineWidth=Math.max(.22,width*(1-.68*i/pts.length))*unit;ctx.stroke();
  }
 };
 for(const [width,alpha,color]of [[9,.075,'#7964ed'],[4.5,.25,'#699fea'],[1.65,.9,'#9de7ff'],[.65,1,'#f5fdff']]){
  stroke(path,width,alpha,color);
  for(const branch of branches)stroke(branch,width*.48,alpha*.62,color);
 }
 ctx.restore();
}
