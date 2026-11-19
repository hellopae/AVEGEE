#!/usr/bin/env python3
"""T5'/2 evidence: after the Zone 1 boss, Yomathat waits at the harbor; talk -> "together" -> NY-2. 390x844.
  BASE=http://127.0.0.1:8960/index.html CH=chromium python3 scripts/t5-yomathat-evidence.py <outdir>"""
import importlib.util, sys, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
STATE = "()=>({story:G.storyQueue.map(s=>s.key),notices:G.notices,follow:!!G.bossGuideFollowing(),wait:!!G.bossGuideWaiting(),dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.textContent.trim().replace(/\\s+/g,' ').slice(0,80)).join(' | ')})"
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
    pg.evaluate("()=>{G.zoneEvents.th={prisonBreak:'cleared',devaTest:'cleared',frontierBreach:'cleared',sitaHanuman:'cleared',khunPhaen:'cleared',thBorderBoss:'cleared'};G.bossCleared.th=true;G.zoneCases.th=15;G.queueStory('boss-guide-th-praise');G.onChange()}")
    n = 0
    for i in range(40):
        pg.wait_for_timeout(600); s = pg.evaluate(STATE)
        pg.screenshot(path=str(out / f'a-{n:02d}.png')) if i % 3 == 0 else None; n += 1
        d = pg.evaluate("()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return null;const p=d.querySelector('[data-comic-next],[data-notice-ok],[data-close],button.gold,button');if(p){p.click();return p.textContent.trim().slice(0,20)}return null}")
        if not s['dlg'] and not s['story'] and not s['notices'] and i > 4: break
    print('after win:', pg.evaluate(STATE))
    pg.evaluate("()=>{G.player.x=SPOTS_X;G.player.y=SPOTS_Y;G.player.tx=null;G.player.ty=null;G.onChange()}".replace('SPOTS_X','1').replace('SPOTS_Y','1'))
    pg.evaluate("async()=>{const d=await import('./src/data.js');G.player.x=d.SPOTS.bossPier.x;G.player.y=d.SPOTS.bossPier.y+20;G.onChange()}")
    pg.wait_for_timeout(1500); pg.screenshot(path=str(out / 'b-map-pier.png'))
    pos = pg.evaluate("async()=>{const d=await import('./src/data.js');return window.__sceneToClient(d.SPOTS.bossPier.x,d.SPOTS.bossPier.y-30)}")
    print('click at', pos); pg.mouse.click(pos[0], pos[1]); pg.wait_for_timeout(900); print(pg.evaluate(STATE)); pg.screenshot(path=str(out / 'c-pier-talk.png'))
    pg.evaluate("()=>document.querySelector('[data-yomathat-go]')?.click()"); pg.wait_for_timeout(1200); print(pg.evaluate(STATE)); pg.screenshot(path=str(out / 'd-together-scene.png'))
    for i in range(14):
        pg.evaluate("()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();const p=d&&d.querySelector('[data-comic-next],[data-notice-ok],[data-close],button.gold,button');p&&p.click()}"); pg.wait_for_timeout(500)
        if i == 3: pg.screenshot(path=str(out / 'e-ny2.png'))
    print('end', pg.evaluate(STATE), errs[:3]); c.close(); b.close()
