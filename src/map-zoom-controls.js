// Shared town/minimap zoom controls. Call destroy when the map unmounts.
export function bindMapZoom({less,more,overview,surface,levels,level=0,onChange=()=>{},gestures=false,onGesture=()=>{},onGestureEnd=()=>{}}) {
  const off=[],pointers=new Map();let distance=0;
  const listen=(node,event,fn,options)=>{node.addEventListener(event,fn,options);off.push(()=>node.removeEventListener(event,fn,options));};
  const set=n=>{level=Math.max(0,Math.min((typeof levels==='function'?levels():levels).length-1,n));less.disabled=level===0;more.disabled=level===(typeof levels==='function'?levels():levels).length-1;onChange(level,(typeof levels==='function'?levels():levels)[level]);};
  listen(less,'click',()=>set(level-1));listen(more,'click',()=>set(level+1));listen(overview,'click',()=>set(0));
  if(gestures&&surface){
    listen(surface,'wheel',e=>{e.preventDefault();if(e.deltaY)set(level+(e.deltaY<0?1:-1));},{passive:false});
    listen(surface,'pointerdown',e=>{surface.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2){distance=span();onGesture();}},{capture:true});
    const span=()=>{const [a,b]=[...pointers.values()];return Math.hypot(a[0]-b[0],a[1]-b[1]);};
    listen(surface,'pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size!==2)return;e.preventDefault();const d=span();if(d>distance*1.2||d<distance/1.2){set(level+(d>distance?1:-1));distance=d;}},{capture:true,passive:false});
    for(const event of ['pointerup','pointercancel','lostpointercapture'])listen(surface,event,e=>{pointers.delete(e.pointerId);if(pointers.size<2)distance=0;if(!pointers.size)queueMicrotask(onGestureEnd);},{capture:true});
    listen(surface,'blur',()=>{pointers.clear();distance=0;onGestureEnd();});
  }
  set(level);
  return {set,get level(){return level;},destroy(){off.forEach(fn=>fn());pointers.clear();}};
}
