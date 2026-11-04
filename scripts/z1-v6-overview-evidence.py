"""Z1-LAYOUT-B1 evidence: whole Zone 1 as the game draws it (desktop viewport, 'ทั้งแผนที่' = full world) next to proof-composite.jpg.
  BASE=http://127.0.0.1:8947/index.html python3 scripts/z1-v6-overview-evidence.py <outdir> [width height]"""
import os, sys, importlib.util
from PIL import Image
from playwright.sync_api import sync_playwright
here = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1]; W = int(sys.argv[2]) if len(sys.argv) > 2 else 1500; H = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
sys.argv = [sys.argv[0], OUT, str(W), str(H)]
spec = importlib.util.spec_from_file_location('walk', os.path.join(here, 'z1-v6-walk-evidence.py')); walk = importlib.util.module_from_spec(spec); spec.loader.exec_module(walk)
os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b, pg, errs = walk.boot(p, W, H)
    pg.click('text=ทั้งแผนที่'); pg.wait_for_timeout(4000)
    pg.add_style_tag(content='#hud-pause,#hud-settings,.town-camera-controls,.team-hud,#team-hud,.hud-top,#hud-top,.map-minimap,[class*=minimap],[class*=hud]{visibility:hidden !important}')
    pg.wait_for_timeout(1200)
    pg.screenshot(path=f'{OUT}/overview-game.png')
    st = pg.evaluate("async()=>{const m=await import('./src/town-v6.js');return m.townV6Stats()}"); print(st, errs); b.close()
game = Image.open(f'{OUT}/overview-game.png').convert('RGB')
proof = Image.open(os.path.join(here, '..', 'docs/art-reviews/2026-11-05-zone1-layout/proof-composite.jpg')).convert('RGB')
