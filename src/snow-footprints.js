// Render-only snow impressions: bounded, temporary, and never serialized into game saves.
export const SNOW_TRACKS = Object.freeze({ttl:6000,fade:2000,spacing:12,max:96,teleport:180});
const states=new WeakMap();
export function snowTrackState(owner){return states.get(owner)||null;}
export function updateSnowTracks(owner,actors,time,{active=true,paused=false,validAt=()=>true}={}){
 let state=states.get(owner);if(!state){state={raw:time,clock:0,points:[],actors:new Map(),step:0};states.set(owner,state);}
 const dt=Math.max(0,Math.min(120,time-state.raw));state.raw=time;
 if(!active){state.points.length=0;state.actors.clear();return state;}
 if(!paused)state.clock+=dt;
 state.points=state.points.filter(p=>state.clock-p.born<SNOW_TRACKS.ttl);
 if(paused)return state;
 const alive=new Set();
 for(const actor of actors){
  if(!actor||!Number.isFinite(actor.x)||!Number.isFinite(actor.y))continue;
  const key=actor.id||actor;alive.add(key);const prev=state.actors.get(key),at={x:actor.x,y:actor.y};
  if(!prev){state.actors.set(key,at);continue;}
  const dx=at.x-prev.x,dy=at.y-prev.y,d=Math.hypot(dx,dy);
  if(d>SNOW_TRACKS.teleport){state.actors.set(key,at);continue;}
  if(d<SNOW_TRACKS.spacing)continue;
  const count=Math.min(4,Math.floor(d/SNOW_TRACKS.spacing)),angle=Math.atan2(dy,dx);
  for(let i=1;i<=count;i++){
   const u=i/(count+1),side=(state.step++%2?1:-1),x=prev.x+dx*u-Math.sin(angle)*3*side,y=prev.y+dy*u+Math.cos(angle)*3*side;
   if(validAt(x,y))state.points.push({x,y,angle,born:state.clock});
  }
  state.actors.set(key,at);
 }
 for(const key of state.actors.keys())if(!alive.has(key))state.actors.delete(key);
 if(state.points.length>SNOW_TRACKS.max)state.points.splice(0,state.points.length-SNOW_TRACKS.max);
 return state;
}
export function snowTrackAlpha(point,clock){return Math.max(0,Math.min(1,(SNOW_TRACKS.ttl-(clock-point.born))/SNOW_TRACKS.fade))*.36;}
export function drawSnowTracks(ctx,state){
 if(!state)return;ctx.save();ctx.fillStyle='#52748d';
 for(const p of state.points){ctx.globalAlpha=snowTrackAlpha(p,state.clock);ctx.beginPath();ctx.ellipse(p.x,p.y,4,1.8,p.angle,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
