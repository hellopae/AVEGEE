#!/usr/bin/env python3
"""Draw offline layout evidence from the tested runtime coordinates (no browser).

Run Z4_EVIDENCE=1 node --test tests/z4-town-a.test.mjs first. This script never
generates game art or changes terrain/navigation; it measures delivered assets.
"""
import hashlib
import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/coordination/2026-10-30-z4-town-a'
nav = json.loads((OUT / 'navigation.json').read_text())
source = Image.open(OUT / 'source.png').convert('RGB')
mask = np.asarray(Image.open(OUT / 'owner-walkmask.png').convert('L')) >= 128
terrain = Image.open(OUT / 'after-world.webp').convert('RGBA')
module = (ROOT / 'src/town-owner-walkmask-cyberhell.js').read_text()
runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);', module)[1])
decoded = np.concatenate([np.full(n, i % 2, dtype=np.uint8) for i, n in enumerate(runs)]).reshape(320, 480)
xs = ((np.arange(480) * 8 + 4) / 2.5).astype(int)
ys = ((np.arange(320) * 8 + 4) / 2.5).astype(int)
assert np.array_equal(decoded, mask[np.ix_(ys, xs)]), 'RLE must match the unmodified owner mask at cell centres'
for point in nav['points']:
    assert mask[int(point['y'] / 2.5), int(point['x'] / 2.5)], point['key']

# Compare structural landmarks on source/delivered tiles using a local patch
# search, independent of the broad nearest-edge metric in stitch-report.json.
landmarks = {
    'judgment-circle': (740, 386), 'entry-circle': (768, 860),
    'dock': (898, 713), 'north-central-stairs': (746, 304),
    'south-central-stairs': (746, 478), 'river-bridge-north': (770, 620),
    'river-bridge-south': (770, 782), 'west-lava-link': (380, 277),
    'west-central-link': (439, 400), 'east-central-link': (1010, 402),
    'east-river-link': (1193, 182), 'top-west-stairs': (664, 236),
    'top-east-stairs': (1002, 257), 'bottom-exit': (768, 961),
}
gray = lambda im: cv2.cvtColor(np.asarray(im.convert('RGB')), cv2.COLOR_RGB2GRAY)
before, after = gray(source), gray(terrain)
registration = []
for key, (x, y) in landmarks.items():
    r, search = 20, 6
    template = before[y-r:y+r+1, x-r:x+r+1]
    region = after[y-r-search:y+r+search+1, x-r-search:x+r+search+1]
    scores = cv2.matchTemplate(region, template, cv2.TM_CCOEFF_NORMED)
    _, score, _, (xx, yy) = cv2.minMaxLoc(scores)
    dx, dy = xx-search, yy-search
    assert max(abs(dx), abs(dy)) <= 2, (key, dx, dy)
    assert score > .95, (key, score)
    registration.append({'key': key, 'source': [x, y], 'offset': [dx, dy], 'correlation': score})

font_path = '/System/Library/Fonts/Supplemental/Arial.ttf'
font = ImageFont.truetype(font_path, 14)
small = ImageFont.truetype(font_path, 11)
title = ImageFont.truetype(font_path, 19)
COLORS = {'station': '#ffce67', 'crew': '#8bffb5', 'entry': '#ffffff',
          'enemy': '#ff8295', 'reinforcement': '#ba9cff', 'queue': '#b5d5ed'}

def color(key):
    return COLORS.get(key.split(':')[0], '#6fe8ff')

