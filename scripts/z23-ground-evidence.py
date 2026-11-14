#!/usr/bin/env python3
"""Z23-GROUND evidence: the real game in Chromium, zone 2 (Asia) / zone 3 (West), the old 1x ground against Codex's 2x ground v7.

  python3 scripts/serve-nocache.py 8801 &                      (any threaded static server on the repo root works)
  BASE=http://127.0.0.1:8801/index.html CH=chromium python3 scripts/z23-ground-evidence.py shots <outdir> <asia|west> <old|new>
  python3 scripts/z23-ground-evidence.py compose <shots dir> <review dir>        (old | new, one jpg per spot)
  BASE=... CH=chromium python3 scripts/z23-ground-evidence.py fps <out.json> <asia|west> <old|new> [desktop|mobile]
'old' / 'new' only changes the ZONE<N>_GROUND_SET constant in the copy of src/zone-skin.js the browser gets (v2 or v1 / v7); the repo file is not touched.
shots = four 390x844 screenshots at DPR 2 (hero teleported, camera follows).  fps = rAF rate while the hero crosses the town at about walking speed."""
import os, sys, json, time
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8801/index.html'); CH = os.environ.get('CH') or None
# world units (= map 1x px * 0.78125) of the ROIs Codex used in compare-zoom, so the same places are compared
SPOTS = {
    'asia': {'main-plaza': (1941, 1070), 'central-bridge': (1926, 1750), 'lava-bank': (1051, 1200), 'heaven-gate': (2540, 380)},
    'west': {'main-plaza': (1941, 1043), 'central-bridge': (1926, 1720), 'west-cliffs': (1051, 1200), 'north-stairs': (430, 480)},
}
ROUTE = {'asia': [(1926, 1750), (1941, 1070), (1051, 1200), (1941, 1070), (2540, 380), (3352, 895), (1926, 1750)],
         'west': [(1926, 1720), (1941, 1043), (1051, 1200), (430, 480), (1941, 1043), (3352, 895), (1926, 1720)]}
SET = {'asia': ('ZONE2_GROUND_SET', 'v2', 'v7'), 'west': ('ZONE3_GROUND_SET', 'v1', 'v7')}
DISMISS = "()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}"
TERRAIN = "async()=>{const m=await import('./src/town-terrain.js');return {s:m.townTerrainStats(),v:m.townTerrainViewStats()}}"

def boot(p, zone, which, w, h, dpr, mobile):
    browser = p.chromium.launch(channel=CH, args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    const, old, new = SET[zone]
    ctx.route('**/src/zone-skin.js*', lambda route: route.fulfill(response=(r := route.fetch()), body=r.text().replace(f"export const {const} = 'v7';", f"export const {const} = '{old if which == 'old' else new}';")))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('requestfailed', lambda r: errs.append('requestfailed: ' + r.url))
    pg.on('response', lambda r: errs.append(f'http {r.status}: {r.url}') if r.status >= 400 else None)
    pg.goto(BASE); pg.wait_for_timeout(3000)
    try: pg.click('#enter-gate button', timeout=1500)
    except Exception: pass
    pg.wait_for_timeout(500); pg.click('#splash-skip'); pg.wait_for_timeout(2000)
    pg.click('#t-start'); pg.wait_for_timeout(1500); pg.click('text=SLOT 1'); pg.wait_for_timeout(2500)
    pg.click('#intro-skip'); pg.wait_for_timeout(1500)
    for _ in range(8):
        n = pg.evaluate(DISMISS); pg.wait_for_timeout(300)
        if not n: break
    pg.evaluate("""async(k)=>{const z=G.zoneTravel;for(const q of ['th','asia','west','cyberhell']){z.visited[q]=true;z.ports[q]=true;}
      const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=p.x;G.player.ty=p.y;if(G.zone!==k)G.moveZone(k);}""", zone)
    pg.wait_for_timeout(2500)
    for _ in range(4): pg.evaluate(DISMISS); pg.wait_for_timeout(500)
    pg.add_style_tag(content='#town-map-panel,.fabs,#res{visibility:hidden} dialog{display:none!important}')   # evidence only: story / zone alerts (West opens one a few seconds after arrival) would cover the ground
    return browser, pg, errs

def look(pg, x, y):
    pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y}", [x, y]); pg.wait_for_timeout(800)
    for _ in range(40):                       # wait for the sharp view (every visible tile decoded + graded)
        if pg.evaluate(TERRAIN)['v']['mode'] == 'detail': break
        pg.wait_for_timeout(250)
    pg.wait_for_timeout(600)

