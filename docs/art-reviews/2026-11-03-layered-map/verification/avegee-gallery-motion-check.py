from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/maps.html');page.wait_for_function("document.querySelector('#status').textContent.startsWith('พื้น')");results=[]
 for key in ['zone1','zone2','zone3','zone4','border23','border34']:
  page.select_option('#map',key);page.wait_for_function("!document.querySelector('#map').disabled");page.locator('#weather').uncheck();page.wait_for_timeout(100)
  r=page.evaluate('''async()=>{const cv=document.querySelector('#scene'),cx=cv.getContext('2d'),registry=await fetch('asset-manifest.json').then(r=>r.json()),im=new Image;im.src=registry.maps[document.querySelector('#map').value].nature;await im.decode();const c=document.createElement('canvas');c.width=cv.width;c.height=cv.height;const m=c.getContext('2d');m.drawImage(im,0,0,c.width,c.height);const mask=m.getImageData(0,0,c.width,c.height).data;const a=cx.getImageData(0,0,c.width,c.height).data;await new Promise(r=>setTimeout(r,450));const b=cx.getImageData(0,0,c.width,c.height).data;let samples=0,changed=0,max=0,sceneChanged=0;for(let i=0;i<a.length;i+=4){const d=Math.max(...[0,1,2].map(j=>Math.abs(a[i+j]-b[i+j])));if(d>2)sceneChanged++;if(mask[i+3]>250){samples++;max=Math.max(max,d);if(d>2)changed++;}}return {natureSamples:samples,naturePixelsChangedOver2:changed,natureMaxChannelDelta:max,scenePixelsChangedOver2:sceneChanged};}''')
  page.locator('#weather').check();page.locator('#pause').click();page.wait_for_timeout(150)
  r['pausedWithWeatherIsStable']=page.evaluate('''async()=>{const cv=document.querySelector('#scene'),cx=cv.getContext('2d'),a=cx.getImageData(0,0,cv.width,cv.height).data;await new Promise(r=>setTimeout(r,200));const b=cx.getImageData(0,0,cv.width,cv.height).data;return a.every((v,i)=>v===b[i]);}''');page.locator('#pause').click();r['map']=key;results.append(r)
 report={'maps':results,'errors':errors,'measurement':'Weather disabled during liquid-only motion comparison; weather enabled for pause stability.'};(out/'gallery-motion-static-nature.json').write_text(json.dumps(report,indent=2));print(json.dumps(report));b.close()
