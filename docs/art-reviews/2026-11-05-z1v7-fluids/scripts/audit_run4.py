"""Measure run4 progress and exact production-pixel render dependencies."""
import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
PASS = 'upper-bound-within-3-percent'
EXPECTED = {
    'masks/ice-stream-flat-upper.webp', 'masks/ice-stream-flat.webp',
    'masks/lava-flat-middle.webp', 'masks/lava-flat.webp',
    'masks/lavafall-upper-left.webp', 'masks/lavafall-mouth.webp',
}


def read(name):
    return json.loads((ROOT / name).read_text())


def write(name, data):
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(name):
    return hashlib.sha256((ROOT / name).read_bytes()).hexdigest()


def prepare():
    baseline = {row['path']: row for row in read('review/run4-copy-receipt.json')['files']}
    layout = read('fx-layout.json')
    pieces = {piece['mask']: piece for piece in layout['pieces']}
    changes = []
    for path in sorted(EXPECTED):
        name = Path(path).stem
        if name not in pieces:
            continue  # Aggregates are checked separately; the layout uses components.
        before_path = 'review/before-solid-repair/' + Path(path).name
        assert sha(before_path) == baseline[path]['sha256'], path
        before = np.array(Image.open(ROOT / before_path).getchannel('A'))
        after = np.array(Image.open(ROOT / path).getchannel('A'))
        assert not ((after > 0) & (before == 0)).any(), path
        changes.append((name, pieces[name]['maskRectPx'], before != after))

    def intersections(rect):
        tx, ty, tw, th = rect
        result = []
        for name, (sx, sy, sw, sh), pixels in changes:
            x0, y0 = max(tx, sx), max(ty, sy)
            x1, y1 = min(tx + tw, sx + sw), min(ty + th, sy + sh)
            if x0 < x1 and y0 < y1:
                count = int(pixels[(y0 - sy) * 2:(y1 - sy) * 2,
                                   (x0 - sx) * 2:(x1 - sx) * 2].sum())
                if count:
                    result.append({'mask': name, 'changedNativePixelsInView': count})
        return result

    pairs, clips, contacts = [], [], set()
    for piece in layout['pieces']:
        group = piece['group']
        if group not in ['waterfall', 'lavafall', 'ice', 'lava', 'river']:
            continue
        selected = intersections(piece['maskRectPx'])
        if selected:
            pairs.append({'id': piece['mask'], 'changedPixels': selected})
            contacts.add('review/contact-' + ('icefalls' if group == 'waterfall' else
                                             'lavafalls' if group == 'lavafall' else 'streams') + '.jpg')
    for view in read('review/views.json'):
        selected = intersections(view['rectPx1x'])
        if selected:
            clips.append({'id': view['id'], 'changedPixels': selected})
    outputs = []
    for path in sorted((ROOT / 'review').rglob('*')):
        relative = str(path.relative_to(ROOT))
        if path.is_file() and (relative.startswith(('review/pairs/', 'review/clips/'))
                               or path.name.startswith('contact-') or path.name.endswith('-sequence.jpg')):
            outputs.append({'path': relative, 'sha256': sha(relative)})
    plan = {
        'run': '20261111T162400Z-9a28b146',
        'method': 'Intersect actual changed native component-mask pixels, not full mask rectangles, with each pair and clip view. Aggregates are not layout consumers.',
        'changedProductionMasks': [name for name, _, _ in changes],
        'pairIds': [row['id'] for row in pairs], 'clipIds': [row['id'] for row in clips],
        'pairs': pairs, 'clips': clips, 'contactSheets': sorted(contacts),
        'outputsBeforeRefresh': outputs,
    }
    write('review/current-render-dependencies.json', plan)
    print(json.dumps({key: plan[key] for key in ['pairIds', 'clipIds', 'contactSheets']}))


