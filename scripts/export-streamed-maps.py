#!/usr/bin/env python3
"""Sequential engine tile export: one selected map, one encoded image at a time."""
from pathlib import Path
from io import BytesIO
import base64,json,sys,subprocess
from PIL import Image
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'docs/art-reviews/2026-11-03-layered-map'
URL='http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/'
keys=sys.argv[1:] or ['border12','zone1','zone2','zone3','zone4','border23','border34']
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True)
 for key in keys:
  context=browser.new_context(viewport={'width':1200,'height':900});page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(URL+('index.html' if key=='border12' else 'maps.html'));page.wait_for_function("!!(window.layerReview||window.layerReviewGallery)",timeout=60000)
  if key=='border12':page.wait_for_function("document.querySelector('#status').textContent.startsWith('โหลดครบ')",timeout=60000)
  else:page.select_option('#map',key);page.wait_for_function("!document.querySelector('#map').disabled",timeout=60000)
  status=page.locator('#status').inner_text()
  if not status.startswith(('พื้น','โหลดครบ')):raise RuntimeError(status)
  page.locator('#pause').click();page.locator('#weather').uncheck()
  data=page.evaluate("async(key)=>{const m=await import('./stream-export.js');return m.prepareStreamExport(key);}",key)
  if errors:raise RuntimeError(errors)
  dest=OUT/'stream'/key;dest.mkdir(parents=True,exist_ok=True)
  for kind,rows in [('asset',data['assets']),('tile',data['manifest']['tiles'])]:
   for index,row in enumerate(rows):
    raw=page.evaluate("async([kind,index])=>(await import('./stream-export.js')).exportStreamImage(kind,index)",[kind,index]);png=base64.b64decode(raw.split(',',1)[1]);path=dest/row['src'];path.parent.mkdir(parents=True,exist_ok=True)
    with Image.open(BytesIO(png)) as image:image.save(path,format='WEBP',lossless=True,method=4)
  (dest/'manifest.json').write_text(json.dumps(data['manifest'],separators=(',',':'))+'\n')
  print(json.dumps({'map':key,'tiles':len(data['manifest']['tiles']),'sprites':len(data['assets']),'bytes':sum(f.stat().st_size for f in dest.rglob('*.webp'))}),flush=True)
  page.evaluate("async()=>(await import('./stream-export.js')).disposeStreamExport()");context.close()
 browser.close()
index={'version':1,'maps':{key:{'src':f'stream/{key}/manifest.json'}for key in ['border12','zone1','zone2','zone3','zone4','border23','border34']if (OUT/'stream'/key/'manifest.json').exists()}}
(OUT/'stream-index.json').write_text(json.dumps(index,indent=2)+'\n')

subprocess.run([sys.executable,str(ROOT/'scripts/export-streamed-yama.py')],check=True)
