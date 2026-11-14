"""Verify shipping files and measure decoded west terrain at its intended scale.

Image diagnostics adapted from Z1 assembly at 8c8f339f.
Exit 2 with --acceptance records unresolved visual/semantic criteria.
"""
import argparse
import json
import math
import re
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

from assemble import O, ROOT, FULL, baseline, normalize, sha, write_json

FONT = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 20)
GAME_X, GAME_Y = 2.8 / (4915 / 3840), 2.8 / (3277 / 2560)


def decoded_master():
    image = Image.new('RGB', FULL)
    for row in range(1, 5):
        for col in range(1, 6):
            with Image.open(O / f'v7/r{row}-c{col}.webp') as tile:
                image.paste(tile, ((col - 1) * 2048, (row - 1) * 2048))
    return image


def walkmask():
    path = ROOT / 'src/town-owner-walkmask-west.js'
    text = path.read_text()
    runs = json.loads(re.search(r'TOWN_OWNER_WALK_RUNS=(\[.*?\]);', text).group(1))
    cells = np.repeat(np.arange(len(runs)) % 2, runs).astype(np.uint8)
    assert cells.size == 480 * 320 and cells.sum() == 27328
    mask = cv2.resize(cells.reshape(320, 480), (4915, 3277), interpolation=cv2.INTER_NEAREST)
    edge = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    return mask, edge


def band(image):
    gray = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(gray, (0, 0), 1.5) - cv2.GaussianBlur(gray, (0, 0), 6)


def fixed_landmarks():
    """Retain every upstream fixed landmark in its original chunk coordinate frame."""
    inventory = json.loads((O / 'inventory.json').read_text())
    points = []
    for chunk, parts in sorted(inventory['chunks'].items()):
        row, col = map(int, re.fullmatch(r'r(\d)-c(\d)', chunk).groups())
        ox, oy = (col - 1) * 1024, (row - 1) * 1024
        directory = (O / parts[0]['registrationFile']).parent
        data = json.loads((directory / 'structure.json').read_text())
        for point in data.get('probes', []):
            x, y = point['sourcePx1x']
            points.append((f"{chunk}/{point['id']}", x + ox, y + oy, 'source-landmark'))
        path = directory / 'landmarks.json'
        if path.exists():
            for point in json.loads(path.read_text())['points']:
                x, y = point['sourceChunkPx1x']
                points.append((f"{chunk}/{point['id']}", x + ox, y + oy, 'source-landmark'))
    return points


