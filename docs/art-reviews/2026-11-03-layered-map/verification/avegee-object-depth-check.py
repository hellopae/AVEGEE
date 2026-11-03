from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));rows=[]
 for key in ['border12','zone1','zone2','zone3','zone4','border23','border34']:
  page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/'+('index.html' if key=='border12' else 'maps.html'))
  page.wait_for_function("!!(window.layerReview||window.layerReviewGallery)")
  if key!='border12':page.select_option('#map',key);page.wait_for_function("!document.querySelector('#map').disabled")
  result=page.evaluate('''async()=>{
   const r=window.layerReviewGallery||window.layerReview,s=r.depthScene,{drawObjectDepthQueue}=await import('/src/map-object-depth.js');
   const cv=document.createElement('canvas');cv.width=s.width;cv.height=s.height;const c=cv.getContext('2d',{willReadFrequently:true});for(const l of r.sourceLayers)c.drawImage(l.image,0,0,cv.width,cv.height);const before=c.getImageData(0,0,cv.width,cv.height).data;
   c.clearRect(0,0,cv.width,cv.height);c.drawImage(s.base,0,0);drawObjectDepthQueue(c,s);const after=c.getImageData(0,0,cv.width,cv.height).data;let alphaMax=0,opaqueMax=0,opaqueOver2=0;for(let i=0;i<before.length;i+=4){alphaMax=Math.max(alphaMax,Math.abs(before[i+3]-after[i+3]));if(before[i+3]>250){const d=Math.max(...[0,1,2].map(j=>Math.abs(before[i+j]-after[i+j])));opaqueMax=Math.max(opaqueMax,d);if(d>2)opaqueOver2++;}}
   const probes=[];
   for(const o of [...s.objects,...(r.townObjects||[])]){
    const pc=document.createElement('canvas'),x0=Math.floor(o.rect[0]*s.width),y0=Math.floor(o.rect[1]*s.height);pc.width=Math.max(1,Math.ceil((o.rect[0]+o.rect[2])*s.width)-x0);pc.height=Math.max(1,Math.ceil((o.rect[1]+o.rect[3])*s.height)-y0);const p=pc.getContext('2d',{willReadFrequently:true});p.translate(-x0,-y0);drawObjectDepthQueue(p,{...s,objects:[o]});const data=p.getImageData(0,0,pc.width,pc.height).data;
    let sample=null;for(let py=pc.height-1;py>=0&&!sample;py--)for(let px=0;px<pc.width;px++){const x=Math.floor(o.rect[0]*s.width)+px,y=Math.floor(o.rect[1]*s.height)+py,delta=o.depth*s.height-y;if(delta>4&&delta<38&&data[(py*pc.width+px)*4+3]>250){sample=[x,y];break;}}
    if(!sample){probes.push({id:o.id,pixels:o.pixels??null,sample:false});continue;}
    const [x,y]=sample,foot=o.depth*s.height;let values=[];
    const scene={...s,objects:[o]};
    for(const offset of [-1,1]){c.clearRect(0,0,cv.width,cv.height);c.drawImage(s.base,0,0);drawObjectDepthQueue(c,scene,{actors:[{depth:(foot+offset)/s.height,draw(){c.fillStyle='#f71e37';c.fillRect(x-4,foot+offset-48,9,48);}}]});values.push([...c.getImageData(x,y,1,1).data]);}
    probes.push({id:o.id,pixels:o.pixels??null,sample,behindIsCovered:!(values[0][0]===247&&values[0][1]===30&&values[0][2]===55),frontIsVisible:values[1][0]===247&&values[1][1]===30&&values[1][2]===55});pc.width=pc.height=1;
   }
   return {width:s.width,height:s.height,alphaMax,opaqueMax,opaqueOver2,cutouts:s.objects.length,townObjects:r.townObjects?.length||0,townSpriteRGBABytes:(r.townSpritePixels||0)*4,probes};
  }''')
  result['map']=key;rows.append(result)
 result={'maps':rows,'errors':errors,'basis':'Native recomposition of floor+nature, and synthetic draw-order probes at authored feet; not semantic art approval or physical phone measurement.'};(out/'object-depth-review.json').write_text(json.dumps(result,indent=2));print(json.dumps([{'map':r['map'],'cutouts':r['cutouts'],'townObjects':r['townObjects'],'opaqueOver2':r['opaqueOver2'],'failedProbes':[x['id'] for x in r['probes'] if x.get('sample') and not(x['behindIsCovered'] and x['frontIsVisible'])]}for r in rows]));print('errors',errors);b.close()
