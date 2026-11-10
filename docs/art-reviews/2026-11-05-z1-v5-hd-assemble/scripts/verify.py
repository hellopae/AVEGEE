"""Validate decoded shipping assets and produce offline evidence, not a QA sign-off.

Exit 0: file/hash/geometry/provenance checks succeeded.
Exit 2 with --acceptance: visual/whole-contour acceptance remains unresolved.
All measurements use decoded lossy v7 files, never the temporary master.
"""
import argparse
import json
import math
from pathlib import Path
import re
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from assemble import O, ROOT, FULL, baseline, sha, write_json, inventory

FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
GAME_X, GAME_Y = 2.8/(4915/3840), 2.8/(3277/2560)


def decoded_master():
    im = Image.new('RGB', FULL)
    for r in range(1, 5):
        for c in range(1, 6):
            im.paste(Image.open(O/f'v7/r{r}-c{c}.webp'), ((c-1)*2048, (r-1)*2048))
    return im


def band(im):
    a = cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(a, (0, 0), 1.5)-cv2.GaussianBlur(a, (0, 0), 6)


def walkmask():
    source = (ROOT/'src/town-walkmask.js').read_text()
    runs = json.loads(re.search(r'TOWN_WALK_RUNS=(\[.*?\]);', source).group(1))
    cells = np.repeat(np.arange(len(runs)) % 2, runs).astype(np.uint8)
    assert cells.size == 480*320
    mask = cv2.resize(cells.reshape(320, 480), (4915, 3277), interpolation=cv2.INTER_NEAREST)
    edge = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    return mask, edge


