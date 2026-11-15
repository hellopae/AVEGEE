#!/usr/bin/env python3
"""QUEST-DAM-B evidence (15 Nov 2026): drives the real game in Chromium (Playwright) and saves a picture of every step.

  python3 -m http.server 8960 --bind 127.0.0.1 &
  BASE=http://127.0.0.1:8960/index.html W=1792 H=958 python3 scripts/quest-dam-b-evidence.py <outdir> [quest|feather|dam|all]

  quest   the merchant's feather quest: shelf pin -> merchant window -> take it -> give ash -> walk to the pit -> set the bundle down -> fight -> result -> back -> reward
  feather the Phoenix Feather in a battle: the item row, the fallen teammate picked, the revive
  dam     Dam in zone 1: carrying a sack, carrying rice, the kitchen pose, the hunger icon, the team-page feed button
The save is a fresh in-memory slot; steps that would need hours of play (the first merchant quest, the ash, a fallen teammate) are set through the game's own API."""
import importlib.util, json, os, sys, time
from pathlib import Path
os.environ.setdefault('BASE', 'http://127.0.0.1:8960/index.html')
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
from playwright.sync_api import sync_playwright

out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
WHICH = sys.argv[2] if len(sys.argv) > 2 else 'all'
W, H = int(os.environ.get('W', 1792)), int(os.environ.get('H', 958))
PRE = os.environ.get('PRE', '')
log = []


def shot(pg, name):
    pg.screenshot(path=str(out / f'{PRE}{name}.png')); log.append(name)


def close_dialogs(pg):
    pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(400)


def jsclick(pg, sel, wait=700):
    ok = pg.evaluate("s=>{const e=document.querySelector(s);if(!e||e.disabled)return false;e.click();return true}", sel); pg.wait_for_timeout(wait); return ok


def press_e(pg):
    pg.keyboard.press('e'); pg.wait_for_timeout(700)


def set_player(pg, x, y):
    pg.evaluate("([x,y])=>{G.player.x=x;G.player.y=y;G.player.tx=x;G.player.ty=y;G.player.path=null}", [x, y]); pg.wait_for_timeout(900)


def attack_all(pg, max_rounds=40):
    """win a battle through the real buttons: every foe at 1 HP and harmless, then attack until it is over"""
    pg.evaluate("()=>{for(const f of G.battle.foes){f.hp=Math.min(f.hp,1);f.atk=[0,0]}}")
    for _ in range(max_rounds):
        if not pg.evaluate("()=>!!G.battle&&!G.battle.over"): break
        pg.evaluate("""()=>{const b=document.querySelector('dialog[open] .actor-segment[data-primary-action]');if(b&&!b.disabled)b.click()}""")
        pg.wait_for_timeout(350)
        pg.evaluate("""()=>{const f=[...document.querySelectorAll('dialog[open] [data-foe-id]')].find(e=>e.getAttribute('aria-disabled')!=='true');if(f)f.click()}""")
        pg.wait_for_timeout(2500)
        pg.evaluate("()=>{if(G.battle){for(const f of G.battle.foes){f.atk=[0,0]}}}")


