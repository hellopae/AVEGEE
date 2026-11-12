#!/usr/bin/env python3
"""Z1-V5-FX3: walk the whole zone-1 map at 390x844 (DPR 3) and measure what the ground loader costs.

  BASE=http://127.0.0.1:8797/index.html CH=chromium [THROTTLE=4] [OLD=1] python3 scripts/z1-v5-fx3-walk.py [out.json]
OLD=1 serves src/town-terrain.js + src/town-lighting.js from git HEAD~ (the loader before FX3) through a Playwright route, so before / after run on the same
tree, same machine, same route.  Output: process RSS peak / final (renderer, GPU), chunks loaded / evicted, worst frame, seconds spent on the blurry
overview while walking (mode loading-detail), per-frame stalls over 100 ms.
The hero is moved along a route in 60 steps per leg (about 210 units per second: roughly the real walking speed) with G.player teleports, like the other evidence scripts."""
import os, sys, json, time, subprocess, importlib.util
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ev', os.path.join(HERE, 'z1-v5-fx-evidence.py')); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
ROUTE = [(1900, 2250), (1900, 1650), (1900, 950), (700, 760), (700, 1500), (1500, 1750), (2500, 1650), (3300, 1300), (3300, 700), (2480, 470), (1900, 1200), (1900, 2250)]
SPEED = 210   # units per second
ROOT = os.path.dirname(HERE)
OLD_REF = os.environ.get('OLD_REF', '454dc5b6')
RAF = """() => { if (window.__w) return; const w = window.__w = {t0: performance.now(), last: performance.now(), max: 0, stalls: 0, frames: 0, blur: 0, tick: 0};
  const loop = t => { const d = t - w.last; w.last = t; w.frames++; if (d > w.max) w.max = d; if (d > 100) w.stalls++; requestAnimationFrame(loop); }; requestAnimationFrame(loop); }"""

def rss(pid):
    try: return int(subprocess.check_output(['ps', '-o', 'rss=', '-p', str(pid)]).split()[0]) / 1024
    except Exception: return 0

def main(out):
    w, h, dpr = 390, 844, 3
    with sync_playwright() as p:
        browser = p.chromium.launch(channel=os.environ.get('CH') or None, args=['--autoplay-policy=no-user-gesture-required'])
        ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr)
        if os.environ.get('OLD'):
            for name in ('town-terrain.js', 'town-lighting.js'):
                body = subprocess.check_output(['git', 'show', f'{OLD_REF}:src/{name}'], cwd=ROOT, text=True)
                ctx.route(f'**/src/{name}*', (lambda b: (lambda route, request=None: route.fulfill(status=200, content_type='text/javascript', body=b)))(body))
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(ev.BASE); pg.wait_for_timeout(3000)
        try: pg.click('#enter-gate button', timeout=1500)
        except Exception: pass
        pg.wait_for_timeout(500)
        pg.click('#splash-skip'); pg.wait_for_timeout(2000); pg.click('#t-start'); pg.wait_for_timeout(1500)
        pg.click('text=SLOT 1'); pg.wait_for_timeout(2500); pg.click('#intro-skip'); pg.wait_for_timeout(1500)
        for _ in range(8):
            n = pg.evaluate("()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}")
            pg.wait_for_timeout(300)
            if not n: break
        pg.add_style_tag(content='#town-map-panel,.fabs,#res{visibility:hidden}')
        cdp = ctx.new_cdp_session(pg); bcdp = browser.new_browser_cdp_session()
        if os.environ.get('THROTTLE'): cdp.send('Emulation.setCPUThrottlingRate', {'rate': float(os.environ['THROTTLE'])})
        pg.evaluate(RAF)
        TERRAIN = "async()=>{const m=await import('./src/town-terrain.js');return {s:m.townTerrainStats(),v:m.townTerrainViewStats()}}"
        def procs():
            info = bcdp.send('SystemInfo.getProcessInfo')['processInfo']
            return {i['type']: round(rss(i['id'])) for i in info if i['type'] in ('renderer', 'GPU')}
        base = procs(); peak = dict(base); blurry_steps = 0; steps = 0; modes = {}; blur_at = []
        ev.look(pg, *ROUTE[0]); pg.wait_for_timeout(3000)
        t_start = time.time()
        for a, b in zip(ROUTE, ROUTE[1:]):
            dist = ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2) ** .5; n = max(2, int(dist / SPEED * 10))
            for k in range(1, n + 1):
                x = a[0] + (b[0] - a[0]) * k / n; y = a[1] + (b[1] - a[1]) * k / n
                pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y}", [x, y]); pg.wait_for_timeout(100)
                steps += 1
                if steps % 5 == 0:
                    tv = pg.evaluate(TERRAIN); v = tv['v']; modes[v['mode']] = modes.get(v['mode'], 0) + 1
                    if v['mode'] != 'detail': blur_at.append([round(x), round(y), v['mode'], v['visible'], tv['s']['ready'], tv['s']['loading']])
                    pr = procs(); peak = {k2: max(peak.get(k2, 0), pr.get(k2, 0)) for k2 in set(peak) | set(pr)}
        pg.wait_for_timeout(2500)
        final = procs(); st = pg.evaluate(TERRAIN); wv = pg.evaluate("()=>window.__w")
        res = {'old_loader': bool(os.environ.get('OLD')), 'throttle': os.environ.get('THROTTLE') or 1, 'walk_seconds': round(time.time() - t_start, 1), 'rss_MB_start': base, 'rss_MB_peak': peak, 'rss_MB_final': final,
               'terrain': st['s'], 'view_modes_sampled_every_0.5s': modes, 'worst_frame_ms': round(wv['max']), 'frames_over_100ms': wv['stalls'], 'frames': wv['frames'], 'blur_samples_at_xy_mode_visible_ready_loading': blur_at, 'errors': [e for e in errs][:3]}
        print(json.dumps(res, indent=1))
        if out: open(out, 'w').write(json.dumps(res, indent=1))
        browser.close()
main(sys.argv[1] if len(sys.argv) > 1 else None)
