#!/usr/bin/env python3
"""GROUND-INSTALL: put a Codex 2x ground pack (Z1/Z2/Z3-HD-ASSEMBLE output: r1-c1..r4-c5.webp, 2048 px chunks, 9830x6554) into the game, ONE command.
(was install-z1-ground.py, which is now a one-line shim for --zone 1)

  python3 scripts/install-ground.py <pack dir> [--zone 1|2|3] [--name v7r] [--quality 88] [--activate]

  --zone       1 = Thai (img/map-zone1, ZONE1_GROUND_SET), 2 = Asia (img/map-zone2, ZONE2_GROUND_SET), 3 = West (img/map-zone3, ZONE3_GROUND_SET).  Default 1.

  <pack dir>   the folder with the 20 chunks + zone<N>-terrain-v7-preview.webp + manifest.json (e.g. .../docs/art-reviews/2026-11-11-z1-v7-hd-assemble/v7)
  --name       target folder img/map-zone<N>/<name>/ and the key in ZONE<N>_GROUND of src/zone-skin.js (default v7r for zone 1, v7 for zones 2/3).  A new name must be registered there first.
  --quality    WebP quality of the 1024 px tiles (default 88; the chunks are q90, one more lossy pass at 88 keeps size and look)
  --activate   also set ZONE<N>_GROUND_SET in src/zone-skin.js to <name>  (this is the switch: change that constant back to go back)

What it does (nothing is drawn or edited - pixels are only re-cut):
  * stitches the 20 chunks into one 9830x6554 picture, cuts it again into 1024 px tiles (10 x 7 = 70 files: the camera at phone zoom then keeps few
    decoded tiles in memory - FX3 measured 2048 px chunks at 100-130 MB, 1024 px at 35-50 MB);
  * copies the preview (1536x1024) and the pack's manifest/structure notes next to the tiles (pack-manifest.json);
  * zone 1 only: keeps sprites.json + sprites/ already in img/map-zone1/<name>/ (the rails drawn over the bridges / pier); a new name gets v7r's (or --sprites-from).  Zones 2/3 have no ground sprites;
  * refuses a pack that is not exactly 20 chunks of the right size, so a half-finished export never reaches the game.
Then:  node --test tests/*.test.mjs   and look at the map (390 px wide) before committing.
"""
import argparse, json, re, shutil, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FULL = (9830, 6554)
CH, TILE = 2048, 1024
COLS, ROWS = 5, 4

ap = argparse.ArgumentParser()
ap.add_argument('pack')
ap.add_argument('--zone', type=int, choices=(1, 2, 3), default=1)
ap.add_argument('--name', default=None)
ap.add_argument('--quality', type=int, default=88)
ap.add_argument('--activate', action='store_true')
ap.add_argument('--sprites-from', default=None, help='folder with sprites.json + sprites/ (default: keep the ones already in the target folder)')
a = ap.parse_args()

Z = a.zone
a.name = a.name or ('v7r' if Z == 1 else 'v7')
PREVIEW = f'zone{Z}-terrain-v7-preview.webp'
pack = Path(a.pack).expanduser()
out = ROOT / f'img/map-zone{Z}' / a.name
assert pack.is_dir(), f'pack folder not found: {pack}'

# ---- refuse an incomplete / wrong pack
canvas = np.zeros((FULL[1], FULL[0], 3), np.uint8)
for r in range(1, ROWS + 1):
    for c in range(1, COLS + 1):
        f = pack / f'r{r}-c{c}.webp'
        assert f.exists(), f'missing chunk {f.name} - the pack is not complete, nothing was installed'
        x0, y0 = (c - 1) * CH, (r - 1) * CH
        w, h = min(CH, FULL[0] - x0), min(CH, FULL[1] - y0)
        im = Image.open(f).convert('RGB')
        assert im.size == (w, h), f'{f.name} is {im.size}, expected {(w, h)}'
        canvas[y0:y0 + h, x0:x0 + w] = np.asarray(im)
prev = pack / PREVIEW
assert prev.exists(), f'preview {PREVIEW} missing'
assert Image.open(prev).size == (1536, 1024), 'preview must be 1536x1024'
print('pack ok:', pack)

# ---- cut into tiles
out.mkdir(parents=True, exist_ok=True)
for old in out.glob('r*-c*.webp'):
    old.unlink()
total, files = 0, {}
for r in range(1, -(-FULL[1] // TILE) + 1):
    for c in range(1, -(-FULL[0] // TILE) + 1):
        x0, y0 = (c - 1) * TILE, (r - 1) * TILE
        part = canvas[y0:min(FULL[1], y0 + TILE), x0:min(FULL[0], x0 + TILE)]
        f = out / f'r{r}-c{c}.webp'
        Image.fromarray(part).save(f, 'WEBP', quality=a.quality, method=5)
        files[f.name] = f.stat().st_size
        total += f.stat().st_size
shutil.copyfile(prev, out / PREVIEW)
pm = pack / 'manifest.json'
if pm.exists():
    shutil.copyfile(pm, out / 'pack-manifest.json')
(out / 'manifest.json').write_text(json.dumps({
    'note': 'built by scripts/install-z1-ground.py', 'source': str(pack), 'tilePx': TILE, 'quality': a.quality,
    'fullPx': {'w': FULL[0], 'h': FULL[1]}, 'tiles': len(files), 'bytes': files, 'totalTileBytes': total}, indent=1))

spr = a.sprites_from or (None if (Z != 1 or (out / 'sprites.json').exists()) else str(ROOT / 'img/map-zone1/v7r'))   # a new set starts from v7r's sprite list
if spr and Path(spr).expanduser().resolve() != out.resolve():
    src = Path(spr).expanduser()
    shutil.copyfile(src / 'sprites.json', out / 'sprites.json')
    (out / 'sprites').mkdir(exist_ok=True)
    for f in (src / 'sprites').glob('*.webp'):
        shutil.copyfile(f, out / 'sprites' / f.name)
print(f'{len(files)} tiles, {total / 1e6:.1f} MB -> {out.relative_to(ROOT)}  (sprites.json: {"yes" if (out / "sprites.json").exists() else ("n/a" if Z != 1 else "NO - copy one or pass --sprites-from")})')

SET = f'ZONE{Z}_GROUND_SET'
if a.activate:
    zs = ROOT / 'src/zone-skin.js'
    s = zs.read_text()
    s2, n = re.subn(rf"export const {SET} = '[^']*';", f"export const {SET} = '{a.name}';", s)
    assert n == 1, f'{SET} line not found'
    assert f"'{a.name}'" in s2 and (f'{a.name}:' in s2 or f"'{a.name}':" in s2), f'{a.name} is not registered in ZONE{Z}_GROUND'
    zs.write_text(s2)
    print(f"{SET} = '{a.name}'  (src/zone-skin.js)")
else:
    print(f"not activated: set {SET} = '{a.name}' in src/zone-skin.js (or re-run with --activate)")