def shots(out, zone, which):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        browser, pg, errs = boot(p, zone, which, 390, 844, 2, False)
        for name, (x, y) in SPOTS[zone].items():
            look(pg, x, y); pg.screenshot(path=f'{out}/{zone}-{name}-{which}.png')
        print(zone, which, 'terrain', pg.evaluate(TERRAIN)['s'], 'errors', errs[:5])
        browser.close()

def fps(out, zone, which, kind='desktop'):
    w, h, dpr, mob = (1440, 900, 1, False) if kind == 'desktop' else (390, 844, 3, True)
    RAF = """() => { const w = window.__w = {last: performance.now(), max: 0, stalls: 0, frames: 0, t0: performance.now(), d: []};
      const loop = t => { const d = t - w.last; w.last = t; w.frames++; w.d.push(d); if (d > w.max) w.max = d; if (d > 100) w.stalls++; requestAnimationFrame(loop); }; requestAnimationFrame(loop); }"""
    with sync_playwright() as p:
        browser, pg, errs = boot(p, zone, which, w, h, dpr, mob)
        look(pg, *ROUTE[zone][0]); pg.evaluate(RAF); pg.wait_for_timeout(500)
        t0 = time.time(); blur = 0; steps = 0
        for a, b in zip(ROUTE[zone], ROUTE[zone][1:]):
            dist = ((b[0]-a[0])**2 + (b[1]-a[1])**2) ** .5; n = max(2, int(dist / 210 * 10))   # ~210 units/s
            for k in range(1, n + 1):
                x = a[0] + (b[0]-a[0]) * k / n; y = a[1] + (b[1]-a[1]) * k / n
                pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y}", [x, y]); pg.wait_for_timeout(100); steps += 1
                if steps % 5 == 0 and pg.evaluate(TERRAIN)['v']['mode'] != 'detail': blur += 1
        wv = pg.evaluate("()=>{const w=window.__w;const d=w.d.slice().sort((a,b)=>a-b);return {frames:w.frames,secs:(performance.now()-w.t0)/1000,max:w.max,stalls:w.stalls,p95:d[Math.floor(d.length*.95)]}}")
        res = {'zone': zone, 'ground': which, 'kind': kind, 'fps': round(wv['frames'] / wv['secs'], 1), 'p95_ms': round(wv['p95'], 1), 'worst_ms': round(wv['max']), 'stalls_over_100ms': wv['stalls'],
               'walk_seconds': round(time.time() - t0, 1), 'blurry_samples': blur, 'samples': steps // 5, 'terrain': pg.evaluate(TERRAIN)['s'], 'errors': errs[:5]}
        print(json.dumps(res)); open(out, 'a').write(json.dumps(res) + '\n'); browser.close()

def compose(src, out):
    """<src>/<zone>-<spot>-old.png + -new.png  ->  <out>/<zone>-<spot>.jpg  (old | new, <= 0.75 MB each)"""
    import glob
    from PIL import Image, ImageDraw
    os.makedirs(out, exist_ok=True)
    for f in sorted(glob.glob(src + '/*-old.png')):
        n = os.path.basename(f)[:-8]; a = Image.open(f).convert('RGB'); b = Image.open(f'{src}/{n}-new.png').convert('RGB'); w, h = a.size
        c = Image.new('RGB', (w * 2 + 12, h + 40), (20, 20, 20)); c.paste(a, (0, 40)); c.paste(b, (w + 12, 40))
        d = ImageDraw.Draw(c); d.text((10, 12), f'{n}   OLD 1x ground', fill='white'); d.text((w + 22, 12), 'NEW 2x ground (v7)', fill='white')
        q = 86
        while True:
            c.save(f'{out}/{n}.jpg', quality=q)
            if os.path.getsize(f'{out}/{n}.jpg') <= 750000 or q < 50: break
            q -= 6
        print(n, os.path.getsize(f'{out}/{n}.jpg') // 1024, 'KB q', q)

if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'compose': compose(sys.argv[2], sys.argv[3])
    elif mode == 'shots': shots(sys.argv[2], sys.argv[3], sys.argv[4])
    else: fps(sys.argv[2], sys.argv[3], sys.argv[4], *(sys.argv[5:6]))
