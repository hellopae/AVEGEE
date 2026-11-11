"""Recheck exported files, ancestry, geometry and FX. Writes in this packet only."""
import argparse
import importlib.util
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

from prepare import BASE, IDS, OUT, ROOT, atlas_crop, sha, write
from register import measure

sys.dont_write_bytecode = True
cv2.setNumThreads(2)


def load_module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


GEOMETRY = load_module('geometry_measure', OUT / 'scripts/measure-geometry.py')


def read(path):
    return json.loads(path.read_text())


def rgb(path):
    with Image.open(path) as image:
        return image.convert('RGB')


def inside(point, box):
    x, y = point
    x0, y0, x1, y1 = box
    return x0 <= x < x1 and y0 <= y < y1


def measurement_oracles():
    records = []
    feature = dict(id='known-edge', seedContextPx1x=[25, 26], normal='y',
                   polarity=-1, tangentHalfWidthPx1x=3, searchRadiusPx1x=8)
    for operator in ['gradient', 'dark-groove', 'first-threshold']:
        points = []
        for shift in [0, 5]:
            array = np.full((100, 100, 3), 200, np.uint8)
            position = 50 + shift*2
            sample = dict(feature, operator=operator)
            if operator == 'dark-groove':
                array[position:position+4] = 20
            elif operator == 'first-threshold':
                array[:] = [80, 80, 80]
                array[position:] = [80, 10, 160]
                sample.update(channel='purple', threshold=40, polarity=1)
            else:
                array[position:] = 20
            result = GEOMETRY.edge(Image.fromarray(array), sample)
            assert not result['searchBoundaryHit']
            points.append(result['contextPx1x'])
        displacement = float(np.linalg.norm(np.array(points[1])-points[0]))
        assert displacement == 5 and displacement > 4, (operator, displacement)
        records.append(dict(operator=operator, knownShiftPx1x=5,
                            measuredShiftPx1x=displacement, exceeds4px=True))
    return records


def check_geometry(folder, reference, registered, spec, resolutions):
    raw = read(folder / 'geometry.json')
    final = read(folder / 'geometry-resolutions.json')
    assert len(raw['measurements']) == len(spec['features']) == final['measurementCount']
    decisions = {item['id']: item for item in final['decisions']}
    corrections = {item['id']: item for item in resolutions}
    assert decisions.keys() == corrections.keys()
    reference2x = reference.resize(registered.size, Image.Resampling.LANCZOS)
    distances = []
    for index, (feature, saved) in enumerate(zip(spec['features'], raw['measurements'])):
        assert feature['id'] == saved['id']
        before = GEOMETRY.edge(reference2x, feature)
        after = GEOMETRY.edge(registered, feature)
        assert before == saved['reference'] and after == saved['exported']
        expected_distance = float(np.linalg.norm(np.array(before['contextPx1x'])-after['contextPx1x']))
        assert saved['distancePx1x'] == expected_distance
        if saved['result'] != 'within4px':
            assert feature['id'] in decisions, feature['id']
        if feature['id'] in decisions:
            decision = decisions[feature['id']]
            assert decision['original'] == saved and decision['initialMeasurementIndex'] == index
            updated = dict(feature, **corrections[feature['id']]['measurement'])
            before, after = GEOMETRY.edge(reference2x, updated), GEOMETRY.edge(registered, updated)
            assert before == decision['corrected']['reference']
            assert after == decision['corrected']['exported']
        assert not before['searchBoundaryHit'] and not after['searchBoundaryHit']
        distance = float(np.linalg.norm(np.array(before['contextPx1x'])-after['contextPx1x']))
        assert distance <= 4, (folder.name, feature['id'], distance)
        distances.append(distance)
    assert final['counts'] == dict(within4px=len(distances), over4px=0, unresolved=0)
    assert final['maxDistancePx1x'] == max(distances)
    return dict(rawCounts=raw['counts'], reviewedCounts=final['counts'],
                retainedCorrections=len(decisions), maxDistancePx1x=max(distances))


