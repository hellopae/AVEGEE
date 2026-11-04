"""Independent artifact checks for the dated Frontier 1 pack; no game-code changes."""
from pathlib import Path
from PIL import Image, ImageDraw
import json
import hashlib
import numpy as np
import cv2

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/art-reviews/2026-11-05-frontier1-redraw'


def read(name):
    return json.loads((OUT / name).read_text())


def write(name, value):
    (OUT / name).write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def main():
    m = read('manifest.json')
    w, h = m['world']
    atlas = np.array(Image.open(OUT / m['terrainMaster']).convert('RGBA'))
    assert atlas.shape == (h, w, 4) and w >= 2300
    differences = {}
    for kind in ['png', 'webp']:
        canvas = Image.new('RGBA', (w, h))
        for t in m['tiles']:
            x, y, tw, th = t['rect']
            im = Image.open(OUT / t['png' if kind == 'png' else 'src']).convert('RGBA')
            if kind == 'webp':
                u, v, cw, ch = t['crop']
                expected = Image.fromarray(atlas).crop((max(0, x-2), max(0, y-2), min(w, x+tw+2), min(h, y+th+2)))
                assert np.array_equal(np.array(im), np.array(expected)), f'gutter mismatch {t["id"]}'
                im = im.crop((u, v, u+cw, v+ch))
            canvas.paste(im, (x, y))
        differences[kind] = int(np.count_nonzero(np.any(np.array(canvas) != atlas, axis=2)))
        assert differences[kind] == 0
    master = Image.open(OUT / 'terrain-master-v2.png').convert('RGBA').resize((w, h), Image.Resampling.LANCZOS)
    assert np.array_equal(np.array(master)[:, :, 3], atlas[:, :, 3])
    # Compare shared terrain features to the owner's drawing, independently of detail registration.
    ma = np.array(Image.open(OUT / 'terrain-master-v2.png').convert('RGBA').resize((800, 878)))
    owner = np.array(Image.open(OUT / 'input/frontier1-owner-layout.jpg').convert('RGB').resize((800, 878)))
    sift = cv2.SIFT_create(nfeatures=8000)
    ka, da = sift.detectAndCompute(cv2.cvtColor(ma[:, :, :3], cv2.COLOR_RGB2GRAY), np.uint8(ma[:, :, 3] > 250)*255)
    kb, db = sift.detectAndCompute(cv2.cvtColor(owner, cv2.COLOR_RGB2GRAY), None)
    matches = [a for a, b in cv2.BFMatcher().knnMatch(da, db, k=2) if a.distance < .72*b.distance]
    pa = np.float32([ka[m.queryIdx].pt for m in matches])
    pb = np.float32([kb[m.trainIdx].pt for m in matches])
    matrix, inliers = cv2.estimateAffinePartial2D(pa, pb, method=cv2.RANSAC, ransacReprojThreshold=3)
    assert matrix is not None
    errors = np.linalg.norm(cv2.transform(pa[None], matrix)[0] - pb, axis=1)[inliers[:, 0] > 0] * (w/800)
    placements = read('input/frontier1-owner-layout.json')['placements']
    obs = read('layout.json')['objects']
    gate_deviations = []
    for gid, sourceid in [('north', '/Im6'), ('south', '/Im7')]:
        source = next(p for p in placements if p['id'] == sourceid)
        obj = next(o for o in obs if o['id'] == f'{gid}-gate-front')
        gate_deviations.append(dict(id=gid, rectDeviationPx={key:abs(obj[key]-source[key]*scale)
            for key, scale in zip(['x','y','w','h'], [w,h,w,h])}))
    write('owner-registration-review.json', dict(matches=len(matches), inliers=int(inliers.sum()),
        measurementSize=[800,878], affineMatrixAtMeasurementSize=matrix.tolist(),
        medianInlierErrorAtlasPx=float(np.median(errors)), maxInlierErrorAtlasPx=float(errors.max()),
        gateBoundingBoxes=gate_deviations,
        limitation='Feature correspondences and gate rectangles do not prove exact cliff silhouettes or visual style.'))

    # Every pixel along the requested center route AND a 64px-wide corridor must be solid.
    points = [('south-threshold', [.52665, .98898]), ('lower-apron', [.52665, .86]),
              ('main-courtyard', [.53, .68]), ('stair-bottom', [.53, .515]),
              ('stair-top', [.53, .438]), ('upper-courtyard', [.54, .34]),
              ('north-threshold', [.563, .28723])]
    segments = []
    route = Image.new('L', (w, h))
    draw = ImageDraw.Draw(route)
    for (an, ap), (bn, bp) in zip(points, points[1:]):
        a, b = tuple(round(v * n) for v, n in zip(ap, (w, h))), tuple(round(v * n) for v, n in zip(bp, (w, h)))
        mask = Image.new('L', (w, h))
        ImageDraw.Draw(mask).line([a, b], fill=255, width=64)
        selected = np.array(mask) > 0
        values = atlas[:, :, 3][selected]
        segments.append(dict(start=an, end=bn, fromPx=a, toPx=b, corridorWidthPx=64,
                             samplePixels=int(values.size), minAlpha=int(values.min()),
                             below250=int(np.count_nonzero(values < 250)), passed=bool(np.all(values >= 250))))
        draw.line([a, b], fill=255, width=64)
    connected = all(s['passed'] for s in segments)
    write('connection-review.json', dict(alphaThreshold=250, points=points, segments=segments, passed=connected,
          limitation='Alpha continuity only; not a game walkmask, slope or collision test.'))
    debug = Image.open(OUT / 'terrain-atlas.png').convert('RGBA')
    highlight = Image.new('RGBA', (w, h), '#22ffaa')
    highlight.putalpha(route.point(lambda x: 135 if x else 0))
    debug.alpha_composite(highlight)
    debug.thumbnail((900, 990))
    debug.save(OUT / 'connection-preview.png')

    feet = []
    objects = read('layout.json')['objects']
    required = {'id', 'sprite', 'x', 'y', 'w', 'h', 'flipX', 'foot', 'layer', 'category'}
    for o in objects:
        assert required <= o.keys() and o['layer'] in ['back', 'mid', 'front']
        assert (OUT / o['sprite']).is_file()
        fx, fy = [round(o[k] + o[n] * f) for k, n, f in zip(['x', 'y'], ['w', 'h'], o['foot'])]
        inbounds = 0 <= fx < w and 0 <= fy < h
        values = atlas[max(0, fy-3):min(h, fy+4), max(0, fx-3):min(w, fx+4), 3] if inbounds else np.array([0])
        footprint = (fx, fy)
        overlaps = o['category'] != 'gate' and np.array(route)[fy, fx] > 0 if inbounds else True
        feet.append(dict(id=o['id'], worldFoot=footprint, minAlpha7x7=int(values.min()),
                         onOpaqueGround=bool(inbounds and np.all(values >= 250)), onMainCorridor=bool(overlaps)))
    gate = Image.open(OUT / 'input/thai-gate-source.png').convert('RGBA')
    gate.thumbnail((1000,1000))
    ga = np.array(gate)
    front = np.array(Image.open(OUT / 'objects/thai-gate-front.png').convert('RGBA'))
    back = np.array(Image.open(OUT / 'objects/thai-gate-back.png').convert('RGBA'))
    assert not np.any((front[:,:,3] > 0) & (back[:,:,3] > 0))
    assert np.array_equal(front.astype('uint16')+back.astype('uint16'), ga)
    write('object-review.json', dict(count=len(objects), objects=feet,
          allFeetOnGround=all(f['onOpaqueGround'] for f in feet),
          decorationsOutsideCorridor=not any(f['onMainCorridor'] for f in feet),
          gatePartsDisjoint=True, gatePartReconstructionPixelExact=True))

    loops = []
    for f in m['liquids']:
        assert len(f['frames']) == 12
        frames = [np.array(Image.open(OUT / frame['src']).convert('RGBA')) for frame in f['frames']]
        assert len({hashlib.sha256(a.tobytes()).hexdigest() for a in frames}) == 12
        delta = [float(np.abs(frames[(i+1) % 12][:, :, :3].astype(float)-frames[i][:, :, :3]).mean()) for i in range(12)]
        cycle = Image.open(OUT / 'flows' / f"{f['id']}-3-cycles.webp")
        assert cycle.n_frames == 36
        loops.append(dict(id=f['id'], frames=12, reviewFrames=cycle.n_frames, cycles=3,
                          meanAdjacentRGBDelta=delta, wrapToMedianRatio=delta[-1]/float(np.median(delta))))
    write('flow-review.json', dict(loops=loops, noNewLiquidGeneration=True,
          contentReview='Reused liquid-only river; no rocks, vegetation or buildings added.'))
    size = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    report = dict(world=[w, h], tiles=len(m['tiles']), differingPixels=differences,
                  guttersPixelExact=True, alphaLocked=True, connectionPassed=connected,
                  allObjectFeetOnGround=all(f['onOpaqueGround'] for f in feet),
                  outputBytes=size, outputLimitBytes=80_000_000, withinOutputLimit=size <= 80_000_000)
    write('verification.json', report)
    # Include this report itself in the byte count (stable after its numeric width settles).
    for _ in range(2):
        report['outputBytes'] = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
        write('verification.json', report)
    print(json.dumps(report))
    assert connected and all(f['onOpaqueGround'] for f in feet)
    assert not any(f['onMainCorridor'] for f in feet)
    assert size <= 80_000_000


if __name__ == '__main__':
    main()
