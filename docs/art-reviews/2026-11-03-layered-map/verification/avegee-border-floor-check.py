from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));rows={}
 for key in ['border12','border23','border34']:
  page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/'+('index.html' if key=='border12' else 'maps.html'));page.wait_for_function("!!(window.layerReview||window.layerReviewGallery)")
  if key!='border12':page.select_option('#map',key);page.wait_for_function("!document.querySelector('#map').disabled")
  else:page.wait_for_function("document.querySelector('#status').textContent.startsWith('โหลดครบ')")
  rows[key]=page.evaluate('(window.layerReviewGallery||window.layerReview).floorRepair');page.locator('#scene').screenshot(path=str(out/(key+'-layered-current.png')))
 result={'maps':rows,'errors':errors,'limitation':'Coverage is opacity at owner floor cells, not semantic paving or visual registration acceptance.'};(out/'border-floor-repair-review.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
