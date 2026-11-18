import os,sys,json,time
from playwright.sync_api import sync_playwright
BASE=os.environ.get('BASE','http://127.0.0.1:8802/index.html')
DISMISS="()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}"
TERRAIN="async()=>{const m=await import('./src/town-terrain.js');return {s:m.townTerrainStats(),v:m.townTerrainViewStats()}}"
def boot(p,w,h,dpr,mobile=False,route=None,zone='th'):
    browser=p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx=browser.new_context(viewport={'width':w,'height':h},device_scale_factor=dpr,is_mobile=mobile,has_touch=mobile)
    if route: route(ctx)
    pg=ctx.new_page();errs=[]
    pg.on('pageerror',lambda e:errs.append('pageerror: '+str(e)))
    pg.on('response',lambda r:errs.append(f'http {r.status}: {r.url}') if r.status>=400 else None)
    pg.goto(BASE);pg.wait_for_timeout(3000)
    try: pg.click('#enter-gate button',timeout=1500)
    except Exception: pass
    pg.wait_for_timeout(500);pg.click('#splash-skip');pg.wait_for_timeout(2000)
    pg.click('#t-start');pg.wait_for_timeout(1500);pg.click('text=SLOT 1');pg.wait_for_timeout(2500)
    pg.click('#intro-skip');pg.wait_for_timeout(1500)
    for _ in range(8):
        n=pg.evaluate(DISMISS);pg.wait_for_timeout(300)
        if not n:break
    pg.wait_for_timeout(1500)
    for _ in range(4): pg.evaluate(DISMISS);pg.wait_for_timeout(300)
    pg.add_style_tag(content='dialog{display:none!important}')
    return browser,pg,errs
def look(pg,x,y,wait=True):
    pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y}",[x,y]);pg.wait_for_timeout(900)
    if wait:
        for _ in range(40):
            if pg.evaluate(TERRAIN)['v']['mode']=='detail':break
            pg.wait_for_timeout(250)
        pg.wait_for_timeout(700)
