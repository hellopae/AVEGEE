"""Q5 FX evidence: drives the real game in Chromium (Playwright) at 390x844 and writes before/after stills,
a 3-frame cloud-shadow sequence, lightning frames and on/off darkness measurements.

  python3 -m http.server 8791 --bind 127.0.0.1 &          # from the repo root (the game needs http://)
  python3 scripts/q5-fx-evidence.py shots   <outdir> [phase] [zones]   # town / overview / frontier / route stills
  python3 scripts/q5-fx-evidence.py clouds  <outdir> [zone]            # 3 frames of the drifting shadow, 12 s apart
  python3 scripts/q5-fx-evidence.py storm   <outdir> [town|frontier]   # calm vs lightning frame of zone 4
  python3 scripts/q5-fx-evidence.py measure <outdir> [kinds] [zones]   # share of the screen darkened by the shadows
Everything is an in-memory fixture (the save file is never written). BASE overrides the server URL."""
import io, os, sys
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8791/index.html')
ZONES = ['th', 'asia', 'west', 'cyberhell']
TOGGLE = "async(on)=>{const m=await import('./src/map-ambient.js');m.setWeatherEnabled(on)}"


def boot(p, w=390, h=844, reduced=False):
    browser = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = browser.new_context(viewport={'width': w, 'height': h}, device_scale_factor=1,
                              reduced_motion='reduce' if reduced else 'no-preference')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(BASE); pg.wait_for_timeout(2500)
    pg.mouse.click(w / 2, 520); pg.wait_for_timeout(2000)      # title -> intro cutscene
    pg.mouse.click(w - 50, h - 57); pg.wait_for_timeout(2000)  # skip -> menu
    pg.click('text=เริ่มเกมใหม่'); pg.wait_for_timeout(2000)
    pg.click('#intro-skip'); pg.wait_for_timeout(1500)
    return browser, pg, errs


def dismiss(pg, keep=None):
    for _ in range(8):
        n = pg.evaluate("(keep)=>{const ds=[...document.querySelectorAll('dialog[open]')].filter(d=>!(keep&&d.classList.contains(keep)));ds.forEach(d=>d.close());return ds.length}", keep)
        pg.wait_for_timeout(500)
        if not n:
            break


def goto_zone(pg, k):
    pg.evaluate("""async(k)=>{const z=G.zoneTravel;for(const q of ['th','asia','west','cyberhell']){z.visited[q]=true;z.ports[q]=true;}
      const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=p.x;G.player.ty=p.y;if(G.zone!==k)G.moveZone(k);}""", k)
    pg.wait_for_timeout(2500); dismiss(pg); pg.wait_for_timeout(1500)


def open_frontier(pg):
    pg.evaluate("""async()=>{const d=await import('./src/data.js');for(const z of ['th','asia','west','cyberhell'])G.bossCleared[z]=true;
      G.player.x=d.FRONTIER.x;G.player.y=d.FRONTIER.y;G.player.tx=d.FRONTIER.x;G.player.ty=d.FRONTIER.y;}""")
    pg.wait_for_timeout(2500); dismiss(pg, 'frontier-map-dialog'); pg.wait_for_timeout(2500)


def open_route(pg):
    """Hold Down toward the exit arrow (wiggle sideways if an enemy blocks the lane) until the departure prompt shows."""
    for attempt in range(12):
        pg.keyboard.down('ArrowDown')
        for _ in range(10):
            pg.wait_for_timeout(500)
            if pg.query_selector('[data-border-go]'):
                break
        pg.keyboard.up('ArrowDown')
        if pg.query_selector('[data-border-go]'):
            break
        k = 'ArrowRight' if attempt % 2 == 0 else 'ArrowLeft'
        pg.keyboard.down(k); pg.wait_for_timeout(1200); pg.keyboard.up(k)
    pg.click('[data-border-go]', timeout=5000); pg.wait_for_timeout(3000)


def lum(pg):
    return np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert('L'), dtype=float)


