from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=str(Path(__file__).resolve().parents[1])+'/'
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 page=b.new_page(viewport={'width':1280,'height':900});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/');page.wait_for_function("document.querySelector('#status').textContent.startsWith('โหลดครบ')")
 status=page.locator('#status').inner_text();page.screenshot(path=out+'review-desktop.png',full_page=True)
 page.set_viewport_size({'width':390,'height':844});overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth')
 page.locator('#pause').click();pause=page.locator('#pause').inner_text();page.locator('#mask').check();page.locator('#roots').check();page.locator('#reference').check();page.wait_for_timeout(300)
 page.screenshot(path=out+'review-mobile.png',full_page=True)
 report={'status':status,'errors':errors,'mobileOverflow':overflow,'pauseButton':pause}
 open(out+'browser-review.json','w').write(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False));b.close()
