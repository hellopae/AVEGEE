#!/usr/bin/env python3
"""T6/5 evidence: Musashi in the team on the walk to Border 2-3 -> NR-1 -> z2-ryujin-open -> the fight -> (HP ~25 %) the strike scene -> the win scene -> NR-3 ... 390x844.
  BASE=http://127.0.0.1:8962/index.html CH=chromium python3 scripts/t6-ryujin-evidence.py <outdir>"""
import importlib.util, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
STATE = "()=>({zone:G.zone,story:G.storyQueue.map(s=>s.key),notices:G.notices,battle:G.battle&&(G.battle.kind+':'+G.battle.over+':'+(G.battle.breachFinale||'')+':'+(G.battle.storyInterlude||'')),boss:G.battle&&G.battle.foes.map(f=>f.hp+'/'+f.maxHp).join(','),party:G.battle&&G.battleActors().map(a=>a.name||a.k),follow:!!G.bossGuideFollowing(),unlocked:Object.keys(G.magic.unlocked),dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.className||d.id).join('|')})"
SETUP = """async()=>{const d=await import('./src/data.js');
 G.hpMax=G.hp=400;G.coin=3000;G.zone='asia';G.giveLamp();G.bossCleared.asia=true;G.notices=[];
 G.queueNotice('z2-lian-wait');G.player.x=d.FRONTIER.x;G.player.y=d.FRONTIER.y;G.bossGuides=null;
 const bg=await import('./src/boss-guides.js');bg.recordBossGuideWin(G,{over:'win',zone:'asia',kind:'zoneBoss'});G.inviteBossGuide();
 for(let i=0;i<8&&G.storyQueue.length;i++)G.completeStory();G.notices=[];G.pendingReward=null;
 const ok=G.beginBorderDungeon('west');G.onChange();return ok}"""
CLICK = "()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return;const p=d.querySelector('[data-fin],[data-comic-next],[data-story-next],[data-notice-ok],[data-close],button.gold');p&&!p.disabled&&p.click()}"
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
    print('setup', pg.evaluate(SETUP)); print(pg.evaluate(STATE))
    pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(500)
    pg.evaluate("()=>{window.__done=false;window.__ryujinScene(()=>{window.__done=true})}")
    shot = 0; last = None
    for i in range(120):
        pg.wait_for_timeout(600); s = pg.evaluate(STATE); k = json.dumps(s, ensure_ascii=False)
        if k != last: last = k; print(i, k[:300]); pg.screenshot(path=str(out / f'r-{shot:02d}.png')); shot += 1
        if pg.evaluate("()=>window.__done"): print('DONE'); break
        bt = s['battle']
        if bt and bt.startswith('zoneEvent') and ':win' not in bt and ':lose' not in bt and not s['story'] and ':ready:' not in bt:
            # fight: make the dragon one hit from a quarter, then hit it
            pg.evaluate("()=>{const b=G.battle;if(b&&!b.over&&!b.breachFinale){for(const f of b.foes){f.atk=[0,0];if(f.boss)f.hp=Math.floor(f.maxHp*.25)+2}}}")
            pg.evaluate("()=>{[...document.querySelectorAll('.actor-segment')].find(b=>b.offsetParent&&b.textContent.trim().startsWith('โจมตี'))?.click()}"); pg.wait_for_timeout(300)
            pg.evaluate("()=>{document.querySelector('.cam-world [data-foe-id]')?.click()}")
        pg.evaluate(CLICK)
    print('final', pg.evaluate(STATE)); print('errors', errs[:5])
    pg.screenshot(path=str(out / 'r-final.png')); c.close(); b.close()
