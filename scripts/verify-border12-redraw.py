#!/usr/bin/env python3
"""Independent on-disk art checks. Does not assert game collision or owner art approval."""
from pathlib import Path
import hashlib
import json
import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-border12-redraw'


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def samples(points):
    result = []
    for p, q in zip(points, points[1:]):
        p, q = np.array(p), np.array(q)
        n = max(1, int(np.ceil(np.linalg.norm(q-p))))
        result.extend(np.rint(p+(q-p)*t).astype(int) for t in np.linspace(0, 1, n, endpoint=False))
    result.append(np.rint(points[-1]).astype(int))
    return np.array(result)


def main():
    m = json.loads((OUT / 'manifest.json').read_text())
    layout = json.loads((OUT / 'layout.json').read_text())
    route = json.loads((OUT / 'route-layout.json').read_text())
    atlas = Image.open(OUT / m['terrainMaster']).convert('RGBA')
    a = np.array(atlas)
    w, h = atlas.size
    assert [w, h] == m['world'] and w >= 2300
    tile_results = {}
    gutters = {}
    refs = set()
    for fmt in ['png', 'src']:
        rebuilt = Image.new('RGBA', (w, h))
        gutter_equal = True
        for t in m['tiles']:
            refs.add(t[fmt])
            x, y, tw, th = t['rect']
            u, v, cw, ch = t['crop']
            assert [cw, ch] == [tw, th]
            with Image.open(OUT / t[fmt]) as image:
                tile = image.convert('RGBA')
                assert list(tile.size) == t['size']
                expected = atlas.crop((max(0, x-2), max(0, y-2), min(w, x+tw+2), min(h, y+th+2)))
                gutter_equal &= np.array_equal(np.array(expected), np.array(tile))
                rebuilt.paste(tile.crop((u, v, u+tw, v+th)), (x, y))
        delta = np.abs(np.array(rebuilt).astype('int16')-a.astype('int16'))
        assert not np.any(delta) and gutter_equal
        tile_results[fmt] = {'pixelExact': True, 'differentPixels': int(np.any(delta, axis=2).sum()),
                             'maxChannelDelta': int(delta.max())}
        gutters[fmt] = gutter_equal
    base = Image.open(OUT / 'source-images/terrain-base.png').convert('RGBA').resize((w, h), Image.Resampling.LANCZOS)
    alpha_equal = np.array_equal(a[:, :, 3], np.array(base)[:, :, 3])
    assert alpha_equal
    registered = json.loads((OUT / 'detail-registration.json').read_text())
    assert len(registered) == 2 and all(r['registrationMatrix'] is not None and r['inliers'] >= 12 for r in registered)
    write('tile-review.json', {'atlasSize': [w, h], 'tileCount': len(m['tiles']), 'gutter': 2,
                               'pngReassemblyPixelExact': tile_results['png']['pixelExact'],
                               'webpReassemblyPixelExact': tile_results['src']['pixelExact'],
                               'formatDetails': tile_results, 'guttersPixelExact': gutters,
                               'alphaUnchangedFromSharedGuide': alpha_equal,
                               'atlasSha256': hashlib.sha256((OUT / 'terrain-atlas.png').read_bytes()).hexdigest(),
                               'independentTileGenerations': False})
    # Distance is Euclidean to the nearest alpha<250 pixel, with exterior padded as zero.
    solid = np.uint8(a[:, :, 3] >= route['alphaThreshold'])
    distance = cv2.distanceTransform(np.pad(solid, 1), cv2.DIST_L2, cv2.DIST_MASK_PRECISE)[1:-1, 1:-1]
    reports = []
    overlay = atlas.copy()
    d = ImageDraw.Draw(overlay)
    for name, guide in route['guideRoutes'].items():
        pts = np.array(guide) * route['scale'] + route['offset']
        xy = samples(pts)
        values = a[xy[:, 1], xy[:, 0], 3]
        clearance = distance[xy[:, 1], xy[:, 0]]
        # Check EVERY pixel in a two-character-wide corridor, not just route vertices.
        corridor = Image.new('L', (w, h))
        cd = ImageDraw.Draw(corridor)
        line = [tuple(np.rint(p).astype(int)) for p in pts]
        radius = route['twoWayWidth']//2
        cd.line(line, fill=255, width=2*radius, joint='curve')
        for x, y in line:
            cd.ellipse((x-radius, y-radius, x+radius, y+radius), fill=255)
        corridor_pixels = np.array(corridor) > 0
        bad = int(np.sum(a[:, :, 3][corridor_pixels] < route['alphaThreshold']))
        report = {'id': name, 'sampleCount': len(xy), 'spacingPxMax': 1.42,
                  'minAlpha': int(values.min()), 'pixelsBelow250': int((values < 250).sum()),
                  'minDistanceToAlphaEdge': float(clearance.min()),
                  'minAlphaDiameter': float(2*clearance.min()), 'worstPoint': xy[clearance.argmin()].tolist(),
                  'corridorWidth': route['twoWayWidth'], 'corridorPixels': int(corridor_pixels.sum()),
                  'corridorMinAlpha': int(a[:, :, 3][corridor_pixels].min()), 'corridorBadAlphaPixels': bad,
                  'passed': bool(values.min() >= 250 and bad == 0 and clearance.min() >= radius)}
        reports.append(report)
        d.line(line, fill='#42ffac', width=5)
        for x, y in line:
            d.ellipse((x-5, y-5, x+5, y+5), fill='#ffe468')
        d.text(line[len(line)//2], name, fill='white', stroke_width=2, stroke_fill='black')
    overlay.thumbnail((1200, 1000))
    overlay.save(OUT / 'connection-overlay.png')
    connected = all(r['passed'] for r in reports)
    write('connection-review.json', {
        'alphaThreshold': 250, 'method': 'all route segments sampled <=1px arc length; exact Euclidean distance transform; all corridor pixels checked',
        'anchors': ['entrance-thai', 'lower terrace', 'lower stair', 'middle terrace', 'cave threshold',
                    'upper stair', 'upper terrace', 'exit-asia', 'both bridge landings'],
        'routes': reports, 'passed': connected, 'actorDiameterAssumption': route['actorDiameter'],
        'corridorWidthAssumption': route['twoWayWidth'],
        'scope': 'art alpha continuity and clearance only; cliff faces also have alpha. Hand-traced route overlay requires engine walkmask/collision review.',
        'gameIntegrated': False})
    assert connected, 'route or full-width corridor leaves opaque terrain'
    for layer in m['layers']:
        refs.add(layer['src'])
    for liquid in m['liquids']:
        refs.add(liquid['png'])
        assert len(liquid['frames']) == 12 and liquid['reviewLoops'] == 3
        hashes = []
        masks = []
        for frame in liquid['frames']:
            refs.add(frame['src'])
            with Image.open(OUT / frame['src']) as im:
                assert list(im.size) == frame['size'] and im.mode == 'RGBA'
                hashes.append(hashlib.sha256(im.tobytes()).hexdigest())
                masks.append(hashlib.sha256(im.getchannel('A').tobytes()).hexdigest())
        assert len(set(hashes)) == 12 and len(set(masks)) == 1
    required_keys = {'id', 'sprite', 'x', 'y', 'w', 'h', 'flipX', 'foot', 'layer', 'category'}
    for o in layout['objects']:
        assert required_keys <= o.keys() and o['layer'] in ['back', 'mid', 'front']
        assert 0 <= o['foot'][0] <= o['w'] and 0 <= o['foot'][1] <= o['h']
        assert [o['x']+o['foot'][0], o['y']+o['foot'][1]] == o['footWorld']
        refs.add(o['sprite'])
        refs.add(o['preview'])
        with Image.open(OUT / o['sprite']) as im:
            assert im.mode == 'RGBA' and im.getchannel('A').getextrema()[0] == 0
    for name in refs:
        assert (OUT / name).is_file(), name
    # Independently recombine the actual exported cave layers against the common master.
    original = np.array(Image.open(OUT / 'source-images/cave-master.webp').convert('RGBA'))
    original[:, :, 3] = np.where(original[:, :, 3] >= 230, 255,
                                np.where(original[:, :, 3] < 12, 0, original[:, :, 3]))
    original[original[:, :, 3] == 0] = 0
    original = Image.fromarray(original)
    expected = original.crop(original.getchannel('A').getbbox())
    back = Image.open(OUT / 'objects/cave-back.png').convert('RGBA')
    front = Image.open(OUT / 'objects/cave-front.png').convert('RGBA')
    assert not np.any((np.array(back)[:, :, 3] > 0) & (np.array(front)[:, :, 3] > 0))
    back.alpha_composite(front)
    assert np.array_equal(np.array(back), np.array(expected))
    with Image.open(OUT / 'flow-three-loops.webp') as animation:
        assert animation.n_frames == 36
    all_bytes = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    assert all_bytes <= 80_000_000
    unused_tiles = [str(p.relative_to(OUT)) for folder in ['terrain-png', 'terrain-webp']
                    for p in (OUT / folder).iterdir() if str(p.relative_to(OUT)) not in refs]
    assert not unused_tiles, unused_tiles
    report = {'atlas': [w, h], 'tileFormatsPixelExact': True, 'gutterPixelExact': True,
              'alphaPreserved': alpha_equal, 'connectionAlphaAndCorridors': connected,
              'objectInstances': len(layout['objects']), 'uniqueObjectSprites': len({o['sprite'] for o in layout['objects']}),
              'objectFootSchemaValid': True, 'liquids': 3, 'framesPerLiquid': 12, 'reviewCycles': 3,
              'caveDisjointAndPixelExact': True, 'flowReviewAnimationFrames': 36,
              'allReferencedFilesExist': True, 'unusedTiles': unused_tiles,
              'outputBytesAtVerification': all_bytes, 'limitBytes': 80_000_000,
              'ownerStyleApproval': 'pending', 'gameIntegrated': False}
    write('verification.json', report)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