def check_fx(folder, data, size):
    layout_path = ROOT / 'img/map-zone1/v5-fx/fx-layout.json'
    layout = read(layout_path)
    saved = read(folder / 'fx-overlap.json')
    assert saved['layoutSha256'] == sha(layout_path)
    assert saved['sourceCodeSha256'] == sha(ROOT / 'src/town-fluid-fx.js')
    x0, y0, x1, y1 = data['contextRectPx1x']
    cx0, cy0, cx1, cy1 = data['coreRectPx1x']
    union = np.zeros((size[1], size[0]), np.uint8)
    pieces = []
    clouds = []
    for piece in layout['pieces']:
        x, y, width, height = piece['maskRectPx']
        intersects = x < x1 and x+width > x0 and y < y1 and y+height > y0
        if piece['group'] == 'cloud' and not piece.get('off'):
            clouds.append(dict(id=piece['id'], maskRectPx1x=piece['maskRectPx'], contextIntersects=intersects))
        if piece.get('off') or not intersects:
            continue
        names = piece['mask'] if isinstance(piece['mask'], list) else [piece['mask']]
        for name in names:
            path = layout_path.parent / f'masks/{name}.webp'
            with Image.open(path) as mask:
                assert mask.size == (width, height)
                alpha = mask.getchannel('A').crop((x0-x, y0-y, x1-x, y1-y)).resize(size, Image.Resampling.NEAREST)
            alpha = np.array(alpha)
            union = np.maximum(union, alpha)
            pieces.append(dict(id=piece['id'], group=piece['group'], kind=piece['kind'],
                               mask=str(path.relative_to(ROOT)), maskSha256=sha(path),
                               maskRectPx1x=piece['maskRectPx'],
                               contextCoveredPixels2x=int(np.count_nonzero(alpha)),
                               coreCoveredPixels2x=int(np.count_nonzero(alpha[(cy0-y0)*2:(cy1-y0)*2,(cx0-x0)*2:(cx1-x0)*2]))))
    assert saved['pieces'] == pieces
    assert saved['activeCloudRectangles'] == clouds
    assert saved['activeCloudRectanglesIntersect'] == any(item['contextIntersects'] for item in clouds)
    assert np.array_equal(np.array(Image.open(folder / 'fx-coverage.png')), union)
    return dict(contextUnionPixels2x=int(np.count_nonzero(union)),
                coreUnionPixels2x=int(np.count_nonzero(union[(cy0-y0)*2:(cy1-y0)*2,(cx0-x0)*2:(cx1-x0)*2])),
                activeCloudIntersections=sum(item['contextIntersects'] for item in clouds))


