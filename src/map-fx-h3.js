// H3: normalized regions traced from theme-v4/map-{th,asia}.webp (1678 × 937).
// Geometry only narrows the existing colour mask; it never changes navigation.
const channel = [[.305,.14],[.37,.14],[.375,.217],[.522,.217],[.522,.29],
  [.394,.29],[.403,.60],[.66,.60],[.663,.646],[.706,.661],[.706,.753],
  [.623,.753],[.623,.699],[.568,.675],[.402,.707],[.303,.707],[.303,.529],
  [.356,.503],[.351,.426],[.31,.407]];
const lowerIsland=[[.466,.816],[.530,.816],[.546,.839],[.573,.864],
  [.591,.911],[.587,1],[.408,1],[.410,.931],[.418,.891],[.448,.846]];
const upperCurtains=[[.055,.101],[.144,.162],[.442,.473],[.490,.508],[.562,.581],
  [.610,.634],[.676,.705],[.817,.838],[.923,.939]];
const pierFeet=[[.272,.819],[.316,.819],[.456,.834],[.540,.834],[.81,.819],[.858,.819]];
function inPolygon(x,y,points) {
  let inside=false;
  for(let i=0,j=points.length-1;i<points.length;j=i++) {
    const [ax,ay]=points[i],[bx,by]=points[j];
    if((ay>y)!==(by>y) && x<(bx-ax)*(y-ay)/(by-ay)+ax)inside=!inside;
  }
  return inside;
}
export function h3SurfaceContains(zone,x,y) {
  if(zone!=='th'&&zone!=='asia')return false;
  if(y>.735 && x>.023 && x<.973){
    // Painted central bridge and lower island have blue-grey stones too.
    if(x>.46&&x<.535&&y<.835)return false;
    if(inPolygon(x,y,lowerIsland))return false;
    return true;
  }
  if(x>.347&&x<.404&&y>.455&&y<.515)return false; // upper wooden bridge
  if(x>.468&&x<.54&&y>.57&&y<.835)return false; // throne stairs and main bridge
  if(inPolygon(x,y,channel))return true;
  // Narrow lava curtains on the upper cliff; colour testing excludes dark rocks.
  return y<.15 && (zone==='asia' ? x>.335&&x<.368 :
    upperCurtains.some(([a,b])=>x>a&&x<b));
}
const frac=n=>n-Math.floor(n);
const seed=n=>frac(Math.sin(n*127.1+311.7)*43758.5453);
/** Budgets raised in the map-fx pass so zones 1-2 read as alive as zones 3-4 (west / cyberhell). Everything is still clipped to the strict H3 surface mask. */
export const H3_BUDGET = Object.freeze({edgeGlow:44,lavaFlow:72,bubbles:52,sparks:36,lavaFalls:34,
  waves:96,foam:24,waterFalls:30,mist:20,blobs:10,twinkles:30});
/** Lava heat that never changes: the heat range the test guards (cyberhell uses .08-.19); the H3 whisper was .035-.08. */
export const H3_LAVA_FILL = Object.freeze({base:.07,pulse:.09,shimmer:.04});
/** Painted lanterns / torch posts (normalised map coordinates, checked on top of the art). They get a flickering additive glow. */
export const H3_LANTERNS = Object.freeze({
  asia:[[.10,.386],[.194,.386],[.068,.615],[.126,.615],[.863,.182],[.931,.182],[.81,.792],[.86,.792],
    [.262,.795],[.321,.795],[.456,.580],[.540,.580],[.931,.40],[.458,.913],[.533,.913]],
  th:[[.262,.795],[.321,.795],[.81,.792],[.86,.792],[.436,.50],[.561,.50],[.458,.787],[.538,.787],
    [.459,.943],[.535,.943]]});
