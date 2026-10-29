"""Run from repo root: python3 output/coordination/2026-10-28-b34-border34/capture.py.
Requires Python Playwright + Chromium. Uses real production renderer/CSS/import map.
Positions and cleared fights are seeded in memory for VISUAL review only; no saves.
Launch once; a launch failure is recorded without retries.
"""
import functools
import http.server
import json
from pathlib import Path
import re
import threading
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
source = (ROOT / 'index.html').read_text()
head = source.split('</head>')[0] + '</head>'
importmap = re.search(r'<script type="importmap">.*?</script>', source, re.S).group()
fixture = head + '<body>' + importmap + '''
<dialog class="dungeon-dialog"><div id="dungeon-root"></div></dialog>
<script type="module">
import * as view from './src/dungeon-view.js';
import * as travel from './src/zone-travel.js';
import {bindZone,warmZone} from './src/art.js';
bindZone(()=> 'west');
const id='west:cyberhell';let destroy;
window.review={show(progress){
 destroy?.();document.querySelector('#dungeon-root').replaceChildren();
 const g={zone:'west',bossCleared:{west:true},zoneEvents:{},save(){}};
 travel.initializeZoneTravel(g);travel.beginDungeon(g,'cyberhell');
 for(let i=0;i<3;i++){const e=travel.nextDungeonEncounter(g);travel.resolveDungeonEncounter(g,e.token,true);}
 g.zoneTravel.active.patrolDefeated=travel.dungeonPatrols(id).map(p=>p.id);
 const p=view.dungeonPoint(progress,id);g.zoneTravel.active.position={x:p[0],y:p[1]};
 warmZone('west');destroy=view.mountDungeonView(document.querySelector('#dungeon-root'),g);
}};
document.querySelector('dialog').showModal();review.show(0);
</script></body></html>'''

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass

    def do_GET(self):
        if self.path.split('?')[0] == '/__b34-review.html':
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(fixture.encode())
        else:
            super().do_GET()

records = {'fixture': 'Seeded visual snapshots, not a browser traversal test', 'views': []}
server = None
try:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Handler, directory=str(ROOT)))
        threading.Thread(target=server.serve_forever, daemon=True).start()
        for width, height in [(1440, 900), (390, 844)]:
            context = browser.new_context(viewport={'width': width, 'height': height}, device_scale_factor=1, reduced_motion='reduce')
            page = context.new_page()
            record = {'viewport': [width, height], 'pageErrors': [], 'console': [], 'failedRequests': [], 'httpErrors': [], 'screenshots': []}
            records['views'].append(record)
            page.on('pageerror', lambda e: record['pageErrors'].append(str(e)))
            page.on('console', lambda m: record['console'].append({'type': m.type, 'text': m.text}))
            page.on('requestfailed', lambda r: record['failedRequests'].append(r.url))
            page.on('response', lambda r: record['httpErrors'].append({'status': r.status, 'url': r.url}) if r.status >= 400 else None)
            page.goto(f'http://127.0.0.1:{server.server_port}/__b34-review.html', wait_until='networkidle')
            page.wait_for_function('window.review')
            for label, progress in [('start', 0), ('middle', .4), ('lower', .75), ('exit', 1)]:
                page.evaluate('p=>review.show(p)', progress)
                page.wait_for_function("document.querySelector('.dungeon-load').hidden")
                page.wait_for_timeout(2000)
                name = f'{width}-{label}.png'
                page.screenshot(path=str(OUT / name))
                record['screenshots'].append(name)
            context.close()
        browser.close()
except Exception as exc:
    records['blocker'] = str(exc)
    raise
finally:
    if server:
        server.shutdown()
    (OUT / 'browser.json').write_text(json.dumps(records, ensure_ascii=False, indent=2))
