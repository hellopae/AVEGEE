// Match the authored map and the town's .8 * .75 actor scale, independently of viewport size.
export const FRONTIER_WORLD = Object.freeze({w:1672,h:941});
export function frontierActorHeight(kind,scale=1) {
  const base=kind==='yama'?92*1.12:kind==='nira'?82:kind==='enemy'?78:92;
  return base*.8*.75*scale;
}
export function frontierCameraTarget(width,height,position,overview=false) {
  const {w,h}=FRONTIER_WORLD;
  // O1: the route fills the whole viewport. Native texture scale on phones/laptops; only a display
  // larger than the authored map scales up so no letterbox strip ever shows.
  const scale=overview?Math.min(width/w,height/h):Math.max(1,width/w,height/h);
  const axis=(size,extent,foot,anchor)=>extent<=size?(size-extent)/2:Math.max(size-extent,Math.min(0,size*anchor-foot*extent));
  return {scale,x:axis(width,w*scale,position[0],.5),y:axis(height,h*scale,position[1],.6)};
}
