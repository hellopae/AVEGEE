"""Reviewer-only real Chromium evidence. Run from repo root with a local HTTP server:
python3 -m http.server 8779 --bind 127.0.0.1
python3 output/coordination/2026-10-28-r2-battle-fx/capture-browser.py
Requires installed Python playwright + Chromium. Not run in the blocked sandbox.
Instrumentation is served in memory; production files are never rewritten.
"""
import json
import os
import re
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent
BASE = os.environ.get('R2_BASE_URL', 'http://127.0.0.1:8779').rstrip('/')
IMPORTMAP = re.search(r'<script type="importmap">(.*?)</script>', (ROOT/'index.html').read_text(), re.S).group(0)
BOOT = """() => {
 G.onChange=()=>{};G.save=()=>true;G.assetsLoading=false;
 document.querySelector('#boot')?.remove();document.querySelector('#title')?.classList.add('gone');
 document.querySelector('#enter-gate')?.remove();
 G.level=10;G.abilities={...G.abilities,hypno:true,windFan:true};G.mp=G.mpMax=1000;
 G.startBattle({id:999,who:'เปรต',sp:'mob-pret',deserved:4,resist:true});
 G.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[1,1];});
 __r2.openBattle();
}"""

def instrument(route):
    response = route.fetch()
    source = response.text().replace(
        "    dlg.querySelectorAll('[data-execute]')",
        "    globalThis.__r2.execute=executeCommand;\n    dlg.querySelectorAll('[data-execute]')")
    source += '\nglobalThis.__r2={openBattle,timings:()=>battleCutscenes.timings(),cache:()=>battleCutscenes};'
    route.fulfill(response=response, body=source)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    measurements = []
    try:
        # New context per trial: no HTTP/storage cache. CDP network throttle is real.
        for trial in range(1, 11):
            context = browser.new_context(viewport={'width':1440,'height':1000}, reduced_motion='reduce' if trial == 10 else 'no-preference')
            page = context.new_page()
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.route('**/src/ui.js*', instrument)
            page.goto(BASE+'/', wait_until='domcontentloaded')
            page.wait_for_function('!!window.__r2', timeout=90000)
            cdp = context.new_cdp_session(page)
            cdp.send('Network.enable')
            cdp.send('Network.setCacheDisabled', {'cacheDisabled':True})
            cdp.send('Network.emulateNetworkConditions', {'offline':False,'latency':400,'downloadThroughput':50000,'uploadThroughput':50000})
            page.evaluate(BOOT)
            page.wait_for_function('typeof __r2.execute === "function"')
            result = page.evaluate("""async () => {
              const start=performance.now();await __r2.execute('ice');
              const overlay=document.querySelector('.action-cutscene');
              return {waitMs:performance.now()-start,image:overlay?.querySelector('img')?.complete || false,
                overlay:!!overlay,imageState:overlay?.dataset.imageState,timings:__r2.timings()};
            }""")
            page.screenshot(path=str(OUT/f'cold-{trial:02}.png'))
            page.wait_for_function('G.battle && !G.battle.commandBusy && !document.querySelector(".action-cutscene")', timeout=20000)
            result['finished'] = True
            # Retain the same battle cache, then replay through the real handler after decoding.
            if trial == 1:
                page.evaluate('async()=>{await __r2.cache().warm(__r2.timings().map(x=>x.src));}')
                page.wait_for_function('G.currentBattleTurn()?.side === "ally" && !G.battle.commandBusy', timeout=20000)
                result['warmReplay'] = page.evaluate("""async()=>{
                  const start=performance.now();await __r2.execute('ice');
                  return {waitMs:performance.now()-start,image:!!document.querySelector('.action-cutscene img'),timings:__r2.timings()};
                }""")
                page.wait_for_function('G.battle && !G.battle.commandBusy && !document.querySelector(".action-cutscene")', timeout=20000)
            result.update(trial=trial, errors=errors, network={'latencyMs':400,'downloadBytesPerSecond':50000}, reducedMotion=trial == 10)
            measurements.append(result)
            (OUT/'browser-readiness.json').write_text(json.dumps(measurements, indent=2, ensure_ascii=False))
            assert result['overlay'] and result['finished'] and not errors, result
            context.close()

        # Real production canvas renderer at deterministic mid-flight time.
        # Fixture, not a full gameplay screenshot; uses shipped textures and renderer.
        context = browser.new_context(viewport={'width':1000,'height':650})
        page = context.new_page()
        fixture = '<!doctype html>'+IMPORTMAP+'''<style>
        body{background:#202632;color:white;font:24px sans-serif}#arena{position:relative;width:900px;height:500px;background:#303846}
        img{position:absolute;width:150px;height:200px;object-fit:contain;top:180px}#hero{left:50px}#foe{left:680px}</style>
        <h1 id="label"></h1><div id="arena"><img id="hero" src="img/hero-yama.png"><img id="foe" src="img/spirit7.png"></div>
        <script type="module">import * as fx from './src/battle-fx.js';
        window.fx=fx;fx.attachBattleFx(document.querySelector('#arena'));fx.fxAdvance(0);</script>'''
        page.route('**/__r2_renderer__', lambda route: route.fulfill(body=fixture, content_type='text/html'))
        page.goto(BASE+'/__r2_renderer__')
        page.wait_for_function('!!window.fx')
        for action in ['ice','windFan','hypno']:
            page.evaluate("""async action=>{
              document.querySelector('#label').textContent=action+' — production renderer fixture';
              fx.warmAllFx();
              const keys={ice:['fx-ice-crystal-a','fx-ice-glow-core'],windFan:['fx-wind-blade','fx-wind-vortex'],hypno:['fx-hypno-spiral','fx-hypno-circle','fx-hypno-eye']}[action];
              await Promise.all(keys.map(key=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>im.decode().then(resolve,reject);im.onerror=reject;im.src='img/fx/'+key+'.webp?v=m3';})));
              fx.stopBattleFx();fx.playBattleFx({action,numbers:false,src:{l:50,t:180,r:200,b:380},targets:[{rect:{l:680,t:180,r:830,b:380}}]});
              fx.fxAdvance(110);
            }""", action)
            page.screenshot(path=str(OUT/f'renderer-{action}-midflight.png'))
        context.close()
    finally:
        browser.close()