def cmd_shots(out, phase='after', zones=None):
    zones = zones.split(',') if zones else ZONES
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        for z in zones:
            browser, pg, errs = boot(p)
            try:
                goto_zone(pg, z)
                pg.screenshot(path=f'{out}/{phase}-town-{z}.png')
                pg.click('#town-overview'); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/{phase}-overview-{z}.png')
                open_frontier(pg); pg.screenshot(path=f'{out}/{phase}-frontier-{z}.png')
                if z != 'cyberhell':
                    open_route(pg); pg.wait_for_timeout(2500); pg.screenshot(path=f'{out}/{phase}-route-{z}.png')
                print(z, 'errors:', errs, flush=True)
            finally:
                browser.close()


def cmd_clouds(out, zone='th'):
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        for where in ('town', 'frontier'):
            browser, pg, errs = boot(p)
            try:
                goto_zone(pg, zone)
                if where == 'frontier':
                    open_frontier(pg)
                for i in range(3):
                    pg.screenshot(path=f'{out}/clouds-{where}-{zone}-{i + 1}.png'); pg.wait_for_timeout(12000)
            finally:
                browser.close()


def cmd_storm(out, where='town'):
    import time
    os.makedirs(out, exist_ok=True)
    with sync_playwright() as p:
        browser, pg, errs = boot(p)
        try:
            goto_zone(pg, 'cyberhell')
            if where == 'frontier':
                open_frontier(pg)
            frames = []; t0 = time.time()
            while time.time() - t0 < 14:
                png = pg.screenshot(); frames.append((float(np.asarray(Image.open(io.BytesIO(png)).convert('L'), float).mean()), png))
            base = float(np.median([f[0] for f in frames])); peak = max(frames, key=lambda f: f[0]); calm = min(frames, key=lambda f: abs(f[0] - base))
            open(f'{out}/storm-{where}-calm.png', 'wb').write(calm[1]); open(f'{out}/storm-{where}-flash.png', 'wb').write(peak[1])
            print(where, 'median luminance', round(base, 1), 'peak', round(peak[0], 1), 'ratio', round(peak[0] / base, 3))
        finally:
            browser.close()


def cmd_measure(out, kinds='town,frontier,route', zones=None):
    """Screenshot with the weather switch on and off in the same scene under reduced motion (frozen flow/shadows),
    then report how much of the (non-black) screen the shadows darken."""
    kinds = kinds.split(','); zones = zones.split(',') if zones else ZONES
    os.makedirs(out, exist_ok=True)

    def stat(pg, name):
        pg.evaluate(TOGGLE, True); pg.wait_for_timeout(300); on = lum(pg)
        pg.evaluate(TOGGLE, False); pg.wait_for_timeout(300); off = lum(pg); pg.evaluate(TOGGLE, True)
        r = on / np.maximum(off, 1); sel = off > 30
        print(name, 'darker>15%:', round(float((r[sel] < .85).mean()), 2), 'darker>30%:', round(float((r[sel] < .70).mean()), 2),
              'core ratio (2nd percentile):', round(float(np.percentile(r[sel], 2)), 2), flush=True)

    with sync_playwright() as p:
        for z in zones:
            browser, pg, errs = boot(p, reduced=True)
            try:
                goto_zone(pg, z)
                if 'town' in kinds:
                    stat(pg, f'town-{z}')
                if 'frontier' in kinds or 'route' in kinds:
                    open_frontier(pg)
                    if 'frontier' in kinds:
                        stat(pg, f'frontier-{z}')
                    if 'route' in kinds and z != 'cyberhell':
                        open_route(pg); pg.wait_for_timeout(2000); stat(pg, f'route-{z}')
            finally:
                browser.close()


if __name__ == '__main__':
    cmd, args = sys.argv[1], sys.argv[2:]
    {'shots': cmd_shots, 'clouds': cmd_clouds, 'storm': cmd_storm, 'measure': cmd_measure}[cmd](*args)
