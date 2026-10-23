"""Structural asset checks only; does not certify painted geometry or visual QA."""
from pathlib import Path
import hashlib
import json
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import town_terrain_lib as T

BASE = ROOT / 'output/z3-ground'
OUT = ROOT / 'img/map-zone3/v1'
qa = BASE / 'qa'
zone2 = Image.open(ROOT / 'img/map-zone2/v1/zone2-terrain-v1-preview.webp').convert('RGB')
mask = np.fromfile(BASE / 'refs/asia-floor.raw', np.uint8).reshape(1024, 1536)
west_mask = np.fromfile(BASE / 'refs/west-floor.raw', np.uint8).reshape(1024, 1536)
assert np.array_equal(mask, west_mask), 'floor references differ'
quads = {}
for name, box in T.QUADS.items():
    im = Image.open(BASE / f'quadrants/q-{name}.png').convert('RGB')
    assert im.size == (1536, 1024), (name, im.size)
    quads[name] = im
    ref = zone2.crop(box).resize(im.size, Image.Resampling.LANCZOS)
    Image.blend(im, ref, .5).save(qa / f'{name}-zone2-50.png')
    walk = Image.fromarray(mask).crop(box).resize(im.size, Image.Resampling.NEAREST)
    rgba = np.zeros((1024, 1536, 4), np.uint8)
    rgba[np.asarray(walk) > 0] = (40, 255, 80, 75)
    overlay = im.convert('RGBA')
    overlay.alpha_composite(Image.fromarray(rgba))
    overlay.convert('RGB').save(qa / f'{name}-mask-overlay.png')

full = Image.open(BASE / 'west-ground-full.png').convert('RGB')
assert full.size == T.FULL, full.size
assert np.array_equal(np.asarray(full), T.stitch(quads)), 'full sheet differs from repository stitch'
assert Image.open(OUT / 'zone3-terrain-v1-preview.webp').size == T.PREVIEW
assert Image.open(BASE / 'west-ground-1536x1024.png').size == T.PREVIEW
chunks = {}
for row, col, box in T.chunk_boxes():
    path = OUT / f'r{row}-c{col}.webp'
    im = Image.open(path)
    assert im.size == (box[2] - box[0], box[3] - box[1]), path
    mae = float(np.abs(np.asarray(im.convert('RGB'), dtype=np.float32) - np.asarray(full.crop(box), dtype=np.float32)).mean())
    assert mae < 15, (path, 'unexpected chunk content', mae)
    chunks[path.name] = {'size': list(im.size), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'rgb_mae_vs_full': round(mae, 3)}
assert len(chunks) == 20

preview = Image.open(BASE / 'west-ground-1536x1024.png').convert('RGB')
Image.blend(preview, zone2, .5).save(qa / 'full-zone2-50.png')
seams = preview.copy()
draw = ImageDraw.Draw(seams)
for x in (672, 864):
    draw.line((x, 0, x, 1023), fill=(255, 190, 40), width=1)
for y in (448, 576):
    draw.line((0, y, 1535, y), fill=(255, 190, 40), width=1)
seams.save(qa / 'seam-locations.png')

# RGB differences describe changed paint in shared areas, not displacement in pixels.
overlaps = {}
for a, b in [('nw', 'ne'), ('nw', 'sw'), ('ne', 'se'), ('sw', 'se')]:
    ba, bb = T.QUADS[a], T.QUADS[b]
    shared = (max(ba[0], bb[0]), max(ba[1], bb[1]), min(ba[2], bb[2]), min(ba[3], bb[3]))
    crops = []
    for name, box in [(a, ba), (b, bb)]:
        small = quads[name].resize((864, 576), Image.Resampling.LANCZOS)
        crop = small.crop((shared[0]-box[0], shared[1]-box[1], shared[2]-box[0], shared[3]-box[1]))
        crops.append(crop)
    Image.blend(*crops, .5).save(qa / f'seam-{a}-{b}-50.png')
    arrays = [np.asarray(c, dtype=np.float32) for c in crops]
    overlaps[f'{a}-{b}'] = {'box_preview': shared, 'rgb_mae': round(float(np.abs(arrays[0]-arrays[1]).mean()), 3)}

manifest = {}
for path in sorted((BASE / 'refs').glob('*.png')):
    manifest[path.name] = {'size': list(Image.open(path).size), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}
(BASE / 'refs/manifest.json').write_text(json.dumps(manifest, indent=2))
report = {'scope': 'structural asset checks only; visual acceptance remains owner review',
          'quadrants': {n: list(im.size) for n, im in quads.items()},
          'full': list(full.size), 'preview': list(T.PREVIEW), 'chunk_count': len(chunks),
          'full_equals_repo_stitch': True,
          'mask_different_pixels_asia_west': int(np.count_nonzero(mask != west_mask)),
          'walkable_preview_pixels': int(np.count_nonzero(mask)), 'chunks': chunks,
          'overlaps': overlaps,
          'limitations': ['RGB MAE is not geometric displacement.',
                           'No automated semantic edge-to-mask certification.',
                           'No game runtime test; no source code changed.']}
(qa / 'verification.json').write_text(json.dumps(report, indent=2))
print(json.dumps({k: v for k, v in report.items() if k not in ('chunks', 'quadrants')}, indent=2))