def audit():
    baseline_report = read('review/run4-rechecked-baseline.json')
    baseline = {row['mask']: row for row in baseline_report['measurements']}
    inherited = {row['mask']: row for row in read('review/run4-start-liquid-reference-result.json')['measurements']}
    current_report = read('review/liquid-reference-result.json')
    current = {row['mask']: row for row in current_report['measurements']}
    assert set(baseline) == set(current) and len(current) == 37
    assert baseline_report['referenceSha256'] == sha('review/run4-start-liquid-reference.json')
    assert current_report['referenceSha256'] == sha('review/liquid-reference.json')
    held = [name for name, row in baseline.items() if row['status'] == PASS]
    for name in held:
        for key in ['maskSha256', 'labelSupportSha256', 'status', 'definiteLiquidPixels', 'unknownPixels']:
            assert current[name][key] == baseline[name][key], (name, key)
    delta = [{
        'mask': name, 'beforeStatus': baseline[name]['status'], 'afterStatus': row['status'],
        'beforeSelectedPixels': baseline[name]['selectedPixels'], 'afterSelectedPixels': row['selectedPixels'],
        'beforeConfirmedLiquidPixels': baseline[name]['definiteLiquidPixels'],
        'afterConfirmedLiquidPixels': row['definiteLiquidPixels'],
        'beforeUnknownPixels': baseline[name]['unknownPixels'], 'afterUnknownPixels': row['unknownPixels'],
        'beforeUpperBoundPercent': baseline[name]['outsidePercentUpperBound'],
        'afterUpperBoundPercent': row['outsidePercentUpperBound'],
        'productionMaskChanged': row['maskSha256'] != baseline[name]['maskSha256'],
    } for name, row in current.items()]
    stale = [{
        'mask': name, 'recordedUpperBound': inherited[name]['outsidePercentUpperBound'],
        'recomputedUpperBound': row['outsidePercentUpperBound'],
    } for name, row in baseline.items() if inherited[name]['labelSupportSha256'] != row['labelSupportSha256']]
    progress = {
        'baseline': 'review/run4-rechecked-baseline.json', 'current': 'review/liquid-reference-result.json',
        'inheritedHandoffVerifiedCount': read('review/run4-start-per-mask-handoff.json')['verifiedWithin3Percent'],
        'beforeVerifiedWithin3Percent': len(held),
        'afterVerifiedWithin3Percent': sum(row['status'] == PASS for row in current.values()),
        'newlyVerified': [name for name, row in current.items() if name not in held and row['status'] == PASS],
        'allInheritedVerifiedMasksAndLabelSupportsPreserved': True,
        'inheritedStaleMeasurementRows': stale, 'measurements': delta,
        'limitation': 'Same AI ground observer. Counts include overlapping aggregates; do not sum confirmed pixels as unique map area. Conservative upper bounds, not exact outside percentages or QA.',
    }
    write('review/reference-progress.json', progress)
    handoff = []
    for name, row in current.items():
        action = ('รักษา mask/เฟรมและ label ที่ผ่านแล้ว ตรวจ coverage/playback ต่อ' if row['status'] == PASS
                  else 'ตรวจ ground-only ของ largestUnknownComponents; ห้ามเติม unknown ตามสีหรือ production alpha')
        if name == 'icefall-summit':
            action = 'รักษา summit ขั้นล่าง 528/528 ครบ 8 เฟรม; ส่วนบนยังไม่ครบ ห้ามวาดขั้นล่างซ้ำ'
        if name.startswith('shore-band'):
            action += '; ตรวจระยะจากฝั่งจริง ≤12 world แยกจาก containment'
        handoff.append({**row, 'nextAction': action})
    write('review/per-mask-handoff.json', {
        'source': 'review/liquid-reference-result.json', 'completeSemanticAcceptance': False,
        'verifiedWithin3Percent': progress['afterVerifiedWithin3Percent'],
        'remainingMasks': sum(row['status'] != PASS for row in current.values()), 'measurements': handoff,
    })
    receipt = read('review/run4-copy-receipt.json')
    assets = []
    for row in receipt['files']:
        name = row['path']
        if name.startswith(('masks/', 'sheets/', 'sources/', 'input/')) or name in ['fx-layout.json', 'off-replacements.json']:
            assets.append({'path': name, 'sha256': sha(name), 'matchesInput': sha(name) == row['sha256']})
    changed = sorted(row['path'] for row in assets if not row['matchesInput'])
    assert set(changed) == EXPECTED, changed
    for name, group in [('ice-stream-flat', 'ice'), ('lava-flat', 'lava')]:
        layout = read('fx-layout.json')
        union = Image.new('L', tuple(value * 2 for value in layout['masterSize']))
        for piece in layout['pieces']:
            if piece['group'] == group:
                x, y, w, h = piece['maskRectPx']
                box = (x * 2, y * 2, (x + w) * 2, (y + h) * 2)
                alpha = Image.open(ROOT / 'masks' / (piece['mask'] + '.webp')).getchannel('A')
                union.paste(ImageChops.lighter(union.crop(box), alpha), box[:2])
        assert union.tobytes() == Image.open(ROOT / 'masks' / (name + '.webp')).getchannel('A').tobytes(), name
    deps = read('review/current-render-dependencies.json')
    refreshed = {'review/pairs/' + name + '.webp' for name in deps['pairIds']} | set(deps['contactSheets'])
    refreshed |= {'review/clips/' + name + '.mp4' for name in deps['clipIds']}
    refreshed |= {'review/' + name + '-sequence.jpg' for name in deps['clipIds']}
    checks = []
    for row in deps['outputsBeforeRefresh']:
        actual = sha(row['path'])
        if row['path'] not in refreshed:
            assert actual == row['sha256'], row['path']
        checks.append({**row, 'currentSha256': actual, 'refreshedForChangedPixels': row['path'] in refreshed,
                       'preservedHash': actual == row['sha256']})
    deps['outputsAfterRefresh'] = checks
    deps['allUnrelatedOutputsPreserved'] = True
    write('review/current-render-dependencies.json', deps)
    registration = read('review/summit-registration-result.json')
    assert registration['lowerWitnessEffectiveCoveragePixelsByPhase'] == [528] * 8
    assert current['icefall-summit']['maskSha256'] == baseline['icefall-summit']['maskSha256']
    write('review/current-preservation.json', {
        'source': receipt['source'], 'assetChecks': assets, 'changedProductionAssets': changed,
        'preservedVerifiedMaskCount': len(held), 'preservedVerifiedMasks': held,
        'allInheritedVerifiedMasksAndLabelsPreserved': True,
        'summitMaskSheetSourcesAndRecorded528WitnessPreserved': True,
        'bothFlatAggregatesEqualComponentUnion': True,
        'layoutAndOffReplacementsPreserved': True, 'allUnrelatedRenderOutputsPreserved': True,
    })
    print(json.dumps({key: progress[key] for key in ['beforeVerifiedWithin3Percent', 'afterVerifiedWithin3Percent', 'newlyVerified']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare-render', action='store_true')
    args = parser.parse_args()
    prepare() if args.prepare_render else audit()
