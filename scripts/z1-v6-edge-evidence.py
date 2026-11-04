"""Z1-LAYOUT-B1 evidence: hold a movement key into a cliff / water / lava / tree foot / building foot and check that Yama never leaves the walk floor.
  BASE=http://127.0.0.1:8947/index.html python3 scripts/z1-v6-edge-evidence.py <outdir> [width height]"""
import os, sys, json, importlib.util
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 390; H = int(sys.argv[3]) if len(sys.argv) > 3 else 844
sys.argv = [sys.argv[0], OUT, str(W), str(H)]
spec = importlib.util.spec_from_file_location('walk', os.path.join(here, 'z1-v6-walk-evidence.py')); walk = importlib.util.module_from_spec(spec); spec.loader.exec_module(walk)
os.makedirs(OUT, exist_ok=True)
S, OY = 1.536, -140.288
w = lambda x, y: (x * S, y * S + OY)
CASES = [  # name, start (ok px), key
    ('plaza south cliff / soul river', (1500, 1085), 'ArrowDown'), ('plaza east cliff', (1480, 880), 'ArrowRight'), ('plaza west cliff (lava side)', (700, 930), 'ArrowLeft'),
    ('upper platform north rim', (1000, 520), 'ArrowUp'), ('right bridge deck, off the rail', (1850, 990), 'ArrowDown'), ('left bridge deck, off the rail', (600, 1000), 'ArrowDown'),
    ('S bridge into the river (left)', (1180, 1330), 'ArrowLeft'), ('S bridge into the river (right)', (1215, 1330), 'ArrowRight'),
    ('pine trunk z1-029 from the north', (1136, 850), 'ArrowDown'), ('pine trunk z1-028 from the north', (1351, 850), 'ArrowDown'), ('lava terrace edge (krata)', (330, 855), 'ArrowDown'),
    ('ice terrace south edge', (2300, 880), 'ArrowDown'), ('dais wall from the plaza side', (1160, 1030), 'ArrowUp'), ('pier end into the water', (1031, 1215), 'ArrowDown'),
    ('lower gate wall foot', (950, 1690), 'ArrowDown'),
]
report = []
with sync_playwright() as p:
    b, pg, errs = walk.boot(p, W, H)
    for name, ok, key in CASES:
        x, y = w(*ok)
        start_ok = pg.evaluate("async([x,y])=>{const m=await import('./src/town-layout.js?v=k1d');return m.townContains(x,y)}", [x, y])
        if not start_ok: report.append({'case': name, 'start': [round(x), round(y)], 'skipped': 'start point not on floor'}); continue
        walk.teleport(pg, x, y); pg.focus('body') if False else None
        pg.keyboard.down(key); samples = []
        for _ in range(24):
            pg.wait_for_timeout(125)
            samples.append(pg.evaluate("async()=>{const m=await import('./src/town-layout.js?v=k1d');return [G.player.x,G.player.y,m.townContains(G.player.x,G.player.y)]}"))
        pg.keyboard.up(key)
        off = [s for s in samples if not s[2]]
        moved = ((samples[-1][0] - x) ** 2 + (samples[-1][1] - y) ** 2) ** .5
        report.append({'case': name, 'key': key, 'start': [round(x), round(y)], 'end': [round(samples[-1][0]), round(samples[-1][1])], 'movedUnits': round(moved), 'samples': len(samples), 'offFloorSamples': len(off)})
        print(report[-1], flush=True)
    json.dump({'errors': errs, 'cases': report}, open(f'{OUT}/edge-report.json', 'w'), indent=1); print('errors', errs); b.close()
