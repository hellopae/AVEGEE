// Material selection only inside an authored liquid-only plate. Never pass scenery here.
export function surfaceAlpha(rgba,kind){
 const out=new Uint8ClampedArray(rgba.length);
 for(let i=0;i<rgba.length;i+=4){const r=rgba[i],g=rgba[i+1],b=rgba[i+2];
  const selected=kind==='water'?b>r*1.18&&g>r*1.10&&b>105&&g>85:
    kind==='lava'?r>190&&g>55&&g<r*.82&&b<90:
    kind==='purple'?b>150&&r>90&&b>g*1.5&&r>g*1.3:false;
  if(selected&&rgba[i+3]>=180){out[i]=out[i+1]=out[i+2]=255;out[i+3]=rgba[i+3];}
 }return out;
}
export function createSurfaceMaterial(liquidPlate,atlas,{width=1280,height=720,encodedFlow=false,spriteSheets={},canvas=()=>document.createElement('canvas')}={}){
 const scale=Math.min(1,Math.sqrt(3_000_000/(width*height*4)));width=Math.max(1,Math.floor(width*scale));height=Math.max(1,Math.floor(height*scale));
 const make=()=>{const c=canvas();c.width=width;c.height=height;return c;};
 const work=make(),wc=work.getContext('2d',{willReadFrequently:true});wc.imageSmoothingEnabled=!encodedFlow;wc.drawImage(liquidPlate,0,0,width,height);
 const data=wc.getImageData(0,0,width,height),masks=[],active=[];
 for(const kind of ['water','lava','purple']){const c=make(),cx=c.getContext('2d'),image=cx.createImageData(width,height);image.data.set(encodedFlow?flowSurfaceAlpha(data.data,kind):surfaceAlpha(data.data,kind));cx.putImageData(image,0,0);active.push(image.data.some((v,j)=>j%4===3&&v>0));masks.push(c);}
 let elapsed=0,last=null,dead=false;
 return {
  pixels:width*height*4,
  draw(ctx,{time,paused=false,reduced=false,enabled=true,w=width,h=height}){
   if(last!==null&&!paused&&!reduced&&enabled)elapsed+=Math.max(0,Math.min(50,time-last));last=time;
   if(dead||!enabled||reduced)return;
   const tile=256;
   for(let i=0;i<3;i++){
    if(!active[i])continue;
    wc.globalCompositeOperation='source-over';wc.clearRect(0,0,width,height);
    const kind=['water','lava','purple'][i],sheet=spriteSheets[kind]||spriteSheets[i===1?'lava':'water'];const offset=sheet?0:elapsed/1000*(i===1?3:12)%tile;
    const image=sheet?.image||atlas,source=sheet?spriteFrame(elapsed,sheet):[i===1?.5:0,0,.5,1];
    for(let y=-tile+offset;y<height;y+=tile)for(let x=0;x<width;x+=tile){const inset=sheet?.inset??0;wc.drawImage(image,source[0]*image.naturalWidth+inset,source[1]*image.naturalHeight+inset,source[2]*image.naturalWidth-inset*2,source[3]*image.naturalHeight-inset*2,x,y,tile,tile);}
    if(i===2){wc.globalCompositeOperation='color';wc.fillStyle='#8e36d4';wc.fillRect(0,0,width,height);}
    wc.globalCompositeOperation='destination-in';wc.drawImage(masks[i],0,0);
    ctx.save();ctx.globalAlpha=i===1?.26:.32;ctx.drawImage(work,0,0,w,h);ctx.restore();
   }
  },
  destroy(){dead=true;work.width=work.height=1;for(const m of masks)m.width=m.height=1;}
 };
}

export function flowSurfaceAlpha(rgba,kind){
 const out=new Uint8ClampedArray(rgba.length);for(let i=0;i<rgba.length;i+=4){const k=Math.round(rgba[i]/40);if(kind==='water'&&(k===4||k===5)||kind==='lava'&&(k===2||k===3)||kind==='purple'&&k===1){out[i]=out[i+1]=out[i+2]=out[i+3]=255;}}return out;
}
export function spriteFrame(elapsed,{cols=4,rows=2,frames=8,fps=8}){
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||frames<1||frames>cols*rows||fps<=0)throw new Error('Invalid sprite grid');
 const f=Math.floor(Math.max(0,elapsed)/1000*fps)%frames;return [(f%cols)/cols,Math.floor(f/cols)/rows,1/cols,1/rows];
}
