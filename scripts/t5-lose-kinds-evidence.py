#!/usr/bin/env python3
"""T5'/0 evidence: loses a fight of each kind in the real game and follows what appears on screen (the fight's own lost scene first, then the tea-house wake-up),
then checks the fight can be taken again. 390x844.
  BASE=http://127.0.0.1:8960/index.html CH=chromium python3 scripts/t5-lose-kinds-evidence.py <outdir> [name,name]"""
import importlib.util, sys, time, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
# name: (zone, setup js -> truthy when a battle is open)
CASES = {
 'event-th-hanuman': ('th', "()=>{G.zoneEvents.th={prisonBreak:'cleared',devaTest:'cleared',frontierBreach:'cleared',sitaHanuman:'pending'};return !!G.startZoneEvent('sitaHanuman')}"),
 'event-asia-wukong': ('asia', "()=>{G.zoneEvents.asia={asiaWukong:'pending'};return !!G.startZoneEvent('asiaWukong')}"),
 'zoneboss-asia': ('asia', "()=>{G.zoneCases.asia=15;G.bossGuarding.asia=true;const b=G.startZoneBoss('alert');if(!b)return false;G.startBossFight&&G.startBossFight();return true}"),
 'mob-west': ('west', "()=>{G.mobs.push({id:901,x:G.player.x,y:G.player.y,hp:30,kind:0});const b=G.startMobBattle(G.mobs.length-1);return !!b}"),
 'questfight-th': ('th', "()=>{G.level=5;G.hire('plerng');const b=G.startQuestFight('sqGuard');G.onChange();return !!b}"),
}
LOSE = """()=>{const b=G.battle;if(!b)return 'nobattle';b.youHp=1;for(const f of b.foes){f.atk=[9999,9999];f.hp=f.maxHp=99999}
  for(let i=0;i<60&&!b.over;i++){if(G.runEnemyTurn()){if(b.commandBusy){}}else{G.battleAct('atk',{actorId:b.actorId||'you',recipientId:'you'})}if(b.commandBusy){G.completeCombatTurn&&0;b.commandBusy=false}}
  return b.over}"""
STATE = "()=>({rec:G.pendingRecovery&&G.pendingRecovery.stage,battle:!!G.battle&&(G.battle.over||'open'),story:G.storyQueue.length,dlg:[...document.querySelectorAll('dialog[open]')].map(d=>(d.querySelector('h1,h2,h3,.title')||d).textContent.trim().slice(0,40)).join(' | '),wake:!!document.querySelector('.nira-wakeup')})"
CLICK = """()=>{const d=[...document.querySelectorAll('dialog[open]')].pop();if(!d)return null;
  const pick=d.querySelector('[data-fin]')||d.querySelector('[data-quest-fight-rest]')||d.querySelector('button.gold,[data-next],[data-close]');
  if(pick&&!pick.disabled&&pick.offsetParent){const t=pick.textContent.trim().slice(0,30);pick.click();return t}return null}"""
with sync_playwright() as p:
    for name, (zone, setup) in CASES.items():
        if ONLY and name not in ONLY: continue
        b, c, pg, errs, t0 = ev.boot(p, 390, 844, 1, False, None)
        ev.to_zone(pg, zone)
        pg.evaluate("()=>{G.level=3;G.hpMax=G.hp=130;if(!G.crew.some(c=>c.k==='taan'))G.hire('taan');G.onChange()}")
        ok = pg.evaluate(setup); pg.wait_for_timeout(500)
        log = [('setup', ok, pg.evaluate(STATE))]
        if not ok: print(name, 'SETUP FAILED', log); c.close(); b.close(); continue
        if name.startswith('questfight'): pg.wait_for_timeout(2500)          # the game's own onChange has opened the fight window (with the quest's `after`)
        else: pg.evaluate("()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close())}")
        if name.startswith('questfight'):
            # the real fight window: the foes hit for 9999, so Yama falls at the first blow; the player just keeps pressing "attack" (then the foe) until the result button shows
            pg.evaluate("()=>{const b=G.battle;b.youHp=1;for(const f of b.foes){f.atk=[9999,9999];f.hp=f.maxHp=99999}}")
            for i in range(40):
                if pg.evaluate("()=>!!document.querySelector('[data-fin]')||!!G.pendingRecovery"): break
                pg.evaluate("()=>{[...document.querySelectorAll('.actor-segment')].find(b=>b.offsetParent&&b.textContent.trim().startsWith('โจมตี'))?.click()}"); pg.wait_for_timeout(350)
                pg.evaluate("()=>{document.querySelector('.cam-world [data-foe-id]')?.click()}"); pg.wait_for_timeout(1200)
            res = pg.evaluate("()=>G.battle&&G.battle.over"); log.append(('lost (via the fight window)', res))
        else:
            res = pg.evaluate(LOSE); log.append(('lost', res))
        if not name.startswith('questfight'): pg.evaluate("()=>{G.endBattle();G.onChange()}")      # what the fight window's finish() does when its button is pressed
        last = None; t = time.time(); shot = 0
        while time.time() - t < 30:
            s = pg.evaluate(STATE); key = json.dumps(s, sort_keys=True)
            if key != last:
                last = key; log.append((round(time.time() - t, 1), s))
                if s['rec'] or s['wake'] or s['story']: pg.screenshot(path=str(out / f'{name}-{shot:02d}.png')); shot += 1
            if not s['rec'] and not s['battle'] and not s['story'] and not s['dlg'] and time.time() - t > 3: break
            if os.environ.get('ESC') and pg.evaluate("()=>!!document.querySelector('dialog[open] [data-quest-fight-rest]')"):
                pg.keyboard.press('Escape'); log.append(('key', 'Escape (instead of the button)')); pg.wait_for_timeout(600); continue
            clicked = pg.evaluate(CLICK)
            if clicked: log.append(('click', clicked))
            pg.wait_for_timeout(350)
        log.append(('end', pg.evaluate(STATE)))
        pg.screenshot(path=str(out / f'{name}-end.png'))
        print('==', name); [print('  ', l) for l in log]; print('   errors:', errs[:3])
        c.close(); b.close()
