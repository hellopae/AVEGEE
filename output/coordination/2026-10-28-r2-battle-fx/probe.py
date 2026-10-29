from playwright.sync_api import sync_playwright
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
with sync_playwright() as p:
 b=p.chromium.launch(headless=True)
 ctx=b.new_context(viewport={'width':1440,'height':1000})
 pg=ctx.new_page();errors=[]
 pg.on('pageerror',lambda e:errors.append(str(e)))
 def ui(route):
  response=route.fetch();route.fulfill(response=response,body=response.text()+'''\nglobalThis.__r2={openBattle,startPlay,playActionCutscene,cutsceneSource,timings:()=>battleCutscenes.timings(),cache:()=>battleCutscenes};''')
 pg.route('**/src/ui.js*',ui)
 pg.goto('http://127.0.0.1:8779/',wait_until='domcontentloaded')
 pg.wait_for_function('!!window.__r2',timeout=60000)
 print('loaded',errors)
 print(pg.evaluate('''()=>{G.onChange=()=>{};G.save=()=>true;G.assetsLoading=false;document.querySelector('#boot')?.remove();document.querySelector('#title')?.classList.add('gone');document.querySelector('#enter-gate')?.remove();G.level=10;G.lv=10;G.abilities={...G.abilities,windFan:true,hypno:true,flameCharge:true};G.mp=G.mpMax=1000;G.startBattle({id:999,who:'เปรต',sp:'mob-pret',deserved:4,resist:true});G.battle.foes.forEach(f=>{f.hp=f.maxHp=10000;f.atk=[1,1]});__r2.openBattle();return {actors:G.battleActors(),turn:G.currentBattleTurn(),powers:[...document.querySelectorAll('[data-act]')].map(x=>[x.dataset.act,x.disabled]),dialog:document.querySelector('#dlg').open};}'''))
 pg.wait_for_timeout(2000)
 pg.screenshot(path=str(OUT/'probe.png'))
 print('timings',pg.evaluate('__r2.timings()'))
 print('errors',errors)
 b.close()
