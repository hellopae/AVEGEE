"""Capture production UI; expose existing private scene opener in HTTP response only.
Fixtures set in-memory game state, never save files. Run before/after edits.
"""
import functools, http.server, threading, json, sys, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path.cwd(); OUT=Path(__file__).resolve().parent
phase=sys.argv[1]
assert phase in ('before','after')
source_cache={}
def source(path):
    if path not in source_cache:
        source_cache[path]=(subprocess.check_output(['git','show',f'HEAD:{path}']).decode() if phase=='before' else (ROOT/path).read_text())
    return source_cache[path]
class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self,*a): pass
    def do_GET(self):
        path=self.path.split('?')[0].lstrip('/') or 'index.html'
        if path=='index.html' or path.startswith('src/') and path.endswith(('.js','.css')):
            data=source(path)
            if path=='src/ui.js':data+="\nwindow.__r1={openFrontierWalk,setMapZoom,refresh};"
            self.send_response(200);self.send_header('Content-Type', 'text/html' if path.endswith('.html') else 'text/css' if path.endswith('.css') else 'text/javascript');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data.encode())
        else: super().do_GET()
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)))
threading.Thread(target=server.serve_forever,daemon=True).start()
records=[]
with sync_playwright() as p:
    browser=p.chromium.launch()
    for size in [(1440,900),(390,844)]:
        context=browser.new_context(viewport={'width':size[0],'height':size[1]},device_scale_factor=1,reduced_motion='reduce')
        page=context.new_page(); errors=[]; logs=[]
        page.on('pageerror',lambda e:errors.append(str(e)))
        page.on('console',lambda m:logs.append({'type':m.type,'text':m.text}))
        page.goto(f'http://127.0.0.1:{server.server_port}',wait_until='load')
        page.wait_for_function('window.G && window.__r1')
        page.evaluate("""async()=>{const m=await import(document.querySelector('script[src^=\"src/ui.js?\"]').src);m.startPlay(false);G.save=()=>true;G.paused=true;G.mobs=[];G.queue=[];G.breachMarch=()=>true;__r1.setMapZoom(0);}""")
        for zone in ['th','asia','west','cyberhell']:
            page.evaluate("async z=>{G.zone=z;const d=await import('/src/data.js');d.syncSceneZone(z);__r1.refresh();}",zone)
            page.wait_for_timeout(1400)
            page.screenshot(path=str(OUT/f'{phase}-town-{zone}-{size[0]}.png'))
        page.evaluate("()=>{G.zone='th';G.breachMarch=()=>false;__r1.openFrontierWalk('frontierBreach');}")
        page.wait_for_timeout(1700)
        page.screenshot(path=str(OUT/f'{phase}-frontier-{size[0]}.png'))
        records.append({'viewport':size,'pageErrors':errors,'console':logs,'hud':page.locator('.frw-bottom').inner_text()})
        context.close()
    browser.close()
server.shutdown()
(OUT/f'{phase}-browser.json').write_text(json.dumps(records,ensure_ascii=False,indent=2))