def quest(p):
    browser, ctx, pg, errs, t0 = ev.boot(p, W, H)
    bad = []; pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    ev.to_zone(pg, 'asia')
    pg.evaluate("""async()=>{G.level=5;G.hpMax=G.hp=120;G.coin=2000;G.merchantJourney.asia={arrived:true,elapsed:90000};
      G.sideQuests.sqMerchant={step:5,choice:0,done:true,reward:{coin:0,order:0,exp:30,items:{},skill:null,retro:false}};G.hire&&0;G.onChange()}""")
    d = pg.evaluate("async()=>{const d=await import('./src/data.js');return [d.MERCHANT.x,d.MERCHANT.y]}")
    set_player(pg, d[0] + 20, d[1] + 40); close_dialogs(pg)
    # the pin over the merchant
    pg.evaluate("()=>{const m=document.querySelector('.mark.quest');if(m)m.classList.add('show')}"); pg.wait_for_timeout(400)
    shot(pg, 'q01-merchant-pin')
    press_e(pg); shot(pg, 'q02-merchant-window')
    jsclick(pg, '[data-quest-owner]', 600)
    if pg.query_selector('[data-owner-quest]'):
        jsclick(pg, '[data-owner-quest="sqMerchantFeather"]', 500)
    shot(pg, 'q03-quest-step1-intro')
    jsclick(pg, '[data-quest-next]', 700)
    shot(pg, 'q04-quest-taken-needs-ash')
    pg.evaluate("()=>{G.discoverySeen['item:ashStone']=1;G.discoverySeen['item:emberWood']=1;G.discoveryQueue=[];G.inventory.ashStone=3;G.inventory.emberWood=2;G.onChange()}")
    pg.wait_for_timeout(800); close_dialogs(pg)
    close_dialogs(pg); press_e(pg); jsclick(pg, '[data-quest-owner]', 500)
    if pg.query_selector('[data-owner-quest]'): jsclick(pg, '[data-owner-quest="sqMerchantFeather"]', 500)
    shot(pg, 'q05-quest-ash-ready')
    jsclick(pg, '[data-quest-next]', 700)
    shot(pg, 'q06-quest-bundle-tied-go-to-pit')
    close_dialogs(pg)
    pit = pg.evaluate("async()=>{const s=await import('./src/side-quests.js');const q=s.QUESTS.find(q=>q.id==='sqMerchantFeather');const t=s.questTarget(G,q);return [t.x,t.y]}")
    set_player(pg, pit[0] + 30, pit[1] + 70)
    pg.evaluate("()=>{const m=document.querySelector('.mark.quest');if(m)m.classList.add('show')}"); pg.wait_for_timeout(500)
    shot(pg, 'q07-ash-pit-pin')
    jsclick(pg, '.mark.quest [data-quest-open]', 700)
    shot(pg, 'q08-pit-set-down-the-bundle')
    jsclick(pg, '[data-quest-next]', 900)
    shot(pg, 'q09-pre-fight-scene')
    jsclick(pg, '[data-quest-fight-go]', 4500)
    shot(pg, 'q10-fight')
    attack_all(pg)
    pg.wait_for_timeout(1800)
    shot(pg, 'q11-after-fight')
    for _ in range(4):
        if pg.evaluate("()=>!!document.querySelector('dialog[open] [data-quest-fight-next]')"): break
        pg.evaluate("""()=>{const b=document.querySelector('dialog[open] .battle-finish, dialog[open] [data-battle-finish], dialog[open] .fin-btn, dialog[open] button.gold');if(b)b.click()}""")
        pg.wait_for_timeout(1500)
    shot(pg, 'q12-fight-result-scene')
    if pg.query_selector('[data-quest-fight-next]'):
        jsclick(pg, '[data-quest-fight-next]', 800)
    shot(pg, 'q13-back-to-merchant')
    close_dialogs(pg)
    set_player(pg, d[0] + 20, d[1] + 40); press_e(pg)
    jsclick(pg, '[data-quest-owner]', 500)
    if pg.query_selector('[data-owner-quest]'): jsclick(pg, '[data-owner-quest="sqMerchantFeather"]', 500)
    shot(pg, 'q14-closing-talk')
    jsclick(pg, '[data-quest-next]', 1200)
    shot(pg, 'q15-reward-receipt')
    close_dialogs(pg)
    jsclick(pg, '#hud-bag', 700)
    shot(pg, 'q17-bag-with-the-feather')
    close_dialogs(pg); press_e(pg)
    shot(pg, 'q16-merchant-shop-sells-feather')
    print('quest state', pg.evaluate("()=>({s:G.sideQuests.sqMerchantFeather,inv:G.inventory,coin:G.coin})"))
    print('errors', errs[:8]); print('bad responses', bad[:12])
    browser.close()


