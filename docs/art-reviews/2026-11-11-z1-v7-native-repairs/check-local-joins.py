"""Reproduce local min-cost join trials without changing accepted native crops.

Only this delivery directory is written. Existing atlas chunks are read only.
"""
from pathlib import Path
import importlib.util
import json
import sys

sys.dont_write_bytecode = True

import cv2
import numpy as np
from PIL import Image, ImageDraw

OUT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('crop_verifier', OUT/'verify.py')
v = importlib.util.module_from_spec(spec)
spec.loader.exec_module(v)
spec = importlib.util.spec_from_file_location('assembly_solver', v.ASSEMBLY/'scripts/assemble.py')
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
previous.ROOT = v.ROOT


def overlap_alpha(previous, existing, replacement, item, maximum_band=None):
    """Reuse the assembly's seam solver inside the context-to-core margins."""
    x, y, width, height = item['context']
    cx, cy, cw, ch = item['core']
    margins = {'left': (cx-x)*2, 'right': (x+width-cx-cw)*2,
               'top': (cy-y)*2, 'bottom': (y+height-cy-ch)*2}
    alpha = np.ones(existing.shape[:2], np.float32)
    records = []
    for side, margin in margins.items():
        if margin == 0:
            # The forest reaches the outer map edge. There is no neighbour there.
            assert side == 'bottom' and y+height == 3277
            continue
        # The shipping atlas contains the old structural fallback in this ring.
        # Keep the join at its outer rim so the native overlap restores those forms.
        if maximum_band is not None:
            margin = min(margin, maximum_band)
        a, b = existing, replacement
        if side in ['top', 'bottom']:
            a, b = a.transpose(1, 0, 2), b.transpose(1, 0, 2)
        offset = 0 if side in ['left', 'top'] else a.shape[1]-margin
        previous.seam(a[:, offset:offset+margin], b[:, offset:offset+margin],
                      0, item['id']+'/'+side)
        record = dict(previous.SEAMS[-1])
        record['usage'] = 'Mask path only. Original RGB is used in the final mix.'
        record['side'] = side
        record['bandOffsetOutputPx'] = offset
        records.append(record)
        path = np.array(record['pathInOverlapOutputPx'])+offset
        t = np.clip((np.arange(a.shape[1])[None, :]-path[:, None]+8)/16, 0, 1)
        t = t*t*(3-2*t)
        if side in ['right', 'bottom']:
            t = 1-t
        if side in ['top', 'bottom']:
            t = t.T
        alpha *= t
    core = alpha[(cy-y)*2:(cy-y+ch)*2, (cx-x)*2:(cx-x+cw)*2]
    assert np.all(core == 1), item['id']+' core alpha'
    assert np.all(alpha[:, 0] == 0) and np.all(alpha[:, -1] == 0)
    assert np.all(alpha[0] == 0)
    if margins['bottom']:
        assert np.all(alpha[-1] == 0)
    return alpha, records


