// A railing's visible silhouette and physical foot are different masks.
// Decode one image at a time; thin alpha fringes never become collision walls.
export function traceStructureRuns(rgba,width,height,{alpha=180,minHeight=3,footDepth=2}={}){
 const pieces=[],blocked=new Uint8Array(width*height);
 for(let x=0;x<width;x++){
  let start=-1;
  for(let y=0;y<=height;y++){
   const solid=y<height&&rgba[(y*width+x)*4+3]>=alpha;
   if(solid&&start<0)start=y;
   if(!solid&&start>=0){
    if(y-start>=minHeight){pieces.push({x,top:start,bottom:y,depth:y/height});for(let fy=Math.max(start,y-footDepth);fy<y;fy++)blocked[fy*width+x]=1;}
    start=-1;
   }
  }
 }
 pieces.sort((a,b)=>a.depth-b.depth);
 return {width,height,pieces,blocked};
}
export function structureFootBlocked(structures,p){
 const [x,y]=p;if(!Number.isFinite(x)||!Number.isFinite(y)||x<0||y<0||x>=1||y>=1)return false;
 return !!structures.blocked[Math.floor(y*structures.height)*structures.width+Math.floor(x*structures.width)];
}
// Repaint the rail slices in a depth interval, interleaved with actor feet.
// Tall decorative pixels never block walking unless they are at a structure's foot.
export function drawStructureDepth(ctx,image,structures,{x,y,w,h,after=-Infinity,through=Infinity}){
 if(!image?.complete||!image.naturalWidth)return;
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