def feather(p):
    browser, ctx, pg, errs, t0 = ev.boot(p, W, H)
    bad = []; pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.evaluate("""()=>{G.level=5;G.hpMax=G.hp=120;G.mpMax=G.mp=60;G.coin=900;G.zoneEvents.th={...G.zoneEvents.th,frontierBreach:'cleared'};
      for(const k of ['taan','plerng','kan'])if(!G.crew.some(c=>c.k===k))G.hire(k);
      G.party.members=['taan','plerng','kan'];G.discoverySeen['item:phoenixFeather']=1;G.discoveryQueue=[];G.inventory.phoenixFeather=2;G.onChange()}""")
    ev.open_battle(pg, 600, 900, '', None)
    pg.evaluate("()=>{G.mp=G.mpMax=999;if(G.battle){for(const f of G.battle.foes){f.hp=f.maxHp=9999;f.atk=[0,0]}}}")
    pg.wait_for_timeout(800)
    # a teammate falls (the game's own rule: morale 0 -> lies down in the scene)
    pg.evaluate("()=>{const a=G.battleActors().find(a=>a.k==='taan');a.morale=0;G.downActor(a);G.onChange()}"); pg.wait_for_timeout(900)
    shot(pg, 'f01-teammate-down')
    # the turn must be an ally's: skip foe turns through the real loop
    for _ in range(12):
        if pg.evaluate("()=>G.beginBattleTurns()?.side==='ally'"): break
        pg.wait_for_timeout(1200)
    jsclick(pg, 'dialog[open] .actor-segment[data-command="item"]', 500)
    shot(pg, 'f02-item-menu-with-feather')
    jsclick(pg, 'dialog[open] [data-act="phoenixFeather"]', 600)
    shot(pg, 'f03-feather-pick-a-fallen-teammate')
    ok = pg.evaluate("""()=>{const fid=G.battleFallen()[0]?.id;const el=[...document.querySelectorAll('dialog[open] [data-crew-pick]')].find(e=>e.classList.contains('choose-recipient'));if(!el)return {clicked:false,fid};el.click();return {clicked:true,fid}}""")
    print('feather click', ok)
    pg.wait_for_timeout(2600)
    shot(pg, 'f04-after-the-feather')
    print('after', pg.evaluate("()=>({fallen:G.battle?.fallen,feathers:G.inventory.phoenixFeather,taan:G.crewOf('taan').morale,used:G.battle?.phoenixUsed})"))
    print('errors', errs[:8]); print('bad responses', bad[:12])
    browser.close()


