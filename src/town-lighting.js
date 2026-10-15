// Zone 1 lighting: charcoal surroundings with emissive lava, not a dark veil over everything.
// Both layers are cached per decoded tile; pixel work never runs in the animation loop.
const cache = new WeakMap();
const clamp = x => Math.max(0,Math.min(1,x));
export function fireStrength(r,g,b) {
  return clamp((r-160)/70)*clamp((r-b-70)/90)*clamp((g-b-20)/60)*clamp((100-b)/65);
}
export function hellColor(r,g,b,out=[0,0,0]) {
  const fire = fireStrength(r,g,b), red = clamp((r-g-25)/65)*clamp((r-b-15)/65);
  const luminance = .299*r+.587*g+.114*b;
  const saturation = .45 + red*.85;
  for(let i=0;i<3;i++){
    const v=i===0?r:i===1?g:b,shade=i===0?.58:i===1?.54:.58,boost=i===0?1.12:i===1?1.07:1;
    out[i]=Math.round(Math.max(0,Math.min(255,(luminance+(v-luminance)*saturation)*shade*(1-fire)+v*boost*fire)));
  }
  return out;
}
function layers(image) {
  let entry=cache.get(image);if(entry)return entry;
  const ground=document.createElement('canvas'),fire=document.createElement('canvas');
  ground.width=fire.width=image.naturalWidth;ground.height=fire.height=image.naturalHeight;
  const p=ground.getContext('2d'),f=fire.getContext('2d');p.drawImage(image,0,0);
  const pixels=p.getImageData(0,0,ground.width,ground.height),glow=f.createImageData(ground.width,ground.height);
  const rgb=[0,0,0];
  for(let i=0;i<pixels.data.length;i+=4){
    const r=pixels.data[i],g=pixels.data[i+1],b=pixels.data[i+2],strength=fireStrength(r,g,b);
    hellColor(r,g,b,rgb);pixels.data[i]=rgb[0];pixels.data[i+1]=rgb[1];pixels.data[i+2]=rgb[2];
    glow.data[i]=255;glow.data[i+1]=Math.min(230,g);glow.data[i+2]=20;glow.data[i+3]=Math.round(255*strength);
  }
  p.putImageData(pixels,0,0);f.putImageData(glow,0,0);
  entry={ground,fire};cache.set(image,entry);return entry;
}
export function drawHellTerrain(ctx,image,time,reduced,...rect) {
  const art=layers(image);ctx.drawImage(art.ground,...rect);
  ctx.save();ctx.globalCompositeOperation='screen';
  ctx.globalAlpha=reduced ? .08 : .10+.035*Math.sin(time/510)+.015*Math.sin(time/173);
  ctx.drawImage(art.fire,...rect);ctx.restore();
}
