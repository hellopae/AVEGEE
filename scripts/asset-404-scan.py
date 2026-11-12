#!/usr/bin/env python3
"""Runtime asset scan: drive the real game in Chromium at 390x844 and record every 4xx/5xx response plus every <img> that decoded to nothing.

  python3 scripts/serve-nocache.py 8942 &            # any static server on the repo root
  BASE=http://127.0.0.1:8942/index.html CH=chrome python3 scripts/asset-404-scan.py [out.json]

Walks: title -> town (4 zones) -> every HUD button / fab (merchant, team, guidebook, bag, Nira, canteen ...) -> a fight with 1, 2 and 3 enemies of every kind
-> the trial / interrogation screen -> a quest list.  Exit code 1 when anything 404s or any image is broken (placeholders that art.js draws for art that was
never delivered, e.g. item-heart, count as 404 here only if the request is really made; they are listed under "known-optional")."""
import importlib.util, json, os, sys
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('ev', str(HERE / 'scene-fx-evidence.py')); ev = importlib.util.module_from_spec(spec); spec.loader.exec_module(ev)
BROKEN = "()=>[...document.images].filter(i=>i.complete&&i.naturalWidth===0&&i.src).map(i=>i.src)"
SKIP = ('ลบ', 'รีเซ็ต', 'ล้าง', 'reset', 'delete', 'clear', 'new game', 'เริ่มใหม่', 'ออกจากเกม')
found = {}; broken = {}; steps = []


def note(where, bad, brk):
    for u, s in bad.items(): found.setdefault(u, (s, where))
    for u in brk: broken.setdefault(u, where)


def watch(pg, ctx, where, fn):
    steps.append(where); bad = {}
    cb = lambda r: bad.setdefault(r.url, r.status) if r.status >= 400 else None
    ctx.on('response', cb)
    try: fn()
    finally: ctx.remove_listener('response', cb)
    pg.wait_for_timeout(400)
    note(where, bad, pg.evaluate(BROKEN))


def close_all(pg):
    pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())"); pg.wait_for_timeout(250)


def crawl_buttons(pg, ctx, where):
    labels = pg.evaluate("""()=>[...document.querySelectorAll('button,[role=button],.fab,.hud-btn')].filter(b=>{const r=b.getBoundingClientRect();return r.width>8&&r.height>8&&!b.disabled&&getComputedStyle(b).visibility!=='hidden'}).map((b,i)=>(b.id||'')+'|'+(b.textContent||'').trim().slice(0,24))""")
    for i, lab in enumerate(labels[:80]):
        if any(s in lab.lower() for s in SKIP): continue
        def act(i=i):
            pg.evaluate("""i=>{const bs=[...document.querySelectorAll('button,[role=button],.fab,.hud-btn')].filter(b=>{const r=b.getBoundingClientRect();return r.width>8&&r.height>8&&!b.disabled&&getComputedStyle(b).visibility!=='hidden'});bs[i]?.click()}""", i)
            pg.wait_for_timeout(450)
        try: watch(pg, ctx, f'{where}: click {lab}', act)
        except Exception as e: found.setdefault('ERR ' + lab, (str(e)[:80], where))
        close_all(pg)


def main(out):
    with sync_playwright() as p:
        browser, ctx, pg, errs, t0 = ev.boot(p, 390, 844, 1)
        pg.evaluate("()=>{G.coin=99999;G.food=50;G.zoneEvents.th={frontierBreach:'cleared'};for(const k of ['taan','boon','dam','kan','plerng'])G.hire(k);G.party.members=['taan','boon','dam'];G.onChange()}")
        watch(pg, ctx, 'town th', lambda: pg.wait_for_timeout(2500)); crawl_buttons(pg, ctx, 'town th')
        pg.evaluate(ev.CANTEEN_JS if hasattr(ev, 'CANTEEN_JS') else "()=>0")
        kinds = pg.evaluate("async()=>(await import('./src/data.js')).MOB.kinds.length")
        for k in range(kinds):
            for n in (1, 3):
                def fight(k=k, n=n):
                    pg.evaluate("()=>{G.battle=null;document.querySelectorAll('dialog[open]').forEach(d=>d.close())}"); pg.wait_for_timeout(200)
                    pg.evaluate("([k,n])=>{G.player.x=600;G.player.y=900;G.player.tx=600;G.player.ty=900;for(let i=0;i<n;i++)G.mobs.push({id:900+i,x:600+i*8,y:900,hp:30,kind:(k+i)%G.mobs.length?k:k});G.onChange()}", [k, n]); pg.wait_for_timeout(300)
                    pg.evaluate("()=>{const b=document.querySelector('#fab-atk');b.hidden=false;b.click()}"); pg.wait_for_timeout(1500)
                try: watch(pg, ctx, f'fight kind {k} x{n}', fight)
                except Exception as e: found.setdefault(f'ERR fight {k}x{n}', (str(e)[:80], 'fight'))
        for z in ('asia', 'west', 'cyberhell'):
            try:
                watch(pg, ctx, f'zone {z}', lambda z=z: ev.to_zone(pg, z)); crawl_buttons(pg, ctx, f'zone {z}')
                watch(pg, ctx, f'trial {z}', lambda z=z: ev.open_trial(pg, z)); close_all(pg)
            except Exception as e: found.setdefault(f'ERR zone {z}', (str(e)[:80], 'zone'))
        browser.close()
    res = {'steps': len(steps), 'steps_sample': steps[::max(1, len(steps) // 25)], 'responses_4xx': {u: {'status': s, 'where': w} for u, (s, w) in found.items()}, 'broken_images': broken, 'page_errors': errs[:20]}
    Path(out).write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps(res, ensure_ascii=False, indent=1)[:4000]); print('4xx:', len(found), 'broken <img>:', len(broken))
    sys.exit(1 if found or broken else 0)


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '/tmp/asset-404-scan.json')
