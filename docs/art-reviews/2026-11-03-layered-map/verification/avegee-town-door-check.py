from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).resolve().parents[1]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True);page=b.new_page(viewport={'width':1280,'height':1000});page.goto('http://127.0.0.1:8873/docs/art-reviews/2026-11-03-layered-map/maps.html');page.wait_for_function('!!window.layerReviewGallery');rows=[]
 for key in ['zone1','zone2','zone3','zone4']:
  page.select_option('#map',key);page.wait_for_function("!document.querySelector('#map').disabled")
  r=page.evaluate('''()=>{const r=layerReviewGallery;return r.townObjects.filter(o=>o.kind==='station').map(o=>{const p=[(o.site.x??o.site.bx)/3840,(o.site.y??o.site.by+38)/2560],target=r.nav.snap(p),shift=Math.hypot((target[0]-p[0])*3840,(target[1]-p[1])*2560);return {id:o.id,door:p,stand:target,approachShiftWorld:shift,within105:shift<=105,reachable:r.nav.path(r.hero,target).length>0};});}''');rows.append({'map':key,'doors':r})
 result={'maps':rows,'basis':'Existing runtime door coordinates, nearest stand on owner floor minus rail/object feet; within105-world-unit preview approach, not full interaction gameplay.'};(out/'town-door-review.json').write_text(json.dumps(result,indent=2));print(json.dumps([{'map':r['map'],'doors':len(r['doors']),'issues':[x for x in r['doors'] if not(x['reachable']and x['within105'])]}for r in rows]));b.close()
