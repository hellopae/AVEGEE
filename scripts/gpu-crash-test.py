#!/usr/bin/env python3
"""T1c GPU-loss recovery check (Chromium via Playwright, 390x844): crash the GPU process with CDP `Browser.crashGpuProcess` and see what the game looks like afterwards.

  python3 scripts/serve-nocache.py 8962 &
  BASE=http://127.0.0.1:8962/index.html OUT=Output/Review/<dir> python3 scripts/gpu-crash-test.py [zones: th,asia,west,cyberhell | battle | trial]

For every scene it takes a screenshot (A), crashes the GPU, waits, takes another (B) and prints: did the page reload (performance.timeOrigin changed), the loss counters of
src/gpu-recovery.js, the page errors, and how different B is from A compared with how different two quiet shots of A are (animated water / clouds make A differ from A by a bit).
`DIFF` is the mean absolute pixel difference (0-255) of the 8x-downsampled screenshots and `BLANK` the share of the screen that went (near) transparent/black where A was not.
"""
import json, os, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(Path(__file__).parent))
import importlib.util
spec = importlib.util.spec_from_file_location('probe', str(Path(__file__).parent / 'gpu-memory-probe.py')); probe = importlib.util.module_from_spec(spec); spec.loader.exec_module(probe)
import numpy as np
from PIL import Image
import io

OUT = Path(os.environ.get('OUT', '/tmp/gpu-crash')); OUT.mkdir(parents=True, exist_ok=True)

def shot(pg, name):
    b = pg.screenshot(); (OUT / f'{name}.png').write_bytes(b)
    im = Image.open(io.BytesIO(b)).convert('RGB'); a = np.asarray(im, dtype=np.float32)
    h, w = a.shape[0] // 8 * 8, a.shape[1] // 8 * 8
    return a[:h, :w].reshape(h // 8, 8, w // 8, 8, 3).mean(axis=(1, 3))

def stats(pg):
    return pg.evaluate("""async()=>{const m=await import('./src/gpu-recovery.js');return {origin:performance.timeOrigin,stats:{...m.gpuLossStats},zone:window.G&&G.zone}}""")

def crash(browser, pg, wait=4000):
    cdp = browser.new_browser_cdp_session()
    try: cdp.send('Browser.crashGpuProcess')
    except Exception as e: print('crash cmd:', e)
    pg.wait_for_timeout(wait)

def check(browser, pg, errs, name, prep=None, dialogs=False):
    if not dialogs:
        for _ in range(3): pg.wait_for_timeout(1200); probe.close_dialogs(pg)   # arrival / story cards pop up late: they are not what is being tested
    if prep: prep()
    pg.wait_for_timeout(800)
    a1 = shot(pg, f'{name}-A'); pg.wait_for_timeout(1200); a2 = shot(pg, f'{name}-A2')
    s0 = stats(pg)
    if os.environ.get('NOCRASH'): pg.wait_for_timeout(4000)   # control run: the same waiting without crashing the GPU (what changes by itself - animation, timers)
    else: crash(browser, pg)
    try: pg.wait_for_load_state('load', timeout=15000)
    except Exception: pass
    pg.wait_for_timeout(int(os.environ.get('POST_WAIT', 9000)))
    if not dialogs: probe.close_dialogs(pg); pg.wait_for_timeout(600)
    b = shot(pg, f'{name}-B'); pg.wait_for_timeout(1600); shot(pg, f'{name}-B2')   # B2 = a second look 1.6 s later (animated sprites fade / bob)
    s1 = stats(pg)
    noise = float(np.abs(a1 - a2).mean()); diff = float(np.abs(a1 - b).mean())
    blank = float(((np.abs(a1 - b).mean(axis=2) > 40) & (b.mean(axis=2) < 25)).mean())
    r = {'scene': name, 'reloaded': s1['origin'] != s0['origin'], 'lossStats': s1['stats'], 'zoneBefore': s0['zone'], 'zoneAfter': s1['zone'], 'noise': round(noise, 2), 'DIFF': round(diff, 2), 'BLANK': round(blank, 4), 'errors': errs[-3:]}
    print(json.dumps(r), flush=True); return r

if __name__ == '__main__':
    what = (sys.argv[1] if len(sys.argv) > 1 else 'th,asia,west,cyberhell').split(',')
    res = []
    with sync_playwright() as p:
        mode = os.environ.get('MODE')   # reload | none | (empty = the game's own rebuild path)
        browser, ctx, pg, errs = probe.boot(p, init=f"sessionStorage.setItem('avegee.gpuRecoverMode','{mode}')" if mode else None)
        if os.environ.get('FAIL'):   # fallback check: a reset that throws makes the rebuild report a failure -> the game must save + reload into the same slot
            pg.evaluate("async()=>{const m=await import('./src/gpu-budget.js');m.registerGpuLossReset('t1c-forced-failure',()=>{throw new Error('forced')});}")
        for z in [w for w in what if w in ('th', 'asia', 'west', 'cyberhell')]:
            probe.goto_zone(pg, z); res.append(check(browser, pg, errs, f'zone-{z}'))
        if 'battle' in what:
            def prep():
                probe.goto_zone(pg, 'th'); probe.close_dialogs(pg)
                pg.evaluate("()=>{G.hpMax=G.hp=400;G.spawnSoul();const s=G.queue[0];s.resist=true;s.back=null;s.pure=false;const b=G.startBattle(s);b.kind='yama';G.onChange();}"); pg.wait_for_timeout(3500)
            res.append(check(browser, pg, errs, 'battle', prep, dialogs=True))
        if 'trial' in what:
            def prep():
                probe.goto_zone(pg, 'th'); probe.close_dialogs(pg)
                pg.evaluate("()=>{G.taught=G.taught.filter(k=>k!=='court-onboarding');G.courtArrivals=[];G.courtClosed=false;G.onChange();}"); pg.wait_for_timeout(1500); pg.click('#hud-trial', timeout=5000); pg.wait_for_timeout(2500)
                try: pg.click('text=เข้าใจแล้ว', timeout=2500)
                except Exception: pass
                for _ in range(5):
                    try: pg.click('text=ถัดไป', timeout=1500); pg.wait_for_timeout(500)
                    except Exception: break
                for lbl in ('เสร็จ', 'เข้าใจ', 'ปิด'):
                    try: pg.click(f'text={lbl}', timeout=800)
                    except Exception: pass
                pg.wait_for_timeout(2500)
            res.append(check(browser, pg, errs, 'trial', prep, dialogs=True))
        browser.close()
    (OUT / 'result.json').write_text(json.dumps(res, indent=1, ensure_ascii=False))
