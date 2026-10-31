"""Q6 occlusion evidence: drives the real game (Playwright, 390x844) onto Zone 1's border route, lifts the
checkpoint gate in memory (save file never written), walks Yama behind each of the two golden
towers, then holds Down so he walks out past the foot of the tower, a frame every 350 ms.

  python3 -m http.server 8792 --bind 127.0.0.1 &      # repo to test (after)
  python3 -m http.server 8793 --bind 127.0.0.1 &      # a checkout of main (before)
  python3 scripts/q6-occlusion-evidence.py <outdir> <phase> <base-url> [zoom-clicks]
"""
import sys, os, importlib.util
from PIL import Image
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('q5', os.path.join(here, 'q5-fx-evidence.py')); q5 = importlib.util.module_from_spec(spec)
out, phase, base = sys.argv[1:4]; zoom = int(sys.argv[4]) if len(sys.argv) > 4 else 2
os.environ['BASE'] = base; spec.loader.exec_module(q5)
from playwright.sync_api import sync_playwright
W, H = 3344, 1882
# feet x/y in source pixels of zone1-2-v6.webp; baseline of tower-west = 825, tower-east = 985

def tap_world(pg, x, y):
    """Overview = whole map fitted to the 390px width, vertically centred: tap the world point."""
    r = pg.evaluate("()=>{const r=document.querySelector('#dungeon-root canvas').getBoundingClientRect();return [r.width,r.height]}")
    s = r[0] / W; oy = (r[1] - H * s) / 2
    pg.mouse.click(x * s, oy + y * s)

# keys held after reaching the "behind" spot of each tower: (name, first spot, [(key, ms)...]); frames every 350 ms
WALKS = [('west', 2190, 786, [('ArrowRight', 2800), ('ArrowDown', 3500)]), ('east', 2556, 930, [('ArrowRight', 2800), ('ArrowDown', 3500)]), ('west-front', 2300, 840, []), ('east-front', 2650, 1000, [])]
ONLY = sys.argv[5] if len(sys.argv) > 5 else None   # run one walk per boot: a second tap after the first can stall

with sync_playwright() as p:
    browser, pg, errs = q5.boot(p)
    try:
        q5.goto_zone(pg, 'th'); q5.open_frontier(pg); q5.open_route(pg); pg.wait_for_timeout(1500)
        pg.evaluate("""async()=>{const z=await import('./src/zone-travel.js');const r=z.DUNGEON_ROUTES.find(r=>r.id==='th:asia');
          const a=G.zoneTravel.active;a.checkpoint=r.checkpoints.length;a.cleared=r.checkpoints.map(c=>c.id);a.defeated=[...a.cleared];
          a.patrolDefeated=z.dungeonPatrols('th:asia').map(q=>q.id);}""")
        os.makedirs(out, exist_ok=True)
        for name, x, y, keys in [w for w in WALKS if not ONLY or w[0] == ONLY]:
            pg.click('[data-zoom=overview]'); pg.wait_for_timeout(700)
            tap_world(pg, x, y); pg.wait_for_timeout(14000)
            for _ in range(zoom):
                pg.click('[data-zoom=more]'); pg.wait_for_timeout(400)
            pg.wait_for_timeout(1500); n = 0
            pg.screenshot(path=f'{out}/q6-{phase}-walk-{name}-00.png')
            pg.focus('#dungeon-root canvas')
            for key, ms in keys:
                pg.keyboard.down(key)
                for _ in range(ms // 350):
                    pg.wait_for_timeout(350); n += 1; pg.screenshot(path=f'{out}/q6-{phase}-walk-{name}-{n:02d}.png')
                pg.keyboard.up(key)
        print('errors:', errs)
    finally:
        browser.close()
