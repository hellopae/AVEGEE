"""Z1-LAYOUT-B1 evidence: pause / resume, save, reload, load, zone round trip on the layered Zone 1 map (fresh slot, real clicks where the UI has them).
  BASE=http://127.0.0.1:8947/index.html python3 scripts/z1-v6-save-evidence.py <outdir> [width height]"""
import os, sys, json, importlib.util
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 390; H = int(sys.argv[3]) if len(sys.argv) > 3 else 844
sys.argv = [sys.argv[0], OUT, str(W), str(H)]
spec = importlib.util.spec_from_file_location('walk', os.path.join(here, 'z1-v6-walk-evidence.py')); walk = importlib.util.module_from_spec(spec); spec.loader.exec_module(walk)
os.makedirs(OUT, exist_ok=True)
VIS = "(s)=>{const e=document.querySelector(s);if(!e)return false;let n=e;while(n&&n!==document.body){const cs=getComputedStyle(n);if(cs.display==='none'||cs.visibility==='hidden'||parseFloat(cs.opacity)<0.5||cs.pointerEvents==='none')return false;n=n.parentElement}const r=e.getBoundingClientRect();return r.width>10&&r.height>10}"
pos = lambda pg: pg.evaluate("()=>({zone:G.zone,x:Math.round(G.player.x),y:Math.round(G.player.y),paused:!!G.paused})")
log = {}
with sync_playwright() as p:
    b, pg, errs = walk.boot(p, W, H)
    pg.evaluate("()=>{const q=document.querySelector('#hud-pause');q.click()}"); pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{OUT}/sl-1-paused.png'); log['paused'] = pos(pg)
    pg.click('#pause-resume'); pg.wait_for_timeout(1200); log['resumed'] = pos(pg)
    walk.teleport(pg, 2075, 1281); pg.wait_for_timeout(1500)
    saved = pg.evaluate("()=>{const ok=G.save();return {ok,x:Math.round(G.player.x),y:Math.round(G.player.y),keys:Object.keys(localStorage).filter(k=>/avegee|save/i.test(k))}}")
    log['saved'] = saved; pg.screenshot(path=f'{OUT}/sl-2-before-reload.png')
    # reload the page: a slot with a game now exists
    pg.reload(); pg.wait_for_timeout(4000)
    for _ in range(14):
        if pg.evaluate(VIS, '#enter-button'): pg.click('#enter-button'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '#splash-skip'): pg.click('#splash-skip'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '.save-slot-card'):
            log['slotCards'] = pg.evaluate("()=>[...document.querySelectorAll('.save-slot-card')].map(c=>c.innerText.replace(/\\n/g,' ').slice(0,60))")
            pg.screenshot(path=f'{OUT}/sl-3-slot-menu.png'); pg.click('.save-slot-card >> nth=0'); pg.wait_for_timeout(4000); continue
        if pg.evaluate(VIS, '#intro-skip'): pg.click('#intro-skip'); pg.wait_for_timeout(2500); continue
        if pg.evaluate(VIS, '#t-start'): pg.click('#t-start', force=True); pg.wait_for_timeout(2500); continue
        break
    pg.wait_for_timeout(3000); walk.dismiss(pg); pg.wait_for_timeout(1500)
    log['loaded'] = pos(pg); log['v6'] = pg.evaluate("async()=>{const m=await import('./src/town-v6.js');return m.townV6Stats()}")
    pg.screenshot(path=f'{OUT}/sl-4-after-load.png')
    # zone round trip: th -> asia -> th
    pg.evaluate("()=>{const z=G.zoneTravel;for(const q of ['th','asia','west','cyberhell']){z.visited[q]=true;z.ports[q]=true}const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=p.x;G.player.ty=p.y;G.moveZone('asia')}")
    pg.wait_for_timeout(3500); walk.dismiss(pg); pg.wait_for_timeout(2000); log['asia'] = pos(pg); pg.screenshot(path=f'{OUT}/sl-5-asia.png')
    pg.evaluate("()=>{const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=p.x;G.player.ty=p.y;G.moveZone('th')}")
    pg.wait_for_timeout(3500); walk.dismiss(pg); pg.wait_for_timeout(2500); log['backToTh'] = pos(pg)
    log['backToThWalkable'] = pg.evaluate("async()=>{const m=await import('./src/town-layout.js?v=k1d');return {walkable:m.townContains(G.player.x,G.player.y),v6:m.townLayoutIsV6()}}")
    pg.screenshot(path=f'{OUT}/sl-6-back-to-th.png')
    log['errors'] = errs; json.dump(log, open(f'{OUT}/save-report.json', 'w'), indent=1); print(json.dumps(log, ensure_ascii=False)); b.close()
