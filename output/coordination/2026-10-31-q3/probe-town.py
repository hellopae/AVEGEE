"""Q3 probe 2: worker size vs Yama on the 4 town maps + team HUD (bottom right) per zone. usage: probe-town.py before|after"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent; phase=sys.argv[1]; PORT=8791
def ui(route):
    r=route.fetch();route.fulfill(response=r,body=r.text()+"\nglobalThis.__q3={startPlay,refresh:typeof refresh!=='undefined'?refresh:null};")
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h) in [(1280,800),(390,844)]:
        ctx=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<500 else 1,reduced_motion='reduce',has_touch=(w<500),is_mobile=(w<500))
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/src/ui.js*',ui)
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded')
        pg.wait_for_function('!!window.__q3 && !!window.G',timeout=90000)
        pg.evaluate("""()=>{G.onChange=()=>{};G.save=()=>true;G.assetsLoading=false;document.querySelector('#boot')?.remove();[...document.body.children].forEach(n=>n.inert=false);document.querySelector('#title')?.classList.add('gone');document.querySelector('#enter-gate')?.remove();__q3.startPlay(false);G.mobs=[];G.queue=[];}""")
        pg.wait_for_timeout(1500)
        for zone in ['th','asia','west','cyberhell']:
            info=pg.evaluate("""async z=>{const d=await import('/src/data.js');
              G.zone=z;d.syncSceneZone(z);G.coin=99999;G.zoneEvents.th={...(G.zoneEvents.th||{}),frontierBreach:'cleared'};
              for(let i=0;i<4;i++)G.hireWorker();
              G.paused=true;
              document.querySelectorAll('dialog[open]').forEach(x=>x.close());
              __q3.refresh&&__q3.refresh();
              return {workers:G.workers().length,player:[G.player.x,G.player.y]};}""",zone)
            pg.wait_for_timeout(4500)
            info2=pg.evaluate("""()=>{document.querySelectorAll('dialog[open]').forEach(x=>x.close());const P=G.player;const ws=G.workers();ws.forEach((wk,i)=>{wk.x=P.x+60+i*46;wk.y=P.y+(i%2?6:0);wk.moving=false;wk.arrived=false;wk.job=null;wk.face=1;});return {P:[P.x,P.y],ws:ws.map(x=>[x.x,x.y])}}""")
            pg.wait_for_timeout(600)
            pg.screenshot(path=str(OUT/f'{phase}-town-{zone}-{w}.png'))
            # crowd HUD (bottom right team strip)
            print(w,zone,info,info2)
        print(w,'errors',errs[:3])
        ctx.close()
    b.close()
