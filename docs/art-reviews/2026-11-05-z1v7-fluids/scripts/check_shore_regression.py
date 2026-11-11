"""Exercise shore union and out-of-bounds clipping through the measurement entry point."""
import contextlib
import hashlib
import io
import json
from pathlib import Path
import tempfile
from unittest.mock import patch

from PIL import Image

import measure_shore

ROOT = Path(__file__).resolve().parents[1]


def main():
    with tempfile.TemporaryDirectory(prefix='.shore-fixture-', dir=ROOT) as folder:
        fixture = Path(folder)
        (fixture / 'masks').mkdir()
        (fixture / 'review/boundary').mkdir(parents=True)
        names = ['shore-band-ice', 'shore-band-spirit']
        layout = {
            'masterSize': [10, 10], 'worldSize': [20, 20],
            'pieces': [{'mask': name, 'maskRectPx': [0, 0, 10, 10]} for name in names],
        }
        (fixture / 'fx-layout.json').write_text(json.dumps(layout))
        for name in names:
            image = Image.new('RGBA', (20, 20), (255, 255, 255, 255))
            image.putpixel((19, 19), (255, 255, 255, 0))
            image.save(fixture / 'masks' / (name + '.webp'), lossless=True)
        patch_spec = {
            'mask': 'shore-band-ice', 'groundRectMap1x': [-1, 0, 6, 5],
            'solidPolygons': [[[0, 6], [11, 6], [11, 9], [0, 9]]],
            'liquidPolygons': [[[0, 0], [11, 0], [11, 4], [0, 4]]],
        }
        reference = {
            'patches': [dict(patch_spec, id='negative-origin'), dict(patch_spec, id='duplicate')],
            'waterOnlyDisks': [],
        }
        (fixture / 'review/shore-ground-reference.json').write_text(json.dumps(reference))
        with patch.object(measure_shore, 'ROOT', fixture), \
                patch.object(measure_shore, 'terrain', return_value=Image.new('RGB', (20, 20))), \
                contextlib.redirect_stdout(io.StringIO()):
            measure_shore.main()
        result = json.loads((fixture / 'review/shore-ground-result.json').read_text())
        unique = result['maskTotals'][0]['certifiedUniquePixels']
        raw_sum = sum(row['confirmedWaterWithin12World'] for row in result['patchMeasurements'])
        assert unique == 50, unique
        assert raw_sum == 100, raw_sum
        assert result['maskTotals'][0]['remainingPixelsUnverified'] == 349
        assert len({row['evidence'] for row in result['patchMeasurements']}) == 2
    report = {
        'entryPoint': 'measure_shore.main',
        'fixture': 'Two identical partly out-of-bounds patches, overlapping 50 of 399 shore pixels',
        'rawCertifiedPatchSum': raw_sum, 'uniqueCertifiedPixels': unique,
        'remainingPixels': 349, 'negativeOriginClippedCorrectly': True,
        'distinctProofFiles': True, 'assertions': 4, 'result': 'assertions-satisfied',
        'testScriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'measurementScriptSha256': hashlib.sha256((ROOT / 'scripts/measure_shore.py').read_bytes()).hexdigest(),
    }
    (ROOT / 'review/shore-regression-check.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    main()
