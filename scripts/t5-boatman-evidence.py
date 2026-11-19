#!/usr/bin/env python3
"""T5'/7 evidence: the harbor window with the boatman's quest (listen at the end of the landing, then sing to him). 390x844.
  BASE=http://127.0.0.1:8960/index.html CH=chromium python3 scripts/t5-boatman-evidence.py <outdir>"""
import importlib.util, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
STATE = "()=>({quest:G.boatman.quest,heard:G.boatman.heard,coin:G.coin,story:G.storyQueue.map(s=>s.key),notices:G.notices,dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.textContent.trim().replace(/\\s+/g,' ').slice(0,110)).join(' | ')})"
NEXT = "()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();const p=d&&d.querySelector('[data-comic-next],[data-notice-ok],[data-close],button.gold,button');p&&p.click()}"
def drain(pg, n=25):
    for i in range(n):
        pg.wait_for_timeout(500)
        if not pg.evaluate(STATE)['dlg'] and i > 2: break
        pg.evaluate(NEXT)
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
    pg.evaluate("()=>{G.boatman={rides:2,quest:'active',heard:{},firstSeen:true};G.save();G.onChange()}")
    def harbor():
        pg.evaluate("async()=>{const p=G.harbourPoint();G.player.x=p.x;G.player.y=p.y;G.player.tx=null;G.player.ty=null;G.onChange()}"); pg.wait_for_timeout(900)
        pos = pg.evaluate("()=>{const p=G.harbourPoint();return window.__sceneToClient(p.x,p.y)}"); pg.mouse.click(pos[0], pos[1]); pg.wait_for_timeout(900)
    harbor(); print(pg.evaluate(STATE)); pg.screenshot(path=str(out / 'a-harbor-listen.png'))
    pg.evaluate("()=>document.querySelector('[data-boat-listen]')?.click()"); pg.wait_for_timeout(900); pg.screenshot(path=str(out / 'b-verse.png')); drain(pg)
    print(pg.evaluate(STATE))
    pg.evaluate("()=>{G.boatman.heard.asia=true;G.save();G.onChange()}")
    harbor(); print(pg.evaluate(STATE)); pg.screenshot(path=str(out / 'c-harbor-sing.png'))
    pg.evaluate("()=>document.querySelector('[data-boat-sing]')?.click()"); pg.wait_for_timeout(900); pg.screenshot(path=str(out / 'd-song.png')); drain(pg)
    print(pg.evaluate(STATE), errs[:3]); c.close(); b.close()
