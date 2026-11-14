"""Check pack completeness, image decoding, expected dimensions and size budget.

Quality measurements are left to the reviewer. No generation or assembly occurs.
"""
import json
from pathlib import Path

from PIL import Image

OUT = Path(__file__).resolve().parents[1]
CHUNKS = [f'r4-c{c}' for c in range(2, 6)]


def verify():
    manifest = json.loads((OUT / 'generation-prompts.json').read_text())
    required = ['README.md', 'objects-inventory.json', 'inputs-provenance.json',
                'generation-prompts.json', 'run-summary.json', 'scripts/assemble.py', 'scripts/verify.py']
    for chunk in CHUNKS:
        required.extend(f'{chunk}/{name}' for name in [
            'q11-native.webp', 'q12-native.webp', 'registration.json',
            f'{chunk}-2x.webp', f'{chunk}-compare.jpg', 'structure.json',
            'sharpness.json', 'removed.json', 'seams.json', 'seam-check.jpg',
            'structure-check.jpg', 'inputs/tiles.json', 'inputs/master-v3.webp',
            'inputs/q11-v3.webp', 'inputs/q12-v3.webp', 'inputs/walkmask-review.jpg',
        ])
    missing = [name for name in required if not (OUT / name).is_file()]
    assert not missing, f'Missing files: {missing}'
    expected = {}
    for generation in manifest['generations']:
        chunk, part = generation['id'].split('/')
        expected[f'{chunk}/{part}-native.webp'] = generation['nativeSize']
    for chunk in CHUNKS:
        width = 819 if chunk == 'r4-c5' else 1024
        expected[f'{chunk}/{chunk}-2x.webp'] = [width * 2, 410]
        expected[f'{chunk}/inputs/master-v3.webp'] = [width, 205]
        for tile in json.loads((OUT / chunk / 'inputs/tiles.json').read_text()):
            expected[f'{chunk}/inputs/{tile["id"]}-v3.webp'] = tile['contextMasterPx1x'][2:]
    images = []
    for path in sorted(OUT.rglob('*')):
        if path.suffix.lower() not in {'.webp', '.jpg', '.png'}:
            continue
        relative = str(path.relative_to(OUT))
        with Image.open(path) as image:
            image.load()
            size = list(image.size)
        if relative in expected:
            assert size == expected[relative], (relative, size, expected[relative])
        images.append(dict(file=relative, size=size))
    total = sum(path.stat().st_size for path in OUT.rglob('*')
                if path.is_file() and path.name != 'verification.json')
    report = dict(
        checks='Required files, image decode, expected image dimensions, decimal 80 MB budget',
        requiredFilesChecked=len(required), missingFiles=missing,
        decodedImages=len(images), expectedDimensionsChecked=len(expected),
        bytesExcludingThisReport=total, budgetBytes=80_000_000,
        qualityThresholdsChecked=False, qaPassedClaimed=False, images=images,
    )
    destination = OUT / 'verification.json'
    destination.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    final_bytes = total + destination.stat().st_size
    assert final_bytes <= 80_000_000, final_bytes
    print(json.dumps(dict(decodedImages=len(images), expectedDimensionsChecked=len(expected),
                          requiredFilesChecked=len(required), finalBytes=final_bytes), indent=2))


if __name__ == '__main__':
    verify()
