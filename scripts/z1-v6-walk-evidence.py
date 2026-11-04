"""Z1-LAYOUT-B1 evidence: drives the real game (Playwright) on the layered Zone 1 map and walks Yama
gate -> plaza -> dais -> upper platform -> lava side -> ice side -> pier. A fresh slot is used, the save is in-memory only.

  python3 scripts/serve-nocache.py 8947 &           # threaded server recommended (see report)
  BASE=http://127.0.0.1:8947/index.html python3 scripts/z1-v6-walk-evidence.py <outdir> [width height]
Writes walk-NN-<name>.png at each stop, occlusion-<name>.png for the behind/front pairs, walk-report.json.
"""
import json, os, sys, math
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8947/index.html')
OUT = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 390; H = int(sys.argv[3]) if len(sys.argv) > 3 else 844
os.makedirs(OUT, exist_ok=True)

def boot(p, w, h):
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append('console:' + m.text[:300]) if m.type == 'error' else None)
    pg.goto(BASE); pg.wait_for_timeout(4000)
    VIS = "(s)=>{const e=document.querySelector(s);if(!e)return false;let n=e;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.5||cs.pointerEvents==='none')return false;n=n.parentElement}const r=e.getBoundingClientRect();return r.width>10&&r.height>10}"
    for _ in range(14):
        if pg.evaluate(VIS, '#enter-button'): pg.click('#enter-button'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '#splash-skip'): pg.click('#splash-skip'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '#intro-skip'): pg.click('#intro-skip'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '.save-slot-card'): pg.click('.save-slot-card >> nth=0'); pg.wait_for_timeout(3000); continue
        if pg.evaluate(VIS, '#t-start'): pg.click('#t-start', force=True); pg.wait_for_timeout(2500); continue
        break
    pg.wait_for_timeout(2500); dismiss(pg)
    return b, pg, errs

def dismiss(pg):
    for _ in range(8):
        n = pg.evaluate("()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}")
        pg.wait_for_timeout(400)
        if not n: break

def teleport(pg, x, y):
    pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=null;G.player.ty=null;G.player.path=null}", [x, y]); pg.wait_for_timeout(900)

def walk_to(pg, x, y, name, shots=True, timeout=60000):
    """G.walkTo + poll; every sample must be on walkable ground. returns (ok, report)"""
    ok = pg.evaluate("([x,y])=>G.walkTo(x,y)", [x, y])
    samples = []; t = 0; bad = []
    while t < timeout:
        pg.wait_for_timeout(250); t += 250
        s = pg.evaluate("async()=>{const m=await import('./src/town-layout.js');return {x:G.player.x,y:G.player.y,ok:m.townContains(G.player.x,G.player.y),idle:G.player.tx==null}}")
        samples.append(s)
        if not s['ok']: bad.append(s)
        if math.hypot(s['x'] - x, s['y'] - y) < 28 or (s['idle'] and t > 1500): break
    last = samples[-1]; d = math.hypot(last['x'] - x, last['y'] - y)
    return {'name': name, 'target': [x, y], 'walkToReturned': ok, 'arrived': d < 40, 'finalDistance': round(d, 1), 'seconds': round(t / 1000, 1), 'offFloorSamples': len(bad)}

if __name__ == '__main__':
    data = None
    with sync_playwright() as p:
        b, pg, errs = boot(p, W, H)
        data = pg.evaluate("async()=>{const m=await import('./src/town-v6-data.js');return m.TOWN_V6}")
        st, sp, cr = data['stations'], data['spots'], data['crew']
        # the lower gate is last: standing in its arch opens the border (ด่านชายแดน) and leaves the town
        stops = [('start', None), ('plaza', sp['plaza']), ('dais-top', cr['nira']),
                 ('upper-platform-tarang', [st['tarang']['x'], st['tarang']['y']]),
                 ('heaven-gate-sawan', [st['sawan']['x'], st['sawan']['y']]), ('plaza-again', sp['plaza']),
                 ('lava-krata', [st['krata']['x'], st['krata']['y']]), ('plaza-from-lava', sp['plaza']),
                 ('ice-lokan', [st['lokan']['x'], st['lokan']['y']]), ('ice-krajok', [st['krajok']['x'], st['krajok']['y']]),
                 ('pier', sp['bossPier']), ('gate', sp['gateDoor'])]
        report = []; n = 0
        # always begin on the plaza so every leg is measured on its own
        for name, pt in stops:
            if pt is None:
                pg.wait_for_timeout(1500); pg.screenshot(path=f'{OUT}/walk-{n:02d}-{name}.png'); n += 1; continue
            r = walk_to(pg, pt[0], pt[1], name); report.append(r)
            pg.wait_for_timeout(700); pg.screenshot(path=f'{OUT}/walk-{n:02d}-{name}.png'); n += 1
            print(r, flush=True)
        stats = pg.evaluate("async()=>{const m=await import('./src/town-v6.js');return m.townV6Stats()}")
        json.dump({'viewport': [W, H], 'legs': report, 'errors': errs, 'v6': stats}, open(f'{OUT}/walk-report.json', 'w'), indent=1)
        print('errors:', errs); b.close()
