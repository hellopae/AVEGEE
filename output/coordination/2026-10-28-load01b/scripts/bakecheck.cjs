const {launch,boot,gotoZone,quiet}=require('./lib.cjs');
(async()=>{
 const h=await launch('desktop');const {page}=h;
 await boot(h);
 for(const z of ['th','asia','west','cyberhell']){
  if(z!=='th')await gotoZone(page,z);
  const res=await page.evaluate(async()=>{
   const L=await import('/src/town-lighting.js');
   const T=await import('/src/town-terrain.js');
   const {activeTownSkin}=await import('/src/zone-skin.js');
   const {TOWN_SIZE}=await import('/src/town-layout.js?v=k1d');
   const out=[];
   for(const [row,col] of [[2,2],[3,3],[1,1]]){
    const url=T.townChunkUrl(row,col);
    const im=new Image();im.src=url;try{await im.decode();}catch(e){out.push({row,col,err:'load'});continue;}
    const rr=T.townChunkRect(row,col),rect=[rr.x,rr.y,rr.w,rr.h];
    // reference = the ORIGINAL synchronous algorithm (verbatim from main before LOAD-01b)
    const ref=(image,rect)=>{
     const ground=document.createElement('canvas'),fire=document.createElement('canvas');
     ground.width=fire.width=image.naturalWidth;ground.height=fire.height=image.naturalHeight;
     const p=ground.getContext('2d',{willReadFrequently:true}),f=fire.getContext('2d');p.drawImage(image,0,0);
     const pixels=p.getImageData(0,0,ground.width,ground.height),glow=f.createImageData(ground.width,ground.height),rgb=[0,0,0];
     const [ox,oy,ww,wh]=rect;
     const emit=activeTownSkin().light.emit,fireOnly=emit.length===1&&emit[0].type==='fire',em=[0,0,0,0];
     for(let y=0;y<ground.height;y++)for(let x=0;x<ground.width;x++){
      const i=(y*ground.width+x)*4,r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2];
      if(fireOnly){const s=L.fireStrength(r,g,b);L.hellColor(r,g,b,rgb,L.townLightAt(ox+x/ground.width*ww,oy+y/ground.height*wh));
       pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];glow.data[i]=255;glow.data[i+1]=Math.min(230,g);glow.data[i+2]=20;glow.data[i+3]=Math.round(255*s);}
      else{L.emitAt(emit,r,g,b,em);L.hellColor(r,g,b,rgb,L.townLightAt(ox+x/ground.width*ww,oy+y/ground.height*wh),em[0]);
       pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];glow.data[i]=em[1];glow.data[i+1]=em[2];glow.data[i+2]=em[3];glow.data[i+3]=Math.round(255*em[0]);}
     }
     p.putImageData(pixels,0,0);f.putImageData(glow,0,0);return {ground,fire};
    };
    const A=ref(im,rect);
    // new path: sliced async bake, then blit through drawHellTerrain into a canvas (reduced => constant glow alpha)
    const im2=new Image();im2.src=url;await im2.decode();
    const t0=performance.now();let maxSlice=0;
    await L.prepareTownLighting(im2,rect);
    const bakeMs=performance.now()-t0;
    const w=im2.naturalWidth,hh=im2.naturalHeight;
    const draw=(src,fn)=>{const c=document.createElement('canvas');c.width=w;c.height=hh;const x=c.getContext('2d');fn(x);return x.getImageData(0,0,w,hh).data;};
    const dNew=draw(null,x=>L.drawHellTerrain(x,im2,0,true,0,0,w,hh));
    const dRef=draw(null,x=>{x.drawImage(A.ground,0,0,w,hh);x.save();x.globalCompositeOperation='screen';x.globalAlpha=.10;x.drawImage(A.fire,0,0,w,hh);x.restore();});
    let diff=0,maxd=0;for(let i=0;i<dNew.length;i++){const d=Math.abs(dNew[i]-dRef[i]);if(d){diff++;if(d>maxd)maxd=d;}}
    out.push({row,col,px:w*hh,differingChannels:diff,maxDelta:maxd,bakeMs:Math.round(bakeMs)});
   }
   return out;
  });
  console.log(z,JSON.stringify(res));
 }
 await h.browser.close();
})();
