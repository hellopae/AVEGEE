#!/usr/bin/env python3
"""FB3-T1 evidence (BT1 BT4a BT4b BT8a EV14 EV21): drives the real game in Chromium (Playwright) and measures frame by frame.
  python3 scripts/serve-nocache.py 8951 &      (or any threaded no-cache server)
  BASE=http://127.0.0.1:8951/index.html W=1792 H=1120 python3 scripts/fb3-t1-evidence.py <outdir> <label>
Prints one JSON summary and writes <label>-*.png. Run it on the old build and the new build and compare."""
import importlib.util, json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
os.environ.setdefault('CH', 'chromium')
spec = importlib.util.spec_from_file_location('ev', str(Path(__file__).with_name('scene-fx-evidence.py'))); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
OUT = Path(sys.argv[1]); OUT.mkdir(parents=True, exist_ok=True); LABEL = sys.argv[2]
W, H = int(os.environ.get('W', 1792)), int(os.environ.get('H', 1120))
SAMPLER = """()=>{window.__rows=[];window.__stop=0;const t0=performance.now();(function f(){
  const hero=document.querySelector('.fig.you img:not(.fx)'),hf=document.querySelector('.fig.you'),foe=document.querySelector('.fig.foe'),fi=foe&&foe.querySelector('img:not(.fx)');
  const R=e=>{const r=e.getBoundingClientRect();return [r.left,r.right,r.top,r.bottom]};
  window.__rows.push({t:Math.round(performance.now()-t0),hero:hero&&R(hero),heroCls:hf?hf.className:'',crew:[...document.querySelectorAll('.battle-squad > span')].map(s=>[...R(s.querySelector('img')),s.className]),
    foe:fi&&R(fi),foeCls:foe?foe.className:'',menu:!!document.querySelector('.battle9-menu'),dashing:!!document.querySelector('.battle-dashing'),phaseBusy:!!(window.G&&G.battle&&G.battle.commandBusy)});
  if(!window.__stop)requestAnimationFrame(f)})()}"""
res = {'label': LABEL, 'viewport': [W, H]}
with sync_playwright() as p:
    b, c, pg, errs, t0 = ev.boot(p, W, H, 1, W < 500)
    pg.evaluate("()=>{for(const k of ['taan','nira']){if(!G.crew.some(c=>c.k===k))G.hire(k)}G.party.members=['taan','nira']}")
    ev.open_battle(pg, 600, 900)
    res['menu_labels'] = pg.evaluate("()=>[...document.querySelectorAll('.actor-segment')].map(e=>e.textContent.trim())")
    pg.screenshot(path=str(OUT / f'{LABEL}-bt1-menu.png'))
    pg.evaluate(SAMPLER)
    shot_lunge = False
    for i in range(24):
        st = pg.evaluate("()=>({side:G.currentBattleTurn()?.side,cmd:G.battle?.command,over:G.battle?.over})")
        if st['over']: break
        if st['side'] == 'ally' and not st['cmd']:
            pg.evaluate("()=>{const b=[...document.querySelectorAll('.actor-segment')].find(e=>e.offsetParent&&e.textContent.trim().startsWith('โจมตี'));b&&b.click()}")
        elif st['side'] == 'ally':
            pg.evaluate("()=>{document.querySelector('.cam-world [data-foe-id], .fig.foe')?.click()}")
        elif not shot_lunge and pg.evaluate("()=>!!document.querySelector('.fig.foe.lunge')"):
            pg.wait_for_timeout(330); pg.screenshot(path=str(OUT / f'{LABEL}-bt8a-foe-contact.png')); shot_lunge = True
        pg.wait_for_timeout(250)
    pg.evaluate("()=>{window.__stop=1}"); rows = pg.evaluate("()=>window.__rows")
    # BT4a: while an ally is struck, how far do the sizes move away from the size just before the blow?
    def hs(r): return [(r['hero'][3] - r['hero'][2])] + [(x[3] - x[2]) for x in r['crew']] if r['hero'] else []
    base = None; worst = 0.0; worst_abs = 0.0
    for r in rows:
        struck = 'struck' in r['heroCls'] or any('struck' in x[4] for x in r['crew']) or 'lunge' in r['foeCls']
        cur = hs(r)
        if not struck: base = cur; continue
        if base and len(base) == len(cur):
            for a, b2 in zip(base, cur):
                if a > 4: worst = max(worst, abs(b2 - a) / a)
    res['bt4a_max_size_change_during_hits_pct'] = round(worst * 100, 1)
    res['bt4a_max_ally_height_px'] = round(max([max(hs(r)) for r in rows if hs(r)] or [0]))
    res['bt4a_min_ally_height_px'] = round(min([min(x for x in hs(r) if x > 4) for r in rows if hs(r) and any(x > 4 for x in hs(r))] or [0]))
    # BT4b: frames where the menu is mounted while somebody is dashing / a command is busy
    res['bt4b_frames_with_menu_while_moving'] = sum(1 for r in rows if r['menu'] and (r['dashing'] or r['phaseBusy']))
    res['bt4b_frames_total'] = len(rows)
    # BT8a: how close the attacking foe gets to the nearest ally (px between foe left edge and ally right edge; negative = overlaps the picture box)
    right = lambda r: max([r['hero'][1]] + [x[1] for x in r['crew']]) if r['hero'] else 0
    eps, cur = [], []
    for r in rows:
        if 'lunge' in r['foeCls'] and r['foe']: cur.append(r)
        elif cur: eps.append(cur); cur = []
    if cur: eps.append(cur)
    res['bt8a_attacks'] = [{'travel_px': round(e[0]['foe'][0] - min(r['foe'][0] for r in e)), 'gap_to_team_front_px': round(min(r['foe'][0] for r in e) - right(e[0])),
                            'aimed': 'foe-aim' in e[0]['foeCls']} for e in eps]
    res['bt8a_return_error_px'] = [round(abs(e[-1]['foe'][0] - e[0]['foe'][0]), 1) for e in eps]   # where the attacker stands when the move is over vs where it started
    res['errors'] = errs[:5]
    print(json.dumps(res, ensure_ascii=False)); (OUT / f'{LABEL}-summary.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    b.close()
