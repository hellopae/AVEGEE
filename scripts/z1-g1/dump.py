import json,sys
from playwright.sync_api import sync_playwright
S='/private/tmp/claude-501/-Users-agapae-Documents-Work-PAE-Claude-AGAPAE-Agent/1c14c246-0c1e-407d-b3fa-d98d27ebb721/scratchpad/g1'
JS="""async()=>{
 const L=await import('./src/town-layout.js'), Z=await import('./src/zone-skin.js'), M=await import('./src/map-art-v5.js'), D=await import('./src/data.js');
 const load=u=>new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=u});
 const bbox=im=>{const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;const p=c.getContext('2d');p.drawImage(im,0,0);const d=p.getImageData(0,0,c.width,c.height).data;let x0=1e9,y0=1e9,x1=-1,y1=-1;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){if(d[(y*c.width+x)*4+3]>=128){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}}return [x0,y0,x1+1,y1+1]};
 const out={stations:[],houses:[],props:[]};
 const art=Z.ZONE1_TOWN_ART;
 for(const [k,s] of Object.entries(L.TOWN_STATION_SITES)){
   const def=D.STATIONS.find(d=>d.k===k);
   const file=M.mapReviewArt('st-'+k,'th');
   if(!file){out.stations.push({k,site:s,file:null});continue}
   const im=await load(file); const b=M.reviewStationBox({...s,k,flip:def&&def.flip},im,'th');
   const bb=bbox(im), sx=b.w/im.naturalWidth, sy=b.h/im.naturalHeight;
   out.stations.push({k,file,site:{bx:s.bx,by:s.by,bw:s.bw,mapScale:s.mapScale,x:s.x,y:s.y},flip:!!(def&&def.flip),nat:[im.naturalWidth,im.naturalHeight],box:[b.x,b.y,b.w,b.h],alpha:bb});
 }
 for(const [i,h] of L.TOWN_HOUSE_SITES.entries()){
   const im=await load(art['town-residence-'+h.key]);const w=h.w,hh=w*im.naturalHeight/im.naturalWidth;
   out.houses.push({i,key:h.key,x:h.x,y:h.y,w:h.w,flip:h.flip,nat:[im.naturalWidth,im.naturalHeight],alpha:bbox(im),box:[h.x-w/2,h.y-hh,w,hh]});
 }
 const cache={};
 for(const p of L.TOWN_PROP_SITES){ if(!['tree','rock'].includes(p.kind))continue;
   const key=({lava:'town-tree-red-th',ice:'town-tree-snow-th'})[p.biome]&&p.kind==='tree'?({lava:'town-tree-red-th',ice:'town-tree-snow-th'})[p.biome]:p.key;
   const file=art[key]; if(!cache[file]){const im=await load(file);cache[file]={nat:[im.naturalWidth,im.naturalHeight],alpha:bbox(im)}}
   const c=cache[file];const hh=p.w*c.nat[1]/c.nat[0];
   out.props.push({id:p.id,kind:p.kind,biome:p.biome,x:p.x,y:p.y,w:p.w,file,nat:c.nat,alpha:c.alpha,box:[p.x-p.w/2,p.y-hh,p.w,hh]});
 }
 out.rootAnchors=Z.activeTownSkin().rootAnchors||null;
 return out;}"""
with sync_playwright() as p:
  b=p.chromium.launch();pg=b.new_page(viewport={'width':390,'height':844});pg.goto('http://127.0.0.1:8802/index.html');pg.wait_for_timeout(2500)
  r=pg.evaluate(JS);json.dump(r,open(S+'/entities.json','w'),indent=1);b.close()
print(json.dumps(r['stations'],indent=0)[:3000])
