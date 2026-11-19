#!/usr/bin/env python3
"""T6/6-7 evidence: the end of the walk to Border 2-3 with Musashi -> NC-1 -> z3gate-cerberus-open -> the fight -> his bow + NC-3 -> Musashi's farewell + NM-1 -> into Zone 3 where Cerberus stands by the gate. 390x844.
  BASE=http://127.0.0.1:8962/index.html CH=chromium python3 scripts/t6-cerberus-evidence.py <outdir>"""
import importlib.util, sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
STATE = "()=>({zone:G.zone,outfit:G.outfit,story:G.storyQueue.map(s=>s.key),notices:G.notices,battle:G.battle&&(G.battle.kind+':'+G.battle.over),party:G.battle&&G.battleActors().map(a=>a.name||a.k),follow:!!G.bossGuideFollowing(),unlocked:Object.keys(G.magic.unlocked),guarding:G.cerberusGuarding(),dlg:[...document.querySelectorAll('dialog[open]')].map(d=>d.className||d.id).join('|')})"
SETUP = """async()=>{const d=await import('./src/data.js');
 G.hpMax=G.hp=500;G.coin=3000;G.zone='asia';G.giveLamp();G.bossCleared.asia=true;G.notices=[];
 G.player.x=d.FRONTIER.x;G.player.y=d.FRONTIER.y;G.bossGuides=null;
 const bg=await import('./src/boss-guides.js');bg.recordBossGuideWin(G,{over:'win',zone:'asia',kind:'zoneBoss'});G.inviteBossGuide();
 for(let i=0;i<8&&G.storyQueue.length;i++)G.completeStory();G.notices=[];G.pendingReward=null;
 const ok=G.beginBorderDungeon('west');G.onChange();return ok}"""
CLICK = "()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return;const p=d.querySelector('[data-fin],[data-comic-next],[data-story-next],[data-notice-ok],[data-close],button.gold');p&&!p.disabled&&p.click()}"
def run(pg, tag, limit, until, fight=True):
    shot = 0; last = None
    for i in range(limit):
        pg.wait_for_timeout(600); s = pg.evaluate(STATE); k = json.dumps(s, ensure_ascii=False)
        if k != last: last = k; print(tag, i, k[:260]); pg.screenshot(path=str(out / f'{tag}-{shot:02d}.png')); shot += 1
        if pg.evaluate(until): print(tag, 'DONE'); return
        bt = s['battle']
        if fight and bt and bt.startswith('zoneEvent') and not bt.endswith('win') and not bt.endswith('lose') and not s['story']:
            pg.evaluate("()=>{const b=G.battle;if(b&&!b.over){for(const f of b.foes){f.hp=1;f.atk=[0,0]}}}")
            pg.evaluate("()=>{[...document.querySelectorAll('.actor-segment')].find(b=>b.offsetParent&&b.textContent.trim().startsWith('โจมตี'))?.click()}"); pg.wait_for_timeout(300)
            pg.evaluate("()=>{document.querySelector('.cam-world [data-foe-id]')?.click()}")
        pg.evaluate(CLICK)
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
    miss = []; pg.on('response', lambda r: miss.append(r.url) if r.status == 404 else None)
    print('setup', pg.evaluate(SETUP))
    pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(500)
    pg.evaluate("()=>{window.__done=false;window.__cerberusScene(()=>{window.__done=true})}")
    run(pg, 'c', 120, "()=>window.__done")
    pg.evaluate("()=>{G.farewellBossGuide()}")
    run(pg, 'f', 60, "()=>!G.bossGuideFollowing()&&!G.storyQueue.length&&!G.notices.length&&!document.querySelector('dialog[open]')", fight=False)
    pg.evaluate("""async()=>{const z=await import('./src/zone-travel.js'),v=await import('./src/dungeon-view.js');const a=G.zoneTravel.active,r=z.dungeonStatus(G).route;a.checkpoint=r.checkpoints.length;a.cleared=r.checkpoints.map(c=>c.id);const e=v.dungeonPoint(1,r.id);a.position={x:e[0],y:e[1]};return G.moveZone('west')}""")
    pg.wait_for_timeout(2500); pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(1500)
    print('zone3', pg.evaluate(STATE)); pg.screenshot(path=str(out / 'z3-map.png'))
    pg.evaluate("()=>{const g=G;const gate=[g.player.x,g.player.y];g.player.x=gate[0];}"); 
    print('404s', sorted(set(miss))[:12]); print('errors', len(errs)); c.close(); b.close()
