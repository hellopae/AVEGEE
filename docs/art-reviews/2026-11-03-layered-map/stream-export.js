// Offline engine export only. The streaming player never imports this module or source plates.
import {createObjectDepthScene} from '../../../src/map-object-depth.js';
import {surfaceAlpha} from '../../../src/map-surface-material.js';
import {DUNGEON_CORRIDOR,routeRow} from '../../../src/route-geometry.js';
const canvas=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
const raster=(image,w,h)=>{const c=canvas(w,h);c.getContext('2d',{willReadFrequently:true}).drawImage(image,0,0,w,h);return c;};
function rle(cells){const out=[];let value=0,n=0;for(const v of cells){if(v===value)n++;else{out.push(n);n=1;value=v;}}out.push(n);return out;}
export async function prepareStreamExport(key){
 const r=window.layerReviewGallery||window.layerReview,sources=r.sourceLayers;
 const floor=sources.find(l=>l.id==='floor').image,nature=sources.find(l=>l.id==='nature').image;
 const w=floor.naturalWidth||floor.width,h=floor.naturalHeight||floor.height;
 const authored=(await fetch('object-depth.json').then(r=>r.json())).maps[key];
 const split=createObjectDepthScene([{id:'floor',image:floor}],authored),layers=[{id:'floor',image:split.base},{id:'nature',image:raster(nature,w,h)},{id:'rails',image:raster(r.railImage,w,h)},{id:'liquid',image:raster(r.liquidImage,w,h)}];
 const lc=layers.at(-1).image.getContext('2d',{willReadFrequently:true}),rgba=lc.getImageData(0,0,w,h).data;
 for(const kind of ['water','lava','purple']){const c=canvas(w,h),cx=c.getContext('2d'),im=cx.createImageData(w,h);im.data.set(surfaceAlpha(rgba,kind));cx.putImageData(im,0,0);layers.push({id:'mask-'+kind,image:c});}
 const assets=[],assetKeys=new Map();
 const asset=(id,image)=>{if(assetKeys.has(id))return assetKeys.get(id);const src='sprites/'+assets.length+'.webp';assets.push({src,image});assetKeys.set(id,src);return src;};
 const objects=split.objects.map(o=>({id:o.id,kind:'portal',rect:o.rect,depth:o.depth,src:asset(o.id,o.image),flip:false}));
 for(const o of r.townObjects||[])objects.push({id:o.id,kind:o.kind,rect:o.rect,depth:o.depth,src:asset(o.src,o.image),flip:!!o.flip,foot:o.foot,door:o.kind==='station'?[(o.site.x??o.site.bx)/3840,(o.site.y??o.site.by+38)/2560]:null});
 const cells=r.nav.cells.slice();
 if(key==='border12'){
  const anchors=await fetch('foreground-anchors.json').then(r=>r.json()),atlas=r.foliageImage,cw=atlas.naturalWidth/3,ch=atlas.naturalHeight/2,treeArt=[];
  for(let col=0;col<3;col++){const c=canvas(cw,ch);c.getContext('2d').drawImage(atlas,col*cw,0,cw,ch,0,0,cw,ch);treeArt.push(c);}
  for(const [i,a]of anchors.points.entries()){const col=a.kind==='red'?0:a.kind==='gold'?1:2,nativeH=80/720*h,nativeW=nativeH*cw/ch;objects.push({id:'f2-tree-'+i,kind:'tree',src:asset('f2-'+col,treeArt[col]),rect:[a.x-nativeW/w/2,a.y-nativeH/h*.87,nativeW/w,nativeH/h],depth:a.y,flip:false,foot:[a.x,a.y]});
   const cx=a.x*r.nav.cols,cy=a.y*r.nav.rows;for(let y=Math.floor(cy-2);y<=Math.ceil(cy+2);y++)for(let x=Math.floor(cx-3);x<=Math.ceil(cx+3);x++)if(x>=0&&y>=0&&x<r.nav.cols&&y<r.nav.rows&&((x+.5-cx)/2.5)**2+((y+.5-cy)/1.5)**2<=1)cells[y*r.nav.cols+x]=0;
  }
 }
 const corridor=key==='border12'?DUNGEON_CORRIDOR:key==='border23'?routeRow('asia:west').corridor:key==='border34'?routeRow('west:cyberhell').corridor:[[.5,.84],[.49,.38]];
 const world=key.startsWith('border')?[1672,941]:[3840,2560];
 const hero=asset('hero',r.heroImage),far=asset('far',raster(r.distantImage,768,432));
 for(const kind of ['water','lava']){const source=r.surfaceSprites[kind],im=source.image,out=canvas(512,256),ctx=out.getContext('2d');for(let frame=0;frame<8;frame++){const col=frame%4,row=Math.floor(frame/4),sw=im.naturalWidth/4,sh=im.naturalHeight/2;ctx.drawImage(im,col*sw+2,row*sh+2,sw-4,sh-4,col*128,row*128,128,128);}asset('sheet-'+kind,out);}
 const manifest={version:1,id:key,artSize:[w,h],world,moveSpeed:key.startsWith('border')?120:160,levels:key.startsWith('border')?[2,2.6]:[2.6,3.4],start:r.hero,corridor,mask:{cols:r.nav.cols,rows:r.nav.rows,runs:rle(cells)},hero,heroHeight:key==='border12'?38/720*h:key.startsWith('border')?34/675*h:26/800*h,far,objects,tiles:[],materials:{water:{src:assetKeys.get('sheet-water'),fps:8},lava:{src:assetKeys.get('sheet-lava'),fps:6}},rails:{width:r.structure.width,height:r.structure.height,runs:r.structure.pieces.map(p=>[p.x,p.top,p.bottom,Math.round(p.depth*r.structure.height)])},goals:key.startsWith('border')?[...corridor.filter((_,i)=>key==='border12'?[7,15,23,30].includes(i):false),...(r.storyGoals||[])]:objects.filter(o=>o.door).map(o=>o.door)};
 const tile=256;
 for(const layer of layers){const ctx=layer.image.getContext('2d',{willReadFrequently:true});for(let y=0;y<h;y+=tile)for(let x=0;x<w;x+=tile){const tw=Math.min(tile,w-x),th=Math.min(tile,h-y),data=ctx.getImageData(x,y,tw,th).data;if(!data.some((v,i)=>i%4===3&&v>0))continue;const x0=Math.max(0,x-2),y0=Math.max(0,y-2),x1=Math.min(w,x+tw+2),y1=Math.min(h,y+th+2);manifest.tiles.push({id:layer.id+'-'+x+'-'+y,layer:layer.id,src:'tiles/'+layer.id+'-'+x+'-'+y+'.webp',rect:[x/w,y/h,tw/w,th/h],pixels:[x,y,tw,th],crop:[x-x0,y-y0,tw,th],encodedSize:[x1-x0,y1-y0],bounds:[x0,y0,x1-x0,y1-y0]});}}
 window.streamExport={manifest,layers,assets,split,canvas};return {manifest,assets:assets.map(a=>({src:a.src,width:a.image.naturalWidth||a.image.width,height:a.image.naturalHeight||a.image.height}))};
}
export function exportStreamImage(type,index){const s=window.streamExport;let out;
 if(type==='tile'){const t=s.manifest.tiles[index],layer=s.layers.find(l=>l.id===t.layer),[x,y,w,h]=t.bounds;out=canvas(w,h);out.getContext('2d').drawImage(layer.image,x,y,w,h,0,0,w,h);}
 else{const image=s.assets[index].image;out=raster(image,image.naturalWidth||image.width,image.naturalHeight||image.height);}
 const result=out.toDataURL('image/png');out.width=out.height=1;return result;
}
export function disposeStreamExport(){const s=window.streamExport;if(!s)return;s.split.destroy();for(const l of s.layers)l.image.width=l.image.height=1;for(const a of s.assets)if(a.image instanceof HTMLCanvasElement)a.image.width=a.image.height=1;delete window.streamExport;}
