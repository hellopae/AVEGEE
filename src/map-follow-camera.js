const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function cameraView(center,zoom,[artW,artH],[screenW,screenH]){
 if(!(zoom>1&&artW>0&&artH>0&&screenW>0&&screenH>0))throw new Error('Camera must stay closer than the full map');
 const w=Math.min(.95,1/zoom),h=Math.min(.95,w*artW/artH*screenH/screenW);
 return {x:clamp(center[0]-w*.5,0,1-w),y:clamp(center[1]-h*.58,0,1-h),w,h};
}
export function screenToMap([x,y],view){return [view.x+x*view.w,view.y+y*view.h];}
export function mapToScreen([x,y],view,[w,h]){return [(x-view.x)/view.w*w,(y-view.y)/view.h*h];}
export function intersects(a,b){return a[0]<b[0]+b[2]&&a[0]+a[2]>b[0]&&a[1]<b[1]+b[3]&&a[1]+a[3]>b[1];}
export function bufferedView(view,[w,h],pixels=72){return [Math.max(0,view.x-pixels/w),Math.max(0,view.y-pixels/h),Math.min(1,view.x+view.w+pixels/w)-Math.max(0,view.x-pixels/w),Math.min(1,view.y+view.h+pixels/h)-Math.max(0,view.y-pixels/h)];}
export function createFollowCamera({artSize,viewport=[1200,675],levels=[3.2,4],start=[.5,.5]}={}){
 if(levels.length!==2||levels.some(z=>!Number.isFinite(z)||z<=1)||levels[1]<=levels[0])throw new Error('Exactly two close camera levels are required');
 let center=[...start],zoom=levels[0],level=0;
 return {get level(){return level;},get zoom(){return zoom;},get center(){return [...center];},get view(){return cameraView(center,zoom,artSize,viewport);},
  setLevel(next){if(next!==0&&next!==1)throw new Error('Only two zoom levels');level=next;},
  targetView(point){return cameraView(point,levels[level],artSize,viewport);},
  tick(point,dt,{snap=false,zoomReady=true}={}){const k=snap?1:1-Math.exp(-Math.min(.1,Math.max(0,dt))*10);center=center.map((v,i)=>v+(point[i]-v)*k);if(zoomReady)zoom+=((levels[level])-zoom)*k;return this.view;},
 };
}
// Only far scenery shifts. Rooted world layers always use mapToScreen without parallax.
export function farScreenRect(view,[w,h],enabled=true){const cx=view.x+view.w/2,cy=view.y+view.h/2,p=enabled?1:0;return {x:-w*.16-(cx-.5)*w*.24*p,y:-h*.16-(cy-.5)*h*.15*p,w:w*1.32,h:h*1.32};}
