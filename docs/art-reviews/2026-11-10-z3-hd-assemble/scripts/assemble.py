"""Assemble west native contexts into one 2x atlas, then export the review pack.

Adapted from Z1 assembly at 8c8f339f. Writes only under this review directory.
Pillow, numpy and OpenCV are required. No generation or runtime modifications.
"""
from pathlib import Path
import hashlib
import json
import re
import shutil

import cv2
import numpy as np
from PIL import Image, ImageDraw

O = Path(__file__).resolve().parents[1]
ROOT = O.parents[2]
SOURCE_ROOT = Path('/Users/agapae/agapae-work/.codex-worktrees')
RUNS = [
    '20261113T141012Z-41d14972',
    '20261113T141038Z-9feab6b8',
    '20261114T014100Z-71f476be',
    '20261113T141806Z-4c0979f5',
    '20261114T034436Z-e914d4a6',
]
FULL = (9830, 6554)
SEAMS = []
STRUCTURE_FALLBACKS = [dict(
    id='central-bridge-head', core=[2350, 1855, 2575, 2120],
    reason='r2-c3 removes upper stair posts while r3-c3 retains lower shafts. The assembled bridge shows severed posts. Preserve original stair and post silhouettes with west v1.',
)]
cv2.setNumThreads(2)


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def baseline():
    image = Image.new('RGB', (4915, 3277))
    for row in range(1, 5):
        for col in range(1, 6):
            path = ROOT / f'img/map-zone3/v1/r{row}-c{col}.webp'
            with Image.open(path) as tile:
                expected = (819 if col == 5 else 1024, 205 if row == 4 else 1024)
                assert tile.size == expected, path
                image.paste(tile, ((col - 1) * 1024, (row - 1) * 1024))
    return image


def rect(value, xywh=False):
    x, y, a, b = value
    return [x, y, x + a, y + b] if xywh else list(value)


def normalize(chunk, path):
    """Normalize all three upstream schemas to exclusive global 1x rectangles."""
    data = json.loads(path.read_text())
    entries = data.get('tiles', data.get('parts'))
    if isinstance(entries, dict):
        entries = [dict(value, id=key) for key, value in entries.items()]
    row, col = map(int, re.fullmatch(r'r(\d)-c(\d)', chunk).groups())
    expected_core = [(col - 1) * 1024, (row - 1) * 1024,
                     min(col * 1024, 4915), min(row * 1024, 3277)]
    declared_core = data.get('chunkRectPx1x')
    if 'chunkMasterPx1x' in data:
        declared_core = rect(data['chunkMasterPx1x'], xywh=True)
    assert declared_core == expected_core, (chunk, declared_core, expected_core)
    result = []
    for tile in entries:
        tid = tile.get('id', tile.get('part'))
        assert tid in {'q11', 'q12', 'q21', 'q22'}, (chunk, tid)
        xywh = 'coreMasterPx1x' in tile
        core = rect(tile['coreMasterPx1x'] if xywh else tile['coreRectPx1x'], xywh)
        context = rect(tile['contextMasterPx1x'] if xywh else tile['contextRectPx1x'], xywh)
        matrix = np.asarray(tile.get('nativePixelToContextPx1x', tile.get('nativeToContextPx1x')), dtype=np.float64)
        assert matrix.shape == (2, 3) and np.isfinite(matrix).all()
        assert np.linalg.det(matrix[:, :2]) > 0
        global_matrix = matrix.copy()
        global_matrix[:, 2] += context[:2]
        declared_global = tile.get('nativePixelToMasterPx1x',
                                  tile.get('nativeToMapPx1x', tile.get('nativeToMasterPx1x')))
        assert declared_global is not None
        assert np.allclose(global_matrix, declared_global, atol=1e-7, rtol=0), (chunk, tid)
        native = path.parent / f'{tid}-native.webp'
        size = tile.get('nativeSize', tile.get('nativeSizePx'))
        with Image.open(native) as image:
            assert list(image.size) == size, native
        digest = sha(native)
        if 'nativeSHA256' in tile:
            assert digest == tile['nativeSHA256'], native
        assert 0 <= context[0] <= core[0] < core[2] <= context[2] <= 4915
        assert 0 <= context[1] <= core[1] < core[3] <= context[3] <= 3277
        result.append(dict(
            id=tid, chunk=chunk, coreRectPx1x=core, contextRectPx1x=context,
            nativeFile=str(native.relative_to(O)), nativeSize=size, sha256=digest,
            nativeToContextPx1x=matrix.tolist(), nativeToMasterPx1x=global_matrix.tolist(),
            registrationFile=str(path.relative_to(O)), registrationSha256=sha(path),
        ))
    expected_ids = {'q11', 'q12'} if row == 4 else {'q11', 'q12', 'q21', 'q22'}
    assert {tile['id'] for tile in result} == expected_ids
    coverage = np.zeros((expected_core[3] - expected_core[1], expected_core[2] - expected_core[0]), np.uint8)
    for tile in result:
        x0, y0, x1, y1 = tile['coreRectPx1x']
        assert expected_core[0] <= x0 < x1 <= expected_core[2]
        assert expected_core[1] <= y0 < y1 <= expected_core[3]
        coverage[y0 - expected_core[1]:y1 - expected_core[1],
                 x0 - expected_core[0]:x1 - expected_core[0]] += 1
    assert np.all(coverage == 1), chunk
    return sorted(result, key=lambda tile: tile['id'])


