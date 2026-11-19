#!/usr/bin/env python3
"""T5'/0 evidence: a lost fight ends at the tea house (Yama lies, Nira runs in and speaks, the fallen teammates and Yama stand up together), at 390x844.
  python3 scripts/serve-nocache.py 8960 &
  BASE=http://127.0.0.1:8960/index.html CH=chromium python3 scripts/t5-defeat-evidence.py <outdir> [zone]"""
import importlib.util, sys, time, json, os
from pathlib import Path
from playwright.sync_api import sync_playwright
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
out = Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True); zone = sys.argv[2] if len(sys.argv) > 2 else None
W = int(os.environ.get('W', 390)); H = int(os.environ.get('H', 844))
STATE = "()=>({rec:G.pendingRecovery&&G.pendingRecovery.stage,hp:Math.round(G.hp),battle:!!G.battle,dlg:!![...document.querySelectorAll('dialog[open]')].length,wake:!!document.querySelector('.nira-wakeup'),crew:G.crew.filter(c=>!c.self).map(c=>({k:c.k,morale:Math.round(c.morale),rest:c.teaRest?c.teaRest.phase:null}))})"
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, W, H, int(os.environ.get('DPR', 1)), False, None)
    ev.to_zone(pg, zone)
    pg.evaluate("()=>{if(!G.crew.some(c=>c.k==='taan'))G.hire('taan');if(!G.crew.some(c=>c.k==='plerng'))G.hire('plerng');G.onChange()}")
    ev.open_battle(pg, 600, 900, '', None)
    log = []
    pg.evaluate("()=>{const a=G.crew.find(c=>c.k==='taan');a.morale=0;G.downActor(a);document.querySelectorAll('dialog[open]').forEach(d=>d.close());G.hp=1;G.battle.over='lose';G.battle.youHp=0;G.endBattle();G.onChange()}")
    t = time.time(); seen = set()
    while time.time() - t < 14:
        s = pg.evaluate(STATE)
        key = (s['rec'], s['wake'], s['dlg'])
        if key not in seen:
            if s['wake']: pg.wait_for_timeout(450)       # let the bubble finish fading in
            seen.add(key); name = f"{len(seen):02d}-{s['rec'] or 'none'}{'-bubble' if s['wake'] else ''}"; pg.screenshot(path=str(out / (name + '.png'))); log.append((round(time.time() - t, 1), name, s))
            if s['wake']:                                  # the last beat (everybody stands up) is 0.6 s long: a burst of frames
                for i in range(7):
                    pg.screenshot(path=str(out / f'{name}-burst{i}.png')); log.append((round(time.time() - t, 1), f'burst{i}', pg.evaluate(STATE)['crew'][0]))
        pg.wait_for_timeout(120)
    for _ in range(4):
        pg.wait_for_timeout(700)
    pg.screenshot(path=str(out / '99-after.png')); log.append(('after', pg.evaluate(STATE)))
    c.close(); b.close()
print(json.dumps(log, ensure_ascii=False, indent=1)); print(errs[:5])
