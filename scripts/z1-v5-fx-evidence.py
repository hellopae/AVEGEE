"""Z1-V5-FX evidence: drives the real game in Chromium (Playwright) at 390x844 and records
  clips2  <outdir>            FX2: four 12 s clips (shore foam, lava fall effects, HD plaza, canteen built in game)
  clips   <outdir>            four 12 s clips: lava fall, bridge + purple river, ice waterfall, heaven gate (cloud-sea, puffs, cloud shadows)
  fps     <desktop|mobile>    rAF frame rate of every camera with the painted fluid layer on / off (weather setting)
  seam    <outdir>            frame-to-frame change of the rendered lava over 3 loops: no spike at the frame changes / batch seams

  python3 scripts/serve-nocache.py 8795 &        # or any threaded static server on the repo root (a single-threaded one stalls Chromium)
  BASE=http://127.0.0.1:8795/index.html CH=chromium python3 scripts/z1-v5-fx-evidence.py clips docs/art-reviews/2026-11-05-z1-v5-fx
CH=chromium selects Playwright's full Chromium (GPU raster on a Mac) instead of the headless shell (SwiftShader software raster).
The save file is a fresh in-memory slot; the camera follows the hero, so each shot teleports the hero to the spot and pans him slowly."""
import io, os, subprocess, sys, time, json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = os.environ.get('BASE', 'http://127.0.0.1:8795/index.html')
CH = os.environ.get('CH') or None
VIEWS = {   # name: (start x, start y, pan dx, pan dy) in world units
    '01-lava-fall': (300, 430, 160, 60),
    '02-bridge-purple-river': (1880, 1700, 200, 0),
    '03-ice-waterfall': (2380, 960, 140, 80),
    '04-heaven-gate': (2480, 470, 160, 50),
}
VIEWS2 = {   # FX2 clips: placed foam on the shore, lava fall + bubbles / steam / embers, the HD main plaza, the new canteen built in game
    '05-bridge-river-foam': (1700, 1760, 300, 0),
    '06-lava-fall-fx': (230, 700, 90, 40),
    '07-main-plaza-hd': (1900, 1250, 220, 60),
    '08-canteen': (1572, 930, 0, -170),
}
CANTEEN_JS = """async()=>{const d=await import('./src/data.js');const def=d.STATIONS.find(s=>s.k==='canteen');
  if(!G.stations.some(s=>s.def.k==='canteen'))G.stations.push({def,slots:[],crewK:null,intensity:3,build:0,buildWait:false,repair:0,repairWait:false,arrivalElapsed:0,fire:0,speedLv:0,capLv:0,fuelLv:0,mgCd:0});}"""
SETW = "async(on)=>{const m=await import('./src/map-ambient.js?v=mapfx-k1d');m.setWeatherEnabled(on)}"
STATS = "async()=>{const m=await import('./src/town-fluid-fx.js?v=v5fx');return m.townFluidFxStats()}"
FPS_JS = """async(ms)=>new Promise(res=>{const ts=[];function f(t){ts.push(t);if(t-ts[0]<ms)requestAnimationFrame(f);else{const d=[];for(let i=1;i<ts.length;i++)d.push(ts[i]-ts[i-1]);d.sort((a,b)=>a-b);res({fps:(ts.length-1)/((ts[ts.length-1]-ts[0])/1000),p95:d[Math.floor(d.length*.95)],max:d[d.length-1],n:ts.length})}}requestAnimationFrame(f)})"""


def boot(p, w=390, h=844, dpr=1, mobile=False, video=None, vsize=None):
    browser = p.chromium.launch(channel=CH, args=['--autoplay-policy=no-user-gesture-required'])
    kw = dict(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=mobile, has_touch=mobile)
    if video:
        kw.update(record_video_dir=str(video), record_video_size=vsize or {'width': w, 'height': h})
    ctx = browser.new_context(**kw)
    pg = ctx.new_page(); errs = []; t0 = time.time()
    if os.environ.get('GROUND'):    # A/B: serve zone-skin.js with another ground set (v5 | v7-partial) without touching the file
        def swap(route):
            r = route.fetch(); body = r.text()
            route.fulfill(response=r, body=body.replace("ZONE1_GROUND_SET = 'v7-partial'", f"ZONE1_GROUND_SET = '{os.environ['GROUND']}'"))
        ctx.route('**/src/zone-skin.js*', swap)
    pg.on('pageerror', lambda e: errs.append('pageerror: ' + str(e)))
    pg.on('console', lambda m: errs.append('console.error: ' + m.text) if m.type == 'error' else None)
    pg.on('requestfailed', lambda r: errs.append('requestfailed: ' + r.url))
    pg.goto(BASE); pg.wait_for_timeout(3000)
    try: pg.click('#enter-gate button', timeout=1500)     # shown once the first assets are ready (audio unlock tap)
    except Exception: pass
    pg.wait_for_timeout(500)
    pg.click('#splash-skip'); pg.wait_for_timeout(2000)
    pg.click('#t-start'); pg.wait_for_timeout(1500)
    pg.click('text=SLOT 1'); pg.wait_for_timeout(2500)
    pg.click('#intro-skip'); pg.wait_for_timeout(1500)
    for _ in range(8):
        n = pg.evaluate("()=>{const ds=[...document.querySelectorAll('dialog[open]')];ds.forEach(d=>d.close());return ds.length}")
        pg.wait_for_timeout(300)
        if not n:
            break
    pg.add_style_tag(content='#town-map-panel,.fabs,#res{visibility:hidden}')   # evidence only: the minimap card covers a third of a 390 px screen
    return browser, ctx, pg, errs, t0


def look(pg, x, y):
    pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y;}", [x, y])
    pg.wait_for_timeout(1200)


