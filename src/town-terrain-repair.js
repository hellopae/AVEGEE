// Restore painted ground only where earlier object removal left rectangular patches.
// The original tile edges and road geometry remain the authority for adjoining tiles.
export const TOWN_REPAIR_URL='img/map-zone1/repairs/r2-c3-v1.png';
export const TOWN_REPAIR_BOXES=Object.freeze([[590,115,975,345],[365,515,1024,870],[110,710,365,940]].map(Object.freeze));
let repairPromise,overlay;
function loadRepair(){
  return repairPromise ||= new Promise((resolve,reject)=>{
    const im=new Image(),timer=setTimeout(()=>{im.onload=im.onerror=null;reject(new Error('ground repair timeout'));},8000);im.onload=()=>{clearTimeout(timer);resolve(im);};im.onerror=error=>{clearTimeout(timer);reject(error);};im.src=TOWN_REPAIR_URL;
  }).catch(error=>{repairPromise=null;throw error;});
}
function repairOverlay(art){
  if(overlay)return overlay;
  const mask=document.createElement('canvas');mask.width=mask.height=1024;const m=mask.getContext('2d');
  for(const [x0,y0,x1,y1]of TOWN_REPAIR_BOXES){
    const part=document.createElement('canvas');part.width=x1-x0;part.height=y1-y0;const c=part.getContext('2d');
    const g=c.createLinearGradient(0,0,part.width,0),edge=42/part.width;
    g.addColorStop(0,'transparent');g.addColorStop(edge,'white');g.addColorStop(1-edge,'white');g.addColorStop(1,'transparent');c.fillStyle=g;c.fillRect(0,0,part.width,part.height);
    const v=c.createLinearGradient(0,0,0,part.height),ey=42/part.height;
    v.addColorStop(0,'transparent');v.addColorStop(ey,'white');v.addColorStop(1-ey,'white');v.addColorStop(1,'transparent');c.globalCompositeOperation='destination-in';c.fillStyle=v;c.fillRect(0,0,part.width,part.height);
    m.drawImage(part,x0,y0);
  }
  const out=document.createElement('canvas');out.width=out.height=1024;const c=out.getContext('2d');c.drawImage(art,0,0,1024,1024);
  c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);
  // Keep an exact 80px original border; fade in over the next 48px so no new tile seam is introduced.
  for(const vertical of [false,true]){
    const edge=c.createLinearGradient(0,0,vertical?0:1024,vertical?1024:0);
    for(const [at,color]of [[0,'transparent'],[80/1024,'transparent'],[128/1024,'white'],[896/1024,'white'],[944/1024,'transparent'],[1,'transparent']])edge.addColorStop(at,color);
    c.fillStyle=edge;c.fillRect(0,0,1024,1024);
  }
  return overlay=out;
}
/** Compose once after decode, including the overview so detail never pops into a different painting. */
export async function repairTownTerrain(source,{row=null,col=null}={}){
  if(typeof HTMLImageElement==='undefined'||typeof document==='undefined'||!(source instanceof HTMLImageElement)||row!==null&&(row!==2||col!==3))return source;
  try{
    const art=await loadRepair(),patch=repairOverlay(art),out=document.createElement('canvas');out.width=source.naturalWidth;out.height=source.naturalHeight;
    const c=out.getContext('2d');c.drawImage(source,0,0);
    if(row===2)c.drawImage(patch,0,0,out.width,out.height);
    else c.drawImage(patch,1024/4915*out.width,1024/3277*out.height,1024/4915*out.width,1024/3277*out.height);
    // Existing lighting code consumes decoded Images, including their natural dimensions.
    const result=new Image();result.src=out.toDataURL('image/png');await result.decode();return result;
  }catch{return source;} // Optional art cannot strand the town on a loading screen.
}