def dam(p):
    browser, ctx, pg, errs, t0 = ev.boot(p, W, H)
    bad = []; pg.on('response', lambda r: bad.append(f'{r.status} {r.url}') if r.status >= 400 else None)
    pg.evaluate("""async()=>{const d=await import('./src/data.js');G.level=5;G.coin=9999;G.food=40;G.zoneEvents.th={...G.zoneEvents.th,frontierBreach:'cleared'};
      G.hire('dam');const c=G.crewOf('dam');c.x=c.hx;c.y=c.hy;
      for(const k of ['ngiw'])G.stations.push({def:d.STATIONS.find(s=>s.k===k),slots:[],crewK:null,intensity:3,build:0,buildWait:false,repair:0,repairWait:false,arrivalElapsed:0,fire:0,speedLv:0,capLv:0,fuelLv:0,mgCd:0});
      G.syncBlocks&&G.syncBlocks(true);G.onChange()}""")
    # follow Dam with the hero so he is on screen
    follow = """()=>{const c=G.crewOf('dam');G.player.x=c.x+120;G.player.y=c.y+60;G.player.tx=G.player.x;G.player.ty=G.player.y}"""
    got = {}
    for i in range(160):
        pg.evaluate(follow); pg.wait_for_timeout(250)
        st = pg.evaluate("()=>{const c=G.crewOf('dam');return {carry:c.fmCarry||null,x:c.x,y:c.y,job:c.fm?.kind||null,phase:c.fm?.phase||null}}")
        if st['carry'] == 'wood' and 'wood' not in got:
            pg.wait_for_timeout(600); shot(pg, 'd01-dam-carries-the-sack'); got['wood'] = True
        if got.get('wood') and i > 20 and st['carry'] is None: break
    # rice: a hungry teammate and a rice ball in the stock
    pg.evaluate("()=>{const t=G.crewOf('taan');t.x=t.x??t.hx;t.y=t.y??t.hy;t.hunger=10;G.food=20}")
    for i in range(160):
        pg.evaluate(follow); pg.wait_for_timeout(250)
        st = pg.evaluate("()=>{const c=G.crewOf('dam');return {carry:c.fmCarry||null}}")
        if st['carry'] == 'rice':
            pg.wait_for_timeout(500); shot(pg, 'd02-dam-carries-rice'); break
    # hungry: the new icon over his head, the team-page note
    pg.evaluate("()=>{const c=G.crewOf('dam');c.hunger=0;G.food=0;const t=G.crewOf('taan');t.hunger=0}"); pg.wait_for_timeout(1500)
    pg.evaluate(follow); pg.wait_for_timeout(900)
    shot(pg, 'd03-dam-and-taan-hungry-icon')
    jsclick(pg, '[data-team-manage]', 900); shot(pg, 'd07-team-page-dam-waits-for-a-rice-ball')
    close_dialogs(pg)
    print('starving', pg.evaluate("async()=>{const f=await import('./src/foreman.js');return {starving:f.foremanStarving(G),phase:f.foremanPhase(G),courier:G.courtCourier()?.k}}"))
    # the kitchen: workers + canteen -> Dam at the desk with folded arms
    pg.evaluate("""async()=>{const d=await import('./src/data.js');G.food=40;G.crewOf('dam').hunger=100;G.crewOf('taan').hunger=100;G.hireWorker('serve');
      G.stations.push({def:d.STATIONS.find(s=>s.k==='canteen'),slots:[],crewK:null,intensity:3,build:0,buildWait:false,repair:0,repairWait:false,arrivalElapsed:0,fire:0,speedLv:0,capLv:0,fuelLv:0,mgCd:0});G.syncBlocks&&G.syncBlocks(true);G.onChange()}""")
    for i in range(60):
        pg.evaluate(follow); pg.wait_for_timeout(250)
        if pg.evaluate("async()=>{const f=await import('./src/foreman.js');const c=G.crewOf('dam');const p=f.deskPoint(G);return Math.hypot(c.x-p[0],c.y-p[1])<26}"): break
    pg.wait_for_timeout(700)
    shot(pg, 'd04-dam-at-the-kitchen-desk')
    jsclick(pg, '[data-open-foreman]', 300)
    pg.evaluate("()=>{G.player.x=G.crewOf('dam').x;G.player.y=G.crewOf('dam').y+30}"); pg.keyboard.press('e'); pg.wait_for_timeout(900)
    shot(pg, 'd05-kitchen-orders-window-th')
    pg.evaluate("async()=>{(await import('./src/i18n.js')).setLang('en')}"); pg.wait_for_timeout(900)
    pg.evaluate("()=>{G.onChange()}"); pg.wait_for_timeout(1200)
    shot(pg, 'd06-kitchen-orders-window-en')
    pg.evaluate("async()=>{(await import('./src/i18n.js')).setLang('th')}")
    print('errors', errs[:8]); print('bad responses', bad[:12])
    browser.close()


def main():
    with sync_playwright() as p:
        if WHICH in ('quest', 'all'): quest(p)
        if WHICH in ('feather', 'all'): feather(p)
        if WHICH in ('dam', 'all'): dam(p)
    print('saved', len(log), 'pictures to', out)


main()
