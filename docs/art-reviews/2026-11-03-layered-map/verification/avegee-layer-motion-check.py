from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=str(Path(__file__).resolve().parents[1])+'/'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':900});page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/');page.wait_for_function("document.querySelector('#status').textContent.startsWith('โหลดครบ')")
 page.locator('#weather').uncheck();page.wait_for_timeout(100)
 report=page.evaluate('''async()=>{const canvas=document.querySelector('#scene'),ctx=canvas.getContext('2d'),image=new Image;image.src='nature-study.png';await image.decode();const c=document.createElement('canvas');c.width=canvas.width;c.height=canvas.height;const m=c.getContext('2d');m.drawImage(image,0,0,c.width,c.height);const alpha=m.getImageData(0,0,c.width,c.height).data;const a=ctx.getImageData(0,0,c.width,c.height).data;await new Promise(r=>setTimeout(r,450));const b=ctx.getImageData(0,0,c.width,c.height).data;let samples=0,over2=0,max=0,allChanged=0;for(let i=0;i<a.length;i+=4){const d=Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]));if(d>2)allChanged++;if(alpha[i+3]>250){samples++;max=Math.max(max,d);if(d>2)over2++;}}return {natureSamples:samples,naturePixelsChangedOver2:over2,natureMaxChannelDelta:max,scenePixelsChangedOver2:allChanged};}''')
 open(out+'motion-static-nature.json','w').write(json.dumps(report,indent=2));print(report);b.close()
