"""Q3 probe: screenshots battle power menu / canteen / town HUD in a real browser.
usage: probe.py <phase> (before|after) ; fixtures live in-memory only, no save."""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).resolve().parent
phase=sys.argv[1]; what=sys.argv[2:] or ['battle','canteen','town']
PORT=8791
def ui(route):
    r=route.fetch();route.fulfill(response=r,body=r.text()+"\nglobalThis.__q3={openBattle,startPlay,openStation,refresh:typeof refresh!=='undefined'?refresh:null};")
with sync_playwright() as p:
    b=p.chromium.launch()
    for (w,h) in [(1280,800),(390,844),(360,740)]:
        ctx=b.new_context(viewport={'width':w,'height':h},reduced_motion='reduce',has_touch=(w<500),is_mobile=(w<500))
        pg=ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        pg.route('**/src/ui.js*',ui)
        pg.goto(f'http://127.0.0.1:{PORT}/',wait_until='domcontentloaded')
        pg.wait_for_function('!!window.__q3 && !!window.G',timeout=90000)
        pg.evaluate("""async()=>{G.onChange=()=>{};G.save=()=>true;G.assetsLoading=false;document.querySelector('#boot')?.remove();[...document.body.children].forEach(n=>n.inert=false);document.querySelector('#title')?.classList.add('gone');document.querySelector('#enter-gate')?.remove();__q3.startPlay(false);G.paused=true;}""")
        pg.wait_for_timeout(1500)
        if 'battle' in what:
            pg.evaluate("""()=>{G.level=10;G.lv=10;G.abilities={...G.abilities,teamJudgment:true,bigFire:true,flameCharge:true,windFan:true,rage:true,valkyrieSpear:true,ice:true,hypno:true};G.mp=G.mpMax=1000;
              G.startBattle({id:999,who:'ผีตานี',sp:'mob-pret',deserved:4,resist:true});__q3.openBattle();}""")
            pg.wait_for_timeout(2500)
            pg.screenshot(path=str(OUT/f'{phase}-battle-1-{w}.png'))
            pg.get_by_role('button',name='พลัง',exact=True).first.click(); pg.wait_for_timeout(900)
            pg.screenshot(path=str(OUT/f'{phase}-battle-2-power-{w}.png'))
            print('power order',pg.evaluate("()=>[...document.querySelectorAll('[data-options=power] [data-act]')].map(b=>b.dataset.act+':'+(b.title?'title':'no-title'))"))
            print('rects',pg.evaluate("()=>[...document.querySelectorAll('[data-options=power], [data-options=power] [data-act]')].map(b=>{const r=b.getBoundingClientRect();return [b.dataset.act||'container',Math.round(r.top),Math.round(r.bottom),getComputedStyle(b).overflow,getComputedStyle(b).position,b.dataset.act?getComputedStyle(b).opacity:'']})"))
            print('ultimate text',pg.evaluate("()=>document.querySelector('.battle-team-ultimate small')?.textContent"))
            print('battle buttons',pg.evaluate("()=>[...document.querySelectorAll('#dlg button')].map(b=>b.dataset.act||b.dataset.cmd||b.textContent.trim().slice(0,20))"))
        if 'canteen' in what:
            pg.evaluate("document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
            r=pg.evaluate("""async()=>{const d=await import('/src/data.js');
              G.coin=9999;G.level=10;
              G.stations.push({def:d.STATIONS.find(s=>s.k==='canteen'),slots:[],crewK:null,intensity:3,build:0,buildWait:false,repair:0,repairWait:false,arrivalElapsed:0,fire:0,speedLv:0,capLv:0,fuelLv:0,mgCd:0});
              for(const k of ['dam','plerng']) if(!G.crew.some(c=>c.k===k)) G.crew.push({k,name:k==='dam'?'โฮมุระ':'เพลิง',morale:100,hunger:100,hp:100,x:0,y:0});
              __q3.openStation('canteen');return G.crew.map(c=>c.k);}""")
            pg.wait_for_timeout(2500)
            pg.screenshot(path=str(OUT/f'{phase}-canteen-1-{w}.png'))
            print('canteen: elements',pg.evaluate("""()=>{const hud=document.querySelector('.st-hud').getBoundingClientRect();
              return {hud:[hud.left,hud.top,hud.right,hud.bottom].map(Math.round),els:['#st-left','#st-actions','#rice-cook','#rice-count','#rice-order','.st-pane p'].map(sel=>{const e=document.querySelector(sel);if(!e)return [sel,null];const r=e.getBoundingClientRect();const cx=(r.left+r.right)/2,cy=(r.top+r.bottom)/2;const top=document.elementFromPoint(cx,cy);return [sel,[r.left,r.top,r.right,r.bottom].map(Math.round),'hit:'+(top&&(top===e||e.contains(top)))+' top='+(top?top.tagName+'#'+top.id+'.'+top.className:null),e.disabled?'disabled':'']})}}"""))
            ok=pg.evaluate("()=>{const e=document.querySelector('#rice-order');return e&&!e.disabled}")
            print('canteen: order button enabled before reach:',ok)
        if 'canteen' in what:
            try:
                pg.select_option('#rice-cook',index=0,timeout=3000); pg.fill('#rice-count','3',timeout=3000)
                print('canteen: select+fill via real input OK; count=',pg.input_value('#rice-count'))
                pg.click('#rice-order',timeout=1500)
            except Exception as e: print('canteen: interaction problem',str(e).split('\n')[0][:160])
            # walk to the counter by clicking the floor next to it
            box=pg.locator('#st-cv').bounding_box()
            for fx,fy in [(0.68,0.62),(0.60,0.55),(0.62,0.50)]:
                pg.mouse.click(box['x']+box['width']*fx,box['y']+box['height']*fy); pg.wait_for_timeout(3500)
                if pg.evaluate("()=>!document.querySelector('#rice-order').disabled"): break
            print('canteen: button enabled after walking to counter:',pg.evaluate("()=>!document.querySelector('#rice-order').disabled"))
            print('canteen: values kept after rerender:',pg.input_value('#rice-count'))
            try:
                pg.click('#rice-order',timeout=2000); pg.wait_for_timeout(1200)
                print('canteen: status after order ->',pg.inner_text('.canteen-status'),'| err:',pg.inner_text('#rice-error'))
            except Exception as e: print('canteen: order click problem',str(e).split('\n')[0][:200])
            pg.screenshot(path=str(OUT/f'{phase}-canteen-2-ordered-{w}.png'))
        print(w,'errors',errs)
        ctx.close()
    b.close()