export function h3Anchors(points,count,salt=0) {
  if(!points.length)return [];
  return Array.from({length:count},(_,i)=>points[Math.floor(seed(i+salt)*points.length)]);
}
export function prepareH3SurfaceTracks(zone,kind,points,edges=[]) {
  const lava=kind==='lava',b=H3_BUDGET;
  const falls=points.filter(([x,y])=>lava ? y<.21 || x>.626&&x<.707&&y>.68 :
    zone==='asia'&&y<.795 && (x<.065 || x>.24&&x<.27 || x>.713&&x<.75));
  return {flow:h3Anchors(points,lava?b.lavaFlow:b.waves,lava?211:9),
    bubbles:lava?h3Anchors(points,b.bubbles,307):[],
    sparks:lava?h3Anchors(points,b.sparks,411):[],
    edges:lava?h3Anchors(edges,b.edgeGlow,501):[],
    blobs:lava?h3Anchors(points,b.blobs,701):[],
    twinkles:lava?[]:h3Anchors(points,b.twinkles,907),
    falls:h3Anchors(falls,lava?b.lavaFalls:b.waterFalls,601),
    mist:!lava&&zone==='asia'?h3Anchors(falls,b.mist,801):[]};
}
function stroke(c,x,y,dx,dy) {
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.5,y+dy-3,x+dx,y+dy);c.stroke();
}
/** Lava runs down the upper channel and the right drop, sideways along the pool and the lower river. */
export const h3LavaVertical=(u,v)=>(u<.42&&v<.60)||(u>.62&&v>.60);
/** All primitives are clipped by the cached, strict surface mask in map-ambient. */
export function drawH3Surfaces(c,zone,kind,time,W,H,tracks) {
  if(!tracks.flow.length)return;
  const t=time/1000, lava=kind==='lava', b=H3_BUDGET;
  c.lineCap='round';
  if(lava){
    const pulse=.5+.5*Math.sin(t*1.7), shimmer=.5+.5*Math.sin(t*3.3+1.3), F=H3_LAVA_FILL;
    // Whole-surface heat breathing + broad light bands sliding across the lava.
    c.fillStyle=`rgba(255,190,40,${F.base+F.pulse*pulse+F.shimmer*shimmer})`;
    c.fillRect(0,0,W,H);
    c.lineWidth=36;c.lineCap='butt';
    for(let k=0;k<6;k++){
      const x=((t*85+k*W/6)%(W+240))-120;
      c.strokeStyle=`rgba(255,226,120,${.08+.07*Math.sin(t*1.1+k*1.9)})`;
      c.beginPath();c.moveTo(x,0);c.lineTo(x-130,H);c.stroke();
    }
    c.lineCap='round';
    // Hot patches swell and fade on the surface.
    for(const [i,[u,v]] of tracks.blobs.entries()){
      const a=.10+.22*(.5+.5*Math.sin(t*(1.2+seed(i+61)*1.4)+i*2.3));
      c.fillStyle=`rgba(255,214,96,${a})`;
      c.beginPath();c.ellipse(u*W,v*H,26+seed(i+3)*14,12+seed(i+9)*7,0,0,Math.PI*2);c.fill();
    }
  }
  for(const [i,[u,v]] of tracks.flow.entries()) {
    const phase=frac(t*(lava?.42:.55)+seed(i+80));
    if(lava){
      const vert=h3LavaVertical(u,v), len=14+seed(i+15)*20, run=(phase-.5)*46;
      c.lineWidth=3.2;
      c.strokeStyle=`rgba(255,244,130,${.18+.55*Math.sin(phase*Math.PI)})`;
      if(vert)stroke(c,u*W+Math.sin(t*.7+i)*3,v*H+run,0,len);
      else stroke(c,u*W+run,v*H+Math.sin(t+i)*2,len,3);
    }else{
      c.lineWidth=2.4;
      c.strokeStyle=`rgba(${zone==='th'?'226,200,255':'196,250,255'},${.20+.38*Math.sin(phase*Math.PI)})`;
      stroke(c,u*W+(phase-.5)*64,v*H+Math.sin(t*1.3+i)*5,14+seed(i+15)*40,0);
    }
  }
  if(lava){
    c.strokeStyle=`rgba(255,231,105,${.14+.30*(.5+.5*Math.sin(t*1.7+.6))})`;
    c.lineWidth=5;
    for(const [u,v] of tracks.edges)stroke(c,u*W-4,v*H,8,0);
    c.lineWidth=2.2;
    for(const [i,[u,v]] of tracks.bubbles.entries()){
      const age=frac(t*.55+seed(i+41));
      c.strokeStyle=`rgba(255,245,134,${(1-age)*.9})`;
      c.beginPath();c.ellipse(u*W,v*H,2+age*10,1+age*4.5,0,0,Math.PI*2);c.stroke();
      c.fillStyle=`rgba(255,252,190,${(1-age)*(1-age)*.85})`;
      c.beginPath();c.ellipse(u*W,v*H,1.8+age*2,1.2+age,0,0,Math.PI*2);c.fill();
    }
    for(const [i,[u,v]] of tracks.sparks.entries()){
      const age=frac(t*.42+seed(i+48));
      c.fillStyle=`rgba(255,242,141,${Math.sin(age*Math.PI)*.95})`;
      c.fillRect(u*W+Math.sin(t*1.4+i)*5,v*H-age*28,3.2,4.2);
    }
  }else{
    // Foam at the water-facing feet of the three bridges/piers, never on wood.
    for(let i=0;i<b.foam;i++){
      const [u,v]=pierFeet[i%6];
      const age=frac(t*.5+i*.19);
      c.strokeStyle=`rgba(${zone==='th'?'226,202,250':'222,255,255'},${(1-age)*.7})`;c.lineWidth=2.2;
      c.beginPath();c.ellipse(u*W,v*H+age*6,3+age*16,1+age*5,0,0,Math.PI*2);c.stroke();
    }
    // Light glints on the water.
    for(const [i,[u,v]] of tracks.twinkles.entries()){
      const k=Math.max(0,Math.sin(t*(2.2+seed(i+5)*2.4)+i*5.1));
      c.fillStyle=`rgba(255,255,255,${Math.pow(k,3)*.85})`;
      c.fillRect(u*W,v*H,3.4,3.4);
    }
  }
  c.lineWidth=2.6;
  for(const [i,[u,v]] of tracks.falls.entries()){
    const age=frac(t*(lava?1.0:1.5)+i*.17);
    c.strokeStyle=lava?`rgba(255,240,118,${.45+.3*Math.sin(age*Math.PI)})`:`rgba(219,255,255,${.5+.3*Math.sin(age*Math.PI)})`;
    stroke(c,u*W,v*H+age*26,1,10+age*16);
  }
  if(!lava&&zone==='asia')for(const [i,[u,v]] of tracks.mist.entries()){
    const age=frac(t*.5+i*.23);
    c.fillStyle=`rgba(225,255,255,${(1-age)*.42})`;
    c.beginPath();c.ellipse(u*W+Math.sin(i+t)*8,v*H+12-age*11,3+age*9,1+age*3.5,0,0,Math.PI*2);c.fill();
  }
}
/** Flickering additive glow on the painted lanterns. glow: pre-rendered radial sprite (may be null in tests). */
export function drawH3Lanterns(ctx,zone,time,W,H,glow) {
  const list=H3_LANTERNS[zone];
  if(!glow||!list)return;
  const t=time/1000;
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(const [i,[u,v]] of list.entries()){
    const f=.5+.5*(.5*Math.sin(t*7.1+i*2.3)+.3*Math.sin(t*12.7+i*4.1)+.2*Math.sin(t*3.3+i));
    const r=26+10*f;
    ctx.globalAlpha=.30+.40*f;
    ctx.drawImage(glow,u*W-r,v*H-r,r*2,r*2);
  }
  ctx.restore();
}
