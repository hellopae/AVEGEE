"""Record this run's pixel dependencies, measured delta and preserved assets."""

import argparse
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PASS = 'upper-bound-within-3-percent'
CHANGED = {'lavafall-bridge', 'lavafall-west'}


def read(path):
    return json.loads((ROOT / path).read_text())


def write(path, data):
    (ROOT / path).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256((ROOT / path).read_bytes()).hexdigest()


def prepare():
    layout = read('fx-layout.json')
    pieces = {p['mask']: p for p in layout['pieces']}
    changes = []
    for name in sorted(CHANGED):
        before = np.array(Image.open(ROOT / 'review/before-solid-repair' / (name + '.webp')).getchannel('A'))
        after = np.array(Image.open(ROOT / 'masks' / (name + '.webp')).getchannel('A'))
        delta = before != after
        assert not ((after > 0) & (before == 0)).any()
        changes.append((name, pieces[name]['maskRectPx'], delta))

    def dependencies(rect):
        tx, ty, tw, th = rect
        dependencies = []
        for name, (sx, sy, sw, sh), pixels in changes:
            x0, y0 = max(tx, sx), max(ty, sy)
            x1, y1 = min(tx + tw, sx + sw), min(ty + th, sy + sh)
            if x0 >= x1 or y0 >= y1:
                continue
            selected = pixels[round((y0-sy)*2):round((y1-sy)*2),
                              round((x0-sx)*2):round((x1-sx)*2)]
            if selected.any():
                dependencies.append({'mask': name, 'changedNativePixelsInView': int(selected.sum())})
        return dependencies

    pair_rows = []
    contacts = set()
    for piece in layout['pieces']:
        group = piece['group']
        if group not in ['waterfall', 'lavafall', 'ice', 'lava', 'river']:
            continue
        selected = dependencies(piece['maskRectPx'])
        if selected:
            pair_rows.append({'id': piece['mask'], 'rectMap1x': piece['maskRectPx'], 'changedPixels': selected})
            contacts.add('review/contact-' + ('icefalls' if group == 'waterfall' else 'lavafalls' if group == 'lavafall' else 'streams') + '.jpg')
    clip_rows = []
    for view in read('review/views.json'):
        selected = dependencies(view['rectPx1x'])
        if selected:
            clip_rows.append({'id': view['id'], 'rectMap1x': view['rectPx1x'], 'changedPixels': selected})
    outputs = []
    for path in sorted((ROOT / 'review').rglob('*')):
        relative = str(path.relative_to(ROOT))
        if path.is_file() and (relative.startswith(('review/pairs/', 'review/clips/'))
                               or path.name.startswith('contact-') or path.name.endswith('-sequence.jpg')):
            outputs.append({'path': relative, 'sha256': sha(relative)})
    report = {
        'run': '20261111T115315Z-11a68ec7',
        'method': 'Intersect actual changed native alpha pixels with pair/view rectangles; do not use a full mask bounding box as a dependency.',
        'changedProductionMasks': sorted(CHANGED),
        'pairIds': [row['id'] for row in pair_rows], 'clipIds': [row['id'] for row in clip_rows],
        'pairs': pair_rows, 'clips': clip_rows, 'contactSheets': sorted(contacts),
        'outputsBeforeRefresh': outputs,
    }
    write('review/current-render-dependencies.json', report)
    print(json.dumps({key: report[key] for key in ['pairIds', 'clipIds', 'contactSheets']}))


