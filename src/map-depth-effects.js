// Blur only separately layered scenery/sprites. Never blur the walking floor or actor.
export function createDepthEffects({maxBytes=12*1024*1024,canvas=()=>document.createElement('canvas')}={}){
 const entries=new Map();let bytes=0,clock=0;
 const remove=key=>{const e=entries.get(key);if(!e)return;bytes-=e.bytes;e.image.width=e.image.height=1;entries.delete(key);};
 return {
  blurred(id,image,radius){const r=Math.max(1,Math.min(8,Math.round(radius))),key=id+'#'+r;let e=entries.get(key);if(e){e.used=++clock;return e;}
   const pad=r*3,out=canvas(),w=image.width||image.naturalWidth,h=image.height||image.naturalHeight;out.width=w+pad*2;out.height=h+pad*2;const ctx=out.getContext('2d');ctx.filter=`blur(${r}px)`;ctx.drawImage(image,pad,pad);ctx.filter='none';e={image:out,pad,width:w,height:h,bytes:out.width*out.height*4,used:++clock};entries.set(key,e);bytes+=e.bytes;
   for(const [k]of [...entries].sort((a,b)=>a[1].used-b[1].used)){if(bytes<=maxBytes)break;if(k!==key)remove(k);}return e;
  },
  release(id){for(const key of [...entries.keys()])if(key.startsWith(id+'#'))remove(key);},
  get bytes(){return bytes;},destroy(){for(const key of [...entries.keys()])remove(key);},
 };
}