def structure(old, new):
    reference = band(old)
    final = band(new.resize(old.size, Image.Resampling.LANCZOS))
    mask, edge = walkmask()
    points = fixed_landmarks()
    contours, _ = cv2.findContours(edge, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    for contour_index, contour in enumerate(contours):
        if len(contour) < 80:
            continue
        for point_index, point in enumerate(contour[::80, 0]):
            x, y = map(int, point)
            points.append((f'west-mask-{contour_index}-{point_index}', x, y, 'walkmask-boundary'))
    records = []
    for label, x, y, kind in points:
        if not (36 <= x < old.width - 36 and 36 <= y < old.height - 36):
            records.append(dict(id=label, kind=kind, sourcePx1x=[x, y], measured=False,
                                reason='Template/search window intersects map border.'))
            continue
        template = reference[y - 24:y + 25, x - 24:x + 25]
        area = final[y - 36:y + 37, x - 36:x + 37]
        _, score, _, location = cv2.minMaxLoc(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED))
        dx, dy = location[0] - 12, location[1] - 12
        distance = math.hypot(dx, dy)
        records.append(dict(
            id=label, kind=kind, sourcePx1x=[x, y], measured=True,
            displacementPx1x=[dx, dy], distancePx1x=distance, normalizedCorrelation=score,
            reliable=score >= .6, within4px=distance <= 4,
            searchBoundaryHit=abs(dx) == 12 or abs(dy) == 12, walkable=bool(mask[y, x]),
        ))
    confident = [point for point in records if point.get('reliable')]
    failures = [point for point in confident if not point['within4px']]
    report = dict(
        thresholdPx1x=4, totalProbes=len(records), reliableProbes=len(confident),
        uncertainProbes=len(records) - len(confident), reliableFailures=len(failures),
        maxReliableDisplacementPx1x=max((point['distancePx1x'] for point in confident), default=None),
        allReliableProbesWithin4px=bool(confident) and not failures,
        wholeStructureWithin4pxVerified=False, inGameTested=False,
        method='Z1 DoG sigma1.5/6, template49x49, NCC search +/-12 map1x px, correlation>=0.6. Final decoded WebP downsampled with Lanczos. Upstream fixed landmarks plus west owner-mask contours sampled every80 pixels. All probes retained.',
        walkmask=dict(file='src/town-owner-walkmask-west.js', sha256=sha(ROOT / 'src/town-owner-walkmask-west.js'),
                      cellWorldUnits=8, cellMapPx1x=[8 * 4915 / 3840, 8 * 3277 / 2560],
                      walkableCells=27328, baselineMaskUnchanged=True),
        limitations=[
            'Owner-mask grid cells span about10.24 map pixels. Semantic4px outlines need image inspection.',
            'Texture, removed objects and repeated stair treads can produce ambiguous NCC matches.',
            'Full plaza, stair, cliff, bank and bridge contours and stair counts remain unresolved.',
        ],
        probes=records,
    )
    write_json(O / 'structure.json', report)
    overlay = np.array(new.resize(old.size, Image.Resampling.LANCZOS))
    overlay[edge > 0] = (.5 * overlay[edge > 0] + .5 * np.array([0, 235, 255])).astype(np.uint8)
    panel = Image.fromarray(overlay).resize((1966, 1311), Image.Resampling.LANCZOS)
    draw = ImageDraw.Draw(panel)
    for point in records:
        x, y = (round(value * .4) for value in point['sourcePx1x'])
        color = '#e6c34f'
        if point.get('reliable'):
            color = '#26de9d' if point['within4px'] else '#ff3355'
        draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=color)
    sheet = Image.new('RGB', (1966, 1361), '#151923')
    sheet.paste(panel, (0, 50))
    ImageDraw.Draw(sheet).text((12, 12), 'West v7 + owner mask(cyan); green <=4px, red >4px, yellow unresolved. Offline.', font=FONT, fill='white')
    sheet.save(O / 'structure-check.jpg', quality=93, subsampling=0)
    print('structure', len(confident), '/', len(records), 'reliable', len(failures), 'over4px', flush=True)
    return report


