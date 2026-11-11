"""Register frozen ground observations and shared-water unions, idempotently."""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    baseline = json.loads((ROOT / 'review/baseline-liquid-reference.json').read_text())
    source = json.loads((ROOT / 'review/ground-reference-groups.json').read_text())
    layout = json.loads((ROOT / 'fx-layout.json').read_text())
    rects = {piece['mask']: piece['maskRectPx'] for piece in layout['pieces']}
    for name in ['ice-stream-flat', 'lava-flat', 'spirit-river', 'shore-band']:
        rects[name] = [0, 0, *layout['masterSize']]
    for name, item in baseline['masks'].items():
        item['groundRectMap1x'] = rects[name]
        item.setdefault('unlabelledPolygons', []).extend(source.get('maskUnknownPolygons', {}).get(name, []))
    baseline['groundPatches'] = source['groups']
    for name, sources in source['attach'].items():
        item = baseline['masks'].setdefault(name, {'groundRectMap1x': rects[name]})
        item['unionReferences'] = sources
    unions = {
        'ice-stream-flat': [name for name in baseline['masks'] if name.startswith('ice-stream-flat-')],
        'lava-flat': [name for name in baseline['masks'] if name.startswith('lava-flat-')],
        'spirit-river': ['spirit-river-west', 'spirit-river-east'],
        'shore-band-ice': ['ice-stream-flat'],
        'shore-band-spirit': ['spirit-river'],
        'shore-band': ['shore-band-ice', 'shore-band-spirit'],
    }
    for name, sources in unions.items():
        baseline['masks'][name] = {
            'groundRectMap1x': rects[name], 'unionReferences': sources,
            'referencePolicy': 'Union of separately ground-labelled water, clipped to this crop. '
                               'Unknown pixels remain unknown. Shore distance is measured separately.',
        }
    baseline['groupContinuation'] = {
        'worktree': '20261111T112241Z-d8cb32ab',
        'source': 'review/ground-reference-groups.json',
        'productionPixelsReadOrChanged': False,
        'labelsFrozenBeforeMeasurement': True,
    }
    dest = ROOT / 'review/liquid-reference.json'
    dest.write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'groundGroups': len(source['groups']),
                      'masksWithReferences': len(baseline['masks']),
                      'unions': unions}, indent=2))


if __name__ == '__main__':
    main()
