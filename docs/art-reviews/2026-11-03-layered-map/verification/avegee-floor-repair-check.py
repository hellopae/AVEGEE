from playwright.sync_api import sync_playwright
import json
from pathlib import Path
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':1100});errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/maps.html');page.wait_for_function("document.querySelector('#status').textContent.startsWith('พื้น')");page.select_option('#map','border34');page.wait_for_function("!document.querySelector('#map').disabled");report=page.evaluate('layerReviewGallery.floorRepair');print(json.dumps({'repair':report,'errors':errors}));(out/'b34-composed-floor-report.json').write_text(json.dumps({'repair':report,'errors':errors},indent=2));page.locator('#scene').screenshot(path=str(out/'border34-repaired-composite.png'));b.close()
