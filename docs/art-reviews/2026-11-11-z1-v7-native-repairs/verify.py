"""Rebuild local crop evidence and validate decoded repair exports.

Run from any directory with Python, Pillow, numpy, scipy and OpenCV.
Only this delivery directory is written. No full atlas is assembled.
The previous assembly's baseline() is reused with its input hashes checked.
"""
from pathlib import Path
import hashlib
import importlib.util
import json
import math
import re
import sys

sys.dont_write_bytecode = True

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import find_peaks

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
INPUTS = json.loads((OUT / 'inputs.json').read_text())
ASSEMBLY = Path(INPUTS['sourceAssembly'])
FONT = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 13)
cv2.setNumThreads(2)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')


def band(image):
    gray = cv2.cvtColor(np.asarray(image), cv2.COLOR_RGB2GRAY).astype(np.float32)
    return cv2.GaussianBlur(gray, (0, 0), .8) - cv2.GaussianBlur(gray, (0, 0), 3)


def measure(reference, registered, probes, origin, radius=10):
    """Keep every supplied probe, including low-confidence and boundary cases."""
    a, b = band(reference), band(registered)
    records = []
    for probe in probes:
        x, y = probe['contextPx1x']
        search = 12
        if min(x, y, a.shape[1]-1-x, a.shape[0]-1-y) < radius + search:
            records.append({**probe, 'result': 'insufficient-context'})
            continue
        template = a[y-radius:y+radius+1, x-radius:x+radius+1]
        area = b[y-radius-search:y+radius+search+1, x-radius-search:x+radius+search+1]
        _, score, _, location = cv2.minMaxLoc(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED))
        dx, dy = location[0]-search, location[1]-search
        records.append({**probe, 'masterPx1x': [x+origin[0], y+origin[1]],
                        'displacementPx1x': [dx, dy], 'distancePx1x': math.hypot(dx, dy),
                        'ncc': score, 'reliable': score >= .6,
                        'nccAtZeroDisplacement': float(cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED)[search, search]),
                        'templateSizePx1x': radius*2+1,
                        'within4px': math.hypot(dx, dy) <= 4,
                        'searchBoundaryHit': abs(dx) == search or abs(dy) == search,
                        'result': 'measured'})
    return records


