"""Z1-LAYOUT-B1 evidence: the same still of every town zone, on any build (BASE). Zone 2-4 stills of this branch must match the stills of the previous commit.
  BASE=http://127.0.0.1:8947/index.html python3 scripts/z1-v6-zones-evidence.py <outdir> [width height] [zones...]
Reduced motion is on and the game is paused so animation noise stays out of the comparison."""
import os, sys
from playwright.sync_api import sync_playwright
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import importlib.util
spec = importlib.util.spec_from_file_location('walk', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'z1-v6-walk-evidence.py'))
OUT = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 390; H = int(sys.argv[3]) if len(sys.argv) > 3 else 844
ZONES = sys.argv[4:] or ['th', 'asia', 'west', 'cyberhell']
sys.argv = [sys.argv[0], OUT, str(W), str(H)]
walk = importlib.util.module_from_spec(spec); spec.loader.exec_module(walk)
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--autoplay-policy=no-user-gesture-required'])
    ctx = b.new_context(viewport={'width': W, 'height': H}, device_scale_factor=1, reduced_motion='reduce')
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append('console:' + m.text[:300]) if m.type == 'error' else None)
    pg.goto(walk.BASE); pg.wait_for_timeout(4000)
    VIS = "(s)=>{const e=document.querySelector(s);if(!e)return false;let n=e;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.5||cs.pointerEvents==='none')return false;n=n.parentElement}const r=e.getBoundingClientRect();return r.width>10&&r.height>10}"
    for _ in range(14):
        if pg.evaluate(VIS, '#enter-button'): pg.click('#enter-button'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '#splash-skip'): pg.click('#splash-skip'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '#intro-skip'): pg.click('#intro-skip'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '.save-slot-card'): pg.click('.save-slot-card >> nth=0'); pg.wait_for_timeout(3000); continue
        if pg.evaluate(VIS, '#t-start'): pg.click('#t-start', force=True); pg.wait_for_timeout(2500); continue
        break
    pg.wait_for_timeout(2500); walk.dismiss(pg)
    for k in ZONES:
        pg.evaluate("""async(k)=>{const z=G.zoneTravel;for(const q of ['th','asia','west','cyberhell']){z.visited[q]=true;z.ports[q]=true;}
          const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=p.x;G.player.ty=p.y;if(G.zone!==k)G.moveZone(k);}""", k)
        pg.wait_for_timeout(3500); walk.dismiss(pg); pg.wait_for_timeout(2500)
        pg.evaluate("()=>{G.player.tx=null;G.player.path=null}")
        pg.screenshot(path=f'{OUT}/zone-{k}.png')
        print(k, pg.evaluate("()=>({zone:G.zone,x:Math.round(G.player.x),y:Math.round(G.player.y)})"), flush=True)
    print('errors:', errs); b.close()
