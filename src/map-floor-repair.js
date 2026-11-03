// Local generated paving patches repair only holes inside the authoritative floor.
export function repairAlpha(rgba,cells,{cols,x,y,width,height}){
 const out=new Uint8ClampedArray(rgba.length);
 for(let py=0;py<height;py++)for(let px=0;px<width;px++){
  const i=(py*width+px)*4;
  if(cells[(y+py)*cols+x+px]&&rgba[i+3]<180){out[i]=out[i+1]=out[i+2]=out[i+3]=255;}
 }
 return out;
}
export async function createRepairedFloor(base,mask,patches,{infill=null,canvas=()=>document.createElement('canvas'),loadImage=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src;})}={}){
 const out=canvas();out.width=mask.cols;out.height=mask.rows;const ctx=out.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';ctx.drawImage(base,0,0,out.width,out.height);
 const cells=new Uint8Array(mask.cols*mask.rows);let at=0,on=0;
 for(const n of mask.runs){if(on)cells.fill(1,at,at+n);at+=n;on^=1;}
 if(at!==cells.length)throw new Error('Invalid floor repair grid');
 const coverage=()=>{const rgba=ctx.getImageData(0,0,out.width,out.height).data;let floor=0,covered=0;for(let i=0;i<cells.length;i++)if(cells[i]){floor++;if(rgba[i*4+3]>=180)covered++;}return {floor,covered,fraction:covered/floor};};
 const before=coverage();
 for(const patch of patches){
  const [x,y,w,h]=patch.rect;if(x<0||y<0||x+w>out.width||y+h>out.height)throw new Error('Patch outside floor grid');
  const image=await loadImage(patch.src),piece=canvas(),clip=canvas();piece.width=clip.width=w;piece.height=clip.height=h;
  const pc=piece.getContext('2d'),cc=clip.getContext('2d'),alpha=cc.createImageData(w,h);
  pc.imageSmoothingQuality='high';pc.drawImage(image,0,0,w,h);
  alpha.data.set(repairAlpha(ctx.getImageData(x,y,w,h).data,cells,{cols:mask.cols,x,y,width:w,height:h}));cc.putImageData(alpha,0,0);
  pc.globalCompositeOperation='destination-in';pc.drawImage(clip,0,0);ctx.drawImage(piece,x,y);piece.width=piece.height=clip.width=clip.height=1;
 }
 const afterPatches=coverage();let infillPixels=0;
 if(infill){
  infillPixels=afterPatches.floor-afterPatches.covered;
  checkResidualInfill(infillPixels,infill.maxPixels);
  if(infillPixels){
   const material=await loadImage(infill.src),tile=canvas(),paint=canvas(),clip=canvas(),[sx,sy,sw,sh]=infill.sourceRect;
   tile.width=sw;tile.height=sh;tile.getContext('2d').drawImage(material,sx,sy,sw,sh,0,0,sw,sh);
   paint.width=clip.width=out.width;paint.height=clip.height=out.height;
   const pc=paint.getContext('2d'),cc=clip.getContext('2d'),alpha=cc.createImageData(out.width,out.height),rgba=ctx.getImageData(0,0,out.width,out.height).data;
   alpha.data.set(repairAlpha(rgba,cells,{cols:mask.cols,x:0,y:0,width:out.width,height:out.height}));cc.putImageData(alpha,0,0);
   pc.save();pc.scale(infill.scale,infill.scale);pc.fillStyle=pc.createPattern(tile,'repeat');pc.fillRect(0,0,out.width/infill.scale,out.height/infill.scale);pc.restore();
   pc.globalCompositeOperation='destination-in';pc.drawImage(clip,0,0);ctx.drawImage(paint,0,0);tile.width=tile.height=paint.width=paint.height=clip.width=clip.height=1;
  }
 }
 const after=coverage();return {image:out,before,afterPatches,after,infillPixels,repairedPixels:after.covered-before.covered};
}

export function checkResidualInfill(missing,maxPixels){if(!Number.isInteger(maxPixels)||maxPixels<0||missing>maxPixels)throw new Error('Floor mismatch needs a targeted art patch before residual infill');}
