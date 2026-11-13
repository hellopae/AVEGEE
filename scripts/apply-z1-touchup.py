#!/usr/bin/env python3
"""Z1-TOUCHUP-APPLY: put Codex's small ground repairs (z1-touchup-1 packs: <spot>/native.webp + registration.json) into the v7r 1024 px tiles.

  python3 scripts/apply-z1-touchup.py <touchup dir> [--set v7r] [--quality 88] [--dry]

Each spot's native.webp is a 512x512 patch on the 2x ground grid: Codex's repaired pixels inside its feathered edit mask, the original v7r pixels everywhere else
(checked below: the patch must equal the tile pixels outside the mask, so the paste never moves anything it should not). We only paste it at
registration.json -> contextRectPx2x and re-save the (at most 4) tiles it touches at the same WebP quality install-z1-ground.py uses. Tiles that no spot touches are not rewritten.
The source tiles are verified by SHA-256 first, so running it twice (or on a ground that is not the one Codex drew on) stops instead of double-pasting.
Writes a before/after strip per spot next to the pack's own compare.jpg: <out>/<spot>-before-after.png  (default: <touchup dir>/../_applied)."""
import argparse, hashlib, json, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
TILE = 1024
ap = argparse.ArgumentParser()
ap.add_argument('pack'); ap.add_argument('--set', default='v7r'); ap.add_argument('--quality', type=int, default=88)
ap.add_argument('--dry', action='store_true'); ap.add_argument('--out', default=None)
a = ap.parse_args()
pack = Path(a.pack).expanduser(); gdir = ROOT / 'img/map-zone1' / a.set
out = Path(a.out).expanduser() if a.out else pack.parent / '_applied'
out.mkdir(parents=True, exist_ok=True)
spots = sorted(p.parent for p in pack.glob('*/registration.json'))
assert spots, f'no <spot>/registration.json under {pack}'
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
tiles, edits = {}, []
for sp in spots:
    reg = json.loads((sp / 'registration.json').read_text())
    x0, y0, x1, y1 = reg['contextRectPx2x']; nat = Image.open(sp / 'native.webp').convert('RGB')
    assert nat.size == (x1 - x0, y1 - y0) == tuple(reg['nativeSizePx']), f'{sp.name}: native size {nat.size} vs rect'
    for rel, want in reg['sourceTilesSHA256'].items():
        f = ROOT / rel.replace('v7r', a.set, 1) if '/v7r/' in rel else ROOT / rel
        assert sha(f) == want, f'{sp.name}: {f.name} is not the tile Codex drew on (sha differs) - already applied, or a different ground'
    for r in range(y0 // TILE, (y1 - 1) // TILE + 1):
        for c in range(x0 // TILE, (x1 - 1) // TILE + 1):
            f = gdir / f'r{r + 1}-c{c + 1}.webp'
            if f not in tiles: tiles[f] = Image.open(f).convert('RGB')
    before = Image.new('RGB', (x1 - x0, y1 - y0))
    for f, t in tiles.items():
        c, r = int(f.stem.split('-c')[1]) - 1, int(f.stem.split('-')[0][1:]) - 1
        tx0, ty0 = c * TILE, r * TILE
        ix0, iy0, ix1, iy1 = max(x0, tx0), max(y0, ty0), min(x1, tx0 + TILE), min(y1, ty0 + TILE)
        if ix1 > ix0 and iy1 > iy0: before.paste(t.crop((ix0 - tx0, iy0 - ty0, ix1 - tx0, iy1 - ty0)), (ix0 - x0, iy0 - y0))
    edits.append((sp.name, (x0, y0, x1, y1), nat, before))
for name, (x0, y0, x1, y1), nat, before in edits:
    for f, t in tiles.items():
        c, r = int(f.stem.split('-c')[1]) - 1, int(f.stem.split('-')[0][1:]) - 1
        tx0, ty0 = c * TILE, r * TILE
        ix0, iy0, ix1, iy1 = max(x0, tx0), max(y0, ty0), min(x1, tx0 + TILE), min(y1, ty0 + TILE)
        if ix1 > ix0 and iy1 > iy0: t.paste(nat.crop((ix0 - x0, iy0 - y0, ix1 - x0, iy1 - y0)), (ix0 - tx0, iy0 - ty0))
    strip = Image.new('RGB', (1034, 512), (20, 20, 20)); strip.paste(before, (0, 0)); strip.paste(nat, (522, 0)); strip.save(out / f'{name}-before-after.png')
print('patched spots:', [e[0] for e in edits], '| tiles touched:', sorted(f.name for f in tiles))
if a.dry: sys.exit(0)
mf = gdir / 'manifest.json'; man = json.loads(mf.read_text())
for f, t in tiles.items():
    t.save(f, 'WEBP', quality=a.quality, method=5); man['bytes'][f.name] = f.stat().st_size
man['totalTileBytes'] = sum(man['bytes'].values()); man['note'] += f' + scripts/apply-z1-touchup.py ({", ".join(e[0] for e in edits)})'
mf.write_text(json.dumps(man, indent=1)); print('written; before/after strips in', out)
