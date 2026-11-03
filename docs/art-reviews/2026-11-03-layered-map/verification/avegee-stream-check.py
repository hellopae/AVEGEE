from pathlib import Path
from playwright.sync_api import sync_playwright
import json,time
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':980});requests=[];errors=[];page.on('request',lambda r:requests.append(r.url));page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/play.html');page.wait_for_function('window.layerStreamReview?.ready',timeout=60000)
 initial=page.evaluate('''()=>{const r=layerStreamReview;return {map:r.meta.id,view:r.camera.view,hero:r.hero,stats:r.stats,totalTiles:r.meta.tiles.length,wanted:r.wants.length};}''');page.locator('#scene').screenshot(path=str(out/'stream-border12-near.png'))
 page.locator('#closer').click();page.wait_for_function('layerStreamReview.camera.zoom>2.55&&layerStreamReview.ready',timeout=60000);page.locator('#scene').screenshot(path=str(out/'stream-border12-close.png'))
 page.locator('#near').click();page.wait_for_function('layerStreamReview.camera.zoom<2.05&&layerStreamReview.ready',timeout=60000)
 moving=page.evaluate('layerStreamReview.goTo(layerStreamReview.meta.goals[0])');page.wait_for_timeout(4500);after=page.evaluate('''()=>{const r=layerStreamReview;return {view:r.camera.view,hero:r.hero,stats:r.stats,ready:r.ready};}''');page.locator('#scene').screenshot(path=str(out/'stream-border12-walk.png'))
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(100);overflow=page.evaluate('document.documentElement.scrollWidth>innerWidth');page.locator('#scene').screenshot(path=str(out/'stream-mobile.png'))
 forbidden=[u for u in requests if '-study.png' in u or 'map-zone' in u and '/img/' in u or 'zone1-2-v6.webp' in u or '/img/yama-animation-v1/' in u]
 result={'initial':initial,'afterWalk':after,'pathStarted':moving,'mobileOverflow':overflow,'forbiddenFullMapRequests':forbidden,'imageRequests':len([u for u in requests if u.endswith('.webp')]),'errors':errors};(out/'stream-browser-review.json').write_text(json.dumps(result,indent=2));print(json.dumps(result));b.close()