def main():
    provenance = json.loads((OUT/'provenance.json').read_text())
    for entry in provenance['sourceFiles']:
        path = Path(entry['path'])
        assert v.sha(path if path.is_absolute() else v.ROOT/path) == entry['sha256']
    base = previous.baseline()
    structure = json.loads((v.ASSEMBLY/'structure.json').read_text())
    visual = json.loads((OUT/'join-review.json').read_text())
    summaries = []
    for item in v.INPUTS['items']:
        name = item['id']
        directory = OUT/name
        x, y, width, height = item['context']
        cx, cy, cw, ch = item['core']
        bx, by = max(0, x-36), max(0, y-36)
        ex, ey = min(4915, x+width+36), min(3277, y+height+36)
        before, sources = v.atlas_crop((bx*2, by*2, ex*2, ey*2))
        registration = json.loads((directory/'registration.json').read_text())
        assert registration['nativeSha256'] == v.sha(directory/'native.webp')
        assert registration['registeredSha256'] == v.sha(directory/'registered-2x.webp')
        replacement = np.array(Image.open(directory/'registered-2x.webp').convert('RGB'))
        ox, oy = (x-bx)*2, (y-by)*2
        existing = np.array(before)[oy:oy+height*2, ox:ox+width*2]
        reference = base.crop((bx, by, ex, ey))
        probes = [{'id': p['id'], 'sourceProbeIndex': index, 'kind': p['kind'],
                   'contextPx1x': [p['sourcePx1x'][0]-bx, p['sourcePx1x'][1]-by]}
                  for index, p in enumerate(structure['probes'])
                  if x <= p['sourcePx1x'][0] < x+width and y <= p['sourcePx1x'][1] < y+height]
        trials = []
        for label, band in [('full-overlap', None), ('outer-16-map-px', 32)]:
            alpha, seams = overlap_alpha(previous, existing, replacement, item, maximum_band=band)
            local = np.array(before).copy()
            local[oy:oy+height*2, ox:ox+width*2] = np.uint8(np.rint(
                existing*(1-alpha[..., None])+replacement*alpha[..., None]))
            core = local[(cy-by)*2:(cy-by+ch)*2, (cx-bx)*2:(cx-bx+cw)*2]
            expected_core = replacement[(cy-y)*2:(cy-y+ch)*2, (cx-x)*2:(cx-x+cw)*2]
            assert np.array_equal(core, expected_core)
            exterior = np.ones(local.shape[:2], bool)
            exterior[oy:oy+height*2, ox:ox+width*2] = False
            assert np.array_equal(local[exterior], np.array(before)[exterior])
            at1x = Image.fromarray(local).resize(reference.size, Image.Resampling.BOX)
            measured = v.measure(reference, at1x, probes, [bx, by])
            exceptions = [p for p in measured if not p.get('reliable') or not p.get('within4px')]
            wider = v.measure(reference, at1x, exceptions, [bx, by], radius=24)
            wider_by_id = {p['id']: p for p in wider}
            effective = [wider_by_id.get(p['id'], p) for p in measured]
            unresolved = [p['id'] for p in effective if not p.get('reliable') or not p.get('within4px')]
            trials.append({'id': label, 'maximumJoinBandOutputPx': band,
                           'corePixelsIdenticalToRegistered': True, 'exteriorPixelsIdentical': True,
                           'probes': measured, 'rawExceptions': exceptions, 'widerMeasurements49x49': wider,
                           'unresolvedAfterWiderWindow': unresolved,
                           'seams': seams})
            print(name, label, 'probes=', len(measured), 'raw_exceptions=', len(exceptions))
        # Persist the narrower candidate. Native/reference/registration remain the accepted originals.
        Image.fromarray(local).save(directory/'mincost-preview.webp', lossless=True)
        decoded = Image.open(directory/'mincost-preview.webp').convert('RGB')
        assert np.array_equal(local, np.array(decoded))
        Image.fromarray(np.uint8(np.rint(alpha*255))).save(directory/'mincost-alpha.png')
        overlay = local.copy()
        region = overlay[oy:oy+height*2, ox:ox+width*2]
        transition = (alpha > 0) & (alpha < 1)
        region[transition] = np.uint8(region[transition]*.5+np.array([0, 255, 220])*.5)
        Image.fromarray(overlay).save(directory/'mincost-seam-overlay.jpg', quality=95, subsampling=0)
        v.save_pair(directory/'mincost-overlap-review.jpg', before, decoded,
                    'EXISTING v7 | MIN-COST CANDIDATE, outer16 map px; native core/exterior exact; 2x')
        v.write_json(directory/'seam-trials.json', {
            'method': 'Original assemble.py seam() DP +/-1, Gaussian RGB cost and +/-8 output px feather. Solver colour correction is used for path selection only. Final RGB is unchanged away from the blend.',
            'solverSha256': v.sha(v.ASSEMBLY/'scripts/assemble.py'),
            'nativeSha256': registration['nativeSha256'], 'registeredSha256': registration['registeredSha256'],
            'contextPx1x': item['context'], 'corePx1x': item['core'],
            'localPreviewPx1x': [bx, by, ex-bx, ey-by], 'sourceChunks': sources,
            'selectedCandidate': 'outer-16-map-px', 'trials': trials,
            'interpretation': 'Raw points are all retained. Wider correlation windows are supplementary evidence. Visual seam acceptance is recorded separately.'})
        if name == 'heaven-bridge':
            box = (3620, 461, 4065, 577)
            ref = base.crop(box).resize((890, 232), Image.Resampling.LANCZOS)
            crop = decoded.crop(((box[0]-bx)*2, (box[1]-by)*2, (box[2]-bx)*2, (box[3]-by)*2))
            for image in [ref, crop]:
                ImageDraw.Draw(image).line((0, (y-box[1])*2, image.width, (y-box[1])*2), fill='cyan', width=2)
            v.save_pair(directory/'context-boundary-review.jpg', ref, crop,
                        'V5 reference | MIN-COST CANDIDATE; cyan context top y497; x3620..4065 y461..577')
        summaries.append({'id': name, 'nativeUnchanged': True, 'corePixelsIdenticalToRegistered': True,
                          'exteriorPixelsIdentical': True, 'allInheritedProbesRetained': len(probes),
                          'rawExceptionsByTrial': {t['id']: len(t['rawExceptions']) for t in trials},
                          'candidateUnresolvedAfterWiderWindow': trials[-1]['unresolvedAfterWiderWindow'],
                          'localSeamAccepted': visual['items'][name]['localSeamAccepted']})
    native_checks = json.loads((OUT/'verification.json').read_text())
    native_complete = len(native_checks['items']) == 4 and all(
        i['sourcePngDecodedEqualToNative'] and i['coreCoveredByNative'] and i['exteriorPixelsIdentical']
        and i['reviewedSemanticAllWithin4px'] and i['unresolvedInheritedExceptions'] == 0
        and all(p['sameInteriorRiserCount'] and p['maxPairedDisplacementPx1x'] <= 4 for p in i['stairProfiles'])
        for i in native_checks['items'])
    ready = native_complete and all(s['localSeamAccepted'] and not s['candidateUnresolvedAfterWiderWindow']
                                    for s in summaries)
    v.write_json(OUT/'joins-verification.json', {'items': summaries, 'readyForIntegration': ready,
                 'fullMapAssembled': False, 'inGameTested': False,
                 'nativeCropChecksComplete': native_complete,
                 'nativeFilesChanged': 0, 'imageGenCallsThisRound': 0})
    v.write_json(OUT/'queue-check.json', {
        'status': 'ready' if ready else 'incomplete',
        'evidence': [
            'native.webp + registration.json + review.jpg ครบทั้ง 4 โฟลเดอร์; verification.json ตรวจต้นฉบับ ImageGen PNG ตรงพิกเซลทุกชิ้น และ core coverage ครบ',
            'provenance.json ตรวจ SHA256 native ตรงชุด 20261111T212700Z-a8d3cba7 ทั้ง 4 ชิ้น; เรียก ImageGen เพิ่ม 0 ครั้ง',
            'shape-metrics.json ทุกจุด เก็บครบ 54 semantic และ 124 inherited probes; หลังตรวจคู่เทียบ semantic คลาดสูงสุด 1.414 map px; stair profiles 7/6/5 จุด คลาดสูงสุด 0.502 map px',
            'fx-overlay.jpg + fx-overlap.json ทุกจุด ใช้ mask alpha และพิกัด layout จริง; heaven-bridge มี water/foam coverage; cloud alpha ในบริเวณซ้อนเป็น 0',
            'seam-trials.json ทุกจุด เก็บผล 2 trial และ inherited probes ทุกจุด; mincost-preview.webp decode lossless ตรงพิกเซล; core และ exterior ตรงต้นทางทุกชิ้น',
            'joins-verification.json nativeCropChecksComplete='+str(native_complete)+'; readyForIntegration='+str(ready),
            'heaven-bridge/context-boundary-review.jpg เส้น y497 แสดงปลายเสาราวที่ยื่นเหนือ context และรอยต่อที่ยังขาด; seam-trials.json เก็บจุด [3582,542] NCC 21x21 ประมาณ .597 และ 49x49 ประมาณ .589 ที่ displacement [0,0]',
            'join-review.json localSeamAccepted=false ทั้ง 4 จุด; original-structure-open-points.json เก็บจุดเดิมเกิน4pxครบ7จุด และ verify.py ตรวจแล้วว่าอยู่นอก context รอบนี้',
            'test-results.json บันทึกผลการตรวจจริง; --require-ready exit1 เพราะรอยต่อยังตรวจรับไม่ครบ'
        ],
        'remaining': [] if ready else visual['remaining']})
    print('Local join readiness =', ready)
    if '--require-ready' in sys.argv:
        assert ready, 'Local visual seam review remains incomplete. See join-review.json and context-boundary-review.jpg.'


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        rng = np.random.default_rng(1729)
        existing = rng.integers(0, 256, (192, 192, 3), dtype=np.uint8)
        for item, expected_sides in [
            ({'id': 'four-sided-oracle', 'context': [0, 0, 96, 96], 'core': [32, 32, 32, 32]}, 4),
            ({'id': 'map-edge-oracle', 'context': [0, 3181, 96, 96], 'core': [32, 3213, 32, 64]}, 3),
        ]:
            for band in [None, 32]:
                alpha, records = overlap_alpha(previous, existing, 255-existing, item, band)
                assert len(records) == expected_sides
                assert np.isfinite(alpha).all() and alpha.min() == 0 and alpha.max() == 1
                for record in records:
                    assert np.max(np.abs(np.diff(record['pathInOverlapOutputPx']))) <= 1
                if expected_sides == 3:
                    assert np.all(alpha[-1, 64:128] == 1)
        print('2 seam-mask oracles completed, each at full and narrow overlap. Exact core, zero rim, map edge and path continuity checked.')
    else:
        main()
