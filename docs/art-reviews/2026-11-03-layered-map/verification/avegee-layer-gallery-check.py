from pathlib import Path
from playwright.sync_api import sync_playwright
import json,sys
out=str(Path(__file__).resolve().parents[1])+'/'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':1000});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/maps.html');page.wait_for_function("document.querySelector('#status').textContent.startsWith('พื้น')")
 results=[]
 for key in sys.argv[1:] or ['zone1','zone2','zone3','zone4','border23','border34']:
  page.select_option('#map',key);page.wait_for_function("!document.querySelector('#map').disabled")
  status=page.locator('#status').inner_text();page.locator('#scene').screenshot(path=out+key+'-composite.png')
  page.set_viewport_size({'width':390,'height':844});overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth');page.locator('#pause').click();paused=page.locator('#pause').inner_text()=='เล่น';page.locator('#pause').click();page.set_viewport_size({'width':1280,'height':1000})
  results.append({'map':key,'status':status,'mobileOverflow':overflow,'pauseResponds':paused,'animationEnabled':not page.locator('#motion').is_disabled()})
 report={'scenes':results,'errors':errors};open(out+('gallery-browser-review-'+ '-'.join(sys.argv[1:])+'.json' if sys.argv[1:] else 'gallery-browser-review.json'),'w').write(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False));b.close()
