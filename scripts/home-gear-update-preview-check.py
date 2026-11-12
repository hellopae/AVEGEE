"""Browser check for the Home gear fix + ?update=preview.  Serve the repo root (threaded static server), then:
  python3 scripts/home-gear-update-preview-check.py   # prints JSON; shots go to docs/art-reviews/2026-11-12-home-gear-update-preview/
Expect gear_dialogs [settings-modal], after_close / after_slot_menu_close [], play_dialogs [discovery], preview banner+chip true, stale_latched false, plain banner false."""
import sys, json, os
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE','http://127.0.0.1:8811/index.html')
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'docs/art-reviews/2026-11-12-home-gear-update-preview')
os.makedirs(OUT,exist_ok=True)
res={}
def boot(pg,url):
    pg.goto(url); pg.wait_for_timeout(2500)
    try: pg.click('#enter-gate button',timeout=1500)
    except Exception: pass
    pg.click('#splash-skip'); pg.wait_for_timeout(2200)
OPEN="()=>[...document.querySelectorAll('dialog[open]')].map(d=>d.className)"
with sync_playwright() as p:
    b=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    for W,H in ((390,844),(1792,1120)):
        ctx=b.new_context(viewport={'width':W,'height':H}); pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        # stamped build + same version.json -> normal behaviour is "no banner"
        html=open(os.path.join(ROOT,'index.html')).read().replace('__BUILD_ID__','same1234')
        ctx.route('**/index.html*',lambda r:r.fulfill(status=200,content_type='text/html',body=html))
        ctx.route('**/version.json*',lambda r:r.fulfill(status=200,content_type='application/json',body='{"build":"same1234"}'))
        r={}
        boot(pg,BASE)
        r['home_plain_banner_visible']=pg.evaluate("()=>{const b=document.getElementById('update-banner');return !!b&&!b.hidden}")
        pg.click('#t-start'); pg.wait_for_timeout(1200); pg.click('text=SLOT 1'); pg.wait_for_timeout(2500)
        try: pg.click('#intro-skip',timeout=3000)
        except Exception: pass
        pg.wait_for_timeout(1500); pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(500)
        pg.evaluate("()=>{G.discoverySeen={};G.discoveryQueue=['power:roar'];G.save()}")
        pg.goto(BASE); pg.wait_for_timeout(2500)
        try: pg.click('#enter-gate button',timeout=1500)
        except Exception: pass
        pg.click('#splash-skip'); pg.wait_for_timeout(2200)
        pg.click('#t-set'); pg.wait_for_timeout(1200)
        r['gear_dialogs']=pg.evaluate(OPEN)
        pg.screenshot(path=f'{OUT}/home-{W}-gear-settings.png')
        pg.keyboard.press('Escape'); pg.wait_for_timeout(1500)
        r['after_close_dialogs']=pg.evaluate(OPEN)
        # again via save-slot menu close
        pg.click('#t-start'); pg.wait_for_timeout(1000); pg.keyboard.press('Escape'); pg.wait_for_timeout(1500)
        r['after_slot_menu_close']=pg.evaluate(OPEN)
        pg.screenshot(path=f'{OUT}/home-{W}-after-close.png')
        # enter the real save: the pending unlock now shows during play
        pg.click('#t-start'); pg.wait_for_timeout(1000); pg.click('text=SLOT 1'); pg.wait_for_timeout(3500)
        r['play_dialogs']=pg.evaluate(OPEN)
        r['play_discovery_text']=pg.evaluate("()=>document.querySelector('dialog.discovery[open] h2')?.innerText||null")
        pg.screenshot(path=f'{OUT}/play-{W}-discovery.png')
        r['errors']=errs[:3]; res[W]=r; ctx.close()
        # preview
        ctx=b.new_context(viewport={'width':W,'height':H}); pg=ctx.new_page()
        ctx.route('**/index.html*',lambda r_:r_.fulfill(status=200,content_type='text/html',body=html))
        ctx.route('**/version.json*',lambda r_:r_.fulfill(status=200,content_type='application/json',body='{"build":"same1234"}'))
        pr={}
        boot(pg,BASE+'?update=preview')
        pr['home_banner_visible']=pg.evaluate("()=>{const b=document.getElementById('update-banner');return !!b&&!b.hidden}")
        pr['stale_latched']=pg.evaluate("()=>window.__versionCheck.watch.stale")
        pg.evaluate("()=>{window.__marker=1}")
        pg.screenshot(path=f'{OUT}/home-{W}-preview-banner.png')
        pg.click('#update-banner'); pg.wait_for_timeout(800)
        pr['no_reload_on_tap']=pg.evaluate("()=>window.__marker===1")
        pg.click('#t-start'); pg.wait_for_timeout(1000); pg.click('text=SLOT 1'); pg.wait_for_timeout(3000)
        try: pg.click('#intro-skip',timeout=2000)
        except Exception: pass
        pg.wait_for_timeout(1000)
        pr['play_chip_visible']=pg.evaluate("()=>{const b=document.getElementById('update-chip');return !!b&&!b.hidden}")
        pg.screenshot(path=f'{OUT}/play-{W}-preview-chip.png')
        res[W]['preview']=pr; ctx.close()
        # no flag, fresh context: nothing leaks
        ctx=b.new_context(viewport={'width':W,'height':H}); pg=ctx.new_page()
        ctx.route('**/index.html*',lambda r_:r_.fulfill(status=200,content_type='text/html',body=html))
        ctx.route('**/version.json*',lambda r_:r_.fulfill(status=200,content_type='application/json',body='{"build":"same1234"}'))
        boot(pg,BASE)
        res[W]['after_preview_plain_home_banner']=pg.evaluate("()=>{const b=document.getElementById('update-banner');return !!b&&!b.hidden}")
        res[W]['plain_dataset']=pg.evaluate("()=>[document.documentElement.dataset.updatePreview,document.documentElement.dataset.updateAvailable]")
        ctx.close()
    print(json.dumps(res,indent=1,ensure_ascii=False)); b.close()