def structure(old, new):
    a, b = band(old), band(new.resize(old.size, Image.Resampling.LANCZOS))
    mask, edge = walkmask()
    distance = cv2.distanceTransform(1-edge, cv2.DIST_L2, 3)
    points = []
    # Retest the upstream fixed architectural landmarks against the final decoded atlas.
    for chunk, path in sorted(inventory().items()):
        r, c = map(int, re.fullmatch(r'r(\d)-c(\d)', chunk).groups())
        ox, oy = (c-1)*1024, (r-1)*1024
        st = path.parent/('structure-metrics.json' if chunk == 'r2-c3' else 'structure.json')
        data = json.loads(st.read_text())
        for p in data.get('probes', data.get('points', [])):
            x, y = p.get('sourcePx1x', p.get('pointPx1x'))
            points.append((f"{chunk}/{p.get('id', p.get('kind', 'grid'))}", round(x+ox), round(y+oy), 'source-landmark'))
    # Fixed contour probes sample the actual JS RLE, independent of SIFT registration.
    contours, _ = cv2.findContours(edge, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    for ci, contour in enumerate(contours):
        if len(contour) < 80:
            continue
        for pi, point in enumerate(contour[::80, 0]):
            x, y = map(int, point)
            points.append((f'walkmask-{ci}-{pi}', x, y, 'walkmask-boundary'))
    records = []
    for label, x, y, kind in points:
        if not (36 <= x < old.width-36 and 36 <= y < old.height-36):
            continue
        template = a[y-24:y+25, x-24:x+25]
        area = b[y-36:y+37, x-36:x+37]
        _, score, _, loc = cv2.minMaxLoc(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED))
        dx, dy = loc[0]-12, loc[1]-12
        d = math.hypot(dx, dy)
        records.append(dict(id=label, kind=kind, sourcePx1x=[x, y], displacementPx1x=[dx, dy],
            distancePx1x=d, normalizedCorrelation=score, reliable=score >= .6,
            within4px=d <= 4, searchBoundaryHit=abs(dx) == 12 or abs(dy) == 12,
            walkable=bool(mask[y, x]), distanceToWalkmaskBoundaryPx1x=float(distance[y, x])))
    confident = [p for p in records if p['reliable']]
    failures = [p for p in confident if not p['within4px']]
    report = dict(thresholdPx1x=4, totalProbes=len(records), reliableProbes=len(confident),
        uncertainProbes=len(records)-len(confident), reliableFailures=len(failures),
        maxReliableDisplacementPx1x=max((p['distancePx1x'] for p in confident), default=None),
        allReliableProbesWithin4px=bool(confident) and not failures,
        wholeStructureWithin4pxVerified=False, inGameTested=False,
        method='49x49 DoG sigma1.5/6 templates on repaired v5; NCC search +/-12 map1x px in final DECODED v7 downsampled to 1x; confidence>=0.6. All probes retained. Upstream landmarks plus fixed walkmask contour samples every80 pixels.',
        walkmask=dict(file='src/town-walkmask.js', sha256=sha(ROOT/'src/town-walkmask.js'),
            cellWorldUnits=8, cellMapPx1x=[8*4915/3840, 8*3277/2560],
            limitation='Authored against v2; grid boundary resolution approximately10.24 map pixels. Useful for route context, cannot certify a4px semantic contour tolerance. Runtime patches in town-layout.js are not this RLE.'),
        limitations=['Local translation of image texture is not a semantic outline audit. Repeated treads, removed objects and shadows can give ambiguous NCC maxima.',
            'Low confidence points are unresolved, not successes. Full plaza/stair/cliff/bank/bridge contours remain unverified.'],
        probes=records)
    write_json(O/'structure.json', report)
    overlay = np.array(new.resize(old.size, Image.Resampling.LANCZOS))
    overlay[edge > 0] = (.5*overlay[edge > 0]+.5*np.array([0, 235, 255])).astype(np.uint8)
    panel = Image.fromarray(overlay).resize((1966, 1311), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(panel)
    for p in records:
        x, y = (round(v*.4) for v in p['sourcePx1x'])
        color = '#ff3355' if p['reliable'] and not p['within4px'] else '#e6c34f' if not p['reliable'] else '#26de9d'
        draw.ellipse((x-2, y-2, x+2, y+2), fill=color)
    sheet = Image.new('RGB', (1966, 1361), '#151923')
    sheet.paste(panel, (0, 50))
    ImageDraw.Draw(sheet).text((12, 12), 'Decoded v7 + JS walkmask(cyan); green <=4px, red >4px, yellow uncertain. Offline evidence.', font=FONT, fill='white')
    sheet.save(O/'structure-check.jpg', quality=93, subsampling=0)
    print('structure:', len(confident), '/', len(records), 'reliable;', len(failures), 'over4px', flush=True)
    return report


def metric(im):
    gray = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY).astype(np.float64)
    hp = gray-cv2.GaussianBlur(gray, (0, 0), 1)
    # FFT in a fixed centre window, same footprint for both versions.
    h, w = gray.shape
    roi = gray[max(0, h//2-256):min(h, h//2+256), max(0, w//2-256):min(w, w//2+256)]
    power = np.abs(np.fft.fft2((roi-roi.mean())*np.outer(np.hanning(roi.shape[0]), np.hanning(roi.shape[1]))))**2
    f = np.hypot(np.fft.fftfreq(roi.shape[0])[:, None], np.fft.fftfreq(roi.shape[1])[None, :])
    return dict(laplacianVariance=float(cv2.Laplacian(gray, cv2.CV_64F, ksize=1).var()),
        highPassMeanSquare=float(np.mean(hp**2)), fftHighFrequencyFraction=float(power[f >= .25].sum()/max(power.sum(), 1e-12)))


def sharpness(old, new):
    chunks = []
    for r in range(1, 5):
        for c in range(1, 6):
            x, y = (c-1)*1024, (r-1)*1024
            box = (x, y, min(x+1024, 4915), min(y+1024, 3277))
            size = (round((box[2]-x)*GAME_X), round((box[3]-y)*GAME_Y))
            v5 = metric(old.crop(box).resize(size, Image.Resampling.LANCZOS))
            v7 = metric(new.crop(tuple(v*2 for v in box)).resize(size, Image.Resampling.LANCZOS))
            chunks.append(dict(chunk=f'r{r}-c{c}', rectPx1x=list(box), deviceSize=list(size), v5=v5, v7=v7,
                ratioToV5={key: v7[key]/max(v5[key], 1e-12) for key in v5}))
    report = dict(devicePxPerWorldUnit=2.8, method='Decoded lossy output vs v5 + baked repairs. Identical Lanczos game scale. Laplacian ksize1/full chunk; highpass sigma1/full chunk; Hann FFT >=0.25 cycles/device pixel in centre512 window.',
        limitations='Texture, contrast and object removal affect these diagnostics; a ratio is not a perceptual resolution multiplier. No threshold was requested for this assembly.', chunks=chunks)
    write_json(O/'sharpness.json', report)


def visual_evidence(old, new):
    # Exactly native 2x pixels, complete edge length, no hidden/resized strip sections.
    seam_metrics = []
    for axis, locations in [('vertical', range(2048, FULL[0], 2048)), ('horizontal', range(2048, FULL[1], 2048))]:
        for loc in locations:
            box = (loc-160, 0, loc+160, FULL[1]) if axis == 'vertical' else (0, loc-160, FULL[0], loc+160)
            strip = new.crop(box)
            strip.save(O/f'seam-check/{axis}-{loc}.jpg', quality=96, subsampling=0)
            # Complete edge at actual game zoom, folded into <=2048px-long sections.
            # Vertical strips are rotated, preserving every source pixel and scale.
            folded = strip.transpose(Image.Transpose.ROTATE_90) if axis == 'vertical' else strip
            scale = GAME_Y/2 if axis == 'vertical' else GAME_X/2
            n = math.ceil(folded.width/2048)
            cell_h = round(folded.height*scale)+36
            sheet = Image.new('RGB', (round(2048*scale), n*cell_h+40), '#151923')
            sd = ImageDraw.Draw(sheet)
            sd.text((8, 8), f'{axis} edge{loc}; 2.8px/world; view100%; each row is one consecutive section', font=FONT, fill='white')
            for i in range(n):
                piece = folded.crop((i*2048, 0, min((i+1)*2048, folded.width), folded.height))
                piece = piece.resize((round(piece.width*scale), round(piece.height*scale)), Image.Resampling.LANCZOS)
                sd.text((8, 40+i*cell_h), f'section{i+1}/{n}; source2x along-edge pixels{i*2048}..{min((i+1)*2048, folded.width)}', font=FONT, fill='white')
                sheet.paste(piece, (0, 40+i*cell_h+30))
            sheet.save(O/f'seam-check/{axis}-{loc}-game.jpg', quality=95, subsampling=0)
            a = np.array(strip).astype(np.float32)
            if axis == 'horizontal':
                a = a.transpose(1, 0, 2)
            differences = np.mean(np.abs(np.diff(a, axis=1)), axis=2)
            exact = float(differences[:, 159].mean())
            nearby = float(np.concatenate([differences[:, 140:155], differences[:, 165:180]], axis=1).mean())
            seam_metrics.append(dict(axis=axis, coordinatePx2x=loc, stripRectPx2x=list(box),
                meanAdjacentRGBAtChunkEdge=exact, meanAdjacentRGBNearby=nearby, ratio=exact/max(nearby, 1e-9)))
    write_json(O/'seam-check/metrics.json', dict(nativeScale=2, fullLengthStrips=7,
        method='Mean adjacent decoded RGB difference at exported chunk boundary vs nearby columns/rows. Diagnostic only; does not certify invisible adaptive seams.', seams=seam_metrics))
    new.resize((1920, 1280), Image.Resampling.LANCZOS).save(O/'overview.jpg', quality=93, subsampling=0)
    rois = {'main-plaza': [2160, 1130, 2810, 1610], 'central-bridge': [2290, 1910, 2640, 2580],
        'lava-bank': [1040, 1270, 1650, 1800], 'ice-bank': [3980, 880, 4600, 1410],
        'heaven-gate': [2930, 220, 3570, 750], 'south-plaza': [2130, 2600, 2820, 3090]}
    for label, box in rois.items():
        size = (round((box[2]-box[0])*GAME_X), round((box[3]-box[1])*GAME_Y))
        left = old.crop(box).resize(size, Image.Resampling.LANCZOS)
        right = new.crop(tuple(v*2 for v in box)).resize(size, Image.Resampling.LANCZOS)
        sheet = Image.new('RGB', (size[0]*2+36, size[1]+54), '#151923')
        sheet.paste(left, (12, 54))
        sheet.paste(right, (size[0]+24, 54))
        ImageDraw.Draw(sheet).text((12, 12), f'{label} -- v5 + repairs | v7, 2.8 device px/world unit; view100%', font=FONT, fill='white')
        sheet.save(O/f'compare-zoom/{label}.jpg', quality=95, subsampling=0)
    write_json(O/'compare-zoom/rois.json', dict(rectFormat='[x0,y0,x1,y1], map1x', devicePxPerWorldUnit=2.8,
        devicePxPerMapPixel=[GAME_X, GAME_Y], rois=rois, inGameTested=False, spriteOverlays=False))
    fallback_dir = O/'fallback-check'
    fallback_dir.mkdir(exist_ok=True)
    for item in json.loads((O/'inventory.json').read_text())['fallbackPatches']:
        box = item['contextRectPx1x']
        size = (round((box[2]-box[0])*GAME_X), round((box[3]-box[1])*GAME_Y))
        sheet = Image.new('RGB', (size[0]*2+24, size[1]+44), '#151923')
        sheet.paste(old.crop(box).resize(size, Image.Resampling.LANCZOS), (0, 44))
        sheet.paste(new.crop(tuple(v*2 for v in box)).resize(size, Image.Resampling.LANCZOS), (size[0]+24, 44))
        ImageDraw.Draw(sheet).text((8, 8), item['id']+' -- v5 | final v7, including adaptive context ring', font=FONT, fill='white')
        sheet.save(fallback_dir/(item['id']+'.jpg'), quality=95, subsampling=0)


def validate():
    manifest = json.loads((O/'v7/manifest.json').read_text())
    assert manifest['fullPx'] == dict(w=9830, h=6554) and manifest['chunk'] == 2048
    expected = {f'r{r}-c{c}.webp': (1638 if c == 5 else 2048, 410 if r == 4 else 2048)
                for r in range(1, 5) for c in range(1, 6)}
    expected['zone1-terrain-v7-preview.webp'] = (1536, 1024)
    assert {p.name for p in (O/'v7').iterdir()} == set(expected) | {'manifest.json'}
    assert len(manifest['files']) == len(expected)
    assert {f['file'] for f in manifest['files']} == set(expected)
    assert manifest['imageBytes'] == sum(f['bytes'] for f in manifest['files'])
    for f in manifest['files']:
        path = O/'v7'/f['file']
        with Image.open(path) as im:
            im.load()
            assert im.size == expected[f['file']] == (f['width'], f['height'])
        assert path.stat().st_size == f['bytes'] and sha(path) == f['sha256']
    n = sum(p.stat().st_size for p in (O/'v7').iterdir())
    assert n <= 40_000_000
    inv = json.loads((O/'inventory.json').read_text())
    for parts in inv['chunks'].values():
        for t in parts:
            assert sha(Path(t['nativeFile'])) == t['sha256']
            assert sha(Path(t['sourceRegistration'])) == t['registrationSha256']
    for source in inv['baselineInputs']:
        assert sha(ROOT/source['path']) == source['sha256']
    seams = json.loads((O/'seams.json').read_text())['seams']
    assert len(seams) == 69+4*len(inv.get('fallbackPatches', []))
    for s in seams:
        path = np.array(s['pathInOverlapOutputPx'])
        assert np.all(np.abs(np.diff(path)) <= 1)
        assert path.min() >= 10 and path.max() < s['overlapOutputPx']-10
        assert s['correctionAbsMax'] <= 8.00001
    old, new = baseline(), decoded_master()
    st = structure(old, new)
    sharpness(old, new)
    visual_evidence(old, new)
    decoded = 0
    for p in O.rglob('*'):
        if p.suffix in {'.webp', '.jpg'}:
            with Image.open(p) as im:
                im.load()
                decoded += 1
    report = dict(fileChecksSucceeded=True, imagesDecoded=decoded, v7Bytes=n, v7MBDecimal=n/1_000_000,
        imageGenCalls=0, sourceHashesUnchanged=True, shippingImages=21, chunkCount=20,
        minCostJoins=len(seams), structureReliableFailures=st['reliableFailures'],
        structureUncertain=st['uncertainProbes'], inGameTested=False,
        acceptance=[dict(id=1, verified=True, evidence='20 expected chunks, preview, manifest; dimensions/decode/SHA256/<=40MB checked.'),
            dict(id=2, verified=False, evidence='Offline seam strips and game-scale comparisons supplied. Whole semantic structure<=4px and invisible joins in-game are not certified.',
                reliableProbeFailures=st['reliableFailures']),
            dict(id=3, verified=(O/'README.md').exists(), evidence='Fallback r4-c1/q12, six architecture patches and unresolved findings in inventory.json and Thai README. ImageGen0.')])
    write_json(O/'verification.json', report)
    print(json.dumps(report, ensure_ascii=False, indent=2), flush=True)
    return report


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--acceptance', action='store_true', help='Exit2 when full acceptance is unresolved, even when artifact checks succeed.')
    args = parser.parse_args()
    result = validate()
    if args.acceptance and not all(c['verified'] for c in result['acceptance']):
        sys.exit(2)