def copy_inputs():
    """Keep the exact native and registration bytes locally for repeatable assembly."""
    chunks = {}
    files = []
    baseline_checks = []
    for run in RUNS:
        source = SOURCE_ROOT / run / 'docs/art-reviews/2026-11-10-z3-hd-full'
        destination = O / 'sources' / run
        destination.mkdir(parents=True, exist_ok=True)
        selected = list(source.glob('r*-c*/*-native.webp'))
        for pattern in ['r*-c*/registration.json', 'r*-c*/structure.json',
                        'r*-c*/landmarks.json', 'r*-c*/removed.json',
                        'r*-c*/sift-correspondences.json*', 'README.md',
                        '*inventory.json', '*provenance.json', 'generation-prompts.json',
                        'source-manifest.json', 'layout.json']:
            selected.extend(source.glob(pattern))
        for path in sorted(set(selected)):
            target = destination / path.relative_to(source)
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(path, target)
            assert sha(path) == sha(target)
            files.append(dict(source=str(path), local=str(target.relative_to(O)),
                              bytes=target.stat().st_size, sha256=sha(target)))
        for path in sorted(destination.glob('r*-c*/registration.json')):
            name = path.parent.name
            assert name not in chunks, name
            chunks[name] = normalize(name, path)
        for current in sorted((ROOT / 'img/map-zone3/v1').glob('r*-c*.webp')) + [ROOT / 'src/town-owner-walkmask-west.js']:
            upstream = SOURCE_ROOT / run / current.relative_to(ROOT)
            assert sha(upstream) == sha(current), upstream
            baseline_checks.append(dict(source=str(upstream), current=str(current.relative_to(ROOT)),
                                        sha256=sha(current)))
    assert set(chunks) == {f'r{r}-c{c}' for r in range(1, 5) for c in range(1, 6)}
    assert sum(map(len, chunks.values())) == 70
    baseline_paths = sorted((ROOT / 'img/map-zone3/v1').glob('r*-c*.webp'))
    baseline_paths += [ROOT / 'src/zone-skin.js', ROOT / 'src/town-owner-walkmask-west.js',
                       ROOT / 'src/town-walkmask.js']
    result = dict(
        chunks=chunks, copiedFiles=files, upstreamBaselineChecks=baseline_checks,
        imageGenCalls=0, fallbackParts=[], fallbackPatches=[],
        baselineInputs=[dict(path=str(p.relative_to(ROOT)), sha256=sha(p)) for p in baseline_paths],
        reference=dict(commit='8c8f339f', directory='docs/art-reviews/2026-11-05-z1-v5-hd-assemble',
                       reason='Original reference worktree no longer exists; read original result from Git.'),
    )
    write_json(O / 'inventory.json', result)
    return result


