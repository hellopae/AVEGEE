from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1200,'height':850});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/play.html?map=zone1');page.wait_for_function('window.layerStreamReview?.meta&&!document.querySelector("#map").disabled',timeout=60000)
 for key in ['zone2','border34']:
  page.select_option('#map',key);page.wait_for_function('!document.querySelector("#map").disabled',timeout=60000)
 page.wait_for_function('layerStreamReview.ready&&layerStreamReview.stats.pending===0',timeout=60000);r=page.evaluate('({map:layerStreamReview.meta.id,stats:layerStreamReview.stats})');r['errors']=errors;(out/'stream-map-switch-review.json').write_text(json.dumps(r,indent=2));print(json.dumps(r));b.close()
