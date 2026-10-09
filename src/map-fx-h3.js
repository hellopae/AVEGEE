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
export const H3_BUDGET = Object.freeze({edgeGlow:18,lavaFlow:24,bubbles:18,sparks:12,lavaFalls:18,
  waves:48,foam:16,waterFalls:18,mist:12});
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
    falls:h3Anchors(falls,lava?b.lavaFalls:b.waterFalls,601),
    mist:!lava&&zone==='asia'?h3Anchors(falls,b.mist,801):[]};
}
function stroke(c,x,y,dx,dy) {
  c.beginPath();c.moveTo(x,y);c.quadraticCurveTo(x+dx*.5,y+dy-3,x+dx,y+dy);c.stroke();
}
/** All primitives are clipped by the cached, strict surface mask in map-ambient. */
export function drawH3Surfaces(c,zone,kind,time,W,H,tracks) {
  if(!tracks.flow.length)return;
  const t=time/1000, lava=kind==='lava', b=H3_BUDGET;
  const anchors=tracks.flow;
  c.lineWidth=1.8;c.lineCap='round';
  if(lava){
    // Gentle pulse retains the painted bright bank outlines beneath it.
    c.fillStyle=`rgba(255,184,40,${.035+.045*(.5+.5*Math.sin(t*1.7))})`;
    c.fillRect(0,0,W,H);
  }
  for(const [i,[u,v]] of anchors.entries()) {
    const phase=frac(t*(lava?.16:.25)+seed(i+80));
    const x=u*W+(phase-.5)*(lava?16:32),y=v*H+Math.sin(t+i)*(lava?2:4);
    c.strokeStyle=lava?`rgba(255,240,110,${.12+.28*Math.sin(phase*Math.PI)})`:
      `rgba(${zone==='th'?'216,190,249':'185,246,255'},${.15+.25*Math.sin(phase*Math.PI)})`;
    stroke(c,x,y,12+seed(i+15)*(lava?14:32),lava?3:0);
  }
  if(lava){
    c.strokeStyle=`rgba(255,231,105,${.10+.17*(.5+.5*Math.sin(t*1.7))})`;
    c.lineWidth=4;
    for(const [u,v] of tracks.edges)stroke(c,u*W-4,v*H,8,0);
    c.lineWidth=1.8;
    for(const [i,[u,v]] of tracks.bubbles.entries()){
      const age=frac(t*.30+seed(i+41));
      c.strokeStyle=`rgba(255,245,134,${(1-age)*.55})`;
      c.beginPath();c.ellipse(u*W,v*H,2+age*7,1+age*3,0,0,Math.PI*2);c.stroke();
    }
    for(const [i,[u,v]] of tracks.sparks.entries()){
      const age=frac(t*.24+seed(i+48));
      c.fillStyle=`rgba(255,242,141,${(1-age)*.65})`;
      c.fillRect(u*W+Math.sin(t+i)*3,v*H-age*16,2,3);
    }
  }else{
    // Foam at the water-facing feet of the three bridges/piers, never on wood.
    for(let i=0;i<b.foam;i++){
      const [u,v]=pierFeet[i%6];
      const age=frac(t*.38+i*.19);
      c.strokeStyle=`rgba(${zone==='th'?'221,196,248':'218,255,255'},${(1-age)*.45})`;
      c.beginPath();c.ellipse(u*W,v*H+age*5,3+age*12,1+age*4,0,0,Math.PI*2);c.stroke();
    }
  }
  for(const [i,[u,v]] of tracks.falls.entries()){
    const age=frac(t*(lava?.6:1.2)+i*.17);
    c.strokeStyle=lava?'rgba(255,240,118,.42)':'rgba(219,255,255,.48)';
    stroke(c,u*W,v*H+age*18,1,8+age*10);
  }
  if(!lava&&zone==='asia')for(const [i,[u,v]] of tracks.mist.entries()){
    const age=frac(t*.45+i*.23);
    c.fillStyle=`rgba(225,255,255,${(1-age)*.27})`;
    c.beginPath();c.ellipse(u*W+Math.sin(i+t)*7,v*H+12-age*9,2+age*7,1+age*3,0,0,Math.PI*2);c.fill();
  }
}