def seam(a, b, start, label):
    """Z1 minimum-cost join with colour compensation confined to the overlap."""
    overlap = a.shape[1] - start
    assert 32 <= overlap <= 260 and a.shape[0] == b.shape[0], (label, a.shape, b.shape, start)
    left = a[:, start:].astype(np.float32)
    right = b[:, :overlap].astype(np.float32)
    delta = cv2.GaussianBlur(left - right, (0, 0), 16)
    taper = np.sin(np.linspace(0, np.pi, overlap, dtype=np.float32))[None, :, None] ** 2
    correction = np.clip(delta * .5, -8, 8) * taper
    left = np.clip(left - correction, 0, 255)
    right = np.clip(right + correction, 0, 255)
    cost = cv2.GaussianBlur(np.mean((left - right) ** 2, axis=2), (5, 5), 0)
    cost[:, :10] = np.inf
    cost[:, -10:] = np.inf
    height, width = cost.shape
    dp = cost.copy()
    back = np.zeros((height, width), np.int8)
    for y in range(1, height):
        previous = np.pad(dp[y - 1], (1, 1), constant_values=np.inf)
        choices = np.stack([previous[:width], previous[1:width + 1], previous[2:]])
        choice = np.argmin(choices, axis=0)
        back[y] = choice - 1
        dp[y] += choices[choice, np.arange(width)]
    path = np.empty(height, np.int32)
    path[-1] = np.argmin(dp[-1])
    for y in range(height - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    alpha = np.clip((np.arange(width)[None, :] - path[:, None] + 8) / 16, 0, 1)
    alpha = alpha * alpha * (3 - 2 * alpha)
    mixed = np.uint8(np.rint(left * (1 - alpha[..., None]) + right * alpha[..., None]))
    SEAMS.append(dict(
        id=label, overlapOutputPx=overlap, pathInOverlapOutputPx=path.tolist(),
        correctionAbsMax=float(np.abs(correction).max()), featherRadiusOutputPx=8,
        meanAbsoluteDifferenceBefore=float(np.mean(np.abs(a[:, start:].astype(np.float32) - b[:, :overlap]))),
        meanAbsoluteDifferenceAfter=float(np.mean(np.abs(left - right))),
    ))
    return np.concatenate([a[:, :start], mixed, b[:, overlap:]], axis=1)


def compose_parts(parts):
    aligned = {}
    coverage = []
    for tile in parts:
        x0, y0, x1, y1 = tile['contextRectPx1x']
        width, height = (x1 - x0) * 2, (y1 - y0) * 2
        with Image.open(O / tile['nativeFile']) as image:
            raw = np.array(image.convert('RGB'))
        matrix = np.array(tile['nativeToContextPx1x']) * 2
        image = cv2.warpAffine(raw, matrix, (width, height),
                               flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT_101)
        valid = cv2.warpAffine(np.ones(raw.shape[:2], np.uint8), matrix, (width, height),
                               flags=cv2.INTER_NEAREST, borderMode=cv2.BORDER_CONSTANT)
        cx0, cy0, cx1, cy1 = tile['coreRectPx1x']
        core_valid = valid[(cy0 - y0) * 2:(cy1 - y0) * 2, (cx0 - x0) * 2:(cx1 - x0) * 2]
        coverage.append(dict(id=tile['id'], chunk=tile['chunk'],
                             reflectedContextPixels2x=int(np.count_nonzero(valid == 0)),
                             reflectedCorePixels2x=int(np.count_nonzero(core_valid == 0))))
        aligned[tile['id']] = (image, (x0 * 2, y0 * 2))
    rows = []
    for row in [1, 2]:
        first, second = f'q{row}1', f'q{row}2'
        if first not in aligned:
            continue
        a, origin_a = aligned[first]
        b, origin_b = aligned[second]
        assert origin_a[1] == origin_b[1]
        rows.append((seam(a, b, origin_b[0] - origin_a[0],
                          parts[0]['chunk'] + f'/q{row}-vertical'), origin_a))
    a, origin_a = rows[0]
    if len(rows) == 2:
        b, origin_b = rows[1]
        assert origin_a[0] == origin_b[0]
        a = seam(a.transpose(1, 0, 2), b.transpose(1, 0, 2), origin_b[1] - origin_a[1],
                 parts[0]['chunk'] + '/q-horizontal').transpose(1, 0, 2)
    return a, origin_a, coverage


def restore_structure(atlas, base):
    """Z1 four-sided perimeter masks preserve the original architecture in the core."""
    patches = []
    for definition in STRUCTURE_FALLBACKS:
        x0, y0, x1, y1 = definition['core']
        box = [x0 - 48, y0 - 48, x1 + 48, y1 + 48]
        x, y, ex, ey = [value * 2 for value in box]
        assert 0 <= x < ex <= FULL[0] and 0 <= y < ey <= FULL[1]
        current = atlas[y:ey, x:ex].copy()
        reference = np.array(base.crop(box).resize((ex - x, ey - y), Image.Resampling.LANCZOS))
        height, width = current.shape[:2]
        alpha = np.ones((height, width), np.float32)
        for side in ['left', 'right', 'top', 'bottom']:
            first, second = current, reference
            if side in ['top', 'bottom']:
                first = first.transpose(1, 0, 2)
                second = second.transpose(1, 0, 2)
            offset = 0 if side in ['left', 'top'] else first.shape[1] - 96
            seam(first[:, offset:offset + 96], second[:, offset:offset + 96], 0,
                 'fallback/' + definition['id'] + '/' + side)
            SEAMS[-1]['usage'] = 'Perimeter path only. Final mask mixes original colours without compensation.'
            path = np.array(SEAMS[-1]['pathInOverlapOutputPx']) + offset
            weight = np.clip((np.arange(first.shape[1])[None, :] - path[:, None] + 8) / 16, 0, 1)
            weight = weight * weight * (3 - 2 * weight)
            if side in ['right', 'bottom']:
                weight = 1 - weight
            if side in ['top', 'bottom']:
                weight = weight.T
            alpha *= weight
        atlas[y:ey, x:ex] = np.uint8(np.rint(current * (1 - alpha[..., None]) + reference * alpha[..., None]))
        patch = dict(definition, contextRectPx1x=box,
                     effectiveFallbackPixels2x=int(np.count_nonzero(alpha)),
                     method='West v1 Lanczos2x, min-cost perimeter in48 map px ring, feather +/-8 output px.')
        patches.append(patch)
        # Preserve before-repair evidence for the exact selected context.
        directory = O / 'structure-detail'
        directory.mkdir(exist_ok=True)
        sheet = Image.new('RGB', (width * 2 + 16, height + 40), '#151923')
        sheet.paste(Image.fromarray(reference), (0, 40))
        sheet.paste(Image.fromarray(current), (width + 16, 40))
        ImageDraw.Draw(sheet).text((8, 10), 'West v1 | assembled native before structure fallback, map2x', fill='white')
        sheet.save(directory / (definition['id'] + '-before.jpg'), quality=95, subsampling=0)
        print('restored structure', definition['id'], flush=True)
    return patches


def assemble():
    (O / 'v7').mkdir(exist_ok=True)
    SEAMS.clear()
    inventory = copy_inputs()
    chunks = inventory['chunks']
    atlas = None
    coverage = []
    for row_number in range(1, 5):
        row = None
        for col in range(1, 6):
            chunk = f'r{row_number}-c{col}'
            image, position, validity = compose_parts(chunks[chunk])
            coverage.extend(validity)
            if row is None:
                row, row_origin = image, position
            else:
                assert row_origin[1] == position[1]
                row = seam(row, image, position[0] - row_origin[0], f'chunk-r{row_number}-c{col-1}-c{col}')
            print('assembled', chunk, image.shape, flush=True)
        if atlas is None:
            atlas, origin = row, row_origin
        else:
            assert origin[0] == row_origin[0]
            atlas = seam(atlas.transpose(1, 0, 2), row.transpose(1, 0, 2), row_origin[1] - origin[1],
                         f'chunk-r{row_number-1}-r{row_number}').transpose(1, 0, 2)
    assert origin == (0, 0) and atlas.shape == (FULL[1], FULL[0], 3)
    patches = restore_structure(atlas, baseline())
    inventory['fallbackPatches'] = patches
    write_json(O / 'inventory.json', inventory)
    files = []
    for row in range(1, 5):
        for col in range(1, 6):
            x, y = (col - 1) * 2048, (row - 1) * 2048
            image = Image.fromarray(atlas[y:min(y + 2048, FULL[1]), x:min(x + 2048, FULL[0])])
            path = O / f'v7/r{row}-c{col}.webp'
            image.save(path, quality=90, method=6)
            files.append(dict(file=path.name, width=image.width, height=image.height,
                              bytes=path.stat().st_size, sha256=sha(path),
                              rectPx2x=[x, y, image.width, image.height]))
            print('exported', path.name, path.stat().st_size, flush=True)
    preview = O / 'v7/zone3-terrain-v7-preview.webp'
    Image.fromarray(atlas).resize((1536, 1024), Image.Resampling.LANCZOS).save(preview, quality=90, method=6)
    files.append(dict(file=preview.name, width=1536, height=1024,
                      bytes=preview.stat().st_size, sha256=sha(preview)))
    manifest = dict(
        zone='west', version=7, fullPx=dict(w=9830, h=6554), chunk=2048, rows=4, cols=5,
        worldSize=dict(w=3840, h=2560), format='webp', quality=90, repairs=False,
        preview=preview.name, imageGenCalls=0, fallbackParts=[], fallbackPatches=patches,
        runtimeIntegration='Select this directory with fullPx=9830x6554, chunk=2048, repairs=false.',
        files=files, imageBytes=sum(item['bytes'] for item in files), limitBytes=40_000_000,
    )
    write_json(O / 'v7/manifest.json', manifest)
    write_json(O / 'coverage.json', dict(
        borderMode='REFLECT_101 for samples outside transformed native support', parts=coverage,
        note='Counts describe warped inputs before seam selection, not exact final pixel provenance.',
    ))
    write_json(O / 'seams.json', dict(
        reference='8c8f339f Z1 scripts/assemble.py seam and compose_parts',
        method='Squared RGB difference Gaussian5, DP +/-1, smoothstep feather +/-8 output px. Symmetric Gaussian16 colour compensation <=8 RGB per side only in overlap, tapered to zero at ends.',
        seams=SEAMS,
    ))
    print('image bytes', manifest['imageBytes'], flush=True)


if __name__ == '__main__':
    assemble()
