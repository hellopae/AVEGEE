// Camera-independent far art; never use a combined foreground map here.
// Load one or two biome plates sequentially and feather their distant haze only.
export async function createDistantLayer(sources,{width=1200,height=800,loadImage,canvas=()=>document.createElement('canvas')}={}){
 if(!sources?.length)return null;
 if(sources.length>2)throw new Error('Review loads at most two distant biome images');
 const out=canvas();out.width=width;out.height=height;const ctx=out.getContext('2d');
 try{
  const first=await loadImage(sources[0]);ctx.drawImage(first,0,0,width,height);
  if(sources.length===2){
   const second=await loadImage(sources[1]),blend=canvas();blend.width=width;blend.height=height;const b=blend.getContext('2d');b.drawImage(second,0,0,width,height);
   b.globalCompositeOperation='destination-in';const fade=b.createLinearGradient(width*.36,0,width*.64,0);fade.addColorStop(0,'rgba(0,0,0,0)');fade.addColorStop(1,'rgba(0,0,0,1)');b.fillStyle=fade;b.fillRect(0,0,width,height);ctx.drawImage(blend,0,0);blend.width=blend.height=1;
  }
  return out;
 }catch(error){out.width=out.height=1;throw error;}
}