def sprite(canvas, file, box, flip=False):
    im = Image.open(ROOT / file).convert('RGBA')
    if flip:
        im = im.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    x, y, w, h = (box[k] / 2.5 for k in ('x', 'y', 'w', 'h'))
    im = im.resize((round(w), round(h)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(im, (round(x), round(y)))

def overlay(paths):
    canvas = Image.new('RGBA', (2048, 1080), '#111320')
    ground = terrain.copy()
    tint = Image.new('RGBA', ground.size)
    tint.putdata([(50, 240, 180, 24) if v else (230, 40, 70, 38) for v in mask.flat])
    ground.alpha_composite(tint)
    draw = ImageDraw.Draw(ground)
    if paths:
        for point in nav['points']:
            route = [nav['start'], *point['path']]
            draw.line([(x / 2.5, y / 2.5) for x, y in route], fill=color(point['key']), width=1)
    else:
        for b in sorted([*nav['buildings'], nav['frontier']], key=lambda b: b['by']):
            if b['box']:
                sprite(ground, b['box']['src'], b['box'], b['box']['flip'])
        dais = nav['dais']
        file = 'img/theme-v4/town-judgment-cyberhell-v2.webp'
        im = Image.open(ROOT / file)
        w, h = dais['w'], dais['w'] * im.height / im.width
        sprite(ground, file, {'x': dais['x']-w/2, 'y': dais['y']-h, 'w': w, 'h': h})
    draw = ImageDraw.Draw(ground)
    for i, point in enumerate(nav['points'], 1):
        x, y = point['x'] / 2.5, point['y'] / 2.5
        label = str(i)
        draw.ellipse((x-4, y-4, x+4, y+4), fill=color(point['key']), outline='#10101c')
        draw.text((x+5, y-12), label, font=small, fill=color(point['key']), stroke_width=2, stroke_fill='#10101c')
    canvas.alpha_composite(ground, (0, 48))
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 13), 'Z4-TOWN-A | ' + ('tested paths from bottom entry' if paths else 'runtime building sprites + destination anchors'), font=title, fill='white')
    draw.text((1550, 16), 'Offline evidence - not a browser capture', font=font, fill='#ffce67')
    for i, point in enumerate(nav['points'], 1):
        key = point['key']
        if key in {b['key'] for b in nav['buildings']}:
            c = COLORS['station']
        else:
            c = color(key)
        draw.text((1550, 53 + (i-1)*19), f'{i:02d}  {key}  ({point["x"]/2.5:g}, {point["y"]/2.5:g})', font=font, fill=c)
    draw.text((1550, 984), 'Coordinates: source px; world = source x 2.5', font=font, fill='white')
    draw.text((1550, 1005), 'Green tint: owner floor | red tint: blocked', font=font, fill='white')
    draw.text((1550, 1026), '48 routes: initial and fully built town tested', font=font, fill='white')
    return canvas.convert('RGB')

overlay(False).save(OUT / 'layout-sites.png')
overlay(True).save(OUT / 'layout-paths.png')

report = {
    'method': 'Offline composition from runtime stationBox and path test JSON; no browser rendering asserted',
    'world': nav['world'], 'targets': len(nav['points']),
    'ownerMaskSHA256': hashlib.sha256((OUT / 'owner-walkmask.png').read_bytes()).hexdigest(),
    'cellCentreSamplesMatchOwnerMask': True, 'allTargetFeetInSourceWhiteMask': True,
    'structuralLandmarks': registration,
    'maxMeasuredLandmarkOffsetSourcePx': max(max(abs(v) for v in p['offset']) for p in registration),
    'registrationLimit': 'Local translation checks at 14 named structural landmarks; not a pixelwise semantic proof of every edge',
    'reservedCentralHolesSourcePx': [[710, 356, 70, 6], [695, 399, 32, 14], [761, 399, 32, 14]],
    'placementLimit': 'Central stripe and two small holes cannot contain eleven full station footprints. Dais uses central circle; stations use other existing reserved courts. Unassigned holes stay blocked; no invented buildings.',
    'browser': 'Not run: sandbox browser unavailable per brief',
}
(OUT / 'verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps({k: report[k] for k in ['targets', 'cellCentreSamplesMatchOwnerMask', 'allTargetFeetInSourceWhiteMask', 'maxMeasuredLandmarkOffsetSourcePx']}, indent=2))
