"""Q3 probe 3: bottom-right team HUD with the FULL roster (6 workers + every yamatoot + guard) per zone, 1280 / 390 / 360. usage: probe-hud.py before|after [workers] [crew]"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent; phase=sys.argv[1]; PORT=8791
NW=int(sys.argv[2]) if len(sys.argv)>2 else 6
def ui(route):
    r=route.fetch();route.fulfill(response=r,body=r.text()+"\nglobalThis.__q3={startPlay};")
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h) in [(1280,800),(390,844),(360,740)]:
        ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<500 else 1,reduced_motion='reduce',has_touch=(w<500),is_mobile=(w<500))
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/src/ui.js*',ui)
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded')
        pg.wait_for_function('!!window.__q3 && !!window.G',timeout=90000)
        pg.evaluate("""()=>{G.onChange=()=>{};G.save=()=>true;G.assetsLoading=false;document.querySelector('#boot')?.remove();[...document.body.children].forEach(n=>n.inert=false);document.querySelector('#title')?.classList.add('gone');document.querySelector('#enter-gate')?.remove();__q3.startPlay(false);G.mobs=[];G.queue=[];}""")
        pg.wait_for_timeout(1500)
        for zone in ['th','asia','west','cyberhell']:
            pg.evaluate("""async ([z,n])=>{const d=await import('/src/data.js');
              G.zone=z;d.syncSceneZone(z);G.coin=999999;G.zoneEvents.th={...(G.zoneEvents.th||{}),frontierBreach:'cleared'};
              for(let i=0;i<n;i++)G.hireWorker();
              for(const c of d.CREW)G.hire(c.k);
              G.paused=true;document.querySelectorAll('dialog[open]').forEach(x=>x.close());}""",[zone,NW])
            pg.wait_for_timeout(3500)
            pg.evaluate("document.querySelectorAll('dialog[open]').forEach(x=>x.close())")
            pg.wait_for_timeout(500)
            m=pg.evaluate("""()=>{const hud=document.querySelector('#team-hud');const r=hud.getBoundingClientRect();const faces=[...hud.querySelectorAll('.team-member')].map(e=>{const q=e.getBoundingClientRect();return [Math.round(q.left),Math.round(q.top),Math.round(q.right),Math.round(q.bottom)]});
              const vw=innerWidth,vh=innerHeight;
              const roster=hud.querySelector('.team-hud-roster');
              return {hud:[r.left,r.top,r.right,r.bottom].map(Math.round),members:faces.length,
                outside:faces.filter(f=>f[0]<0||f[2]>vw||f[3]>vh||f[1]<0).length,
                clippedByRoster:roster?[...hud.querySelectorAll('.team-member')].filter(e=>{const q=e.getBoundingClientRect(),rr=roster.getBoundingClientRect();return q.bottom>rr.bottom+1||q.top<rr.top-1||q.right>rr.right+1||q.left<rr.left-1}).length:null,
                scrollable:roster?[roster.scrollHeight>roster.clientHeight+1,roster.scrollWidth>roster.clientWidth+1]:null}}""")
            print(w,zone,json.dumps(m))
            pg.screenshot(path=str(OUT/f'{phase}-hud-{zone}-{w}.png'))
        print(w,'errors',errs[:3])
        ctx.close()
    b.close()