def atlas_crop(box):
    """Decode only intersecting shipping chunks, preserving their exact pixels."""
    x0, y0, x1, y1 = box
    result = Image.new('RGB', (x1-x0, y1-y0))
    sources = []
    for row in range(y0//2048, (y1-1)//2048+1):
        for col in range(x0//2048, (x1-1)//2048+1):
            path = ASSEMBLY / f'v7/r{row+1}-c{col+1}.webp'
            manifest = json.loads((ASSEMBLY/'v7/manifest.json').read_text())
            entry = next(f for f in manifest['files'] if f['file'] == path.name)
            assert sha(path) == entry['sha256'], str(path)
            image = Image.open(path).convert('RGB')
            result.paste(image, (col*2048-x0, row*2048-y0))
            sources.append({'path': str(path), 'sha256': sha(path)})
    return result, sources


def save_pair(path, left, right, title):
    assert left.size == right.size
    width, height = left.size
    sheet = Image.new('RGB', (width*2, height+34), '#151923')
    sheet.paste(left, (0, 34))
    sheet.paste(right, (width, 34))
    ImageDraw.Draw(sheet).text((8, 8), title, font=FONT, fill='white')
    sheet.save(path, quality=95, subsampling=0)


def stair_profile(image, definition):
    start, end = np.array(definition['start']), np.array(definition['end'])
    fractions = np.linspace(0, 1, round(np.linalg.norm(end-start)*4))
    centres = start + fractions[:, None]*(end-start)
    offsets = np.linspace(-14, 14, 29)
    x = np.float32(centres[:, 0, None]+offsets)
    y = np.float32(centres[:, 1, None]+offsets*definition['treadSlope'])
    gray = np.float32(image.convert('L'))
    profile = cv2.remap(gray, x, y, cv2.INTER_LINEAR).mean(axis=1)
    smooth = cv2.GaussianBlur(profile[:, None], (1, 0), 2)[:, 0]
    peaks, _ = find_peaks(-smooth, distance=24, prominence=10)
    return centres[peaks].tolist()


def fx_overlay(item, registered, layout):
    """Position actual coverage masks, with diagnostic colours at their true alpha."""
    x, y, width, height = item['context']
    result = np.asarray(registered).astype(np.float32).copy()
    records = []
    groups = [('water', ['ice', 'waterfall', 'foam'], [0, 220, 255]),
              ('cloud', ['cloud'], [255, 70, 210]),
              ('lava', ['lava'], [255, 195, 0])]
    for label, families, colour in groups:
        coverage = np.zeros((height, width), np.uint8)
        for piece in layout['pieces']:
            if piece.get('off') or piece['group'] not in families:
                continue
            mx, my, mw, mh = piece['maskRectPx']
            ix0, iy0 = max(x, mx), max(y, my)
            ix1, iy1 = min(x+width, mx+mw), min(y+height, my+mh)
            if ix0 >= ix1 or iy0 >= iy1:
                continue
            mask_path = ROOT / 'img/map-zone1/v5-fx/masks' / (piece['mask']+'.webp')
            image = Image.open(mask_path)
            assert image.size == (mw, mh)
            mask = np.array(image.getchannel('A') if 'A' in image.getbands() else image.convert('L'))
            crop = mask[iy0-my:iy1-my, ix0-mx:ix1-mx]
            region = coverage[iy0-y:iy1-y, ix0-x:ix1-x]
            np.maximum(region, crop, out=region)
            records.append({'id': piece['id'], 'group': label, 'kind': piece['kind'],
                            'maskRectPx1x': piece['maskRectPx'], 'intersectionPx1x': [ix0, iy0, ix1-ix0, iy1-iy0],
                            'mask': str(mask_path.relative_to(ROOT)), 'maskSha256': sha(mask_path),
                            'nonzeroIntersectionPixels': int(np.count_nonzero(crop)),
                            'opacity': piece['opacity'], 'blend': piece['blend']})
        Image.fromarray(coverage).save(OUT/item['id']/f'fx-{label}-coverage.png')
        alpha = cv2.resize(coverage, registered.size, interpolation=cv2.INTER_NEAREST)[..., None]/255*.42
        result = result*(1-alpha)+np.array(colour)*alpha
    overlay = Image.fromarray(np.uint8(np.rint(result)))
    cx, cy, cw, ch = item['core']
    ImageDraw.Draw(overlay).rectangle(((cx-x)*2, (cy-y)*2, (cx-x+cw)*2-1, (cy-y+ch)*2-1), outline='white', width=2)
    save_pair(OUT/item['id']/'fx-overlay.jpg', registered, overlay,
              'REGISTERED | FX coverage: water cyan, cloud pink, lava gold; core white; map 2x')
    return records


def main():
    assert sha(ASSEMBLY/'inventory.json') == INPUTS['sourceInventorySha256']
    assert sha(ASSEMBLY/'structure.json') == INPUTS['sourceStructureSha256']
    for source in INPUTS['baselineInputs']:
        assert sha(ROOT/source['path']) == source['sha256'], source['path']
    source_manifest = json.loads((ASSEMBLY/'v7/manifest.json').read_text())
    for entry in source_manifest['files']:
        path = ASSEMBLY/'v7'/entry['file']
        assert sha(path) == entry['sha256'] and path.stat().st_size == entry['bytes']
        with Image.open(path) as image:
            image.load()
            assert image.size == (entry['width'], entry['height'])
    assert len([f for f in source_manifest['files'] if re.fullmatch(r'r\d-c\d.webp', f['file'])]) == 20
    spec = importlib.util.spec_from_file_location('previous_assembly', ASSEMBLY/'scripts/assemble.py')
    previous = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(previous)
    previous.ROOT = ROOT
    base = previous.baseline()
    structure = json.loads((ASSEMBLY/'structure.json').read_text())
    definitions = json.loads((OUT/'landmarks.json').read_text())
    layout_path = ROOT/'img/map-zone1/v5-fx/fx-layout.json'
    layout = json.loads(layout_path.read_text())
    assert layout['masterSize'] == [4915, 3277] and layout['worldSize'] == [3840, 2560]
    masks = json.loads(re.search(r'TOWN_WALK_RUNS=(\[.*?\]);', (ROOT/'src/town-walkmask.js').read_text()).group(1))
    walk = np.repeat(np.arange(len(masks)) % 2, masks).astype(np.uint8).reshape(320, 480)
    walk = cv2.resize(walk, base.size, interpolation=cv2.INTER_NEAREST)
    walk_edge = cv2.morphologyEx(walk, cv2.MORPH_GRADIENT, np.ones((3, 3), np.uint8))
    summaries = []
    for item in INPUTS['items']:
        name = item['id']
        directory = OUT/name
        x, y, width, height = item['context']
        cx, cy, cw, ch = item['core']
        reference = Image.open(directory/'reference.png').convert('RGB')
        expected = base.crop((x, y, x+width, y+height))
        assert np.array_equal(np.asarray(reference), np.asarray(expected)), name+' baseline reference'
        native = Image.open(directory/'native.webp').convert('RGB')
        generation = json.loads((directory/'generation.json').read_text())
        assert sha(directory/'native.webp') == generation['nativeSha256']
        assert list(native.size) == generation['generatedSize']
        original_path = Path(generation['generatedSource'])
        assert sha(original_path) == generation['generatedSourceSha256']
        assert np.array_equal(np.asarray(native), np.asarray(Image.open(original_path).convert('RGB')))
        candidate = json.loads((directory/'registration-candidate.json').read_text())
        affine = np.array(candidate['candidateAffine'], dtype=np.float64)
        master = affine.copy()
        master[:, 2] += [x, y]
        assert np.linalg.det(affine[:, :2]) > 0
        registered = Image.fromarray(cv2.warpAffine(np.asarray(native), affine*2, (width*2, height*2),
                                    flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT_101))
        registered.save(directory/'registered-2x.webp', lossless=True)
        assert np.array_equal(np.asarray(registered), np.asarray(Image.open(directory/'registered-2x.webp')))
        decoded = Image.open(directory/'registered-2x.webp').convert('RGB')
        at1x = decoded.resize((width, height), Image.Resampling.BOX)
        # The core must be completely covered by genuine source pixels.
        yy, xx = np.mgrid[(cy-y)*2:(cy-y+ch)*2, (cx-x)*2:(cx-x+cw)*2]
        inverse = cv2.invertAffineTransform(affine*2)
        coords = np.stack([xx, yy, np.ones_like(xx)], axis=-1) @ inverse.T
        core_covered = bool(np.all((coords[..., 0] >= 0) & (coords[..., 0] <= native.width-1)
                            & (coords[..., 1] >= 0) & (coords[..., 1] <= native.height-1)))
        assert core_covered
        semantic = [{'id': label, 'contextPx1x': point, 'kind': 'semantic-landmark'}
                    for label, point in definitions[name]['points']]
        measured = measure(reference, at1x, semantic, [x, y])
        # Local seam preview alone. Feather within the context, preserving all exterior decoded pixels.
        bx0, by0, bx1, by1 = max(0, x-36), max(0, y-36), min(4915, x+width+36), min(3277, y+height+36)
        before, chunk_sources = atlas_crop((bx0*2, by0*2, bx1*2, by1*2))
        local = np.asarray(before).copy()
        py, px = np.mgrid[:height*2, :width*2]
        distance = np.minimum.reduce([px+.5, width*2-px-.5, py+.5])
        if y+height < 3277:
            distance = np.minimum(distance, height*2-py-.5)
        t = np.clip(distance/32, 0, 1)
        alpha = t*t*(3-2*t)
        ox, oy = (x-bx0)*2, (y-by0)*2
        region = local[oy:oy+height*2, ox:ox+width*2]
        region[:] = np.uint8(np.rint(region*(1-alpha[..., None])+np.asarray(decoded)*alpha[..., None]))
        exterior = np.ones(local.shape[:2], bool)
        exterior[oy:oy+height*2, ox:ox+width*2] = False
        exterior_equal = bool(np.array_equal(local[exterior], np.asarray(before)[exterior]))
        assert exterior_equal
        Image.fromarray(local).save(directory/'local-seam-preview.webp', lossless=True)
        local_decoded = Image.open(directory/'local-seam-preview.webp').convert('RGB')
        assert np.array_equal(local, np.asarray(local_decoded))
        save_pair(directory/'overlap-review.jpg', before, local_decoded,
                  'EXISTING v7 | LOCAL PREVIEW, feather 16 map px inside context; exterior unchanged; 2x')
        old_probes = []
        for index, probe in enumerate(structure['probes']):
            gx, gy = probe['sourcePx1x']
            if x <= gx < x+width and y <= gy < y+height:
                old_probes.append({'id': probe['id'], 'sourceProbeIndex': index,
                                   'contextPx1x': [gx-bx0, gy-by0], 'kind': probe['kind']})
        inherited = measure(base.crop((bx0, by0, bx1, by1)),
                            local_decoded.resize((bx1-bx0, by1-by0), Image.Resampling.BOX), old_probes, [bx0, by0])
        resolutions = []
        for definition in definitions[name].get('correspondenceReviews', []):
            is_semantic = definition['probeSet'] == 'semantic'
            source_probes = semantic if is_semantic else old_probes
            probe = next(p for p in source_probes if p['id'] == definition['id'])
            left = reference if is_semantic else base.crop((bx0, by0, bx1, by1))
            right = at1x if is_semantic else local_decoded.resize(left.size, Image.Resampling.BOX)
            origin = [x, y] if is_semantic else [bx0, by0]
            reviewed = measure(left, right, [probe], origin, radius=24)[0]
            resolutions.append({**definition, 'measurement49x49': reviewed})
            sx, sy = probe['contextPx1x']
            panels = [left, right]
            if not is_semantic:
                panels.insert(1, before.resize(left.size, Image.Resampling.BOX))
            sheet = Image.new('RGB', (len(panels)*432, 472), '#151923')
            for index, image in enumerate(panels):
                crop = image.crop((sx-36, sy-36, sx+36, sy+36)).resize((432, 432), Image.Resampling.LANCZOS)
                sheet.paste(crop, (index*432, 40))
                drawing = ImageDraw.Draw(sheet)
                drawing.line((index*432+216, 40, index*432+216, 472), fill='cyan')
                drawing.line((index*432, 256, index*432+432, 256), fill='cyan')
            title = 'V5 | REGISTERED' if is_semantic else 'V5 | EXISTING v7 | LOCAL NEW'
            ImageDraw.Draw(sheet).text((8, 8), f'{probe["id"]}; {title}; 6x map, cyan centre', font=FONT, fill='white')
            sheet.save(directory/definition['evidence'], quality=96, subsampling=0)
        resolution_by_id = {r['id']: r['measurement49x49'] for r in resolutions}
        effective = [resolution_by_id.get(p['id'], p) for p in measured]
        inherited_open = [p for p in inherited if not p.get('reliable') or not p.get('within4px')]
        unresolved_inherited = [p for p in inherited_open if not (
            resolution_by_id.get(p['id'], {}).get('reliable') and resolution_by_id[p['id']]['within4px'])]
        profiles = []
        for definition in definitions[name].get('stairProfiles', []):
            old_peaks = stair_profile(reference, definition)
            new_peaks = stair_profile(at1x, definition)
            distances = [math.dist(a, b) for a, b in zip(old_peaks, new_peaks)]
            profiles.append({**definition, 'referenceRiserCentresPx1x': old_peaks,
                             'registeredRiserCentresPx1x': new_peaks,
                             'sameInteriorRiserCount': len(old_peaks) == len(new_peaks),
                             'maxPairedDisplacementPx1x': max(distances, default=None)})
        points = np.array([p['native'] for p in candidate['inlierPoints']])
        targets = np.array([p['context'] for p in candidate['inlierPoints']])
        residual = np.linalg.norm(np.c_[points, np.ones(len(points))] @ affine.T-targets, axis=1)
        reliable = [p for p in measured if p.get('reliable')]
        metrics = {'method': 'Independent named semantic landmarks, 21x21 DoG .8/3 NCC search +/-12 map1x px, confidence >= .6. All probes retained. Visual outline review supplements these local translation samples.',
                   'thresholdPx1x': 4, 'semanticProbes': measured, 'inheritedProbes': inherited,
                   'semanticProbeCount': len(measured), 'reliableSemanticProbeCount': len(reliable),
                   'semanticMaxDistancePx1x': max(p['distancePx1x'] for p in reliable),
                   'semanticAllWithin4px': len(reliable) == len(measured) and all(p['within4px'] for p in reliable),
                   'reviewedSemanticAllWithin4px': all(p.get('reliable') and p.get('within4px') for p in effective),
                   'reviewedSemanticMaxDistancePx1x': max(p['distancePx1x'] for p in effective),
                   'inheritedExceptions': inherited_open, 'unresolvedInheritedExceptions': unresolved_inherited,
                   'correspondenceReviews': resolutions,
                   'stairProfiles': profiles,
                   'profileMethod': 'Average 29 samples across +/-14 map px, 4 samples/map px along stated interval, Gaussian sigma .5 map px, dark-riser peaks prominence10 grayscale, minimum spacing6 map px. Intervals cover interior risers only.',
                   'registrationResidualDiagnosticOnly': {'matches': candidate['matches'], 'inliers': candidate['inliers'],
                       'medianPx1x': float(np.median(residual)), 'maxPx1x': float(residual.max())},
                   'coreCoveredByNative': core_covered, 'localPreviewExteriorPixelsIdentical': exterior_equal,
                   'limitations': ['Sampled image correspondence does not certify every semantic contour pixel.',
                       'Walkmask grid is about 10.24 map px and cannot resolve a 4px art tolerance.',
                       'The local seam preview uses a diagnostic feather. Final min-cost joining and runtime review belong to the later assembly/integration.']}
        write_json(directory/'shape-metrics.json', metrics)
        reference2x = reference.resize(decoded.size, Image.Resampling.LANCZOS)
        save_pair(directory/'review.jpg', reference2x, decoded,
                  'V5 + baked repairs reference | REGISTERED ImageGen native; map 2x, view 100%')
        # Render native directly at the original review's 2.8 device px/world unit.
        density = np.array([2.8*3840/4915, 2.8*2560/3277])
        game_size = tuple(np.rint(np.array([width, height])*density).astype(int))
        game_native = Image.fromarray(cv2.warpAffine(np.asarray(native), affine*density[:, None], game_size,
                                     flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT_101))
        save_pair(directory/'review-game-zoom.jpg', reference.resize(game_size, Image.Resampling.LANCZOS), game_native,
                  'V5 reference | DIRECT NATIVE at 2.8 device px/world; view 100%')
        sharpness = []
        for quadrant, (qx, qy) in enumerate([(0, 0), (1, 0), (0, 1), (1, 1)]):
            box = (qx*width, qy*height, (qx+1)*width, (qy+1)*height)
            old_gray = cv2.cvtColor(np.array(reference2x.crop(box)), cv2.COLOR_RGB2GRAY).astype(np.float64)
            new_gray = cv2.cvtColor(np.array(decoded.crop(box)), cv2.COLOR_RGB2GRAY).astype(np.float64)
            sharpness.append({'quadrant': quadrant+1,
                              'referenceLaplacianVariance': float(cv2.Laplacian(old_gray, cv2.CV_64F).var()),
                              'registeredLaplacianVariance': float(cv2.Laplacian(new_gray, cv2.CV_64F).var())})
        write_json(directory/'sharpness.json', {'method': 'Laplacian variance on four equal decoded 2x context quadrants. Diagnostic values depend on texture and contrast. Visual evidence in review.jpg and review-game-zoom.jpg.', 'quadrants': sharpness})
        annotated = decoded.copy()
        draw = ImageDraw.Draw(annotated)
        for index, point in enumerate(measured):
            sx, sy = point['contextPx1x']
            draw.ellipse((sx*2-4, sy*2-4, sx*2+4, sy*2+4), outline='#00ff90', width=2)
            draw.text((sx*2+5, sy*2), str(index+1), font=FONT, fill='white', stroke_fill='black', stroke_width=1)
        edge = walk_edge[y:y+height, x:x+width]
        edge = cv2.resize(edge, decoded.size, interpolation=cv2.INTER_NEAREST) > 0
        overlay = np.array(annotated)
        overlay[edge] = np.uint8(overlay[edge]*.5+np.array([0, 230, 255])*.5)
        Image.fromarray(overlay).save(directory/'landmark-walkmask.jpg', quality=95, subsampling=0)
        fx = fx_overlay(item, decoded, layout)
        write_json(directory/'fx-overlap.json', {'layout': str(layout_path.relative_to(ROOT)),
                   'layoutSha256': sha(layout_path), 'masterSize': layout['masterSize'],
                   'worldSize': layout['worldSize'], 'pieces': fx,
                   'method': 'Actual coverage masks in master1x coordinates, resampled nearest to 2x. Cyan water, pink cloud, gold lava. Diagnostic mask placement only. Puff masks show the allowed drift region.'})
        registration = {'schemaVersion': 1, 'id': name, 'coordinates': 'master1x [x,y,w,h], 4915x3277, pixel-index affine convention matching original assembly',
                        'corePx1x': item['core'], 'contextPx1x': item['context'], 'nativeFile': 'native.webp',
                        'nativeSize': list(native.size), 'nativeSha256': sha(directory/'native.webp'),
                        'referenceSha256': sha(directory/'reference.png'), 'nativeToContextPx1x': affine.tolist(),
                        'nativeToMasterPx1x': master.tolist(), 'nativeToContextPx2x': (affine*2).tolist(),
                        'registeredFile': 'registered-2x.webp', 'registeredSha256': sha(directory/'registered-2x.webp'),
                        'generation': generation, 'sourceCandidateSha256': sha(directory/'registration-candidate.json'),
                        'sourceChunkInputs': chunk_sources, 'sourceAssemblyInventorySha256': INPUTS['sourceInventorySha256'],
                        'shapeMetricsFile': 'shape-metrics.json', 'shapeMetricsSha256': sha(directory/'shape-metrics.json'),
                        'coreCoveredByNative': core_covered,
                        'resampling': 'Direct native to 2x using Lanczos4, lossless WebP. Border reflect101 only at context rim. Native source preserved byte-for-byte. No sharpening or local deformation.',
                        'integration': {'master1x': [4915, 3277], 'fullPx': [9830, 6554], 'chunk': 2048,
                            'worldSize': [3840, 2560], 'repairs': False, 'repairsBakedInReference': True,
                            'mapPx1xToWorld': [3840/4915, 2560/3277],
                            'walkmaskSha256': sha(ROOT/'src/town-walkmask.js'),
                            'allowedEditRectPx1x': item['context'], 'join': 'Join within overlap only. Keep existing native exterior. Local seam preview is diagnostic.'}}
        write_json(directory/'registration.json', registration)
        summaries.append({'id': name, 'nativeSize': list(native.size), 'semanticProbes': len(measured),
                          'semanticMaxDistancePx1x': metrics['semanticMaxDistancePx1x'],
                          'semanticAllWithin4px': metrics['semanticAllWithin4px'],
                          'reviewedSemanticAllWithin4px': metrics['reviewedSemanticAllWithin4px'],
                          'reviewedSemanticMaxDistancePx1x': metrics['reviewedSemanticMaxDistancePx1x'],
                          'inheritedProbes': len(inherited), 'inheritedExceptions': len(metrics['inheritedExceptions']),
                          'unresolvedInheritedExceptions': len(unresolved_inherited),
                          'stairProfiles': profiles, 'sourcePngDecodedEqualToNative': True,
                          'coreCoveredByNative': core_covered, 'exteriorPixelsIdentical': exterior_equal})
    unresolved = [p for p in structure['probes'] if p['reliable'] and not p['within4px']]
    write_json(OUT/'original-structure-open-points.json', {'source': str(ASSEMBLY/'structure.json'),
               'sha256': sha(ASSEMBLY/'structure.json'), 'points': unresolved,
               'scope': 'All seven original >4px points are outside these four repair contexts and remain pending for the later full-assembly round.'})
    write_json(OUT/'verification.json', {'fileChecks': 'completed', 'imageGenCallsThisRound': 0,
               'inheritedImageGenCalls': 4, 'originalGeneratedPngHashesVerified': True,
               'sourceInventoryAndStructureHashesVerified': True, 'baselineInputHashesVerified': len(INPUTS['baselineInputs']),
               'sourcePackFilesVerified': len(source_manifest['files']),
               'baselineReferencePixelsIdentical': True, 'items': summaries,
               'fullMapAssembledThisRound': False, 'inGameTested': False})
    files = []
    for path in sorted(OUT.rglob('*')):
        if path.is_file() and path.name not in ['manifest.json', 'queue-check.json'] and '__pycache__' not in path.parts:
            entry = {'path': str(path.relative_to(OUT)), 'bytes': path.stat().st_size, 'sha256': sha(path)}
            if path.suffix.lower() in ['.png', '.webp', '.jpg']:
                with Image.open(path) as image:
                    image.load()
                    entry['size'] = list(image.size)
            files.append(entry)
    write_json(OUT/'manifest.json', {'schemaVersion': 1, 'scope': [i['id'] for i in INPUTS['items']], 'files': files})
    for item in summaries:
        print(item['id'], 'semantic=', item['semanticProbes'],
              'reviewed_max_px=', round(item['reviewedSemanticMaxDistancePx1x'], 4),
              'inherited=', item['inheritedProbes'], 'raw_inherited_exceptions=', item['inheritedExceptions'],
              'unresolved_inherited=', item['unresolvedInheritedExceptions'])
    if '--acceptance' in sys.argv:
        visual = json.loads((OUT/'visual-review.json').read_text())
        assert all(i['reviewedSemanticAllWithin4px'] for i in summaries)
        assert all(p['sameInteriorRiserCount'] and p['maxPairedDisplacementPx1x'] <= 4
                   for i in summaries for p in i['stairProfiles'])
        assert all(visual['items'][i['id']]['acceptedForCropHandoff'] for i in summaries)
        assert not any(i['unresolvedInheritedExceptions'] for i in summaries)
        print('Four-crop offline acceptance assertions completed.')


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        rng = np.random.default_rng(1729)
        pixels = rng.integers(0, 256, (96, 96, 3), dtype=np.uint8)
        reference = Image.fromarray(pixels)
        probe = {'id': 'known-translation', 'contextPx1x': [48, 48]}
        for dx, dy, expected_within4 in [(2, -3, True), (6, 0, False)]:
            moved = Image.fromarray(cv2.warpAffine(pixels, np.float64([[1, 0, dx], [0, 1, dy]]),
                                    (96, 96), borderMode=cv2.BORDER_REFLECT_101))
            result = measure(reference, moved, [probe], [100, 200])[0]
            assert result['displacementPx1x'] == [dx, dy]
            assert result['masterPx1x'] == [148, 248]
            assert result['reliable'] and result['within4px'] == expected_within4
        unresolved = measure(reference, reference, [{'id': 'edge', 'contextPx1x': [4, 4]}], [0, 0])
        assert len(unresolved) == 1 and unresolved[0]['result'] == 'insufficient-context'
        print('3 measurement oracles completed: signed translation, >4px detection, retained insufficient-context probe.')
    elif '--check-manifest' in sys.argv:
        manifest = json.loads((OUT/'manifest.json').read_text())
        expected = {f['path'] for f in manifest['files']}
        actual = {str(p.relative_to(OUT)) for p in OUT.rglob('*') if p.is_file()
                  and p.name not in ['manifest.json', 'queue-check.json'] and '__pycache__' not in p.parts}
        assert expected == actual, (expected-actual, actual-expected)
        for entry in manifest['files']:
            path = OUT/entry['path']
            assert path.stat().st_size == entry['bytes'] and sha(path) == entry['sha256'], entry['path']
            if 'size' in entry:
                with Image.open(path) as image:
                    image.load()
                    assert list(image.size) == entry['size']
        print(f'Decoded sizes and SHA256 verified for {len(expected)} delivery files.')
    else:
        main()
