"""Regression checks for ground-only unions through measurement's entry point."""

import json
from pathlib import Path

import numpy as np

from reference_regions import reference_support

ROOT = Path(__file__).resolve().parents[1]


def main():
    reference = {'masks': {
        'a': {'groundRectMap1x': [-2, 0, 5, 5],
              'definiteLiquidPolygons': [[[0, 0], [9, 0], [9, 9], [0, 9]]],
              'unlabelledPolygons': [[[6, 2], [9, 2], [9, 5], [6, 5]]]},
        'b': {'groundRectMap1x': [1, 1, 3, 3],
              'definiteLiquidPolygons': [[[0, 0], [3, 0], [3, 3], [0, 3]]]},
        'combined': {'unionReferences': ['a', 'a', 'b']},
        'nested': {'unionReferences': ['combined']},
    }}
    rect = [0, 0, 5, 5]
    a, b, combined, nested = [np.array(reference_support(reference, name, rect)) > 0
                              for name in ['a', 'b', 'combined', 'nested']]
    assert np.array_equal(combined, a | b)
    assert np.array_equal(nested, combined)
    assert int(a.sum()) == 44
    assert int(b.sum()) == 16
    assert int(combined.sum()) == 60
    assert not combined[:, 6:].any()
    assert not a[2:6, 2:6].any()
    assert combined[2:6, 2:6].all()
    reference['masks']['cycle'] = {'unionReferences': ['cycle']}
    try:
        reference_support(reference, 'cycle', rect)
    except ValueError:
        cycle_rejected = True
    else:
        cycle_rejected = False
    assert cycle_rejected
    result = {'assertions': 9, 'aPixels': int(a.sum()), 'bPixels': int(b.sum()),
              'unionPixels': int(combined.sum()), 'duplicateAndNestedUnionStable': True,
              'negativeOriginClipped': True, 'unknownsLocalToTheirSource': True,
              'cyclicReferenceRejected': True,
              'productionImagesReadOrChanged': False}
    (ROOT / 'review/reference-union-regression.json').write_text(json.dumps(result, indent=2) + '\n')
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
