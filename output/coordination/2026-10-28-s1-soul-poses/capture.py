#!/usr/bin/env python3
"""Run from repo root: python3 output/coordination/2026-10-28-s1-soul-poses/capture.py.
Uses the actual index.html/ui.js renderer, temporary browser storage and a loopback server.
One launch only; failure logs the blocker without retrying.
"""
from pathlib import Path
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import threading, json
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *args): pass
server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
threading.Thread(target=server.serve_forever, daemon=True).start()
errors, captures = [], []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        for width, height in [(1440, 1000), (390, 844)]:
            for key in ['pol', 'recruit']:
                context = browser.new_context(viewport={'width':width,'height':height}, device_scale_factor=1)
                page = context.new_page()
                page.on('console', lambda m: errors.append({'type':m.type,'text':m.text}) if m.type in ['error','warning'] else None)
                page.on('pageerror', lambda e: errors.append({'type':'pageerror','text':str(e)}))
                page.goto(f'http://127.0.0.1:{server.server_port}/', wait_until='domcontentloaded')
                page.wait_for_function('!!window.G', timeout=60000)
                page.evaluate('''async key => {
                  const {ALL_CASES} = await import('./src/cases.js');
                  const {applySoulPortrait} = await import('./src/soul-portraits.js');
                  const {lockSoulTrait} = await import('./src/interrogation.js');
                  const {openTrial,startPlay} = await import('./src/ui.js');
                  const c=ALL_CASES.find(c=>c.k===key), g=window.G;
                  // New browser context: no user saves. Preserve real press/renderer behavior.
                  g.save=()=>true;g.over=null;g.battle=null;g.storyQueue=[];
                  g.taught.push('trial-calculation','interrogation-traits');
                  g.queue=[lockSoulTrait(applySoulPortrait({id:99999,case:c.k,kind:c.kind,
                    who:c.who,name:c.name,sex:c.sex,face:c.face,waited:0,said:[],presses:2,
                    deeds:[...c.seen.map(d=>({...d,known:true,visible:false})),...c.hidden.map(d=>({...d,known:false}))],
                    merits:structuredClone(c.merits),lines:c.claims.map((l,i)=>({...l,i,used:false})),deserved:5},'th'),c)];
                  g.courtArrivals=[];
                  startPlay(false);
                  document.querySelector('#boot')?.remove();
                  document.querySelector('#enter-gate')?.remove();
                  openTrial();
                }''', key)
                fig=page.locator('dialog[open] .fig.foe')
                fig.wait_for()
                page.wait_for_function("document.querySelector('dialog[open] .fig.foe img')?.naturalWidth > 0")
                prefix=f'{key}-{width}x{height}'
                page.screenshot(path=str(OUT/f'{prefix}-before.png'))
                page.locator('dialog[open] [data-line="0"]').click()
                page.wait_for_function("document.querySelector('dialog[open] .fig.foe')?.matches('.is-frightened,.is-relieved')")
                page.wait_for_function("document.querySelector('dialog[open] .fig.foe img')?.naturalWidth > 0")
                page.screenshot(path=str(OUT/f'{prefix}-after.png'))
                captures.append({'case':key,'viewport':[width,height], 'replacement':fig.evaluate("e=>e.classList.contains('has-soul-pose')"), 'src':fig.locator('img').get_attribute('src')})
                page.wait_for_timeout(1900)
                context.close()
        browser.close()
    (OUT/'browser-results.json').write_text(json.dumps({'captures':captures,'console':errors},indent=2,ensure_ascii=False))
except Exception as e:
    (OUT/'browser-blocker.log').write_text(str(e))
    raise
finally:
    server.shutdown()
