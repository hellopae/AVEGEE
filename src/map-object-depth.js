// Authored silhouettes, not opaque-image bottoms, define an object's foot depth.
// Partition a composed plate without changing source art or the owner walk mask.
function inside(x,y,polygon){
 let hit=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j];
  if((a[1]>y)!==(b[1]>y)&&x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])hit=!hit;
 }
 return hit;
}
export function partitionDepthPixels(rgba,width,height,spec={size:[width,height],pieces:[]}){
 if(rgba.length!==width*height*4)throw new Error('Invalid depth plate dimensions');
 const [sw,sh]=spec.size;if(!(sw>0&&sh>0))throw new Error('Invalid authored depth size');
 const base=rgba.slice(),owner=new Uint16Array(width*height),objects=[],ids=new Set();
 for(const piece of spec.pieces){
  if(!piece.id||ids.has(piece.id)||!Number.isFinite(piece.baseline)||piece.baseline<0||piece.baseline>sh)throw new Error('Invalid object identity or baseline');
  ids.add(piece.id);
  const scale=p=>p.map(([x,y])=>{if(!Number.isFinite(x)||!Number.isFinite(y))throw new Error('Invalid object polygon');return [x/sw*width,y/sh*height];});
  if(piece.polygon.length<3)throw new Error('Object polygon needs three vertices');
  const polygon=scale(piece.polygon),holes=(piece.holes||[]).map(scale);
  const x0=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p[0])))),y0=Math.max(0,Math.floor(Math.min(...polygon.map(p=>p[1]))));
  const x1=Math.min(width,Math.ceil(Math.max(...polygon.map(p=>p[0])))),y1=Math.min(height,Math.ceil(Math.max(...polygon.map(p=>p[1]))));
  if(x1<=x0||y1<=y0)throw new Error('Object outside plate');
  const w=x1-x0,h=y1-y0,data=new Uint8ClampedArray(w*h*4);let pixels=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
   const at=y*width+x,i=at*4;
   if(owner[at]||!base[i+3]||!inside(x+.5,y+.5,polygon)||holes.some(hole=>inside(x+.5,y+.5,hole)))continue;
   data.set(base.subarray(i,i+4),((y-y0)*w+x-x0)*4);base.fill(0,i,i+4);owner[at]=objects.length+1;pixels++;
  }
  objects.push({id:piece.id,depth:piece.baseline/sh,rect:[x0/width,y0/height,w/width,h/height],width:w,height:h,data,pixels});
 }
 return {base,objects,owner};
}
export function createObjectDepthScene(layers,spec,{canvas=()=>document.createElement('canvas')}={}){
 const first=layers[0]?.image;
 if(!first)return null;
 const width=first.naturalWidth||first.width,height=first.naturalHeight||first.height;
 const base=canvas();base.width=width;base.height=height;const ctx=base.getContext('2d',{willReadFrequently:true});
 for(const {image}of layers)ctx.drawImage(image,0,0,width,height);
 const enabled=new Set(layers.map(l=>l.id)),pieces=(spec?.pieces||[]).filter(p=>!p.layer||enabled.has(p.layer));
 const split=partitionDepthPixels(ctx.getImageData(0,0,width,height).data,width,height,{size:spec?.size||[width,height],pieces});
 const put=(target,data,w,h)=>{const c=target.getContext('2d'),im=c.createImageData(w,h);im.data.set(data);c.putImageData(im,0,0);};
 put(base,split.base,width,height);
 const objects=split.objects.map(({data,...obj})=>{const image=canvas();image.width=obj.width;image.height=obj.height;put(image,data,obj.width,obj.height);return {...obj,image};});
 return {base,objects,width,height,destroy(){base.width=base.height=1;for(const obj of objects)obj.image.width=obj.image.height=1;}};
}
// Rails and all actors share the same queue with portals, cliffs and foliage.
export function drawObjectDepthQueue(ctx,scene,{x=0,y=0,w=scene?.width,h=scene?.height,actors=[],rails=null,drawRails=null}={}){
 const events=[...(scene?.objects||[]).map(o=>({depth:o.depth,draw(){const [rx,ry,rw,rh]=o.rect;if(o.flip){ctx.save();ctx.translate(x+(rx+rw)*w,y+ry*h);ctx.scale(-1,1);ctx.drawImage(o.image,0,0,rw*w,rh*h);ctx.restore();}else ctx.drawImage(o.image,x+rx*w,y+ry*h,rw*w,rh*h);}})),...actors];
 events.sort((a,b)=>a.depth-b.depth);let after=-Infinity;
 for(const event of events){if(rails&&drawRails)drawRails(ctx,rails.image,rails.structure,{x,y,w,h,after,through:event.depth});event.draw();after=event.depth;}
 if(rails&&drawRails)drawRails(ctx,rails.image,rails.structure,{x,y,w,h,after});
}

// Author portal feet separately: a wide arch roof must never become a doorway wall.
export function authoredObjectFootGrid(spec,cols,rows){
 const blocked=new Uint8Array(cols*rows);if(!spec)return {width:cols,height:rows,blocked};
 const [w,h]=spec.size;
 for(const piece of spec.pieces)for(const rect of piece.footprints||[]){
  const [x0,y0,x1,y1]=rect;
  if(!(x1>x0&&y1>y0&&x0>=0&&y0>=0&&x1<=w&&y1<=h))throw new Error('Invalid object foot rectangle');
  for(let y=Math.max(0,Math.ceil(y0/h*rows-.5));y<rows&&(y+.5)/rows*h<y1;y++)for(let x=Math.max(0,Math.ceil(x0/w*cols-.5));x<cols&&(x+.5)/cols*w<x1;x++)blocked[y*cols+x]=1;
 }
 return {width:cols,height:rows,blocked};
}
