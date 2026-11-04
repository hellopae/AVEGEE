"""Z1-LAYOUT-B1 evidence: depth order. Yama is placed behind / in front of trees and the upper gate and the camera follows him.
  BASE=http://127.0.0.1:8947/index.html python3 scripts/z1-v6-occlusion-evidence.py <outdir> [width height]
Each pair writes occ-<name>-behind.png / -front.png (full frame) and occ-<name>-pair.png (2x crop of both around Yama)."""
import os, sys, json, importlib.util
from PIL import Image
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 390; H = int(sys.argv[3]) if len(sys.argv) > 3 else 844
sys.argv = [sys.argv[0], OUT, str(W), str(H)]
spec = importlib.util.spec_from_file_location('walk', os.path.join(here, 'z1-v6-walk-evidence.py')); walk = importlib.util.module_from_spec(spec); spec.loader.exec_module(walk)
os.makedirs(OUT, exist_ok=True)
S, OY = 1.536, -140.288
w = lambda x, y: [x * S, y * S + OY]
PAIRS = [  # name, behind (ok px), front (ok px)
    ('pine-plaza-east', (1351, 872), (1351, 925)), ('pine-plaza-south', (1369, 1085), (1369, 1128)), ('upper-gate-wall', (880, 575), (880, 650)),
    ('upper-gate-arch-vs-wall', (1000, 585), (1000, 640)), ('dais', (1236, 880), (1236, 1030)),
]
with sync_playwright() as p:
    b, pg, errs = walk.boot(p, W, H)
    report = []
    for name, behind, front in PAIRS:
        shots = {}
        for tag, okpt in (('behind', behind), ('front', front)):
            x, y = w(*okpt)
            ok = pg.evaluate("async([x,y])=>{const m=await import('./src/town-layout.js?v=k1d');return m.townContains(x,y)}", [x, y])
            walk.teleport(pg, x, y); pg.wait_for_timeout(1800)
            f = f'{OUT}/occ-{name}-{tag}.png'; pg.screenshot(path=f); shots[tag] = f
            report.append({'pair': name, 'tag': tag, 'ok_px': okpt, 'world': [round(x), round(y)], 'walkable': ok})
        a, c = Image.open(shots['behind']), Image.open(shots['front'])
        cx, cy = W // 2, int(H * .42)
        box = (cx - 110, cy - 130, cx + 110, cy + 130)
        pair = Image.new('RGB', (440 * 2, 520), (0, 0, 0))
        pair.paste(a.crop(box).resize((440, 520)), (0, 0)); pair.paste(c.crop(box).resize((440, 520)), (440, 0)); pair.save(f'{OUT}/occ-{name}-pair.png')
    json.dump({'errors': errs, 'points': report}, open(f'{OUT}/occ-report.json', 'w'), indent=1)
    print(json.dumps(report), 'errors:', errs); b.close()
