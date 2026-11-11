"""Apply frozen native-2x contours observed on v7 ground-only grids.

This annotation step never opens production masks, frames or construction
annotations. Unlabelled pixels stay unknown. Reapply from the run4 snapshot.
"""
import json
from pathlib import Path

from reference_regions import leaf_references

ROOT = Path(__file__).resolve().parents[1]


def main():
    reference = json.loads((ROOT / 'review/run4-start-liquid-reference.json').read_text())
    groups = json.loads((ROOT / 'review/run4-start-ground-reference-groups.json').read_text())
    additions = json.loads((ROOT / 'review/run4-ground-contours.json').read_text())
    for name, item in additions['patches'].items():
        patch = {key: value for key, value in item.items() if key != 'targets'}
        reference['groundPatches'][name] = patch
        groups['groups'][name] = patch
        for target in item['targets']:
            reference['masks'][target].setdefault('unionReferences', []).append(name)
            groups['attach'].setdefault(target, []).append(name)
    # A confirmed rock observation corrects erroneous positive labels from
    # earlier sources. This is not an unknown polygon erasing another source:
    # the ground-only rock verdict is explicit and recorded on every affected
    # contributing leaf, in that leaf's own coordinates.
    corrections = []
    for target, repair in additions['solidRepairs'].items():
        tx, ty, _, _ = reference['masks'][target]['groundRectMap1x']
        for leaf_name, leaf in leaf_references(reference, target):
            sx, sy, _, _ = leaf['groundRectMap1x']
            polygons = [[[x + (tx - sx) * 2, y + (ty - sy) * 2] for x, y in polygon]
                        for polygon in repair['excludeNative2x']]
            leaf.setdefault('unlabelledPolygons', []).extend(polygons)
            leaf['confirmedSolidCorrectionSource'] = 'review/run4-ground-contours.json'
            if leaf_name in groups['groups']:
                groups['groups'][leaf_name] = leaf
            corrections.append({'target': target, 'leaf': leaf_name, 'polygons': polygons})
    reference['run4ConfirmedSolidLabelCorrections'] = corrections
    provenance = {
        'worktree': '20261111T162400Z-9a28b146',
        'source': 'review/run4-ground-contours.json',
        'groundOnly': True, 'productionMasksReadOrChanged': False,
        'labelsFrozenBeforeMeasurement': True, 'sameAiReviewer': True,
        'notHumanQA': True,
        'unknownPolicy': 'No label outside observed contours; no colour-only classification.',
    }
    reference['latestGroundContinuation'] = provenance
    groups['latestContinuation'] = provenance
    for name, data in [('liquid-reference.json', reference), ('ground-reference-groups.json', groups)]:
        (ROOT / 'review' / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    repairs = json.loads((ROOT / 'review/run4-start-solid-repairs-current.json').read_text())
    witnesses = json.loads((ROOT / 'review/run4-start-solid-witnesses-current.json').read_text())
    for name, item in additions['solidRepairs'].items():
        repairs['masks'][name] = {key: value for key, value in item.items() if key != 'solidWitnesses'}
        witnesses['masks'][name] = item['solidWitnesses']
    for name, data in [('solid-repairs-current.json', repairs), ('solid-witnesses-current.json', witnesses)]:
        (ROOT / 'review' / name).write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
    shore = json.loads((ROOT / 'review/run4-start-shore-ground-reference.json').read_text())
    for withdrawal in additions.get('withdrawShorePolygons', []):
        item = next(patch for patch in shore['patches'] if patch.get('id') == withdrawal['id'])
        item['solidPolygons'] = [polygon for index, polygon in enumerate(item['solidPolygons'])
                                 if index not in withdrawal['indices']]
        item['withdrawnObservation'] = withdrawal
    shore['patches'].extend(additions.get('shorePatches', []))
    shore['latestContinuation'] = provenance
    (ROOT / 'review/shore-ground-reference.json').write_text(json.dumps(shore, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'addedGroundGroups': list(additions['patches'])}))


if __name__ == '__main__':
    main()