def clips(out, views=None):
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    for name, (x, y, dx, dy) in (views or VIEWS).items():
        tmp = out / ('_' + name); tmp.mkdir(exist_ok=True)
        with sync_playwright() as p:
            browser, ctx, pg, errs, t0 = boot(p, 390, 844, 1, False, tmp, {'width': 390, 'height': 844})   # Playwright records CSS pixels: 390x844
            if name.endswith('canteen'):
                pg.evaluate(CANTEEN_JS)
            look(pg, x, y); pg.wait_for_timeout(2500)
            start = time.time() - t0
            steps = 120   # 12 s, one nudge every 100 ms
            for k in range(steps + 1):
                pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y;}", [x + dx * k / steps, y + dy * k / steps])
                pg.wait_for_timeout(100)
            st = pg.evaluate(STATS)
            ctx.close(); browser.close()
        webm = next(tmp.glob('*.webm'))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{start - 0.3:.2f}', '-i', str(webm), '-t', '12.5', '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
                        '-crf', '20', '-movflags', '+faststart', '-an', str(out / f'{name}.mp4')], check=True)
        webm.unlink(); tmp.rmdir()
        print(name, 'stats', st, 'errors', [e for e in errs if 'willRead' not in e][:3], flush=True)


def fps(kind):
    w, h, dpr, mobile = (1280, 800, 1, False) if kind == 'desktop' else (390, 844, 3, True)
    with sync_playwright() as p:
        browser, ctx, pg, errs, _ = boot(p, w, h, dpr, mobile)
        cdp = ctx.new_cdp_session(pg)
        if os.environ.get('THROTTLE'):
            cdp.send('Emulation.setCPUThrottlingRate', {'rate': float(os.environ['THROTTLE'])})
        for name, (x, y, _, _) in VIEWS.items():
            look(pg, x, y); pg.wait_for_timeout(2500)
            res = {}
            for on in (True, False):
                pg.evaluate(SETW, on); pg.wait_for_timeout(600)
                res['on' if on else 'off'] = pg.evaluate(FPS_JS, 4000)
            pg.evaluate(SETW, True); pg.wait_for_timeout(500)
            st = pg.evaluate(STATS)
            print(f'{kind} {name}: ON {res["on"]["fps"]:.1f} fps (p95 {res["on"]["p95"]:.1f} ms, worst {res["on"]["max"]:.0f} ms) | OFF {res["off"]["fps"]:.1f} fps | pieces drawn {st["drawn"]} | js {st["ms"]} ms/frame', flush=True)
        print('errors', [e for e in errs if 'willRead' not in e][:5])
        browser.close()


SEAM_JS = """async(ms)=>new Promise(async res=>{
  const m=await import('./src/town-fluid-fx.js?v=v5fx'),cv=document.getElementById('cv'),s=document.createElement('canvas');
  const W=cv.width,H=cv.height,x0=Math.round(W*.1),y0=Math.round(H*.15),w=Math.round(W*.8),h=Math.round(H*.6);s.width=w/4;s.height=h/4;
  const g=s.getContext('2d',{willReadFrequently:true});let prev=null;const out=[];const start=performance.now();
  function f(t){g.drawImage(cv,x0,y0,w,h,0,0,s.width,s.height);const d=g.getImageData(0,0,s.width,s.height).data;
    if(prev){let sum=0;for(let i=0;i<d.length;i+=4)sum+=Math.abs(d[i]-prev[i])+Math.abs(d[i+1]-prev[i+1])+Math.abs(d[i+2]-prev[i+2]);out.push([m.townFluidFxClock(),sum/(d.length/4*3)]);}
    prev=Uint8ClampedArray.from(d);if(t-start<ms)requestAnimationFrame(f);else res(out);}
  requestAnimationFrame(f);})"""


def seam(out):
    import numpy as np
    out = Path(out); out.mkdir(parents=True, exist_ok=True)
    with sync_playwright() as p:
        browser, ctx, pg, errs, _ = boot(p, 390, 844, 1, False)
        look(pg, 560, 330); pg.wait_for_timeout(3000)
        rows = pg.evaluate(SEAM_JS, 14000)
        browser.close()
    a = np.array(rows); clock, diff = a[:, 0], a[:, 1]
    keep = np.diff(clock, prepend=clock[0] - 16) > 0       # only frames where the animation clock moved
    clock, diff = clock[keep], diff[keep]
    # lava plays at 7 fps over 8 frames: a frame change every 142.9 ms; batch seams (3->4 and 7->0) are every 4th change
    per = 1000 / 7
    phase = (clock % per) / per
    changes = np.floor(clock / per).astype(int)
    seam_idx = (changes % 4 == 3) & (phase > .85) | (changes % 4 == 0) & (phase < .15)
    other_edge = ~seam_idx & ((phase > .85) | (phase < .15))
    mid = (phase >= .15) & (phase <= .85)
    res = {'samples': int(len(diff)), 'median_mid_frame': float(np.median(diff[mid])), 'median_around_frame_changes': float(np.median(diff[other_edge])),
           'median_around_batch_seams': float(np.median(diff[seam_idx])), 'max_all': float(diff.max()), 'p95_all': float(np.percentile(diff, 95)),
           'ratio_seam_to_mid': float(np.median(diff[seam_idx]) / max(1e-9, np.median(diff[mid])))}
    (out / 'seam-check.json').write_text(json.dumps(res, indent=2))
    print(json.dumps(res, indent=2))


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'clips':
        clips(sys.argv[2])
    elif cmd == 'clips2':
        clips(sys.argv[2], VIEWS2)
    elif cmd == 'fps':
        fps(sys.argv[2])
    elif cmd == 'seam':
        seam(sys.argv[2])
