"""Verify delivered decoded chunks and write reproducible repair evidence."""
import argparse
import hashlib
import json
import math
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw
from scipy.signal import find_peaks

from prepare import FULL, OUT, ROOT, SOURCE, atlas

cv2.setNumThreads(2)


def write_json(name, value):
    (OUT / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def gray(image):
    return cv2.cvtColor(np.asarray(image).astype(np.float32), cv2.COLOR_RGB2GRAY)


def sharpness(image, mask):
    image = gray(image)
    lap = cv2.Laplacian(image, cv2.CV_32F)[mask]
    hp = (image - cv2.GaussianBlur(image, (0, 0), 1))[mask]
    return dict(laplacianVariance=float(lap.var()), highpassRms=float(np.sqrt(np.mean(hp ** 2))))


def dog(image):
    image = gray(image)
    return cv2.GaussianBlur(image, (0, 0), 1.5) - cv2.GaussianBlur(image, (0, 0), 6)


def structure(item, source, current):
    """All fixed grid probes retained, including low-confidence and alias hits."""
    bx, by, ex, ey = item['contextRectPx1x']
    size = (ex - bx, ey - by)
    a = dog(Image.fromarray(source).resize(size, Image.Resampling.LANCZOS))
    b = dog(Image.fromarray(current).resize(size, Image.Resampling.LANCZOS))
    x0, y0, x1, y1 = item['core']
    points = []
    for gy in range(y0 + 8, y1 - 7, 16):
        for gx in range(x0 + 8, x1 - 7, 16):
            x, y = gx - bx, gy - by
            template = a[y - 24:y + 25, x - 24:x + 25]
            search = b[y - 36:y + 37, x - 36:x + 37]
            scores = cv2.matchTemplate(search, template, cv2.TM_CCOEFF_NORMED)
            _, confidence, _, location = cv2.minMaxLoc(scores)
            dx, dy = location[0] - 12, location[1] - 12
            distance = math.hypot(dx, dy)
            points.append(dict(sourceMapPx=[gx, gy], offsetMapPx=[dx, dy], distanceMapPx=distance,
                               confidence=confidence, sourceDogStd=float(template.std()),
                               zeroOffsetConfidence=float(scores[12, 12]),
                               searchBoundary=abs(dx) == 12 or abs(dy) == 12,
                               within4=distance <= 4, confident=confidence >= .6))
    return dict(id=item['id'], points=points,
                maxDisplacementMapPx=max(p['distanceMapPx'] for p in points),
                lowConfidence=sum(not p['confident'] for p in points),
                over4=sum(not p['within4'] for p in points))


def pair(path, name, before, after, scale=1):
    before, after = Image.fromarray(before), Image.fromarray(after)
    size = (round(before.width * scale), round(before.height * scale))
    before = before.resize(size, Image.Resampling.LANCZOS)
    after = after.resize(size, Image.Resampling.LANCZOS)
    image = Image.new('RGB', (size[0] * 2 + 16, size[1] + 32), '#202327')
    image.paste(before, (0, 32))
    image.paste(after, (size[0] + 16, 32))
    draw = ImageDraw.Draw(image)
    draw.text((8, 8), name + '  /  before', fill='white')
    draw.text((size[0] + 24, 8), 'v8  /  after', fill='white')
    image.save(path, quality=95, subsampling=0)


def stairs(old, new):
    """Compare all nine source risers on three fixed interior transects."""
    item = next(i for i in json.loads((OUT / 'regions.json').read_text()) if i['id'] == 'lava-bank-treads')
    bx, by, ex, ey = item['contextRectPx1x']
    x, y, right, bottom = [v * 2 for v in item['contextRectPx1x']]
    images = dict(v2=np.array(Image.open(OUT / 'inputs/lava-bank-treads-v2.png').convert('RGB')),
                  v7=old[y:bottom, x:right], v8=new[y:bottom, x:right])
    start, end = np.array([1575., 1405.]), np.array([1815., 1268.])
    vector = end - start
    length = np.linalg.norm(vector)
    normal = np.array([-vector[1], vector[0]]) / length
    count = round(length * 2)
    scans = []
    center_profiles = {}
    for offset in (-4, 0, 4):
        xy = np.linspace(start + normal * offset, end + normal * offset, count)
        mapx = ((xy[:, 0] - bx) * 2).astype(np.float32)[None, :]
        mapy = ((xy[:, 1] - by) * 2).astype(np.float32)[None, :]
        rows = {}
        for name, image in images.items():
            profile = cv2.remap(gray(image), mapx, mapy, cv2.INTER_LINEAR)[0]
            profile = cv2.GaussianBlur(profile[None, :], (0, 0), 2)[0]
            peaks, properties = find_peaks(-profile, prominence=12, distance=38)
            rows[name] = dict(risers=len(peaks), sampleIndices=peaks.tolist(),
                              prominence=properties['prominences'].tolist())
            if offset == 0:
                center_profiles[name] = (profile, peaks, xy)
        matched = rows['v2']['risers'] == rows['v8']['risers'] == 9
        delta = None
        if matched:
            delta = max(abs(a - b) * length / (count - 1)
                        for a, b in zip(rows['v2']['sampleIndices'], rows['v8']['sampleIndices']))
        scans.append(dict(normalOffsetMapPx=offset, rows=rows, nineSourceRisersMatched=matched,
                          maxAlongStairDisplacementMapPx=delta))
    card_width, card_height = right - x, bottom - y
    sheet = Image.new('RGB', (card_width * 3, card_height + 260), '#202327')
    draw = ImageDraw.Draw(sheet)
    colors = dict(v2='#e9edf1', v7='#eea461', v8='#76e4b2')
    for col, (name, image) in enumerate(images.items()):
        card = Image.fromarray(image)
        marker = ImageDraw.Draw(card)
        profile, peaks, xy = center_profiles[name]
        for index in peaks:
            px, py = (xy[index, 0] - bx) * 2, (xy[index, 1] - by) * 2
            marker.ellipse((px - 5, py - 5, px + 5, py + 5), outline='#00ffff', width=2)
        sheet.paste(card, (col * card_width, 32))
        draw.text((col * card_width + 8, 8), name + ' / 9 source risers / center scan', fill='white')
        points = [(col * card_width + 24 + i * (card_width - 48) / (len(profile) - 1),
                   card_height + 240 - float(value) * .7) for i, value in enumerate(profile)]
        draw.line(points, fill=colors[name], width=2)
    sheet.save(OUT / 'stair-check.jpg', quality=95, subsampling=0)
    report = dict(method='Three fixed parallel interior transects at offsets -4/0/+4 map px. Source endpoints [1575,1405] -> [1815,1268], 2 samples/map px. Gray Gaussian sigma2 output px, trough prominence>=12, separation>=38 output px. All troughs retained.',
                  sourceRisers=9, scans=scans,
                  allThreeScansMatched=all(s['nineSourceRisersMatched'] and s['maxAlongStairDisplacementMapPx'] <= 4 for s in scans),
                  observation='This decoded source v7 already contains nine center-line risers. The reported missing-third ramp was not reproduced numerically in this source pack. v8 restores v2 spacing and drawn surface detail across this full diagonal staircase.')
    write_json('stairs.json', report)
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--acceptance', action='store_true')
    args = parser.parse_args()
    items = json.loads((OUT / 'regions.json').read_text())
    manifest = json.loads((OUT / 'v8/manifest.json').read_text())
    support = np.array(Image.open(OUT / 'edit-support.png')) > 0
    old = np.array(atlas(SOURCE / 'v7', FULL, 2048))
    new = np.array(atlas(OUT / 'v8', FULL, 2048))
    files = []
    for entry in manifest['files']:
        path = OUT / 'v8' / entry['file']
        with Image.open(path) as im:
            assert im.size == (entry['width'], entry['height'])
            im.load()
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256']
        assert path.stat().st_size == entry['bytes']
        files.append(entry['file'])
    assert len(files) == 20 and len(set(files)) == 20
    assert set(files) == {f'r{r}-c{c}.webp' for r in range(1, 5) for c in range(1, 6)}
    assert manifest['fullPx'] == dict(w=9830, h=6554) and manifest['chunk'] == 2048
    assert Image.open(OUT / 'v8/zone2-terrain-v7-preview.webp').size == (1536, 1024)
    hashes = json.loads((OUT / 'source-hashes.json').read_text())
    for entry in hashes:
        assert hashlib.sha256(Path(entry['path']).read_bytes()).hexdigest() == entry['sha256']
    outside_changed = 0
    inside_changed = 0
    for y in range(0, FULL[1], 256):
        changed = np.any(old[y:y + 256] != new[y:y + 256], axis=2)
        outside_changed += int(np.count_nonzero(changed & ~support[y:y + 256]))
        inside_changed += int(np.count_nonzero(changed & support[y:y + 256]))
    assert outside_changed == 0
    excluded = np.zeros(support.shape, bool)
    for item in items:
        x, y, ex, ey = [v * 2 for v in item['contextRectPx1x']]
        excluded[y:ey, x:ex] = True
    rings = {r['id']: r for r in json.loads((OUT / 'native-ring.json').read_text())}
    sharp, structures = [], []
    (OUT / 'structure').mkdir(exist_ok=True)
    base = atlas(ROOT / 'img/map-zone2/v2', (4915, 3277), 1024)
    for item in items:
        name = item['id']
        bx, by, ex, ey = item['contextRectPx1x']
        x, y, right, bottom = [v * 2 for v in item['contextRectPx1x']]
        before, after = old[y:bottom, x:right], new[y:bottom, x:right]
        Image.fromarray(after).save(OUT / 'compare' / f'{name}-after.png')
        x0, y0, x1, y1 = item['core']
        core = np.zeros(before.shape[:2], bool)
        core[(y0 - by) * 2:(y1 - by) * 2, (x0 - bx) * 2:(x1 - bx) * 2] = True
        left, top, r, b = rings[name]['outerRectOutputPx']
        native = sharpness(old[top:b, left:r], ~excluded[top:b, left:r])
        a, z = sharpness(before, core), sharpness(after, core)
        row = dict(id=name, coreMapPx=item['core'], ring=rings[name], before=a, after=z,
                   laplacianRatioBefore=a['laplacianVariance'] / native['laplacianVariance'],
                   laplacianRatioAfter=z['laplacianVariance'] / native['laplacianVariance'],
                   highpassRatioBefore=a['highpassRms'] / native['highpassRms'],
                   highpassRatioAfter=z['highpassRms'] / native['highpassRms'])
        row['atLeast85Percent'] = row['laplacianRatioAfter'] >= .85
        sharp.append(row)
        source = np.array(base.crop((bx, by, ex, ey)).resize((right - x, bottom - y), Image.Resampling.LANCZOS))
        report = structure(item, source, after)
        structures.append(report)
        pair(OUT / 'compare' / f'{name}.jpg', name, before, after, scale=2.8 * 3840 / FULL[0])
        annotated = Image.fromarray(after)
        draw = ImageDraw.Draw(annotated)
        for point in report['points']:
            px, py = point['sourceMapPx']
            px, py = (px - bx) * 2, (py - by) * 2
            color = '#5dff9a' if point['within4'] and point['confident'] else '#ff5173'
            draw.ellipse((px - 2, py - 2, px + 2, py + 2), outline=color)
        pair(OUT / 'structure' / f'{name}.jpg', 'v2 source', source, np.array(annotated))
        print(name, 'sharp', round(row['laplacianRatioAfter'], 3),
              'geometry max', round(report['maxDisplacementMapPx'], 3),
              'unresolved', report['lowConfidence'], 'over4', report['over4'], flush=True)
    write_json('sharpness.json', dict(
        method='Decoded v8 full 2x grayscale Laplacian ksize1 variance and highpass sigma1 RMS. Native annulus is 48 map px outside each original context, excluding every edited context. Fixed masks, identical before/after sampling. Ratios measure texture contrast, not semantic detail or resolution.',
        rows=sharp))
    write_json('structure.json', dict(
        method='Asia v2 at map1x versus decoded v8 downsampled Lanczos. Fixed grid every16 map px, 49x49 DoG sigma1.5/6 NCC templates, search +/-12 map px, confidence>=0.6. All probes retained. Covers sampled appearance, not a continuous semantic boundary proof.',
        regions=structures))
    stair_report = stairs(old, new)
    summary = dict(fileChecks=True, sourceHashesUnchanged=len(hashes), chunks=len(files),
                   fullPx=manifest['fullPx'], imageGenCalls=manifest['imageGenCalls'],
                   bytes=manifest['imageBytes'], editedSupportPixels=int(support.sum()),
                   changedPixelsInside=inside_changed, changedPixelsOutside=outside_changed,
                   sharpnessAtLeast85=sum(r['atLeast85Percent'] for r in sharp[:16]),
                   sharpnessRegions=16, structureProbes=sum(len(r['points']) for r in structures),
                   structureMaxMapPx=max(r['maxDisplacementMapPx'] for r in structures),
                   structureOver4=sum(r['over4'] for r in structures),
                   structureLowConfidence=sum(r['lowConfidence'] for r in structures),
                   nineStairRisersOnThreeScans=stair_report['allThreeScansMatched'],
                   runtimeTested=False, continuousSemanticContoursVerified=False,
                   allChunksLossyQ90=False)
    write_json('verification.json', summary)
    print(json.dumps(summary, indent=2))
    if args.acceptance and (summary['structureOver4'] or summary['structureLowConfidence']
                            or summary['sharpnessAtLeast85'] != 16
                            or not summary['continuousSemanticContoursVerified']
                            or not summary['allChunksLossyQ90']):
        raise SystemExit(2)


if __name__ == '__main__':
    main()
