// A railing's visible silhouette and physical foot are different masks.
// Decode one image at a time; thin alpha fringes never become collision walls.
export function traceStructureRuns(rgba,width,height,{alpha=180,minHeight=3,footDepth=3,mergeGap=Math.round(height*.012)}={}){
 const pieces=[],blocked=new Uint8Array(width*height);
 for(let x=0;x<width;x++){
  const runs=[];let start=-1;
  for(let y=0;y<=height;y++){
   const solid=y<height&&rgba[(y*width+x)*4+3]>=alpha;
   if(solid&&start<0)start=y;
   if(!solid&&start>=0){if(y-start>=minHeight)runs.push({top:start,bottom:y});start=-1;}
  }
  // Window gaps belong to one post: a window ledge is not another physical foot.
  for(let i=0;i<runs.length;){let last=i;while(last+1<runs.length&&runs[last+1].top-runs[last].bottom<=mergeGap)last++;
   const bottom=runs[last].bottom;
   for(let j=i;j<=last;j++)pieces.push({x,...runs[j],depth:bottom/height});
   for(let y=Math.max(runs[i].top,bottom-footDepth);y<bottom;y++)blocked[y*width+x]=1;
   i=last+1;
  }
 }
 pieces.sort((a,b)=>a.depth-b.depth);
 return {width,height,pieces,blocked};
}
export function structureFootGrid(structures,cols,rows){
 const blocked=new Uint8Array(cols*rows);
 for(let y=0;y<rows;y++)for(let x=0;x<cols;x++){
  const sx=Math.min(structures.width-1,Math.floor((x+.5)*structures.width/cols));
  const sy=Math.min(structures.height-1,Math.floor((y+.5)*structures.height/rows));
  blocked[y*cols+x]=structures.blocked[sy*structures.width+sx];
 }
 return {width:cols,height:rows,blocked};
}
export function structureFootBlocked(structures,p){
 const [x,y]=p;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=1||y>=1)return false;
 return !!structures.blocked[Math.floor(y*structures.height)*structures.width+Math.floor(x*structures.width)];
}
// Repaint the rail slices in a depth interval, interleaved with actor feet.
// Tall decorative pixels never block walking unless they are at a structure's foot.
export function drawStructureDepth(ctx,image,structures,{x,y,w,h,after=-Infinity,through=Infinity}){
 if(!image||(image.complete===false)||!(image.naturalWidth||image.width))return;
 ctx.save();ctx.beginPath();let count=0;
 const pieces=structures.pieces;let lo=0,hi=pieces.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(pieces[mid].depth<=after)lo=mid+1;else hi=mid;}
 for(let i=lo;i<pieces.length&&pieces[i].depth<=through;i++){const p=pieces[i];ctx.rect(x+p.x/structures.width*w,y+p.top/structures.height*h,w/structures.width+.25,(p.bottom-p.top)/structures.height*h);count++;}
 if(count){ctx.clip();ctx.drawImage(image,x,y,w,h);}ctx.restore();
}
export function maskWithoutStructureFeet(mask,structures){
 const {cols,rows}=mask;if(cols!==structures.width||rows!==structures.height)throw new Error('Structure and walk masks must share the same grid');
 const cells=new Uint8Array(cols*rows);let at=0,on=0;
 for(const n of mask.runs){if(on)cells.fill(1,at,at+n);at+=n;on^=1;}
 if(at!==cells.length)throw new Error('Invalid floor mask');
 for(let i=0;i<cells.length;i++)if(structures.blocked[i])cells[i]=0;
 const runs=[];let previous=0,length=0;
 for(const value of cells){if(value===previous)length++;else{runs.push(length);previous=value;length=1;}}
 runs.push(length);return {cols,rows,runs};
}
// Keep generated pixels intact; register individual post sprites against measured source feet.
export function registerStructurePlate(image,registration,{canvas=()=>document.createElement('canvas')}={}){
 if(!registration||!(registration.moves?.length||registration.exclude?.length))return image;
 const [w,h]=registration.size,source=canvas(),out=canvas();source.width=out.width=w;source.height=out.height=h;
 source.getContext('2d').drawImage(image,0,0,w,h);const ctx=out.getContext('2d');ctx.drawImage(source,0,0);
 for(const rect of registration.exclude||[])ctx.clearRect(...rect);
 for(const {source:rect} of registration.moves||[])ctx.clearRect(...rect);
 for(const {source:rect,offset:[dx,dy]} of registration.moves||[]){const [x,y,rw,rh]=rect;ctx.drawImage(source,x,y,rw,rh,x+dx,y+dy,rw,rh);}
 source.width=source.height=1;return out;
}