def verify():
    provenance = read(OUT / 'provenance.json')
    for item in provenance['baselineInputs']:
        assert sha(ROOT / item['path']) == item['sha256'], item['path']
    for item in provenance['sourceFiles']:
        assert sha(Path(item['path'])) == item['sha256'], item['path']
    imported = Path(provenance['reusedFrom'])
    for item in provenance['importedArtifacts']:
        assert sha(imported / item['path']) == item['sha256'], item['path']
    assembler = load_module('source_assemble', BASE / 'scripts/assemble.py')
    assembler.ROOT = ROOT
    baseline = assembler.baseline()
    upstream = read(BASE / 'structure.json')
    spec = read(OUT / 'geometry-spec.json')
    resolutions = read(OUT / 'geometry-resolution-spec.json')
    visual = read(OUT / 'visual-review.json')
    assets = []
    for name in IDS:
        folder = OUT / name
        data = read(folder / 'registration.json')
        generation = read(folder / 'generation.json')
        reference = rgb(folder / 'reference-1x.png')
        native = rgb(folder / 'native.webp')
        registered = rgb(folder / 'registered-2x.webp')
        assert registered.size == (reference.width*2, reference.height*2)
        for filename in ['native.webp', 'generation.json', 'input.json', 'reference-1x.png',
                         'assembled-before.webp', 'fallback-before-comparison.jpg', 'fallback-final-comparison.jpg']:
            assert sha(folder / filename) == sha(imported / name / filename), (name, filename)
        source = Path(generation['sourcePath'])
        assert sha(source) == generation['sourceSha256']
        assert np.array_equal(np.array(rgb(source)), np.array(native)), name
        assert data['nativeSha256'] == generation['nativeSha256'] == sha(folder / 'native.webp')
        assert list(native.size) == data['nativeSize'] == generation['nativeSize']
        assert data['referenceSha256'] == sha(folder / 'reference-1x.png')
        assert data['assembledBeforeSha256'] == sha(folder / 'assembled-before.webp')
        assert np.array_equal(np.array(baseline.crop(data['contextRectPx1x'])), np.array(reference))
        assert np.array_equal(np.array(atlas_crop(data['contextRectPx1x'])), np.array(rgb(folder / 'assembled-before.webp')))
        matrix = np.array(data['nativeToContextPx1x'])
        master = matrix.copy()
        master[:, 2] += data['contextRectPx1x'][:2]
        assert np.allclose(master, data['nativeToMasterPx1x'], atol=1e-9)
        assert np.allclose(master*2, data['nativeToFullPx2x'], atol=1e-9)
        assert data['fullPx'] == [9830, 6554] and data['chunk'] == 2048
        assert np.linalg.svd(matrix[:, :2], compute_uv=False).max()*2 < 1
        warped = cv2.warpAffine(np.array(native), matrix*2, registered.size, flags=cv2.INTER_LANCZOS4)
        assert np.array_equal(warped, np.array(registered))
        valid = np.zeros((native.height, native.width), np.uint8)
        valid[4:-4, 4:-4] = 255
        valid = cv2.warpAffine(valid, matrix*2, registered.size, flags=cv2.INTER_NEAREST)
        assert np.array_equal(valid, np.array(Image.open(folder / 'valid-coverage.png')))
        x0, y0, x1, y1 = data['contextRectPx1x']
        cx0, cy0, cx1, cy1 = data['coreRectPx1x']
        core = valid[(cy0-y0)*2:(cy1-y0)*2, (cx0-x0)*2:(cx1-x0)*2]
        assert np.all(core == 255)
        assert np.count_nonzero(core) == data['coreValidPixels2x'] == data['coreTotalPixels2x']
        structure = read(folder / 'structure.json')
        assert structure == measure(reference, registered, data)
        expected = [probe for probe in upstream['probes'] if inside(probe['sourcePx1x'], data['contextRectPx1x'])]
        assert expected == [probe['upstreamMeasurement'] for probe in structure['probes']]
        unresolved = [probe for probe in structure['probes'] if probe['result'] == 'unresolved']
        assert all(not inside(probe['sourcePx1x'], data['coreRectPx1x']) for probe in unresolved)
        assert structure['counts']['over4px'] == 0
        geometry = check_geometry(folder, reference, registered, spec['assets'][name], resolutions[name])
        assert data['semanticGeometryEvidence'] == 'geometry-resolutions.json'
        assert data['semanticGeometrySamples'] == geometry['reviewedCounts']['within4px']
        assert data['semanticGeometryMaxDistancePx1x'] == geometry['maxDistancePx1x']
        fx = check_fx(folder, data, registered.size)
        assert visual['assets'][name]['reviewed']
        assets.append(dict(id=name, nativeSize=list(native.size),
                           sourcePngDecodedIdentity=True, sourceWebpByteIdentity=True,
                           referenceRebuiltWithRuntimeRepairs=True, affineAndDecodedWarpExact=True,
                           coreValidPixels2x=data['coreValidPixels2x'],
                           structureCounts=structure['counts'], allUpstreamContextProbesRetained=True,
                           unresolvedNccOutsideCore=len(unresolved), geometry=geometry, fx=fx))
    decoded = []
    for path in sorted(OUT.rglob('*')):
        if path.suffix.lower() in ['.png', '.webp', '.jpg']:
            with Image.open(path) as image:
                image.load()
                decoded.append(dict(path=str(path.relative_to(OUT)), size=list(image.size), mode=image.mode))
    return dict(scope=IDS, checks='completed', baselineInputHashesChecked=len(provenance['baselineInputs']),
                assemblySourceHashesChecked=len(provenance['sourceFiles']),
                importedSourceHashesChecked=len(provenance['importedArtifacts']),
                newGenerationsThisRound=0, reusedBuiltInGenerations=3,
                measurementOracles=measurement_oracles(), assets=assets, decodedImages=decoded,
                upstreamOver4px=[dict(probe, requestedContextIds=[name for name in IDS
                    if inside(probe['sourcePx1x'], read(OUT / name / 'input.json')['contextRectPx1x'])])
                    for probe in upstream['probes'] if probe.get('reliable') and probe.get('distancePx1x', 0) > 4],
                acceptanceScope='Three native repair crops and coordinate registration for later composition and integration. Offline file and sampled geometry evidence.')


def manifest():
    return dict(schemaVersion=1, fullPx=[9830, 6554], chunk=2048,
                coordinateSystem='master map1x 4915x3277, rectangles [x0,y0,x1,y1] half-open',
                assets=[dict(id=name, nativeFile=f'{name}/native.webp', registration=f'{name}/registration.json',
                             review=f'{name}/review.jpg') for name in IDS],
                files=[dict(path=str(path.relative_to(OUT)), bytes=path.stat().st_size, sha256=sha(path))
                       for path in sorted(OUT.rglob('*')) if path.is_file() and path.name != 'manifest.json'])


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--write-manifest', action='store_true')
    parser.add_argument('--check-manifest', action='store_true')
    options = parser.parse_args()
    report = verify()
    write(OUT / 'verification.json', report)
    if options.write_manifest:
        write(OUT / 'manifest.json', manifest())
    if options.check_manifest:
        assert read(OUT / 'manifest.json') == manifest(), 'Manifest differs from current packet'
    print(json.dumps(dict(checks=report['checks'], assets=len(report['assets']),
                          decodedImages=len(report['decodedImages']),
                          geometrySamples=sum(asset['geometry']['reviewedCounts']['within4px'] for asset in report['assets']),
                          manifestChecked=options.check_manifest), ensure_ascii=False))