def metric(image):
    gray = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2GRAY).astype(np.float64)
    highpass = gray - cv2.GaussianBlur(gray, (0, 0), 1)
    # FFT in a fixed centre window, same footprint for both versions.
    height, width = gray.shape
    roi = gray[max(0, height // 2 - 256):min(height, height // 2 + 256),
               max(0, width // 2 - 256):min(width, width // 2 + 256)]
    window = np.outer(np.hanning(roi.shape[0]), np.hanning(roi.shape[1]))
    power = np.abs(np.fft.fft2((roi - roi.mean()) * window)) ** 2
    frequency = np.hypot(np.fft.fftfreq(roi.shape[0])[:, None], np.fft.fftfreq(roi.shape[1])[None, :])
    return dict(
        laplacianVariance=float(cv2.Laplacian(gray, cv2.CV_64F, ksize=1).var()),
        highPassMeanSquare=float(np.mean(highpass ** 2)),
        fftHighFrequencyFraction=float(power[frequency >= .25].sum() / max(power.sum(), 1e-12)),
    )


def sharpness(old, new):
    chunks = []
    for row in range(1, 5):
        for col in range(1, 6):
            x, y = (col - 1) * 1024, (row - 1) * 1024
            box = (x, y, min(x + 1024, 4915), min(y + 1024, 3277))
            size = (round((box[2] - x) * GAME_X), round((box[3] - y) * GAME_Y))
            v1 = metric(old.crop(box).resize(size, Image.Resampling.LANCZOS))
            v7 = metric(new.crop(tuple(value * 2 for value in box)).resize(size, Image.Resampling.LANCZOS))
            chunks.append(dict(
                chunk=f'r{row}-c{col}', rectPx1x=list(box), deviceSize=list(size), v1=v1, v7=v7,
                ratioToV1={key: v7[key] / max(v1[key], 1e-12) for key in v1},
            ))
    report = dict(
        devicePxPerWorldUnit=2.8,
        method='Decoded lossy output vs west v1 baseline. Identical Lanczos game scale. Laplacian ksize1 and highpass sigma1 on full chunks. Hann FFT >=0.25 cycles/device pixel in centre512 window.',
        limitations='Texture, contrast and object removal affect these diagnostics. Ratios describe image frequencies.',
        chunks=chunks,
    )
    write_json(O / 'sharpness.json', report)


def visual_evidence(old, new):
    for directory in ['seam-check', 'compare-zoom']:
        (O / directory).mkdir(exist_ok=True)
    # Exactly native 2x pixels, complete edge length, no hidden/resized strip sections.
    seam_metrics = []
    boundaries = [('vertical', range(2048, FULL[0], 2048)),
                  ('horizontal', range(2048, FULL[1], 2048))]
    for axis, locations in boundaries:
        for location in locations:
            if axis == 'vertical':
                box = (location - 160, 0, location + 160, FULL[1])
                scale_x, scale_y = GAME_Y / 2, GAME_X / 2
            else:
                box = (0, location - 160, FULL[0], location + 160)
                scale_x, scale_y = GAME_X / 2, GAME_Y / 2
            strip = new.crop(box)
            strip.save(O / f'seam-check/{axis}-{location}.jpg', quality=96, subsampling=0)
            # Complete edge at actual game zoom, folded into <=2048px-long sections.
            # Vertical strips are rotated, preserving every source pixel and scale.
            folded = strip.transpose(Image.Transpose.ROTATE_90) if axis == 'vertical' else strip
            sections = math.ceil(folded.width / 2048)
            cell_height = round(folded.height * scale_y) + 36
            sheet = Image.new('RGB', (round(2048 * scale_x), sections * cell_height + 40), '#151923')
            draw = ImageDraw.Draw(sheet)
            draw.text((8, 8), f'{axis} edge{location}, 2.8px/world, view100%, consecutive sections', font=FONT, fill='white')
            for index in range(sections):
                start, end = index * 2048, min((index + 1) * 2048, folded.width)
                piece = folded.crop((start, 0, end, folded.height))
                piece = piece.resize((round(piece.width * scale_x), round(piece.height * scale_y)), Image.Resampling.LANCZOS)
                label = f'section{index+1}/{sections}, source2x along-edge pixels{start}..{end}'
                draw.text((8, 40 + index * cell_height), label, font=FONT, fill='white')
                sheet.paste(piece, (0, 70 + index * cell_height))
            sheet.save(O / f'seam-check/{axis}-{location}-game.jpg', quality=95, subsampling=0)
            pixels = np.array(strip).astype(np.float32)
            if axis == 'horizontal':
                pixels = pixels.transpose(1, 0, 2)
            differences = np.mean(np.abs(np.diff(pixels, axis=1)), axis=2)
            exact = float(differences[:, 159].mean())
            nearby = float(np.concatenate([differences[:, 140:155], differences[:, 165:180]], axis=1).mean())
            seam_metrics.append(dict(
                axis=axis, coordinatePx2x=location, stripRectPx2x=list(box),
                meanAdjacentRGBAtChunkEdge=exact, meanAdjacentRGBNearby=nearby,
                ratio=exact / max(nearby, 1e-9),
            ))
    write_json(O / 'seam-check/metrics.json', dict(
        nativeScale=2, fullLengthStrips=7,
        method='Mean adjacent decoded RGB difference at exported chunk boundary vs nearby columns/rows. Adaptive seam paths are recorded in seams.json.',
        seams=seam_metrics,
    ))
    new.resize((1920, 1280), Image.Resampling.LANCZOS).save(O / 'overview.jpg', quality=93, subsampling=0)
    rois = {
        'main-plaza': [2160, 1050, 2810, 1620], 'central-bridge': [2290, 1820, 2640, 2580],
        'west-cliffs': [1040, 1270, 1650, 1800], 'east-bank': [3980, 880, 4600, 1410],
        'north-stairs': [300, 280, 800, 950], 'south-plaza': [2130, 2600, 2820, 3090],
    }
    for label, box in rois.items():
        size = (round((box[2] - box[0]) * GAME_X), round((box[3] - box[1]) * GAME_Y))
        left = old.crop(box).resize(size, Image.Resampling.LANCZOS)
        right = new.crop(tuple(value * 2 for value in box)).resize(size, Image.Resampling.LANCZOS)
        sheet = Image.new('RGB', (size[0] * 2 + 36, size[1] + 54), '#151923')
        sheet.paste(left, (12, 54))
        sheet.paste(right, (size[0] + 24, 54))
        caption = f'{label} -- west v1 | v7, 2.8 device px/world unit, view100%'
        ImageDraw.Draw(sheet).text((12, 12), caption, font=FONT, fill='white')
        sheet.save(O / f'compare-zoom/{label}.jpg', quality=95, subsampling=0)
    write_json(O / 'compare-zoom/rois.json', dict(
        rectFormat='[x0,y0,x1,y1], map1x', devicePxPerWorldUnit=2.8,
        devicePxPerMapPixel=[GAME_X, GAME_Y], rois=rois, inGameTested=False, spriteOverlays=False,
    ))
    directory = O / 'fallback-check'
    directory.mkdir(exist_ok=True)
    for patch in json.loads((O / 'inventory.json').read_text())['fallbackPatches']:
        box = patch['contextRectPx1x']
        size = (round((box[2] - box[0]) * GAME_X), round((box[3] - box[1]) * GAME_Y))
        sheet = Image.new('RGB', (size[0] * 2 + 24, size[1] + 44), '#151923')
        sheet.paste(old.crop(box).resize(size, Image.Resampling.LANCZOS), (0, 44))
        sheet.paste(new.crop(tuple(value * 2 for value in box)).resize(size, Image.Resampling.LANCZOS), (size[0] + 24, 44))
        ImageDraw.Draw(sheet).text((8, 8), patch['id'] + ' -- west v1 | final v7, 2.8px/world', font=FONT, fill='white')
        sheet.save(directory / (patch['id'] + '.jpg'), quality=95, subsampling=0)


def validate_files():
    manifest = json.loads((O / 'v7/manifest.json').read_text())
    assert manifest['fullPx'] == dict(w=9830, h=6554)
    assert manifest['chunk'] == 2048 and manifest['repairs'] is False
    assert manifest['zone'] == 'west' and manifest['imageGenCalls'] == 0
    expected = {f'r{row}-c{col}.webp': (1638 if col == 5 else 2048, 410 if row == 4 else 2048)
                for row in range(1, 5) for col in range(1, 6)}
    expected['zone3-terrain-v7-preview.webp'] = (1536, 1024)
    assert {p.name for p in (O / 'v7').iterdir()} == set(expected) | {'manifest.json'}
    assert len(manifest['files']) == 21
    assert {item['file'] for item in manifest['files']} == set(expected)
    assert manifest['imageBytes'] == sum(item['bytes'] for item in manifest['files'])
    for item in manifest['files']:
        path = O / 'v7' / item['file']
        with Image.open(path) as image:
            image.load()
            assert image.format == 'WEBP'
            assert image.size == expected[item['file']] == (item['width'], item['height'])
        assert path.stat().st_size == item['bytes'] and sha(path) == item['sha256']
        if 'rectPx2x' in item:
            row, col = map(int, re.fullmatch(r'r(\d)-c(\d).webp', item['file']).groups())
            assert item['rectPx2x'] == [(col - 1) * 2048, (row - 1) * 2048,
                                       item['width'], item['height']]
    pack_bytes = sum(path.stat().st_size for path in (O / 'v7').iterdir())
    assert pack_bytes <= 40_000_000
    inventory = json.loads((O / 'inventory.json').read_text())
    copied = inventory['copiedFiles']
    assert len({item['local'] for item in copied}) == len(copied)
    for item in copied:
        local = O / item['local']
        assert sha(local) == item['sha256']
        assert local.stat().st_size == item['bytes']
        assert sha(Path(item['source'])) == item['sha256']
    for chunk, parts in inventory['chunks'].items():
        registration = O / parts[0]['registrationFile']
        assert normalize(chunk, registration) == parts
    for item in inventory['baselineInputs']:
        assert sha(ROOT / item['path']) == item['sha256']
    for item in inventory['upstreamBaselineChecks']:
        assert sha(Path(item['source'])) == sha(ROOT / item['current']) == item['sha256']
    assert len(inventory['upstreamBaselineChecks']) == 105
    native_count = sum(len(parts) for parts in inventory['chunks'].values())
    assert native_count == 70 and len(inventory['chunks']) == 20
    coverage = json.loads((O / 'coverage.json').read_text())['parts']
    assert {(p['chunk'], p['id']) for p in coverage} == {
        (chunk, part['id']) for chunk, parts in inventory['chunks'].items() for part in parts}
    seams = json.loads((O / 'seams.json').read_text())['seams']
    expected_seams = {f'r{r}-c{c}/q1-vertical' for r in range(1, 5) for c in range(1, 6)}
    expected_seams |= {f'r{r}-c{c}/{axis}' for r in range(1, 4) for c in range(1, 6)
                       for axis in ['q2-vertical', 'q-horizontal']}
    expected_seams |= {f'chunk-r{r}-c{c}-c{c+1}' for r in range(1, 5) for c in range(1, 5)}
    expected_seams |= {f'chunk-r{r}-r{r+1}' for r in range(1, 4)}
    assert manifest['fallbackPatches'] == inventory['fallbackPatches']
    for patch in inventory['fallbackPatches']:
        expected_seams |= {'fallback/' + patch['id'] + '/' + side for side in ['left', 'right', 'top', 'bottom']}
        x0, y0, x1, y1 = patch['core']
        assert patch['contextRectPx1x'] == [x0 - 48, y0 - 48, x1 + 48, y1 + 48]
    assert len(seams) == len(expected_seams) and {item['id'] for item in seams} == expected_seams
    for item in seams:
        path = np.array(item['pathInOverlapOutputPx'])
        assert item['overlapOutputPx'] == (96 if item['id'].startswith('fallback/') else 256)
        assert path.size > 0 and np.all(np.abs(np.diff(path)) <= 1)
        assert path.min() >= 10 and path.max() < item['overlapOutputPx'] - 10
        assert item['correctionAbsMax'] <= 8.00001
        assert item['featherRadiusOutputPx'] == 8
    return dict(v7Bytes=pack_bytes, v7MBDecimal=pack_bytes / 1_000_000,
                copiedFiles=len(copied), nativeCount=native_count, sourceHashesUnchanged=True,
                shippingImages=21, chunkCount=20, minCostJoins=len(seams))


def validate():
    result = validate_files()
    old, new = baseline(), decoded_master()
    report = structure(old, new)
    sharpness(old, new)
    visual_evidence(old, new)
    decoded = 0
    for path in O.rglob('*'):
        if path.suffix in {'.webp', '.jpg'}:
            with Image.open(path) as image:
                image.load()
                decoded += 1
        if path.suffix == '.json':
            json.loads(path.read_text())
    assert len(list((O / 'seam-check').glob('*-game.jpg'))) == 7
    assert len(list((O / 'seam-check').glob('*.jpg'))) == 14
    assert len(list((O / 'compare-zoom').glob('*.jpg'))) == 6
    assert (O / 'README.md').is_file()
    result.update(
        fileChecksSucceeded=True, imagesDecoded=decoded, imageGenCalls=0, inGameTested=False,
        structureReliableFailures=report['reliableFailures'], structureUncertain=report['uncertainProbes'],
        acceptance=[
            dict(id=1, verified=True, evidence='20 chunks, preview, dimensions, WebP decode, SHA256, exact grid and <=40MB checked.'),
            dict(id=2, verified=False, evidence='Offline full-length seam strips and game-scale comparisons supplied. Whole-contour structure and in-game seams remain unresolved.',
                 reliableProbeFailures=report['reliableFailures']),
            dict(id=3, verified=True, evidence='Thai README records fallback usage, upstream defects, visual findings and ImageGen0.'),
        ],
    )
    write_json(O / 'verification.json', result)
    print(json.dumps(result, ensure_ascii=False, indent=2), flush=True)
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--acceptance', action='store_true', help='Exit2 when full acceptance remains unresolved.')
    arguments = parser.parse_args()
    result = validate()
    if arguments.acceptance and not all(item['verified'] for item in result['acceptance']):
        sys.exit(2)
