#!/usr/bin/env python3
"""T5'/4-5 evidence: the end of the Border 1-2 walk with Yomathat in the team -> Guan Yu's gate scene and fight -> win -> Yomathat's gift. 390x844.
  BASE=http://127.0.0.1:8960/index.html CH=chromium python3 scripts/t5-gate-evidence.py <outdir>"""
import importlib.util, sys, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
STATE = "()=>({zone:G.zone,story:G.storyQueue.map(s=>s.key),notices:G.notices,battle:G.battle&&G.battle.kind+':'+G.battle.over,earned:!!G.guanyuEarned,follow:!!G.bossGuideFollowing(),coin:G.coin,dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.textContent.trim().replace(/\\s+/g,' ').slice(0,70)).join(' | ')})"
SETUP = """async()=>{const d=await import('./src/data.js');const z=await import('./src/zone-travel.js');
 G.hpMax=G.hp=300;G.coin=1000;G.zoneEvents.th={prisonBreak:'cleared',devaTest:'cleared',frontierBreach:'cleared',sitaHanuman:'cleared',khunPhaen:'cleared',thBorderBoss:'cleared'};G.bossCleared.th=true;G.zoneCases.th=15;
 G.queueStory('boss-guide-th-praise');G.onChange()}"""
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
    pg.evaluate(SETUP)
    for i in range(30):
        pg.wait_for_timeout(500)
        pg.evaluate("()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();const p=d&&d.querySelector('[data-comic-next],[data-notice-ok],[data-close],button.gold,button');p&&p.click()}")
        if not pg.evaluate(STATE)['dlg'] and i > 3: break
    pg.evaluate("()=>G.inviteBossGuide()")
    for i in range(30):
        pg.wait_for_timeout(500)
        pg.evaluate("()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();const p=d&&d.querySelector('[data-comic-next],[data-notice-ok],[data-close],button.gold,button');p&&p.click()}")
        if not pg.evaluate(STATE)['dlg'] and i > 3: break
    print('following', pg.evaluate(STATE))
    pg.evaluate("async()=>{const d=await import('./src/data.js');G.player.x=d.FRONTIER.x;G.player.y=d.FRONTIER.y;G.beginBorderDungeon('asia');G.hire&&0}")
    pg.evaluate("()=>{window.__done=false;window.__gateScene(()=>{window.__done=true})}")
    shot = 0; last = None
    for i in range(80):
        pg.wait_for_timeout(600); s = pg.evaluate(STATE); k = json.dumps(s, ensure_ascii=False)
        if k != last: last = k; print(i, k[:240]); pg.screenshot(path=str(out / f'g-{shot:02d}.png')); shot += 1
        if pg.evaluate("()=>window.__done"): print('DONE'); break
        if s['battle'] and 'zoneEvent' in s['battle'] and not s['battle'].endswith('win'):
            pg.evaluate("()=>{const b=G.battle;if(b&&!b.over){for(const f of b.foes){f.hp=1;f.atk=[0,0]}}}")
            pg.evaluate("()=>{[...document.querySelectorAll('.actor-segment')].find(b=>b.offsetParent&&b.textContent.trim().startsWith('โจมตี'))?.click()}"); pg.wait_for_timeout(300)
            pg.evaluate("()=>{document.querySelector('.cam-world [data-foe-id]')?.click()}")
        pg.evaluate("()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return;const p=d.querySelector('[data-fin],[data-comic-next],[data-notice-ok],[data-close],button.gold');p&&!p.disabled&&p.click()}")
    c.close(); b.close()
print(errs[:3])
