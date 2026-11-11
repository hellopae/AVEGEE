"""Inspect exported pixels and both axes of quarter/chunk seams; no drawing."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

R = Path(__file__).resolve().parents[1]
cfg = json.loads((R / 'clouds.json').read_text())
W, H = cfg['fullPx']
mask = Image.open(R / cfg['mask'])


def crop(variant, box):
    l, t, r, b = box
    out = Image.new('RGBA', (r-l, b-t))
    for item in cfg['layers']:
        x, y, w, h = item['rectPx2x']
        if item['variant'] == variant and x < r and x+w > l and y < b and y+h > t:
            im = Image.open(R / item['file']).convert('RGBA')
            # Paste preserves exact exported RGBA, including at chunk boundaries.
            out.paste(im, (x-l, y-t))
    return out


def flatten(im):
    bg = Image.new('RGBA', im.size, (39, 34, 49, 255))
    return Image.alpha_composite(bg, im).convert('RGB')


results, tiles, scans = [], [], []
for variant in ('A', 'B'):
    for axis, limit in (('vertical', W), ('horizontal', H)):
        for edge in range(1024, limit, 1024):
            box = (edge-16, 0, edge+16, H) if axis == 'vertical' else (0, edge-16, W, edge+16)
            im = crop(variant, box)
            a = np.asarray(im, dtype=np.float32)/255
            a[:, :, :3] *= a[:, :, 3:4]
            m = np.asarray(mask.crop(box))
            if axis == 'horizontal':
                a, m = a.transpose(1, 0, 2), m.T
            support = (m[:, 15] > 64) & (m[:, 16] > 64)
            scans.append({'variant': variant, 'axis': axis, 'coordinatePx2x': edge,
                          'supportPixelsAbove64': int(support.sum()),
                          'anyMaskSupportOnEitherSide': int(np.count_nonzero((m[:, 15] > 0) | (m[:, 16] > 0)))})
            if not support.any():
                continue
            crossing = float(np.abs(a[:, 16]-a[:, 15])[support].mean())
            nearby = float(np.median([np.abs(a[:, k]-a[:, k-1])[support].mean()
                                      for k in (9, 12, 20, 23)]))
            results.append({'variant': variant, 'axis': axis, 'coordinatePx2x': edge,
                            'kind': 'chunk' if edge % 2048 == 0 else 'quarter',
                            'supportPixels': int(support.sum()),
                            'premultipliedMAE': crossing, 'nearMedian': nearby,
                            'ratio': crossing/max(nearby, 1e-9)})
            positions = np.flatnonzero(support)
            pos = int(positions[len(positions)//2])
            detail = (edge-128, max(0, pos-192), edge+128, min(H, pos+192)) if axis == 'vertical' else (max(0, pos-192), edge-128, min(W, pos+192), edge+128)
            tile = flatten(crop(variant, detail))
            tile.thumbnail((380, 256))
            tiles.append((f'{variant} {axis} {edge} {results[-1]["kind"]}', tile))

sheet = Image.new('RGB', (4*400, max(1, (len(tiles)+3)//4)*290), (28, 25, 36))
draw = ImageDraw.Draw(sheet)
for i, (label, im) in enumerate(tiles):
    x, y = (i % 4)*400, (i//4)*290
    draw.text((x+8, y+8), label, fill='white')
    sheet.paste(im, (x+8, y+28))
sheet.save(R/'previews/seams.jpg', quality=94)
(R/'seams.json').write_text(json.dumps({'method': 'Decoded premultiplied RGBA; scan both axes at every 1024px boundary, measure paired mask support >64. Ratios are diagnostics, not visual approval.', 'scannedBoundaries': scans, 'boundaries': results, 'notQAApproval': True}, indent=2))

# Compare actual source terrain with A and B at the same map2x crop.
box = (5100, 400, 6380, 1120)
base = Image.open(R/'input/central-valley-base.webp').convert('RGBA')
pilot = Image.new('RGB', (1280*3, 760), (28, 25, 36))
d = ImageDraw.Draw(pilot)
for i, variant in enumerate(('terrain', 'A', 'B')):
    im = base if variant == 'terrain' else Image.alpha_composite(base, crop(variant, box))
    pilot.paste(im.convert('RGB'), (i*1280, 40))
    d.text((i*1280+12, 12), variant, fill='white')
pilot.save(R/'previews/pilot-A-B.jpg', quality=94)

source_sheet = Image.new('RGB', (1500, 1000), (28, 25, 36))
overview = Image.open(R/'input/v7-overview.jpg').convert('RGB').resize((1500, 1000))
smallmask = mask.resize((1500, 1000), Image.Resampling.LANCZOS)
tint = Image.new('RGBA', overview.size, (235, 40, 225, 0))
tint.putalpha(smallmask.point(lambda x: round(x*.8)))
Image.alpha_composite(overview.convert('RGBA'), tint).convert('RGB').save(R/'previews/mask-review.jpg', quality=94)
# Show every selected source quarter against its actual map2x mask footprint.
regions = json.loads((R/'regions.json').read_text())
region_sheet = Image.new('RGB', (4*400, ((len(regions['quarters'])+3)//4)*430), (28, 25, 36))
rd = ImageDraw.Draw(region_sheet)
for i, q in enumerate(regions['quarters']):
    l, t, r, b = q['contextBoxPx2x']
    ref = Image.open(R/'input'/f"{q['id']}-reference.jpg").convert('RGBA')
    mm = mask.crop((l, t, r, b)).resize(ref.size, Image.Resampling.LANCZOS)
    highlight = Image.new('RGBA', ref.size, (255, 25, 220, 0))
    # Lift weak support so legacy fragments remain visible in this diagnostic.
    highlight.putalpha(mm.point(lambda a: 120 if a > 0 else 0))
    im = Image.alpha_composite(ref, highlight).convert('RGB')
    im.thumbnail((384, 384))
    x, y = (i % 4)*400, (i//4)*430
    rd.text((x+8, y+8), q['id']+' | any mask >0', fill='white')
    region_sheet.paste(im, (x+8, y+32))
region_sheet.save(R/'previews/regions-contact.jpg', quality=94)
print(json.dumps({'seamsWithPairedSupportAbove64': len(results), 'axesScanned': sorted(set(x['axis'] for x in scans)), 'preview': 'previews/pilot-A-B.jpg'}, indent=2))
