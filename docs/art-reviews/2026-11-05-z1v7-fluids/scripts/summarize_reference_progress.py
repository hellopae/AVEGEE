"""Record measured progress, preservation and remaining per-mask work."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PASS = 'upper-bound-within-3-percent'


def read(name):
    return json.loads((ROOT / name).read_text())


def write(name, data):
    (ROOT / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    baseline = {row['mask']: row for row in read('review/rechecked-baseline-liquid-reference-result.json')['measurements']}
    inherited = {row['mask']: row for row in read('review/baseline-liquid-reference-result.json')['measurements']}
    current = {row['mask']: row for row in read('review/liquid-reference-result.json')['measurements']}
    inherited_passes = [name for name, row in baseline.items() if row['status'] == PASS]
    assert len(baseline) == len(current) == 37
    for name, row in baseline.items():
        assert all(row[key] == inherited[name][key] for key in
                   ['status', 'selectedPixels', 'definiteLiquidPixels', 'unknownPixels', 'outsidePercentUpperBound'])
    assert all(current[name]['maskSha256'] == baseline[name]['maskSha256']
               and current[name]['labelSupportSha256'] == baseline[name]['labelSupportSha256']
               and current[name]['status'] == PASS for name in inherited_passes)
    assert current['icefall-summit']['maskSha256'] == baseline['icefall-summit']['maskSha256']
    delta = []
    handoff = []
    for name, row in current.items():
        old = baseline[name]
        delta.append({
            'mask': name, 'beforeStatus': old['status'], 'afterStatus': row['status'],
            'beforeConfirmedLiquidPixels': old['definiteLiquidPixels'],
            'afterConfirmedLiquidPixels': row['definiteLiquidPixels'],
            'beforeSelectedPixels': old['selectedPixels'], 'afterSelectedPixels': row['selectedPixels'],
            'beforeUpperBoundPercent': old['outsidePercentUpperBound'],
            'afterUpperBoundPercent': row['outsidePercentUpperBound'],
            'productionMaskChanged': old['maskSha256'] != row['maskSha256'],
        })
        if row['status'] == PASS:
            action = 'เก็บ mask และเฟรมชุดนี้ ตรวจ coverage และ playback ตามคิวที่เหลือ'
        elif name == 'icefall-summit':
            action = 'เก็บ registration ขั้นล่าง 528/528 ครบ 8 เฟรม ตรวจ reference ผิวน้ำ/ผิวหินของส่วนบนต่อจาก ground-only'
        elif name.startswith('shore-band'):
            action = 'ขยาย reference ผิวน้ำจากกลุ่มที่ใช้พื้นร่วมกัน และตรวจระยะ ≤12 world ถึงฝั่งจริงแยกใน shore-ground-result'
        elif name in ['ice-stream-flat', 'lava-flat', 'spirit-river']:
            action = 'ขยาย labels ราย component แล้ววัด union ใหม่ คง unknown ของแต่ละ observation'
        else:
            action = 'ตรวจ ground-only ใน largestUnknownComponents แยกผิวของเหลว ผิวแข็ง และส่วนยังไม่ชัด คง unknown จนมีหลักฐาน'
        handoff.append({**row, 'nextAction': action})
    before_count = sum(row['status'] == PASS for row in baseline.values())
    after_count = sum(row['status'] == PASS for row in current.values())
    progress = {
        'baseline': 'review/rechecked-baseline-liquid-reference-result.json',
        'current': 'review/liquid-reference-result.json',
        'beforeMasksWithReferences': sum(row['status'] != 'reference-missing' for row in baseline.values()),
        'afterMasksWithReferences': sum(row['status'] != 'reference-missing' for row in current.values()),
        'beforeVerifiedWithin3Percent': before_count, 'afterVerifiedWithin3Percent': after_count,
        'newlyVerified': [name for name in current if baseline[name]['status'] != PASS and current[name]['status'] == PASS],
        'inheritedNineReferencesAndMasksPreserved': True,
        'baselineRecomputedMatchesInheritedMeasurements': True,
        'groundObservationGroups': len(read('review/liquid-reference.json')['groundPatches']),
        'measurements': delta,
        'limitation': 'Counts per mask include overlapping aggregate deliverables. Do not sum them as unique world-area progress.',
    }
    write('review/reference-progress.json', progress)
    write('review/per-mask-handoff.json', {
        'source': 'review/liquid-reference-result.json', 'completeSemanticAcceptance': False,
        'verifiedWithin3Percent': after_count, 'remainingMasks': 37 - after_count,
        'measurements': handoff,
    })
    receipt = read('review/20261111T112241Z-copy-receipt.json')
    checked = []
    for entry in receipt['files']:
        name = entry['path']
        if name.startswith(('masks/', 'sheets/', 'sources/', 'input/v7/')) or name in ['fx-layout.json', 'off-replacements.json']:
            checked.append({'path': name, 'sha256': sha(ROOT / name),
                            'matchesLatestInput': sha(ROOT / name) == entry['sha256']})
    changed = [item['path'] for item in checked if not item['matchesLatestInput']]
    assert changed == ['masks/lavafall-lower-step.webp'], changed
    write('review/20261111T112241Z-preservation.json', {
        'source': receipt['source'], 'checked': checked, 'changedProductionAssets': changed,
        'summitSourcesSheetAndMaskPreserved': True, 'originalNinePassedMasksPreserved': True,
    })
    dependencies = read('review/current-render-dependencies.json')
    refreshed = {'review/pairs/' + name + '.webp' for name in dependencies['pairIds']}
    refreshed.update(dependencies['contactSheets'])
    output_checks = []
    for entry in dependencies['outputsBeforeRefresh']:
        current_hash = sha(ROOT / entry['path'])
        preserved = entry['path'] not in refreshed
        if preserved:
            assert current_hash == entry['sha256'], entry['path']
        output_checks.append({**entry, 'currentSha256': current_hash,
                              'refreshedForChangedPixels': not preserved,
                              'preservedHash': current_hash == entry['sha256']})
    dependencies['outputsAfterRefresh'] = output_checks
    dependencies['allUnrelatedOutputsPreserved'] = True
    write('review/current-render-dependencies.json', dependencies)
    print(json.dumps({key: progress[key] for key in ['beforeMasksWithReferences', 'afterMasksWithReferences',
                     'beforeVerifiedWithin3Percent', 'afterVerifiedWithin3Percent', 'newlyVerified']}, ensure_ascii=False))


if __name__ == '__main__':
    main()