def audit():
    baseline_report = read('review/run-start-rechecked-liquid-reference-result.json')
    inherited = {row['mask']: row for row in read('review/run-start-liquid-reference-result.json')['measurements']}
    baseline = {row['mask']: row for row in baseline_report['measurements']}
    current = {row['mask']: row for row in read('review/liquid-reference-result.json')['measurements']}
    assert set(inherited) == set(baseline) == set(current) and len(current) == 37
    for name, row in baseline.items():
        assert row == inherited[name], name
    held = [name for name, row in baseline.items() if row['status'] == PASS]
    for name in held:
        for key in ['status', 'maskSha256', 'labelSupportSha256', 'definiteLiquidPixels', 'unknownPixels']:
            assert current[name][key] == baseline[name][key], (name, key)
    changes = [{
        'mask': name, 'beforeStatus': baseline[name]['status'], 'afterStatus': row['status'],
        'beforeSelectedPixels': baseline[name]['selectedPixels'], 'afterSelectedPixels': row['selectedPixels'],
        'beforeConfirmedLiquidPixels': baseline[name]['definiteLiquidPixels'],
        'afterConfirmedLiquidPixels': row['definiteLiquidPixels'],
        'beforeUpperBoundPercent': baseline[name]['outsidePercentUpperBound'],
        'afterUpperBoundPercent': row['outsidePercentUpperBound'],
        'productionMaskChanged': row['maskSha256'] != baseline[name]['maskSha256'],
    } for name, row in current.items()]
    progress = {
        'baseline': 'review/run-start-rechecked-liquid-reference-result.json',
        'current': 'review/liquid-reference-result.json',
        'beforeVerifiedWithin3Percent': len(held),
        'afterVerifiedWithin3Percent': sum(row['status'] == PASS for row in current.values()),
        'newlyVerified': [name for name, row in current.items() if name not in held and row['status'] == PASS],
        'allTwelveInheritedPassesPreserved': True,
        'baselineRecomputedMatchesInheritedMeasurements': True,
        'measurements': changes,
        'limitation': 'Counts include overlapping aggregates. Confirmed liquid pixels must not be summed as unique map area. Same AI reviewer; no human QA or complete acceptance.',
    }
    write('review/reference-progress.json', progress)
    handoff = []
    for name, row in current.items():
        action = ('รักษา mask/เฟรมที่ผ่านแล้ว ตรวจ coverage และ playback ต่อ' if row['status'] == PASS
                  else 'ตรวจ ground-only ของ largestUnknownComponents; คง unknown จนมีหลักฐาน')
        if name == 'icefall-summit':
            action = 'รักษา summit ขั้นล่าง 528/528 ครบ 8 เฟรม; reference ส่วนบนยังไม่ครบ ห้ามวาดขั้นล่างซ้ำ'
        elif name.startswith('shore-band'):
            action += '; ตรวจระยะถึงฝั่งจริง ≤12 world แยกจาก liquid containment'
        handoff.append({**row, 'nextAction': action})
    write('review/per-mask-handoff.json', {
        'source': 'review/liquid-reference-result.json', 'completeSemanticAcceptance': False,
        'verifiedWithin3Percent': progress['afterVerifiedWithin3Percent'],
        'remainingMasks': sum(row['status'] != PASS for row in current.values()), 'measurements': handoff,
    })
    receipt = read('review/20261111T115315Z-copy-receipt.json')
    asset_checks = []
    for row in receipt['files']:
        name = row['path']
        if name.startswith(('masks/', 'sheets/', 'sources/', 'input/')) or name in ['fx-layout.json', 'off-replacements.json']:
            asset_checks.append({'path': name, 'sha256': sha(name), 'matchesInput': sha(name) == row['sha256']})
    changed = sorted(row['path'] for row in asset_checks if not row['matchesInput'])
    assert changed == ['masks/' + name + '.webp' for name in sorted(CHANGED)], changed
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
    write('review/current-preservation.json', {
        'source': receipt['source'], 'assetChecks': asset_checks, 'changedProductionAssets': changed,
        'allTwelvePreviouslyVerifiedMasksAndLabelsPreserved': True,
        'summitMaskSheetSourcesAndRecorded528WitnessPreserved': True,
        'layoutAndOffReplacementsPreserved': True, 'allUnrelatedRenderOutputsPreserved': True,
    })
    print(json.dumps({key: progress[key] for key in ['beforeVerifiedWithin3Percent', 'afterVerifiedWithin3Percent', 'newlyVerified']}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prepare-render', action='store_true')
    args = parser.parse_args()
    prepare() if args.prepare_render else audit()
