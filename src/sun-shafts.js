// Volumetric light baked once. Per-frame work is two small blits, not a triangle fan or pixel readback.
let texture;
export const SUN_SHAFTS=Object.freeze({width:384,height:512,peak:.24});
function shaftTexture(){
 if(texture!==undefined)return texture;texture=null;if(typeof document==='undefined')return null;
 const canvas=document.createElement('canvas');canvas.width=SUN_SHAFTS.width;canvas.height=SUN_SHAFTS.height;
 const ctx=canvas.getContext('2d'),image=ctx?.createImageData?.(canvas.width,canvas.height);if(!image?.data)return null;
 const d=image.data,W=canvas.width,H=canvas.height;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const u=x/W,v=y/H;let density=0;
  // Parallel shafts pass through different canopy openings and widen softly with distance.
  for(const [start,width,power]of [[.28,.022,.8],[.39,.045,1],[.55,.018,.6],[.72,.055,.75],[.86,.025,.45]]){
   const centre=start-v*.24,spread=width*(.45+v*1.7),cross=(u-centre)/spread;
   density+=Math.exp(-cross*cross*1.8)*power;
  }
  const haze=.72+.14*Math.sin(v*19+u*13)+.09*Math.sin(u*83-v*47);
  const fade=Math.pow(Math.sin(Math.PI*v),.75),floor=Math.exp(-Math.pow((v-.84)/.1,2))*.2;
  const alpha=Math.min(1,density)*haze*(fade+floor)*SUN_SHAFTS.peak;
  const i=(y*W+x)*4;d[i]=255;d[i+1]=248;d[i+2]=211;d[i+3]=Math.round(Math.max(0,alpha)*255);
 }
 ctx.putImageData(image,0,0);texture=canvas;return texture;
}
export function drawAsiaSunRays(ctx,view,time,{reduced=false}={}){
 if(!view||view.w<=0||view.h<=0)return false;const art=shaftTexture();if(!art)return false;
 const t=reduced?0:time/1000,drift=Math.sin(t*.11)*view.w*.018;
 ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=.8+.08*Math.sin(t*.19);
 ctx.drawImage(art,view.x+drift,view.y,view.w,view.h);
 ctx.globalAlpha=.20;ctx.drawImage(art,view.x+view.w*.045-drift*.4,view.y-view.h*.025,view.w*.94,view.h*1.04);
 ctx.restore();return true;
}
